/**
 * Wires the Stage 3 admission rules to the service that decides them.
 *
 * Only the endpoint lives here, so `strategicReviewAccess.ts` stays free of
 * anything a bundler has to resolve and its rules can be tested directly.
 */

import { MISSION_CONTROL_URL } from "./leads";
import { requestAccessDecision, type AccessDecision } from "./strategicReviewAccess";

/**
 * Mission Control's Stage 3 gate: looks a reference up and answers yes or no,
 * in the shape the Make scenario "Aurixa Stage 3 Access" answered with. That
 * scenario lived in the EU Make account, which is deprecated — its hook
 * answered `200 Accepted` and decided nothing, so every applicant was refused.
 */
export const STAGE_THREE_ACCESS_URL = `${MISSION_CONTROL_URL}/api/public/storefront/strategic-review-access`;

export function verifyStrategicReviewAccess(
  reference: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<AccessDecision> {
  return requestAccessDecision({ endpoint: STAGE_THREE_ACCESS_URL, reference, ...options });
}
