import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { productId } = await req.json();

    // Get the product
    const product = await base44.entities.Product.get(productId);

    // Create embedding text from product details
    const embeddingText = `${product.name}. ${product.description}. Category: ${product.category}. Tags: ${product.tags?.join(', ') || ''}`;

    // Generate embedding using LLM
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: embeddingText
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Store embedding on product
    await base44.asServiceRole.entities.Product.update(productId, {
      embedding: embedding
    });

    return Response.json({ 
      success: true, 
      productId,
      embeddingLength: embedding.length 
    });

  } catch (error) {
    console.error('Error generating embedding:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});