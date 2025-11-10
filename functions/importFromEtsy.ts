import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();

        if (!url || !url.includes('etsy.com')) {
            return Response.json({ 
                error: 'Please provide a valid Etsy listing URL' 
            }, { status: 400 });
        }

        console.log(`Importing from Etsy: ${url}`);

        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!response.ok) {
            return Response.json({ 
                error: `Failed to fetch Etsy listing. Status: ${response.status}` 
            }, { status: 400 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract title
        let title = $('h1').first().text().trim() || 
                   $('meta[property="og:title"]').attr('content') || 
                   $('title').text().trim() || '';

        // Extract description
        let description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || 
                         $('.wt-text-body-01').first().text().trim() || 
                         $('.listing-page-description-content').text().trim() || '';

        // Extract shop/designer name
        let designerName = $('.shop-name').text().trim() || 
                          $('a[href*="/shop/"]').first().text().trim() || 
                          '';

        console.log(`Title: ${title}`);
        console.log(`Designer: ${designerName}`);

        // Clean up title - remove "by [designer]" patterns
        if (designerName) {
            title = title.replace(new RegExp(`\\s*[-|]?\\s*by\\s+${designerName}`, 'gi'), '').trim();
            title = title.replace(/\s*[-|]\s*$/, '').trim();
        }
        
        title = title.replace(/\s*[-|]?\s*by\s+[^-|]+$/gi, '').trim();
        title = title.replace(/\s*[-|]\s*$/, '').trim();

        // Append designer attribution to description
        if (designerName) {
            description = `${description}\n\n---\nOriginal design by ${designerName} on Etsy.\nImported from: ${url}`;
        } else {
            description = `${description}\n\n---\nImported from Etsy: ${url}`;
        }

        // Collect all images
        const imageUrls = new Set();
        
        // Look for product images
        $('img').each((i, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-lazy-src');
            const srcset = $(elem).attr('srcset');
            
            if (src && src.startsWith('http')) {
                const isSmallIcon = src.includes('icon') || src.includes('logo') || src.includes('avatar') || 
                                   src.includes('favicon') || src.includes('button') || src.includes('badge');
                
                if (!isSmallIcon && src.includes('i.etsystatic.com/')) {
                    // Get higher resolution Etsy images
                    const highRes = src.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
                                      .replace(/\/il_\d+xN\./g, '/il_fullxfull.');
                    imageUrls.add(highRes);
                }
            }
            
            if (srcset) {
                const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
                urls.forEach(url => {
                    if (url && url.startsWith('http') && url.includes('i.etsystatic.com/')) {
                        const highRes = url.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
                                          .replace(/\/il_\d+xN\./g, '/il_fullxfull.');
                        imageUrls.add(highRes);
                    }
                });
            }
        });

        // Add Open Graph image
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
            const highRes = ogImage.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
                                  .replace(/\/il_\d+xN\./g, '/il_fullxfull.');
            const tempSet = new Set([highRes, ...Array.from(imageUrls)]);
            imageUrls = tempSet;
        }

        console.log(`Found ${imageUrls.size} potential image URLs`);

        // Note: Etsy digital downloads typically require purchase, so we can't automatically download files
        // We'll just note this in the description
        if (description.toLowerCase().includes('digital') || description.toLowerCase().includes('download')) {
            description += '\n\nNote: This is a digital product. Files should be manually uploaded after purchase.';
        }

        const imageUrlArray = Array.from(imageUrls);

        // Download and upload images (up to 20)
        const uploadedImages = [];
        const imageLimit = Math.min(imageUrlArray.length, 20);
        
        for (let i = 0; i < imageLimit; i++) {
            const imageUrl = imageUrlArray[i];
            try {
                console.log(`[${i + 1}/${imageLimit}] Downloading image: ${imageUrl}`);
                
                const imgResponse = await fetch(imageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': url,
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                    }
                });
                
                if (imgResponse.ok) {
                    const arrayBuffer = await imgResponse.arrayBuffer();
                    const blob = new Blob([arrayBuffer]);
                    
                    console.log(`  Size: ${blob.size} bytes`);
                    
                    if (blob.size > 5000) {
                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                        const ext = contentType.split('/')[1] || 'jpg';
                        const filename = `etsy_image_${i + 1}.${ext}`;
                        const file = new File([blob], filename, { type: contentType });
                        
                        const uploadResult = await base44.integrations.Core.UploadFile({ file });
                        uploadedImages.push(uploadResult.file_url);
                        console.log(`  ✓ Uploaded successfully (${uploadedImages.length}/${imageLimit})`);
                    } else {
                        console.log(`  ✗ Skipped (too small)`);
                    }
                } else {
                    console.log(`  ✗ Failed to fetch (${imgResponse.status})`);
                }
            } catch (error) {
                console.log(`  ✗ Error: ${error.message}`);
            }
        }

        console.log(`Successfully uploaded ${uploadedImages.length} images`);

        return Response.json({
            success: true,
            data: {
                platform: 'etsy',
                title: title || 'Untitled Design',
                description: description || 'No description available',
                images: uploadedImages,
                print_files: [], // Etsy digital files need to be manually uploaded
                designer_name: designerName,
                stats: {
                    images_found: imageUrlArray.length,
                    images_uploaded: uploadedImages.length,
                    files_found: 0,
                    files_uploaded: 0
                },
                note: 'Etsy digital files must be purchased and uploaded manually.'
            }
        });

    } catch (error) {
        console.error('Etsy import error:', error);
        return Response.json({ 
            error: error.message || 'Failed to import from Etsy',
            details: error.stack
        }, { status: 500 });
    }
});