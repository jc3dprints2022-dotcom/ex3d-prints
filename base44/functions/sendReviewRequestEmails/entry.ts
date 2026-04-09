import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled: run daily — sends review request 7 days after actual_delivery_date
// if customer_rating is null and review_left is not true
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

    const allOrders = await base44.asServiceRole.entities.Order.list();

    // Find orders delivered 7 days ago (±1 day window), no rating, no review sent yet
    const eligible = allOrders.filter(o => {
      if (!['delivered', 'dropped_off', 'completed'].includes(o.status)) return false;
      if (o.customer_rating != null) return false;
      if (o.review_request_sent) return false;
      const deliveredAt = o.delivered_at || o.picked_up_at || o.updated_date;
      if (!deliveredAt) return false;
      const d = new Date(deliveredAt);
      return d >= eightDaysAgo && d <= sevenDaysAgo;
    });

    console.log(`Found ${eligible.length} orders eligible for review request`);

    let sent = 0;
    for (const order of eligible) {
      try {
        const customer = await base44.asServiceRole.entities.User.get(order.customer_id);
        if (!customer?.email) continue;

        const firstName = customer.full_name?.split(' ')[0] || 'there';
        const reviewLink = `https://ex3dprints.com/ConsumerDashboard?tab=orders&review=${order.id}`;

        await base44.asServiceRole.functions.invoke('sendEmail', {
          to: customer.email,
          subject: `How did we do? 👀 — EX3D Prints`,
          body: `Hi ${firstName},\n\nWe hope your EX3D Prints order arrived safely.\n\nIf you have 30 seconds, we'd really appreciate your feedback:\n👉 Leave a quick review here: ${reviewLink}\n\nYour feedback helps us improve print quality and shipping speed for everyone.\n\nThanks again for supporting local makers.\n\n— EX3D Prints Team`
        });

        // Mark review request as sent so we don't resend
        await base44.asServiceRole.entities.Order.update(order.id, { review_request_sent: true });
        sent++;
        console.log(`Review request sent to ${customer.email} for order ${order.id}`);
      } catch (e) {
        console.error(`Failed for order ${order.id}:`, e.message);
      }
    }

    return Response.json({ success: true, eligible: eligible.length, sent });
  } catch (error) {
    console.error('sendReviewRequestEmails error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});