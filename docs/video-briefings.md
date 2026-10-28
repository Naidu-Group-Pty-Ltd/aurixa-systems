# The Briefing Room (`/watch`)

Aurixa's own channel for its explainer and marketing videos. A video published
here streams from Aurixa's storage, on Aurixa's domain, inside Aurixa's own
page, with no social platform's player, recommendations rail or audience in
between. It works like the NPC Services VSL page: the video comes first, and the
call to action sits directly under it.

- **`/watch`** is the hub. The featured briefing plays in the theatre, with the
  full library underneath.
- **`/watch/<slug>`** is one briefing's own page. It is prerendered with its own
  title, description and 1200×630 social card, so a link shared on LinkedIn,
  Slack, WhatsApp or iMessage unfurls as *that video* rather than as a bare URL.

A briefing that has not been published yet appears in the library as a
**premiere**: it gets a card, but no page, no route and no sitemap entry until
it can actually be watched.

---

## Publishing a video

You need `ffmpeg` and `ffprobe` (built with libx264), the master export of the
video, and the Aurixa Systems project's service-role key.

### 1. Encode

```bash
npm run video:encode -- path/to/master.mov --slug compliance-passport --tune animation
```

- `--slug` must match the entry in `src/lib/videos/catalog.ts`.
- `--tune animation` suits motion graphics and interface captures, which is most
  explainers. Use `film` (the default) for camera footage and talking heads.
- `--draft` encodes with `veryfast` so you can check a cut quickly. Never publish
  a draft.

The output goes to `media-build/<slug>/` (gitignored). It contains a six-rung
adaptive ladder from 240p/300 kbps to 1080p, shared audio groups, a 720p
progressive fallback, `poster.jpg` (1920×1080) and `card.jpg` (1200×630, the
link preview). When it finishes, the script prints the measured ladder and the
exact catalogue fields to paste.

If you have captions, save them as `media-build/<slug>/captions.en.vtt` (WebVTT)
before uploading.

### 2. Upload

```bash
SUPABASE_SERVICE_ROLE_KEY=… npm run video:upload -- compliance-passport v1
```

This publishes to `marketing-media/videos/<slug>/<version>/` with
`immutable` caching on segments and images and a short revalidating TTL on
playlists and captions. It **never overwrites**. A re-run after an interrupted
upload skips anything already published, and a re-encode of a live video goes up
as `v2` and the catalogue moves to it, so no viewer is ever served a mix of two
ladders.

### 3. Verify

```bash
npm run video:verify -- https://moeyytuduycrvvncdtme.supabase.co/storage/v1/object/public/marketing-media/videos/compliance-passport/v1/master.m3u8
```

This audits the ladder the way a strict player would: RFC 3986 URI resolution,
the cheapest rung, segment uniformity and cache headers. It exits non-zero on any
failure.

### 4. Publish the entry

Paste the printed fields into the entry in `src/lib/videos/catalog.ts`, add
chapters if the video has natural sections, then:

```bash
npm test
```

```bash
npm run build
```

`catalog.test.ts` refuses a half-published entry (a stream without a running
time or date, chapters past the end, non-https media). The build regenerates
`public/sitemap.xml` and `public/llms.txt`, and those must be committed with the
catalogue change, because `seoFiles.test.ts` compares them byte for byte.

### Adding a new video to the slate

Add an entry to `BRIEFINGS` with no `media`, and it appears in the library as a
premiere. Its summary and takeaways must restate what a public page on the site
already says, and `explore` must point at that page. These are the same copy
rules `llms.txt` follows, and the tests check the link.

---

## How it is built

| Piece | Where |
|---|---|
| Catalogue, the single source of truth | `src/lib/videos/catalog.ts` |
| Page (hub and per-video) | `src/pages/Watch.tsx` |
| Theatre, HUD, standby and end card | `src/components/watch/BriefingTheatre.tsx` |
| Player | `src/components/watch/BriefingPlayer.tsx` |
| Library card, share bar, chapters | `src/components/watch/` |
| Streaming engine | `src/lib/streaming/` (ported from NPC Services VSL) |
| Playback state store | `src/lib/videos/playback.ts` |
| Resume and watched progress | `src/lib/videos/progress.ts` (this device only) |
| Share links and attribution tags | `src/lib/videos/share.ts` |
| Route registration | `briefingRoutes()` and `PARAMETERISED_ROUTES` in `src/lib/routeMetadata.ts` |
| Styles | the "Briefing Room" section at the end of `src/index.css` |
| Pipeline | `scripts/video/` (encode, upload, verify, ladder) |
| Bucket | `supabase/migrations/20261028120000_marketing_media_bucket.sql` |

### Routes and SEO

`/watch/:slug` is the site's only parameterised route. The registry, the
prerender pass and the sitemap all work on concrete paths, so
`briefingRoutes()` generates one entry per published briefing, and
`PARAMETERISED_ROUTES` tells `routeMetadata.test.ts` which concrete paths the
pattern serves. The route-drift guards therefore hold it to the same rule as
every literal route instead of exempting it.

Each briefing page is served with:

- `og:type` set to `video.other`
- the briefing's own `og:image` and `twitter:image` (its `card.jpg`, falling back
  to the sitewide card)
- the title "<Briefing> – Video Briefing | Aurixa Systems", which never collides
  with the page the video explains

An unknown or premiering slug has no prerendered file, so a direct hit gets the
real 404. Client-side navigation to one renders the 404 component.

The structured data is unchanged. The site deliberately ships exactly one
JSON-LD block (`seoFiles.test.ts`). `VideoObject` markup is a sensible follow-up
once real videos with real upload dates exist, but it needs that rule relaxed
deliberately, not around.

### Streaming

The player is the NPC Services VSL player carried across intact. NPC's
`docs/VIDEO_STREAMING.md` has the full measured history. In short:

- **Engine ladder.** Native HLS on Apple platforms, then hls.js over MSE
  everywhere else (lazy-loaded, about 125 kB gzipped, never in the entry chunk),
  then progressive MP4 only as a last resort.
- **Tuned hls.js.** Bandwidth is seeded from the viewer's previous session, with
  headroom required before stepping up, measured rather than advertised bitrates,
  a deep forward buffer, a bounded back buffer, worker demux and backoff-based
  recovery.
- **Resolution cap.** Never below what the display can actually resolve.
- **Recovery.** Network retries resume from the current position, media errors
  go through decode recovery and then a codec swap, and only after that does the
  player step down an engine.

What the Briefing Room adds:

- **No video before intent.** NPC buffered from the moment the player attached,
  which suits a page that exists for one video. Here hls.js parses the manifest
  and fetches nothing else until the viewer hovers, focuses or presses play.
  Measured: four requests before intent (poster, captions, master playlist), with
  buffering starting on hover. Without this, every hub visitor would have
  downloaded up to 90 seconds of 1080p.
- **The poster owns the first click.** Native controls take over from the moment
  playback starts. That keeps fullscreen, picture-in-picture, AirPlay, captions,
  keyboard and screen reader support without a hand-built control bar.
- **Resume** ("Resume from 1:24"), **chapters** that seek, an **"Up next"**
  countdown that hands over to the next briefing, **Media Session** metadata for
  lock-screen controls, and sidecar **WebVTT captions**.

### Attribution

Each share button tags the link with the UTMs Mission Control's lead classifier
(`leadChannel.pure.ts`) already reads:

| Share | Tags | Mission Control channel |
|---|---|---|
| LinkedIn | `utm_source=linkedin&utm_medium=social` | LinkedIn |
| Facebook | `utm_source=facebook&utm_medium=social` | Meta |
| Email | `utm_source=email&utm_medium=email` | Email |
| X | `utm_source=x&utm_medium=social` | Other |
| WhatsApp | `utm_source=whatsapp&utm_medium=social` | Other |

Every share also carries `utm_campaign=briefing-room&utm_content=<slug>`.
"Copy link" and the system share sheet use the clean canonical URL, because a
made-up source would be a guess dressed as evidence. The Briefing Room calls
`captureAttribution()` on arrival, so a viewer who watches first and applies on
`/contact` later in the session is still credited to the channel that sent
them. `share.test.ts` pins the tags.

---

## Verified before this shipped

- A synthetic 40-second 1080p source went through `video:encode`. The six rungs
  averaged 0.21 to 6.75 Mbps, and every segment was exactly 4.00 s.
- `video:verify` against a local storage-like server returned 0 failures and
  0 warnings.
- In Chromium, the same ladder played through hls.js and MSE at 1920×1080. The
  HUD read "Playing · 1080p", captions loaded, focus moved to the player, chapter
  seeking and resume persistence worked, and the end card handed over to the
  next briefing and autoplayed under a gesture-required autoplay policy. There
  were no console errors.
- After an independent review, these were re-run with three adversarial
  cases on a throttled connection, and all passed:
  - Pausing before the first frame stays paused.
  - Leaving without playing keeps a saved resume point, and the library card
    shows it.
  - A briefing whose manifest 404s falls back through native HLS to the MP4
    and plays.
- The full test suite passed against a build with two briefings published:
  prerendered pages, per-video cards and `og:type`, sitemap and `llms.txt`
  parity, link resolution, and nav and footer on every page.

## Before the first video goes live

- [ ] Apply `20261028120000_marketing_media_bucket.sql` to the Aurixa Systems
      project.
- [ ] Review the six-briefing slate in `catalog.ts`. Rename or reorder it to
      match the videos you actually have, and delete any you don't plan to make.
- [ ] Encode, upload and verify each video, then fill in its entry.
- [ ] Once the flagship is published, the Home hero shows "Watch the briefing"
      automatically.
