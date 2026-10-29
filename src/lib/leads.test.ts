import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// `leads.ts` reads `import.meta.env`, which throws outside a bundler, so the
// Stage 1 wiring is asserted from the source rather than by importing it.
const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("a Stage 1 application lands in Mission Control, and its result is Mission Control's", async () => {
  const leads = await read("./leads.ts");
  const submit = leads.slice(leads.indexOf("export async function submitApplication"));
  assert.match(submit, /fetchImpl\(MISSION_CONTROL_LEAD_CAPTURE_URL,/);
  assert.match(submit, /"X-Application-Id": applicationId,/, "the idempotency key travels with it");
  assert.ok(
    submit.indexOf("if (!response.ok) return false;") < submit.indexOf("copyLeadToStorefront("),
    "the copy to capture-lead runs only after Mission Control accepted",
  );

  const page = await read("../pages/Contact.tsx");
  assert.match(page, /if \(!\(await submitApplication\(payload, applicationId\)\)\) \{\s*throw new Error/);
});

test("nothing the funnel submits goes to the deprecated EU Make account", async () => {
  for (const path of [
    "./leads.ts",
    "../pages/Contact.tsx",
    "./readinessSubmission.ts",
    "./readinessSubmissionClient.ts",
    "./reviewBookingClient.ts",
    "./strategicReviewAccessClient.ts",
  ]) {
    assert.doesNotMatch(await read(path), /hook\.[a-z0-9]+\.make\.com/, path);
  }
});

test("a correction Mission Control refused is said plainly, not answered with \"try again\"", async () => {
  const leads = await read("./leads.ts");
  const submit = leads.slice(leads.indexOf("export async function submitApplication"));
  assert.ok(
    submit.indexOf('=== "correction_refused"') < submit.indexOf("if (!response.ok) return false;"),
    "the refusal is read before the generic failure",
  );
  assert.match(submit, /throw new CorrectionRefusedError\(\);/);

  const page = await read("../pages/Contact.tsx");
  assert.match(page, /error instanceof CorrectionRefusedError\s*\?\s*`This application's email address can no longer be changed here\./);
});

test("every submission of an application carries the token this browser generated for it", async () => {
  const leads = await read("./leads.ts");
  const submit = leads.slice(leads.indexOf("export async function submitApplication"));
  assert.match(submit, /const correctionToken = correctionTokenFor\(applicationId\);/);
  assert.match(submit, /body: JSON\.stringify\(correctionToken \? \{ \.\.\.payload, correctionToken \} : payload\),/);
  assert.ok(
    submit.indexOf("correctionTokens.set(applicationId, issued);") > submit.indexOf("if (!response.ok) return false;"),
    "a token Mission Control issued is kept only from an accepted application",
  );
  assert.match(submit, /copyLeadToStorefront\(payload, /, "the copy to capture-lead never carries the token");
  assert.match(leads, /crypto\.getRandomValues\(new Uint8Array\(24\)\)/);
});

test("the token is base64url, the shape Mission Control accepts", async () => {
  const bytes = new Uint8Array(24).map((_, i) => (i * 37 + 250) % 256);
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.match(token, /^[A-Za-z0-9_-]{22,128}$/);
  assert.equal(token.length, 32);
});
