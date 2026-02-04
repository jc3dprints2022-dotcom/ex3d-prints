import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.designer_id) {
      return Response.json({ error: 'Unauthorized or not a designer' }, { status: 401 });
    }

    const { profileUrl, platform } = await req.json();

    if (!profileUrl || !platform) {
      return Response.json({ error: 'Missing profileUrl or platform' }, { status: 400 });
    }

    // Use LLM to scrape and extract design data
    const prompt = `
You are a design import assistant. Access the ${platform} profile at: ${profileUrl}

IMPORTANT: You have web browsing capabilities. Visit the URL and extract design information.

For EACH design found on the profile page, extract:
- name: Design name/title
- description: Full description (if available, otherwise use name)
- images: Array of image URLs from the design thumbnails
- category: Best matching category from: kit_cards, rocket_models, halloween, dorm_essentials, desk, art, gadgets, toys_and_games, thanksgiving, christmas, valentines_day, misc
- tags: Array of relevant tags based on design name/category
- dimensions: Object with length, width, height in mm (estimate 100x100x50 if not available)
- materials: Array ["PLA"] as default
- colors: Array ["Black", "White"] as default

If the profile has multiple pages of designs, try to get as many as possible (at least 10-20).

Return your response as a JSON object with:
{
  "success": true,
  "designs": [array of design objects],
  "error": null
}

If you cannot access the page or find designs, return:
{
  "success": false,
  "designs": [],
  "error": "Specific error message explaining what went wrong"
}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          designs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                images: { type: "array", items: { type: "string" } },
                category: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                dimensions: {
                  type: "object",
                  properties: {
                    length: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" }
                  }
                },
                materials: { type: "array", items: { type: "string" } },
                colors: { type: "array", items: { type: "string" } }
              }
            }
          },
          error: { type: "string" }
        }
      }
    });

    if (!response.success || !response.designs || response.designs.length === 0) {
      const errorMsg = response.error || 'No designs found or unable to access the profile. The profile may be private, the URL may be incorrect, or there may be no public designs.';
      return Response.json({ 
        error: errorMsg,
        imported: 0,
        success: false
      });
    }

    // Create product entries for each design
    const importedProducts = [];
    for (const design of response.designs) {
      try {
        const productData = {
          name: design.name,
          description: design.description || 'Imported design',
          designer_id: user.designer_id,
          designer_name: user.designer_name || user.full_name,
          category: design.category || 'misc',
          images: design.images || [],
          tags: design.tags || [],
          dimensions: design.dimensions || { length: 100, width: 100, height: 50 },
          materials: design.materials || ['PLA'],
          colors: design.colors || ['Black', 'White'],
          status: 'pending',
          price: 0, // Designer needs to set pricing
          print_time_hours: 0, // Designer needs to set
          weight_grams: 0, // Designer needs to set
          print_files: [] // Designer needs to upload files
        };

        const product = await base44.asServiceRole.entities.Product.create(productData);
        importedProducts.push(product);
      } catch (error) {
        console.error('Failed to import design:', design.name, error);
      }
    }

    return Response.json({ 
      success: true,
      imported: importedProducts.length,
      total: response.designs.length,
      products: importedProducts
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});