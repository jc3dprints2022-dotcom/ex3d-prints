import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called after an order is created to record designer royalties and maker earnings.
// Args: { orderId }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const shippingCost = order.shipping_cost || 0;
    const productSubtotal = (order.total_amount || 0) - shippingCost;

    // ── Designer royalties (10% per product) ──────────────────────────────────
    const designerGroups = {};
    for (const item of (order.items || [])) {
      if (!item.designer_id) continue;
      const itemSubtotal = item.total_price || (item.unit_price * item.quantity) || 0;
      const royalty = itemSubtotal * 0.10;
      if (!designerGroups[item.designer_id]) designerGroups[item.designer_id] = [];
      designerGroups[item.designer_id].push({
        product_id: item.product_id,
        product_name: item.product_name,
        order_amount: itemSubtotal,
        royalty_amount: royalty,
      });
    }

    for (const [designerId, items] of Object.entries(designerGroups)) {
      for (const item of items) {
        await base44.asServiceRole.entities.DesignerEarnings.create({
          designer_id: designerId,
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          order_amount: item.order_amount,
          royalty_amount: item.royalty_amount,
          status: 'pending',
        });
      }
    }

    // ── Maker earnings (50% of product subtotal) ──────────────────────────────
    if (order.maker_id) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const makerUser = allUsers.find(u => u.maker_id === order.maker_id);
      const makerEarnings = productSubtotal * 0.50;

      await base44.asServiceRole.entities.MakerEarnings.create({
        maker_id: order.maker_id,
        maker_user_id: makerUser?.id || null,
        order_id: orderId,
        product_amount: productSubtotal,
        maker_earnings: makerEarnings,
        status: 'pending',
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('recordOrderEarnings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});