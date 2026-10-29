/**
 * Wires a completed Stage 2 questionnaire to the systems that need to know.
 *
 * Mission Control's lead capture is where the response is recorded: it moves
 * the applicant on, opens Stage 3 for them, and raises the "book your
 * strategic review" email. The applicant's result is its answer. The Stage 2
 * Make webhook this used to submit to lived in the EU Make account, which is
 * deprecated, so it is no longer called.
 *
 * Once Mission Control has accepted, the same document is copied to Aurixa's
 * own `capture-lead`, fire-and-forget: a failure there never reaches the
 * applicant.
 *
 * Everything configuration- or network-shaped lives here so
 * `readinessSubmission.ts` stays free of `import.meta.env` and its rules stay
 * testable outside a bundler.
 */

import { MISSION_CONTROL_LEAD_CAPTURE_URL, copyLeadToStorefront } from "./leads";
import {
  buildReadinessMirrorPayload,
  submitReadinessQuestionnaire,
  type ReadinessSubmissionResult,
} from "./readinessSubmission";

type SubmitInput = Omit<Parameters<typeof submitReadinessQuestionnaire>[0], "endpoint">;

/**
 * Submits the questionnaire to Mission Control and, once it has landed, copies
 * the same response to Aurixa's own store of record.
 */
export async function submitReadinessQuestionnaireWithMirrors(
  input: SubmitInput,
): Promise<ReadinessSubmissionResult> {
  const result = await submitReadinessQuestionnaire({
    ...input,
    endpoint: MISSION_CONTROL_LEAD_CAPTURE_URL,
  });
  if (!result.ok || !result.payload) return result;

  copyLeadToStorefront(buildReadinessMirrorPayload(result.payload), "Readiness capture-lead");
  return result;
}
