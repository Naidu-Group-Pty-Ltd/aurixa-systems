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
 * The full runbook is docs/video-briefings.md. In short:
 *
 *   1. `npm run video:encode -- <master.mov> --slug <slug>` builds the adaptive
 *      ladder, a progressive fallback, a poster and a 1200×630 share card.
 *   2. `npm run video:upload -- <slug>` publishes it to the `marketing-media`
 *      bucket with the right cache headers.
 *   3. Fill in `media`, `durationSeconds`, `publishedOn` and `chapters` on the
 *      entry below, and deploy. `catalog.test.ts` refuses an entry that is
 *      half-published.
 *
 * An entry with no `media` is shown in the library as premiering: it has a
 * card, but no page, no route and no sitemap entry until it can be watched.
 *
 * ── What the copy may say ───────────────────────────────────────────────────
 * The same rule `llms.txt` lives by: every summary and takeaway restates
 * something a public page on this site already says, and the entry's
 * `explore` link points at that page. No figures, certifications or customer
 * claims a page does not make. The summary is served as the page's meta and
 * social description, so it is held to the registry's 320-character limit.
 *
 * No imports from the route registry: `routeMetadata.ts` imports this file to
 * register each published briefing as a route, and the dependency runs one way.
 */

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
  /** 16:9 poster frame, shown until the first video frame is decoded. */
  poster?: string;
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
  /** Transcript paragraphs. Rendered on the page, so crawlers can read the video. */
  transcript?: string[];
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

export const BRIEFINGS: Briefing[] = [
  {
    slug: "aurixa-operating-system",
    title: "The Aurixa Operating System",
    kicker: "One governed platform, from the first enquiry to compliance sign-off.",
    summary:
      "A short tour of Aurixa Systems: operational workflows, strategic reporting, financial modelling, client engagement and enterprise governance, brought together as one governed platform for Australian property and finance firms.",
    series: "flagship",
    artwork: "/brand/layer-01-operational-intelligence.webp",
    takeaways: [
      "Operational workflows, strategic reporting and financial modelling run on one infrastructure rather than a stack of disconnected subscriptions.",
      "CRM workflows, communication and reporting delivery are brought into one client ecosystem.",
      "Permissions, oversight and governance keep operational control in place as the business scales.",
    ],
    explore: { label: "Explore the platform", to: "/platform" },
  },
  {
    slug: "serviceability-and-cash-flow",
    title: "Serviceability & 10-Year Cash Flow",
    kicker: "Borrowing capacity against lender policy, then a decade of cash flow.",
    summary:
      "How Aurixa calculates borrowing capacity against lender policy rules and APRA buffers, then models 10-year pre and post-tax cash flow and yield for each client scenario.",
    series: "platform",
    artwork: "/brand/layer-03-financial-modelling.webp",
    artworkPosition: "30% 25%",
    takeaways: [
      "Multi-lender policy matching with APRA buffers applied to every scenario.",
      "Real-time borrowing capacity snapshots, ready before the client speaks to a broker.",
      "10-year pre and post-tax yield analysis that flows straight into the client report.",
    ],
    explore: { label: "See the serviceability engine", to: "/platform#serviceability" },
  },
  {
    slug: "white-label-client-reporting",
    title: "White-Label Client Reporting",
    kicker: "Client briefs in your brand, generated from the same governed data.",
    summary:
      "How Aurixa turns client data and modelling into fully white-labelled briefs and reports, custom-branded to your firm, generated in the background and synced with your CRM.",
    series: "platform",
    artwork: "/brand/layer-02-strategic-intelligence.webp",
    takeaways: [
      "White-label briefs and reports carrying your firm's own branding.",
      "Client presentations generated in the background, fully formatted and ready to deliver.",
      "Direct CRM integration and data syncing, so reporting starts from the client record.",
    ],
    explore: { label: "See custom reporting", to: "/platform#custom-reporting" },
  },
  {
    slug: "aurixa-voice",
    title: "Aurixa Voice: AI Voice Agents",
    kicker: "Voice agents that keep your team responsive when the phones are busy.",
    summary:
      "AI-assisted voice agents designed around your workflows, systems and service requirements, helping your team stay responsive during busy periods and outside normal operating hours.",
    series: "growth",
    artwork: "/brand/layer-04-client-growth-ecosystem.webp",
    takeaways: [
      "AI-assisted voice agents for inbound and outbound calls.",
      "Configured against your own systems and service requirements, never a generic script.",
      "Support for busy periods, after-hours enquiries and follow-ups that would otherwise slip.",
    ],
    explore: { label: "Meet Aurixa Voice", to: "/platform#voice" },
  },
  {
    slug: "compliance-passport",
    title: "Inside the Compliance Passport",
    kicker: "One guided AML/CTF journey, recorded once and shared where authorised.",
    summary:
      "A walkthrough of the AML/CTF Compliance Passport: identity verification, documents, screening, ownership, source of funds and review, recorded as one Passport that can be shared where authorised.",
    series: "compliance",
    artwork: "/brand/layer-05-enterprise-governance.webp",
    takeaways: [
      "A guided client journey through identity verification, documents, screening, ownership and source of funds.",
      "Each verified stage recorded in one Compliance Passport, which can be refreshed as milestones are added.",
      "Where authorised, Passport information can support the next professional in the transaction.",
    ],
    explore: { label: "Open the Compliance Passport", to: "/compliance-passport" },
  },
  {
    slug: "builders-network",
    title: "The Builders Network",
    kicker: "Publish stock once and reach the advisory firms placing clients into it.",
    summary:
      "How builders and developers publish their stock once on the Aurixa Builders Network and reach the advisory firms placing clients into it, with connections granted one firm at a time.",
    series: "growth",
    artwork: "/brand/layer-01-operational-intelligence.webp",
    artworkPosition: "70% 40%",
    takeaways: [
      "Publish once, and connected firms see the same list you do: lots, prices, photographs and status, the moment it changes.",
      "Stock reaches advisers inside the workspace they already run their day from.",
      "Every connection is granted one firm at a time, by you and by them, with no open directory of your pricing.",
    ],
    explore: { label: "Visit the Builders Network", to: "/builders" },
  },
];

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
