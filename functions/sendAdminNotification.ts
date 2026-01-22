import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        
        // Handle both direct invocation and entity automation triggers
        let event;
        if (payload.event) {
            // Direct invocation with event object
            event = payload.event;
        } else {
            // Entity automation - construct event from automation payload
            event = {
                type: payload.type || 'unknown',
                data: payload.data || {},
                dashboard_url: 'https://ex3dprints.com/jc3dcommandcenter'
            };
        }

        // Get all admin users
        const allUsers = await base44.asServiceRole.entities.User.list();
        const adminUsers = allUsers.filter(u => u.role === 'admin');

        if (adminUsers.length === 0) {
            console.log('No admin users found');
            return Response.json({ success: true, message: 'No admins to notify' });
        }

        let emailSubject = '';
        let emailBody = '';

        // Build email content based on event type
        switch (event.type) {
            case 'maker_application':
                emailSubject = `New Maker Application: ${event.data.full_name}`;
                emailBody = `
                    <h2>New Maker Application Submitted</h2>
                    <p><strong>Name:</strong> ${event.data.full_name}</p>
                    <p><strong>Email:</strong> ${event.data.email}</p>
                    <p><strong>Phone:</strong> ${event.data.phone || 'Not provided'}</p>
                    <p><strong>Campus:</strong> ${event.data.campus_location}</p>
                    <p><strong>Experience:</strong> ${event.data.experience_level || 'Not specified'}</p>
                    <p><strong>Weekly Capacity:</strong> ${event.data.weekly_capacity || 'Not specified'} hours</p>
                    <p><strong>Materials:</strong> ${event.data.materials?.join(', ') || 'Not specified'}</p>
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            case 'designer_application':
                emailSubject = `New Designer Application: ${event.data.designer_name}`;
                emailBody = `
                    <h2>New Designer Application Submitted</h2>
                    <p><strong>Designer Name:</strong> ${event.data.designer_name}</p>
                    <p><strong>Real Name:</strong> ${event.data.full_name}</p>
                    <p><strong>Email:</strong> ${event.data.email}</p>
                    <p><strong>Experience:</strong> ${event.data.experience_level || 'Not specified'}</p>
                    <p><strong>Categories:</strong> ${event.data.design_categories?.join(', ') || 'Not specified'}</p>
                    <p><strong>Bio:</strong> ${event.data.bio || 'Not provided'}</p>
                    ${event.data.portfolio_links?.length > 0 ? `<p><strong>Portfolio:</strong> ${event.data.portfolio_links.join(', ')}</p>` : ''}
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            case 'new_order':
                emailSubject = `New Order #${event.data.id?.slice(0, 8)}: $${event.data.total_amount}`;
                emailBody = `
                    <h2>New Order Placed</h2>
                    <p><strong>Order ID:</strong> ${event.data.id}</p>
                    <p><strong>Customer:</strong> ${event.data.customer_username || 'Unknown'}</p>
                    <p><strong>Total Amount:</strong> $${event.data.total_amount?.toFixed(2)}</p>
                    <p><strong>Status:</strong> ${event.data.status}</p>
                    <p><strong>Campus:</strong> ${event.data.campus_location || 'Not specified'}</p>
                    <p><strong>Priority:</strong> ${event.data.is_priority ? 'Yes (Overnight)' : 'No'}</p>
                    <p><strong>Items:</strong> ${event.data.items?.length || 0} item(s)</p>
                    ${event.data.items?.map(item => `
                        <div style="margin-left: 20px;">
                            - ${item.product_name} x${item.quantity} ($${item.total_price?.toFixed(2)})
                        </div>
                    `).join('') || ''}
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            case 'custom_request':
                emailSubject = `New Custom Print Request: ${event.data.title}`;
                emailBody = `
                    <h2>New Custom Print Request</h2>
                    <p><strong>Title:</strong> ${event.data.title}</p>
                    <p><strong>Customer ID:</strong> ${event.data.customer_id}</p>
                    <p><strong>Description:</strong> ${event.data.description}</p>
                    <p><strong>Quantity:</strong> ${event.data.quantity || 1}</p>
                    <p><strong>Material Preference:</strong> ${event.data.material_preference || 'Not specified'}</p>
                    <p><strong>Color Preference:</strong> ${event.data.color_preference || 'Not specified'}</p>
                    <p><strong>Timeline:</strong> ${event.data.timeline || 'Not specified'}</p>
                    <p><strong>Budget Range:</strong> ${event.data.budget_range || 'Not specified'}</p>
                    ${event.data.is_class_project ? '<p><strong>Class Project:</strong> Yes (25% discount eligible)</p>' : ''}
                    ${event.data.special_requirements ? `<p><strong>Special Requirements:</strong> ${event.data.special_requirements}</p>` : ''}
                    <p><strong>Files Uploaded:</strong> ${event.data.files?.length || 0}</p>
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            case 'order_cancelled':
                emailSubject = `Order Cancelled #${event.data.id?.slice(0, 8)}`;
                emailBody = `
                    <h2>Order Cancelled</h2>
                    <p><strong>Order ID:</strong> ${event.data.id}</p>
                    <p><strong>Customer:</strong> ${event.data.customer_username || 'Unknown'}</p>
                    <p><strong>Total Amount:</strong> $${event.data.total_amount?.toFixed(2)}</p>
                    <p><strong>Reason:</strong> ${event.data.cancellation_reason || 'Not provided'}</p>
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            case 'contact_submission':
                emailSubject = `New Contact Form: ${event.data.subject}`;
                emailBody = `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${event.data.name}</p>
                    <p><strong>Email:</strong> ${event.data.email}</p>
                    <p><strong>Subject:</strong> ${event.data.subject}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        ${event.data.message}
                    </div>
                    <p><a href="${event.dashboard_url}">View in Admin Dashboard</a></p>
                `;
                break;

            default:
                emailSubject = `New ${event.type} Event`;
                emailBody = `<h2>New Event: ${event.type}</h2><pre>${JSON.stringify(event.data, null, 2)}</pre>`;
        }

        // Send email to all admins
        const emailPromises = adminUsers.map(admin => 
            base44.asServiceRole.integrations.Core.SendEmail({
                to: admin.email,
                subject: emailSubject,
                body: emailBody
            }).catch(err => ({
                error: err.message,
                admin: admin.email
            }))
        );

        const results = await Promise.all(emailPromises);
        const errors = results.filter(r => r.error);

        console.log(`Sent ${adminUsers.length - errors.length} admin notification emails`);
        if (errors.length > 0) {
            console.error('Some emails failed:', errors);
        }

        return Response.json({ 
            success: true, 
            sent: adminUsers.length - errors.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Admin notification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});