/**
 * MCP Demo — Shopify Proxy Worker
 * ================================
 * Cloudflare Worker that proxies Anthropic API calls for the Shopify demo.
 * - Hides the Anthropic API key from the browser
 * - Enforces daily site-wide limit (DAILY_LIMIT) and per-IP limit (PER_IP_LIMIT)
 * - Caches responses in KV so quota-exhausted visitors still see real results
 * - Serves a sponsorship message when quota is fully exhausted with no cache hit
 *
 * SETUP INSTRUCTIONS
 * ------------------
 * 1. Create two KV namespaces in Cloudflare dashboard:
 *      - MCP_CACHE   (stores cached query responses, 7-day TTL)
 *      - MCP_LIMITS  (stores rate limit counters, 24-hour TTL)
 *
 * 2. Create the Worker and bind both KV namespaces:
 *      Variable name: MCP_CACHE  → your cache namespace
 *      Variable name: MCP_LIMITS → your limits namespace
 *
 * 3. Add one Environment Variable (encrypted):
 *      ANTHROPIC_API_KEY = sk-ant-...
 *
 * 4. Add a Worker Route in your mcpdemo.com zone:
 *      Route: api.mcpdemo.com/proxy/shopify*
 *      Worker: this worker
 *
 * 5. Update ALLOWED_ORIGIN below if your domain changes.
 */

const DAILY_LIMIT   = 500;   // Max live API calls per calendar day (site-wide)
const PER_IP_LIMIT  = 5;     // Max live API calls per IP per day
const CACHE_TTL     = 604800; // Cache responses for 7 days (seconds)
const COUNTER_TTL   = 86400;  // Rate limit counters expire after 24 hours

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const MCP_SERVER_URL = 'https://api.mcpcio.com/mcp';
const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages';
const MODEL          = 'claude-haiku-4-5-20251001'; // Cheap + fast for demos

const SYSTEM_PROMPT = `You are a helpful shopping assistant connected to Shopify via MCP. \
When the user asks about products, use the available MCP tools to search for real products \
and return helpful, specific results including product names, prices, and checkout links. \
Format results clearly — product name bold, price and key details on the next line. \
Keep responses concise and scannable. Always include at least 3 products when available.`;

// Simple deterministic hash for cache keys
function hashQuery(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function today() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
}

function corsHeaders(origin) {
  // Only allow requests from mcpdemo.com
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    const query = (body.query || '').trim();
    if (!query) {
      return jsonResponse({ error: 'Missing query' }, 400, origin);
    }

    // Normalise query for cache key (lowercase, collapse whitespace)
    const normQuery = query.toLowerCase().replace(/\s+/g, ' ');
    const cacheKey  = `cache:${hashQuery(normQuery)}`;
    const dateStr   = today();
    const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
    const dailyKey  = `daily:${dateStr}`;
    const ipKey     = `ip:${ip}:${dateStr}`;

    // --- Check KV cache first (always) ---
    const cached = await env.MCP_CACHE.get(cacheKey);

    // --- Check daily site-wide limit ---
    const dailyCount = parseInt(await env.MCP_LIMITS.get(dailyKey) || '0');
    if (dailyCount >= DAILY_LIMIT) {
      if (cached) {
        // Quota hit but we have a cached answer — serve it transparently
        return jsonResponse({ text: cached, source: 'cache', sponsored: true });
      }
      // Quota hit, no cache — serve sponsorship message
      return jsonResponse({
        text: null,
        source: 'quota',
        sponsored: true,
        message:
          `Today's ${DAILY_LIMIT} free demos have been used up. ` +
          `These demos are provided free by mcpcio.com — check back tomorrow, ` +
          `or try a popular search that may be cached below.`,
      });
    }

    // --- Check per-IP limit ---
    const ipCount = parseInt(await env.MCP_LIMITS.get(ipKey) || '0');
    if (ipCount >= PER_IP_LIMIT) {
      if (cached) {
        return jsonResponse({ text: cached, source: 'cache', sponsored: true });
      }
      return jsonResponse({
        text: null,
        source: 'ratelimit',
        sponsored: true,
        message:
          `You've used your ${PER_IP_LIMIT} free demos for today. ` +
          `These demos are provided free by mcpcio.com — come back tomorrow!`,
      });
    }

    // --- Make live Anthropic API call ---
    let apiResponse;
    try {
      apiResponse = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta':  'mcp-client-2025-04-04',
        },
        body: JSON.stringify({
          model:    MODEL,
          max_tokens: 1024,
          system:   SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
          mcp_servers: [{
            type: 'url',
            url:  MCP_SERVER_URL,
            name: 'shopify-mcp',
          }],
        }),
      });
    } catch (err) {
      return jsonResponse({ error: 'Upstream request failed', detail: err.message }, 502, origin);
    }

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return jsonResponse(
        { error: data?.error?.message || 'Anthropic API error', code: data?.error?.type },
        apiResponse.status,
        origin
      );
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)