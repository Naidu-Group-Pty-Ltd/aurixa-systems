import { motion } from "motion/react";
import { ArrowRight, BarChart3, Database, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { useRouteMetadata } from "../lib/pageMetadata";

export default function Home() {
  useRouteMetadata("/");
  return (
    <div className="w-full relative pt-20 bg-[#040B16]">

      {/* Hero Section.
          Measured against the *small* viewport so the hero keeps its height
          when a mobile browser's toolbars slide away, instead of growing and
          shunting everything below it. */}
      <section className="relative px-6 pt-24 pb-32 md:pt-40 md:pb-48 w-full flex flex-col items-center justify-center min-h-[90svh] overflow-hidden">
        <HeroBackground variant="home" />
        
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-[#0B162C]/80 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(200,155,60,0.15)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#C89B3C] animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-white">SYS.CORE.ACTIVE</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-[2.4rem] md:text-[3.6rem] lg:text-[4.4rem] font-display font-light tracking-[-0.02em] leading-[1.05] mb-8"
          >
            <span className="block text-liquid-chrome mb-2 drop-shadow-lg">The Operational Intelligence Infrastructure</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Powering Modern Property Businesses.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-[0.9rem] md:text-base text-[#9CA3AF] max-w-3xl mb-12 font-light leading-relaxed"
          >
            Aurixa Systems unifies operational workflows, strategic reporting, financial modelling, client ecosystems, and enterprise intelligence into one scalable business infrastructure platform built for modern property enterprises.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center"
          >
            <Link to="/contact" className="w-full sm:w-auto group relative inline-flex items-center justify-center px-10 py-5 text-[9.6px] uppercase tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-none transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.2)] hover:shadow-[0_0_40px_rgba(0,168,181,0.4)]">
              <span className="drop-shadow-md">Book Your Free Demo</span>
              <ArrowRight className="w-[13px] h-[13px] ml-3 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
            </Link>
            <Link to="/platform" className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-5 text-[9.6px] uppercase tracking-[0.25em] font-medium text-white border border-white/20 hover:bg-white/5 rounded-none transition-colors">
              Explore The Ecosystem
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust & Precision Bar */}
      <section className="w-full py-12 border-y border-white/5 bg-[#0B162C]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10 text-center">
          <div className="px-4">
            <p className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">Zero</p>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Operational Bottlenecks</p>
          </div>
          <div className="px-4">
            <p className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">10yr</p>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Financial Modelling</p>
          </div>
          <div className="px-4">
            <p className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">100%</p>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">White-Labeled Delivery</p>
          </div>
          <div className="px-4">
            <p className="text-4xl md:text-5xl font-display font-extrabold text-liquid-chrome mb-2 tracking-tight">SOC 2</p>
            <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-semibold">Enterprise Security</p>
          </div>
        </div>
      </section>

      {/* Intelligence Vanguard / "Soldiers" Section */}
      <section className="w-full py-32 bg-[#040B16] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(200,155,60,0.02)_50%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start md:items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-px bg-[#C89B3C]" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#C89B3C]">The Aurixa Ecosystem</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-6 text-white drop-shadow-md">
                Operational <br />
                <span className="text-chrome-prismatic italic drop-shadow-xl">Infrastructure Layers.</span>
              </h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-400 text-lg font-light leading-7">
                Real estate businesses do not need more isolated platforms.
              </p>
              <p className="text-gray-400 text-lg font-light leading-7">
                They need connected infrastructure that helps them manage opportunity, capital, clients, data, compliance, and growth with greater clarity.
              </p>
              <p className="text-gray-400 text-lg font-light leading-7">
                Each layer supports the systems behind modern property businesses, from market intelligence, portfolio insights, investor communication, finance coordination, and strategic forecasting through to administration, compliance, and operational oversight.
              </p>
              <p className="text-gray-400 text-lg font-light leading-7">
                Rather than operating through fragmented systems, businesses can create a clearer view of opportunity, performance, risk, and long-term wealth creation.
              </p>
              <p className="text-gray-400 text-lg font-light leading-7">
                This is a single infrastructure for the next generation of property, proptech, fintech, and investment-led businesses.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[
              {
                id: "LYR-01",
                name: "Operational Intelligence",
                spec: "Workflow & Oversight",
                desc: "Unify operations. Reduce complexity. Centralise control.\n\nBuilt to help property and finance businesses operate with less friction and more control. Aurixa streamlines business processes, centralises platform management, and creates one unified environment for clearer, more efficient operations.",
                img: "/brand/layer-01-operational-intelligence.webp",
                imagePosition: "center center"
              },
              {
                id: "LYR-02",
                name: "Strategic Intelligence",
                spec: "Analytical Systems",
                desc: "Deliver faster, more structured client intelligence through governed analytical systems. Includes property analysis, market intelligence, and automated insight generation.",
                img: "/brand/layer-02-strategic-intelligence.webp",
                imagePosition: "center center"
              },
              {
                id: "LYR-03",
                name: "Financial Modelling",
                spec: "Strategic Forecasts",
                desc: "Provide scalable financial intelligence and long-term strategic modelling capabilities. Encompasses borrowing capacity, 10-year cash flow, and scenario modelling.",
                img: "/brand/layer-03-financial-modelling.webp",
                imagePosition: "30% 25%"
              },
              {
                id: "LYR-04",
                name: "Client Growth Ecosystem",
                spec: "Engagement Infrastructure",
                desc: "Build better client journeys with connected engagement infrastructure. Aurixa brings CRM workflows, communication systems, reporting delivery, and lifecycle management into one structured ecosystem designed to support scalable growth across real estate, finance, and wealth creation.",
                img: "/brand/layer-04-client-growth-ecosystem.webp",
                imagePosition: "center center"
              },
              {
                id: "LYR-05",
                name: "Enterprise Governance",
                spec: "Administration & Oversight",
                desc: "Maintain operational control as your business scales. Systems administration, permissions, oversight, governance, and complete operational visibility.",
                img: "/brand/layer-05-enterprise-governance.webp",
                imagePosition: "center center"
              }
            ].map((unit, i) => (
              <div key={i} className={`armor-panel group flex h-full flex-col overflow-hidden hover:lethal-glow transition-all duration-500 lg:col-span-2 ${unit.id === "LYR-05" ? "lg:col-start-2" : ""}`}>
                <div className="aspect-video w-full relative shrink-0 overflow-hidden">
                  <div className="absolute inset-0 bg-[#00A8B5] mix-blend-color z-10 opacity-30 group-hover:opacity-10 transition-opacity" />
                  <div className="absolute inset-0 bg-[#C89B3C] mix-blend-color z-10 opacity-20 group-hover:opacity-50 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B162C] to-transparent z-20" />
                  {/* All five sit below the fold, so they stay deferred even
                      now that they are ~60 KB WebP rather than ~2 MB PNG (the
                      set was 10.7 MB; see scripts/build-share-assets.py's
                      sibling conversion in the SEO pass). The wrapper is
                      `aspect-video`, so the box is already reserved and nothing
                      reflows as each one arrives. */}
                  <img
                    src={unit.img}
                    alt={unit.name}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: unit.imagePosition || "center center" }}
                    className={`block w-full h-full object-cover filter ${unit.id === "LYR-01" ? "brightness-[1.35] contrast-[1.15] saturate-[1.15] opacity-90 group-hover:brightness-[1.45] group-hover:contrast-[1.2] group-hover:saturate-[1.2]" : "grayscale contrast-125 opacity-70"} group-hover:scale-110 group-hover:opacity-100 transition-all duration-700`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 z-30">
                    <span className="px-2 py-1 bg-[#000]/80 border border-white/30 text-white text-[10px] font-mono tracking-widest">{unit.id}</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow justify-between relative z-30">
                  <div>
                    <h3 className="text-xl font-display font-black tracking-widest text-white mb-1 uppercase drop-shadow-md">{unit.name}</h3>
                    <p className="text-[#00A8B5] group-hover:text-[#C89B3C] transition-colors text-xs font-mono uppercase tracking-widest mb-4 drop-shadow-sm">SPEC // {unit.spec}</p>
                    <p className="text-gray-400 font-light text-sm leading-relaxed">{unit.desc}</p>
                  </div>
                  <div className="w-full h-1 bg-white/10 overflow-hidden">
                    <div className="h-full bg-chrome-prismatic w-0 group-hover:w-full transition-all duration-1000 ease-out" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Positioning Section */}
      <section className="w-full py-20 md:py-32 relative bg-[#0B162C] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-8 drop-shadow-md text-white">
                The Industry Problem: <br /><span className="italic text-chrome-prismatic drop-shadow-xl">Fragmented Systems.</span>
              </h2>
              <div className="space-y-6 text-gray-400 text-lg font-light leading-relaxed">
                <p>
                  <strong className="text-white font-medium">Property businesses are operating across fragmented systems:</strong> disconnected workflows, multiple software subscriptions, and operational inefficiencies are crippling growth. 
                </p>
                <p>
                  You are dealing with slow client turnaround, manual reporting, administrative overload, scalability limitations, and inconsistent client delivery.
                </p>
                <p>
                  Aurixa Systems was built to unify the operational infrastructure of modern property businesses through one structured intelligence ecosystem.
                </p>
              </div>
            </div>
            <div className="relative">
              {/* Premium Dashboard Abstract */}
              <div className="min-h-[280px] sm:aspect-[4/3] glass-panel p-4 sm:p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10" />
                <div className="w-full h-full border border-white/10 rounded-sm relative z-20 bg-[#040B16] p-4 sm:p-6 shadow-2xl flex flex-col gap-6">
                  {/* Typographic Arsenal Block */}
                  <div className="absolute inset-0 bg-chrome-prismatic opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
                  <div className="h-full w-full relative z-20 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-[0.22em] sm:tracking-[0.3em] text-[#00A8B5] mb-5 sm:mb-6">Enterprise Infrastructure</span>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-display font-light text-white leading-tight mb-5 sm:mb-6 drop-shadow-md">
                      "Scale smarter through<br/><span className="text-chrome-prismatic italic drop-shadow-2xl">unified intelligence.</span>"
                    </div>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent mb-5 sm:mb-6 opacity-50" />
                    <p className="text-[10px] sm:text-xs font-light text-[#9CA3AF] uppercase tracking-[0.22em] sm:tracking-widest font-mono">Centralised Platform Control</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-40 relative overflow-hidden bg-[#040B16]">
        {/* `bg-gradient-radial` is not a Tailwind utility — these two layers
            emitted no background at all. Written out, they render the depth
            the section was designed with. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#111827_0%,#040B16_70%)] z-0" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(10,25,47,0.1),transparent_70%)] blur-[120px] opacity-40 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="mb-8 mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-[#040B16] p-2 shadow-[0_0_40px_rgba(200,155,60,0.3)]">
            {/* 192px WebP, not the old aurixa-symbol.svg — which was 535 KB,
                being a base64 JPEG in an SVG wrapper, fetched to fill a 96px
                square. Nothing about it was ever vector. */}
            <img
              src="/brand/aurixa-symbol-192.webp"
              alt="Aurixa Systems logo"
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="block h-full w-full object-contain object-center"
            />
          </div>
          <h2 className="text-[clamp(2.4rem,13vw,3.75rem)] md:text-7xl lg:text-[5rem] font-display font-light mb-8 tracking-tight leading-[1.05] text-white">
            Unifying strategic intelligence <br /><span className="italic text-chrome-prismatic drop-shadow-2xl">into one platform.</span>
          </h2>
          <p className="text-xl text-[#9CA3AF] mb-12 max-w-2xl font-light leading-relaxed">
            Aurixa helps property businesses scale smarter through unified operational intelligence. Experience governed automation infrastructure designed to modernise how you analyse, advise, and scale.
          </p>
          <Link to="/contact" className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_40px_rgba(0,168,181,0.2)] hover:shadow-[0_0_50px_rgba(200,155,60,0.4)]">
            <span className="drop-shadow-md">Book Your Free Demo</span>
            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
          </Link>
        </div>
      </section>
      
    </div>
  );
}
