/**
 * Render every route to static HTML after the client build.
 *
 * The site is a client-rendered SPA, so what the server actually returned was
 * `<div id="root"></div>` and a script tag. Googlebot executes JavaScript and
 * coped with that. **No link-preview scraper does** — Slack, LinkedIn, X,
 * WhatsApp, iMessage and Discord all read the served bytes without running
 * them, so every URL shared anywhere unfurled as a bare link no matter what the
 * per-route metadata hook did at runtime.
 *
 * This pass writes a real file per route: full markup for the indexable pages,
 * and the correct `<title>`, description, canonical and og:/twitter: pairs for
 * every page including the gated ones. Two things fall out of it:
 *
 *   • Social cards work, and per-route metadata finally reaches clients that
 *     never ran the hook that produces it.
 *   • Every route becomes a file on disk, which is what lets `vercel.json` drop
 *     its catch-all rewrite and return a genuine 404 for anything else.
 *
 * Unlisted routes are prerendered as a shell — they are `lazy()` in App.tsx, so
 * `renderToString` emits the Suspense fallback rather than their content. That
 * is the correct outcome, not a limitation: a token-gated page has no business
 * publishing its markup, and it still gets its `noindex` directive baked in.
 *
 *     npx tsx scripts/prerender.ts          (runs as `postbuild`)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ROUTE_METADATA,
  absoluteUrl,
  ogImageUrl,
  type RouteMetadata,
} from "../src/lib/routeMetadata.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SSR_ENTRY = join(ROOT, "dist-ssr", "entry-server.js");

const { render } = (await import(pathToFileURL(SSR_ENTRY).href)) as {
  render: (path: string) => string;
};

/** The client build's index.html, used as the shell for every page. */
const template = readFileSync(join(DIST, "index.html"), "utf8");

function attr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace a single tag identified by one of its attributes, leaving the rest of
 * the head untouched. Deliberately narrow: a whole-head rewrite would be easier
 * to write and far easier to get subtly wrong, and the JSON-LD block below it
 * must survive verbatim.
 */
function setTag(html: string, match: RegExp, replacement: string): string {
  if (!match.test(html)) {
    throw new Error(`prerender: no tag in index.html matched ${match}`);
  }
  return html.replace(match, replacement);
}

function pageHtml(route: RouteMetadata, body: string): string {
  const url = absoluteUrl(route.path);
  // A briefing page carries its own 1200×630 card from media storage, so a
  // shared video unfurls as that video; everything else keeps the sitewide one.
  const image = attr(ogImageUrl(route.ogImage));
  const title = attr(route.title);
  const description = attr(route.description);

  let html = template;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = setTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${description}" />`,
  );
  html = setTag(
    html,
    /<link rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${url}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:title"[^>]*\/>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${description}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:url"[^>]*\/>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = setTag(
    html,
    /<meta name="twitter:title"[^>]*\/>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = setTag(
    html,
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${image}" />`,
  );
  html = setTag(
    html,
    /<meta name="twitter:image" content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${image}" />`,
  );
  html = setTag(
    html,
    /<meta property="og:type" content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="${attr(route.ogType ?? "website")}" />`,
  );

  // The one signal a crawler that does not execute JavaScript will ever see.
  // Baked in here as well as served as an X-Robots-Tag header, because belt and
  // braces is the right posture for a page that charges real cards.
  if (!route.indexable) {
    html = html.replace(
      "</head>",
      `  <meta name="robots" content="noindex, nofollow" />\n  </head>`,
    );
  }

  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function outputPath(routePath: string): string {
  return routePath === "/"
    ? join(DIST, "index.html")
    : join(DIST, routePath.replace(/^\//, ""), "index.html");
}

const results: { path: string; bytes: number; content: boolean }[] = [];

for (const route of ROUTE_METADATA) {
  const body = render(route.path);
  const html = pageHtml(route, body);
  const file = outputPath(route.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  // A page whose markup is only the site chrome is a shell. Every indexable
  // route must clear this bar; the check below enforces it.
  const content = /<h1[\s>]/.test(body);
  results.push({ path: route.path, bytes: html.length, content });
}

// 404.html is what Vercel serves once the catch-all rewrite is gone, and it is
// the reason the 404 can carry a real status code instead of a soft 200.
const notFound = pageHtml(
  {
    path: "/404",
    title: "Page Not Found | Aurixa Systems",
    description: "The page you were looking for is not available.",
    indexable: false,
  },
  render("/__prerender_404__"),
);
writeFileSync(
  join(DIST, "404.html"),
  // Canonicalise the error page to the home page: a canonical pointing at a
  // URL that does not exist is worse than none at all.
  notFound.replace(
    /<link rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${absoluteUrl("/")}" />`,
  ),
);

const shells = results.filter((r) => !r.content).map((r) => r.path);
const indexableShells = ROUTE_METADATA.filter(
  (r) => r.indexable && shells.includes(r.path),
);

for (const r of results) {
  console.log(
    `  ${r.content ? "content" : "shell  "}  ${String(Math.round(r.bytes / 1024)).padStart(4)} KB  ${r.path}`,
  );
}
console.log(`  content   ${String(Math.round(notFound.length / 1024)).padStart(4)} KB  404.html`);

if (indexableShells.length) {
  // An indexable page that prerendered to a shell means it was made `lazy()` in
  // App.tsx, so renderToString emitted a Suspense fallback instead of the page.
  // That silently reintroduces the exact defect this script exists to fix, so
  // it fails the build rather than shipping.
  console.error(
    `\nFAIL indexable routes prerendered with no content: ${indexableShells
      .map((r) => r.path)
      .join(", ")}\n` +
      `They are almost certainly lazy() in src/App.tsx — indexable routes must be imported eagerly.`,
  );
  process.exit(1);
}

console.log(
  `\nprerender: ${results.length} routes + 404.html; ` +
    `${results.length - shells.length} with full markup, ${shells.length} shells (all unlisted).`,
);
