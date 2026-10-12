import { useMemo } from 'react';

type Variant = 'home' | 'platform' | 'solutions' | 'industries' | 'about' | 'resources' | 'contact';

interface HeroBackgroundsProps {
  variant: Variant;
}

/**
 * One draw of a scatter field, stable for the life of the mount.
 *
 * `make` is deliberately outside the dependency list — re-running it is the
 * exact behaviour this exists to stop.
 */
function useScatter<T>(count: number, make: (index: number) => T): T[] {
  return useMemo(() => Array.from({ length: count }, (_, index) => make(index)), [count]);
}

/**
 * Decorative hero fields. Two rules hold across every variant:
 *
 *  1. Nothing is generated during render. The scatter fields used to call
 *     `Math.random()` inline, so every particle jumped to a new position and
 *     restarted its animation on each re-render of the page above — and these
 *     sit under pages that re-render on scroll, on form input, and twice more
 *     under StrictMode. Each field is now drawn once per mount and held.
 *  2. Keyframes live in index.css. They used to be injected as inline <style>
 *     tags per variant, which scoped them to whichever page happened to be
 *     mounted and left references from other pages resolving to nothing.
 */
export function HeroBackground({ variant }: HeroBackgroundsProps) {
  // Hooks must run unconditionally, so every field is drawn up front. Each is
  // a short array of plain numbers; the variants that ignore them pay nothing.
  const dust = useScatter(50, () => ({
    size: Math.random() * 3,
    gold: Math.random() > 0.5,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 10 + Math.random() * 25,
    opacity: 0.1 + Math.random() * 0.5,
    delay: Math.random() * 30,
  }));

  const trunks = useScatter(12, (index) => ({
    opacity: 0.2 + Math.random() * 0.5,
    pulseDuration: 6 + Math.random() * 4,
    pulseDelay: index * 0.5,
    packetDuration: 2 + Math.random() * 4,
    packetDelay: Math.random() * 5,
    sparkDuration: 1 + Math.random() * 3,
    sparkDelay: Math.random() * 7,
  }));

  const cipher = useScatter(100, () => Math.random().toString(16).slice(2, 16).toUpperCase());

  const archiveBlocks = useScatter(8, () => ({
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 80,
    width: 50 + Math.random() * 150,
    height: 20 + Math.random() * 60,
    delay: Math.random() * 4,
  }));

  const vector = useMemo(() => Math.random().toFixed(4), []);

  switch (variant) {
    case 'home':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0A192F]">
          {/* LAYER 1: Deep Vignette & Structural Gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0A192F_100%)] z-10" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(200,155,60,0.05),transparent_70%)] blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(0,168,181,0.05),transparent_70%)] blur-[100px]" />

          {/* LAYER 2: The Singularity Core (Volumetric Light) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00A8B5]/10 blur-[150px] rounded-full z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C89B3C]/10 blur-[120px] rounded-full z-0 opacity-80 mix-blend-screen" />

          {/* LAYER 3: Astrolabe Data Rings & Targeting Matrix (SVG) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] min-w-[1200px] aspect-square opacity-[0.25] z-0 mix-blend-screen overflow-visible">
            <svg viewBox="0 0 1000 1000" className="w-full h-full">
              {/* Outer Surveillance Ring */}
              <g className="origin-center animate-[spin-ultra-slow_120s_linear_infinite]">
                 <circle cx="500" cy="500" r="480" fill="none" stroke="#C89B3C" strokeWidth="0.5" strokeDasharray="1 15" />
                 <circle cx="500" cy="500" r="460" fill="none" stroke="#00A8B5" strokeWidth="1" strokeDasharray="4 8" />
                 <circle cx="500" cy="500" r="420" fill="none" stroke="#C89B3C" strokeWidth="1" strokeDasharray="100 200" opacity="0.3" />
              </g>
              {/* Mid Interface Ring */}
              <g className="origin-center animate-[spin-ultra-slow-reverse_90s_linear_infinite]">
                 <circle cx="500" cy="500" r="380" fill="none" stroke="#00A8B5" strokeWidth="0.5" />
                 <circle cx="500" cy="500" r="360" fill="none" stroke="#C89B3C" strokeWidth="1.5" strokeDasharray="5 30" opacity="0.7" />
                 {/* Data Escarpments */}
                 <path d="M500 120 L500 140 M500 860 L500 880 M120 500 L140 500 M860 500 L880 500" stroke="#00A8B5" strokeWidth="2" />
                 <circle cx="500" cy="140" r="4" fill="#C89B3C" className="shadow-[0_0_15px_#C89B3C]" />
                 <circle cx="500" cy="860" r="4" fill="#C89B3C" className="shadow-[0_0_15px_#C89B3C]" />
              </g>
              {/* Inner Reactor & Sync Crosshairs */}
              <g className="origin-center animate-[spin-ultra-slow_60s_linear_infinite]">
                 <circle cx="500" cy="500" r="280" fill="none" stroke="#C89B3C" strokeWidth="0.5" strokeDasharray="2 4" />
                 <circle cx="500" cy="500" r="250" fill="none" stroke="#00A8B5" strokeWidth="3" strokeDasharray="10 40 40 40" />
                 <circle cx="750" cy="500" r="6" fill="#00A8B5" className="animate-pulse" />
                 {/* Internal Triangulation */}
                 <polygon points="500,280 690,610 310,610" fill="none" stroke="#C89B3C" strokeWidth="0.5" opacity="0.2" />
              </g>
              {/* Absolute Center Targeting Array (Static to screen, pulsating) */}
              <g className="origin-center" style={{ animation: 'pulse-opacity 4s ease-in-out infinite' }}>
                 <circle cx="500" cy="500" r="100" fill="none" stroke="#00A8B5" strokeWidth="0.5" strokeDasharray="2 6" />
                 <path d="M400 500 L480 500 M520 500 L600 500 M500 400 L500 480 M500 520 L500 600" stroke="#C89B3C" strokeWidth="1" />
                 <rect x="498" y="498" width="4" height="4" fill="#00A8B5" />
              </g>
            </svg>
          </div>

          {/* LAYER 4: Glassmorphic Shard Distortions (Adds insane depth/refraction) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] z-0 overflow-hidden mix-blend-screen opacity-40">
             <div className="absolute top-[20%] left-[10%] w-[30vh] h-[60vh] border-l border-t border-[#00A8B5]/30 bg-gradient-to-br from-[#00A8B5]/5 to-transparent backdrop-blur-[2px] transform rotate-[15deg] animate-[spin-ultra-slow_150s_linear_infinite]" />
             <div className="absolute bottom-[10%] right-[15%] w-[40vh] h-[40vh] border-r border-b border-[#C89B3C]/30 bg-gradient-to-tl from-[#C89B3C]/5 to-transparent backdrop-blur-[2px] transform -rotate-[25deg] animate-[spin-ultra-slow-reverse_120s_linear_infinite]" />
          </div>

          {/* LAYER 5: Tactical Terminal HUD */}
          <div className="absolute inset-6 pointer-events-none z-10 hidden md:block">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00A8B5]/40" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00A8B5]/40" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00A8B5]/40" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00A8B5]/40" />
            
            {/* Live Telemetry Data */}
            <div className="absolute top-2 left-12 flex flex-col gap-0.5 font-mono text-[9px] uppercase tracking-widest text-[#00A8B5]/90">
              <span className="flex items-center gap-2"><span className="w-1 h-1 bg-[#C89B3C] animate-pulse" /> SYNC_RATE: 99.98%</span>
              <span>LAT: 45.92.11 / LONG: -12.44.09</span>
              <span className="text-[#C89B3C] opacity-80">SYS.CORE.ACTIVE</span>
            </div>
            
            <div className="absolute bottom-2 right-12 flex flex-col gap-0.5 items-end font-mono text-[9px] uppercase tracking-widest text-[#00A8B5]/90">
              <span>MEM_ALLOC: 124.8GB</span>
              <span>NETWORK_STATE: ISOLATED</span>
              <div className="w-24 h-[1px] bg-[#00A8B5]/30 mt-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-8 bg-[#C89B3C] animate-[hud-scan_2s_ease-in-out_infinite_alternate]" />
              </div>
            </div>
          </div>

          {/* LAYER 6: Dimensional Horizon Plane */}
          <div className="absolute bottom-[-20%] left-[-20%] w-[140%] h-[60%] perspective-[1200px] z-0 opacity-20 hidden md:block">
             <div className="w-[100%] h-[250%] mx-auto bg-transparent border-t border-[#00A8B5]/50 origin-top transform rotate-x-[75deg] animate-[grid-forward_30s_linear_infinite]"
                  style={{
                     backgroundImage: `linear-gradient(to right, rgba(0, 168, 181, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 168, 181, 0.15) 1px, transparent 1px)`,
                     backgroundSize: '120px 120px'
                  }}
             >
                {/* Embedded Grid Nodes */}
                <div className="w-full h-full" style={{
                  backgroundImage: `radial-gradient(circle at center, rgba(200, 155, 60, 0.4) 2px, transparent 2px)`,
                  backgroundSize: '120px 120px',
                  backgroundPosition: '0 0'
                }} />
             </div>
             {/* Blown out horizon edge */}
             <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#C89B3C]/10 to-transparent blur-[30px]" />
          </div>

          {/* LAYER 7: Zero-G Data Dust */}
          <div className="absolute inset-0 z-0">
            {dust.map((mote, i) => (
               <div key={i} className="absolute rounded-full"
                    style={{
                      width: `${mote.size}px`,
                      height: `${mote.size}px`,
                      backgroundColor: mote.gold ? '#C89B3C' : '#00A8B5',
                      boxShadow: `0 0 10px ${mote.gold ? '#C89B3C' : '#00A8B5'}`,
                      left: `${mote.left}%`,
                      top: `${mote.top}%`,
                      animation: `float-up-ambient ${mote.duration}s linear infinite`,
                      opacity: mote.opacity,
                      animationDelay: `-${mote.delay}s`
                    }}
               />
            ))}
          </div>
        </div>
      );

    case 'platform':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16] perspective-[2000px]">
          {/* Deep Core Glows */}
          <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-[#00A8B5]/15 blur-[150px] rounded-full z-0" />
          <div className="absolute bottom-[0%] left-[5%] w-[800px] h-[800px] bg-[#C89B3C]/10 blur-[180px] rounded-full z-0" />

          {/* Iso Metric Data Architecture Surface */}
          <div className="absolute inset-0 opacity-[0.25] z-0">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="iso-grid-heavy" width="120" height="69.282" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
                  <path d="M60 0 L120 34.641 L60 69.282 L0 34.641 Z" fill="none" stroke="#00A8B5" strokeWidth="0.5" strokeOpacity="0.4"/>
                  <path d="M60 0 L60 69.282" fill="none" stroke="#C89B3C" strokeWidth="0.5" strokeOpacity="0.2"/>
                  <circle cx="60" cy="34.641" r="1" fill="#C89B3C" opacity="0.5" />
                </pattern>
                <linearGradient id="fadeGradiant" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#040B16" stopOpacity="1" />
                  <stop offset="20%" stopColor="#040B16" stopOpacity="0" />
                  <stop offset="80%" stopColor="#040B16" stopOpacity="0" />
                  <stop offset="100%" stopColor="#040B16" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#iso-grid-heavy)" />
              {/* Fade out top and bottom so it doesn't clip harshly */}
              <rect width="100%" height="100%" fill="url(#fadeGradiant)" />
            </svg>
          </div>

          {/* Monolithic Server Columns / Data Trunks */}
          <div className="absolute inset-x-[-10%] top-0 h-full flex justify-around opacity-30 z-0 transform scale-110">
            {trunks.map((trunk, i) => (
              <div key={i} className="relative w-[1px] h-full bg-gradient-to-b from-transparent via-[#00A8B5] to-transparent shadow-[0_0_20px_#00A8B5]"
                   style={{
                     opacity: trunk.opacity,
                     animation: `pulse-glow ${trunk.pulseDuration}s ease-in-out infinite alternate`,
                     animationDelay: `${trunk.pulseDelay}s`
                   }}>
                 {/* High velocity data packets */}
                 <div className="absolute top-0 left-[-1.5px] w-[4px] h-[60px] bg-[#C89B3C] rounded-full shadow-[0_0_20px_#C89B3C]"
                      style={{
                        animation: `data-stream-down ${trunk.packetDuration}s linear infinite`,
                        animationDelay: `${trunk.packetDelay}s`
                      }} />
                 <div className="absolute top-0 left-[-1px] w-[3px] h-[30px] bg-white rounded-full shadow-[0_0_15px_white]"
                      style={{
                        animation: `data-stream-down ${trunk.sparkDuration}s linear infinite`,
                        animationDelay: `${trunk.sparkDelay}s`
                      }} />
              </div>
            ))}
          </div>

          {/* Optical Data Slashes (Foreground blur effect) */}
          <div className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] transform -rotate-12 opacity-40 pointer-events-none mix-blend-screen z-10">
             <div className="absolute top-[35%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent shadow-[0_0_15px_#C89B3C] blur-[1px]" style={{animation: 'flow-x 10s ease-in-out infinite'}} />
             <div className="absolute top-[65%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent shadow-[0_0_20px_#00A8B5] blur-[2px]" style={{animation: 'flow-x 15s ease-in-out infinite reverse'}} />
          </div>

          {/* Heavy Dark Vignette to sink it deep into the background behind content */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#040B16_90%)] z-20 pointer-events-none" />
        </div>
      );

    case 'solutions':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16] perspective-[1000px]">
          {/* LAYER 1: Deep Global Flash & Pro Noise Mask */}
          <div className="absolute inset-0 bg-[#040B16] z-0" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#040B16_90%)] z-10 pointer-events-none" />

          {/* LAYER 2: Structural Glass Framing (Pro UI touch) */}
          <div className="absolute left-10 top-20 bottom-20 w-[1px] bg-gradient-to-b from-transparent via-[#00A8B5]/30 to-transparent hidden xl:block" />
          <div className="absolute right-10 top-20 bottom-20 w-[1px] bg-gradient-to-b from-transparent via-[#C89B3C]/30 to-transparent hidden xl:block" />
          <div className="absolute top-10 left-20 right-20 h-[1px] bg-gradient-to-r from-transparent via-[#00A8B5]/20 to-transparent hidden xl:block" />

          {/* LAYER 3: Massive 3D Gyroscopic Hyper-Core (Toned down mix-blend for elegance) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] md:w-[1200px] md:h-[1200px] z-0 opacity-15 mix-blend-screen" style={{ perspective: '1200px' }}>
            <div className="w-full h-full absolute inset-0 animate-[spin-xyz_60s_linear_infinite]" style={{ transformStyle: 'preserve-3d' }}>
               <div className="absolute inset-0 border border-[#00A8B5]/30 rounded-full" style={{ transform: 'rotateX(90deg)' }} />
               <div className="absolute inset-0 border-2 border-[#C89B3C]/10 rounded-full" style={{ transform: 'rotateY(90deg)' }} />
               <div className="absolute inset-0 border border-dashed border-[#00A8B5]/20 rounded-full" />
               <div className="absolute inset-[15%] border-4 border-[#C89B3C]/10 rounded-full shadow-[0_0_30px_#C89B3C]" style={{ transform: 'rotateX(45deg) rotateY(45deg)' }} />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#00A8B5_0%,transparent_50%)] blur-[100px] opacity-10 mix-blend-color-dodge" />
          </div>

          {/* LAYER 4: Sophisticated Tactical Vectors (Crosshairs, Radars) */}
          <div className="absolute inset-0 opacity-40 z-0">
             {/* Micro-grid overlay */}
             <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(0, 168, 181, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 168, 181, 0.05) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
             
             {/* Center Lock Reticle - Ultra Refined */}
             <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 animate-[target-lock_10s_ease-in-out_infinite]">
               <div className="absolute inset-0 border border-[#00A8B5]/20 rounded-full" />
               <div className="absolute inset-[10%] border border-[#C89B3C]/10 rounded-full" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
               {/* Orbital Markers */}
               <div className="absolute top-0 left-1/2 w-[1px] h-6 bg-[#C89B3C]/80 -translate-x-1/2" />
               <div className="absolute bottom-0 left-1/2 w-[1px] h-6 bg-[#C89B3C]/80 -translate-x-1/2" />
               <div className="absolute left-0 top-1/2 h-[1px] w-6 bg-[#C89B3C]/80 -translate-y-1/2" />
               <div className="absolute right-0 top-1/2 h-[1px] w-6 bg-[#C89B3C]/80 -translate-y-1/2" />
             </div>
          </div>

          {/* LAYER 5: Data Waveform (SVG) */}
          <svg className="absolute bottom-[-10%] w-full h-[50vh] opacity-20 z-0 hidden md:block" preserveAspectRatio="none" viewBox="0 0 1000 200">
             <path d="M0,100 C150,200 350,0 500,100 C650,200 850,0 1000,100 L1000,200 L0,200 Z" fill="url(#wave-grad)" />
             <path d="M0,150 C200,50 400,250 600,100 C800,-50 900,150 1000,100" fill="none" stroke="#C89B3C" strokeWidth="1" strokeDasharray="4 8" className="animate-pulse" />
             <defs>
               <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="#00A8B5" stopOpacity="0.2" />
                 <stop offset="100%" stopColor="#040B16" stopOpacity="1" />
               </linearGradient>
             </defs>
          </svg>

          {/* LAYER 6: High-End UI Glass Cards (Floating Context) */}
          <div className="absolute top-[30%] left-[5%] w-64 p-4 rounded-xl border border-[#00A8B5]/20 bg-[#00A8B5]/5 backdrop-blur-xl hidden xl:block shadow-[0_0_30px_rgba(0,168,181,0.05)]">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-mono tracking-widest text-[#00A8B5]">STRATEGIC_OVERVIEW</span>
                <span className="w-2 h-2 rounded-full bg-[#C89B3C] animate-pulse" />
             </div>
             <div className="h-1 w-full bg-[#00A8B5]/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#C89B3C] w-[78%]" />
             </div>
             <div className="mt-2 text-[10px] font-mono text-white/50 text-right">MODEL CONVERGENCE: 78.4%</div>
          </div>

          {/* LAYER 7: Subtle Vertical Scanners & Glitch Text */}
          <div className="absolute top-0 left-0 w-full h-[15vh] bg-gradient-to-b from-transparent via-[#C89B3C]/10 to-transparent blur-[8px] animate-[hud-scan-vertical_8s_linear_infinite] mix-blend-screen z-20 pointer-events-none" />
          
          <div className="absolute bottom-12 right-12 text-[#00A8B5] font-mono text-[9px] tracking-widest text-right opacity-40">
             <div className="animate-[glitch-skew_5s_infinite]">
               <div>SYS.VECTOR: {vector}</div>
               <div>ALIGNMENT: LOCKED</div>
             </div>
             <div className="w-full h-[1px] bg-[#C89B3C]/30 mt-2" />
          </div>
        </div>
      );

    case 'industries':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16] perspective-[2000px]">
          {/* LAYER 1: Deep Global Vignette & Noise */}
          <div className="absolute inset-0 bg-[#040B16] z-0" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay z-0" />

          {/* LAYER 2: Massive Scrolling Marquee Background (Frosted/Subtle) */}
          <div className="absolute top-1/3 left-0 w-[400%] flex animate-[marquee-massive_60s_linear_infinite] opacity-[0.02] text-[#00A8B5] font-display font-black text-[25vw] leading-none whitespace-nowrap mix-blend-screen z-0">
             GLOBAL_ACQUISITION NEURAL_WEALTH FINTECH_SYNDICATE GLOBAL_ACQUISITION NEURAL_WEALTH FINTECH_SYNDICATE
          </div>

          {/* LAYER 3: The Hyper-Tunnel Grids */}
          <div className="absolute bottom-[-50%] left-[-50%] w-[200%] h-[150%] transform rotate-x-[80deg] z-0 opacity-15"
               style={{
                  backgroundImage: `linear-gradient(to right, rgba(0, 168, 181, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(200, 155, 60, 0.2) 2px, transparent 2px)`,
                  backgroundSize: '80px 80px',
                  animation: 'tunnel-rush 3s linear infinite'
               }} >
               <div className="absolute inset-0 bg-gradient-to-t from-[#00A8B5]/10 to-transparent blur-[50px]" />
          </div>

          {/* LAYER 4: Massive Central Wireframe Globe (The Apex Industries Element) */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-[0.15] mix-blend-screen z-0 hidden md:block" style={{ perspective: '1000px' }}>
            <div className="w-full h-full animate-[spin-slow-globe_40s_linear_infinite]" style={{ transformStyle: 'preserve-3d' }}>
               {[...Array(12)].map((_, i) => (
                 <div key={i} className="absolute inset-0 border border-[#00A8B5]/40 rounded-full" style={{ transform: `rotateY(${i * 15}deg)` }} />
               ))}
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="absolute inset-0 border border-[#C89B3C]/20 rounded-full" style={{ transform: `rotateX(${i * 22.5}deg)` }} />
               ))}
            </div>
            {/* Core Lighting */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#C89B3C_0%,transparent_50%)] blur-[80px] opacity-20" />
          </div>

          {/* LAYER 5: Pro-Tier UI Data Cards Floating in 3D Space */}
          <div className="absolute z-10 hidden xl:block animate-[float-node_8s_ease-in-out_infinite]" style={{ top: '25%', right: '15%', transform: 'rotateY(-15deg)' }}>
             <div className="p-5 rounded-2xl border border-[#C89B3C]/20 bg-[#040B16]/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] text-[#C89B3C] tracking-widest font-mono mb-2">NEURAL NET STATUS</div>
                <div className="text-3xl font-light text-white mb-1">99.9%</div>
                <div className="w-full h-[1px] bg-[#C89B3C]/30 mb-2" />
                <div className="flex justify-between gap-4 text-[9px] text-[#00A8B5] font-mono">
                  <span>LATENCY: 0.04MS</span>
                  <span>[ OPTIMIZED ]</span>
                </div>
             </div>
          </div>

          <div className="absolute z-10 hidden xl:block animate-[float-node_10s_ease-in-out_infinite_reverse]" style={{ bottom: '25%', left: '10%', transform: 'rotateY(15deg)' }}>
             <div className="p-5 rounded-2xl border border-[#00A8B5]/20 bg-[#040B16]/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] text-[#00A8B5] tracking-widest font-mono mb-2">SECTOR YIELD</div>
                <div className="flex items-end gap-2 mb-3">
                  {[40, 70, 45, 90, 65, 100, 80].map((h, i) => (
                    <div key={i} className="w-2 bg-[#00A8B5]/40 rounded-t-sm" style={{ height: `${h}px` }}>
                       {h === 100 && <div className="w-full h-full bg-[#C89B3C]/80 rounded-t-sm" />}
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-white/50 font-mono">VOLUME: MAX_ALLOCATION</div>
             </div>
          </div>

          {/* LAYER 6: Orbital Data Comets (Refined) */}
          <svg className="w-full h-full opacity-40 mix-blend-screen absolute inset-0 pointer-events-none z-0">
             <path d="M-100 800 Q 500 500, 1200 -100" fill="none" stroke="#C89B3C" strokeWidth="2" strokeDasharray="100 2000" style={{ animation: 'hyper-data-flow 4s ease-in-out infinite' }} />
             <path d="M1200 400 Q 600 -100, -100 200" fill="none" stroke="#00A8B5" strokeWidth="1.5" strokeDasharray="50 3000" style={{ animation: 'hyper-data-flow 5s ease-in-out infinite 2s' }} />
          </svg>

          {/* LAYER 7: Massive Center Vignette to keep content absolutely legible */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#040B16_70%)] z-10 pointer-events-none" />
        </div>
      );

    case 'about':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#00A8B5]/5 blur-[200px] rounded-full" />
          
          {/* The Cipher: Raining Hex/Data */}
          <div className="absolute inset-0 opacity-[0.15] font-mono text-[8px] md:text-[10px] text-[#00A8B5] leading-none overflow-hidden flex flex-wrap" style={{ wordBreak: 'break-all' }}>
            <div className="w-full h-[200vh] animate-[scanline_20s_linear_infinite]">
              {cipher.map((word, i) => (
                <span key={i} className="opacity-10 hover:opacity-100 transition-opacity">
                   {word}{' '}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    case 'resources':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B162C]/20 to-[#040B16]" />
          
          {/* Data Archive Grid */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-[0.03]">
             {[...Array(24)].map((_, i) => <div key={i} className="border-r border-b border-[#00A8B5]" />)}
          </div>
          
          {/* Floating illuminated blocks */}
          <div className="absolute inset-0">
             {archiveBlocks.map((block, i) => (
               <div key={i} className="absolute bg-[#C89B3C]/10 border border-[#C89B3C]/30 animate-[pulse-glow_4s_ease-in-out_infinite_alternate]"
                    style={{
                      left: `${block.left}%`,
                      top: `${block.top}%`,
                      width: `${block.width}px`,
                      height: `${block.height}px`,
                      animationDelay: `${block.delay}s`,
                    }}
               />
             ))}
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#040B16]">
           {/* Pulsating Secure Beacon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px]">
             <div className="absolute inset-0 rounded-full border border-[#C89B3C]/80 shadow-[0_0_30px_#C89B3C] animate-ping" style={{ animationDuration: '3s' }} />
             <div className="absolute inset-0 rounded-full border border-[#00A8B5]/50 shadow-[0_0_20px_#00A8B5] animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
             <div className="absolute inset-0 rounded-full border border-[#C89B3C]/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '2s' }} />
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#00A8B5]/5 to-transparent skew-x-[-30deg] opacity-40" />
          <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#C89B3C]/5 to-transparent skew-x-[-30deg] opacity-30" />
        </div>
      );

    default:
      return null;
  }
}
