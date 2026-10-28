import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE_ORIGIN } from "../routeMetadata";
import {
  SHARE_CAMPAIGN,
  SHARE_CHANNELS,
  canonicalShareUrl,
  shareIntentUrl,
  taggedShareUrl,
  type ShareChannel,
} from "./share";

const tags = (url: string) => Object.fromEntries(new URL(url).searchParams);

test("a copied link is the clean canonical URL", () => {
  assert.equal(canonicalShareUrl("/watch/compliance-passport"), `${SITE_ORIGIN}/watch/compliance-passport`);
  assert.equal(new URL(canonicalShareUrl("/watch")).search, "");
});

/**
 * Pinned against what Mission Control's lead classifier reads. If a value here
 * changes, a lead that arrived through that share stops being credited to the
 * channel that sent it — so changing one should mean editing this table.
 */
test("each share channel carries the tags Mission Control attributes", () => {
  const expected: Record<ShareChannel, { utm_source: string; utm_medium: string }> = {
    linkedin: { utm_source: "linkedin", utm_medium: "social" },
    x: { utm_source: "x", utm_medium: "social" },
    facebook: { utm_source: "facebook", utm_medium: "social" },
    whatsapp: { utm_source: "whatsapp", utm_medium: "social" },
    email: { utm_source: "email", utm_medium: "email" },
  };
  for (const { channel } of SHARE_CHANNELS) {
    const url = taggedShareUrl("/watch/builders-network", channel, "builders-network");
    assert.equal(new URL(url).origin, SITE_ORIGIN);
    assert.equal(new URL(url).pathname, "/watch/builders-network");
    assert.deepEqual(tags(url), {
      ...expected[channel],
      utm_campaign: SHARE_CAMPAIGN,
      utm_content: "builders-network",
    });
  }
});

test("no share link ever carries a paid-traffic marker", () => {
  for (const { channel } of SHARE_CHANNELS) {
    const params = tags(taggedShareUrl("/watch", channel, "hub"));
    for (const marker of ["gclid", "fbclid", "ttclid", "gbraid", "wbraid"]) assert.ok(!(marker in params));
    assert.ok(!/cpc|ppc|paid/.test(params.utm_medium), `${channel} reads as paid`);
  }
});

test("intent URLs open each platform's own dialog with the tagged link inside", () => {
  const share = { path: "/watch/aurixa-voice", title: "Aurixa Voice: AI Voice Agents", content: "aurixa-voice" };
  const hosts: Record<ShareChannel, string> = {
    linkedin: "www.linkedin.com",
    x: "x.com",
    facebook: "www.facebook.com",
    whatsapp: "wa.me",
    email: "",
  };
  for (const { channel } of SHARE_CHANNELS) {
    const intent = shareIntentUrl(channel, share);
    const tagged = taggedShareUrl(share.path, channel, share.content);
    if (channel === "email") {
      assert.ok(intent.startsWith("mailto:?subject="), intent);
    } else {
      assert.equal(new URL(intent).protocol, "https:");
      assert.equal(new URL(intent).host, hosts[channel]);
    }
    assert.ok(decodeURIComponent(intent).includes(tagged), `${channel} intent does not carry the tagged link`);
  }
});
