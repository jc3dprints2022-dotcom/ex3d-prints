import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Auth optional — guests can validate coupons too
        await base44.auth.me().catch(() => null);

        const { code } = await req.json();

        if (!code || !code.trim()) {
            return Response.json({ valid: false, error: 'No coupon code provided' }, { status: 400 });
        }

        const trimmedCode = code.trim().toUpperCase();

        // Special test code — always valid, 100% off
        if (trimmedCode === 'JC3DTESTFREEDOM') {
            return Response.json({ valid: true, percent_off: 100, amount_off: null });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ valid: false, error: 'Payment system not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        // Look up promotion code in Stripe
        const promotionCodes = await stripe.promotionCodes.list({
            code: trimmedCode,
            active: true,
            limit: 1,
        });

        if (promotionCodes.data.length === 0) {
            return Response.json({ valid: false, error: 'Coupon code not found or has expired' });
        }

        const promoCode = promotionCodes.data[0];
        const coupon = promoCode.coupon;

        // Check coupon is still active
        if (!coupon.valid) {
            return Response.json({ valid: false, error: 'This coupon is no longer valid' });
        }

        return Response.json({
            valid: true,
            percent_off: coupon.percent_off || null,
            amount_off: coupon.amount_off || null, // in cents
            name: coupon.name || trimmedCode,
        });

    } catch (error) {
        console.error('validateCouponCode error:', error);
        return Response.json({ valid: false, error: 'Unable to validate coupon code' }, { status: 500 });
    }
});