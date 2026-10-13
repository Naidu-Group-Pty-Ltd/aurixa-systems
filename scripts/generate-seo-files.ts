/**
 * Generate `public/sitemap.xml` and `public/llms.txt` from the route registry.
 *
 * Both files are derived data, not content: every URL in them comes from
 * `indexable: true` in `src/lib/routeMetadata.ts`. Writing them by hand is how
 * `/pricing-mock` — the page that charges real cards against the LIVE Stripe
 * account — would eventually end up published in a sitemap. Deriving them means
 * the leak can only happen by flipping a boolean that a test pins.
 *
 * What goes in each file is decided in `src/lib/seoFiles.ts`, which does no
 * I/O so the test suite can compare it with the committed copies. This script
 * only writes the result.
 *
 * Runs as `prebuild`, so `npm run build` (and therefore Vercel) always emits a
 * current pair. The output is committed as well, so it is reviewable in a diff
 * rather than appearing only inside a build; `routeMetadata.test.ts` fails if
 * the committed copy stops matching what this would write.
 *
 *   npx tsx scripts/generate-seo-files.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SITE_ORIGIN, indexableRoutes } from "../src/lib/routeMetadata.ts";
import { llmsTxt, sitemapXml, unlistedRoutesNamedIn } from "../src/lib/seoFiles.ts";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

writeFileSync(join(PUBLIC_DIR, "sitemap.xml"), sitemapXml());
writeFileSync(join(PUBLIC_DIR, "llms.txt"), llmsTxt());

// The same check `routeMetadata.test.ts` makes, repeated here because this is
// the step Vercel actually runs: no CI runs the tests before a deploy. It
// covers the hand-written robots.txt too — a comment there publishes an
// unlisted route as surely as a `Disallow` line would. Fails the build rather
// than shipping, the same posture as the prerender script.
for (const name of ["sitemap.xml", "llms.txt", "robots.txt"]) {
  const named = unlistedRoutesNamedIn(readFileSync(join(PUBLIC_DIR, name), "utf8"));
  if (named.length) {
    console.error(
      `generate-seo-files: FAIL public/${name} names unlisted route(s): ${named.join(", ")}.\n` +
        `World-readable files must not name them, in directives or in comments.`,
    );
    process.exit(1);
  }
}

const count = indexableRoutes().length;
console.log(
  `generate-seo-files: ${count} indexable route${count === 1 ? "" : "s"} → ` +
    `public/sitemap.xml, public/llms.txt (origin ${SITE_ORIGIN})`,
);
