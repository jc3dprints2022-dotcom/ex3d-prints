import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import algoliasearch from 'npm:algoliasearch@5.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { productId, maxRecommendations = 8 } = await req.json();

    if (!productId) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const apiKey = Deno.env.get('ALGOLIA_API_KEY');
    const indexName = Deno.env.get('ALGOLIA_INDEX_NAME');

    if (!appId || !apiKey || !indexName) {
      // Fallback to basic recommendations
      const product = await base44.entities.Product.get(productId);
      const allProducts = await base44.entities.Product.filter({ 
        status: 'active',
        category: product.category 
      });
      
      const recommendations = allProducts
        .filter(p => p.id !== productId)
        .slice(0, maxRecommendations);
      
      return Response.json({
        success: true,
        recommendations: recommendations,
        fallback: true
      });
    }

    const client = algoliasearch(appId, apiKey);

    // Get the source product
    const product = await base44.entities.Product.get(productId);

    // Use Algolia's similar search
    const results = await client.search({
      requests: [
        {
          indexName: indexName,
          query: product.name,
          filters: `NOT objectID:"${productId}"`,
          hitsPerPage: maxRecommendations,
          similarQuery: product.description
        }
      ]
    });

    const hits = results.results[0].hits || [];
    
    // Get full product data
    const productIds = hits.map(hit => hit.objectID);
    const recommendations = await Promise.all(
      productIds.map(id => base44.entities.Product.get(id).catch(() => null))
    );

    return Response.json({
      success: true,
      recommendations: recommendations.filter(p => p !== null),
      sourceProduct: {
        id: product.id,
        name: product.name,
        category: product.category
      }
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({
      error: 'Failed to get recommendations',
      details: error.message
    }, { status: 500 });
  }
});