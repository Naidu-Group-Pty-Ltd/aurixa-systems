/**
 * The annual plan, and the one discount that prices it.
 *
 * An annual plan is a 12-month commitment paid up front, and clause 5.1 of the
 * Subscription Agreement prices a 12-month commitment at 15% off the plan's
 * base. So there is one discount, not two: Mission Control's
 * `COMMITMENT_DISCOUNT_BPS` (src/lib/pricing/aurixa-catalog.ts) both mints the
 * annual Stripe prices and prices every agreement, and this mirrors it —
 * mirrored rather than imported because the storefront is a separate
 * deployment that talks to Mission Control only over HTTP.
 *
 * It lives apart from billing.ts because that module resolves the storefront
 * URL from `import.meta.env` as it loads, which node's test runner does not
 * provide. This one has nothing to resolve, so its arithmetic is tested.
 */

/** The part of a catalogue plan this module reads. `CatalogPlan` is one. */
export interface PlanPricing {
  slug: string;
  seat_limit: number;
  price_cents: number;
  metadata?: { annual_price_cents?: number | null } | null;
}

/** 15% off the plan's price for a 12-month commitment, in basis points. */
export const COMMITMENT_DISCOUNT_BPS = 1500;

/**
 * The same discount as a fraction, for saying "15%". The arithmetic below
 * uses the basis points, so no figure is rounded twice.
 */
export const ANNUAL_DISCOUNT = COMMITMENT_DISCOUNT_BPS / 10_000;

/** The discount on one month of a tax-inclusive price, rounded to the cent. */
export const commitmentDiscountCents = (monthlyInclGstCents: number): number =>
  Math.round((monthlyInclGstCents * COMMITMENT_DISCOUNT_BPS) / 10_000);

/**
 * The annual charge for a monthly tax-inclusive price: twelve discounted
 * months. The discount comes off each month and is rounded to the cent before
 * the twelve are added up. That is the order Mission Control mints the Stripe
 * price in and an agreement states its annual prepayment in, so this agrees
 * with both to the cent rather than merely to the dollar.
 */
export const annualCents = (monthlyInclGstCents: number): number =>
  (monthlyInclGstCents - commitmentDiscountCents(monthlyInclGstCents)) * 12;

/**
 * The annual figure a card shows: the price Mission Control minted in Stripe
 * where the catalogue carries one, because what is displayed must be what is
 * charged and only the Stripe price is authoritative. The calculation is the
 * fallback, for a catalogue that carries none.
 */
export const planAnnualCents = (plan: PlanPricing): number =>
  plan.metadata?.annual_price_cents ?? annualCents(plan.price_cents);

/**
 * Whether a plan is quoted rather than listed. Enterprise is scoped per
 * customer, so its card shows no price and routes to sales. Recognised by slug
 * first so it survives someone changing the seat cap.
 */
export const isQuotedPlan = (plan: Pick<PlanPricing, "slug" | "seat_limit">): boolean =>
  plan.slug === "enterprise" || plan.seat_limit >= 999;

/**
 * The saving the page may claim for paying annually, as a whole percentage —
 * or null when the listed plans do not all save the same, in which case the
 * page claims none.
 *
 * Read from the figures the cards show, never from the constant alone. The
 * constant is the policy; the cards show what Stripe will charge, and the two
 * part company for as long as the catalogue carries annual prices minted under
 * an earlier discount — the live prices change only when an operator re-runs
 * Mission Control's catalogue sync. A badge reading 15% above cards priced at a
 * 10% saving would promise a discount the checkout does not give, so the claim
 * follows the cards. A quoted plan shows no figure and so has no say. With no
 * listed plan to read — the catalogue has not loaded, or the page was rendered
 * before it could — the policy is all there is to state.
 */
export function annualSavingPercent(plans: readonly PlanPricing[]): number | null {
  const seen = new Set<number>();
  for (const plan of plans) {
    if (isQuotedPlan(plan) || !(plan.price_cents > 0)) continue;
    const annual = planAnnualCents(plan);
    if (!(annual > 0)) continue;
    seen.add(Math.round((1 - annual / (plan.price_cents * 12)) * 100));
  }
  if (seen.size === 0) return Math.round(ANNUAL_DISCOUNT * 100);
  return seen.size === 1 ? [...seen][0] : null;
}
