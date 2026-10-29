/**
 * The Briefing Room catalogue: every explainer video the site carries, in the
 * order the library shows them.
 *
 * This is Aurixa's own distribution channel for its marketing videos. A
 * briefing published here is streamed from Aurixa's storage, under Aurixa's
 * domain, with Aurixa's own page around it, instead of borrowing a social
 * platform's player, its recommendations rail and its audience. Every
 * published briefing gets its own prerendered page at `/watch/<slug>`, so a
 * link shared anywhere unfurls with that video's title and card rather than a
 * bare URL.
 *
 * ── Publishing a video ──────────────────────────────────────────────────────
 * Listings are written in Mission Control (Website → Videos), not here. The
 * full runbook is docs/video-briefings.md. In short:
 *
 *   1. `npm run video:encode -- <master.mov> --slug <slug>` builds the adaptive
 *      ladder, a progressive fallback, a poster and a 1200×630 share card.
 *   2. In Mission Control, the listing's "Upload media" takes that folder,
 *      uploads it to the `marketing-media` bucket and verifies the stream.
 *   3. Publishing the listing asks Vercel for a production build, which pulls
 *      the live listings from Mission Control (`scripts/sync-briefings.ts`)
 *      into `briefings.data.ts` before any page is rendered.
 *
 * `briefings.data.ts` is committed as the snapshot the tests and local builds
 * use, and the one a build keeps when Mission Control cannot be read. The
 * rules an entry must pass live in `validate.ts`: the sync drops an entry
 * that breaks one, and `catalog.test.ts` holds the snapshot to them.
 *
 * An entry with no `media` is shown in the library as premiering: it has a
 * card, but no page, no route and no sitemap entry until it can be watched.
 *
 * ── What the copy may say ───────────────────────────────────────────────────
 * The summary, kicker and takeaways describe what the video shows, and claim
 * nothing about the platform that the page `explore` links to does not also
 * say: the same rule `llms.txt` lives by. No figures, certifications or
 * customer claims a page does not make. The summary is served as the page's
 * meta and social description, so it is held to the registry's 320-character
 * limit. The transcript is the exception, deliberately: it is the video's own
 * words, verbatim, including what the video offers, because a transcript that
 * edits the video is not a transcript.
 *
 * No imports from the route registry: `routeMetadata.ts` imports this file to
 * register each published briefing as a route, and the dependency runs one way.
 */
import { BRIEFINGS_DATA } from "./briefings.data";

export type BriefingSeries = "flagship" | "platform" | "growth" | "compliance";

export const SERIES_LABELS: Record<BriefingSeries, string> = {
  flagship: "Flagship",
  platform: "Platform",
  growth: "Growth",
  compliance: "Compliance",
};

/** A chapter mark, in seconds from the start. */
export type BriefingChapter = { at: number; label: string };

/**
 * Where a briefing's media lives. Each value is either an absolute `https:`
 * URL or a path relative to {@link VIDEO_MEDIA_ORIGIN} — the layout
 * `scripts/video/upload.sh` writes is `videos/<slug>/<version>/…`.
 */
export type BriefingMedia = {
  /** HLS master playlist. The primary delivery path. */
  hls?: string;
  /** ~720p progressive MP4 with `+faststart`. Last-resort fallback only. */
  mp4?: string;
  /**
   * The theatre's poster frame, shown until the first video frame is decoded:
   * 16:9 for a landscape video, 9:16 for a portrait one.
   */
  poster?: string;
  /**
   * The 16:9 thumbnail designed for the video, shown on the library card and
   * the up-next card in place of the poster. 1920×1080 JPEG.
   */
  thumbnail?: string;
  /** 1200×630 social card. Falls back to the sitewide card when absent. */
  card?: string;
  /** English WebVTT captions. */
  captions?: string;
};

export type Briefing = {
  /** URL segment: lowercase words joined by hyphens. Never change once published. */
  slug: string;
  title: string;
  /** One line under the title: what the viewer will come away knowing. */
  kicker: string;
  /** Meta and social description, and the library card's copy. 70–320 chars. */
  summary: string;
  series: BriefingSeries;
  /** Fallback artwork under `public/brand/`, used until a poster exists. */
  artwork: string;
  /** CSS object-position for the artwork, when the subject is off-centre. */
  artworkPosition?: string;
  /** Three or four points, each restating what `explore` says. */
  takeaways: string[];
  /** The page that covers this topic in depth. Must be a public route. */
  explore: { label: string; to: string };
  /** Required to publish. */
  media?: BriefingMedia;
  /** Running time in whole seconds. Required to publish. */
  durationSeconds?: number;
  /** `YYYY-MM-DD`, the day the video was first published here. Required to publish. */
  publishedOn?: string;
  chapters?: BriefingChapter[];
  /**
   * Transcript paragraphs. Rendered on the page, so crawlers and screen
   * readers get what the video says. For a video whose words are on screen
   * rather than spoken, this is the on-screen text, in order and verbatim.
   */
  transcript?: string[];
  /**
   * The video's frame. `"portrait"` is a vertical 9:16 reel, which gets a
   * vertical theatre, a portrait ladder and framed thumbnails; omitted means
   * landscape 16:9. `npm run video:encode` prints the right value.
   */
  orientation?: "landscape" | "portrait";
  /**
   * A compliance line the video itself carries, shown beside it verbatim so
   * it is never lost when the video is paused, skipped or not played at all.
   */
  disclaimer?: string;
};

/** A briefing with everything a viewer and a crawler need. */
export type PublishedBriefing = Briefing & {
  media: BriefingMedia & ({ hls: string } | { mp4: string });
  durationSeconds: number;
  publishedOn: string;
};

/** The hub. Kept here rather than in the registry so the player pages can link back. */
export const BRIEFING_ROOM_PATH = "/watch";

/** The one parameterised route on the site. See `PARAMETERISED_ROUTES` in routeMetadata.ts. */
export const BRIEFING_ROUTE_PATTERN = "/watch/:slug";

/**
 * The public `marketing-media` bucket in the Aurixa Systems Supabase project
 * (moeyytuduycrvvncdtme), created by the 20261028120000 migration.
 */
export const DEFAULT_VIDEO_MEDIA_ORIGIN =
  "https://moeyytuduycrvvncdtme.supabase.co/storage/v1/object/public/marketing-media";

export const BRIEFINGS: Briefing[] = BRIEFINGS_DATA;

// ── Queries ──────────────────────────────────────────────────────────────────

export function isPublished(briefing: Briefing): briefing is PublishedBriefing {
  return Boolean(
    (briefing.media?.hls || briefing.media?.mp4) &&
      briefing.durationSeconds &&
      briefing.publishedOn,
  );
}

export function publishedBriefings(list: Briefing[] = BRIEFINGS): PublishedBriefing[] {
  return list.filter(isPublished);
}

export function briefingBySlug(slug: string, list: Briefing[] = BRIEFINGS): Briefing | undefined {
  return list.find((briefing) => briefing.slug === slug);
}

export function briefingPath(slug: string): string {
  return `${BRIEFING_ROOM_PATH}/${slug}`;
}

/**
 * The briefing the hub opens on: the flagship once it is watchable, else the
 * first watchable briefing, else the flagship as a premiere.
 */
export function featuredBriefing(list: Briefing[] = BRIEFINGS): Briefing {
  const flagship = list.find((briefing) => briefing.series === "flagship") ?? list[0];
  if (isPublished(flagship)) return flagship;
  return publishedBriefings(list)[0] ?? flagship;
}

/** The next watchable briefing in library order, wrapping; `null` when there is no other. */
export function upNextAfter(slug: string, list: Briefing[] = BRIEFINGS): PublishedBriefing | null {
  const index = list.findIndex((briefing) => briefing.slug === slug);
  if (index === -1) return null;
  for (let step = 1; step < list.length; step += 1) {
    const candidate = list[(index + step) % list.length];
    if (isPublished(candidate)) return candidate;
  }
  return null;
}

// ── Media ────────────────────────────────────────────────────────────────────

/**
 * `VITE_VIDEO_MEDIA_ORIGIN` overrides the bucket, for a staging deployment
 * with its own storage. Read lazily, from both places it can live: Vite
 * substitutes `import.meta.env` into the browser bundle, but the prerender
 * pass and the sitemap generator run this module under plain Node, where only
 * `process.env` exists. Reading just the first would let the served `og:image`
 * name one bucket while the live page streams from another.
 */
export function videoMediaOrigin(): string {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const override = (viteEnv?.VITE_VIDEO_MEDIA_ORIGIN ?? nodeEnv?.VITE_VIDEO_MEDIA_ORIGIN)?.trim();
  return (override || DEFAULT_VIDEO_MEDIA_ORIGIN).replace(/\/+$/, "");
}

/** An absolute URL for a media field, or `undefined` when the field is unset. */
export function mediaUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https:\/\//i.test(value)) return value;
  return `${videoMediaOrigin()}/${value.replace(/^\/+/, "")}`;
}

export function isPortrait(briefing: Briefing): boolean {
  return briefing.orientation === "portrait";
}

/** What a briefing's library card and up-next card show. */
export type CardArtwork = {
  /** An absolute media URL, or the `/brand/…` fallback artwork. */
  src: string;
  /** A vertical 9:16 frame, to stand whole over a blurred fill of itself. */
  portrait: boolean;
  /** A thumbnail designed for the card, with its own type and vignette. */
  designed: boolean;
  /** The brand fallback rather than an image of the video. */
  fallback: boolean;
};

/**
 * The one decision both cards share, so the library and the up-next card can
 * never show a briefing two ways: the designed thumbnail when there is one,
 * else the poster (framed, for a reel), else the fallback artwork.
 */
export function cardArtwork(briefing: Briefing): CardArtwork {
  const thumbnail = mediaUrl(briefing.media?.thumbnail);
  if (thumbnail) return { src: thumbnail, portrait: false, designed: true, fallback: false };
  const poster = mediaUrl(briefing.media?.poster);
  if (poster) return { src: poster, portrait: isPortrait(briefing), designed: false, fallback: false };
  return { src: briefing.artwork, portrait: false, designed: false, fallback: true };
}

/** The origin the player fetches from, for `preconnect`. */
export function mediaOriginFor(briefing: Briefing): string | undefined {
  const url = mediaUrl(briefing.media?.hls ?? briefing.media?.mp4);
  return url ? new URL(url).origin : undefined;
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** `245` → `"4:05"`, `3723` → `"1:02:03"`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The same duration, spelled out for a screen reader: `"4 minutes 5 seconds"`. */
export function spokenDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const parts: string[] = [];
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const unit = (value: number, word: string) => `${value} ${word}${value === 1 ? "" : "s"}`;
  if (h) parts.push(unit(h, "hour"));
  if (m) parts.push(unit(m, "minute"));
  if (s || parts.length === 0) parts.push(unit(s, "second"));
  return parts.join(" ");
}

/**
 * `"2026-10-28"` → `"28 Oct 2026"`. Formatted in UTC so the prerendered page
 * and the browser agree whatever time zone either runs in.
 */
export function formatPublished(isoDate: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
