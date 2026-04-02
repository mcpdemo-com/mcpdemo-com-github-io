/**
 * MCPDemo — GitHub MCP Proxy Worker
 * Route: api.mcpdemo.com/proxy/github*
 *
 * Environment variables required:
 *   GITHUB_TOKEN      — GitHub PAT with Copilot read + public repo access
 *   ANTHROPIC_API_KEY — Anthropic API key
 */

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const GITHUB_MCP_URL = 'https://api.githubcopilot.com/mcp/';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `You are Claude connected to GitHub via Model Context Protocol (MCP).
You have READ-ONLY access to public GitHub repositories, issues, pull requests, Actions runs, and code search.
Never create, modify, close, comment on, or delete anything. Only search, list, and read.

FORMATTING RULES — follow these exactly:
- Never use markdown tables. Never use | characters.
- Never use raw markdown links like [text](url). Instead write: Repo Name — url
- Use plain numbered lists: 1. 2. 3.
- Use ** for bold sparingly — only for repo names or key labels
- Keep each list item to 1-2 lines maximum
- Include: repo name, star count (⭐), language, brief description, and URL on its own line
- Group results cleanly with a short intro line, then the numbered list
- Keep the total response under 400 words`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let query;
    try {
      const body = await request.json();
      query = (body.query || '').trim();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!query) return json({ error: 'No query provided' }, 400);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Missing ANTHROPIC_API_KEY' }, 500);
    if (!env.GITHUB_TOKEN) return json({ error: 'Missing GITHUB_TOKEN' }, 500);

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
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
          mcp_servers: [{
            type: 'url',
            url: GITHUB_MCP_URL,
            name: 'github',
            authorization_token: env.GITHUB_TOKEN,
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data?.error?.message || 'Upstream API error. Please try again.';
        return json({ error: errMsg }, 502);
      }

      const text = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim() || 'No response received.';

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
