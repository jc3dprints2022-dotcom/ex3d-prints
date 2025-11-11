import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tier, quantity = 1 } = await req.json();

        if (!quantity || quantity < 1) {
            return Response.json({ error: 'Invalid quantity' }, { status: 400 });
        }

        // Define tiers
        const tiers = {
            '1': { exp_cost: 120, discount_amount: 100, label: '$1' },
            '5': { exp_cost: 550, discount_amount: 500, label: '$5' },
            '20': { exp_cost: 2000, discount_amount: 2000, label: '$20' }
        };

        const selectedTier = tiers[tier];
        if (!selectedTier) {
            return Response.json({ error: 'Invalid tier' }, { status: 400 });
        }

        const totalExpCost = selectedTier.exp_cost * quantity;
        const totalDiscountAmount = selectedTier.discount_amount * quantity;

        // Check if user has enough EXP
        if ((user.exp_points || 0) < totalExpCost) {
            return Response.json({ 
                error: `Insufficient EXP. You need ${totalExpCost} EXP but have ${user.exp_points || 0} EXP.` 
            }, { status: 400 });
        }

        // Generate random coupon code
        const couponCode = `EXP${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Create Stripe coupon
        const coupon = await stripe.coupons.create({
            id: couponCode,
            amount_off: totalDiscountAmount, // Amount in cents
            currency: 'usd',
            duration: 'once',
            max_redemptions: 1,
            metadata: {
                user_id: user.id,
                user_name: user.full_name || user.email,
                exp_redeemed: totalExpCost.toString(),
                redemption_tier: tier,
                quantity: quantity.toString()
            }
        });

        // Deduct EXP from user
        await base44.auth.updateMe({
            exp_points: user.exp_points - totalExpCost,
            total_exp_redeemed: (user.total_exp_redeemed || 0) + totalExpCost
        });

        // Log transaction
        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: user.id,
            action: 'redeemed',
            amount: -totalExpCost,
            source: 'redemption',
            description: `Redeemed ${totalExpCost} EXP for $${totalDiscountAmount / 100} off coupon (${quantity}x ${selectedTier.label})`,
            stripe_coupon_id: coupon.id
        });

        // Send email to customer with coupon code
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: 'Your EXP Redemption Coupon - EX3D Prints',
                body: `Hi ${user.full_name},

Congratulations! You've successfully redeemed ${totalExpCost} EXP for a discount coupon.

Your Coupon Code: ${couponCode}
Discount Value: $${(totalDiscountAmount / 100).toFixed(2)}

To use this coupon:
1. Add items to your cart
2. Go to checkout
3. Enter the coupon code in the "Coupon Code" field
4. Your discount will be applied automatically!

This coupon can be used once and expires in 90 days.

Thank you for being a valued customer!

Best regards,
The EX3D Team`
            });
        } catch (emailError) {
            console.error('Failed to send customer email:', emailError);
        }

        // Send notification to admin
        try {
            await base44.integrations.Core.SendEmail({
                to: 'jc3dprints2022@gmail.com',
                subject: 'EXP Redemption Notification - EX3D Prints',
                body: `New EXP redemption:

User: ${user.full_name || 'Unknown'} (${user.email})
EXP Redeemed: ${totalExpCost} EXP
Quantity: ${quantity}
Coupon Code: ${couponCode}
Discount Value: $${(totalDiscountAmount / 100).toFixed(2)}

The coupon has been created in Stripe and sent to the user.`
            });
        } catch (adminEmailError) {
            console.error('Failed to send admin notification:', adminEmailError);
        }

        return Response.json({ 
            success: true,
            coupon_code: couponCode,
            discount_amount: `$${(totalDiscountAmount / 100).toFixed(2)}`,
            exp_deducted: totalExpCost,
            remaining_exp: user.exp_points - totalExpCost,
            quantity: quantity
        });

    } catch (error) {
        console.error('Redeem EXP error:', error);
        return Response.json({ 
            error: error.message || 'Failed to redeem EXP' 
        }, { status: 500 });
    }
});