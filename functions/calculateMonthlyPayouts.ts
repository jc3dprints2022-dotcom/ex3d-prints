import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate as service role for admin operations
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }

        // Get current month date range
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        console.log('Calculating payouts for:', firstDayOfMonth, 'to', lastDayOfMonth);

        // Get all completed/delivered orders from this month
        const orders = await base44.asServiceRole.entities.Order.list();
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_date);
            return orderDate >= firstDayOfMonth && 
                   orderDate <= lastDayOfMonth &&
                   ['completed', 'dropped_off', 'delivered'].includes(order.status);
        });

        console.log(`Found ${monthlyOrders.length} completed orders this month`);

        // Calculate payouts for makers
        const makerPayouts = {};
        const designerPayouts = {};

        for (const order of monthlyOrders) {
            if (order.maker_id) {
                if (!makerPayouts[order.maker_id]) {
                    makerPayouts[order.maker_id] = {
                        gross: 0,
                        orders: []
                    };
                }

                // Maker gets 50% - $0.30 + priority bonus
                const makerEarnings = ((order.total_amount * 0.7) - 0.30) + (order.is_priority ? 2.80 : 0);
                makerPayouts[order.maker_id].gross += makerEarnings;
                makerPayouts[order.maker_id].orders.push(order.id);
            }

            // Designer payment (10% of order total if designer exists)
            for (const item of order.items || []) {
                if (item.designer_id && item.designer_id !== 'admin') {
                    if (!designerPayouts[item.designer_id]) {
                        designerPayouts[item.designer_id] = {
                            gross: 0,
                            orders: []
                        };
                    }

                    const designerEarnings = item.total_price * 0.10;
                    designerPayouts[item.designer_id].gross += designerEarnings;
                    designerPayouts[item.designer_id].orders.push(order.id);
                }
            }
        }

        // Create payout records
        const payoutRecords = [];

        // Maker payouts
        for (const [makerId, data] of Object.entries(makerPayouts)) {
            try {
                const maker = await base44.asServiceRole.entities.User.get(makerId);
                
                // Get maker's subscription cost (if any)
                const subscription = await base44.asServiceRole.entities.Subscription.filter({
                    user_id: makerId,
                    status: 'active'
                }).then(subs => subs[0]);

                const subscriptionCost = subscription?.price || 0;

                // Get shipping kit charges this month
                const shippingKits = await base44.asServiceRole.entities.ShippingKitOrder.filter({
                    user_id: makerId
                });
                const monthlyShippingCost = shippingKits
                    .filter(kit => {
                        const kitDate = new Date(kit.created_date);
                        return kitDate >= firstDayOfMonth && kitDate <= lastDayOfMonth;
                    })
                    .reduce((sum, kit) => sum + kit.cost, 0);

                const netAmount = data.gross - subscriptionCost - monthlyShippingCost;

                const payout = await base44.asServiceRole.entities.Payout.create({
                    user_id: makerId,
                    user_role: 'maker',
                    gross_amount: data.gross,
                    subscription_cost: subscriptionCost,
                    shipping_kit_charges: monthlyShippingCost,
                    net_amount: netAmount,
                    period_start: firstDayOfMonth.toISOString().split('T')[0],
                    period_end: lastDayOfMonth.toISOString().split('T')[0],
                    status: 'pending',
                    related_orders: data.orders,
                    payout_date: lastDayOfMonth.toISOString()
                });

                // Update maker's payout date to last day of current month
                const currentMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                await base44.asServiceRole.entities.User.update(makerId, {
                    payout_date: currentMonthLastDay.toISOString().split('T')[0]
                });

                payoutRecords.push(payout);
            } catch (error) {
                console.error(`Failed to create payout for maker ${makerId}:`, error);
            }
        }

        // Designer payouts
        for (const [designerId, data] of Object.entries(designerPayouts)) {
            try {
                const payout = await base44.asServiceRole.entities.Payout.create({
                    user_id: designerId,
                    user_role: 'designer',
                    gross_amount: data.gross,
                    subscription_cost: 0,
                    shipping_kit_charges: 0,
                    platform_fees: 0,
                    net_amount: data.gross,
                    period_start: firstDayOfMonth.toISOString().split('T')[0],
                    period_end: lastDayOfMonth.toISOString().split('T')[0],
                    status: 'pending',
                    related_orders: data.orders,
                    payout_date: lastDayOfMonth.toISOString()
                });

                // Update designer's payout date to last day of current month
                const currentMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                await base44.asServiceRole.entities.User.update(designerId, {
                    payout_date: currentMonthLastDay.toISOString().split('T')[0]
                });

                payoutRecords.push(payout);
            } catch (error) {
                console.error(`Failed to create payout for designer ${designerId}:`, error);
            }
        }

        console.log(`Created ${payoutRecords.length} payout records`);

        return Response.json({
            success: true,
            payouts_created: payoutRecords.length,
            maker_payouts: Object.keys(makerPayouts).length,
            designer_payouts: Object.keys(designerPayouts).length,
            total_maker_gross: Object.values(makerPayouts).reduce((sum, p) => sum + p.gross, 0),
            total_designer_gross: Object.values(designerPayouts).reduce((sum, p) => sum + p.gross, 0)
        });

    } catch (error) {
        console.error('Payout calculation error:', error);
        return Response.json({
            error: 'Failed to calculate payouts',
            details: error.message
        }, { status: 500 });
    }
});