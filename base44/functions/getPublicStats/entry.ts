import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Public stats endpoint — no auth required. Uses service role to read aggregate data.
// Called by ForMakers and ForDesigners pages to display live earnings counters.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Total paid to makers
        let makerTotal = 0;
        let designerTotal = 0;
        let orderCount = 0;
        let makerCount = 0;

        try {
            const makerEarnings = await base44.asServiceRole.entities.MakerEarnings.list();
            makerTotal = makerEarnings.reduce((sum, e) => sum + (e.maker_earnings || 0), 0);
        } catch (_) {
            // MakerEarnings may not exist yet — fall back to orders
            try {
                const orders = await base44.asServiceRole.entities.Order.filter({ payment_status: 'paid' });
                makerTotal = orders.reduce((sum, o) => sum + (o.maker_payout_amount || 0), 0);
            } catch (_) {}
        }

        try {
            const designerEarnings = await base44.asServiceRole.entities.DesignerEarnings.list();
            designerTotal = designerEarnings.reduce((sum, e) => sum + (e.royalty_amount || 0), 0);
        } catch (_) {
            // DesignerEarnings may not exist yet — skip
        }

        try {
            const orders = await base44.asServiceRole.entities.Order.filter({ payment_status: 'paid' });
            orderCount = orders.length;
        } catch (_) {}

        try {
            const makers = await base44.asServiceRole.entities.User.filter({ role: 'maker' });
            makerCount = makers.length;
        } catch (_) {}

        return Response.json({
            maker_total: makerTotal,
            designer_total: designerTotal,
            order_count: orderCount,
            maker_count: makerCount,
        });
    } catch (error) {
        console.error('getPublicStats error:', error);
        // Return zeros rather than an error — public page should degrade gracefully
        return Response.json({
            maker_total: 0,
            designer_total: 0,
            order_count: 0,
            maker_count: 0,
        });
    }
});
