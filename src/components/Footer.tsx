import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { FOOTER_NAVIGATION_STATE, resolveFooterNavigation } from "../lib/footerNavigation";
import { TRIAL_CTA } from "../lib/cta";

/** Marks the navigation as footer-initiated; renders the same `<a>` as before. */
function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} state={FOOTER_NAVIGATION_STATE} className="hover:text-white transition-colors">
      {children}
    </Link>
  );
}

export function Footer() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Keyed on location.key, so it runs once per navigation and never replays on
  // an unrelated re-render. It acts only on PUSH/REPLACE navigations carrying
  // the footer's marker; everything else is left to ScrollToTop and the
  // browser exactly as before. See src/lib/footerNavigation.ts.
  useEffect(() => {
    const action = resolveFooterNavigation({ navigationType, state: location.state, hash: location.hash });
    if (action.kind === "ignore") return;

    // Focus follows the scroll so the next Tab continues from the destination
    // instead of returning to the footer. preventScroll stops a second jump.
    const target = action.kind === "section" ? document.getElementById(action.id) : null;
    if (target) {
      target.scrollIntoView();
      target.focus({ preventScroll: true });
      return;
    }

    // Page-top links, and the fallback for a fragment with no matching element.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.key]);

  return (
    // The bottom padding clears the home indicator on gesture-navigation
    // phones and collapses to its old value where there is no inset.
    <footer className="bg-marketing-recessed border-t border-[#00A8B5]/20 pt-20 pb-[max(2.5rem,calc(var(--safe-bottom)+1.5rem))] w-full mt-auto relative overflow-hidden pad-safe-x">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0055FF]/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center relative z-10">
        {/* The three column headings are h2, not h4. They are top-level
            groupings inside the contentinfo landmark, and the footer renders on
            every route — as h4 they produced an h2->h4 skip in the outline of
            all 19 pages, which is the single most widespread heading defect the
            site had. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20 w-full mb-16">
          <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <BrandLogo state={FOOTER_NAVIGATION_STATE} className="mb-8 h-28 w-[430px] max-w-full sm:w-[520px] mx-auto md:mx-0" />
            <p className="text-sm text-marketing-muted leading-relaxed max-w-sm mx-auto md:mx-0">
              The indispensable backbone of industrial innovation. Bridging property and financial intelligence for serious advisory firms.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Platform</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-marketing-muted">
              <li><FooterLink to="/platform#serviceability">Serviceability Engine</FooterLink></li>
              <li><FooterLink to="/platform#cashflow-reporting">Cash Flow Modelling</FooterLink></li>
              <li><FooterLink to="/platform#custom-reporting">Strategic Reporting</FooterLink></li>
              <li><FooterLink to="/platform#suburb-snapshots">Property Intelligence</FooterLink></li>
              <li><FooterLink to="/compliance#security-architecture">Security & Trust</FooterLink></li>
              <li><FooterLink to="/platform#brief-generation">Client Reporting</FooterLink></li>
              <li><FooterLink to="/compliance#connected-compliance">Compliance OS</FooterLink></li>
              <li><FooterLink to="/compliance-passport">Compliance Passport</FooterLink></li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Who We Serve</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-marketing-muted">
              <li><FooterLink to="/industries#buyers-agents">For Buyers Agents</FooterLink></li>
              <li><FooterLink to="/industries#wealth-advisors">For Wealth Advisors</FooterLink></li>
              <li><FooterLink to="/industries#enterprise-firms">For Enterprise Firms</FooterLink></li>
              <li><FooterLink to="/builders">For Builders &amp; Developers</FooterLink></li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Company</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-marketing-muted">
              <li><FooterLink to="/about">About Aurixa</FooterLink></li>
              <li><FooterLink to="/resources">Intelligence Hub</FooterLink></li>
              <li><FooterLink to="/watch">Video Briefings</FooterLink></li>
              <li><FooterLink to="/docs">Documentation</FooterLink></li>
              <li><FooterLink to="/compliance">Compliance</FooterLink></li>
              <li><FooterLink to="/status">System Status</FooterLink></li>
              <li><FooterLink to="/support">Support</FooterLink></li>
              <li><FooterLink to="/contact">{TRIAL_CTA.label}</FooterLink></li>
              <li><FooterLink to="/privacy-policy">Privacy Policy</FooterLink></li>
              <li><FooterLink to="/terms-and-conditions">Terms &amp; Conditions</FooterLink></li>
            </ul>
          </div>
        </div>
        
        <div className="w-full pt-8 border-t border-[#C89B3C]/15 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-marketing-subtle">
          <p>&copy; {new Date().getFullYear()} Aurixa Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
