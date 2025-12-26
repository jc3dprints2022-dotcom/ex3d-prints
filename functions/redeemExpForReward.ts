import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reward_id } = await req.json();

        if (!reward_id) {
            return Response.json({ error: 'Reward ID is required' }, { status: 400 });
        }

        // Get reward details
        const reward = await base44.asServiceRole.entities.ExpReward.get(reward_id);

        if (!reward || !reward.is_active) {
            return Response.json({ error: 'Reward not available' }, { status: 400 });
        }

        // Check if user has enough EXP
        if ((user.exp_points || 0) < reward.exp_cost) {
            return Response.json({ 
                error: `Insufficient EXP. You need ${reward.exp_cost} EXP but have ${user.exp_points || 0} EXP.` 
            }, { status: 400 });
        }

        // Check stock if applicable
        if (reward.stock_quantity !== undefined && reward.stock_quantity <= 0) {
            return Response.json({ error: 'Reward is out of stock' }, { status: 400 });
        }

        // Deduct EXP from user
        await base44.auth.updateMe({
            exp_points: user.exp_points - reward.exp_cost,
            total_exp_redeemed: (user.total_exp_redeemed || 0) + reward.exp_cost
        });

        // Update stock if applicable
        if (reward.stock_quantity !== undefined) {
            await base44.asServiceRole.entities.ExpReward.update(reward_id, {
                stock_quantity: reward.stock_quantity - 1
            });
        }

        // Create redemption record
        const redemption = await base44.asServiceRole.entities.ExpRedemption.create({
            user_id: user.id,
            reward_id: reward_id,
            reward_name: reward.name,
            exp_cost: reward.exp_cost,
            status: 'pending'
        });

        // Log transaction
        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: user.id,
            action: 'redeemed',
            amount: -reward.exp_cost,
            source: 'redemption',
            description: `Redeemed ${reward.name}`
        });

        // Check if this is a print reward (consumer) or non-print reward (maker)
        if (reward.reward_type === 'consumer' && reward.category === 'print') {
            // This is a print-based reward - create an order and assign to maker
            console.log('Creating order for print reward:', reward.name);

            try {
                // Get product details if this reward references a product
                let productDetails = null;
                if (reward.product_id) {
                    productDetails = await base44.asServiceRole.entities.Product.get(reward.product_id);
                }

                // Create order for the print reward
                const newOrder = await base44.asServiceRole.entities.Order.create({
                    customer_id: user.id,
                    items: [{
                        product_id: reward.product_id || reward_id,
                        product_name: reward.name,
                        quantity: 1,
                        selected_material: productDetails?.materials?.[0] || 'PLA',
                        selected_color: productDetails?.colors?.[0] || 'White',
                        selected_resolution: 0.2,
                        unit_price: 0, // EXP reward - no charge
                        total_price: 0,
                        print_files: productDetails?.print_files || [],
                        print_time_hours: productDetails?.print_time_hours || 0,
                        weight_grams: productDetails?.weight_grams || 0,
                        dimensions: productDetails?.dimensions || { length: 0, width: 0, height: 0 },
                        multi_color: false,
                        print_file_scale: 100,
                        designer_id: productDetails?.designer_id
                    }],
                    total_amount: 0,
                    delivery_option: 'campus_pickup',
                    pickup_location: 'Contact: labaghr@my.erau.edu or 610-858-3200',
                    status: 'pending',
                    payment_status: 'paid',
                    notes: `EXP Reward Redemption: ${reward.name}`
                });

                console.log('Order created:', newOrder.id);

                // Assign to maker
                try {
                    await base44.functions.invoke('assignOrderToMaker', { 
                        orderId: newOrder.id,
                        assignToMultiple: false
                    });
                    console.log('Order assigned to maker');
                } catch (assignError) {
                    console.error('Failed to assign order to maker:', assignError);
                }

                // Update redemption with order ID
                await base44.asServiceRole.entities.ExpRedemption.update(redemption.id, {
                    fulfillment_notes: `Order created: ${newOrder.id}`,
                    status: 'fulfilled' // Automatically mark as fulfilled since it's sent to makers
                });

                return Response.json({ 
                    success: true,
                    redemption_id: redemption.id,
                    order_id: newOrder.id,
                    reward_name: reward.name,
                    exp_deducted: reward.exp_cost,
                    remaining_exp: user.exp_points - reward.exp_cost,
                    message: 'Redemption successful! Your order has been created and assigned to a maker.'
                });
            } catch (orderError) {
                console.error('Failed to create order for print reward:', orderError);
                // Fall back to manual fulfillment
                return Response.json({ 
                    success: true,
                    redemption_id: redemption.id,
                    reward_name: reward.name,
                    exp_deducted: reward.exp_cost,
                    remaining_exp: user.exp_points - reward.exp_cost,
                    message: 'Redemption successful! An admin will process your reward soon.'
                });
            }
        }

        // Send confirmation email for non-print rewards
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: '🎉 EXP Reward Redemption Confirmed - EX3D Prints',
                body: `Hi ${user.full_name},

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ REDEMPTION CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You've successfully redeemed your EXP points!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎁 REWARD DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reward:           ${reward.name}
${reward.description ? `Description:      ${reward.description}\n` : ''}EXP Redeemed:     ${reward.exp_cost} EXP
Remaining EXP:    ${user.exp_points - reward.exp_cost} EXP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📍 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

An admin will process your reward fulfillment soon. You'll receive an update via email once your reward is ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for being a valued member of EX3D Prints!

Best regards,
The EX3D Team

Need help? Contact us at labaghr@my.erau.edu or 610-858-3200`
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
        }

        // For maker rewards (non-print) - just create redemption for admin fulfillment
        return Response.json({ 
            success: true,
            redemption_id: redemption.id,
            reward_name: reward.name,
            exp_deducted: reward.exp_cost,
            remaining_exp: user.exp_points - reward.exp_cost,
            message: 'Redemption successful! An admin will fulfill your reward soon.'
        });

    } catch (error) {
        console.error('Redeem reward error:', error);
        return Response.json({ 
            error: error.message || 'Failed to redeem reward' 
        }, { status: 500 });
    }
});