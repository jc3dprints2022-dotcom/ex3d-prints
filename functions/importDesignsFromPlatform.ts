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
You are a design import assistant. Extract all designs from this ${platform} profile: ${profileUrl}

For EACH design found, return a JSON object with:
- name: Design name
- description: Full description
- images: Array of image URLs (find all product images)
- category: Best matching category from: kit_cards, rocket_models, halloween, dorm_essentials, desk, art, gadgets, toys_and_games, thanksgiving, christmas, valentines_day, misc
- tags: Array of relevant tags
- dimensions: Object with length, width, height in mm (estimate if not provided)
- materials: Array of compatible materials from: PLA, ABS, PETG, TPU
- colors: Array of available colors

Return as a JSON array of design objects. If you cannot access the page, return an error message.
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
      return Response.json({ 
        error: response.error || `Unable to access the ${platform} profile at ${profileUrl}. Please check the URL or the profile's visibility settings.`,
        imported: 0 
      }, { status: 400 });
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