import { createClient } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    console.log('=== User Signup Handler ===');

    const BASE44_SUPABASE_URL = Deno.env.get('BASE44_SUPABASE_URL');
    const BASE44_SUPABASE_SERVICE_KEY = Deno.env.get('BASE44_SUPABASE_SERVICE_KEY');
    const APP_URL = Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com';

    if (!BASE44_SUPABASE_URL || !BASE44_SUPABASE_SERVICE_KEY) {
        console.error('Missing Base44 configuration');
        return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ error: 'User ID is required' }, { status: 400 });
        }

        const base44 = createClient({
            supabaseUrl: BASE44_SUPABASE_URL,
            supabaseKey: BASE44_SUPABASE_SERVICE_KEY
        });

        // Get user
        const user = await base44.entities.User.get(userId);

        if (!user || !user.email) {
            console.error(`User ${userId} not found or has no email`);
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Award 120 EXP welcome bonus
        const currentExp = user.exp_points || 0;
        await base44.entities.User.update(userId, {
            exp_points: currentExp + 120
        });

        console.log(`✅ Awarded 120 EXP to ${user.email}`);

        // Log the EXP transaction
        await base44.entities.ExpTransaction.create({
            user_id: userId,
            amount: 120,
            type: 'reward',
            source: 'signup_bonus',
            description: 'Welcome bonus for new account',
            timestamp: new Date().toISOString()
        });

        // Send welcome email with claim button
        const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #14b8a6; font-size: 32px; margin-bottom: 10px;">Welcome to EX3D Prints! 🎉</h1>
        <p style="color: #6b7280; font-size: 18px;">Hi ${user.full_name || 'there'}!</p>
    </div>

    <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <p style="color: white; font-size: 20px; margin: 0 0 10px 0; font-weight: bold;">🎁 Welcome Bonus!</p>
        <p style="color: white; font-size: 48px; font-weight: bold; margin: 10px 0;">120 EXP</p>
        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 20px 0;">has been added to your account!</p>
        <a href="${APP_URL}/ConsumerDashboard?tab=exp" style="display: inline-block; background: white; color: #14b8a6; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">View My EXP →</a>
    </div>

    <div style="margin-bottom: 30px;">
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">What you can do:</h2>
        <ul style="color: #6b7280; font-size: 15px; line-height: 1.8; padding-left: 20px;">
            <li><strong>Browse our marketplace</strong> of unique 3D printed designs</li>
            <li><strong>Request custom prints</strong> tailored to your needs</li>
            <li><strong>Earn EXP points</strong> with every purchase (5 EXP per dollar!)</li>
            <li><strong>Redeem EXP</strong> for exclusive rewards and discounts</li>
            <li><strong>Refer friends</strong> and earn even more rewards</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/Marketplace" style="display: inline-block; background: #14b8a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Start Shopping Now</a>
    </div>

    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
            Need help? Contact us at <a href="mailto:ex3dprint.@gmail.com" style="color: #14b8a6; text-decoration: none;">ex3dprint.@gmail.com</a>
        </p>
    </div>
</div>
        `.trim();

        await base44.integrations.Core.SendEmail({
            from_name: 'EX3D Prints',
            to: user.email,
            subject: '🎉 Welcome to EX3D Prints + 120 EXP Bonus!',
            body: emailBody
        });

        console.log(`✅ Welcome email sent to ${user.email}`);

        return Response.json({ 
            success: true,
            message: `Welcome email sent and 120 EXP awarded to ${user.email}`,
            exp_awarded: 120
        });

    } catch (error) {
        console.error('❌ User signup handler error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});