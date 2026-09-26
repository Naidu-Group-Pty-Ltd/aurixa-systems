import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ADDON_PURCHASE_LINKS } from "../addonPurchaseLinks";
import { annualCents } from "./commitmentDiscount";
import {
  MOCK_CATALOGUE,
  MOCK_EXCLUSIONS,
  MOCK_MODULES,
  MOCK_MODULE_GROUPS,
  MOCK_PACKS,
  MOCK_PRICE_CENTS,
  MOCK_SETUPS,
  MOCK_TIERS,
  RESERVED_LIVE_METADATA_KEYS,
  discountMultiple,
  formatAud,
  modulesInGroup,
} from "./mockCatalog";

/**
 * The one that actually protects money.
 *
 * Mission Control's three sync routines find a product by searching Stripe for
 * `metadata['aurixa_tier']`, `metadata['aurixa_module']` or
 * `metadata['aurixa_pack']`. A mock carrying one of those keys could be
 * adopted as the live product on the next Apply, repointing a real catalogue
 * row at a $1 price. The mocks use `aurixa_mock_*` instead, and this asserts
 * the reserved forms never reappear in the file — including in a comment that
 * somebody later copies into a Stripe call.
 */
test("the mock catalogue never names a metadata key the live sync searches on", async () => {
  const source = await readFile(new URL("./mockCatalog.ts", import.meta.url), "utf8");

  // Three things have to come out before the scan can mean anything, and each
  // of them is a case where naming a reserved key is correct rather than a
  // defect:
  //
  //   • Comments. The header explains at length WHY these keys are avoided,
  //     which it cannot do without writing them down. Prose attaches nothing
  //     to a Stripe product.
  //   • The reserved list's own declaration, which necessarily spells all
  //     three.
  //   • The mock forms — `aurixa_mock_module` contains `aurixa_module` as a
  //     substring, so left in it would report itself.
  //
  // What remains is the data, which is the only part that could ever reach
  // Stripe.
  const scanned = source
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/\/\/.*$/gm, "")
    .replace(/export const RESERVED_LIVE_METADATA_KEYS[\s\S]*?\] as const;/, "")
    .replaceAll(/aurixa_mock_\w+/g, "«mock»");

  for (const key of RESERVED_LIVE_METADATA_KEYS) {
    assert.ok(
      !scanned.includes(key),
      `${key} is a live-sync search key and must never be attached to a mock product`,
    );
  }
});

/**
 * Pins the reserved list itself. The scan above is only as good as the keys it
 * is given, and a key quietly dropped from the list would disarm it silently.
 */
test("the reserved list names exactly the three keys Mission Control searches on", () => {
  assert.deepEqual(
    [...RESERVED_LIVE_METADATA_KEYS].sort(),
    ["aurixa_module", "aurixa_pack", "aurixa_tier"],
  );
});

test("every mock link is an https Stripe payment link, and no two share one", () => {
  const seen = new Set<string>();
  for (const item of MOCK_CATALOGUE) {
    const url = new URL(item.url);
    assert.equal(url.protocol, "https:", item.slug);
    assert.equal(url.host, "buy.stripe.com", `${item.slug} must point at Stripe's hosted checkout`);
    assert.ok(!seen.has(item.url), `${item.slug} reuses a link already claimed by another mock`);
    seen.add(item.url);
  }
});

/**
 * A mock that shares a URL with a live product would charge the live price
 * while the page advertised a dollar — the exact failure addonPurchaseLinks.ts
 * was built to prevent, arriving from the other direction.
 */
test("no mock link collides with a live add-on payment link", () => {
  const live = new Set(Object.values(ADDON_PURCHASE_LINKS).map((l) => l.url));
  for (const item of MOCK_CATALOGUE) {
    assert.ok(!live.has(item.url), `${item.slug} points at a LIVE payment link`);
  }
});

test("Stripe ids are well formed, and a price is never claimed by two line items", () => {
  const prices = new Set<string>();
  for (const item of MOCK_CATALOGUE) {
    assert.match(item.productId, /^prod_[A-Za-z0-9]+$/, item.slug);
    assert.match(item.priceId, /^price_[A-Za-z0-9]+$/, item.slug);
    assert.ok(!prices.has(item.priceId), `${item.slug} reuses price ${item.priceId}`);
    prices.add(item.priceId);
  }
});

/**
 * A tier is one product carrying two prices — monthly and annual — because
 * that is how Mission Control models it: `seat_plans.stripe_price_id` is the
 * monthly price and `metadata.annual_stripe_price_id` the yearly one. Minting
 * two products would not exercise that shape.
 */
test("each tier's monthly and annual mocks sit on one product, with distinct prices", () => {
  const byTier = new Map<string, typeof MOCK_TIERS[number][]>();
  for (const t of MOCK_TIERS) {
    byTier.set(t.slug, [...(byTier.get(t.slug) ?? []), t]);
  }
  for (const [slug, rows] of byTier) {
    const products = new Set(rows.map((r) => r.productId));
    assert.equal(products.size, 1, `${slug} should have exactly one Stripe product`);
    const periods = rows.map((r) => r.period);
    assert.equal(new Set(periods).size, rows.length, `${slug} has a duplicated billing period`);
  }
  // Enterprise is quoted in production and has no annual price live, so it is
  // the one tier with a single mock. Everything else must offer both.
  for (const slug of ["launch", "growth", "scale"]) {
    assert.equal(byTier.get(slug)?.length, 2, `${slug} needs a monthly and an annual mock`);
  }
  assert.equal(byTier.get("enterprise")?.length, 1);
});

/**
 * The annual live price is derived, not transcribed: twelve months of the
 * tier's monthly price less the commitment discount, as Mission Control mints
 * it. When the discount moved from 10% to 15% these three figures were the
 * ones left behind, so they are checked against the rule rather than trusted.
 */
test("each tier's annual live price is twelve months less the commitment discount", () => {
  const annual = MOCK_TIERS.filter((t) => t.period === "annual");
  assert.equal(annual.length, 3);
  for (const a of annual) {
    const monthly = MOCK_TIERS.find((t) => t.slug === a.slug && t.period === "monthly");
    assert.ok(monthly, `${a.slug} has a monthly mock`);
    assert.equal(a.livePriceCents, annualCents(monthly.livePriceCents), a.slug);
  }
});

/**
 * The module set is pinned against the live purchase links rather than counted,
 * so a module going on sale — or being withdrawn — fails here instead of
 * quietly leaving the test catalogue one item short of the real one.
 */
test("the mock modules are exactly the modules that are live-purchasable", () => {
  const mock = new Set(MOCK_MODULES.map((m) => m.slug));
  const live = new Set(Object.keys(ADDON_PURCHASE_LINKS));
  assert.deepEqual([...mock].sort(), [...live].sort());
});

/**
 * Each module's quoted live price is checked against the live link's own
 * recorded amount. Both were transcribed from Mission Control's
 * `aurixa-catalog.ts`; if they disagree, one of the two transcriptions drifted.
 */
test("each module's live price matches the amount the live link charges", () => {
  for (const m of MOCK_MODULES) {
    assert.equal(
      m.livePriceCents,
      ADDON_PURCHASE_LINKS[m.slug].amountCents,
      `${m.slug}: mock catalogue and live link disagree on the real price`,
    );
  }
});

test("an excluded item is never also minted", () => {
  const minted = new Set(MOCK_CATALOGUE.map((i) => i.slug));
  for (const ex of MOCK_EXCLUSIONS) {
    assert.ok(!minted.has(ex.slug), `${ex.slug} is listed as excluded but appears in the catalogue`);
    assert.ok(ex.reason.length > 20, `${ex.slug} needs a reason worth reading`);
  }
});

test("every module belongs to a rendered group, and every group has modules", () => {
  for (const m of MOCK_MODULES) {
    assert.ok(
      (MOCK_MODULE_GROUPS as readonly string[]).includes(m.group),
      `${m.slug} sits in '${m.group}', which the page never renders`,
    );
  }
  for (const g of MOCK_MODULE_GROUPS) {
    assert.ok(modulesInGroup(g).length > 0, `${g} would render as an empty heading`);
  }
});

test("packs are one-off, ordered smallest first, and modules recur monthly", () => {
  for (const p of MOCK_PACKS) {
    assert.equal(p.billing, "one_time", `${p.slug} must be bought outright, not subscribed to`);
  }
  const credits = MOCK_PACKS.map((p) => p.credits ?? 0);
  assert.deepEqual(credits, [...credits].sort((a, b) => a - b), "the ladder must stay sorted");
  for (const m of MOCK_MODULES) {
    assert.equal(m.billing, "month", `${m.slug} is a monthly subscription in production`);
  }
  for (const s of MOCK_SETUPS) {
    assert.equal(s.billing, "one_time", `${s.slug} is a one-off package`);
  }
});

test("every mock is genuinely cheaper than the thing it stands in for", () => {
  for (const item of MOCK_CATALOGUE) {
    assert.ok(
      item.livePriceCents > MOCK_PRICE_CENTS,
      `${item.slug} quotes a live price at or below the A$1 mock, which cannot be right`,
    );
    assert.ok(discountMultiple(item) > 1);
  }
});

test("money is formatted the Australian way, and whole dollars lose the cents", () => {
  assert.equal(formatAud(100), "$1");
  assert.equal(formatAud(2090), "$20.90");
  assert.equal(formatAud(69900), "$699");
});
