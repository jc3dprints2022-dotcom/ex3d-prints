import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Get order details
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    
    if (!order || order.status !== 'delivered') {
      return Response.json({ error: 'Order not found or not delivered' }, { status: 400 });
    }

    // Get customer info
    const customer = await base44.asServiceRole.entities.User.get(order.customer_id);

    // Award 50 EXP ($5 worth) for reviewing
    const currentExp = customer.exp_balance || 0;
    await base44.asServiceRole.entities.User.update(customer.id, {
      exp_balance: currentExp + 50
    });

    // Track EXP transaction
    await base44.asServiceRole.entities.ExpTransaction.create({
      user_id: customer.id,
      transaction_type: 'earned',
      amount: 50,
      source: 'review_bonus',
      description: 'Review request bonus',
      order_id: orderId
    });

    // Send email
    const emailBody = `
      <h2>How was your order?</h2>
      <p>Hi ${customer.full_name},</p>
      <p>We hope you're enjoying your recent order! We'd love to hear your feedback.</p>
      <p><strong>Good news!</strong> We've added 50 EXP ($5 value) to your account as a thank you for being a valued customer!</p>
      <p>You can use this EXP to redeem rewards on your dashboard.</p>
      <p>If you have a moment, please leave a review to help other customers make informed decisions.</p>
      <p><a href="${Deno.env.get('BASE44_APP_URL')}/ConsumerDashboard" style="background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Leave a Review</a></p>
      <p>Thank you for choosing EX3D Prints!</p>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customer.email,
      subject: '🎁 Bonus EXP + Review Request - EX3D Prints',
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Review request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});