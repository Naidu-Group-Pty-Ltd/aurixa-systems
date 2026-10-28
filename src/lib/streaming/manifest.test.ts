import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeManifest } from "./manifest";

/**
 * The cases that actually broke playback on the NPC Services VSL, whose ladder
 * was packaged on Windows and shipped `v0\playlist.m3u8` as a variant URI.
 * Browsers repair the backslash silently; RFC 3986 clients request
 * `v0%5Cplaylist.m3u8` and storage answers 400. Imported directly here rather
 * than mirrored, because this repository runs its tests through tsx.
 */

test("rewrites Windows separators in bare variant URIs", () => {
  const input = [
    "#EXTM3U",
    "#EXT-X-STREAM-INF:BANDWIDTH=7095872,RESOLUTION=1920x1080",
    "v0\\playlist.m3u8",
  ].join("\n");

  assert.equal(
    normalizeManifest(input),
    ["#EXTM3U", "#EXT-X-STREAM-INF:BANDWIDTH=7095872,RESOLUTION=1920x1080", "v0/playlist.m3u8"].join("\n"),
  );
});

test("rewrites separators inside quoted URI attributes", () => {
  const input = '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",URI="aud\\playlist.m3u8"';
  assert.equal(normalizeManifest(input), '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",URI="aud/playlist.m3u8"');
});

test("leaves backslashes in non-URI tag attributes alone", () => {
  const input = '#EXT-X-SESSION-DATA:DATA-ID="com.aurixa.note",VALUE="a\\b"';
  assert.equal(normalizeManifest(input), input);
});

test("handles nested paths and multiple separators", () => {
  assert.equal(normalizeManifest("a\\b\\c\\playlist.m3u8"), "a/b/c/playlist.m3u8");
});

test("returns a clean manifest untouched, by identity", () => {
  const clean = "#EXTM3U\n#EXT-X-VERSION:7\nv720/playlist.m3u8\n";
  assert.equal(normalizeManifest(clean), clean);
});

test("preserves blank lines and CRLF-free structure", () => {
  const input = "#EXTM3U\n\nv0\\a.m3u8\n\n";
  assert.equal(normalizeManifest(input), "#EXTM3U\n\nv0/a.m3u8\n\n");
});
