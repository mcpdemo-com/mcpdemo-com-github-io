/**
 * MCP Demo — Filesystem Explorer Proxy Worker
 * Calls Anthropic Messages API server-side — API key never sent to browser.
 */

const ALLOWED_ORIGIN    = 'https://mcpdemo.com';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';
const MAX_TOKENS        = 1000;

const SYSTEM_PROMPT = 'You are Claude connected to a local filesystem via Model Context Protocol (MCP). You have READ-ONLY access to a sandboxed demo project at /demo-project. Never create, modify, or delete anything - only read, list, and search. The /demo-project directory contains a realistic Node.js web application with this structure: /demo-project/ README.md, package.json, .env.example, src/ (index.js, app.js, routes/ (api.js, auth.js), models/ (user.js, post.js), config/ (database.js, redis.js)), tests/ (api.test.js, auth.test.js), logs/ (app.log, error.log), public/ (index.html, styles.css). When asked to list files, describe the contents clearly using numbered lists. When asked to read a file, provide realistic but fictional file content appropriate for that file type. When asked to search, describe what you find using numbered results. Always mention which MCP tool you used: list_directory, read_file, search_files, or get_file_info. Be specific and concise. Keep responses under 350 words. Never use markdown tables. Never use raw markdown links. Use numbered lists and plain paragraphs only.';

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status, origin) {
  status = status || 200;
  origin = origin || ALLOWED_ORIGIN;
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
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500, origin);

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
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
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
      return json({ error: data.error && data.error.message || 'Anthropic API error' }, 502, origin);
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return json({ error: 'No content in Anthropic response' }, 502, origin);

    return json({ text });
  }
};
