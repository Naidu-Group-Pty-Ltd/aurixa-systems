import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANNUAL_DISCOUNT,
  COMMITMENT_DISCOUNT_BPS,
  annualCents,
  annualSavingPercent,
  commitmentDiscountCents,
  isQuotedPlan,
  planAnnualCents,
  type PlanPricing,
} from "./commitmentDiscount";

const plan = (
  slug: string,
  price_cents: number,
  annual_price_cents?: number | null,
  seat_limit = 15,
): PlanPricing => ({
  slug,
  seat_limit,
  price_cents,
  metadata: annual_price_cents === undefined ? null : { annual_price_cents },
});

test("the commitment discount is 15% of the plan's price", () => {
  assert.equal(COMMITMENT_DISCOUNT_BPS, 1500);
  assert.equal(ANNUAL_DISCOUNT, 0.15);
});

/**
 * The figures Mission Control mints and every agreement states as its annual
 * prepayment, with and without AML/CTF. A fallback that drifts from them shows
 * one price while Stripe charges another.
 */
test("prices each tier's annual plan as Mission Control mints it, to the cent", () => {
  const minted: Array<[monthly: number, annual: number]> = [
    [99_900, 1_018_980],
    [84_900, 865_980],
    [139_900, 1_426_980],
    [124_900, 1_273_980],
    [269_900, 2_752_980],
    [254_900, 2_599_980],
  ];
  for (const [monthly, annual] of minted) assert.equal(annualCents(monthly), annual, `${monthly}`);
});

test("takes the discount off each month, to the cent, before adding up twelve", () => {
  // 15% of $123.45 is $18.5175, charged as $18.52 a month.
  assert.equal(commitmentDiscountCents(12_345), 1_852);
  assert.equal(annualCents(12_345), (12_345 - 1_852) * 12);
  // Discounting the year in one step lands three cents away.
  assert.equal(Math.round(12_345 * 12 * (1 - ANNUAL_DISCOUNT)), 125_919);
  assert.equal(annualCents(12_345), 125_916);
});

test("shows the annual price Mission Control minted, and calculates only without one", () => {
  assert.equal(planAnnualCents(plan("launch", 99_900, 1_018_980)), 1_018_980);
  // A price minted under the earlier 10% is what Stripe charges until it is
  // re-minted, so it is what the card shows.
  assert.equal(planAnnualCents(plan("launch", 99_900, 1_078_920)), 1_078_920);
  assert.equal(planAnnualCents(plan("launch", 99_900, null)), 1_018_980);
  assert.equal(planAnnualCents(plan("launch", 99_900)), 1_018_980);
});

test("claims the saving the cards show, not the policy", () => {
  const mintedAtTen = [
    plan("launch", 99_900, 1_078_920, 4),
    plan("growth", 139_900, 1_510_920, 15),
    plan("scale", 269_900, 2_914_920, 30),
  ];
  assert.equal(annualSavingPercent(mintedAtTen), 10);
  const mintedAtFifteen = [
    plan("launch", 99_900, 1_018_980, 4),
    plan("growth", 139_900, 1_426_980, 15),
    plan("scale", 269_900, 2_752_980, 30),
  ];
  assert.equal(annualSavingPercent(mintedAtFifteen), 15);
});

test("claims no saving while the cards disagree", () => {
  // Part-way through a re-mint: one tier repriced, another not yet.
  const mixed = [plan("launch", 99_900, 1_018_980, 4), plan("growth", 139_900, 1_510_920, 15)];
  assert.equal(annualSavingPercent(mixed), null);
});

test("gives a quoted plan no say, since its card shows no price", () => {
  const enterprise = plan("enterprise", 1_750_000, null, 999);
  assert.equal(isQuotedPlan(enterprise), true);
  assert.equal(isQuotedPlan(plan("custom", 500_000, null, 999)), true);
  assert.equal(isQuotedPlan(plan("scale", 269_900, null, 30)), false);
  // Its calculated annual figure would say 15% beside tiers still minted at
  // 10%, and hide the badge over a disagreement no card displays.
  assert.equal(annualSavingPercent([plan("launch", 99_900, 1_078_920, 4), enterprise]), 10);
});

test("states the policy when there is no listed price to read", () => {
  assert.equal(annualSavingPercent([]), 15);
  assert.equal(annualSavingPercent([plan("enterprise", 1_750_000, null, 999)]), 15);
  assert.equal(annualSavingPercent([plan("launch", 0, null, 4)]), 15);
});
