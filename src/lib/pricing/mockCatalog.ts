/**
 * The $1 mock Stripe catalogue that /pricing-mock renders.
 *
 * WHY THIS EXISTS. Testing is being initiated from the prime repo (the NPC
 * Property Dashboard) against Mission Control, and every one of those tests
 * ends at a Stripe checkout. Exercising them against the real price list means
 * moving thousands of dollars per run, so this is the same catalogue — every
 * tier, every add-on module, every top-up pack, every onboarding package —
 * reminted at A$1.00 a piece.
 *
 * ── The one thing to understand before touching this file ────────────────────
 *
 * These products live in the LIVE Stripe account (acct_1TbJPK3tNhf9apmH), not a
 * sandbox. That was a deliberate, explicitly-approved call, and it is the
 * reason for the metadata discipline below. Two consequences follow, and both
 * are load-bearing:
 *
 *   1. **The links charge real money.** A$1.00 really leaves a real card. They
 *      are test *fixtures*, not test *mode*. The page says so at the top, in
 *      the largest type on it, because somebody will eventually open this URL
 *      without reading the commit that added it.
 *
 *   2. **The namespace must never collide with the live one.** Mission
 *      Control's three sync routines resolve a product by searching Stripe
 *      metadata — `metadata['aurixa_tier']`, `metadata['aurixa_module']` and
 *      `metadata['aurixa_pack']` respectively (see stripe-catalog-sync,
 *      stripe-module-sync and stripe-pack-sync in the mission-control repo).
 *      If a mock product carried one of those keys, the next press of Apply
 *      could bind the real catalogue row to a $1 price and every customer on
 *      it would be charged a dollar. So the mocks carry `aurixa_mock_tier`,
 *      `aurixa_mock_module`, `aurixa_mock_pack` and `aurixa_mock_setup` — keys
 *      no live search will ever match — and the test in mockCatalog.test.ts
 *      asserts that no reserved key is ever reintroduced.
 *
 * Every mock also carries `aurixa_mock: "true"`, which is the single handle for
 * finding or retiring the whole set: `metadata['aurixa_mock']:'true'` in Stripe
 * search returns these 38 products and nothing else.
 *
 * ── What the mocks deliberately do NOT do ────────────────────────────────────
 *
 * A Payment Link purchase reaches Mission Control's webhook without the
 * `mode`/`item_id` metadata that fulfilment needs, so it raises
 * `PermanentError("missing_metadata")`: the event is recorded and stops there.
 * No plan is provisioned, no credits are issued, no module is enabled. That is
 * not a limitation of the mocks — it is exactly how the live add-on Payment
 * Links in addonPurchaseLinks.ts already behave, which is why those cards say
 * the module is enabled by the team rather than instantly. Mirroring it is the
 * point: the mock behaves like the thing it is standing in for.
 */

/** What every mock charges, in cents. One Australian dollar, tax-inclusive. */
export const MOCK_PRICE_CENTS = 100;

/** The Stripe account the mocks live in. Live, not a sandbox — see the header. */
export const MOCK_STRIPE_ACCOUNT = "acct_1TbJPK3tNhf9apmH";

/**
 * Metadata keys the live sync routines search on. Nothing in this file may use
 * one; `mockCatalog.test.ts` enforces it rather than trusting review to catch
 * it, because the failure is silent and expensive.
 */
export const RESERVED_LIVE_METADATA_KEYS = [
  "aurixa_tier",
  "aurixa_module",
  "aurixa_pack",
] as const;

export type MockKind = "tier" | "module" | "pack" | "setup";

export type MockLineItem = {
  kind: MockKind;
  /** Mission Control's slug for the thing this stands in for. */
  slug: string;
  /** Display name, without the `[MOCK] ` prefix the Stripe product carries. */
  name: string;
  /** Section heading on the page — module category, or the kind's own group. */
  group: string;
  productId: string;
  priceId: string;
  /** The live Stripe Payment Link. Charges MOCK_PRICE_CENTS. */
  url: string;
  /** What the real thing costs, so the page can show both side by side. */
  livePriceCents: number;
  /** How the real thing bills. The mock bills identically. */
  billing: "month" | "year" | "one_time";
  /** Tiers only: which of the two prices on the tier product this is. */
  period?: "monthly" | "annual";
  /** Modules only: tiers that bundle it at no extra cost. */
  includedIn?: readonly string[];
  /** Tiers only: report credits granted every month. */
  monthlyCredits?: number;
  /** Tiers only: the seat band, inclusive. */
  seats?: readonly [number, number];
  /** Packs only: credits the pack grants. */
  credits?: number;
  /** Carried through from the price list where one exists. */
  note?: string;
};

/**
 * The three signed-off tiers, plus Enterprise.
 *
 * Enterprise is quoted rather than listed on the real pricing page — it renders
 * with `customPricing` and routes to contact, so it has no live Payment Link to
 * mirror. It is minted here anyway because the `seat_plan` checkout path in
 * Mission Control does resolve it, and a test sweep that skipped it would leave
 * that path unexercised. It is marked so the page can say as much.
 */
export const MOCK_TIERS: readonly MockLineItem[] = [
  {
    kind: "tier",
    slug: "launch",
    name: "Launch",
    group: "Plans",
    period: "monthly",
    productId: "prod_V0uOzvW7HMVPxL",
    priceId: "price_1U0sZu3tNhf9apmHnQErNj4O",
    url: "https://buy.stripe.com/fZufZa5Ee0YC7Cn2tS0co0m",
    livePriceCents: 69900,
    billing: "month",
    monthlyCredits: 7_000,
    seats: [1, 4],
  },
  {
    kind: "tier",
    slug: "launch",
    name: "Launch",
    group: "Plans",
    period: "annual",
    productId: "prod_V0uOzvW7HMVPxL",
    priceId: "price_1U0saZ3tNhf9apmHkz8eJxmF",
    url: "https://buy.stripe.com/eVqbIU4Aa22G8Grd8w0co0n",
    livePriceCents: 754920,
    billing: "year",
    monthlyCredits: 7_000,
    seats: [1, 4],
  },
  {
    kind: "tier",
    slug: "growth",
    name: "Growth",
    group: "Plans",
    period: "monthly",
    productId: "prod_V0uOLeiSKt5Jet",
    priceId: "price_1U0sa13tNhf9apmHPeslA2QO",
    url: "https://buy.stripe.com/14AaEQ7MmdLo7Cn0lK0co0o",
    livePriceCents: 105500,
    billing: "month",
    monthlyCredits: 35_000,
    seats: [5, 15],
  },
  {
    kind: "tier",
    slug: "growth",
    name: "Growth",
    group: "Plans",
    period: "annual",
    productId: "prod_V0uOLeiSKt5Jet",
    priceId: "price_1U0sad3tNhf9apmHvaV7m8Pk",
    url: "https://buy.stripe.com/aFa8wI8Qq6iW3m78Sg0co0p",
    livePriceCents: 1139400,
    billing: "year",
    monthlyCredits: 35_000,
    seats: [5, 15],
  },
  {
    kind: "tier",
    slug: "scale",
    name: "Scale",
    group: "Plans",
    period: "monthly",
    productId: "prod_V0uO3DP9nrSkxf",
    priceId: "price_1U0sa73tNhf9apmHeb2E7Etz",
    url: "https://buy.stripe.com/aFafZa5EebDg1dZ2tS0co0q",
    livePriceCents: 221000,
    billing: "month",
    monthlyCredits: 75_000,
    seats: [16, 30],
  },
  {
    kind: "tier",
    slug: "scale",
    name: "Scale",
    group: "Plans",
    period: "annual",
    productId: "prod_V0uO3DP9nrSkxf",
    priceId: "price_1U0sai3tNhf9apmH0ctN2rA6",
    url: "https://buy.stripe.com/4gM3co5Ee8r49Kv8Sg0co0r",
    livePriceCents: 2386800,
    billing: "year",
    monthlyCredits: 75_000,
    seats: [16, 30],
  },
  {
    kind: "tier",
    slug: "enterprise",
    name: "Enterprise",
    group: "Plans",
    period: "monthly",
    productId: "prod_V0uP2nIOTFF4t2",
    priceId: "price_1U0saC3tNhf9apmHjTlqr1pV",
    url: "https://buy.stripe.com/dRm14g7MmgXAcWH1pO0co0s",
    livePriceCents: 1750000,
    billing: "month",
    note: "Scoped and quoted in production, with no public link. Minted so the seat_plan checkout path is testable.",
  },
];

/**
 * The twenty-two purchasable add-on modules, AML/CTF included.
 *
 * `lenders` is absent by design — see MOCK_EXCLUSIONS. Prices, categories and
 * bundling are read from Mission Control's `aurixa-catalog.ts`, which is the
 * source of truth for all three repos; the `livePriceCents` here is the
 * `monthlyInclGstCents` from that file.
 */
export const MOCK_MODULES: readonly MockLineItem[] = [
  // Main Dashboard
  {
    kind: "module",
    slug: "market-updates",
    name: "Market Updates",
    group: "Main Dashboard",
    productId: "prod_V0uQQ36N17iPJp",
    priceId: "price_1U0sbI3tNhf9apmHY3hY5jTc",
    url: "https://buy.stripe.com/00wcMY2s2dLoaOz7Oc0co0t",
    livePriceCents: 5900,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "commercial-industrial",
    name: "Commercial / Industrial",
    group: "Main Dashboard",
    productId: "prod_V0uQgqhFYPsmYW",
    priceId: "price_1U0sbT3tNhf9apmHdrIux9jc",
    url: "https://buy.stripe.com/6oUaEQ5Eeazc6yj2tS0co0u",
    livePriceCents: 16900,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "opportunity-marketplace",
    name: "Opportunity Marketplace",
    group: "Main Dashboard",
    productId: "prod_V0uQ81iE5p59dB",
    priceId: "price_1U0sba3tNhf9apmHnbXQlYzD",
    url: "https://buy.stripe.com/aFa8wIc2C6iW6yjecA0co0v",
    livePriceCents: 16900,
    billing: "month",
    includedIn: ["scale"],
  },

  // Reports & Analysis
  {
    kind: "module",
    slug: "intelligence-hub",
    name: "Aurixa Intelligence Hub",
    group: "Reports & Analysis",
    productId: "prod_V0uQCpxP8haBnJ",
    priceId: "price_1U0sbg3tNhf9apmHX1XOKkG8",
    url: "https://buy.stripe.com/eVq9AMd6GbDg5ufecA0co0w",
    livePriceCents: 7900,
    billing: "month",
    includedIn: [],
  },
  {
    kind: "module",
    slug: "report-comparisons",
    name: "Generated Reports: Comparisons",
    group: "Reports & Analysis",
    productId: "prod_V0uQgc5OG763He",
    priceId: "price_1U0sbn3tNhf9apmHEvsiODCE",
    url: "https://buy.stripe.com/28E4gs1nY36KcWHecA0co0x",
    livePriceCents: 9900,
    billing: "month",
    includedIn: ["growth", "scale"],
  },
  {
    kind: "module",
    slug: "cashflow-comparisons",
    name: "Cash Flow Analysis: Comparisons",
    group: "Reports & Analysis",
    productId: "prod_V0uQbwGrHvBJlU",
    priceId: "price_1U0sc33tNhf9apmH5BoqHStx",
    url: "https://buy.stripe.com/3cIdR2d6GePs1dZb0o0co0y",
    livePriceCents: 9900,
    billing: "month",
    includedIn: ["growth", "scale"],
  },

  // Client & CRM
  {
    kind: "module",
    slug: "email-copilot",
    name: "Email Copilot",
    group: "Client & CRM",
    productId: "prod_V0uRYTr6mi6GUV",
    priceId: "price_1U0scD3tNhf9apmHBLziISTo",
    url: "https://buy.stripe.com/eVqdR29UudLo6yj7Oc0co0z",
    livePriceCents: 9900,
    billing: "month",
    includedIn: [],
    note: "Unlocks client Emails, which stay off on every tier without it.",
  },
  {
    kind: "module",
    slug: "call-logs",
    name: "Call Logs",
    group: "Client & CRM",
    productId: "prod_V0uRjUs5UOgYko",
    priceId: "price_1U0scH3tNhf9apmHyWaeSeXr",
    url: "https://buy.stripe.com/5kQ5kweaK8r48Gr5G40co0A",
    livePriceCents: 22500,
    billing: "month",
    includedIn: [],
    note: "Plus a custom build price if requested.",
  },
  {
    kind: "module",
    slug: "portfolio-analysis",
    name: "Portfolio Analysis",
    group: "Client & CRM",
    productId: "prod_V0uRxNTRTKdGgE",
    priceId: "price_1U0scM3tNhf9apmHypcLmXci",
    url: "https://buy.stripe.com/8x2aEQfeOfTw4qbfgE0co0B",
    livePriceCents: 12500,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "send-portfolio",
    name: "Send Portfolio To Client",
    group: "Client & CRM",
    productId: "prod_V0uRiZDEmWZLmk",
    priceId: "price_1U0scS3tNhf9apmH3W3ln8I6",
    url: "https://buy.stripe.com/fZu7sEd6GdLo5uffgE0co0C",
    livePriceCents: 6900,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "client-forms",
    name: "Client Forms",
    group: "Client & CRM",
    productId: "prod_V0uRdBlbIce3OW",
    priceId: "price_1U0scW3tNhf9apmHZA3vYANI",
    url: "https://buy.stripe.com/28EfZa0jUfTw9Kv3xW0co0D",
    livePriceCents: 4900,
    billing: "month",
    includedIn: ["launch", "growth", "scale"],
    note: "Enabled on every tier; the price applies to standalone purchase.",
  },
  {
    kind: "module",
    slug: "borrowing-capacity",
    name: "Borrowing Capacity",
    group: "Client & CRM",
    productId: "prod_V0uRE4YYWqYQdh",
    priceId: "price_1U0scb3tNhf9apmHUNwz39xj",
    url: "https://buy.stripe.com/7sY5kw9Uu6iW9Kvb0o0co0E",
    livePriceCents: 22500,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "client-ai",
    name: "Client AI",
    group: "Client & CRM",
    productId: "prod_V0uRjz86RWzFVJ",
    priceId: "price_1U0scs3tNhf9apmHiruBXUHz",
    url: "https://buy.stripe.com/3cIbIU6IiePsf4P3xW0co0F",
    livePriceCents: 7900,
    billing: "month",
    includedIn: ["scale"],
  },

  // Operations
  {
    kind: "module",
    slug: "agreements",
    name: "Agreements",
    group: "Operations",
    productId: "prod_V0uRFL73ElKIZs",
    priceId: "price_1U0sd03tNhf9apmH2Iaph2PN",
    url: "https://buy.stripe.com/4gMbIUaYy36Ke0L8Sg0co0G",
    livePriceCents: 6900,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "marketing",
    name: "Marketing",
    group: "Operations",
    productId: "prod_V0uRGW3dntu3Lz",
    priceId: "price_1U0sd53tNhf9apmH7CpvpZHl",
    url: "https://buy.stripe.com/5kQ7sE3w67n0cWH2tS0co0H",
    livePriceCents: 17900,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "deal-pipeline",
    name: "Deal Pipeline",
    group: "Operations",
    productId: "prod_V0uSN6kw5UerUe",
    priceId: "price_1U0sdG3tNhf9apmHvcaArT0g",
    url: "https://buy.stripe.com/9B66oAfeOdLog8T0lK0co0I",
    livePriceCents: 9900,
    billing: "month",
    includedIn: ["growth", "scale"],
  },

  // AML / CTF Compliance — the $195 that separates each tier's two figures.
  {
    kind: "module",
    slug: "aml-ctf",
    name: "AML / CTF Compliance",
    group: "AML / CTF Compliance",
    productId: "prod_V0uS5hS2M8iCPR",
    priceId: "price_1U0sdJ3tNhf9apmHTUj2bMYj",
    url: "https://buy.stripe.com/bJe4gsc2C0YC8Gr5G40co0J",
    livePriceCents: 19500,
    billing: "month",
    includedIn: [],
    note: "Already contained in every tier's headline price. Needed only alongside a tier bought without it.",
  },

  // Administration
  {
    kind: "module",
    slug: "model-hub",
    name: "Model Hub",
    group: "Administration",
    productId: "prod_V0uSPpj3e5FaJQ",
    priceId: "price_1U0sdW3tNhf9apmHt0CXX5Qf",
    url: "https://buy.stripe.com/7sY8wI3w6azc4qb3xW0co0K",
    livePriceCents: 19500,
    billing: "month",
    includedIn: ["scale"],
  },
  {
    kind: "module",
    slug: "finance-portal",
    name: "Finance Portal",
    group: "Administration",
    productId: "prod_V0uSotgUu5HnRu",
    priceId: "price_1U0sdj3tNhf9apmHIIbD7mFB",
    url: "https://buy.stripe.com/7sYdR27Mmazc7CnfgE0co0L",
    livePriceCents: 22500,
    billing: "month",
    includedIn: ["scale"],
    note: "Also unlocks client Send To Finance and Finance Messages.",
  },
  {
    kind: "module",
    slug: "integrations",
    name: "Integrations",
    group: "Administration",
    productId: "prod_V0uSZx84vFOwws",
    priceId: "price_1U0sdm3tNhf9apmHc6XKOCd3",
    url: "https://buy.stripe.com/cNi6oAgiS8r4cWHfgE0co0M",
    livePriceCents: 13500,
    billing: "month",
    includedIn: [],
    note: "Subject to the client integrating their own APIs.",
  },
  {
    kind: "module",
    slug: "api-usage",
    name: "API Usage",
    group: "Administration",
    productId: "prod_V0uSmSQVJDTCFS",
    priceId: "price_1U0sdq3tNhf9apmHA9X7ZeTN",
    url: "https://buy.stripe.com/3cI00c1nYgXA5ufc4s0co0N",
    livePriceCents: 14900,
    billing: "month",
    includedIn: ["scale"],
  },

  // AI Assistant
  {
    kind: "module",
    slug: "aurixa-agent",
    name: "Aurixa Agent",
    group: "AI Assistant",
    productId: "prod_V0uSj29fwjP66F",
    priceId: "price_1U0sdu3tNhf9apmHnPducYzc",
    url: "https://buy.stripe.com/eVq5kw5EefTw4qbgkI0co0O",
    livePriceCents: 37500,
    billing: "month",
    includedIn: [],
  },
];

/**
 * The eight-rung top-up ladder. One-off prices, exactly as the live packs are —
 * a pack is bought outright, not subscribed to, and matching that matters
 * because a recurring price at the same amount is a different product as far as
 * billing is concerned.
 */
export const MOCK_PACKS: readonly MockLineItem[] = [
  {
    kind: "pack",
    slug: "topup-250",
    name: "250 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uSKr4HUkWxcW",
    priceId: "price_1U0sdx3tNhf9apmHeqTF5fmH",
    url: "https://buy.stripe.com/3cI14g3w60YC8Gr1pO0co0P",
    livePriceCents: 2090,
    billing: "one_time",
    credits: 250,
    note: "Emergency top-up",
  },
  {
    kind: "pack",
    slug: "topup-500",
    name: "500 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uSTVnNUC0i9L",
    priceId: "price_1U0se33tNhf9apmHyeel9u6R",
    url: "https://buy.stripe.com/bJe3cofeObDg7Cnd8w0co0Q",
    livePriceCents: 3850,
    billing: "one_time",
    credits: 500,
    note: "Small reporting boost",
  },
  {
    kind: "pack",
    slug: "topup-1000",
    name: "1,000 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uTC0RQ8f8JZd",
    priceId: "price_1U0se63tNhf9apmHCzVtNJam",
    url: "https://buy.stripe.com/fZu9AM4Aaazc3m79Wk0co0R",
    livePriceCents: 7150,
    billing: "one_time",
    credits: 1000,
    note: "Light additional usage",
  },
  {
    kind: "pack",
    slug: "topup-2500",
    name: "2,500 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uTxn8Nu16gJ6",
    priceId: "price_1U0se93tNhf9apmHY1KIrvCm",
    url: "https://buy.stripe.com/cNi3co3w6gXAf4P3xW0co0S",
    livePriceCents: 16390,
    billing: "one_time",
    credits: 2500,
    note: "Regular reporting top-up",
  },
  {
    kind: "pack",
    slug: "topup-5000",
    name: "5,000 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uTJrSFIZrQuM",
    priceId: "price_1U0seU3tNhf9apmHe50UpUOF",
    url: "https://buy.stripe.com/3cI4gs3w6cHk09VecA0co0T",
    livePriceCents: 30690,
    billing: "one_time",
    credits: 5000,
    note: "Most popular",
  },
  {
    kind: "pack",
    slug: "topup-7500",
    name: "7,500 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uTFo6L7vhRLK",
    priceId: "price_1U0sed3tNhf9apmHUO43Ciqh",
    url: "https://buy.stripe.com/eVq5kw3w622Gf4P9Wk0co0U",
    livePriceCents: 43890,
    billing: "one_time",
    credits: 7500,
    note: "Team reporting capacity",
  },
  {
    kind: "pack",
    slug: "topup-10000",
    name: "10,000 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uT0cz2serkGG",
    priceId: "price_1U0ser3tNhf9apmH0C4qKeAz",
    url: "https://buy.stripe.com/4gMeV6giSfTw2i39Wk0co0V",
    livePriceCents: 54890,
    billing: "one_time",
    credits: 10000,
    note: "High-volume monthly overflow",
  },
  {
    kind: "pack",
    slug: "topup-15000",
    name: "15,000 Credit Pack",
    group: "Top-up credits",
    productId: "prod_V0uTBUNRO9OUjy",
    priceId: "price_1U0sex3tNhf9apmHchtrIc4u",
    url: "https://buy.stripe.com/aFaeV60jU36KbSDgkI0co0W",
    livePriceCents: 71390,
    billing: "one_time",
    credits: 15000,
    note: "Best top-up value",
  },
];

/** The four one-off onboarding packages, matching the live `setup_packages`. */
export const MOCK_SETUPS: readonly MockLineItem[] = [
  {
    kind: "setup",
    slug: "launch-onboarding",
    name: "Launch Onboarding",
    group: "Onboarding packages",
    productId: "prod_V0uUq7X1uSCZBh",
    priceId: "price_1U0sf33tNhf9apmHLUdgOU1d",
    url: "https://buy.stripe.com/14A3cofeObDg8Gr3xW0co0X",
    livePriceCents: 300000,
    billing: "one_time",
  },
  {
    kind: "setup",
    slug: "professional-onboarding",
    name: "Professional Onboarding",
    group: "Onboarding packages",
    productId: "prod_V0uU5XZb8pIyMP",
    priceId: "price_1U0sf93tNhf9apmH52sMfJKs",
    url: "https://buy.stripe.com/4gM5kweaK7n05uf4C00co0Y",
    livePriceCents: 1000000,
    billing: "one_time",
  },
  {
    kind: "setup",
    slug: "growth-onboarding",
    name: "Growth Onboarding",
    group: "Onboarding packages",
    productId: "prod_V0uUXfXi69bUDv",
    priceId: "price_1U0sfD3tNhf9apmHTva5wJVo",
    url: "https://buy.stripe.com/28E7sE6IicHkcWHecA0co0Z",
    livePriceCents: 2500000,
    billing: "one_time",
  },
  {
    kind: "setup",
    slug: "enterprise-onboarding",
    name: "Enterprise Onboarding",
    group: "Onboarding packages",
    productId: "prod_V0uUPC36OHWrBg",
    priceId: "price_1U0sfI3tNhf9apmHp0ncMRvN",
    url: "https://buy.stripe.com/4gM9AM1nYdLo9KvfgE0co10",
    livePriceCents: 10000000,
    billing: "one_time",
  },
];

/**
 * Things in the price list that were deliberately NOT minted, and why.
 *
 * Rendered on the page rather than left implicit. A test catalogue that is
 * quietly missing an item reads as complete, and the tester then concludes the
 * gap is a bug in whatever they were testing.
 */
export const MOCK_EXCLUSIONS: readonly { slug: string; name: string; reason: string }[] = [
  {
    slug: "lenders",
    name: "Lenders",
    reason:
      "Listed for the roadmap only. Mission Control's module sync skips comingSoon modules and actively unlinks any Stripe price they acquire, so minting a mock would make the mock catalogue behave differently from the live one.",
  },
];

export const MOCK_CATALOGUE: readonly MockLineItem[] = [
  ...MOCK_TIERS,
  ...MOCK_MODULES,
  ...MOCK_PACKS,
  ...MOCK_SETUPS,
];

/** Section order on the page. Mirrors the price list's own ordering. */
export const MOCK_MODULE_GROUPS = [
  "Main Dashboard",
  "Reports & Analysis",
  "Client & CRM",
  "Operations",
  "AML / CTF Compliance",
  "Administration",
  "AI Assistant",
] as const;

/** Modules in a category, in catalogue order. */
export const modulesInGroup = (group: string): MockLineItem[] =>
  MOCK_MODULES.filter((m) => m.group === group);

/**
 * Formats cents as Australian currency.
 *
 * Local rather than imported from billing.ts on purpose: that module reads
 * `import.meta.env` at load time, and this file is pure data that its tests run
 * under plain Node.
 */
export function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "per month" / "per year" / "one-off", for a billing mode. */
export function billingLabel(billing: MockLineItem["billing"]): string {
  return billing === "month" ? "per month" : billing === "year" ? "per year" : "one-off";
}

/**
 * How much cheaper the mock is than the real thing, as a multiple.
 *
 * Shown on the page so the size of the discount is legible at a glance — the
 * Enterprise onboarding mock is a hundred-thousand-to-one, and that is worth
 * seeing next to a button that charges a real card.
 */
export function discountMultiple(item: MockLineItem): number {
  return item.livePriceCents / MOCK_PRICE_CENTS;
}
