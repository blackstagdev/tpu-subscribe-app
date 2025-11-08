import fetch from 'node-fetch';
import { env } from '../lib/config.js';
import { getTaggedCustomers, getCustomerOrdersInLastDays, computeOrderStats, updateCustomerTags } from '../lib/shopify.js';
import { fetchAffiliateSalesByEmail } from '../lib/goaffpro.js';

export default async function handler(req, res) {
  const key = req.headers['x-cron-key'];
  if (key !== env.CRON_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tag = env.STUDENT_TAG;
  const customers = await getTaggedCustomers(tag);
  const results = [];

  for (const c of customers) {
    const orders = await getCustomerOrdersInLastDays(c.id, 30);
    const { count, amount } = computeOrderStats(orders);
    const aff = await fetchAffiliateSalesByEmail(c.email, 30);

    const active =
      count >= env.ORDER_COUNT_THRESHOLD ||
      amount >= env.ORDER_AMOUNT_THRESHOLD ||
      aff.count >= env.GOAFFPRO_MIN_SALE_COUNT ||
      aff.amount >= env.GOAFFPRO_MIN_SALE_AMOUNT;

    let tags = c.tags.split(',').map((t) => t.trim());
    if (active) {
      if (!tags.includes(tag)) tags.push(tag);
    } else {
      tags = tags.filter((t) => t !== tag);
    }

    await updateCustomerTags(c.id, tags);
    results.push({ id: c.id, email: c.email, active, order_count: count, order_amount: amount });
  }

  return res.json({ ok: true, results });
}
