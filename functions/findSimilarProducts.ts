import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Cosine similarity function
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, productId, limit = 8 } = await req.json();

    let queryEmbedding;

    if (productId) {
      // Find similar products to a specific product
      const product = await base44.entities.Product.get(productId);
      queryEmbedding = product.embedding;
    } else if (query) {
      // Generate embedding for search query
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query
        })
      });

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate query embedding');
      }

      const embeddingData = await embeddingResponse.json();
      queryEmbedding = embeddingData.data[0].embedding;
    } else {
      return Response.json({ error: 'Either query or productId required' }, { status: 400 });
    }

    if (!queryEmbedding) {
      return Response.json({ error: 'No embedding available' }, { status: 400 });
    }

    // Get all active products with embeddings
    const allProducts = await base44.entities.Product.filter({ status: 'active' });
    const productsWithEmbeddings = allProducts.filter(p => p.embedding && (!productId || p.id !== productId));

    // Calculate similarity scores
    const productsWithScores = productsWithEmbeddings.map(product => ({
      ...product,
      similarity: cosineSimilarity(queryEmbedding, product.embedding)
    }));

    // Sort by similarity and return top results
    const sortedProducts = productsWithScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return Response.json({ 
      products: sortedProducts,
      count: sortedProducts.length
    });

  } catch (error) {
    console.error('Error finding similar products:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});