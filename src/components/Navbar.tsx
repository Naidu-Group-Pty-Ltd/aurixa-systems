import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Platform", href: "/platform" },
  { label: "Solutions", href: "/solutions" },
  { label: "Industries", href: "/industries" },
  { label: "About", href: "/about" },
  { label: "Compliance", href: "/compliance" },
  { label: "Passport", href: "/compliance-passport" },
  { label: "Resources", href: "/resources" },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // A route change closes the panel even when it was not a tap on a link that
  // caused it — browser back, a redirect, a deep link from elsewhere.
  useEffect(() => setIsOpen(false), [pathname]);

  // While the panel is open: Escape dismisses it and the page behind it stops
  // scrolling, so a swipe moves the menu rather than the content underneath.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#040B16]/90 backdrop-blur-xl border-b border-[#00A8B5]/20 pad-safe-x pad-safe-top">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[var(--site-header-height)] flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 py-1 lg:flex-none">
          {/* max-w-full, not a 100vw calc: on desktop 100vw counts the
              scrollbar and would let the mark run past its own column.
              lg sizes are tightened: eight nav items plus the CTA meet a
              1024px viewport with nothing to spare. */}
          <BrandLogo priority compact className="max-w-full lg:!w-[190px] xl:!w-[260px]" />
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-3 lg:flex xl:gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`text-[12px] xl:text-[13px] font-semibold text-gray-300 hover:text-white transition-colors tracking-wide ${isActive(item.href) ? "relative text-white after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:bg-[#C89B3C] after:content-['']" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            to="/contact"
            className="group relative isolate inline-flex items-center justify-center overflow-hidden px-4 xl:px-6 py-2.5 text-[13px] font-black tracking-widest uppercase text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,168,181,0.3)] hover:shadow-[0_0_30px_rgba(200,155,60,0.6)]"
          >
            <span className="relative z-10 text-white tracking-[0.18em] xl:tracking-[0.25em] font-semibold">JOIN WAITLIST</span>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close mobile menu" : "Open mobile menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          className="lg:hidden relative z-50 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-slate-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A8B5]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-7 w-7" strokeWidth={2.25} /> : <Menu className="h-7 w-7" strokeWidth={2.25} />}
        </button>
      </div>

      {/* Mobile Menu.
          Capped to the space actually left below the bar and scrollable inside
          it, so the full list stays reachable on a short or landscape screen
          instead of running off the bottom with nothing to scroll. */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden absolute top-full left-0 right-0 max-h-[calc(100dvh-var(--site-header-height)-var(--safe-top))] overflow-y-auto overscroll-contain bg-[#0B162C] border-b border-[#00A8B5]/20 p-6 pb-[max(1.5rem,var(--safe-bottom))] flex flex-col gap-1 shadow-[0_20px_40px_rgba(0,168,181,0.1)]"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center text-lg font-bold uppercase tracking-widest text-[#94A3B8] hover:text-[#00A8B5] ${isActive(item.href) ? "relative text-white after:absolute after:bottom-1.5 after:left-0 after:h-px after:w-6 after:bg-[#C89B3C] after:content-['']" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <hr className="border-white/10 my-2" />
          <Link
            to="/contact"
            onClick={() => setIsOpen(false)}
            className="flex min-h-[44px] items-center text-lg font-bold text-[#C89B3C] uppercase tracking-widest hover:text-[#00A8B5]"
          >
            Join Waitlist
          </Link>
        </div>
      )}
    </header>
  );
}
