/**
 * Stage 3 admission.
 *
 * The scheduling page is not public. An applicant reaches it with the
 * application reference issued at Stage 1, and the reference is checked against
 * Aurixa's own records before the page shows anything at all.
 *
 * The check is deliberately a *server* decision. A rule evaluated in the
 * browser is not a gate — the bundle ships to the visitor, who can edit it — so
 * the page asks the "Aurixa Stage 3 Access" scenario and renders the scheduler
 * only if that answers yes. The admission policy itself is not in this file
 * either. It has two halves, each checked where its truth actually lives:
 *
 *   1. The application is live — a `Stage 3 Access (Application)` formula on
 *      the Aurixa Waitlist table, which the Airtable query filters on, so a
 *      denied application is never read back, let alone returned.
 *   2. Stage 2 is finished — a Business Readiness response exists for that
 *      Application ID. This is read from the responses table directly rather
 *      than from a rollup on the waitlist, because the rollup only counts
 *      *linked* responses and the link is written by an Airtable automation.
 *      Admission would then depend on that automation having already run, and
 *      on nobody switching it off, which is not something a gate should rest
 *      on. The response row is written by the Stage 2 scenario as the
 *      questionnaire is submitted, so it is true the moment it is true.
 *
 * Failures are deliberately indistinguishable. An unknown reference, a
 * reference belonging to a declined application and a reference belonging to
 * somebody else all come back the same way, so the page can never be used to
 * discover whether a particular application exists.
 *
 * Everything here is pure or takes its `fetch` as an argument, so the rules are
 * testable without a browser; the endpoint lives in `strategicReviewAccessClient`.
 */

import { normaliseReference } from "./applicationReference";

export const DEFAULT_ACCESS_TIMEOUT_MS = 15_000;

/** Verified Stage 1 details, returned by the server — never taken from the URL. */
export type StrategicReviewApplicant = {
  applicationId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  organisationName: string;
};

/**
 * Why the page stayed locked.
 *
 * `unverified` covers every "we will not let you in" case on purpose. Only
 * `unavailable` is different, because it is not about the reference at all —
 * it means we could not reach the service, and trying again may well work.
 */
export type AccessFailure = "missing_reference" | "unverified" | "unavailable";

export type AccessDecision = {
  granted: boolean;
  applicant?: StrategicReviewApplicant;
  reason?: AccessFailure;
};

/**
 * The `unverified` message names both reasons an applicant can be turned away —
 * an unrecognised reference, and a questionnaire that is not finished — because
 * the server will not say which it was. Naming both is actionable; naming the
 * actual one would tell a stranger whether an application exists.
 */
export const ACCESS_COPY: Record<AccessFailure, string> = {
  missing_reference:
    "This page is the final stage of an Aurixa priority access application. Open it from the link in your Aurixa email, or continue with the application reference issued with your application.",
  unverified:
    "We could not open the scheduler for that application reference. Either it is not one we recognise, or the Business Readiness Questionnaire is not complete yet. The strategic review opens once it is. Check the reference against your Aurixa email, or contact the team and quote it.",
  unavailable:
    "We could not reach the Aurixa application service just now. Please try again in a moment.",
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Reads the server's verdict.
 *
 * Anything unexpected is a refusal, not an opening: a truncated body, a
 * non-object, `ok` that is merely truthy rather than `true`, or a grant whose
 * application id does not match the reference we asked about.
 */
export function parseAccessDecision(body: string, requestedReference: string): AccessDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { granted: false, reason: "unavailable" };
  }
  // An array is `typeof "object"` but is not an answer to the question asked.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { granted: false, reason: "unavailable" };
  }

  const result = parsed as Record<string, unknown>;
  if (result.ok !== true) return { granted: false, reason: "unverified" };

  const applicant = (result.applicant ?? {}) as Record<string, unknown>;
  const applicationId = normaliseReference(text(applicant.applicationId));
  // A grant has to be for the reference we asked about. If it is not, something
  // is wrong at the other end and the safe reading is "no".
  if (!applicationId || applicationId !== normaliseReference(requestedReference)) {
    return { granted: false, reason: "unverified" };
  }

  return {
    granted: true,
    applicant: {
      applicationId,
      firstName: text(applicant.firstName).trim(),
      lastName: text(applicant.lastName).trim(),
      workEmail: text(applicant.workEmail).trim(),
      organisationName: text(applicant.organisationName).trim(),
    },
  };
}

export type AccessRequestInput = {
  endpoint: string;
  reference: string;
  /** Test seam; production always uses the browser fetch implementation. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Asks the server whether this reference may open Stage 3.
 *
 * A malformed reference is refused here without a request: there is nothing to
 * check, and there is no reason to hand an obviously invalid value to a
 * scenario that costs an operation to run.
 */
export async function requestAccessDecision(input: AccessRequestInput): Promise<AccessDecision> {
  const reference = normaliseReference(input.reference);
  if (!reference) return { granted: false, reason: "missing_reference" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_ACCESS_TIMEOUT_MS);

  try {
    const response = await (input.fetchImpl ?? fetch)(input.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: reference }),
      signal: controller.signal,
      // The verdict is per-applicant and must never be served from a cache.
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) return { granted: false, reason: "unavailable" };
    return parseAccessDecision(await response.text(), reference);
  } catch {
    return { granted: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
