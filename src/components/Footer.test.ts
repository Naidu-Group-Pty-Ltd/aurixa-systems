import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

/**
 * The footer is checked as source text, the same way routeMetadata.test.ts
 * reads App.tsx: the repository has no DOM test environment, and what matters
 * here is the agreed structure and that every section a footer link points at
 * really exists. Scroll and focus behaviour itself is decided by
 * src/lib/footerNavigation.ts, which has its own tests.
 */

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

const EXPECTED_COLUMNS = [
  {
    heading: "Platform",
    links: [
      ["Serviceability Engine", "/platform#serviceability"],
      ["Cash Flow Modelling", "/platform#cashflow-reporting"],
      ["Strategic Reporting", "/platform#custom-reporting"],
      ["Property Intelligence", "/platform#suburb-snapshots"],
      ["Security & Trust", "/compliance#security-architecture"],
      ["Client Reporting", "/platform#brief-generation"],
      ["Compliance OS", "/compliance#connected-compliance"],
      ["Compliance Passport", "/compliance-passport"],
    ],
  },
  {
    heading: "Who We Serve",
    links: [
      ["For Buyers Agents", "/industries#buyers-agents"],
      ["For Wealth Advisors", "/industries#wealth-advisors"],
      ["For Enterprise Firms", "/industries#enterprise-firms"],
      ["For Builders & Developers", "/builders"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["About Aurixa", "/about"],
      ["Intelligence Hub", "/resources"],
      ["Video Briefings", "/watch"],
      ["Documentation", "/docs"],
      ["Compliance", "/compliance"],
      ["System Status", "/status"],
      ["Support", "/support"],
      ["Join Waitlist", "/contact"],
      ["Privacy Policy", "/privacy-policy"],
      ["Terms & Conditions", "/terms-and-conditions"],
    ],
  },
];

const EXPECTED_LINKS = EXPECTED_COLUMNS.flatMap((column) => column.links);

/** The page component that must render each section a footer link targets. */
const PAGE_FOR_PATH: Record<string, string> = {
  "/platform": "Platform",
  "/industries": "Industries",
  "/compliance": "Compliance",
};

const SECTION_TARGETS = EXPECTED_LINKS.filter(([, to]) => to.includes("#")).map(([label, to]) => {
  const [path, id] = to.split("#");
  return { label, path, id };
});

const HEADER_OFFSET_CLASS = "scroll-mt-[calc(var(--site-header-height)+1.5rem)]";

const unescape = (text: string) => text.replace(/&amp;/g, "&");

function footerColumns(source: string) {
  const headings = [...source.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)];
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? source.length;
    const links = [...source.slice(heading.index, end).matchAll(/<FooterLink to="([^"]+)">([^<]+)<\/FooterLink>/g)].map(
      ([, to, label]) => [unescape(label), to],
    );
    return { heading: heading[1], links };
  });
}

async function allTsxSources(): Promise<Map<string, string>> {
  const root = new URL("../", import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter((file) => file.endsWith(".tsx"));
  return new Map(await Promise.all(files.map(async (file) => [file, await readFile(new URL(file, root), "utf8")] as const)));
}

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

test("footer columns, labels, order and destinations match the agreed structure", async () => {
  assert.deepEqual(footerColumns(await read("./Footer.tsx")), EXPECTED_COLUMNS);
});

test("all 22 text links and the logo are accounted for, each once", async () => {
  const source = await read("./Footer.tsx");
  assert.equal(EXPECTED_LINKS.length, 22);
  assert.equal(new Set(EXPECTED_LINKS.map(([label]) => label)).size, 22, "duplicate label");
  assert.equal(count(source, "<FooterLink to="), 22, "a footer link was added or lost");
  assert.equal(count(source, "<BrandLogo "), 1, "the footer logo is missing or duplicated");
  assert.match(await read("./BrandLogo.tsx"), /<Link\s+to="\/"\s/, "the logo no longer links to /");
});

test("the moved links sit under Platform, and only the footer heading was renamed", async () => {
  const columns = footerColumns(await read("./Footer.tsx"));
  const labelsUnder = (heading: string) => columns.find((column) => column.heading === heading)?.links.map(([label]) => label) ?? [];
  for (const label of ["Client Reporting", "Compliance OS", "Compliance Passport"]) {
    assert.ok(labelsUnder("Platform").includes(label), `${label} is not under Platform`);
    assert.ok(!labelsUnder("Who We Serve").includes(label), `${label} is still under the audience column`);
  }
  assert.ok(!columns.some((column) => column.heading === "Solutions"), "the footer still has a Solutions heading");
  assert.match(await read("./Navbar.tsx"), /\{ label: "Solutions", href: "\/solutions" \}/, "the main navigation item changed");
});

test("every footer link, logo included, carries the footer navigation marker", async () => {
  const source = await read("./Footer.tsx");
  // The only router link in the file is the one inside FooterLink.
  assert.equal(count(source, "<Link "), 1);
  assert.match(source, /<Link to=\{to\} state=\{FOOTER_NAVIGATION_STATE\}/);
  assert.equal(count(source, "<a "), 0, "a plain anchor would bypass the marker");
  assert.match(source, /<BrandLogo state=\{FOOTER_NAVIGATION_STATE\}/);
  assert.match(await read("./BrandLogo.tsx"), /state=\{state\}/, "BrandLogo no longer forwards its state");
});

test("each footer section target exists once, on an eagerly loaded page, focusable and clear of the header", async () => {
  const app = await read("../App.tsx");
  const sources = await allTsxSources();
  assert.match(
    await read("../index.css"),
    /:where\(main, section, article, aside, h1, h2, h3, h4\)\[id\] \{\s*scroll-margin-top: calc\(var\(--site-header-height\) \+ 1\.5rem\);/,
    "the global anchor offset that <section> targets rely on has changed",
  );

  for (const { label, path, id } of SECTION_TARGETS) {
    const page = PAGE_FOR_PATH[path];
    assert.ok(page, `${label}: no page registered for ${path}`);
    // Eager, because the footer looks the target up as soon as the route renders.
    assert.ok(app.includes(`import ${page} from "./pages/${page}";`), `${label}: ${page} is not imported eagerly`);
    assert.ok(app.includes(`<Route path="${path}" element={<${page} />} />`), `${label}: ${path} does not render ${page}`);

    const pageSource = sources.get(`pages/${page}.tsx`);
    assert.ok(pageSource, `${label}: pages/${page}.tsx not found`);
    const attribute = `id="${id}"`;
    const elsewhere = [...sources].filter(([file, text]) => file !== `pages/${page}.tsx` && text.includes(attribute));
    assert.equal(count(pageSource, attribute), 1, `${label}: ${attribute} must appear exactly once in ${page}.tsx`);
    assert.deepEqual(elsewhere.map(([file]) => file), [], `${label}: ${attribute} is also declared elsewhere`);

    const tag = pageSource.match(new RegExp(`<(\\w+)\\s[^>]*${attribute}[^>]*>`));
    assert.ok(tag, `${label}: could not read the element carrying ${attribute}`);
    assert.ok(tag[0].includes("tabIndex={-1}"), `${label}: target is not focusable, so focus would stay in the footer`);
    assert.ok(
      tag[1] === "section" || tag[0].includes(HEADER_OFFSET_CLASS),
      `${label}: target would land under the fixed header`,
    );
  }
});

test("the page-top focus target the footer falls back to still exists", async () => {
  assert.match(await read("../App.tsx"), /<main id="main-content" tabIndex=\{-1\}/);
});

test("the prerendered pages carry each footer target exactly once and no duplicate ids", async (t) => {
  const dist = new URL("../../dist/", import.meta.url);
  if (!existsSync(dist)) return t.skip("no dist/ — run npm run build first");

  for (const path of new Set(SECTION_TARGETS.map((target) => target.path))) {
    const html = await readFile(new URL(`${path.slice(1)}/index.html`, dist), "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(duplicates, [], `${path} has duplicate ids`);
    for (const { id } of SECTION_TARGETS.filter((target) => target.path === path)) {
      assert.equal(count(html, ` id="${id}"`), 1, `${path} should render #${id} exactly once`);
    }
  }

  const home = await readFile(new URL("index.html", dist), "utf8");
  const footer = home.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  const hrefs = [...footer.matchAll(/href="([^"]+)"/g)].map(([, href]) => href);
  assert.deepEqual(hrefs, ["/", ...EXPECTED_LINKS.map(([, to]) => to)], "prerendered footer links differ from the source");
});
