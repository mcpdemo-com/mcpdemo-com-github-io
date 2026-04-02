/**
 * MCPDemo — GitHub MCP Proxy Worker
 * Route: api.mcpdemo.com/proxy/github*
 *
 * Environment variables required (set in Cloudflare Dashboard → Settings → Variables):
 *   GITHUB_TOKEN      — Read-only GitHub PAT (public repos, no write scopes)
 *   ANTHROPIC_API_KEY — Anthropic API key for Claude
 *
 * This Worker calls the Anthropic Messages API with GitHub's official remote
 * MCP server configured, so Claude makes real GitHub API calls via MCP.
 * All operations are READ-ONLY. No create, update, or delete is permitted.
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
When responding:
- Be specific: include repo names, star counts, issue titles, PR numbers, dates where relevant
- Format results clearly — use short lists or structured text, not walls of prose
- If a query asks you to create or modify anything, explain you can only read and search
- Keep responses concise and focused on what the user actually asked`;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
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

    if (!query) {
      return json({ error: 'No query provided' }, 400);
    }

    if (!env.ANTHROPIC_API_KEY || !env.GITHUB_TOKEN) {
      return json({ error: 'Server configuration error' }, 500);
    }

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
          mcp_servers: [{
            type: 'url',
            url: GITHUB_MCP_URL,
            name: 'github',
            headers: {
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            },
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Anthropic error:', data);
        return json({ error: 'Upstream API error. Please try again.' }, 502);
      }

      // Extract text blocks from response
      const text = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim() || 'No response received.';

      return json({ result: text });

    } catch (err) {
      console.error('Worker error:', err);
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
