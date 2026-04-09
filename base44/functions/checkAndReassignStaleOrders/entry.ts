import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('=== Checking for expired order offers (12hr) ===');
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();

    // Load all orders that are pending with an active offer
    const allOrders = await base44.asServiceRole.entities.Order.list();

    const expiredOffers = allOrders.filter(order => {
      if (order.status !== 'pending') return false;
      if (order.offer_status !== 'offered') return false;
      if (!order.offer_expires_at) {
        // Legacy orders without offer_expires_at: use 12hr from created_date
        return new Date(order.created_date) < new Date(now - 12 * 60 * 60 * 1000);
      }
      return new Date(order.offer_expires_at) < now;
    });

    console.log(`Found ${expiredOffers.length} expired offer(s)`);

    if (expiredOffers.length === 0) {
      return Response.json({ success: true, message: 'No expired offers found', checked_at: now.toISOString() });
    }

    let reassigned = 0;
    const errors = [];

    for (const order of expiredOffers) {
      try {
        const expiredMakerId = order.current_offered_maker_id || order.maker_id;
        const newSkipped = [...new Set([...(order.skipped_maker_ids || []), ...(expiredMakerId ? [expiredMakerId] : [])])];

        console.log(`Order ${order.id} offer expired for maker ${expiredMakerId} — trying next maker`);

        // Mark offer as expired
        await base44.asServiceRole.entities.Order.update(order.id, {
          offer_status: 'expired',
          maker_id: null,
          current_offered_maker_id: null,
          skipped_maker_ids: newSkipped,
          notes: `${order.notes || ''}\n[AUTO-EXPIRE ${now.toISOString()}] Offer to ${expiredMakerId} expired after 12 hrs`.trim(),
        });

        // Re-offer to next best maker
        const result = await base44.asServiceRole.functions.invoke('assignOrderToMaker', {
          orderId: order.id,
          skippedMakerIds: newSkipped,
        });

        if (result.data?.success) {
          reassigned++;
          console.log(`✓ Order ${order.id} re-offered to ${result.data.offeredTo?.full_name}`);
        } else {
          errors.push(`Order ${order.id}: ${result.data?.error || 'No eligible makers'}`);
          console.log(`✗ Order ${order.id}: ${result.data?.error}`);
        }
      } catch (e) {
        errors.push(`Order ${order.id}: ${e.message}`);
        console.error(`✗ Order ${order.id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      expired_found: expiredOffers.length,
      re_offered: reassigned,
      errors,
      checked_at: now.toISOString(),
    });

  } catch (error) {
    console.error('checkAndReassignStaleOrders error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});