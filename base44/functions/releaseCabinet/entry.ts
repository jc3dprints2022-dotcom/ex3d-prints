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

        const order = await base44.entities.Order.get(orderId);

        if (!order.assigned_cabinet_number) {
            return Response.json({ 
                success: false,
                error: 'No cabinet assigned to this order' 
            }, { status: 400 });
        }

        const allCabinets = await base44.asServiceRole.entities.PickupCabinet.list();
        const cabinet = allCabinets.find(c => 
            c.cabinet_number === order.assigned_cabinet_number
        );

        if (!cabinet) {
            return Response.json({ 
                success: false,
                error: 'Cabinet not found' 
            }, { status: 404 });
        }

        // Remove order from cabinet
        const currentOrders = cabinet.current_orders || [];
        const updatedOrders = currentOrders.filter(id => id !== orderId);

        await base44.asServiceRole.entities.PickupCabinet.update(cabinet.id, {
            current_orders: updatedOrders
        });

        // Check if there's a queue
        const queue = await base44.asServiceRole.entities.CabinetQueue.filter({ 
            status: 'waiting' 
        });

        if (queue.length > 0 && updatedOrders.length < 10) {
            queue.sort((a, b) => a.queue_position - b.queue_position);
            const nextInQueue = queue[0];

            updatedOrders.push(nextInQueue.order_id);
            
            await base44.asServiceRole.entities.PickupCabinet.update(cabinet.id, {
                current_orders: updatedOrders,
                assigned_at: new Date().toISOString()
            });

            await base44.asServiceRole.entities.Order.update(nextInQueue.order_id, {
                assigned_cabinet_number: cabinet.cabinet_number,
                cabinet_unlock_code: cabinet.unlock_code,
                status: 'completed'
            });

            await base44.asServiceRole.entities.CabinetQueue.update(nextInQueue.id, {
                status: 'assigned'
            });

            // Notify maker
            try {
                const maker = await base44.asServiceRole.entities.User.filter({ 
                    maker_id: nextInQueue.maker_id 
                });

                if (maker.length > 0 && maker[0].email) {
                    await base44.functions.invoke('sendEmail', {
                        to: maker[0].email,
                        subject: 'Cabinet Now Available - EX3D Prints',
                        body: `Hi ${maker[0].full_name},

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

        return Response.json({ 
            success: true,
            message: 'Cabinet space released successfully'
        });

    } catch (error) {
        console.error('Release cabinet error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to release cabinet' 
        }, { status: 500 });
    }
});