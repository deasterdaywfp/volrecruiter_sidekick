// Netlify Function: Daisychain person lookup proxy.
// Keeps DAISYCHAIN_API_TOKEN server-side.

const DAISYCHAIN_BASE_URL = process.env.DAISYCHAIN_BASE_URL || 'https://go.daisychain.app';

exports.handler = async function(event) {
  try {
    const token = process.env.DAISYCHAIN_API_TOKEN;
    if (!token) {
      return json(500, { error: 'Missing DAISYCHAIN_API_TOKEN environment variable.' });
    }

    const params = event.queryStringParameters || {};
    const email = params.email_address || params.email;
    const phone = params.phone_number || params.phone;

    if (!email && !phone) {
      return json(400, { error: 'Provide email_address or phone_number.' });
    }

    const payload = {};
    if (email) payload.email_address = email;
    if (phone) payload.phone_number = phone;

    const dcResponse = await fetch(`${DAISYCHAIN_BASE_URL}/api/v1/people/match`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Token': token
      },
      body: JSON.stringify(payload)
    });

    const body = await dcResponse.text();
    return {
      statusCode: dcResponse.status,
      headers: { 'content-type': 'application/json' },
      body
    };
  } catch (error) {
    return json(500, { error: error.message || 'Unknown Daisychain lookup error.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}
