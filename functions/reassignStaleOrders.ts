import { createClient } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
    try {
        const serviceKey = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
        if (!serviceKey) {
            throw new Error("Service role key not configured.");
        }
        const base44 = createClient({ serviceRoleKey: serviceKey });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Find orders that are 'pending' and older than 24 hours
        const staleOrders = await base44.entities.Order.filter({
            status: 'pending',
            created_date: { $lt: twentyFourHoursAgo }
        });

        if (staleOrders.length === 0) {
            return Response.json({ success: true, message: 'No stale orders to reassign.' });
        }
        
        let reassignments = 0;
        const errors = [];

        for (const order of staleOrders) {
            try {
                // Get current maker to exclude them
                const currentMakerId = order.maker_id;
                
                // Re-invoke the assignment function, excluding the current maker
                const result = await base44.functions.invoke('assignOrderToMaker', {
                    orderId: order.id,
                    excludedMakerIds: [currentMakerId]
                });

                if (result.data.success) {
                    reassignments++;
                    // Optionally, add a note to the order
                    const newNote = `${order.notes || ''}\n[SYSTEM] Reassigned from ${currentMakerId} due to inactivity on ${new Date().toISOString()}`.trim();
                    await base44.entities.Order.update(order.id, { notes: newNote });
                } else {
                    errors.push(`Order ${order.id}: ${result.data.error || 'Failed to reassign.'}`);
                }
            } catch (e) {
                errors.push(`Order ${order.id}: ${e.message}`);
            }
        }

        return Response.json({
            success: true,
            reassigned_count: reassignments,
            errors: errors
        });

    } catch (error) {
        console.error('Error reassigning stale orders:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});