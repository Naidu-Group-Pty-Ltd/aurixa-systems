import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import { usePageMetadata } from "../lib/pageMetadata";

/**
 * The catch-all route.
 *
 * Before this existed an unknown path matched no `<Route>`, so `<main>` in
 * `App.tsx` rendered empty — navigation and footer present, nothing between
 * them. It read as a broken page rather than a missing one.
 *
 * There are two ways to reach a missing page, and they are served differently:
 *
 *   • **A direct hit or a refresh** never reaches this component. Every real
 *     route is a prerendered file on disk, so Vercel's filesystem check misses
 *     and serves `dist/404.html` with a genuine **HTTP 404** — the same markup
 *     as below, rendered at build time by `scripts/prerender.ts`.
 *   • **A client-side navigation** to a bad `to=` never touches the network, so
 *     there is no response whose status could be set. This component is what
 *     renders then, and it is the only case that needs it.
 *
 * The `noindex` matters for the second case and is belt-and-braces for the
 * first, which already carries the directive in its served bytes.
 */
export default function NotFound() {
  const { pathname } = useLocation();

  usePageMetadata({
    title: "Page Not Found | Aurixa Systems",
    description: "The page you were looking for is not available.",
    // Canonicalise to the home page rather than to the missing path — a
    // canonical pointing at a URL that does not exist is worse than none.
    canonicalPath: "/",
    robots: "noindex, nofollow",
  });

  return (
    <div className="marketing-page w-full pt-[100px]">
      <div className="mx-auto max-w-xl px-4 py-16 md:px-6">
        <div className="rounded-lg border border-white/10 bg-marketing-panel p-8">
          <div className="flex items-center gap-3">
            <Compass className="h-9 w-9 text-[#94A3B8]" aria-hidden="true" />
            <h1 className="text-2xl font-black text-white">Page not found</h1>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
            Nothing lives at <code className="text-white/80">{pathname}</code>. The
            address may be mistyped, or the page may have moved.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-sm bg-[#00A8B5] px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-105"
            >
              Back to home
            </Link>
            <Link
              to="/contact"
              className="rounded-sm border border-[#00A8B5]/40 px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:border-[#00A8B5]"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
