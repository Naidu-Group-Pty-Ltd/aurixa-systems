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

import {
  BRIEFINGS,
  BRIEFING_ROOM_PATH,
  BRIEFING_ROUTE_PATTERN,
  briefingPath,
  mediaUrl,
  publishedBriefings,
  type Briefing,
} from "./videos/catalog";
import { FREE_TRIAL_DAYS } from "./cta";

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
  /**
   * Full `<title>`. Convention: "<Page> | Aurixa Systems", except the home page.
   * For a public page, "<Page>" says what the page covers rather than repeating
   * its navigation label — "Platform" alone tells a search result nothing.
   */
  title: string;
  /**
   * Served as the meta description and the og:/twitter: description, and
   * reused verbatim in `llms.txt`. Written from what the page actually says:
   * a claim the page does not make has no business in a search snippet.
   */
  description: string;
  /**
   * `false` means: keep out of the sitemap, emit `noindex, nofollow` on the
   * page, and carry an `X-Robots-Tag` header in `vercel.json`. Every unlisted
   * entry below records *why* it is unlisted, because the reason is the thing
   * that would otherwise be forgotten.
   */
  indexable: boolean;
  /**
   * Recorded for reference only: the generator does not emit it, because
   * Google documents `<changefreq>` as ignored.
   */
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  /**
   * Sitemap `<priority>`, 0.0–1.0. A relative hint between this site's own
   * pages, not a ranking signal — Google ignores it. Not emitted for
   * non-indexable routes, which are never in the sitemap at all.
   */
  priority?: number;
  /**
   * Social card for this page: a path under `public/`, or an absolute `https:`
   * URL for media held in storage. Must be 1200×630, the size `index.html`
   * declares. Defaults to the sitewide card.
   */
  ogImage?: string;
  /** `og:type`. Defaults to `"website"`. */
  ogType?: string;
};

/**
 * One route per watchable briefing, generated from the catalogue so a video
 * becomes a page — prerendered, in the sitemap, with its own card — the moment
 * its entry is published, and stops being one if it is withdrawn. A premiering
 * entry has no page at all, so there is nothing thin for a crawler to index.
 *
 * The title carries "Video Briefing" so it can never collide with the page the
 * video explains ("AML/CTF Compliance Passport | Aurixa Systems"). It follows
 * an en dash rather than a colon, because briefing titles have colons of their
 * own ("Aurixa Voice: AI Voice Agents").
 */
export function briefingRoutes(list: Briefing[] = BRIEFINGS): RouteMetadata[] {
  return publishedBriefings(list).map((briefing) => ({
    path: briefingPath(briefing.slug),
    title: `${briefing.title} – Video Briefing | Aurixa Systems`,
    description: briefing.summary,
    indexable: true,
    changefreq: "monthly",
    priority: 0.6,
    ogImage: mediaUrl(briefing.media.card),
    ogType: "video.other",
  }));
}

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
    title: "Property Intelligence & Financial Modelling Platform | Aurixa Systems",
    description:
      "For Australian property and finance firms: borrowing capacity and serviceability, 10-year cash flow modelling, white-label client reports, suburb snapshots and AI voice agents.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/solutions",
    title: "Solutions for Property Advisory Firms | Aurixa Systems",
    description:
      "How property advisory and finance firms use Aurixa to win clients with serviceability modelling, keep strategies within APRA buffers and scale client reporting.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/industries",
    title: "Industries: Buyers Agents, Advisory & Finance Firms | Aurixa Systems",
    description:
      "Aurixa serves buyers agents, wealth advisors, property advisory firms, real estate agencies, mortgage and finance businesses, investment groups, developers and enterprise networks.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/builders",
    title: "Builders Network: Publish Stock to Advisory Firms | Aurixa Systems",
    description:
      "The Aurixa Builders Network: builders and developers publish stock once and reach the advisory firms placing clients into it, with connections granted one firm at a time.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/builders/apply",
    title: "Apply for Builders Network Access | Aurixa Systems",
    description:
      "Builders, developers and sales representatives apply for access to the Aurixa Builders Network. We set up your organisation and email your access link.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/about",
    title: "About Us: Built From Inside Property & Finance | Aurixa Systems",
    description:
      "Who built Aurixa Systems and why: property professionals and quantitative engineers, the principles behind the platform, and the data sovereignty framework protecting client data.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/resources",
    title: "Platform Module Library | Aurixa Systems",
    description:
      "Every module in the Aurixa platform: workflow and deal flow, borrowing capacity and cash flow, property and scenario analysis, white-label reports, client portals and governance.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.6,
  },
  {
    path: "/docs",
    title: "Command Center Documentation | Aurixa Systems",
    description:
      "Command Center documentation: client management, borrowing capacity, portfolio analysis, deal pipeline, agreements, voice and reporting. Full articles unlock with your entitlement.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.7,
  },
  {
    path: "/contact",
    title: `Start Your ${FREE_TRIAL_DAYS}-Day Free Trial | Aurixa Systems`,
    description:
      `Apply for a ${FREE_TRIAL_DAYS}-day free trial of Aurixa Systems. Tell us about your organisation and what you most want to improve. The team reviews every application and provisions your own workspace, and the trial starts the day it goes live.`,
    indexable: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/compliance",
    title: "Compliance, Security & AML/CTF Governance | Aurixa Systems",
    description:
      "How Aurixa supports compliance operations: encrypted infrastructure, AML/CTF and customer due diligence workflows, information governance and clearly shared responsibilities.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/compliance-passport",
    title: "AML/CTF Compliance Passport | Aurixa Systems",
    description:
      "A guided AML/CTF journey for property transactions: identity verification, documents, screening, ownership, source of funds and review, recorded in one Compliance Passport.",
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
  {
    path: BRIEFING_ROOM_PATH,
    title: "Briefing Room: Aurixa Explainer Videos | Aurixa Systems",
    description:
      "The Aurixa Briefing Room: short videos on the platform, streamed from Aurixa itself. An introduction to Aurixa Systems, the AML/CTF Compliance Passport, and borrowing capacity in moments.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.7,
  },
  ...briefingRoutes(),

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
      "Secure Stage 2 readiness questionnaire for Aurixa Systems free trial applicants. Accessible by invitation only.",
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

/**
 * Routes declared in `App.tsx` with a parameter, and the concrete paths each
 * one serves. The registry, the prerender pass and the sitemap all work on
 * concrete paths; this is what lets `routeMetadata.test.ts` hold a
 * parameterised `<Route>` to the same rule as every other — each path it can
 * serve must be registered — instead of exempting it. A parameterised route
 * missing from this table fails that test.
 */
export const PARAMETERISED_ROUTES: Record<string, () => string[]> = {
  [BRIEFING_ROUTE_PATTERN]: () => briefingRoutes().map((entry) => entry.path),
};

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

/**
 * The absolute `og:image` / `twitter:image` URL for a page. Shared by the
 * prerender pass and `usePageMetadata`, so the served bytes and the live page
 * cannot name different cards.
 */
export function ogImageUrl(ogImage: string = DEFAULT_OG_IMAGE): string {
  if (/^https?:\/\//i.test(ogImage)) return ogImage;
  return `${absoluteUrl("/")}${ogImage.replace(/^\//, "")}`;
}
