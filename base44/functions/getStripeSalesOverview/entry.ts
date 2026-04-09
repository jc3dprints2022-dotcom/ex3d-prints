import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { days = 30 } = await req.json().catch(() => ({}));

    const now = Math.floor(Date.now() / 1000);
    const startTs = now - days * 86400;

    // Fetch all successful payment intents in range
    const paymentIntents = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: startTs },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const result = await stripe.paymentIntents.list(params);
      paymentIntents.push(...result.data);
      hasMore = result.has_more;
      if (result.data.length > 0) {
        startingAfter = result.data[result.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    const succeeded = paymentIntents.filter(pi => pi.status === 'succeeded');

    // Total revenue and count
    const totalRevenue = succeeded.reduce((sum, pi) => sum + pi.amount_captured / 100, 0);
    const totalTransactions = succeeded.length;

    // Group by day for chart
    const byDay = {};
    succeeded.forEach(pi => {
      const date = new Date(pi.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDay[date]) byDay[date] = { date, revenue: 0, transactions: 0 };
      byDay[date].revenue += pi.amount_captured / 100;
      byDay[date].transactions += 1;
    });

    // Fill in missing days
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date((now - i * 86400) * 1000);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartData.push(byDay[label] || { date: label, revenue: 0, transactions: 0 });
    }

    // Recent transactions
    const recentTransactions = succeeded.slice(0, 10).map(pi => ({
      id: pi.id,
      amount: pi.amount_captured / 100,
      currency: pi.currency.toUpperCase(),
      created: new Date(pi.created * 1000).toLocaleDateString(),
      description: pi.description || pi.metadata?.product_name || '—'
    }));

    return Response.json({
      totalRevenue,
      totalTransactions,
      chartData,
      recentTransactions
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});