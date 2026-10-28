import { motion } from "motion/react";
import {
  ArrowRight,
  AudioLines,
  CalendarClock,
  ClipboardList,
  Database,
  MessageSquareText,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Share2,
  Sparkles,
  UserRoundCheck,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TRIAL_CTA } from "../lib/cta";

const goldStroke = { stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 } as const;

/**
 * Fixed amplitude envelope for the console waveform. Hand-tuned rather than
 * randomised so the bars read as speech and stay identical across renders.
 */
const WAVEFORM = [
  0.22, 0.34, 0.28, 0.46, 0.62, 0.44, 0.58, 0.78, 0.9, 0.66, 0.5,
  0.72, 0.86, 1, 0.82, 0.6, 0.42, 0.56, 0.74, 0.9, 0.7, 0.48,
  0.36, 0.52, 0.68, 0.84, 0.96, 0.74, 0.54, 0.4, 0.6, 0.78,
  0.62, 0.44, 0.3, 0.5, 0.66, 0.52, 0.38, 0.26, 0.44, 0.32, 0.24, 0.18,
];

const LEDGER = [
  "Enquiry answered",
  "Caller qualified",
  "Appointment scheduled",
  "CRM record updated",
  "Internal task activated",
];

const CAPABILITIES = [
  {
    icon: MessageSquareText,
    title: "Answer Enquiries",
    desc: "Common questions handled in your organisation’s own language, with the level of detail your callers actually ask for.",
    accent: "#00A8B5",
  },
  {
    icon: PhoneOutgoing,
    title: "Follow Up Leads",
    desc: "Outbound calls placed against your lists so enquiries are picked up while they are still warm.",
    accent: "#C89B3C",
  },
  {
    icon: UserRoundCheck,
    title: "Qualify Callers",
    desc: "Your qualification criteria asked consistently on every call, with the answers captured as structured detail.",
    accent: "#00A8B5",
  },
  {
    icon: CalendarClock,
    title: "Schedule Appointments",
    desc: "Bookings placed against the calendars and availability rules your team already works to.",
    accent: "#C89B3C",
  },
  {
    icon: ClipboardList,
    title: "Collect Information",
    desc: "Names, references, requirements and context gathered accurately and passed on in a usable form.",
    accent: "#00A8B5",
  },
  {
    icon: Database,
    title: "Update Records",
    desc: "Call outcomes written back into your CRM and connected systems, so records stay current without manual entry.",
    accent: "#C89B3C",
  },
  {
    icon: Workflow,
    title: "Activate Internal Tasks",
    desc: "Downstream workflows triggered the moment a call ends, so the next step is already in motion.",
    accent: "#00A8B5",
  },
  {
    icon: Sparkles,
    title: "Steps Specific To You",
    desc: "The routine actions that sit either side of a conversation in your business, configured, not templated.",
    accent: "#C89B3C",
  },
];

const OUTCOMES = [
  {
    label: "Faster Response",
    desc: "Enquiries are met when they arrive, rather than when someone becomes available.",
  },
  {
    label: "Consistent Delivery",
    desc: "Every caller receives the same standard of information, delivered the same way.",
  },
  {
    label: "A Clear Next Step",
    desc: "Callers leave the conversation with an answer, a booking, or a defined pathway forward.",
  },
];

const MODES = [
  {
    icon: PhoneIncoming,
    tag: "Mode 01",
    title: "Inbound Voice Agent",
    desc: "Answers calls as they arrive, through busy periods, outside normal operating hours, or whenever additional coverage is required.",
    accent: "#00A8B5",
  },
  {
    icon: PhoneOutgoing,
    tag: "Mode 02",
    title: "Outbound Calling Support",
    desc: "Places calls against your lists, following up enquiries, confirming details, and progressing conversations that would otherwise wait.",
    accent: "#C89B3C",
  },
  {
    icon: Share2,
    tag: "Mode 03",
    title: "Combined Deployment",
    desc: "Inbound and outbound operating to one configuration, one communication style, and one connected set of systems.",
    accent: "#FFFFFF",
  },
];

const CONFIGURED_AROUND = [
  "Your Processes",
  "Your Communication Style",
  "Your Qualification Requirements",
  "Your Connected Systems",
];

/** Illustrative live-call console. Decorative — the real content sits below it. */
function VoiceConsole() {
  return (
    <div className="relative" aria-hidden="true">
      {/* Ambient bloom behind the console */}
      <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(0,168,181,0.18),transparent_65%)] blur-[70px]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-[#C89B3C]/10 voice-orbit" />

      <div className="glass-panel relative overflow-hidden border border-[#00A8B5]/25 bg-gradient-to-br from-marketing-panel/95 to-marketing-recessed p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)] md:p-8">
        {/* Corner registration marks */}
        <span className="absolute left-0 top-0 h-6 w-6 border-l border-t border-[#00A8B5]/50" />
        <span className="absolute right-0 top-0 h-6 w-6 border-r border-t border-[#C89B3C]/40" />
        <span className="absolute bottom-0 left-0 h-6 w-6 border-b border-l border-[#C89B3C]/40" />
        <span className="absolute bottom-0 right-0 h-6 w-6 border-b border-r border-[#00A8B5]/50" />

        {/* Status header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#00A8B5]/40 bg-[#00A8B5]/10">
              <span className="voice-sonar absolute inset-0 rounded-full border border-[#00A8B5]/60" />
              <PhoneCall className="relative h-4 w-4" style={goldStroke} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#00A8B5]">
                Line Active
              </p>
              <p className="truncate text-sm font-light text-white">
                Inbound enquiry · voice agent engaged
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-2 border border-white/10 bg-marketing-recessed px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C89B3C]" />
            CH_01
          </span>
        </div>

        {/* Waveform */}
        <div className="relative mt-8 h-32 overflow-hidden border border-white/5 bg-marketing-recessed/70 px-3 pb-7 md:h-40 md:px-5">
          <div className="voice-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex h-full items-center gap-[2px] md:gap-[3px]">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#00A8B5]/30 to-transparent" />
            {WAVEFORM.map((amp, i) => (
              <div
                key={i}
                className="voice-wave-bar relative min-w-[2px] flex-1 rounded-full bg-gradient-to-t from-[#00A8B5]/40 via-[#00A8B5] to-[#F5D17A]"
                style={{
                  height: `${Math.round(amp * 100)}%`,
                  animationDuration: `${1.05 + (i % 5) * 0.16}s`,
                  animationDelay: `-${(i % 11) * 0.11}s`,
                }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/30 md:left-5">
            <AudioLines className="h-3 w-3" style={goldStroke} />
            Live transcription
          </div>
        </div>

        {/* Action ledger */}
        <div className="relative mt-7 overflow-hidden border-t border-white/10 pt-6">
          <div className="voice-scan pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-[#C89B3C]/10 to-transparent" />
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
            Actions triggered
          </p>
          <ul className="space-y-2.5">
            {LEDGER.map((item, i) => (
              <li
                key={item}
                className="flex items-center gap-4 border-l border-[#00A8B5]/30 bg-white/[0.02] py-2 pl-4 pr-3"
              >
                <span className="font-mono text-[10px] tracking-widest text-[#C89B3C]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[13px] font-light text-[#9CA3B8]">{item}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#00A8B5] shadow-[0_0_10px_#00A8B5]" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function VoiceAgentSection() {
  return (
    <section
      id="voice"
      aria-labelledby="voice-heading"
      className="relative mt-32 border-t border-white/5 pt-32"
    >
      {/* Ambient field */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] max-w-[100vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,168,181,0.10),rgba(200,155,60,0.06)_45%,transparent_72%)] blur-[90px]"
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-3xl">
        <div className="mb-6 flex items-start gap-3">
          <span className="mt-2 h-px w-12 shrink-0 bg-[#00A8B5]" />
          <span className="text-[10px] font-bold uppercase leading-4 tracking-widest text-white/50">
            Aurixa Voice // Conversational Infrastructure
          </span>
        </div>
        <motion.h2
          id="voice-heading"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-8 font-display text-4xl font-light leading-[1.05] tracking-tight text-white drop-shadow-md md:text-6xl"
        >
          <span className="block text-liquid-chrome-clean">Turn Every Conversation</span>
          <span className="italic text-chrome-prismatic drop-shadow-xl">Into Action.</span>
        </motion.h2>
        <p className="text-lg font-light leading-relaxed text-[#9CA3AF] md:text-xl">
          Missed calls, delayed follow-ups and unanswered enquiries may create gaps in the customer
          experience, and opportunities for greater operational efficiency.
        </p>
      </div>

      {/* ── Narrative + live console ─────────────────────────────────────── */}
      <div className="relative z-10 mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="space-y-6 lg:col-span-6"
        >
          <p className="text-lg font-light leading-relaxed text-[#9CA3B8]">
            Aurixa Voice provides your organisation with AI-assisted voice agents designed around
            your workflows, systems and service requirements, helping your team remain responsive
            during busy periods, outside normal operating hours, or whenever additional
            communication support is required.
          </p>
          <p className="text-lg font-light leading-relaxed text-[#9CA3B8]">
            Routine conversations and administrative actions are managed efficiently, while your
            team remains focused on higher-value interactions and business priorities.
          </p>
          <p className="text-lg font-light leading-relaxed text-[#9CA3B8]">
            By introducing voice automation into your existing processes, your organisation can
            improve response times, support more consistent communication, and provide callers with
            a clear and convenient pathway to the next step.
          </p>

          {/* Outcome ledger */}
          <div className="grid grid-cols-1 pt-2 sm:grid-cols-3 sm:gap-8">
            {OUTCOMES.map((outcome) => (
              <div
                key={outcome.label}
                className="border-t border-white/10 py-6 sm:border-l sm:border-t-0 sm:py-0 sm:pl-5 sm:first:border-l-0 sm:first:pl-0"
              >
                <p className="mb-2 text-[10px] font-bold uppercase leading-relaxed tracking-widest text-[#C89B3C]">
                  {outcome.label}
                </p>
                <p className="text-sm font-light leading-relaxed text-[#9CA3B8]">{outcome.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="lg:col-span-6"
        >
          <VoiceConsole />
        </motion.div>
      </div>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mt-28">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h3 className="max-w-xl font-display text-3xl font-light tracking-tight text-white md:text-4xl">
            What your voice agents{" "}
            <span className="italic text-liquid-chrome-clean">can assist with.</span>
          </h3>
          <p className="max-w-md text-sm font-light leading-relaxed text-[#9CA3B8]">
            Each capability is configured against your own systems and service requirements, never
            deployed as a generic script.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px border border-white/10 bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="group relative flex flex-col overflow-hidden bg-marketing-panel/90 p-6 transition-colors duration-500 hover:bg-marketing-panel sm:p-8"
            >
              <span
                className="absolute inset-x-0 top-0 h-px scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `linear-gradient(180deg, ${accent}0F, transparent 70%)` }}
              />
              <Icon className="relative mb-7 h-9 w-9" style={goldStroke} />
              <h4 className="relative mb-3 font-display text-xl font-light leading-snug text-white">
                {title}
              </h4>
              <p className="relative text-sm font-light leading-relaxed text-[#9CA3B8]">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Deployment modes ─────────────────────────────────────────────── */}
      <div className="relative z-10 mt-28">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-white/30" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Deployment
            </span>
            <span className="h-px w-8 bg-white/30" />
          </div>
          <h3 className="mb-6 font-display text-3xl font-light tracking-tight text-white md:text-4xl">
            Inbound, outbound,{" "}
            <span className="italic text-chrome-prismatic drop-shadow-lg">or both.</span>
          </h3>
          <p className="text-lg font-light leading-relaxed text-[#9CA3B8]">
            Whether you require an inbound voice agent, outbound calling support or a combination of
            both, Aurixa Voice can be configured around your organisation’s processes, communication
            style, qualification requirements and connected systems.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {MODES.map(({ icon: Icon, tag, title, desc, accent }) => (
            <div
              key={title}
              className="glass-panel glass-panel-hover group relative flex flex-col overflow-hidden bg-marketing-panel/80 p-6 sm:p-10"
              style={{ borderTop: `2px solid ${accent}` }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                style={{ background: `linear-gradient(180deg, ${accent}14, transparent 60%)` }}
              />
              <span className="relative mb-8 font-mono text-[9px] uppercase tracking-[0.28em] text-white/40">
                {tag}
              </span>
              <Icon className="relative mb-7 h-10 w-10" style={goldStroke} />
              <h4 className="relative mb-4 font-display text-2xl font-light text-white">{title}</h4>
              <p className="relative mb-8 text-sm font-light leading-relaxed text-[#9CA3B8]">
                {desc}
              </p>
              <div className="relative mt-auto h-px w-full overflow-hidden bg-white/10">
                <div
                  className="h-full w-0 transition-all duration-1000 ease-out group-hover:w-full"
                  style={{ background: accent }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Configuration axes + inline CTA */}
        <div className="mt-10 flex flex-col items-center justify-between gap-8 border border-white/10 bg-marketing-recessed/60 p-6 sm:p-8 lg:flex-row lg:gap-12">
          <div className="w-full">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#00A8B5]">
              Configured around
            </p>
            <ul className="flex flex-wrap gap-3">
              {CONFIGURED_AROUND.map((axis) => (
                <li
                  key={axis}
                  className="border border-white/10 bg-marketing-panel px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3B8]"
                >
                  {axis}
                </li>
              ))}
            </ul>
          </div>
          <Link
            to={TRIAL_CTA.to}
            className="group inline-flex w-full shrink-0 items-center justify-center rounded-sm border border-[#C89B3C]/40 px-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-all hover:border-[#C89B3C] hover:bg-[#C89B3C]/10 sm:whitespace-nowrap sm:px-10 sm:text-[11px] sm:tracking-[0.25em] lg:w-auto"
          >
            Try Aurixa Voice free
            <ArrowRight
              className="ml-4 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
              style={goldStroke}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
