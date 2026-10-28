import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { LEGAL_ENTITY } from "./legal";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  ROUTE_METADATA,
  SITE_NAME,
  SITE_ORIGIN,
  absoluteUrl,
  indexableRoutes,
  ogImageUrl,
  routeMetadata,
  unlistedPaths,
} from "./routeMetadata";
import { llmsTxt, sitemapXml } from "./seoFiles";

/**
 * What a crawler, an assistant or a link-preview scraper is actually handed:
 * the public SEO files, the structured data, and — once there is a build — the
 * prerendered pages. `routeMetadata.test.ts` covers the registry itself and
 * the noindex machinery; this file covers what is built from it.
 */

const root = (path: string) => new URL(`../../${path}`, import.meta.url);
const read = (path: string) => readFile(root(path), "utf8");

type JsonObject = Record<string, unknown>;

function jsonLd(html: string): JsonObject {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `expected one JSON-LD block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]) as JsonObject;
}

const template = () => readFileSync(root("index.html"), "utf8");
const graph = () => jsonLd(template())["@graph"] as JsonObject[];
const ofType = (type: string) => {
  const node = graph().find((n) => n["@type"] === type);
  assert.ok(node, `no ${type} node in the JSON-LD`);
  return node;
};
const organization = () => ofType("Organization");

/** Every [key, value] pair in a JSON value, depth first. */
function* entries(value: unknown): Generator<[string, unknown]> {
  if (Array.isArray(value)) {
    for (const item of value) yield* entries(item);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      yield [key, child];
      yield* entries(child);
    }
  }
}

/** Width and height from a PNG or WebP header — enough to check a logo without a dependency. */
function imageSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.subarray(1, 4).toString("latin1") === "PNG") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  assert.equal(bytes.subarray(0, 4).toString("latin1"), "RIFF", "neither PNG nor WebP");
  assert.equal(bytes.subarray(8, 12).toString("latin1"), "WEBP", "neither PNG nor WebP");
  const chunk = bytes.subarray(12, 16).toString("latin1");
  if (chunk === "VP8X") return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  throw new Error(`unrecognised WebP chunk ${chunk}`);
}

// ── Generated files ──────────────────────────────────────────────────────────

/**
 * The committed copies are reviewed in diffs, and prebuild rewrites them from
 * the same builders on every deploy. This catches a hand edit, or a registry
 * change committed without regenerating, before review rather than after.
 */
test("the committed sitemap.xml and llms.txt are exactly what the generator writes", async () => {
  const regenerate = "run `npx tsx scripts/generate-seo-files.ts` and commit the result";
  assert.equal(await read("public/sitemap.xml"), sitemapXml(), `public/sitemap.xml is stale — ${regenerate}`);
  assert.equal(await read("public/llms.txt"), llmsTxt(), `public/llms.txt is stale — ${regenerate}`);
});

test("sitemap.xml is a well-formed urlset of canonical, unique, public URLs", async () => {
  const xml = await read("public/sitemap.xml");
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'), "missing XML declaration");
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);

  // Only elements the protocol defines, and no <lastmod>: there is no source
  // of truth for one, and an untrustworthy lastmod is worse than none.
  const elements = new Set([...xml.matchAll(/<\/?([a-z]+)[\s>]/g)].map((m) => m[1]));
  assert.deepEqual([...elements].sort(), ["loc", "priority", "url", "urlset"]);

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const locs = entries.map((entry) => /<loc>([^<]+)<\/loc>/.exec(entry)?.[1]);
  assert.equal(new Set(locs).size, locs.length, "duplicate <loc>");
  entries.forEach((entry, i) => {
    const loc = locs[i];
    assert.ok(loc, "a <url> without a <loc>");
    const url = new URL(loc);
    assert.equal(url.origin, SITE_ORIGIN, `${loc} is not on the canonical origin`);
    assert.equal(url.search + url.hash, "", `${loc} carries a query string or fragment`);
    assert.equal(routeMetadata(url.pathname)?.indexable, true, `${loc} is not an indexable route`);
    const priority = /<priority>([^<]+)<\/priority>/.exec(entry)?.[1];
    if (priority !== undefined) {
      const value = Number(priority);
      assert.ok(value >= 0 && value <= 1, `${loc} priority ${priority} is outside 0.0–1.0`);
    }
  });
});

test("llms.txt has the llmstxt.org shape", async () => {
  const lines = (await read("public/llms.txt")).split("\n");
  assert.equal(lines[0], `# ${SITE_NAME}`);
  assert.equal(lines.filter((line) => line.startsWith("# ")).length, 1, "more than one H1");
  assert.equal(lines[2], `> ${DEFAULT_DESCRIPTION}`, "the summary blockquote is not the sitewide description");

  const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
  assert.ok(sections.length > 0, "no link sections");
  assert.equal(sections.at(-1), "Optional", "the Optional section must come last");
  assert.ok(
    !sections.includes("Other pages"),
    "a public route is in no curated section — place it in LLMS_SECTIONS in src/lib/seoFiles.ts",
  );

  // Before the first section: prose and lists, never headings. After it: links.
  const first = lines.findIndex((line) => line.startsWith("## "));
  assert.ok(!lines.slice(1, first).some((line) => line.startsWith("#")), "a heading inside the preamble");
  for (const line of lines.slice(first)) {
    if (line === "" || line.startsWith("## ")) continue;
    assert.match(line, /^- \[[^\]]+\]\(https:\/\/[^)\s]+\): \S.*$/, `not a link entry: ${line}`);
  }
});

/** The document as a whole describes the home page, so it is the one route not linked. */
test("llms.txt links every public page exactly once, and nothing else", async () => {
  const links = [...(await read("public/llms.txt")).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  const expected = indexableRoutes()
    .filter((entry) => entry.path !== "/")
    .map((entry) => absoluteUrl(entry.path));
  assert.deepEqual([...links].sort(), [...expected].sort());
});

/** An assistant quotes what it is given. Nothing from the purchase flow belongs in it. */
test("llms.txt carries no prices, payment details or credentials", async () => {
  const text = await read("public/llms.txt");
  const forbidden: [RegExp, string][] = [
    [/(?:A\$|AU\$|US\$|\$)\s?\d/, "a currency amount"],
    [/\d\s?(?:AUD|USD)\b/, "a currency amount"],
    [/stripe/i, "a payment provider"],
    [/checkout|payment link/i, "a payment flow"],
    [/[?&](?:session_id|token|expires|h|t|uid)=/i, "a URL credential"],
    [/\b(?:cs|pi|price|prod|acct|plink)_[A-Za-z0-9]{6,}/, "a payment object id"],
  ];
  for (const [pattern, what] of forbidden) {
    assert.ok(!pattern.test(text), `llms.txt contains ${what}: ${pattern.exec(text)?.[0]}`);
  }
});

// ── robots.txt ───────────────────────────────────────────────────────────────

type RobotsRule = { allow: boolean; path: string };
type RobotsGroup = { agents: string[]; rules: RobotsRule[] };

/** RFC 9309 groups, without wildcards — the first robots test asserts the file has none. */
function parseRobots(text: string) {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const invalid: string[] = [];
  let current: RobotsGroup | undefined;
  let readingAgents = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    const field = match?.[1].toLowerCase();
    const value = match?.[2].trim() ?? "";

    if (field === "user-agent") {
      if (!readingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current!.agents.push(value.toLowerCase());
      readingAgents = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ allow: field === "allow", path: value });
      readingAgents = false;
    } else if (field === "sitemap") {
      sitemaps.push(value);
    } else {
      invalid.push(raw);
    }
  }
  return { groups, sitemaps, invalid };
}

/** The agent's own group if it has one, else `*`; longest match wins, and Allow wins a tie. */
function mayFetch(groups: RobotsGroup[], agent: string, path: string): boolean {
  const group =
    groups.find((g) => g.agents.includes(agent.toLowerCase())) ??
    groups.find((g) => g.agents.includes("*"));
  let winner: RobotsRule | undefined;
  for (const rule of group?.rules ?? []) {
    if (!rule.path || !path.startsWith(rule.path)) continue;
    if (
      !winner ||
      rule.path.length > winner.path.length ||
      (rule.path.length === winner.path.length && rule.allow)
    ) {
      winner = rule;
    }
  }
  return winner?.allow ?? true;
}

const robots = async () => parseRobots(await read("public/robots.txt"));
const SEARCH_ENGINES = ["Googlebot", "Bingbot"];

test("robots.txt is well-formed and uses only directives crawlers support", async () => {
  const { groups, invalid } = await robots();
  assert.deepEqual(invalid, [], "lines that are not User-agent, Allow, Disallow or Sitemap");
  assert.ok(groups.some((g) => g.agents.includes("*")), "no wildcard group");
  for (const rule of groups.flatMap((g) => g.rules)) {
    assert.ok(rule.path === "" || rule.path.startsWith("/"), `rule path must start with "/": ${rule.path}`);
    assert.ok(!/[*$]/.test(rule.path), `wildcard in ${rule.path} — extend mayFetch() before adding one`);
  }
});

test("search engines may crawl every public page and everything that renders it", async () => {
  const { groups } = await robots();
  const logo = new URL(organization().logo as string).pathname;
  const paths = [
    ...indexableRoutes().map((entry) => entry.path),
    "/assets/index.js",
    DEFAULT_OG_IMAGE,
    logo,
    "/sitemap.xml",
    "/llms.txt",
  ];
  for (const agent of SEARCH_ENGINES) {
    for (const path of paths) {
      assert.ok(mayFetch(groups, agent, path), `${agent} is blocked from ${path}`);
    }
  }
});

/**
 * Each unlisted page is kept out of indexes by the noindex it serves, which a
 * crawler can only see by fetching it. A `Disallow` — even a prefix that never
 * names the route — would hide that directive and leave a linked URL indexable.
 */
test("no unlisted route is blocked from crawling, so its noindex stays visible", async () => {
  const { groups } = await robots();
  for (const agent of SEARCH_ENGINES) {
    for (const path of unlistedPaths()) {
      assert.ok(mayFetch(groups, agent, path), `${agent} cannot fetch ${path}, so it can never see its noindex`);
    }
  }
});

test("the named AI agents may read every public page and are asked to skip the bundles", async () => {
  const { groups } = await robots();
  const named = groups.filter((g) => !g.agents.includes("*")).flatMap((g) => g.agents);
  assert.ok(named.length > 0, "the AI agent group is gone");
  for (const agent of named) {
    for (const entry of indexableRoutes()) {
      assert.ok(mayFetch(groups, agent, entry.path), `${agent} is blocked from ${entry.path}`);
    }
    assert.equal(mayFetch(groups, agent, "/assets/index.js"), false, `${agent} is no longer asked to skip /assets/`);
  }
});

test("robots.txt points at the canonical sitemap", async () => {
  assert.deepEqual((await robots()).sitemaps, [`${SITE_ORIGIN}/sitemap.xml`]);
});

// ── Structured data and the page template ───────────────────────────────────

test("the JSON-LD parses and describes the organisation the site describes", () => {
  const data = jsonLd(template());
  assert.equal(data["@context"], "https://schema.org");
  assert.deepEqual(graph().map((n) => n["@type"]).sort(), ["Organization", "WebSite"]);

  // Identity comes from src/lib/legal.ts, the same record the Privacy Policy
  // and Terms print, so the markup cannot claim a different entity.
  const org = organization() as Record<string, any>;
  assert.equal(org["@id"], `${SITE_ORIGIN}/#organization`);
  assert.equal(org.url, absoluteUrl("/"));
  assert.equal(org.name, SITE_NAME);
  assert.equal(org.legalName, LEGAL_ENTITY.name);
  assert.equal(org.description, DEFAULT_DESCRIPTION);
  assert.deepEqual(org.identifier, { "@type": "PropertyValue", propertyID: "ABN", value: LEGAL_ENTITY.abn });
  assert.ok(LEGAL_ENTITY.location.startsWith(`${org.address.addressRegion},`), "address region disagrees with legal.ts");
  assert.equal(org.address.addressCountry, "AU");
  assert.equal(org.contactPoint.url, absoluteUrl(LEGAL_ENTITY.contactPath));
  assert.equal(routeMetadata(LEGAL_ENTITY.contactPath)?.indexable, true, "the contact point is not a public page");

  const site = ofType("WebSite") as Record<string, any>;
  assert.equal(site["@id"], `${SITE_ORIGIN}/#website`);
  assert.equal(site.url, absoluteUrl("/"));
  assert.equal(site.name, SITE_NAME);
  assert.equal(site.publisher["@id"], org["@id"]);
  assert.equal(site.inLanguage, /<html lang="([^"]+)"/.exec(template())?.[1], "inLanguage disagrees with <html lang>");

  for (const [key, value] of entries(data)) {
    if (key === "@context" || typeof value !== "string" || !/^https?:/.test(value)) continue;
    assert.equal(new URL(value).origin, SITE_ORIGIN, `${key} is off the canonical origin: ${value}`);
  }
});

test("the ABN in the structured data passes the ATO checksum", () => {
  const digits = LEGAL_ENTITY.abn.replace(/\s/g, "").split("").map(Number);
  assert.equal(digits.length, 11, "an ABN has eleven digits");
  digits[0] -= 1;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = digits.reduce((total, digit, i) => total + digit * weights[i], 0);
  assert.equal(sum % 89, 0, `${LEGAL_ENTITY.abn} fails the ABN checksum — a typo, not a real ABN`);
});

/**
 * Google's logo guidance: at least 112×112, crawlable and indexable, a format
 * Google Images reads. Square is this site's own choice — search results show
 * the logo in a small square, where the wide social card would be cropped.
 */
test("the organisation logo meets Google's logo requirements", async () => {
  const logo = new URL(organization().logo as string);
  assert.equal(logo.origin, SITE_ORIGIN);
  assert.match(logo.pathname, /\.(png|jpe?g|gif|webp|avif)$/, "not a raster format Google Images reads");
  const file = root(`public${logo.pathname}`);
  assert.ok(existsSync(file), `${logo.pathname} is not in public/`);

  const { width, height } = imageSize(readFileSync(file));
  assert.ok(width >= 112 && height >= 112, `logo is ${width}×${height}; Google needs at least 112×112`);
  assert.equal(width, height, `logo is ${width}×${height}; search results show it in a square`);

  const config = JSON.parse(await read("vercel.json")) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[];
  };
  for (const rule of config.headers ?? []) {
    const noindex = rule.headers.some((h) => h.key.toLowerCase() === "x-robots-tag" && h.value.includes("noindex"));
    assert.ok(!(noindex && new RegExp(`^${rule.source}$`).test(logo.pathname)), "the logo is served with noindex");
  }
});

/** /pricing is unlisted; machine-readable prices here would publish what it keeps quiet. */
test("the structured data publishes no product, offer or price", () => {
  const forbiddenTypes = new Set(["Product", "Offer", "AggregateOffer", "OfferCatalog", "PriceSpecification", "UnitPriceSpecification"]);
  const forbiddenKeys = new Set(["offers", "price", "priceCurrency", "lowPrice", "highPrice", "priceSpecification", "hasOfferCatalog", "makesOffer"]);
  for (const [key, value] of entries(jsonLd(template()))) {
    assert.ok(!forbiddenKeys.has(key), `JSON-LD carries "${key}"`);
    if (key === "@type") assert.ok(!forbiddenTypes.has(String(value)), `JSON-LD declares a ${value}`);
  }
});

/**
 * index.html is the template every prerendered page starts from, and what a
 * page with no registry entry falls back to, so its defaults must agree with
 * the registry rather than drift into a second description of the site.
 */
test("index.html's sitewide defaults agree with the registry", () => {
  const html = template();
  const content = (attribute: string, name: string) =>
    new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="([^"]*)"`).exec(html)?.[1];

  assert.match(html, /<html lang="en-AU">/);
  assert.equal(content("property", "og:locale"), "en_AU");
  assert.equal(content("name", "description"), DEFAULT_DESCRIPTION);
  assert.equal(content("property", "og:description"), DEFAULT_DESCRIPTION);
  assert.equal(content("name", "twitter:description"), DEFAULT_DESCRIPTION);
  assert.equal(content("property", "og:site_name"), SITE_NAME);
  assert.equal(content("property", "og:url"), absoluteUrl("/"));
  assert.ok(html.includes(`<link rel="canonical" href="${absoluteUrl("/")}" />`), "default canonical is not the home page");

  const card = `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`;
  assert.equal(content("property", "og:image"), card);
  assert.equal(content("name", "twitter:image"), card);
  const { width, height } = imageSize(readFileSync(root(`public${DEFAULT_OG_IMAGE}`)));
  assert.equal(content("property", "og:image:width"), String(width));
  assert.equal(content("property", "og:image:height"), String(height));
  assert.deepEqual({ width, height }, { width: 1200, height: 630 }, "the social card is not 1200×630");
});

// ── The prerendered pages ────────────────────────────────────────────────────
// Skipped when there is no build to inspect, so `npm test` still runs on a
// clean checkout.

const dist = root("dist/");
const builtPage = (path: string) =>
  readFileSync(new URL(path === "/" ? "index.html" : `${path.slice(1)}/index.html`, dist), "utf8");
const head = (html: string) => html.split('<div id="root">')[0];
const body = (html: string) => html.split('<div id="root">')[1] ?? "";
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hrefs = (html: string) =>
  [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

/** No link-preview scraper runs JavaScript, so the served bytes are the whole story. */
test("every prerendered page carries exactly one of each tag, with its own values", (t) => {
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  for (const entry of ROUTE_METADATA) {
    const html = head(builtPage(entry.path));
    for (const tag of [
      "<title>",
      '<link rel="canonical"',
      '<meta name="description"',
      '<meta property="og:title"',
      '<meta property="og:description"',
      '<meta property="og:url"',
      '<meta property="og:image"',
      '<meta property="og:type"',
      '<meta name="twitter:title"',
      '<meta name="twitter:description"',
      '<meta name="twitter:image"',
    ]) {
      const count = html.split(tag).length - 1;
      assert.equal(count, 1, `${entry.path} has ${count} × ${tag}`);
    }

    const title = escapeHtml(entry.title);
    const description = escapeHtml(entry.description);
    for (const expected of [
      `<meta name="description" content="${description}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${absoluteUrl(entry.path)}" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta property="og:image" content="${escapeHtml(ogImageUrl(entry.ogImage))}" />`,
      `<meta name="twitter:image" content="${escapeHtml(ogImageUrl(entry.ogImage))}" />`,
      `<meta property="og:type" content="${escapeHtml(entry.ogType ?? "website")}" />`,
    ]) {
      assert.ok(html.includes(expected), `${entry.path} is missing ${expected}`);
    }
  }
});

test("every prerendered page keeps the structured data verbatim", (t) => {
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");
  const source = jsonLd(template());
  for (const entry of ROUTE_METADATA) {
    assert.deepEqual(jsonLd(builtPage(entry.path)), source, `${entry.path} JSON-LD differs from index.html`);
  }
});

test("the 404 page asks not to be indexed", (t) => {
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");
  const html = readFileSync(new URL("404.html", dist), "utf8");
  assert.match(head(html), /<meta name="robots" content="noindex, nofollow" \/>/);
});

/**
 * The unlisted routes a public page may link to, each for a reason. Anything
 * else gated — the receipts, the questionnaire, the scheduler, the feedback
 * form, the mock catalogue — is reached by token or not at all, and a link
 * from a public page would hand its address to every crawler.
 */
const LINKABLE_UNLISTED: Record<string, string> = {
  "/support": "the footer's Support link: the portal serves customers, not search",
  "/pricing": "the documentation's plan comparison; noindex keeps it out of results",
};

test("links on public pages resolve, and reach no gated route", (t) => {
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  const linkedFrom = new Map<string, Set<string>>();
  for (const entry of indexableRoutes()) {
    for (const href of hrefs(body(builtPage(entry.path)))) {
      // External (the Builders Network app) and same-page anchors are not
      // routes on this site. Same-page anchors are skipped rather than checked
      // because the documentation renders its sections after load.
      if (/^(?:[a-z]+:|#)/.test(href)) continue;

      const url = new URL(href, SITE_ORIGIN);
      const target = routeMetadata(url.pathname);
      assert.ok(target, `${entry.path} links to ${href}, which is not a route`);
      if (!target.indexable) {
        assert.ok(url.pathname in LINKABLE_UNLISTED, `${entry.path} links to the gated route ${url.pathname}`);
      }
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        assert.ok(
          body(builtPage(url.pathname)).includes(`id="${id}"`),
          `${entry.path} links to ${href}, but ${url.pathname} has no #${id}`,
        );
      }
      if (url.pathname !== entry.path) {
        if (!linkedFrom.has(url.pathname)) linkedFrom.set(url.pathname, new Set());
        linkedFrom.get(url.pathname)!.add(entry.path);
      }
    }
  }

  for (const entry of indexableRoutes()) {
    assert.ok(linkedFrom.get(entry.path)?.size, `${entry.path} is public but no other public page links to it`);
  }
});

/**
 * The header and footer are the site's crawl backbone: between them every page
 * reaches nearly every other. Read from the components' own source so the
 * expectation cannot drift from what they declare.
 */
test("every public page carries the full primary navigation and footer", (t) => {
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  const navbar = readFileSync(root("src/components/Navbar.tsx"), "utf8");
  const navItems = [...(/const NAV_ITEMS = \[([\s\S]*?)\] as const/.exec(navbar)?.[1] ?? "").matchAll(/href: "([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.ok(navItems.length > 0, "NAV_ITEMS not found — did Navbar.tsx change shape?");

  const footerLinks = [...readFileSync(root("src/components/Footer.tsx"), "utf8").matchAll(/<FooterLink to="([^"]+)">/g)].map(
    (m) => m[1],
  );
  assert.ok(footerLinks.length > 0, "no FooterLink found — did Footer.tsx change shape?");

  for (const entry of indexableRoutes()) {
    const html = body(builtPage(entry.path));
    const nav = /<nav aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1];
    assert.ok(nav, `${entry.path} has no primary navigation`);
    assert.deepEqual(hrefs(nav), navItems, `${entry.path} primary navigation differs from NAV_ITEMS`);

    const footer = /<footer[\s\S]*?<\/footer>/.exec(html)?.[0];
    assert.ok(footer, `${entry.path} has no footer`);
    // The first link is the brand mark back to the home page.
    assert.deepEqual(hrefs(footer).slice(1), footerLinks, `${entry.path} footer differs from Footer.tsx`);
  }
});
