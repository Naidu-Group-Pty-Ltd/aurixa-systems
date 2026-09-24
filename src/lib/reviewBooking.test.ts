import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  EMPTY_BOOKING_DETAILS,
  buildBookingPayload,
  buildReviewIcs,
  icsFileName,
  postBookingRequest,
  validateBookingDetails,
  type BookingDetails,
} from "./reviewBooking";
import { HOST_TIME_ZONE } from "./reviewAvailability";
import { zonedWallTimeToUtc } from "./timeZone";

/** Friday 7 August 2026, 9:00 am in Sydney. */
const SLOT = zonedWallTimeToUtc(HOST_TIME_ZONE, 2026, 8, 7, 9, 0).getTime();
const NOW = new Date("2026-08-05T22:00:00Z");

const details: BookingDetails = {
  fullName: "  Ada Lovelace ",
  workEmail: " Ada@Example.COM ",
  organisation: " Analytical Engines ",
  phone: " 0400 000 000 ",
  notes: " Two entities and a migration to discuss. ",
};

const buildPayload = () =>
  buildBookingPayload({
    slot: SLOT,
    details,
    applicantTimeZone: "Asia/Kuala_Lumpur",
    applicationReference: "AX-7Q2M4L9XZ1",
    now: NOW,
  });

const responseOf = (body: string, ok = true, status = 200): Response =>
  ({ ok, status, text: async () => body }) as Response;

test("validateBookingDetails requires a usable name and email", () => {
  const errors = validateBookingDetails(EMPTY_BOOKING_DETAILS);
  assert.ok(errors.fullName);
  assert.ok(errors.workEmail);

  assert.deepEqual(validateBookingDetails({ ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "ada@example.com" }), {});
  assert.ok(validateBookingDetails({ ...EMPTY_BOOKING_DETAILS, fullName: "A", workEmail: "ada@example.com" }).fullName);
  assert.ok(validateBookingDetails({ ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "ada@example" }).workEmail);
  assert.ok(validateBookingDetails({ ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "not an email" }).workEmail);
});

test("validateBookingDetails caps the free-text fields", () => {
  const long = { ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "ada@example.com" };
  assert.ok(validateBookingDetails({ ...long, organisation: "x".repeat(201) }).organisation);
  assert.ok(validateBookingDetails({ ...long, notes: "x".repeat(2001) }).notes);
  assert.equal(validateBookingDetails({ ...long, notes: "x".repeat(2000) }).notes, undefined);
});

// Mission Control's booking endpoint refuses a name past 200 characters and a
// phone number past 40; saying so on the field beats a refusal after the click.
test("validateBookingDetails holds the name and phone to what the calendar accepts", () => {
  const base = { ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "ada@example.com" };
  assert.ok(validateBookingDetails({ ...base, fullName: "x".repeat(201) }).fullName);
  assert.equal(validateBookingDetails({ ...base, fullName: "x".repeat(200) }).fullName, undefined);
  assert.ok(validateBookingDetails({ ...base, phone: "0".repeat(41) }).phone);
  assert.equal(validateBookingDetails({ ...base, phone: " +61 400 000 000 " }).phone, undefined);
});

test("buildBookingPayload trims the applicant's details for the backend", () => {
  const payload = buildPayload();
  assert.equal(payload.email, "ada@example.com");
  assert.equal(payload.name, "Ada Lovelace");
  assert.equal(payload.company, "Analytical Engines");
  assert.equal(payload.phone, "0400 000 000");
  assert.equal(payload.submissionType, "strategic_review_booking");
  assert.equal(payload.page, "/schedule-strategic-review");
  assert.equal(payload.applicationReference, "AX-7Q2M4L9XZ1");
  assert.equal(payload.submittedAt, NOW.toISOString());
});

test("buildBookingPayload names the applicant in the shape the lead stores read", () => {
  const payload = buildPayload();
  // Mission Control identifies a person by first and last name and ties them
  // to their application by `applicationId`. Sending only `name` and only
  // `applicationReference` made every mirrored booking unparseable — and the
  // mirror is fire-and-forget, so nobody found out.
  assert.equal(payload.firstName, "Ada");
  assert.equal(payload.lastName, "Lovelace");
  assert.equal(payload.applicationId, "AX-7Q2M4L9XZ1");
  assert.equal(payload.applicationId, payload.applicationReference);
});

test("buildBookingPayload splits a longer name on the last word", () => {
  const payload = buildBookingPayload({
    slot: SLOT,
    details: { ...details, fullName: "  Mary  Anne Van Der Berg " },
    applicantTimeZone: HOST_TIME_ZONE,
    now: NOW,
  });
  assert.equal(payload.firstName, "Mary Anne Van Der");
  assert.equal(payload.lastName, "Berg");
  assert.equal(payload.name, "Mary  Anne Van Der Berg", "name is trimmed, not re-spaced");
});

test("buildBookingPayload keeps a single-word name as the first name", () => {
  const payload = buildBookingPayload({
    slot: SLOT,
    details: { ...EMPTY_BOOKING_DETAILS, fullName: "Prince", workEmail: "prince@example.com" },
    applicantTimeZone: HOST_TIME_ZONE,
    now: NOW,
  });
  assert.equal(payload.firstName, "Prince");
  assert.equal(payload.lastName, "");
});

test("buildBookingPayload states the time in UTC and in both wall clocks", () => {
  const payload = buildPayload();
  assert.equal(payload.requestedStartUtc, "2026-08-06T23:00:00.000Z");
  assert.equal(payload.requestedEndUtc, "2026-08-06T23:30:00.000Z");
  assert.equal(payload.durationMinutes, 30);
  assert.equal(payload.applicantTimeZone, "Asia/Kuala_Lumpur");
  assert.equal(payload.applicantOffset, "UTC+08:00");
  assert.equal(payload.applicantLocalTime, "Friday 7 August 2026, 7:00 am – 7:30 am");
  assert.equal(payload.hostTimeZone, "Australia/Sydney");
  assert.equal(payload.hostLocalTime, "Friday 7 August 2026, 9:00 am – 9:30 am");
});

test("buildBookingPayload summarises the request for the operator", () => {
  const payload = buildPayload();
  assert.match(payload.summaryText, /Application reference: AX-7Q2M4L9XZ1/);
  assert.match(payload.summaryText, /Applicant time: Friday 7 August 2026, 7:00 am/);
  assert.match(payload.summaryText, /Aurixa time: Friday 7 August 2026, 9:00 am/);
  assert.match(payload.summaryText, /Context: Two entities and a migration to discuss\./);
  assert.equal(payload.message, payload.summaryText, "capture-lead stores this as the message");
});

// The request form is what runs on a deployment whose Mission Control has no
// calendar yet, so its payload must be exactly the shape the Stage 3 scenario
// has always received: a field added here is one the scenario's webhook has
// never seen. The live calendar's fields travel on a confirmed booking only.
test("a request is sent exactly as it always was", () => {
  const payload = buildPayload();
  assert.deepEqual(Object.keys(payload).sort(), [
    "accessMode",
    "applicantLocalTime",
    "applicantOffset",
    "applicantTimeZone",
    "applicationId",
    "applicationReference",
    "company",
    "durationMinutes",
    "email",
    "firstName",
    "hostLocalTime",
    "hostTimeZone",
    "lastName",
    "message",
    "name",
    "notes",
    "page",
    "phone",
    "requestedEndUtc",
    "requestedStartUtc",
    "source",
    "submissionType",
    "submittedAt",
    "summaryText",
  ]);
  assert.match(payload.summaryText, /^Strategic review requested\n/);
});

test("a booking the calendar confirmed says so, with its id and video link", () => {
  const payload = buildBookingPayload({
    slot: SLOT,
    details,
    applicantTimeZone: "Asia/Kuala_Lumpur",
    applicationReference: "AX-7Q2M4L9XZ1",
    confirmed: { uid: "bk_1", meetingUrl: "https://app.cal.com/video/bk_1" },
    now: NOW,
  });
  assert.equal(payload.bookingStatus, "Confirmed");
  assert.equal(payload.bookingProvider, "calcom");
  assert.equal(payload.calBookingUid, "bk_1");
  assert.equal(payload.meetingUrl, "https://app.cal.com/video/bk_1");
  assert.equal(payload.rescheduledFromUtc, "");
  assert.match(payload.summaryText, /^Strategic review booked\n/);
  assert.match(payload.summaryText, /Video call: https:\/\/app\.cal\.com\/video\/bk_1/);
  // The fields the Stage 3 scenario maps are exactly as a request's.
  assert.equal(payload.requestedStartUtc, "2026-08-06T23:00:00.000Z");
  assert.equal(payload.hostLocalTime, "Friday 7 August 2026, 9:00 am – 9:30 am");
});

test("a moved review names the time it replaced", () => {
  const previous = zonedWallTimeToUtc(HOST_TIME_ZONE, 2026, 8, 6, 14, 0).toISOString();
  const payload = buildBookingPayload({
    slot: SLOT,
    details,
    applicantTimeZone: HOST_TIME_ZONE,
    confirmed: { uid: "bk_2", meetingUrl: null, previousStart: previous },
    now: NOW,
  });
  assert.equal(payload.rescheduledFromUtc, previous);
  assert.match(payload.summaryText, /^Strategic review moved\n/);
  assert.match(payload.summaryText, /Moved from: Thursday 6 August 2026, 2:00 pm – 2:30 pm \(Australia\/Sydney\)/);
  assert.doesNotMatch(payload.summaryText, /Video call:/);
  assert.equal(payload.meetingUrl, "");
});

test("buildBookingPayload omits absent optional context", () => {
  const payload = buildBookingPayload({
    slot: SLOT,
    details: { ...EMPTY_BOOKING_DETAILS, fullName: "Ada", workEmail: "ada@example.com" },
    applicantTimeZone: HOST_TIME_ZONE,
    now: NOW,
  });
  assert.equal(payload.applicationReference, "");
  assert.doesNotMatch(payload.summaryText, /Application reference/);
  assert.doesNotMatch(payload.summaryText, /Context:/);
});

test("postBookingRequest reports success and posts the payload as JSON", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const result = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return responseOf('{"ok":true}');
    }) as unknown as typeof fetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.test/capture-lead");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(JSON.parse(String(calls[0].init.body)).email, "ada@example.com");
});

test("postBookingRequest accepts an empty acknowledgement", async () => {
  const result = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async () => responseOf("   ")) as unknown as typeof fetch,
  });
  assert.equal(result.ok, true);
});

// A Make scenario with no "Webhook response" module (the Stage 3 one has none)
// answers every delivery with 200 and the word "Accepted". Reading that as a
// failure told applicants a recorded request had not gone through.
test("postBookingRequest accepts Make's own acknowledgement", async () => {
  for (const body of ["Accepted", "accepted\n"]) {
    const result = await postBookingRequest({
      endpoint: "https://example.test/stage-3",
      payload: buildPayload(),
      fetchImpl: (async () => responseOf(body)) as unknown as typeof fetch,
    });
    assert.equal(result.ok, true, JSON.stringify(body));
  }

  // Only the bare word: anything else that is not JSON is still garbled.
  const lookalike = await postBookingRequest({
    endpoint: "https://example.test/stage-3",
    payload: buildPayload(),
    fetchImpl: (async () => responseOf("Accepted, but not by us")) as unknown as typeof fetch,
  });
  assert.deepEqual([lookalike.ok, lookalike.reason], [false, "invalid_response"]);
});

test("postBookingRequest distinguishes the ways a request can fail", async () => {
  const httpError = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async () => responseOf("", false, 500)) as unknown as typeof fetch,
  });
  assert.deepEqual([httpError.ok, httpError.reason], [false, "http_error"]);

  const rejected = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async () => responseOf('{"ok":false,"error":"invalid_email"}')) as unknown as typeof fetch,
  });
  assert.deepEqual([rejected.ok, rejected.reason], [false, "invalid_response"]);

  const garbled = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async () => responseOf("<html>gateway</html>")) as unknown as typeof fetch,
  });
  assert.deepEqual([garbled.ok, garbled.reason], [false, "invalid_response"]);

  const offline = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    fetchImpl: (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch,
  });
  assert.deepEqual([offline.ok, offline.reason], [false, "network_error"]);
});

test("postBookingRequest gives up on a request that never answers", async () => {
  const result = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload: buildPayload(),
    timeoutMs: 20,
    fetchImpl: ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })) as unknown as typeof fetch,
  });
  assert.deepEqual([result.ok, result.reason], [false, "timeout"]);
});

test("postBookingRequest keeps the built payload on the result either way", async () => {
  const payload = buildPayload();
  const failed = await postBookingRequest({
    endpoint: "https://example.test/capture-lead",
    payload,
    fetchImpl: (async () => responseOf("", false, 502)) as unknown as typeof fetch,
  });
  assert.equal(failed.payload, payload);
});

test("buildReviewIcs produces a valid tentative event", () => {
  const ics = buildReviewIcs({
    slot: SLOT,
    organiserEmail: "admin@aurixasystems.com.au",
    attendeeName: "Ada Lovelace",
    attendeeEmail: "ada@example.com",
    applicationReference: "AX-7Q2M4L9XZ1",
    now: NOW,
  });

  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"));
  assert.ok(ics.includes("\r\n"), "lines are CRLF-separated");
  assert.match(ics, /DTSTART:20260806T230000Z/);
  assert.match(ics, /DTEND:20260806T233000Z/);
  assert.match(ics, /DTSTAMP:20260805T220000Z/);
  assert.match(ics, /STATUS:TENTATIVE/);
  assert.match(ics, /ORGANIZER;CN=Aurixa Systems:mailto:admin@aurixasystems\.com\.au/);
  assert.match(ics, /ATTENDEE;CN=Ada Lovelace;RSVP=TRUE:mailto:ada@example\.com/);
  assert.match(ics, /UID:aurixa-review-\d+-AX-7Q2M4L9XZ1@aurixasystems\.com\.au/);
  assert.match(ics, /BEGIN:VALARM/);

  for (const line of ics.split("\r\n")) {
    assert.ok(line.length <= 75, `line longer than 75 octets: ${line}`);
  }
});

test("buildReviewIcs escapes text and folds the description", () => {
  const ics = buildReviewIcs({
    slot: SLOT,
    organiserEmail: "admin@aurixasystems.com.au",
    applicationReference: "AX-0000000001",
    now: NOW,
  });
  // Unfolding is the reverse of folding: drop each CRLF that a space follows.
  const unfolded = ics.replace(/\r\n /g, "");
  const description = unfolded.split("\r\n").find((line) => line.startsWith("DESCRIPTION:Stage")) ?? "";
  assert.match(description, /Application reference: AX-0000000001/);
  assert.match(description, /\\n/, "newlines are escaped, not literal");
  assert.doesNotMatch(description, /\r|\n$/, "the value is a single logical line");
  assert.doesNotMatch(ics, /ATTENDEE/, "no attendee line without an email");
});

test("icsFileName names the file after the applicant's date", () => {
  assert.equal(icsFileName(SLOT, HOST_TIME_ZONE), "aurixa-strategic-review-2026-08-07.ics");
  assert.equal(icsFileName(SLOT, "America/Los_Angeles"), "aurixa-strategic-review-2026-08-06.ics");
});

test("the payload carries the applicant's own notes and how they reached the scheduler", () => {
  const withNotes = buildBookingPayload({
    slot: SLOT,
    details: { ...details, notes: "  Two directors will join.  " },
    applicantTimeZone: "Australia/Brisbane",
    applicationReference: "AX-7Q2M4L9XZ1",
    accessMode: "Application ID fallback",
    now: NOW,
  });
  assert.equal(withNotes.notes, "Two directors will join.");
  assert.equal(withNotes.accessMode, "Application ID fallback");
  assert.match(withNotes.summaryText, /Context: Two directors will join\./);
});

test("access mode defaults from whether a reference was held at all", () => {
  const base = { slot: SLOT, details, applicantTimeZone: "Australia/Brisbane", now: NOW };
  assert.equal(buildBookingPayload({ ...base, applicationReference: "AX-7Q2M4L9XZ1" }).accessMode, "Application ID fallback");
  assert.equal(buildBookingPayload(base).accessMode, "Direct visit");
  assert.equal(buildBookingPayload({ ...base, accessMode: "  " }).accessMode, "Direct visit", "blank is not a mode");
  assert.equal(buildBookingPayload({ ...base, accessMode: "Same-session handoff" }).accessMode, "Same-session handoff");
});

// The client reads `import.meta.env`, which throws outside a bundler, so its
// wiring is asserted from the source rather than by importing it.
test("the client submits to the Stage 3 webhook and only mirrors afterwards", async () => {
  const source = await readFile(new URL("./reviewBookingClient.ts", import.meta.url), "utf8");
  assert.match(source, /export const MAKE_BOOKING_WEBHOOK_URL = "https:\/\/hook\.eu2\.make\.com\/15tz9divuqyvfsgccgf75horevi5kvdf"/);
  assert.match(source, /endpoint: MAKE_BOOKING_WEBHOOK_URL,/);
  assert.ok(
    source.indexOf("if (!result.ok) return result;") < source.indexOf("mirror(`${STOREFRONT_BASE}/capture-lead`"),
    "the mirrors must run only after the applicant's own submission succeeded",
  );
});
