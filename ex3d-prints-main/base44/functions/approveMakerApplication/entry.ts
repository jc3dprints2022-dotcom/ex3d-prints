import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { applicationId, autoApproved } = body;

        // Auth: must be admin OR this is an internal auto-approval call
        if (!autoApproved) {
            const adminUser = await base44.auth.me();
            if (!adminUser || adminUser.role !== 'admin') {
                return Response.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
            }
        }

        if (!applicationId) {
            return Response.json({ success: false, error: 'Application ID is required.' }, { status: 400 });
        }

        const application = await base44.asServiceRole.entities.MakerApplication.get(applicationId);
        if (!application) {
            return Response.json({ success: false, error: 'Application not found.' }, { status: 404 });
        }

        const makerId = `maker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update application status
        await base44.asServiceRole.entities.MakerApplication.update(applicationId, { status: 'approved' });

        // Update the user's roles and details
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
            max_hours_per_week: application.weekly_capacity || 40,
            starter_kit_offer_shown: false, // flag to show starter kit offer banner
        });

        // Populate printers from application data
        if (application.printers && application.printers.length > 0) {
            for (const printer of application.printers) {
                await base44.asServiceRole.entities.Printer.create({
                    maker_id: makerId,
                    name: printer.name || `${printer.brand} ${printer.model}`,
                    brand: printer.brand,
                    model: printer.model,
                    print_volume: printer.print_volume || {},
                    supported_materials: printer.supported_materials || [],
                    multi_color_capable: printer.multi_color_capable || false,
                    status: 'active',
                });
            }
        }

        // Populate filaments from application data
        if (application.filaments && application.filaments.length > 0) {
            for (const fil of application.filaments) {
                await base44.asServiceRole.entities.Filament.create({
                    maker_id: makerId,
                    material_type: fil.material_type,
                    color: fil.color,
                    quantity_kg: fil.quantity_kg || 1,
                    in_stock: true,
                });
            }
        }

        // Send approval email
        try {
            await base44.asServiceRole.functions.invoke('sendEmail', {
                to: application.email,
                subject: 'Welcome to the EX3D Maker Network! 🎉',
                body: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#f97316,#dc2626);padding:36px 32px;text-align:center;">
    <h1 style="color:white;margin:0;">🎉 You're Approved!</h1>
    <p style="color:#fed7aa;margin:8px 0 0;">Welcome to the EX3D Maker Network</p>
  </div>
  <div style="padding:28px 32px;">
    <p>Hi <strong>${application.full_name}</strong>,</p>
    <p>Great news — your application to become a Maker on EX3D Prints has been <strong>approved!</strong></p>
    <p>You can now log in and access your Maker Hub here:<br/><a href="https://ex3dprints.com/ConsumerDashboard?tab=maker" style="color:#f97316;">https://ex3dprints.com/ConsumerDashboard?tab=maker</a></p>

    <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #fb923c;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:18px;font-weight:bold;color:#9a3412;">📦 Welcome Offer: Starter Shipping Kit at 50% Off!</p>
      <p style="margin:8px 0 0;color:#c2410c;">As a new maker, grab your first Starter Shipping Kit for just <strong>$10</strong> (normally $20). Includes boxes, packing tape, and packing paper to start shipping orders right away.</p>
      <a href="https://ex3dprints.com/ConsumerDashboard?tab=maker&section=supplies&offer=starter_kit" style="display:inline-block;margin-top:12px;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Claim Your $10 Kit →</a>
    </div>

    <h3 style="color:#374151;">To start receiving orders:</h3>
    <ul style="color:#4b5563;">
      <li>Complete your print quality approval (download test files, print, and upload photos)</li>
      <li>Connect your Stripe account to receive payments</li>
    </ul>
    <p>Your printer and filament info from your application has already been added to your Maker Hub.</p>
    <p>Welcome to the network — we're excited to have you!</p>
    <p>Thank you,<br/>The EX3D Team</p>
  </div>
</div></body></html>`
            });
        } catch(e) {
            console.error("Failed to send approval email:", e.message);
        }

        return Response.json({ success: true, message: 'Application approved successfully.' });

    } catch (error) {
        console.error('Approval function error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});