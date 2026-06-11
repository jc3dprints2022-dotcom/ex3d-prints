import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { orderId } = await req.json();

        if (!orderId) {
            return Response.json({ 
                success: false,
                error: 'Order ID is required' 
            }, { status: 400 });
        }

        // Get the order
        const order = await base44.entities.Order.get(orderId);

        if (!order) {
            return Response.json({ 
                success: false,
                error: 'Order not found' 
            }, { status: 404 });
        }

        // Verify the user owns this order
        if (order.customer_id !== user.id) {
            return Response.json({ 
                success: false,
                error: 'You can only confirm pickup for your own orders' 
            }, { status: 403 });
        }

        // Verify order is ready for pickup
        if (!['completed', 'dropped_off'].includes(order.status)) {
            return Response.json({ 
                success: false,
                error: 'Order is not ready for pickup' 
            }, { status: 400 });
        }

        // Update order status to delivered
        await base44.entities.Order.update(orderId, {
            status: 'delivered',
            picked_up_at: new Date().toISOString()
        });

        // If order had an assigned cabinet, release it
        if (order.assigned_cabinet_number) {
            try {
                // Find the cabinet - use asServiceRole for admin operations
                const allCabinets = await base44.asServiceRole.entities.PickupCabinet.list();
                const cabinet = allCabinets.find(c => 
                    c.cabinet_number === order.assigned_cabinet_number && 
                    c.current_order_id === orderId
                );

                if (cabinet) {
                    // Release the cabinet
                    await base44.asServiceRole.entities.PickupCabinet.update(cabinet.id, {
                        is_occupied: false,
                        current_order_id: null,
                        assigned_at: null
                    });

                    // Check if there's a queue
                    const queue = await base44.asServiceRole.entities.CabinetQueue.filter({ 
                        status: 'waiting' 
                    });

                    if (queue.length > 0) {
                        // Sort by queue position
                        queue.sort((a, b) => a.queue_position - b.queue_position);
                        const nextInQueue = queue[0];

                        // Assign cabinet to next in queue
                        await base44.asServiceRole.entities.PickupCabinet.update(cabinet.id, {
                            is_occupied: true,
                            current_order_id: nextInQueue.order_id,
                            assigned_at: new Date().toISOString()
                        });

                        // Update the queued order
                        await base44.asServiceRole.entities.Order.update(nextInQueue.order_id, {
                            assigned_cabinet_number: cabinet.cabinet_number,
                            cabinet_unlock_code: cabinet.unlock_code,
                            status: 'completed'
                        });

                        // Mark queue item as assigned
                        await base44.asServiceRole.entities.CabinetQueue.update(nextInQueue.id, {
                            status: 'assigned'
                        });

                        // Get maker and send notification email
                        try {
                            const allUsers = await base44.asServiceRole.entities.User.list();
                            const maker = allUsers.find(u => u.maker_id === nextInQueue.maker_id);

                            if (maker && maker.email) {
                                await base44.functions.invoke('sendEmail', {
                                    to: maker.email,
                                    subject: 'Cabinet Now Available - EX3D Prints',
                                    body: `Hi ${maker.full_name},

Good news! A pickup cabinet is now available for your completed order.

📦 Cabinet Number: ${cabinet.cabinet_number}
📍 Location: ${cabinet.location}
🔐 Unlock Code: ${cabinet.unlock_code}
📋 Order ID: #${nextInQueue.order_id.slice(-8)}

Please drop off the order at your earliest convenience.

Best regards,
The EX3D Team`
                                });
                            }
                        } catch (emailError) {
                            console.error('Failed to send maker notification:', emailError);
                        }
                    }
                }
            } catch (cabinetError) {
                console.error('Error releasing cabinet:', cabinetError);
                // Don't fail the whole operation if cabinet release fails
            }
        }

        return Response.json({ 
            success: true,
            message: 'Pickup confirmed successfully'
        });

    } catch (error) {
        console.error('Confirm pickup error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to confirm pickup' 
        }, { status: 500 });
    }
});