/**
 * Posting a Builders Network access application.
 *
 * `leads.ts` next door is fire-and-forget by design: the waitlist's primary
 * capture is the Make.com webhook, and the Mission Control mirror must never
 * be able to fail a visitor's submission. This is the opposite, and it is not
 * an inconsistency — the post IS the act here. It creates the applicant's
 * organisation and sends their invitation, so the page has to wait for it and
 * has to be told what happened.
 *
 * Nothing in this module retries. An application that timed out may or may not
 * have created an organisation, and a retry that succeeds against a completed
 * first attempt collides with the address window the applicant has just spent
 * — so a failure is reported and the person decides, which is the only actor
 * here that can tell "it did not go" from "I did not hear back".
 */

const MISSION_CONTROL_URL = (
  (import.meta.env.VITE_MISSION_CONTROL_URL as string | undefined) ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");

export const BUILDER_APPLY_URL = `${MISSION_CONTROL_URL}/api/public/builders/apply`;

/**
 * The Turnstile widget this page renders, when one has been minted for it.
 *
 * A site key is public and is drawn by the browser; its twin secret lives in
 * Mission Control and is what actually decides whether a token is required.
 * So this is only ever half the control: publishing a key with no secret set
 * renders a widget nobody checks, and setting a secret with no key published
 * refuses every application. They are minted and set together.
 */
export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_BUILDER_APPLY_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";

export type BuilderApplyResult =
  | {
      readonly ok: true;
      /** `attached` means they already held an account; no link was sent. */
      readonly outcome: "provisioned" | "attached";
      readonly organisationLegalName: string;
      readonly emailSent: boolean;
    }
  | { readonly ok: false; readonly code: string };

/**
 * Submit an application.
 *
 * Never throws: every failure — a refusal, an unreachable endpoint, a body
 * that is not JSON — comes back as a code the page reads into a sentence.
 * A transport failure answers an empty code deliberately, which
 * `readApplicationRefusal` renders as the one honest sentence about a fault
 * that is ours; inventing a code like `network_error` here would be a
 * vocabulary the endpoint does not share.
 */
export async function submitBuilderApplication(
  payload: Record<string, unknown>,
): Promise<BuilderApplyResult> {
  let response: Response;
  try {
    response = await fetch(BUILDER_APPLY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, code: "" };
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // A body we cannot read is not a success, whatever the status said.
    return { ok: false, code: "" };
  }

  if (!response.ok || body.ok !== true) {
    return { ok: false, code: typeof body.error === "string" ? body.error : "" };
  }

  return {
    ok: true,
    outcome: body.outcome === "attached" ? "attached" : "provisioned",
    organisationLegalName:
      typeof body.organisation_legal_name === "string" ? body.organisation_legal_name : "",
    emailSent: body.email_sent === true,
  };
}
