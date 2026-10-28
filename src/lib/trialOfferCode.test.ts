import assert from "node:assert/strict";
import { test } from "node:test";
import { FREE_TRIAL, FREE_TRIAL_DAYS, TRIAL_TERMS, freeTrialOf, trialTermsOf } from "./cta";
import { interpretTrialOfferResponse, trialCodeFromSearch, trialOfferNotice } from "./trialOfferCode";
import { EMPTY_WAITLIST_FORM, WAITLIST_COPY, buildWaitlistPayload, trialFormHeading, trialPreSubmit } from "./waitlist";

test("a ?trial= code is read and normalised as Mission Control stores it", () => {
  assert.equal(trialCodeFromSearch("?trial=partner-30"), "PARTNER-30");
  assert.equal(trialCodeFromSearch("?utm_source=x&trial=Expo%202027"), "EXPO-2027");
  assert.equal(trialCodeFromSearch(""), null);
  assert.equal(trialCodeFromSearch("?trial="), null);
  assert.equal(trialCodeFromSearch("?trial=%3Cscript%3E"), null);
  assert.equal(trialCodeFromSearch(`?trial=${"X".repeat(33)}`), null);
});

test("only an answer that states the whole offer shows a length", () => {
  const accepted = { ok: true, offer: { code: "PARTNER-30", label: "Partner referral", trial_days: 30 } };
  assert.deepEqual(interpretTrialOfferResponse(200, accepted), {
    status: "accepted",
    offer: { code: "PARTNER-30", label: "Partner referral", trialDays: 30 },
  });
  for (const offer of [
    { code: "PARTNER-30", label: "Partner referral", trial_days: 0 },
    { code: "PARTNER-30", label: "Partner referral", trial_days: 1.5 },
    { code: "PARTNER-30", label: "Partner referral", trial_days: 400 },
    { code: "partner", label: "Partner referral", trial_days: 30 },
    { code: "PARTNER-30", label: " ", trial_days: 30 },
    { code: "PARTNER-30", trial_days: 30 },
  ]) {
    assert.deepEqual(interpretTrialOfferResponse(200, { ok: true, offer }), { status: "unavailable" });
  }
});

test("a refusal keeps its reason, and anything else is unavailable", () => {
  assert.deepEqual(interpretTrialOfferResponse(200, { ok: false, reason: "expired" }), { status: "expired" });
  assert.deepEqual(interpretTrialOfferResponse(200, { ok: false, reason: "retired" }), { status: "retired" });
  assert.deepEqual(interpretTrialOfferResponse(200, { ok: false, reason: "unknown" }), { status: "unknown" });
  assert.deepEqual(interpretTrialOfferResponse(503, { ok: false, error: "unavailable" }), { status: "unavailable" });
  assert.deepEqual(interpretTrialOfferResponse(429, null), { status: "unavailable" });
  assert.deepEqual(interpretTrialOfferResponse(200, "nope"), { status: "unavailable" });
});

test("the visitor is told when a code did not apply, never when Mission Control was unreachable", () => {
  assert.match(trialOfferNotice({ status: "expired" }, FREE_TRIAL) ?? "", /has ended.*standard 14-day free trial/);
  assert.match(trialOfferNotice({ status: "unknown" }, FREE_TRIAL) ?? "", /not recognised/);
  assert.equal(trialOfferNotice({ status: "unavailable" }, FREE_TRIAL), null);
});

test("an offer reads exactly like the standard trial at its own length", () => {
  assert.equal(freeTrialOf(FREE_TRIAL_DAYS), FREE_TRIAL);
  assert.equal(trialTermsOf(FREE_TRIAL_DAYS), TRIAL_TERMS);
  assert.equal(trialFormHeading(FREE_TRIAL_DAYS), WAITLIST_COPY.heading);
  assert.equal(trialPreSubmit(FREE_TRIAL_DAYS), WAITLIST_COPY.preSubmit);
  assert.match(trialPreSubmit(30), /30-day trial begins the day that workspace goes live/);
});

test("the application carries an offer's code only when one applied", () => {
  const attribution = {} as Parameters<typeof buildWaitlistPayload>[2];
  const plain = buildWaitlistPayload(EMPTY_WAITLIST_FORM, "AX-0000000001", attribution);
  assert.equal("trialOfferCode" in plain, false, "an ordinary application's payload is unchanged");
  const offered = buildWaitlistPayload(EMPTY_WAITLIST_FORM, "AX-0000000001", attribution, "PARTNER-30");
  assert.equal(offered.trialOfferCode, "PARTNER-30");
});
