import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "node:test";
import {
  VERIFIED_ACCESS_STORAGE_KEY,
  clearVerifiedAccess,
  interpretQuestionnaireAccess,
  isWellFormedLink,
  readMissionControlLink,
  readVerifiedAccess,
  rememberVerifiedAccess,
} from "./missionControlQuestionnaireAccess";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const NOW = Date.parse("2026-10-29T00:00:00.000Z");
const TOKEN = "q7Vb2X_kL9m-Rt4pZs8nWc1yHd6uJf3aE0oGiBxKvQ";
const url = (query: string) => new URL(`https://www.aurixasystems.com.au/questionnaire${query}`);
const MC_LINK = `?ref=AX-7Q2M4L9XZ1&token=${TOKEN}&expires=2026-11-19T00%3A00%3A00.000Z`;

let storage: MemoryStorage;
let originalWindow: typeof globalThis.window | undefined;
beforeEach(() => {
  originalWindow = globalThis.window;
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: storage } });
});
afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

test("a Mission Control link is the reference and the token together", () => {
  assert.deepEqual(readMissionControlLink(url(MC_LINK)), { applicationId: "AX-7Q2M4L9XZ1", token: TOKEN });
  // The reference is read as people type it.
  assert.deepEqual(readMissionControlLink(url(`?ref=ax7q2m4l9xz1&token=${TOKEN}`)), {
    applicationId: "AX-7Q2M4L9XZ1",
    token: TOKEN,
  });
});

test("anything else is left to the paths that already handle it", () => {
  // Make's link: a token with no reference.
  assert.equal(readMissionControlLink(url(`?token=${TOKEN}&expires=2026-11-19T00:00:00.000Z`)), null);
  // The resume link: a reference with no token.
  assert.equal(readMissionControlLink(url("?ref=AX-7Q2M4L9XZ1")), null);
  // Not a reference, or more than one of either.
  assert.equal(readMissionControlLink(url(`?ref=AX-123&token=${TOKEN}`)), null);
  assert.equal(readMissionControlLink(url(`?ref=AX-7Q2M4L9XZ1&token=${TOKEN}&token=${TOKEN}`)), null);
  assert.equal(readMissionControlLink(url(`?ref=AX-7Q2M4L9XZ1&reference=AX-7Q2M4L9XZ2&token=${TOKEN}`)), null);
});

test("well formed means a token-shaped token and one future expiry — and writes nothing", () => {
  const link = readMissionControlLink(url(MC_LINK))!;
  assert.equal(isWellFormedLink(link, url(MC_LINK), NOW), true);
  assert.equal(isWellFormedLink(link, url(MC_LINK), Date.parse("2026-11-20T00:00:00.000Z")), false);
  assert.equal(isWellFormedLink(link, url(`?ref=AX-7Q2M4L9XZ1&token=${TOKEN}`), NOW), false);
  assert.equal(isWellFormedLink({ ...link, token: "short" }, url(MC_LINK), NOW), false);
  assert.equal(storage.values.size, 0);
});

const APPLICANT = {
  applicationId: "AX-7Q2M4L9XZ1",
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@example.test",
  organisationName: "Analytical Engines",
  role: "founder_director",
  organisationType: "buyers_agent",
  annualVolume: "26_to_75",
};

test("a live link opens with the applicant Mission Control names", () => {
  assert.deepEqual(interpretQuestionnaireAccess(200, { ok: true, via: "link", applicant: APPLICANT }), {
    ok: true,
    prefill: APPLICANT,
    via: "link",
  });
  assert.equal(
    interpretQuestionnaireAccess(200, { ok: true, via: "reference", applicant: APPLICANT }).via,
    "reference",
  );
});

test("an answer that does not name the applicant is no answer", () => {
  for (const applicant of [
    { ...APPLICANT, workEmail: "" },
    { ...APPLICANT, applicationId: "not-a-reference" },
    null,
    "AX-7Q2M4L9XZ1",
  ]) {
    assert.deepEqual(interpretQuestionnaireAccess(200, { ok: true, applicant }), {
      ok: false,
      reason: "unavailable",
    });
  }
});

test("a refusal is passed on with what the page needs to say about it", () => {
  assert.deepEqual(interpretQuestionnaireAccess(200, { ok: false, reason: "expired", applicationId: "AX-7Q2M4L9XZ1" }), {
    ok: false,
    reason: "expired",
    applicationId: "AX-7Q2M4L9XZ1",
  });
  assert.deepEqual(
    interpretQuestionnaireAccess(200, {
      ok: false,
      reason: "already_completed",
      applicationId: "AX-7Q2M4L9XZ1",
      completedAt: "2026-10-28T12:00:00.000Z",
    }),
    { ok: false, reason: "already_completed", applicationId: "AX-7Q2M4L9XZ1", completedAt: "2026-10-28T12:00:00.000Z" },
  );
  assert.deepEqual(interpretQuestionnaireAccess(200, { ok: false, reason: "invalid_reference" }), {
    ok: false,
    reason: "invalid_reference",
  });
  assert.equal(interpretQuestionnaireAccess(200, { ok: false, reason: "invalid_token" }).reason, "invalid_token");
});

test("anything Mission Control did not say in so many words is unavailable, never a refusal", () => {
  assert.equal(interpretQuestionnaireAccess(503, { ok: false, error: "unavailable" }).reason, "unavailable");
  assert.equal(interpretQuestionnaireAccess(500, null).reason, "unavailable");
  assert.equal(interpretQuestionnaireAccess(200, null).reason, "unavailable");
  assert.equal(interpretQuestionnaireAccess(200, { ok: false, reason: "something_new" }).reason, "unavailable");
  assert.equal(interpretQuestionnaireAccess(404, "<html>").reason, "unavailable");
  // Too many attempts is its own answer.
  assert.equal(interpretQuestionnaireAccess(429, { ok: false, error: "rate_limited" }).reason, "throttled");
  assert.equal(interpretQuestionnaireAccess(200, { ok: false, error: "rate_limited" }).reason, "throttled");
});

test("a verified way in is remembered for its own application only", () => {
  rememberVerifiedAccess("AX-7Q2M4L9XZ1", "link");
  assert.equal(readVerifiedAccess("AX-7Q2M4L9XZ1"), "link");
  // Another application's handoff is not vouched for by this marker — and the
  // stale marker is dropped.
  assert.equal(readVerifiedAccess("AX-0000000001"), null);
  assert.equal(storage.getItem(VERIFIED_ACCESS_STORAGE_KEY), null);

  rememberVerifiedAccess("AX-7Q2M4L9XZ1", "reference");
  clearVerifiedAccess();
  assert.equal(readVerifiedAccess("AX-7Q2M4L9XZ1"), null);

  storage.setItem(VERIFIED_ACCESS_STORAGE_KEY, "{not json");
  assert.equal(readVerifiedAccess("AX-7Q2M4L9XZ1"), null);
  storage.setItem(VERIFIED_ACCESS_STORAGE_KEY, JSON.stringify({ applicationId: "AX-7Q2M4L9XZ1", via: "magic" }));
  assert.equal(readVerifiedAccess("AX-7Q2M4L9XZ1"), null);
});

test("the questionnaire asks Mission Control before anything else reads the link", async () => {
  const source = await readFile(new URL("../pages/Questionnaire.tsx", import.meta.url), "utf8");
  const effect = source.slice(source.indexOf("const missionControlLink = readMissionControlLink(url);"));
  assert.ok(effect.length > 0, "the page reads a Mission Control link");
  assert.ok(
    effect.indexOf("void openMissionControlLink(missionControlLink, wellFormedLink);") <
      effect.indexOf("const linkAccess = resolveQuestionnaireLink(url);"),
    "a Mission Control link is checked before the shape-only path",
  );
  // The shape check that writes a link session is not used to judge a
  // Mission Control link: a stored session would reopen the page anonymously.
  assert.match(source, /const wellFormedLink = missionControlLink !== null && isWellFormedLink\(missionControlLink, url\);/);
  // The reference form asks Mission Control first, and the undeployed service
  // only when Mission Control could not answer.
  const resume = source.slice(source.indexOf("const resumeByReference = useCallback("));
  assert.ok(resume.indexOf("await checkQuestionnaireAccess(") < resume.indexOf("await resumeQuestionnaireByReference("));
  assert.match(resume, /if \(checked\.reason !== "unavailable"\) return "invalid_reference";/);
  // The submission says whether the way in was verified.
  assert.match(source, /accessVerified: verifiedRef\.current,/);
});
