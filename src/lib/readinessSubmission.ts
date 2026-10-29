import {
  AnswerMap,
  Q,
  QUESTIONNAIRE_VERSION,
  ReviewSection,
  StoredAnswer,
  buildCompletionPayload,
  buildReviewSections,
} from "./readinessQuestionnaire";
import type { ReadinessPrefill } from "./readinessQuestionnaireService";

const SUBMISSION_TYPE = "business_readiness_questionnaire" as const;
const SUBMISSION_SOURCE = "Aurixa Business Readiness Questionnaire" as const;
const SUBMISSION_PAGE = "/questionnaire" as const;
const DEFAULT_TIMEOUT_MS = 20_000;

export type ReadinessSubmissionFields = {
  role: string;
  authority: string;
  authorityOther: string;
  userCount: string;
  entityStructure: string;
  regions: string[];
  systems: string[];
  systemsOther: string;
  informationManagement: string[];
  informationManagementOther: string;
  problems: string[];
  problemsOther: string;
  adminTime: string;
  difficultWorkflow: string;
  capabilities: string[];
  integrations: string[];
  phoneSystem: string;
  customSystemName: string;
  customSystemApi: string;
  customSystemOwner: string;
  customSystemWorkflow: string;
  migration: string;
  migrationSources: string;
  migrationRecords: string;
  migrationDocuments: string;
  migrationQuality: string;
  migrationTiming: string;
  timing: string;
  security: string[];
  securityContext: string;
  enterpriseSso: string;
  enterpriseBoundaries: string;
  enterpriseProcurement: string;
  nextStep: string;
  investmentRange: string;
  projectSponsor: string;
};

/**
 * How the applicant reached Stage 2. Mirrors the Airtable "Stage 2 Access
 * Method" options exactly — the Make scenario maps this value straight through,
 * so an expired-link recovery is visible in the operations record instead of
 * looking like a normal submission.
 */
export type StageTwoAccessMode =
  | "Secure link (token)"
  | "Application ID fallback"
  | "Same-session handoff"
  | "Manual entry";

export type ReadinessSubmissionPayload = {
  submissionType: typeof SUBMISSION_TYPE;
  source: typeof SUBMISSION_SOURCE;
  page: typeof SUBMISSION_PAGE;
  applicationId: string;
  questionnaireVersion: string;
  responseVersion: number;
  submittedAt: string;
  accessMode: StageTwoAccessMode;
  /**
   * The `token` value the browser was shown, verbatim, or "" when the applicant
   * arrived some other way.
   *
   * It is forwarded so the Make scenario can check it against the tokens it
   * issued. Until now the token never left the browser, which meant nothing
   * downstream could tell a genuine link from a fabricated one — see
   * `accessVerified` below.
   */
  accessTokenPresented: string;
  /**
   * Whether anything actually *verified* the way in, as opposed to checking its
   * shape. `true` only when Mission Control answered for it: its own link from
   * the Stage 1 email (it keeps the token's hash), or the application
   * reference with the work email it was filed under
   * (`missionControlQuestionnaireAccess.ts`). A Make link is still only
   * shape-checked by `resolveQuestionnaireLink`, and a Stage 1 handoff in the
   * same tab was never checked by a server, so both stay `false`.
   *
   * Kept as an explicit field rather than left implicit so the operations
   * record never asserts something the code cannot support.
   */
  accessVerified: boolean;
  applicant: ReadinessPrefill;
  fields: ReadinessSubmissionFields;
  answers: StoredAnswer[];
  activeConditionalQuestionIds: string[];
  reviewSections: ReviewSection[];
  summaryText: string;
  rawResponseJson: string;
};

export type ReadinessSubmissionResult = {
  ok: boolean;
  applicationId?: string;
  completedAt?: string;
  /**
   * What was submitted. Returned so a caller can copy the same document to
   * Aurixa's own `capture-lead` once Mission Control has accepted it, without
   * rebuilding it (and stamping a second, different `submittedAt` in the
   * process).
   */
  payload?: ReadinessSubmissionPayload;
  /**
   * `already_completed` is the one outcome about the application itself,
   * answered as `{"error":"already_completed"}` when a response is already on
   * file for it. Everything else describes the transport.
   */
  reason?: "already_completed" | "http_error" | "network_error" | "timeout" | "invalid_response";
};

type SubmitReadinessInput = {
  /** Where the response is recorded: Mission Control's lead capture. */
  endpoint: string;
  applicationId: string;
  answers: AnswerMap;
  responseVersion: number;
  prefill: ReadinessPrefill;
  accessMode?: StageTwoAccessMode | string;
  /** The raw `token` query value the browser accepted, for downstream checking. */
  accessTokenPresented?: string;
  /** Whether Mission Control verified the way in. See the payload field. */
  accessVerified?: boolean;
  /** Test seam; production always uses the browser fetch implementation. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

const itemMap = (sections: ReviewSection[]) =>
  new Map(sections.flatMap((section) => section.items).filter((item) => item.answered).map((item) => [item.questionId, item]));

const buildFields = (sections: ReviewSection[]): ReadinessSubmissionFields => {
  const items = itemMap(sections);
  const one = (id: string) => items.get(id)?.values.join(", ") ?? "";
  const many = (id: string) => items.get(id)?.values ?? [];
  const ranked = (id: string) => many(id).map((value, index) => `${index + 1}. ${value}`);

  return {
    role: one(Q.role), authority: one(Q.authority), authorityOther: one(Q.authorityOther),
    userCount: one(Q.userCount), entityStructure: one(Q.entityStructure), regions: many(Q.regions),
    systems: many(Q.systems), systemsOther: one(Q.systemsOther),
    informationManagement: many(Q.informationManagement),
    informationManagementOther: one(Q.informationManagementOther), problems: many(Q.problems),
    problemsOther: one(Q.problemsOther), adminTime: one(Q.adminTime),
    difficultWorkflow: one(Q.difficultWorkflow), capabilities: ranked(Q.capabilities),
    integrations: many(Q.integrations), phoneSystem: one(Q.phoneSystem),
    customSystemName: one(Q.customSystemName), customSystemApi: one(Q.customSystemApi),
    customSystemOwner: one(Q.customSystemOwner), customSystemWorkflow: one(Q.customSystemWorkflow),
    migration: one(Q.migration), migrationSources: one(Q.migrationSources),
    migrationRecords: one(Q.migrationRecords), migrationDocuments: one(Q.migrationDocuments),
    migrationQuality: one(Q.migrationQuality), migrationTiming: one(Q.migrationTiming),
    timing: one(Q.timing), security: many(Q.security), securityContext: one(Q.securityContext),
    enterpriseSso: one(Q.enterpriseSso), enterpriseBoundaries: one(Q.enterpriseBoundaries),
    enterpriseProcurement: one(Q.enterpriseProcurement), nextStep: one(Q.nextStep),
    investmentRange: one(Q.investmentRange), projectSponsor: one(Q.projectSponsor),
  };
};

export const buildSummaryText = (sections: ReviewSection[]): string =>
  sections
    .filter((section) => section.items.some((item) => item.answered))
    .map((section) => {
      const answers = section.items.filter((item) => item.answered).map((item) => {
        const value = item.ranked
          ? item.values.map((label, index) => `${index + 1}. ${label}`).join("\n")
          : item.values.join(", ");
        return `${item.question}\n${value}`;
      });
      return `${section.title.toUpperCase()}\n\n${answers.join("\n\n")}`;
    })
    .join("\n\n--------------------------------------------------\n\n");

export function buildReadinessSubmissionPayload(input: Omit<SubmitReadinessInput, "endpoint" | "fetchImpl" | "timeoutMs">): ReadinessSubmissionPayload {
  const submittedAt = (input.now?.() ?? new Date()).toISOString();
  const completion = buildCompletionPayload(input.applicationId, input.answers, input.responseVersion);
  const reviewSections = buildReviewSections(input.answers);
  const responseDocument = {
    ...completion,
    submissionType: SUBMISSION_TYPE,
    source: SUBMISSION_SOURCE,
    page: SUBMISSION_PAGE,
    submittedAt,
    // `accessMode` deliberately keeps its existing values and its existing
    // default: it feeds an Airtable single-select, and an option that field has
    // never seen can fail the write. The honesty lives in the two new fields
    // beside it, which Make ignores until somebody maps them.
    accessMode: (input.accessMode as StageTwoAccessMode) ?? "Secure link (token)",
    accessTokenPresented: input.accessTokenPresented ?? "",
    accessVerified: input.accessVerified === true,
    applicant: { ...input.prefill },
    fields: buildFields(reviewSections),
    reviewSections,
    summaryText: buildSummaryText(reviewSections),
  };

  return { ...responseDocument, rawResponseJson: JSON.stringify(responseDocument) };
}

/**
 * Flattens a completed Stage 2 response into the shape the lead stores expect.
 *
 * `capture-lead` and Mission Control both read the applicant's identity from
 * the top level of the body; this payload keeps it nested under `applicant`,
 * which is why neither system has ever recorded a questionnaire completion.
 * The answers themselves ride along unchanged so the operator console can show
 * what the applicant actually said.
 *
 * `rawResponseJson` is dropped: it is a stringified copy of everything else in
 * the document, which arrives field by field.
 */
export function buildReadinessMirrorPayload(
  payload: ReadinessSubmissionPayload,
): Record<string, unknown> {
  const { rawResponseJson: _raw, ...document } = payload;
  const applicant = payload.applicant;
  const firstName = (applicant.firstName ?? "").trim();
  const lastName = (applicant.lastName ?? "").trim();

  return {
    ...document,
    // Identity, where the lead stores look for it.
    email: (applicant.workEmail ?? "").trim().toLowerCase(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    company: (applicant.organisationName ?? "").trim(),
    // The questionnaire is the applicant's own account of their operation —
    // a far better `message` than anything assembled from the form.
    message: payload.summaryText,
    completedAt: payload.submittedAt,
    completionStatus: "Completed",
    // The buying signals, lifted out of `fields` so a consumer that does not
    // understand the answer schema can still read them.
    nextStep: payload.fields.nextStep,
    investmentRange: payload.fields.investmentRange,
    timing: payload.fields.timing,
  };
}

const validDate = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));

/**
 * Records a completed questionnaire in Mission Control, which raises the
 * Stage 2 emails. The applicant's result is Mission Control's answer: landed
 * (`{ ok: true }`, a retried delivery included), refused, or not reached.
 */
export async function submitReadinessQuestionnaire(input: SubmitReadinessInput): Promise<ReadinessSubmissionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const payload = buildReadinessSubmissionPayload(input);

  try {
    const response = await (input.fetchImpl ?? fetch)(input.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Application-Id": input.applicationId },
      body: JSON.stringify(buildReadinessMirrorPayload(payload)),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "http_error" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(await response.text());
    } catch {
      return { ok: false, reason: "invalid_response" };
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "invalid_response" };
    const result = parsed as Record<string, unknown>;
    // A second submission for the same application is a real answer, not a
    // malformed one: the page has an "already submitted" screen for it.
    if (result.error === "already_completed") return { ok: false, reason: "already_completed" };
    if (result.ok !== true) return { ok: false, reason: "invalid_response" };
    return { ok: true, applicationId: input.applicationId, completedAt: payload.submittedAt, payload };
  } catch (error) {
    return { ok: false, reason: controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError") ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}
