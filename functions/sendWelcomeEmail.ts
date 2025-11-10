import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Welcome Email Trigger ===');

    const BASE44_SUPABASE_URL = Deno.env.get('BASE44_SUPABASE_URL');
    const BASE44_SUPABASE_SERVICE_KEY = Deno.env.get('BASE44_SUPABASE_SERVICE_KEY');
    const RESEND_API_KEY = Deno.env.get('Resend_API');

    if (!BASE44_SUPABASE_URL || !BASE44_SUPABASE_SERVICE_KEY) {
        console.error('Missing Base44 configuration');
        return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!RESEND_API_KEY) {
        console.error('Missing Resend API key');
        return Response.json({ error: 'Email service not configured' }, { status: 500 });
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

        const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to EX3D Prints!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #111827; margin-top: 0;">Hi ${user.full_name || 'there'}!</h2>
                <p style="color: #374151; line-height: 1.6;">
                    Welcome to EX3D Prints - your gateway to amazing 3D printed products!
                </p>
                <p style="color: #374151; line-height: 1.6;">
                    Here's what you can do:
                </p>
                <ul style="color: #374151; line-height: 1.8;">
                    <li>Browse our marketplace of unique 3D printed designs</li>
                    <li>Request custom prints tailored to your needs</li>
                    <li>Earn EXP points with every purchase (5 EXP per dollar!)</li>
                    <li>Refer friends and earn rewards</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/Marketplace" 
                       style="display: inline-block; background: #14b8a6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                        Start Shopping
                    </a>
                </div>
                <p style="color: #374151; line-height: 1.6;">
                    <strong>Your Starting EXP:</strong> ${user.exp_points || 0} points
                </p>
            </div>
            <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 5px 0 0 0;">Need help? Contact us at <a href="mailto:ex3dprint.@gmail.com" style="color: #14b8a6;">ex3dprint.@gmail.com</a></p>
            </div>
        </div>`;

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'EX3D Prints <noreply@ex3dprints.com>',
                to: [user.email],
                subject: 'Welcome to EX3D Prints! 🎉',
                html: emailHtml
            })
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error(`Failed to send welcome email:`, errorText);
            return Response.json({ error: 'Failed to send email', details: errorText }, { status: 500 });
        }

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