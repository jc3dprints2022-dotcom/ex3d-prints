import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Fetch all products
    const allProducts = await base44.asServiceRole.entities.Product.list();
    
    const updates = [];
    const errors = [];

    for (const product of allProducts) {
      try {
        // Skip products without required data
        if (!product.weight_grams || !product.print_time_hours) {
          errors.push({
            id: product.id,
            name: product.name,
            reason: 'Missing weight_grams or print_time_hours'
          });
          continue;
        }

        // Calculate new price using the formula
        const grams = parseFloat(product.weight_grams);
        const printTime = parseFloat(product.print_time_hours);
        const rawPrice = (((grams / 1000) * 20) + (printTime / 5)) * 4.5;
        const calculatedPrice = Math.ceil(rawPrice);

        // Update product
        await base44.asServiceRole.entities.Product.update(product.id, {
          price: calculatedPrice
        });

        updates.push({
          id: product.id,
          name: product.name,
          old_price: product.price,
          new_price: calculatedPrice,
          weight_grams: grams,
          print_time_hours: printTime
        });
      } catch (error) {
        errors.push({
          id: product.id,
          name: product.name,
          reason: error.message
        });
      }
    }

    return Response.json({
      success: true,
      total_products: allProducts.length,
      updated_count: updates.length,
      error_count: errors.length,
      updates,
      errors
    });

  } catch (error) {
    console.error('Error updating product pricing:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});