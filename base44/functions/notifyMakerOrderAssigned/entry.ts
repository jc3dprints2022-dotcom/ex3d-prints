import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by the Order entity automation when maker_id changes.
// Payload: { event, data (new order), old_data (previous order) }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data: order, old_data: oldOrder } = payload;

    if (!order?.maker_id) return Response.json({ ok: true, skipped: 'no maker_id' });

    const allUsers = await base44.asServiceRole.entities.User.list();
    const makerUser = allUsers.find(u => u.maker_id === order.maker_id);

    if (!makerUser?.email) return Response.json({ ok: true, skipped: 'maker user not found' });

    const orderId = order.id || event?.entity_id;
    const dashboardUrl = `https://jc3dprints.base44.app/ConsumerDashboard`;
    const customerFirstName = order.shipping_address?.name?.split(' ')[0] || 'Customer';
    const addr = order.shipping_address;
    const addrStr = addr
      ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
      : 'No address on file';

    const itemRows = (order.items || []).map(item =>
      `<tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px;">${item.product_name}</td>
        <td style="padding:8px;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;">${item.selected_material || 'PLA'}</td>
        <td style="padding:8px;">${item.selected_color || '—'}</td>
        <td style="padding:8px;text-align:right;">$${(item.total_price || 0).toFixed(2)}</td>
      </tr>`
    ).join('');

    const subject = `New Order Assigned to You — Order #${orderId?.slice(-8)}`;
    const body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">📦 New Order Assigned</h2>
<p>Hi ${makerUser.full_name},</p>
<p>A new order has been assigned to you. Please accept or reject it from your Maker Dashboard within <strong>24 hours</strong>.</p>

<h3>Order #${orderId?.slice(-8)}</h3>
${order.is_priority ? '<div style="background:#fef3c7;border:2px solid #f59e0b;padding:10px;border-radius:6px;margin:10px 0;"><strong>⚡ PRIORITY ORDER</strong> — Must ship by next business day</div>' : ''}

<h4>Ship To</h4>
<p><strong>${customerFirstName}</strong><br/>${addrStr}</p>

<h4>Items</h4>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <thead>
    <tr style="background:#f7fafc;">
      <th style="padding:8px;text-align:left;">Product</th>
      <th style="padding:8px;text-align:center;">Qty</th>
      <th style="padding:8px;text-align:left;">Material</th>
      <th style="padding:8px;text-align:left;">Color</th>
      <th style="padding:8px;text-align:right;">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<h4>Your Earnings</h4>
<p style="font-size:20px;font-weight:bold;color:#0d9488;">$${((order.maker_payout_amount ?? (order.total_amount - (order.shipping_cost || 0)) * 0.5) || 0).toFixed(2)}</p>
<p style="color:#666;font-size:13px;">50% of product subtotal</p>

<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0;color:#1d4ed8;font-weight:600;">⏰ Shipping Deadline</p>
  <p style="margin:4px 0 0;color:#1e40af;font-size:14px;">Orders should ship within <strong>2 business days</strong> of assignment.</p>
</div>

<a href="${dashboardUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Go to Maker Dashboard →</a>

<p style="color:#666;font-size:12px;margin-top:24px;">— The EX3D Team</p>
</div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({ to: makerUser.email, subject, body });

    // If reassignment: notify the original maker they were removed
    const oldMakerId = oldOrder?.maker_id;
    if (oldMakerId && oldMakerId !== order.maker_id) {
      const oldMaker = allUsers.find(u => u.maker_id === oldMakerId);
      if (oldMaker?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: oldMaker.email,
          subject: `Order #${orderId?.slice(-8)} Reassigned`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2>Order Reassigned</h2>
<p>Hi ${oldMaker.full_name},</p>
<p>Order <strong>#${orderId?.slice(-8)}</strong> has been reassigned to another maker. You no longer need to fulfill this order.</p>
<p>— The EX3D Team</p>
</div>`,
        }).catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('notifyMakerOrderAssigned error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});