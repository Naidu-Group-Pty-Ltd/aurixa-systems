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

Listings are written and published in **Mission Control**, at Growth → Website
videos (its `docs/WEBSITE_VIDEOS.md`). Nothing in this repository is edited to
publish one. You need `ffmpeg` and `ffprobe` (built with libx264) and the
master export of the video, and admin access to Mission Control. No storage
key is involved.

### 1. Encode

```bash
npm run video:encode -- path/to/master.mov --slug compliance-passport --tune animation
```

- `--slug` must match the entry in `src/lib/videos/catalog.ts`.
- `--tune animation` suits motion graphics and interface captures, which is most
  explainers. Use `film` (the default) for camera footage and talking heads.
- `--poster-at <seconds>` picks the frame for the poster and the link-preview
  card. Choose one that reads on its own, with no caption caught mid-animation.
  The default is a few seconds in, which is often a fade or a half-built title.
- `--preset` defaults to `veryslow`. With this ladder's own tuning, `slow`
  measured the same speed and size, so there is rarely a reason to change it.
- `--draft` encodes with `veryfast` so you can check a cut quickly. Never publish
  a draft.

The output goes to `media-build/<slug>/` (gitignored). It contains a six-rung
adaptive ladder from 240p/300 kbps to 1080p, shared audio groups, a 720p
progressive fallback, `poster.jpg` and `card.jpg` (1200×630, the link preview).
When it finishes, the script prints the measured ladder and the listing's media
fields. Mission Control measures the same values from the stream itself when the
folder is uploaded, so nothing needs pasting. Budget about 7–8 seconds of CPU for every second of video on
a 4-core machine.

**Vertical reels (9:16)** are detected automatically:
- The ladder is encoded in portrait: 240×426 up to 1080×1920, at the same
  pixel counts and bitrate caps.
- The poster is 1080×1920.
- The card shows the whole frame over a soft fill drawn from its own colours,
  rather than cropping it to a strip.
- The snippet includes `orientation: "portrait"`, which gives the briefing a
  vertical theatre (beside the headline on desktop). In the library its poster
  is framed over a fill of itself, until a designed thumbnail replaces it.

If the video carries a compliance line on screen, such as a disclaimer, put it
in the entry's `disclaimer` and it is shown under the player verbatim. If the
words are on screen rather than spoken, put that text, in order, in
`transcript`.

If you have captions, save them as `media-build/<slug>/captions.en.vtt` (WebVTT)
before uploading.

The encoder does not make a **thumbnail**. That is designed artwork: a 16:9
image, 1920×1080 JPEG, with the headline, the logo and any badge set into it,
made for the library rather than taken from a frame. It goes up in Mission
Control, on its own (see below).

### 2. Upload and verify, in Mission Control

On the video's listing in Mission Control, **Choose folder** → `media-build/<slug>`
→ **Upload and verify**. What happens:

- Mission Control mints a single-use **upload grant** for the listing's next
  version folder (`videos/<slug>/v<n>/`) and exactly the files picked.
- The browser trades it at this project's `briefing-upload-sign` edge function
  (`supabase/functions/briefing-upload-sign`). The function asks Mission Control
  whether the grant is live and covers those paths, then signs **create-only**
  upload URLs. No secret is shared between the two systems; possession of the
  grant is the authority.
- Files go up straight from the browser: media and images first, rendition
  playlists next, the master playlist last. Segments and images get `immutable`
  caching, and playlists a short revalidating TTL. A file already there from an
  interrupted attempt is skipped.
- Mission Control then reads the package back from the public bucket, the way a
  player will, before the listing points at it. It reads the running time and
  orientation from the stream.

A new upload is always a new version folder, and nothing published is ever
uploaded over. (The `card-2.jpg` on Borrowing Capacity predates this and stays
as published.)

**Images on their own.** Mission Control can also upload a listing's images
without the stream: a designed thumbnail, a replacement poster or card, or any
of them together. They go through the same grant and the same create-only
signing, into the listing's next version folder, and only the fields uploaded
move to it. When a thumbnail is uploaded, Mission Control derives the 1200×630
card from it. One briefing's media can therefore span folders: the stream in
`videos/<slug>/v1/`, say, and the thumbnail and card in `videos/<slug>/v2/`.
The publishing rules hold each field to the briefing's own folder
(`videos/<slug>/v<n>/`), not to the stream's version.

### 3. Publish, in Mission Control

Fill in the listing:
- the kicker;
- the summary (70–320 characters; it is the page's search and link-preview
  description);
- 2–4 takeaways;
- the page it sends viewers on to;
- any on-screen disclaimer;
- chapters;
- the transcript, verbatim.

Mission Control lists what stands between the draft and **Publish**: these are
this website's own publishing rules (`src/lib/videos/validate.ts`), restated
there.

Publishing asks Vercel for a production build through a deploy hook, and the
page is live a couple of minutes later. **Show as premiere** puts a card in the
library marked *Premiering*, with no page and no video. **Return to draft** and
**Archive** take a listing down on the next build.

### How the website gets its listings

`npm run build` runs `scripts/sync-briefings.ts` at `prebuild`, before the SEO
files are generated and before any page is rendered:

- **On Vercel** (`VERCEL=1`) it reads `GET {Mission Control}/api/public/storefront/briefings`.
  This returns premiere and published listings only, and a premiere carries no
  media. It checks each listing against `validate.ts`, leaves out any that break
  a rule and names them in the build log, and writes the rest to
  `src/lib/videos/briefings.data.ts`. The flagship always leads the library.
- **If Mission Control cannot be read**, or answers anything but a well-formed
  list, the build keeps the committed snapshot and says so. The site then shows
  the last committed videos, rather than failing the build or showing none.
- **Locally and in CI** it does nothing, so the tests run against the committed
  snapshot. Set `BRIEFINGS_SYNC=1` to pull anyway, or `BRIEFINGS_SYNC=required`
  to fail when the pull fails.

`npm run briefings:pull` refreshes the committed snapshot from Mission Control.
Commit it together with the regenerated `public/sitemap.xml` and
`public/llms.txt`, because `seoFiles.test.ts` compares those byte for byte with
the snapshot.

### Publishing without Mission Control

The command-line path still works, for a staging bucket or for an emergency. It
needs the project's service-role key:

```bash
SUPABASE_SERVICE_ROLE_KEY=… npm run video:upload -- compliance-passport v1
```

```bash
npm run video:verify -- https://moeyytuduycrvvncdtme.supabase.co/storage/v1/object/public/marketing-media/videos/compliance-passport/v1/master.m3u8
```

`video:upload` never overwrites. `video:verify` audits the ladder the way a
strict player would: RFC 3986 URI resolution, the cheapest rung, segment
uniformity and cache headers. It probes with one-byte GETs, not HEADs: Supabase
Storage answers a HEAD with `cache-control: private, no-cache` whatever the
object carries. Check a header by hand with `curl -sS -D - -o /dev/null <url>`,
not `curl -I`. A listing published this way still has to exist in Mission
Control, or the next production build drops it.

---

## How it is built

| Piece | Where |
|---|---|
| Listings | Mission Control, Growth → Website videos |
| Catalogue types and queries | `src/lib/videos/catalog.ts` |
| Committed snapshot of the listings | `src/lib/videos/briefings.data.ts` (generated) |
| Publishing rules | `src/lib/videos/validate.ts` |
| Build-time sync from Mission Control | `scripts/sync-briefings.ts`, `src/lib/videos/missionControlListings.ts` |
| Upload signing | `supabase/functions/briefing-upload-sign` |
| Page (hub and per-video) | `src/pages/Watch.tsx` |
| Theatre, HUD, standby and end card | `src/components/watch/BriefingTheatre.tsx` |
| Player | `src/components/watch/BriefingPlayer.tsx` |
| Library card, share bar, chapters | `src/components/watch/` |
| What a card shows (library and "Up next") | `cardArtwork()` in `src/lib/videos/catalog.ts` |
| Streaming engine | `src/lib/streaming/` (ported from NPC Services VSL) |
| Playback state store | `src/lib/videos/playback.ts` |
| Resume and watched progress | `src/lib/videos/progress.ts` (this device only) |
| Share links and attribution tags | `src/lib/videos/share.ts` |
| Route registration | `briefingRoutes()` and `PARAMETERISED_ROUTES` in `src/lib/routeMetadata.ts` |
| Styles | the "Briefing Room" section at the end of `src/index.css` |
| Pipeline | `scripts/video/` (encode, upload, verify, ladder) |
| Bucket | `supabase/migrations/20261028120000_marketing_media_bucket.sql` |

### Thumbnails and the library card

`media.thumbnail` is optional. Where a briefing has one:

- **The library card and the "Up next" card** show it, as a landscape image
  that fills the slot. Both take their artwork from `cardArtwork()`, so the two
  cannot disagree about a briefing. Without a thumbnail they show what they
  always have: the poster, which for a reel stands whole over a blurred fill
  of itself, or the brand artwork for a premiere.
- **Lock-screen and notification controls** (Media Session) are offered the
  thumbnail first and the poster second.
- **The theatre keeps the poster.** It is the video's own frame, in the
  video's own shape, and it gives way to the first decoded frame.
- **Link previews keep the card** (see below).

The card normally lays two layers over its image: a colour tint
(`.watch-card__tint`, blended in) and a wash (`.watch-card__wash`) from a light
navy at the top to near-solid navy at the bottom. A designed thumbnail already
has its own vignette, and a bright badge low in the frame that the bottom of
the wash would dim. So a card showing one carries `.watch-card__thumb--designed`
(`src/index.css`), which:

- drops the tint;
- reduces the wash to a light fade at the top, under the catalogue code, and
  a soft corner fade under the running time (both tags also have their own
  dark backing);
- shows the image unfiltered, and zooms it less on hover (3% rather than 8%),
  so the type set near its edges is never cropped.

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
  to the sitewide card). Never the thumbnail: `index.html` declares 1200×630
  for every page's image, and a 1920×1080 thumbnail would make that untrue.
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

## The first three briefings

The catalogue launched with three vertical reels:

| Slug | Title | Running time | Poster frame |
|---|---|---|---|
| `aurixa-operating-system` | The Aurixa Operating System (flagship) | 2:11 | 90.5 s |
| `compliance-passport` | Inside the Compliance Passport | 1:58 | 48.5 s |
| `borrowing-capacity` | Borrowing Capacity, in Moments | 2:27 | 120 s |

Their words are on screen rather than spoken, so each transcript was read off
the frames: a timestamped caption band every second, with every half-animated
phrase re-checked at finer offsets. The chapter marks come from the same
timestamps.

Each entry's `disclaimer` is the on-screen line, verbatim. The bucket migration
was applied on 28 Oct 2026.

All three went up as `v1` on 28 Oct 2026. `video:verify` returned 0 failures
and 0 warnings on each master, and each played from the live bucket in Chromium
through hls.js and MSE, at desktop and phone widths, with no console errors.
