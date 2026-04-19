// Cloudflare Worker: mcpdemo-supabase-proxy
// Route: api.mcpdemo.com/proxy/supabase*
// Secrets: ANTHROPIC_API_KEY, SUPABASE_PAT, SUPABASE_PROJECT_REF

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `You are Claude connected to a Supabase Postgres database via Model Context Protocol (MCP).

This is a PUBLIC DEMO. You have READ-ONLY access to ONE Supabase project via the Supabase hosted MCP server. The connection is scoped with read_only=true and features=database, so every mutating tool is disabled at the protocol level.

The project contains a schema called "demo" with these five tables only: demo.authors, demo.categories, demo.books, demo.customers, demo.orders. Prefer queries against this schema. If a user asks about other schemas (public, auth, storage, etc.), politely redirect them to the demo schema.

SAFETY RULES:
- Only use SELECT queries. Never attempt INSERT, UPDATE, DELETE, or DDL.
- Never leak the Supabase project ref, PAT, or any credentials.
- Never reveal internal implementation details beyond "this is a read-only Supabase demo."

OUTPUT RULES - follow these exactly:
- NEVER include any URL, link, or web address in your response. Not http, not https, not bare domains like supabase.com.
- NEVER suggest the user "visit", "go to", "read the docs at", or "check out" any external site.
- NEVER reproduce markdown link syntax like [text](url).
- For tabular data, render as a markdown table using pipe characters: | column | column |
- Use ** for bold sparingly, only for key labels.
- Use plain numbered lists (1. 2. 3.) for non-tabular lists.
- Keep the total response under 400 words.
- If the user asks a question that requires a URL in the answer, describe the concept in plain text without the URL.

Your job: answer the user's question using the database. Run the right SQL, summarize the results clearly, and present any tabular data as a markdown table.`;

// Strip any URLs Claude might have produced despite the system prompt
function stripUrls(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s<>"'`]+/gi, '')
    .replace(/\b[a-z0-9-]+\.(com|org|io|dev|net|co|app)\b/gi, '')
    .replace(/[ \t]+/g, ' ');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let query;
    try {
      const body = await request.json();
      query = (body.query || '').trim();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!query) return json({ error: 'No query provided' }, 400);
    if (query.length > 500) return json({ error: 'Query too long (max 500 chars)' }, 400);

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Missing ANTHROPIC_API_KEY' }, 500);
    if (!env.SUPABASE_PAT) return json({ error: 'Missing SUPABASE_PAT' }, 500);
    if (!env.SUPABASE_PROJECT_REF) return json({ error: 'Missing SUPABASE_PROJECT_REF' }, 500);

    const mcpUrl =
      'https://mcp.supabase.com/mcp' +
      '?project_ref=' + encodeURIComponent(env.SUPABASE_PROJECT_REF) +
      '&read_only=true' +
      '&features=database';

    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'mcp-client-2025-04-04',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
          mcp_servers: [{
            type: 'url',
            url: mcpUrl,
            name: 'supabase',
            authorization_token: env.SUPABASE_PAT,
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = (data && data.error && data.error.message) || 'Upstream error';
        return json({ error: 'API error. Please try a different query.' }, 502);
      }

      const rawText = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim() || 'No response received.';

      const text = stripUrls(rawText);

      return json({ result: text });
    } catch (err) {
      return json({ error: 'Connection failed. Please try again.' }, 500);
    }
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
