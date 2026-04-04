/**
 * MCP Demo — Playwright Browser Automation Proxy Worker
 * Calls Anthropic Messages API server-side — API key never sent to browser.
 */

const ALLOWED_ORIGIN    = 'https://mcpdemo.com';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';
const MAX_TOKENS        = 1000;

const SYSTEM_PROMPT = `You are Claude connected to a Playwright MCP server (@playwright/mcp by Microsoft). You have live browser control through Model Context Protocol (MCP).

When the user describes a browser task, respond as if you are actively executing it. Walk through the MCP tool calls step by step:
1. State which tool you are calling (e.g. browser_navigate, browser_snapshot, browser_click, browser_type)
2. Describe what the accessibility tree snapshot returns — list real-looking elements with ref IDs (e.g. [ref=e5], [ref=e12])
3. Show any follow-up tool calls needed
4. Summarize what you found or accomplished

Be specific and realistic. Use numbered steps. Keep responses concise and practical.
Never use markdown tables or raw [text](url) style links. Use numbered lists and plain text only.
Always clarify that this is a demonstration of what Playwright MCP would do with real browser access.`;

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
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

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500, origin);
    }

    let anthropicResp;
    try {
      anthropicResp = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:    MODEL,
          max_tokens: MAX_TOKENS,
          system:   SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
        }),
      });
    } catch (err) {
      return json({ error: 'Could not reach Anthropic API', detail: err.message }, 502, origin);
    }

    let data;
    try { data = await anthropicResp.json(); }
    catch { return json({ error: 'Invalid response from Anthropic API' }, 502, origin); }

    if (!anthropicResp.ok) {
      return json({ error: data.error?.message || 'Anthropic API error', type: data.error?.type }, 502, origin);
    }

    const text = data.content?.[0]?.text;
    if (!text) return json({ error: 'No content in Anthropic response' }, 502, origin);

    return json({ text });
  }
};
