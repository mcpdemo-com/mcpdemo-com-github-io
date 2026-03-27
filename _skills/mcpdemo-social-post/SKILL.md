---
name: mcpdemo-social-post
description: Posts the next scheduled MCPDemo social media content to Facebook and Instagram, then updates the tracking sheet. Use this skill whenever the user says anything like "post today's social content", "post the next social post", "run the social posts", "do the social media", "post to FB and IG", or "post MCPDemo content". Always use this skill — do not try to improvise the posting workflow from memory, as it requires exact IDs and a specific update sequence.
---

# MCPDemo Social Media Posting Skill

Posts the next pending Facebook + Instagram post pair from the schedule sheet, then marks both rows as Posted with timestamps and post URLs.

---

## Required Tools (must be available)
- `MCPDEMO:search_sheet` — find pending rows
- `MCPDEMO:post_to_social_media` — publish to FB and IG
- `MCPDEMO:update_sheet_row` — mark rows as Posted

---

## Fixed Asset IDs (never change these)

| Asset | Value |
|---|---|
| Sheet ID | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` |
| Sheet Tab | `Posts` |
| Facebook pageId | `1034428903089037` |
| Instagram pageId | `1034428903089037` |

---

## Sheet Column Reference

| Column | Notes |
|---|---|
| Post ID | Facebook = `P###`, Instagram = `P###B` |
| Scheduled Date | YYYY-MM-DD |
| Platform | `facebook` or `instagram` |
| Post Text | Use exactly as written — do not paraphrase |
| Hashtags | Instagram only — append to end of Post Text |
| Image URL | Required for Instagram; include for Facebook too |
| Status | `Pending` → set to `Posted` |
| Posted At | ISO 8601 timestamp — set after posting |
| Post URL | URL returned by post_to_social_media — set after posting |

---

## Step-by-Step Process

### Step 1 — Find next pending pair

```
MCPDEMO:search_sheet
  spreadsheetId: 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk
  sheetName: Posts
  lookupColumn: Status
  lookupValue: Pending
```

From the results, take the **lowest-numbered Post ID pair** — one `P###` (Facebook) and one `P###B` (Instagram). These are always the same topic for the same date.

Tell the user: "Today's post is: **[Topic]** scheduled for [Date]. Posting now..."

### Step 2 — Post to Facebook

```
MCPDEMO:post_to_social_media
  platform: facebook
  pageId: 1034428903089037
  message: [Post Text — NO hashtags on Facebook]
  imageUrl: [Image URL from sheet]
```

Save the returned post URL as `fb_url`.

### Step 3 — Post to Instagram

```
MCPDEMO:post_to_social_media
  platform: instagram
  pageId: 1034428903089037
  message: [Post Text] + "\n\n" + [Hashtags]
  imageUrl: [Image URL from sheet]
```

⚠️ Instagram **always** requires `imageUrl`. Never post to Instagram without it.
⚠️ Hashtags go at the **end of the caption**, separated by two newlines.

Save the returned post URL as `ig_url`.

### Step 4 — Update Facebook row

```
MCPDEMO:update_sheet_row
  spreadsheetId: 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk
  sheetName: Posts
  lookupColumn: Post ID
  lookupValue: [P###]
  updates:
    Status: Posted
    Posted At: [current ISO timestamp, e.g. 2026-03-27T12:00:00Z]
    Post URL: [fb_url]
```

### Step 5 — Update Instagram row

```
MCPDEMO:update_sheet_row
  spreadsheetId: 1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk
  sheetName: Posts
  lookupColumn: Post ID
  lookupValue: [P###B]
  updates:
    Status: Posted
    Posted At: [current ISO timestamp]
    Post URL: [ig_url]
```

### Step 6 — Confirm to user

Report back:
```
✅ Posted: [Topic]

Facebook → [fb_url]
Instagram → [ig_url]

Sheet updated. Next post: [next Pending row topic + date]
```

---

## Rules

- **Always use Post Text exactly as written** — never rewrite or summarize
- **Facebook never gets hashtags** — they are for Instagram captions only
- **Always update the sheet** — both rows, immediately after posting
- **If an image URL fails** — tell the user and ask them to supply a replacement before proceeding
- **If no Pending rows exist** — tell the user the schedule is fully