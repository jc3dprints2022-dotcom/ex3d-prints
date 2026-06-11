import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Triggered when a designer publishes a new listing (called from entity automation or manually).
 * Payload: { product_id, designer_id }
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        // Allow admin or service-level calls (automation)
        const payload = await req.json();
        // Support both direct call (product_id, designer_id) and entity automation payload (event.entity_id + data fields)
        const product_id = payload.product_id || payload.event?.entity_id || payload.data?.id;
        const designer_id = payload.designer_id || payload.data?.designer_id;

        if (!product_id || !designer_id) {
            return Response.json({ error: 'Missing product_id or designer_id' }, { status: 400 });
        }

        // Fetch product details
        const product = await base44.asServiceRole.entities.Product.get(product_id);
        if (!product) {
            return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        // Get all followers for this designer
        const followers = await base44.asServiceRole.entities.DesignerFollower.filter({ designer_id });
        if (followers.length === 0) {
            return Response.json({ success: true, sent: 0, message: 'No followers' });
        }

        const designerName = product.designer_name || 'Your followed designer';
        const productUrl = `${Deno.env.get('APP_ORIGIN') || 'https://jc3dprints.base44.app'}/ProductDetail?id=${product.id}&utm_source=email&utm_medium=follower_notification&utm_campaign=${product.id}`;

        const subject = `New drop from ${designerName} 🚀`;

        const imageHtml = product.images?.[0]
            ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width:100%;border-radius:8px;margin:16px 0;" />`
            : '';

        let sent = 0;
        let failed = 0;

        for (const follower of followers) {
            try {
                const firstName = (follower.name || follower.email).split(' ')[0];
                const body = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <h2 style="color:#2563eb;">New drop from ${designerName}</h2>
  <p>Hey ${firstName},</p>
  <p>A designer you follow just published a new product:</p>
  ${imageHtml}
  <h3 style="margin:8px 0;">${product.name}</h3>
  <p style="color:#475569;">${product.description?.slice(0, 200)}${product.description?.length > 200 ? '…' : ''}</p>
  <p><strong>Price: $${product.price?.toFixed(2)}</strong></p>
  <div style="margin:24px 0;display:flex;gap:12px;flex-wrap:wrap;">
    <a href="${productUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
      View Product
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#94a3b8;font-size:12px;">
    You're receiving this because you followed ${designerName} on EX3D Prints.<br />
    <a href="${Deno.env.get('APP_ORIGIN') || 'https://jc3dprints.base44.app'}" style="color:#94a3b8;">Unsubscribe</a>
  </p>
</div>`;

                await base44.integrations.Core.SendEmail({
                    to: follower.email,
                    subject,
                    body,
                });
                sent++;
            } catch (e) {
                console.error(`Failed to notify follower ${follower.email}:`, e.message);
                failed++;
            }
        }

        console.log(`Follower notifications: ${sent} sent, ${failed} failed for product ${product_id}`);
        return Response.json({ success: true, sent, failed, total: followers.length });
    } catch (error) {
        console.error('notifyDesignerFollowers error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});