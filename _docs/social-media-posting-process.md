# MCPDemo — Social Media Posting Process

**Last Updated:** March 27, 2026  
**Maintained by:** robert@mcpdemo.com

---

## Overview

This document describes the complete process for posting scheduled MCPDemo social media content to Facebook and Instagram. Follow this process in any new Claude chat session to pick up exactly where the last one left off.

---

## Assets

| Asset | Link |
|---|---|
| **Social Media Posting Schedule (Google Sheet)** | https://docs.google.com/spreadsheets/d/1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk/edit |
| **Sheet ID** | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` |
| **Sheet Tab** | `Posts` |
| **Facebook Page ID** | `1034428903089037` |
| **Instagram Page ID** | `1034428903089037` (Instagram ID: `17841442035245067`) |
| **Facebook Page** | https://www.facebook.com/122103663356984202 |
| **Instagram Account** | @mcpdemo |

---

## Sheet Column Reference

| Column | Description |
|---|---|
| Post ID | Unique ID — Facebook posts use `P###`, Instagram use `P###B` |
| Scheduled Date | Date the post should go live (YYYY-MM-DD) |
| Platform | `facebook` or `instagram` |
| Topic | Subject of the post |
| Post Text | Full post copy — use exactly as written |
| Hashtags | Hashtags (Instagram only — paste at end of Post Text) |
| Image URL | Unsplash image URL to attach |
| Status | `Pending` → `Posted` |
| Posted At | ISO timestamp when posted |
| Post URL | Direct link to the live post |

---

## Step-by-Step Posting Process

### Step 1 — Find the next pending posts

Ask Claude to run:
```
Search the MCPDemo Social Media Posting Schedule sheet 
(ID: 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk)
for all rows where Status = "Pending", tab = "Posts"
```

Identify the **lowest-numbered Post ID pair** with Status = Pending.  
Each day has two rows: one Facebook (`P###`) and one Instagram (`P###B`).

### Step 2 — Post to Facebook

Use `MCPDEMO:post_to_social_media` with:
- `platform`: `facebook`
- `pageId`: `1034428903089037`
- `message`: the **Post Text** from the sheet (no hashtags on Facebook)
- `imageUrl`: the **Image URL** from the sheet

### Step 3 — Post to Instagram

Use `MCPDEMO:post_to_social_media` with:
- `platform`: `instagram`
- `pageId`: `1034428903089037`
- `message`: the **Post Text** + **Hashtags** combined (paste hashtags at end)
- `imageUrl`: the **Image URL** from the sheet
- ⚠️ Instagram **requires** an image — never post without `imageUrl`

### Step 4 — Update the sheet

For each posted row, use `MCPDEMO:update_sheet_row` with:
- `lookupColumn`: `Post ID`
- `lookupValue`: the Post ID (e.g. `P003`)
- `updates`:
  - `Status` → `Posted`
  - `Posted At` → current ISO timestamp (e.g. `2026-03-27T12:00:00Z`)
  - `Post URL` → the URL returned by `post_to_social_media`

Repeat for both the Facebook row and Instagram row.

---

## Exact Prompt to Use in Any New Chat

Paste this at the start of any new Claude session (within the MCPDemo project):

```
Post the next pending MCPDemo social media content.

Process:
1. Read the MCPDemo Social Media Posting Schedule sheet 
   (ID: 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk, tab: Posts)
2. Find the next pair of rows where Status = "Pending"
3. Post the Facebook row to pageId 1034428903089037
4. Post the Instagram row to pageId 1034428903089037 (include hashtags in caption)
5. Update both rows: Status = Posted, Posted At = now, Post URL = returned URL

For full process details see:
https://github.com/mcpdemo-com/mcpdemo-com-github-io/blob/main/_docs/social-media-posting-process.md
```

---

## Post History Log

| Post ID | Date | Platform | Topic | Status | Post URL |
|---|---|---|---|---|---|
| P001 | 2026-03-26 | Facebook | MCP Security: CursorJack Attack | ✅ Posted | https://www.facebook.com/122103663356984202/posts/122104235876984202 |
| P001B | 2026-03-26 | Instagram | MCP Security: CursorJack Attack | ✅ Posted | https://www.instagram.com/p/DWUXP5PEiqX/ |
| P002 | 2026-03-26 | Facebook | 2026 MCP Roadmap is Live | ✅ Posted | https://www.facebook.com/122103663356984202/posts/122104537256984202 |
| P002B | 2026-03-26 | Instagram | 2026 MCP Roadmap is Live | ✅ Posted | https://www.instagram.com/p/DWW4Iiqkm1t/ |
| P003 | 2026-03-27 | Facebook | MCP Is Now on Every Executive Agenda | ✅ Posted | https://www.facebook.com/122103663356984202/posts/122104835552984202 |
| P003B | 2026-03-27 | Instagram | MCP Is Now on Every Executive Agenda | ✅ Posted | https://www.instagram.com/p/DWZYXhpEzPW/ |

---

## Notes

- Facebook posts do **not** include hashtags — they are omitted intentionally
- Instagram posts **always** require an image URL
- Post copy in the sheet is final — use it exactly as written, do not paraphrase
- If a post fails, check that the image URL is still publicly accessible (Unsplash URLs can expire)
- The sheet is the single source of truth — always update it immediately after posting
