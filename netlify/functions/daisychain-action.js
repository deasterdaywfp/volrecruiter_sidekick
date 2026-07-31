// Netlify Function: post recommendation/call result to Daisychain.
// Keeps DAISYCHAIN_API_TOKEN server-side.

const DAISYCHAIN_BASE_URL = process.env.DAISYCHAIN_BASE_URL || 'https://go.daisychain.app';

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Use POST.' });
    }

    const token = process.env.DAISYCHAIN_API_TOKEN;
    if (!token) {
      return json(500, { error: 'Missing DAISYCHAIN_API_TOKEN environment variable.' });
    }

    const payload = event.body ? JSON.parse(event.body) : {};
    if (!payload.email_address && !payload.phone_number) {
      return json(400, { error: 'Provide email_address or phone_number.' });
    }
    if (!payload.action_data) {
      return json(400, { error: 'Missing action_data.' });
    }

    const dcResponse = await fetch(`${DAISYCHAIN_BASE_URL}/api/v1/actions`, {
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
    return json(500, { error: error.message || 'Unknown Daisychain action error.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}
