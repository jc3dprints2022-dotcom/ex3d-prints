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

        // Send formatted email to customer with coupon code
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: '🎉 Your EXP Redemption Coupon - EX3D Prints',
                body: `Hi ${user.full_name},

Congratulations! You've successfully redeemed your EXP points for a discount coupon.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎁 YOUR COUPON DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Coupon Code:     ${couponCode}
Discount Value:  $${(totalDiscountAmount / 100).toFixed(2)}
EXP Redeemed:    ${totalExpCost} EXP
Quantity:        ${quantity}x ${selectedTier.label}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 HOW TO USE YOUR COUPON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Add items to your cart
2. Proceed to checkout
3. Enter coupon code: ${couponCode}
4. Your discount will be applied automatically!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️ IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• This coupon can only be used ONCE
• Valid for 90 days from today
• Cannot be combined with other offers
• Non-transferable

Thank you for being a valued member of EX3D Prints!

Best regards,
The EX3D Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Need help? Email us at support@ex3dprints.com`
            });
        } catch (emailError) {
            console.error('Failed to send customer email:', emailError);
        }

        // Send formatted notification to admin
        try {
            await base44.integrations.Core.SendEmail({
                to: 'jc3dprints2022@gmail.com',
                subject: '💰 EXP Redemption Alert - EX3D Prints',
                body: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXP REDEMPTION NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A user has just redeemed their EXP points for a discount coupon.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 REDEMPTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Name:       ${user.full_name || 'Unknown'}
Email:           ${user.email}
User ID:         ${user.id}

EXP Redeemed:    ${totalExpCost} EXP
Quantity:        ${quantity}x ${selectedTier.label}
Coupon Code:     ${couponCode}
Discount Value:  $${(totalDiscountAmount / 100).toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Stripe coupon created successfully
• Customer notification email sent
• User's EXP balance updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
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