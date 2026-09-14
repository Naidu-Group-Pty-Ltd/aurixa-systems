import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    // The bottom padding clears the home indicator on gesture-navigation
    // phones and collapses to its old value where there is no inset.
    <footer className="bg-[#040B16] border-t border-[#00A8B5]/20 pt-20 pb-[max(2.5rem,calc(var(--safe-bottom)+1.5rem))] w-full mt-auto relative overflow-hidden pad-safe-x">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0055FF]/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center relative z-10">
        {/* The three column headings are h2, not h4. They are top-level
            groupings inside the contentinfo landmark, and the footer renders on
            every route — as h4 they produced an h2->h4 skip in the outline of
            all 19 pages, which is the single most widespread heading defect the
            site had. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20 w-full mb-16">
          <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <BrandLogo className="mb-8 h-28 w-[430px] max-w-full sm:w-[520px] mx-auto md:mx-0" />
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto md:mx-0">
              The indispensable backbone of industrial innovation. Bridging property and financial intelligence for serious advisory firms.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Platform</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-gray-400">
              <li><Link to="/platform" className="hover:text-white transition-colors">Serviceability Engine</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Cash Flow Modelling</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Strategic Reporting</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Property Intelligence</Link></li>
              <li><Link to="/platform" className="hover:text-white transition-colors">Security & Trust</Link></li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Solutions</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-gray-400">
              <li><Link to="/industries" className="hover:text-white transition-colors">For Buyers Agents</Link></li>
              <li><Link to="/industries" className="hover:text-white transition-colors">For Wealth Advisors</Link></li>
              <li><Link to="/industries" className="hover:text-white transition-colors">For Enterprise Firms</Link></li>
              <li><Link to="/solutions" className="hover:text-white transition-colors">Client Reporting</Link></li>
              <li><Link to="/solutions" className="hover:text-white transition-colors">Compliance OS</Link></li>
              <li><Link to="/compliance-passport" className="hover:text-white transition-colors">Compliance Passport</Link></li>
              <li><Link to="/builders" className="hover:text-white transition-colors">For Builders &amp; Developers</Link></li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white mb-6">Company</h2>
            <ul className="flex flex-col items-center md:items-start gap-4 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Aurixa</Link></li>
              <li><Link to="/resources" className="hover:text-white transition-colors">Intelligence Hub</Link></li>
              <li><Link to="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link to="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
              <li><Link to="/status" className="hover:text-white transition-colors">System Status</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Support</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Join Waitlist</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="w-full pt-8 border-t border-[#C89B3C]/15 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Aurixa Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
