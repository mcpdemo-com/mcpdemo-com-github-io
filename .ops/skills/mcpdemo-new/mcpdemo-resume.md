---
name: mcpdemo-resume
description: >
  Silent recovery for mcpdemo.com workflows interrupted by context compaction.
  Use automatically at the start of any session that begins with a compacted
  transcript referencing an mcpdemo build in progress. Replaces the long
  re-orientation preambles that used to surface to the user. This skill runs
  3 fast checks, reports one line, and hands off to the appropriate execution
  skill without further user input.
---

# MCPDemo Resume Skill

Called automatically at the start of any session where:
- The transcript summary mentions an mcpdemo tool or page build in progress
- The first user message is "continue", "resume", "pick up where we left off", or similar
- The user opens with a message that assumes prior build context

The goal is to reorient in **3 tool calls max** and surface exactly **one
sentence** to the user before resuming work.

---

## The 3-Check Procedure

Run these in order. Stop at the first one that tells you the state.

### Check 1 — Scratch Files Still Present

```
bash: ls -la /home/claude/*.html /home/claude/*.xml /home/claude/worker.js /home/claude/wrangler.toml 2>/dev/null
```

If files are present, note which ones. They survived the compaction and can
be redeployed directly via base64 if needed without rebuilding.

### Check 2 — Sheet Status of the Referenced Tool

Pull the tool name/slug from the transcript summary. Then:

```
MCPDEMO:search_sheet
  lookupColumn: Tool Name (or Slug)
  lookupValue: [name from transcript]
  sheetName: Tools Schedule
  spreadsheetId: 171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ
```

Read Tools Card, Info Page, Demo Page, Status, Demo Type columns. This is
the single source of truth for what's done.

### Check 3 — Repo Files Live

Only needed if Check 2 shows "In Progress" with ambiguous column states. Use
`MCPCIO:gitmanager_read_file` to check whether `tools/[slug]/index.html` and
`tools/[slug]/demo.html` exist. Don't read the files in full — a successful
read confirms existence.

---

## One-Sentence Handoff to User

After the checks, post one line and start work. Examples:

- **Mid-deploy interrupt:** *"Resuming [Tool] build — info + demo HTML live, sitemap pending."*
- **Mid-video interrupt:** *"Resuming [Tool] explainer video — 3 of 5 B-roll clips done, continuing."*
- **Effectively complete, just not marked:** *"[Tool] looks live in repo, marking sheet and closing out."*
- **Scratch files lost, need to rebuild:** *"Scratch files cleared after compaction — rebuilding from sheet state."*

No section headers, no bullet lists of what's done vs. what's not, no
re-statement of the transcript summary. The user already knows they asked for
this build to resume. Just do the next thing.

---

## What Not To Do

- **Do not re-read the entire transcript** before starting. The compaction
  summary at the top of the session is sufficient context. Reading the
  transcript file is only useful when the summary is missing a specific
  detail (e.g., a credential you need or a specific file path).
- **Do not re-run phases that were confirmed complete in the transcript
  summary.** Trust the sheet + repo state.
- **Do not rebuild files that still exist in `/home/claude/`.** They may
  have HMAC URLs expired (B-roll videos, images from more than 24h ago)
  but text files don't expire.
- **Do not ask the user "where should I pick up?"** The 3 checks answer
  that. Only ask if the checks genuinely show contradictory state (sheet
  says Live but files are missing in repo, or vice versa).

---

## Credential Continuity

If the transcript summary references a credential (Anthropic key, service
PAT) that was used to set Worker secrets in the prior session, do **not**
ask for it again — the secrets are already set on the Worker from that
session. Only ask for a credential if:
- The user explicitly says to rotate it
- A new Worker needs to be created this session that wasn't created before
- A secret was shown to have failed to save in the transcript

The default assumption is: Worker secrets from prior sessions are still
good. Do not speculate about credential rotation.
