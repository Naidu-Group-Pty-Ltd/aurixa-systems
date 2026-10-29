/**
 * Asking Mission Control who a questionnaire link is for.
 *
 * Mission Control sends the Stage 1 "application received" email now, and its
 * questionnaire link names the application and carries a token it minted:
 *
 *   /questionnaire?ref=AX-7Q2M4L9XZ1&token=…&expires=…
 *
 * Unlike the shape-checked link in `questionnaireLinkAccess.ts`, this one can
 * be *verified*: Mission Control kept the token's SHA-256 when it sent the
 * email, so `POST /api/public/storefront/questionnaire-access` can say whether
 * the link is live and, if it is, who the applicant is — the details they gave
 * at Stage 1, so the questionnaire is addressed to them and its submission
 * names them. The same endpoint answers the "Continue with your Application ID"
 * form, with the reference and the work email in place of the token.
 *
 * Everything here is pure so the rules can be tested without a browser; the
 * fetch lives in `missionControlQuestionnaireAccessClient.ts`.
 */

import { normaliseReference } from "./applicationReference";
import type { ReadinessPrefill } from "./readinessQuestionnaireService";

export const QUESTIONNAIRE_ACCESS_PATH = "/api/public/storefront/questionnaire-access";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

/** A link Mission Control minted: a valid reference and exactly one token. */
export type MissionControlLink = { applicationId: string; token: string };

/**
 * Reads a Mission Control questionnaire link, or null for anything else — a
 * Make link (a token with no reference), a bare `?ref=` resume link, or a link
 * whose reference is not one. A malformed token is still returned: Mission
 * Control answers it as `invalid_token`, and the page offers the reference form.
 */
export function readMissionControlLink(url: URL | { searchParams: URLSearchParams }): MissionControlLink | null {
  const references = [...url.searchParams.getAll("ref"), ...url.searchParams.getAll("reference")];
  const tokens = url.searchParams.getAll("token");
  if (references.length !== 1 || tokens.length !== 1) return null;
  const applicationId = normaliseReference(references[0]);
  if (!applicationId) return null;
  return { applicationId, token: tokens[0] };
}

/** Whether a token is worth sending at all. */
export const isTokenShaped = (token: string) => TOKEN_PATTERN.test(token);

/**
 * Whether the link is well formed — a token-shaped token and one future
 * `expires` — which is all the website could ever say about a link before
 * Mission Control could be asked. It decides what happens when Mission Control
 * cannot be reached. Unlike `resolveQuestionnaireLink` it writes nothing: a
 * stored link session would later reopen the page anonymously.
 */
export function isWellFormedLink(
  link: MissionControlLink,
  url: URL | { searchParams: URLSearchParams },
  now = Date.now(),
): boolean {
  const expiries = url.searchParams.getAll("expires");
  if (expiries.length !== 1) return false;
  const expiresAt = Date.parse(expiries[0]);
  return isTokenShaped(link.token) && Number.isFinite(expiresAt) && expiresAt > now;
}

export type QuestionnaireAccessFailure =
  | "invalid_reference"
  | "invalid_token"
  | "expired"
  | "already_completed"
  | "throttled"
  | "unavailable";

/**
 * Optional fields rather than a discriminated union, as elsewhere in this
 * project: it compiles without `strictNullChecks`, where narrowing on a boolean
 * discriminant is unreliable.
 */
export type QuestionnaireAccessResult = {
  ok: boolean;
  prefill?: ReadinessPrefill;
  via?: "link" | "reference";
  reason?: QuestionnaireAccessFailure;
  applicationId?: string;
  completedAt?: string;
};

const REFUSALS: QuestionnaireAccessFailure[] = [
  "invalid_reference",
  "invalid_token",
  "expired",
  "already_completed",
];

const PREFILL_KEYS: (keyof ReadinessPrefill)[] = [
  "applicationId",
  "firstName",
  "lastName",
  "workEmail",
  "organisationName",
  "role",
  "organisationType",
  "annualVolume",
];

const text = (value: unknown, max = 320) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Turns Mission Control's answer into what the page acts on.
 *
 * Only an answer that names the whole applicant opens the questionnaire: a
 * missing email is what made the old anonymous submissions unattributable, so
 * an answer without one is treated as no answer. Anything Mission Control did
 * not say in so many words — a 5xx, a body that is not the contract, a network
 * failure upstream — is `unavailable`, never a refusal, so a blip is not read as
 * "that link is not yours".
 */
export function interpretQuestionnaireAccess(status: number, body: unknown): QuestionnaireAccessResult {
  if (status === 429) return { ok: false, reason: "throttled" };
  if (status >= 500 || !body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "unavailable" };
  }
  const answer = body as Record<string, unknown>;

  if (answer.ok === true) {
    const raw = answer.applicant;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "unavailable" };
    const applicant = raw as Record<string, unknown>;
    const prefill = Object.fromEntries(PREFILL_KEYS.map((key) => [key, text(applicant[key])])) as ReadinessPrefill;
    prefill.applicationId = normaliseReference(prefill.applicationId);
    if (!prefill.applicationId || !prefill.workEmail.includes("@")) return { ok: false, reason: "unavailable" };
    return { ok: true, prefill, via: answer.via === "reference" ? "reference" : "link" };
  }

  if (answer.ok === false && REFUSALS.includes(answer.reason as QuestionnaireAccessFailure)) {
    const applicationId = normaliseReference(text(answer.applicationId, 20));
    const completedAt = text(answer.completedAt, 40);
    return {
      ok: false,
      reason: answer.reason as QuestionnaireAccessFailure,
      ...(applicationId ? { applicationId } : {}),
      ...(completedAt ? { completedAt } : {}),
    };
  }
  if (answer.error === "rate_limited") return { ok: false, reason: "throttled" };
  return { ok: false, reason: "unavailable" };
}

// ── Remembering a verified way in ───────────────────────────────────────────
//
// A verified link opens the questionnaire through the same-tab handoff record
// (`readinessHandoff.ts`), so a refresh keeps the applicant in. This marker
// remembers that the handoff came from Mission Control's check rather than
// from Stage 1 in this tab, so the submission still says how they got in and
// that it was verified.

export const VERIFIED_ACCESS_STORAGE_KEY = "aurixa_questionnaire_verified";

export function rememberVerifiedAccess(applicationId: string, via: "link" | "reference"): void {
  try {
    window.sessionStorage.setItem(VERIFIED_ACCESS_STORAGE_KEY, JSON.stringify({ applicationId, via }));
  } catch {
    // Storage may be disabled. The open page is unaffected; a refresh asks again.
  }
}

/** How this application's handoff was verified, or null when it was not. */
export function readVerifiedAccess(applicationId: string): "link" | "reference" | null {
  try {
    const stored = window.sessionStorage.getItem(VERIFIED_ACCESS_STORAGE_KEY);
    if (stored === null) return null;
    const value = JSON.parse(stored) as { applicationId?: unknown; via?: unknown };
    if (value?.applicationId === applicationId && (value.via === "link" || value.via === "reference")) {
      return value.via;
    }
  } catch {
    // Fall through: an unreadable marker is no marker.
  }
  clearVerifiedAccess();
  return null;
}

export function clearVerifiedAccess(): void {
  try {
    window.sessionStorage.removeItem(VERIFIED_ACCESS_STORAGE_KEY);
  } catch {
    // Nothing to remove.
  }
}
