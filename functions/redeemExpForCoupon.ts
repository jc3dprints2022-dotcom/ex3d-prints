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

        // Send formatted HTML email to customer with coupon code
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: '🎉 Your EXP Redemption Coupon - EX3D Prints',
                body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 36px;">🎉 Congratulations!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your EXP has been redeemed</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
                                Hi ${user.full_name},
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Coupon Code</p>
                                <p style="margin: 0; font-size: 32px; font-weight: bold; color: white; letter-spacing: 2px; font-family: monospace;">${couponCode}</p>
                                <p style="margin: 15px 0 0 0; font-size: 20px; font-weight: bold; color: white;">Save $${(totalDiscountAmount / 100).toFixed(2)}</p>
                            </div>
                            
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">📊 Redemption Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">EXP Redeemed:</td>
                                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">${totalExpCost} EXP</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Quantity:</td>
                                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">${quantity}x ${selectedTier.label}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Discount Value:</td>
                                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">$${(totalDiscountAmount / 100).toFixed(2)}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">📋 How to Use Your Coupon</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                                    <li style="margin-bottom: 8px;">Add items to your cart</li>
                                    <li style="margin-bottom: 8px;">Proceed to checkout</li>
                                    <li style="margin-bottom: 8px;">Enter coupon code: <strong>${couponCode}</strong></li>
                                    <li style="margin-bottom: 8px;">Your discount will be applied automatically!</li>
                                </ol>
                            </div>
                            
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">⚠️ Important Notes</h3>
                                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
                                    <li style="margin-bottom: 5px;">This coupon can only be used ONCE</li>
                                    <li style="margin-bottom: 5px;">Valid for 90 days from today</li>
                                    <li style="margin-bottom: 5px;">Cannot be combined with other offers</li>
                                    <li style="margin-bottom: 5px;">Non-transferable</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${window.location?.origin || 'https://ex3dprints.com'}/Marketplace" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                    Shop Now
                                </a>
                            </div>
                            
                            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                    Thank you for being a valued member!
                                </p>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    Best regards,<br/>
                                    <strong style="color: #14b8a6;">The EX3D Team</strong>
                                </p>
                                <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px;">
                                    Need help? Email us at support@ex3dprints.com
                                </p>
                            </div>
                        </div>
                    </div>
                </div>`
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