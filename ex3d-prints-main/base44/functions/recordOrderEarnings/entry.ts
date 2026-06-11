import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called after an order is created to record designer royalties and maker earnings.
// Args: { orderId }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, overrideSubtotal } = await req.json();
    if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });

    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orderResults?.[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const shippingCost = order.shipping_cost || 0;
    // For free/affiliate orders, use overrideSubtotal (the product's standard price)
    // so maker and designer still get paid even though the customer paid $0
    const productSubtotal = overrideSubtotal != null
      ? Number(overrideSubtotal)
      : (order.total_amount || 0) - shippingCost;

    // ── Designer royalties (10% per product) ──────────────────────────────────
    const designerGroups = {};
    for (const item of (order.items || [])) {
      if (!item.designer_id) continue;
      // For free/affiliate orders, use standard_price if total_price is 0
      const effectiveItemPrice = (item.total_price && item.total_price > 0)
        ? item.total_price
        : ((item.standard_price || item.unit_price || 0) * (item.quantity || 1));
      const itemSubtotal = effectiveItemPrice || (overrideSubtotal != null ? overrideSubtotal : 0);
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
    const allUsers = await base44.asServiceRole.entities.User.list();
    if (order.maker_id) {
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

    // ── Affiliate commission (20% of total order if referred) ─────────────────
    const notes = order.notes || '';
    const affiliateMatch = notes.match(/ref:([a-z0-9_-]+)|affiliate_id:([a-z0-9_-]+)/i);
    if (affiliateMatch) {
      const affiliateId = affiliateMatch[1] || affiliateMatch[2];
      const allAffiliates = await base44.asServiceRole.entities.Affiliate.list();
      const affiliateRecord = allAffiliates.find(a => a.affiliate_id === affiliateId);
      if (affiliateRecord && (order.total_amount || 0) > 0) {
        const commissionAmount = (order.total_amount || 0) * 0.20;
        await base44.asServiceRole.entities.AffiliateEarnings.create({
          affiliate_id: affiliateId,
          affiliate_user_id: affiliateRecord.user_id || null,
          order_id: orderId,
          order_amount: order.total_amount,
          commission_amount: commissionAmount,
          status: 'pending',
        });
        // Update affiliate stats
        await base44.asServiceRole.entities.Affiliate.update(affiliateRecord.id, {
          total_orders: (affiliateRecord.total_orders || 0) + 1,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('recordOrderEarnings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});