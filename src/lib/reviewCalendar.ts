/**
 * Stage 3's live calendar: Mission Control's strategic-review endpoint.
 *
 * Mission Control answers from Cal.com — the same calendar the Aurixa voice
 * assistants book into — so a time shown here is one nobody else holds, and a
 * time booked here is a real booking: Cal.com sends the invitation with the
 * video link the moment it is made. That is the difference from the request
 * form this page used before, where a chosen time was a request the team then
 * reconciled by hand against a calendar the page could not see.
 *
 * The request form is still here, and it is still the right answer in exactly
 * one case: there is no live calendar. A Mission Control with no calendar
 * configured says `not_configured`, and one that predates this endpoint answers
 * 404; both send the page back to requesting a time, as it always did. Every
 * other failure is an outage, and an outage is never quietly turned into a
 * request — the request form cannot see the calendar, so it would hand out a
 * time somebody else already holds.
 *
 * Pure apart from `fetch`, which every function takes as an argument, so the
 * rules are testable without a bundler; the endpoint lives in
 * `reviewCalendarClient.ts`.
 */

import type { BookingDetails } from "./reviewBooking";

export const REVIEW_CALENDAR_PATH = "/api/public/storefront/strategic-review";

export const DEFAULT_AVAILABILITY_TIMEOUT_MS = 12_000;

/**
 * Mission Control checks access, looks for a review the applicant already
 * holds, books, and — when an answer is lost — asks the calendar what it now
 * holds rather than guess. Each step has its own timeout, and together they can
 * run past thirty seconds in an outage; giving up sooner would leave the
 * applicant with no answer where waiting gets the honest one.
 */
export const DEFAULT_CALENDAR_BOOKING_TIMEOUT_MS = 45_000;

/** A booking as Mission Control describes it. */
export type ReviewBookingView = {
  uid: string;
  /** ISO-8601 instant. */
  start: string;
  end: string;
  meetingUrl: string | null;
};

/** Why the calendar could not be used just now. None of these is about the applicant. */
export type CalendarUnavailableReason =
  | "calendar_unavailable"
  | "access_unverifiable"
  | "network_error"
  | "timeout"
  | "invalid_response";

export type AvailabilityResult =
  | { mode: "live"; slots: number[]; generatedAt: string | null }
  /** No live calendar: the page books by request, as it did before. */
  | { mode: "legacy" }
  | { mode: "unavailable"; reason: CalendarUnavailableReason };

export type CalendarBookingOutcome =
  | { kind: "booked"; booking: ReviewBookingView }
  /** The time asked for is already theirs: a double submit, or a retry whose answer was lost. */
  | { kind: "already_booked"; booking: ReviewBookingView }
  | { kind: "rescheduled"; booking: ReviewBookingView; previous: ReviewBookingView | null }
  /** They hold a review at another time. Nothing was changed; ask before moving it. */
  | { kind: "held"; existing: ReviewBookingView }
  /** Somebody took the time first. `existing` is their review, where they were moving one — it stands. */
  | { kind: "slot_taken"; existing: ReviewBookingView | null }
  | { kind: "invalid"; field: string | null }
  /** The reference was refused. The page only opens for one it accepted, so this is rare. */
  | { kind: "refused" }
  | { kind: "not_configured" }
  | { kind: "unavailable"; reason: CalendarUnavailableReason; existing: ReviewBookingView | null };

type FetchLike = typeof fetch;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** A booking view, or null when the value is not one. */
export function readBookingView(value: unknown): ReviewBookingView | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const uid = text(record.uid);
  const start = text(record.start);
  const end = text(record.end);
  if (!uid || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return null;
  const meetingUrl = text(record.meetingUrl);
  return {
    uid,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    // Only a web address is ever shown as a link.
    meetingUrl: /^https?:\/\/[^\s"'<>]+$/i.test(meetingUrl) ? meetingUrl : null,
  };
}

/** The free starts in an availability answer, as epoch milliseconds, ascending and distinct. */
export function readSlots(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const starts = new Set<number>();
  for (const slot of value) {
    const start = Date.parse(text((slot as Record<string, unknown> | null)?.start));
    if (Number.isFinite(start)) starts.add(start);
  }
  return [...starts].sort((a, b) => a - b);
}

/** The route is absent: a Mission Control that predates the live calendar. */
const routeAbsent = (status: number): boolean => status === 404 || status === 405 || status === 501;

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await response.text());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function send(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response } | { failure: "network_error" | "timeout" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return { response: await fetchImpl(url, { ...init, signal: controller.signal }) };
  } catch (error) {
    const aborted = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    return { failure: aborted ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchReviewAvailability(input: {
  endpoint: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<AvailabilityResult> {
  const sent = await send(
    input.fetchImpl ?? fetch,
    input.endpoint,
    { method: "GET", headers: { Accept: "application/json" } },
    input.timeoutMs ?? DEFAULT_AVAILABILITY_TIMEOUT_MS,
  );
  if ("failure" in sent) return { mode: "unavailable", reason: sent.failure };
  const { response } = sent;
  if (routeAbsent(response.status)) return { mode: "legacy" };

  const body = await readJson(response);
  if (body?.ok === false && body.reason === "not_configured") return { mode: "legacy" };
  if (response.ok && body?.ok === true) {
    const slots = readSlots(body.slots);
    if (slots) return { mode: "live", slots, generatedAt: text(body.generatedAt) || null };
  }
  if (body?.ok === false && body.reason === "calendar_unavailable") {
    return { mode: "unavailable", reason: "calendar_unavailable" };
  }
  return { mode: "unavailable", reason: "invalid_response" };
}

export type CalendarBookingRequest = {
  applicationId: string;
  /** The chosen start, epoch milliseconds. */
  start: number;
  /** The applicant's zone: the invitation shows the time in it. */
  timeZone: string;
  details: BookingDetails;
  /** True only once the applicant has said they want to move the review they hold. */
  rescheduleExisting: boolean;
};

/** The body Mission Control's booking endpoint takes. Blank optional fields are sent as null. */
export function buildCalendarBookingBody(request: CalendarBookingRequest): Record<string, unknown> {
  const optional = (value: string): string | null => value.trim() || null;
  return {
    applicationId: request.applicationId.trim(),
    start: new Date(request.start).toISOString(),
    timeZone: request.timeZone,
    name: request.details.fullName.trim(),
    email: request.details.workEmail.trim().toLowerCase(),
    organisation: optional(request.details.organisation),
    phone: optional(request.details.phone),
    notes: optional(request.details.notes),
    rescheduleExisting: request.rescheduleExisting,
  };
}

/** What a booking answer means for the page. Every refusal Mission Control names is placed. */
export function readBookingAnswer(status: number, body: Record<string, unknown> | null): CalendarBookingOutcome {
  if (routeAbsent(status)) return { kind: "not_configured" };
  if (!body) return { kind: "unavailable", reason: "invalid_response", existing: null };

  const existing = readBookingView(body.existing);
  if (body.ok === true) {
    const booking = readBookingView(body.booking);
    if (!booking) return { kind: "unavailable", reason: "invalid_response", existing: null };
    if (body.status === "booked") return { kind: "booked", booking };
    if (body.status === "already_booked") return { kind: "already_booked", booking };
    if (body.status === "rescheduled") {
      return { kind: "rescheduled", booking, previous: readBookingView(body.previous) };
    }
    return { kind: "unavailable", reason: "invalid_response", existing: null };
  }

  switch (body.reason) {
    case "already_booked":
      return existing
        ? { kind: "held", existing }
        : { kind: "unavailable", reason: "invalid_response", existing: null };
    case "slot_unavailable":
      return { kind: "slot_taken", existing };
    case "invalid_request":
      return { kind: "invalid", field: text(body.field) || null };
    case "invalid_reference":
    case "access_denied":
      return { kind: "refused" };
    case "not_configured":
      return { kind: "not_configured" };
    case "access_unverifiable":
      return { kind: "unavailable", reason: "access_unverifiable", existing };
    case "calendar_unavailable":
      return { kind: "unavailable", reason: "calendar_unavailable", existing };
    default:
      return { kind: "unavailable", reason: "invalid_response", existing };
  }
}

export async function bookReviewTime(input: {
  endpoint: string;
  request: CalendarBookingRequest;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<CalendarBookingOutcome> {
  const sent = await send(
    input.fetchImpl ?? fetch,
    input.endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildCalendarBookingBody(input.request)),
    },
    input.timeoutMs ?? DEFAULT_CALENDAR_BOOKING_TIMEOUT_MS,
  );
  if ("failure" in sent) return { kind: "unavailable", reason: sent.failure, existing: null };
  return readBookingAnswer(sent.response.status, await readJson(sent.response));
}

/* ------------------------------ announcements ------------------------------ */

/**
 * The Stage 3 scenario writes the Strategic Review Bookings record and sends
 * the branded confirmation, so a booking is sent down it once. A booking the
 * calendar reports as already the applicant's is usually one this tab has
 * already announced (a double submit), but can be one whose answer was lost
 * before it was ever announced — so the tab remembers what it sent.
 */
export const ANNOUNCED_BOOKINGS_KEY = "aurixa_strategic_review_announced";

export const announcementKey = (booking: ReviewBookingView): string => `${booking.uid}@${booking.start}`;

function readAnnounced(storage: Storage | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(ANNOUNCED_BOOKINGS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

export function wasAnnounced(storage: Storage | undefined, booking: ReviewBookingView): boolean {
  return readAnnounced(storage).includes(announcementKey(booking));
}

export function rememberAnnounced(storage: Storage | undefined, booking: ReviewBookingView): void {
  try {
    const keys = [...readAnnounced(storage).filter((key) => key !== announcementKey(booking)), announcementKey(booking)];
    storage?.setItem(ANNOUNCED_BOOKINGS_KEY, JSON.stringify(keys.slice(-20)));
  } catch {
    // Storage can be refused; the worst case is one repeated confirmation.
  }
}

/** Whether this outcome should go down the Stage 3 scenario. */
export function shouldAnnounce(outcome: CalendarBookingOutcome, storage: Storage | undefined): boolean {
  switch (outcome.kind) {
    case "booked":
    case "rescheduled":
    case "already_booked":
      return !wasAnnounced(storage, outcome.booking);
    default:
      return false;
  }
}
