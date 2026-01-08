import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

        // Use Base44 email integration
        const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: from_name || "EX3D Prints",
            to: to,
            subject: subject,
            body: body
        });

        // Log the email send event
        try {
            await base44.asServiceRole.entities.AuditLog.create({
                event_type: 'email_sent',
                user_id: user?.id || null,
                details: { 
                    to, 
                    subject, 
                    body
                },
                severity: 'info'
            });
        } catch (logError) {
            console.log('Failed to log email (non-critical):', logError.message);
        }

        return new Response(JSON.stringify({ 
            success: true
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