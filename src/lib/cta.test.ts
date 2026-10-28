import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import * as cta from "./cta";
import { FREE_TRIAL, FREE_TRIAL_DAYS, TRIAL_CTA, TRIAL_NOTE, TRIAL_PANEL, TRIAL_TERMS } from "./cta";
import { routeMetadata } from "./routeMetadata";

/**
 * The trial offer is one business decision expressed in many places. These
 * keep it that way: one number, one destination, and copy that promises no
 * more than the process delivers. See the header of cta.ts.
 */

const src = new URL("../", import.meta.url);

/** Every non-test .ts/.tsx under src/, keyed by its path relative to src/. */
async function sources(): Promise<Map<string, string>> {
  const files = (await readdir(src, { recursive: true })).filter(
    (file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts"),
  );
  return new Map(await Promise.all(files.map(async (file) => [file, await readFile(new URL(file, src), "utf8")] as const)));
}

/** Every string an export of cta.ts carries, however deeply nested. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

test("the trial length is written once, in cta.ts", async () => {
  // The videos are recordings: their transcripts say what was filmed, and no
  // constant can change that. Everything else derives from FREE_TRIAL_DAYS.
  const exempt = new Set(["lib/cta.ts", "lib/videos/catalog.ts"]);
  // A trial length in the same sentence as "trial", so an unrelated 14-day
  // period elsewhere (a link expiry, a notice period) is not caught.
  const length = String.raw`\b(?:14|fourteen)(?:-day|\s+days?)\b`;
  const typedOut = new RegExp(`${length}(?=[^.\\n]*\\btrial)|\\btrial\\b[^.\\n]*${length}`, "i");
  const offenders = [...(await sources())]
    .filter(([file, text]) => !exempt.has(file.replaceAll("\\", "/")) && typedOut.test(text))
    .map(([file, text]) => `${file}: ${typedOut.exec(text)?.[0]}`);
  assert.deepEqual(offenders, [], "derive the trial length from FREE_TRIAL_DAYS in src/lib/cta.ts");
});

test("the derived copy follows FREE_TRIAL_DAYS", () => {
  assert.ok(Number.isInteger(FREE_TRIAL_DAYS) && FREE_TRIAL_DAYS > 0);
  assert.equal(FREE_TRIAL, `${FREE_TRIAL_DAYS}-day free trial`);
  assert.ok(TRIAL_NOTE.startsWith(FREE_TRIAL));
  assert.ok(TRIAL_TERMS.includes(`${FREE_TRIAL_DAYS}-day`));
  assert.equal(TRIAL_PANEL.badge, FREE_TRIAL);
});

test("trial copy promises nothing the application process does not deliver", () => {
  // Applications are reviewed and workspaces provisioned by the team, and the
  // trial runs from go-live: there is no instant, self-serve or card-free path.
  const overclaims = /credit card|no card|instant|immediate|self-serve|risk-free|no commitment|cancel any ?time/i;
  for (const text of strings(cta)) {
    assert.ok(!overclaims.test(text), `overclaim in cta.ts: ${overclaims.exec(text)?.[0]} — "${text}"`);
  }
  assert.match(TRIAL_NOTE, /reviewed by the Aurixa team/);
  assert.match(TRIAL_TERMS, /goes live/);
});

test("every trial call to action lands on a public page", () => {
  assert.equal(routeMetadata(TRIAL_CTA.to)?.indexable, true, `${TRIAL_CTA.to} is not a public route`);
});

test("no retired waitlist, demo or priority-access call to action is left on the site", async () => {
  const retired = [
    /join (?:the )?waitlist/i,
    /book (?:your |an? )?(?:free |enterprise )?demo/i,
    /apply for priority access/i,
    /secure priority (?:review|integration)/i,
    /allocation restricted/i,
    // "request access to personal information" is a privacy right, not a CTA.
    /\brequest access\b(?! to)/i,
  ];
  const found: string[] = [];
  for (const [file, text] of await sources()) {
    for (const pattern of retired) {
      const match = pattern.exec(text);
      if (match) found.push(`${file}: ${match[0]}`);
    }
  }
  assert.deepEqual(found, []);
});
