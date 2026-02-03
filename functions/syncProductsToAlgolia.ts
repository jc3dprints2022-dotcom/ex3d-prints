import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import algoliasearch from 'npm:algoliasearch@5.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const apiKey = Deno.env.get('ALGOLIA_API_KEY');
    const indexName = Deno.env.get('ALGOLIA_INDEX_NAME');

    if (!appId || !apiKey || !indexName) {
      return Response.json({ 
        error: 'Algolia credentials not configured',
        details: 'Please set ALGOLIA_APP_ID, ALGOLIA_API_KEY, and ALGOLIA_INDEX_NAME in settings'
      }, { status: 500 });
    }

    const client = algoliasearch(appId, apiKey);

    // Get all active products
    const products = await base44.asServiceRole.entities.Product.filter({ status: 'active' });

    // Transform products for Algolia
    const algoliaRecords = products.map(product => ({
      objectID: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      designer_name: product.designer_name,
      tags: product.tags || [],
      materials: product.materials || [],
      colors: product.colors || [],
      rating: product.rating || 0,
      review_count: product.review_count || 0,
      view_count: product.view_count || 0,
      sales_count: product.sales_count || 0,
      images: product.images || [],
      created_date: product.created_date,
      is_boosted: product.is_boosted || false
    }));

    // Save to Algolia
    await client.saveObjects({
      indexName: indexName,
      objects: algoliaRecords
    });

    // Configure search settings
    await client.setSettings({
      indexName: indexName,
      indexSettings: {
        searchableAttributes: [
          'name',
          'description',
          'tags',
          'category',
          'designer_name',
          'materials'
        ],
        attributesForFaceting: [
          'category',
          'materials',
          'colors',
          'price'
        ],
        customRanking: [
          'desc(is_boosted)',
          'desc(sales_count)',
          'desc(rating)',
          'desc(view_count)'
        ],
        replicas: [
          `${indexName}_price_asc`,
          `${indexName}_price_desc`,
          `${indexName}_rating_desc`
        ]
      }
    });

    return Response.json({
      success: true,
      message: `Successfully synced ${algoliaRecords.length} products to Algolia`,
      count: algoliaRecords.length
    });

  } catch (error) {
    console.error('Algolia sync error:', error);
    return Response.json({
      error: 'Failed to sync products',
      details: error.message
    }, { status: 500 });
  }
});