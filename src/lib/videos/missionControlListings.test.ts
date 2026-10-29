import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { routeMetadata } from "../routeMetadata";
import { BRIEFINGS } from "./catalog";
import { BRIEFINGS_DATA } from "./briefings.data";
import {
  briefingFromListing,
  canonicalBriefing,
  listingsFromResponse,
  renderBriefingsModule,
  type MissionControlListing,
} from "./missionControlListings";
import { acceptBriefings, briefingProblems, libraryOrder, type ValidationContext } from "./validate";

const context: ValidationContext = {
  isPublicPage: (path) => routeMetadata(path)?.indexable === true,
  artworkExists: (path) => existsSync(new URL(`../../../public${path}`, import.meta.url)),
};

const listing = (overrides: Partial<MissionControlListing> = {}): MissionControlListing => ({
  slug: "client-reporting",
  status: "published",
  title: "Client Reporting, Branded",
  kicker: "A report the client can understand, in your firm's own brand.",
  summary:
    "How a property moves from financial analysis into a professional, branded report the client can understand, generated from the same client record the analysis used.",
  series: "platform",
  artwork: "/brand/layer-02-strategic-intelligence.webp",
  artwork_position: null,
  takeaways: ["Reports carry the firm's own branding.", "They are generated from the client record."],
  explore_label: "See custom reporting",
  explore_to: "/platform#custom-reporting",
  orientation: "landscape",
  disclaimer: null,
  transcript: ["A report, in moments."],
  chapters: [
    { at: 0, label: "The brief" },
    { at: 30, label: "The report" },
  ],
  media: {
    hls: "videos/client-reporting/v1/master.m3u8",
    mp4: "videos/client-reporting/v1/fallback-720p.mp4",
    poster: "videos/client-reporting/v1/poster.jpg",
    card: "videos/client-reporting/v1/card.jpg",
    captions: null,
  },
  duration_seconds: 95,
  published_on: "2026-11-02",
  ...overrides,
});

test("the committed snapshot is the catalogue, and passes every publishing rule", () => {
  assert.equal(BRIEFINGS, BRIEFINGS_DATA);
  const { accepted, rejected } = acceptBriefings(BRIEFINGS, context);
  assert.deepEqual(rejected, []);
  assert.equal(accepted.length, BRIEFINGS.length);
});

test("a published listing becomes a watchable entry", () => {
  const briefing = briefingFromListing(listing());
  assert.deepEqual(briefingProblems(briefing, context), []);
  assert.equal(briefing.durationSeconds, 95);
  assert.equal(briefing.media?.hls, "videos/client-reporting/v1/master.m3u8");
  assert.equal("captions" in (briefing.media ?? {}), false, "an empty media field is dropped, not kept as null");
  assert.equal("artworkPosition" in briefing, false);
});

/**
 * Images go up in a version folder of their own, so a designed thumbnail can
 * sit in v2 beside a stream still in v1. Each field is held to the briefing's
 * folder on its own, never to the stream's version.
 */
test("a designed thumbnail is carried across, from its own version folder", () => {
  const media = { ...listing().media!, thumbnail: "videos/client-reporting/v2/thumbnail.jpg" };
  const briefing = briefingFromListing(listing({ media }));
  assert.equal(briefing.media?.thumbnail, "videos/client-reporting/v2/thumbnail.jpg");
  assert.deepEqual(briefingProblems(briefing, context), []);
  assert.deepEqual(
    Object.keys(briefing.media ?? {}),
    ["hls", "mp4", "poster", "thumbnail", "card"],
    "the generated file keeps one key order",
  );
});

test("no thumbnail, a null one or a blank one leaves the entry exactly as it was", () => {
  // The fixture is a listing from a Mission Control that predates the field.
  assert.equal("thumbnail" in listing().media!, false);
  const without = briefingFromListing(listing());
  assert.equal("thumbnail" in (without.media ?? {}), false);
  for (const thumbnail of [null, "", "  "]) {
    const briefing = briefingFromListing(listing({ media: { ...listing().media!, thumbnail } }));
    assert.equal("thumbnail" in (briefing.media ?? {}), false, `thumbnail ${JSON.stringify(thumbnail)}`);
    assert.deepEqual(briefing, without);
  }
});

test("a thumbnail from another briefing's folder is refused like any other media field", () => {
  const briefing = briefingFromListing(
    listing({ media: { ...listing().media!, thumbnail: "videos/other/v2/thumbnail.jpg" } }),
  );
  assert.deepEqual(briefingProblems(briefing, context), ["media.thumbnail is outside the briefing's own folder"]);
  const premiere = briefingFromListing(
    listing({ status: "premiere", media: { ...listing().media!, thumbnail: "videos/client-reporting/v2/thumbnail.jpg" } }),
  );
  assert.equal(premiere.media, undefined, "a premiere carries no thumbnail either");
});

test("a premiere carries no publishing fields, whatever Mission Control holds", () => {
  const briefing = briefingFromListing(listing({ status: "premiere" }));
  assert.equal(briefing.media, undefined);
  assert.equal(briefing.durationSeconds, undefined);
  assert.equal(briefing.publishedOn, undefined);
  assert.equal(briefing.chapters, undefined);
  assert.deepEqual(briefingProblems(briefing, context), []);
});

test("listings that break a rule are left out by name, and the rest go live", () => {
  const good = briefingFromListing(listing());
  const outside = briefingFromListing(
    listing({ slug: "stray", title: "Stray", summary: `${listing().summary} Stray.`, media: { ...listing().media!, hls: "videos/other/v1/master.m3u8" } }),
  );
  const nowhere = briefingFromListing(
    listing({ slug: "nowhere", title: "Nowhere", summary: `${listing().summary} Nowhere.`, explore_to: "/pricing" }),
  );
  const halfway = briefingFromListing(
    listing({ slug: "halfway", title: "Halfway", summary: `${listing().summary} Halfway.`, duration_seconds: null }),
  );
  const { accepted, rejected } = acceptBriefings([good, outside, nowhere, halfway], context);
  assert.deepEqual(accepted.map((b) => b.slug), ["client-reporting"]);
  assert.deepEqual(rejected.map((r) => r.slug), ["stray", "nowhere", "halfway"]);
  assert.match(rejected[0].problems.join(), /outside the briefing's own folder/);
  assert.match(rejected[1].problems.join(), /not a public page/);
  assert.match(rejected[2].problems.join(), /some publishing fields but not all/);
});

test("a later duplicate is the one dropped", () => {
  const first = briefingFromListing(listing());
  const again = briefingFromListing(listing({ title: "Another title", summary: `${listing().summary} Again.` }));
  const { accepted, rejected } = acceptBriefings([first, again], context);
  assert.equal(accepted.length, 1);
  assert.deepEqual(rejected[0].problems, ["duplicate slug"]);
});

test("the flagship leads the library, and everything else keeps its order", () => {
  const ordered = libraryOrder([
    briefingFromListing(listing({ slug: "a" })),
    briefingFromListing(listing({ slug: "flag", series: "flagship" })),
    briefingFromListing(listing({ slug: "b" })),
  ]);
  assert.deepEqual(ordered.map((b) => b.slug), ["flag", "a", "b"]);
});

test("only a well-formed ok answer is used; anything else keeps the snapshot", () => {
  assert.deepEqual(listingsFromResponse(500, { ok: false }), { ok: false, reason: "HTTP 500" });
  assert.equal(listingsFromResponse(200, { ok: false }).ok, false);
  assert.equal(listingsFromResponse(200, { ok: true }).ok, false);
  const answer = listingsFromResponse(200, {
    ok: true,
    briefings: [listing(), { slug: "draft", status: "draft" }, null, { status: "published" }],
  });
  assert.ok(answer.ok);
  assert.deepEqual(answer.ok && answer.listings.map((l) => l.slug), ["client-reporting"]);
  // An empty list is a decision Mission Control made, and is honoured.
  assert.deepEqual(listingsFromResponse(200, { ok: true, briefings: [] }), { ok: true, listings: [] });
});

test("the generated module round-trips the snapshot exactly", () => {
  const text = renderBriefingsModule(BRIEFINGS, "test");
  const json = text.slice(text.indexOf("= ") + 2, text.lastIndexOf(";"));
  assert.deepEqual(JSON.parse(json), BRIEFINGS.map(canonicalBriefing));
  assert.deepEqual(BRIEFINGS.map(canonicalBriefing), BRIEFINGS, "the snapshot is already canonical");
});
