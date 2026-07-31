// Netlify Function: Mobilize event proxy.
// Set MOBILIZE_ORG_ID in Netlify environment variables.

exports.handler = async function(event) {
  try {
    const orgId = process.env.MOBILIZE_ORG_ID;
    if (!orgId) {
      return json(500, { error: 'Missing MOBILIZE_ORG_ID environment variable.' });
    }

    const incoming = event.queryStringParameters || {};
    const multi = event.multiValueQueryStringParameters || {};
    const mobilize = new URL(`https://api.mobilize.us/v1/organizations/${orgId}/events`);

    const allowedParams = [
      'zipcode',
      'max_dist',
      'state',
      'is_virtual',
      'high_priority_only',
      'event_types',
      'timeslot_start',
      'exclude_full',
      'per_page',
      'cursor'
    ];

    for (const param of allowedParams) {
      const values = multi[param] || (incoming[param] ? [incoming[param]] : []);
      values.forEach(value => mobilize.searchParams.append(param, value));
    }

    if (!mobilize.searchParams.has('per_page')) mobilize.searchParams.set('per_page', '100');
    if (!mobilize.searchParams.has('exclude_full')) mobilize.searchParams.set('exclude_full', 'true');

    const mobilizeResponse = await fetch(mobilize.toString(), {
      headers: { accept: 'application/json' }
    });

    const body = await mobilizeResponse.text();
    return {
      statusCode: mobilizeResponse.status,
      headers: { 'content-type': 'application/json' },
      body
    };
  } catch (error) {
    return json(500, { error: error.message || 'Unknown Mobilize proxy error.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}
