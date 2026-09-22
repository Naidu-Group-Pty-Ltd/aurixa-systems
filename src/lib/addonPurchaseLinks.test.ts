import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  ADDON_PURCHASE_LINKS,
  accountReference,
  resolveAddonPurchase,
  type PurchasableAddon,
} from "./addonPurchaseLinks";

const addon = (overrides: Partial<PurchasableAddon> = {}): PurchasableAddon => ({
  slug: "deal-pipeline",
  price_min_cents: 14900,
  price_max_cents: 14900,
  currency: "AUD",
  included_in_plans: [],
  ...overrides,
});

test("every link is an https Stripe payment link, and no two modules share one", () => {
  const seen = new Set<string>();
  for (const [slug, link] of Object.entries(ADDON_PURCHASE_LINKS)) {
    const url = new URL(link.url);
    assert.equal(url.protocol, "https:", slug);
    assert.equal(url.host, "buy.stripe.com", `${slug} must point at Stripe's hosted checkout`);
    assert.equal(url.search, "", `${slug} carries no baked-in query — it is built per visitor`);
    assert.ok(Number.isInteger(link.amountCents) && link.amountCents > 0, `${slug} needs an amount`);
    assert.equal(seen.has(link.url), false, `${link.url} is used by more than one module`);
    seen.add(link.url);
  }
});

test("a module with a link, a fixed price and no plan of its own is buyable", () => {
  const purchase = resolveAddonPurchase(addon());
  assert.deepEqual(purchase, {
    available: true,
    url: "https://buy.stripe.com/9B6cMY6Ii6iW9Kv6K80co1f",
    amountCents: 14900,
  });
});

test("a module nobody sells here has no button, whichever reason applies", () => {
  // `lenders` is in development: no Stripe product, so no link, by design.
  assert.equal(ADDON_PURCHASE_LINKS.lenders, undefined);
  assert.deepEqual(resolveAddonPurchase(addon({ slug: "lenders", price_min_cents: 9900 })), {
    available: false,
    reason: "not_sold",
  });
  // The Builder / Developer Portal is the other reason, and the newer one: it
  // has a price and it is real, but it is sold directly on another deployment.
  // A priced module is therefore not evidence that this page may charge for it.
  assert.equal(ADDON_PURCHASE_LINKS["builder-developer-portal"], undefined);
  assert.deepEqual(
    resolveAddonPurchase(addon({ slug: "builder-developer-portal", price_min_cents: 69900 })),
    { available: false, reason: "not_sold" },
  );
  // A module the catalog adds tomorrow behaves the same way rather than erroring.
  assert.deepEqual(resolveAddonPurchase(addon({ slug: "something-new" })), {
    available: false,
    reason: "not_sold",
  });
});

test("the catalog price and the link price must agree before anything is offered", () => {
  // The card quotes the catalog. Charging a different number would be the page
  // lying about the price, so no link is offered at all. 9900 is this module's
  // pre-2026 figure, which is the shape this guard actually meets: a reprice
  // that reached one system and not the other.
  assert.deepEqual(resolveAddonPurchase(addon({ price_min_cents: 9900, price_max_cents: 9900 })), {
    available: false,
    reason: "price_mismatch",
  });
});

test("a price quoted as a range cannot be a single payment link", () => {
  assert.deepEqual(resolveAddonPurchase(addon({ price_min_cents: 14900, price_max_cents: 29900 })), {
    available: false,
    reason: "not_a_fixed_price",
  });
  assert.deepEqual(resolveAddonPurchase(addon({ price_min_cents: null })), {
    available: false,
    reason: "not_a_fixed_price",
  });
});

test("an open-ended price still sells, because the minimum is the price", () => {
  // Mission Control leaves `price_max_cents` null for a flat monthly fee.
  assert.equal(resolveAddonPurchase(addon({ price_max_cents: null })).available, true);
});

test("a module quoted in another currency is never charged in AUD", () => {
  assert.deepEqual(resolveAddonPurchase(addon({ currency: "USD" })), {
    available: false,
    reason: "price_mismatch",
  });
  // A missing currency is the page's own default, which is AUD.
  assert.equal(resolveAddonPurchase(addon({ currency: null })).available, true);
});

test("a module already included in the visitor's plan is not sold to them again", () => {
  const included = addon({ included_in_plans: ["growth", "scale"] });
  assert.deepEqual(resolveAddonPurchase(included, { currentPlanSlug: "growth" }), {
    available: false,
    reason: "already_included",
  });
  assert.equal(resolveAddonPurchase(included, { currentPlanSlug: "launch" }).available, true);
  // An unidentified visitor has no plan, so the button stays.
  assert.equal(resolveAddonPurchase(included).available, true);
  assert.equal(resolveAddonPurchase(included, { currentPlanSlug: null }).available, true);
});

test("the account reference rides along as Stripe's client_reference_id", () => {
  const purchase = resolveAddonPurchase(addon(), { accountReference: "Northbridge Finance" });
  assert.equal(purchase.available, true);
  const url = new URL(purchase.available ? purchase.url : "");
  assert.equal(url.origin + url.pathname, "https://buy.stripe.com/9B6cMY6Ii6iW9Kv6K80co1f");
  assert.equal(url.searchParams.get("client_reference_id"), "Northbridge-Finance");
});

test("the reference is reduced to what Stripe accepts, and never breaks the URL", () => {
  assert.equal(accountReference("Northbridge Finance"), "Northbridge-Finance");
  assert.equal(accountReference("  clone_42  "), "clone_42");
  assert.equal(accountReference("a/b?c=d#e"), "a-b-c-d-e");
  assert.equal(accountReference("!!!"), "", "punctuation alone leaves nothing to send");
  assert.equal(accountReference(""), "");
  assert.equal(accountReference(null), "");
  assert.equal(accountReference(undefined), "");
  assert.equal(accountReference(12345 as unknown as string), "");
  assert.equal(accountReference("x".repeat(400)).length, 200, "Stripe caps this at 200 characters");

  // Nothing an attacker could put in a clone name should reach Stripe as syntax.
  const purchase = resolveAddonPurchase(addon(), { accountReference: "x&redirect=https://evil" });
  assert.equal(purchase.available, true);
  const url = new URL(purchase.available ? purchase.url : "");
  assert.deepEqual([...url.searchParams.keys()], ["client_reference_id"]);
});

test("an empty reference leaves the link untouched rather than trailing a ?", () => {
  const purchase = resolveAddonPurchase(addon(), { accountReference: "   " });
  assert.equal(purchase.available && purchase.url, "https://buy.stripe.com/9B6cMY6Ii6iW9Kv6K80co1f");
});

// The card is a component, so how it uses this module is asserted from the
// source. These are the properties that would be quietly wrong rather than
// visibly broken if someone changed them.
test("the pricing page builds every module link through this module", async () => {
  const source = await readFile(new URL("../pages/Pricing.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /buy\.stripe\.com/,
    "no payment link should be hardcoded in the page — the table is the one place they live",
  );
  assert.match(source, /resolveAddonPurchase\(a, \{/, "the card asks this module for its action");
  assert.match(source, /currentPlanSlug,/, "the visitor's plan decides whether it is already theirs");
});

test("a module link opens in a new tab without handing Stripe the opener", async () => {
  const source = await readFile(new URL("../pages/Pricing.tsx", import.meta.url), "utf8");
  const anchor = source.slice(source.indexOf("href={purchase.url}"));
  assert.match(anchor.slice(0, 200), /target="_blank"/);
  assert.match(anchor.slice(0, 200), /rel="noopener noreferrer"/);
});
