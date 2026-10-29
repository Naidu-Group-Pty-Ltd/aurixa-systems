/**
 * Mission Control lead-capture client.
 *
 * Mission Control is where an application lands: `/api/public/leads/capture`
 * records each stage, and raises the emails the applicant and the team are
 * owed. The applicant's result reflects Mission Control's answer at every
 * stage. The Make.com webhooks this site used to submit to first lived in the
 * EU Make account, which is deprecated — on 29 Oct 2026 they answered every
 * request `200 Accepted` and ran nothing — so the site no longer calls them.
 *
 * Aurixa's own `capture-lead` function still receives a copy, fire-and-forget,
 * after Mission Control has accepted: a failure there never reaches the
 * applicant.
 *
 * Mission Control dedupes on the application reference and on
 * (corporateEmail + submittedAt), so a retried delivery lands exactly once.
 */

/** Mission Control's origin, for everything this site asks of it. */
export const MISSION_CONTROL_URL = (
  (import.meta.env.VITE_MISSION_CONTROL_URL as string | undefined) ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");

export const MISSION_CONTROL_LEAD_CAPTURE_URL = `${MISSION_CONTROL_URL}/api/public/leads/capture`;

// Aurixa's own backend (Supabase functions): `capture-lead` keeps a copy of
// every stage, after Mission Control has accepted it.
export const STOREFRONT_BASE = (() => {
  const explicit = import.meta.env.VITE_STOREFRONT_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  return "https://moeyytuduycrvvncdtme.supabase.co/functions/v1";
})();

function fireAndForget(url: string, payload: Record<string, unknown>, label: string): void {
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Let the request outlive the page if the visitor navigates away.
      keepalive: true,
    }).catch((error) => console.warn(`${label} failed (non-blocking)`, error));
  } catch (error) {
    console.warn(`${label} failed (non-blocking)`, error);
  }
}

/** Fire-and-forget copy to Aurixa's own `capture-lead` function. */
export function copyLeadToStorefront(payload: Record<string, unknown>, label: string): void {
  fireAndForget(`${STOREFRONT_BASE}/capture-lead`, payload, label);
}

/**
 * Submits a Stage 1 application to Mission Control and answers whether it
 * landed — the only thing the applicant's result reflects. A retry of the same
 * application is a 200 `duplicate`, which is landed. Once accepted, the same
 * payload is copied to `capture-lead`.
 */
export async function submitApplication(
  payload: Record<string, unknown>,
  applicationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetchImpl(MISSION_CONTROL_LEAD_CAPTURE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Idempotency key — repeated deliveries of the same application collapse
      // to a single record.
      "X-Application-Id": applicationId,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return false;
  copyLeadToStorefront(payload, "Aurixa lead capture");
  return true;
}
