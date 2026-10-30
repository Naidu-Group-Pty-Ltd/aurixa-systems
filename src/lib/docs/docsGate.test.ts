/**
 * The documentation gate's behaviour, run rather than read.
 *
 * publicIndex.test.ts reads the corpus as source, to pin the two copies of its
 * tables together. These import it, which no client file may do (the bundle
 * test there checks that), so that the gate is exercised: what a workspace
 * that holds AML/CTF reads, what its agreement shuts, and what a locked
 * section says about where it is included.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANONYMOUS,
  DOCS_SECTIONS,
  canReadSection,
  deliverFor,
  type Viewer,
} from "../../../supabase/functions/_shared/docsCorpus.ts";

const section = (moduleSlug: string) => {
  const s = DOCS_SECTIONS.find((d) => d.moduleSlug === moduleSlug);
  assert.ok(s, `no section for ${moduleSlug}`);
  return s;
};

const viewer = (overrides: Partial<Viewer>): Viewer => ({
  ...ANONYMOUS,
  identified: true,
  planSlug: "launch",
  ...overrides,
});

/** What Mission Control's handoff says a Launch workspace with AML/CTF holds. */
const WITH_AML = [
  "accountant-portal",
  "aml-ctf",
  "builder-developer-portal",
  "finance-portal",
  "solicitor-portal",
];

test("a workspace that holds AML/CTF reads every partner portal's documentation", () => {
  const v = viewer({ addonSlugs: WITH_AML });
  for (const slug of ["finance-portal", "solicitor-portal", "accountant-portal", "builder-developer-portal"]) {
    assert.equal(canReadSection(section(slug), v), true, slug);
  }
});

test("without AML/CTF a portal stays an add-on, and its locked section says where it is included", () => {
  const v = viewer({ addonSlugs: [] });
  const delivered = deliverFor(v);
  for (const slug of ["solicitor-portal", "accountant-portal", "builder-developer-portal", "finance-portal"]) {
    const s = delivered.find((d) => d.moduleSlug === slug);
    assert.ok(s, slug);
    assert.equal(s.locked, true, slug);
    if (s.locked) {
      assert.equal(s.includedWithAml, true, slug);
      assert.equal(s.excludedByAgreement, false, slug);
      assert.deepEqual(s.blocks, [], `${slug} sends no body`);
    }
  }
  // A module AML/CTF does not bring says nothing of the kind.
  const market = delivered.find((d) => d.moduleSlug === "market-updates");
  assert.ok(market && market.locked);
  if (market.locked) assert.equal(market.includedWithAml, false);
});

test("a module the workspace's agreement excludes is shut, whatever the plan includes", () => {
  const scale = viewer({ planSlug: "scale", addonSlugs: [] });
  assert.equal(canReadSection(section("market-updates"), scale), true);
  const excluded = { ...scale, excludedSlugs: ["market-updates"] };
  assert.equal(canReadSection(section("market-updates"), excluded), false);
  const s = deliverFor(excluded).find((d) => d.moduleSlug === "market-updates");
  assert.ok(s && s.locked);
  if (s.locked) assert.equal(s.excludedByAgreement, true);
  // Even on a plan outside the matrix, which otherwise opens every section.
  const bespoke = viewer({ planSlug: "enterprise", excludedSlugs: ["aml-ctf"] });
  assert.equal(canReadSection(section("aml-ctf"), bespoke), false);
  assert.equal(canReadSection(section("market-updates"), bespoke), true);
});

test("an anonymous visitor reads no gated section, and is told of no exclusion", () => {
  for (const s of deliverFor(ANONYMOUS)) {
    if (s.moduleSlug === null) continue;
    assert.equal(s.locked, true, s.slug);
    if (s.locked) assert.equal(s.excludedByAgreement, false, s.slug);
  }
});
