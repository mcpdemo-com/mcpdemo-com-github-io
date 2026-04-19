---
name: mcpdemo-tool-page
description: >
  Builds and ships a new MCP tool page on mcpdemo.com — tools grid card, info
  page, demo page, and tracking sheet update — from a single user request.
  Use whenever the user says "build the next tool", "build [tool name] page",
  "deploy the next scheduled tool", or equivalent. Delegates deploy mechanics
  to mcpdemo-deploy and video production to mcpdemo-explainer-video. Runs
  nearly all phases silently. The user sees ~2–3 messages from me end-to-end:
  an acknowledgment, an optional blocker surface if needed, and a completion.
---

# MCPDemo Tool Page Skill

Orchestrator. This skill owns the decision points and user-facing moments;
it calls `mcpdemo-deploy` for all file writes and `mcpdemo-explainer-video`
for the video step.

---

## Entry Rule

On any request to build a tool page:

1. Read the top-priority row on the `Tools Schedule` sheet (spreadsheet
   `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ`). If the user named a
   specific tool, find that row; otherwise take the lowest `#` with
   `Status = Scheduled`.

2. **If `Status = Scheduled`** — go silently. One acknowledgment message,
   then work. The user is not asked to confirm anything obvious from the sheet.

3. **If `Status = In Progress`** — a prior session was interrupted. Call
   `mcpdemo-resume` instead of starting fresh.

4. **Any other status** (`Live`, `Published`, `Blocked`, blank, unknown) —
   stop and ask the user which row to work on. Don't silently re-build a
   Live page.

5. If no row matches and the user didn't name a tool, surface once:
   *"No scheduled rows on the sheet — what should I build?"*

---

## Fixed Asset IDs

| Asset | Value |
|---|---|
| Tools Schedule Sheet ID | `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ` |
| Sheet Tab | `Tools Schedule` |
| Repo | `mcpdemo-com/mcpdemo-com-github-io` |
| Canonical info template | `tools/shopify/index.html` |
| Canonical demo template | `tools/shopify/demo.html` |
| Tools grid page | `tools/index.html` |

Sheet columns in current use: `#`, `Scheduled Date`, `Tool Name`, `Slug`,
`Category`, `One-Liner`, `URL Pattern`, `Demo Type`, `Tools Card`, `Info Page`,
`Demo Page`, `Status`, `Notes`.

**`Demo Type`** values: `A` | `B` | `C`. If the cell is blank, classify
per Step 2.

---

## Narration Discipline

**Silent phases** — do not narrate these to the user. No step headers,
no "let me check", no progress updates.

- Reading the sheet
- Loading skills (`mcpdemo-design`, `mcpdemo-deploy`, this skill)
- Reading canonical templates from GitHub
- Running web searches for research
- Writing content, starter prompts, or HTML
- Deploying files (handled silently by `mcpdemo-deploy`)
- Setting Worker secrets
- Updating the sheet at the end

**Surface moments** — the only messages the user sees during a build:

1. **Acknowledgment** (one sentence, first response):
   *"Building [Tool Name], row [N], Type [A/B/C]. [Credential need if any].
   Include explainer video? (~15 min extra)"*
2. **Credential request** (if needed, folded into #1 when possible)
3. **Genuine blocker** (account doesn't exist, research turned up contradictions,
   file size over budget, Cloudflare Worker deploy failed)
4. **Completion** (one message — see end of this skill)

Post-deploy review is opt-in: *"Live at [URLs]. Let me know if anything needs
editing."* User can respond or not. No separate review turn before going live.

---

## WORKFLOW

### Step 1 — Mark Row In Progress

Silent. `MCPDEMO:update_sheet_row` sets `Status: "In Progress"` on the matched
row. Prevents double-picking if a parallel session starts.

---

### Step 2 — Determine or Confirm Demo Type

If the sheet row's `Demo Type` column is already populated (`A`, `B`, or `C`),
use it. Trust the sheet.

If `Demo Type` is blank, classify via this decision tree. **Priority is
A > B > C. C is last resort, never a work-avoidance exit.**

Run `web_search` queries silently:
- `[Tool Name] MCP server GitHub`
- `mcpcio [Tool Name] MCP tool` — check if mcpcio already wraps it
- `[Tool Name] MCP bearer token authentication` — catches OAuth-only cases

Then walk the tree, stop at first match:

1. **Type A via mcpcio** — mcpcio exposes a live MCP tool for this integration.
   Worker calls the mcpcio tool using the mcpcio API key.
2. **Type A via direct API** — no mcpcio tool, but a public bearer-token API
   maps to the same surface the tool's MCP server wraps. Worker calls that
   API. **Page copy must be honest** — "Claude connected to [Tool] using the
   same read-only operations the [Tool] MCP server exposes," not claims that
   the request literally flows through MCP.
3. **Type A via MCP passthrough** — the tool's hosted MCP endpoint accepts a
   bearer token from our Worker. Worker passes through using the Anthropic
   `mcp_servers` beta. Purest Type A variant.
4. **Type B** — tool is pre-MCP-server and a credible simulation is possible.
   System prompt instructs Claude to describe what it *would* do. No Worker
   talking to a real service — just Anthropic API with a scripted system
   prompt. Only use when no MCP server exists yet.
5. **Type C** — hosted MCP is OAuth-only with no headless bearer-token path,
   and no credible Type A substitute exists. Requires a one-sentence
   justification appended to `Notes` column.

**If Type C is the answer:** draft the justification now. Format:
*"Type C: [Tool]'s hosted MCP is OAuth-only, no bearer-token path for
headless clients per [docs URL]."* Save for Step 8.

Write the determined type back to the sheet's `Demo Type` column silently
so future sessions don't re-classify.

---

### Step 3 — Account & Credential Check (Type A only)

Silent check: does a Worker for this tool already exist at
`mcpdemo-[slug]-proxy`? If yes, secrets are likely already set from a prior
session. List secret names (not values) via the deploy skill to confirm.

**If the tool needs a user account at a third-party service and we may not
have one** (typical for Salesforce, Slack, Linear, etc.):

Surface once:
*"Type A — needs a [Service] account under robert@mcpdemo.com with [specific
credential, e.g. 'a read-only API key']. Do you have the account, or pause
while you create one? For Type A I also need the Anthropic API key if not
already cached from this session."*

If the user says pause: set `Status: Blocked` with a note in `Notes` column
(*"Blocked: awaiting [Service] account setup"*). Stop. Build resumes when the
user returns with credentials.

If the user has the account: collect the credential(s), cache in session, proceed.

**Anthropic API key is shared across every mcpdemo.com Worker.** Ask once per
session, cache for the session. Never ask twice in the same conversation.

---

### Step 4 — Research & Content (Silent)

Web-search for:
- What the tool actually does (strip marketing)
- 4–5 concrete developer use cases
- How the tool's MCP server connects (API, auth, protocols)
- Any rate limits, auth scopes, or known limitations

Generate source material via `mcpcio:contentcreator_generate_content`:

```
Call 1 — How-To Guide (feeds "What Is It?" and connection flow):
  topic: "How to use [Tool Name] with Claude AI via MCP"
  template: how-to-guide
  output_format: markdown
  word_count_min: 800
  word_count_max: 1500
  additional_context: "[One-Liner]. Category: [Category]. Focus on developer
    use cases and what becomes possible when Claude connects to this tool
    through Model Context Protocol. Avoid marketing. Be specific about what
    actions Claude can take and what the API/protocol looks like."

Call 2 — FAQ Resource Page (feeds use cases and demo starter prompts):
  topic: "[Tool Name] MCP — common questions and real-world use cases"
  template: faq-resource-page
  output_format: markdown
  word_count_min: 600
  word_count_max: 1000
  additional_context: "Focus on practical developer questions: what can
    Claude actually do with [Tool Name] via MCP? What are the most useful
    commands? What does the MCP tool call look like? Ground answers in what
    the MCP server actually supports."
```

Rewrite all content into MCPDemo voice — plain English, active voice, 2–3
sentence paragraphs. Cross-check every claim against web-search findings.
Discard troubleshooting tables, "author authority" sections, unverified claims.

**If `contentcreator_generate_content` is blocked by the security filter**
(a known issue on MCP topics): skip it, write content directly from
research findings. Do not silently substitute — the filter should fail
loudly, not be worked around by habit.

---

### Step 5 — Starter Prompts (I Write These — No Review)

Starter prompts are the demo page's first impression. I research and ship
them — no user review turn.

**Process (all silent):**

1. Read the tool's MCP server README or docs. List the tools it exposes
   (e.g. `list_tables`, `execute_sql`, `get_shop_info`).
2. Look at public examples — tool's own marketing pages, blog posts,
   tutorials — for "questions you can ask" patterns the community finds
   compelling.
3. Draft 4 starter prompts that:
   - Showcase different tool functions, not 4 variants of one query
   - Return visually interesting output (lists/tables beat single numbers)
   - Work against the dataset/state the demo will have (seed data for A,
     public state for B)
   - Stay under ~60 characters to fit cleanly in chip UI
   - Lead with the most impressive — first chip is what most users click

**If research genuinely yields no compelling examples** (rare): draft 4
best-guess prompts from the MCP surface area and surface once:
*"Couldn't find clear community examples — best guess: [4 prompts].
Ship these or want me to dig more?"*

**Do not** ask the user "do these look good?" as a default. The user is
the operator, not the subject-matter expert on every MCP tool.

---

### Step 6 — Seed Data (Type A Only, If Needed)

Some Type A tools need a seeded dataset before the demo makes sense
(Supabase → bookstore schema; Shopify → demo store; etc.). If the tool needs
seed data:

1. Pick a sensible theme (bookstore, e-commerce, issue tracker — match the
   tool's natural fit). Don't surface theme choice unless genuinely ambiguous.
2. Scale defaults: ~30–200 rows per table is enough for interesting queries
   without performance issues.
3. Write the seed file (SQL, JSON, YAML — whatever the tool accepts) to
   `/home/claude/[slug]-demo-seed.[ext]`.
4. Surface once to the user:
   *"[Tool] Type A needs seed data. Going with [theme], [N] rows across
   [tables]. Run this in [Service] dashboard when ready — [present_files the seed]."*

The user runs the seed, confirms row counts, and the build continues.

---

### Step 7 — Build & Deploy (Silent, via `mcpdemo-deploy`)

Before writing any HTML, load `mcpdemo-design` and read the canonical templates:

```
view /mnt/skills/user/mcpdemo-design/SKILL.md
MCPCIO:gitmanager_read_file — tools/shopify/index.html
MCPCIO:gitmanager_read_file — tools/shopify/demo.html
```

All three deliverables get built in `/home/claude/`, then deployed via
`mcpdemo-deploy`. Target ≤50KB per file, aim for ~40KB.

**7A — Tools Grid Card**

Read `tools/index.html` first. Inject a card in the appropriate category
group:

```html
<div class="card tool-card" data-category="[category-slug]">
  <div class="tool-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round"
         stroke-linejoin="round">
      <!-- relevant SVG path, no emoji -->
    </svg>
  </div>
  <span class="sec-label">[Category]</span>
  <h3>[Tool Name]</h3>
  <p>[One-Liner]</p>
  <div class="card-actions">
    <a href="/tools/[slug]/" class="btn btn-ghost">Learn More</a>
    <a href="/tools/[slug]/demo.html" class="btn btn-primary">Try Demo</a>
  </div>
</div>
```

**Type C variant:** Replace `Try Demo` with `Why No Live Demo`. Everything
else identical.

**7B — Info Page** (`tools/[slug]/index.html`)

Long-form article. Match the Shopify info page structure exactly. Head
metadata: canonical, OG, Twitter card, favicon, Google Fonts preconnect +
Exo 2 + IBM Plex Sans, Ahrefs script. Meta description ≤155 characters.

Structure:
1. **Nav** — sticky, logo with `mix-blend-mode:screen`, links Home · About · Contact · "Explore Tools"
2. **Hero** — breadcrumb, sec-label badge, `<h1>` descriptive title, hero
   sub-paragraph using one-liner verbatim, two CTAs:
   - Type A/B: Primary "Try the Live Demo →" → `demo.html`, Ghost "How it works" → `#how-it-works`
   - Type C: Primary "How it works" (scroll anchor), Ghost "About this demo" → `demo.html`
3. **Article body**: Key Takeaways (4–5 bullets), "What [Tool] Actually Is"
   (2–3 plain-English paragraphs, first mention includes abbreviation),
   "How the [Tool] MCP Connection Works" (with code block showing
   `mcp_servers` API call), "Real-World Use Cases" (3–4 `<h3>` sub-sections),
   "[Tool] MCP vs. Traditional Integrations" (comparison table — naming
   Zapier/Make here is allowed to show MCP superiority), "Security and
   Permissions" brief prose, bottom `.cta-box` (Type A/B → demo; Type C →
   tool's MCP docs)
4. **Footer** — 3-column layout, legal disclaimer, year script

**7C — Demo Page** (`tools/[slug]/demo.html`)

Match Shopify demo structure. Head metadata mirrors info page. Structure:
1. **Nav** — same as info
2. **Context bar**: `Connected to [Tool] via MCP · [Live descriptor] · Powered by mcpcio.com`
3. **`<main>`**: 3-level breadcrumb, page `<h1>` + "Live Demo" badge, short
   sub-paragraph, sponsored bar, "Try a starter prompt" label, 4 prompt
   chips from Step 5, input row with send button (autofill CSS fix
   required — see Hard Rules), response area (placeholder → thinking → results),
   `<details>` "What's happening under the hood?"
4. **Footer** — same as info

For Type A Workers, the demo page calls
`https://api.mcpdemo.com/proxy/[slug]`. The Worker uses Claude Haiku 4.5
(`claude-haiku-4-5-20251001`), `mcp_servers` beta (`mcp-client-2025-04-04`),
`authorization_token` field (not headers), and a system prompt with
formatting rules (no markdown tables, no `[text](url)` links, numbered lists
only, bold sparingly, under 400 words). Full Worker template in
`mcpdemo-deploy` Section 3.

For Type B, the demo page calls `api.anthropic.com/v1/messages` directly
with a simulation system prompt. No Worker.

For Type C, the demo page is a disclaimer panel — no input, no script,
no API call. Full disclaimer panel markup in this skill below.

**Deploy all three** via `mcpdemo-deploy`, plus sitemap update in the same
batch (Section 2 of deploy skill).

---

### Step 8 — Explainer Video (Optional, via `mcpdemo-explainer-video`)

If the user opted in at Step 0 (acknowledgment), invoke
`mcpdemo-explainer-video` now. Info page and sitemap will be updated with
the `.video-band` block and `<video:video>` nesting.

If the user skipped video: leave the info page without a video band. The
video can be added in a later session by invoking `mcpdemo-explainer-video`
directly.

---

### Step 9 — Close the Sheet

**Type A/B:**
```
MCPDEMO:update_sheet_row
  spreadsheetId: 171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ
  sheetName: Tools Schedule
  lookupColumn: Tool Name
  lookupValue: [exact Tool Name]
  updates:
    Tools Card: "Done"
    Info Page: "Done"
    Demo Page: "Done"
    Status: "Live"
    Demo Type: [A or B if not already set]
```

**Type C:**
```
MCPDEMO:update_sheet_row
  ...
  updates:
    Tools Card: "Done"
    Info Page: "Done"
    Demo Page: "Done"
    Status: "Published"
    Demo Type: "C"
    Notes: "[existing Notes] | Type C: [one-line justification from Step 2]"
```

Preserve existing Notes content — append with ` | ` separator.

---

### Step 10 — Completion Message (The One Surface at the End)

**Type A/B:**
> ✅ **[Tool Name] is live.**
> - Info: mcpdemo.com/tools/[slug]/
> - Demo: mcpdemo.com/tools/[slug]/demo.html
>
> Smoke test in browser when you have a minute. Let me know if anything needs editing.

**Type C:**
> ✅ **[Tool Name] is published (Type C — info-only).**
> - Info: mcpdemo.com/tools/[slug]/
> - About this demo: mcpdemo.com/tools/[slug]/demo.html
>
> Add "[Tool Name]" to the "Info-only pages" list in the project instructions.
> Not to be listed under "Confirmed live demos."

That's it. No separate smoke-test ceremony, no follow-up review turn
scheduled. User responds with edits if any.

---

## Type C Demo Page Structure

(Preserved from prior skill — retained because Type C has unique structure.)

Same shell as A/B (nav, hero, sec-label "About This Demo", sponsored bar,
footer). Replaces the input/response/`<details>` area with:

```html
<div class="disclaimer-panel">
  <div class="sec-label">Why No Live Demo</div>
  <h2>[Tool Name] MCP requires per-user authentication</h2>
  <p>[Plain-English explanation of the auth constraint, 2–3 sentences. Cite
  the tool's own docs as the source so it's clear the constraint isn't
  invented by us.]</p>
  <p>This means every person using [Tool Name] MCP authenticates with their
  own workspace — exactly as intended for a productivity tool. A shared
  public demo would either expose one person's data to every visitor or
  silently simulate responses. Neither is a demo worth shipping.</p>

  <div class="disclaimer-actions">
    <a href="[tool's official MCP docs URL]" class="btn btn-primary"
       target="_blank" rel="noopener">How to connect [Tool Name] to Claude →</a>
    <a href="/tools/" class="btn btn-ghost">Back to all tools</a>
  </div>

  <div class="disclaimer-note">
    <strong>Try it yourself in about 2 minutes:</strong>
    <ol>
      <li>Open Claude Desktop → Settings → Connectors → Add Custom Connector</li>
      <li>Paste: <code>[tool's MCP server URL]</code></li>
      <li>Complete the OAuth flow in your browser</li>
      <li>Ask Claude questions about your [Tool Name] content</li>
    </ol>
  </div>
</div>
```

CSS for `.disclaimer-panel` — see Shopify or Notion demo page for canonical
values; include via `mcpdemo-design` to keep one source of truth.

---

## Hard Rules

- **Type A first, B only if A is impossible, C only if A and B are both impossible.**
  Each Type C requires a one-sentence Notes justification citing the specific blocker.
- **Never use Zapier or Make as solutions in mcpdemo's own tooling.**
  Info-page comparison tables naming them to show MCP superiority are fine.
  A Zapier MCP tool page is fine (Zapier ships a legitimate MCP server) —
  but the page still frames MCP as the primary pattern, not middleware.
- **Demo pages are strictly read-only. No CRUD, ever.** Even if the underlying
  MCP tool supports write, the demo never exercises it. Type A Workers scope
  to read-only; Type B system prompts describe what they *would* do without
  claiming execution. Write capabilities can be *mentioned* on info/demo pages;
  never demonstrated.
- **Never embed base64 images in HTML** except `<link rel="icon">`.
- **Never deploy any file over 50KB.** Stop and discuss what to cut.
- **Never overwrite a live file** without reading its current GitHub content first.
- **Never use purple** in any SVG, badge, gradient, or color value.
- **Always apply `mix-blend-mode: screen`** to every logo `<img>`.
- **Always include the Ahrefs script** in `<head>` — snippet in `mcpdemo-design`.
- **Always update `sitemap.xml`** alongside tool page deploys — same batch.
- **Always use the one-liner verbatim** from the sheet on the card and hero.
- **Always include the footer year script:**
  `<script>document.getElementById('yr').textContent = new Date().getFullYear();</script>`
- **Autofill fix on demo input** is required — prevents white-on-white unreadable autofill:
  ```css
  #userInput:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #0d1528 inset !important;
    -webkit-text-fill-color: #e8edf5 !important;
  }
  ```
- **One tool per session.** Do not batch multiple tool builds. Quality suffers,
  context fills, and the completion message gets muddled.
- **Do not purge Cloudflare cache.** Token lacks the permission, and natural
  propagation is fine. Any "purge needed" step must be dropped or noted as
  user-action-optional.
- **Do not initiate a credential rotation** unless the user explicitly asks.
  Keys in Worker secrets from prior sessions remain valid.

---

## Edge Cases

**Tool not in the sheet:** Add it via `MCPDEMO:add_row_to_sheet` populating
all columns including `Demo Type` before proceeding.

**Slug conflict:** A slug already in repo for a different tool → stop, flag
to user before writing anything.

**File size over budget:** Trim a use case section or shorten how-to steps.
If `tools/index.html` overflows, flag — grid may need pagination.

**Research turns up contradictions / fabricated claims:** Tell the user, ask
for a source. Never build on unverified technical claims.

**Type A Worker deploy fails partway:** `mcpdemo-deploy` handles rollback
semantics — it won't mark sheet columns Done for files without commit SHAs.
Surface the specific failure to the user, do not proceed.

**Tool appears Type C, but user wants a live demo anyway** (came up with
Notion): this is possible via shared-token workspace (dedicated demo workspace
seeded with fake content), but dangerous — every visitor becomes the same
token holder. Push back: honest answer is Type C + "try it yourself" path.
If the user insists, flag it as a non-standard variant, require a dedicated
seeded workspace, document token-rotation burden, and note in `Notes` that
this is explicitly not the recommended pattern.

**Type C tool later ships bearer-token MCP:** Rebuild as Type A in a follow-up
session. Strike Type C justification from Notes. Move from "Info-only pages"
to "Confirmed live demos" in project instructions. Status `Published` → `Live`.

**`contentcreator_generate_content` blocked by security filter:** Write
content directly from research instead. Do not habitually substitute —
surface that the filter blocked this run.

---

## What Changed from the Prior Skill

(For anyone maintaining this skill.)

- Step 6.5 (explainer video) moved to `mcpdemo-explainer-video`
- Step 7 (deploy mechanics) moved to `mcpdemo-deploy`
- Partial build recovery moved to `mcpdemo-resume`
- Step narration removed — "Step 2 — Update Status" and similar announcements
  are silent
- Review-before-deploy changed to deploy-then-review — user is notified after
  Live, edits come via follow-up if needed
- Cloudflare cache purge step removed (MCP token permission gap, natural
  propagation is fine)
- Credential rotation closing removed (not a real hygiene issue for self-owned
  keys)
- Demo Type is now a sheet column, filled in once and trusted on resume
