import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Public stats endpoint — no auth required. Uses service role to read aggregate data.
// Calculations match exactly what PaymentsFinancialsSection shows.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const [allOrders, allUsers] = await Promise.all([
            base44.asServiceRole.entities.Order.list(),
            base44.asServiceRole.entities.User.list(),
        ]);

        // Mirror isProductionOrder from PaymentsFinancialsSection
        const isProductionOrder = (order) => {
            const notes = (order.notes || '').toLowerCase();
            if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return false;
            const items = order.items || [];
            return items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
        };

        const completedStatuses = ['completed', 'delivered', 'dropped_off', 'shipped', 'done_printing'];
        const completedPaid = allOrders.filter(o =>
            isProductionOrder(o) &&
            completedStatuses.includes(o.status) &&
            o.payment_status === 'paid'
        );

        // Maker total: 50% of listing cost + $4 per priority order (matches PaymentsFinancialsSection)
        const makerTotal = completedPaid.reduce((s, o) => {
            const listing = (o.total_amount || 0) - (o.shipping_cost || 0);
            return s + listing * 0.50 + (o.is_priority ? 4 : 0);
        }, 0);

        // Designer total: 10% of item price for attributed items (matches PaymentsFinancialsSection)
        let designerTotal = 0;
        completedPaid.forEach(o => {
            (o.items || []).forEach(item => {
                if (item.designer_id && item.designer_id !== 'admin') {
                    designerTotal += (item.total_price || 0) * 0.10;
                }
            });
        });

        const paidOrders = allOrders.filter(o => isProductionOrder(o) && o.payment_status === 'paid');
        const orderCount = paidOrders.length;

        // Active makers: users with maker role
        const activeMakers = allUsers.filter(u =>
            u.business_roles?.includes('maker') && u.role !== 'admin'
        );
        const makerCount = activeMakers.length;

        // States reached: unique states from shipping addresses of completed paid orders
        const stateSet = new Set();
        completedPaid.forEach(o => {
            const state = o.shipping_address?.state;
            if (state) stateSet.add(state.trim().toUpperCase());
        });
        const statesCount = stateSet.size || 1;

        return Response.json({
            maker_total: makerTotal,
            designer_total: designerTotal,
            order_count: orderCount,
            maker_count: makerCount,
            states_count: statesCount,
        });
    } catch (error) {
        console.error('getPublicStats error:', error);
        return Response.json({ maker_total: 0, designer_total: 0, order_count: 0, maker_count: 0, states_count: 1 });
    }
});