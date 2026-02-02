import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { orderId, excludedMakerIds = [] } = await req.json();
        const assignToMultiple = true; // Always assign to multiple makers
        
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
            
            // Check if maker is new (no orders yet)
            const isNewMaker = makerOrders.length === 0;
            
            // Scoring algorithm - prioritize by:
            // 1. Location (already filtered above)
            // 2. Time since last order (fairness)
            // 3. New makers
            let score = daysSinceLastOrder * 15; // Heavy weight on time since last order
            
            // Extra boost for new makers
            if (isNewMaker) {
                score += 50; // Significant boost for never having received an order
            }
            
            score += availableHours * 2; // Available capacity
            score += makerPrinters.length * 3; // More printers = more reliability
            
            // Bonus points if they already have all materials/colors
            if (hasMaterials && hasColors) {
                score += 15;
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
            // Assign to 1-3 makers depending on how many are available
            const numMakersToAssign = Math.min(3, eligibleMakers.length);
            const makersToAssign = eligibleMakers.slice(0, numMakersToAssign);
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
                            subject: `🔔 New Order Received${order.is_priority ? ' - ⚡ PRIORITY OVERNIGHT ⚡' : ''} - EX3D Prints`,
                            body: `Hi ${maker.full_name},

You have received a new order that needs to be printed!${priorityText}

📦 ORDER #${order.id.slice(-8)}

💰 PAYMENT BREAKDOWN:
Order Total: $${order.total_amount?.toFixed(2)}
Platform Fee (30%): -$${(order.total_amount * 0.30).toFixed(2)}
Stripe Fee: -$0.30${order.is_priority ? '\nPriority Bonus: +$2.80' : ''}
────────────────────────
YOUR EARNINGS: $${earningsCalculation.toFixed(2)}

📦 ITEMS TO PRINT:
${itemsDetails}

📍 NEXT STEPS:
1. Log in to your Maker Dashboard to review the full order details
2. Accept or reject the order
3. Download the print files
4. Start printing!${order.is_priority ? '\n5. ⚡ PRIORITY: Complete by next day!' : ''}

🖥️  Check your Maker Dashboard for complete order information and files.

Need help? Contact support at labaghr@my.erau.edu or 610-858-3200

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
                message: `Order assigned to ${assignedMakerIds.length} maker(s). First to accept gets the order.`,
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
                    subject: `🔔 New Order Received${order.is_priority ? ' - ⚡ PRIORITY OVERNIGHT ⚡' : ''} - EX3D Prints`,
                    body: `Hi ${maker.full_name},

You have received a new order that needs to be printed!${priorityText}

📦 ORDER #${order.id.slice(-8)}

💰 PAYMENT BREAKDOWN:
Order Total: $${order.total_amount?.toFixed(2)}
Platform Fee (30%): -$${(order.total_amount * 0.30).toFixed(2)}
Stripe Fee: -$0.30${order.is_priority ? '\nPriority Bonus: +$2.80' : ''}
────────────────────────
YOUR EARNINGS: $${earningsCalculation.toFixed(2)}

📦 ITEMS TO PRINT:
${itemsDetails}

📍 NEXT STEPS:
1. Log in to your Maker Dashboard to review the full order details
2. Accept or reject the order
3. Download the print files
4. Start printing!${order.is_priority ? '\n5. ⚡ PRIORITY: Complete by next day!' : ''}

🖥️  Check your Maker Dashboard for complete order information and files.

Need help? Contact support at labaghr@my.erau.edu or 610-858-3200

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