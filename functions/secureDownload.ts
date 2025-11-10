import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  // We need to get the token from the URL query parameters
  const url = new URL(req.url);
  const tokenId = url.searchParams.get('tokenId');

  if (!tokenId) {
    return new Response(JSON.stringify({ error: 'Token ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  // Base44 client needs to be initialized from the request
  const base44 = createClientFromRequest(req);
  
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log(`Download request for token: ${tokenId} from IP: ${clientIp}`);

    const tokens = await base44.asServiceRole.entities.DownloadToken.filter({ token_id: tokenId });
    
    if (tokens.length === 0) {
      console.log(`✗ Token not found: ${tokenId}`);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const token = tokens[0];

    if (token.status !== 'active' || new Date(token.expires_at) < new Date()) {
      console.log(`✗ Token used, revoked, or expired: ${tokenId}, status: ${token.status}`);
      await base44.asServiceRole.entities.DownloadToken.update(token.id, { status: 'expired' });
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const product = await base44.asServiceRole.entities.Product.get(token.file_id);
    if (!product || !product.print_files || product.print_files.length === 0) {
      console.log(`✗ Product or file not found for token: ${tokenId}`);
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const fileUrl = product.print_files[0];
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    const fileContent = await fileResponse.arrayBuffer();

    const watermarkText = `\n\n-- WATERMARK --\nID: ${token.watermark_id}\nOrder: ${token.purpose}\nTimestamp: ${new Date().toISOString()}\n-- END WATERMARK --\n`;
    const watermarkBytes = new TextEncoder().encode(watermarkText);
    const watermarkedContent = new Uint8Array(fileContent.byteLength + watermarkBytes.byteLength);
    watermarkedContent.set(new Uint8Array(fileContent), 0);
    watermarkedContent.set(watermarkBytes, fileContent.byteLength);

    // Mark token as used
    await base44.asServiceRole.entities.DownloadToken.update(token.id, {
      status: 'used',
      used_at: new Date().toISOString(),
      used_by_ip: clientIp
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'file_download',
      user_id: token.issued_to_user_id,
      file_id: token.file_id,
      token_id: tokenId,
      ip_address: clientIp,
      user_agent: userAgent,
      details: {
        file_url: fileUrl,
        watermark_id: token.watermark_id
      },
      severity: 'info'
    });

    const filename = `order_${token.purpose.replace('order_', '')}_${product.name.replace(/[^a-z0-9]/gi, '_')}.stl`;

    return new Response(watermarkedContent.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error) {
    console.error(`Download failed for token ${tokenId}:`, error);
    return new Response(JSON.stringify({ error: 'File download failed', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});