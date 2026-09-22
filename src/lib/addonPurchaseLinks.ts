/**
 * Buying a module from the pricing page.
 *
 * Every add-on module that is sold on its own has a live Stripe Payment Link,
 * created from the same product and price Mission Control's catalog quotes. The
 * table below is the only place those URLs live in this repo.
 *
 * Three things about the shape of this, all deliberate:
 *
 *   1. **The amount is recorded next to the URL.** A Payment Link charges
 *      whatever its price says, and the card quotes whatever the catalog says.
 *      Those are two systems, and they can drift — a repriced module in Mission
 *      Control would otherwise leave the page advertising one number and
 *      charging another. So the link is only offered when the catalog's price
 *      and the link's price agree; when they do not, the card simply falls back
 *      to the enquiry route and nobody is charged a stale price.
 *
 *   2. **A reprice replaces the link; it never edits one.** A Stripe price is
 *      immutable, so a new price is minted and the old one archived — and
 *      archiving a price DEACTIVATES every Payment Link built on it. Measured
 *      on the 2026 Final Review reprice: of the twenty-two links in this table,
 *      twenty-one went dead the moment their prices were archived, and the one
 *      survivor was the single module whose price did not move. So a reprice is
 *      always a new URL here, and the guard in rule 1 is the second line of
 *      defence rather than the first: it would have hidden the buttons anyway,
 *      but the links were already gone.
 *
 *   3. **A missing slug is a normal answer, not an error.** Not every module is
 *      buyable — `lenders` is still in development and has no Stripe product at
 *      all, and `builder-developer-portal` is priced but sold directly, on
 *      another deployment — and a module the catalog adds tomorrow will not be
 *      in this table either. All three cases resolve to `null` and the card
 *      renders without a purchase button, which is the safe direction to fail
 *      in.
 *
 * A Payment Link creates its own subscription; it cannot be attached to a plan
 * the customer already has. That is why each link asks for the account name and
 * why the page says the module is enabled by the team rather than instantly.
 */

/** A live Stripe Payment Link, and the amount it actually charges. */
export type AddonPurchaseLink = {
  url: string;
  /** Tax-inclusive, in cents, matching the Stripe price behind the link. */
  amountCents: number;
};

/**
 * Slug → live Payment Link. Slugs are Mission Control's module slugs, which are
 * also carried on the Stripe product as `metadata.aurixa_module`, so a link can
 * always be traced back to the module it sells.
 */
export const ADDON_PURCHASE_LINKS: Readonly<Record<string, AddonPurchaseLink>> = {
  "aurixa-agent": { url: "https://buy.stripe.com/00w9AM0jUcHk4qbgkI0co1l", amountCents: 49500 },
  "solicitor-portal": { url: "https://buy.stripe.com/aFa5kw5EedLo7Cn1pO0co1m", amountCents: 29900 },
  "api-usage": { url: "https://buy.stripe.com/fZu28kaYybDg4qb2tS0co1k", amountCents: 19900 },
  integrations: { url: "https://buy.stripe.com/eVq00ceaK6iW4qbb0o0co1j", amountCents: 19900 },
  "finance-portal": { url: "https://buy.stripe.com/7sY5kwc2C4aO7Cn7Oc0co1i", amountCents: 34900 },
  "model-hub": { url: "https://buy.stripe.com/28E4gs7Mm9v8f4P6K80co1h", amountCents: 24900 },
  "aml-ctf": { url: "https://buy.stripe.com/8x23co0jUcHk9Kvc4s0co1g", amountCents: 15000 },
  "deal-pipeline": { url: "https://buy.stripe.com/9B6cMY6Ii6iW9Kv6K80co1f", amountCents: 14900 },
  marketing: { url: "https://buy.stripe.com/4gM28kc2C7n04qb9Wk0co1e", amountCents: 24900 },
  agreements: { url: "https://buy.stripe.com/00weV61nYgXAcWH4C00co1d", amountCents: 12900 },
  "client-ai": { url: "https://buy.stripe.com/3cI5kw3w622GaOz7Oc0co1c", amountCents: 12900 },
  "borrowing-capacity": { url: "https://buy.stripe.com/bJe00c0jU7n08Gr7Oc0co1b", amountCents: 29500 },
  "client-forms": { url: "https://buy.stripe.com/28E5kw2s2fTw5uf5G40co0b", amountCents: 4900 },
  "send-portfolio": { url: "https://buy.stripe.com/cNidR23w65eS3m79Wk0co1a", amountCents: 9900 },
  "portfolio-analysis": { url: "https://buy.stripe.com/6oU7sEaYy0YCg8T0lK0co19", amountCents: 17900 },
  "call-logs": { url: "https://buy.stripe.com/9B6cMY2s20YC4qb8Sg0co18", amountCents: 24900 },
  "email-copilot": { url: "https://buy.stripe.com/00w8wI4AabDg8Gr5G40co17", amountCents: 14900 },
  "cashflow-comparisons": { url: "https://buy.stripe.com/fZu6oA7Mm5eScWH3xW0co16", amountCents: 12900 },
  "report-comparisons": { url: "https://buy.stripe.com/6oUbIUd6GcHk09VfgE0co15", amountCents: 12900 },
  "intelligence-hub": { url: "https://buy.stripe.com/5kQfZa0jUbDg3m75G40co14", amountCents: 12900 },
  "opportunity-marketplace": { url: "https://buy.stripe.com/eVqbIU5EefTwaOzb0o0co13", amountCents: 24900 },
  "commercial-industrial": { url: "https://buy.stripe.com/aFadR2c2Cazc3m78Sg0co12", amountCents: 24900 },
  "market-updates": { url: "https://buy.stripe.com/bJecMY0jU8r46yj6K80co11", amountCents: 7900 },
};

/**
 * The parts of a catalog add-on this module needs.
 *
 * Structural on purpose: `billing.ts` reads `import.meta.env` when it loads, so
 * importing it here would drag the environment into a file that is pure
 * arithmetic and string work — and into its tests.
 */
export type PurchasableAddon = {
  slug: string;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency?: string | null;
  included_in_plans?: string[] | null;
};

/** Why a module has no buy button, when it has none. */
export type NoPurchaseReason =
  /** Nothing is sold for this module yet — it has no Stripe product. */
  | "not_sold"
  /** The advertised price is a range, which a single Payment Link cannot be. */
  | "not_a_fixed_price"
  /** The catalog and the link disagree on the price, so we will not charge. */
  | "price_mismatch"
  /** The module already comes with the plan this visitor is on. */
  | "already_included";

/**
 * The absent members are spelled out rather than left off: this project builds
 * without `strictNullChecks`, so TypeScript will not narrow a union by its
 * `available` flag, and a caller reading `reason` after checking `available`
 * needs the field to exist on both arms.
 */
export type AddonPurchase =
  | { available: true; url: string; amountCents: number; reason?: undefined }
  | { available: false; reason: NoPurchaseReason; url?: undefined; amountCents?: undefined };

/** Stripe accepts letters, digits, dashes and underscores here, up to 200. */
const REFERENCE_SAFE = /[^A-Za-z0-9_-]+/g;

/**
 * Tags the checkout with the account it came from, when the page knows it.
 *
 * The link also asks the buyer to type their account name, because most
 * visitors arrive without a handoff; this is the copy of that answer we do not
 * have to trust, and it is what reconciles a standalone subscription back to
 * the right customer.
 */
export function accountReference(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(REFERENCE_SAFE, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

export type ResolveOptions = {
  /** The plan the visitor is already on, if the page has identified them. */
  currentPlanSlug?: string | null;
  /** Carried to Stripe as `client_reference_id` so ops can match the payment. */
  accountReference?: string | null;
};

/**
 * Decides whether this module can be bought right now, and at what URL.
 *
 * The price is checked rather than assumed: the card shows the catalog's
 * number, so the only honest thing to offer is a link that charges exactly
 * that.
 */
export function resolveAddonPurchase(
  addon: PurchasableAddon,
  options: ResolveOptions = {},
): AddonPurchase {
  const link = ADDON_PURCHASE_LINKS[addon.slug];
  if (!link) return { available: false, reason: "not_sold" };

  // Selling somebody what their plan already includes is worse than showing no
  // button at all, so this is checked before anything about the price.
  const plan = options.currentPlanSlug;
  if (plan && (addon.included_in_plans ?? []).includes(plan)) {
    return { available: false, reason: "already_included" };
  }

  const { price_min_cents: min, price_max_cents: max } = addon;
  if (typeof min !== "number" || (typeof max === "number" && max !== min)) {
    return { available: false, reason: "not_a_fixed_price" };
  }
  // Everything on this page is AUD; a module quoted in anything else is not
  // something these links can charge for.
  if (addon.currency && addon.currency.toUpperCase() !== "AUD") {
    return { available: false, reason: "price_mismatch" };
  }
  if (min !== link.amountCents) return { available: false, reason: "price_mismatch" };

  const reference = accountReference(options.accountReference);
  const url = reference
    ? `${link.url}?client_reference_id=${encodeURIComponent(reference)}`
    : link.url;

  return { available: true, url, amountCents: link.amountCents };
}
