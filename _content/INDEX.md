# MCPDemo — Claude Reference Index
> **START HERE.** Read this file at the beginning of any new chat working on MCPDemo.
> Tool: `mcpcio:gitmanager_read_file` · repo: `mcpdemo-com/mcpdemo-com-github-io` · path: `_content/INDEX.md`

---

## What is this repo?
This is the GitHub Pages site for **mcpdemo.com** — an educational showcase of Model Context Protocol (MCP) tools integrated with Claude AI.

- **Live site:** https://mcpdemo.com
- **GitHub repo:** mcpdemo-com/mcpdemo-com-github-io
- **Owner:** robert@mcpdemo.com | Effinsoftware.com, INC. (Wyoming) d/b/a MCP Demo

---

## All Reference Documents

| File | Purpose | Read When |
|---|---|---|
| `_content/INDEX.md` | **This file** — master index | Start of every session |
| `_content/SOCIAL-MEDIA-PLANNER.md` | Social content system, sheet ID, posting schedule, tone rules | Generating social posts |
| `_content/TOOLS-CONTENT-PLANNER.md` | MCP tool page build system, 30-tool schedule | Building tool pages |
| `_content/SITE-SPEC.md` | Full brand & design system | Building any site page |

---

## Key Asset IDs (Always Available Here)

| Asset | ID / URL |
|---|---|
| Social Media Sheet | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` |
| Tools Content Sheet | `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ` |
| Newsletter Form ID | `sqt6qbtd` |
| Newsletter Submit URL | `https://app.mcpcio.com/api/forms/sqt6qbtd/submit` |
| GitHub Repo | `mcpdemo-com/mcpdemo-com-github-io` |
| Live Site | `https://mcpdemo.com` |

---

## How to Start Any Work Session

### For social media posts:
```
1. Read _content/SOCIAL-MEDIA-PLANNER.md
2. Read sheet 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk to find last post
3. Generate next batch starting day after last scheduled date
4. Add rows with MCPDEMO:add_row_to_sheet
```

### For tool page builds:
```
1. Read _content/TOOLS-CONTENT-PLANNER.md
2. Read sheet 171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ for today's tool
3. Build: card + info page + demo page
4. Deploy via MCPDEMO or mcpcio:gitmanager_write_file
```

### For site pages:
```
1. Read _content/SITE-SPEC.md for brand/design rules
2. Use mcpdemo-plan skill before building
3. Deploy to mcpdemo-com/mcpdemo-com-github-io
```

---

## Quick-Paste Prompt for Any New Chat

> "Read _content/INDEX.md from the mcpdemo-com/mcpdemo-com-github-io GitHub repo using gitmanager_read_file, then tell me what you found and ask what I want to work on today."

---

*Last updated: March 27, 2026*
