import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { orderId, excludedMakerIds = [], assignToMultiple = false } = await req.json();
        
        if (!orderId) {
            return Response.json({ error: 'Order ID required' }, { status: 400 });
        }

        const order = await base44.asServiceRole.entities.Order.get(orderId);
        
        if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // Get order's campus location
        const orderCampusLocation = order.campus_location || 'erau_prescott';
        console.log('Order campus location:', orderCampusLocation);

        // Calculate total print time and check requirements
        let totalPrintTime = 0;
        let maxLength = 0, maxWidth = 0, maxHeight = 0;
        const requiredMaterials = new Set();
        const requiredColors = new Set();
        let requiresMultiColor = false;

        if (order.items) {
            order.items.forEach(item => {
                totalPrintTime += (item.print_time_hours || 2) * (item.quantity || 1);
                requiredMaterials.add(item.material || 'PLA');
                
                // Handle multi-color prints
                if (item.multi_color && item.multi_color_selections) {
                    item.multi_color_selections.forEach(color => requiredColors.add(color));
                    requiresMultiColor = true;
                } else {
                    requiredColors.add(item.color || 'Black');
                }
                
                // Get max dimensions needed
                if (item.dimensions) {
                    maxLength = Math.max(maxLength, item.dimensions.length || 0);
                    maxWidth = Math.max(maxWidth, item.dimensions.width || 0);
                    maxHeight = Math.max(maxHeight, item.dimensions.height || 0);
                }
            });
        }

        console.log('Order requirements:', {
            totalPrintTime,
            maxDimensions: { length: maxLength, width: maxWidth, height: maxHeight },
            requiredMaterials: Array.from(requiredMaterials),
            requiredColors: Array.from(requiredColors),
            requiresMultiColor
        });

        const allUsers = await base44.asServiceRole.entities.User.list();
        const allPrinters = await base44.asServiceRole.entities.Printer.list();
        const allFilaments = await base44.asServiceRole.entities.Filament.list();
        const allOrders = await base44.asServiceRole.entities.Order.list();
        
        let makers = allUsers.filter(u => 
            u.maker_id && 
            u.account_status === 'active' && 
            u.business_roles?.includes('maker') &&
            u.id !== order.customer_id &&
            !excludedMakerIds.includes(u.maker_id) &&
            // FIRST REQUIREMENT: Maker must be at the same campus as the order
            (u.campus_location || 'erau_prescott') === orderCampusLocation
        );

        console.log(`Makers at campus ${orderCampusLocation}: ${makers.length}`);

        // Filter makers based on requirements
        const eligibleMakers = [];
        
        for (const maker of makers) {
            const makerPrinters = allPrinters.filter(p => 
                p.maker_id === maker.maker_id && 
                p.status === 'active'
            );
            
            if (makerPrinters.length === 0) {
                console.log(`❌ Maker ${maker.maker_id}: No active printers`);
                continue;
            }
            
            // Check multi-color requirement
            if (requiresMultiColor) {
                const hasMultiColorPrinter = makerPrinters.some(p => p.multi_color_capable === true);
                if (!hasMultiColorPrinter) {
                    console.log(`❌ Maker ${maker.maker_id}: No multi-color printer`);
                    continue;
                }
            }
            
            // Check build volume - printer bed must be LARGER than print dimensions
            const hasCompatiblePrinter = makerPrinters.some(p => {
                if (!p.print_volume) {
                    console.log(`⚠️ Printer ${p.id}: No print volume defined`);
                    return false;
                }
                
                const bedFits = 
                    p.print_volume.length >= maxLength &&
                    p.print_volume.width >= maxWidth &&
                    p.print_volume.height >= maxHeight;
                
                if (!bedFits) {
                    console.log(`❌ Printer ${p.id}: Bed too small. Bed: ${p.print_volume.length}x${p.print_volume.width}x${p.print_volume.height}, Need: ${maxLength}x${maxWidth}x${maxHeight}`);
                }
                
                return bedFits;
            });
            
            if (!hasCompatiblePrinter) {
                console.log(`❌ Maker ${maker.maker_id}: No printer with sufficient bed size`);
                continue;
            }
            
            // Check filaments
            const makerFilaments = allFilaments.filter(f => 
                f.maker_id === maker.maker_id && 
                f.in_stock === true
            );
            
            // Check if maker has all required materials
            const hasMaterials = Array.from(requiredMaterials).every(material => 
                makerFilaments.some(f => f.material_type === material)
            );
            
            // Check if maker has all required colors
            const hasColors = Array.from(requiredColors).every(color => 
                makerFilaments.some(f => f.color === color)
            );
            
            // If maker doesn't have materials or colors, check if they're open to ordering
            if (!hasMaterials || !hasColors) {
                if (!maker.open_to_unowned_filaments) {
                    console.log(`❌ Maker ${maker.maker_id}: Missing filaments and not open to ordering. Has materials: ${hasMaterials}, Has colors: ${hasColors}`);
                    continue;
                }
                console.log(`⚠️ Maker ${maker.maker_id}: Missing filaments but open to ordering`);
            }
            
            // Check weekly hours capacity
            const hoursUsed = maker.hours_printed_this_week || 0;
            const maxHours = maker.max_hours_per_week || 40;
            const availableHours = maxHours - hoursUsed;
            
            if (availableHours < totalPrintTime) {
                console.log(`❌ Maker ${maker.maker_id}: Insufficient hours. Available: ${availableHours}h, Need: ${totalPrintTime}h`);
                continue;
            }
            
            console.log(`✅ Maker ${maker.maker_id}: Eligible! Available hours: ${availableHours}h`);
            
            // Calculate score for this maker
            const makerOrders = allOrders
                .filter(o => o.maker_id === maker.maker_id)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            
            const lastOrderDate = makerOrders.length > 0 
                ? new Date(makerOrders[0].created_date) 
                : new Date(0);
            
            const daysSinceLastOrder = (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // Scoring algorithm - prioritize makers who haven't had orders recently
            let score = daysSinceLastOrder * 10; // Heavy weight on fairness
            score += availableHours * 2; // Available capacity
            score += makerPrinters.length * 5; // More printers = more reliability
            
            // Bonus points if they already have all materials/colors
            if (hasMaterials && hasColors) {
                score += 20;
            }
            
            eligibleMakers.push({
                maker,
                score,
                daysSinceLastOrder,
                availableHours,
                printers: makerPrinters,
                hasAllFilaments: hasMaterials && hasColors
            });
        }

        if (eligibleMakers.length === 0) {
            console.log('❌ No eligible makers found');
            return Response.json({ 
                success: false,
                error: 'No eligible makers found matching requirements'
            }, { status: 404 });
        }

        // Sort by score (highest first)
        eligibleMakers.sort((a, b) => b.score - a.score);
        
        console.log('Top 3 eligible makers:', eligibleMakers.slice(0, 3).map(m => ({
            maker_id: m.maker.maker_id,
            score: m.score,
            daysSinceLastOrder: m.daysSinceLastOrder.toFixed(1),
            availableHours: m.availableHours
        })));
        
        if (assignToMultiple) {
            // Assign to up to 5 makers
            const makersToAssign = eligibleMakers.slice(0, 5);
            const assignedMakerIds = makersToAssign.map(m => m.maker.maker_id);
            
            await base44.asServiceRole.entities.Order.update(orderId, {
                maker_id: null,
                assigned_to_makers: assignedMakerIds,
                status: 'pending',
                assigned_printer_id: null
            });

            // Send notification emails to assigned makers
            for (const { maker } of makersToAssign) {
                if (maker.email) {
                    try {
                        // Get detailed order items with print files and colors
                        const itemsDetails = order.items?.map((item, idx) => {
                            let itemText = `${idx + 1}. ${item.product_name}
   - Material: ${item.selected_material || 'PLA'}
   - Color: ${item.selected_color || 'Black'}${item.multi_color_selections ? ` (Multi-color: ${item.multi_color_selections.join(', ')})` : ''}
   - Quantity: ${item.quantity}
   - Resolution: ${item.selected_resolution || 0.2}mm`;
                            
                            // Add custom request details if available
                            if (item.custom_request_id && item.description) {
                                itemText += `\n   - Description: ${item.description}`;
                            }
                            
                            if (item.print_files && item.print_files.length > 0) {
                                itemText += `\n   - Print Files: ${item.print_files.join(', ')}`;
                            }
                            
                            return itemText;
                        }).join('\n\n') || 'No items';

                        const priorityText = order.is_priority ? '\n\n⚡⚡⚡ PRIORITY OVERNIGHT ORDER ⚡⚡⚡\nThis order MUST be completed by the next day!\n' : '';

                        const earningsCalculation = ((order.total_amount || 0) * 0.7) - 0.30 + (order.is_priority ? 2.80 : 0);
                        const earningsNote = order.is_priority 
                          ? ' (70% - $0.30 Stripe fee + $2.80 priority bonus)'
                          : ' (70% - $0.30 Stripe fee)';

                        await base44.asServiceRole.functions.invoke('sendEmail', {
                            to: maker.email,
                            subject: `${order.is_priority ? '⚡ PRIORITY ' : ''}New Order Assigned - EX3D Prints`,
                            body: `Hello ${maker.full_name},

You have a new order assigned to you!${priorityText}

Order ID: ${order.id.slice(-8)}
Total: $${order.total_amount?.toFixed(2)}
Your Earnings: $${earningsCalculation.toFixed(2)}${earningsNote}

Order Details:
${itemsDetails}

Please log in to your Maker Dashboard to view and accept this order.

Best regards,
The EX3D Team`
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
                makers: makersToAssign.map(m => ({
                    maker_id: m.maker.maker_id,
                    full_name: m.maker.full_name,
                    email: m.maker.email
                }))
            });
        } else {
            // Assign to single best maker
            const { maker } = eligibleMakers[0];
            
            await base44.asServiceRole.entities.Order.update(orderId, {
                maker_id: maker.maker_id,
                assigned_to_makers: null, // Clear multi-assignment array
                status: 'pending',
                assigned_printer_id: null
            });

            try {
                // Get detailed order items with print files and colors
                const itemsDetails = order.items?.map((item, idx) => {
                    let itemText = `${idx + 1}. ${item.product_name}
   - Material: ${item.selected_material || 'PLA'}
   - Color: ${item.selected_color || 'Black'}${item.multi_color_selections ? ` (Multi-color: ${item.multi_color_selections.join(', ')})` : ''}
   - Quantity: ${item.quantity}
   - Resolution: ${item.selected_resolution || 0.2}mm`;
                    
                    // Add custom request details if available
                    if (item.custom_request_id && item.description) {
                        itemText += `\n   - Description: ${item.description}`;
                    }
                    
                    if (item.print_files && item.print_files.length > 0) {
                        itemText += `\n   - Print Files: ${item.print_files.join(', ')}`;
                    }
                    
                    return itemText;
                }).join('\n\n') || 'No items';

                const priorityText = order.is_priority ? '\n\n⚡⚡⚡ PRIORITY OVERNIGHT ORDER ⚡⚡⚡\nThis order MUST be completed by the next day!\n' : '';

                const earningsCalculation = ((order.total_amount || 0) * 0.7) - 0.30 + (order.is_priority ? 2.80 : 0);
                const earningsNote = order.is_priority 
                  ? ' (70% - $0.30 Stripe fee + $2.80 priority bonus)'
                  : ' (70% - $0.30 Stripe fee)';

                await base44.asServiceRole.functions.invoke('sendEmail', {
                    to: maker.email,
                    subject: `${order.is_priority ? '⚡ PRIORITY ' : ''}New Order Assigned - EX3D Prints`,
                    body: `Hello ${maker.full_name},

You have a new order assigned to you!${priorityText}

Order ID: ${order.id.slice(-8)}
Total: $${order.total_amount?.toFixed(2)}
Your Earnings: $${earningsCalculation.toFixed(2)}${earningsNote}

Order Details:
${itemsDetails}

Please log in to your Maker Dashboard to view and accept this order.

Best regards,
The EX3D Team`
                });
            } catch (emailError) {
                console.error('Failed to send maker email:', emailError);
            }

            return Response.json({ 
                success: true,
                assignedMaker: {
                    maker_id: maker.maker_id,
                    full_name: maker.full_name,
                    email: maker.email,
                    daysSinceLastOrder: eligibleMakers[0].daysSinceLastOrder,
                    score: eligibleMakers[0].score
                }
            });
        }

    } catch (error) {
        console.error('Error assigning order:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});