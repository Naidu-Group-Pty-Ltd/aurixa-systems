/**
 * Wires the live calendar rules (`reviewCalendar.ts`) to Mission Control.
 *
 * Only the endpoint lives here, so `reviewCalendar.ts` stays free of
 * `import.meta.env` and its rules can be tested directly. The calendar is
 * Mission Control's `/api/public/storefront/strategic-review`, which answers
 * from Cal.com; Mission Control's origin is `VITE_MISSION_CONTROL_URL`, the
 * same one the lead mirror already posts to.
 */

import { MISSION_CONTROL_URL } from "./leads";
import {
  REVIEW_CALENDAR_PATH,
  bookReviewTime,
  fetchReviewAvailability,
  type AvailabilityResult,
  type CalendarBookingOutcome,
  type CalendarBookingRequest,
} from "./reviewCalendar";

export const REVIEW_CALENDAR_URL = `${MISSION_CONTROL_URL}${REVIEW_CALENDAR_PATH}`;

export function loadReviewAvailability(): Promise<AvailabilityResult> {
  return fetchReviewAvailability({ endpoint: REVIEW_CALENDAR_URL });
}

export function bookReviewInCalendar(request: CalendarBookingRequest): Promise<CalendarBookingOutcome> {
  return bookReviewTime({ endpoint: REVIEW_CALENDAR_URL, request });
}
