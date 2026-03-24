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
                body: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .container { padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .coupon-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px dashed #f59e0b; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .coupon-code { font-size: 32px; font-weight: bold; color: #ea580c; letter-spacing: 2px; font-family: 'Courier New', monospace; }
        .details-table { width: 100%; margin: 20px 0; }
        .details-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .details-table td:first-child { font-weight: 600; color: #6b7280; }
        .steps { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .step { margin: 10px 0; padding-left: 30px; position: relative; }
        .step::before { content: "✓"; position: absolute; left: 0; color: #14b8a6; font-weight: bold; font-size: 18px; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🎉 Congratulations!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Your EXP Redemption is Complete</p>
        </div>
        
        <div class="content">
            <p>Hi ${user.full_name},</p>
            <p>You've successfully redeemed your EXP points for a discount coupon!</p>
            
            <div class="coupon-box">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">Your Coupon Code</p>
                <div class="coupon-code">${couponCode}</div>
                <p style="margin: 10px 0 0 0; font-size: 18px; color: #92400e; font-weight: bold;">$${(totalDiscountAmount / 100).toFixed(2)} OFF</p>
            </div>
            
            <table class="details-table">
                <tr>
                    <td>Discount Value:</td>
                    <td><strong>$${(totalDiscountAmount / 100).toFixed(2)}</strong></td>
                </tr>
                <tr>
                    <td>EXP Redeemed:</td>
                    <td><strong>${totalExpCost} EXP</strong></td>
                </tr>
                <tr>
                    <td>Quantity:</td>
                    <td><strong>${quantity}x ${selectedTier.label}</strong></td>
                </tr>
            </table>
            
            <div class="steps">
                <h3 style="margin-top: 0; color: #111827;">📋 How to Use Your Coupon</h3>
                <div class="step">Add items to your cart</div>
                <div class="step">Proceed to checkout</div>
                <div class="step">Enter coupon code: <strong>${couponCode}</strong></div>
                <div class="step">Your discount will be applied automatically!</div>
            </div>
            
            <div class="warning-box">
                <strong>⚠️ Important Notes:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>This coupon can only be used ONCE</li>
                    <li>Valid for 90 days from today</li>
                    <li>Cannot be combined with other offers</li>
                    <li>Non-transferable</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px;">Thank you for being a valued member of EX3D Prints!</p>
            
            <div class="footer">
                <p><strong>Best regards,</strong><br>The EX3D Team</p>
                <p>Need help? Contact us at labaghr@my.erau.edu or 610-858-3200</p>
            </div>
        </div>
    </div>
</body>
</html>
                `
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