import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Authenticate the user calling this function
        const adminUser = await base44.auth.me();
        if (!adminUser || adminUser.role !== 'admin') {
            return Response.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
        }

        const { applicationId } = await req.json();
        if (!applicationId) {
            return Response.json({ success: false, error: 'Application ID is required.' }, { status: 400 });
        }

        // 2. Use Service Role to perform privileged operations
        const application = await base44.asServiceRole.entities.MakerApplication.get(applicationId);
        if (!application) {
            return Response.json({ success: false, error: 'Application not found.' }, { status: 404 });
        }

        const makerId = `maker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 3. Update application status
        await base44.asServiceRole.entities.MakerApplication.update(applicationId, {
            status: 'approved'
        });

        // 4. Update the user's roles and details
        const userToUpdate = await base44.asServiceRole.entities.User.get(application.user_id);
        if (!userToUpdate) {
             return Response.json({ success: false, error: 'User associated with application not found.' }, { status: 404 });
        }

        const currentRoles = userToUpdate.business_roles || ['consumer'];
        const updatedRoles = [...new Set([...currentRoles, 'maker'])];

        await base44.asServiceRole.entities.User.update(userToUpdate.id, {
            maker_id: makerId,
            business_roles: updatedRoles,
            account_status: 'active',
            phone: application.phone,
            experience_level: application.experience_level,
            weekly_capacity: application.weekly_capacity,
            max_hours_per_week: application.weekly_capacity || 40
        });

        // 5. Send approval email (by invoking another function)
        try {
            await base44.asServiceRole.functions.invoke('sendEmail', {
                to: application.email,
                subject: 'Welcome to the EX3D Maker Network!',
                body: `Hi ${application.full_name},\n\nGreat news — your application to become a Maker on EX3D Prints has been approved!\n\nYou can now log in and access your Maker Hub here:\nhttps://ex3dprints.com/ConsumerDashboard?tab=maker\n\nOnce you're in, you'll see a setup checklist on your dashboard. Please complete the checklist to finish setting up your account and start receiving orders.\n\nThis includes:\n- Printing and uploading your test files for quality approval\n- Adding your printers and filament\n- Connecting your Stripe account\n\nOnce everything is complete, you'll be fully set up and ready to go.\n\nWelcome to the network — we're excited to have you.\n\nThank you,\nThe EX3D Team`
            });
        } catch(e) {
            console.error("Failed to send approval email, but proceeding:", e.message);
        }

        return Response.json({ success: true, message: 'Application approved successfully.' });

    } catch (error) {
        console.error('Approval function error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});