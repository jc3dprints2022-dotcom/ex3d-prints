import { createClient } from 'npm:@base44/sdk@0.7.1';

/**
 * FULLY AUTOMATED - Runs every hour via CRON
 * Checks for orders pending over 24 hours and auto-reassigns
 */

Deno.serve(async (req) => {
    console.log('=== AUTOMATED Order Reassignment Running ===');
    console.log('Time:', new Date().toISOString());

    try {
        // Use service role key for admin operations
        const serviceKey = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
        if (!serviceKey) {
            throw new Error("Service role key not configured.");
        }
        const base44 = createClient({ serviceRoleKey: serviceKey });

        // Get all pending orders
        const allOrders = await base44.entities.Order.filter({ status: 'pending' });
        
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const staleOrders = allOrders.filter(order => {
            const orderDate = new Date(order.created_date);
            return orderDate < twentyFourHoursAgo;
        });

        console.log(`Found ${staleOrders.length} stale orders to reassign`);

        const results = [];

        for (const order of staleOrders) {
            try {
                console.log(`Reassigning order ${order.id}...`);

                const excludedMakerIds = order.maker_id ? [order.maker_id] : [];

                const assignResult = await base44.functions.invoke('assignOrderToMaker', {
                    orderId: order.id,
                    excludedMakerIds: excludedMakerIds
                });

                if (assignResult.data?.success && assignResult.data?.assignedMaker) {
                    const maker = assignResult.data.assignedMaker;

                    // Get all users to find maker email
                    const allUsers = await base44.entities.User.list();
                    const makerUser = allUsers.find(u => u.maker_id === maker.maker_id);

                    if (makerUser && makerUser.email) {
                        try {
                            await base44.functions.invoke('sendEmail', {
                                to: makerUser.email,
                                subject: 'New Order Assigned - EX3D Prints',
                                body: `Hi ${makerUser.full_name},

You have a new order assigned to you!

Order ID: ${order.id.slice(-8)}

This order was automatically reassigned after 24 hours of inactivity.

Please log in to your Maker Dashboard to view and accept this order.

Best regards,
The EX3D Team`
                            });
                        } catch (emailError) {
                            console.error('Failed to send maker email:', emailError);
                        }
                    }

                    // Add note to order about reassignment
                    const newNote = `${order.notes || ''}\n[AUTO-REASSIGN ${new Date().toISOString()}] Reassigned from ${order.maker_id || 'unassigned'} to ${maker.maker_id} after 24hr inactivity`.trim();
                    await base44.entities.Order.update(order.id, { notes: newNote });

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
            timestamp: new Date().toISOString(),
            stale_orders_found: staleOrders.length,
            reassigned: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });

    } catch (error) {
        console.error('=== CRITICAL ERROR ===');
        console.error('Message:', error.message);

        return Response.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});