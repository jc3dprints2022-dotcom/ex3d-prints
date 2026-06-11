import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.maker_id) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - Maker access required' 
            }, { status: 401 });
        }

        const { orderId, makerId } = await req.json();

        if (!orderId || !makerId) {
            return Response.json({ 
                success: false,
                error: 'Missing orderId or makerId' 
            }, { status: 400 });
        }

        if (makerId !== user.maker_id) {
            return Response.json({ 
                success: false,
                error: 'You can only complete your own orders' 
            }, { status: 403 });
        }

        let allCabinets = await base44.asServiceRole.entities.PickupCabinet.list();
        
        // Initialize cabinets if they don't exist
        if (allCabinets.length === 0) {
            await base44.asServiceRole.entities.PickupCabinet.bulkCreate([
                { cabinet_number: 1, location: "Student Union - Cabinet 1", unlock_code: "680", current_orders: [] },
                { cabinet_number: 2, location: "Student Union - Cabinet 2", unlock_code: "925", current_orders: [] },
                { cabinet_number: 3, location: "Student Union - Cabinet 3", unlock_code: "573", current_orders: [] }
            ]);
            
            allCabinets = await base44.asServiceRole.entities.PickupCabinet.list();
        }

        // Sort cabinets by cabinet_number to ensure sequential filling
        allCabinets.sort((a, b) => a.cabinet_number - b.cabinet_number);

        // Find first cabinet with space (< 10 orders)
        const availableCabinet = allCabinets.find(c => 
            (!c.current_orders || c.current_orders.length < 10)
        );

        if (availableCabinet) {
            const currentOrders = availableCabinet.current_orders || [];
            currentOrders.push(orderId);
            
            await base44.asServiceRole.entities.PickupCabinet.update(availableCabinet.id, {
                current_orders: currentOrders,
                assigned_at: new Date().toISOString()
            });

            await base44.entities.Order.update(orderId, {
                status: 'completed',
                assigned_cabinet_number: availableCabinet.cabinet_number,
                cabinet_unlock_code: availableCabinet.unlock_code
            });

            console.log(`✅ Order ${orderId} assigned to Cabinet ${availableCabinet.cabinet_number} (${currentOrders.length}/10 slots used)`);

            return Response.json({ 
                success: true,
                cabinet: availableCabinet,
                queued: false,
                slotsUsed: currentOrders.length,
                totalSlots: 10
            });

        } else {
            // All cabinets are full (all have 10 orders) - add to queue
            const existingQueue = await base44.asServiceRole.entities.CabinetQueue.list();
            const queuePosition = existingQueue.filter(q => q.status === 'waiting').length + 1;

            await base44.asServiceRole.entities.CabinetQueue.create({
                order_id: orderId,
                maker_id: makerId,
                queue_position: queuePosition,
                status: 'waiting'
            });

            await base44.entities.Order.update(orderId, {
                status: 'completed'
            });

            console.log(`⏳ All cabinets full. Order ${orderId} added to queue at position ${queuePosition}`);

            return Response.json({ 
                success: true,
                queued: true,
                queuePosition: queuePosition,
                message: 'All cabinets are currently full (30 orders total). You have been added to the queue and will be notified when a cabinet becomes available.'
            });
        }

    } catch (error) {
        console.error('Assign cabinet error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to assign cabinet' 
        }, { status: 500 });
    }
});