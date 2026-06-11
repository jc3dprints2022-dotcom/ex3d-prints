import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, fileType, purpose, expiresSeconds } = await req.json();
    
    if (!fileId || !fileType) {
      return Response.json({ error: 'Missing fileId or fileType' }, { status: 400 });
    }

    const roles = user.business_roles || [];
    if (!roles.includes('maker')) {
      return Response.json({ error: 'Only makers can request download tokens' }, { status: 403 });
    }

    const tokenId = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    const watermarkId = `wm_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const expiryMs = (expiresSeconds || 3600) * 1000; // Default to 1 hour
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();
    
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Create download token without encryption password
    await base44.asServiceRole.entities.DownloadToken.create({
      token_id: tokenId,
      file_id: fileId,
      file_type: fileType,
      issued_to_user_id: user.id,
      issued_to_maker_id: user.maker_id,
      allowed_ip: null,
      expires_at: expiresAt,
      status: 'active',
      purpose: purpose || 'file_download',
      watermark_id: watermarkId,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'token_issue',
      user_id: user.id,
      file_id: fileId,
      token_id: tokenId,
      ip_address: clientIp,
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: {
        maker_id: user.maker_id,
        purpose,
        expires_at: expiresAt,
        watermark_id: watermarkId,
        encrypted: false // File is not encrypted
      },
      severity: 'info'
    });
    
    // Construct the direct download URL
    const downloadUrl = `/functions/secureDownload?tokenId=${tokenId}`;

    return Response.json({
      success: true,
      download_url: downloadUrl,
      watermark_id: watermarkId,
      expires_at: expiresAt,
    });

  } catch (error) {
    console.error('Error issuing download token:', error);
    return Response.json({ 
      error: 'Failed to issue download token', 
      details: error.message 
    }, { status: 500 });
  }
});