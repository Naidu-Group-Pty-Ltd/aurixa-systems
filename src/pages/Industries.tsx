import { motion } from "motion/react";
import { ArrowRight, Briefcase, Landmark, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { IndustriesHeroVisual } from "../components/AnimatedHeroVisuals";
import { useRouteMetadata } from "../lib/pageMetadata";

export default function Industries() {
  useRouteMetadata("/industries");
  return (
    <div className="w-full relative pt-32 pb-20 bg-[#040B16] min-h-dvh overflow-hidden">
      <HeroBackground variant="industries" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)] gap-8 items-center mb-24">
          <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-px bg-white/50" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Market Operations</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome-clean drop-shadow-md">Built for the</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Apex Players.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-3xl mb-12"
          >
            Aurixa is not designed for hobbyists. It is designed for specific market operators who manage serious capital and demand instantaneous, unassailable reporting capabilities. Aurixa Systems is designed exclusively for property businesses that demand scalable operational infrastructure. Transform your firm's workflows, client experience, and systemic efficiency.
          </motion.p>
          </div>
          <IndustriesHeroVisual />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#00A8B5] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <UserCheck className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Buyers Agents</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Prove your value instantly. Instead of telling a client a property is a good investment, generate a 10-year cash flow analysis that proves it mathematically before the competition can even run a CMA.
                <br />
                <br />
                Pain Point: Manual property searches, slow due diligence turnaround, and lack of visual professional reporting.
                <br />
                <br />
                Transformation Outcome: Instant property analysis, rapid strategic briefing delivery, and institutional-grade client presentations.
              </p>
              <div className="w-full h-px bg-[#00A8B5]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#C89B3C] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Landmark className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Wealth Advisors</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Integrate property into your wider wealth strategies without the compliance risk. Sync our matrices directly with your CRM and stop guessing on borrowing capacities.
                <br />
                <br />
                Pain Point: Difficulty standardising property advice within wider wealth strategies, manual compliance checking, and risk of providing unregulated advice.
                <br />
                <br />
                Transformation Outcome: Governed, white-labelled financial modelling infrastructure ensuring compliance and delivering board-grade strategic direction.
              </p>
              <div className="w-full h-px bg-[#C89B3C]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-white hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Briefcase className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Enterprise Firms</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Standardize output across 50+ brokers effortlessly. Ensure every presentation that leaves your office carries the same elite, mathematically air-tight Aurixa seal of approval, white-labeled to your brand.
                <br />
                <br />
                Pain Point: Scaling operations involves exponential headcount and maintaining consistency across a massive footprint.
                <br />
                <br />
                Transformation Outcome: Enterprise infrastructure featuring deep systems administration, role-based permissions, and complete brand governance across all sub-entities.
              </p>
              <div className="w-full h-px bg-white/20" />
           </div>
           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#00A8B5] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <UserCheck className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Property Advisory Firms</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Fragmented systems trying to combine macro-economic data, client financials, and property research.
                <br />
                <br />
                Transformation Outcome: A unified operational environment that centralises intelligence, modelling, and client reporting.
              </p>
              <div className="w-full h-px bg-[#00A8B5]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#C89B3C] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Landmark className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Real Estate Agencies</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Commoditised brand positioning against competitors and failure to deliver strategic ongoing value directly to property investors.
                <br />
                <br />
                Transformation Outcome: Structured financial intelligence that empowers agents to advise investors, dramatically strengthening retention and brand authority.
              </p>
              <div className="w-full h-px bg-[#C89B3C]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-white hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Briefcase className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Mortgage & Finance Businesses</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Isolating the loan process from the property strategy and losing clients post-settlement due to a lack of ongoing advisory touchpoints.
                <br />
                <br />
                Transformation Outcome: A continuous client ecosystem, integrating borrowing capacity directly into property growth and 10-year holding scenarios.
              </p>
              <div className="w-full h-px bg-white/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#00A8B5] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <UserCheck className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Investment Groups</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Slow deployment of capital due to inefficient asset qualification and disjointed multi-office communication and reporting lines.
                <br />
                <br />
                Transformation Outcome: Rapid operational oversight and centralised platform control, accelerating asset acquisition and internal portfolio reporting.
              </p>
              <div className="w-full h-px bg-[#00A8B5]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#C89B3C] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Landmark className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Developers</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Inability to project individual lot yields for potential buyers and selling purely on price rather than long-term strategic value to the investor.
                <br />
                <br />
                Transformation Outcome: Sales teams equipped with snapshot intelligence and cash flow mechanics to validate off-the-plan acquisitions mathematically.
              </p>
              <div className="w-full h-px bg-[#C89B3C]/20" />
           </div>

           <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-white hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
              <Briefcase className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="text-2xl font-display font-light text-white mb-4">Enterprise Property Networks</h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
                Pain Point: Scaling operations involves exponential headcount while maintaining consistency and quality control across a massive geographic footprint.
                <br />
                <br />
                Transformation Outcome: Enterprise infrastructure featuring deep systems administration, role-based permissions, and complete brand governance across all sub-entities.
              </p>
              <div className="w-full h-px bg-white/20" />
           </div>
        </div>

        {/* The supply side of the same market. Firms on this page place clients
            into stock; the people building it have their own network. */}
        <div className="-mt-20 mb-32 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-l-2 border-[#C89B3C]/40 pl-6 sm:pl-8 py-4">
          <p className="text-[#9CA3B8] font-light leading-relaxed text-sm max-w-2xl">
            Building or developing the stock itself? Builders and developers publish availability to these firms
            through the Aurixa Builders Network.
          </p>
          <Link
            to="/builders"
            className="group inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.25em] uppercase text-[#00A8B5] hover:text-[#5EDDE8] transition-colors whitespace-nowrap"
          >
            For Builders &amp; Developers
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 glass-panel p-6 sm:p-16 text-center shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute inset-0 bg-chrome-prismatic opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C89B3C] border border-[#C89B3C]/30 mb-8 rounded-sm">Allocation Restricted</span>
            <h2 className="text-4xl md:text-6xl font-display font-light tracking-tight mb-8 text-white">Ready To Scale With Control.</h2>
            <p className="text-[#9CA3B8] mb-12 max-w-2xl mx-auto text-lg leading-relaxed font-light">
              Aurixa is built for property and finance businesses that have outgrown manual processes, disconnected platforms, and reactive operations.
              <br />
              <br />
              Join the ecosystem that connects client engagement, CRM workflows, reporting, integrations, administration, governance, and operational intelligence into one structured environment.
              <br />
              <br />
              Book your demo to explore whether your firm qualifies for the next deployment cycle.
            </p>
            <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)]">
              <span className="drop-shadow-md">Book Your Free Demo</span>
              <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
