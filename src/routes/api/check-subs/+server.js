import { json } from '@sveltejs/kit';
import { getTaggedCustomers, checkOrders /*, updateTag, removeTag */ } from '$lib/shopify';
import { checkAffiliateSales } from '$lib/goaffpro';
import { SHOPIFY_DOMAIN_2, SHOPIFY_ACCESS_TOKEN_2 } from '$env/static/private';

const TAG = 'student-monthly';
const DAYS = 30;

/**
 * 🏪 Check orders in the 2nd Shopify store:
 * 1️⃣ Find customer by email
 * 2️⃣ Fetch orders by customer_id
 */
async function checkOrdersFromStore2(email, days = 30) {
  if (!email) return { total: 0, count: 0, lastOrderDate: null };

  try {
    // Step 1️⃣ Find the customer by email in store 2
    const customerSearchUrl = `https://${SHOPIFY_DOMAIN_2}/admin/api/2024-07/customers/search.json?query=email:${encodeURIComponent(
      email
    )}`;
    const customerRes = await fetch(customerSearchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN_2,
        'Content-Type': 'application/json'
      }
    });

    if (!customerRes.ok) {
      const text = await customerRes.text();
      console.error(`❌ Store 2 customer search error (${customerRes.status}): ${text}`);
      return { total: 0, count: 0, lastOrderDate: null };
    }

    const customerData = await customerRes.json();
    const customer = Array.isArray(customerData.customers) ? customerData.customers[0] : null;

    if (!customer) {
      console.log(`🚫 No matching customer found in Store 2 for ${email}`);
      return { total: 0, count: 0, lastOrderDate: null };
    }

    const customerId = customer.id;
    console.log(`   🔍 Found Store 2 customer ${customerId} (${email})`);

    // Step 2️⃣ Fetch orders for that customer ID
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const ordersUrl = `https://${SHOPIFY_DOMAIN_2}/admin/api/2024-07/orders.json?customer_id=${customerId}&status=any&created_at_min=${since}&fields=id,total_price,created_at`;

    const ordersRes = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN_2,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersRes.ok) {
      const text = await ordersRes.text();
      console.error(`❌ Store 2 order fetch error (${ordersRes.status}): ${text}`);
      return { total: 0, count: 0, lastOrderDate: null };
    }

    const ordersData = await ordersRes.json();
    const orders = Array.isArray(ordersData.orders) ? ordersData.orders : [];

    const total = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const count = orders.length;

    const lastOrderDate =
      count > 0
        ? orders
            .map((o) => new Date(o.created_at))
            .filter((d) => !isNaN(d.getTime()))
            .sort((a, b) => b - a)[0]
            .toISOString()
        : null;

    return { total, count, lastOrderDate };
  } catch (err) {
    console.error(`❌ Error fetching Store 2 orders for ${email}:`, err);
    return { total: 0, count: 0, lastOrderDate: null };
  }
}

export async function GET() {
  try {
    console.log(`🧩 Starting diagnostic run for "${TAG}" customers...`);
    const customers = await getTaggedCustomers(TAG);
    console.log(`📦 Found ${customers.length} customers tagged "${TAG}".`);

    for (const customer of customers) {
      const email = customer.email;
      const tags = (customer.tags || '').toLowerCase();

      // Safely handle invalid or missing created_at
      let createdAt = null;
      try {
        createdAt = new Date(customer.created_at);
        if (isNaN(createdAt.getTime())) createdAt = null;
      } catch {
        createdAt = null;
      }

      console.log(`\n➡️ Checking ${email || '(no email)'} (ID: ${customer.id})`);
      console.log(`   🏷️ Tags: ${customer.tags}`);
      console.log(
        `   📅 Created at: ${createdAt ? createdAt.toISOString() : '(no valid created_at date)'}`
      );

      let orders = { total: 0, count: 0, lastOrderDate: null };
      let shouldRemoveTag = false;

      // ✅ Provider logic — handles abmprovider, provider, etc.
      if (tags.includes('provider')) {
        console.log('   🏪 Detected "provider" tag — checking Shopify Store 2...');
        orders = await checkOrdersFromStore2(email, DAYS);

        if (orders.count > 0 && orders.lastOrderDate) {
          const lastOrder = new Date(orders.lastOrderDate);
          const daysSinceLastOrder = Math.floor(
            (Date.now() - lastOrder.getTime()) / 86400000
          );
          console.log(
            `   🛒 Found ${orders.count} orders ($${orders.total.toFixed(
              2
            )} total). Last order: ${orders.lastOrderDate}`
          );

          if (daysSinceLastOrder > DAYS) {
            console.log(
              `   ⚠️ Last order ${daysSinceLastOrder} days ago — would remove "${TAG}" tag.`
            );
            shouldRemoveTag = true;
          } else {
            console.log(
              `   ✅ Recent order (${daysSinceLastOrder} days ago) — keep "${TAG}" tag.`
            );
          }
        } else {
          if (createdAt) {
            const daysSinceCreated = Math.floor(
              (Date.now() - createdAt.getTime()) / 86400000
            );
            if (daysSinceCreated > DAYS) {
              console.log(
                `   ⚠️ No orders, and created ${daysSinceCreated} days ago — would remove "${TAG}" tag.`
              );
              shouldRemoveTag = true;
            } else {
              console.log(
                `   ⏳ No orders yet, created ${daysSinceCreated} days ago — within grace period.`
              );
            }
          } else {
            console.log(`   ⚠️ No orders and no valid created_at — unable to evaluate.`);
          }
        }
      } else {
        // 🏬 Regular main-store customer
        orders = await checkOrders(customer.id, DAYS);
        console.log(
          `   🛍️ Main Store Orders: $${orders.total.toFixed(2)} (${orders.count} orders)`
        );
        if (orders.count === 0) shouldRemoveTag = true;
      }

      // 🤝 Partner / Affiliate
      if (tags.includes('partner') || tags.includes('affiliate')) {
        console.log('   🔗 Checking GoAffPro activity...');
        const affiliate = await checkAffiliateSales(email, DAYS);
        if (affiliate.found) {
          console.log(
            `   ✅ Found in ${affiliate.source}: $${affiliate.sales.toFixed(
              2
            )} (${affiliate.count} sales)`
          );
        } else {
          console.log('   🚫 No GoAffPro record found.');
          shouldRemoveTag = true;
        }
      } else {
        console.log('   ℹ️ No partner/affiliate tag — skipping GoAffPro check.');
      }

      // 🧹 OPTIONAL: Remove inactive customer's "student-monthly" tag
      if (shouldRemoveTag) {
        console.log(`   ❌ Inactive — would remove tag for ${email}`);
        // const newTags = removeTag(TAG, customer.tags);
        // await updateTag(customer.id, newTags);
        // console.log(`   ✅ Tag removed for ${email}`);
      } else {
        console.log(`   ✅ Active — tag retained for ${email}`);
      }

      console.log('   🔍 Done checking this customer.');
    }

    console.log('\n✅ Diagnostic run complete — no updates performed.');
    return json({ message: 'Diagnostic complete — no updates performed.' });
  } catch (err) {
    console.error('❌ Error during diagnostic run:', err);
    return json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
