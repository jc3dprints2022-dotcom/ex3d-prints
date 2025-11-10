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

        const { tier } = await req.json();

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

        // Check if user has enough EXP
        if ((user.exp_points || 0) < selectedTier.exp_cost) {
            return Response.json({ 
                error: `Insufficient EXP. You need ${selectedTier.exp_cost} EXP but have ${user.exp_points || 0} EXP.` 
            }, { status: 400 });
        }

        // Create Stripe coupon
        const coupon = await stripe.coupons.create({
            amount_off: selectedTier.discount_amount, // Amount in cents
            currency: 'usd',
            duration: 'once',
            max_redemptions: 1,
            metadata: {
                user_id: user.id,
                exp_redeemed: selectedTier.exp_cost.toString(),
                redemption_tier: tier
            }
        });

        // Deduct EXP from user
        await base44.auth.updateMe({
            exp_points: user.exp_points - selectedTier.exp_cost,
            total_exp_redeemed: (user.total_exp_redeemed || 0) + selectedTier.exp_cost
        });

        // Log transaction
        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: user.id,
            action: 'redeemed',
            amount: -selectedTier.exp_cost,
            source: 'redemption',
            description: `Redeemed ${selectedTier.exp_cost} EXP for ${selectedTier.label} off coupon`,
            stripe_coupon_id: coupon.id
        });

        return Response.json({ 
            success: true,
            coupon_code: coupon.id,
            discount_amount: selectedTier.label,
            exp_deducted: selectedTier.exp_cost,
            remaining_exp: user.exp_points - selectedTier.exp_cost
        });

    } catch (error) {
        console.error('Redeem EXP error:', error);
        return Response.json({ 
            error: error.message || 'Failed to redeem EXP' 
        }, { status: 500 });
    }
});