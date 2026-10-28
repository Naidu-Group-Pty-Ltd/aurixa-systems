/**
 * Ask Mission Control whether a `?trial=` code is a live trial offer.
 * The rules live in `trialOfferCode.ts`; this only fetches.
 */
import { MISSION_CONTROL_URL } from "./leads";
import { interpretTrialOfferResponse, type TrialOfferLookup } from "./trialOfferCode";

export async function lookupTrialOffer(
  code: string,
  signal?: AbortSignal,
): Promise<TrialOfferLookup> {
  try {
    const response = await fetch(
      `${MISSION_CONTROL_URL}/api/public/storefront/trial-offer?code=${encodeURIComponent(code)}`,
      { signal, headers: { Accept: "application/json" } },
    );
    const body = await response.json().catch(() => null);
    return interpretTrialOfferResponse(response.status, body);
  } catch {
    return { status: "unavailable" };
  }
}
