import { createClient } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    console.log('=== Welcome Email Trigger ===');

    const BASE44_SUPABASE_URL = Deno.env.get('BASE44_SUPABASE_URL');
    const BASE44_SUPABASE_SERVICE_KEY = Deno.env.get('BASE44_SUPABASE_SERVICE_KEY');

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

        const user = await base44.entities.User.get(userId);

        if (!user || !user.email) {
            console.error(`User ${userId} not found or has no email`);
            return Response.json({ error: 'User not found or no email' }, { status: 404 });
        }

        const APP_URL = Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com';
        
        const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #14b8a6; font-size: 32px; margin-bottom: 10px;">Welcome to EX3D Prints! 🎉</h1>
        <p style="color: #6b7280; font-size: 18px;">Hi ${user.full_name || 'there'}!</p>
    </div>

    <div style="margin-bottom: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Welcome to EX3D Prints - your gateway to amazing 3D printed products!
        </p>
    </div>

    <div style="margin-bottom: 30px;">
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">What you can do:</h2>
        <ul style="color: #6b7280; font-size: 15px; line-height: 1.8; padding-left: 20px;">
            <li><strong>Browse our marketplace</strong> of unique 3D printed designs</li>
            <li><strong>Request custom prints</strong> tailored to your needs</li>
            <li><strong>Earn EXP points</strong> with every purchase (5 EXP per dollar!)</li>
            <li><strong>Refer friends</strong> and earn rewards</li>
        </ul>
    </div>

    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Your Starting EXP</p>
        <p style="color: #14b8a6; font-size: 36px; font-weight: bold; margin: 0;">${user.exp_points || 0} points</p>
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
            subject: 'Welcome to EX3D Prints! 🎉',
            body: emailBody
        });

        console.log(`✅ Welcome email sent to ${user.email}`);

        return Response.json({ 
            success: true,
            message: `Welcome email sent to ${user.email}`
        });

    } catch (error) {
        console.error('❌ Welcome email error:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});