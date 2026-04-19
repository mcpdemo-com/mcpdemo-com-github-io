# mcpdemo.com — Operations Backup

**Purpose:** This directory is a complete operational snapshot of mcpdemo.com
as of April 2026. If claude.ai becomes unavailable, corrupted, or you lose
access to your account, this bundle contains everything needed to keep the
site running — either via another AI assistant, a human developer, or
yourself working manually.

**Captured:** 2026-04-19

---

## What's Here

```
.ops/
├── README.md                              ← you are here
├── project-instructions/
│   └── mcpdemo-project-instructions.md    ← paste into any new AI project
├── docs/
│   ├── infrastructure-reference.md        ← all IDs, accounts, endpoints
│   └── memory-snapshot.md                 ← Claude's accumulated knowledge
└── skills/
    ├── mcpdemo/                           ← current production skills
    ├── mcpdemo-new/                       ← restructured skills (Apr 2026)
    ├── dfw/                               ← sister project skills
    └── shared/                            ← cross-project utilities
```

---

## Panic-Mode Checklist

**"Claude.ai is gone / I can't log in / my account is broken."**

The site itself is fine — it keeps running without any AI involvement. Here's
what you actually need to do in order of urgency:

### 1. Confirm the site is still up (30 seconds)
Visit `https://mcpdemo.com` in a browser. If it loads, the crisis is contained
— the problem is tooling access, not the site. Read on.

### 2. Confirm you still have your accounts (5 minutes)
Log into:
- GitHub → can you see `mcpdemo-com/mcpdemo-com-github-io`?
- Cloudflare → can you see the `mcpdemo.com` zone?
- Google → can you see the Tools Schedule sheet?
- mcpcio.com → can you log into `app.mcpcio.com`?

If you can access these, the infrastructure is yours. The only thing you've
lost is the Claude workflow layer.

### 3. Triage what you actually need to do
- **Just need to ship a typo fix or small edit?** Edit directly in GitHub's
  web UI. Commit to `main`. GitHub Pages redeploys in ~2 minutes.
- **Need to post social media manually?** Log into Meta Business Suite and
  post directly to the Facebook page (ID `1034428903089037`). Crosspost to
  Instagram from the same panel.
- **Need to build a new tool page?** See "Rebuilding the Workflow" below.

### 4. Decide on a recovery path
- **Wait it out** — if claude.ai is just having an outage, come back in a
  few hours. Nothing breaks while you wait.
- **Switch to Claude Code** — the skills in this bundle are markdown and
  portable. You can invoke them against the same GitHub repo from a terminal
  with Claude Code installed. See `docs/infrastructure-reference.md` for
  credentials needed.
- **Switch to another AI tool** — the skills work with any MCP-capable AI
  client. Paste the project instructions + relevant skills as system prompts.
- **Work manually** — everything can be done by hand through each service's
  native UI. Slower, but it all works.

---

## Rebuilding the Workflow Elsewhere

If you're moving off claude.ai entirely or setting up a parallel environment:

### Step 1 — Set up the AI tool
Whatever tool you use (Claude Code, another MCP client, or a future Claude.ai
account):
- Connect to the same MCP servers: MCPDEMO, MCPCIO, Cloudflare MCP
- Authorize access to the same Google Sheets
- Connect to GitHub with a PAT that has repo write on `mcpdemo-com/mcpdemo-com-github-io`

### Step 2 — Install the project instructions
Copy the contents of `project-instructions/mcpdemo-project-instructions.md`
into the new tool's custom instructions / system prompt / project context.

### Step 3 — Install the skills
The markdown files under `skills/` can be pasted into any tool that supports
a skill or context injection system. For Claude specifically, each skill
directory can be zipped into a `.skill` bundle and installed via the Anthropic
skills interface.

The four most recent (and recommended) skills live in `skills/mcpdemo-new/`:
- `mcpdemo-tool-page.md` — orchestrator for new tool pages
- `mcpdemo-deploy.md` — deploy plumbing (base64, git, Workers, sitemap)
- `mcpdemo-explainer-video.md` — 80-90s narrated explainer video pipeline
- `mcpdemo-resume.md` — silent compaction recovery

The older full-featured skills in `skills/mcpdemo/` are the pre-restructure
versions. Use whichever set works best with your new tool.

### Step 4 — Restore credentials to services
Credentials live in the services themselves (Cloudflare Workers, GitHub, etc.),
not in claude.ai. If you're setting up a brand-new AI tool, you don't need to
re-set any credentials — they're already where they need to be.

If a credential was lost (e.g., you don't know the Anthropic API key anymore):
- Anthropic keys → regenerate at console.anthropic.com
- GitHub tokens → regenerate at github.com/settings/tokens with `repo` scope
- Supabase PAT → regenerate in Supabase dashboard → Account → Access Tokens
- Cloudflare API token → regenerate in Cloudflare dashboard → My Profile → API Tokens

Then update the relevant Worker secret via Cloudflare dashboard.

---

## What's NOT Backed Up Here (and why)

- **Credentials & API keys** — they live in the services (Cloudflare Workers
  secret store, GitHub token settings, etc.). If you have account access, you
  have credential access. If you don't, backing them up here wouldn't have
  helped anyway.

- **Conversation history** — Claude.ai's past chats are stored in Anthropic's
  systems. If your account is corrupted, they may be recoverable via support
  at support.anthropic.com. Not backable from inside a conversation.

- **Auto-generated memories** — documented as a snapshot in
  `docs/memory-snapshot.md` but the actual memory store is internal to Claude.

- **Generated media** (images, videos, audio) — the *sources* live in
  MCPCIO / ElevenLabs / Veo. The *finished archived versions* live in the
  GitHub repo at `images/`. Anything archived is permanent. Anything not
  archived was ephemeral and can be regenerated.

- **The live Cloudflare Workers** — their source code is in the repo under
  `workers/*/`. The *running* instances are in Cloudflare. If a Worker is
  ever deleted, redeploy from the source in the repo.

---

## What TO Back Up Separately

This bundle covers the operational knowledge. A few items live elsewhere
and deserve their own backup hygiene:

1. **GitHub repo** — already distributed by design (every clone is a backup).
   Consider enabling GitHub's repo archive export if you want a local snapshot.

2. **Google Sheets** — download as .xlsx from Google Drive periodically, or
   set up Google Takeout for automatic exports.

3. **Cloudflare config** — no native export, but every Worker's source lives
   in the repo. Routes and zone config can be reconstructed from
   `docs/infrastructure-reference.md`.

4. **Domain** — GoDaddy holds the registration. Keep that account secure
   (2FA, recovery email current).

---

## How Often Should This Backup Be Refreshed?

- **After any significant skill change** — run the backup flow to capture
  the new skill content
- **Monthly regardless** — so infrastructure changes (new Workers, new Sheet
  tabs, etc.) get captured
- **Before any risky operation** — account migration, platform changes, etc.

To refresh: ask Claude in a new session, "update the .ops backup bundle in
the mcpdemo repo." The backup procedure is idempotent — it overwrites the
previous bundle with current state.

---

## Questions to Answer When Everything Breaks

Work through these in order:

1. Is the site still serving pages? → Yes: problem is tooling, not site.
2. Do I have GitHub access? → Yes: I can edit the site manually.
3. Do I have Cloudflare access? → Yes: I can manage Workers and DNS.
4. Do I have mcpcio.com access? → Yes: social posting still possible.
5. Do I have Google Drive access? → Yes: sheets and tracking intact.

If all five are yes, **you haven't lost anything that matters.** The worst
case is having to work without AI assistance for a while. The site keeps
running, and all your work keeps working.

If one of those is no, see the "Panic-Mode Checklist" above for that specific
service.
