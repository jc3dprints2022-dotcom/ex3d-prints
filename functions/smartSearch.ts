import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ products: [] });
    }

    // Get all active products
    const allProducts = await base44.asServiceRole.entities.Product.filter({ status: 'active' });

    // Use AI to find relevant products
    const productDescriptions = allProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      tags: p.tags || []
    }));

    const prompt = `Given this search query: "${query}"
    
Find the most relevant products from this list. Consider:
- Spelling variations and typos (e.g., "tabel" should match "table")
- Related terms and synonyms (e.g., "cup" should match "mug", "holder")
- Partial matches and similar concepts

Product list:
${JSON.stringify(productDescriptions, null, 2)}

Return ONLY a JSON array of product IDs in order of relevance (most relevant first). Maximum 20 products.
Include products that are conceptually similar even if they don't match exactly.
Example: ["id1", "id2", "id3"]`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    const relevantIds = aiResponse.product_ids || [];
    const relevantProducts = relevantIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(p => p !== undefined);

    return Response.json({ products: relevantProducts });
  } catch (error) {
    console.error('Smart search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});