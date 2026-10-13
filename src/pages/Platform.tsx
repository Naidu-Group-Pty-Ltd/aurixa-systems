import { motion } from "motion/react";
import { 
  ArrowRight, 
  Network, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Zap, 
  Calculator, 
  FileText, 
  LayoutDashboard, 
  MapPin, 
  Database, 
  Users 
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { VoiceAgentSection } from "../components/VoiceAgentSection";
import { AnimatedGearSystem } from "../components/AnimatedGearSystem";
import { useRouteMetadata } from "../lib/pageMetadata";

// Temporarily hidden from the public Platform page. Set to true to restore.
const SHOW_CORELOGIC_DATA_INTEGRATION = false;

export default function Platform() {
  useRouteMetadata("/platform");
  return (
    <div className="marketing-page w-full relative pt-32 pb-20 bg-marketing-page min-h-dvh overflow-hidden">
      <HeroBackground variant="platform" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,.85fr)] gap-8 items-center mb-24">
          <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-px bg-[#C89B3C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Architectural Overview</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome drop-shadow-md">The Intelligence</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Engine.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-3xl"
          >
            Aurixa Systems is not a generic tool. It is a patented, end-to-end framework. An interconnected operating system combining live property data, macroeconomic variables, CRM syncing, and complex lending matrices. We do not provide software; we provide technological supremacy. The Aurixa Ecosystem provides operational infrastructure layers designed to simplify complexity with structured intelligence systems that help your business scale.
          </motion.p>
          </div>
          <AnimatedGearSystem />
        </div>

        {/* Modules */}
        <div className="space-y-32">
          {/* Module 1 */}
          <div id="serviceability" tabIndex={-1} className="scroll-mt-[calc(var(--site-header-height)+1.5rem)] grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 glass-panel p-6 sm:p-12 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#00A8B5]/10 to-transparent opacity-50" />
               <div className="relative z-10">
                 <Cpu className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h2 className="text-2xl font-display font-light text-white mb-4">Algorithmic Processing</h2>
                 <p className="text-gray-400 font-light text-sm leading-relaxed mb-8">
                   The core engine ingests thousands of data points instantaneously. We bypass manual entry friction by directly parsing documents and intercepting live data streams. Turn complex data into clear, usable business intelligence.
                 </p>
                 <div className="space-y-3">
                   <div className="h-px w-full bg-gradient-to-r from-[#00A8B5]/50 to-transparent" />
                   <div className="h-px w-3/4 bg-gradient-to-r from-[#00A8B5]/30 to-transparent" />
                   <div className="h-px w-1/2 bg-gradient-to-r from-[#00A8B5]/10 to-transparent" />
                 </div>
               </div>
            </div>
            <div className="order-1 lg:order-2 lg:pl-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-px bg-white/30" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Core Module 01</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-light tracking-tight mb-6 text-white drop-shadow-md">Serviceability & <span className="italic text-liquid-chrome-clean text-transparent bg-clip-text">Lending Matrix</span></h2>
              <p className="text-gray-400 text-lg font-light leading-relaxed mb-8">
                Calculate complex lending scenarios in seconds. Aurixa ingests policy rules, APRA buffers, and client data to provide down-to-the-dollar borrowing capacity snapshots before you even consult a broker. This operational intelligence infrastructure provides the foundation for scalable real estate businesses to govern and accelerate every internal process.
              </p>
              <ul className="space-y-4">
                {['Multi-lender policy matching & APRA buffers', 'Real-time borrowing capacity snapshot reports', 'Automated data influx from CoreLogic', 'Layer 01 operational intelligence infrastructure', 'Workflow management and operational oversight', 'Business process systems with centralised platform control'].map(item => (
                  <li key={item} className="flex items-center gap-4 text-[#9CA3AF] font-light">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00A8B5] shadow-[0_0_10px_#00A8B5]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Module 2 */}
          <div id="cashflow-reporting" tabIndex={-1} className="scroll-mt-[calc(var(--site-header-height)+1.5rem)] grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="lg:pr-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-px bg-white/30" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Core Module 02</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-light tracking-tight mb-6 text-white drop-shadow-md">10-Year Cashflow & <span className="italic text-chrome-prismatic drop-shadow-lg text-transparent bg-clip-text">Reporting</span></h2>
              <p className="text-gray-400 text-lg font-light leading-relaxed mb-8">
                Our patented reporting mechanism generates fully white-labeled, custom-branded briefs. Standardize your strategy and deliver bespoke intelligence. Layer 02 strategic intelligence engine shifts advisory services from reactive reporting to proactive insight generation instantly.
              </p>
              <ul className="space-y-4">
                {['Patented white-label reporting & custom branding', '10-year pre and post-tax yield analysis', 'Direct CRM integration & data syncing', 'Property analysis and AI-guided reporting', 'Market intelligence and automated insight generation', 'Governed analytical systems'].map(item => (
                  <li key={item} className="flex items-center gap-4 text-[#9CA3AF] font-light">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] shadow-[0_0_10px_#C89B3C]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div id="brief-generation" tabIndex={-1} className="scroll-mt-[calc(var(--site-header-height)+1.5rem)] glass-panel p-6 sm:p-12 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-bl from-[#C89B3C]/10 to-transparent opacity-50" />
               <div className="relative z-10">
                 <Terminal className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h2 className="text-2xl font-display font-light text-white mb-4">Automated Brief Generation</h2>
                 <p className="text-gray-400 font-light text-sm leading-relaxed mb-8">
                   Client presentations are generated silently in the background, fully formatted, mathematically verified, and branded to your exact specifications. Information is processed, analysed, and formulated into strategic recommendations automatically.
                 </p>
                 <div className="space-y-3">
                   <div className="h-px w-full bg-gradient-to-l from-[#C89B3C]/50 to-transparent" />
                   <div className="h-px w-3/4 bg-gradient-to-l from-[#C89B3C]/30 to-transparent" />
                   <div className="h-px w-1/2 bg-gradient-to-l from-[#C89B3C]/10 to-transparent" />
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Aurixa Voice — conversational infrastructure */}
        <VoiceAgentSection />

        {/* Expansive Add-On Modules Grid */}
        <div className="mt-32 pt-32 border-t border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] max-w-full bg-[radial-gradient(ellipse_at_center,rgba(0,168,181,0.05)_0%,rgba(200,155,60,0.05)_45%,transparent_70%)] blur-[80px] pointer-events-none" />
          
          <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
            <div className="flex justify-center items-center gap-3 mb-6">
              <span className="w-8 h-px bg-white/30" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Infrastructure Enhancements</span>
              <span className="w-8 h-px bg-white/30" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-6 text-white drop-shadow-md">Expansion <span className="italic text-chrome-prismatic drop-shadow-xl text-transparent bg-clip-text">Modules.</span></h2>
            <p className="text-gray-400 text-lg font-light leading-relaxed">
              Scale your firm's technical infrastructure with bespoke modular additions. Each sub-system encapsulates a critical operational node, empowering absolute control over lending feasibility, brand alignment, and client interaction. Infrastructure expansions extend integrated client ecosystems and enterprise governance protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
            
            {/* Add on 1: Borrowing Capacity (Massive Span) */}
            <div className="md:col-span-12 lg:col-span-8 glass-panel p-6 sm:p-10 md:p-12 group overflow-hidden border border-[#C89B3C]/20 hover:border-[#C89B3C]/60 transition-all duration-500 bg-gradient-to-br from-marketing-panel/90 to-marketing-recessed relative flex flex-col justify-between min-h-[450px]">
               <div className="absolute inset-0 bg-gradient-to-br from-[#00A8B5]/5 to-transparent pointer-events-none" />
               <div className="absolute right-0 top-0 w-2/3 h-full opacity-10 pointer-events-none grid-hex" />
               
               <div className="relative z-10 w-full max-w-xl">
                 <Calculator className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h3 className="text-white font-display text-3xl md:text-4xl mb-4 tracking-wide drop-shadow-md">Borrowing Capacity Matrix</h3>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed mb-8">
                   Deploy high-speed borrowing capacity calculations against live, multi-lender parameters. Eliminate human error from your fundamental qualification phase and adjust strictly to real-time APRA buffers instantaneously. Layer 03 financial modelling infrastructure provides scalable financial intelligence and long-term strategic modelling capabilities directly for high-value clients.
                 </p>
               </div>
               
               {/* High-End Graphic Component */}
               <div className="absolute -bottom-8 -right-8 w-[110%] md:w-3/4 h-56 border border-[#1A202C]/60 bg-marketing-recessed/90 backdrop-blur-md rounded-tl-2xl p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex items-end gap-3 overflow-hidden transform md:rotate-2 group-hover:rotate-0 transition-transform duration-700 ease-out">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#C89B3C] via-[#00A8B5] to-transparent" />
                  <div className="absolute top-5 left-8 text-[10px] font-mono tracking-widest text-[#00A8B5] uppercase flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-[#00A8B5] animate-pulse" /> Live Calculation Stream
                  </div>
                  
                  {/* Grid overlay for chart */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-10 pointer-events-none mt-12 w-full h-full">
                     {[...Array(32)].map((_, i) => <div key={i} className="border-t border-l border-white/20" />)}
                  </div>

                  <div className="w-full flex items-end gap-2 px-4 h-32 relative z-10">
                    {[40, 65, 45, 80, 55, 95, 70, 85].map((h, i) => (
                      <div key={i} className="flex-1 relative bg-marketing-panel/50 overflow-hidden border border-[#1A202C] rounded-t-sm" style={{ height: `${h}%` }}>
                         <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#00A8B5]/80 to-[#00A8B5]/40 transition-all duration-1000 group-hover:scale-y-110" style={{ height: `${h}%`, transformOrigin: 'bottom' }} />
                         <div className="absolute top-0 w-full h-1 bg-[#00A8B5] opacity-0 group-hover:opacity-100 transition-opacity delay-100" />
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Add on 2: Customizable Reporting (Tall Box) */}
            <div id="custom-reporting" tabIndex={-1} className="scroll-mt-[calc(var(--site-header-height)+1.5rem)] md:col-span-12 lg:col-span-4 glass-panel p-6 sm:p-10 md:p-12 group overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-500 bg-gradient-to-bl from-marketing-panel/90 to-marketing-recessed relative flex flex-col justify-between min-h-[450px]">
               <div className="relative z-10">
                 <FileText className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h3 className="text-white font-display text-3xl mb-4 tracking-wide">Custom Reporting</h3>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed mb-8">
                   Generate comprehensive, multi-page financial strategy briefs in seconds. Configurable mechanisms strict on white-labeling rules perfectly mirror your brand. Model borrowing capacity, 10-year cash flow forecasts, depreciation integration, scenario modelling, and portfolio growth analysis.
                 </p>
               </div>
               
               {/* Animated Document Stack */}
               <div className="relative mt-8 h-40 w-full perspective-[1200px] flex justify-center items-end pb-8">
                  <div className="absolute bottom-4 w-4/5 h-48 border border-[#C89B3C]/30 bg-[#0A192F]/80 backdrop-blur-sm shadow-2xl transform rotate-x-[20deg] rotate-y-[-10deg] translate-y-8 group-hover:-translate-y-4 group-hover:rotate-x-[10deg] transition-all duration-700 ease-out" />
                  <div className="absolute bottom-0 w-5/6 h-52 border border-white/20 bg-marketing-recessed shadow-xl transform rotate-x-[20deg] rotate-y-[-10deg] translate-y-4 group-hover:translate-y-2 group-hover:rotate-x-[15deg] transition-all duration-500 ease-out flex p-6 flex-col gap-4">
                     <div className="w-1/3 h-1.5 bg-[#00A8B5]/80 rounded-full" />
                     <div className="w-full h-px bg-white/10 mt-2" />
                     <div className="w-3/4 h-px bg-white/10" />
                     <div className="w-5/6 h-px bg-white/10" />
                     <div className="w-1/2 h-8 border border-white/5 bg-white/5 mt-auto rounded-sm flex items-center justify-center">
                        <div className="w-1/2 h-1 bg-[#C89B3C]/50 rounded-full" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Add on 3: White-Label Dashboards (Square/Medium Span) */}
            <div className="md:col-span-6 lg:col-span-5 glass-panel p-6 sm:p-10 md:p-12 group overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-500 bg-marketing-panel/80 relative flex flex-col justify-between min-h-[450px]">
               <div className="relative z-10 w-full max-w-sm">
                 <LayoutDashboard className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h3 className="text-white font-display text-3xl mb-4 tracking-wide shadow-black drop-shadow-lg">White-Label UI</h3>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed text-shadow-sm">
                   Deploy customized interior and exterior environments projecting absolute authority. Total camouflage under your firm's branding guidelines. Layer 04 client growth and engagement ecosystem consolidates CRM workflows, client engagement, communication systems, reporting delivery, and lifecycle management.
                 </p>
               </div>
               
               {/* UI Abstraction Dashboard Panel */}
               <div className="absolute -bottom-6 -right-6 w-72 md:w-80 h-72 bg-marketing-recessed/95 backdrop-blur-xl border border-white/10 rounded-tl-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex transform group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform duration-700 ease-out z-0">
                  {/* Header line */}
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#C89B3C] to-transparent" />
                  
                  {/* Sidebar */}
                  <div className="w-20 h-full border-r border-white/5 p-4 flex flex-col gap-4 bg-white/[0.02]">
                    <div className="w-full aspect-square bg-[#00A8B5]/20 rounded-md border border-[#00A8B5]/30 mb-2 mt-4" />
                    <div className="w-full h-3 bg-white/10 rounded-sm" />
                    <div className="w-full h-3 bg-white/5 rounded-sm" />
                    <div className="w-full h-3 bg-white/5 rounded-sm" />
                  </div>
                  
                  {/* Main Screen */}
                  <div className="flex-1 p-5 flex flex-col gap-5 relative opacity-[0.12]">
                    <div className="w-full h-6 bg-[#C89B3C]/10 rounded-sm border border-[#C89B3C]/20 flex items-center px-3 mt-4">
                       <div className="w-1/3 h-1.5 bg-[#C89B3C]/60 rounded-full"/>
                    </div>
                    
                    <div className="flex-1 rounded-md border border-white/5 bg-gradient-to-t from-white/5 to-transparent flex items-end gap-2 p-3">
                       {[30, 80, 50, 100, 70].map((h, i) => (
                         <div key={i} className="flex-1 bg-[#00A8B5]/40 rounded-t-sm opacity-30" style={{ height: `${h}%` }} />
                       ))}
                    </div>
                  </div>
               </div>
            </div>

            {/* Add on 4: Suburb Snapshots (Wide Span) */}
            <div id="suburb-snapshots" tabIndex={-1} className="scroll-mt-[calc(var(--site-header-height)+1.5rem)] md:col-span-6 lg:col-span-7 glass-panel p-6 sm:p-10 md:p-12 group overflow-hidden border border-[#00A8B5]/20 hover:border-[#00A8B5]/60 transition-all duration-500 bg-gradient-to-bl from-marketing-panel/90 to-marketing-recessed relative flex flex-col justify-between min-h-[450px]">
               <div className="relative z-10 w-full max-w-sm">
                 <MapPin className="w-12 h-12 mb-8" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                 <h3 className="text-white font-display text-3xl mb-4 tracking-wide shadow-black drop-shadow-lg">Suburb Snapshots</h3>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed">
                   Instantly generate hyper-detailed macro market intelligence. Capture granular demographic, zoning, and historical growth snapshots mathematically validating investments. Governed analytical systems keep property analysis, market intelligence, and automated insight generation connected.
                 </p>
               </div>
               
               {/* Radar Effect Elevated */}
               <div className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 overflow-hidden flex items-center justify-end md:pr-12 opacity-50 group-hover:opacity-100 transition-opacity duration-1000">
                  
                  {/* Radar grid bg */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,168,181,0.1)_1px,transparent_1px)] bg-[size:20px_20px] mix-blend-screen" />
                  
                  <div className="relative w-[300px] h-[300px] border border-[#00A8B5]/30 rounded-full flex items-center justify-center translate-x-12 md:translate-x-0">
                    <div className="absolute w-full h-full rounded-full border border-[#00A8B5]/10 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="absolute w-[150%] h-px bg-[#00A8B5]/20 rotate-45" />
                    <div className="absolute h-[150%] w-px bg-[#00A8B5]/20 rotate-45" />
                    
                    {/* Concentric rings */}
                    <div className="absolute w-3/4 h-3/4 rounded-full border border-[#00A8B5]/20" />
                    <div className="absolute w-1/2 h-1/2 rounded-full border border-[#00A8B5]/30" />
                    
                    <div className="w-[85%] h-[85%] border border-[#00A8B5]/20 rounded-full relative overflow-hidden">
                       <div className="radar-sweep" />
                    </div>
                    
                    {/* Data blips */}
                    <div className="w-3 h-3 bg-[#C89B3C] rounded-full absolute top-[30%] right-[25%] shadow-[0_0_15px_#C89B3C] z-10" />
                    <div className="absolute top-[30%] right-[25%] w-8 h-8 border border-[#C89B3C]/50 rounded-full animate-ping z-10" />
                    
                    <div className="w-2 h-2 bg-white rounded-full absolute bottom-[35%] left-[30%] shadow-[0_0_10px_white] z-10" />
                  </div>
               </div>
            </div>

            {/* Add on 5: CoreLogic Integration (Full Width Banner) */}
            {SHOW_CORELOGIC_DATA_INTEGRATION && (
              <div className="md:col-span-12 lg:col-span-12 glass-panel p-6 sm:p-10 md:p-12 group overflow-hidden border border-[#C89B3C]/30 hover:border-[#C89B3C]/80 transition-all duration-500 bg-marketing-panel/90 relative flex flex-col md:flex-row items-center border-l-[6px] min-h-[350px]">
               <div className="absolute inset-0 bg-gradient-to-r from-[#00A8B5]/10 to-transparent pointer-events-none" />
               <div className="absolute right-0 top-0 w-3/4 h-full opacity-10 pointer-events-none grid-hex" />
               
               <div className="relative z-10 w-full md:w-1/2 pr-0 md:pr-12 mb-12 md:mb-0">
                 <div className="flex items-center gap-4 mb-8">
                     <Database className="w-12 h-12" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                     <span className="px-3 py-1 bg-marketing-recessed border border-[#00A8B5]/30 text-[#00A8B5] text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#00A8B5] rounded-full animate-pulse" /> Live Link Active
                     </span>
                 </div>
                 <h3 className="text-white font-display text-4xl mb-6 tracking-wide drop-shadow-md">CoreLogic Data Integration</h3>
                 <p className="text-[#9CA3B8] font-light text-base leading-relaxed">
                   Bring trusted property data into the centre of your operations. Aurixa connects CoreLogic insights directly into your workflow, helping real estate and finance businesses reduce manual searching, improve data accuracy, and make faster decisions across sales, investment, finance, and portfolio operations.
                 </p>
               </div>
               
               {/* Asymmetric CoreLogic Data Visualization */}
               <div className="relative z-10 w-full md:w-1/2 h-full min-h-[200px] flex justify-end items-center">
                  <div className="w-full max-w-lg h-48 border border-white/10 bg-marketing-recessed/80 flex relative overflow-hidden backdrop-blur-md rounded-lg shadow-2xl">
                      {/* Grid background */}
                      <div className="absolute inset-0 grid grid-cols-10 grid-rows-5 opacity-20">
                         {[...Array(50)].map((_, i) => <div key={i} className="border-r border-b border-[#00A8B5]" />)}
                      </div>
                      
                      {/* Vertical streams */}
                      <div className="absolute inset-0 flex justify-around opacity-60">
                         <div className="w-px h-full data-stream-y" style={{ animationDelay: '0.1s' }} />
                         <div className="w-px h-full data-stream-y" style={{ animationDirection: 'reverse', animationDelay: '0.3s' }} />
                         <div className="w-px h-full data-stream-y" style={{ animationDelay: '0.7s' }} />
                         <div className="w-px h-full data-stream-y" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
                      </div>

                      {/* Moving Scanner Line */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#C89B3C] shadow-[0_0_15px_#C89B3C] animate-[flow-y_3s_linear_infinite]" />

                      {/* Data blocks */}
                      <div className="absolute left-6 top-6 flex flex-col gap-3">
                         <div className="w-32 h-4 bg-[#00A8B5]/20 border border-[#00A8B5]/40" />
                         <div className="w-48 h-4 bg-white/10" />
                         <div className="w-24 h-4 bg-[#C89B3C]/20 border border-[#C89B3C]/40" />
                      </div>
                      <div className="absolute right-6 bottom-6 flex flex-col gap-3 items-end">
                         <div className="w-40 h-4 bg-white/10" />
                         <div className="w-32 h-4 bg-[#00A8B5]/20 border border-[#00A8B5]/40" />
                      </div>
                  </div>
               </div>
              </div>
            )}

          </div>
        </div>

        {/* Expansive Section 3: The Framework Protocol */}
        <div className="mt-32 pt-32 border-t border-white/5">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-6 text-white">The Framework <span className="italic text-liquid-chrome text-transparent bg-clip-text">Protocol.</span></h2>
            <p className="text-gray-400 text-lg font-light leading-relaxed">
              We don't just supply software; we overhaul your entire operational pipeline. Our infrastructure removes manual dependencies, eliminating human error margins and allowing your executives to focus entirely on high-level strategy and client acquisition.
              <br />
              Layer 05 Enterprise Governance &amp; Administration maintains operational control as your business scales.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-white/5 bg-marketing-panel relative overflow-hidden group">
              <div className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100 bg-gradient-to-b from-[#00A8B5]/5 to-transparent pointer-events-none" />
              <Network className="w-8 h-8 mb-6" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h3 className="text-white font-display text-xl mb-4">Neural Integration</h3>
              <p className="text-gray-500 font-light text-sm">Hooks directly into HubSpot, Salesforce, and bespoke database architectures to form a seamless bi-directional data flow. Integrated client ecosystems consolidate communication, delivery, and lifecycle touchpoints.</p>
            </div>
            <div className="p-8 border border-white/5 bg-marketing-panel relative overflow-hidden group">
              <div className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100 bg-gradient-to-b from-[#C89B3C]/5 to-transparent pointer-events-none" />
              <ShieldCheck className="w-8 h-8 mb-6" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h3 className="text-white font-display text-xl mb-4">Absolute Compliance</h3>
              <p className="text-gray-500 font-light text-sm">Mathematics govern everything. Calculations are permanently anchored to federal compliance and regulatory buffer mandates. Role-based permissions, data governance, and oversight mechanisms protect your brand and <Link to="/compliance" className="text-[#00A8B5] underline decoration-[#00A8B5]/40 underline-offset-4 hover:text-[#5EDDE8] hover:decoration-[#5EDDE8] transition-colors">enforce compliance</Link>.</p>
            </div>
            <div className="p-8 border border-white/5 bg-marketing-panel relative overflow-hidden group">
              <div className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <Zap className="w-8 h-8 mb-6" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h3 className="text-white font-display text-xl mb-4">Asymmetrical Speed</h3>
              <p className="text-gray-500 font-light text-sm">What takes standard advisory firms hours of compilation requires mere seconds of compute time using the Aurixa core. Systems administration, team oversight, and operational visibility keep enterprise execution controlled.</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-40 glass-panel p-6 sm:p-16 text-center shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute inset-0 bg-chrome-prismatic opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C89B3C] border border-[#C89B3C]/30 mb-8 rounded-sm">Allocation Restricted</span>
            <h2 className="text-4xl md:text-6xl font-display font-light tracking-tight mb-8 text-white">Secure <span className="italic text-chrome-prismatic">Priority Integration</span></h2>
            <div className="text-[#9CA3B8] mb-12 max-w-2xl mx-auto text-lg leading-relaxed font-light">
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
