import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.11.0';

const ADMIN_EMAIL = 'jc3dprints2022@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and manual admin invocation
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) {
      // Called from automation — proceed as service role
      isAdmin = true;
    }
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), { apiVersion: '2023-10-16' });

    const errors = [];
    let designersPaid = 0;
    let makersPaid = 0;

    // ── 1. DESIGNER ROYALTIES ──────────────────────────────────────────────────
    const pendingDesignerEarnings = await base44.asServiceRole.entities.DesignerEarnings.filter({ status: 'pending' });
    
    // Group by designer_id
    const byDesigner = {};
    for (const e of pendingDesignerEarnings) {
      if (!byDesigner[e.designer_id]) byDesigner[e.designer_id] = [];
      byDesigner[e.designer_id].push(e);
    }

    for (const [designerId, earnings] of Object.entries(byDesigner)) {
      const totalCents = Math.round(earnings.reduce((s, e) => s + e.royalty_amount, 0) * 100);
      if (totalCents < 100) continue; // skip < $1

      try {
        // Find designer user by designer_id field
        const allUsers = await base44.asServiceRole.entities.User.list();
        const designerUser = allUsers.find(u => u.designer_id === designerId);
        if (!designerUser?.stripe_account_id) {
          throw new Error(`Designer ${designerId} has no stripe_account_id`);
        }

        const transfer = await stripe.transfers.create({
          amount: totalCents,
          currency: 'usd',
          destination: designerUser.stripe_account_id,
          description: `Designer royalties payout — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        });

        const paidDate = new Date().toISOString();
        for (const e of earnings) {
          await base44.asServiceRole.entities.DesignerEarnings.update(e.id, {
            status: 'paid',
            paid_date: paidDate,
            stripe_transfer_id: transfer.id,
          });
        }
        designersPaid++;

        // Notify designer
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: designerUser.email,
          subject: `💸 Designer Royalties Paid — $${(totalCents / 100).toFixed(2)}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#5b21b6;">Your Royalty Payment Has Been Sent!</h2>
<p>Hi ${designerUser.full_name},</p>
<p>We've just transferred <strong>$${(totalCents / 100).toFixed(2)}</strong> in royalties to your Stripe account.</p>
<p>This covers <strong>${earnings.length} order${earnings.length > 1 ? 's' : ''}</strong> this period (10% of each product sale).</p>
<p>Funds typically arrive in 2–3 business days.</p>
<p>Thank you,<br/>The EX3D Team</p>
</div>`,
        }).catch(() => {});
      } catch (err) {
        errors.push({ type: 'designer', id: designerId, error: err.message });
        for (const e of earnings) {
          await base44.asServiceRole.entities.DesignerEarnings.update(e.id, { status: 'transfer_failed' }).catch(() => {});
        }
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `⚠️ Designer Royalty Transfer Failed — ${designerId}`,
          body: `<p>Designer ID: ${designerId}</p><p>Amount: $${(totalCents / 100).toFixed(2)}</p><p>Error: ${err.message}</p>`,
        }).catch(() => {});
      }
    }

    // ── 2. MAKER EARNINGS ─────────────────────────────────────────────────────
    const pendingMakerEarnings = await base44.asServiceRole.entities.MakerEarnings.filter({ status: 'pending' });

    // Group by maker_user_id
    const byMaker = {};
    for (const e of pendingMakerEarnings) {
      const key = e.maker_user_id || e.maker_id;
      if (!byMaker[key]) byMaker[key] = [];
      byMaker[key].push(e);
    }

    const allUsers = await base44.asServiceRole.entities.User.list();

    for (const [makerKey, earnings] of Object.entries(byMaker)) {
      const totalCents = Math.round(earnings.reduce((s, e) => s + e.maker_earnings, 0) * 100);
      if (totalCents < 100) continue;

      try {
        const makerUser = allUsers.find(u => u.id === makerKey || u.maker_id === makerKey);
        if (!makerUser?.stripe_account_id) {
          throw new Error(`Maker ${makerKey} has no stripe_account_id`);
        }

        const transfer = await stripe.transfers.create({
          amount: totalCents,
          currency: 'usd',
          destination: makerUser.stripe_account_id,
          description: `Maker payout — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        });

        const paidDate = new Date().toISOString();
        for (const e of earnings) {
          await base44.asServiceRole.entities.MakerEarnings.update(e.id, {
            status: 'paid',
            paid_date: paidDate,
            stripe_transfer_id: transfer.id,
          });
        }
        makersPaid++;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: makerUser.email,
          subject: `💸 Maker Payout Sent — $${(totalCents / 100).toFixed(2)}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0d9488;">Your Payout Has Been Sent!</h2>
<p>Hi ${makerUser.full_name},</p>
<p>We've just transferred <strong>$${(totalCents / 100).toFixed(2)}</strong> to your Stripe account for <strong>${earnings.length} completed order${earnings.length > 1 ? 's' : ''}</strong> this period.</p>
<p>Funds typically arrive in 2–3 business days.</p>
<p>Thank you,<br/>The EX3D Team</p>
</div>`,
        }).catch(() => {});
      } catch (err) {
        errors.push({ type: 'maker', id: makerKey, error: err.message });
        for (const e of earnings) {
          await base44.asServiceRole.entities.MakerEarnings.update(e.id, { status: 'transfer_failed' }).catch(() => {});
        }
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `⚠️ Maker Payout Transfer Failed — ${makerKey}`,
          body: `<p>Maker: ${makerKey}</p><p>Amount: $${(totalCents / 100).toFixed(2)}</p><p>Error: ${err.message}</p>`,
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, designersPaid, makersPaid, errors });
  } catch (error) {
    console.error('processMonthlyPayouts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});