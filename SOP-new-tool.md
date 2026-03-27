# MCP Demo — New Tool Page SOP
## How to add a new tool to mcpdemo.com

Last updated: 2026-03-27
Built by: Claude (claude.ai) in a single project session

---

## Overview

Each MCP tool gets exactly 3 things:
1. **A card** in `/tools/index.html`
2. **An info page** at `/tools/[tool-name]/index.html`
3. **A demo page** at `/tools/[tool-name]/demo.html`

There are two tool types. Determine which before building anything:

| Type | Description | Demo approach |
|------|-------------|---------------|
| **Type 1** | Tool lives in mcpcio.com | Direct MCP call from Cloudflare Worker |
| **Type 2** | External tool, needs OAuth | No demo page until mcpcio.com absorbs it |

> **Rule:** We do NOT demo OAuth tools until they are integrated into mcpcio.com.
> We do NOT use Claude as a middleman for MCP tool calls — call the tool directly.

---

## Infrastructure

| Component | Location | Notes |
|-----------|----------|-------|
| Static site | GitHub Pages | `mcpdemo-com/mcpdemo-com-github-io` |
| DNS + CDN | Cloudflare | mcpdemo.com zone |
| API proxy | Cloudflare Worker | `mcpdemo-shopify-proxy` (one Worker per tool) |
| Worker deploy | GitHub CI | Auto-deploys on push to `workers/[tool]/` |
| KV storage | Cloudflare KV | `MCP_CACHE` and `MCP_LIMITS` per Worker |
| MCP server | mcpcio.com | `https://api.mcpcio.com/mcp` |
| MCP auth | Worker secret | `MCPCIO_TOKEN` = API key from mcpcio dashboard |

---

## Step 1 — Determine Tool Type

Before writing a single line of code, answer:
- Does mcpcio.com have this tool available via `api.mcpcio.com/mcp`?
- Test it: call the tool directly using the mcpcio MCP connector

If yes → **Type 1**, proceed.
If no → **Stop**. Add it to the coming-soon chips in `/tools/index.html` only.

---

## Step 2 — Test the MCP Tool Directly

Always test before building. Use the mcpcio connector in Claude:

```
Call [tool_name] with a sample query and see what the raw data looks like
```

Note the exact field names — `title`, `price`, `image`, `description`, etc.
The Cloudflare Worker will format this data directly — **no Claude in the loop**.

---

## Step 3 — Add the Tool Card to `/tools/index.html`

Read the current file first:
```
mcpcio:gitmanager_read_file path="tools/index.html" repo="mcpdemo-com/mcpdemo-com-github-io"
```

Add a new `.tool-card` inside `#liveGrid`. Copy the Shopify card pattern exactly:

```html
<a class="tool-card" href="/tools/[tool-name]/" data-name="[search keywords]" data-cat="[category]">
  <div class="tool-card-head">
    <div class="tool-icon">
      <!-- SVG icon, stroke="#00d4ff" -->
    </div>
    <span class="live-badge">Live</span>
  </div>
  <div>
    <div class="category">[Category]</div>
    <h3>[Tool Name]</h3>
  </div>
  <p>[One sentence description]</p>
  <div class="tool-card-foot">
    <div class="tool-tags"><span class="tag">[Tag1]</span><span class="tag">[Tag2]</span></div>
    <span class="card-cta">Explore →</span>
  </div>
</a>
```

Also remove the tool from the `.soon-chip` list if it was there.

Categories: `ecommerce`, `productivity`, `data`, `communication`

---

## Step 4 — Generate the Info Page Content

Use mcpcio content creator. Takes ~90 seconds — do not timeout:

```
mcpcio:contentcreator_generate_content
  topic: "[Tool Name] MCP integration for [use case]"
  template: "how-to-guide"
  additional_context: "For mcpdemo.com — educational site showcasing Model Context Protocol (MCP) tools. 
    Audience: developers and business owners. Plain English, active voice. 
    Explain what MCP is, how Claude connects to [tool] through it, real-world use cases.
    Tool is provided by mcpcio.com MCP infrastructure at https://api.mcpcio.com/mcp"
  word_count_min: 1200
  word_count_max: 2500
  enable_competitor_analysis: false
```

Take the `content_html` field from the response.

---

## Step 5 — Build the Info Page

File: `tools/[tool-name]/index.html`

Use the Shopify info page as the template. Key sections:
- Breadcrumb: Tools → [Tool Name]
- Hero: tool name, one-liner, two CTAs ("Try Demo" + "How it works")
- Inject the generated HTML content inside `.article` div
- CTA box at bottom linking to demo.html
- Standard nav + footer

**CSS classes for article content:**
```css
.article h2  — section headings (border-top, Exo 2 800)
.article h3  — sub-headings (cyan, Exo 2 700)
.article p   — body text (muted, .95rem)
.article table — styled with bg3 headers, border
.article code — cyan, bg tint
```

Push to GitHub:
```
mcpcio:gitmanager_write_file
  path: "tools/[tool-name]/index.html"
  repo: "mcpdemo-com/mcpdemo-com-github-io"
  message: "Add [Tool] info page"
```

---

## Step 6 — Build the Cloudflare Worker

### 6a. Create Worker code

File: `workers/[tool-name]-proxy/worker.js`

**Critical rule: Call the MCP tool directly. No Claude. No LLM interpretation.**

Pattern (use Shopify worker as reference):

```javascript
const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const MCP_URL        = 'https://api.mcpcio.com/mcp';

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
```

Handle both JSON and SSE (text/event-stream) responses — mcpcio may return either.

Format the raw tool result into clean card data yourself — do not send to Claude.

**Worker secrets needed** (same for every tool):
- `MCPCIO_TOKEN` — already set on existing Workers, reuse pattern

### 6b. Create wrangler.toml

File: `workers/[tool-name]-proxy/wrangler.toml`

```toml
name = "mcpdemo-[tool-name]-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"
```

Note: KV bindings optional — only add if caching is needed.

Push both files, then in Cloudflare:
1. Workers & Pages → Create Worker → "Start with Hello World" → name: `mcpdemo-[tool-name]-proxy`
2. Settings → Bindings → add `MCPCIO_TOKEN` secret (same value as Shopify worker)
3. Settings → Build → Connect GitHub → root directory: `workers/[tool-name]-proxy`
4. DNS → add A record: name=`api`, IPv4=`192.0.2.1`, Proxied ON (if not already exists)
5. Workers Routes → add route: `api.mcpdemo.com/proxy/[tool-name]*` → worker

---

## Step 7 — Build the Demo Page

File: `tools/[tool-name]/demo.html`

Use the Shopify demo page as the template. Key elements:

**Context bar** (always):
```html
<div class="context-bar">
  Connected to <strong>[Tool Name]</strong> via MCP &nbsp;·&nbsp;
  <span>[What it does] · Powered by mcpcio.com</span>
</div>
```

**Sponsored bar** (always):
```html
Free demos provided by <a href="https://mcpcio.com">mcpcio.com</a>
· Privacy-first · No tracking · No sign-up required
```

**Starter prompts** — 4 chips specific to the tool

**Search/input** — tool-appropriate (search box, form fields, etc.)

**Results area** — DOM-built cards (never use innerHTML with nested quotes)

**"What's happening under the hood?"** collapsible — explain:
- Cloudflare Worker at api.mcpdemo.com/proxy/[tool-name]
- Direct call to mcpcio.com MCP server
- Tool name that gets called
- No API key needed for visitors

**JS pattern** — always separate showLoading/hideLoading:
```javascript
function showLoading() {
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('thinking').classList.add('active');
  // hide all result elements
}

function hideLoading() {
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('thinking').classList.remove('active');
  // do NOT touch result elements here
}

// Each outcome (results/error/quota) manages its own display
function renderResults(data) {
  hideLoading();
  // show results
}

function showError(msg) {
  hideLoading();
  // show error
}

async function sendSearch() {
  showLoading();
  try {
    const res  = await fetch('https://api.mcpdemo.com/proxy/[tool-name]', {...});
    const data = await res.json();
    renderResults(data.result);
  } catch (err) {
    showError('Connection failed.');
  }
  // NO finally block that touches display state
}
```

**Never** put display state changes in a `finally` block — it hides results.

---

## Step 8 — Update the Info Page Code Example

The code example on the info page should show the direct MCP call pattern, not the Anthropic API pattern:

```javascript
// Direct MCP tool call — no LLM middleman
const resp = await fetch('https://api.mcpcio.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer YOUR_MCPCIO_API_KEY',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id:      1,
    method:  'tools/call',
    params: {
      name:      '[tool_name]',
      arguments: { query: 'your search' }
    }
  })
});
```

---

## Brand Rules (never violate)

```css
--bg:     #080d1a   /* page background */
--bg2:    #0d1528   /* section alternate */
--bg3:    #111c35   /* card background */
--cyan:   #00d4ff   /* PRIMARY accent */
--blue:   #4a9eff   /* secondary */
--border: #1a2a40   /* all borders */
--txt:    #e8edf5   /* primary text */
--muted:  #8899aa   /* secondary text */
--dim:    #556070   /* fine print */
```

Fonts: Exo 2 (headings, 700-900) + IBM Plex Sans (body, 300-500)
Logo: always `mix-blend-mode: screen`
Never use purple. Never use Tailwind CDN.

Nav links: `Home→/` `About→/about/` `Contact→/contact/` `Explore Tools→/tools/`

---

## Common Bugs to Avoid

| Bug | Cause | Fix |
|-----|-------|-----|
| Results flash then disappear | `finally` block resets display | Separate showLoading/hideLoading, never touch display in finally |
| SVG broken in dynamic cards | innerHTML with nested quotes | Always use DOM createElement, never innerHTML for dynamic cards |
| Nothing displayed, no error | Worker returning empty products | Test tool directly first, check MCP auth token |
| "Overloaded" error | Anthropic 529 | Don't use Anthropic — call MCP tool directly |
| Tool returns no results | LLM refusing to call tool | Don't use LLM — call MCP tool directly |
| Wrong auth | Email instead of API key | Use API key from mcpcio dashboard, not email address |
| Worker not deploying | Missing wrangler.toml | Always create wrangler.toml in worker folder |
| SSE parse error | mcpcio returns event-stream | Handle both `application/json` and `text/event-stream` in Worker |

---

## File Checklist for Each New Tool

- [ ] `tools/index.html` — card added to liveGrid, removed from soon chips
- [ ] `tools/[tool-name]/index.html` — info page with generated content
- [ ] `tools/[tool-name]/demo.html` — demo page with direct MCP call
- [ ] `workers/[tool-name]-proxy/worker.js` — Cloudflare Worker
- [ ] `workers/[tool-name]-proxy/wrangler.toml` — Wrangler config
- [ ] Cloudflare — Worker created, secret added, route configured
- [ ] Cloudflare — DNS A record for api.mcpdemo.com (only needed once)

---

## Connectors Available in This Project

| Connector | Purpose |
|-----------|---------|
| `mcpcio` | GitHub file management, product search, content creator, web search |
| `MCPDEMO` | Widget management (PMG platform — separate from mcpcio MCP tools) |

**Important distinction:**
- `mcpcio` = YOUR MCP platform at api.mcpcio.com
- `MCPDEMO` = PMG's widget/agent platform at app.mcpcio.com
- These are different systems. MCPDEMO widgets cannot directly call mcpcio MCP tools without explicit wiring on the PMG dashboard.

---

## Shopify Demo — Reference Implementation

The Shopify demo is the canonical reference for everything above.

- Info page: `tools/shopify/index.html`
- Demo page: `tools/shopify/demo.html`
- Worker: `workers/shopify-proxy/worker.js`
- MCP tool called: `productsearch_search_products`
- Worker route: `api.mcpdemo.com/proxy/shopify*`
- Worker name: `mcpdemo-shopify-proxy`
