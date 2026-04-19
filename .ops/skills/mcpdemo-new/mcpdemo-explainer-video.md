---
name: mcpdemo-explainer-video
description: >
  Generates and deploys an 80–90s narrated explainer video for any mcpdemo.com
  tool page. Use whenever the user says anything like "make the explainer
  video for [tool]", "add video to [tool] page", "generate the [tool]
  explainer", or when mcpdemo-tool-page invokes this skill as its video step.
  Produces narration audio, 5 script-matched Veo B-roll clips, thumbnail,
  merged MP4, archives to GitHub, and embeds the video-band on the info page.
  Runs independently of the tool page build — a Type A/B info page can ship
  without a video and the video can be added later.
---

# MCPDemo Explainer Video Skill

A self-contained skill for producing the 80–90 second explainer video that
sits at the top of every tool info page on mcpdemo.com. Previously embedded
as "Step 6.5" inside `mcpdemo-tool-page`; lifted here so it can run
independently and so tool pages can reach Live without being gated on Veo
rate limits.

---

## When This Runs

1. Called by `mcpdemo-tool-page` when building a tool page that should include
   a video from day one (user explicitly asks, or the standard flow includes it).
2. Called directly by the user for a tool page that already exists without a
   video: *"make the explainer video for Supabase"*.
3. Not run for Type C tools' demo pages — but Type C **info pages do get
   videos** (same as A/B), with a different closing CTA (see Step V1).

---

## Fixed Asset IDs

| Asset | Value |
|---|---|
| ElevenLabs Voice ID | `cjVigY5qzO86Huf0OWal` (Eric — American male, smooth/trustworthy) |
| ElevenLabs Model | `eleven_multilingual_v2` |
| ElevenLabs Stability | `0.6` |
| Veo Model | Used via `MCPCIO:visual_create` with `output: video` |
| Repo | `mcpdemo-com/mcpdemo-com-github-io` |

---

## Workflow — 8 Steps

Steps V1–V4 are creative work (write, narrate, generate B-roll). Steps V5–V7
are deployment (merge, archive, embed, sitemap).

---

### Step V1 — Write the Narration Script

Read the completed info page HTML at `tools/[slug]/index.html` (from GitHub
if not already in context). Extract in order:

- Hero `<h1>` and sub-paragraph → **Hook** (0–12s)
- "What MCP Actually Is" section → **What MCP is** (12–25s)
- "What Claude Can Actually Do" / tool table → **What Claude can do** (25–45s)
- Setup steps → **Setup** (45–62s)
- Use cases → **Use cases + CTA** (62–80s)

Write the narration as clean prose, no markdown. Target 75–85 words per
minute at a measured pace = ~80 seconds of audio. Confirm estimated read time
before moving on.

**Closing CTA (final 8–12 seconds) — branches by demo type:**

- **Type A/B:** *"Try it yourself at mcpdemo.com/tools/[slug]/demo."*
- **Type C:** *"See how to connect [Tool Name] to Claude at [tool's MCP docs
  URL spoken phonetically, e.g. developers dot notion dot com slash docs
  slash m-c-p]."* Never promise a live demo the site doesn't have.

---

### Step V2 — Generate Narration Audio + Whisper Timestamps

```
MCPDEMO:generate_speech
  voiceId: cjVigY5qzO86Huf0OWal
  model: eleven_multilingual_v2
  stability: 0.6
  text: [full narration script]
```

Save the returned `narration_url` (a permanent `app.mcpcio.com` URL).

Immediately run Whisper on the narration to get per-segment timestamps for
captions and the true duration:

```
MCPDEMO:analyze_media
  videoUrl: [narration_url]
  mode: whisper
  language: en
```

Save `actual_duration_seconds` from the result — this is the ground truth
for B-roll math in Step V5. The script word count is an estimate; this is real.

**Always review the Whisper transcript for proper noun errors.** Common
failures: "Cloud" instead of "Claude", "Model context" split from "Protocol",
names of tools mis-heard. Correct before building the captions array.

---

### Step V3 — Generate 5 Script-Matched B-Roll Clips

B-roll derives directly from the script. **There is no approved shot pool
or environment menu.** For each 15–20s window of the narration, the clip
is what a video producer would actually shoot for that exact line.

**Derivation process:**

1. Slice the narration into 5 contiguous time windows (roughly 15–20s each,
   each ending on a natural thought break — never mid-sentence).
2. For each window, read the exact words being narrated. Ask: *if a video
   producer were sourcing B-roll for this line, what would they shoot?*
3. The answer is the clip. Build the Veo prompt around that specific scene
   — named objects, named environment, named action.
4. When the video plays back, each 8s B-roll scene visually matches the
   caption the viewer sees during that window. Transitions happen between
   thoughts, not across them.

**Example (GitHub explainer, window 1 — "GitHub is where your code lives.
But navigating repos, issues, pull requests, and CI failures across multiple
projects means constant tab switching and manual scanning."):**

> A producer would shoot: a developer from behind, multiple monitors glowing
> with different content — the environment of fragmentation and context-switching.
>
> Not: "server rack" or "ethernet cable" — neither appears in the script.

**If a line has no literal visual** (e.g. explaining "open standard" or
"authentication boundary"), use a physical metaphor derived from the concept's
*meaning*: keycard on a desk = boundary; stack of folders = accumulated
knowledge. Derived, not menu-picked.

---

**❌ NEVER GENERATE — load the table from `mcpdemo-reels` before writing prompts.**

The authoritative NEVER GENERATE list of Veo failure modes lives in
`mcpdemo-reels` Step 1.5. Every entry there applies to 16:9 explainer clips
— Veo's failure modes are aspect-ratio-independent (readable text, keyboard
close-ups, hands typing, identifiable faces, etc.).

Load `/mnt/skills/user/mcpdemo-reels/SKILL.md` at the start of Step V3. If
a script-derived scene matches any never-generate entry, substitute using
that skill's column-3 suggestion immediately — do not attempt and QA-fail.

Do not re-duplicate the table here. Do not rely on memory for its contents.

---

**Prompt structure for every clip:**

```
[Specific scene derived from the narration window].
[Lighting]. [Depth of field].
No readable text. [No hands / No people — as appropriate]. Cinematic 16:9. Photorealistic.

reel_prompt: [One camera movement: slow push-in toward [focal point] /
slow dolly / gradual rack focus from [near] to [far] / slow drift across scene].
[What shifts or animates during the move]. Photorealistic.
```

---

### Step V3 Pacing — Staggered Generation (Veo 429 Avoidance)

**Do NOT fire all 5 clips in one turn.** Veo hits `429 RESOURCE_EXHAUSTED`
when too many video generations fire back-to-back in a short window.

**Always stagger:**
- **Turn 1:** Generate clips A, B, C (3 clips). Also run Whisper on narration
  in this turn if it hasn't been run yet.
- **Turn 2:** Generate clips D, E (2 clips). QA clips A, B, C against the
  Step V4 bar in this turn too. The natural gap between turns is usually
  enough to avoid the rate limit.

**If a 429 does hit mid-generation:** do not retry immediately. Use that
turn to run Whisper, QA completed clips, or generate the thumbnail. Then
retry the failed clip in the next turn.

---

### Step V4 — QA All 5 Clips

Run `MCPDEMO:analyze_media` with `mode: gemini` on each clip:

> *"Describe what's actually shown in 1–2 sentences. Flag any warping,
> morphing, gibberish text, or geometry that would make the scene
> unrecognizable."*

Gemini is a sanity check, not a pass/fail gate. Veo's baseline output has
minor artifacts — soft edge morphing, gibberish on non-hero surfaces,
"looks AI-generated" commentary — and all 4 currently-shipped explainers
on mcpdemo.com contain some of these. A viewer following the narration
does not notice them.

**Catastrophic failures only — retry if:**
- A dominant surface contains obvious gibberish text (a sign, label, or
  readable close-up of a button)
- Geometry breaks visibly mid-clip (a wall warps into another shape, an
  object morphs into something else, limbs deform)
- Scene contents don't match the script line (wrong subject, wrong environment)

**Accept if:**
- Gemini says "AI-generated" or "photorealistic with some artifacts"
- Soft gibberish on a background surface no viewer will read
- Subtle edge morphing on non-hero objects during transitions
- Dust particles that flicker unnaturally
- Any artifact present but not distracting from the narrated story

**If a clip fails catastrophically:**
- Retry once with a simpler shot — remove text-bearing surfaces, simplify
  geometry, different camera movement
- If the second attempt also fails, re-derive from the script line —
  pick a different literal visual that carries the same meaning
- Never merge a clip with a catastrophic failure

---

### Step V5 — Generate Thumbnail + Merge Video

**Thumbnail first (always):**

```
MCPCIO:visual_create
  output: image
  prompt: [Adapt clip A prompt for a still — same scene, 16:9, cinematic, photorealistic]
```

Archive immediately via the deploy skill:

```
MCPCIO:gitmanager_archive_image
  image_url: [returned URL]
  repo: mcpdemo-com/mcpdemo-com-github-io
  path: images/[slug]-explainer-thumb.jpg
  commit_message: Add [Tool Name] explainer video thumbnail
```

**B-roll math for the merge:**
```
min_clips_needed = ceil(actual_duration_seconds / 7) + 2
```
Each clip is ~8s but with 1s fade transitions each contributes 7s net after
the first. Example: 80.3s narration → 80.3/7 + 2 = 13.5 → 14 clips minimum.

Build `videoUrls` array by repeating clips A–E in narrative order until the
count is met. Preferred pattern: `A, A, B, B, C, C, C, D, D, E, E, E`
(= 12 clips for ~80s narration). Add more repeats of C and E if narration
exceeds 85s.

**Captions:** Build from Whisper segments — use **segment-level** timestamps,
not word-level. Each caption entry = one Whisper segment. Plain text only,
no emojis, no special characters. **First caption must start at `0.5`, not
`0.0`** — starting at 0.0 causes a static burn-in artifact on the first frame.

```
MCPDEMO:merge_media
  videoUrls: [array of HMAC clip URLs]
  audioUrl: [narration_url]
  captions: [array from Whisper segments, first at 0.5s]
  captionFontSize: 18
  captionPosition: bottom
  captionBackground: true
  captionColor: "#FFFFFF"
  transition: fade
  transitionDuration: 1.0
```

**No background music.** Explainer videos are narration-only. Music was
considered and deliberately dropped — information density at 80–90s competes
with technical terms for listener attention, and voice-only matches the
4 currently shipped explainers.

**HMAC URLs expire in 24 hours.** If the session may be interrupted before
merge completes, archive the 5 B-roll clips to GitHub first. If clips expire
before merge, regenerate all 5 — do not attempt to reuse expired URLs.

---

### Step V6 — Archive Merged Video + QA

Archive the merged MP4:

```
MCPCIO:gitmanager_archive_image
  image_url: [merge result URL]
  repo: mcpdemo-com/mcpdemo-com-github-io
  path: images/[slug]-explainer.mp4
  commit_message: Add [Tool Name] MCP explainer video
```

**QA the merged video:**

```
MCPDEMO:analyze_media
  videoUrl: [merge result URL]
  mode: whisper
```

Check: does the reported `duration` match `actual_duration_seconds` within
1–2 seconds? Does the transcript end with the final CTA sentence? If truncated
— regenerate with more clips and re-merge before re-archiving.

---

### Step V7 — Embed Video on Info Page + Sitemap

Read `tools/[slug]/index.html` from GitHub. Insert the `.video-band` block
**between the closing `</div>` of `.hero` and the opening `<div class="article-wrap">`**.
Never place inside `.article-wrap`.

```html
<div class="video-band">
  <div class="video-band-inner">
    <div class="sec-label">Explainer Video</div>
    <div class="video-wrap">
      <video controls preload="none"
             poster="https://mcpdemo.com/images/[slug]-explainer-thumb.jpg">
        <source src="https://mcpdemo.com/images/[slug]-explainer.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
    <p>An [N]-second overview of the [Tool Name] MCP integration — what it is,
    what Claude can do, how to set it up, and who benefits most.</p>
  </div>
</div>
```

Add these CSS rules to the page's `<style>` block if not already present
(use `mcpdemo-design` skill to confirm exact values):

```css
.video-band{background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:2.5rem 2rem}
.video-band-inner{max-width:820px;margin:0 auto}
.video-band-inner p{color:var(--muted);font-size:.88rem;margin-top:.6rem}
.video-wrap{position:relative;width:100%;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:#000;margin-top:1rem}
.video-wrap video{display:block;width:100%;height:auto}
```

**Why top placement:** Video above the article maximizes watch time recorded
by analytics, which signals engagement to search engines and improves SEO
dwell time.

Deploy the updated info page via `mcpdemo-deploy`.

**Sitemap video block** — update `sitemap.xml` (via `mcpdemo-deploy`) to nest
this inside the info page's `<url>` entry:

```xml
<video:video>
  <video:thumbnail_loc>https://mcpdemo.com/images/[slug]-explainer-thumb.jpg</video:thumbnail_loc>
  <video:title>[Tool Name] MCP Integration with Claude AI — Explainer</video:title>
  <video:description>An overview of the [Tool Name] MCP integration — what it is, what Claude can do, how to set it up, and who benefits most.</video:description>
  <video:content_loc>https://mcpdemo.com/images/[slug]-explainer.mp4</video:content_loc>
</video:video>
```

Verify the `<urlset>` includes `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`.

---

## Completion Checklist

Before declaring the video done:

- [ ] `images/[slug]-explainer-thumb.jpg` archived to GitHub
- [ ] `images/[slug]-explainer.mp4` archived to GitHub
- [ ] Merged video duration ≥ narration length
- [ ] Whisper on final video confirms narration completes (ends on CTA)
- [ ] `.video-band` block live on info page
- [ ] `poster` attribute points to archived thumbnail URL
- [ ] `<source src>` points to archived video URL
- [ ] Sitemap `<video:video>` block live with `xmlns:video` namespace present

One-line user message at completion: *"Explainer video live on [info-page URL].
~[N] seconds, narrated by Eric."*

---

## Hard Rules

- **Eric is the only voice.** Voice ID `cjVigY5qzO86Huf0OWal`, never another.
- **Stability 0.6, model `eleven_multilingual_v2`.** No overrides.
- **No background music, ever.**
- **First caption at 0.5s, never 0.0s.** Zero causes a burn-in artifact.
- **Thumbnail before video embedding.** Never deploy the `.video-band`
  block pointing to a thumbnail that doesn't exist yet.
- **Never hotlink HMAC URLs on the live info page.** Every asset must be
  archived to GitHub first and served from `https://mcpdemo.com/images/`.
- **One video per session to avoid 429 compound errors.** If the user asks
  to make videos for multiple tools, do one and suggest continuing next session.
