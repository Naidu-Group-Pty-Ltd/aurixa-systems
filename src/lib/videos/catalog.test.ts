import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { ROUTE_METADATA, briefingRoutes, routeMetadata } from "../routeMetadata";
import {
  BRIEFINGS,
  DEFAULT_VIDEO_MEDIA_ORIGIN,
  briefingBySlug,
  briefingPath,
  featuredBriefing,
  formatDuration,
  formatPublished,
  isPublished,
  mediaUrl,
  publishedBriefings,
  spokenDuration,
  upNextAfter,
  videoMediaOrigin,
  type Briefing,
} from "./catalog";

/**
 * The publishing rules for the Briefing Room. The registry tests cover what
 * happens once a briefing is a route; these cover whether an entry is fit to
 * become one — and, for the premieres, fit to be shown as a card at all.
 */

const publicFile = (path: string) => new URL(`../../../public${path}`, import.meta.url);

/** Every media field an entry can carry. */
const MEDIA_FIELDS = ["hls", "mp4", "poster", "thumbnail", "card", "captions"] as const;

test("slugs are unique, URL-safe and stable in shape", () => {
  const slugs = BRIEFINGS.map((briefing) => briefing.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate slug");
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${slug} is not lowercase-hyphenated`);
    assert.ok(slug.length <= 60, `${slug} is too long to read in a shared link`);
  }
});

test("titles and summaries are unique, and summaries fit a search snippet", () => {
  const titles = BRIEFINGS.map((briefing) => briefing.title);
  assert.equal(new Set(titles).size, titles.length, "duplicate title");

  const summaries = BRIEFINGS.map((briefing) => briefing.summary);
  assert.equal(new Set(summaries).size, summaries.length, "duplicate summary");
  for (const briefing of BRIEFINGS) {
    assert.ok(
      briefing.summary.length >= 70 && briefing.summary.length <= 320,
      `${briefing.slug} summary is ${briefing.summary.length} chars (70–320)`,
    );
    assert.ok(briefing.kicker.length <= 120, `${briefing.slug} kicker is a paragraph, not a line`);
  }
});

/**
 * A briefing page's description is its summary. A summary copied from the
 * page the video explains would tell a search engine the two are one page.
 */
test("no summary repeats another page's description", () => {
  const briefingPaths = new Set(BRIEFINGS.map((briefing) => briefingPath(briefing.slug)));
  const others = ROUTE_METADATA.filter((entry) => !briefingPaths.has(entry.path));
  for (const briefing of BRIEFINGS) {
    const clash = others.find((entry) => entry.description === briefing.summary);
    assert.ok(!clash, `${briefing.slug} summary is the description of ${clash?.path}`);
  }
});

test("there is exactly one flagship, and it leads the library", () => {
  const flagships = BRIEFINGS.filter((briefing) => briefing.series === "flagship");
  assert.equal(flagships.length, 1);
  assert.equal(BRIEFINGS[0].series, "flagship");
});

test("every entry's artwork ships in public/", () => {
  for (const briefing of BRIEFINGS) {
    assert.match(briefing.artwork, /^\/brand\/[\w.-]+\.(webp|png|jpe?g)$/, `${briefing.slug} artwork path`);
    assert.ok(existsSync(publicFile(briefing.artwork)), `${briefing.slug}: ${briefing.artwork} is missing`);
  }
});

/** The copy rule from catalog.ts: a takeaway restates the page it links to. */
test("every entry explains itself and points at the public page it restates", () => {
  for (const briefing of BRIEFINGS) {
    assert.ok(
      briefing.takeaways.length >= 2 && briefing.takeaways.length <= 4,
      `${briefing.slug} has ${briefing.takeaways.length} takeaways (2–4)`,
    );
    for (const point of briefing.takeaways) assert.ok(point.trim().length > 0, `${briefing.slug} has a blank takeaway`);

    const [path] = briefing.explore.to.split("#");
    assert.equal(
      routeMetadata(path)?.indexable,
      true,
      `${briefing.slug} explores ${briefing.explore.to}, which is not a public page`,
    );
    assert.ok(briefing.explore.label.trim().length > 0, `${briefing.slug} has no explore label`);
  }
});

/**
 * The one that keeps a half-finished upload off the site. Media without a
 * running time or a date is not published — it would show as a premiere with
 * a stream behind it — so it is refused outright rather than left ambiguous.
 */
test("no entry is half-published", () => {
  for (const briefing of BRIEFINGS) {
    const hasStream = Boolean(briefing.media?.hls || briefing.media?.mp4);
    const hasDetails = Boolean(briefing.durationSeconds || briefing.publishedOn || briefing.chapters?.length);
    if (hasStream || hasDetails) {
      assert.ok(isPublished(briefing), `${briefing.slug} has some publishing fields but not all`);
    }
  }
});

test("published entries carry everything a viewer and a crawler need", () => {
  for (const briefing of publishedBriefings()) {
    assert.ok(briefing.media.poster, `${briefing.slug} has no poster`);
    assert.ok(Number.isInteger(briefing.durationSeconds) && briefing.durationSeconds > 0, `${briefing.slug} duration`);
    assert.match(briefing.publishedOn, /^\d{4}-\d{2}-\d{2}$/, `${briefing.slug} publishedOn is not YYYY-MM-DD`);
    assert.ok(!Number.isNaN(Date.parse(`${briefing.publishedOn}T00:00:00Z`)), `${briefing.slug} publishedOn is not a date`);
  }
});

test("media is served over https, from storage, by path or absolute URL", () => {
  // The production bucket, whatever a local override says: a relative path is
  // only as secure as the origin it resolves against.
  assert.match(DEFAULT_VIDEO_MEDIA_ORIGIN, /^https:\/\//);
  for (const briefing of BRIEFINGS) {
    for (const field of MEDIA_FIELDS) {
      const value = briefing.media?.[field];
      if (!value) continue;
      const where = `${briefing.slug} media.${field}`;
      assert.ok(!value.includes("\\"), `${where} uses a Windows separator`);
      assert.ok(!value.split("/").includes(".."), `${where} climbs out of the bucket`);
      if (/^[a-z]+:/i.test(value)) assert.match(value, /^https:\/\//, `${where} is not https`);
      assert.doesNotThrow(() => new URL(mediaUrl(value)!), where);
    }
    if (briefing.media?.hls) assert.match(briefing.media.hls, /\.m3u8(?:\?|$)/, `${briefing.slug} hls is not a playlist`);
    if (briefing.media?.mp4) assert.match(briefing.media.mp4, /\.mp4(?:\?|$)/, `${briefing.slug} mp4 is not an MP4`);
    if (briefing.media?.captions) assert.match(briefing.media.captions, /\.vtt(?:\?|$)/, `${briefing.slug} captions are not WebVTT`);
  }
});

test("chapters start at zero, run forward and end inside the video", () => {
  for (const briefing of BRIEFINGS) {
    const chapters = briefing.chapters ?? [];
    if (chapters.length === 0) continue;
    assert.equal(chapters[0].at, 0, `${briefing.slug} first chapter is not at 0:00`);
    chapters.forEach((chapter, index) => {
      assert.ok(chapter.label.trim().length > 0, `${briefing.slug} chapter ${index + 1} has no label`);
      if (index > 0) assert.ok(chapter.at > chapters[index - 1].at, `${briefing.slug} chapters are out of order`);
      assert.ok(chapter.at < (briefing.durationSeconds ?? 0), `${briefing.slug} chapter "${chapter.label}" is past the end`);
    });
  }
});

test("orientation, disclaimers and transcripts are well formed", () => {
  for (const briefing of BRIEFINGS) {
    if (briefing.orientation !== undefined) {
      assert.ok(["landscape", "portrait"].includes(briefing.orientation), `${briefing.slug} orientation`);
    }
    if (briefing.disclaimer !== undefined) {
      const text = briefing.disclaimer.trim();
      assert.ok(text.length > 0 && text.length <= 240, `${briefing.slug} disclaimer is empty or a paragraph`);
      assert.match(text, /[.!?]$/, `${briefing.slug} disclaimer should be a complete sentence`);
    }
    for (const [index, paragraph] of (briefing.transcript ?? []).entries()) {
      assert.ok(paragraph.trim().length > 0, `${briefing.slug} transcript paragraph ${index + 1} is blank`);
    }
  }
});

/**
 * A published briefing streams from the bucket the upload script writes, at
 * the layout it writes: videos/<slug>/<version>/. A path pointing at another
 * briefing's folder would play the wrong video under this one's title.
 */
test("published media lives in the briefing's own folder", () => {
  for (const briefing of publishedBriefings()) {
    for (const field of MEDIA_FIELDS) {
      const value = briefing.media[field];
      if (!value || /^https:/.test(value)) continue;
      assert.match(value, new RegExp(`^videos/${briefing.slug}/v\\d+/`), `${briefing.slug} media.${field} is outside its folder`);
    }
  }
});

// ── The helpers, against fixtures, so they are proven before any video ships ─

const fixture = (overrides: Partial<Briefing> & Pick<Briefing, "slug">): Briefing => ({
  title: `Fixture ${overrides.slug}`,
  kicker: "A fixture.",
  summary: `A fixture briefing used only by the catalogue tests, slug ${overrides.slug}, long enough to pass.`,
  series: "platform",
  artwork: "/brand/layer-01-operational-intelligence.webp",
  takeaways: ["One.", "Two."],
  explore: { label: "Platform", to: "/platform" },
  ...overrides,
});

const live = (slug: string, extra: Partial<Briefing> = {}) =>
  fixture({
    slug,
    media: { hls: `videos/${slug}/v1/master.m3u8`, poster: `videos/${slug}/v1/poster.jpg`, card: `videos/${slug}/v1/card.jpg` },
    durationSeconds: 125,
    publishedOn: "2026-10-28",
    ...extra,
  });

const LIBRARY = [
  fixture({ slug: "flag", series: "flagship" }),
  live("one"),
  fixture({ slug: "soon" }),
  live("two"),
];

test("only fully published fixtures become routes, each with its own card and type", () => {
  const routes = briefingRoutes(LIBRARY);
  assert.deepEqual(routes.map((route) => route.path), ["/watch/one", "/watch/two"]);
  for (const route of routes) {
    assert.ok(route.indexable);
    assert.ok(route.title.endsWith(" – Video Briefing | Aurixa Systems"), route.title);
    assert.equal(route.ogType, "video.other");
    assert.ok(route.ogImage?.startsWith(`${videoMediaOrigin()}/videos/`), route.ogImage);
  }
});

test("the featured briefing falls back from an unpublished flagship to the first live one", () => {
  assert.equal(featuredBriefing(LIBRARY).slug, "one");
  assert.equal(featuredBriefing([fixture({ slug: "flag", series: "flagship" })]).slug, "flag");
  assert.equal(featuredBriefing([live("flag", { series: "flagship" }), live("one")]).slug, "flag");
});

test("up next skips premieres, wraps, and is null when there is nothing else to watch", () => {
  assert.equal(upNextAfter("one", LIBRARY)?.slug, "two");
  assert.equal(upNextAfter("two", LIBRARY)?.slug, "one");
  assert.equal(upNextAfter("flag", LIBRARY)?.slug, "one");
  assert.equal(upNextAfter("one", [live("one")]), null);
  assert.equal(upNextAfter("missing", LIBRARY), null);
});

test("lookups and paths", () => {
  assert.equal(briefingBySlug("two", LIBRARY)?.slug, "two");
  assert.equal(briefingBySlug("nope", LIBRARY), undefined);
  assert.equal(briefingPath("two"), "/watch/two");
});

test("media paths resolve against the bucket; absolute https URLs pass through", () => {
  // `videoMediaOrigin()` is the default bucket unless VITE_VIDEO_MEDIA_ORIGIN
  // points a staging build at other storage.
  assert.equal(mediaUrl("videos/a/v1/master.m3u8"), `${videoMediaOrigin()}/videos/a/v1/master.m3u8`);
  assert.equal(mediaUrl("/videos/a/poster.jpg"), `${videoMediaOrigin()}/videos/a/poster.jpg`);
  assert.equal(mediaUrl("https://cdn.example.com/x.m3u8"), "https://cdn.example.com/x.m3u8");
  assert.equal(mediaUrl(undefined), undefined);
  assert.equal(mediaUrl(""), undefined);
});

test("durations format for the eye and for the ear", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(245.9), "4:05");
  assert.equal(formatDuration(3723), "1:02:03");
  assert.equal(spokenDuration(245), "4 minutes 5 seconds");
  assert.equal(spokenDuration(60), "1 minute");
  assert.equal(spokenDuration(3601), "1 hour 1 second");
  assert.equal(spokenDuration(0), "0 seconds");
});

test("publication dates format identically in every time zone", () => {
  assert.equal(formatPublished("2026-10-28"), "28 Oct 2026");
  assert.equal(formatPublished("2026-01-01"), "1 Jan 2026");
});
