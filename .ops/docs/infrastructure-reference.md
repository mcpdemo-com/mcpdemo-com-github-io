# MCP Demo Infrastructure Reference
**Captured:** 2026-04-19

Single source of truth for all IDs, accounts, endpoints, and credentials
(credential *locations*, not values — secrets stay in their respective stores).

---

## Ownership & Contact

| Item | Value |
|---|---|
| Entity | Effinsoftware.com, INC. (Wyoming corp) d/b/a MCP Demo |
| Primary contact | robert@mcpdemo.com |
| Registered address | 2232 Dell Range Blvd, Suite 245-3069, Cheyenne, WY 82009 |

## Domain & DNS

| Item | Value |
|---|---|
| Primary domain | mcpdemo.com |
| Registrar | GoDaddy (original nameservers: ns75.domaincontrol.com, ns76.domaincontrol.com) |
| DNS provider | Cloudflare (art.ns.cloudflare.com, demi.ns.cloudflare.com) |
| Cloudflare Zone ID | `214bb66c6ec4f28e2ef4304953c2f777` |
| Plan | Free |

## Cloudflare Account

| Item | Value |
|---|---|
| Account name | Robert@mcpdemo.com's Account |
| Account ID | `95a6a63fa32b59d71a479df87cd46fd3` |

### Cloudflare Workers (all live)

| Worker | Route | Secrets Required |
|---|---|---|
| `mcpdemo-shopify-proxy` | `api.mcpdemo.com/proxy/shopify*` | `MCPCIO_TOKEN` |
| `mcpdemo-web-search-proxy` | `api.mcpdemo.com/proxy/web-search*` | `MCPCIO_TOKEN` |
| `mcpdemo-github-proxy` | `api.mcpdemo.com/proxy/github*` | `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` |
| `mcpdemo-playwright-proxy` | `api.mcpdemo.com/proxy/playwright*` | `ANTHROPIC_API_KEY` |
| `mcpdemo-filesystem-proxy` | `api.mcpdemo.com/proxy/filesystem*` | `ANTHROPIC_API_KEY` |
| `mcpdemo-supabase-proxy` | `api.mcpdemo.com/proxy/supabase*` | `ANTHROPIC_API_KEY`, `SUPABASE_PAT`, `SUPABASE_PROJECT_REF` |

Source code for each Worker is in the repo under `workers/[name]/worker.js` +
`workers/[name]/wrangler.toml`.

**Note:** Cloudflare MCP connector token does NOT have cache-purge permission.
If cache purge is ever needed, use the dashboard's "Purge Everything" button.

## GitHub

| Item | Value |
|---|---|
| Org / repo | `mcpdemo-com/mcpdemo-com-github-io` |
| Hosting | GitHub Pages (serves `mcpdemo.com` directly) |
| Branch | `main` |
| Path convention | No leading slash in API calls (`tools/github/index.html`, not `/tools/...`) |

## Google Sheets

| Sheet | Spreadsheet ID | Primary tab |
|---|---|---|
| Social Posts queue | `1QtMUL2UitER-cDmOGKitpGfOgKG7lNsGedwrQO5KnFk` | `Posts` |
| Tools Schedule | `171TfkeNFCEI90FgSDAV7WhLwPAeXrPB-AZMHW44trjQ` | `Tools Schedule` |

The Pinterest tracking tab lives inside the Social Posts sheet (see `mcpdemo-social-pinterest` skill for details).

## MCPDEMO Platform

| Item | Value |
|---|---|
| Admin URL | `app.mcpcio.com` |
| Facebook Page ID | `1034428903089037` |
| Instagram `pageId` | `1034428903089037` (same as FB — used for routing) |
| Newsletter form (MCPDEMO platform) | `h0o8j951` |
| Newsletter form (MCPCIO-hosted embed) | submit: `POST https://app.mcpcio.com/api/forms/sqt6qbtd/submit` |
| Contact form | `afucvq2p` |
| Pipeline ID | `121` |
| MCPDEMO connector UUID | `cf30ff04-1566-48a4-a53d-f392302aa7fd` |

## Pinterest

| Item | Value |
|---|---|
| App ID | `1558559` |
| MCP Tool Demos board | `1125337094330339748` |
| MCP Updates board | `1125337094330339691` |
| Access status (April 2026) | Trial access only; `pinterest_create_pin` returns error 29 until Standard access approved |

## Service Credentials — Where They Live

**Critical:** none of these are stored here. This is a pointer guide only.

| Credential | Stored in | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Cloudflare Worker secrets (per Worker) | Same key across all mcpdemo.com Workers |
| `MCPCIO_TOKEN` | Cloudflare Worker secrets (Shopify + Web Search) | From mcpcio.com admin |
| `GITHUB_TOKEN` | Cloudflare Worker secret (GitHub Worker only) | PAT with repo scope |
| `SUPABASE_PAT` | Cloudflare Worker secret (Supabase Worker) | Supabase personal access token |
| `SUPABASE_PROJECT_REF` | Cloudflare Worker secret (Supabase Worker) | Public identifier, not a secret but stored with secrets |
| MCPDEMO API credentials | MCPDEMO / MCPCIO platform | Managed via `app.mcpcio.com` |
| Facebook / Instagram access tokens | MCPDEMO server-side | Never exposed to Claude |
| Pinterest OAuth token | Pinterest + MCPDEMO server-side | Refresh via Pinterest developer portal |
| Cloudflare API token | Cloudflare MCP connector OAuth | Re-authorize via Anthropic connector settings if needed |

## ElevenLabs Voice (for video narration)

| Item | Value |
|---|---|
| Voice name | Eric |
| Voice ID | `cjVigY5qzO86Huf0OWal` |
| Model | `eleven_multilingual_v2` |
| Stability | `0.6` |

Used across all explainer videos for consistency.

## Models Used

| Purpose | Model |
|---|---|
| Worker-proxied demos | `claude-haiku-4-5-20251001` |
| Content generation via contentcreator | (service-managed, check `mcpcio:contentcreator_validate_config`) |
| Image generation (social, tool page, video thumbnails) | Nano Banana 2 via `MCPCIO:visual_create` |
| Video generation (B-roll) | Veo via `MCPCIO:visual_create output=video` |

## Anthropic API Version Headers

| Use case | Header |
|---|---|
| Standard API calls | `anthropic-version: 2023-06-01` |
| MCP client (for `mcp_servers` parameter) | `anthropic-beta: mcp-client-2025-04-04` |

Auth field for MCP servers: `authorization_token` (not `headers.Authorization`).
