import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Automatically reviews pending maker and designer applications.
// - Approves if all criteria are clearly met.
// - Rejects if clearly invalid.
// - Emails admin if it needs manual review.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const ADMIN_EMAIL = 'jc3dprints2022@gmail.com';

        const [makerApps, designerApps] = await Promise.all([
            base44.asServiceRole.entities.MakerApplication.filter({ status: 'pending' }),
            base44.asServiceRole.entities.DesignerApplication.filter({ status: 'pending' }),
        ]);

        let makerApproved = 0, makerRejected = 0, makerFlagged = 0;
        let designerApproved = 0, designerRejected = 0, designerFlagged = 0;

        // Load all existing makers and designers for duplicate checks
        const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
        const existingMakers = allUsers.filter(u => u.business_roles?.includes('maker') && u.maker_id);
        const existingDesigners = allUsers.filter(u => u.business_roles?.includes('designer') && u.designer_id);

        // ---- MAKER APPLICATIONS ----
        for (const app of makerApps) {
            const issues = [];

            // Skip international applications
            if ((app.campus_location || '').startsWith('INTERNATIONAL')) continue;

            // Check required fields
            if (!app.full_name || app.full_name.trim().length < 2) issues.push('Missing or invalid full name');
            if (!app.email || !app.email.includes('@')) issues.push('Missing or invalid email');
            if (!app.phone || app.phone.replace(/\D/g, '').length < 10) issues.push('Invalid phone number');
            if (!app.experience_level) issues.push('Missing experience level');
            if (!app.weekly_capacity || app.weekly_capacity < 1) issues.push('Invalid weekly capacity');
            if (!app.materials || app.materials.length === 0) issues.push('No materials listed');
            if (!app.campus_location || !app.campus_location.includes('|')) issues.push('Missing address');

            // Parse address
            const parts = (app.campus_location || '').split('|');
            const state = (parts[2] || '').trim().toUpperCase();
            const zip = (parts[3] || '').trim();
            if (!state || state.length < 2) issues.push('Missing state');
            if (!zip || zip.replace(/\D/g, '').length < 5) issues.push('Missing ZIP code');

            // Check printers
            if (!app.printers || app.printers.length === 0) issues.push('No printer information provided');

            // Check filaments
            if (!app.filaments || app.filaments.length === 0) issues.push('No filament information provided');

            // Suspicious patterns
            if (app.full_name && app.full_name.replace(/[^a-zA-Z\s]/g, '').trim().split(' ').length < 2) {
                issues.push('Name appears to be incomplete (needs first and last name)');
            }

            // Duplicate checks against existing makers
            const appEmail = (app.email || '').toLowerCase().trim();
            const appName = (app.full_name || '').toLowerCase().trim();
            const appStreet = (parts[0] || '').toLowerCase().trim();
            const dupEmail = existingMakers.find(u => (u.email || '').toLowerCase() === appEmail && u.id !== app.user_id);
            const dupName  = existingMakers.find(u => (u.full_name || '').toLowerCase() === appName && u.id !== app.user_id);
            const dupAddr  = appStreet.length > 5 && existingMakers.find(u => {
                const uStreet = (u.address?.street || u.campus_location || '').toLowerCase();
                return uStreet.includes(appStreet) && u.id !== app.user_id;
            });
            if (dupEmail) issues.push(`Email already registered as a maker (${dupEmail.full_name})`);
            if (dupName)  issues.push(`Name matches existing maker account (${dupName.email})`);
            if (dupAddr)  issues.push(`Address matches existing maker account (${dupAddr.email})`);

            if (issues.length === 0) {
                // Auto-approve: invoke approveMakerApplication as service role
                await base44.asServiceRole.functions.invoke('approveMakerApplication', {
                    applicationId: app.id,
                    autoApproved: true,
                });
                makerApproved++;
            } else if (issues.length >= 4) {
                // Too many issues — auto-reject
                await base44.asServiceRole.entities.MakerApplication.update(app.id, {
                    status: 'rejected',
                    admin_notes: `Auto-rejected: ${issues.join('; ')}`
                });
                await base44.asServiceRole.entities.User.update(app.user_id, { account_status: 'application_rejected' });
                await base44.asServiceRole.functions.invoke('sendEmail', {
                    to: app.email,
                    subject: 'Maker Application Update - EX3D Prints',
                    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">Maker Application Update</h2>
<p>Hi ${app.full_name},</p>
<p>Thank you for applying. Unfortunately we were unable to approve your application at this time due to the following:</p>
<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
<p>You're welcome to re-apply with complete information.</p>
<p>— The EX3D Team</p>
</div>`
                }).catch(() => {});
                makerRejected++;
            } else {
                // Needs manual review — flag for admin
                await base44.asServiceRole.entities.MakerApplication.update(app.id, {
                    admin_notes: `[Needs Review] ${issues.join('; ')}`
                });
                await base44.asServiceRole.functions.invoke('sendEmail', {
                    to: ADMIN_EMAIL,
                    subject: `⚠️ Maker Application Needs Review — ${app.full_name}`,
                    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">Maker Application Needs Manual Review</h2>
<p><strong>Name:</strong> ${app.full_name}</p>
<p><strong>Email:</strong> ${app.email}</p>
<p><strong>Issues flagged:</strong></p>
<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
<p><a href="https://ex3dprints.com/jc3dcommandcenter?tab=maker_tools" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Review in Admin Panel →</a></p>
</div>`
                }).catch(() => {});
                makerFlagged++;
            }
        }

        // ---- DESIGNER APPLICATIONS ----
        for (const app of designerApps) {
            const issues = [];

            if (!app.full_name || app.full_name.trim().length < 2) issues.push('Missing or invalid full name');
            if (!app.email || !app.email.includes('@')) issues.push('Missing or invalid email');
            if (!app.designer_name || app.designer_name.trim().length < 2) issues.push('Missing designer/studio name');
            if (!app.experience_level) issues.push('Missing experience level');
            if (!app.design_categories || app.design_categories.length === 0) issues.push('No design categories listed');
            if (!app.bio || app.bio.trim().length < 20) issues.push('Bio is too short or missing');

            // Duplicate checks against existing designers
            const dAppEmail = (app.email || '').toLowerCase().trim();
            const dAppName  = (app.designer_name || '').toLowerCase().trim();
            const dDupEmail = existingDesigners.find(u => (u.email || '').toLowerCase() === dAppEmail && u.id !== app.user_id);
            const dDupName  = existingDesigners.find(u => (u.designer_name || u.full_name || '').toLowerCase() === dAppName && u.id !== app.user_id);
            if (dDupEmail) issues.push(`Email already registered as a designer (${dDupEmail.full_name})`);
            if (dDupName)  issues.push(`Designer name already taken by another account (${dDupName.email})`);

            if (issues.length === 0) {
                // Auto-approve designer
                const designerUser = await base44.asServiceRole.entities.User.get(app.user_id);
                if (designerUser) {
                    const designerId = `designer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const updatedRoles = [...new Set([...(designerUser.business_roles || ['consumer']), 'designer'])];
                    await base44.asServiceRole.entities.User.update(designerUser.id, {
                        designer_id: designerId,
                        business_roles: updatedRoles,
                        account_status: 'active',
                    });
                    await base44.asServiceRole.entities.DesignerApplication.update(app.id, { status: 'approved' });
                    await base44.asServiceRole.functions.invoke('sendEmail', {
                        to: app.email,
                        subject: 'Welcome to the EX3D Designer Network! 🎨',
                        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:white;border-radius:16px;">
<div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
<h1 style="color:white;margin:0;">🎨 You're Approved!</h1>
<p style="color:#bfdbfe;margin:8px 0 0;">Welcome to the EX3D Designer Network</p>
</div>
<div style="padding:28px;">
<p>Hi <strong>${app.full_name}</strong>,</p>
<p>Your designer application has been <strong>approved!</strong> You can now upload your 3D designs and earn 10% royalties on every sale.</p>
<p><a href="https://ex3dprints.com/ConsumerDashboard?tab=designer" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;font-weight:bold;">Go to Designer Hub →</a></p>
<p>Welcome aboard!</p>
<p>— The EX3D Team</p>
</div>
</div>`
                    }).catch(() => {});
                    designerApproved++;
                }
            } else if (issues.length >= 3) {
                await base44.asServiceRole.entities.DesignerApplication.update(app.id, {
                    status: 'rejected',
                    admin_notes: `Auto-rejected: ${issues.join('; ')}`
                });
                await base44.asServiceRole.entities.User.update(app.user_id, { account_status: 'application_rejected' });
                await base44.asServiceRole.functions.invoke('sendEmail', {
                    to: app.email,
                    subject: 'Designer Application Update - EX3D Prints',
                    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#3b82f6;">Designer Application Update</h2>
<p>Hi ${app.full_name},</p>
<p>We were unable to approve your application at this time:</p>
<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
<p>You're welcome to re-apply with complete information.</p>
<p>— The EX3D Team</p>
</div>`
                }).catch(() => {});
                designerRejected++;
            } else {
                await base44.asServiceRole.entities.DesignerApplication.update(app.id, {
                    admin_notes: `[Needs Review] ${issues.join('; ')}`
                });
                await base44.asServiceRole.functions.invoke('sendEmail', {
                    to: ADMIN_EMAIL,
                    subject: `⚠️ Designer Application Needs Review — ${app.full_name}`,
                    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#3b82f6;">Designer Application Needs Manual Review</h2>
<p><strong>Name:</strong> ${app.full_name}</p>
<p><strong>Email:</strong> ${app.email}</p>
<p><strong>Designer Name:</strong> ${app.designer_name}</p>
<p><strong>Issues flagged:</strong></p>
<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
<p><a href="https://ex3dprints.com/jc3dcommandcenter" style="background:#3b82f6;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Review in Admin Panel →</a></p>
</div>`
                }).catch(() => {});
                designerFlagged++;
            }
        }

        return Response.json({
            success: true,
            makers: { approved: makerApproved, rejected: makerRejected, flagged: makerFlagged },
            designers: { approved: designerApproved, rejected: designerRejected, flagged: designerFlagged },
        });

    } catch (error) {
        console.error('autoReviewApplications error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});