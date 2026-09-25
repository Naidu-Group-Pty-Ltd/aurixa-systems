/**
 * Billing API client (user-attributed pricing workflow, Revision 2).
 *
 * This site hosts THE customer-facing pricing page. The browser now talks only
 * to Aurixa Systems' OWN backend (Supabase edge functions): catalog is served
 * from a local mirror, and checkout/handoff/identity/session forward to Mission
 * Control server-to-server (MC stays the headless billing engine + Stripe).
 *
 * Auth model: possession-based. The pricing link carries a single-use `?h=`
 * handoff or a stable `?uid=`; receipts require the (session_id, credential)
 * pair. No cookies, no keys.
 */

// Aurixa Systems storefront backend (Supabase functions). Prefer an explicit
// override, else derive from the project URL, else fall back to the known
// production project.
const STOREFRONT_BASE = (() => {
  const explicit = import.meta.env.VITE_STOREFRONT_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  return "https://moeyytuduycrvvncdtme.supabase.co/functions/v1";
})();

export type CheckoutMode = "topup" | "seat_plan" | "setup_package";

/**
 * Every price this site displays is TAX-INCLUSIVE — GST is contained in the
 * figure, not added at checkout. So GST is derived by dividing by 11, never by
 * multiplying by 1.1. Getting that backwards overstates every price by 10%.
 *
 * These mirror Mission Control's `aurixa-catalog.ts`, which is the source of
 * truth. They are duplicated rather than imported because the storefront is a
 * separate deployment that only talks to MC over HTTP.
 */
export const GST_DIVISOR = 11;

/** The GST contained within a tax-inclusive amount. */
export const gstComponentCents = (inclGstCents: number): number =>
  Math.round(inclGstCents / GST_DIVISOR);

/** The ex-GST (net) amount of a tax-inclusive total. */
export const exGstCents = (inclGstCents: number): number =>
  inclGstCents - gstComponentCents(inclGstCents);

// The annual plan is a 12-month commitment at the Subscription Agreement's
// 15% (clause 5.1). Its arithmetic lives in a module node's test runner can
// load, since this one reads `import.meta.env` as it loads.
export {
  ANNUAL_DISCOUNT,
  COMMITMENT_DISCOUNT_BPS,
  annualCents,
  annualSavingPercent,
  isQuotedPlan,
  planAnnualCents,
} from "./pricing/commitmentDiscount";

export interface CatalogPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  seat_limit: number;
  metadata?: {
    price_min_cents?: number | null;
    price_max_cents?: number | null;
    best_for?: string | null;
    highlights?: string[];
    tier?: number;
    /** Seat band from the price list, e.g. 1–4. */
    seat_min?: number | null;
    seat_max?: number | null;
    /** Report credits included every month — see planMonthlyCredits. */
    monthly_credits?: number | null;
    /**
     * The annual price as Mission Control minted it in Stripe. Preferred over
     * computing it here: what is displayed must be what is charged, and only
     * the Stripe price is authoritative. Falls back to twelve months less the
     * commitment discount for a catalog that predates the cutover.
     */
    annual_price_cents?: number | null;
    tax_inclusive?: boolean | null;
    /**
     * Whether price_cents includes the AML/CTF Compliance module. The price
     * list titles each tier with its with-AML figure, so that is the headline
     * and this is normally true after the catalog cutover.
     */
    includes_aml_ctf?: boolean | null;
    /** The same tier without AML/CTF — the price list's stated alternative. */
    base_price_cents?: number | null;
    base_annual_price_cents?: number | null;
  } | null;
}

/**
 * Report credits the plan includes every month, or null when it includes none.
 *
 * Read from the catalog rather than hardcoded, because the same figure is what
 * Mission Control actually grants into the balance. A number typed in here
 * could advertise 35,000 while the workspace received 7,000, and nothing would
 * catch it.
 *
 * Per MONTH on both billing periods. An annual plan bills twelve months at
 * once but does not hand over a year of credits on day one — credits lapse 30
 * days after they are issued, so eleven months of them would expire unused.
 */
export const planMonthlyCredits = (plan: CatalogPlan): number | null => {
  const n = plan.metadata?.monthly_credits;
  return typeof n === "number" && n > 0 ? n : null;
};

/**
 * The tier's price WITHOUT the AML/CTF module, or null when it does not apply.
 *
 * Returns null unless the catalog says the headline includes AML/CTF. Before
 * the cutover a plan's price has no AML relationship at all, and inventing a
 * "without compliance" figure by subtracting from it would be a made-up
 * number on a pricing page.
 */
export const planBaseCents = (
  plan: CatalogPlan,
  period: "monthly" | "annual",
): number | null => {
  const meta = plan.metadata;
  if (!meta?.includes_aml_ctf) return null;
  return (period === "annual" ? meta.base_annual_price_cents : meta.base_price_cents) ?? null;
};

export interface CatalogPack {
  id: string;
  slug: string;
  name: string;
  tokens: number;
  price_cents: number;
  currency: string;
  expires_after_days: number | null;
  metadata?: {
    best_for?: string | null;
    /** The pricing sheet marks one pack the popular choice… */
    popular?: boolean;
    /** …and one the best value. */
    best_value?: boolean;
    /** Position in the ladder, 1 = smallest. */
    stage?: number;
  } | null;
}

/**
 * What one credit costs in this pack, in cents.
 *
 * Deliberately unrounded. Displays round it to the two decimals the price
 * list quotes, but the saving below is computed from the full figure — round
 * first and 2,500 credits advertise 21.5% off instead of the published 21.6%.
 */
export function packPerCreditCents(pack: Pick<CatalogPack, "tokens" | "price_cents">): number {
  return pack.tokens > 0 ? pack.price_cents / pack.tokens : 0;
}

/** The pack the saving is measured against: the smallest one on offer. */
export function smallestPack<T extends Pick<CatalogPack, "tokens" | "price_cents">>(
  packs: readonly T[],
): T | null {
  return packs.reduce<T | null>((min, p) => (!min || p.tokens < min.tokens ? p : min), null);
}

/**
 * How much cheaper a credit is here than in the smallest pack, as a fraction.
 *
 * Measured against whatever is actually on sale rather than a hardcoded
 * baseline, so the page can never advertise a saving against a pack the
 * customer cannot buy.
 */
export function packDiscountFraction(
  pack: Pick<CatalogPack, "tokens" | "price_cents">,
  packs: readonly Pick<CatalogPack, "tokens" | "price_cents">[],
): number {
  const baseline = smallestPack(packs);
  const baseRate = baseline ? packPerCreditCents(baseline) : 0;
  if (!baseRate) return 0;
  return 1 - packPerCreditCents(pack) / baseRate;
}

/**
 * The same saving in money: what these credits would have cost bought at the
 * smallest pack's rate, less what they cost here.
 *
 * A percentage off a per-credit rate is the honest way to compare packs and a
 * poor way to feel the difference — "43.1% cheaper per credit" and "$540.10
 * less than buying 15,000 credits 250 at a time" are the same fact, and only
 * one of them is a number anyone weighs a purchase against.
 */
export function packSavingCents(
  pack: Pick<CatalogPack, "tokens" | "price_cents">,
  packs: readonly Pick<CatalogPack, "tokens" | "price_cents">[],
): number {
  const baseline = smallestPack(packs);
  if (!baseline) return 0;
  return Math.round(pack.tokens * (packPerCreditCents(baseline) - packPerCreditCents(pack)));
}

/**
 * Credits lapse this many days after they are issued — plan allowances,
 * top-up packs and operator-gifted credits alike. Mirrors Mission Control's
 * `TOKEN_EXPIRY_DAYS`, which is where the rule is actually enforced.
 */
export const TOKEN_EXPIRY_DAYS = 30;

/**
 * How long a pack's credits stay spendable.
 *
 * The 30-day platform policy is a CEILING, not a fixed term: a pack that
 * deliberately expires sooner keeps its own shorter window, and a pack with a
 * longer window (or none at all) is capped at 30 days. Same arithmetic as
 * Mission Control's `resolveIssueExpiry`, so the page can never advertise a
 * term the billing engine will not honour.
 */
export function packValidityDays(pack: Pick<CatalogPack, "expires_after_days">): number {
  const packDays = pack.expires_after_days;
  if (packDays == null || packDays <= 0) return TOKEN_EXPIRY_DAYS;
  return Math.min(packDays, TOKEN_EXPIRY_DAYS);
}

export interface CatalogSetup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency: string;
  deliverables: string[] | null;
}

export interface CatalogReport {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  credit_cost: number;
}

export interface CatalogAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency: string;
  billing_period: string | null;
  category: string | null;
  included_in_plans: string[] | null;
}

/**
 * Why the restricted sections are or are not present.
 *
 * The server decides and the server enforces — this is the reason it gives,
 * so the page can render an honest gate instead of an empty list that reads
 * as a loading failure.
 */
export interface CatalogAccess {
  granted: boolean;
  reason: string;
  label: string | null;
}

export interface Catalog {
  plans: CatalogPlan[];
  packs: CatalogPack[];
  setups: CatalogSetup[];
  addons: CatalogAddon[];
  reports: CatalogReport[];
  access: CatalogAccess;
}

export interface ResolvedHandoff {
  handoffId: string;
  cloneName: string | null;
  originUsername: string | null;
  intent: string | null;
  /** The plan this workspace is already on, so CTAs can say Upgrade/Downgrade. */
  currentPlanSlug: string | null;
  currentPlanName: string | null;
}

export interface ResolvedIdentity {
  uid: string;
  cloneName: string | null;
  originUsername: string | null;
  currentPlanSlug: string | null;
  currentPlanName: string | null;
}

/** Purchase credential: a single-use handoff, or a stable operator uid. */
export type Credential = { h: string } | { uid: string };

export interface SessionReceipt {
  mode: string | null;
  itemSlug: string | null;
  cloneName: string | null;
  originUsername: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentStatus: string | null;
  fulfilled: boolean;
  webhookError: string | null;
  returnUrl: string | null;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STOREFRONT_BASE}${path}`, { method: "GET" });
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `billing_api_${res.status}`);
  }
  return body;
}

/**
 * The catalog, scoped to what this visitor may see.
 *
 * The credential travels with the request because the gate is server-side:
 * modules, onboarding and report economics are simply absent from the
 * response unless Mission Control says otherwise. Asking without one is not
 * an error — it returns the public price list.
 */
export async function fetchCatalog(
  credential?: { h?: string | null; uid?: string | null; access?: string | null },
): Promise<Catalog> {
  const qs = new URLSearchParams();
  if (credential?.h) qs.set("h", credential.h);
  if (credential?.uid) qs.set("uid", credential.uid);
  if (credential?.access) qs.set("access", credential.access);
  const suffix = qs.toString() ? `?${qs}` : "";

  const body = await apiGet<Catalog>(`/storefront-catalog${suffix}`);
  return {
    plans: body.plans ?? [],
    packs: body.packs ?? [],
    setups: body.setups ?? [],
    addons: body.addons ?? [],
    reports: body.reports ?? [],
    access: body.access ?? { granted: false, reason: "no_credential", label: null },
  };
}

export async function resolveHandoff(h: string): Promise<ResolvedHandoff | null> {
  try {
    const body = await apiGet<{
      handoff_id: string;
      clone_name: string | null;
      origin_username: string | null;
      intent: string | null;
      current_plan_slug?: string | null;
      current_plan_name?: string | null;
    }>(`/storefront-handoff?h=${encodeURIComponent(h)}`);
    return {
      handoffId: body.handoff_id,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
      intent: body.intent,
      currentPlanSlug: body.current_plan_slug ?? null,
      currentPlanName: body.current_plan_name ?? null,
    };
  } catch {
    // Expired/consumed/unknown token → degrade to the browse-only page.
    return null;
  }
}

export async function resolveIdentity(uid: string): Promise<ResolvedIdentity | null> {
  try {
    const body = await apiGet<{
      uid: string;
      clone_name: string | null;
      origin_username: string | null;
      current_plan_slug?: string | null;
      current_plan_name?: string | null;
    }>(`/storefront-identity?uid=${encodeURIComponent(uid)}`);
    return {
      uid: body.uid,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
      currentPlanSlug: body.current_plan_slug ?? null,
      currentPlanName: body.current_plan_name ?? null,
    };
  } catch {
    // Unknown/invalid uid → degrade to the browse-only page.
    return null;
  }
}

export async function startCheckout(input: {
  credential: Credential;
  mode: CheckoutMode;
  itemId: string;
  quantity?: number;
  /** Annual is a separate Stripe price — without this every purchase bills monthly. */
  period?: "monthly" | "annual";
}): Promise<{ url: string }> {
  // text/plain keeps this a CORS "simple request" (no OPTIONS preflight). The
  // storefront-checkout function reads the raw body and forwards it to Mission
  // Control, which parses JSON regardless of content type; the response carries
  // ACAO: *.
  const res = await fetch(`${STOREFRONT_BASE}/storefront-checkout`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      ...input.credential,
      mode: input.mode,
      item_id: input.itemId,
      quantity: input.quantity ?? 1,
      period: input.period ?? "monthly",
    }),
  });
  const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || body.ok === false || !body.url) {
    throw new Error((body.error ?? "checkout_failed").replaceAll("_", " "));
  }
  return { url: body.url };
}

/**
 * Wallet flow: starts a Stripe Checkout session in `setup` mode so the buyer
 * can save a card for later. Card details are entered on Stripe's hosted page
 * — they never touch this site or Mission Control. Same credential model and
 * transport as startCheckout.
 */
export async function startCardSetup(input: { credential: Credential }): Promise<{ url: string }> {
  const res = await fetch(`${STOREFRONT_BASE}/storefront-setup`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ ...input.credential }),
  });
  const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || body.ok === false || !body.url) {
    throw new Error((body.error ?? "card_setup_failed").replaceAll("_", " "));
  }
  return { url: body.url };
}

export interface WalletStatus {
  saved: boolean;
  brand: string | null;
  last4: string | null;
  priority: number | null;
  returnUrl: string | null;
}

/** Card-saved receipt: polled by /pricing/card-saved until the webhook has
 * persisted the card. Authorised by the (session_id, credential) pair. */
export async function fetchWalletStatus(
  sessionId: string,
  credential: Credential,
): Promise<WalletStatus> {
  const credParam =
    "h" in credential
      ? `h=${encodeURIComponent(credential.h)}`
      : `uid=${encodeURIComponent(credential.uid)}`;
  const body = await apiGet<{
    saved: boolean;
    brand: string | null;
    last4: string | null;
    priority: number | null;
    return_url: string | null;
  }>(`/storefront-wallet?session_id=${encodeURIComponent(sessionId)}&${credParam}`);
  return {
    saved: body.saved,
    brand: body.brand,
    last4: body.last4,
    priority: body.priority,
    returnUrl: body.return_url,
  };
}

export async function fetchSessionReceipt(
  sessionId: string,
  credential: Credential,
): Promise<SessionReceipt> {
  const credParam =
    "h" in credential
      ? `h=${encodeURIComponent(credential.h)}`
      : `uid=${encodeURIComponent(credential.uid)}`;
  const body = await apiGet<{
    mode: string | null;
    item_slug: string | null;
    clone_name: string | null;
    origin_username: string | null;
    amount_total: number | null;
    currency: string | null;
    payment_status: string | null;
    fulfilled: boolean;
    webhook_error: string | null;
    return_url: string | null;
  }>(
    `/storefront-session?session_id=${encodeURIComponent(sessionId)}&${credParam}`,
  );
  return {
    mode: body.mode,
    itemSlug: body.item_slug,
    cloneName: body.clone_name,
    originUsername: body.origin_username,
    amountTotal: body.amount_total,
    currency: body.currency,
    paymentStatus: body.payment_status,
    fulfilled: body.fulfilled,
    webhookError: body.webhook_error,
    returnUrl: body.return_url,
  };
}

export function formatMoney(cents: number | null | undefined, currency = "AUD"): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * A plan change the workspace has not been shown yet.
 *
 * Announced exactly once. Which is why it is a record on the server with an
 * acknowledgement rather than anything derived from current state: state can
 * only say what plan you are on, not whether you have been told you moved to
 * it — and two changes in a month would collapse into one.
 */
export interface PlanChange {
  id: string;
  fromPlanSlug: string | null;
  fromPlanName: string | null;
  toPlanSlug: string;
  toPlanName: string;
  /** Credits added to the balance by the change. Zero if already credited. */
  creditsGranted: number;
  creditsExpireAt: string | null;
  createdAt: string;
}

const credentialQuery = (credential?: Credential | null): string => {
  if (!credential) return "";
  return "h" in credential
    ? `h=${encodeURIComponent(credential.h)}`
    : `uid=${encodeURIComponent(credential.uid)}`;
};

/**
 * The newest unseen plan change, or null.
 *
 * Never throws. A banner is the least important thing on this page, and a
 * workspace must not fail to see pricing because its notice lookup did.
 */
export async function fetchPlanChange(credential?: Credential | null): Promise<PlanChange | null> {
  const q = credentialQuery(credential);
  if (!q) return null;
  try {
    const body = await apiGet<{
      changes: Array<{
        id: string;
        from_plan_slug: string | null;
        from_plan_name: string | null;
        to_plan_slug: string;
        to_plan_name: string;
        credits_granted: number;
        credits_expire_at: string | null;
        created_at: string;
      }>;
    }>(`/storefront-plan-change?${q}`);
    const c = body.changes?.[0];
    if (!c) return null;
    return {
      id: c.id,
      fromPlanSlug: c.from_plan_slug,
      fromPlanName: c.from_plan_name,
      toPlanSlug: c.to_plan_slug,
      toPlanName: c.to_plan_name,
      creditsGranted: c.credits_granted,
      creditsExpireAt: c.credits_expire_at,
      createdAt: c.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Marks a change as seen, so it never appears again.
 *
 * Sent when the customer dismisses it, not when the page fetches it: a notice
 * retired on load would be lost to anyone whose page failed to render, and
 * this is the only time they are told.
 */
export async function acknowledgePlanChange(
  id: string,
  credential?: Credential | null,
): Promise<void> {
  try {
    await fetch(`${STOREFRONT_BASE}/storefront-plan-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...(credential ?? {}) }),
    });
  } catch {
    // Worst case it shows once more. Not worth surfacing an error over.
  }
}

// ── Product feedback ────────────────────────────────────────────────────────
// The form is served per workspace: the rating scales are built from the
// modules that workspace's plan actually includes, so nobody is asked to score
// something they have never opened.

export interface FeedbackQuestion {
  key: string;
  label: string;
  hint: string;
  group: string;
}

export interface FeedbackForm {
  planSlug: string | null;
  planName: string | null;
  questions: FeedbackQuestion[];
  groups: string[];
}

export interface FeedbackContext {
  /** False when the link carried no workspace — readable, not submittable. */
  identified: boolean;
  workspaceName: string | null;
  respondent: string | null;
  form: FeedbackForm;
  /** Null when the link carried no workspace, so nothing can be looked up. */
  prompt: {
    due: boolean;
    /**
     * Whether THIS PERSON has answered. What the form gates on — `due` is
     * workspace-level, and using it here locked colleagues out of a form
     * built to hear from all of them.
     */
    youAnswered: boolean;
    workspaceAnswered: boolean;
    campaignKey: string;
    reason: "onboarding" | "quarterly";
    rewardAvailable: boolean;
    rewardTokens: number;
  } | null;
  rewardTokens: number;
}

export interface FeedbackAnswers {
  overallRating: number | null;
  recommendScore: number | null;
  moduleRatings: Record<string, number>;
  mostValuable: string;
  biggestFrustration: string;
  featureRequest: string;
  additionalComments: string;
}

export interface FeedbackReceipt {
  submissionId: string;
  campaignKey: string;
  creditsGranted: number;
  /** True when a colleague already earned this campaign's credits. */
  alreadyGranted: boolean;
  creditsExpireAt: string | null;
}

/** The questions this workspace should be asked, and whether it is due. */
export async function fetchFeedbackContext(
  credential?: Credential | null,
): Promise<FeedbackContext> {
  const q = credentialQuery(credential);
  const body = await apiGet<{
    identified?: boolean;
    workspace_name?: string | null;
    respondent?: string | null;
    form: FeedbackForm;
    prompt?: {
      due: boolean;
      youAnswered: boolean;
      workspaceAnswered: boolean;
      campaignKey: string;
      reason: "onboarding" | "quarterly";
      rewardAvailable: boolean;
      rewardTokens: number;
    } | null;
    reward_tokens?: number;
  }>(`/storefront-feedback${q ? `?${q}` : ""}`);

  return {
    identified: body.identified === true,
    workspaceName: body.workspace_name ?? null,
    respondent: body.respondent ?? null,
    form: body.form,
    prompt: body.prompt ?? null,
    rewardTokens: body.reward_tokens ?? 100,
  };
}

/**
 * Sends the answers.
 *
 * Throws on failure rather than swallowing it — unlike a banner, this is the
 * one action on the page, and someone who has just written three paragraphs
 * must be told if it did not land.
 */
export async function submitFeedback(
  answers: FeedbackAnswers,
  credential?: Credential | null,
): Promise<FeedbackReceipt> {
  const res = await fetch(`${STOREFRONT_BASE}/storefront-feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(credential ?? {}),
      overall_rating: answers.overallRating,
      recommend_score: answers.recommendScore,
      module_ratings: answers.moduleRatings,
      most_valuable: answers.mostValuable,
      biggest_frustration: answers.biggestFrustration,
      feature_request: answers.featureRequest,
      additional_comments: answers.additionalComments,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    submission_id?: string;
    campaign_key?: string;
    credits_granted?: number;
    already_granted?: boolean;
    credits_expire_at?: string | null;
  };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `feedback_${res.status}`);
  }
  return {
    submissionId: body.submission_id ?? "",
    campaignKey: body.campaign_key ?? "",
    creditsGranted: body.credits_granted ?? 0,
    alreadyGranted: body.already_granted === true,
    creditsExpireAt: body.credits_expire_at ?? null,
  };
}
