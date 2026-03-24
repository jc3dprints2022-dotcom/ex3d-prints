import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TEST_EMAIL = 'jc3dprints2022@gmail.com';

async function getShippoKey(userEmail, base44) {
  if (userEmail === TEST_EMAIL) {
    return Deno.env.get('SHIPPO_TEST_API_KEY');
  }
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (admins[0]?.shipping_api_mode === 'test') {
      return Deno.env.get('SHIPPO_TEST_API_KEY');
    }
  } catch (_) {}
  return Deno.env.get('SHIPPO_API_KEY');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streetAddress, city, state, ZIPCode, name } = await req.json();

    if (!streetAddress || !state) {
      return Response.json({ error: 'streetAddress and state are required' }, { status: 400 });
    }

    const apiKey = await getShippoKey(user.email, base44);
    if (!apiKey) return Response.json({ error: 'Shippo API key not configured' }, { status: 500 });

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