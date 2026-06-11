import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'jc3dprints2022@gmail.com';

const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'whore', 'nigger', 'faggot',
  'nazi', 'porn', 'sex', 'nude', 'naked', 'rape', 'kill', 'murder', 'suicide', 'bomb', 'weapon',
  'drug', 'cocaine', 'meth', 'heroin', 'weed', 'marijuana', 'hate', 'racist', 'terrorism'
];

function containsBadWords(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(lower);
  });
}

function checkTextFields(product) {
  const issues = [];
  if (containsBadWords(product.name)) issues.push('Product name contains inappropriate language');
  if (containsBadWords(product.description)) issues.push('Description contains inappropriate language');
  if (containsBadWords(product.short_description)) issues.push('Short description contains inappropriate language');
  if (product.tags && product.tags.some(t => containsBadWords(t))) issues.push('Tags contain inappropriate language');
  return issues;
}

async function checkImagesWithAI(base44, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return [];
  const issues = [];

  for (const url of imageUrls.slice(0, 4)) { // check up to 4 images
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Review this product image for a 3D printing marketplace aimed at college students. 
Respond with a JSON object: { "safe": true/false, "reason": "brief explanation if unsafe" }
Mark as unsafe if the image contains: nudity, graphic violence, hate symbols, drugs, weapons (real firearms/explosives), or otherwise inappropriate content for a family-friendly marketplace.
3D printed objects, models, rockets, toys, decorative items, etc. are all fine.`,
        file_urls: [url],
        response_json_schema: {
          type: "object",
          properties: {
            safe: { type: "boolean" },
            reason: { type: "string" }
          }
        }
      });
      if (result && result.safe === false) {
        issues.push(`Image flagged: ${result.reason || 'potentially inappropriate content'}`);
      }
    } catch (err) {
      console.error('Image check error:', err.message);
      // If image check fails, don't block — just note it
    }
  }
  return issues;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Support both direct calls { productId } and entity automation payload { event, data }
    const productId = body.productId || body.event?.entity_id;
    const eventType = body.eventType || body.event?.type || 'unknown';

    if (!productId) {
      return Response.json({ error: 'productId required' }, { status: 400 });
    }

    const product = await base44.asServiceRole.entities.Product.get(productId);
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // Only review designer listings that are pending
    if (product.product_type !== 'design' && product.seller_type !== 'designer') {
      return Response.json({ skipped: true, reason: 'Not a designer product' });
    }
    if (product.status !== 'pending' && product.status !== 'draft') {
      return Response.json({ skipped: true, reason: `Status is ${product.status}, skipping` });
    }

    const issues = [];

    // 1. Check required fields
    if (!product.name || product.name.trim().length < 3) issues.push('Product name is missing or too short');
    if (!product.description || product.description.trim().length < 20) issues.push('Description is missing or too short');
    if (!product.images || product.images.length === 0) issues.push('No product images uploaded');
    if (!product.print_files || product.print_files.length === 0) issues.push('No 3D model files uploaded');
    if (!product.price || product.price <= 0) issues.push('Invalid or missing price');
    if (!product.category) issues.push('No category selected');

    // 2. Check text for bad words
    const textIssues = checkTextFields(product);
    issues.push(...textIssues);

    // 3. Check images with AI (only if no hard blockers yet)
    let imageIssues = [];
    if (textIssues.length === 0 && product.images && product.images.length > 0) {
      imageIssues = await checkImagesWithAI(base44, product.images);
      issues.push(...imageIssues);
    }

    const hasFlaggedContent = textIssues.length > 0 || imageIssues.length > 0;
    const hasMissingFields = issues.filter(i => !textIssues.includes(i) && !imageIssues.includes(i)).length > 0;

    if (hasFlaggedContent) {
      // Flag for admin review — potential policy violation
      await base44.asServiceRole.entities.Product.update(productId, {
        status: 'pending',
        admin_feedback: `[Auto-flagged for review] ${issues.join('; ')}`
      });

      // Get designer info
      let designerEmail = '';
      let designerName = 'Designer';
      try {
        if (product.seller_id) {
          const designer = await base44.asServiceRole.entities.User.get(product.seller_id);
          designerEmail = designer?.email || '';
          designerName = designer?.full_name || designer?.designer_name || 'Designer';
        }
      } catch {}

      await base44.asServiceRole.functions.invoke('sendEmail', {
        to: ADMIN_EMAIL,
        subject: `🚨 Designer Listing Flagged for Review — "${product.name}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#dc2626;">Designer Listing Needs Review</h2>
<p><strong>Product:</strong> ${product.name}</p>
<p><strong>Designer:</strong> ${designerName} (${designerEmail})</p>
<p><strong>Event:</strong> ${eventType || 'unknown'}</p>
<p><strong>Issues flagged:</strong></p>
<ul>${issues.map(i => `<li style="color:#dc2626;">${i}</li>`).join('')}</ul>
${product.images?.[0] ? `<p><strong>First image:</strong><br><img src="${product.images[0]}" style="max-width:300px;border-radius:8px;margin-top:8px;" /></p>` : ''}
<br>
<a href="https://ex3dprints.com/jc3dcommandcenter?tab=designer_products" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Review in Admin Panel →</a>
</div>`
      }).catch(() => {});

      return Response.json({ result: 'flagged', issues });

    } else if (hasMissingFields) {
      // Missing fields — keep pending, email admin for quick review
      await base44.asServiceRole.entities.Product.update(productId, {
        status: 'pending',
        admin_feedback: `[Needs review — missing fields] ${issues.join('; ')}`
      });

      await base44.asServiceRole.functions.invoke('sendEmail', {
        to: ADMIN_EMAIL,
        subject: `⚠️ Designer Listing Needs Review — "${product.name}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">Designer Listing Needs Manual Review</h2>
<p><strong>Product:</strong> ${product.name}</p>
<p><strong>Issues:</strong></p>
<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
<a href="https://ex3dprints.com/jc3dcommandcenter?tab=designer_products" style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Review in Admin Panel →</a>
</div>`
      }).catch(() => {});

      return Response.json({ result: 'needs_review', issues });

    } else {
      // All clear — auto-approve
      await base44.asServiceRole.entities.Product.update(productId, {
        status: 'active',
        admin_feedback: null
      });

      // Notify designer
      try {
        if (product.seller_id) {
          const designer = await base44.asServiceRole.entities.User.get(product.seller_id);
          if (designer?.email) {
            await base44.asServiceRole.functions.invoke('sendEmail', {
              to: designer.email,
              subject: `✅ Your listing "${product.name}" is live!`,
              body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#16a34a;">Your Listing is Live! 🎉</h2>
<p>Hi ${designer.full_name || 'Designer'},</p>
<p>Your product <strong>"${product.name}"</strong> has been reviewed and is now live on the marketplace!</p>
<p><a href="https://ex3dprints.com/ProductDetail?id=${productId}" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">View Your Listing →</a></p>
<p>— The EX3D Team</p>
</div>`
            }).catch(() => {});
          }
        }
      } catch {}

      return Response.json({ result: 'approved' });
    }

  } catch (error) {
    console.error('autoReviewDesignerProduct error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});