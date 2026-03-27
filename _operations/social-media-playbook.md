# MCPDemo Social Media Operations Playbook
**Last Updated:** March 27, 2026  
**Owner:** robert@mcpdemo.com  
**Brand:** mcpdemo.com — Model Context Protocol · Servers · Clients · Demonstrations

---

## How to Request the Next Social Posts in Any Chat

Paste this prompt at the start of a new Claude session (within the MCPDemo project):

> "Generate the next week of social media posts for MCPDemo. Read the current schedule from the Google Sheet (ID: `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk`), find the last scheduled post, continue from the next date, tie posts to the tools launch schedule from the Tools Planner sheet (ID: `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ`), and add all new rows to the Posts tab. Then document anything new in `_operations/social-media-playbook.md` on GitHub."

Claude will:
1. Read the sheet to find where posts left off
2. Check the Tools Planner for which tool launches that week
3. Write 14 new posts (2 per day × 7 days: Facebook + Instagram)
4. Add all rows directly to the sheet

---

## Key Resources

| Resource | Link / ID |
|---|---|
| Social Media Sheet | [Open Sheet](https://docs.google.com/spreadsheets/d/1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk/edit) · ID: `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` |
| Tools Content Planner | [Open Sheet](https://docs.google.com/spreadsheets/d/171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ/edit) · ID: `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ` |
| GitHub Repo | `mcpdemo-com/mcpdemo-com-github-io` |
| Live Site | https://mcpdemo.com |
| Contact | robert@mcpdemo.com |

---

## Sheet Structure (Posts Tab)

| Column | Description |
|---|---|
| Post ID | P001, P001B, P002, P002B... (B = Instagram version of same topic) |
| Scheduled Date | YYYY-MM-DD |
| Platform | `facebook` or `instagram` |
| Topic | Short descriptive title |
| Post Text | Full copy, ready to paste |
| Hashtags | Instagram only (Facebook posts have no hashtags) |
| Image URL | Unsplash URL (1080px wide) |
| Status | `Pending` → `Posted` |
| Posted At | ISO timestamp when posted |
| Post URL | Live URL of the published post |

---

## Content Strategy

### Post Cadence
- **2 posts per day** — one Facebook, one Instagram
- **1 topic per day** shared across both platforms
- Facebook: longer form (150–250 words), no hashtags, story-driven
- Instagram: shorter (80–120 words), bullet-point format, 10 hashtags, 1–2 emojis

### Topic Mix (rotate weekly)
1. **Tool Launch** — announce the day's new demo page on mcpdemo.com (tied to Tools Planner schedule)
2. **MCP News** — industry developments, new servers, ecosystem updates
3. **MCP Education** — plain-English explainers for non-technical audiences
4. **MCP Use Case** — concrete workflow improvements using specific tools
5. **MCP Debate/Opinion** — takes on ecosystem direction, security, enterprise adoption

### Writing Rules
- Plain English. No jargon without explanation.
- Active voice always: "Claude connects to your calendar" not "your calendar is connected by Claude"
- Never say "mockup" — always "live connection" or "real data"
- Always end with a link: `mcpdemo.com` or `mcpdemo.com/tools/[slug]/`
- Facebook posts: no hashtags, no emojis
- Instagram posts: max 10 hashtags, placed after the CTA line

### Image Guidelines
- Source: Unsplash (`?w=1080&q=80` params)
- Style: tech/abstract/professional — dark backgrounds preferred to match brand
- Never use stock photo clichés (handshakes, lightbulbs, generic laptops)

---

## Tools Launch → Post Alignment

Posts are tied to the daily tool builds from the Tools Content Planner:

| Date | Tool | Post Topic Angle |
|---|---|---|
| Mar 27 | GitHub MCP | Launch + version control automation |
| Mar 28 | Playwright MCP | Launch + browser automation/QA |
| Mar 29 | Filesystem MCP | Launch + local file AI access |
| Mar 30 | Notion MCP | Launch + knowledge worker productivity |
| Mar 31 | Supabase MCP | Launch + natural language DB queries |
| Apr 1 | Slack MCP | Launch + team communication AI |
| Apr 2 | Salesforce MCP | Launch + CRM/enterprise AI |
| Apr 3 | Zapier MCP | Launch + 6,000 apps, one prompt |
| Apr 4 | Google Calendar | Launch + scheduling without tab switching |
| Apr 5 | Linear MCP | Launch + context switch elimination |
| Apr 6 | PostgreSQL MCP | Launch + talk to your database |
| Apr 7 | Brave Search MCP | Launch + privacy-first real-time search |
| Apr 8 | Context7 MCP | Launch + fresh docs not stale training data |
| Apr 9 | Firecrawl MCP | Launch + clean web content for AI |
| Apr 10 | Cloudflare MCP | Launch + edge infrastructure via AI |
| Apr 11 | n8n MCP | Launch + low-code workflow automation |
| Apr 12 | AWS Bedrock MCP | Launch + enterprise cloud AI orchestration |
| Apr 13 | Sentry MCP | Launch + observability in plain English |
| Apr 14 | MongoDB MCP | Launch + NoSQL natural language queries |
| Apr 15 | Figma MCP | Launch + design files via AI |
| Apr 16 | Pinecone MCP | Launch + vector memory for AI apps |
| Apr 17 | Docker MCP | Launch + containers via conversation |
| Apr 18 | Asana MCP | Launch + project management AI |
| Apr 19 | Vectara MCP | Launch + enterprise RAG |
| Apr 20 | Jira MCP | Launch + Atlassian AI integration |
| Apr 21 | Stripe MCP | Launch + payments data via AI |
| Apr 22 | Gmail MCP | Launch + email through conversation |
| Apr 23 | Shopify MCP | Launch + eCommerce AI management |
| Apr 24 | Chroma MCP | Launch + open-source vector DB |
| Apr 25 | Google Drive MCP | Launch + file organization via AI |

---

## Post History Summary

| Post ID | Date | Topic | Status |
|---|---|---|---|
| P001/P001B | Mar 26 | CursorJack Security Attack | ✅ Posted |
| P002/P002B | Mar 26 | 2026 MCP Roadmap | ✅ Posted |
| P003/P003B | Mar 27 | MCP on Executive Agenda (RSA) | Pending |
| P004/P004B | Mar 28 | MCPlexor 95% Token Reduction | Pending |
| P005/P005B | Mar 29 | MCP4H Human-Centric Extension | Pending |
| P006/P006B | Mar 30 | MCP + WebAssembly | Pending |
| P007/P007B | Mar 31 | MCP is the USB-C of AI | Pending |
| P008/P008B | Apr 1 | MCP Is a Fad — The Debate | Pending |
| P009/P009B | Apr 2 | Enterprise MCP Gap | Pending |
| P010/P010B | Apr 3 | Zapier MCP Launch | Pending |
| P011/P011B | Apr 4 | Google Calendar MCP Launch | Pending |
| P012/P012B | Apr 5 | Linear MCP Launch | Pending |
| P013/P013B | Apr 6 | PostgreSQL MCP Launch | Pending |
| P014/P014B | Apr 7 | Brave Search MCP Launch | Pending |
| P015/P015B | Apr 8 | Context7 MCP Launch | Pending |
| P016/P016B | Apr 9 | Firecrawl MCP Launch | Pending |

---

## Publishing Workflow

1. **8am ET** — Daily email reminder fires (MCPDEMO automation ID: 297)
2. Open the [Social Media Sheet](https://docs.google.com/spreadsheets/d/1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk/edit)
3. Find today's Pending posts (filter Status = Pending)
4. Copy Facebook post text → publish to Facebook page
5. Copy Instagram post text + hashtags → publish to Instagram
6. Update Status to `Posted`, fill in `Posted At` and `Post URL`

---

## Requesting New Posts (Detailed Instructions)

When posts run out or you want to get ahead, start a new chat in this Claude project and say:

> **"Generate next week's social posts."**

Claude will automatically:
- Read the sheet via MCPDEMO connector to find the last Post ID and date
- Read the Tools Planner to know which tools launch that week
- Write tool-launch-aligned posts for Facebook + Instagram
- Add all 14 rows to the Posts tab with Status = Pending
- Follow all brand voice and format rules in this playbook

No need to paste context — everything Claude needs is in this project's instructions and these two sheets.

---

## Operations Notes

- **Facebook hashtags:** None. Facebook's algorithm doesn't benefit from hashtags the way Instagram does.
- **Instagram image:** Always include the Unsplash URL in the sheet even if not used — useful for scheduling tools later.
- **Post ID convention:** P001 = Facebook, P001B = Instagram. Increment numerically per new topic, never per platform.
- **Status values:** `Pending` | `Posted` | `Skip` (if a post becomes irrelevant before publishing)
- **Time-sensitive posts:** MCP news posts (not tool launches) may go stale. If a "Pending" news post is more than 2 weeks old, mark it `Skip` and note the reason.
