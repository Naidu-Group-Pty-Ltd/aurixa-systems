import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  ANNOUNCED_BOOKINGS_KEY,
  announcementKey,
  bookReviewTime,
  buildCalendarBookingBody,
  fetchReviewAvailability,
  readBookingAnswer,
  readBookingView,
  readSlots,
  rememberAnnounced,
  shouldAnnounce,
  wasAnnounced,
  type CalendarBookingRequest,
  type ReviewBookingView,
} from "./reviewCalendar";

const ENDPOINT = "https://mc.example.test/api/public/storefront/strategic-review";

const responseOf = (body: string, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as Response;

const json = (value: unknown, status = 200) => responseOf(JSON.stringify(value), status);

/** A fetch that records what it was asked and answers with `reply`. */
function fakeFetch(reply: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return reply();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const BOOKING = {
  uid: "bk_1",
  start: "2026-10-01T23:00:00.000Z",
  end: "2026-10-01T23:30:00.000Z",
  meetingUrl: "https://app.cal.com/video/bk_1",
};

const EARLIER = {
  uid: "bk_0",
  start: "2026-09-30T00:00:00.000Z",
  end: "2026-09-30T00:30:00.000Z",
  meetingUrl: null,
};

const request: CalendarBookingRequest = {
  applicationId: " AX-7Q2M4L9XZ1 ",
  start: Date.parse(BOOKING.start),
  timeZone: "Australia/Perth",
  details: {
    fullName: "  Ada Lovelace ",
    workEmail: " Ada@Example.COM ",
    organisation: " ",
    phone: " 0400 000 000 ",
    notes: "",
  },
  rescheduleExisting: false,
};

/* -------------------------------- availability ------------------------------- */

test("a live calendar's times arrive as instants, ascending and distinct", async () => {
  const { impl, calls } = fakeFetch(() =>
    json({
      ok: true,
      provider: "calcom",
      generatedAt: "2026-09-24T00:00:00.000Z",
      slots: [
        { start: "2026-10-02T00:00:00.000Z", end: "x" },
        { start: "2026-10-01T23:00:00.000Z" },
        { start: "2026-10-01T23:00:00.000Z" },
        { start: "not a time" },
        null,
      ],
    }),
  );
  const result = await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: impl });
  assert.deepEqual(result, {
    mode: "live",
    slots: [Date.parse("2026-10-01T23:00:00.000Z"), Date.parse("2026-10-02T00:00:00.000Z")],
    generatedAt: "2026-09-24T00:00:00.000Z",
  });
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].init.method, "GET");
});

test("an empty live calendar is live, not a fallback", async () => {
  const { impl } = fakeFetch(() => json({ ok: true, slots: [] }));
  assert.deepEqual(await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: impl }), {
    mode: "live",
    slots: [],
    generatedAt: null,
  });
});

test("no live calendar sends the page back to the request form", async () => {
  for (const reply of [
    () => json({ ok: false, reason: "not_configured" }, 503),
    () => responseOf("<html>Not Found</html>", 404),
    () => responseOf("", 405),
  ]) {
    const { impl } = fakeFetch(reply);
    assert.deepEqual(await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: impl }), { mode: "legacy" });
  }
});

test("an outage is never turned into the request form", async () => {
  const cases: [() => Response, string][] = [
    [() => json({ ok: false, reason: "calendar_unavailable", fault: "unreachable" }, 503), "calendar_unavailable"],
    [() => responseOf("<html>bad gateway</html>", 502), "invalid_response"],
    [() => json({ ok: true, slots: "soon" }), "invalid_response"],
    [() => responseOf("{", 200), "invalid_response"],
  ];
  for (const [reply, reason] of cases) {
    const { impl } = fakeFetch(reply);
    assert.deepEqual(await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: impl }), {
      mode: "unavailable",
      reason,
    });
  }
  const offline = (async () => {
    throw new TypeError("Failed to fetch");
  }) as unknown as typeof fetch;
  assert.deepEqual(await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: offline }), {
    mode: "unavailable",
    reason: "network_error",
  });
});

test("a calendar that never answers is given up on", async () => {
  const hung = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
  assert.deepEqual(await fetchReviewAvailability({ endpoint: ENDPOINT, fetchImpl: hung, timeoutMs: 20 }), {
    mode: "unavailable",
    reason: "timeout",
  });
});

test("readSlots refuses what is not a list", () => {
  assert.equal(readSlots(undefined), null);
  assert.equal(readSlots({}), null);
  assert.deepEqual(readSlots([]), []);
});

/* ---------------------------------- booking ---------------------------------- */

test("the booking body carries the chosen instant, the applicant's zone and nulls for blanks", () => {
  assert.deepEqual(buildCalendarBookingBody(request), {
    applicationId: "AX-7Q2M4L9XZ1",
    start: "2026-10-01T23:00:00.000Z",
    timeZone: "Australia/Perth",
    name: "Ada Lovelace",
    email: "ada@example.com",
    organisation: null,
    phone: "0400 000 000",
    notes: null,
    rescheduleExisting: false,
  });
  assert.equal(buildCalendarBookingBody({ ...request, rescheduleExisting: true }).rescheduleExisting, true);
});

test("a confirmed booking is reported with what the calendar holds", async () => {
  const { impl, calls } = fakeFetch(() => json({ ok: true, status: "booked", booking: BOOKING }));
  const outcome = await bookReviewTime({ endpoint: ENDPOINT, request, fetchImpl: impl });
  assert.deepEqual(outcome, { kind: "booked", booking: BOOKING });
  assert.equal(calls[0].init.method, "POST");
  assert.equal(JSON.parse(String(calls[0].init.body)).email, "ada@example.com");
});

test("every answer Mission Control gives is placed", () => {
  assert.deepEqual(readBookingAnswer(200, { ok: true, status: "already_booked", booking: BOOKING }), {
    kind: "already_booked",
    booking: BOOKING,
  });
  assert.deepEqual(
    readBookingAnswer(200, { ok: true, status: "rescheduled", booking: BOOKING, previous: EARLIER }),
    { kind: "rescheduled", booking: BOOKING, previous: EARLIER },
  );
  assert.deepEqual(readBookingAnswer(409, { ok: false, reason: "already_booked", existing: EARLIER }), {
    kind: "held",
    existing: EARLIER,
  });
  assert.deepEqual(readBookingAnswer(409, { ok: false, reason: "slot_unavailable" }), {
    kind: "slot_taken",
    existing: null,
  });
  assert.deepEqual(readBookingAnswer(409, { ok: false, reason: "slot_unavailable", existing: EARLIER }), {
    kind: "slot_taken",
    existing: EARLIER,
  });
  assert.deepEqual(readBookingAnswer(400, { ok: false, reason: "invalid_request", field: "email" }), {
    kind: "invalid",
    field: "email",
  });
  assert.deepEqual(readBookingAnswer(400, { ok: false, reason: "invalid_reference" }), { kind: "refused" });
  assert.deepEqual(readBookingAnswer(403, { ok: false, reason: "access_denied" }), { kind: "refused" });
  assert.deepEqual(readBookingAnswer(503, { ok: false, reason: "not_configured" }), { kind: "not_configured" });
  assert.deepEqual(readBookingAnswer(404, null), { kind: "not_configured" });
  assert.deepEqual(readBookingAnswer(503, { ok: false, reason: "access_unverifiable" }), {
    kind: "unavailable",
    reason: "access_unverifiable",
    existing: null,
  });
  assert.deepEqual(readBookingAnswer(503, { ok: false, reason: "calendar_unavailable", existing: EARLIER }), {
    kind: "unavailable",
    reason: "calendar_unavailable",
    existing: EARLIER,
  });
});

test("nothing is reported as booked unless the answer names the booking", () => {
  assert.deepEqual(readBookingAnswer(200, { ok: true, status: "booked" }), {
    kind: "unavailable",
    reason: "invalid_response",
    existing: null,
  });
  assert.deepEqual(readBookingAnswer(200, { ok: true, status: "pending", booking: BOOKING }), {
    kind: "unavailable",
    reason: "invalid_response",
    existing: null,
  });
  assert.deepEqual(readBookingAnswer(502, null), { kind: "unavailable", reason: "invalid_response", existing: null });
  // "Already booked" with nothing to show is not something the page can ask about.
  assert.deepEqual(readBookingAnswer(409, { ok: false, reason: "already_booked" }), {
    kind: "unavailable",
    reason: "invalid_response",
    existing: null,
  });
});

test("a booking that never answers is reported as unconfirmed, not failed", async () => {
  const hung = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
  assert.deepEqual(await bookReviewTime({ endpoint: ENDPOINT, request, fetchImpl: hung, timeoutMs: 20 }), {
    kind: "unavailable",
    reason: "timeout",
    existing: null,
  });
});

test("readBookingView only ever links to a web address", () => {
  assert.equal(readBookingView({ ...BOOKING, meetingUrl: "javascript:alert(1)" })?.meetingUrl, null);
  assert.equal(readBookingView({ ...BOOKING, meetingUrl: "https://x.test/a b" })?.meetingUrl, null);
  assert.equal(readBookingView({ ...BOOKING, uid: "" }), null);
  assert.equal(readBookingView({ ...BOOKING, start: "soon" }), null);
  assert.equal(readBookingView(null), null);
});

/* ------------------------------- announcements ------------------------------- */

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

test("a booking is sent down the Stage 3 scenario once per tab", () => {
  const storage = memoryStorage();
  const booked = { kind: "booked", booking: BOOKING } as const;
  assert.equal(shouldAnnounce(booked, storage), true);
  rememberAnnounced(storage, BOOKING);
  assert.equal(wasAnnounced(storage, BOOKING), true);
  // A double submit comes back as "already booked": it was announced already.
  assert.equal(shouldAnnounce({ kind: "already_booked", booking: BOOKING }, storage), false);
  // A retry whose first answer was lost was never announced: it is now.
  assert.equal(shouldAnnounce({ kind: "already_booked", booking: EARLIER as ReviewBookingView }, storage), true);
  // A moved review is a different booking.
  const moved = { ...BOOKING, uid: "bk_2", start: "2026-10-03T00:00:00.000Z" };
  assert.equal(shouldAnnounce({ kind: "rescheduled", booking: moved, previous: BOOKING }, storage), true);
});

test("only a booking is ever announced", () => {
  const storage = memoryStorage();
  for (const outcome of [
    { kind: "held", existing: BOOKING },
    { kind: "slot_taken", existing: null },
    { kind: "refused" },
    { kind: "not_configured" },
    { kind: "unavailable", reason: "timeout", existing: null },
  ] as const) {
    assert.equal(shouldAnnounce(outcome, storage), false, outcome.kind);
  }
});

test("announcement memory survives a refused or corrupt store", () => {
  const refusing = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  } as unknown as Storage;
  assert.equal(wasAnnounced(refusing, BOOKING), false);
  assert.doesNotThrow(() => rememberAnnounced(refusing, BOOKING));
  assert.equal(wasAnnounced(undefined, BOOKING), false);

  const corrupt = memoryStorage();
  corrupt.setItem(ANNOUNCED_BOOKINGS_KEY, "{not json");
  assert.equal(wasAnnounced(corrupt, BOOKING), false);
  rememberAnnounced(corrupt, BOOKING);
  assert.deepEqual(JSON.parse(corrupt.getItem(ANNOUNCED_BOOKINGS_KEY) ?? "[]"), [announcementKey(BOOKING)]);
});

/* ----------------------------------- wiring ---------------------------------- */

// The client reads `import.meta.env`, which throws outside a bundler, so its
// wiring is asserted from the source rather than by importing it.
test("the client asks Mission Control's strategic-review endpoint", async () => {
  const source = await readFile(new URL("./reviewCalendarClient.ts", import.meta.url), "utf8");
  assert.match(source, /export const REVIEW_CALENDAR_URL = `\$\{MISSION_CONTROL_URL\}\$\{REVIEW_CALENDAR_PATH\}`;/);
  const pure = await readFile(new URL("./reviewCalendar.ts", import.meta.url), "utf8");
  assert.match(pure, /export const REVIEW_CALENDAR_PATH = "\/api\/public\/storefront\/strategic-review";/);
});

test("the scheduler books live only through the calendar, and requests only without one", async () => {
  const source = await readFile(new URL("../components/schedule/ReviewScheduler.tsx", import.meta.url), "utf8");
  const submit = source.slice(source.indexOf("const submit = async"), source.indexOf("/** They said yes"));
  assert.ok(
    submit.indexOf("if (live)") < submit.indexOf("await submitRequest(selectedSlot)"),
    "a live calendar books before the request form is ever considered",
  );
  // The request form is reached from the booking path only on `not_configured`.
  const book = source.slice(source.indexOf("const book = async"), source.indexOf("const submit = async"));
  const requestCalls = [...book.matchAll(/submitRequest\(/g)].length;
  assert.equal(requestCalls, 1);
  assert.ok(book.indexOf('case "not_configured"') < book.indexOf("submitRequest("));
  // An outage is reported, never turned into a request.
  const unavailable = book.slice(book.indexOf('case "unavailable"'));
  assert.doesNotMatch(unavailable, /submitRequest|setCalendar\(\{ status: "legacy" \}\)/);
});

// A background read after a time is chosen sees that time as taken — by the
// applicant's own booking — and would take the form, and the "try again" that
// recovers a lost answer, off the page with it.
test("the scheduler refreshes the calendar in the background only while browsing", async () => {
  const source = await readFile(new URL("../components/schedule/ReviewScheduler.tsx", import.meta.url), "utf8");
  const interval = source.slice(source.indexOf("const timer = setInterval("), source.indexOf("clearInterval(timer)"));
  assert.match(interval, /loadCalendar\(true\)/);
  assert.match(interval, /phaseRef\.current === "selecting"/);
});
