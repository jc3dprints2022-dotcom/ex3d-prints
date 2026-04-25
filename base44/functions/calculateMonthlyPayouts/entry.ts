import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const currentMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        console.log('Calculating payouts for:', firstDayOfMonth, 'to', lastDayOfMonth);

        const orders = await base44.asServiceRole.entities.Order.list();
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_date);
            return orderDate >= firstDayOfMonth &&
                   orderDate <= lastDayOfMonth &&
                   ['completed', 'dropped_off', 'delivered'].includes(order.status);
        });

        console.log(`Found ${monthlyOrders.length} completed orders this month`);

        const makerPayouts = {};
        const designerPayouts = {};

        for (const order of monthlyOrders) {
            if (order.maker_id) {
                if (!makerPayouts[order.maker_id]) {
                    makerPayouts[order.maker_id] = { gross: 0, orders: [] };
                }
                const itemsTotal = (order.items || []).reduce((s, item) => s + (item.total_price || 0), 0);
                makerPayouts[order.maker_id].gross += itemsTotal * 0.5;
                makerPayouts[order.maker_id].orders.push(order.id);
            }

            for (const item of order.items || []) {
                if (item.designer_id && item.designer_id !== 'admin') {
                    if (!designerPayouts[item.designer_id]) {
                        designerPayouts[item.designer_id] = { gross: 0, orders: [], items: [] };
                    }
                    const designerEarnings = (item.total_price || 0) * 0.10;
                    designerPayouts[item.designer_id].gross += designerEarnings;
                    designerPayouts[item.designer_id].orders.push(order.id);
                    designerPayouts[item.designer_id].items.push({
                        order_id: order.id,
                        product_id: item.product_id,
                        sale_amount: item.total_price || 0,
                        royalty_amount: designerEarnings,
                    });
                }
            }
        }

        const payoutRecords = [];

        // ── MAKER PAYOUTS ─────────────────────────────────────────────────────
        for (const [makerId, data] of Object.entries(makerPayouts)) {
            try {
                await base44.asServiceRole.entities.User.get(makerId);

                const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
                    user_id: makerId,
                    status: 'active'
                }).catch(() => []);
                const subscriptionCost = subscriptions[0]?.price || 0;

                const shippingKits = await base44.asServiceRole.entities.ShippingKitOrder.filter({
                    user_id: makerId
                }).catch(() => []);
                const monthlyShippingCost = shippingKits
                    .filter(kit => {
                        const kitDate = new Date(kit.created_date);
                        return kitDate >= firstDayOfMonth && kitDate <= lastDayOfMonth;
                    })
                    .reduce((sum, kit) => sum + (kit.cost || 0), 0);

                const netAmount = data.gross - subscriptionCost - monthlyShippingCost;

                // Try to create MakerEarnings records — safe if entity doesn't exist yet
                for (const orderId of data.orders) {
                    try {
                        const order = monthlyOrders.find(o => o.id === orderId);
                        if (!order) continue;
                        const itemsTotal = (order.items || []).reduce((s, item) => s + (item.total_price || 0), 0);
                        await base44.asServiceRole.entities.MakerEarnings.create({
                            maker_user_id: makerId,
                            maker_id: makerId,
                            order_id: orderId,
                            maker_earnings: itemsTotal * 0.5,
                            status: 'pending',
                            created_date: new Date().toISOString(),
                        });
                    } catch (meErr) {
                        console.warn(`MakerEarnings entity unavailable or write failed for order ${orderId}:`, meErr.message);
                    }
                }

                // Always create Payout record — this is what dashboards read from
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

                await base44.asServiceRole.entities.User.update(makerId, {
                    payout_date: currentMonthLastDay.toISOString().split('T')[0]
                }).catch(() => {});

                for (const orderId of data.orders) {
                    try {
                        await base44.functions.invoke('createStripeTransferToMaker', { orderId });
                    } catch (transferErr) {
                        console.error(`Stripe transfer failed for order ${orderId}:`, transferErr.message);
                    }
                }

                payoutRecords.push(payout);
            } catch (error) {
                console.error(`Failed to create payout for maker ${makerId}:`, error);
            }
        }

        // ── DESIGNER PAYOUTS ──────────────────────────────────────────────────
        for (const [designerId, data] of Object.entries(designerPayouts)) {
            try {
                // Try to create DesignerEarnings records — safe if entity doesn't exist yet
                for (const item of data.items) {
                    try {
                        await base44.asServiceRole.entities.DesignerEarnings.create({
                            designer_id: designerId,
                            order_id: item.order_id,
                            product_id: item.product_id,
                            sale_amount: item.sale_amount,
                            royalty_amount: item.royalty_amount,
                            status: 'pending',
                            created_date: new Date().toISOString(),
                        });
                    } catch (deErr) {
                        console.warn(`DesignerEarnings entity unavailable or write failed:`, deErr.message);
                    }
                }

                // Always create Payout record — this is what dashboards read from
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

                await base44.asServiceRole.entities.User.update(designerId, {
                    payout_date: currentMonthLastDay.toISOString().split('T')[0]
                }).catch(() => {});

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