import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch the template from DB
        const templates = await base44.asServiceRole.entities.EmailNotificationTemplate.filter({ key: 'heavylift_promo' });
        if (!templates.length) {
            return Response.json({ error: 'Template not found: heavylift_promo' }, { status: 404 });
        }
        const template = templates[0];
        if (template.enabled === false) {
            return Response.json({ message: 'Template is disabled, skipping send.' });
        }

        // Fetch all users who are NOT makers and NOT designers
        const allUsers = await base44.asServiceRole.entities.User.list();
        const targets = allUsers.filter(u => {
            const roles = u.business_roles || [];
            return !roles.includes('maker') && !roles.includes('designer') && u.email;
        });

        console.log(`Sending Heavy Lift promo to ${targets.length} users`);

        let sent = 0;
        let failed = 0;

        for (const recipient of targets) {
            try {
                const firstName = (recipient.full_name || recipient.email).split(' ')[0];
                const subject = template.subject;
                const body = template.body.replace(/\{\{first_name\}\}/g, firstName);

                await base44.integrations.Core.SendEmail({
                    to: recipient.email,
                    subject,
                    body,
                });
                sent++;
            } catch (e) {
                console.error(`Failed to send to ${recipient.email}:`, e.message);
                failed++;
            }
        }

        console.log(`Heavy Lift promo sent: ${sent} success, ${failed} failed`);
        return Response.json({ success: true, sent, failed, total: targets.length });
    } catch (error) {
        console.error('sendHeavyLiftPromo error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});