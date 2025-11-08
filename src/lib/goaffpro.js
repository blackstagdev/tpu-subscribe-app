// src/lib/goaffpro.js
import {
  GOAFFPRO_API_KEY_1 as ENV_KEY_1,
  GOAFFPRO_API_KEY_2 as ENV_KEY_2
} from '$env/static/private';

// Provide temporary fallbacks for local/dev environments
const GOAFFPRO_API_KEY_1 = ENV_KEY_1 || '';
const GOAFFPRO_API_KEY_2 = ENV_KEY_2 || '';

/**
 * Check a customer's GoAffPro affiliate sales across two stores.
 * Efficiently queries store 1 first, then store 2 only if not found.
 */
export async function checkAffiliateSales(email, days = 30) {
  if (!email) {
    console.warn('⚠️ No email provided for GoAffPro check');
    return { found: false, count: 0, sales: 0, source: null };
  }

  const since = new Date(Date.now() - days * 86400000).toISOString();

  async function fetchFromStore(apiKey, storeLabel) {
    if (!apiKey) {
      console.warn(`⚠️ No API key for ${storeLabel} — skipping check`);
      return { found: false, count: 0, sales: 0, source: storeLabel };
    }

    const url = new URL('https://api.goaffpro.com/v1/admin/affiliates');
    url.searchParams.set('created_at_min', since);
    url.searchParams.set(
      'fields',
      'id,name,email,company_name,total_referral_earnings,total_network_earnings,total_other_earnings,number_of_orders,status,created_at,ref_code,tax_identification_number'
    );

    const res = await fetch(url, {
      headers: { 'X-GOAFFPRO-ACCESS-TOKEN': apiKey }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`GoAffPro API error (${storeLabel}):`, res.status, text);
      return { found: false, count: 0, sales: 0, source: storeLabel };
    }

    const data = await res.json();
    const affiliates = Array.isArray(data.affiliates) ? data.affiliates : [];

    const affiliate = affiliates.find(
      (a) => a.email && a.email.toLowerCase() === email.toLowerCase()
    );

    if (!affiliate) {
      console.log(`🚫 ${email} not found in GoAffPro (${storeLabel})`);
      return { found: false, count: 0, sales: 0, source: storeLabel };
    }

    const totalSales =
      parseFloat(affiliate.total_referral_earnings || 0) +
      parseFloat(affiliate.total_network_earnings || 0) +
      parseFloat(affiliate.total_other_earnings || 0);

    const count = parseInt(affiliate.number_of_orders || 0);

    console.log(
      `✅ Found affiliate ${affiliate.email} in ${storeLabel}: ${count} orders, $${totalSales.toFixed(2)} total`
    );

    return { found: true, count, sales: totalSales, source: storeLabel };
  }

  const store1 = await fetchFromStore(GOAFFPRO_API_KEY_1, 'Store 1');
  if (store1.found) return store1;

  const store2 = await fetchFromStore(GOAFFPRO_API_KEY_2, 'Store 2');
  if (store2.found) return store2;

  return { found: false, count: 0, sales: 0, source: null };
}
