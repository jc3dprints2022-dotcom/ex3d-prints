import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.maker_id) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - Maker access required' 
            }, { status: 401 });
        }

        const { orderId } = await req.json();

        if (!orderId) {
            return Response.json({ 
                success: false,
                error: 'Order ID is required' 
            }, { status: 400 });
        }

        // Get the order
        const order = await base44.entities.Order.get(orderId);

        // Verify the maker has access to this order
        if (order.maker_id !== user.maker_id && 
            (!order.assigned_to_makers || !order.assigned_to_makers.includes(user.maker_id))) {
            return Response.json({ 
                success: false,
                error: 'You do not have access to this order' 
            }, { status: 403 });
        }

        // Collect all print files from order items
        const allFiles = [];
        for (const item of order.items) {
            if (item.print_files && item.print_files.length > 0) {
                for (const fileUrl of item.print_files) {
                    allFiles.push({
                        url: fileUrl,
                        name: `${item.product_name.replace(/[^a-z0-9]/gi, '_')}_${fileUrl.split('/').pop()}`
                    });
                }
            }
        }

        if (allFiles.length === 0) {
            return Response.json({ 
                success: false,
                error: 'No print files found for this order' 
            }, { status: 404 });
        }

        // Create a zip file
        const zip = new JSZip();

        // Add README with order info
        const readme = `Order #${order.id.slice(-8)}
Created: ${new Date(order.created_date).toLocaleString()}
Customer: ${order.customer_id}

Items:
${order.items.map(item => `- ${item.product_name} (${item.material} • ${item.color}) x${item.quantity}`).join('\n')}

Total: $${order.total_amount.toFixed(2)}
Your earnings: $${(order.total_amount * 0.7).toFixed(2)} (70%)

Pickup Location: ${order.pickup_location}

Print the files in this folder and prepare them for pickup at the specified location.
`;
        zip.file('README.txt', readme);

        // Download and add each file to the zip
        for (const file of allFiles) {
            try {
                const response = await fetch(file.url);
                if (!response.ok) {
                    console.error(`Failed to fetch ${file.url}: ${response.statusText}`);
                    continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                zip.file(file.name, arrayBuffer);
            } catch (error) {
                console.error(`Error downloading file ${file.url}:`, error);
            }
        }

        // Generate the zip file
        const zipBlob = await zip.generateAsync({ 
            type: 'uint8array',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        // Return the zip file
        return new Response(zipBlob, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="Order_${order.id.slice(-8)}_Files.zip"`
            }
        });

    } catch (error) {
        console.error('Zip files error:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to create zip file' 
        }, { status: 500 });
    }
});