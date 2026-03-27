/**
 * MCP Demo — Shopify Product Search Worker
 * Simplified — no KV cache/rate limiting to isolate rendering issue
 */

const ALLOWED_ORIGIN = 'https://mcpdemo.com';

const SYSTEM_PROMPT = `You are a Shopify product search tool. When given any product query, you MUST immediately call productsearch_search_products — do not ask clarifying questions, do not respond conversationally. Just search.

After getting results, return ONLY a JSON object — no other text, no markdown, no explanation:

{
  "summary": "Found X products matching your search",
  "products": [
    {
      "title": "Product Name",
      "price": "$XX.XX",
      "rating": "4.4/5 (449 reviews)",
      "seller": "Seller Name",
      "description": "One sentence description",
      "image": "https://cdn.shopify.com/...",
      "url": "https://www.seller.com/products/..."
    }
  ]
}

Rules:
- Always search immediately — never ask for more information
- Maximum 4 products
- Price is in cents — divide by 100 and format as $XX.XX
- Use first variant's variantUrl as the url field
- Use first media item's url as the image field
- Omit image field if unavailable
- Never include checkoutUrl
- If no results: { "summary": "No products found.", "products": [] }`;

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, origin); }

    const query = (body.query || '').trim();
    if (!query) return json({ error: 'Missing query' }, 400, origin);

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500, origin);
    if (!env.MCPCIO_TOKEN)      return json({ error: 'MCPCIO_TOKEN not set' }, 500, origin);

    let apiResp, apiRespText;
    try {
      apiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta':    'mcp-client-2025-04-04',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: `Search for: ${query}` }],
          mcp_servers: [{
            type:                'url',
            url:                 'https://api.mcpcio.com/mcp',
            name:                'mcpcio',
            authorization_token: env.MCPCIO_TOKEN,
            tool_configuration: {
              enabled: true,
              allowed_tools: [
                'productsearch_search_products',
                'productsearch_get_product_details',
                'productsearch_compare_offers'
              ]
            }
          }]
        })
      });
      apiRespText = await apiResp.text();
    } catch (err) {
      return json({ error: 'Fetch failed', detail: err.message }, 502, origin);
    }

    let data;
    try { data = JSON.parse(apiRespText); }
    catch { return json({ error: 'Non-JSON from Anthropic', raw: apiRespText.slice(0, 300) }, 502, origin); }

    if (!apiResp.ok) {
      return json({ error: data?.error?.message || 'API error', code: data?.error?.type, status: apiResp.status }, apiResp.status, origin);
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, products: [] };
    } catch {
      result = { summary: text, products: [] };
    }

    return json({ result, source: 'live', sponsored: true });
  }
};
