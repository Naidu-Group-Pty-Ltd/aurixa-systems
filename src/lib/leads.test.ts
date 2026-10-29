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
