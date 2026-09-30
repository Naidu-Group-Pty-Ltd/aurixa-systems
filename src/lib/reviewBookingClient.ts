/**
 * Wires the pure booking logic to Stage 3's pipeline.
 *
 * Everything configuration- or network-shaped lives here: the endpoint and the
 * two mirrors. `reviewBooking.ts` stays free of `import.meta.env` so its rules
 * can be tested outside a bundler.
 *
 * The Stage 3 Make webhook is the transport of record, for the same reason the
 * Stage 2 webhook is: that is the pipeline the booking actually travels down —
 * the Strategic Review Bookings table, the link back to the applicant's
 * waitlist record, the gate, and the confirmation email. `capture-lead` and
 * Mission Control still receive the same payload so the operator lead console
 * is unaffected, but they run after the fact and can never change what the
 * applicant is told.
 */

import { STOREFRONT_BASE, mirrorLeadToMissionControl } from "./leads";
import {
  buildBookingPayload,
  postBookingRequest,
  type BookingPayload,
  type BookingSubmissionResult,
  type BuildBookingPayloadInput,
} from "./reviewBooking";

/** Stage 3 of the priority access workflow: "Aurixa Waitlist Stage 3" in Make. */
export const MAKE_BOOKING_WEBHOOK_URL = "https://hook.eu2.make.com/15tz9divuqyvfsgccgf75horevi5kvdf";

export type SubmitBookingInput = BuildBookingPayloadInput & {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Fire-and-forget mirror: a failure here must never reach the applicant. */
function mirror(endpoint: string, payload: BookingPayload, label: string): void {
  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Application-Id": payload.applicationReference },
      body: JSON.stringify(payload),
      // Let the request outlive the page if the applicant navigates away.
      keepalive: true,
    }).catch((error) => console.warn(`${label} mirror failed (non-blocking)`, error));
  } catch (error) {
    console.warn(`${label} mirror failed (non-blocking)`, error);
  }
}

/**
 * Submits a requested review time — the fallback form, used only where there
 * is no live calendar. The applicant's result reflects the Stage 3 webhook
 * alone — the mirrors run only after it succeeded and never change it.
 */
export async function submitBookingRequest(input: SubmitBookingInput): Promise<BookingSubmissionResult> {
  const payload = buildBookingPayload(input);
  const result = await postBookingRequest({
    endpoint: MAKE_BOOKING_WEBHOOK_URL,
    payload,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
  });

  if (!result.ok) return result;

  mirror(`${STOREFRONT_BASE}/capture-lead`, payload, "Booking capture-lead");
  mirrorLeadToMissionControl(payload as unknown as Record<string, unknown>);

  return result;
}

/**
 * Records a review the live calendar has ALREADY booked: the Stage 3 scenario
 * writes the Strategic Review Bookings record and sends the branded
 * confirmation, and the two mirrors keep the lead stores current.
 *
 * Nothing the applicant is told depends on this. Cal.com holds the booking and
 * has sent the invitation whatever happens here, so the page shows the booking
 * straight away and this runs behind it; a failure is logged, not shown. It
 * sends exactly what the request form sends, so the scenario's CORS preflight
 * sees nothing new.
 */
export async function announceConfirmedBooking(
  payload: BookingPayload,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<BookingSubmissionResult> {
  mirror(`${STOREFRONT_BASE}/capture-lead`, payload, "Booking capture-lead");
  mirrorLeadToMissionControl(payload as unknown as Record<string, unknown>);
  const result = await postBookingRequest({
    endpoint: MAKE_BOOKING_WEBHOOK_URL,
    payload,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  if (!result.ok) console.warn(`Stage 3 booking record failed (${result.reason}); the booking itself stands`);
  return result;
}
