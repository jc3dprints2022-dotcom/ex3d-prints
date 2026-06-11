import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin-only function
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { productId } = await req.json();
        
        if (!productId) {
            return Response.json({ error: 'Product ID required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Get product from database
        const product = await base44.asServiceRole.entities.Product.get(productId);
        if (!product) {
            return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        let stripeProductId = product.stripe_product_id;
        let stripePriceId = product.stripe_price_id;

        // Determine if product should be active in Stripe
        const isActive = product.status === 'active';

        if (stripeProductId) {
            // Update existing Stripe product
            await stripe.products.update(stripeProductId, {
                name: product.name,
                description: product.description?.substring(0, 500) || 'Custom 3D printed item',
                active: isActive,
                images: product.images?.slice(0, 8) || [],
                metadata: {
                    product_id: product.id,
                    designer_id: product.designer_id || '',
                    category: product.category || ''
                }
            });

            console.log('✅ Updated Stripe product:', stripeProductId);
        } else {
            // Create new Stripe product
            const stripeProduct = await stripe.products.create({
                name: product.name,
                description: product.description?.substring(0, 500) || 'Custom 3D printed item',
                active: isActive,
                images: product.images?.slice(0, 8) || [],
                default_price_data: {
                    unit_amount: Math.round((product.price || 10) * 100),
                    currency: 'usd',
                },
                expand: ['default_price'],
                metadata: {
                    product_id: product.id,
                    designer_id: product.designer_id || '',
                    category: product.category || ''
                }
            });

            stripeProductId = stripeProduct.id;
            stripePriceId = stripeProduct.default_price?.id || stripeProduct.default_price;

            console.log('✅ Created Stripe product:', stripeProductId);
        }

        // Update product in database with Stripe IDs
        await base44.asServiceRole.entities.Product.update(productId, {
            stripe_product_id: stripeProductId,
            stripe_price_id: stripePriceId
        });

        return Response.json({ 
            success: true,
            stripe_product_id: stripeProductId,
            stripe_price_id: stripePriceId
        });

    } catch (error) {
        console.error('Stripe product sync error:', error);
        return Response.json({ 
            error: 'Failed to sync product to Stripe',
            details: error.message 
        }, { status: 500 });
    }
});