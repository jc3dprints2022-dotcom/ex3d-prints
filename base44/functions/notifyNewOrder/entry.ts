import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    const order = data;

    if (!order) {
      return Response.json({ ok: true, message: 'No order data' });
    }

    const itemsSummary = (order.items || []).map(item =>
      `- ${item.product_name || 'Item'} x${item.quantity} @ $${(item.unit_price || 0).toFixed(2)}`
    ).join('\n');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'jc3dprints2022@gmail.com',
      subject: `New Order Placed — $${(order.total_amount || 0).toFixed(2)}`,
      body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">🛒 New Order Placed</h2>
<p><strong>Order ID:</strong> ${order.id}</p>
<p><strong>Customer ID:</strong> ${order.customer_id}</p>
<p><strong>Total:</strong> $${(order.total_amount || 0).toFixed(2)}</p>
<p><strong>Status:</strong> ${order.status}</p>
${order.shipping_address ? `<p><strong>Ship To:</strong> ${order.shipping_address.name || ''}, ${order.shipping_address.city || ''}, ${order.shipping_address.state || ''}</p>` : ''}
<h3>Items:</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;">${itemsSummary || 'No items'}</pre>
<p style="color:#666;font-size:12px;margin-top:15px;">View in JC3D Command Center → Order Routing</p>
</div>`
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});