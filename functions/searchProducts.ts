import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import algoliasearch from 'npm:algoliasearch@5.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, filters, page = 0, hitsPerPage = 20 } = await req.json();

    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const apiKey = Deno.env.get('ALGOLIA_API_KEY');
    const indexName = Deno.env.get('ALGOLIA_INDEX_NAME');

    if (!appId || !apiKey || !indexName) {
      return Response.json({ 
        error: 'Algolia not configured',
        fallback: true
      }, { status: 500 });
    }

    const client = algoliasearch(appId, apiKey);

    // Build filter string
    let filterString = '';
    if (filters) {
      const filterParts = [];
      
      if (filters.category) {
        filterParts.push(`category:"${filters.category}"`);
      }
      if (filters.materials && filters.materials.length > 0) {
        const materialFilters = filters.materials.map(m => `materials:"${m}"`).join(' OR ');
        filterParts.push(`(${materialFilters})`);
      }
      if (filters.colors && filters.colors.length > 0) {
        const colorFilters = filters.colors.map(c => `colors:"${c}"`).join(' OR ');
        filterParts.push(`(${colorFilters})`);
      }
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const min = filters.minPrice || 0;
        const max = filters.maxPrice || 9999;
        filterParts.push(`price:${min} TO ${max}`);
      }
      
      filterString = filterParts.join(' AND ');
    }

    // Search Algolia
    const searchParams = {
      query: query || '',
      page: page,
      hitsPerPage: hitsPerPage
    };

    if (filterString) {
      searchParams.filters = filterString;
    }

    const results = await client.search({
      requests: [
        {
          indexName: indexName,
          ...searchParams
        }
      ]
    });

    const hits = results.results[0].hits || [];
    
    // Get full product data from database
    const productIds = hits.map(hit => hit.objectID);
    const products = await Promise.all(
      productIds.map(id => base44.entities.Product.get(id).catch(() => null))
    );

    return Response.json({
      success: true,
      products: products.filter(p => p !== null),
      totalHits: results.results[0].nbHits,
      totalPages: results.results[0].nbPages,
      page: results.results[0].page
    });

  } catch (error) {
    console.error('Algolia search error:', error);
    return Response.json({
      error: 'Search failed',
      details: error.message,
      fallback: true
    }, { status: 500 });
  }
});