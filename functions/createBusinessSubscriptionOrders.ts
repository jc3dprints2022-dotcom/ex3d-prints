import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // Get subscription details
    const subscription = await base44.asServiceRole.entities.BusinessSubscription.get(subscriptionId);
    
    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Get all products for this subscription
    const products = await Promise.all(
      subscription.selected_products.map(sp => 
        base44.asServiceRole.entities.Product.get(sp.product_id)
      )
    );

    // Calculate total items and split into quarters (minimum 4 makers)
    const totalItems = subscription.items_per_month;
    const minMakers = 4;
    const itemsPerMaker = Math.floor(totalItems / minMakers);

    // Determine if we need multicolor printers (if logo personalization is requested)
    const needsMulticolor = subscription.has_logo_personalization;

    // Get all active makers
    let availableMakers = await base44.asServiceRole.entities.User.filter({
      business_roles: ['maker']
    });

    // Filter makers based on requirements
    if (needsMulticolor) {
      // Need makers with multicolor printers
      const allPrinters = await base44.asServiceRole.entities.Printer.list();
      const multicolorMakerIds = [...new Set(
        allPrinters
          .filter(p => p.multi_color_capable && p.status === 'active')
          .map(p => p.maker_id)
      )];
      availableMakers = availableMakers.filter(m => multicolorMakerIds.includes(m.id));
    } else {
      // Filter by makers who have the selected colors in their filament inventory
      const allFilaments = await base44.asServiceRole.entities.Filament.list();
      const makersWithColors = [...new Set(
        allFilaments
          .filter(f => 
            f.in_stock && 
            subscription.selected_colors.some(color => f.color === color)
          )
          .map(f => f.maker_id)
      )];
      availableMakers = availableMakers.filter(m => makersWithColors.includes(m.id));
    }

    // Sort makers by performance tier (gold > silver > bronze)
    const tierOrder = { gold: 3, silver: 2, bronze: 1 };
    availableMakers.sort((a, b) => {
      const tierA = tierOrder[a.maker_tier] || 0;
      const tierB = tierOrder[b.maker_tier] || 0;
      return tierB - tierA;
    });

    // Select top makers (minimum 4)
    const selectedMakers = availableMakers.slice(0, Math.max(minMakers, availableMakers.length));

    if (selectedMakers.length === 0) {
      return Response.json({ 
        error: 'No qualifying makers available',
        details: needsMulticolor ? 'No multicolor printers available' : 'No makers with selected colors'
      }, { status: 400 });
    }

    // Create orders for each maker
    const createdOrders = [];
    
    for (let i = 0; i < selectedMakers.length; i++) {
      const maker = selectedMakers[i];
      const isLastMaker = i === selectedMakers.length - 1;
      
      // Calculate quantity for this maker
      // Last maker gets any remaining items
      const quantity = isLastMaker 
        ? totalItems - (itemsPerMaker * (selectedMakers.length - 1))
        : itemsPerMaker;

      // Distribute products and colors
      const itemsForOrder = [];
      let remainingQty = quantity;
      
      for (const sp of subscription.selected_products) {
        const product = products.find(p => p.id === sp.product_id);
        if (!product) continue;

        const qtyForProduct = Math.floor(remainingQty / subscription.selected_products.length);
        
        if (qtyForProduct > 0) {
          // Assign colors (cycle through selected colors)
          const colorIndex = i % subscription.selected_colors.length;
          const assignedColor = subscription.selected_colors[colorIndex];

          itemsForOrder.push({
            product_id: product.id,
            product_name: product.name,
            quantity: qtyForProduct,
            selected_color: assignedColor,
            selected_material: 'PLA', // Default material
            unit_price: 0, // Subscription items have no per-unit price
            total_price: 0,
            print_files: product.print_files,
            print_time_hours: product.print_time_hours * qtyForProduct,
            weight_grams: product.weight_grams * qtyForProduct,
            designer_id: product.designer_id,
            business_name: subscription.business_name,
            business_customization: needsMulticolor && subscription.logo_url 
              ? `Logo personalization: ${subscription.logo_url}`
              : ''
          });
          
          remainingQty -= qtyForProduct;
        }
      }

      // Create order for this maker
      const order = await base44.asServiceRole.entities.Order.create({
        customer_id: subscription.user_id,
        customer_username: subscription.contact_name,
        maker_id: maker.id,
        items: itemsForOrder,
        total_amount: 0, // Subscription order
        status: 'pending',
        payment_status: 'paid',
        delivery_option: 'campus_pickup',
        notes: `Business subscription order - ${subscription.business_name}. Production for ${new Date(subscription.next_production_date).toLocaleDateString()}`
      });

      createdOrders.push({
        order_id: order.id,
        maker_id: maker.id,
        maker_name: maker.full_name,
        items_count: itemsForOrder.length,
        total_quantity: quantity
      });

      // Send email notification to maker
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: maker.email,
        subject: `New Business Subscription Order - ${subscription.business_name}`,
        body: `Hi ${maker.full_name},

You've been assigned a business subscription order!

Business: ${subscription.business_name}
Items to Print: ${quantity} total items
Products: ${itemsForOrder.map(item => `${item.product_name} (${item.quantity}x in ${item.selected_color})`).join(', ')}
${needsMulticolor ? `\nLogo Customization Required: ${subscription.logo_url}` : ''}

Production Date: ${new Date(subscription.next_production_date).toLocaleDateString()}

Please check your Maker Dashboard for full order details and files.

Best regards,
The EX3D Team`
      });
    }

    console.log(`✅ Created ${createdOrders.length} orders for business subscription ${subscriptionId}`);

    return Response.json({
      success: true,
      orders_created: createdOrders.length,
      orders: createdOrders
    });

  } catch (error) {
    console.error('Error creating business subscription orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});