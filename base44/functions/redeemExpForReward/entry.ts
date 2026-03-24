import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { rewardId, reward_id } = await req.json();
        const finalRewardId = rewardId || reward_id;

        if (!finalRewardId) {
            return Response.json({ error: 'Reward ID is required' }, { status: 400 });
        }

        // Get reward details
        const reward = await base44.asServiceRole.entities.ExpReward.get(finalRewardId);

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
            reward_id: finalRewardId,
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
                if (reward.existing_product_id) {
                    productDetails = await base44.asServiceRole.entities.Product.get(reward.existing_product_id);
                }

                // Create order for the print reward
                const newOrder = await base44.asServiceRole.entities.Order.create({
                    customer_id: user.id,
                    customer_username: user.email?.split('@')[0] || user.full_name,
                    items: [{
                        product_id: reward.existing_product_id || finalRewardId,
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
                        multi_color: productDetails?.multi_color || false,
                        print_file_scale: productDetails?.custom_scale || 100,
                        designer_id: productDetails?.designer_id,
                        images: productDetails?.images || [reward.image_url]
                    }],
                    total_amount: 0,
                    delivery_option: 'campus_pickup',
                    campus_location: user.campus_location || 'erau_prescott',
                    status: 'pending',
                    payment_status: 'paid',
                    notes: `EXP Reward Redemption: ${reward.name} (${reward.exp_cost} EXP)`
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

        // For maker rewards (non-print) - send email to admin with shipping info
        const userInfo = await base44.asServiceRole.entities.User.get(user.id);
        
        const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #14b8a6;">New Filament Reward Order</h1>
    <p><strong>Order ID:</strong> ${redemption.id}</p>
    <p><strong>Reward:</strong> ${reward.name}</p>
    <p><strong>Payment Method:</strong> EXP (${reward.exp_cost} EXP)</p>
    
    <h2 style="color: #111827; margin-top: 30px;">Customer Information</h2>
    <p><strong>Name:</strong> ${user.full_name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>User ID:</strong> ${user.id}</p>
    
    <h2 style="color: #111827; margin-top: 30px;">Shipping Address</h2>
    ${userInfo.address ? `
    <p>${userInfo.address.name || user.full_name}<br>
    ${userInfo.address.street}<br>
    ${userInfo.address.city}, ${userInfo.address.state} ${userInfo.address.zip}</p>
    ` : '<p style="color: red;">No shipping address on file - contact user</p>'}
</div>
        `;

        try {
            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'EX3D Prints',
                to: 'jc3dprints2022@gmail.com',
                subject: `New Filament Order - ${reward.name} (EXP Payment)`,
                body: emailBody
            });
        } catch (emailError) {
            console.error('Failed to send admin email:', emailError);
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