/**
 * Stage 3 booking requests.
 *
 * A requested review is submitted to Aurixa's own backend (the `capture-lead`
 * function, which is the store of record for anything the site collects) and
 * mirrored to the operator console. The applicant's result reflects the
 * backend call alone; the mirror can never affect it.
 *
 * The times in the payload are unambiguous: the instant in UTC, plus the wall
 * time in both the applicant's zone and Aurixa's, so nobody has to re-derive a
 * meeting time from a screenshot.
 */

import { HOST_TIME_ZONE, SESSION_MINUTES, formatDayLabel, formatSlotRange } from "./reviewAvailability";
import { describeTimeZone, toDayKey } from "./timeZone";

export const BOOKING_SUBMISSION_TYPE = "strategic_review_booking" as const;
export const BOOKING_SOURCE = "Aurixa Strategic Review Scheduler" as const;
export const BOOKING_PAGE = "/schedule-strategic-review" as const;

export const DEFAULT_BOOKING_TIMEOUT_MS = 20_000;

export type BookingDetails = {
  fullName: string;
  workEmail: string;
  organisation: string;
  phone: string;
  notes: string;
};

export type BookingDetailErrors = Partial<Record<keyof BookingDetails, string>>;

export const EMPTY_BOOKING_DETAILS: BookingDetails = {
  fullName: "",
  workEmail: "",
  organisation: "",
  phone: "",
  notes: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field-level validation for the booking form. */
export function validateBookingDetails(details: BookingDetails): BookingDetailErrors {
  const errors: BookingDetailErrors = {};
  const name = details.fullName.trim();
  const email = details.workEmail.trim();

  if (name.length < 2) errors.fullName = "Enter the name the review should be booked under.";
  if (!email) errors.workEmail = "Enter the email address the invitation should go to.";
  else if (!EMAIL_PATTERN.test(email) || email.length > 320) errors.workEmail = "Enter a valid email address.";
  if (details.organisation.trim().length > 200) errors.organisation = "Organisation name is too long.";
  if (details.notes.length > 2000) errors.notes = "Please keep context under 2000 characters.";

  return errors;
}

export type BookingPayload = {
  submissionType: typeof BOOKING_SUBMISSION_TYPE;
  source: typeof BOOKING_SOURCE;
  page: typeof BOOKING_PAGE;
  /** `capture-lead` reads these three directly. */
  email: string;
  name: string;
  company: string;
  phone: string;
  message: string;
  /**
   * The name split into parts, and the reference under the aliases the
   * operator console keys on.
   *
   * Mission Control's ingest identifies a person by first and last name and
   * ties them to their application by `applicationId`. This payload carried
   * only a combined `name` and only `applicationReference`, so every mirrored
   * booking was rejected — and rejected silently, because the mirror is
   * fire-and-forget. Sending both shapes costs nothing and means a booking
   * cannot vanish between the two systems again.
   */
  firstName: string;
  lastName: string;
  applicationId: string;
  /** The applicant's own words, kept separate from the assembled summary. */
  notes: string;
  applicationReference: string;
  /** How the applicant reached the scheduler; recorded, never trusted as access. */
  accessMode: string;
  submittedAt: string;
  requestedStartUtc: string;
  requestedEndUtc: string;
  durationMinutes: number;
  applicantTimeZone: string;
  applicantOffset: string;
  applicantLocalTime: string;
  hostTimeZone: string;
  hostLocalTime: string;
  summaryText: string;
};

export type BuildBookingPayloadInput = {
  slot: number;
  details: BookingDetails;
  applicantTimeZone: string;
  applicationReference?: string;
  accessMode?: string;
  now?: Date;
};

/**
 * Splits the scheduler's single name field on the last space.
 *
 * The form asks for "the name the review should be booked under", which is how
 * people write their name — one field. Downstream systems store two. Splitting
 * here, once, beats every consumer guessing differently.
 */
function splitName(value: string): { first: string; last: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export function buildBookingPayload(input: BuildBookingPayloadInput): BookingPayload {
  const start = new Date(input.slot);
  const end = new Date(input.slot + SESSION_MINUTES * 60_000);
  const zone = describeTimeZone(start, input.applicantTimeZone);
  const applicantLocalTime = `${formatDayLabel(toDayKey(start, input.applicantTimeZone))}, ${formatSlotRange(input.slot, input.applicantTimeZone)}`;
  const hostLocalTime = `${formatDayLabel(toDayKey(start, HOST_TIME_ZONE))}, ${formatSlotRange(input.slot, HOST_TIME_ZONE)}`;
  const reference = input.applicationReference?.trim() ?? "";
  const { first, last } = splitName(input.details.fullName);

  const summaryText = [
    "Strategic review requested",
    reference ? `Application reference: ${reference}` : "",
    `Applicant time: ${applicantLocalTime} (${zone.label}, ${zone.offsetLabel})`,
    `Aurixa time: ${hostLocalTime} (${HOST_TIME_ZONE})`,
    `Duration: ${SESSION_MINUTES} minutes`,
    input.details.notes.trim() ? `Context: ${input.details.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    submissionType: BOOKING_SUBMISSION_TYPE,
    source: BOOKING_SOURCE,
    page: BOOKING_PAGE,
    email: input.details.workEmail.trim().toLowerCase(),
    name: input.details.fullName.trim(),
    company: input.details.organisation.trim(),
    phone: input.details.phone.trim(),
    message: summaryText,
    notes: input.details.notes.trim(),
    firstName: first,
    lastName: last,
    applicationId: reference,
    applicationReference: reference,
    accessMode: input.accessMode?.trim() || (reference ? "Application ID fallback" : "Direct visit"),
    submittedAt: (input.now ?? new Date()).toISOString(),
    requestedStartUtc: start.toISOString(),
    requestedEndUtc: end.toISOString(),
    durationMinutes: SESSION_MINUTES,
    applicantTimeZone: zone.timeZone,
    applicantOffset: zone.offsetLabel,
    applicantLocalTime,
    hostTimeZone: HOST_TIME_ZONE,
    hostLocalTime,
    summaryText,
  };
}

export type BookingSubmissionResult = {
  ok: boolean;
  payload: BookingPayload;
  reason?: "http_error" | "network_error" | "timeout" | "invalid_response";
};

export type PostBookingInput = {
  endpoint: string;
  payload: BookingPayload;
  /** Test seam; production always uses the browser fetch implementation. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Sends a built payload and reports whether it landed. Kept free of
 * configuration so the timeout and response handling stay testable; the caller
 * supplies the endpoint.
 */
export async function postBookingRequest(input: PostBookingInput): Promise<BookingSubmissionResult> {
  const { payload } = input;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_BOOKING_TIMEOUT_MS);

  try {
    const response = await (input.fetchImpl ?? fetch)(input.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, payload, reason: "http_error" };

    const body = await response.text();
    // The endpoint may acknowledge with an empty 2xx; only an explicit
    // `{ok:false}` or unparseable body counts as a failure.
    if (body.trim()) {
      try {
        const parsed = JSON.parse(body) as { ok?: unknown };
        if (!parsed || typeof parsed !== "object" || parsed.ok === false) {
          return { ok: false, payload, reason: "invalid_response" };
        }
      } catch {
        return { ok: false, payload, reason: "invalid_response" };
      }
    }

    return { ok: true, payload };
  } catch (error) {
    const aborted = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    return { ok: false, payload, reason: aborted ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

const icsTimestamp = (date: Date): string => `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

/** RFC 5545 requires escaping these in text values, and folding long lines. */
const icsText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const foldLine = (line: string): string => {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
};

export type IcsInput = {
  slot: number;
  organiserEmail: string;
  attendeeName?: string;
  attendeeEmail?: string;
  applicationReference?: string;
  now?: Date;
};

/**
 * A tentative calendar entry the applicant can hold while Aurixa confirms.
 * Marked TENTATIVE deliberately — the team confirms the session by email.
 */
export function buildReviewIcs(input: IcsInput): string {
  const start = new Date(input.slot);
  const end = new Date(input.slot + SESSION_MINUTES * 60_000);
  const stamp = input.now ?? new Date();
  const reference = input.applicationReference?.trim() ?? "";
  const uid = `aurixa-review-${input.slot}-${reference || "stage03"}@aurixasystems.com.au`;

  const description = [
    "Stage 03 strategic review with the Aurixa Systems team.",
    reference ? `Application reference: ${reference}` : "",
    "Meeting access details are included with the confirmation email.",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aurixa Systems//Strategic Review//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsTimestamp(stamp)}`,
    `DTSTART:${icsTimestamp(start)}`,
    `DTEND:${icsTimestamp(end)}`,
    `SUMMARY:${icsText("Aurixa Systems Strategic Review")}`,
    `DESCRIPTION:${icsText(description)}`,
    "STATUS:TENTATIVE",
    "TRANSP:OPAQUE",
    `ORGANIZER;CN=${icsText("Aurixa Systems")}:mailto:${input.organiserEmail}`,
    ...(input.attendeeEmail
      ? [`ATTENDEE;CN=${icsText(input.attendeeName || input.attendeeEmail)};RSVP=TRUE:mailto:${input.attendeeEmail}`]
      : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("Aurixa Systems strategic review in 15 minutes")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** e.g. `aurixa-strategic-review-2026-08-06.ics`. */
export function icsFileName(slot: number, timeZone: string): string {
  return `aurixa-strategic-review-${toDayKey(new Date(slot), timeZone)}.ics`;
}
