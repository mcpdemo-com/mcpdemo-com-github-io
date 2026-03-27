# MCP Demo — Daily Tool Launch Checklist
## The fast path — one tool per day

---

## Morning Prep (~5 min)

1. Confirm which mcpcio tool is launching today
2. Verify it's available via `api.mcpcio.com/mcp` — test one call
3. Note the exact tool name(s) and raw data field names

---

## Build Order (target: 90 min total)

| Step | Task | Time |
|------|------|------|
| 1 | Test tool directly, note field names | 5 min |
| 2 | Generate info page content via mcpcio content creator | 2 min (90s generate) |
| 3 | Add card to tools/index.html | 5 min |
| 4 | Build and push info page (with Ahrefs script) | 15 min |
| 5 | Write Cloudflare Worker | 15 min |
| 6 | Push wrangler.toml | 2 min |
| 7 | Create Worker in Cloudflare, add secret, connect GitHub | 5 min |
| 8 | Add Worker route in Cloudflare | 2 min |
| 9 | Build and push demo page (with Ahrefs script) | 20 min |
| 10 | Test live | 5 min |
| **Total** | | **~76 min** |

---

## ⚠️ Analytics — Required on Every Page

**Every HTML page MUST include this script in `<head>`, after Google Fonts links:**

```html
<script src="https://analytics.ahrefs.com/analytics.js" data-key="9+8emHsZ/uAGZescpbe7Tg" async></script>
```

This includes the info page AND the demo page for every tool. Do not skip it.

---

## Tool Inventory — mcpcio MCP tools available NOW

These can be launched immediately — all confirmed working via `api.mcpcio.com/mcp`:

| Tool | MCP function(s) | Category | Demo concept |
|------|----------------|----------|--------------|
| ✅ Shopify | `productsearch_*` | E-Commerce | DONE |
| 🔜 Web Search | `websearch_query` | Data | Ask any question, get sourced answer |
| 🔜 Real Estate | `realestate_*` | Data | Mortgage calc, market data, buy vs rent |
| 🔜 Tax Research | `taxresearch_*` | Data | IRS code lookup, form finder |
| 🔜 Grant Finder | `grantfinder_*` | Data | Search federal grants, foundation funding |
| 🔜 Video Search | `videosearch_*` | Data | Search video transcripts by topic |
| 🔜 Transcription | `transcription_*` | Data | Submit URL, get transcript |
| 🔜 Scheduling | `scheduling_*` | Productivity | Check availability, create booking |
| 🔜 Prompt Security | `promptsecurity_*` | Data | Scan prompts for injection attacks |
| 🔜 Research Intel | `researchintel_*` | Data | Compare experts, generate research briefs |

---

## Cloudflare — Reuse for every new tool

The `api.mcpdemo.com` DNS record and the A record already exist.
For each new tool you only need to:

1. Create new Worker named `mcpdemo-[tool]-proxy`
2. Add `MCPCIO_TOKEN` secret (same value every time)
3. Connect GitHub → root dir `workers/[tool]-proxy`
4. Add route `api.mcpdemo.com/proxy/[tool]*`

That's it. Steps 1 and 4 of the original Cloudflare setup are already done.

---

## Worker Template — Copy This Every Time

```javascript
/**
 * MCP Demo — [Tool Name] Worker
 */

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const MCP_URL        = 'https://api.mcpcio.com/mcp';

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

async function callTool(token, toolName, args) {
  const resp = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      1,
      method:  'tools/call',
      params:  { name: toolName, arguments: args }
    })
  });
  return resp;
}

function parseResponse(text, contentType) {
  if (contentType.includes('text/event-stream')) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        return JSON.parse(line.slice(6).trim());
      }
    }
    throw new Error('No data in SSE response');
  }
  return JSON.parse(text);
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
    if (!env.MCPCIO_TOKEN) return json({ error: 'MCPCIO_TOKEN not set' }, 500, origin);

    let resp, text, data;
    try {
      resp = await callTool(env.MCPCIO_TOKEN, '[TOOL_FUNCTION_NAME]', { query });
      text = await resp.text();
      data = parseResponse(text, resp.headers.get('content-type') || '');
    } catch (err) {
      return json({ error: 'MCP tool call failed', detail: err.message }, 502, origin);
    }

    if (data.error) {
      return json({ error: data.error.message || 'MCP error' }, 502, origin);
    }

    // Format result — replace this with tool-specific formatting
    const result = formatResult(data);
    return json({ result, source: 'live', sponsored: true });
  }
};

function formatResult(data) {
  // Extract from data.result.content[0].text or data.result directly
  // Return { summary: '...', items: [...] } or whatever the demo page expects
  return data.result || data;
}
```

---

## wrangler.toml Template — Copy This Every Time

```toml
name = "mcpdemo-[tool-name]-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"
```

No KV needed unless you add caching later.

---

## Per-Page HTML Checklist

Before pushing any `.html` file, verify it has:

- [ ] Ahrefs script in `<head>`: `<script src="https://analytics.ahrefs.com/analytics.js" data-key="9+8emHsZ/uAGZescpbe7Tg" async></script>`
- [ ] Standard nav (Home / About / Contact / Explore Tools button)
- [ ] Standard footer with legal links + copyright year script
- [ ] Logo images using `mix-blend-mode: screen`
- [ ] Brand colors only (no purple, no Tailwind CDN)

---

## Suggested Launch Order (based on SEO value + build effort)

| Day | Tool | Why first |
|-----|------|-----------|
| 1 | ✅ Shopify | Done |
| 2 | Web Search | High traffic, simplest demo |
| 3 | Real Estate | Strong SEO vertical, mcpcio flagship |
| 4 | Tax Research | High commercial intent, niche |
| 5 | Grant Finder | Unique, low competition |
| 6 | Video Search | Interesting demo, visual |
| 7 | Prompt Security | Developer audience, viral potential |
| 8 | Research Intel | Comparison use case, shareable |
| 9 | Scheduling | Business use case |
| 10 | Transcription | Broad appeal |
