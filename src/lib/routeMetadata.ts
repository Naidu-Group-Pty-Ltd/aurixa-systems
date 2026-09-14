/**
 * The one place that decides what each route is called, how it is described,
 * and — the part that matters commercially — whether a search engine is allowed
 * to know it exists.
 *
 * Several routes on this site are deliberately unlisted rather than merely
 * unlinked: `/pricing-mock` drives A$1 fixtures against the LIVE Stripe account,
 * `/questionnaire` is reached only through a secure single-use link, and the
 * `/pricing/*` receipts carry a handoff token in the URL. Indexing any of them
 * would be a real incident, not an SEO regression.
 *
 * Three separate mechanisms have to agree about that split — the sitemap, the
 * per-page `robots` directive, and the `X-Robots-Tag` headers in `vercel.json`.
 * Keeping the decision in one table is what stops them drifting apart; a route
 * added to `App.tsx` without an entry here fails `routeMetadata.test.ts` rather
 * than quietly defaulting to indexable.
 */

/** Canonical origin. The apex 307s to `www`, so `www` is the real home. */
export const SITE_ORIGIN = "https://www.aurixasystems.com.au";

/** Sitewide fallbacks, also inlined in `index.html` for the pre-hydration paint. */
export const SITE_NAME = "Aurixa Systems";
export const DEFAULT_TITLE = "Aurixa Systems";
export const DEFAULT_DESCRIPTION =
  "Aurixa Systems builds governed AI operating systems for Australian property, finance and advisory firms: client intelligence, financial modelling, voice agents and compliance oversight in one controlled platform.";
export const DEFAULT_OG_IMAGE = "/brand/og-default.png";

export type RouteMetadata = {
  /** Must match the `path` on the corresponding `<Route>` in `App.tsx`. */
  path: string;
  /** Full `<title>`. Convention: "<Page> | Aurixa Systems", except the home page. */
  title: string;
  description: string;
  /**
   * `false` means: keep out of the sitemap, emit `noindex, nofollow` on the
   * page, and carry an `X-Robots-Tag` header in `vercel.json`. Every unlisted
   * entry below records *why* it is unlisted, because the reason is the thing
   * that would otherwise be forgotten.
   */
  indexable: boolean;
  /** Sitemap hint. Ignored entirely for non-indexable routes. */
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  /** Sitemap hint, 0.0–1.0. Ignored entirely for non-indexable routes. */
  priority?: number;
};

export const ROUTE_METADATA: RouteMetadata[] = [
  {
    path: "/",
    title: "Aurixa Systems: Governed AI Operating Systems for Property & Finance",
    description: DEFAULT_DESCRIPTION,
    indexable: true,
    changefreq: "weekly",
    priority: 1.0,
  },
  {
    path: "/platform",
    title: "Platform | Aurixa Systems",
    description:
      "The Aurixa platform: client management, borrowing capacity, portfolio analysis, deal pipeline, voice agents and governance oversight, delivered as one operating system rather than a stack of tools.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/solutions",
    title: "Solutions | Aurixa Systems",
    description:
      "How Aurixa is applied: strategic intelligence, financial modelling, client operations and enterprise governance, configured to the way your firm already works.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/industries",
    title: "Industries | Aurixa Systems",
    description:
      "Aurixa serves buyer's agents, property advisory, mortgage and finance, development, accounting and SMSF, conveyancing and multi-service groups across Australia.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/builders",
    title: "For Builders & Developers | Aurixa Systems",
    description:
      "The Aurixa Builders Network: builders and developers publish stock once and reach the advisory firms placing clients into it, with connections granted one firm at a time.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/about",
    title: "About | Aurixa Systems",
    description:
      "Who Aurixa Systems is, how the platform is architected, and the governance principles behind an AI operating system built for regulated Australian firms.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/resources",
    title: "Resources | Aurixa Systems",
    description:
      "Guidance, frameworks and reference material on operating governed AI systems inside Australian property and finance businesses.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.6,
  },
  {
    path: "/docs",
    title: "Documentation | Aurixa Systems",
    description:
      "Command Center documentation: client management, borrowing capacity, portfolio analysis, deal pipeline, agreements, voice and reporting. Full articles unlock with your entitlement.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.7,
  },
  {
    path: "/contact",
    title: "Priority Access Application | Aurixa Systems",
    description:
      "Apply for priority access to Aurixa Systems. Tell us about your organisation and what you most want to improve, and the team will review your application.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/compliance",
    title: "Compliance | Aurixa Systems",
    description:
      "Aurixa's approach to security, hosting, data residency, privacy obligations and AML/CTF support for Australian regulated firms.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/compliance-passport",
    title: "AML/CTF Compliance Passport | Aurixa Systems",
    description:
      "The Aurixa Systems AML/CTF Compliance Passport brings identity verification, documents, screening, ownership, source of funds and review into one clear, guided journey, connecting clients, your team and authorised property professionals from onboarding through to transaction completion.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Aurixa Systems",
    description:
      "How Aurixa Systems collects, uses, discloses and retains personal information, and how to exercise your privacy rights under Australian privacy law.",
    indexable: true,
    changefreq: "yearly",
    priority: 0.4,
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions | Aurixa Systems",
    description:
      "The terms governing access to and use of Aurixa Systems, including service scope, obligations, liability and termination.",
    indexable: true,
    changefreq: "yearly",
    priority: 0.4,
  },
  {
    path: "/status",
    title: "System Status | Aurixa Systems",
    description:
      "Live health of the upstream services Aurixa Systems is built on, shown by provider role rather than by vendor, with 30 days of history per service. Auto-refreshes every minute.",
    indexable: true,
    changefreq: "daily",
    priority: 0.5,
  },

  // ── Unlisted from here down. Reachable by direct URL or by token only. ─────

  {
    // The full storefront. Unlinked from navigation by design (see the Revision 3
    // note in docs/user-tracking-pricing-workflow-plan.md); purchases require a
    // handoff token, so an indexed copy would only ever be the browse-only shell.
    path: "/pricing",
    title: "Pricing | Aurixa Systems",
    description: "Aurixa Systems plans, modules and credit packs.",
    indexable: false,
  },
  {
    // Stripe redirect target. The URL carries `session_id` and the handoff token.
    path: "/pricing/success",
    title: "Purchase Complete | Aurixa Systems",
    description: "Your Aurixa Systems purchase receipt.",
    indexable: false,
  },
  {
    path: "/pricing/cancel",
    title: "Checkout Cancelled | Aurixa Systems",
    description: "Your Aurixa Systems checkout was cancelled.",
    indexable: false,
  },
  {
    path: "/pricing/card-saved",
    title: "Card Saved | Aurixa Systems",
    description: "Your payment method has been saved.",
    indexable: false,
  },
  {
    // A$1 fixtures in the LIVE Stripe account. Indexing this would put a page
    // that charges real cards into search results. See docs/pricing-mock.md.
    path: "/pricing-mock",
    title: "Stripe Test Catalogue | Aurixa Systems",
    description: "Internal A$1 Stripe fixture catalogue.",
    indexable: false,
  },
  {
    // Stage 2. Secure single-use token, or the two-hour same-tab Stage 1 handoff.
    path: "/questionnaire",
    title: "Business Readiness Questionnaire | Aurixa Systems",
    description:
      "Secure Stage 2 readiness questionnaire for Aurixa Systems Priority Access applicants. Accessible by invitation only.",
    indexable: false,
  },
  {
    // Stage 3. Reached from the Stage 2 completion screen.
    path: "/schedule-strategic-review",
    title: "Schedule Your Strategic Review | Aurixa Systems",
    description:
      "Stage 03 of the Aurixa Systems application: select a time for your strategic review with the Aurixa team.",
    indexable: false,
  },
  {
    // Customer feedback form, opened with a credential from the Command Center.
    path: "/feedback",
    title: "Feedback | Aurixa Systems",
    description: "Tell the Aurixa Systems team how the platform is working for you.",
    indexable: false,
  },
  {
    // Support Portal. Arrived at from a customer dashboard with workspace
    // context in the query string, so an indexed copy would only ever be the
    // empty form — and the context-bearing URLs have no business in a SERP.
    path: "/support",
    title: "Support Portal | Aurixa Systems",
    description:
      "Raise a support ticket with the Aurixa Systems team. Tickets go straight to Mission Control, are classified by severity, and eligible issues are remediated automatically.",
    indexable: false,
  },
];

const BY_PATH = new Map(ROUTE_METADATA.map((entry) => [entry.path, entry]));

/** Lookup by exact route path. Returns `undefined` for unknown paths (e.g. 404). */
export function routeMetadata(path: string): RouteMetadata | undefined {
  return BY_PATH.get(path);
}

/** The sitemap's contents, and the allowlist `robots.txt` is written against. */
export function indexableRoutes(): RouteMetadata[] {
  return ROUTE_METADATA.filter((entry) => entry.indexable);
}

/** The paths that must carry `noindex` — in the page, and in the response headers. */
export function unlistedPaths(): string[] {
  return ROUTE_METADATA.filter((entry) => !entry.indexable).map((entry) => entry.path);
}

/** Absolute URL for a route path, for canonical tags and the sitemap. */
export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}
