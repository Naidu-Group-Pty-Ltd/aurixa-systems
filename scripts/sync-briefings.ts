/**
 * Pull the Briefing Room's live listings from Mission Control into
 * `src/lib/videos/briefings.data.ts`, before a build renders any page.
 *
 * Runs at `prebuild`. It fetches only where a build should be current:
 *
 *   - on Vercel (`VERCEL=1`), unless `BRIEFINGS_SYNC=0`;
 *   - anywhere with `BRIEFINGS_SYNC=1` (best effort) or `=required` (a failed
 *     fetch fails the build) — `npm run briefings:pull` uses the first to
 *     refresh the committed snapshot.
 *
 * Everywhere else (local builds, CI) it leaves the committed snapshot alone,
 * so the tests run against a catalogue that is in the repository.
 *
 * Mission Control unreachable, or answering anything but a well-formed list,
 * keeps the snapshot and says so: a site that shows yesterday's videos is a
 * smaller failure than one whose build fails, or one that shows none. A
 * listing that breaks a publishing rule (`validate.ts`) is left out and named,
 * and the rest go live.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { routeMetadata } from "../src/lib/routeMetadata";
import { acceptBriefings, libraryOrder } from "../src/lib/videos/validate";
import {
  briefingFromListing,
  listingsFromResponse,
  renderBriefingsModule,
} from "../src/lib/videos/missionControlListings";

const TARGET = fileURLToPath(new URL("../src/lib/videos/briefings.data.ts", import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));
const TIMEOUT_MS = 20_000;

const mode = (process.env.BRIEFINGS_SYNC ?? "").trim().toLowerCase();
const onVercel = process.env.VERCEL === "1";
const shouldFetch = mode === "1" || mode === "required" || (onVercel && mode !== "0");
const required = mode === "required";

const missionControl = (
  process.env.MISSION_CONTROL_URL ??
  process.env.VITE_MISSION_CONTROL_URL ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");
const endpoint = `${missionControl}/api/public/storefront/briefings`;

function keepSnapshot(reason: string): never {
  const message = `briefings: keeping the committed snapshot — ${reason}`;
  if (required) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

async function main() {
  if (!shouldFetch) {
    console.log("briefings: using the committed snapshot (set BRIEFINGS_SYNC=1 to pull from Mission Control)");
    return;
  }

  let status: number;
  let body: unknown;
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    status = response.status;
    body = await response.json().catch(() => null);
  } catch (error) {
    keepSnapshot(`${endpoint} could not be reached (${error instanceof Error ? error.message : String(error)})`);
  }

  const answer = listingsFromResponse(status!, body);
  if ("reason" in answer) keepSnapshot(`${endpoint}: ${answer.reason}`);

  const { accepted, rejected } = acceptBriefings(answer.listings.map(briefingFromListing), {
    isPublicPage: (path) => routeMetadata(path)?.indexable === true,
    artworkExists: (path) => existsSync(`${PUBLIC_DIR}${path}`),
  });
  for (const { slug, problems } of rejected) {
    console.warn(`briefings: left out "${slug}" — ${problems.join("; ")}`);
  }

  const library = libraryOrder(accepted);
  const next = renderBriefingsModule(library, `Mission Control, ${endpoint}`);
  const current = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : "";
  // The header names its source and nothing time-dependent, so an unchanged
  // catalogue rewrites an identical file and a local pull leaves no diff.
  if (next === current) {
    console.log(`briefings: ${library.length} listing(s) from Mission Control, unchanged`);
    return;
  }
  writeFileSync(TARGET, next);
  const live = library.filter((briefing) => briefing.media).length;
  console.log(
    `briefings: wrote ${library.length} listing(s) from Mission Control (${live} watchable, ${library.length - live} premiering)` +
      (rejected.length ? `, ${rejected.length} left out` : ""),
  );
}

void main();
