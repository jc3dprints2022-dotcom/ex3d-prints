import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin-only function
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { makerId } = await req.json().catch(() => ({}));

        // Get start of current week
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Get all makers or specific maker
        const allUsers = await base44.asServiceRole.entities.User.list();
        const makers = makerId 
            ? allUsers.filter(u => u.maker_id === makerId)
            : allUsers.filter(u => u.maker_id && u.business_roles?.includes('maker'));

        const results = [];

        for (const maker of makers) {
            // Get orders for this maker this week
            const allOrders = await base44.asServiceRole.entities.Order.list();
            const makerOrders = allOrders.filter(o => 
                o.maker_id === maker.maker_id && 
                new Date(o.created_date) >= weekStart
            );

            const completedOrders = makerOrders.filter(o => 
                ['completed', 'dropped_off', 'delivered'].includes(o.status)
            );

            // Calculate metrics
            const totalOrders = completedOrders.length;
            let lateOrders = 0;
            let defectiveOrders = 0;
            let totalTurnaround = 0;

            for (const order of completedOrders) {
                // Check if late (more than 7 days from created to completed)
                const createdDate = new Date(order.created_date);
                const completedDate = new Date(order.dropped_off_at || order.updated_date);
                const daysDiff = (completedDate - createdDate) / (1000 * 60 * 60 * 24);
                
                if (daysDiff > 7) {
                    lateOrders++;
                }

                totalTurnaround += daysDiff * 24; // hours

                // Check for defects (cancelled after accepted, or refunded)
                if (order.status === 'cancelled' || order.payment_status === 'refunded') {
                    defectiveOrders++;
                }
            }

            const onTimeRate = totalOrders > 0 ? ((totalOrders - lateOrders) / totalOrders) * 100 : 100;
            const defectRate = totalOrders > 0 ? (defectiveOrders / totalOrders) * 100 : 0;
            const avgTurnaround = totalOrders > 0 ? totalTurnaround / totalOrders : 0;

            // Get previous performance to check for consecutive weeks below standard
            const prevPerformance = await base44.asServiceRole.entities.MakerPerformance.list();
            const lastWeekPerf = prevPerformance
                .filter(p => p.maker_id === maker.maker_id)
                .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))[0];

            let consecutiveWeeks = 0;
            let flagged = false;
            let priorityReduced = false;

            // Check if below standards
            const belowStandard = onTimeRate < 95 || defectRate > 5;
            
            if (belowStandard) {
                consecutiveWeeks = (lastWeekPerf?.consecutive_weeks_below_standard || 0) + 1;
                if (consecutiveWeeks >= 2) {
                    flagged = true;
                    priorityReduced = true;
                }
            }

            // Determine tier
            let tier = 'bronze';
            if (onTimeRate >= 98 && defectRate < 2 && totalOrders >= 10) {
                tier = 'gold';
            } else if (onTimeRate >= 95 && defectRate < 5 && totalOrders >= 5) {
                tier = 'silver';
            }

            // Create or update performance record
            const existingPerf = await base44.asServiceRole.entities.MakerPerformance.filter({
                maker_id: maker.maker_id,
                week_start: weekStart.toISOString().split('T')[0]
            });

            const perfData = {
                maker_id: maker.maker_id,
                week_start: weekStart.toISOString().split('T')[0],
                tier,
                on_time_delivery_rate: onTimeRate,
                defect_rate: defectRate,
                average_turnaround_hours: avgTurnaround,
                responsiveness_rating: lastWeekPerf?.responsiveness_rating || 5,
                total_volume_fulfilled: totalOrders,
                orders_completed: totalOrders,
                orders_late: lateOrders,
                orders_defective: defectiveOrders,
                flagged_for_review: flagged,
                consecutive_weeks_below_standard: consecutiveWeeks,
                routing_priority_reduced: priorityReduced
            };

            if (existingPerf.length > 0) {
                await base44.asServiceRole.entities.MakerPerformance.update(existingPerf[0].id, perfData);
            } else {
                await base44.asServiceRole.entities.MakerPerformance.create(perfData);
            }

            results.push({
                maker_id: maker.maker_id,
                maker_name: maker.full_name,
                tier,
                metrics: perfData
            });
        }

        return Response.json({ 
            success: true,
            results,
            week_start: weekStart.toISOString()
        });

    } catch (error) {
        console.error('Performance calculation error:', error);
        return Response.json({ 
            error: 'Failed to calculate performance',
            details: error.message 
        }, { status: 500 });
    }
});