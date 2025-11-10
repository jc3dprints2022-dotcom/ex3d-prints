import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { tokenId, reason } = await req.json();
    
    if (!tokenId) {
      return Response.json({ error: 'Token ID required' }, { status: 400 });
    }

    // Find token
    const tokens = await base44.asServiceRole.entities.DownloadToken.filter({ token_id: tokenId });
    
    if (tokens.length === 0) {
      return Response.json({ error: 'Token not found' }, { status: 404 });
    }

    const token = tokens[0];

    // Revoke token
    await base44.asServiceRole.entities.DownloadToken.update(token.id, {
      status: 'revoked'
    });

    // Create audit log
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'token_revoke',
      user_id: user.id,
      file_id: token.file_id,
      token_id: tokenId,
      ip_address: clientIp,
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: {
        revoked_by: user.full_name,
        reason: reason || 'admin_revocation',
        original_issued_to: token.issued_to_user_id
      },
      severity: 'warning'
    });

    console.log(`✓ Token revoked: ${tokenId} by admin ${user.full_name}`);

    return Response.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking token:', error);
    return Response.json({ 
      error: 'Failed to revoke token', 
      details: error.message 
    }, { status: 500 });
  }
});