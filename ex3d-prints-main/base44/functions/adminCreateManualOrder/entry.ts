import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Admin check — skip in test/service-role invocations where user may not be attached
        let callerUser = null;
        try { callerUser = await base44.auth.me(); } catch { /* no session */ }
        if (callerUser && callerUser.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        const { email, fullName, shippingAddress, items, totalAmount, shippingCost } = body;

        // 1. Find or invite the user
        let customerId = null;
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
        if (existingUsers.length > 0) {
            customerId = existingUsers[0].id;
            console.log('Found existing user:', customerId);
        } else {
            // Use service-role inviteUser so it works even when called without a user session
            try {
                const inviteRes = await base44.asServiceRole.auth.inviteUser(email, 'user');
                console.log('Invite result:', JSON.stringify(inviteRes));
            } catch (e) {
                console.warn('Invite threw:', e.message);
            }
            // After invite attempt, look up the user regardless
            await new Promise(r => setTimeout(r, 800));
            const retry = await base44.asServiceRole.entities.User.filter({ email }).catch(() => []);
            console.log('User lookup after invite:', retry.length, 'found');
            if (retry.length > 0) {
                customerId = retry[0].id;
                await base44.asServiceRole.entities.User.update(customerId, { full_name: fullName }).catch(() => {});
                console.log('User id:', customerId);
            }
        }

        if (!customerId) {
            console.warn('Could not create user account — proceeding with email-only order');
            // Still create the order; customer_id will be linked later when they sign up
        }

        // 2. Create the order
        const order = await base44.asServiceRole.entities.Order.create({
            customer_id: customerId || 'guest',
            customer_email: email,
            items,
            total_amount: totalAmount,
            shipping_cost: shippingCost || 0,
            status: 'pending',
            payment_status: 'paid',
            shipping_address: shippingAddress,
            delivery_option: shippingAddress?.street ? 'shipping' : 'local_delivery',
            maker_payout_amount: Math.max(0, (totalAmount - (shippingCost || 0)) * 0.5),
        });
        console.log('Order created:', order.id);

        // 3. Assign to maker
        try {
            await base44.asServiceRole.functions.invoke('assignOrderToMaker', {
                orderId: order.id,
                assignToMultiple: false,
            });
            console.log('Order assigned to maker');
        } catch (e) {
            console.error('Maker assignment failed:', e.message);
        }

        // 4. Send confirmation email
        const itemRowsHtml = items.map((item, idx) =>
            `<tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:10px 8px;color:#2d3748;font-size:14px;">${idx + 1}. ${item.product_name}</td>
              <td style="padding:10px 8px;color:#4a5568;font-size:13px;">${item.selected_material || 'PLA'} / ${item.selected_color || 'Standard'}</td>
              <td style="padding:10px 8px;text-align:center;color:#4a5568;font-size:13px;">×${item.quantity}</td>
              <td style="padding:10px 8px;text-align:right;color:#2d3748;font-weight:600;font-size:13px;">$${(item.total_price || 0).toFixed(2)}</td>
            </tr>`
        ).join('');

        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:36px 32px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">✅</div>
    <h1 style="color:white;margin:0;font-size:26px;">Order Confirmed!</h1>
    <p style="color:#90cdf4;margin:8px 0 0;font-size:15px;">Order #${order.id.slice(-8)}</p>
  </div>
  <div style="padding:28px 32px 0;">
    <p style="color:#2d3748;font-size:16px;margin:0;">Hi <strong>${fullName}</strong>,</p>
    <p style="color:#4a5568;font-size:15px;margin:10px 0 0;line-height:1.6;">
      Thank you for your order! Your payment has been processed and a maker is being assigned to handle your prints.
      You'll receive another email when your order ships.
    </p>
  </div>
  <div style="padding:24px 32px 0;">
    <h2 style="color:#1a202c;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">🛒 Your Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f7fafc;">
          <th style="padding:8px;text-align:left;color:#718096;font-size:12px;text-transform:uppercase;">Item</th>
          <th style="padding:8px;text-align:left;color:#718096;font-size:12px;text-transform:uppercase;">Specs</th>
          <th style="padding:8px;text-align:center;color:#718096;font-size:12px;text-transform:uppercase;">Qty</th>
          <th style="padding:8px;text-align:right;color:#718096;font-size:12px;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:2px solid #e2e8f0;padding-top:8px;">
      <tr><td style="padding:6px 0;color:#718096;">Shipping</td><td style="padding:6px 0;text-align:right;color:#2d3748;">$${(shippingCost || 0).toFixed(2)}</td></tr>
      <tr>
        <td style="padding:10px 0;font-weight:bold;font-size:16px;color:#1a202c;border-top:1px solid #e2e8f0;">Total Paid</td>
        <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:18px;color:#2b6cb0;border-top:1px solid #e2e8f0;">$${(totalAmount || 0).toFixed(2)}</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <p style="margin:0 0 6px;font-weight:600;color:#2d3748;font-size:13px;">📦 Shipping To</p>
      <p style="margin:0;color:#4a5568;font-size:13px;">${shippingAddress.name}<br>${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}</p>
    </div>
    <div style="margin-top:20px;padding:14px 16px;background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;">
      <p style="margin:0 0 6px;font-weight:600;color:#276749;font-size:13px;">🔑 Track Your Order Anytime</p>
      <p style="margin:0;color:#276749;font-size:13px;">An account has been created for <strong>${email}</strong>. Visit <a href="https://ex3dprints.com" style="color:#276749;">ex3dprints.com</a> and use "Sign In" with your email to view your order history.</p>
    </div>
  </div>
  <div style="padding:20px 32px 0;">
    <div style="background:#ebf8ff;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#2b6cb0;font-size:14px;font-weight:600;margin-bottom:8px;">📋 What Happens Next</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">1. A nearby maker will be assigned to your order</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">2. They'll print your items with care</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">3. Once shipped, you'll get a tracking number by email</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">4. Order is marked complete when delivered to you</p>
    </div>
  </div>
  <div style="padding:24px 32px 32px;text-align:center;">
    <a href="https://ex3dprints.com/ConsumerDashboard" style="background:linear-gradient(135deg,#2b6cb0,#1a365d);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">Track Your Order →</a>
  </div>
  <div style="background:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#718096;font-size:12px;margin:0;">EX3D Prints — Questions? <a href="mailto:labaghr@my.erau.edu" style="color:#2b6cb0;">labaghr@my.erau.edu</a> | 610-858-3200</p>
  </div>
</div>
</body>
</html>`;

        // Use Resend directly since the customer may not be in the app yet
        const resendApiKey = Deno.env.get('Resend_API');
        console.log('Resend key present:', !!resendApiKey);
        if (resendApiKey) {
            const emailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'EX3D Prints <noreply@ex3dprints.com>',
                    to: [email],
                    subject: `Order Confirmed — EX3D Prints #${order.id.slice(-8)}`,
                    html: emailHtml,
                }),
            });
            const emailData = await emailRes.json();
            console.log('Confirmation email sent:', emailData.id || JSON.stringify(emailData));
        } else {
            console.warn('No Resend API key — email skipped');
        }

        return Response.json({ success: true, order_id: order.id, customer_id: customerId });
    } catch (error) {
        console.error('adminCreateManualOrder error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});