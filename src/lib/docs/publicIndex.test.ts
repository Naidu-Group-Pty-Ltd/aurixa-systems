/**
 * The public index and the server-side corpus must describe the same sections.
 *
 * They are separate files on purpose — the index is bundled and public, the
 * corpus is server-only so that a locked body is never shipped to the browser.
 * The cost of that separation is drift, and drift here is not cosmetic: an
 * index entry with no corpus section advertises documentation the server will
 * not serve, and a corpus section missing from the index is invisible to
 * anonymous visitors and to search engines.
 *
 * These tests also pin the gate's behaviour in both directions, because "shows
 * too much" and "shows too little" are both failures and only one of them is
 * obvious in review.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_DOCS_INDEX, PUBLIC_DOCS_GROUPS, MODULE_TIERS, availabilityLabel } from "./publicIndex.ts";
import { MOCK_MODULES } from "../pricing/mockCatalog.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const CORPUS_FILES = [
  "supabase/functions/_shared/docsCorpus.foundations.ts",
  "supabase/functions/_shared/docsCorpus.clients.ts",
  "supabase/functions/_shared/docsCorpus.platform.ts",
];

/** Section slugs declared in the server-side corpus. */
function corpusSlugs(): string[] {
  const out: string[] = [];
  for (const file of CORPUS_FILES) {
    for (const m of read(file).matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)) out.push(m[1]);
  }
  return out;
}

/** moduleSlug values declared in the corpus, paired with their section. */
function corpusModules(): Array<{ slug: string; moduleSlug: string | null }> {
  const out: Array<{ slug: string; moduleSlug: string | null }> = [];
  for (const file of CORPUS_FILES) {
    const src = read(file);
    const re = /^\s{4}slug: "([a-z0-9-]+)",[\s\S]*?^\s{4}moduleSlug: (null|"[a-z0-9-]+"),$/gm;
    for (const m of src.matchAll(re)) {
      out.push({ slug: m[1], moduleSlug: m[2] === "null" ? null : m[2].replace(/"/g, "") });
    }
  }
  return out;
}

/**
 * The corpus's gate table, `MODULE_TIERS` in docsCorpus.ts: module slug → the
 * tiers that include it. Read from the source, as the sections are, because
 * the corpus is server-only and must not be imported here.
 */
function corpusGate(): Record<string, string[]> {
  const src = read("supabase/functions/_shared/docsCorpus.ts");
  const body = src.split("export const MODULE_TIERS")[1]?.split("\n};")[0] ?? "";
  const out: Record<string, string[]> = {};
  for (const m of body.matchAll(/^\s{2}"?([a-z0-9-]+)"?: \[([^\]]*)\],$/gm)) {
    out[m[1]] = [...m[2].matchAll(/"([a-z]+)"/g)].map((t) => t[1]);
  }
  return out;
}

test("the corpus parses and is substantial", () => {
  const slugs = corpusSlugs();
  assert.ok(slugs.length > 40, `expected a large corpus, parsed ${slugs.length} sections`);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate slug in the corpus");
});

test("every corpus section appears in the public index", () => {
  const indexed = new Set(PUBLIC_DOCS_INDEX.map((e) => e.slug));
  const missing = corpusSlugs().filter((s) => !indexed.has(s));
  assert.deepEqual(missing, [], `sections the index does not advertise: ${missing.join(", ")}`);
});

test("every index entry has a corpus section behind it", () => {
  const inCorpus = new Set(corpusSlugs());
  const orphan = PUBLIC_DOCS_INDEX.filter((e) => !inCorpus.has(e.slug)).map((e) => e.slug);
  assert.deepEqual(orphan, [], `index advertises sections the server cannot serve: ${orphan.join(", ")}`);
});

test("index and corpus agree on which sections are gated", () => {
  const byCorpus = new Map(corpusModules().map((r) => [r.slug, r.moduleSlug]));
  const disagree: string[] = [];
  for (const entry of PUBLIC_DOCS_INDEX) {
    if (!byCorpus.has(entry.slug)) continue;
    if (byCorpus.get(entry.slug) !== entry.moduleSlug) {
      disagree.push(`${entry.slug} (index=${entry.moduleSlug} corpus=${byCorpus.get(entry.slug)})`);
    }
  }
  // A mismatch here is the dangerous kind: the index could badge a section as
  // free while the corpus gates it, or worse, the reverse.
  assert.deepEqual(disagree, [], `gating disagreement: ${disagree.join("; ")}`);
});

test("every gated section names a module in the pricing catalogue", () => {
  // A moduleSlug the gate does not recognise fails closed in the corpus, which
  // would silently hide a section from paying customers. The gate's own table
  // is the list, so a module the price list adds needs one line, not two.
  const known = new Set(Object.keys(corpusGate()));
  const unknown = PUBLIC_DOCS_INDEX.filter(
    (e) => e.moduleSlug !== null && !known.has(e.moduleSlug),
  ).map((e) => `${e.slug} -> ${e.moduleSlug}`);
  assert.deepEqual(unknown, [], `unknown module slugs: ${unknown.join(", ")}`);
});

test("every section belongs to a declared group", () => {
  const groups = new Set<string>(PUBLIC_DOCS_GROUPS);
  const stray = PUBLIC_DOCS_INDEX.filter((e) => !groups.has(e.group)).map((e) => e.slug);
  assert.deepEqual(stray, [], `sections in an undeclared group: ${stray.join(", ")}`);
});

test("platform basics stay universal", () => {
  // Gating these would lock a paying customer out of "how do I sign in".
  for (const slug of [
    "getting-started",
    "navigation-and-search",
    "notifications",
    "overview",
    "client-management",
    "settings",
    "user-management",
    "troubleshooting",
    "billing-usage",
  ]) {
    const entry = PUBLIC_DOCS_INDEX.find((e) => e.slug === slug);
    assert.ok(entry, `${slug} missing from the index`);
    assert.equal(entry.moduleSlug, null, `${slug} must not be gated`);
  }
});

test("AML compliance is available on every plan", () => {
  // It is a baseline obligation, not an upsell — and it is priced on all tiers.
  const aml = PUBLIC_DOCS_INDEX.find((e) => e.slug === "aml-ctf");
  assert.ok(aml);
  assert.equal(availabilityLabel(aml.moduleSlug), "All plans");
});

test("the index badges each module as the corpus gates it", () => {
  // Two copies of one table, in two runtimes. A badge that disagrees with the
  // gate advertises a section as open on a plan that cannot read it, or the
  // reverse.
  assert.deepEqual(
    Object.fromEntries(Object.entries(MODULE_TIERS).map(([k, v]) => [k, [...v]])),
    corpusGate(),
  );
});

test("the gate includes each module on exactly the tiers the price list does", () => {
  // Market Updates read Growth and above here for weeks after the price list
  // moved it to Scale alone. AML/CTF is the one deliberate difference: it is
  // sold inside every tier's headline price, so its section is open on all
  // three although no tier lists it as an inclusion.
  const gate = corpusGate();
  const drift: string[] = [];
  for (const mod of MOCK_MODULES) {
    if (mod.slug === "aml-ctf" || !(mod.slug in gate)) continue;
    const listed = [...(mod.includedIn ?? [])].sort().join(",");
    const gated = [...gate[mod.slug]].sort().join(",");
    if (listed !== gated) drift.push(`${mod.slug} (price list=${listed} gate=${gated})`);
  }
  assert.deepEqual(drift, [], `tier drift: ${drift.join("; ")}`);
});

test("each partner portal is its own purchase, in no tier", () => {
  // The Solicitor Portal by D17, the Accountant Portal by the owner's decision
  // of 29 Oct 2026, and the Builder / Developer Portal, sold directly. Each
  // used to read as part of the Finance Portal, and so as Scale.
  for (const [section, module] of [
    ["solicitor-portal", "solicitor-portal"],
    ["accountant-portal", "accountant-portal"],
    ["builder-portal", "builder-developer-portal"],
  ] as const) {
    const entry = PUBLIC_DOCS_INDEX.find((e) => e.slug === section);
    assert.ok(entry, `${section} missing from the index`);
    assert.equal(entry.moduleSlug, module, section);
    assert.equal(availabilityLabel(module), "Add-on", section);
  }
});

test("availability labels read correctly for each tier shape", () => {
  assert.equal(availabilityLabel(null), "All plans");
  assert.equal(availabilityLabel("finance-portal"), "Scale");
  assert.equal(availabilityLabel("deal-pipeline"), "Growth and above");
  assert.equal(availabilityLabel("email-copilot"), "Add-on");
  assert.equal(availabilityLabel("aml-ctf"), "All plans");
});

test("summaries are written, not placeholders", () => {
  for (const entry of PUBLIC_DOCS_INDEX) {
    assert.ok(entry.summary.length > 30, `${entry.slug} has a thin summary`);
    assert.ok(entry.title.length > 2, `${entry.slug} has no title`);
    assert.ok(entry.readMinutes > 0, `${entry.slug} has no read time`);
  }
});

test("the corpus is not reachable from the client bundle", () => {
  // The whole gate rests on this. If anything under src/ imports the corpus,
  // Vite bundles every locked body into the JavaScript and the server-side
  // filtering becomes decorative.
  const offenders: string[] = [];
  for (const file of ["src/pages/Docs.tsx", "src/lib/docs/publicIndex.ts", "src/lib/docs/docsClient.ts"]) {
    const src = read(file);
    if (/from\s+["'].*docsCorpus/.test(src) || /from\s+["'].*supabase\/functions/.test(src)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], `client code importing server-only corpus: ${offenders.join(", ")}`);
});
