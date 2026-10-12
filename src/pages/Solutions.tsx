import { motion } from "motion/react";
import { ArrowRight, Target, Crosshair, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { SolutionsHeroVisual } from "../components/AnimatedHeroVisuals";
import { useRouteMetadata } from "../lib/pageMetadata";

export default function Solutions() {
  useRouteMetadata("/solutions");
  return (
    <div className="marketing-page w-full relative pt-32 pb-20 bg-marketing-page min-h-dvh overflow-hidden">
      <HeroBackground variant="solutions" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,.88fr)] gap-8 items-center mb-24">
          <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-px bg-[#00A8B5]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Strategic Solutions</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome-clean drop-shadow-md">Unfair Market</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Dominance.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-3xl mb-12"
          >
            We build solutions that eliminate the guesswork from high-level advisory. By weaponizing data and cash flow models, your firm transforms from a service provider into an undeniable market authority. Strategic overview: model convergence, value realisation, and locked alignment. Businesses care about outcomes. Aurixa Systems transforms operations, empowering property enterprises to scale efficiently, improve client delivery, and dominate their market position.
          </motion.p>
          </div>
          <SolutionsHeroVisual />
        </div>

        <div className="grid grid-cols-1 gap-16 mb-32 relative">
           
           {/* Section 1: Precision Client Acquisition */}
           <div className="glass-panel p-0 relative overflow-hidden group border border-[#00A8B5]/30 hover:border-[#00A8B5]/80 transition-all duration-700 bg-marketing-panel/50 flex flex-col md:flex-row min-h-[400px]">
             
             {/* Abstract UI Visual - Left Side */}
             <div className="w-full md:w-5/12 bg-marketing-recessed border-b md:border-b-0 md:border-r border-[#00A8B5]/20 relative overflow-hidden flex items-center justify-center p-6 sm:p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00A8B5]/10 to-transparent pointer-events-none" />
                <div className="absolute inset-0 opacity-10 grid-hex pointer-events-none" />
                
                {/* Target Lock UI */}
                <div className="relative w-full max-w-[250px] aspect-square rounded-full border border-[#00A8B5]/30 flex items-center justify-center">
                   <div className="absolute w-[120%] h-px bg-[#00A8B5]/20 rotate-45 group-hover:rotate-90 transition-all duration-1000" />
                   <div className="absolute h-[120%] w-px bg-[#00A8B5]/20 rotate-45 group-hover:rotate-90 transition-all duration-1000" />
                   <div className="w-3/4 h-3/4 rounded-full border-2 border-dashed border-[#00A8B5]/50 animate-[spin_20s_linear_infinite]" />
                   <div className="absolute w-1/2 h-1/2 rounded-full border border-[#00A8B5]/80 flex items-center justify-center bg-[#00A8B5]/5">
                     <Target className="w-8 h-8 opacity-80" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                   </div>
                   <div className="absolute -top-4 -right-4 bg-[#0A192F] border border-[#00A8B5] px-2 py-1 flex flex-col gap-1 shadow-lg">
                      <span className="text-[8px] font-mono text-[#00A8B5] leading-none">TARGET_LOCKED</span>
                      <span className="text-[10px] font-mono text-white leading-none">CV: 99.9%</span>
                   </div>
                </div>
             </div>

             {/* Content Side */}
             <div className="w-full md:w-7/12 p-6 sm:p-12 relative flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#00A8B5]/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <h2 className="text-4xl md:text-5xl font-display font-light text-white mb-6 relative z-10 tracking-tight">Precision Client <span className="italic text-[#00A8B5]">Acquisition.</span></h2>
                <p className="text-[#9CA3B8] font-light leading-relaxed mb-8 text-lg relative z-10 max-w-xl">
                  Stop losing prospects to competitors with glossier but hollow presentations. By deploying Aurixa's mathematically air-tight serviceability models in your initial consultation, trust is established instantly. Competitors attempting to sell on intuition will look primitive by comparison. Operational efficiency reduces administrative workload, eliminates fragmented systems, accelerates internal processes, and radically improves team productivity with connected operational tools.
                </p>
                <div className="relative z-10 border-t border-white/10 pt-8">
                   <div className="flex gap-8">
                      <div className="flex flex-col gap-2">
                         <span className="text-3xl font-display text-white">100%</span>
                         <span className="text-xs uppercase tracking-widest text-[#00A8B5] font-bold">Conversion Lift / Model Convergence</span>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col gap-2">
                         <span className="text-3xl font-display text-white">15 Min</span>
                         <span className="text-xs uppercase tracking-widest text-[#00A8B5] font-bold">DETAILED REPORT DELIVERABLE TIME</span>
                      </div>
                   </div>
                   <p className="mx-auto mt-6 max-w-xl text-center text-sm font-light leading-relaxed text-[#9CA3B8]">
                      By combining Speed &amp; Accuracy, we enhance business operations to deliver faster, more reliable results that drive growth and client confidence.
                   </p>
                </div>
             </div>
           </div>

           {/* Section 2: Zero-Friction Compliance (Reverse Layout) */}
           <div className="glass-panel p-0 relative overflow-hidden group border border-[#C89B3C]/30 hover:border-[#C89B3C]/80 transition-all duration-700 bg-marketing-panel/50 flex flex-col md:flex-row-reverse min-h-[400px]">
             
             {/* Abstract UI Visual - Right Side */}
             <div className="w-full md:w-5/12 bg-marketing-recessed border-b md:border-b-0 md:border-l border-[#C89B3C]/20 relative overflow-hidden flex items-center justify-center p-6 sm:p-12">
                <div className="absolute inset-0 opacity-10 grid-hex pointer-events-none" />
                
                {/* Protocol Lines */}
                <div className="relative w-full h-full min-h-[250px] flex items-center justify-center">
                    <div className="absolute w-full h-full flex flex-col justify-between py-10 opacity-30 group-hover:opacity-100 transition-opacity duration-1000">
                       <div className="w-full h-px data-stream-x" />
                       <div className="w-full h-px data-stream-x" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
                       <div className="w-full h-px data-stream-x" style={{ animationDelay: '1s' }} />
                    </div>
                    {/* Glowing Shield Anchor */}
                    <div className="relative z-10 w-32 h-40 border border-[#C89B3C] bg-[#0A192F] shadow-[0_0_50px_rgba(200,155,60,0.2)] flex items-center justify-center clip-path-shield group-hover:shadow-[0_0_80px_rgba(200,155,60,0.4)] transition-all duration-1000 ring-1 ring-white/10 ring-offset-4 ring-offset-[#0B162C]">
                       <div className="absolute inset-0 bg-gradient-to-b from-[#C89B3C]/20 to-transparent" />
                       <Crosshair className="w-12 h-12 relative z-10 group-hover:scale-110 transition-transform duration-700" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                    </div>
                </div>
             </div>

             {/* Content Side */}
             <div className="w-full md:w-7/12 p-6 sm:p-12 relative flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#C89B3C]/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <h2 className="text-4xl md:text-5xl font-display font-light text-white mb-6 relative z-10 tracking-tight">Zero-Friction <span className="italic text-[#C89B3C]">Compliance.</span></h2>
                <div className="text-[#9CA3B8] font-light leading-relaxed mb-8 text-lg relative z-10 max-w-xl space-y-4">
                  <p>
                    Protect your firm against regulatory blowback. The Aurixa engine mathematically prevents advisors from recommending investment strategies that breach APRA buffers or exceed the absolute ceiling of the client’s real-world borrowing capacity.
                  </p>
                  <p>
                    Business scalability means scaling without operational bottlenecks, centralising growing business operations, creating repeatable workflows, and building the infrastructure necessary for rapid expansion. Client experience improves through faster turnaround times, structured reporting delivery, professional client presentation, and stronger engagement and retention.
                  </p>
                </div>
                <div className="flex flex-col gap-4 relative z-10">
                    <div className="w-full bg-marketing-recessed border border-white/10 p-4 flex items-center justify-between shadow-inner">
                        <span className="text-xs uppercase tracking-widest text-gray-500 font-mono">APRA Buffer Alignment / Operational Bottlenecks Reduced</span>
                        <div className="h-1 w-24 bg-marketing-panel rounded-full overflow-hidden">
                           <div className="h-full bg-[#C89B3C] w-full" />
                        </div>
                    </div>
                    <div className="w-full bg-marketing-recessed border border-white/10 p-4 flex items-center justify-between shadow-inner">
                        <span className="text-xs uppercase tracking-widest text-gray-500 font-mono">Digital Audit Trail / Structured Reporting Delivery</span>
                        <div className="h-1 w-24 bg-marketing-panel rounded-full overflow-hidden">
                           <div className="h-full bg-[#C89B3C] w-full" />
                        </div>
                    </div>
                </div>
             </div>
           </div>

           {/* Section 3: Hyper-Scaled Operations */}
           <div className="glass-panel p-0 relative overflow-hidden group border border-white/20 hover:border-white/60 transition-all duration-700 bg-marketing-panel/50 flex flex-col md:flex-row min-h-[400px]">
             
             {/* Abstract UI Visual - Left Side */}
             <div className="w-full md:w-5/12 bg-marketing-recessed border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden flex items-end justify-center p-8">
                
                {/* Bar Chart Abstraction */}
                <div className="w-full h-full flex items-end gap-2 px-8 pb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                   {[30, 45, 60, 50, 75, 90, 85, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-white/5 to-white/80 border-t border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] relative group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-700" style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}>
                         {i === 7 && (
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
                              MAX_YIELD
                           </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             {/* Content Side */}
             <div className="w-full md:w-7/12 p-6 sm:p-12 relative flex flex-col justify-center">
                <h2 className="text-4xl md:text-5xl font-display font-light text-white mb-6 relative z-10 tracking-tight">Hyper-Scaled <span className="italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">Operations.</span></h2>
                <div className="text-[#9CA3B8] font-light leading-relaxed mb-8 text-lg relative z-10 max-w-xl space-y-4">
                  <p>A single principal advisor armed with Aurixa can output the workload of a ten-person analyst team. Scale your asset under management exponentially without ballooning your payroll overhead. This is about absolute leverage.</p>
                  <p>Enterprise positioning modernises business operations and delivers institutional-grade intelligence, creating competitive differentiation and strengthening brand authority in the market.</p>
                  <p>The intelligence reporting ecosystem provides strategic intelligence, compass intelligence, executive-level strategic direction, strategic briefing, and snapshot intelligence for rapid client decision support.</p>
                </div>
                <div className="flex gap-8 relative z-10 border-t border-white/10 pt-8 mt-auto">
                   <div className="flex flex-col gap-2">
                      <span className="text-3xl font-display text-white">10x</span>
                      <span className="text-xs uppercase tracking-widest text-white/70 font-bold">Analyst Output / Enterprise Positioning</span>
                   </div>
                   <div className="w-px h-12 bg-white/10" />
                   <div className="flex flex-col gap-2">
                      <span className="text-3xl font-display text-white">Uncapped</span>
                      <span className="text-xs uppercase tracking-widest text-white/70 font-bold">AUM Scaling / Brand Authority</span>
                   </div>
                </div>
             </div>
           </div>

        </div>

        {/* Bottom CTA */}
        <div className="mt-20 glass-panel p-6 sm:p-16 text-center shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute inset-0 bg-chrome-prismatic opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C89B3C] border border-[#C89B3C]/30 mb-8 rounded-sm">Allocation Restricted</span>
            <h2 className="text-4xl md:text-6xl font-display font-light tracking-tight mb-8 text-white">Secure Priority Integration</h2>
            <div className="text-[#9CA3B8] mb-12 max-w-3xl mx-auto text-lg leading-relaxed font-light space-y-6">
              <p>Access to Aurixa’s deployment cycle is limited to preserve delivery quality, architectural focus, and partner success.</p>
              <p>Businesses accepted into the next integration cycle will gain early access to unified operational intelligence built for property, finance, and wealth creation.</p>
              <p>Delayed action may mean delayed access, and in a market where operational intelligence, speed, and client engagement are becoming competitive advantages, waiting could come at a cost.</p>
            </div>
            <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] uppercase tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)]">
              <span className="drop-shadow-md">SECURE PRIORITY REVIEW</span>
              <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
