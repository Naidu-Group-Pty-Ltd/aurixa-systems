import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import {
  DEFAULT_DESCRIPTION,
  ROUTE_METADATA,
  SITE_ORIGIN,
  absoluteUrl,
  indexableRoutes,
  routeMetadata,
  unlistedPaths,
} from "./routeMetadata";
import { unlistedRoutesNamedIn } from "./seoFiles";

/** Every `path="…"` on a `<Route>` in App.tsx, catch-all excluded. */
async function declaredRoutePaths(): Promise<string[]> {
  const source = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== "*");
}

/**
 * The one that protects the business.
 *
 * `indexable` is the single field three separate mechanisms read: the generated
 * sitemap, the per-page `robots` directive, and the `X-Robots-Tag` list in
 * `vercel.json`. A route added to `App.tsx` without an entry here would be
 * absent from all three — which for an unlisted route means it silently becomes
 * indexable. `/pricing-mock` charges real cards against the LIVE Stripe account
 * and `/questionnaire` is token-gated, so that failure mode is an incident.
 *
 * Failing here is the intended outcome of adding a route: go and decide.
 */
test("every route declared in App.tsx has registered metadata", async () => {
  const declared = await declaredRoutePaths();
  assert.ok(declared.length > 0, "no <Route path> found — did App.tsx change shape?");

  const missing = declared.filter((path) => !routeMetadata(path));
  assert.deepEqual(
    missing,
    [],
    `routes in App.tsx with no entry in routeMetadata.ts: ${missing.join(", ")}`,
  );
});

test("every registered route still exists in App.tsx", async () => {
  const declared = new Set(await declaredRoutePaths());
  const orphaned = ROUTE_METADATA.map((entry) => entry.path).filter(
    (path) => !declared.has(path),
  );
  assert.deepEqual(
    orphaned,
    [],
    `routeMetadata.ts entries with no matching <Route>: ${orphaned.join(", ")}`,
  );
});

/**
 * Pins the unlisted set by name. Flipping one of these to `indexable: true`
 * should require deleting a line here, not just editing a boolean — each of
 * these pages either charges money, carries a token in its URL, or is reached
 * only through a secure single-use link.
 */
test("the deliberately unlisted routes stay unlisted", () => {
  assert.deepEqual(unlistedPaths().sort(), [
    "/feedback",
    "/pricing",
    "/pricing-mock",
    "/pricing/cancel",
    "/pricing/card-saved",
    "/pricing/success",
    "/questionnaire",
    "/schedule-strategic-review",
    "/support",
  ]);
});

/**
 * The inverse pin. De-indexing a public page is as silent as indexing a private
 * one — the page keeps working, it just stops being found — so turning any of
 * these to `indexable: false` should also require deleting a line here.
 */
test("the public routes stay public", () => {
  assert.deepEqual(indexableRoutes().map((entry) => entry.path).sort(), [
    "/",
    "/about",
    "/builders",
    "/builders/apply",
    "/compliance",
    "/compliance-passport",
    "/contact",
    "/docs",
    "/industries",
    "/platform",
    "/privacy-policy",
    "/resources",
    "/solutions",
    "/status",
    "/terms-and-conditions",
  ]);
});

test("no unlisted route can reach the sitemap", () => {
  const listed = new Set(indexableRoutes().map((entry) => entry.path));
  for (const path of unlistedPaths()) {
    assert.ok(!listed.has(path), `${path} is unlisted but would be published`);
  }
});

test("every route has a usable title and description", () => {
  for (const entry of ROUTE_METADATA) {
    assert.ok(entry.title.trim().length > 0, `${entry.path} has no title`);
    assert.ok(
      entry.description.trim().length > 0,
      `${entry.path} has no description`,
    );
    // Long descriptions are truncated in search results and social cards. This
    // is a soft limit in the wild, so it is deliberately generous.
    assert.ok(
      entry.description.length <= 320,
      `${entry.path} description is ${entry.description.length} chars (max 320)`,
    );
    if (entry.path !== "/") {
      assert.ok(
        entry.title.endsWith(" | Aurixa Systems"),
        `${entry.path} title breaks the "<Page> | Aurixa Systems" convention: ${entry.title}`,
      );
    }
  }
});

test("titles are unique, so no two pages look alike in a tab strip or a SERP", () => {
  const titles = ROUTE_METADATA.map((entry) => entry.title);
  assert.equal(new Set(titles).size, titles.length, "duplicate <title> detected");
});

/** A description copied between pages tells a search engine the pages are the same. */
test("descriptions are unique", () => {
  const seen = new Map<string, string>();
  for (const entry of ROUTE_METADATA) {
    const other = seen.get(entry.description);
    assert.ok(!other, `${entry.path} reuses the description of ${other}`);
    seen.set(entry.description, entry.path);
  }
});

test("canonical URLs are absolute and single-slashed", () => {
  assert.equal(absoluteUrl("/"), `${SITE_ORIGIN}/`);
  assert.equal(absoluteUrl("/platform"), `${SITE_ORIGIN}/platform`);
  for (const entry of indexableRoutes()) {
    const url = absoluteUrl(entry.path);
    assert.ok(url.startsWith("https://"), `${entry.path} is not https`);
    assert.ok(
      !url.slice("https://".length).includes("//"),
      `${entry.path} produced a doubled slash: ${url}`,
    );
  }
});

test("the home page carries the sitewide description", () => {
  assert.equal(routeMetadata("/")?.description, DEFAULT_DESCRIPTION);
});

// ── The generated public files ───────────────────────────────────────────────

const publicFile = (name: string) =>
  readFile(new URL(`../../public/${name}`, import.meta.url), "utf8");

/**
 * `public/sitemap.xml` is written by `scripts/generate-seo-files.ts` at
 * prebuild and committed so it shows up in review. This fails if the committed
 * copy stops matching the registry — i.e. if someone edited it by hand, or
 * changed `indexable` and did not rebuild.
 */
test("the committed sitemap lists exactly the indexable routes", async () => {
  const xml = await publicFile("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = indexableRoutes().map((entry) => absoluteUrl(entry.path)).sort();
  assert.deepEqual(locs, expected);
});

/**
 * The one that keeps the live-Stripe fixture page out of public view.
 *
 * `/pricing-mock` charges real cards. `/questionnaire` and
 * `/schedule-strategic-review` are token-gated. None of them is linked from
 * anywhere in `src/`, so their obscurity is real — and publishing any of these
 * paths in a world-readable file at a well-known URL would throw it away.
 *
 * robots.txt is included on purpose: `Disallow: /pricing-mock` would *advertise*
 * the page while simultaneously preventing the crawl that would let a bot see
 * the `noindex` header. Both halves of that are wrong, so the file names none
 * of them. See "robots.txt" in docs/seo-production-readiness.md.
 *
 * Comments are checked too. They used to be exempt, on the theory that prose
 * publishes nothing a crawler will follow — but a person reading
 * /robots.txt reads the comments, and that person is the one this is about.
 * `index.html` is included because its comments ship in every prerendered page.
 */
test("no unlisted route is named in any world-readable file", async () => {
  const files = {
    "sitemap.xml": await publicFile("sitemap.xml"),
    "llms.txt": await publicFile("llms.txt"),
    "robots.txt": await publicFile("robots.txt"),
    "index.html": await readFile(new URL("../../index.html", import.meta.url), "utf8"),
  };
  for (const [name, contents] of Object.entries(files)) {
    assert.deepEqual(unlistedRoutesNamedIn(contents), [], `${name} names an unlisted route`);
  }
});

/**
 * The detector above is only worth trusting if it catches the real shapes of
 * the mistake and lets ordinary prose through. Synthetic fixtures only — no
 * real session ids or tokens.
 */
test("the unlisted-route detector catches paths and passes prose", () => {
  const leaks: [string, string][] = [
    ["Disallow: /pricing-mock", "/pricing-mock"],
    ["Disallow:/support", "/support"],
    ["# /questionnaire is reached only by token", "/questionnaire"],
    ["# the /pricing/* receipts carry a token", "/pricing"],
    ["- [Receipt](https://www.aurixasystems.com.au/pricing/success?session_id=cs_test_fixture)", "/pricing/success"],
    ["<loc>https://aurixasystems.com.au/feedback</loc>", "/feedback"],
    ["see (/schedule-strategic-review)", "/schedule-strategic-review"],
    ["the pricing-mock page", "/pricing-mock"],
    ["after card-saved", "/pricing/card-saved"],
  ];
  for (const [text, path] of leaks) {
    assert.ok(unlistedRoutesNamedIn(text).includes(path), `missed ${path} in: ${text}`);
  }

  const prose = [
    "This guide does not cover pricing.",
    "Support is available to customers. Feedback is welcome.",
    "A short questionnaire follows the application.",
    "Disallow: /assets/",
    "Sitemap: https://www.aurixasystems.com.au/sitemap.xml",
    "https://example.com/pricing",
    "/brand/support-mark.png",
  ];
  for (const text of prose) {
    assert.deepEqual(unlistedRoutesNamedIn(text), [], `false positive in: ${text}`);
  }
});

test("every link in llms.txt points at an indexable route", async () => {
  const listed = new Set(indexableRoutes().map((entry) => absoluteUrl(entry.path)));
  const links = [...(await publicFile("llms.txt")).matchAll(/\]\((https:[^)]+)\)/g)].map(
    (m) => m[1],
  );
  assert.ok(links.length > 0, "llms.txt has no links — did generation run?");
  for (const link of links) {
    assert.ok(listed.has(link), `llms.txt links to a non-indexable URL: ${link}`);
  }
});

/**
 * `X-Robots-Tag` is the only noindex signal a crawler that does not execute
 * JavaScript will ever see, and this site serves an empty `<div id="root">`.
 * Every unlisted path therefore needs header coverage in `vercel.json`.
 */
test("every unlisted route is covered by a noindex header in vercel.json", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../vercel.json", import.meta.url), "utf8"),
  ) as { headers?: { source: string; headers: { key: string; value: string }[] }[] };

  // Exactly the directive the page itself carries: `noindex` alone would still
  // let a crawler follow the token-bearing links out of a receipt page.
  const noindexSources = (config.headers ?? [])
    .filter((rule) =>
      rule.headers.some(
        (header) =>
          header.key.toLowerCase() === "x-robots-tag" &&
          header.value === "noindex, nofollow",
      ),
    )
    .map((rule) => new RegExp(`^${rule.source}$`));

  for (const path of unlistedPaths()) {
    assert.ok(
      noindexSources.some((pattern) => pattern.test(path)),
      `${path} has no X-Robots-Tag: noindex, nofollow rule in vercel.json`,
    );
  }
});

/**
 * The one that keeps the 404 real.
 *
 * `scripts/prerender.ts` writes a file for every route, so Vercel's filesystem
 * check answers all of them and anything else falls through to `dist/404.html`
 * with a genuine 404 status. A catch-all rewrite would put that back the way it
 * was: every unknown URL answering 200 with the app shell, which search engines
 * treat as a soft 404 and index as a real page.
 *
 * If a rewrite is ever genuinely needed, it must be an allowlist — never
 * `/(.*)`.
 */
test("vercel.json has no catch-all rewrite masking the 404", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../vercel.json", import.meta.url), "utf8"),
  ) as { rewrites?: { source: string; destination: string }[] };

  const catchAll = (config.rewrites ?? []).filter((rule) =>
    /^\/\(\.\*\)$|^\/\*$|^\/\(\.\+\)$/.test(rule.source),
  );
  assert.deepEqual(
    catchAll,
    [],
    "a catch-all rewrite makes every unknown URL answer 200 — prerendering exists so it does not have to",
  );
});

/**
 * Every route must end up on disk, because without the rewrite an un-prerendered
 * route is a hard 404 in production rather than a soft one. Skipped when there
 * is no build to inspect, so `npm test` still runs on a clean checkout.
 */
test("every route is prerendered to a file", async (t) => {
  const dist = new URL("../../dist/", import.meta.url);
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  for (const entry of ROUTE_METADATA) {
    const file =
      entry.path === "/"
        ? new URL("index.html", dist)
        : new URL(`${entry.path.replace(/^\//, "")}/index.html`, dist);
    assert.ok(existsSync(file), `${entry.path} was not prerendered`);
  }
  assert.ok(existsSync(new URL("404.html", dist)), "404.html was not written");
});

/**
 * The prerender pass is only worth having if the indexable pages come out with
 * real markup. They do that by being imported eagerly in `App.tsx`; a `lazy()`
 * import makes `renderToString` emit a Suspense fallback instead, which looks
 * fine locally and ships an empty page to every crawler.
 */
test("indexable routes prerender with real content, not a shell", async (t) => {
  const dist = new URL("../../dist/", import.meta.url);
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  for (const entry of indexableRoutes()) {
    const file =
      entry.path === "/"
        ? new URL("index.html", dist)
        : new URL(`${entry.path.replace(/^\//, "")}/index.html`, dist);
    const html = await readFile(file, "utf8");
    const body = html.split('<div id="root">')[1] ?? "";
    assert.ok(
      /<h1[\s>]/.test(body),
      `${entry.path} prerendered with no <h1> — is it lazy() in App.tsx?`,
    );
    assert.ok(
      body.length > 5000,
      `${entry.path} prerendered only ${body.length} bytes of markup`,
    );
  }
});

/** Each prerendered page must carry its own metadata, not the shell's. */
test("prerendered pages carry their own title and canonical", async (t) => {
  const dist = new URL("../../dist/", import.meta.url);
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  for (const entry of ROUTE_METADATA) {
    const file =
      entry.path === "/"
        ? new URL("index.html", dist)
        : new URL(`${entry.path.replace(/^\//, "")}/index.html`, dist);
    const html = await readFile(file, "utf8");
    const head = html.split('<div id="root">')[0];

    assert.ok(
      head.includes(`<link rel="canonical" href="${absoluteUrl(entry.path)}" />`),
      `${entry.path} has the wrong canonical`,
    );
    // Entity-escaped, so compare on the escaped form the writer produces.
    const escaped = entry.title.replace(/&/g, "&amp;");
    assert.ok(head.includes(`<title>${escaped}</title>`), `${entry.path} has the wrong <title>`);
    assert.equal(
      /<meta name="robots" content="noindex, nofollow"/.test(head),
      !entry.indexable,
      `${entry.path} robots directive does not match indexable=${entry.indexable}`,
    );
  }
});

/**
 * The one that keeps live payment links out of the browser.
 *
 * `mockCatalog.ts` hard-codes 41 Payment Links against the LIVE Stripe account
 * at A$1 apiece, plus the account id. Those shipped in a lazy chunk that anyone
 * could fetch: `noindex` is a directive for documents, not assets, and the entry
 * chunk served on `/` names every lazy chunk file, so the route path never had
 * to be guessed. Publicly discoverable low-value live payment links are a
 * standard card-testing target.
 *
 * `VITE_ENABLE_PRICING_MOCK` now decides whether any of it is built at all. This
 * asserts the outcome against `dist/` rather than trusting Rollup to have
 * eliminated the branch — the failure mode is silent and expensive.
 *
 * Scoped deliberately to the mock catalogue's own literals: the 22 live
 * full-price links in `addonPurchaseLinks.ts` are product functionality and are
 * meant to ship, so a blanket "no buy.stripe.com in dist" check would be wrong.
 */
test("the A$1 fixture links never reach a production bundle", async (t) => {
  const dist = new URL("../../dist/assets/", import.meta.url);
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");
  if (process.env.VITE_ENABLE_PRICING_MOCK === "true") {
    return t.skip("built with the mock catalogue deliberately enabled");
  }

  const { MOCK_CATALOGUE, MOCK_STRIPE_ACCOUNT } = await import("./pricing/mockCatalog.ts");
  const bundles = (await readdir(dist)).filter((f) => f.endsWith(".js"));
  assert.ok(bundles.length > 0, "no JS emitted — did the build run?");

  const combined = (
    await Promise.all(bundles.map((f) => readFile(new URL(f, dist), "utf8")))
  ).join("\n");

  const leaked = MOCK_CATALOGUE.map((item) => item.url).filter((url) =>
    combined.includes(url),
  );
  assert.deepEqual(
    leaked.map((u) => u.replace(/(buy\.stripe\.com\/\w{4}).*/, "$1…")),
    [],
    "mock Payment Links against the live Stripe account are in the shipped bundle",
  );
  assert.ok(
    !combined.includes(MOCK_STRIPE_ACCOUNT),
    `the live Stripe account id ${MOCK_STRIPE_ACCOUNT.slice(0, 9)}… is in the shipped bundle`,
  );
});

/** The inverse mistake: a header rule that quietly de-indexes a public page. */
test("no indexable route is caught by a noindex header", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../vercel.json", import.meta.url), "utf8"),
  ) as { headers?: { source: string; headers: { key: string; value: string }[] }[] };

  const noindexSources = (config.headers ?? [])
    .filter((rule) =>
      rule.headers.some(
        (header) =>
          header.key.toLowerCase() === "x-robots-tag" &&
          header.value.includes("noindex"),
      ),
    )
    .map((rule) => new RegExp(`^${rule.source}$`));

  for (const entry of indexableRoutes()) {
    const caught = noindexSources.find((pattern) => pattern.test(entry.path));
    assert.ok(!caught, `${entry.path} is public but matches ${caught?.source}`);
  }
});
