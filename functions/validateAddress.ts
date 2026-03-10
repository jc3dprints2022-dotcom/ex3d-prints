import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const USPS_TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token';
const USPS_ADDRESS_URL = 'https://apis.usps.com/addresses/v3/address';

async function getUSPSToken(clientId, clientSecret, scope) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope
  });

  const res = await fetch(USPS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`USPS auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streetAddress, city, state, ZIPCode, secondaryAddress } = await req.json();

    if (!streetAddress || !state) {
      return Response.json({ error: 'streetAddress and state are required' }, { status: 400 });
    }

    const clientId = Deno.env.get('USPS_CLIENT_ID');
    const clientSecret = Deno.env.get('USPS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'USPS API credentials not configured' }, { status: 500 });
    }

    const token = await getUSPSToken(clientId, clientSecret, 'addresses');

    const params = new URLSearchParams({ streetAddress, state });
    if (city) params.append('city', city);
    if (ZIPCode) params.append('ZIPCode', ZIPCode);
    if (secondaryAddress) params.append('secondaryAddress', secondaryAddress);

    const res = await fetch(`${USPS_ADDRESS_URL}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({
        valid: false,
        error: data.error?.message || 'Address validation failed',
        details: data.error?.errors || []
      });
    }

    return Response.json({
      valid: true,
      address: {
        streetAddress: data.address?.streetAddress,
        secondaryAddress: data.address?.secondaryAddress,
        city: data.address?.city,
        state: data.address?.state,
        ZIPCode: data.address?.ZIPCode,
        ZIPPlus4: data.address?.ZIPPlus4
      },
      additionalInfo: data.additionalInfo,
      corrections: data.corrections,
      warnings: data.warnings
    });

  } catch (error) {
    console.error('Address validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});