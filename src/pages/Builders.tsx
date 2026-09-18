import { motion } from "motion/react";
import { ArrowRight, Building2, FileStack, Network, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * The Builders Network's public front door.
 *
 * The network itself is a separate product on its own domain — builders and
 * developers hold accounts there, not here — so every action on this page
 * leaves the marketing site. Nothing below authenticates anybody, reads a
 * session or posts anywhere: the page is prose and two links.
 *
 * The hero visual is LOCAL rather than a `*HeroVisual` from
 * `AnimatedHeroVisuals`. Those three are drawn one per page, and the thing
 * worth drawing here is the one thing a builder needs to understand before
 * registering — a stock list published once reaching many advisory firms —
 * which none of them says. It is a static SVG: no `Math.random()` during
 * render (the fault `useScatter` exists for), no new keyframes (the fault
 * recorded at the foot of `index.css`), and it reuses the shell's own
 * `#icon-gold-gradient`.
 */
function NetworkHeroVisual() {
  // Fixed geometry: three firms fanned to the right of one publisher. Written
  // out rather than computed so the markup the prerender emits is the markup
  // the browser paints.
  const firms = [
    { y: 38, label: "Advisory firm" },
    { y: 96, label: "Buyer's agent" },
    { y: 154, label: "Finance group" },
  ] as const;

  return (
    <div
      className="hidden lg:flex items-center justify-center min-h-[520px] w-full"
      role="img"
      aria-label="One stock list published to the Builders Network, reaching three connected advisory firms"
    >
      <svg viewBox="0 0 420 200" className="w-full max-w-[460px]" aria-hidden="true">
        <defs>
          <linearGradient id="builders-wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00A8B5" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#C89B3C" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* The publisher */}
        <rect x="8" y="72" width="104" height="56" fill="#0B162C" stroke="#00A8B5" strokeWidth="1" />
        <text x="24" y="96" fill="#F3F4F6" style={{ font: "600 10px Inter, system-ui, sans-serif" }}>
          Your stock list
        </text>
        <text x="24" y="112" fill="#9CA3AF" style={{ font: "500 8px ui-monospace, monospace" }}>
          PUBLISHED ONCE
        </text>

        {/* The network */}
        <rect x="168" y="76" width="84" height="48" fill="#0A192F" stroke="#C89B3C" strokeWidth="1" />
        <text x="186" y="97" fill="#F5D17A" style={{ font: "600 9px ui-monospace, monospace", letterSpacing: "1.2px" }}>
          NETWORK
        </text>
        <text x="186" y="110" fill="#9CA3AF" style={{ font: "500 7.5px Inter, system-ui, sans-serif" }}>
          Aurixa Builders
        </text>

        <line x1="112" y1="100" x2="168" y2="100" stroke="url(#builders-wire)" strokeWidth="1.25" />

        {/* The connected firms */}
        {firms.map((firm) => (
          <g key={firm.label}>
            <path
              d={`M252 100 L292 100 L292 ${firm.y + 14} L316 ${firm.y + 14}`}
              fill="none"
              stroke="url(#builders-wire)"
              strokeWidth="1.25"
            />
            <rect x="316" y={firm.y} width="96" height="28" fill="#0B162C" stroke="#1C2B41" strokeWidth="1" />
            <text x="328" y={firm.y + 18} fill="#9CA3B8" style={{ font: "500 8px Inter, system-ui, sans-serif" }}>
              {firm.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Register your business",
    body: "You create the account yourself at builders.aurixasystems.com.au and confirm your email address. Your organisation is reviewed before it goes live, so the directory an advisory firm searches is one where every entry has been checked.",
  },
  {
    number: "02",
    title: "Upload the list you already have",
    body: "Your stock list is read as you publish it — a brochure, a price list, a spreadsheet. Lots, addresses, bedrooms, land size, price and photographs are pulled out of the document you already send to agents, and anything the document does not state is left blank rather than invented.",
  },
  {
    number: "03",
    title: "Correct anything the file did not say",
    body: "A dual-key home, a figure that lives in a footnote, a lot the brochure numbers differently: state it once and it stays stated. Your correction is held separately from the extraction, so the next list you upload cannot quietly overwrite it.",
  },
  {
    number: "04",
    title: "Connect to the firms you work with",
    body: "A connection is granted per firm. Your stock appears inside that firm's own workspace, in front of the advisers placing clients, and stops appearing the moment the connection ends. You are never listed to a firm you have not been connected to.",
  },
] as const;

export default function Builders() {
  useRouteMetadata("/builders");
  return (
    <div className="w-full relative pt-32 pb-20 bg-[#040B16] min-h-dvh overflow-hidden">
      <HeroBackground variant="industries" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)] gap-8 items-center mb-24">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-px bg-[#00A8B5]" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">
                Builders &amp; Developers
              </span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[5rem] font-display font-light tracking-tight mb-8 leading-[1.05]"
            >
              <span className="block text-liquid-chrome-clean drop-shadow-md">Publish your stock</span>
              <span className="text-chrome-prismatic italic drop-shadow-2xl">once.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-3xl mb-12"
            >
              The Aurixa Builders Network is where builders and developers publish availability to the advisory
              firms placing clients into it. One list, maintained in one place, reaching every firm you are
              connected to — instead of the same PDF emailed to forty agents and out of date by Thursday.
            </motion.p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://builders.aurixasystems.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center px-10 py-4 text-[12px] tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)]"
              >
                <span className="drop-shadow-md">Open The Network</span>
                <ArrowRight
                  className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md"
                  style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
                />
              </a>
              <Link
                to="/builders/apply"
                className="inline-flex items-center justify-center px-10 py-4 text-[12px] tracking-[0.25em] font-bold text-white/70 border border-white/15 rounded-sm transition-colors hover:text-white hover:border-[#00A8B5]/40"
              >
                Apply For Access
              </Link>
            </div>
          </div>
          <NetworkHeroVisual />
        </div>

        {/* What it is */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#00A8B5] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
            <FileStack
              className="w-12 h-12 mb-8"
              style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            />
            <h2 className="text-2xl font-display font-light text-white mb-4">One list, not forty emails</h2>
            <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
              Availability changes daily and a PDF cannot. Publish to the network and the firms you are connected
              to see the same list you do — lots, prices, photographs and status — at the moment you change it.
              <br />
              <br />
              A property you take off the market stops appearing. A price you move moves everywhere at once.
            </p>
            <div className="w-full h-px bg-[#00A8B5]/20" />
          </div>

          <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-[#C89B3C] hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
            <Network
              className="w-12 h-12 mb-8"
              style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            />
            <h2 className="text-2xl font-display font-light text-white mb-4">In front of the people placing clients</h2>
            <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
              Your stock reaches advisers inside the workspace they already run their day from, beside the
              analysis they are building for a client — not in an inbox behind two hundred other messages.
              <br />
              <br />
              Every connection is granted one firm at a time, by you and by them. There is no open directory of
              your pricing.
            </p>
            <div className="w-full h-px bg-[#C89B3C]/20" />
          </div>

          <div className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left border-t-4 border-white hover:-translate-y-2 transition-transform duration-500 bg-[#0B162C]">
            <Building2
              className="w-12 h-12 mb-8"
              style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            />
            <h2 className="text-2xl font-display font-light text-white mb-4">Your own workspace, not a listing slot</h2>
            <p className="text-[#9CA3B8] font-light leading-relaxed text-sm mb-6 flex-grow">
              Projects, stages, lots, buildings and units; documents, defects and handovers; the construction
              programme and the people on it. The network is a place your business runs, and publishing is one
              of the things you do there.
              <br />
              <br />
              Your records stay yours. A firm sees the stock you publish to it and nothing else.
            </p>
            <div className="w-full h-px bg-white/20" />
          </div>
        </div>

        {/* How it works */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-px bg-[#C89B3C]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Getting Listed</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-16 text-white">
            Four steps, and you keep <span className="italic text-[#00A8B5]">the list you already have</span>.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="glass-panel p-6 sm:p-10 flex flex-col items-start text-left bg-[#0B162C] border-l-2 border-[#00A8B5]/30"
              >
                <span className="text-[11px] font-bold tracking-[0.3em] text-[#C89B3C] mb-6">{step.number}</span>
                <h3 className="text-2xl font-display font-light text-white mb-4">{step.title}</h3>
                <p className="text-[#9CA3B8] font-light leading-relaxed text-sm">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div className="glass-panel p-6 sm:p-16 mb-20 bg-[#0B162C] border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
            <ShieldCheck
              className="w-14 h-14 shrink-0"
              style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            />
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-light tracking-tight mb-6 text-white">
                The identity checks arrive <span className="italic text-[#00A8B5]">already done</span>.
              </h2>
              <p className="text-[#9CA3B8] font-light leading-relaxed mb-6 max-w-3xl">
                When an advisory firm introduces a buyer, it can share that customer's{" "}
                <Link to="/compliance-passport" className="text-[#00A8B5] hover:text-[#5EDDE8] transition-colors">
                  Compliance Passport
                </Link>{" "}
                with you: an attested record that their identity was verified and screened, issued by the firm
                that did the work and readable by the partners it was shared with.
              </p>
              <p className="text-[#9CA3B8] font-light leading-relaxed max-w-3xl">
                You read the record rather than collecting the documents again. Sharing is a deliberate act by
                the firm that holds the file, it names you, and it can be withdrawn — which is why what you are
                given is a current record rather than a copy that quietly goes stale.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 glass-panel p-6 sm:p-16 text-center shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute inset-0 bg-chrome-prismatic opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C89B3C] border border-[#C89B3C]/30 mb-8 rounded-sm">
              Registration Open
            </span>
            <h2 className="text-4xl md:text-6xl font-display font-light tracking-tight mb-8 text-white">
              Put Your Stock In Front Of Them.
            </h2>
            <p className="text-[#9CA3B8] mb-12 max-w-2xl mx-auto text-lg leading-relaxed font-light">
              Tell us about your business and we will set up your organisation and email you a link to set
              your password. From there, publish the list you already keep and connect to the advisory firms
              you want placing clients into your projects.
            </p>
            <Link
              to="/builders/apply"
              className="group relative inline-flex items-center justify-center px-12 py-5 text-[12px] tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(200,155,60,0.3)]"
            >
              <span className="drop-shadow-md">Register Your Business</span>
              <ArrowRight
                className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md"
                style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
