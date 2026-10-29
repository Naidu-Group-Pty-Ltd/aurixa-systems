import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  ACCESS_COPY,
  parseAccessDecision,
  requestAccessDecision,
  type AccessFailure,
} from "./strategicReviewAccess";

const REFERENCE = "AX-7Q2M4L9XZ1";
const granted = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    ok: true,
    applicant: {
      applicationId: REFERENCE,
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      organisationName: "Analytical Engines",
      ...overrides,
    },
  });

test("a grant is returned with the verified details, trimmed", () => {
  const decision = parseAccessDecision(
    granted({ firstName: "  Ada  ", organisationName: " Analytical Engines " }),
    REFERENCE,
  );
  assert.equal(decision.granted, true);
  assert.deepEqual(decision.applicant, {
    applicationId: REFERENCE,
    firstName: "Ada",
    lastName: "Lovelace",
    workEmail: "ada@example.test",
    organisationName: "Analytical Engines",
  });
});

test("a refusal carries no applicant details at all", () => {
  const decision = parseAccessDecision(
    JSON.stringify({ ok: false, applicant: { firstName: "Ada", workEmail: "ada@example.test" } }),
    REFERENCE,
  );
  assert.deepEqual(decision, { granted: false, reason: "unverified" });
});

test("only an explicit true opens the page", () => {
  for (const ok of [1, "true", "yes", {}, [], null, undefined]) {
    const decision = parseAccessDecision(JSON.stringify({ ok, applicant: { applicationId: REFERENCE } }), REFERENCE);
    assert.equal(decision.granted, false, `ok: ${JSON.stringify(ok)}`);
    assert.equal(decision.reason, "unverified");
  }
});

test("a grant for a different reference is refused", () => {
  const decision = parseAccessDecision(granted({ applicationId: "AX-0000000000" }), REFERENCE);
  assert.deepEqual(decision, { granted: false, reason: "unverified" });
});

test("a grant with no application id is refused", () => {
  for (const applicationId of ["", "not-a-reference", 12345, null]) {
    const decision = parseAccessDecision(granted({ applicationId }), REFERENCE);
    assert.equal(decision.granted, false, String(applicationId));
  }
});

test("the reference is matched after normalising, so case and spacing do not matter", () => {
  const decision = parseAccessDecision(granted(), "  ax-7q2m4l9xz1 ");
  assert.equal(decision.granted, true);
  assert.equal(decision.applicant?.applicationId, REFERENCE);
});

test("an unreadable answer is treated as the service being unavailable, not as a refusal", () => {
  for (const body of ["", "not json", "{", "null", '"a string"', "[]"]) {
    const decision = parseAccessDecision(body, REFERENCE);
    assert.equal(decision.granted, false, body);
    assert.equal(decision.reason, "unavailable", body);
  }
});

test("a malformed reference is refused without a request being made", async () => {
  let called = false;
  const fetchImpl: typeof fetch = async () => { called = true; return new Response(granted()); };
  for (const reference of ["", "AX-123", "hello", "AX-7Q2M4L9XZ12"]) {
    const decision = await requestAccessDecision({ endpoint: "https://example.test", reference, fetchImpl });
    assert.deepEqual(decision, { granted: false, reason: "missing_reference" }, reference);
  }
  assert.equal(called, false, "nothing malformed should reach the endpoint");
});

test("the request sends the normalised reference and nothing else", async () => {
  let seen: { url: string; init: RequestInit | undefined } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(granted());
  };
  const decision = await requestAccessDecision({
    endpoint: "https://example.test/access",
    reference: " ax-7q2m4l9xz1 ",
    fetchImpl,
  });
  assert.equal(decision.granted, true);
  assert.equal(seen!.url, "https://example.test/access");
  assert.equal(seen!.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(seen!.init?.body)), { applicationId: REFERENCE });
  assert.equal(seen!.init?.credentials, "omit", "no ambient credentials ride along");
  assert.equal(seen!.init?.cache, "no-store", "a per-applicant verdict must not be cached");
});

test("a non-2xx answer is unavailable rather than a refusal", async () => {
  for (const status of [400, 401, 403, 429, 500, 502]) {
    const fetchImpl: typeof fetch = async () => new Response("", { status });
    const decision = await requestAccessDecision({ endpoint: "https://example.test", reference: REFERENCE, fetchImpl });
    assert.deepEqual(decision, { granted: false, reason: "unavailable" }, String(status));
  }
});

test("a network failure or timeout leaves the page locked", async () => {
  const offline: typeof fetch = async () => { throw new TypeError("offline"); };
  assert.deepEqual(
    await requestAccessDecision({ endpoint: "https://example.test", reference: REFERENCE, fetchImpl: offline }),
    { granted: false, reason: "unavailable" },
  );

  const hangs: typeof fetch = (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  assert.deepEqual(
    await requestAccessDecision({ endpoint: "https://example.test", reference: REFERENCE, fetchImpl: hangs, timeoutMs: 5 }),
    { granted: false, reason: "unavailable" },
  );
});

test("every failure has copy the applicant can act on, and none of it leaks", () => {
  for (const [reason, copy] of Object.entries(ACCESS_COPY) as [AccessFailure, string][]) {
    assert.ok(copy.length > 30, `${reason} needs a real message`);
    assert.doesNotMatch(copy, /undefined|null/, `${reason} copy is clean`);
    assert.doesNotMatch(
      copy,
      /declined|does not exist|no such|not found/i,
      `${reason} must not reveal anything about a particular application`,
    );
  }
});

test("the refusal names both reasons, because the server will not say which", () => {
  // Naming only one would either mislead the applicant or, if it were the true
  // one, tell a stranger whether a particular application exists.
  assert.match(ACCESS_COPY.unverified, /not one we recognise/i);
  assert.match(ACCESS_COPY.unverified, /Business Readiness Questionnaire is not complete/i);
});

// The page is a component, so its gating is asserted from the source: these are
// the properties that make the gate a gate rather than a decoration.
test("the page renders nothing about an application until the server has granted access", async () => {
  const source = await readFile(new URL("../pages/ScheduleStrategicReview.tsx", import.meta.url), "utf8");
  assert.match(source, /useState<AccessPhase>\("checking"\)/, "the page starts closed, not open");
  assert.match(source, /if \(phase !== "granted"\) \{/, "everything else is behind the granted phase");
  assert.match(source, /await verifyStrategicReviewAccess\(/, "the verdict comes from the server");
  assert.ok(
    source.indexOf('if (phase !== "granted")') < source.indexOf("<StrategicReviewBookingPanel"),
    "the lock must return before the scheduler is ever rendered",
  );
  assert.doesNotMatch(
    source,
    /setPhase\("granted"\)[\s\S]{0,200}handoff/,
    "a same-tab handoff must not be able to open the page on its own",
  );
});

test("the client asks Mission Control's Stage 3 gate, not the deprecated Make scenario", async () => {
  // The EU Make hook answered `200 Accepted` and decided nothing, which this
  // page reads as "unavailable": every applicant was refused.
  const source = await readFile(new URL("./strategicReviewAccessClient.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /STAGE_THREE_ACCESS_URL = `\$\{MISSION_CONTROL_URL\}\/api\/public\/storefront\/strategic-review-access`/,
  );
  assert.doesNotMatch(source, /make\.com/);
});

test("Mission Control's answers read as the page expects", () => {
  // aurixa-mission-control src/routes/api.public.storefront.strategic-review-access.ts
  const grant = parseAccessDecision(
    JSON.stringify({
      ok: true,
      applicant: {
        applicationId: REFERENCE,
        firstName: "Ada",
        lastName: "Lovelace",
        workEmail: "ada@example.test",
        organisationName: "Analytical Engines",
      },
    }),
    REFERENCE,
  );
  assert.equal(grant.granted, true);
  for (const reason of ["not_granted", "invalid_reference"]) {
    assert.deepEqual(parseAccessDecision(JSON.stringify({ ok: false, reason }), REFERENCE), {
      granted: false,
      reason: "unverified",
    });
  }
});
