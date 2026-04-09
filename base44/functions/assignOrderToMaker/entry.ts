import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Weights (tunable via order.routing_weights override or defaults) ──────────
const DEFAULT_WEIGHTS = {
  proximity: 0.30,
  rating:    0.25,
  capability: 0.25,
  workload:  0.20,
};

// ── Geo helpers ───────────────────────────────────────────────────────────────
const geoCache = {};
async function geocodeZip(zip) {
  const clean = String(zip || '').replace(/\D/g, '').slice(0, 5);
  if (!clean || clean.length < 5) return null;
  if (geoCache[clean]) return geoCache[clean];
  try {
    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) return null;
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${clean}|country:US&key=${key}`);
    const data = await res.json();
    if (data.results?.[0]?.geometry?.location) {
      geoCache[clean] = data.results[0].geometry.location;
      return geoCache[clean];
    }
  } catch (e) { console.error('Geocode error', clean, e.message); }
  return null;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8, r = x => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Scoring functions (each returns 0–100) ────────────────────────────────────
function proximityScore(distanceMiles) {
  if (distanceMiles === null) return 50; // unknown → neutral
  // Score decays: 0 miles = 100, 500 miles ≈ 0
  return Math.max(0, 100 - (distanceMiles / 5));
}

function ratingScore(maker, performance) {
  const perf = performance;
  let score = 50; // neutral base
  if (maker.average_rating) score = (maker.average_rating / 5) * 60;
  if (perf) {
    const onTime = (perf.on_time_rate ?? 1) * 20;
    const issueDeduct = (perf.issue_rate ?? 0) * 20;
    score += onTime - issueDeduct;
    if (perf.tier === 'gold') score += 20;
    else if (perf.tier === 'silver') score += 10;
    if (perf.routing_priority_reduced) score *= 0.3;
  }
  return Math.max(0, Math.min(100, score));
}

function capabilityScore(maker, makerPrinters, makerFilaments, requirements) {
  const { maxLength, maxWidth, maxHeight, requiredMaterials, requiredColors, requiresMultiColor, requiresRecycledFilament } = requirements;
  let score = 100;

  // Bed size margin bonus
  if (maxLength > 0 || maxWidth > 0 || maxHeight > 0) {
    const best = makerPrinters.reduce((best, p) => {
      if (!p.print_volume) return best;
      const margin = Math.min(
        (p.print_volume.length || 0) - maxLength,
        (p.print_volume.width  || 0) - maxWidth,
        (p.print_volume.height || 0) - maxHeight
      );
      return margin > best ? margin : best;
    }, -Infinity);
    // Extra margin over 20mm = bonus, tight fit = small deduction
    if (best < 5) score -= 15;
    else if (best > 50) score += 5;
  }

  // Material match
  const hasMaterials = Array.from(requiredMaterials).every(m => makerFilaments.some(f => f.material_type === m));
  if (!hasMaterials && !maker.open_to_unowned_filaments) score -= 30;

  // Color match
  const hasColors = Array.from(requiredColors).every(c => makerFilaments.some(f => f.color === c));
  if (!hasColors && !maker.open_to_unowned_filaments) score -= 20;

  // Recycled filament
  if (requiresRecycledFilament) {
    if (!makerFilaments.some(f => f.is_recycled)) score -= 10;
  }

  // Multi-color bonus when needed
  if (requiresMultiColor) {
    const hasMultiColor = makerPrinters.some(p => p.multi_color_capable);
    score += hasMultiColor ? 10 : 0; // hard filter already applied before scoring
  }

  return Math.max(0, Math.min(100, score));
}

function workloadScore(activeOrders, activeQueueHours) {
  // Fewer orders + fewer hours = better
  const orderPenalty = Math.min(activeOrders * 8, 60);
  const hourPenalty = Math.min(activeQueueHours * 3, 60);
  return Math.max(0, 100 - orderPenalty - hourPenalty);
}

// ── Eligibility hard filter ───────────────────────────────────────────────────
function isEligible(maker, makerPrinters, makerFilaments, requirements, skippedMakerIds, order) {
  const { maxLength, maxWidth, maxHeight, requiredMaterials, requiredColors, requiresMultiColor, requiresRecycledFilament } = requirements;

  if (!maker.maker_id) return false;
  if (maker.account_status !== 'active') return false;
  if (!maker.business_roles?.includes('maker')) return false;
  if (maker.vacation_mode) return false;
  if (maker.id === order.customer_id) return false;
  if (skippedMakerIds.includes(maker.maker_id)) return false;

  // Quality approval required
  // calibration_approved is set on user when admin approves calibration
  if (!maker.calibration_approved) return false;

  // Stripe required
  if (!maker.stripe_connect_account_id) return false;

  // Must have at least one active printer
  if (makerPrinters.length === 0) return false;

  // Multi-color hard requirement
  if (requiresMultiColor && !makerPrinters.some(p => p.multi_color_capable)) return false;

  // Bed size hard requirement
  if (maxLength > 0 || maxWidth > 0 || maxHeight > 0) {
    const fits = makerPrinters.some(p =>
      p.print_volume &&
      (p.print_volume.length || 0) >= maxLength &&
      (p.print_volume.width  || 0) >= maxWidth &&
      (p.print_volume.height || 0) >= maxHeight
    );
    if (!fits) return false;
  }

  // Filament hard requirement (unless open to alternatives)
  if (!maker.open_to_unowned_filaments) {
    const hasMaterials = Array.from(requiredMaterials).every(m => makerFilaments.some(f => f.material_type === m && f.in_stock));
    if (!hasMaterials) return false;
  }

  return true;
}

// ── Detect supply/admin-only orders — never route to makers ──────────────────
function isSupplyOrder(order) {
  // ShippingKitOrder entity is separate, but guard defensively:
  const notes = (order.notes || '').toLowerCase();
  if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return true;
  // If items have no selected_material and no print_files, likely a supply order
  const items = order.items || [];
  if (items.length === 0) return false;
  const hasRealPrintItems = items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
  if (!hasRealPrintItems) return true;
  return false;
}

// ── Notification email ────────────────────────────────────────────────────────
function buildMakerEmail(maker, order, needsShipping, earnings) {
  const itemsHtml = (order.items || []).map((item, i) => {
    const dims = item.dimensions
      ? `${item.dimensions.length || '?'} × ${item.dimensions.width || '?'} × ${item.dimensions.height || '?'} mm`
      : 'Not specified';
    const colorStr = item.multi_color_selections?.length > 0
      ? item.multi_color_selections.join(', ') + ' <em>(Multi-Color)</em>'
      : (item.selected_color || 'Black');
    return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;background:#f9fafb;">
      <strong style="color:#1a202c;">${i + 1}. ${item.product_name}</strong> ×${item.quantity}
      <br/><small style="color:#718096;">Material: ${item.selected_material || 'PLA'} | Color: ${colorStr} | Dims: ${dims}</small>
      ${item.print_time_hours ? `<br/><small style="color:#718096;">Est. print time: ~${((item.print_time_hours || 0) * (item.quantity || 1)).toFixed(1)} hrs</small>` : ''}
    </div>`;
  }).join('');

  const deliveryNote = needsShipping
    ? `<p style="color:#c53030;">📦 Shipping required — label generated when you mark done printing.</p>`
    : `<p style="color:#276749;">🏠 Local / campus delivery — no external shipping needed.</p>`;

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:36px 32px;text-align:center;">
    <h1 style="color:white;margin:0;">🖨️ New Print Order!</h1>
    <p style="color:#90cdf4;margin:8px 0 0;">Order #${order.id.slice(-8)}</p>
  </div>
  <div style="padding:28px 32px;">
    <p>Hi <strong>${maker.full_name}</strong>,</p>
    <p>A new 3D print order has been offered to you. You have <strong>12 hours</strong> to accept before it is offered to another maker.</p>
    <div style="background:linear-gradient(135deg,#f0fff4,#c6f6d5);border:2px solid #48bb78;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
      <p style="margin:0;color:#276749;font-size:12px;text-transform:uppercase;">Your Earnings</p>
      <p style="margin:4px 0 0;color:#22543d;font-size:36px;font-weight:bold;">$${earnings.toFixed(2)}</p>
    </div>
    <h2 style="border-bottom:2px solid #e2e8f0;padding-bottom:8px;">📦 Items to Print</h2>
    ${itemsHtml}
    ${deliveryNote}
    <div style="text-align:center;margin-top:24px;">
      <a href="https://ex3dprints.com/ConsumerDashboard?tab=maker" style="background:#2b6cb0;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Accept in Maker Hub →</a>
    </div>
  </div>
  <div style="background:#f7fafc;padding:12px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <small style="color:#718096;">EX3D Prints — ex3dprints.com</small>
  </div>
</div></body></html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, skippedMakerIds: inputSkipped = [] } = await req.json();

    if (!orderId) return Response.json({ error: 'Order ID required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Never route supply/admin orders to makers
    if (isSupplyOrder(order)) {
      console.log(`Order ${orderId} is a supply order — skipping maker assignment`);
      return Response.json({ success: false, skipped: true, reason: 'supply_order' });
    }

    // Merge skippedMakerIds from input + already tracked on the order
    const skippedMakerIds = [...new Set([...inputSkipped, ...(order.skipped_maker_ids || [])])];

    // ── Parse order requirements ──────────────────────────────────────────────
    let maxLength = 0, maxWidth = 0, maxHeight = 0;
    const requiredMaterials = new Set();
    const requiredColors = new Set();
    let requiresMultiColor = false;
    let requiresRecycledFilament = false;
    let totalPrintTime = 0;

    (order.items || []).forEach(item => {
      requiredMaterials.add(item.selected_material || item.material || 'PLA');
      totalPrintTime += (item.print_time_hours || 2) * (item.quantity || 1);
      if (item.use_recycled_filament) requiresRecycledFilament = true;
      if (item.multi_color && item.multi_color_selections?.length > 0) {
        item.multi_color_selections.forEach(c => requiredColors.add(c));
        requiresMultiColor = true;
      } else {
        requiredColors.add(item.selected_color || item.color || 'Black');
      }
      if (item.dimensions) {
        maxLength = Math.max(maxLength, item.dimensions.length || 0);
        maxWidth  = Math.max(maxWidth,  item.dimensions.width  || 0);
        maxHeight = Math.max(maxHeight, item.dimensions.height || 0);
      }
    });

    const requirements = { maxLength, maxWidth, maxHeight, requiredMaterials, requiredColors, requiresMultiColor, requiresRecycledFilament, totalPrintTime };

    // ── Geocode customer ──────────────────────────────────────────────────────
    const customerZip = order.shipping_address?.zip || '';
    const customerLoc = customerZip ? await geocodeZip(customerZip) : null;

    // ── Load all data ─────────────────────────────────────────────────────────
    const [allUsers, allPrinters, allFilaments, allOrders, allPerformance, allCalibrations] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Printer.list(),
      base44.asServiceRole.entities.Filament.list(),
      base44.asServiceRole.entities.Order.list(),
      base44.asServiceRole.entities.MakerPerformance.list(),
      base44.asServiceRole.entities.CalibrationSubmission.list(),
    ]);

    // Build lookup maps
    const performanceMap = {};
    allPerformance.forEach(p => {
      if (!performanceMap[p.maker_id] || new Date(p.week_start) > new Date(performanceMap[p.maker_id].week_start))
        performanceMap[p.maker_id] = p;
    });

    const calibrationMap = {};
    allCalibrations.forEach(c => {
      if (!calibrationMap[c.maker_id] || new Date(c.created_date) > new Date(calibrationMap[c.maker_id].created_date))
        calibrationMap[c.maker_id] = c;
    });

    // Enrich users with calibration_approved flag based on latest submission
    const enrichedUsers = allUsers.map(u => {
      if (!u.maker_id) return u;
      const latestCal = calibrationMap[u.maker_id];
      return { ...u, calibration_approved: latestCal?.status === 'approved' };
    });

    // Active order counts and queue hours per maker
    const activeOrdersMap = {};
    const queueHoursMap = {};
    allOrders.forEach(o => {
      if (!['pending', 'accepted', 'printing'].includes(o.status)) return;
      if (!o.maker_id) return;
      activeOrdersMap[o.maker_id] = (activeOrdersMap[o.maker_id] || 0) + 1;
      const hrs = (o.items || []).reduce((s, i) => s + ((i.print_time_hours || 2) * (i.quantity || 1)), 0);
      queueHoursMap[o.maker_id] = (queueHoursMap[o.maker_id] || 0) + hrs;
    });

    // ── Score & rank eligible makers ─────────────────────────────────────────
    const weights = DEFAULT_WEIGHTS;
    const rankedMakers = [];

    for (const maker of enrichedUsers) {
      if (!maker.maker_id) continue;

      const makerPrinters  = allPrinters.filter(p => p.maker_id === maker.maker_id && p.status === 'active');
      const makerFilaments = allFilaments.filter(f => f.maker_id === maker.maker_id && f.in_stock);

      if (!isEligible(maker, makerPrinters, makerFilaments, requirements, skippedMakerIds, order)) continue;

      // Geocode maker
      let distanceMiles = null;
      if (customerLoc && maker.address?.zip) {
        const makerLoc = await geocodeZip(maker.address.zip);
        if (makerLoc) distanceMiles = haversineMiles(customerLoc.lat, customerLoc.lng, makerLoc.lat, makerLoc.lng);
      }

      const activeOrders = activeOrdersMap[maker.maker_id] || 0;
      const queueHours   = queueHoursMap[maker.maker_id]   || 0;
      const performance  = performanceMap[maker.maker_id];

      const pScore = proximityScore(distanceMiles);
      const rScore = ratingScore(maker, performance);
      const cScore = capabilityScore(maker, makerPrinters, makerFilaments, requirements);
      const wScore = workloadScore(activeOrders, queueHours);

      const totalScore =
        pScore * weights.proximity +
        rScore * weights.rating    +
        cScore * weights.capability +
        wScore * weights.workload;

      rankedMakers.push({
        maker,
        totalScore,
        breakdown: { pScore, rScore, cScore, wScore, distanceMiles, activeOrders, queueHours }
      });
    }

    if (rankedMakers.length === 0) {
      console.log(`No eligible makers for order ${orderId} — sending to admin review`);
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'unassigned',
        offer_status: 'no_makers_available',
        skipped_maker_ids: skippedMakerIds,
      });
      return Response.json({ success: false, error: 'No eligible makers found — order sent to admin review' }, { status: 404 });
    }

    rankedMakers.sort((a, b) => b.totalScore - a.totalScore);
    const best = rankedMakers[0];
    const maker = best.maker;

    const nowMs = Date.now();
    const offerExpiresAt = new Date(nowMs + 12 * 60 * 60 * 1000).toISOString();
    const attemptCount = (order.assignment_attempt_count || 0) + 1;

    await base44.asServiceRole.entities.Order.update(orderId, {
      maker_id: maker.maker_id,
      assigned_to_makers: null,
      status: 'pending',
      offer_status: 'offered',
      current_offered_maker_id: maker.maker_id,
      offered_at: new Date(nowMs).toISOString(),
      offer_expires_at: offerExpiresAt,
      assignment_attempt_count: attemptCount,
      skipped_maker_ids: skippedMakerIds,
      ranked_maker_snapshot: rankedMakers.slice(0, 5).map(m => ({
        maker_id: m.maker.maker_id,
        name: m.maker.full_name,
        score: Math.round(m.totalScore * 10) / 10,
        ...m.breakdown
      })),
    });

    const needsShipping = !!(order.shipping_address?.street && !order.is_local_delivery);
    const earnings = Math.max(0, (order.total_amount || 0) - (order.shipping_cost || 0)) * 0.5;

    if (maker.email) {
      try {
        await base44.asServiceRole.functions.invoke('sendEmail', {
          to: maker.email,
          subject: `🔔 New Print Order Offer — EX3D Prints`,
          body: buildMakerEmail(maker, order, needsShipping, earnings)
        });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    console.log(`Order ${orderId} offered to ${maker.full_name} (score: ${best.totalScore.toFixed(1)}, attempt #${attemptCount}), expires ${offerExpiresAt}`);
    return Response.json({
      success: true,
      offeredTo: { maker_id: maker.maker_id, full_name: maker.full_name, score: best.totalScore },
      attempt: attemptCount,
      expiresAt: offerExpiresAt,
    });

  } catch (error) {
    console.error('assignOrderToMaker error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});