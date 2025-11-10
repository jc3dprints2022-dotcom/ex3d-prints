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
                subject: 'Maker Application Approved! - EX3D Prints',
                body: `Hi ${application.full_name},\n\nCongratulations! Your application to become a maker on EX3D Prints has been approved!\n\nYou can now access your Maker Dashboard to add your printers and start fulfilling orders.\n\nBest regards,\nThe EX3D Team`
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