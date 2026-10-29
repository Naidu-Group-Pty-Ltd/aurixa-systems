// The Command Center documentation corpus, and the entitlement gate over it.
//
// Server-only. The bodies must not reach a browser that has not been shown to
// be entitled to them, which is why this is not importable from src/.

import type { DocsSection } from "./docsTypes.ts";
import { FOUNDATION_SECTIONS } from "./docsCorpus.foundations.ts";
import { CLIENT_SECTIONS } from "./docsCorpus.clients.ts";
import { PLATFORM_SECTIONS } from "./docsCorpus.platform.ts";

export { DOCS_GROUPS } from "./docsTypes.ts";
export type { DocsSection, DocsBlock } from "./docsTypes.ts";

export const DOCS_SECTIONS: DocsSection[] = [
  ...FOUNDATION_SECTIONS,
  ...CLIENT_SECTIONS,
  ...PLATFORM_SECTIONS,
];

/**
 * Which tiers include each priced module.
 *
 * Mirrors MODULE_TIERS in the Command Center's planEntitlements.ts, which is
 * itself generated from the signed-off pricing sheet. An empty list means the
 * module is sold separately as an add-on and no tier includes it.
 *
 * Duplicated rather than imported because the two live in different repositories
 * and different runtimes. A drift test asserts every moduleSlug in the corpus
 * appears here, so a section can never reference a module the gate does not know
 * — that would make it fall through as "not priced" and be shown to everyone.
 * Another pins each row to the price list's own inclusions
 * (`src/lib/pricing/mockCatalog.ts`): Market Updates read Growth and above here
 * for weeks after the price list moved it to Scale alone.
 */
export const MODULE_TIERS: Record<string, readonly string[]> = {
  "market-updates": ["scale"],
  "commercial-industrial": ["scale"],
  "opportunity-marketplace": ["scale"],
  "intelligence-hub": [],
  "report-comparisons": ["growth", "scale"],
  "cashflow-comparisons": ["growth", "scale"],
  "email-copilot": [],
  "call-logs": [],
  "portfolio-analysis": ["scale"],
  "send-portfolio": ["scale"],
  "client-forms": ["launch", "growth", "scale"],
  "borrowing-capacity": ["scale"],
  lenders: [],
  "client-ai": ["scale"],
  agreements: ["scale"],
  marketing: ["scale"],
  "deal-pipeline": ["growth", "scale"],
  "aml-ctf": ["launch", "growth", "scale"],
  "model-hub": ["scale"],
  "finance-portal": ["scale"],
  integrations: [],
  "api-usage": ["scale"],
  "aurixa-agent": [],
  // Each partner portal is its own purchase, in no tier: the Solicitor Portal
  // by D17, the Accountant Portal by the owner's decision of 29 Oct 2026, and
  // the Builder / Developer Portal, which is sold directly.
  "solicitor-portal": [],
  "accountant-portal": [],
  "builder-developer-portal": [],
};

const KNOWN_PLANS: readonly string[] = ["launch", "growth", "scale"];

export function isKnownPlan(planSlug: string | null | undefined): boolean {
  return !!planSlug && KNOWN_PLANS.includes(planSlug);
}

export type Viewer = {
  /** Plan slug resolved from the handoff, or null for an anonymous visitor. */
  planSlug: string | null;
  /** Add-on slugs held. Empty for anonymous. */
  addonSlugs: readonly string[];
  /** True once a handoff resolved — i.e. this is a real customer, not a visitor. */
  identified: boolean;
};

export const ANONYMOUS: Viewer = { planSlug: null, addonSlugs: [], identified: false };

/**
 * Whether a viewer may read a section's body.
 *
 * The asymmetry here is deliberate and is the opposite of the in-app guide's.
 *
 * Inside the Command Center, an unknown plan opens the gate: the viewer is a
 * signed-in customer, and denying them over a failed plan lookup would strip
 * features they pay for. On a public marketing site the same rule would hand
 * every module's documentation to anyone who visits the URL without a token,
 * which is precisely what the gate exists to prevent. So here an unidentified
 * viewer gets nothing gated, and only a resolved handoff opens anything.
 *
 * A customer whose plan we resolved but whose slug we do not recognise
 * (enterprise, a bespoke arrangement) is treated the in-app way — open — because
 * at that point we do know they are a paying customer.
 */
export function canReadSection(section: DocsSection, viewer: Viewer): boolean {
  // Universal sections are readable by anyone, including anonymous visitors.
  if (!section.moduleSlug) return true;

  // Gated section, unidentified viewer: never.
  if (!viewer.identified) return false;

  // Identified but on a plan outside the matrix — treat as entitled.
  if (!isKnownPlan(viewer.planSlug)) return true;

  const tiers = MODULE_TIERS[section.moduleSlug];
  // Unknown module slug: fail CLOSED here. In-app the equivalent falls open
  // because an unmapped key means "not a priced feature", but a typo in this
  // corpus must not silently publish a paid module's documentation.
  if (!tiers) return false;

  // A purchased add-on grants the module whatever the tier says.
  if (viewer.addonSlugs.includes(section.moduleSlug)) return true;

  // Sold separately and not purchased.
  if (tiers.length === 0) return false;

  return tiers.includes(viewer.planSlug as string);
}

/** The lowest tier that would unlock a section, for the upgrade prompt. */
export function unlockedBy(section: DocsSection): string | null {
  if (!section.moduleSlug) return null;
  const tiers = MODULE_TIERS[section.moduleSlug];
  if (!tiers || tiers.length === 0) return null; // add-on only
  for (const plan of KNOWN_PLANS) {
    if (tiers.includes(plan)) return plan;
  }
  return null;
}

export type DeliveredSection =
  | (DocsSection & { locked: false })
  | (Pick<DocsSection, "slug" | "title" | "summary" | "group" | "moduleSlug" | "readMinutes"> & {
      locked: true;
      /** Tier that unlocks it, or null when it is an add-on purchase. */
      unlockedBy: string | null;
      blocks: [];
    });

/**
 * Build the payload for a viewer.
 *
 * Locked sections keep their title and one-line summary — the same information
 * the public index already carries, so this reveals nothing new — and lose their
 * blocks entirely. The body is never serialised for a section the viewer cannot
 * read, which is what makes the gate real rather than a CSS class.
 */
export function deliverFor(viewer: Viewer): DeliveredSection[] {
  return DOCS_SECTIONS.map((section) => {
    if (canReadSection(section, viewer)) {
      return { ...section, locked: false as const };
    }
    return {
      slug: section.slug,
      title: section.title,
      summary: section.summary,
      group: section.group,
      moduleSlug: section.moduleSlug,
      readMinutes: section.readMinutes,
      locked: true as const,
      unlockedBy: unlockedBy(section),
      blocks: [] as [],
    };
  });
}
