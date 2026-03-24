import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Auto Reassign Stale Orders - Running ===');
    console.log('Time:', new Date().toISOString());

    try {
        // This function doesn't require user auth - it's a system cron job
        // Use service role for all operations
        const base44 = createClientFromRequest(req);

        // Get all orders that are "pending" for more than 24 hours
        const allOrders = await base44.asServiceRole.entities.Order.filter({ status: 'pending' });
        
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const staleOrders = allOrders.filter(order => 
            new Date(order.created_date) < twentyFourHoursAgo
        );

        console.log(`Found ${staleOrders.length} stale orders to reassign`);

        const results = [];

        for (const order of staleOrders) {
            try {
                console.log(`Reassigning order ${order.id}...`);

                // Call the assignment function
                const assignResult = await base44.asServiceRole.functions.invoke('assignOrderToMaker', {
                    orderId: order.id
                });

                if (assignResult.data?.success && assignResult.data?.assignedMaker) {
                    const maker = assignResult.data.assignedMaker;

                    // Update order with new maker
                    await base44.asServiceRole.entities.Order.update(order.id, {
                        maker_id: maker.maker_id,
                        status: 'pending'
                    });

                    console.log(`✓ Reassigned order ${order.id} to maker ${maker.full_name}`);
                    
                    results.push({
                        order_id: order.id,
                        success: true,
                        new_maker: maker.full_name
                    });
                } else {
                    console.log(`✗ No available maker for order ${order.id}`);
                    results.push({
                        order_id: order.id,
                        success: false,
                        reason: 'No available makers'
                    });
                }
            } catch (error) {
                console.error(`✗ Failed to reassign order ${order.id}:`, error.message);
                results.push({
                    order_id: order.id,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log('=== Reassignment Complete ===');
        console.log(`Successfully reassigned: ${results.filter(r => r.success).length}`);
        console.log(`Failed: ${results.filter(r => !r.success).length}`);

        return Response.json({
            success: true,
            stale_orders_found: staleOrders.length,
            reassigned: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });

    } catch (error) {
        console.error('=== ERROR ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);

        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});