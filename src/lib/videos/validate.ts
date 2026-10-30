/**
 * The Briefing Room's publishing rules, as code.
 *
 * Listings are written in Mission Control (Website → Videos) and pulled in at
 * build time by `scripts/sync-briefings.ts`, which drops any entry this
 * rejects rather than ship it. `catalog.test.ts` holds the committed snapshot
 * to the same rules, so a rule is stated once and enforced in both places.
 *
 * Nothing here reads the route registry or the filesystem directly: the
 * registry imports the catalogue, and the catalogue must stay importable in
 * the browser, so both facts arrive as callbacks.
 */
import type { Briefing } from "./catalog";

export type ValidationContext = {
  /** True when `path` (no hash) is an indexable page on this site. */
  isPublicPage: (path: string) => boolean;
  /** True when a `/brand/…` artwork file ships in `public/`. */
  artworkExists: (path: string) => boolean;
};

const MEDIA_FIELDS = ["hls", "mp4", "poster", "thumbnail", "card", "captions"] as const;
const SERIES = new Set(["flagship", "platform", "growth", "compliance"]);

/** Every field that makes an entry watchable. All or none, never some. */
export function hasPublishingFields(briefing: Briefing): boolean {
  return Boolean(
    briefing.media?.hls ||
      briefing.media?.mp4 ||
      briefing.durationSeconds ||
      briefing.publishedOn ||
      briefing.chapters?.length,
  );
}

function isWatchable(briefing: Briefing): boolean {
  return Boolean(
    (briefing.media?.hls || briefing.media?.mp4) && briefing.durationSeconds && briefing.publishedOn,
  );
}

/** What is wrong with one entry. Empty when it may be shown. */
export function briefingProblems(briefing: Briefing, context: ValidationContext): string[] {
  const problems: string[] = [];
  const say = (message: string) => problems.push(message);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(briefing.slug ?? "")) say("slug is not lowercase-hyphenated");
  if ((briefing.slug ?? "").length > 60) say("slug is too long to read in a shared link");
  if (!briefing.title?.trim()) say("has no title");
  const summary = briefing.summary ?? "";
  if (summary.length < 70 || summary.length > 320) say(`summary is ${summary.length} chars (70–320)`);
  if (!briefing.kicker?.trim() || briefing.kicker.length > 120) say("kicker is empty or a paragraph, not a line");
  if (!SERIES.has(briefing.series)) say(`series "${briefing.series}" is not one the library knows`);

  if (!/^\/brand\/[\w.-]+\.(webp|png|jpe?g)$/.test(briefing.artwork ?? "")) say("artwork path is not under /brand/");
  else if (!context.artworkExists(briefing.artwork)) say(`artwork ${briefing.artwork} is not in public/`);

  const takeaways = briefing.takeaways ?? [];
  if (takeaways.length < 2 || takeaways.length > 4) say(`has ${takeaways.length} takeaways (2–4)`);
  if (takeaways.some((point) => !point?.trim())) say("has a blank takeaway");

  const explorePath = (briefing.explore?.to ?? "").split("#")[0];
  if (!briefing.explore?.label?.trim()) say("has no explore label");
  if (!explorePath || !context.isPublicPage(explorePath)) say(`explores ${briefing.explore?.to}, which is not a public page`);

  if (hasPublishingFields(briefing) && !isWatchable(briefing)) say("has some publishing fields but not all");
  if (isWatchable(briefing)) {
    if (!briefing.media?.poster) say("is published with no poster");
    if (!Number.isInteger(briefing.durationSeconds) || (briefing.durationSeconds ?? 0) <= 0) say("duration is not whole seconds");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(briefing.publishedOn ?? "") || Number.isNaN(Date.parse(`${briefing.publishedOn}T00:00:00Z`))) {
      say("publishedOn is not a YYYY-MM-DD date");
    }
  }

  for (const field of MEDIA_FIELDS) {
    const value = briefing.media?.[field];
    if (!value) continue;
    if (value.includes("\\")) say(`media.${field} uses a Windows separator`);
    if (value.split("/").includes("..")) say(`media.${field} climbs out of the bucket`);
    if (/^[a-z]+:/i.test(value) && !/^https:\/\//.test(value)) say(`media.${field} is not https`);
    if (!/^https:/.test(value) && !new RegExp(`^videos/${briefing.slug}/v\\d+/`).test(value)) {
      say(`media.${field} is outside the briefing's own folder`);
    }
  }
  if (briefing.media?.hls && !/\.m3u8(?:\?|$)/.test(briefing.media.hls)) say("hls is not a playlist");
  if (briefing.media?.mp4 && !/\.mp4(?:\?|$)/.test(briefing.media.mp4)) say("mp4 is not an MP4");
  if (briefing.media?.captions && !/\.vtt(?:\?|$)/.test(briefing.media.captions)) say("captions are not WebVTT");

  const chapters = briefing.chapters ?? [];
  if (chapters.length > 0) {
    if (chapters[0].at !== 0) say("first chapter is not at 0:00");
    chapters.forEach((chapter, index) => {
      if (!chapter.label?.trim()) say(`chapter ${index + 1} has no label`);
      if (!Number.isInteger(chapter.at) || chapter.at < 0) say(`chapter ${index + 1} is not at a whole second`);
      if (index > 0 && chapter.at <= chapters[index - 1].at) say("chapters are out of order");
      if (chapter.at >= (briefing.durationSeconds ?? 0)) say(`chapter "${chapter.label}" is past the end`);
    });
  }

  if (briefing.orientation !== undefined && !["landscape", "portrait"].includes(briefing.orientation)) {
    say(`orientation "${briefing.orientation}" is neither landscape nor portrait`);
  }
  if (briefing.disclaimer !== undefined) {
    const text = briefing.disclaimer.trim();
    if (!text || text.length > 240) say("disclaimer is empty or a paragraph");
    else if (!/[.!?]$/.test(text)) say("disclaimer is not a complete sentence");
  }
  (briefing.transcript ?? []).forEach((paragraph, index) => {
    if (!paragraph?.trim()) say(`transcript paragraph ${index + 1} is blank`);
  });

  return problems;
}

/**
 * Keep the entries that pass, in order, and say why the others were left out.
 * A later duplicate of a slug, title or summary is the one dropped, so the
 * entry already in the library keeps its place.
 */
export function acceptBriefings(
  list: readonly Briefing[],
  context: ValidationContext,
): { accepted: Briefing[]; rejected: Array<{ slug: string; problems: string[] }> } {
  const accepted: Briefing[] = [];
  const rejected: Array<{ slug: string; problems: string[] }> = [];
  const seen = { slug: new Set<string>(), title: new Set<string>(), summary: new Set<string>() };
  for (const briefing of list) {
    const problems = briefingProblems(briefing, context);
    if (seen.slug.has(briefing.slug)) problems.push("duplicate slug");
    if (seen.title.has(briefing.title)) problems.push("duplicate title");
    if (seen.summary.has(briefing.summary)) problems.push("duplicate summary");
    if (problems.length > 0) {
      rejected.push({ slug: String(briefing.slug), problems });
      continue;
    }
    seen.slug.add(briefing.slug);
    seen.title.add(briefing.title);
    seen.summary.add(briefing.summary);
    accepted.push(briefing);
  }
  return { accepted, rejected };
}

/** The library order: the flagship leads, everything else keeps the order it came in. */
export function libraryOrder(list: readonly Briefing[]): Briefing[] {
  return [...list].sort((a, b) => Number(b.series === "flagship") - Number(a.series === "flagship"));
}
