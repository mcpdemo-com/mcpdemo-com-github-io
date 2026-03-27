/**
 * MCP Demo — Shopify Product Search Worker v2
 */

const DAILY_LIMIT    = 500;
const PER_IP_LIMIT   = 5;
const CACHE_TTL      = 604800;
const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const CACHE_VER      = 'v2:'; // prefix bump busts all stale KV entries

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

function hashQuery(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

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

    const debug     = body.debug === true;
    const normQuery = query.toLowerCase().replace(/\s+/g, ' ');
    const cacheKey  = CACHE_VER + hashQuery(normQuery); // v2 prefix busts old entries
    const dateStr   = today();
    const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
    const dailyKey  = `daily:${dateStr}`;
    const ipKey     = `ip:${ip}:${dateStr}`;

    if (!debug) {
      // Check cache
      let cached = null;
      try { cached = await env.MCP_CACHE.get(cacheKey); } catch {}
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only serve cache if it has actual products
        if (parsed.products && parsed.products.length > 0) {
          return json({ result: parsed, source: 'cache', sponsored: true });
        }
      }

      // Rate limits
      const dailyCount = parseInt(await env.MCP_LIMITS.get(dailyKey).catch(() => '0') || '0');
      if (dailyCount >= DAILY_LIMIT) {
        return json({ result: null, source: 'quota', sponsored: true, message: `Today's ${DAILY_LIMIT} free demos have been used. Powered by mcpcio.com — check back tomorrow!` });
      }
      const ipCount = parseInt(await env.MCP_LIMITS.get(ipKey).catch(() => '0') || '0');
      if (ipCount >= PER_IP_LIMIT) {
        return json({ result: null, source: 'ratelimit', sponsored: true, message: `You've used your ${PER_IP_LIMIT} free demos for today. Powered by mcpcio.com — come back tomorrow!` });
      }
    }

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

    // Only cache responses that have actual products
    if (!debug && result.products && result.products.length > 0) {
      try {
        const dc = parseInt(await env.MCP_LIMITS.get(dailyKey).catch(() => '0') || '0');
        const ic = parseInt(await env.MCP_LIMITS.get(ipKey).catch(() => '0') || '0');
        await env.MCP_LIMITS.put(dailyKey, String(dc + 1), { expirationTtl: 86400 });
        await env.MCP_LIMITS.put(ipKey,    String(ic + 1), { expirationTtl: 86400 });
        await env.MCP_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL });
      } catch {}
    }

    return json({ result, source: debug ? 'debug' : 'live', sponsored: true });
  }
};
