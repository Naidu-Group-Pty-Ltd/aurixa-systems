/**
 * The free trial: the one offer every call to action on the site makes.
 *
 * Single source for trial CTA copy. Every "14-day" the site shows is derived
 * from `FREE_TRIAL_DAYS`, so a change to the trial length is one edit here
 * (the build regenerates `public/llms.txt`, which quotes it too).
 * `cta.test.ts` fails on a trial length typed out anywhere else.
 *
 * What the copy may promise is bounded by how the trial actually runs:
 *
 *   1. A prospect applies on `/contact` (Stage 1). The Business Readiness
 *      Questionnaire and strategic review follow, unchanged.
 *   2. The Aurixa team reviews every application and provisions the
 *      customer's own workspace.
 *   3. The trial runs for `FREE_TRIAL_DAYS` days from the day that workspace
 *      goes live, and the plan can be activated at any time during it.
 *
 * So nothing here, or built from it, may say "instant access", "self-serve"
 * or "no credit card required": the process supports none of them.
 *
 * Kept free of `import.meta.env` so the node test runner can import it.
 */

export const FREE_TRIAL_DAYS = 14;

/** "14-day free trial", for running text. */
export const FREE_TRIAL = `${FREE_TRIAL_DAYS}-day free trial`;

/** Every trial call to action: where it goes and what it says. */
export const TRIAL_CTA = {
  to: "/contact",
  label: "Start your free trial",
  /** For tight spots: the desktop navigation and the pricing cards. */
  shortLabel: "Start free trial",
} as const;

/** One line beneath a primary call to action. */
export const TRIAL_NOTE = `${FREE_TRIAL} · Every application is reviewed by the Aurixa team`;

/** When the clock starts, and what the customer can do before it stops. */
export const TRIAL_TERMS = `Your ${FREE_TRIAL_DAYS}-day trial starts the day your workspace goes live, and you can activate your plan at any time during it.`;

/**
 * The closing panel on Platform and Solutions, which used to sell scarcity.
 * Same shape as before: a badge, a heading of the page's own and three
 * paragraphs.
 */
export const TRIAL_PANEL = {
  badge: FREE_TRIAL,
  paragraphs: [
    `Every new Aurixa workspace starts with a ${FREE_TRIAL}, so you can judge the platform on your own workflows and your own clients rather than on a presentation.`,
    "Apply through a short application. The Aurixa team reviews every application and provisions your firm's own workspace.",
    `${TRIAL_TERMS} Your business. Your experience. Your decision.`,
  ],
} as const;
