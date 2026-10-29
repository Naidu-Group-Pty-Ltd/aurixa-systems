import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AnswerMap, Q } from "./readinessQuestionnaire";
import {
  MAKE_READINESS_WEBHOOK_URL,
  buildReadinessMirrorPayload,
  buildReadinessSubmissionPayload,
  submitReadinessQuestionnaire,
} from "./readinessSubmission";

const applicationId = "AX-0123456789";
const prefill = {
  applicationId,
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@example.test",
  organisationName: "Analytical Engines",
  role: "founder_director",
  organisationType: "property_services",
  annualVolume: "50_to_100",
};
const answers = (): AnswerMap => ({
  [Q.role]: "founder_director",
  [Q.roleOther]: "Inactive former role",
  [Q.authority]: "other",
  [Q.authorityOther]: "I chair the purchasing committee",
  [Q.userCount]: "4_to_10",
  [Q.entityStructure]: "single_office",
  [Q.regions]: ["nsw", "vic"],
  [Q.systems]: ["crm", "reporting"],
  [Q.problems]: ["duplicate_entry", "manual_reports"],
  [Q.adminTime]: "5_to_10_hours",
  [Q.capabilities]: ["report_generation", "crm", "cashflow_portfolio_analysis", "suburb_market_reporting", "calendar_task_automation"],
  [Q.integrations]: ["microsoft_365"],
  [Q.migration]: "no",
  [Q.timing]: "3_to_6_months",
  [Q.security]: ["mfa"],
  [Q.nextStep]: "general_demonstration",
});
const input = () => ({ applicationId, prefill, answers: answers(), responseVersion: 1, now: () => new Date("2026-07-29T12:00:00.000Z") });

test("uses the dedicated Stage 2 Make webhook", () => {
  assert.equal(MAKE_READINESS_WEBHOOK_URL, "https://hook.eu2.make.com/kbxnu4e130wxe42q3xgprij28sofddvk");
});

test("payload includes the existing ID, Stage 1 prefill, raw answers and readable labels", () => {
  const payload = buildReadinessSubmissionPayload(input());
  assert.equal(payload.applicationId, applicationId);
  assert.deepEqual(payload.applicant, prefill);
  assert.ok(payload.answers.some((answer) => answer.questionId === Q.adminTime && answer.value === "5_to_10_hours"));
  assert.equal(payload.fields.adminTime, "5-10 hours");
  assert.match(payload.summaryText, /Approximately how much time.*\n5-10 hours/);
});

test("ranked capabilities retain selection order and receive readable rank prefixes", () => {
  const payload = buildReadinessSubmissionPayload(input());
  assert.deepEqual(payload.fields.capabilities, [
    "1. Report generation", "2. CRM", "3. Cash-flow and portfolio analysis",
    "4. Suburb and market reporting", "5. Calendar and task automation",
  ]);
  assert.ok(payload.summaryText.indexOf("1. Report generation") < payload.summaryText.indexOf("2. CRM"));
});

test("summary and fields contain active conditional answers but exclude inactive ones", () => {
  const payload = buildReadinessSubmissionPayload(input());
  assert.equal(payload.fields.authorityOther, "I chair the purchasing committee");
  assert.match(payload.summaryText, /I chair the purchasing committee/);
  assert.doesNotMatch(payload.summaryText, /Inactive former role/);
  assert.ok(payload.answers.some((answer) => answer.questionId === Q.roleOther && answer.active === false));
});

test("rawResponseJson is valid, complete structured JSON without recursion", () => {
  const payload = buildReadinessSubmissionPayload(input());
  const raw = JSON.parse(payload.rawResponseJson);
  assert.equal(raw.applicationId, applicationId);
  assert.deepEqual(raw.answers, payload.answers);
  assert.equal(raw.rawResponseJson, undefined);
});

test("submission posts JSON with the Application ID header and accepts verified Make details", async () => {
  let requestUrl = "";
  let request: RequestInit | undefined;
  const result = await submitReadinessQuestionnaire({
    ...input(),
    fetchImpl: async (url, init) => {
      requestUrl = String(url); request = init;
      return new Response(JSON.stringify({ success: true, applicationId, completedAt: "2026-07-29T12:30:00.000Z" }), { status: 200 });
    },
  });
  assert.equal(requestUrl, MAKE_READINESS_WEBHOOK_URL);
  assert.equal(request?.method, "POST");
  assert.equal((request?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.equal((request?.headers as Record<string, string>)["X-Application-Id"], applicationId);
  assert.equal(JSON.parse(String(request?.body)).applicationId, applicationId);
  assert.deepEqual(
    { ok: result.ok, applicationId: result.applicationId, completedAt: result.completedAt },
    { ok: true, applicationId, completedAt: "2026-07-29T12:30:00.000Z" },
  );
});

test("an empty successful Make acknowledgement is handled without crashing", async () => {
  const result = await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response("", { status: 200 }) });
  assert.deepEqual(
    { ok: result.ok, applicationId: result.applicationId, completedAt: result.completedAt },
    { ok: true, applicationId, completedAt: "2026-07-29T12:00:00.000Z" },
  );
});

test("Make's own one-word acknowledgement is a submission that landed", async () => {
  // The Stage 2 scenario has no "Webhook response" module, so "Accepted" is
  // every answer it gives. Read as malformed, it told applicants their answers
  // had not arrived.
  for (const reply of ["Accepted", "accepted", "Accepted\n"]) {
    const result = await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response(reply, { status: 200 }) });
    assert.deepEqual(
      { ok: result.ok, applicationId: result.applicationId, completedAt: result.completedAt },
      { ok: true, applicationId, completedAt: "2026-07-29T12:00:00.000Z" },
      reply,
    );
  }
  // Only the word itself: a sentence that merely contains it is still malformed.
  const prose = await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response("Accepted with errors", { status: 200 }) });
  assert.equal(prose.reason, "invalid_response");
});

test("the submission says whether the way in was verified, and says no unless told", () => {
  assert.equal(buildReadinessSubmissionPayload(input()).accessVerified, false);
  assert.equal(buildReadinessSubmissionPayload({ ...input(), accessVerified: true }).accessVerified, true);
  assert.equal(JSON.parse(buildReadinessSubmissionPayload({ ...input(), accessVerified: true }).rawResponseJson).accessVerified, true);
});

test("non-2xx, network and malformed responses fail safely", async () => {
  assert.equal((await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response("no", { status: 500 }) })).reason, "http_error");
  assert.equal((await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => { throw new TypeError("offline"); } })).reason, "network_error");
  assert.equal((await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response("not json", { status: 200 }) })).reason, "invalid_response");
  assert.equal((await submitReadinessQuestionnaire({ ...input(), fetchImpl: async () => new Response(JSON.stringify({ success: true, applicationId: "AX-WRONG", completedAt: "invalid" }), { status: 200 }) })).reason, "invalid_response");
});

test("a duplicate submission is reported as already completed, not as a broken response", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ error: "already_completed" }), { status: 200 });
  const result = await submitReadinessQuestionnaire({ ...input(), fetchImpl });
  assert.deepEqual(result, { ok: false, reason: "already_completed" });
});

test("every access mode reaches the webhook with its access mode attached", async () => {
  for (const accessMode of [
    "Secure link (token)",
    "Application ID fallback",
    "Same-session handoff",
    "Manual entry",
  ] as const) {
    let seen: { url: string; body: string } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      seen = { url: String(url), body: String(init?.body ?? "") };
      return new Response("", { status: 200 });
    };
    const result = await submitReadinessQuestionnaire({ ...input(), accessMode, fetchImpl });
    assert.equal(result.ok, true, accessMode);
    assert.equal(seen!.url, MAKE_READINESS_WEBHOOK_URL, accessMode);
    assert.equal(JSON.parse(seen!.body).accessMode, accessMode);
  }
});

test("a request exceeding the timeout is aborted and fails as a timeout", async () => {
  const fetchImpl: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  const result = await submitReadinessQuestionnaire({ ...input(), fetchImpl, timeoutMs: 5 });
  assert.deepEqual(result, { ok: false, reason: "timeout" });
});

test("the page submits every access mode through the webhook, once, with the access mode", async () => {
  const source = await readFile(new URL("../pages/Questionnaire.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(isSubmitting \|\| !session\) return/);
  assert.match(source, /const result = await submitReadinessQuestionnaireWithMirrors\(\{/);
  assert.match(source, /accessMode: accessModeRef\.current,/);
  assert.doesNotMatch(
    source,
    /session\.access === "handoff"\s*\?/,
    "the transport must not branch on access mode — a token session submits the same way",
  );
  assert.doesNotMatch(source, /await completeQuestionnaire\(/, "the undeployed edge function is no longer the transport");
  assert.match(source, /if \(!result\.ok \|\| !result\.completedAt\)[\s\S]*setSubmissionError[\s\S]*return;/);
  assert.match(source, /if \(session\.access === "handoff"\) endHandoffSession\(\);/);
  assert.ok(source.indexOf("endHandoffSession();") > source.indexOf("if (!result.ok || !result.completedAt)"));
});

test("a successful submission returns what it sent, so it can be mirrored onward", async () => {
  const result = await submitReadinessQuestionnaire({
    ...input(),
    fetchImpl: (async () => ({ ok: true, status: 200, text: async () => "" }) as Response) as typeof fetch,
  });
  assert.equal(result.ok, true);
  assert.equal(result.payload?.applicationId, applicationId);
  assert.equal(result.payload?.submittedAt, result.completedAt);
});

test("the mirror payload lifts the applicant's identity to the top level", () => {
  // `capture-lead` and Mission Control both read the applicant from the top of
  // the body. This document keeps it under `applicant`, which is why neither
  // system had ever recorded a completed questionnaire.
  const mirror = buildReadinessMirrorPayload(buildReadinessSubmissionPayload(input()));
  assert.equal(mirror.email, "ada@example.test");
  assert.equal(mirror.firstName, "Ada");
  assert.equal(mirror.lastName, "Lovelace");
  assert.equal(mirror.name, "Ada Lovelace");
  assert.equal(mirror.company, "Analytical Engines");
  assert.equal(mirror.applicationId, applicationId);
  assert.equal(mirror.submissionType, "business_readiness_questionnaire");
});

test("the mirror payload carries the buying signals and the completion stamp", () => {
  const payload = buildReadinessSubmissionPayload(input());
  const mirror = buildReadinessMirrorPayload(payload);
  assert.equal(mirror.completionStatus, "Completed");
  assert.equal(mirror.completedAt, payload.submittedAt);
  assert.equal(mirror.nextStep, payload.fields.nextStep);
  assert.equal(mirror.investmentRange, payload.fields.investmentRange);
  assert.equal(mirror.timing, payload.fields.timing);
  assert.equal(mirror.message, payload.summaryText);
});

test("the mirror payload drops the stringified duplicate of itself", () => {
  const mirror = buildReadinessMirrorPayload(buildReadinessSubmissionPayload(input()));
  assert.equal("rawResponseJson" in mirror, false);
  assert.ok(Array.isArray(mirror.answers), "the answers themselves still travel");
});
