/**
 * Video listings as Mission Control serves them, and how they become the
 * catalogue this site builds from.
 *
 * Mission Control is where a listing is written (Website → Videos): its copy,
 * chapters, transcript, media and whether it is live. It serves the live ones
 * at `GET /api/public/storefront/briefings`, and `scripts/sync-briefings.ts`
 * turns that answer into `briefings.data.ts` at build time. This module is the
 * pure part of that: the wire shape, the mapping, and the file it writes.
 */
import type { Briefing, BriefingSeries } from "./catalog";

/** One listing on the wire. Snake case, as Mission Control's tables are. */
export type MissionControlListing = {
  slug: string;
  /** `premiere`: a card with no page. `published`: watchable. Nothing else is served. */
  status: "published" | "premiere";
  title: string;
  kicker: string;
  summary: string;
  series: string;
  artwork: string;
  artwork_position: string | null;
  takeaways: string[];
  explore_label: string;
  explore_to: string;
  orientation: "landscape" | "portrait" | null;
  disclaimer: string | null;
  transcript: string[];
  chapters: Array<{ at: number; label: string }>;
  media: {
    hls: string | null;
    mp4: string | null;
    poster: string | null;
    card: string | null;
    captions: string | null;
  } | null;
  duration_seconds: number | null;
  published_on: string | null;
};

const present = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * A listing as a catalogue entry. A premiere carries none of the publishing
 * fields even if Mission Control holds some — media uploaded ahead of launch
 * must not turn a premiere card into a half-published page.
 */
export function briefingFromListing(listing: MissionControlListing): Briefing {
  const published = listing.status === "published";
  const media = published && listing.media
    ? {
        hls: present(listing.media.hls),
        mp4: present(listing.media.mp4),
        poster: present(listing.media.poster),
        card: present(listing.media.card),
        captions: present(listing.media.captions),
      }
    : undefined;
  return canonicalBriefing({
    slug: listing.slug,
    title: listing.title,
    kicker: listing.kicker,
    summary: listing.summary,
    series: listing.series as BriefingSeries,
    artwork: listing.artwork,
    artworkPosition: present(listing.artwork_position),
    takeaways: listing.takeaways ?? [],
    explore: { label: listing.explore_label, to: listing.explore_to },
    orientation: listing.orientation ?? undefined,
    disclaimer: present(listing.disclaimer),
    media,
    durationSeconds: published ? (listing.duration_seconds ?? undefined) : undefined,
    publishedOn: published ? present(listing.published_on) : undefined,
    chapters: published && listing.chapters?.length ? listing.chapters : undefined,
    transcript: listing.transcript?.length ? listing.transcript : undefined,
  });
}

/**
 * One key order, no undefined values, and empty media dropped — so the file
 * written from Mission Control and the committed snapshot differ only where
 * the listings do.
 */
export function canonicalBriefing(briefing: Briefing): Briefing {
  const media = briefing.media
    ? Object.fromEntries(
        (["hls", "mp4", "poster", "card", "captions"] as const)
          .filter((key) => briefing.media?.[key])
          .map((key) => [key, briefing.media![key]]),
      )
    : undefined;
  const ordered: Record<string, unknown> = {
    slug: briefing.slug,
    title: briefing.title,
    kicker: briefing.kicker,
    summary: briefing.summary,
    series: briefing.series,
    artwork: briefing.artwork,
    artworkPosition: briefing.artworkPosition,
    takeaways: briefing.takeaways,
    explore: { label: briefing.explore.label, to: briefing.explore.to },
    orientation: briefing.orientation,
    disclaimer: briefing.disclaimer,
    media: media && Object.keys(media).length > 0 ? media : undefined,
    durationSeconds: briefing.durationSeconds,
    publishedOn: briefing.publishedOn,
    chapters: briefing.chapters?.map((chapter) => ({ at: chapter.at, label: chapter.label })),
    transcript: briefing.transcript,
  };
  for (const key of Object.keys(ordered)) if (ordered[key] === undefined) delete ordered[key];
  return ordered as Briefing;
}

/** The answer's listings, or why there are none to use. */
export function listingsFromResponse(
  status: number,
  body: unknown,
): { ok: true; listings: MissionControlListing[] } | { ok: false; reason: string } {
  if (status !== 200) return { ok: false, reason: `HTTP ${status}` };
  const answer = body as { ok?: unknown; briefings?: unknown } | null;
  if (!answer || answer.ok !== true) return { ok: false, reason: "Mission Control did not answer ok" };
  if (!Array.isArray(answer.briefings)) return { ok: false, reason: "the answer has no briefings list" };
  const listings = answer.briefings.filter(
    (row): row is MissionControlListing =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as { slug?: unknown }).slug === "string" &&
      ((row as { status?: unknown }).status === "published" ||
        (row as { status?: unknown }).status === "premiere"),
  );
  return { ok: true, listings };
}

/** The generated module. `source` says where its listings came from, for the header. */
export function renderBriefingsModule(list: readonly Briefing[], source: string): string {
  return `// Generated by scripts/sync-briefings.ts — do not edit by hand.
//
// The Briefing Room's listings. They are written and published in Mission
// Control (Website → Videos), and every production build pulls the live ones
// from Mission Control and rewrites this file before it renders a page. The
// committed copy is the snapshot the tests and local builds use, and the one a
// build falls back to when Mission Control cannot be read.
//
// Source: ${source}
// Refresh the committed snapshot with: npm run briefings:pull
import type { Briefing } from "./catalog";

export const BRIEFINGS_DATA: Briefing[] = ${JSON.stringify(list.map(canonicalBriefing), null, 2)};
`;
}
