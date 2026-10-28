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

export const BRIEFINGS: Briefing[] = [
  {
    slug: "aurixa-operating-system",
    title: "The Aurixa Operating System",
    kicker: "Built by property professionals, around how property professionals actually work.",
    summary:
      "A two-minute introduction to Aurixa Systems: one connected operating environment where property research, financial analysis, client reporting and partner relationships come together, built by property professionals for property professionals.",
    series: "flagship",
    artwork: "/brand/layer-01-operational-intelligence.webp",
    takeaways: [
      "Research, financial analysis and client reporting run in one connected operating environment instead of across separate platforms.",
      "A property moves from financial analysis into a professional report the client can understand.",
      "Communication, client relationships and property partners stay connected to the same client journey.",
    ],
    explore: { label: "Explore the platform", to: "/platform" },
    orientation: "portrait",
    media: {
      hls: "videos/aurixa-operating-system/v1/master.m3u8",
      mp4: "videos/aurixa-operating-system/v1/fallback-720p.mp4",
      poster: "videos/aurixa-operating-system/v1/poster.jpg",
      card: "videos/aurixa-operating-system/v1/card.jpg",
    },
    durationSeconds: 131,
    publishedOn: "2026-10-28",
    chapters: [
      { at: 0, label: "A property opportunity" },
      { at: 10, label: "Scattered across platforms" },
      { at: 31, label: "Built for property professionals" },
      { at: 46, label: "From analysis to report" },
      { at: 55, label: "Connected relationships" },
      { at: 69, label: "Room to lead" },
      { at: 80, label: "Beyond disconnected systems" },
      { at: 88, label: "The invitation" },
    ],
    // The reel's words are on screen, not spoken: this is that text, in order.
    transcript: [
      "Somewhere in Australia, a property opportunity has just appeared. A client wants to know if it's right for them, while there's still time to act.",
      "But before you can answer, the research is in one platform, the numbers in another, the client details somewhere else, and the report hasn't even begun.",
      "What happens then? The market keeps moving. Your attention is pulled in every direction. And the client is waiting.",
      "Aurixa Systems was built by property professionals, for property professionals. We're here, with a connected operating environment designed around how property professionals actually work.",
      "Picture a property moving into financial analysis, then into a professional report your client can understand. Picture communication, client relationships and property partners connected to that journey, with Aurixa Agent supporting the work behind it. Not to replace your judgement, but to give it room to lead.",
      "Because clients don't pay you to manage software. They trust you to identify opportunities, make sense of complexity and guide the next decision.",
      "You can keep asking your team to bridge the gaps between disconnected systems. But why should they have to?",
      "Aurixa Systems isn't on the horizon. We've arrived, and the invitation is open. Experience what we've built with a 14-day free trial. Explore the platform, put it alongside the way you work today, and discover what a more connected business could feel like.",
      "Don't just take our word for it. Let your own experience make the case. Fourteen days. Your business. Your experience. Your decision.",
      "Aurixa Systems: the operating system for modern property professionals.",
    ],
  },
  {
    slug: "compliance-passport",
    title: "Inside the Compliance Passport",
    kicker: "One property, six professionals, and a client who no longer has to be the messenger.",
    summary:
      "One property, six professionals and the same documents requested again and again. The AML/CTF Compliance Passport keeps identity verification, screening and due diligence in one organised client record, shared with authorised partners through controlled access.",
    series: "compliance",
    artwork: "/brand/layer-05-enterprise-governance.webp",
    takeaways: [
      "Buyer's agent, finance broker, solicitor, accountant, builder and developer stop asking the client for the same evidence one by one.",
      "Identity verification, screening and due diligence sit together in one organised client record: the Compliance Passport.",
      "With appropriate consent, authorised property partners reach it through controlled access instead of a fresh round of requests.",
    ],
    explore: { label: "Open the Compliance Passport", to: "/compliance-passport" },
    orientation: "portrait",
    disclaimer: "Your business remains responsible for its AML/CTF obligations.",
    media: {
      hls: "videos/compliance-passport/v1/master.m3u8",
      mp4: "videos/compliance-passport/v1/fallback-720p.mp4",
      poster: "videos/compliance-passport/v1/poster.jpg",
      card: "videos/compliance-passport/v1/card.jpg",
    },
    durationSeconds: 118,
    publishedOn: "2026-10-28",
    chapters: [
      { at: 0, label: "One client, six professionals" },
      { at: 9, label: "The requests keep coming" },
      { at: 23, label: "Built for property professionals" },
      { at: 41, label: "Introducing the Passport" },
      { at: 60, label: "Consent and controlled access" },
      { at: 76, label: "The result" },
      { at: 89, label: "Experience it yourself" },
    ],
    transcript: [
      "One property, six property professionals, and somehow the client becomes the messenger. Sound familiar?",
      "The perfect property is found, but the requests keep coming. Another identity check, another document, another explanation. Suddenly, progress feels like paperwork.",
      "That's where Aurixa changes the experience. Built by property professionals for property professionals, Aurixa brings property intelligence, financial analysis, reporting, client management, communication and more into one connected operating environment.",
      "And here's where it gets exciting. Introducing the Aurixa AML/CTF Compliance Passport. One digital passport, one organised client record, identity verification, screening and due diligence, all in one place.",
      "With appropriate consent and controlled access, authorised property partners can securely access the client's Compliance Passport in just a few clicks, supporting legislative compliance while eliminating unnecessary duplication.",
      "The result? Less paperwork, less repetition, better-connected professionals and a smoother property journey, without clients constantly providing the same information.",
      "And that's just one part of Aurixa Systems. Experience it yourself with a 14-day free trial, and discover what a truly connected business can achieve. Fourteen days. Your business. Your experience. Your decision.",
      "Aurixa Systems: the operating system for modern property professionals.",
    ],
  },
  {
    slug: "borrowing-capacity",
    title: "Borrowing Capacity, in Moments",
    kicker: "From one client questionnaire to an indicative assessment, scenarios and a report.",
    summary:
      "Your client has found the property; can they afford it? From one client questionnaire, Aurixa produces an indicative borrowing capacity assessment, models deposits and purchasing scenarios, generates a professional report and hands over to the finance broker.",
    series: "platform",
    artwork: "/brand/layer-03-financial-modelling.webp",
    artworkPosition: "30% 25%",
    takeaways: [
      "One client questionnaire captures and organises the client's information and populates their client card.",
      "An indicative borrowing capacity assessment shows estimated purchasing power, deposit requirements and financial commitments.",
      "Deposits, financial structures and purchasing scenarios are modelled and turned into a professional report.",
      "Assessments and scenarios go to the client's finance broker through the partner portal, without repeating the process.",
    ],
    explore: { label: "See the serviceability engine", to: "/platform#serviceability" },
    orientation: "portrait",
    disclaimer: "Illustrative example only: hypothetical client, figures and assumptions. Not a credit assessment or financial advice.",
    media: {
      hls: "videos/borrowing-capacity/v1/master.m3u8",
      mp4: "videos/borrowing-capacity/v1/fallback-720p.mp4",
      poster: "videos/borrowing-capacity/v1/poster.jpg",
      // The first card's fill smeared a white panel beside the reel. Published
      // images are immutable, so its replacement went up under a new name.
      card: "videos/borrowing-capacity/v1/card-2.jpg",
    },
    durationSeconds: 147,
    publishedOn: "2026-10-28",
    chapters: [
      { at: 0, label: "Can they afford it?" },
      { at: 6, label: "Chasing documents" },
      { at: 15, label: "One simple questionnaire" },
      { at: 26, label: "Borrowing capacity in moments" },
      { at: 53, label: "Scenarios and reports" },
      { at: 68, label: "Handover to the broker" },
      { at: 93, label: "Just the beginning" },
      { at: 110, label: "What this means" },
    ],
    transcript: [
      "Your client has found the property. The big question? Can they afford it?",
      "Traditionally, answering that means chasing documents, juggling spreadsheets, and waiting on internal teams and external partners.",
      "With Aurixa Systems, everything changes. One simple client questionnaire captures and organises their information, seamlessly populating their client card.",
      "Now, here's where speed meets opportunity. With just one click, Aurixa turns client information into magic, where one aspect allows you to obtain an indicative borrowing capacity assessment, revealing estimated purchasing power, deposit requirements, financial commitments, and key considerations tailored to their specific circumstances. From information to financial insight in moments.",
      "And why stop there? Bring their chosen property into focus. Adjust deposits, explore financial structures, model purchasing scenarios, and generate professional reports that turn numbers into meaningful decisions.",
      "Ready for the next step? One click, one connected handover. Share assessments and scenarios directly with yours or their allocated finance broker through Aurixa's partner portal, enabling professional review without repeating the entire process.",
      "Your client gains clarity and transparency, and the broker gains context. Your business gains momentum.",
      "And that's just the beginning. Property intelligence, financial analysis, professional reporting, client and partner collaboration are all connected, with the Aurixa Agent in your arsenal supporting you wherever your business takes you.",
      "This means less administration, faster answers, smarter collaboration, and more opportunities to deliver results.",
      "Aurixa Systems. Built by property professionals for property professionals. Experience the difference with a 14-day free trial.",
    ],
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

export function isPortrait(briefing: Briefing): boolean {
  return briefing.orientation === "portrait";
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
