/**
 * MCP Demo — Shopify Product Search Worker
 * =========================================
 * Proxies Anthropic API calls for the Shopify demo page.
 * - Holds ANTHROPIC_API_KEY encrypted — never exposed to browser
 * - Calls mcpcio product search MCP tools (search + compare only, no checkout)
 * - Caches responses in KV by query hash (7-day TTL)
 * - Rate limits: 500 live calls/day site-wide, 5/IP/day
 * - Serves cached results when quota is exhausted
 *
 * REQUIRED KV BINDINGS (set in Cloudflare dashboard):
 *   MCP_CACHE   — cached query responses
 *   MCP_LIMITS  — rate limit counters
 *
 * REQUIRED SECRET (set in Cloudflare dashboard → Settings → Variables → Encrypt):
 *   ANTHROPIC_API_KEY — your sk-ant-... key
 *
 * Last updated: 2026-03-26
 */

const DAILY_LIMIT    = 500;
const PER_IP_LIMIT   = 5;
const CACHE_TTL      = 604800;  // 7 days in seconds
const ALLOWED_ORIGIN = 'https://mcpdemo.com';

const SYSTEM_PROMPT = `You are a Shopify product search assistant. You have access to live product search tools via MCP that query millions of real Shopify products.

When a user asks about products:
1. Call productsearch_search_products with their query and any price/filter they mention
2. Return results as a JSON object in this exact format — no other text, just the JSON:

{
  "summary": "One sentence describing what you found",
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
- Maximum 4 products
- Price is in cents in the raw data — divide by 100 and format as $XX.XX
- Use the first variant's variantUrl as the url field
- Use the first media item's url as the image field
- If no image available, omit the image field
- Never include checkoutUrl — product page links only
- If no results found, return { "summary": "No products found for that search.", "products": [] }`;

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

    const normQuery  = query.toLowerCase().replace(/\s+/g, ' ');
    const cacheKey   = `cache:${hashQuery(normQuery)}`;
    const dateStr    = today();
    const ip         = request.headers.get('CF-Connecting-IP') || 'unknown';
    const dailyKey   = `daily:${dateStr}`;
    const ipKey      = `ip:${ip}:${dateStr}`;

    // Check cache first — always serve if available
    let cached = null;
    try { cached = await env.MCP_CACHE.get(cacheKey); } catch {}

    // Check site-wide daily limit
    const dailyCount = parseInt(await env.MCP_LIMITS.get(dailyKey).catch(() => '0') || '0');
    if (dailyCount >= DAILY_LIMIT) {
      if (cached) return json({ result: JSON.parse(cached), source: 'cache', sponsored: true });
      return json({
        result: null,
        source: 'quota',
        sponsored: true,
        message: `Today's ${DAILY_LIMIT} free demos have been used. Powered by mcpcio.com — check back tomorrow!`
      });
    }

    // Check per-IP limit
    const ipCount = parseInt(await env.MCP_LIMITS.get(ipKey).catch(() => '0') || '0');
    if (ipCount >= PER_IP_LIMIT) {
      if (cached) return json({ result: JSON.parse(cached), source: 'cache', sponsored: true });
      return json({
        result: null,
        source: 'ratelimit',
        sponsored: true,
        message: `You've used your ${PER_IP_LIMIT} free demos for today. Powered by mcpcio.com — come back tomorrow!`
      });
    }

    // Make live Anthropic API call with mcpcio MCP server
    let apiResp;
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
          messages:   [{ role: 'user', content: query }],
          mcp_servers: [{
            type: 'url',
            url:  'https://api.mcpcio.com/mcp',
            name: 'mcpcio',
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
    } catch (err) {
      return json({ error: 'Upstream request failed', detail: err.message }, 502, origin);
    }

    const data = await apiResp.json();

    if (!apiResp.ok) {
      return json({ error: data?.error?.message || 'API error', code: data?.error?.type }, apiResp.status, origin);
    }

    // Extract text response
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Parse JSON from Claude's response
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, products: [] };
    } catch {
      result = { summary: text, products: [] };
    }

    // Increment rate limit counters
    try {
      await env.MCP_LIMITS.put(dailyKey, String(dailyCount + 1), { expirationTtl: 86400 });
      await env.MCP_LIMITS.put(ipKey,    String(ipCount + 1),    { expirationTtl: 86400 });
    } catch {}

    // Cache the result
    try {
      await env.MCP_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    } catch {}

    return json({ result, source: 'live', sponsored: true });
  }
};
