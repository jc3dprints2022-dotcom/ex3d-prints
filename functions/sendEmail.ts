import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Try to authenticate the user
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.log('Auth check failed:', authError.message);
            // Continue without user for system emails
        }

        const { to, subject, body, from_name } = await req.json();

        if (!to || !subject || !body) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Missing required fields: to, subject, body' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const RESEND_API_KEY = Deno.env.get('Resend_API');
        
        if (!RESEND_API_KEY) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Email service not configured on the server.' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use custom from_name if provided, otherwise default to "EX3D Prints"
        const senderName = from_name || "EX3D Prints";

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `${senderName} <noreply@ex3dprints.com>`,
                to: [to],
                subject: subject,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">EX3D Prints</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <pre style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1f2937; font-size: 14px;">${body}</pre>
                    </div>
                    <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                        <p style="margin: 5px 0 0 0;">Need help? Contact us at <a href="mailto:ex3dprint.@gmail.com" style="color: #14b8a6;">ex3dprint.@gmail.com</a></p>
                    </div>
                </div>`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.message || 'Failed to send email';
            console.error('Resend API error:', errorMessage, data);
            return new Response(JSON.stringify({ 
                success: false,
                error: errorMessage, 
                details: data
            }), { 
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Log the email send event (store email content for audit purposes)
        try {
            await base44.asServiceRole.entities.AuditLog.create({
                event_type: 'email_sent',
                user_id: user?.id || null,
                details: { 
                    to, 
                    subject, 
                    body, // Store the email body for viewing later
                    email_id: data.id 
                },
                severity: 'info'
            });
        } catch (logError) {
            console.log('Failed to log email (non-critical):', logError.message);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            email_id: data.id 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Email send function error:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message || 'An internal server error occurred.' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});