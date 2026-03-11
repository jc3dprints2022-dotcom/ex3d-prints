import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const geoCache = {};

async function geocodeZip(zip) {
  const cleanZip = String(zip || '').replace(/\D/g, '').slice(0, 5);
  if (!cleanZip || cleanZip.length < 5) return null;
  if (geoCache[cleanZip]) return geoCache[cleanZip];
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${cleanZip}|country:US&key=${apiKey}`
    );
    const data = await res.json();
    if (data.results?.[0]?.geometry?.location) {
      geoCache[cleanZip] = data.results[0].geometry.location;
      return geoCache[cleanZip];
    }
  } catch (e) {
    console.error('Geocode error for zip', cleanZip, ':', e.message);
  }
  return null;
}

function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildMakerEmail(maker, order, needsShipping, earnings) {
  const itemsHtml = (order.items || []).map((item, i) => {
    const dims = item.dimensions
      ? `${item.dimensions.length || '?'} × ${item.dimensions.width || '?'} × ${item.dimensions.height || '?'} mm`
      : 'Not specified';
    const filamentG = item.weight_grams
      ? `~${Math.round((item.weight_grams || 0) * (item.quantity || 1))} g`
      : 'Not specified';
    const colorStr = item.multi_color_selections?.length > 0
      ? item.multi_color_selections.join(', ') + ' <em>(Multi-Color)</em>'
      : (item.selected_color || 'Black');
    const filesNote = item.print_files?.length > 0
      ? `<p style="margin:8px 0 0;font-size:12px;color:#718096;">📁 ${item.print_files.length} print file(s) — download from Maker Hub</p>`
      : '';
    const descNote = item.description
      ? `<p style="margin:6px 0 0;font-size:12px;color:#718096;font-style:italic;">"${item.description}"</p>`
      : '';
    return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;background:#f9fafb;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <strong style="color:#1a202c;font-size:15px;">${i + 1}. ${item.product_name}</strong>
        <span style="background:#e2e8f0;padding:3px 10px;border-radius:20px;font-size:12px;color:#4a5568;">×${item.quantity}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:3px 0;color:#718096;width:45%;">Material</td><td style="color:#2d3748;font-weight:600;">${item.selected_material || 'PLA'}</td></tr>
        <tr><td style="padding:3px 0;color:#718096;">Color(s)</td><td style="color:#2d3748;font-weight:600;">${colorStr}</td></tr>
        <tr><td style="padding:3px 0;color:#718096;">Resolution</td><td style="color:#2d3748;font-weight:600;">${item.selected_resolution || 0.2} mm layer height</td></tr>
        <tr><td style="padding:3px 0;color:#718096;">Dimensions (LxWxH)</td><td style="color:#2d3748;font-weight:600;">${dims}</td></tr>
        <tr><td style="padding:3px 0;color:#718096;">Filament Needed</td><td style="color:#2d3748;font-weight:600;">${filamentG}</td></tr>
        ${item.print_time_hours ? `<tr><td style="padding:3px 0;color:#718096;">Est. Print Time</td><td style="color:#2d3748;font-weight:600;">~${((item.print_time_hours || 0) * (item.quantity || 1)).toFixed(1)} hrs</td></tr>` : ''}
      </table>
      ${filesNote}${descNote}
    </div>`;
  }).join('');

  const shippingSection = needsShipping
    ? `<div style="background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;padding:16px;margin:20px 0;">
        <strong style="color:#c53030;font-size:14px;">📦 This order requires shipping</strong>
        <p style="margin:6px 0 0;color:#742a2a;font-size:13px;">Once you click <strong>Mark Done Printing</strong>, a USPS shipping label will be generated automatically from your address on file. The full delivery address will be shown at that point — have the package ready to ship.</p>
       </div>`
    : `<div style="background:#f0fff4;border:1px solid #c6f6d5;border-radius:8px;padding:16px;margin:20px 0;">
        <strong style="color:#276749;font-size:14px;">🏠 Local / Campus delivery</strong>
        <p style="margin:6px 0 0;color:#22543d;font-size:13px;">No external shipping required. Coordinate pickup through the Maker Hub.</p>
       </div>`;

  const steps = [
    'Log in to your <strong>Maker Hub</strong>',
    'Review order details and download print files',
    'Click <strong>Accept</strong> to claim this order',
    'Print all items carefully per specifications',
    'Click <strong>Mark Done Printing</strong> when finished',
    needsShipping ? 'Download the shipping label and ship the package' : 'Arrange customer pickup through the Maker Hub',
  ];

  const stepsHtml = steps.map((step, i) => `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
      <div style="background:#2b6cb0;color:white;min-width:22px;height:22px;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:bold;">${i + 1}</div>
      <p style="margin:0;color:#2c5282;font-size:14px;line-height:1.5;">${step}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🖨️</div>
    <h1 style="color:white;margin:0;font-size:26px;">New Print Order!</h1>
    <p style="color:#90cdf4;margin:8px 0 0;font-size:15px;">Order #${order.id.slice(-8)}</p>
  </div>
  <div style="padding:28px 32px 0;">
    <p style="color:#2d3748;font-size:16px;margin:0;">Hi <strong>${maker.full_name}</strong>,</p>
    <p style="color:#4a5568;font-size:15px;margin:8px 0 0;line-height:1.6;">A new 3D print order has been assigned to you. Log in to your Maker Hub and accept within <strong>24 hours</strong> or it will be reassigned.</p>
  </div>
  <div style="margin:24px 32px 0;background:linear-gradient(135deg,#f0fff4,#c6f6d5);border:2px solid #48bb78;border-radius:12px;padding:20px;text-align:center;">
    <p style="margin:0;color:#276749;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Earnings for This Order</p>
    <p style="margin:8px 0 0;color:#22543d;font-size:38px;font-weight:bold;">$${earnings.toFixed(2)}</p>
    <p style="margin:4px 0 0;color:#48bb78;font-size:12px;">50% of item total — shipping postage is a separate cost handled via label purchase</p>
  </div>
  <div style="padding:24px 32px 0;">
    <h2 style="color:#1a202c;font-size:18px;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">📦 Items to Print</h2>
    ${itemsHtml}
  </div>
  <div style="padding:0 32px;">${shippingSection}</div>
  <div style="padding:0 32px 24px;">
    <div style="background:#ebf8ff;border-radius:12px;padding:20px;">
      <h3 style="color:#2b6cb0;margin:0 0 14px;font-size:16px;">📋 What To Do Next</h3>
      ${stepsHtml}
    </div>
  </div>
  <div style="padding:0 32px 32px;text-align:center;">
    <a href="https://jc3dprints.base44.app/MakerDashboard" style="background:linear-gradient(135deg,#2b6cb0,#1a365d);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">Go to Maker Hub →</a>
  </div>
  <div style="background:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#718096;font-size:12px;margin:0;">EX3D Prints — <a href="mailto:labaghr@my.erau.edu" style="color:#2b6cb0;">labaghr@my.erau.edu</a> | 610-858-3200</p>
  </div>
</div>
</body>
</html>`;
}

async function splitOrder(base44, order, excludedMakerIds) {
  const itemGroups = [];
  let currentGroup = [];
  let currentGroupTime = 0;

  for (const item of order.items) {
    const itemTime = (item.print_time_hours || 2) * (item.quantity || 1);
    if (currentGroupTime + itemTime <= 5 || currentGroup.length === 0) {
      currentGroup.push(item);
      currentGroupTime += itemTime;
    } else {
      itemGroups.push(currentGroup);
      currentGroup = [item];
      currentGroupTime = itemTime;
    }
  }
  if (currentGroup.length > 0) itemGroups.push(currentGroup);

  console.log(`Split into ${itemGroups.length} groups`);

  const createdOrders = [];
  for (let i = 0; i < itemGroups.length; i++) {
    const group = itemGroups[i];
    const groupTotal = group.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const subOrder = await base44.asServiceRole.entities.Order.create({
      customer_id: order.customer_id,
      customer_username: order.customer_username,
      campus_location: order.campus_location,
      is_priority: order.is_priority,
      is_local_delivery: order.is_local_delivery,
      shipping_address: order.shipping_address,
      items: group,
      total_amount: groupTotal,
      status: 'unassigned',
      payment_status: order.payment_status,
      payment_intent_id: order.payment_intent_id,
      stripe_session_id: order.stripe_session_id,
      delivery_option: order.delivery_option,
      notes: `Part ${i + 1} of ${itemGroups.length} — Split from order #${order.id.slice(-8)}`
    });
    createdOrders.push(subOrder);
  }

  await base44.asServiceRole.entities.Order.update(order.id, {
    status: 'cancelled',
    cancellation_reason: `Split into ${itemGroups.length} sub-orders for parallel production`
  });

  const assignments = [];
  for (const subOrder of createdOrders) {
    try {
      const response = await base44.asServiceRole.functions.invoke('assignOrderToMaker', { orderId: subOrder.id });
      assignments.push({ orderId: subOrder.id, response });
    } catch (err) {
      console.error(`Failed to assign sub-order ${subOrder.id}:`, err);
    }
  }

  return Response.json({ success: true, split: true, originalOrderId: order.id, subOrders: createdOrders.map(o => o.id), assignments });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, excludedMakerIds = [], assignToMultiple = false } = await req.json();

    if (!orderId) return Response.json({ error: 'Order ID required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Calculate total print time
    const totalPrintTime = (order.items || []).reduce((sum, item) =>
      sum + ((item.print_time_hours || 2) * (item.quantity || 1)), 0);

    // Split long jobs across multiple makers
    if (totalPrintTime > 5 && (order.items || []).length > 1) {
      console.log(`📦 Splitting order ${orderId} (${totalPrintTime}h)`);
      return await splitOrder(base44, order, excludedMakerIds);
    }

    // Determine item requirements
    let maxLength = 0, maxWidth = 0, maxHeight = 0;
    const requiredMaterials = new Set();
    const requiredColors = new Set();
    let requiresMultiColor = false;
    let requiresRecycledFilament = false;

    (order.items || []).forEach(item => {
      requiredMaterials.add(item.selected_material || item.material || 'PLA');
      if (item.use_recycled_filament) requiresRecycledFilament = true;
      if (item.multi_color && item.multi_color_selections?.length > 0) {
        item.multi_color_selections.forEach(c => requiredColors.add(c));
        requiresMultiColor = true;
      } else {
        requiredColors.add(item.selected_color || item.color || 'Black');
      }
      if (item.dimensions) {
        maxLength = Math.max(maxLength, item.dimensions.length || 0);
        maxWidth = Math.max(maxWidth, item.dimensions.width || 0);
        maxHeight = Math.max(maxHeight, item.dimensions.height || 0);
      }
    });

    console.log('Requirements:', { totalPrintTime, maxLength, maxWidth, maxHeight, requiresMultiColor, requiresRecycledFilament });

    // Geocode customer ZIP for proximity search
    const customerZip = order.shipping_address?.zip || '';
    const customerLoc = customerZip ? await geocodeZip(customerZip) : null;
    console.log(`Customer ZIP: ${customerZip}, geocoded: ${customerLoc ? 'yes' : 'no'}`);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const allPrinters = await base44.asServiceRole.entities.Printer.list();
    const allFilaments = await base44.asServiceRole.entities.Filament.list();
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const allPerformance = await base44.asServiceRole.entities.MakerPerformance.list();

    const performanceMap = {};
    allPerformance.forEach(perf => {
      if (!performanceMap[perf.maker_id] || new Date(perf.week_start) > new Date(performanceMap[perf.maker_id].week_start)) {
        performanceMap[perf.maker_id] = perf;
      }
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const planLimits = { lite: 60, pro: 200, express: 600, unlimited: Infinity };
    const planPriority = { unlimited: 4, express: 3, pro: 2, lite: 1 };

    // Pre-filter: active makers not on vacation, not the customer
    const baseMakers = allUsers.filter(u =>
      u.maker_id &&
      u.account_status === 'active' &&
      u.business_roles?.includes('maker') &&
      u.id !== order.customer_id &&
      !excludedMakerIds.includes(u.maker_id) &&
      !u.vacation_mode
    );

    const checkMakerEligibility = (maker) => {
      const makerPrinters = allPrinters.filter(p => p.maker_id === maker.maker_id && p.status === 'active');
      if (makerPrinters.length === 0) return null;

      // Multi-color check
      if (requiresMultiColor && !makerPrinters.some(p => p.multi_color_capable === true)) return null;

      // Bed size check
      if (maxLength > 0 || maxWidth > 0 || maxHeight > 0) {
        const hasCompatiblePrinter = makerPrinters.some(p =>
          p.print_volume &&
          p.print_volume.length >= maxLength &&
          p.print_volume.width >= maxWidth &&
          p.print_volume.height >= maxHeight
        );
        if (!hasCompatiblePrinter) return null;
      }

      // Filament check
      const makerFilaments = allFilaments.filter(f => f.maker_id === maker.maker_id && f.in_stock === true);
      const hasMaterials = Array.from(requiredMaterials).every(m => makerFilaments.some(f => f.material_type === m));
      const hasColors = Array.from(requiredColors).every(c => makerFilaments.some(f => f.color === c));
      const hasRecycled = !requiresRecycledFilament || makerFilaments.some(f => f.is_recycled === true);
      if ((!hasMaterials || !hasColors || !hasRecycled) && !maker.open_to_unowned_filaments) return null;

      // Monthly capacity check
      const makerPlan = maker.subscription_plan || 'lite';
      const monthlyLimit = planLimits[makerPlan] || 60;
      const monthlyOrders = allOrders.filter(o =>
        o.maker_id === maker.maker_id &&
        ['completed', 'dropped_off', 'delivered', 'printing', 'accepted'].includes(o.status) &&
        new Date(o.created_date) >= firstDayOfMonth
      );
      const hoursUsed = monthlyOrders.reduce((sum, o) =>
        sum + (o.items?.reduce((h, item) => h + ((item.print_time_hours || 2) * (item.quantity || 1)), 0) || 0), 0);
      if (monthlyLimit - hoursUsed < totalPrintTime) return null;

      // Scoring
      const makerOrders = allOrders.filter(o => o.maker_id === maker.maker_id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const daysSinceLastOrder = makerOrders[0]
        ? (Date.now() - new Date(makerOrders[0].created_date).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      const isNewMaker = makerOrders.length === 0;
      const availableHours = monthlyLimit - hoursUsed;

      const performance = performanceMap[maker.maker_id];
      let tierBonus = 0, tierMultiplier = 1;
      if (performance && !performance.routing_priority_reduced) {
        if (performance.tier === 'gold') { tierBonus = 300; tierMultiplier = 1.5; }
        else if (performance.tier === 'silver') { tierBonus = 150; tierMultiplier = 1.2; }
      } else if (performance?.routing_priority_reduced) {
        tierMultiplier = 0.3;
      }

      const priority = planPriority[makerPlan] || 1;
      let score = priority * 100 + daysSinceLastOrder * 15 + availableHours * 2 + makerPrinters.length * 3;
      if (isNewMaker) score += 50;
      if (hasMaterials && hasColors) score += 15;
      if (requiresRecycledFilament && hasRecycled) score += 10;
      score = (score + tierBonus) * tierMultiplier;

      return { maker, score, daysSinceLastOrder, availableHours, printers: makerPrinters, plan: makerPlan };
    };

    // Search in expanding radius until eligible makers are found
    let eligibleMakers = [];
    const RADII = [25, 50, 100, 200, 500, Infinity];

    for (const radius of RADII) {
      const makersInRadius = [];

      for (const maker of baseMakers) {
        if (customerLoc) {
          if (radius === Infinity) {
            makersInRadius.push(maker);
          } else {
            const makerLoc = maker.address?.zip ? await geocodeZip(maker.address.zip) : null;
            if (!makerLoc) continue;
            const dist = haversineDistanceMiles(customerLoc.lat, customerLoc.lng, makerLoc.lat, makerLoc.lng);
            if (dist <= radius) makersInRadius.push(maker);
          }
        } else {
          // No geocoding available — fall back to same campus
          if ((maker.campus_location || 'erau_prescott') === (order.campus_location || 'erau_prescott')) {
            makersInRadius.push(maker);
          }
        }
      }

      for (const maker of makersInRadius) {
        const result = checkMakerEligibility(maker);
        if (result) eligibleMakers.push(result);
      }

      if (eligibleMakers.length > 0) {
        console.log(`✅ Found ${eligibleMakers.length} eligible maker(s) within ${radius === Infinity ? 'nationwide' : radius + ' miles'}`);
        break;
      }
      if (radius !== Infinity) console.log(`No eligible makers within ${radius} miles, expanding search...`);
    }

    if (eligibleMakers.length === 0) {
      console.log('❌ No eligible makers found');
      return Response.json({ success: false, error: 'No eligible makers found matching requirements' }, { status: 404 });
    }

    eligibleMakers.sort((a, b) => b.score - a.score);

    const needsShipping = !!(order.shipping_address?.street && !order.is_local_delivery);
    const shippingCostOnOrder = order.shipping_cost || 0;
    const itemsTotal = Math.max(0, (order.total_amount || 0) - shippingCostOnOrder);
    const earnings = itemsTotal * 0.5;

    if (assignToMultiple) {
      const numMakersToAssign = Math.min(3, eligibleMakers.length);
      const makersToAssign = eligibleMakers.slice(0, numMakersToAssign);
      const assignedMakerIds = makersToAssign.map(m => m.maker.maker_id);

      await base44.asServiceRole.entities.Order.update(orderId, {
        maker_id: null,
        assigned_to_makers: assignedMakerIds,
        status: 'pending',
        assigned_printer_id: null
      });

      for (const { maker } of makersToAssign) {
        if (maker.email) {
          try {
            await base44.asServiceRole.functions.invoke('sendEmail', {
              to: maker.email,
              subject: `🔔 New Order Available — EX3D Prints`,
              body: buildMakerEmail(maker, order, needsShipping, earnings)
            });
          } catch (emailError) {
            console.error('Failed to send maker email:', emailError);
          }
        }
      }

      return Response.json({
        success: true,
        assignedToMultiple: true,
        makerCount: assignedMakerIds.length,
        message: `Order sent to ${assignedMakerIds.length} maker(s). First to accept gets it.`
      });
    } else {
      const { maker } = eligibleMakers[0];

      await base44.asServiceRole.entities.Order.update(orderId, {
        maker_id: maker.maker_id,
        assigned_to_makers: null,
        status: 'pending',
        assigned_printer_id: null
      });

      if (maker.email) {
        try {
          await base44.asServiceRole.functions.invoke('sendEmail', {
            to: maker.email,
            subject: `🔔 New Print Order Assigned — EX3D Prints`,
            body: buildMakerEmail(maker, order, needsShipping, earnings)
          });
        } catch (emailError) {
          console.error('Failed to send maker email:', emailError);
        }
      }

      return Response.json({
        success: true,
        assignedMaker: {
          maker_id: maker.maker_id,
          full_name: maker.full_name,
          email: maker.email,
          score: eligibleMakers[0].score
        }
      });
    }
  } catch (error) {
    console.error('Error assigning order:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});