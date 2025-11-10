import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, carrier, packageType, weight, speed } = await req.json();
    
    if (!orderId || !carrier || !packageType || !weight || !speed) {
      return Response.json({ error: 'Missing required shipping parameters' }, { status: 400 });
    }

    // Get order details
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    
    if (!order.maker_id || order.maker_id !== user.maker_id) {
      return Response.json({ error: 'Not authorized for this order' }, { status: 403 });
    }

    // Get maker details
    const maker = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
    if (!maker || maker.length === 0) {
      return Response.json({ error: 'Maker not found' }, { status: 404 });
    }

    const makerUser = maker[0];
    
    // Calculate shipping cost based on parameters
    const shippingRates = {
      'USPS': {
        'Priority': { 'Standard': 7.99, 'Express': 12.99 },
        'Priority Express': { 'Standard': 25.99, 'Express': 35.99 },
        'First Class': { 'Standard': 4.99 }
      },
      'UPS': {
        'Ground': { 'Standard': 9.99 },
        'Next Day Air': { 'Express': 45.99 },
        '2nd Day Air': { 'Express': 22.99 }
      },
      'FedEx': {
        'Ground': { 'Standard': 10.99 },
        'Express Saver': { 'Express': 28.99 },
        'Overnight': { 'Express': 48.99 }
      }
    };

    // Base rate lookup
    let baseRate = shippingRates[carrier]?.[packageType]?.[speed] || 10.99;
    
    // Weight-based surcharge (per pound over 1 lb)
    const weightLbs = parseFloat(weight);
    if (weightLbs > 1) {
      baseRate += (weightLbs - 1) * 0.50;
    }
    
    // Round to 2 decimals
    const finalCost = Math.round(baseRate * 100) / 100;
    
    // Generate tracking number
    const trackingNumber = `EX3D-${carrier.substring(0,3).toUpperCase()}-${Date.now()}-${order.id.slice(-6)}`;
    
    // Generate label data (in production, integrate with ShipStation, EasyPost, ShipEngine, or similar)
    const labelData = {
      orderId: order.id,
      trackingNumber,
      carrier,
      packageType,
      weight: weightLbs,
      speed,
      cost: finalCost,
      from: {
        name: makerUser.full_name,
        street: makerUser.address.street,
        city: makerUser.address.city,
        state: makerUser.address.state,
        zip: makerUser.address.zip,
        country: makerUser.address.country || 'United States',
        phone: makerUser.phone
      },
      to: {
        name: order.shipping_address.name,
        street: order.shipping_address.street,
        city: order.shipping_address.city,
        state: order.shipping_address.state,
        zip: order.shipping_address.zip,
        country: order.shipping_address.country || 'United States',
        phone: order.shipping_address.phone || order.customer_phone || ''
      },
      createdAt: new Date().toISOString(),
      barcode: `*${trackingNumber}*`
    };

    // Record the shipping label purchase in audit log
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'shipping_label_purchase',
      user_id: user.id,
      details: {
        orderId: order.id,
        trackingNumber,
        carrier,
        cost: finalCost,
        weight: weightLbs
      },
      severity: 'info'
    });

    // Update order with tracking number and status
    await base44.asServiceRole.entities.Order.update(orderId, {
      tracking_number: trackingNumber,
      status: 'printing',
      shipping_cost: finalCost,
      carrier,
      shipping_speed: speed
    });

    return Response.json({
      success: true,
      label: labelData,
      message: 'Shipping label generated successfully',
      cost: finalCost
    });

  } catch (error) {
    console.error('Error generating shipping label:', error);
    return Response.json({ 
      error: 'Failed to generate shipping label', 
      details: error.message 
    }, { status: 500 });
  }
});