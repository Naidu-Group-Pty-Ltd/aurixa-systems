/**
 * Trial offers on the website: a link carrying `?trial=CODE` opens the free
 * trial application with a custom trial length that Aurixa's team set up in
 * Mission Control (Billing → Payment Gates → Trial offers).
 *
 * This module is the pure half: reading the code from a URL and making sense
 * of Mission Control's answer. It reads no environment, so the node test
 * runner can import it; `trialOfferClient.ts` does the fetching.
 *
 * Mission Control decides whether an offer is live. The page only ever shows
 * a length Mission Control confirmed, and anything else (an unknown code, an
 * offer that ended, Mission Control unreachable) leaves the visitor on the
 * standard trial, which is always true.
 */

/** Mission Control's own rule: `trial_offers_code_shape`. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

/** The `?trial=` code in a URL's query string, normalised as Mission Control stores it. */
export function trialCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("trial");
  if (!raw) return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "-");
  return CODE_PATTERN.test(code) ? code : null;
}

export type TrialOffer = { code: string; label: string; trialDays: number };

export type TrialOfferLookup =
  | { status: "accepted"; offer: TrialOffer }
  | { status: "unknown" | "retired" | "expired" | "unavailable" };

/**
 * Interpret `GET /api/public/storefront/trial-offer`. An answer that does not
 * look exactly like an accepted offer is treated as no offer: a length is only
 * ever shown when Mission Control stated it in full.
 */
export function interpretTrialOfferResponse(status: number, body: unknown): TrialOfferLookup {
  if (status !== 200 || typeof body !== "object" || body === null) {
    return { status: "unavailable" };
  }
  const answer = body as {
    ok?: unknown;
    reason?: unknown;
    offer?: { code?: unknown; label?: unknown; trial_days?: unknown };
  };
  if (answer.ok === true && answer.offer) {
    const { code, label, trial_days } = answer.offer;
    if (
      typeof code === "string" &&
      CODE_PATTERN.test(code) &&
      typeof label === "string" &&
      label.trim().length > 0 &&
      typeof trial_days === "number" &&
      Number.isInteger(trial_days) &&
      trial_days >= 1 &&
      trial_days <= 365
    ) {
      return { status: "accepted", offer: { code, label: label.trim(), trialDays: trial_days } };
    }
    return { status: "unavailable" };
  }
  if (answer.reason === "retired" || answer.reason === "expired" || answer.reason === "unknown") {
    return { status: answer.reason };
  }
  return { status: "unavailable" };
}

/**
 * What the page says when a code was in the link but no offer applies. Null
 * when there is nothing to say: Mission Control being unreachable is not the
 * visitor's problem to read about, and the standard trial still holds.
 */
export function trialOfferNotice(lookup: TrialOfferLookup, standardTrial: string): string | null {
  switch (lookup.status) {
    case "expired":
    case "retired":
      return `That trial offer has ended, so this application is for our standard ${standardTrial}.`;
    case "unknown":
      return `That trial offer code was not recognised, so this application is for our standard ${standardTrial}.`;
    default:
      return null;
  }
}
