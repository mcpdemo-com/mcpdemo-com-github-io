# MCPDemo — Social Media Content Planner
> **Reference doc for Claude.** Any chat session can read this file using:
> `mcpcio:gitmanager_read_file` · repo: `mcpdemo-com/mcpdemo-com-github-io` · path: `_content/SOCIAL-MEDIA-PLANNER.md`

---

## Overview

| Field | Value |
|---|---|
| Brand | MCPDemo — mcpdemo.com |
| Tagline | Servers · Clients · Demonstrations |
| Audience | Developers building with MCP, businesses evaluating MCP tools, AI/LLM enthusiasts |
| Tone | Educational, direct, plain English, active voice, no jargon without explanation |
| Contact | robert@mcpdemo.com |

---

## Social Media Planner Sheet

| Field | Value |
|---|---|
| **Google Sheet URL** | https://docs.google.com/spreadsheets/d/1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk/edit?gid=1642531556 |
| **Spreadsheet ID** | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` |
| **Primary tab** | First tab (gid=1642531556) |
| **Read tool** | `MCPDEMO:read_google_sheet` with spreadsheetId above |
| **Add posts tool** | `MCPDEMO:add_row_to_sheet` with same spreadsheetId |

> ⚠️ If MCPDEMO sheet tools are unavailable in your session, use `tool_search` with query "read google sheet add row" to reload them. If they still fail, ask the user to open the sheet and share the last row so you know where to continue.

---

## Sheet Column Structure

| Column | Description |
|---|---|
| Post # | Sequential number (1, 2, 3…) |
| Date | Scheduled publish date (YYYY-MM-DD) |
| Platform | LinkedIn / X-Twitter / Instagram / Facebook |
| Content Type | Educational / MCP Tool Spotlight / Behind the Scenes / Engagement |
| Topic / Tool | What MCP tool or concept this post covers |
| Caption / Copy | Full post text ready to publish |
| Hashtags | Platform-appropriate hashtags |
| Status | Draft / Scheduled / Posted |
| Notes | Any special instructions |

---

## Posting Schedule

- **Frequency:** 5 posts per week, Monday–Friday
- **Platforms:** LinkedIn (long-form) + X/Twitter (short-form) — one post covers both
- **Email reminder:** Daily 8am ET to robert@mcpdemo.com (MCPDEMO automation)

---

## Content Themes (Rotate Weekly)

| Week Theme | Topics to Cover |
|---|---|
| MCP Explainer | What is MCP, USB-C analogy, N×M problem, how servers work |
| Tool Spotlight | Feature one MCP tool (GitHub, Notion, Slack, etc.) with demo link |
| Use Case | Real-world scenario: "Here's how MCP handles X" |
| Developer Tips | How to build an MCP server, best practices, gotchas |
| Community/News | MCP ecosystem news, new tool launches, adoption updates |

---

## Tone & Writing Rules

- Plain English — explain MCP as if the reader has never heard of it
- First use of "MCP" always gets the full expansion: "Model Context Protocol (MCP)"
- Active voice — "Claude connects to your calendar" not "Your calendar is connected by Claude"
- Short paragraphs — 2–3 sentences max in cards and explainers
- Never say "mockup" — always "live connection", "real data", "actual service"
- Never use purple in any graphics — brand colors are navy + cyan (#00d4ff)
- Always end LinkedIn posts with 🔗 mcpdemo.com
- Legal disclaimer where relevant: "Not affiliated with Anthropic, Google, or any third-party service demonstrated on this site."

---

## Brand Colors (for graphics)

```
--bg:     #080d1a   (near-black navy — background)
--cyan:   #00d4ff   (PRIMARY accent — use for highlights)
--blue:   #4a9eff   (secondary blue)
--txt:    #e8edf5   (primary text)
--muted:  #8899aa   (secondary text)
```

---

## How to Generate the Next Batch of Posts

When asked to create or continue social media posts in any chat session:

1. **Read this file first** using `mcpcio:gitmanager_read_file`
2. **Read the sheet** using `MCPDEMO:read_google_sheet` with spreadsheetId `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` to find the last scheduled post date and number
3. **Generate the next 5–10 posts** starting the day after the last scheduled post
4. **Add each post as a row** using `MCPDEMO:add_row_to_sheet`
5. **Confirm** with a summary table showing post #, date, platform, and topic

### Prompt to use in any new chat:
> "Read the MCPDemo social media planner from GitHub (_content/SOCIAL-MEDIA-PLANNER.md in mcpdemo-com/mcpdemo-com-github-io), check the sheet for where we left off, and generate the next week of posts."

---

## Related Planners & Sheets

| Planner | Sheet ID | Purpose |
|---|---|---|
| Social Media | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` | Social content calendar |
| Tools Content | `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ` | Tool page build schedule (30 tools) |

---

## Related GitHub Reference Docs

All reference docs live in `_content/` in the `mcpdemo-com/mcpdemo-com-github-io` repo:

| File | Purpose |
|---|---|
| `SOCIAL-MEDIA-PLANNER.md` | This file — social content system |
| `TOOLS-CONTENT-PLANNER.md` | MCP tool page build system (coming) |
| `SITE-SPEC.md` | Full site design system & brand spec (coming) |

---

*Last updated: March 27, 2026*
