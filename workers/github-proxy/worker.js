/**
 * MCPDemo — GitHub MCP Proxy Worker (Diagnostic build)
 * Returns raw Anthropic error for debugging
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
Be specific: include repo names, star counts, issue titles, PR numbers, dates where relevant.
Format results clearly using short lists. Keep responses concise.`;

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

    // Try old beta format first (simpler, no tools array needed)
    // authorization_token is the correct field — NOT headers
    const requestBody = {
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
    };

    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'mcp-client-2025-04-04',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // Return full raw response for debugging
      if (!response.ok) {
        return json({
          error: data?.error?.message || 'API error',
          debug: {
            status: response.status,
            anthropic_error: data,
          }
        }, 502);
      }

      const text = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim() || 'No response received.';

      return json({ result: text });

    } catch (err) {
      return json({
        error: 'Worker exception: ' + err.message,
        stack: err.stack,
      }, 500);
    }
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
