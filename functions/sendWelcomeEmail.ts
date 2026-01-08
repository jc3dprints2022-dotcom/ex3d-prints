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

        const emailBody = `Hi ${user.full_name || 'there'}!

Welcome to EX3D Prints - your gateway to amazing 3D printed products!

Here's what you can do:
• Browse our marketplace of unique 3D printed designs
• Request custom prints tailored to your needs
• Earn EXP points with every purchase (5 EXP per dollar!)
• Refer friends and earn rewards

Your Starting EXP: ${user.exp_points || 0} points

Start Shopping: ${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/Marketplace

Need help? Contact us at ex3dprint.@gmail.com`;

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