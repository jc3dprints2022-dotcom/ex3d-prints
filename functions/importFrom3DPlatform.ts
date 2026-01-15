import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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

        // Detect platform and type (single model or collection/wishlist)
        let platform = 'unknown';
        let isCollection = false;
        
        if (url.includes('thingiverse.com')) {
            platform = 'thingiverse';
            isCollection = url.includes('/collections/') || url.includes('/list/');
        } else if (url.includes('printables.com')) {
            platform = 'printables';
            isCollection = url.includes('/collection/') || (url.includes('/@') && url.includes('/collections'));
        } else if (url.includes('myminifactory.com')) {
            platform = 'myminifactory';
            isCollection = url.includes('/collection/');
        } else if (url.includes('cults3d.com')) {
            platform = 'cults3d';
        } else if (url.includes('thangs.com')) {
            platform = 'thangs';
        }

        if (platform === 'unknown') {
            return Response.json({ 
                error: 'Unsupported platform. Supported: Thingiverse, Printables, MyMiniFactory, Cults3D, Thangs' 
            }, { status: 400 });
        }

        // If it's a collection/wishlist, extract all model URLs and import each
        if (isCollection) {
            console.log(`Importing collection from ${platform}: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            if (!response.ok) {
                return Response.json({ error: `Failed to fetch collection. Status: ${response.status}` }, { status: 400 });
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const modelUrls = new Set();

            // Extract model URLs based on platform
            if (platform === 'printables') {
                $('a[href*="/model/"]').each((i, elem) => {
                    const href = $(elem).attr('href');
                    if (href && href.includes('/model/') && !href.includes('/collection/')) {
                        const fullUrl = href.startsWith('http') ? href : `https://www.printables.com${href.split('?')[0]}`;
                        modelUrls.add(fullUrl);
                    }
                });
            } else if (platform === 'thingiverse') {
                $('a[href*="/thing:"]').each((i, elem) => {
                    const href = $(elem).attr('href');
                    if (href && href.includes('/thing:')) {
                        const fullUrl = href.startsWith('http') ? href : `https://www.thingiverse.com${href.split('?')[0]}`;
                        modelUrls.add(fullUrl);
                    }
                });
            }

            console.log(`Found ${modelUrls.size} models in collection`);

            // Import each model
            const results = [];
            for (const modelUrl of Array.from(modelUrls).slice(0, 20)) { // Limit to 20
                try {
                    console.log(`Importing: ${modelUrl}`);
                    const modelResult = await importSingleModel(base44, user, modelUrl, platform);
                    results.push(modelResult);
                } catch (error) {
                    console.error(`Failed to import ${modelUrl}:`, error.message);
                    results.push({ success: false, error: error.message, url: modelUrl });
                }
            }

            return Response.json({
                success: true,
                collection: true,
                data: results,
                stats: {
                    total_models: modelUrls.size,
                    imported: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                }
            });
        }

        // Single model import
        console.log(`Importing single model from ${platform}: ${url}`);
        const result = await importSingleModel(base44, user, url, platform);
        return Response.json({ success: true, data: result });

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ 
            error: error.message || 'Failed to import from platform',
            details: error.stack
        }, { status: 500 });
    }
});

async function importSingleModel(base44, user, url, platform) {
    // Fetch the page
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = '';
    let description = '';
    let designerName = '';
    let imageUrls = new Set();
    let fileUrls = new Set();

    // Get title (prioritize meta tags)
    title = $('meta[property="og:title"]').attr('content') ||
           $('h1').first().text().trim() || 
           $('title').text().trim() || '';

    // Get description (prioritize meta tags)
    description = $('meta[property="og:description"]').attr('content') || 
                 $('meta[name="description"]').attr('content') || '';
    
    // Try JSON-LD structured data
    if (!description || description.length < 50) {
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const jsonData = JSON.parse($(elem).html());
                if (jsonData.description) description = jsonData.description;
            } catch (e) {}
        });
    }
    
    console.log(`Title: ${title}`);
    console.log(`Description length: ${description.length} chars`);

    // Extract designer name
    if (platform === 'printables') {
        designerName = $('a[href*="/@"]').first().text().trim();
    } else if (platform === 'thingiverse') {
        designerName = $('.creator-name a').text().trim();
    }

    // Clean title
    if (designerName) {
        title = title.replace(new RegExp(`\\s*[-|]?\\s*by\\s+${designerName}`, 'gi'), '').trim();
    }
    title = title.replace(/\s*[-|]?\s*by\s+[^-|]+$/gi, '').trim();

    // Add attribution
    if (designerName) {
        description = `${description}\n\n---\nOriginal design by ${designerName} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}.\nImported from: ${url}`;
    } else {
        description = `${description}\n\n---\nImported from ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`;
    }

    // Get Open Graph image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.startsWith('http')) {
        let fullOgImage = ogImage;
        if (platform === 'printables') {
            fullOgImage = ogImage.replace(/\/thumbnails\//, '/images/')
                                .replace(/\/thumb\//, '/images/')
                                .replace(/_\d+x\d+(\.(jpg|jpeg|png|webp))/, '$1');
        }
        imageUrls.add(fullOgImage);
        console.log(`OG Image: ${fullOgImage}`);
    }
    
    // Get images from JSON-LD
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
        } catch (e) {}
    });
    
    // Collect from page (exclude sidebars/recommendations)
    $('img').each((i, elem) => {
        const $elem = $(elem);
        const src = $elem.attr('src') || $elem.attr('data-src') || $elem.attr('data-lazy-src');
        
        if (!src || !src.startsWith('http')) return;
        
        let parentClasses = '';
        $elem.parents().each((_, parent) => {
            parentClasses += ' ' + ($(parent).attr('class') || '') + ' ' + ($(parent).attr('id') || '');
        });
        parentClasses = parentClasses.toLowerCase();
        
        const excludeKeywords = ['related', 'recommendation', 'similar', 'other', 'sidebar', 
                                'footer', 'header', 'nav', 'menu', 'ad', 'user-card', 'creator'];
        
        const isExcluded = excludeKeywords.some(kw => parentClasses.includes(kw));
        const isIcon = src.includes('/icon') || src.includes('/logo') || src.includes('/avatar') || 
                      src.includes('/ui/') || src.includes('/badge');
        
        if (!isExcluded && !isIcon) {
            let finalSrc = src;
            if (platform === 'printables') {
                finalSrc = src.replace(/\/thumbnails\//, '/images/')
                             .replace(/\/thumb\//, '/images/')
                             .replace(/_\d+x\d+(\.(jpg|jpeg|png|webp))/, '$1');
            }
            imageUrls.add(finalSrc);
        }
    });

    console.log(`Found ${imageUrls.size} images`);

    // Download and upload ALL images (up to 50)
    const uploadedImages = [];
    const imageUrlArray = Array.from(imageUrls);
    const imageLimit = Math.min(imageUrlArray.length, 50);
    
    for (let i = 0; i < imageLimit; i++) {
        const imageUrl = imageUrlArray[i];
        try {
            console.log(`[${i + 1}/${imageLimit}] Downloading: ${imageUrl.substring(0, 60)}...`);
            
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
                
                if (blob.size > 5000) {
                    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                    const ext = contentType.split('/')[1] || 'jpg';
                    const file = new File([blob], `image_${i + 1}.${ext}`, { type: contentType });
                    
                    const uploadResult = await base44.integrations.Core.UploadFile({ file });
                    uploadedImages.push(uploadResult.file_url);
                    console.log(`  ✓ Uploaded (${uploadedImages.length}/${imageLimit})`);
                }
            }
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }

    console.log(`Successfully uploaded ${uploadedImages.length} images`);

    return {
        success: true,
        platform,
        title: title || 'Untitled Design',
        description: description || 'No description available',
        images: uploadedImages,
        print_files: [],
        stats: {
            images_found: imageUrlArray.length,
            images_uploaded: uploadedImages.length
        }
    };
}