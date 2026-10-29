/**
 * Wires the pure booking logic to Stage 3's pipeline.
 *
 * Everything configuration- or network-shaped lives here, so `reviewBooking.ts`
 * stays free of `import.meta.env` and its rules can be tested outside a
 * bundler.
 *
 * Mission Control's lead capture is where a booking is recorded, and what
 * raises the "Strategic Review Confirmed" email. The Stage 3 Make webhook this
 * used to submit to lived in the EU Make account, which is deprecated, so it
 * is no longer called. Aurixa's own `capture-lead` still receives a copy once
 * Mission Control has the booking, and can never change what the applicant is
 * told.
 */

import { MISSION_CONTROL_LEAD_CAPTURE_URL, copyLeadToStorefront } from "./leads";
import {
  buildBookingPayload,
  postBookingRequest,
  type BookingPayload,
  type BookingSubmissionResult,
  type BuildBookingPayloadInput,
} from "./reviewBooking";

export type SubmitBookingInput = BuildBookingPayloadInput & {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Submits a requested review time — the fallback form, used only where there
 * is no live calendar. The applicant's result is Mission Control's answer; the
 * copy to `capture-lead` runs only after it accepted and never changes it.
 */
export async function submitBookingRequest(input: SubmitBookingInput): Promise<BookingSubmissionResult> {
  const payload = buildBookingPayload(input);
  const result = await postBookingRequest({
    endpoint: MISSION_CONTROL_LEAD_CAPTURE_URL,
    payload,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
  });

  if (!result.ok) return result;

  copyLeadToStorefront(payload as unknown as Record<string, unknown>, "Booking capture-lead");
  return result;
}

/**
 * Records a review the live calendar has ALREADY booked: `capture-lead` keeps
 * its copy, and Mission Control notes it on the applicant's record and sends
 * the branded confirmation.
 *
 * Nothing the applicant is told depends on this. Cal.com holds the booking and
 * has sent the invitation whatever happens here, so the page shows the booking
 * straight away and this runs behind it; a failure is logged, not shown. The
 * request is `keepalive`, so it still lands if the applicant closes the tab.
 */
export async function announceConfirmedBooking(
  payload: BookingPayload,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<BookingSubmissionResult> {
  copyLeadToStorefront(payload as unknown as Record<string, unknown>, "Booking capture-lead");
  const result = await postBookingRequest({
    endpoint: MISSION_CONTROL_LEAD_CAPTURE_URL,
    payload,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    keepalive: true,
  });
  if (!result.ok) console.warn(`Stage 3 booking record failed (${result.reason}); the booking itself stands`);
  return result;
}
