---
name: mcpdemo-deploy
description: >
  Deploys HTML, CSS, JS, Workers, or sitemap files to the mcpdemo.com GitHub
  repo reliably. Use whenever writing any file larger than ~10KB to the repo,
  whenever updating sitemap.xml, or when deploying a Cloudflare Worker. This
  skill encapsulates the base64 roundtrip pattern, sitemap update flow, and
  Worker multipart-upload that have been hardened across multiple tool builds.
  Always use this skill for mcpdemo.com deploys — do not improvise.
---

# MCPDemo Deploy Skill

A tight execution skill for getting files from `/home/claude/` into the
`mcpdemo-com/mcpdemo-com-github-io` repo and (where applicable) onto
Cloudflare Workers. No narration, no multi-turn ceremony — deploy and report
commit SHAs.

---

## When This Runs

Called from inside other skills (`mcpdemo-tool-page`, `mcpdemo-explainer-video`,
ad-hoc fixes) whenever a file needs to land in the repo. **User never invokes
this directly** — they ask for the outcome ("build the tool page", "fix the
nav"), and the containing skill calls this.

The user should not see any step of this skill narrated. Deploy is plumbing.

---

## Fixed Asset IDs

| Asset | Value |
|---|---|
| Repo | `mcpdemo-com/mcpdemo-com-github-io` |
| Cloudflare Account ID | `95a6a63fa32b59d71a479df87cd46fd3` |
| Cloudflare Zone ID | `214bb66c6ec4f28e2ef4304953c2f777` |

**Repo path rule:** No leading slash. `tools/github/index.html`, never `/tools/github/index.html`.

---

## 1. HTML / CSS / JS / Text File Deploy

For files under ~8KB of text content, plain `content` + `content_encoding: text`
works. For anything larger, or anything containing special characters / em dashes
/ non-ASCII, always use the base64 pattern — it's never slower and it avoids
silent truncation and shell-escaping failures.

**Standard pattern:**

```
# 1. Write the file to /home/claude/[name]
create_file /home/claude/[name] ...

# 2. Base64-encode and verify roundtrip in one bash call
base64 -w 0 /home/claude/[name] > /tmp/[name]-b64.txt
base64 -d /tmp/[name]-b64.txt | diff - /home/claude/[name] && echo "roundtrip OK"

# 3. Cat the base64, paste into gitmanager_write_file
MCPCIO:gitmanager_write_file
  repo: mcpdemo-com/mcpdemo-com-github-io
  path: [target/path/in/repo]
  content: [base64 string, single line, no whitespace]
  content_encoding: base64
  message: [concise commit message, imperative mood]
```

**Success condition:** `gitmanager_write_file` returns a `commit_sha`. Record it. If no SHA is returned, the deploy failed — stop, report which file, do not continue.

**Never** use `MCPDEMO:deploy_landing_page_to_github` for manually-built HTML.
That tool is only for pages built inside the MCPDEMO landing page builder.

---

## 2. Sitemap Update — Always Paired with Tool Page Deploys

When deploying a new `tools/[slug]/` directory, sitemap.xml must be updated
in the **same deploy batch** — never in a separate follow-up commit.

**Pattern:**

1. Read current sitemap: `MCPCIO:gitmanager_read_file` with path `sitemap.xml`
2. Build the full updated content in `/home/claude/sitemap.xml`
3. Deploy via the base64 pattern above

**Info page `<url>` entry (always):**
```xml
<url>
  <loc>https://mcpdemo.com/tools/[slug]/</loc>
  <lastmod>[YYYY-MM-DD]</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.85</priority>
</url>
```

**Demo page `<url>` entry (always):**
```xml
<url>
  <loc>https://mcpdemo.com/tools/[slug]/demo.html</loc>
  <lastmod>[YYYY-MM-DD]</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.75</priority>
</url>
```

**If an explainer video exists for this tool** (`images/[slug]-explainer.mp4`
has been archived), add a `<video:video>` block nested inside the info page
`<url>` — see `mcpdemo-explainer-video` Step V7 for the exact format. Also
verify the `<urlset>` opening tag includes the video namespace:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
```

Add the video namespace if missing. https-only throughout — never http.

---

## 3. Cloudflare Worker Deploy (Type A Tools Only)

The Worker must exist at `api.mcpdemo.com/proxy/[slug]` before the demo
page is functional. Deploy via `Cloudflare:execute` — never manual dashboard
paste. The account ID is available in `Cloudflare:execute` as the pre-set
constant `accountId`.

**Step 3A — Write Worker files to GitHub for version control:**

```
workers/[slug]-proxy/worker.js
workers/[slug]-proxy/wrangler.toml
```

Use `workers/shopify-proxy/` as the starting template — read both files first,
adapt.

**Step 3B — Deploy the Worker script via multipart PUT:**

```javascript
async () => {
  const code = `[the full worker.js contents as a JavaScript string]`;
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-04-01"
  };
  const b = `F${Date.now()}`;
  const body = [
    `--${b}`,
    'Content-Disposition: form-data; name="metadata"',
    'Content-Type: application/json',
    '',
    JSON.stringify(metadata),
    `--${b}`,
    'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
    'Content-Type: application/javascript+module',
    '',
    code,
    `--${b}--`
  ].join("\r\n");

  return cloudflare.request({
    method: "PUT",
    path: `/accounts/${accountId}/workers/scripts/mcpdemo-[slug]-proxy`,
    body,
    contentType: `multipart/form-data; boundary=${b}`,
    rawBody: true
  });
}
```

Success condition: response `{ success: true }` and a `result.id` matching the worker name.

**Step 3C — Add the route to point `api.mcpdemo.com/proxy/[slug]*` at the Worker:**

```javascript
async () => {
  return cloudflare.request({
    method: "POST",
    path: `/zones/214bb66c6ec4f28e2ef4304953c2f777/workers/routes`,
    body: {
      pattern: "api.mcpdemo.com/proxy/[slug]*",
      script: "mcpdemo-[slug]-proxy"
    }
  });
}
```

**Step 3D — Set Worker secrets** (once per secret, idempotent):

List existing secrets first to avoid re-setting what's already there:

```javascript
async () => {
  return cloudflare.request({
    method: "GET",
    path: `/accounts/${accountId}/workers/scripts/mcpdemo-[slug]-proxy/secrets`
  });
}
```

Then PUT each needed secret that isn't already present:

```javascript
async () => {
  return cloudflare.request({
    method: "PUT",
    path: `/accounts/${accountId}/workers/scripts/mcpdemo-[slug]-proxy/secrets`,
    body: {
      name: "ANTHROPIC_API_KEY",
      text: "[value]",
      type: "secret_text"
    }
  });
}
```

**ANTHROPIC_API_KEY is shared across every mcpdemo.com Worker.** If you don't
have it in session memory, ask the user **once**: *"Need the Anthropic API key
for the new Worker — paste when ready."* Cache for the remainder of the session.
Never ask again in the same conversation.

Per-tool tokens (Shopify access token, GitHub PAT, Supabase PAT, etc.) must be
requested per-tool at tool build time.

---

## 4. What Not To Do

- **Do not purge the Cloudflare cache.** The current MCP token lacks
  `#cache_purge` permission — it returns `10000 Authentication error` every
  time. GitHub Pages + Cloudflare propagate new pages naturally within
  ~2–5 minutes, which is fine for any non-emergency deploy. If an instant
  purge is ever genuinely needed, the user can click "Purge Everything" in
  the Cloudflare dashboard — takes 5 seconds, doesn't go through this skill.
- **Do not test the Worker from this container.** Egress rules block
  `api.mcpdemo.com`. `Cloudflare:execute` sandbox also blocks self-requests
  to same-account domains (returns 403 "Forbidden" — this is sandbox
  behaviour, not a real Worker error). Smoke test is a user-browser task.
- **Do not re-deploy a file that hasn't changed.** Read first, diff in
  your head or with `bash diff`, only write if content differs.
- **Do not announce each deploy step to the user.** This is plumbing.
  The calling skill handles the user-facing summary once deploys succeed.

---

## 5. Output Contract

Every deploy returns one of two things to the calling skill:

- **Success:** `{ path, commit_sha }` per file, `{ worker_id }` for Workers,
  `{ route_id }` for routes, `{ success: true }` for secrets.
- **Failure:** Exact error message and the file/step that failed. Stop — do
  not continue the parent workflow.

The calling skill collects these and presents a single-line completion
summary to the user at the end.
