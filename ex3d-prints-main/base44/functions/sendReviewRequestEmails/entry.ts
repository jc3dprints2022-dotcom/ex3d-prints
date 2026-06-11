import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled daily — sends a personal review request 7 days after the order ships.
// Only sends once per order. Skips if customer already left a review.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

    const allOrders = await base44.asServiceRole.entities.Order.list();

    // Check all reviews so we can skip orders that already have one
    const allReviews = await base44.asServiceRole.entities.Review.list().catch(() => []);
    const reviewedOrderIds = new Set(allReviews.map(r => r.order_id).filter(Boolean));

    const eligible = allOrders.filter(o => {
      // Must be shipped or delivered
      if (!['shipped', 'delivered', 'dropped_off', 'completed'].includes(o.status)) return false;
      // Skip if review request already sent
      if (o.review_request_sent) return false;
      // Skip if customer already left a review
      if (reviewedOrderIds.has(o.id)) return false;
      // Use shipped_at as the trigger; fall back to delivered_at or updated_date
      const triggerDate = o.shipped_at || o.delivered_at || o.picked_up_at;
      if (!triggerDate) return false;
      const d = new Date(triggerDate);
      return d >= eightDaysAgo && d <= sevenDaysAgo;
    });

    console.log(`Found ${eligible.length} orders eligible for review request`);

    let sent = 0;
    for (const order of eligible) {
      try {
        const customer = await base44.asServiceRole.entities.User.get(order.customer_id).catch(() => null);
        if (!customer?.email) continue;

        const firstName = customer.full_name?.split(' ')[0] || 'there';
        const reviewLink = `https://ex3dprints.com/ConsumerDashboard?tab=orders&orderId=${order.id}&review=true`;

        // Get first product name for personalization
        const firstItem = order.items?.[0];
        const productName = firstItem?.product_name || 'your order';

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'EX3D Prints',
          to: customer.email,
          subject: `How's your ${productName}? 👋`,
          body: `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
  <div style="border-bottom: 3px solid #14b8a6; margin-bottom: 24px; padding-bottom: 12px;">
    <h2 style="color: #14b8a6; margin: 0; font-size: 20px;">EX3D Prints</h2>
  </div>

  <p style="color: #111827; font-size: 16px; margin: 0 0 16px;">Hey ${firstName} 👋</p>

  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
    How's your <strong>${productName}</strong>? We hope it arrived in great shape and you're loving it.
  </p>

  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
    We'd love to hear what you think — it only takes 30 seconds and makes a huge difference for other customers and our makers.
  </p>

  <div style="text-align: center; margin: 28px 0;">
    <a href="${reviewLink}" style="display: inline-block; background: #14b8a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Leave a Review →</a>
  </div>

  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
    Thank you for supporting local makers. 🙏
  </p>
  <p style="color: #6b7280; font-size: 14px; margin: 0;">— The EX3D Prints Team</p>

  <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; text-align: center;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      EX3D Prints · <a href="mailto:ex3dprint@gmail.com" style="color: #9ca3af;">ex3dprint@gmail.com</a>
    </p>
  </div>
</div>
          `.trim()
        });

        // Mark as sent so we never double-send
        await base44.asServiceRole.entities.Order.update(order.id, { review_request_sent: true });
        sent++;
        console.log(`Review request sent to ${customer.email} for order ${order.id} (${productName})`);
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