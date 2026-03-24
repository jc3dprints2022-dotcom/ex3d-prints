import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Authenticate the user calling this function
        const adminUser = await base44.auth.me();
        if (!adminUser || adminUser.role !== 'admin') {
            return Response.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
        }

        const { applicationId, reason } = await req.json();
        if (!applicationId || !reason) {
            return Response.json({ success: false, error: 'Application ID and reason are required.' }, { status: 400 });
        }
        
        // 2. Use Service Role for privileged operations
        const application = await base44.asServiceRole.entities.MakerApplication.get(applicationId);
        if (!application) {
            return Response.json({ success: false, error: 'Application not found.' }, { status: 404 });
        }

        // 3. Update application status
        await base44.asServiceRole.entities.MakerApplication.update(applicationId, {
            status: 'rejected',
            admin_notes: reason
        });

        // 4. Update user's account status
        await base44.asServiceRole.entities.User.update(application.user_id, {
            account_status: 'application_rejected'
        });

        // 5. Send rejection email
        try {
            await base44.asServiceRole.functions.invoke('sendEmail', {
                to: application.email,
                subject: 'Maker Application Update - EX3D Prints',
                body: `Hi ${application.full_name},\n\nThank you for your interest in becoming a maker on EX3D Prints. After careful review, we're unable to approve your application at this time.\n\nReason: ${reason}\n\nYou're welcome to reapply in the future if circumstances change.\n\nBest regards,\nThe EX3D Team`
            });
        } catch(e) {
            console.error("Failed to send rejection email, but proceeding:", e.message);
        }

        return Response.json({ success: true, message: 'Application rejected successfully.' });

    } catch (error) {
        console.error('Rejection function error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});