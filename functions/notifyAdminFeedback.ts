import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId } = await req.json();

    if (!reportId) {
      return Response.json({ error: 'Report ID required' }, { status: 400 });
    }

    // Get the report details
    const report = await base44.entities.FeedbackReport.get(reportId);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get all admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    if (adminUsers.length === 0) {
      return Response.json({ error: 'No admin users found' }, { status: 500 });
    }

    // Send email to all admins
    const emailPromises = adminUsers.map(admin => 
      base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: `New ${report.report_type === 'bug' ? 'Bug Report' : report.report_type === 'feature_request' ? 'Feature Request' : 'Feedback'}: ${report.title}`,
        body: `
          <h2>New Feedback Report Submitted</h2>
          <p><strong>Type:</strong> ${report.report_type}</p>
          <p><strong>Priority:</strong> ${report.priority}</p>
          <p><strong>Title:</strong> ${report.title}</p>
          <p><strong>Description:</strong></p>
          <p>${report.description}</p>
          <hr>
          <p><strong>Submitted by:</strong> ${report.user_name || 'Anonymous'} (${report.user_email || 'No email'})</p>
          <p><strong>Page:</strong> ${report.page_url || 'Not specified'}</p>
          <p><strong>Submitted at:</strong> ${new Date(report.created_date).toLocaleString()}</p>
          <hr>
          <p>View in Command Center to respond or update status.</p>
        `
      })
    );

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      message: `Email sent to ${adminUsers.length} admin(s)` 
    });
  } catch (error) {
    console.error('Error sending feedback notification:', error);
    return Response.json({ 
      error: 'Failed to send notification', 
      details: error.message 
    }, { status: 500 });
  }
});