# Pre-launch production readiness — metadata, discoverability, asset hygiene

What a stranger can tell about this site from outside it, and what was fixed.

The prompt was a checklist of twenty "tells" that a site was shipped fast and
never given a pre-launch pass. Rather than take it at face value, every item was
audited against the repository **and** against live production. Half of them
already passed. This documents the half that did not, the two items where the
checklist was simply wrong about this codebase, and the two problems it implied
but never named.

## Audit outcome

| # | Item | Before | Now |
| --- | --- | --- | --- |
| 1 | `.vercel.app` URL | pass — `aurixasystems.com.au` | unchanged |
| 2 | view-source empty | **fail** | prerendered — 11 public routes ship real markup |
| 3 | no 404 page | **fail** — unknown paths rendered an empty `<main>`, HTTP 200 | real `404.html`, genuine **HTTP 404** |
| 4 | default "Vite + React" title | pass | unchanged |
| 5 | same title on every page | **fail** — 3 of 19 routes set one | all 19 distinct |
| 6 | no meta description | **fail** | sitewide default + per route |
| 7 | no `og:image` | **fail** — no tags, no asset | 1200×630 card, full OG + Twitter |
| 8 | no structured data | **fail** | `Organization` + `WebSite` JSON-LD |
| 9 | multiple H1s | pass | unchanged |
| 10 | no H1 | pass — **the audit got this wrong first, see below** | unchanged |
| 11 | no canonical | **fail** | static default + per route |
| 12 | no `llms.txt` | **fail** | generated |
| 13 | AI blocked in `robots.txt` | **fail** — no `robots.txt` at all | published, AI agents allowed |
| 14 | no favicon | pass, but it was 535 KB | 1.6 KB PNG + apple-touch-icon |
| 15 | no `sitemap.xml` | **fail** | generated, 11 public routes |
| 16 | no `lang` | pass | refined to `en-AU` |
| 17 | missing alt text | pass | unchanged |
| 18 | public source maps | pass — none emitted | unchanged |
| 19 | leftover comments | pass | unchanged |
| 20 | *(obscured by the video's own overlay)* | — | — |

## Two corrections worth recording

**Every page already had exactly one `<h1>`.** The first pass reported seven
public pages with none, from a `grep '<h1'`. They are written `<motion.h1>` —
`motion/react` renders a real `<h1>` — so the grep missed all of them. Acting on
that finding would have added a *second* `<h1>` to seven pages, turning a passing
check into a failing one. The real defect was heading-level *skips*.

**`robots.txt` does not disallow the unlisted routes**, though the checklist
implies it should. Two reasons, both load-bearing:

1. `Disallow` and `noindex` defeat each other. A disallowed URL is never
   fetched, so the crawler never sees the `X-Robots-Tag` — and Google will still
   index a URL it finds linked, listing it without a description. Guaranteed
   de-indexing requires *permitting* the crawl and serving `noindex`.
2. `robots.txt` is world-readable at a well-known address. Listing
   `/pricing-mock` there would publish the URL of the page that charges real
   cards against the live Stripe account. Nothing in `src/` links to it.

The `X-Robots-Tag` headers in `vercel.json` are what actually keeps those pages
out of an index. `src/lib/routeMetadata.test.ts` asserts no unlisted path appears
in `robots.txt`, `sitemap.xml` or `llms.txt`.

## The route registry

`src/lib/routeMetadata.ts` is the single source of truth. One record per route:
path, title, description, and `indexable`.

That last field is read by four separate mechanisms — the sitemap, `llms.txt`,
the per-page `robots` directive, and the `X-Robots-Tag` list in `vercel.json`.
Keeping the decision in one table is what stops them drifting apart, because the
consequence of drift is not an SEO regression. `/pricing-mock` drives A$1
fixtures against the **live** Stripe account; `/questionnaire` and
`/schedule-strategic-review` are reached only by token; the `/pricing/*` receipts
carry a handoff token in the URL. Publishing any of them is an incident.

`routeMetadata.test.ts` fails if a route in `App.tsx` has no registry entry, so a
new route cannot ship without someone deciding whether it is indexable. Both
sides of the split are pinned by name, so moving a route either way means
deleting a line from a test, not just editing a boolean.

Current split (October 2026; the audit above was taken at 11 and 8):

| Public (15) | Unlisted (9) |
| --- | --- |
| `/` `/platform` `/solutions` `/industries` `/builders` `/builders/apply` `/about` `/resources` `/docs` `/contact` `/compliance` `/compliance-passport` `/privacy-policy` `/terms-and-conditions` `/status` | `/pricing` `/pricing/success` `/pricing/cancel` `/pricing/card-saved` `/pricing-mock` `/questionnaire` `/schedule-strategic-review` `/feedback` `/support` |

## One metadata implementation

`src/lib/pageMetadata.ts` replaces three near-identical hand-rolled effects in
`LegalDocumentLayout`, `Questionnaire` and `ScheduleStrategicReview`.

All three used capture-previous / restore-on-unmount, which assumes the outgoing
route's cleanup runs before the incoming route's effect. That is the usual order
but not a guarantee — under StrictMode's double invocation or a concurrent
transition it inverts, and the outgoing page overwrites the title the incoming
page just set. The shared hook keys its restore on **identity**: it only reverts a
tag whose current value is still the one it wrote. Managed tags are stamped
`data-page-meta` so the hook never removes the static defaults from
`index.html`; it updates those in place and restores them.

## Files served from `public/`

`robots.txt`, `sitemap.xml` and `llms.txt` are plain files. No `vercel.json`
change was needed: Vercel's filesystem check runs *before* the catch-all rewrite,
which was confirmed empirically — production already served
`/brand/…png` as `image/png` while `/robots.txt` fell through to the rewrite and
returned HTML. The files were simply absent.

`sitemap.xml` and `llms.txt` are generated by `scripts/generate-seo-files.ts`,
wired to `prebuild`, and committed so they appear in review. A hand-maintained
sitemap is exactly how `/pricing-mock` would eventually get published.

`lastmod` and `changefreq` are deliberately omitted — `lastmod` would move on
every deploy whether or not the page changed, and a `lastmod` that cannot be
trusted is worse than none.

## Assets

Five of the six `ChatGPT Image Jun 5, 2026, 04_32_43 PM.png` files were **not**
orphans — they were the homepage's five capability card images, live in
production, their generator's filename visible in every network waterfall and
right-click.

The five are now WebP at 1024 px with descriptive names: **9.07 MB → 0.31 MB, a
96.6% reduction.** They are resized, never cropped, because LYR-03 depends on an
`objectPosition` of `30% 25%`. Counting the sixth file below, which was removed
outright, `public/brand/` sheds 10.4 MB and `dist/` goes from roughly 13 MB to
3.4 MB.

The sixth (`08_04_59`) was genuinely unreferenced. It was briefly carried
through the rename to preserve the intent of open PR #21, which proposed it for
the Enterprise Governance card — but that PR was investigated and closed as
superseded: commit `c370bef` (30 Jul) imported that very asset *and* chose
`09_23_40` for the card in the same commit, and that image is being kept. With
nothing left pointing at it, the sixth file was dropped rather than shipped. The
original PNG remains in git history if the decision is ever revisited.

### The two the checklist implied but never named

Neither of these is an SEO problem. Both were on every page.

**The favicon was 535 KB.** `aurixa-symbol.svg` was a base64-encoded JPEG
wrapped in an SVG — nothing about it was vector — fetched on every page load to
paint a 16 px tab icon, and again on the home page to fill a 96 px square. It is
deleted. The tab icon is a 1.6 KB PNG; the home page uses a 19 KB WebP.

**The logo was the build source.** `BrandLogo` renders in the header *and* the
footer of every page, and it was pointed at
`public/brand/aurixa-systems-logo-source.jpg` — a 401 KB, 2048 px original that
the brand scripts derive from. It now renders a 48 KB WebP, and the source has
moved to `brand-source/`, outside `public/`, so it is not deployed at all.

Sizing it is worth a note, because the obvious answer is wrong: the widest CSS
box is `w-[560px]`, but the image is `object-contain` against a 112 px height
and the lockup is ~3.16:1, so it actually paints at 354 px wide. Building for
the declared 560 would have shipped 60% more pixels than any display can use.

`scripts/build-share-assets.py` builds the OG card, both app icons and both
display marks, reusing the ground, glow and placement helpers from
`build-stripe-brand-assets.py` so the sets cannot drift. Every constraint it
depends on — exact OG dimensions, alpha present or absent, file size ceilings —
is asserted in the script rather than trusted.

The same reasoning removed one more thing: `public/brand/stripe/` held 814 KB of
PNGs that `apply-stripe-branding.mjs` uploads **from disk** to Stripe's Files
API. Nothing ever fetched them over HTTP. They were in the served directory by
accident and are now in `brand-source/stripe/` with the rest of the build
inputs.

**`public/brand/` is now 503 KB, down from 12.7 MB** — and every file left in it
is a derivative sized for the box it renders in.

## Prerendering — what closed item 2

`scripts/prerender.ts` runs after the client build and writes a real file for
every route: `dist/platform/index.html`, `dist/privacy-policy/index.html`, and
so on. `src/entry-server.tsx` renders the same `AppShell` under a `StaticRouter`
with `react-dom/server`, and the script rewrites the head tags per route from
the same registry everything else reads.

The result, measured on the built output:

| Route | Visible text in served HTML |
| --- | --- |
| `/` | 4,205 chars |
| `/platform` | 9,702 chars |
| `/privacy-policy` | 10,740 chars |
| `/questionnaire` | 590 chars (chrome only — correct, see below) |

**Unlisted routes prerender as a shell on purpose.** They are `lazy()` in
`App.tsx`, so `renderToString` emits the Suspense fallback rather than their
content. That is the right outcome twice over: a token-gated page has no
business publishing its markup, and the heavy pages stay out of the entry
bundle. They still get their own title, canonical and `noindex` baked into the
served bytes.

The corollary is load-bearing and easy to break: **an indexable route must be
imported eagerly.** Making one `lazy()` would silently ship an empty page to
every crawler — visually identical in a browser, because the client renders it
either way. The prerender script fails the build if an indexable route comes out
without an `<h1>`, and `routeMetadata.test.ts` asserts the same thing against
the built output.

**The output is not hydrated.** `src/main.tsx` still calls `createRoot`, which
discards the prerendered markup and renders fresh. That is deliberate:
`HeroBackgrounds` seeds its particle field from `Math.random()`, so server and
client markup differ by construction and `hydrateRoot` would spend its first
frame losing a reconciliation it cannot win. What the pass buys is the served
bytes — real content and correct metadata for anything that reads without
executing — plus a meaningful first paint before a 606 KB bundle arrives.

## The 404 is now a real 404

Because every route is a file on disk, `vercel.json` no longer needs its
catch-all rewrite, and it has been removed. Vercel's filesystem check answers
all 19 routes; anything else misses and gets `dist/404.html` with a genuine
**HTTP 404**.

Verified against a local server that mimics Vercel's resolution order — exact
file, then `path/index.html`, then `404.html` — across all 19 routes (200),
four shapes of unknown path including `/platform/deeper` (404), and both
token-carrying query strings (`?t=`, `?session_id=&h=`), which still resolve.

A catch-all rewrite would silently restore the soft 404, so
`routeMetadata.test.ts` fails if one reappears.

## Gated routes: what `noindex` does and does not do

A follow-up pass asked whether the eight unlisted routes are actually
*protected*, not merely undiscoverable. The discoverability half checks out —
verified on production: `X-Robots-Tag: noindex, nofollow` on all eight and on
none of the eleven public routes, the same directive in each gated page's
prerendered HTML, nothing gated in `sitemap.xml`, `llms.txt` or `robots.txt`.

The protection half turned up two things `noindex` has no bearing on.

### The mock catalogue was public, and `noindex` was irrelevant to that

`/pricing-mock` was correctly marked `noindex` and prerendered as a clean shell.
None of that mattered. Its **JavaScript chunk is a static asset**: fetched
anonymously from production it returned `HTTP 200` and 24 KB containing **41
live `buy.stripe.com` Payment Links, 42 price ids and the live Stripe account
id**. Robots directives apply to documents, not assets. Route obscurity bought
nothing either — the entry chunk served on `/` hard-codes every lazy chunk
filename, so the path never had to be guessed.

The risk is not the A$41 someone could hand over. Low-value live payment links
that anyone can find are a standard card-testing target, and card testing brings
chargebacks and account review.

Fixed by not building it: `VITE_ENABLE_PRICING_MOCK` (see `.env.example`) is set
only on preview/staging, and with it unset Rollup eliminates the module
entirely. The `lazy()` call has to be inside the conditional, not just the
`<Route>` — a dynamic `import()` at module scope is a chunk boundary and gets
emitted even when the route using it is dead code.

`routeMetadata.test.ts` asserts the outcome against `dist/` rather than trusting
tree-shaking, scoped to the mock catalogue's own literals: the 22 live
full-price links in `addonPurchaseLinks.ts` are product functionality and are
meant to ship, so a blanket check would be wrong.

> Worth a decision separately: `/pricing` tells visitors module pricing is
> shared on request, while its chunk carries all 22 module links and their exact
> amounts. That is not a leak — it is how the add-on purchase flow works — but
> the page's claim and the bundle disagree, and someone should pick which is
> meant to be true.

### `/questionnaire` has no working authorisation

Covered in full in `docs/readiness-questionnaire-stage-2.md`. In short: the
dynamic-link gate accepts any `?token=<16+ chars>&expires=<future date>` on a
regex shape check with no signature and no network call, and the Stage 2 service
that would verify properly has never been deployed. No data leaks — prefill
comes back empty — but a forged session can submit into the Business Readiness
pipeline.

It cannot be fixed in the browser, so what changed here is honesty and
capability, not protection: the submission now carries `accessTokenPresented`
so the Make scenario **can** validate, and `accessVerified: false` so the
operations record stops implying something was checked. The real fix is
server-side and outside this repo.

### Asking AI crawlers to skip the bundles

`robots.txt` now carries `Disallow: /assets/` in the named AI-crawler group, and
`vercel.json` sets `X-Robots-Tag: noindex` on `/assets/(.*)`.

This is newly safe *because* of prerendering: the served HTML is already the
whole page, so an agent that skips the bundles loses no content. Search engines
are deliberately not asked to skip them — Google reads assets to confirm a page
is not cloaking.

Being clear about what this is: robots.txt asks, it does not enforce. It is not
what keeps anything sensitive out of the bundle. Not building it is.

## Submitting the sitemap

The sitemap is valid XML with 11 `<loc>` entries, and every URL in it returns
200 — checked individually against production.

### IndexNow — automated

`npm run submit-indexnow` (`scripts/submit-indexnow.ts`) POSTs the indexable URL
list to `https://api.indexnow.org/indexnow`, which **Bing, Yandex, Seznam and
Naver share** — one submission reaches all of them. Ownership is proved by the
key file at `public/<key>.txt`; the script verifies that file is live before
submitting, because a 403 from the endpoint otherwise just means the deploy has
not landed.

It is deliberately not wired into `postbuild`: re-submitting an unchanged URL
list on every deploy is how a host gets throttled. Run it when the public pages
actually change. `--dry` prints the payload without sending it.

### Google Search Console — manual, and it has to be

**Google cannot be automated from here.** The sitemap ping endpoint was retired
and returns 404 (I called it), and the Search Console API requires OAuth against
a property a human has verified. This is a one-off, roughly two-minute job for
someone with account access:

1. **Verify ownership — prefer the DNS TXT method.** It covers the apex and
   every subdomain at once and survives a change of host, neither of which is
   true of the HTML-tag method. (If the tag method is used instead, the token
   goes in `index.html` and `scripts/prerender.ts` copies it to all 20 pages
   automatically — no per-page work.)
2. Add the property as a **Domain** property, not URL-prefix, so `www` and the
   apex are one property rather than two sets of numbers.
3. **Sitemaps → enter `sitemap.xml` → Submit.**
4. Spot-check with URL Inspection: `/` should show the prerendered content, and
   `/questionnaire` should report *Excluded by 'noindex' tag*.

## Code splitting

The entry chunk was 936 KB and Vite warned about it on every build. Two changes:

- **Vendors are separated** — React, the router, `motion` and `lucide-react`
  each get their own chunk. They change far less often than the site does, so a
  copy deploy no longer makes every visitor re-download React to read a
  reworded paragraph.
- **Unlisted routes are `lazy()`** — Pricing and Questionnaire alone are ~4,000
  lines, and every visitor to the home page was downloading them.

Initial payload: **936 KB in one chunk → 606 KB across five**, four of which
are long-lived vendor files. The route chunks (Questionnaire 87 KB, Pricing
61 KB, ScheduleStrategicReview 46 KB, PricingMock 24 KB, Feedback 14 KB) now
load only when someone actually opens those pages. The build warning is gone.

## Known limits

**Prerendered markup is a snapshot, not a server render.** Nothing on a public
page depends on request state, so this is currently free — but a page that
needed per-request data would show the build-time version until the bundle took
over. Anything like that belongs on an unlisted route, which is a shell anyway.

**The build now needs a second Vite pass and a Node render.** `npm run build`
runs `vite build`, then `vite build --ssr`, then `tsx scripts/prerender.ts`.
It adds roughly a second. No browser is involved — prerendering uses
`react-dom/server`, not a headless Chromium — so CI needs nothing installed
that it did not already have.

**`X-Robots-Tag` headers could not be verified before merge.** They come from
`vercel.json`, so they only exist on a real deployment — and the PR's preview
deployment is behind Vercel Deployment Protection, where every path answers
`302` to `vercel.com/sso-api` with Vercel's own blanket
`X-Robots-Tag: noindex` attached to the auth gate. Nothing about the site's own
headers is observable through it. (Worth knowing before someone reads a preview
response as evidence: the auth gate's header says `noindex`, while the rule in
`vercel.json` says `noindex, nofollow` — the value is how you tell them apart.)

Run this against production after the first deploy, or against a preview with
protection bypassed:

```bash
curl -sI $BASE/questionnaire | grep -i x-robots-tag   # expect noindex, nofollow
curl -sI $BASE/platform      | grep -i x-robots-tag   # expect nothing
```

The risk of shipping this unverified is low but not zero, and it is bounded:
`routeMetadata.test.ts` checks every unlisted path against the header rules'
own regexes, and — the part that actually matters — every unlisted page now
carries `<meta name="robots" content="noindex, nofollow">` in its prerendered
HTML. If the header rule were wrong, the directive would still be in the served
bytes of every page that needs it. The header is the belt; the meta tag is the
braces.

## Verification

```
npm run lint     # tsc --noEmit — clean
npm test         # 220 pass (was 203; 17 registry and prerender guards)
npm run build    # clean; no chunk-size warning
```

Driven through a real browser against a server mimicking Vercel's resolution
order, all 20 routes including the 404: exactly one `<h1>`, no heading-level
skips, a unique title, and exactly one each of `description`, `og:title` and
`canonical` — with `robots` present on precisely the eight unlisted routes plus
the 404 and nowhere else. After sixteen consecutive client-side navigations the
tag counts had not grown and the title was not stale.

Status codes checked across all 19 routes (200), four shapes of unknown path
(404), and token-carrying query strings (200). Static files serve as
`text/plain` and `application/xml` rather than falling through to a shell.

The home page was screenshotted after a full client boot to confirm the new
lockup renders and nothing regressed visually.

Still to check on a preview deployment, because it cannot be tested locally:

```bash
curl -sI $BASE/questionnaire | grep -i x-robots-tag     # expect noindex, nofollow
curl -sI $BASE/platform      | grep -i x-robots-tag     # expect nothing
```

## SEO optimisation pass — October 2026

A follow-up pass on titles, descriptions, the public SEO files and structured
data. Nothing about routing, prerendering, billing or the noindex machinery
changed: all nine unlisted routes keep `indexable: false`, their prerendered
`noindex, nofollow`, their `X-Robots-Tag` header and their absence from
`sitemap.xml` and `llms.txt`.

### Titles and descriptions

Six public pages had titles that were only their navigation label —
`Platform | Aurixa Systems`, `Solutions | …`, `Industries | …`, `About | …`,
`Resources | …`, `Compliance | …` — which tells a search result nothing. Each now
says what the page covers, and every description was rechecked against the
page's own copy:

| Route | Title now | Why the description changed |
| --- | --- | --- |
| `/platform` | Property Intelligence & Financial Modelling Platform | Leads with the modules the page actually details |
| `/solutions` | Solutions for Property Advisory Firms | Was generic; now the page's three outcomes |
| `/industries` | Industries: Buyers Agents, Advisory & Finance Firms | **Was wrong**: claimed "accounting and SMSF, conveyancing" audiences the page never mentions; now the nine the page lists |
| `/builders` | Builders Network: Publish Stock to Advisory Firms | Unchanged |
| `/about` | About Us: Built From Inside Property & Finance | Now the page's actual story: who built it, its principles, the data sovereignty framework |
| `/resources` | Platform Module Library | **Was wrong**: promised "guidance, frameworks and reference material"; the page is a directory of platform modules |
| `/docs` | Command Center Documentation | Unchanged; matches the page's H1 |
| `/contact` | Priority Access Application (unchanged) | Names the waitlist, which is the page's H1 |
| `/compliance` | Compliance, Security & AML/CTF Governance | **Was wrong**: claimed "hosting, data residency" content the page does not have |
| `/compliance-passport` | AML/CTF Compliance Passport (unchanged) | Was 296 characters; tightened to the six steps the page sets out |

The home page title and the sitewide description were already specific and
accurate, and are unchanged. Claims that appear on a page but would mislead out
of context — infrastructure-provider certifications, "patented", performance
multiples — are deliberately kept out of metadata and `llms.txt`.

### robots.txt

The rules are unchanged: every crawler may fetch everything, and the named AI
agents are asked to skip `/assets/`. The **comments** changed. They used to name
`/pricing-mock`, `/questionnaire`, `/schedule-strategic-review` and the
`/pricing/*` receipts — to explain why those paths were *not* listed — which
published the very addresses the file was careful not to list. The test that
should have caught it stripped comments before checking. The comments now
explain the policy without naming a route, and the same was true of a comment in
`index.html`, which ships in every prerendered page.

The check now reads the whole file, comments included, and recognises a path
however it is written (directive, comment, link, absolute URL, or a hyphenated
slug like `pricing-mock` without its slash) while letting ordinary words like
"pricing" and "support" through. It lives in `src/lib/seoFiles.ts` as
`unlistedRoutesNamedIn` and runs twice: in the test suite, and in
`scripts/generate-seo-files.ts` at prebuild — because this repository has no CI,
the build is the only gate that runs on every deploy. A violation fails the
build.

### llms.txt

Still generated, still linking only indexable routes. It now carries the legal
entity and ABN (from `src/lib/legal.ts`, the record the legal pages print), a
plain-language summary of each capability area — property intelligence and
modelling, client reporting, operational automation, Compliance OS, the
Compliance Passport, the Builders Network, security — and links every public page
(it previously omitted `/builders/apply`). Every statement restates something a
public page already says.

The old line "pricing is not published on the public site" was replaced with
"This guide does not cover pricing." `/pricing` is unlisted and `noindex`, but
it is reachable by URL and linked from `/docs`, so the old sentence was not
accurate.

`llms.txt` is an emerging convention (llmstxt.org), not a standard any search
engine or assistant is obliged to read. It costs nothing and keeps one accurate
summary at a well-known address; it should not be expected to move rankings.

### sitemap.xml

Unchanged, byte for byte — the public route set did not change. `lastmod` stays
absent: there is no reliable source for when a page's *content* last changed
(commit dates move for styling and refactors, and a shallow clone has none), and
an untrustworthy `lastmod` is worse than none. `priority` is kept as a relative
hint between this site's pages; Google ignores it and it is not a ranking factor.

### Structured data

The Organization `logo` now points at the square brand mark
(`/brand/aurixa-symbol-192.webp`, 192×192, transparent, reads correctly on
white) instead of the 1200×630 social card, which search surfaces would crop or
shrink in their small square logo slot. Google's guidance is at least 112×112, a
crawlable URL, and a format Google Images supports.

The legal name, ABN and region match `src/lib/legal.ts` and pass the ATO ABN
checksum; they are unchanged. They could not be checked against the ABR during
this pass (the lookup service was not reachable from the build environment), so
that remains a manual confirmation.

`BreadcrumbList` was considered and not added: the site is one level deep apart
from `/builders/apply`, and has no visible breadcrumb trail for the markup to
describe. Still no `Product` or `Offer` markup, and a test now forbids any.

### Internal links

The header and footer already link nearly every public page from every page.
What was thin was in-copy linking: most pages' body text linked only to
`/contact`. Eight existing phrases now link to the page that covers them — no
new copy, sections or calls to action:

| Page | Phrase | Links to |
| --- | --- | --- |
| `/industries` | "10-year cash flow analysis" | `/platform` |
| `/industries` | "compliance risk" | `/compliance` |
| `/solutions` | "serviceability models" | `/platform` |
| `/platform` | "enforce compliance" | `/compliance` |
| `/about` | "enterprise-grade SSL/TLS encryption" | `/compliance` |
| `/resources` | "governed modules" | `/docs` |
| `/docs` | "every module" | `/resources` |
| `/compliance-passport` | "regulatory responsibility" | `/compliance` |

They link to pages, not `#sections`: `ScrollToTop` deliberately leaves fragment
URLs alone, and only footer links carry the state that scrolls to a section.
They use the site's existing inline-link colour plus a faint underline, because
teal against the muted body grey is about 1.15:1 — colour alone does not mark
them as links (WCAG 1.4.1).

### Tests

`src/lib/seoFiles.test.ts` is new; `routeMetadata.test.ts` was strengthened.
Between them they now also cover: the public route set pinned by name; unique
descriptions and the title convention; the committed `sitemap.xml` and
`llms.txt` equal to the generator's output byte for byte; sitemap well-formedness;
`llms.txt` shape, coverage, and the absence of prices, payment details and
credentials; robots.txt parsed and evaluated per RFC 9309 (Googlebot and Bingbot
can fetch every public page and its assets, every unlisted page stays fetchable
so its `noindex` is visible, the AI agents keep their rules); the exact
`noindex, nofollow` header value; JSON-LD validity, identity, logo size and the
absence of offers and prices; `index.html` defaults agreeing with the registry;
and, against the build, one of each head tag per page with the right values,
JSON-LD intact on every page, every internal link resolving (including footer
`#section` targets), no public page linking a gated route other than `/support`
(footer) and `/pricing` (documentation), no orphaned public page, and the full
header and footer on every public page.

Each guard was mutation-tested — the old robots.txt, a broad `Disallow: /pri`,
a hand edit to `llms.txt`, `/docs` flipped to unlisted, the logo reverted, an
`Offer` added, a link to `/questionnaire`, a dropped footer link — and each
fails the suite.

### Still manual: Search Console and Bing Webmaster Tools

Neither was reachable from the environment this pass ran in, so nothing was
submitted or checked there. For someone with account access:

1. **Google Search Console** (Domain property, DNS-verified as described above):
   Sitemaps → confirm `sitemap.xml` is submitted and reads 15 URLs. Pages →
   check for "Duplicate, Google chose different canonical" or "Crawled –
   currently not indexed" on public pages. URL Inspection on `/platform` should
   show the new title; on `/pricing` it should report *Excluded by 'noindex'
   tag*. Search for `site:aurixasystems.com.au pricing` to confirm no unlisted
   page is in the index.
2. **Bing Webmaster Tools**: import the site from Search Console (or verify by
   DNS), submit `sitemap.xml`, and check URL Inspection the same way.
3. **IndexNow** reaches Bing and the other participating engines:
   `npm run submit-indexnow -- --dry` to review, then `npm run submit-indexnow`
   once the deploy is live. Run it once per material change, not per deploy.

None of this makes indexing immediate or guaranteed; search engines recrawl on
their own schedule.
