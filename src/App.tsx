import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";

// ── Eager: every indexable route ─────────────────────────────────────────────
// The split below is not a guess about which pages are popular — it is exactly
// the `indexable` boundary from src/lib/routeMetadata.ts, and it has to be.
// `scripts/prerender.ts` renders these to static HTML with react-dom/server,
// and `renderToString` emits a Suspense fallback for a `lazy()` component
// rather than waiting for it. A lazily-loaded indexable page would therefore
// prerender as an empty box — the exact defect the prerender pass exists to
// fix. Keeping them eager costs about 75 KB in the entry chunk and is the
// price of every public page having real content in view-source.
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import Solutions from "./pages/Solutions";
import Industries from "./pages/Industries";
import Builders from "./pages/Builders";
// Eager because it is indexable, which is the rule stated above rather
// than a judgement about traffic: a lazy indexable page prerenders as an
// empty Suspense fallback.
import BuilderApply from "./pages/BuilderApply";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import Compliance from "./pages/Compliance";
import CompliancePassport from "./pages/CompliancePassport";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import Status from "./pages/Status";
// The catch-all. Renders inside the normal chrome and asks not to be indexed.
import NotFound from "./pages/NotFound";

// ── Lazy: every unlisted route ───────────────────────────────────────────────
// None of these is reachable from navigation or search, and together they are
// the bulk of the application: Pricing and Questionnaire alone are ~4,000
// lines. Anyone reading the home page was downloading all of it. They are
// prerendered as a shell, which is all a token-gated page should ever expose.
const Pricing = lazy(() => import("./pages/Pricing"));
const PricingSuccess = lazy(() => import("./pages/PricingSuccess"));
const PricingCancel = lazy(() => import("./pages/PricingCancel"));
const CardSaved = lazy(() => import("./pages/CardSaved"));
// Stage 2 readiness questionnaire, reached only via a secure single-use link.
const Questionnaire = lazy(() => import("./pages/Questionnaire"));
// Stage 3 strategic review scheduling.
const ScheduleStrategicReview = lazy(() => import("./pages/ScheduleStrategicReview"));
const Feedback = lazy(() => import("./pages/Feedback"));
// Support Portal, reached from a customer dashboard with workspace context in
// the URL (or directly, with the workspace ID typed in).
const SupportPortal = lazy(() => import("./pages/SupportPortal"));

/**
 * The A$1 Stripe test-fixture mirror of the price list — built only when the
 * flag is set, which it is not in production.
 *
 * `src/lib/pricing/mockCatalog.ts` hard-codes 41 Payment Links against the
 * **live** Stripe account, 42 price ids, and the account id itself. Marking the
 * route `noindex` did nothing about that: a JavaScript chunk is a static asset,
 * robots directives do not apply to it, and the entry chunk served on `/` names
 * every lazy chunk file, so the path never had to be guessed. Anyone could
 * fetch it. Low-value live payment links, publicly discoverable, are a standard
 * card-testing target — and card testing brings chargebacks and account review.
 *
 * The `lazy()` call has to sit inside the conditional rather than the `<Route>`
 * alone: a dynamic `import()` at module scope is a chunk boundary, and Rollup
 * emits the chunk even when the route using it is dead code. Written this way,
 * `import.meta.env` is substituted at build time and the whole branch — import
 * included — is eliminated. `routeMetadata.test.ts` proves it against `dist/`
 * rather than trusting it.
 */
const ENABLE_PRICING_MOCK = import.meta.env.VITE_ENABLE_PRICING_MOCK === "true";
const PricingMock = ENABLE_PRICING_MOCK
  ? lazy(() => import("./pages/PricingMock"))
  : null;

/**
 * Everything inside the router.
 *
 * Exported so `src/entry-server.tsx` can mount it under a `StaticRouter` for
 * the prerender pass; the browser entry below mounts the same tree under
 * `BrowserRouter`. Both wrap it in the same `MotionConfig`, so the static HTML
 * and the live app cannot disagree about reduced-motion behaviour.
 */
export function AppShell() {
  const { pathname } = useLocation();
  // Both pricing surfaces carry their own header and footing, so the site
  // chrome is suppressed on each.
  const hidesSiteChrome = pathname === "/pricing" || pathname === "/pricing-mock";

  return (
    <>
      <ScrollToTop />
      {/* Shared gradient definition referenced by every gold-stroked icon. */}
      <svg width="0" height="0" aria-hidden="true" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="icon-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#F5D17A" offset="0%" />
            <stop stopColor="#C89B3C" offset="50%" />
            <stop stopColor="#8A6B29" offset="100%" />
          </linearGradient>
        </defs>
      </svg>
      {/* `app-shell` carries the flex column, the dynamic-viewport minimum and
          `overflow-x: clip` — see index.css for why it is not `hidden`. */}
      <div className="app-shell relative bg-[#040B16] text-white selection:bg-[#C89B3C] selection:text-white">
        <a className="skip-link" href="#main-content">Skip to content</a>
        {!hidesSiteChrome && <Navbar />}
        <main id="main-content" tabIndex={-1} className="flex-grow flex flex-col items-center outline-none">
          {/* The fallback is a sized, empty block rather than a spinner. Every
              lazy route below is either unlisted or reached deliberately, so
              the chunk arrives in a few hundred milliseconds on any real
              connection — a spinner would flash and be gone. What matters is
              that the footer does not jump up the page while it loads, which
              the min-height prevents. */}
          <Suspense fallback={<div className="min-h-[70svh] w-full" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/builders" element={<Builders />} />
            <Route path="/builders/apply" element={<BuilderApply />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/pricing/success" element={<PricingSuccess />} />
            <Route path="/pricing/cancel" element={<PricingCancel />} />
            <Route path="/pricing/card-saved" element={<CardSaved />} />
            {/* The literal path stays in the source unconditionally so the
                registry drift test, which greps this file as text, still sees
                it. With the flag off the route is never mounted, so the path
                falls through to NotFound. */}
            {PricingMock && <Route path="/pricing-mock" element={<PricingMock />} />}
            <Route path="/about" element={<About />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/compliance-passport" element={<CompliancePassport />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/status" element={<Status />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/schedule-strategic-review" element={<ScheduleStrategicReview />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/support" element={<SupportPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>
        {!hidesSiteChrome && <Footer />}
      </div>
    </>
  );
}

export default function App() {
  return (
    // index.css handles CSS animation under prefers-reduced-motion; this is
    // the same contract for the JS-driven entrances. "user" keeps opacity
    // fades and drops the transforms, so nothing disappears — it just stops
    // moving for people who asked it to.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </MotionConfig>
  );
}
