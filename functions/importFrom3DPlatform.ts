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

        if (!url) {
            return Response.json({ error: 'URL is required' }, { status: 400 });
        }

        // Detect platform
        let platform = 'unknown';
        if (url.includes('thingiverse.com')) platform = 'thingiverse';
        else if (url.includes('printables.com')) platform = 'printables';
        else if (url.includes('myminifactory.com')) platform = 'myminifactory';
        else if (url.includes('cults3d.com')) platform = 'cults3d';
        else if (url.includes('thangs.com')) platform = 'thangs';

        if (platform === 'unknown') {
            return Response.json({ 
                error: 'Unsupported platform. Supported: Thingiverse, Printables, MyMiniFactory, Cults3D, Thangs' 
            }, { status: 400 });
        }

        console.log(`Importing from ${platform}: ${url}`);

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
                error: `Failed to fetch page from ${platform}. Status: ${response.status}` 
            }, { status: 400 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let title = '';
        let description = '';
        let designerName = '';
        let imageUrls = new Set();
        let fileUrls = new Set();

        // Get title (prioritize meta tags for SPAs like Printables)
        title = $('meta[property="og:title"]').attr('content') ||
               $('h1').first().text().trim() || 
               $('title').text().trim() || '';

        // Get description (prioritize meta tags for SPAs)
        description = $('meta[property="og:description"]').attr('content') || 
                     $('meta[name="description"]').attr('content') || '';
        
        // Try to extract from JSON-LD structured data
        if (!description || description.length < 50) {
            $('script[type="application/ld+json"]').each((i, elem) => {
                try {
                    const jsonData = JSON.parse($(elem).html());
                    if (jsonData.description) {
                        description = jsonData.description;
                    }
                } catch (e) {
                    // Ignore invalid JSON
                }
            });
        }
        
        // Fallback to text content
        if (!description || description.length < 50) {
            if (platform === 'printables') {
                description = $('[class*="description" i], [class*="Description" i]').first().text().trim() || description;
            } else if (platform === 'thingiverse') {
                description = $('.thing-description, .description-text').first().text().trim() || description;
            } else {
                description = $('.description, .product-description').first().text().trim() || description;
            }
        }
        
        console.log(`Title: ${title}`);
        console.log(`Description length: ${description.length} chars`);

        // Extract designer/author name based on platform
        if (platform === 'thingiverse') {
            designerName = $('.creator-name a').text().trim() || 
                          $('a[href*="/thing/"]').first().text().trim() ||
                          $('.thing-owner a').text().trim() || '';
        } else if (platform === 'printables') {
            designerName = $('.user-name').text().trim() || 
                          $('.author-name').text().trim() ||
                          $('a[href*="/user/"]').first().text().trim() || '';
        } else if (platform === 'myminifactory') {
            designerName = $('.designer-name').text().trim() || 
                          $('a[href*="/users/"]').first().text().trim() || '';
        } else if (platform === 'cults3d') {
            designerName = $('.creator-name').text().trim() || 
                          $('a[href*="/profile/"]').first().text().trim() || '';
        } else if (platform === 'thangs') {
            designerName = $('.author-name').text().trim() || 
                          $('a[href*="/user/"]').first().text().trim() || '';
        }

        console.log(`Title before cleanup: ${title}`);
        console.log(`Designer: ${designerName}`);

        // Clean up title - remove "by [designer]" patterns
        if (designerName) {
            // Remove common patterns like "by DesignerName", "- by DesignerName", "| by DesignerName"
            title = title.replace(new RegExp(`\\s*[-|]?\\s*by\\s+${designerName}`, 'gi'), '').trim();
            title = title.replace(/\s*[-|]\s*$/, '').trim(); // Remove trailing dashes
        }
        
        // Also remove generic "by [anything]" patterns that might remain
        title = title.replace(/\s*[-|]?\s*by\s+[^-|]+$/gi, '').trim();
        title = title.replace(/\s*[-|]\s*$/, '').trim();

        console.log(`Title after cleanup: ${title}`);

        // Append designer attribution to END of description
        if (designerName) {
            description = `${description}\n\n---\nOriginal design by ${designerName} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}.\nImported from: ${url}`;
        } else {
            description = `${description}\n\n---\nImported from ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`;
        }

        console.log(`Description includes attribution`);

        // Primary: Get Open Graph image (most reliable for SPAs)
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
            // For Printables, get full resolution from OG image
            let fullOgImage = ogImage;
            if (platform === 'printables') {
                fullOgImage = ogImage.replace(/\/thumbnails\//, '/images/')
                                    .replace(/\/thumb\//, '/images/')
                                    .replace(/_\d+x\d+(\.(jpg|jpeg|png|webp))/, '$1');
            }
            imageUrls.add(fullOgImage);
            console.log(`OG Image: ${fullOgImage}`);
        }
        
        // Try to find images in JSON-LD structured data
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const jsonData = JSON.parse($(elem).html());
                if (jsonData.image) {
                    const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
                    images.forEach(img => {
                        const imgUrl = typeof img === 'string' ? img : img.url;
                        if (imgUrl && imgUrl.startsWith('http')) {
                            imageUrls.add(imgUrl);
                            console.log(`JSON-LD image: ${imgUrl}`);
                        }
                    });
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        });
        
        // Secondary: Collect from main content (exclude sidebars/recommendations)
        $('img').each((i, elem) => {
            const $elem = $(elem);
            const src = $elem.attr('src') || $elem.attr('data-src') || $elem.attr('data-lazy-src');
            
            if (!src || !src.startsWith('http')) return;
            
            // Check if in excluded section
            let parentClasses = '';
            $elem.parents().each((_, parent) => {
                const cls = $(parent).attr('class') || '';
                const id = $(parent).attr('id') || '';
                parentClasses += ' ' + cls + ' ' + id;
            });
            parentClasses = parentClasses.toLowerCase();
            
            const excludeKeywords = ['related', 'recommendation', 'similar', 'other', 'sidebar', 
                                    'footer', 'header', 'nav', 'menu', 'ad', 'user-card', 'creator'];
            
            const isExcluded = excludeKeywords.some(kw => parentClasses.includes(kw));
            const isIcon = src.includes('/icon') || src.includes('/logo') || src.includes('/avatar') || 
                          src.includes('/ui/') || src.includes('/badge');
            
            if (!isExcluded && !isIcon && imageUrls.size < 15) {
                let finalSrc = src;
                if (platform === 'printables') {
                    finalSrc = src.replace(/\/thumbnails\//, '/images/')
                                 .replace(/\/thumb\//, '/images/')
                                 .replace(/_\d+x\d+(\.(jpg|jpeg|png|webp))/, '$1');
                }
                imageUrls.add(finalSrc);
            }
        });

        console.log(`Found ${imageUrls.size} potential image URLs`);

        // Collect file download links
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                const text = $(elem).text().toLowerCase();
                const hasDownloadText = text.includes('download') || text.includes('files');
                const hasFileExtension = /\.(stl|obj|3mf|zip|ply)(\?|$)/i.test(href);
                const hasDownloadPath = href.includes('/download') || href.includes('/files');
                
                if (hasDownloadText || hasFileExtension || hasDownloadPath) {
                    const fullUrl = href.startsWith('http') ? href : 
                                   href.startsWith('/') ? new URL(url).origin + href : null;
                    if (fullUrl) {
                        fileUrls.add(fullUrl);
                    }
                }
            }
        });

        console.log(`Found ${fileUrls.size} potential file URLs`);

        // Convert sets to arrays
        const imageUrlArray = Array.from(imageUrls);
        const fileUrlArray = Array.from(fileUrls);

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
                    
                    console.log(`  Size: ${blob.size} bytes, Type: ${imgResponse.headers.get('content-type')}`);
                    
                    // Only process if it's a reasonable size
                    if (blob.size > 5000) { // At least 5KB
                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                        const ext = contentType.split('/')[1] || 'jpg';
                        const filename = `image_${i + 1}.${ext}`;
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

        // Download and upload 3D files (up to 10)
        const uploadedFiles = [];
        const fileLimit = Math.min(fileUrlArray.length, 10);
        
        for (let i = 0; i < fileLimit; i++) {
            const fileUrl = fileUrlArray[i];
            try {
                console.log(`[${i + 1}/${fileLimit}] Downloading file: ${fileUrl}`);
                
                const fileResponse = await fetch(fileUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/octet-stream, application/zip, model/stl, */*',
                        'Referer': url
                    },
                    redirect: 'follow'
                });
                
                if (fileResponse.ok) {
                    const arrayBuffer = await fileResponse.arrayBuffer();
                    const blob = new Blob([arrayBuffer]);
                    
                    console.log(`  Size: ${blob.size} bytes`);
                    
                    // Only process if file is reasonable size (> 1KB)
                    if (blob.size > 1000) {
                        let filename = 'model.stl';
                        
                        // Try to get filename from Content-Disposition header
                        const contentDisposition = fileResponse.headers.get('content-disposition');
                        if (contentDisposition) {
                            const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                            if (matches && matches[1]) {
                                filename = matches[1].replace(/['"]/g, '').trim();
                            }
                        }
                        
                        // Fallback: extract from URL
                        if (filename === 'model.stl') {
                            const urlParts = fileUrl.split('/');
                            const lastPart = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
                            if (lastPart && lastPart.match(/\.(stl|obj|3mf|ply|zip)$/i)) {
                                filename = lastPart;
                            } else {
                                filename = `model_${i + 1}.stl`;
                            }
                        }
                        
                        const file = new File([blob], filename, { 
                            type: 'application/octet-stream' 
                        });
                        
                        const uploadResult = await base44.integrations.Core.UploadFile({ file });
                        uploadedFiles.push(uploadResult.file_url);
                        console.log(`  ✓ Uploaded successfully: ${filename}`);
                    } else {
                        console.log(`  ✗ Skipped (too small)`);
                    }
                } else {
                    console.log(`  ✗ Failed to fetch (${fileResponse.status})`);
                }
            } catch (error) {
                console.log(`  ✗ Error: ${error.message}`);
            }
        }

        console.log(`Successfully uploaded ${uploadedFiles.length} files`);

        return Response.json({
            success: true,
            data: {
                platform,
                title: title || 'Untitled Design',
                description: description || 'No description available',
                images: uploadedImages,
                print_files: uploadedFiles,
                stats: {
                    images_found: imageUrlArray.length,
                    images_uploaded: uploadedImages.length,
                    files_found: fileUrlArray.length,
                    files_uploaded: uploadedFiles.length
                }
            }
        });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ 
            error: error.message || 'Failed to import from platform',
            details: error.stack
        }, { status: 500 });
    }
});