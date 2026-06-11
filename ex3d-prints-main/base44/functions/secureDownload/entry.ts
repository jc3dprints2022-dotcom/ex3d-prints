import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const tokenId = url.searchParams.get('tokenId');

  if (!tokenId) {
    return new Response(JSON.stringify({ error: 'Token ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const base44 = createClientFromRequest(req);

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const tokens = await base44.asServiceRole.entities.DownloadToken.filter({ token_id: tokenId });
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const token = tokens[0];
    if (token.status !== 'active' || new Date(token.expires_at) < new Date()) {
      await base44.asServiceRole.entities.DownloadToken.update(token.id, { status: 'expired' });
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const product = await base44.asServiceRole.entities.Product.get(token.file_id);
    if (!product || !product.print_files || product.print_files.length === 0) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Download ALL print files and zip them if multiple, or serve single file directly
    const printFiles = product.print_files;
    const safeName = product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

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
      details: { file_urls: printFiles, watermark_id: token.watermark_id },
      severity: 'info'
    });

    if (printFiles.length === 1) {
      // Single file — serve it exactly as-is (no modification)
      const fileUrl = printFiles[0];
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
      }
      const fileContent = await fileResponse.arrayBuffer();
      const ext = fileUrl.split('?')[0].split('.').pop().toLowerCase();
      const contentType = getMimeType(ext);
      const filename = `ex3d_${safeName}.${ext}`;

      return new Response(fileContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        }
      });
    } else {
      // Multiple files — zip them all
      const { zipFiles } = await buildZip(printFiles, safeName);
      return new Response(zipFiles, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="ex3d_${safeName}_files.zip"; filename*=UTF-8''${encodeURIComponent(`ex3d_${safeName}_files.zip`)}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        }
      });
    }

  } catch (error) {
    console.error(`Download failed for token ${tokenId}:`, error);
    return new Response(JSON.stringify({ error: 'File download failed', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

function getMimeType(ext) {
  const map = {
    '3mf': 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    'stl': 'model/stl',
    'obj': 'model/obj',
    'step': 'application/step',
    'stp': 'application/step',
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

async function buildZip(fileUrls, baseName) {
  // Fetch all files
  const fileEntries = [];
  for (let i = 0; i < fileUrls.length; i++) {
    const fileUrl = fileUrls[i];
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch file ${i + 1}: ${response.statusText}`);
    const data = new Uint8Array(await response.arrayBuffer());
    const ext = fileUrl.split('?')[0].split('.').pop().toLowerCase();
    const filename = `${baseName}_file${i + 1}.${ext}`;
    fileEntries.push({ filename, data });
  }

  // Build a simple ZIP file manually (PKZIP format)
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  const encoder = new TextEncoder();

  for (const entry of fileEntries) {
    const nameBytes = encoder.encode(entry.filename);
    const data = entry.data;

    // CRC32
    const crc = crc32(data);

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); // signature
    localView.setUint16(4, 20, true);          // version needed
    localView.setUint16(6, 0, true);           // flags
    localView.setUint16(8, 0, true);           // compression (stored)
    localView.setUint16(10, 0, true);          // mod time
    localView.setUint16(12, 0, true);          // mod date
    localView.setUint32(14, crc, true);        // crc32
    localView.setUint32(18, data.length, true);// compressed size
    localView.setUint32(22, data.length, true);// uncompressed size
    localView.setUint16(26, nameBytes.length, true); // filename length
    localView.setUint16(28, 0, true);          // extra field length
    local.set(nameBytes, 30);

    localHeaders.push({ local, data, nameBytes, crc, offset });

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);  // signature
    centralView.setUint16(4, 20, true);           // version made by
    centralView.setUint16(6, 20, true);           // version needed
    centralView.setUint16(8, 0, true);            // flags
    centralView.setUint16(10, 0, true);           // compression
    centralView.setUint16(12, 0, true);           // mod time
    centralView.setUint16(14, 0, true);           // mod date
    centralView.setUint32(16, crc, true);         // crc32
    centralView.setUint32(20, data.length, true); // compressed size
    centralView.setUint32(24, data.length, true); // uncompressed size
    centralView.setUint16(28, nameBytes.length, true); // filename length
    centralView.setUint16(30, 0, true);           // extra field length
    centralView.setUint16(32, 0, true);           // comment length
    centralView.setUint16(34, 0, true);           // disk start
    centralView.setUint16(36, 0, true);           // internal attrs
    centralView.setUint32(38, 0, true);           // external attrs
    centralView.setUint32(42, offset, true);      // local header offset
    central.set(nameBytes, 46);

    centralHeaders.push(central);
    offset += local.length + data.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((s, c) => s + c.length, 0);

  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true);          // disk number
  eocdView.setUint16(6, 0, true);          // disk with central dir
  eocdView.setUint16(8, fileEntries.length, true); // entries on disk
  eocdView.setUint16(10, fileEntries.length, true); // total entries
  eocdView.setUint32(12, centralDirSize, true);     // central dir size
  eocdView.setUint32(16, centralDirOffset, true);   // central dir offset
  eocdView.setUint16(20, 0, true);         // comment length

  // Concatenate everything
  const parts = [];
  for (const { local, data } of localHeaders) { parts.push(local); parts.push(data); }
  for (const c of centralHeaders) parts.push(c);
  parts.push(eocd);

  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const p of parts) { result.set(p, pos); pos += p.length; }

  return { zipFiles: result.buffer };
}

function crc32(data) {
  const table = makeCRCTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}