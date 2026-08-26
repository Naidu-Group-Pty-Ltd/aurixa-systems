import { motion } from "motion/react";
import { ArrowRight, Hexagon, ShieldAlert, Network, Lock, Crosshair, Fingerprint, Terminal, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { AboutHeroVisual } from "../components/AnimatedHeroVisuals";
import { useRouteMetadata } from "../lib/pageMetadata";

export default function About() {
  useRouteMetadata("/about");
  return (
    <div className="w-full relative pt-32 pb-32 bg-[#040B16] min-h-dvh overflow-hidden">
      <HeroBackground variant="about" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        
        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,.88fr)] gap-8 items-center mb-32 relative z-20">
          <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-px bg-white/30" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Classified Intelligence // Alpha-Tier</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3rem] font-display font-light tracking-tight mb-6 leading-[1.08]"
          >
            <span className="block text-liquid-chrome-clean drop-shadow-md">The Collective</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Behind The Code</span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mb-12 space-y-5 text-base md:text-lg text-[#9CA3AF] font-light leading-relaxed"
          >
            <p>
              Aurixa Systems was built from inside the industry, by people who understand the pressure, complexity, and pace of modern property and finance operations.
            </p>
            <p>
              Not Built In Isolation or Therory.
            </p>
            <p>
              Aurixa Systems is the result of property professionals and quantitative engineers solving the exact operational bottlenecks that limit modern real estate businesses. We engineer asymmetric leverage for firms that refuse to operate on archaic infrastructure.
            </p>
          </motion.div>
          </div>
          <AboutHeroVisual />
        </div>

        {/* THE GENESIS PROTOCOL - Asymmetric Block */}
        <div className="mb-40 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 relative z-10">
               <h2 className="text-[#C89B3C] font-mono text-sm tracking-[0.3em] uppercase mb-4">Phase 01 // Origin</h2>
               <h3 className="text-4xl md:text-5xl font-display text-white mb-6 tracking-wide drop-shadow-md">The Aurixa Origin</h3>
               <div className="space-y-6">
                 <p className="text-[#9CA3B8] font-light text-lg leading-relaxed">
                   A clandestine coalition of quantitative engineers and former apex-tier advisory figures recognized a critical systemic flaw: the industry's catastrophic reliance on fragmented spreadsheets, decaying CRM data, and severely manual workflows spanning disjointed portals. The Aurixa mandate is to confront fragmented tools, decaying CRM data, and severely manual workflows spanning disjointed platforms.
                 </p>
                 <p className="text-[#9CA3B8] font-light text-lg leading-relaxed">
                   We determined that human intuition in high-velocity financial operations is a devastating liability. Aurixa was engineered from the bedrock up to be the ultimate countermeasure, a singularly unified, mathematically infallible intelligence matrix that surgically targets operational friction, eradicates human error, and replaces it with algorithmic certainty. It reduces administrative limits and replaces them with highly scalable operational infrastructure.
                 </p>
               </div>
            </div>
            {/* Dark Aesthetic Node Interface */}
            <div className="lg:col-span-6 relative h-[500px] w-full border border-[#00A8B5]/20 bg-gradient-to-br from-[#0B162C]/80 to-[#040B16] rounded-sm overflow-hidden flex items-center justify-center group shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,168,181,0.08)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute right-0 top-0 w-full h-full opacity-[0.05] pointer-events-none grid-hex" />
                
                {/* Abstract Node Network Graphic */}
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className="w-72 h-72 border border-[#C89B3C]/20 rounded-full flex items-center justify-center animate-[spin_80s_linear_infinite] relative backdrop-blur-sm bg-black/10">
                       <div className="absolute w-[110%] h-[110%] border-t-2 border-b-2 border-[#00A8B5]/30 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                       <div className="absolute w-[80%] h-[80%] border-l-2 border-[#C89B3C]/40 rounded-full animate-[spin_10s_ease-in-out_infinite]" />
                       
                       <Hexagon className="w-24 h-24 opacity-80 shadow-[0_0_30px_rgba(200,155,60,0.2)]" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1 }}/>
                       
                       {/* Floating Data Nodes */}
                       {[0, 60, 120, 180, 240, 300].map(degree => (
                         <div key={degree} className="absolute w-5 h-5 bg-[#040B16] border border-[#00A8B5]/80 rounded-full shadow-[0_0_15px_#00A8B5] flex items-center justify-center" 
                              style={{ transform: `rotate(${degree}deg) translateY(-145px)` }}>
                            <div className="w-1.5 h-1.5 bg-[#C89B3C] rounded-full animate-ping" style={{ animationDelay: `${degree * 10}ms` }} />
                         </div>
                       ))}
                    </div>
                </div>
            </div>
        </div>

        {/* THE CORE MANDATE - Bento Three Pillars */}
        <div className="mb-40">
           <div className="text-center mb-16">
             <h2 className="text-[#00A8B5] font-mono text-sm tracking-[0.3em] uppercase mb-4">Phase 02 // Execution Core</h2>
             <h3 className="text-4xl md:text-5xl font-display text-white tracking-wide drop-shadow-md max-w-3xl mx-auto">
               Operational Supremacy via <br/> <span className="text-chrome-prismatic italic">Three Directives.</span>
             </h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Pillar 1 */}
              <div className="glass-panel p-6 sm:p-10 group hover:bg-gradient-to-b from-[#0B162C]/90 to-[#040B16] transition-all duration-700 border border-white/5 hover:border-[#00A8B5]/40 flex flex-col items-start relative min-h-[460px] overflow-hidden shadow-xl hover:shadow-[0_20px_50px_rgba(0,168,181,0.1)]">
                 <div className="absolute -top-8 -right-8 text-[#00A8B5]/5 text-[10rem] font-display font-black group-hover:text-[#00A8B5]/10 transition-colors duration-700">01</div>
                 <Network className="w-12 h-12 mb-8 z-10" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h4 className="text-3xl font-display text-white mb-6 z-10 drop-shadow-md">Eradicate Friction</h4>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed z-10">
                   Every millisecond of operational drag is a hemorrhage in firm revenue. We aggressively zero-out bottlenecks, collapsing week-long data gathering, document sourcing, and multi-lender API pinging into a completely unified, zero-latency corridor. Velocity is prioritized above all else. End-to-end framework delivery eliminates single-point software solutions, handling the entire pipeline from intelligence gathering to strategic modelling to final client reporting execution.
                 </p>
                 {/* Visual element bottom */}
                 <div className="mt-auto w-full pt-8 flex gap-2 z-10">
                    <div className="h-1 flex-1 bg-[#00A8B5]/20 overflow-hidden"><div className="h-full w-full bg-[#00A8B5] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-1000 ease-out"/></div>
                    <div className="h-1 w-6 bg-[#C89B3C]" />
                 </div>
              </div>

              {/* Pillar 2 (Featured Middle) */}
              <div className="glass-panel p-6 sm:p-10 group hover:bg-gradient-to-t from-[#0B162C]/90 to-[#040B16] transition-all duration-700 border-t-4 border-t-[#C89B3C] border-b border-l border-r border-[#1A202C] hover:border-white/20 flex flex-col items-start relative min-h-[460px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform lg:-translate-y-6">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#C89B3C]/5 to-transparent pointer-events-none" />
                 <div className="absolute -top-8 -right-8 text-[#C89B3C]/5 text-[10rem] font-display font-black group-hover:text-[#C89B3C]/10 transition-colors duration-700">02</div>
                 <Crosshair className="w-12 h-12 mb-8 z-10" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h4 className="text-3xl font-display text-white mb-6 z-10 drop-shadow-md">Engineer Dominance</h4>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed z-10">
                   Survival is an insufficient commercial metric; we architect market monopolies. By equipping your firm with real-time macro-market statistics, highly sophisticated strategy visualization, and custom white-label portals, you project an insurmountable aura of absolute institutional power to your clientele. Proprietary algorithms built specifically for the intricacies of Australian property process complex market metrics, cash flows, and depreciations with ruthless mathematical precision.
                 </p>
                 <div className="absolute bottom-0 right-0 w-40 h-40 opacity-20 group-hover:opacity-100 transition-opacity duration-1000">
                    <div className="w-full h-full border-t-[3px] border-l-[3px] border-[#C89B3C] rounded-tl-[100%] absolute right-[-20%] bottom-[-20%]" />
                    <div className="w-[80%] h-[80%] border-t border-l border-[#00A8B5] rounded-tl-[100%] absolute right-[-10%] bottom-[-10%] animate-[ping_4s_ease-out_infinite]" />
                 </div>
              </div>

              {/* Pillar 3 */}
              <div className="glass-panel p-6 sm:p-10 group hover:bg-gradient-to-b from-[#0B162C]/90 to-[#040B16] transition-all duration-700 border border-white/5 hover:border-[#00A8B5]/40 flex flex-col items-start relative min-h-[460px] overflow-hidden shadow-xl hover:shadow-[0_20px_50px_rgba(0,168,181,0.1)]">
                 <div className="absolute -top-8 -right-8 text-[#00A8B5]/5 text-[10rem] font-display font-black group-hover:text-[#00A8B5]/10 transition-colors duration-700">03</div>
                 <Lock className="w-12 h-12 mb-8 z-10" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h4 className="text-3xl font-display text-white mb-6 z-10 drop-shadow-md">Enforce Compliance</h4>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed z-10">
                   In an aggressively scrutinized regulatory landscape, structural integrity is not negotiable. Aurixa's core intelligence is permanently shackled to real-time APRA buffers, deep non-destructible audit trails, and strict lending logic parameters. Total compliance is hard-coded into the fundamental mathematical bedrock. Rapid implementation is designed for massive organisational rollouts, integrating complex infrastructure seamlessly and providing comprehensive administrative control to govern extensive enterprise networks instantly.
                 </p>
                 <div className="mt-auto w-full pt-8 flex justify-end gap-1.5 z-10">
                    {[...Array(6)].map((_, i) => <div key={i} className="w-2 h-6 bg-white/10 group-hover:bg-[#00A8B5] transition-colors duration-300" style={{ transitionDelay: `${i * 100}ms` }} />)}
                 </div>
              </div>
           </div>
        </div>

        {/* THE OBFUSCATION PROTOCOL - Architectural Philosophy */}
        <div className="mb-40 relative border border-[#1A202C]/60 bg-gradient-to-r from-[#040B16] to-[#0B162C]/30 rounded-xl p-6 sm:p-12 lg:p-20 overflow-hidden group shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#00A8B5_1px,transparent_1px),linear-gradient(to_bottom,#00A8B5_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]" />
           <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#00A8B5]/5 to-transparent skew-x-[-25deg] transform origin-top-right group-hover:bg-[#C89B3C]/5 transition-colors duration-1000 pointer-events-none" />
           
           <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
              <div className="w-full lg:w-1/2">
                 <div className="flex items-center gap-3 mb-6">
                    <Terminal className="w-5 h-5 text-[#C89B3C]" />
                    <span className="text-[#C89B3C] font-mono text-sm tracking-[0.2em] uppercase">Architecture // Security</span>
                 </div>
                 <h3 className="text-4xl md:text-5xl font-display text-white mb-8 tracking-wide drop-shadow-md">The Data Sovereignty Framework</h3>
                 <p className="text-[#9CA3B8] font-light text-lg leading-relaxed mb-6">
                   We do not compromise on structural sovereignty. Aurixa’s backend infrastructure is built with enterprise-grade SSL/TLS encryption, isolated sub-database partitioning per partner tenant, and end-to-end data protection frameworks. Our proprietary Australian framework technology is packaged for seamless enterprise operation and designed to aggregate, organise, and unify property operations across the market.
                 </p>
                 <p className="text-[#9CA3B8] font-light text-lg leading-relaxed mb-6">
                   Your client intelligence, proprietary operational strategies, and financial modelling frameworks remain securely insulated. <span className="text-white font-medium">We do not scrape, aggregate, or repurpose your data for internal machine-learning models.</span> Our infrastructure aligns operational systems with enterprise-level authority, giving partners the control, confidence, and security required to scale.
                 </p>
                 <p className="text-[#9CA3B8] font-light text-lg leading-relaxed">
                   Aurixa runs as a secure, high-performance infrastructure engine, positioning your brand interface professionally upfront while maintaining resilient backend architecture behind the scenes. The result is operational supremacy via three directives: end-to-end framework, proprietary algorithms, and rapid implementation.
                 </p>
              </div>
              <div className="w-full lg:w-1/2 flex justify-end">
                 {/* Premium Terminal/Terminal Concept */}
                 {/* The command lines are `white-space: nowrap` inside an
                     `overflow: hidden` box, so on a 320px screen the longest
                     one was being cut mid-word. Padding and type step down with
                     the viewport; from 640px up nothing changes. */}
                 <div className="w-full max-w-lg h-80 border border-[#C89B3C]/30 bg-[#040B16]/90 p-4 sm:p-8 flex flex-col relative overflow-hidden backdrop-blur-xl shadow-2xl rounded-lg transform lg:rotate-2 hover:rotate-0 transition-transform duration-700 ease-out">
                    {/* Secure Terminal UI Header */}
                    <div className="w-full flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                       <span className="text-[#00A8B5] text-xs font-mono uppercase tracking-widest flex items-center gap-2"><Lock className="w-3 h-3"/> Core Server Access</span>
                       <div className="flex gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-green-500/50"/></div>
                    </div>
                    {/* Command Lines */}
                    {/* The longest line is 28 monospace characters and cannot
                        wrap (the typing effect needs `nowrap`), so the type
                        scales with the viewport and reaches its full 12px by
                        the time the screen is 400px wide. */}
                    <div className="space-y-4 font-mono text-[clamp(0.5625rem,3vw,0.75rem)] sm:text-xs md:text-sm">
                       <div className="flex text-[#00A8B5]"><span className="text-white/30 w-4 shrink-0 sm:w-6">{'>>'}</span> <span className="typing-effect">INIT_OBFUSCATION_SEQUENCE();</span></div>
                       <div className="flex text-[#9CA3B8]"><span className="text-white/30 w-4 shrink-0 sm:w-6">{'>>'}</span> ENCRYPTING_TENANT_NODE... <span className="text-green-500 ml-2">[SECURE]</span></div>
                       <div className="flex text-[#9CA3B8]"><span className="text-white/30 w-4 shrink-0 sm:w-6">{'>>'}</span> REROUTING_API_GATEWAYS... <span className="text-green-500 ml-2">[SECURE]</span></div>
                       <div className="flex text-[#C89B3C] font-semibold tracking-wider"><span className="text-white/30 w-4 shrink-0 sm:w-6">{'>>'}</span> SHIELD_WALL_ACTIVE : NO_INBOUND_LEAKS</div>
                       <div className="mt-8 flex items-center gap-2 pt-6">
                         <span className="text-white/30 w-4 shrink-0 sm:w-6">{'>>'}</span>
                         <div className="w-3 h-5 bg-[#C89B3C] animate-[pulse_1s_ease-in-out_infinite]" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* RESTRICTED ALLOCATION - The Syndicate Waitlist Block */}
        <div className="relative mb-20 glass-panel p-6 sm:p-16 md:p-24 text-center shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden border border-[#C89B3C]/30 bg-gradient-to-t from-[#0B162C] to-[#040B16]">
          <div className="absolute inset-0 bg-chrome-prismatic opacity-[0.03] pointer-events-none" />
          
          {/* Tactical Target Reticle Corners */}
          <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-[#C89B3C]/70" />
          <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-[#C89B3C]/70" />
          <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-[#C89B3C]/70" />
          <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-[#C89B3C]/70" />
          
          {/* Horizontal animated tracking line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00A8B5]/20 to-transparent transform -translate-y-1/2" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-10">
               <div className="absolute inset-0 bg-[#C89B3C] blur-[40px] opacity-20 rounded-full" />
               <Fingerprint className="w-20 h-20 text-[#C89B3C] opacity-90 relative z-10" />
            </div>
            
            <h3 className="text-[clamp(2.4rem,12vw,3rem)] md:text-6xl lg:text-7xl font-display tracking-tight mb-8 text-white relative">
              Restricted Vetting <br/> <span className="italic text-chrome-prismatic drop-shadow-[0_0_15px_rgba(200,155,60,0.3)]">The Collective</span>
            </h3>
            
            <div className="max-w-3xl mx-auto space-y-6 mb-16">
               <p className="text-[#9CA3B8] text-xl leading-relaxed font-light">
                 Aurixa is a weapon of massive asymmetric advantage. We strictly control its distribution pipeline. Mass software adoption leads to heavily diluted competitive edges; therefore, Aurixa is definitively not available to the general market. Align with the new standard of property operations and scale your brand through intelligent operational infrastructure today.
               </p>
               <p className="text-[#9CA3B8] text-xl leading-relaxed font-light">
                 We operate on a restricted allocation model, conducting rigorous operational audits on prospective partner firms before granting master access keys. Only advisory syndicates demonstrating the capacity and capital scale to wield this computational framework at its full potential will clear the waitlist. Deploy Aurixa Systems to streamline workflows, unify operations, and scale smarter with modular infrastructure.
               </p>
            </div>
            
            <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[13px] md:text-sm uppercase tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all duration-300 hover:scale-[1.02] shadow-[0_0_40px_rgba(200,155,60,0.3)] hover:shadow-[0_0_60px_rgba(200,155,60,0.5)] border border-[#C89B3C]">
              <span className="drop-shadow-md">Book Enterprise Demo</span>
              <Target className="w-5 h-5 ml-4 group-hover:rotate-90 transition-transform duration-500 drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
