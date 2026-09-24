/**
 * Mission Control lead-capture client.
 *
 * The waitlist form's primary pipeline is unchanged: Make.com webhook →
 * Airtable. After that webhook succeeds, we ALSO mirror the same payload into
 * Mission Control (fire-and-forget) so operators see the lead in the /leads
 * console and get a realtime notification the moment it comes in.
 *
 * Mission Control dedupes on (corporateEmail + submittedAt), so if the
 * Make.com scenario is also configured to forward the lead server-to-server,
 * the double delivery still lands exactly once.
 *
 * This mirror must NEVER affect the visitor's experience — failures are
 * swallowed (logged to the console only) and the submission result shown to
 * the user reflects the Make.com webhook alone.
 */

/** Mission Control's origin, for everything this site asks of it. */
export const MISSION_CONTROL_URL = (
  (import.meta.env.VITE_MISSION_CONTROL_URL as string | undefined) ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");

export const MISSION_CONTROL_LEAD_CAPTURE_URL = `${MISSION_CONTROL_URL}/api/public/leads/capture`;

// Aurixa Systems owns leads: they land in this site's own backend (Supabase
// capture-lead function). We ALSO keep mirroring to Mission Control so the
// operator /leads console + realtime notifications are unaffected.
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

/** Backward-compatible: mirror a lead into Mission Control's operator console. */
export function mirrorLeadToMissionControl(payload: Record<string, unknown>): void {
  fireAndForget(MISSION_CONTROL_LEAD_CAPTURE_URL, payload, "Mission Control lead mirror");
}

/**
 * Capture a lead into Aurixa Systems' own backend (store of record) and mirror
 * it to Mission Control. Both are fire-and-forget — a failure NEVER affects the
 * visitor's submission result (which reflects the primary Make.com webhook).
 */
export function captureLead(payload: Record<string, unknown>): void {
  fireAndForget(`${STOREFRONT_BASE}/capture-lead`, payload, "Aurixa lead capture");
  mirrorLeadToMissionControl(payload);
}
