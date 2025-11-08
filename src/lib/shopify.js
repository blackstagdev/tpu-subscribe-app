import {
  SHOPIFY_DOMAIN,
  SHOPIFY_ACCESS_TOKEN
} from '$env/static/private';
import { checkAffiliateSales } from '$lib/goaffpro';

const API = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07`;

/**
 * Generic Shopify fetch helper
 */
async function shopifyFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify API error', res.status, text);
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * 🏷️ Get all customers containing a specific tag
 * Supports pagination.
 */
export async function getTaggedCustomers(tag) {
  let allTagged = [];
  let nextPageUrl = `/customers.json?limit=250&fields=id,email,tags,first_name,last_name,created_at`;

  while (nextPageUrl) {
    const res = await fetch(`${API}${nextPageUrl}`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Shopify API error', res.status, text);
      throw new Error(`Shopify API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const customers = Array.isArray(data.customers) ? data.customers : [];

    const tagged = customers.filter(
      (c) => c.tags && c.tags.toLowerCase().includes(tag.toLowerCase())
    );

    allTagged = allTagged.concat(tagged);

    const linkHeader = res.headers.get('link');
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextPageUrl = match ? match[1].replace(API, '') : null;
    } else {
      nextPageUrl = null;
    }

    console.log(`📄 Page fetched: ${customers.length} customers, ${tagged.length} matched.`);
  }

  console.log(`🧾 Total ${allTagged.length} customers with tag "${tag}".`);
  return allTagged;
}

/**
 * 🛒 Check Shopify orders for a specific customer
 */
export async function checkOrders(customerId, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const res = await shopifyFetch(
    `/orders.json?customer_id=${customerId}&created_at_min=${since}&fields=id,total_price,created_at`
  );

  const orders = Array.isArray(res.orders) ? res.orders : [];
  const total = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  return { total, count: orders.length };
}

/**
 * Combine Shopify + GoAffPro checks
 */
export async function checkCustomerActivity(email, customerId, days = 30) {
  const orders = await checkOrders(customerId, days);
  const affiliate = await checkAffiliateSales(email, days);
  return { orders, affiliate };
}

/**
 * (Kept for later use, not used in diagnostics)
 */
export function removeTag(tag, currentTags) {
  if (!currentTags) return '';
  return currentTags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && t.toLowerCase() !== tag.toLowerCase())
    .join(', ');
}

export async function updateTag(customerId, tags) {
  const payload = { customer: { id: customerId, tags } };
  const res = await fetch(`${API}/customers/${customerId}.json`, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to update tags', res.status, text);
    throw new Error(`Failed to update tags for ${customerId}`);
  }

  console.log(`✅ Updated tags for customer ${customerId}: ${tags}`);
}
