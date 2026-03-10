import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streetAddress, city, state, ZIPCode, name } = await req.json();

    if (!streetAddress || !state) {
      return Response.json({ error: 'streetAddress and state are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SHIPPO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SHIPPO_API_KEY not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.goshippo.com/addresses/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name || 'Recipient',
        street1: streetAddress,
        city: city || '',
        state,
        zip: ZIPCode || '',
        country: 'US',
        validate: true
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ valid: false, error: JSON.stringify(data) });
    }

    const validation = data.validation_results;
    const isValid = validation?.is_valid === true;

    return Response.json({
      valid: isValid,
      address: {
        streetAddress: data.street1,
        city: data.city,
        state: data.state,
        ZIPCode: data.zip
      },
      messages: validation?.messages || []
    });

  } catch (error) {
    console.error('Address validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});