import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Infinity as InfinityIcon,
  Loader2,
  Minus,
  Plus,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { accountReference, resolveAddonPurchase } from "../lib/addonPurchaseLinks";
import { featuresForTier, type TierFeatures } from "../lib/pricing/tierFeatures";
import {
  ANNUAL_DISCOUNT,
  acknowledgePlanChange,
  fetchCatalog,
  fetchPlanChange,
  gstComponentCents,
  packDiscountFraction,
  packPerCreditCents,
  packSavingCents,
  packValidityDays,
  planAnnualCents,
  planBaseCents,
  planMonthlyCredits,
  resolveHandoff,
  resolveIdentity,
  smallestPack,
  startCardSetup,
  startCheckout,
  type Catalog,
  type CatalogPack,
  type CheckoutMode,
  type Credential,
  type PlanChange,
  type ResolvedHandoff,
  type ResolvedIdentity,
} from "../lib/billing";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * /pricing — THE customer-facing pricing page, migrated wholesale from
 * Mission Control's /pricing route (which no longer exists). All monetisation
 * from the prime repo and every clone lands here; Mission Control is only the
 * headless billing engine behind the storefront API.
 *
 * This page is intentionally NOT linked from the site's public navigation.
 * It is reached via handoff deep links (`?h=` tokens minted server-to-server
 * by a command center), Stripe receipt redirects, or direct URL.
 *
 * With a `?h=` handoff token purchases are live and attributed to the
 * initiating user — checkout goes straight to Stripe with no login. Without
 * one, this is a browse-only page whose CTAs route to the contact funnel.
 */

// Tax-inclusive prices rarely land on whole dollars ($5,443.20 a year, $63.55
// of GST), so cents show when they are non-zero and drop when they are not —
// round numbers stay clean, exact ones stay exact.
const aud = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

const range = (min: number | null | undefined, max: number | null | undefined) => {
  if (min == null) return "—";
  if (max == null || max === min) return aud(min);
  return `${aud(min)} – ${aud(max)}`;
};

type FaqEntry = { q: string; a: string[]; points?: string[] };
type FaqGroup = { heading: string; items: FaqEntry[] };

/**
 * Answers are written to match what the platform actually does — the credit
 * lifecycle, the failure handling, the tax treatment — rather than to sound
 * reassuring. A pricing FAQ that overstates gets found out at the first
 * invoice.
 */
const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "Credits & reports",
    items: [
      {
        q: "How do credits work?",
        a: [
          "Credits are how AI work is metered. Every generated report, comparison or scenario costs a set number of credits, and the cost depends on the report type rather than on how long it takes or how much data it touches, so the same report always costs the same, and you can predict a month's usage from a month's workload.",
          "Each plan includes a monthly allowance. If you need more before the next cycle, top-up packs are available at any time and land in your balance as soon as payment clears.",
        ],
      },
      {
        q: "What does a single report cost?",
        a: [
          "It varies by report type. The exact credit cost of every report is listed in the Report economics table further up this page, and it is the same figure the platform charges when you generate one. There is no separate internal price list.",
          "Costs are set centrally and can change as reports get more capable. Any change applies from the moment it is published; it never re-prices something you have already generated.",
        ],
      },
      {
        q: "Do credits expire?",
        a: [
          "Credits stay spendable for 30 days from the day they are issued, whether they came from your plan allowance or a top-up pack.",
          "Nothing is wiped at the end of a billing period. Unused credits roll over and run out on their own 30-day clock, and when you generate a report we always spend the soonest-to-expire credits first, so what stays in your balance is always the credit with the most time left on it.",
        ],
      },
      {
        q: "What happens if a report fails to generate?",
        a: [
          "It costs you nothing. Credits are held when a report starts and only actually charged once it finishes, so a run that fails part-way releases the hold rather than consuming it.",
          "That holds for every way a generation can end badly: an error mid-way, a model timeout, closing the tab, or stopping it yourself. If a failure somehow occurs after the credits were charged, the charge is reversed automatically rather than waiting for you to notice and ask.",
        ],
      },
      {
        q: "What if I run out of credits mid-month?",
        a: [
          "Buy a top-up pack and keep going. Packs run from 250 credits up to 15,000 and credit your balance immediately, without changing your plan or your billing date.",
          "Bigger packs cost less per credit: the largest works out around 43% cheaper per credit than the smallest, and every card above shows its own rate so you can compare them directly rather than by dividing prices yourself.",
          "Top-up credits follow the same 30-day rule as everything else, and because spend always takes the soonest-to-expire credit first, a top-up does not push your existing balance closer to lapsing.",
        ],
      },
      {
        q: "Which top-up pack should I buy?",
        a: [
          "Work backwards from the report you need. The Report economics table lists what each report type costs, so a month of planned output multiplied by its credit cost is the size you are actually after. The pack labels above say the same thing in words, from an emergency top-up through to high-volume monthly overflow.",
          "Buying one larger pack is always cheaper per credit than buying the same credits in smaller ones, but credits lapse 30 days after they are issued, so the right pack is the biggest one you will genuinely spend inside a month rather than the biggest one on the page.",
        ],
      },
    ],
  },
  {
    heading: "Plans, seats & modules",
    items: [
      {
        q: "What is the difference between the plans?",
        a: [
          "Two things: how many seats you get, and which modules are switched on. Launch covers 1–4 seats with the core reporting and client workflow. Growth adds 5–15 seats, report and cash-flow comparisons, and the deal pipeline. Scale covers 16–30 seats and turns on the finance, marketing, agreements and administration modules.",
          "Each plan card lists exactly what it includes, and the higher plans show only what they add on top of the one below.",
        ],
      },
      {
        q: "Can I change plans later?",
        a: [
          "Yes. Upgrade, downgrade or change seat counts whenever your firm changes shape, and pro-rated billing applies on the next cycle.",
          "If you reach this page from your workspace, each plan card knows which one you are on and offers Upgrade or Downgrade accordingly rather than making you work it out.",
        ],
      },
      {
        q: "What happens if I outgrow my seat band?",
        a: [
          "Seat bands are inclusive ranges, not hard caps you hit without warning. When your team passes the top of your band, moving up a tier is the cleanest path. It brings the extra seats and the additional modules together.",
          "If you are close to the edge of a band, or sit awkwardly between two, get in touch and we will size it properly rather than pushing you into a tier you do not need.",
        ],
      },
      {
        q: "Can I add individual modules to my plan?",
        a: [
          "Yes. Every module is listed with its own monthly price in the Modules section on this page, including the ones already bundled into higher tiers, so a firm on Launch that needs only the deal pipeline can take that one module instead of moving up a whole tier.",
          "Modules are added to an existing subscription rather than bought as a separate checkout, so get in touch or ask through your workspace and we will attach them to your next invoice.",
        ],
      },
      {
        q: "Why are two prices shown for each plan?",
        a: [
          "Every plan is quoted with the AML/CTF Compliance module included, because most firms in this market need it. The second, lower figure is the same plan without that module, for firms whose compliance obligations are already covered elsewhere.",
          "The difference is exactly the module's own price of $195 a month, on every tier, so the two figures can never drift apart, and adding compliance later costs the same as having taken it from the start.",
        ],
      },
    ],
  },
  {
    heading: "Billing, tax & payment",
    items: [
      {
        q: "Are prices inclusive of GST?",
        a: [
          "Yes. Every figure on this page is the amount you actually pay, with Australian GST already contained in it. Nothing is added at checkout. Each plan card also shows how much of the price is GST.",
          "Your tax invoice breaks the same amount into its GST-exclusive value and the GST component, so it reconciles against what you were charged to the cent.",
        ],
      },
      {
        q: "Do you offer annual billing?",
        a: [
          "Yes. Switch the toggle at the top of the page. Annual plans bill twelve months up front at a 10% discount, and the annual figure shown is the amount charged, not an equivalent monthly rate.",
          "Multi-year terms are available for Enterprise customers.",
        ],
      },
      {
        q: "How do payments work, and can I save a card?",
        a: [
          "Payments run through Stripe. Card details are entered on Stripe's own hosted page and never touch our systems or our servers.",
          "You can save a card for future purchases so top-ups and renewals do not need re-entering, and you can hold more than one, a primary plus a backup, so a single expired card does not interrupt anything.",
        ],
      },
      {
        q: "Can I put my ABN on the invoice?",
        a: [
          "Yes. If your workspace already has an ABN on file it is attached automatically and you will not be asked for it; otherwise Stripe collects it during checkout.",
          "The ABN is validated before it is stored, and it appears on every tax invoice from then on along with your registered business name.",
        ],
      },
    ],
  },
  {
    heading: "Getting started",
    items: [
      {
        q: "What does onboarding include?",
        a: [
          "A dedicated specialist walks your team through configuration, brand setup, workflows and training. Larger packages include migration, integrations and white-label theming.",
        ],
      },
      {
        q: "Is there a free trial?",
        a: [
          "Reach out through the contact page and we will set up a sandbox environment so your team can road-test the platform with sample data before committing.",
        ],
      },
      {
        q: "What if none of these plans fit?",
        a: [
          "That is what Enterprise is for. Franchise groups, networks and white-label partners are scoped and quoted rather than picked off a list, because seat counts, module mix, branding and support commitments differ too much between them for a fixed price to be honest.",
          "Talk to sales and we will put a number against what you actually need.",
        ],
      },
    ],
  },
];

const MARQUEE_WORDS = [
  "Pricing",
  "Seats",
  "Credits",
  "Modules",
  "Onboarding",
  "Reports",
  "Cascades",
  "Fleet",
  "Branding",
  "Aurixa",
];

const SECURITY_CARDS = [
  {
    label: "Backend infrastructure",
    title: "Secure Backend Infrastructure",
    description:
      "Aurixa’s backend operates within enterprise-grade infrastructure supported by independently assessed SOC 2 Type 2 controls and ISO 27001 certification. Customer data is protected using AES-256 encryption at rest and TLS encryption while in transit.",
  },
  {
    label: "Web infrastructure",
    title: "Protected Web Infrastructure",
    description:
      "Aurixa’s web environment is delivered through secure, globally distributed infrastructure designed to strengthen protected access, service resilience and application delivery. The underlying infrastructure maintains independently assessed SOC 2 Type II controls and ISO 27001:2022 certification.",
  },
  {
    label: "Aurixa controls",
    title: "Shared Security Responsibility",
    description:
      "Aurixa maintains responsibility for application configuration, access governance, user permissions and internal operational safeguards. These controls are managed within the Aurixa environment to support secure, accountable and consistent platform delivery.",
  },
] as const;

/** Question -> its position in the whole list, so badges read 01..N. */
const faqNumbers = new Map(
  FAQ_GROUPS.flatMap((g) => g.items).map((item, i) => [item.q, i + 1]),
);

export default function Pricing() {
  useRouteMetadata("/pricing");
  const [params] = useSearchParams();
  const h = params.get("h");
  const uid = params.get("uid");
  // Display-only purchaser hint carried by the static fallback link
  // (?uid=…&u=<name>). Attributed handoffs carry the username server-side;
  // this only fills the gap when the dashboard couldn't mint a handoff.
  const usernameHint = (params.get("u") ?? "").trim().slice(0, 80) || null;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  // Tri-state resolution: `undefined` = lookup in flight, `null` = the link is
  // definitively invalid/expired, object = resolved. Collapsing "pending" into
  // `null` made the expired-link banner flash on EVERY load before the lookup
  // finished.
  const [handoff, setHandoff] = useState<ResolvedHandoff | null | undefined>(
    h ? undefined : null,
  );
  const [identity, setIdentity] = useState<ResolvedIdentity | null | undefined>(
    uid && !h ? undefined : null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const autoLaunchedRef = useRef(false);

  // The catalog is fetched WITH the link's credential, because the restricted
  // sections are gated server-side: modules, onboarding and report economics
  // are simply absent from the response unless Mission Control allows them.
  const accessToken = (params.get("access") ?? "").trim() || null;
  useEffect(() => {
    let cancelled = false;
    fetchCatalog({ h, uid, access: accessToken })
      .then((c) => !cancelled && setCatalog(c))
      .catch(() => !cancelled && setCatalogError("Pricing is temporarily unavailable."));
    return () => {
      cancelled = true;
    };
  }, [h, uid, accessToken]);

  // Identity-carrying links: a single-use `?h=` handoff (minted from a command
  // center) or a stable `?uid=` billing id (assigned by an operator in Mission
  // Control). Either pins the tenant/clone a purchase attributes to.
  useEffect(() => {
    if (!h) return;
    let cancelled = false;
    setHandoff(undefined); // pending — keep the expired banner from flashing
    resolveHandoff(h).then((r) => !cancelled && setHandoff(r));
    return () => {
      cancelled = true;
    };
  }, [h]);

  useEffect(() => {
    if (!uid || h) return; // a handoff, if present, wins
    let cancelled = false;
    setIdentity(undefined); // pending — keep the unknown-link banner from flashing
    resolveIdentity(uid).then((r) => !cancelled && setIdentity(r));
    return () => {
      cancelled = true;
    };
  }, [uid, h]);

  // The purchase credential + who it bills, resolved from whichever link we got.
  const credential: Credential | null = handoff
    ? { h: handoff.handoffId }
    : identity
      ? { uid: identity.uid }
      : null;
  const purchaser = handoff ?? identity ?? null;
  const resolvingLink = (!!h && handoff === undefined) || (!h && !!uid && identity === undefined);

  // A plan change the workspace has not been told about yet — announced once,
  // then acknowledged so it never returns. Deliberately not derived from
  // `currentPlanSlug`: state can say which plan you are on, never whether you
  // have been told you moved to it.
  const [planChange, setPlanChange] = useState<PlanChange | null>(null);
  const credentialKey = credential ? JSON.stringify(credential) : null;
  useEffect(() => {
    if (!credentialKey) return;
    let cancelled = false;
    void fetchPlanChange(JSON.parse(credentialKey) as Credential).then(
      (c) => !cancelled && setPlanChange(c),
    );
    return () => {
      cancelled = true;
    };
    // Keyed on the serialised credential: the object is rebuilt every render,
    // so depending on it directly would refetch in a loop.
  }, [credentialKey]);

  const dismissPlanChange = useCallback(() => {
    if (!planChange) return;
    // Optimistic: the notice goes now, and the acknowledgement follows. Worst
    // case it reappears on the next visit, which is far better than a banner
    // that hangs about while a request is in flight.
    const id = planChange.id;
    setPlanChange(null);
    void acknowledgePlanChange(id, credentialKey ? (JSON.parse(credentialKey) as Credential) : null);
  }, [planChange, credentialKey]);
  const purchaserName = purchaser?.originUsername ?? usernameHint;
  // The plan this workspace already pays for, so a card can say Upgrade or
  // Downgrade instead of offering "Get started" to an existing customer.
  const currentPlanSlug = purchaser?.currentPlanSlug ?? null;
  const canBuy = !!credential;
  // Modules are bought through Stripe Payment Links, which cannot carry a
  // handoff the way `startCheckout` does — a link mints its own subscription
  // and knows nothing about the workspace. So whatever the page does know about
  // who is looking travels as Stripe's `client_reference_id`, and the link also
  // asks the buyer to name their account. Two independent answers, because
  // reconciling a standalone subscription to a customer by hand is the failure
  // mode this is here to avoid.
  const moduleReference = accountReference(
    purchaser?.cloneName ?? purchaser?.originUsername ?? usernameHint,
  );

  const buy = useCallback(
    async (mode: CheckoutMode, itemId: string) => {
      if (!credential) return;
      setBusyId(itemId);
      setCheckoutError(null);
      try {
        // Seat plans have a separate annual Stripe price; everything else is a
        // one-off and always bills at its single price.
        const period = mode === "seat_plan" ? billing : "monthly";
        const { url } = await startCheckout({ credential, mode, itemId, period });
        window.location.href = url;
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : "Checkout failed");
        setBusyId(null);
      }
    },
    [credential, billing],
  );

  // Wallet flow: redirect to Stripe's hosted card-save page (setup-mode
  // Checkout). Card details go browser → Stripe only.
  const saveCard = useCallback(async () => {
    if (!credential) return;
    setBusyId("save-card");
    setCheckoutError(null);
    try {
      const { url } = await startCardSetup({ credential });
      window.location.href = url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Card setup failed");
      setBusyId(null);
    }
  }, [credential]);

  // Auto-launch a baked-in '<mode>:<item_id>' intent straight into checkout,
  // and the 'save_card' intent (or ?action=save-card fallback link) straight
  // into Stripe's card-save page.
  useEffect(() => {
    if (autoLaunchedRef.current || !credential || !catalog) return;
    const wantsSaveCard =
      handoff?.intent === "save_card" || params.get("action") === "save-card";
    if (wantsSaveCard) {
      autoLaunchedRef.current = true;
      void saveCard();
      return;
    }
    if (!handoff?.intent) return;
    const [mode, itemId] = handoff.intent.split(":");
    if (!itemId) return;
    if (mode !== "topup" && mode !== "seat_plan" && mode !== "setup_package") return;
    autoLaunchedRef.current = true;
    void buy(mode, itemId);
  }, [handoff, credential, catalog, buy, saveCard, params]);

  const plans = useMemo(() => catalog?.plans ?? [], [catalog]);
  // Ranked by what they cost, so up/down follows the catalog rather than a
  // hardcoded list that would rot the next time a tier is added.
  const planRank = useMemo(() => {
    const ranked = [...plans].sort((a, b) => a.price_cents - b.price_cents);
    return new Map(ranked.map((p, i) => [p.slug, i]));
  }, [plans]);
  // Sorted here rather than trusted from the wire: the ladder only reads as a
  // ladder in order, and the saving on every card is measured against the
  // first one.
  const packs = useMemo(
    () => [...(catalog?.packs ?? [])].sort((a, b) => a.tokens - b.tokens),
    [catalog],
  );
  const bestDiscount = useMemo(
    () => packs.reduce((max, p) => Math.max(max, packDiscountFraction(p, packs)), 0),
    [packs],
  );
  // Named on the cards, so the saving always says which size it is measured
  // against rather than assuming the ladder still starts at 250.
  const baselineCredits = smallestPack(packs)?.tokens ?? 0;
  const setups = catalog?.setups ?? [];
  const addons = catalog?.addons ?? [];
  // The mirror serves report costs with no ORDER BY, so the table rendered in
  // whatever order Postgres happened to return — which changes. Sorted here by
  // category, then by cost, so the list is stable across loads and reads the
  // way the price list is actually organised.
  const catalogAccess = catalog?.access ?? null;
  const hasRestricted = catalogAccess?.granted === true;
  const reports = useMemo(
    () =>
      [...(catalog?.reports ?? [])].sort(
        (a, b) =>
          (a.category ?? "").localeCompare(b.category ?? "") ||
          b.credit_cost - a.credit_cost ||
          a.name.localeCompare(b.name),
      ),
    [catalog],
  );
  // Grouped the way the price list is organised. Category order follows first
  // appearance in the catalog, which Mission Control already sorts.
  const addonsByCategory = useMemo(() => {
    const groups = new Map<string, typeof addons>();
    for (const a of addons) {
      const key = a.category ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return [...groups.entries()];
  }, [addons]);
  const isLoading = !catalog && !catalogError;

  return (
    <div className="relative w-full min-h-dvh overflow-hidden bg-[#040B16] text-white">
      <BackgroundFX />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-16 md:pt-16 md:pb-24">
        {/* tiny meta strip */}
        <div className="pricing-reveal-up mb-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-[#C89B3C]" />
            Index · 001 / Pricing
          </span>
          <span className="hidden md:inline">v.2026 · AUD · incl GST</span>
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <span className="pricing-reveal-up mb-8 inline-flex items-center gap-1.5 rounded-full border border-[#00A8B5]/40 bg-[#00A8B5]/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.35em] text-[#00A8B5]">
            <Sparkles className="h-3 w-3" /> Plans &amp; Pricing
          </span>
          <h1
            className="pricing-reveal-up text-balance text-[44px] font-semibold leading-[0.95] tracking-[-0.03em] md:text-[96px]"
            style={{ animationDelay: "120ms" }}
          >
            <span className="pricing-shimmer-text">Pricing built</span>
            <br />
            <span className="text-white/90">for firms </span>
            <span className="font-display italic text-[#5EDDE8]">in&nbsp;motion</span>
            <span className="text-white/90">.</span>
          </h1>
          <p
            className="pricing-reveal-up mx-auto mt-8 max-w-2xl text-balance text-[15px] leading-relaxed text-[#94A3B8] md:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            Pick a plan. Scale seats. Top up credits as you grow. Every tier, module and add-on,
            laid bare below, with{" "}
            <span className="font-display italic text-white">no surprises</span>.
          </p>

          {/* Billing toggle */}
          <div
            className="pricing-reveal-up mt-12 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B162C]/60 p-1 backdrop-blur-xl"
            style={{ animationDelay: "360ms" }}
          >
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`relative rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-all ${
                  billing === b
                    ? "bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] text-[#040B16] shadow-[0_0_40px_-6px] shadow-[#00A8B5]/70"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                {b}
                {b === "annual" && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                      billing === "annual"
                        ? "bg-[#040B16]/20 text-[#040B16]"
                        : "bg-[#C89B3C]/20 text-[#C89B3C]"
                    }`}
                  >
                    -{Math.round(ANNUAL_DISCOUNT * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Attributed handoff — purchase scope is pinned to the clone user
              who initiated this visit from their command center. */}
          {resolvingLink && (
            <div
              className="pricing-reveal-up mx-auto mt-8 flex max-w-xl flex-col items-center gap-2"
              style={{ animationDelay: "440ms" }}
            >
              <div className="inline-flex h-11 items-center gap-3 rounded-full border border-white/10 bg-[#0B162C]/60 px-6 font-mono text-[12px] uppercase tracking-[0.18em] text-[#94A3B8] backdrop-blur-xl">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00A8B5]" />
                Linking your workspace…
              </div>
            </div>
          )}
          {purchaser && (
            <div
              className="pricing-reveal-up mx-auto mt-8 flex max-w-xl flex-col items-center gap-2"
              style={{ animationDelay: "440ms" }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
                Purchasing for
              </span>
              <div className="inline-flex h-11 items-center rounded-full border border-[#00A8B5]/40 bg-[#0B162C]/60 px-6 font-mono text-[12px] uppercase tracking-[0.18em] backdrop-blur-xl">
                {purchaser.cloneName ?? "your workspace"}
                {purchaserName && (
                  <span className="ml-3 normal-case tracking-normal text-[#94A3B8]">
                    as {purchaserName}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#94A3B8]/70">
                {purchaserName
                  ? `${purchaserName} is purchasing on behalf of ${purchaser.cloneName ?? "this workspace"}.`
                  : purchaser.cloneName
                    ? `Charges, seats & credits will apply to ${purchaser.cloneName}.`
                    : "Charges will apply to your workspace."}
              </p>
            </div>
          )}
          {planChange && (
            <PlanChangeNotice change={planChange} onDismiss={dismissPlanChange} />
          )}
          {h && handoff === null && (
            <div className="pricing-reveal-up mx-auto mt-8 max-w-xl rounded-md border border-[#C89B3C]/40 bg-[#0B162C] px-6 py-3 text-sm text-[#94A3B8]">
              This purchase link has expired. Head back to your dashboard and start the purchase
              again to get a fresh one.
            </div>
          )}
          {!h && uid && identity === null && (
            <div className="pricing-reveal-up mx-auto mt-8 max-w-xl rounded-md border border-[#C89B3C]/40 bg-[#0B162C] px-6 py-3 text-sm text-[#94A3B8]">
              We couldn't recognise this purchase link. Double-check it, or contact us and we'll sort
              it out.
            </div>
          )}
          {checkoutError && (
            <div className="mx-auto mt-6 max-w-xl rounded-md border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm text-red-300">
              Checkout unavailable: {checkoutError}
            </div>
          )}
        </div>

        {/* Marquee */}
        <div
          className="pricing-reveal-up relative mt-20 overflow-hidden border-y border-white/10 py-5"
          style={{ animationDelay: "480ms" }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#040B16] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#040B16] to-transparent" />
          <div className="pricing-marquee-track flex w-max gap-12 whitespace-nowrap">
            {[...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
              <span
                key={i}
                className="flex items-center gap-12 font-display text-3xl italic text-[#94A3B8]/40 md:text-5xl"
              >
                {w}
                <span className="h-1.5 w-1.5 rounded-full bg-[#00A8B5]/40" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {catalogError && (
        <p className="relative z-10 pb-24 text-center text-sm text-[#94A3B8]">{catalogError}</p>
      )}

      {/* Plans */}
      <section id="plans" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="02"
          eyebrow="Plans"
          title={
            <>
              The <span className="font-display italic text-[#5EDDE8]">tiers</span>.
            </>
          }
          description="Four shapes. One philosophy. Pay only for what your firm actually uses."
        />

        {isLoading && (
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[500px] animate-pulse rounded-2xl bg-[#0B162C]/40" />
            ))}
          </div>
        )}

        {!isLoading && plans.length > 0 && (
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {plans.map((p, idx) => {
              const meta = p.metadata ?? {};
              const minP = meta.price_min_cents ?? p.price_cents;
              const maxP = meta.price_max_cents ?? p.price_cents;
              // The annual figure Mission Control minted in Stripe, so what is
              // displayed is what will be charged. Twelve months less 10%.
              const annual = planAnnualCents(p);
              const display = billing === "annual" ? annual : minP;
              const gst = gstComponentCents(display);
              // Starter sits on Launch — position in the array is not a
              // meaningful signal, and it previously landed the badge on Scale.
              const isStarter = p.slug === "launch";
              const highlights: string[] = meta.highlights ?? [];

              // Enterprise is quoted, not listed. Recognised by slug first so
              // it survives someone changing the seat cap.
              const isEnterprise = p.slug === "enterprise" || p.seat_limit >= 999;
              const tierFeatures = featuresForTier(p.slug);
              // Everything is purchasable once we have a purchase credential —
              // including Enterprise. Without one, Enterprise still routes to
              // sales and the rest to the contact funnel.
              const buyable = canBuy;
              return (
                <PlanCard
                  key={p.id}
                  index={String(idx + 1).padStart(2, "0")}
                  featured={isStarter}
                  premium={isEnterprise}
                  name={p.name}
                  tagline={meta.best_for ?? p.description ?? ""}
                  price={display}
                  priceMax={maxP ?? minP}
                  showRange={maxP !== minP && billing === "monthly"}
                  ribbon={isStarter ? "Starter" : isEnterprise ? "Premium" : ""}
                  seats={
                    isEnterprise
                      ? "Custom seats"
                      : meta.seat_min && meta.seat_max
                        ? `${meta.seat_min}\u2013${meta.seat_max} seats`
                        : `${p.seat_limit} seats included`
                  }
                  monthlyCredits={planMonthlyCredits(p)}
                  features={tierFeatures}
                  customPricing={isEnterprise}
                  contactHref="/contact"
                  period={billing === "annual" ? "per year" : "per month"}
                  gstIncluded={gst}
                  withoutComplianceCents={planBaseCents(p, billing)}
                  highlights={highlights}
                  cta={
                    isEnterprise
                      ? "Talk to sales"
                      : currentPlanSlug === p.slug
                        ? "Current plan"
                        : currentPlanSlug && planRank.has(currentPlanSlug)
                          ? (planRank.get(p.slug) ?? 0) > (planRank.get(currentPlanSlug) ?? 0)
                            ? "Upgrade"
                            : "Downgrade"
                          : "Get started"
                  }
                  isCurrentPlan={currentPlanSlug === p.slug}
                  busy={busyId === p.id}
                  buyable={buyable}
                  onBuy={() => void buy("seat_plan", p.id)}
                />
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
          All prices in AUD · incl. GST · Annual saves{" "}
          {Math.round(ANNUAL_DISCOUNT * 100)}%
        </p>
      </section>

      {/* Security & infrastructure */}
      <section
        aria-labelledby="security-infrastructure-heading"
        className="relative z-10 mx-auto max-w-7xl px-6 pb-24"
      >
        <SectionHeader
          eyebrow="Security & Infrastructure"
          title={
            <span id="security-infrastructure-heading" className="font-display">
              Built on Trusted Infrastructure.
            </span>
          }
          description="Aurixa Systems is built using established infrastructure providers with independently assessed security and compliance programs."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {SECURITY_CARDS.map((card, index) => (
            <article
              key={card.label}
              className={`group relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-8 shadow-[0_30px_80px_-30px] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 md:p-9 ${
                index === 1
                  ? "border-[#C89B3C]/40 shadow-[#C89B3C]/20 hover:border-[#C89B3C]/60"
                  : "border-[#00A8B5]/35 shadow-[#00A8B5]/20 hover:border-[#00A8B5]/55"
              }`}
            >
              <CornerTicks />
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.3em] ${
                  index === 1 ? "text-[#C89B3C]" : "text-[#5EDDE8]"
                }`}
              >
                {card.label}
              </p>
              <h3 className="mt-6 font-display text-2xl font-semibold leading-tight text-white">
                {card.title}
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
                {card.description}
              </p>
            </article>
          ))}
        </div>

      </section>

      {/* Credit packs */}
      <section id="credits" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="03"
          eyebrow="Credits"
          title={
            <>
              Top up <span className="font-display italic text-[#C89B3C]">on demand</span>.
            </>
          }
          description="Generate more reports, scenarios and AI insights with credit packs. The bigger the pack, the cheaper the credit. Every pack lands in your balance the moment payment clears."
          icon={<Zap className="h-4 w-4" />}
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {packs.map((pack, i) => (
            <PackCard
              key={pack.id}
              pack={pack}
              rank={i + 1}
              perCredit={packPerCreditCents(pack)}
              discount={packDiscountFraction(pack, packs)}
              savingCents={packSavingCents(pack, packs)}
              baselineCredits={baselineCredits}
              bestDiscount={bestDiscount}
              busy={busyId === pack.id}
              buyable={canBuy}
              onBuy={() => void buy("topup", pack.id)}
            />
          ))}
        </div>
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
          All prices in AUD · incl. GST · Savings measured per credit against the smallest pack
        </p>
      </section>

      {/* Modules / setup / reports */}
      <section id="addons" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <SectionHeader
          index="04"
          eyebrow="Build your stack"
          title={
            <>
              Modules, onboarding &{" "}
              <span className="font-display italic text-[#5EDDE8]">report economics</span>.
            </>
          }
          description={
            hasRestricted
              ? "Mix and match what your firm actually uses. All optional, all transparent."
              : "Module pricing, onboarding packages and per-report credit costs are shared with customers, and on request."
          }
          icon={<Puzzle className="h-4 w-4" />}
        />

        {!hasRestricted && <RestrictedGate loading={isLoading} />}

        {hasRestricted && (
        <StackTabs
          addons={
            <div className="space-y-10">
              {addonsByCategory.map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#00A8B5]">
                    {category}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[#00A8B5]/40 hover:bg-[#0B162C]/60"
                >
                  <CornerTicks />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans text-base font-semibold tracking-tight text-white">
                      {a.name}
                    </h3>
                    {a.category && (
                      <span className="rounded-sm border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]">
                        {a.category}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">{a.description}</p>
                  )}
                  <div className="mt-4 text-lg font-semibold tracking-tight text-white">
                    {range(a.price_min_cents, a.price_max_cents)}
                    {a.billing_period && (
                      <span className="ml-1.5 font-display text-sm font-normal italic text-[#94A3B8]">
                        / {a.billing_period}
                      </span>
                    )}
                  </div>
                  {(a.included_in_plans?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.included_in_plans!.map((pl) => (
                        <span
                          key={pl}
                          className="rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#94A3B8]"
                        >
                          included · {pl}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Pinned to the bottom so the CTAs line up across a row
                      whatever length the descriptions run to. */}
                  <div className="mt-auto pt-5">
                    <AddonAction
                      purchase={resolveAddonPurchase(a, {
                        currentPlanSlug,
                        accountReference: moduleReference,
                      })}
                      name={a.name}
                    />
                  </div>
                </div>
              ))}
                  </div>
                </div>
              ))}
              {/* Said once, under the grid, rather than on twenty-three cards.
                  A module is its own subscription — it does not fold into a
                  plan's invoice — and it is switched on by a person, so the
                  page should not imply it appears the moment payment clears. */}
              <p className="border-t border-white/[0.07] pt-6 text-xs leading-relaxed text-[#94A3B8]">
                Each module is billed as its own monthly subscription in AUD, incl. GST, and can be
                cancelled independently of your plan. Name the account it is for at checkout and the
                team enables it, usually within one business day.
              </p>
            </div>
          }
          setup={
            <div className="grid gap-4 md:grid-cols-2">
              {setups.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl transition-all hover:border-[#00A8B5]/40"
                >
                  <CornerTicks />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00A8B5]/10 text-[#00A8B5] ring-1 ring-[#00A8B5]/30">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <h3 className="font-sans text-base font-semibold tracking-tight text-white">
                        {s.name}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-sm bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#C89B3C]">
                      {range(s.price_min_cents, s.price_max_cents)}
                    </span>
                  </div>
                  {s.description && (
                    <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{s.description}</p>
                  )}
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {(s.deliverables ?? []).map((d, i) => (
                      <li key={i} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00A8B5]" />
                        <span className="text-[#94A3B8]">{d}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 max-w-[220px]">
                    {canBuy ? (
                      <BuyButton
                        busy={busyId === s.id}
                        label="Purchase package"
                        onClick={() => void buy("setup_package", s.id)}
                      />
                    ) : (
                      <Link
                        to="/contact"
                        className="block rounded-sm border border-[#00A8B5]/40 py-2 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
                      >
                        Enquire
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          }
          reports={
            <>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0B162C]/40 backdrop-blur-xl">
                <CornerTicks />
                <div className="divide-y divide-white/10">
                  <div className="grid grid-cols-12 gap-2 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
                    <div className="col-span-6">Report</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-3 text-right">Credits</div>
                  </div>
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 items-center gap-2 px-6 py-4 text-sm transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="col-span-6 font-medium tracking-tight text-white">
                        {r.name}
                      </div>
                      <div className="col-span-3 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
                        {r.category ?? "—"}
                      </div>
                      <div className="col-span-3 text-right font-mono text-[#00A8B5]">
                        {r.credit_cost}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
                Credits consumed only on successful generation.
              </p>
            </>
          }
        />
        )}
      </section>

      {/* Trust strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative grid gap-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B162C]/70 via-[#0B162C]/30 to-[#0B162C]/70 p-10 backdrop-blur-xl md:grid-cols-3">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_50%,rgba(0,168,181,0.08),transparent_60%),radial-gradient(circle_at_80%_50%,rgba(200,155,60,0.08),transparent_60%)]" />
          <Trust
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Enterprise security"
            body="SSO, audit logs, role-based access and isolated tenancy by default."
          />
          <Trust
            icon={<InfinityIcon className="h-5 w-5" />}
            title="Scales with you"
            body="Add seats, devices and credits the moment the team needs them."
          />
          <Trust
            icon={<Users className="h-5 w-5" />}
            title="Hands-on onboarding"
            body="A real human walks your team through setup and rollout."
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-4xl px-6 pb-32">
        <SectionHeader
          index="05"
          eyebrow="FAQ"
          title={
            <>
              Questions, <span className="font-display italic text-[#5EDDE8]">answered</span>.
            </>
          }
          icon={<FileText className="h-4 w-4" />}
        />
        <div className="mt-12 space-y-10">
          {FAQ_GROUPS.map((group) => (
            <div key={group.heading}>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00A8B5]">
                  {group.heading}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#00A8B5]/30 to-transparent" />
              </div>
              <div className="space-y-2.5">
                {group.items.map((item, i) => (
                  <FaqItem key={item.q} index={faqNumbers.get(item.q) ?? i + 1} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-[#00A8B5]/30 bg-gradient-to-br from-[#00A8B5]/10 via-[#0B162C] to-[#C89B3C]/10 p-10 text-center md:p-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,168,181,0.2),transparent_60%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.04] pricing-noise" />
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00A8B5]/80">
            06 / Next move
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.02em] md:text-6xl">
            Ready <span className="font-display italic text-[#5EDDE8]">when</span> you are.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[#94A3B8] md:text-lg">
            {canBuy
              ? "Pick a plan above, or book a walkthrough with our team to see it on your data."
              : "Already a client? Start any purchase from inside your command center. It carries your workspace and account straight into checkout. New here? Talk to us."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-sm bg-[#00A8B5] px-8 py-3 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-[0_0_50px_-10px] shadow-[#00A8B5]/70 transition-transform hover:scale-105"
            >
              Talk to us <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#00A8B5]/40" />
    </>
  );
}

function PlanCard({
  index,
  name,
  tagline,
  price,
  priceMax,
  showRange,
  ribbon,
  seats,
  monthlyCredits,
  features,
  customPricing,
  contactHref,
  premium,
  isCurrentPlan,
  period,
  gstIncluded,
  withoutComplianceCents,
  highlights,
  cta,
  busy,
  featured,
  buyable,
  onBuy,
}: {
  // No @types/react in this repo, so JSX doesn't strip `key` from props.
  key?: string;
  index: string;
  name: string;
  tagline: string;
  price: number;
  priceMax: number;
  showRange: boolean;
  ribbon: string;
  seats: string;
  /** "per month" / "per year" — which cadence `price` is for. */
  period?: string;
  /** GST contained in `price`. Australian pricing must show tax-inclusive. */
  gstIncluded?: number;
  /**
   * Same tier WITHOUT the AML/CTF module. The headline includes it — the price
   * list titles every tier that way — so this is the stated alternative.
   */
  withoutComplianceCents?: number | null;
  /** Report credits the plan includes each month, or null if it includes none. */
  monthlyCredits?: number | null;
  /** Module breakdown from the price list. Falls back to `highlights`. */
  features?: TierFeatures;
  /** Quoted rather than listed — show a call to action, not a number. */
  customPricing?: boolean;
  /** Where the CTA goes when there is no self-serve price. */
  contactHref?: string;
  /** Top-of-range treatment — gold rather than the teal used for Starter. */
  premium?: boolean;
  /** The workspace is already on this tier, so there is nothing to buy. */
  isCurrentPlan?: boolean;
  highlights: string[];
  cta: string;
  busy?: boolean;
  featured?: boolean;
  buyable: boolean;
  onBuy: () => void;
}) {
  const ctaClasses = `flex w-full items-center justify-center rounded-sm py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition-all ${
    isCurrentPlan
      ? "cursor-default border border-white/15 font-bold text-white/50"
      : premium
        ? "bg-gradient-to-r from-[#C89B3C] to-[#E9C877] font-black text-[#1A1206] shadow-[0_0_44px_-8px] shadow-[#C89B3C]/70 hover:scale-[1.02]"
        : featured
          ? "bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] font-black text-[#040B16] shadow-[0_0_40px_-8px] shadow-[#00A8B5]/70 hover:scale-[1.02]"
          : "border border-[#00A8B5]/40 font-bold text-white hover:border-[#00A8B5]"
  }`;
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 md:p-9 ${
        premium
          ? "border-[#C89B3C]/55 bg-gradient-to-br from-[#C89B3C]/[0.14] via-[#131019]/85 to-[#0B162C]/50 shadow-[0_44px_110px_-30px] shadow-[#C89B3C]/45"
          : featured
            ? "border-[#00A8B5]/60 bg-gradient-to-br from-[#00A8B5]/15 via-[#0B162C]/80 to-[#0B162C]/40 shadow-[0_40px_100px_-30px] shadow-[#00A8B5]/50"
            : "border-white/10 bg-[#0B162C]/40 hover:border-[#00A8B5]/40 hover:shadow-[0_30px_80px_-30px] hover:shadow-[#00A8B5]/30"
      }`}
    >
      <CornerTicks />
      {premium && (
        <>
          {/* Top of the range should read that way at a glance: a gold frame,
              a warm wash behind it, and a badge that is not competing with the
              teal used everywhere else on the page. */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#E9C877] to-transparent" />
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#C89B3C]/20 blur-3xl" />
          <span className="absolute right-5 top-5 rounded-sm bg-gradient-to-r from-[#C89B3C] to-[#E9C877] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#1A1206]">
            {ribbon}
          </span>
        </>
      )}
      {featured && !premium && (
        <>
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent" />
          <span className="absolute right-5 top-5 rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#C89B3C] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#040B16]">
            {ribbon}
          </span>
        </>
      )}

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]">
        <span>{name}</span>
        <span className="text-white/30">{index}</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">{tagline}</p>

      <div className="mt-7">
        {customPricing ? (
          // Enterprise is scoped and quoted, so there is no figure to show.
          // Printing one anyway — as this card did — commits us to a number
          // nobody agreed to.
          <>
            <div className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-4xl font-semibold tracking-[-0.03em] text-transparent">
              Let&rsquo;s talk
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
              Custom pricing · scoped to your firm
            </div>
          </>
        ) : (
          <>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`bg-gradient-to-br ${featured ? "from-white via-white to-[#5EDDE8]" : "from-white to-white/50"} bg-clip-text text-5xl font-semibold tracking-[-0.03em] text-transparent`}
          >
            {aud(price)}
          </span>
          {showRange && priceMax > price && (
            <span className="font-display text-base italic text-[#94A3B8]">– {aud(priceMax)}</span>
          )}
        </div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
          AUD {period ? `/ ${period.replace("per ", "")}` : "/ month"} · incl GST
        </div>
        {gstIncluded != null && gstIncluded > 0 && (
          // Australian pricing is quoted tax-inclusive, so the GST is shown as
          // a component of the figure above rather than added underneath it.
          <div className="mt-1 font-mono text-[10px] tracking-wider text-[#94A3B8]/70">
            includes {aud(gstIncluded)} GST
          </div>
        )}
        {withoutComplianceCents != null && (
          // A genuine second price, not a footnote: the sheet publishes both,
          // and for a firm that already has its compliance covered this is the
          // number that decides the purchase.
          <div className="mt-4 rounded-lg border border-[#C89B3C]/35 bg-[#C89B3C]/[0.07] px-3 py-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight text-[#E9C877]">
                {aud(withoutComplianceCents)}
              </span>
              <span className="font-display text-sm italic text-[#C89B3C]/80">
                {period ? `/ ${period.replace("per ", "")}` : "/ month"}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[#C89B3C]/90">
              without AML/CTF Compliance · incl GST
            </div>
          </div>
        )}
          </>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-[#040B16]/40 px-4 py-2.5 font-mono text-[11px] tracking-wider text-white/80">
        {seats}
      </div>

      {/* The included credits, given a treatment of their own rather than a
          line in the feature list.
          This is the one number on the card that is not money and not a seat
          count, and it is what the subscription is actually metered in — every
          report, comparison and scenario spends it. Buried among thirty
          features it reads as one more tick; set apart, it answers "how much
          can I actually do on this plan" at a glance. */}
      {monthlyCredits != null && (
        <div
          className={`relative mt-3 overflow-hidden rounded-lg border px-4 py-3 ${
            premium
              ? "border-[#C89B3C]/45 bg-[#C89B3C]/[0.07]"
              : featured
                ? "border-[#00A8B5]/45 bg-[#00A8B5]/[0.07]"
                : "border-[#00A8B5]/25 bg-[#00A8B5]/[0.04]"
          }`}
        >
          <div className="flex items-baseline gap-2">
            <Zap
              className={`h-3.5 w-3.5 shrink-0 self-center ${
                premium ? "text-[#E9C877]" : "text-[#5EDDE8]"
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-xl font-semibold tracking-tight ${
                premium ? "text-[#F2DFA8]" : "text-white"
              }`}
            >
              {monthlyCredits.toLocaleString()}
            </span>
            <span className="font-display text-sm italic text-[#94A3B8]">credits included</span>
          </div>
          {/* Every month on either billing period — an annual plan bills a year
              up front but credits arrive monthly, because they lapse in 30
              days and a year of them handed over at once would expire unused.
              Saying "every month" on the annual toggle is the honest version. */}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/70">
            Every month · renews with your plan
          </p>
        </div>
      )}

      {features ? (
        <div className="mt-7 flex-1 space-y-5">
          {features.inherits && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5EDDE8]">
              Everything in {features.inherits}, plus
            </p>
          )}
          {features.groups.map((g) => (
            <div key={g.heading}>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
                {g.heading}
              </p>
              <ul className="space-y-1.5 text-sm">
                {g.items.map((item) => (
                  <li key={item.name} className="flex gap-2.5">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#C89B3C]" : "text-[#00A8B5]"}`}
                    />
                    <span className="min-w-0">
                      <span className="text-[#CBD5E1]">{item.name}</span>
                      {item.subs && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-[#94A3B8]/70">
                          {item.subs.join(" · ")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          {highlights.map((hl, i) => (
            <li key={i} className="flex gap-2.5">
              <Check
                className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#C89B3C]" : "text-[#00A8B5]"}`}
              />
              <span className="text-[#94A3B8]">{hl}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-9">
        {customPricing ? (
          // No self-serve price means no self-serve checkout, credential or
          // not. Enterprise is scoped first and quoted second.
          <Link to={contactHref ?? "/contact"} className={ctaClasses}>
            {cta}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : isCurrentPlan ? (
          <div className={ctaClasses} aria-disabled="true">
            {cta}
          </div>
        ) : buyable ? (
          <button type="button" onClick={onBuy} disabled={busy} className={ctaClasses}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…
              </>
            ) : (
              <>
                {cta}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        ) : (
          <Link to="/contact" className={ctaClasses}>
            {cta}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * What stands in for the restricted sections when a visitor may not see them.
 *
 * Deliberately not an error and not an empty state. The sections exist, they
 * are simply not published to the open web — so this says what is behind the
 * gate, names the two ways through it, and gives one obvious action. Blurred
 * placeholder rows sit behind it so the shape of what is missing is legible
 * without any of the figures being present in the DOM: the data never reaches
 * the browser at all, because the server does not send it.
 */
/**
 * One rung of the top-up ladder.
 *
 * The ladder's whole argument is that a credit gets cheaper as the pack gets
 * bigger, and a grid of eight prices does not make that argument on its own —
 * $713.90 next to $20.90 reads as expensive unless the per-credit rate is
 * right there beside it. So the rate and the saving against the smallest pack
 * are given equal billing with the price, and the rail underneath plots this
 * pack's saving against the best one available, so the curve is visible at a
 * glance rather than something to work out from eight cards.
 */
function PackCard({
  pack,
  perCredit,
  discount,
  savingCents,
  baselineCredits,
  bestDiscount,
  rank,
  busy,
  buyable,
  onBuy,
}: {
  // No @types/react in this repo, so JSX doesn't strip `key` from props.
  key?: string;
  pack: CatalogPack;
  /** Cents per credit, unrounded — displayed to two decimals. */
  perCredit: number;
  /** Cheaper per credit than the smallest pack, as a fraction. */
  discount: number;
  /** The same saving in money, against buying these credits in smallest packs. */
  savingCents: number;
  /** Credits in the smallest pack — the size the saving is measured against. */
  baselineCredits: number;
  /** The deepest saving on offer, so the rail has a full scale. */
  bestDiscount: number;
  /** Position in the ladder, used when the catalog row carries no stage. */
  rank: number;
  busy: boolean;
  buyable: boolean;
  onBuy: () => void;
}) {
  const meta = pack.metadata ?? {};
  const popular = !!meta.popular;
  const bestValue = !!meta.best_value;
  const accent = bestValue ? "#C89B3C" : "#00A8B5";
  // Below a tenth of a percent there is nothing to claim — that is the
  // baseline pack, and "−0.0%" would be worse than saying nothing.
  const saving = discount >= 0.001 ? `−${(discount * 100).toFixed(1)}%` : null;
  // Always leave a sliver showing, so the baseline pack reads as the start of
  // a scale rather than as a missing bar.
  const fill = bestDiscount > 0 ? Math.max(0.04, discount / bestDiscount) : 0.04;
  const gst = gstComponentCents(pack.price_cents);
  const credits = pack.tokens.toLocaleString();

  // A disabled <button> is skipped by keyboard and announced as unavailable,
  // which is wrong here: browse-only visitors are meant to READ these cards,
  // they just cannot buy from this page. So the card is only a control when it
  // can actually do something.
  const Tag = buyable ? "button" : "div";
  const interactive = buyable
    ? {
        type: "button" as const,
        disabled: busy,
        onClick: onBuy,
        "aria-label": `Buy ${credits} credits for ${aud(pack.price_cents)} including GST${
          saving ? `, ${(discount * 100).toFixed(1)}% cheaper per credit than the smallest pack` : ""
        }`,
      }
    : {};

  return (
    <Tag
      {...interactive}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] disabled:cursor-default ${
        bestValue ? "focus-visible:ring-[#E9C877]" : "focus-visible:ring-[#5EDDE8]"
      } ${
        bestValue
          ? "border-[#C89B3C]/55 bg-gradient-to-br from-[#C89B3C]/[0.12] via-[#131019]/80 to-[#0B162C]/45 shadow-[0_36px_90px_-32px] shadow-[#C89B3C]/45 hover:border-[#C89B3C]/80"
          : popular
            ? "border-[#00A8B5]/55 bg-gradient-to-br from-[#00A8B5]/[0.12] via-[#0B162C]/80 to-[#0B162C]/45 shadow-[0_36px_90px_-32px] shadow-[#00A8B5]/45 hover:border-[#00A8B5]/80"
            : "border-white/10 bg-[#0B162C]/40 hover:border-[#00A8B5]/45 hover:bg-[#0B162C]/70 hover:shadow-[0_30px_80px_-30px] hover:shadow-[#00A8B5]/35"
      } ${busy ? "cursor-wait opacity-70" : ""}`}
    >
      <CornerTicks />
      {(bestValue || popular) && (
        <div
          className="absolute inset-x-0 -top-px h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      )}
      {bestValue && (
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#C89B3C]/20 blur-3xl" />
      )}

      {/* Fixed height so a badged card is not taller than an unbadged one —
          otherwise the whole grid row it sits in grows with it. */}
      <div className="flex min-h-[1.375rem] items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          {String(meta.stage ?? rank).padStart(2, "0")}
        </span>
        {bestValue ? (
          <span className="rounded-sm bg-gradient-to-r from-[#C89B3C] to-[#E9C877] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#1A1206]">
            Best value
          </span>
        ) : popular ? (
          <span className="rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#040B16]">
            Most popular
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`bg-clip-text text-4xl font-semibold tracking-tight text-transparent ${
            bestValue
              ? "bg-gradient-to-br from-white via-[#F2DFA8] to-[#C89B3C]"
              : "bg-gradient-to-br from-white via-white to-[#5EDDE8]"
          }`}
        >
          {credits}
        </span>
        <span className="font-display text-base italic text-[#94A3B8]">credits</span>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {aud(pack.price_cents)}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/70">
        Incl. {aud(gst)} GST
      </div>

      {/* The unit that actually compares one pack to another. */}
      <div className="mt-5 rounded-lg border border-white/10 bg-[#040B16]/40 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xs text-white">
            {(Math.round(perCredit * 100) / 100).toFixed(2)}c
            <span className="ml-1 text-[10px] text-[#94A3B8]">/ credit</span>
          </span>
          {saving && (
            <span
              className="font-mono text-[11px] font-bold"
              style={{ color: bestValue ? "#E9C877" : "#5EDDE8" }}
            >
              {saving}
            </span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${fill * 100}%`,
              background: bestValue
                ? "linear-gradient(90deg, #C89B3C, #E9C877)"
                : "linear-gradient(90deg, #00A8B5, #5EDDE8)",
            }}
          />
        </div>
        {/* The percentage is the honest comparison; this is the one people
            weigh a purchase against — the same fact, stated in money. The
            baseline pack gets a line of its own rather than none: it says what
            the other cards are measured against, and without it this card's
            copy sits a line higher than every other card in its row. */}
        <p className="mt-2 text-[11px] leading-snug text-[#94A3B8]">
          {savingCents > 0 ? (
            <>
              <span className="font-semibold text-white">{aud(savingCents)} less</span> than these
              credits at the {baselineCredits.toLocaleString()}-pack rate
            </>
          ) : (
            <>The rate every larger pack is measured against</>
          )}
        </p>
      </div>

      {/* Rendered on every card, including the two whose badge says much the
          same thing. Skipping it there reads as a hole in exactly the cards
          that should look most considered, and the badge and the line are
          doing different jobs: one flags, the other explains. */}
      {meta.best_for && (
        <p className="mt-4 text-xs leading-relaxed text-[#94A3B8]">{meta.best_for}</p>
      )}

      {/* Stacked rather than side by side: at four columns "From your
          dashboard" and the validity term wrap into each other. The term is
          part of what is being bought, so it belongs on the card rather than
          only in the FAQ — and it is read from the pack itself, so a pack with
          a shorter window advertises that window, not the 30-day default. */}
      <div className="mt-auto pt-6">
        <div className="space-y-2 border-t border-white/[0.07] pt-4">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
            Valid {packValidityDays(pack)} days
          </span>
          <span
            className="flex items-center font-mono text-[10px] uppercase tracking-[0.25em] opacity-80 transition-opacity group-hover:opacity-100"
            style={{ color: buyable ? accent : undefined }}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Starting…
              </>
            ) : buyable ? (
              <>
                Purchase{" "}
                <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </>
            ) : (
              <span className="text-[#94A3B8]/55">From your dashboard</span>
            )}
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: bestValue
            ? "radial-gradient(circle at 50% 0%, rgba(200,155,60,0.14), transparent 60%)"
            : "radial-gradient(circle at 50% 0%, rgba(0,168,181,0.12), transparent 60%)",
        }}
      />
    </Tag>
  );
}

/**
 * "Your plan changed, and here is what landed in your balance." Once.
 *
 * Shown at the top of the page after a plan change, because that is where the
 * change was made and where the customer returns from Stripe. It states three
 * things and nothing else: which plan they are on now, how many credits were
 * added, and when those credits lapse — the last because credits expire in 30
 * days and an allowance nobody knew arrived is an allowance nobody spends.
 *
 * Dismissing it is what retires it, not loading it. A notice acknowledged on
 * fetch would be lost by any render that failed, and this is the only time
 * they are told.
 */
function PlanChangeNotice({ change, onDismiss }: { change: PlanChange; onDismiss: () => void }) {
  const upgraded = change.creditsGranted > 0;
  return (
    <div
      role="status"
      className="pricing-reveal-up mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-[#00A8B5]/45 bg-gradient-to-br from-[#00A8B5]/[0.14] via-[#0B162C]/85 to-[#0B162C]/50 text-left shadow-[0_36px_90px_-32px] shadow-[#00A8B5]/45 backdrop-blur-xl"
      style={{ animationDelay: "300ms" }}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />
      <div className="flex items-start gap-4 p-6">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00A8B5]/15 text-[#5EDDE8] ring-1 ring-[#00A8B5]/35">
          <Check className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#5EDDE8]">
            Plan updated
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-white">
            {change.fromPlanName ? (
              <>
                You moved from {change.fromPlanName} to{" "}
                <span className="text-[#5EDDE8]">{change.toPlanName}</span>.
              </>
            ) : (
              <>
                You are now on <span className="text-[#5EDDE8]">{change.toPlanName}</span>.
              </>
            )}
          </p>

          {/* The number that matters, given its own line rather than buried in
              a sentence. Zero is possible and honest: changing plan twice in
              one month grants the allowance once. */}
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            {upgraded ? (
              <>
                <span className="font-semibold text-white">
                  {change.creditsGranted.toLocaleString()} credits
                </span>{" "}
                have been added to your balance
                {change.creditsExpireAt && (
                  <>
                    {" "}
                    and stay spendable until{" "}
                    <span className="text-white">
                      {new Date(change.creditsExpireAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </>
                )}
                . Your allowance renews with your plan each month.
              </>
            ) : (
              <>
                This month&rsquo;s allowance was already credited, so no further credits were
                added. Your next allowance arrives when your plan renews.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss plan update"
          className="-mr-1 -mt-1 shrink-0 rounded-md p-2 text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RestrictedGate({ loading }: { loading: boolean }) {
  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0B162C]/40 backdrop-blur-xl">
      <CornerTicks />

      {/* Suggestion of the withheld content. Purely decorative — no real
          values are rendered, blurred or otherwise. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none p-8 opacity-[0.13] blur-[6px]">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-3 flex-1 rounded-full bg-white/40" style={{ maxWidth: `${58 + ((i * 13) % 34)}%` }} />
              <div className="h-3 w-14 rounded-full bg-[#00A8B5]/60" />
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#040B16]/30 via-[#040B16]/70 to-[#040B16]" />

      <div className="relative flex flex-col items-center px-6 py-16 text-center sm:px-10 sm:py-20">
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-[#C89B3C]/40 bg-[#C89B3C]/10">
          <ShieldCheck className="h-5 w-5 text-[#C89B3C]" />
        </span>

        <h3 className="max-w-xl font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Module pricing is shared{" "}
          <span className="font-display italic text-[#C89B3C]">on request</span>.
        </h3>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#94A3B8]">
          Add-on module pricing, onboarding packages and per-report credit costs sit behind this.
          They are visible to anyone reaching this page from their workspace, and to anyone we have
          shared an access link with.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#040B16]/50 px-4 py-3 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#00A8B5]">
              Already a customer
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
              Open pricing from inside your workspace and it unlocks automatically.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#040B16]/50 px-4 py-3 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#C89B3C]">
              Evaluating us
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
              Ask and we will send you an access link.
            </p>
          </div>
        </div>

        <Link
          to="/contact"
          className="group mt-9 inline-flex items-center justify-center rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] px-8 py-3.5 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-[#040B16] shadow-[0_0_40px_-8px] shadow-[#00A8B5]/70 transition-all hover:scale-[1.02]"
        >
          Request access
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
          {loading ? "Checking access…" : "Plans and credit packs above are public"}
        </p>
      </div>
    </div>
  );
}

function StackTabs({
  addons,
  setup,
  reports,
}: {
  addons: ReactNode;
  setup: ReactNode;
  reports: ReactNode;
}) {
  const [tab, setTab] = useState<"addons" | "setup" | "reports">("addons");
  const tabs = [
    { id: "addons" as const, label: "Add-ons" },
    { id: "setup" as const, label: "Onboarding" },
    { id: "reports" as const, label: "Reports" },
  ];
  return (
    <div className="mt-14">
      <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-1 rounded-lg border border-white/10 bg-[#0B162C]/60 p-1 backdrop-blur-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-md py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
              tab === t.id ? "bg-[#00A8B5] text-[#040B16] font-bold" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-10">
        {tab === "addons" && addons}
        {tab === "setup" && setup}
        {tab === "reports" && reports}
      </div>
    </div>
  );
}

function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  icon,
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
        {index && <span className="text-white/40">{index}</span>}
        {index && <span className="h-px w-8 bg-white/20" />}
        {icon}
        <span>{eyebrow}</span>
      </div>
      <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function Trust({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00A8B5]/10 text-[#00A8B5] ring-1 ring-[#00A8B5]/30">
        {icon}
      </div>
      <div>
        <h4 className="font-sans font-semibold tracking-tight text-white">{title}</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">{body}</p>
      </div>
    </div>
  );
}

function FaqItem({
  index,
  q,
  a,
  points,
}: {
  // No @types/react in this repo, so JSX doesn't strip `key` from props.
  key?: string;
  index: number;
  q: string;
  a: string[];
  points?: string[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${index}`;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
        open
          ? "border-[#00A8B5]/45 bg-gradient-to-br from-[#00A8B5]/[0.07] to-[#0B162C]/50"
          : "border-white/10 bg-[#0B162C]/30 hover:border-[#00A8B5]/25 hover:bg-[#0B162C]/50"
      }`}
    >
      {/* Accent rail — a quiet marker for which row is open, rather than
          relying on the icon alone. */}
      <span
        className={`absolute inset-y-0 left-0 w-px bg-gradient-to-b from-[#00A8B5] to-[#C89B3C] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span
          className={`mt-0.5 font-mono text-[10px] tabular-nums transition-colors ${
            open ? "text-[#00A8B5]" : "text-white/25"
          }`}
        >
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={`flex-1 font-sans text-base font-medium tracking-tight transition-colors ${
            open ? "text-white" : "text-white/90 group-hover:text-white"
          }`}
        >
          {q}
        </span>
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
            open
              ? "rotate-180 border-[#00A8B5]/50 bg-[#00A8B5]/15 text-[#5EDDE8]"
              : "border-white/15 text-[#94A3B8] group-hover:border-[#00A8B5]/40 group-hover:text-white"
          }`}
        >
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Animating grid rows rather than max-height: the panel opens to its
          real content height, so long answers do not clip and short ones do
          not leave a gap. */}
      <div
        id={panelId}
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-5 pb-5 pl-[3.25rem] text-sm leading-relaxed text-[#94A3B8] sm:px-6 sm:pb-6 sm:pl-[3.75rem]">
            {a.map((para) => (
              <p key={para}>{para}</p>
            ))}
            {points && (
              <ul className="space-y-1.5 border-l border-[#00A8B5]/20 pl-4">
                {points.map((pt) => (
                  <li key={pt} className="text-[#94A3B8]/90">
                    {pt}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The one action on an add-on module card.
 *
 * Three outcomes, and each is a real state rather than a fallback:
 *
 *   · **Add module** — a live Stripe Payment Link whose price matches the
 *     number on the card. It opens in a new tab so the price list stays where
 *     the customer left it; they will be comparing more than one module.
 *   · **Included with your plan** — they already have it, and offering to sell
 *     it again would be worse than showing nothing.
 *   · **Enquire** — nothing is sold for this module yet (or the catalog and
 *     Stripe disagree on the price, in which case not charging is the only
 *     honest option). The contact funnel is where the site sends everything it
 *     cannot complete on its own.
 */
function AddonAction({
  purchase,
  name,
}: {
  purchase: ReturnType<typeof resolveAddonPurchase>;
  name: string;
}) {
  if (purchase.available) {
    return (
      <a
        href={purchase.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-sm border border-[#00A8B5]/40 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5] hover:bg-[#00A8B5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
      >
        {/* The module is named for a screen reader, which hears this link out
            of the context of the card it sits in. */}
        <span aria-hidden="true">Add module</span>
        <span className="sr-only">Add the {name} module, opens Stripe in a new tab</span>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    );
  }

  if (purchase.reason === "already_included") {
    return (
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5EDDE8]">
        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Included with your plan
      </p>
    );
  }

  return (
    <Link
      to="/contact"
      className="flex items-center justify-center rounded-sm border border-white/15 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] transition-colors hover:border-[#00A8B5]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
    >
      <span aria-hidden="true">Enquire</span>
      <span className="sr-only">Enquire about the {name} module</span>
    </Link>
  );
}

function BuyButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-sm bg-[#00A8B5] py-2.5 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function BackgroundFX() {
  return (
    <>
      {/* animated aurora */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]">
        <div className="pricing-aurora absolute inset-0" />
      </div>
      {/* lower aurora */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[700px] opacity-60">
        <div
          className="pricing-aurora absolute inset-0"
          style={{ animationDirection: "alternate-reverse" }}
        />
      </div>
      {/* fine grid with vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      {/* film grain */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] pricing-noise" />
      {/* horizon line */}
      <div className="pointer-events-none absolute inset-x-0 top-[90vh] -z-10 h-px bg-gradient-to-r from-transparent via-[#00A8B5]/40 to-transparent" />
    </>
  );
}
