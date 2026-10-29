/**
 * Asks Mission Control whether a questionnaire link, or a reference with its
 * work email, opens the questionnaire. The rules live in
 * `missionControlQuestionnaireAccess.ts`; this only fetches.
 */
import { MISSION_CONTROL_URL } from "./leads";
import {
  QUESTIONNAIRE_ACCESS_PATH,
  interpretQuestionnaireAccess,
  type QuestionnaireAccessResult,
} from "./missionControlQuestionnaireAccess";

const TIMEOUT_MS = 10_000;

export async function checkQuestionnaireAccess(
  input: { applicationId: string; token: string } | { applicationId: string; workEmail: string },
): Promise<QuestionnaireAccessResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${MISSION_CONTROL_URL}${QUESTIONNAIRE_ACCESS_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    return interpretQuestionnaireAccess(response.status, body);
  } catch {
    // Network, timeout, CORS: Mission Control did not answer. Not a refusal.
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
