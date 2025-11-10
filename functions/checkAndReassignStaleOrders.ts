import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Checking for stale orders ===');
    
    try {
        const serviceKey = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
        if (!serviceKey) {
            throw new Error("Service role key not configured.");
        }
        const base44 = createClient({ serviceRoleKey: serviceKey });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log('Looking for orders pending since before:', twentyFourHoursAgo.toISOString());

        // Get all orders with 'pending' status
        const allOrders = await base44.entities.Order.list();
        const staleOrders = allOrders.filter(order => {
            if (order.status !== 'pending') return false;
            const orderDate = new Date(order.created_date);
            return orderDate < twentyFourHoursAgo;
        });

        console.log(`Found ${staleOrders.length} stale orders`);

        if (staleOrders.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'No stale orders found',
                checked_at: new Date().toISOString()
            });
        }
        
        let reassignments = 0;
        const errors = [];

        for (const order of staleOrders) {
            try {
                console.log(`Processing order ${order.id}, current maker: ${order.maker_id}`);
                
                // Call assignment function, excluding current maker
                const result = await base44.functions.invoke('assignOrderToMaker', {
                    orderId: order.id,
                    excludedMakerIds: order.maker_id ? [order.maker_id] : []
                });

                if (result.data?.success) {
                    reassignments++;
                    
                    // Add note to order
                    const newNote = `${order.notes || ''}\n[AUTO-REASSIGN ${new Date().toISOString()}] Reassigned from ${order.maker_id || 'unassigned'} to ${result.data.assignedMaker.maker_id} due to 24hr inactivity`.trim();
                    await base44.entities.Order.update(order.id, { 
                        notes: newNote,
                        updated_date: new Date().toISOString()
                    });
                    
                    console.log(`✓ Order ${order.id} reassigned to ${result.data.assignedMaker.maker_id}`);
                } else {
                    errors.push(`Order ${order.id}: ${result.data?.error || 'Failed to reassign.'}`);
                    console.log(`✗ Order ${order.id}: ${result.data?.error || 'Failed to reassign'}`);
                }
            } catch (e) {
                errors.push(`Order ${order.id}: ${e.message}`);
                console.error(`✗ Order ${order.id} error:`, e.message);
            }
        }

        console.log('=== Reassignment complete ===');
        console.log(`Reassigned: ${reassignments}, Errors: ${errors.length}`);

        return Response.json({
            success: true,
            summary: {
                stale_orders_found: staleOrders.length,
                successfully_reassigned: reassignments,
                errors: errors.length
            },
            reassigned_count: reassignments,
            errors: errors,
            checked_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Critical error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});