import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Info,
  Lightbulb,
  Lock,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  PUBLIC_DOCS_INDEX,
  PUBLIC_DOCS_GROUPS,
  availabilityLabel,
  type PublicDocsEntry,
} from "../lib/docs/publicIndex";
import {
  fetchDocs,
  recallHandoff,
  rememberHandoff,
  PLAN_LABELS,
  type DeliveredSection,
  type DocsBlock,
  type DocsPayload,
} from "../lib/docs/docsClient";
import { useRouteMetadata } from "../lib/pageMetadata";

/** The public index, rendered as locked sections, before the server answers. */
function indexAsSections(index: PublicDocsEntry[]): DeliveredSection[] {
  return index.map((e) => ({
    ...e,
    locked: e.moduleSlug !== null,
    unlockedBy: null,
    blocks: [],
  }));
}

const NOTE_STYLES: Record<string, { icon: typeof Info; ring: string; text: string; label: string }> = {
  tip: { icon: Lightbulb, ring: "border-[#00A8B5]/30 bg-[#00A8B5]/5", text: "text-[#00A8B5]", label: "Tip" },
  warning: { icon: AlertTriangle, ring: "border-[#C89B3C]/30 bg-[#C89B3C]/5", text: "text-[#C89B3C]", label: "Take care" },
  compliance: { icon: ShieldCheck, ring: "border-[#00A8B5]/30 bg-[#040B16]", text: "text-[#00A8B5]", label: "Compliance" },
};

// Return type is annotated because Block renders itself for `subsection`.
// Without it TypeScript cannot infer the type of a recursive component, stops
// treating it as a valid JSX element type, and then rejects `key` on it.
function Block({ block }: { block: DocsBlock }): ReactElement | null {
  switch (block.kind) {
    case "prose":
      return <p className="text-[#9CA3AF] font-light leading-relaxed mb-5">{block.text}</p>;

    case "steps":
      return (
        <div className="mb-6">
          {block.title && (
            <h4 className="text-white text-sm uppercase tracking-[0.2em] font-light mb-3">{block.title}</h4>
          )}
          <ol className="space-y-3">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-4 text-[#9CA3AF] font-light leading-relaxed">
                <span className="shrink-0 font-mono text-[11px] text-[#C89B3C]/70 pt-1 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "list":
      return (
        <div className="mb-6">
          {block.title && (
            <h4 className="text-white text-sm uppercase tracking-[0.2em] font-light mb-3">{block.title}</h4>
          )}
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-[#9CA3AF] font-light leading-relaxed">
                <CheckCircle2 className="w-4 h-4 mt-1 shrink-0 text-[#00A8B5]/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "fields":
      return (
        <div className="mb-6">
          {block.title && (
            <h4 className="text-white text-sm uppercase tracking-[0.2em] font-light mb-3">{block.title}</h4>
          )}
          <div className="border border-[#00A8B5]/15 rounded-sm overflow-hidden">
            {block.rows.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_1fr] gap-1 sm:gap-6 px-5 py-4 ${
                  i % 2 ? "bg-[#00A8B5]/[0.02]" : ""
                }`}
              >
                <div className="text-white text-sm font-light">{row.name}</div>
                <div className="text-[#9CA3AF] text-sm font-light leading-relaxed">{row.detail}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "note": {
      const style = NOTE_STYLES[block.tone] ?? NOTE_STYLES.tip;
      const Icon = style.icon;
      return (
        <div className={`mb-6 border rounded-sm px-5 py-4 ${style.ring}`}>
          <div className={`flex items-center gap-2 mb-2 ${style.text}`}>
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em]">{style.label}</span>
          </div>
          <p className="text-[#9CA3AF] text-sm font-light leading-relaxed">{block.text}</p>
        </div>
      );
    }

    case "subsection":
      return (
        <div className="mb-8 pl-5 border-l border-[#00A8B5]/20">
          <h3 className="text-white text-lg font-light mb-4">{block.title}</h3>
          {block.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      );

    default:
      return null;
  }
}

function LockedBody({ section, identified }: { section: DeliveredSection; identified: boolean }) {
  const unlock = section.unlockedBy ? PLAN_LABELS[section.unlockedBy] ?? section.unlockedBy : null;
  return (
    <div className="border border-[#C89B3C]/20 bg-[#C89B3C]/[0.03] rounded-sm px-6 py-6">
      <div className="flex items-center gap-2 mb-3 text-[#C89B3C]">
        <Lock className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em]">
          {identified ? "Not in your plan" : "Customer documentation"}
        </span>
      </div>
      {identified ? (
        <>
          <p className="text-[#9CA3AF] font-light leading-relaxed mb-4">
            This module is not included in your current plan, so its documentation is not available on
            your workspace.{" "}
            {unlock
              ? `It is included from the ${unlock} plan.`
              : "It is available as a separately purchased add-on."}
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-[#C89B3C] text-sm uppercase tracking-widest hover:text-[#00A8B5] transition-colors"
          >
            View plans <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      ) : (
        <>
          <p className="text-[#9CA3AF] font-light leading-relaxed mb-4">
            Full documentation for this module is available to customers whose plan includes it. Open the
            documentation from your Command Center, under User Guide, and it will unlock automatically.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-[#C89B3C] text-sm uppercase tracking-widest hover:text-[#00A8B5] transition-colors"
          >
            See what each plan includes <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
}

export default function Docs() {
  useRouteMetadata("/docs");
  const [params] = useSearchParams();
  const handoffParam = params.get("h");
  const [payload, setPayload] = useState<DocsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    rememberHandoff(handoffParam);
    const token = handoffParam ?? recallHandoff();
    let cancelled = false;
    fetchDocs(token).then((result) => {
      if (cancelled) return;
      setPayload(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [handoffParam]);

  // Before the server answers — and if it never does — fall back to the public
  // index. It carries no gated content, so this is always safe to render.
  const sections: DeliveredSection[] = payload?.sections ?? indexAsSections(PUBLIC_DOCS_INDEX);
  const identified = payload?.viewer.identified ?? false;
  const planSlug = payload?.viewer.plan_slug ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q),
    );
  }, [sections, query]);

  const grouped = useMemo(() => {
    return PUBLIC_DOCS_GROUPS.map((heading) => ({
      heading,
      blurb: payload?.groups.find((g) => g.heading === heading)?.blurb ?? "",
      items: filtered.filter((s) => s.group === heading),
    })).filter((g) => g.items.length > 0);
  }, [filtered, payload]);

  const readable = sections.filter((s) => !s.locked).length;

  // Deep-link to a section once content has arrived.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  return (
    // overflow-x-clip, not overflow-hidden: `hidden` on one axis forces the
    // other to `auto`, which made this element a scroll container and pinned
    // the sticky contents rail below to a box that never scrolls.
    <div className="w-full relative pt-32 pb-32 bg-[#040B16] min-h-dvh overflow-x-clip">
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* ── Header ── */}
        <div className="max-w-4xl mb-16 flex flex-col items-center text-center mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#00A8B5]/5 border border-[#00A8B5]/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,168,181,0.1)]">
            <BookOpen className="w-6 h-6 text-[#00A8B5]" strokeWidth={1.5} />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[clamp(2.3rem,11.5vw,3rem)] md:text-7xl font-display font-light tracking-tight mb-8 leading-[1.05]"
          >
            <span className="block text-liquid-chrome drop-shadow-md">Command Center</span>
            <span className="text-chrome-prismatic italic drop-shadow-2xl">Documentation.</span>
          </motion.h1>
          <p className="text-xl text-[#9CA3AF] font-light leading-relaxed max-w-2xl mb-8">
            The complete reference for the Aurixa Command Center: every module, every workflow, and the
            reasoning underneath. Written for the people who use it all day.
          </p>

          {/* Viewer state */}
          {!loading && identified && (
            <div className="inline-flex items-center gap-3 border border-[#00A8B5]/30 bg-[#00A8B5]/5 rounded-sm px-5 py-3">
              <ShieldCheck className="w-4 h-4 text-[#00A8B5]" />
              <span className="text-sm text-[#9CA3AF] font-light">
                Showing documentation for your workspace
                {planSlug && PLAN_LABELS[planSlug] ? ` on the ${PLAN_LABELS[planSlug]} plan` : ""}.{" "}
                <span className="text-white">{readable}</span> of {sections.length} sections available.
              </span>
            </div>
          )}
          {!loading && !identified && (
            <div className="inline-flex items-start gap-3 border border-[#C89B3C]/25 bg-[#C89B3C]/[0.03] rounded-sm px-5 py-3 text-left max-w-2xl">
              <Lock className="w-4 h-4 text-[#C89B3C] mt-0.5 shrink-0" />
              <span className="text-sm text-[#9CA3AF] font-light">
                You are viewing the public index. Open documentation from your Command Center, under{" "}
                <span className="text-white">User Guide</span>, to unlock the full text for every module
                your plan includes.
              </span>
            </div>
          )}
        </div>

        {/* ── Search ── */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <Search className="w-4 h-4 text-[#00A8B5]/50 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation"
              aria-label="Search documentation"
              className="w-full bg-[#040B16] border border-[#00A8B5]/20 rounded-sm pl-11 pr-4 py-3 text-white font-light placeholder:text-[#94A3B8]/50 focus:outline-none focus:border-[#00A8B5]/50 transition-colors"
            />
          </div>
        </div>

        {/* minmax(0,1fr), not 1fr: a grid track's default minimum is its
            content, so one long unbroken string in the docs body would widen
            the column past the page instead of wrapping inside it. */}
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-12">
          {/* ── Contents ── */}
          <nav aria-label="Documentation contents" className="hidden lg:block">
            <div className="sticky top-32 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain pr-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00A8B5]/60 mb-4">
                Contents
              </p>
              {grouped.map((group) => (
                <div key={group.heading} className="mb-6">
                  <p className="text-white text-xs uppercase tracking-[0.2em] font-light mb-2">
                    {group.heading}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((s) => (
                      <li key={s.slug}>
                        <a
                          href={`#${s.slug}`}
                          className="group flex items-center gap-1.5 text-[13px] text-[#94A3B8] hover:text-[#00A8B5] font-light transition-colors py-0.5"
                        >
                          {s.locked && <Lock className="w-3 h-3 shrink-0 text-[#C89B3C]/60" />}
                          <span className="truncate">{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* ── Body ── */}
          <div>
            {loading && (
              <p className="text-[#94A3B8] font-light" role="status">
                Loading documentation…
              </p>
            )}

            {!loading &&
              grouped.map((group) => (
                <section key={group.heading} className="mb-20">
                  <div className="border-b border-[#00A8B5]/20 pb-5 mb-10">
                    <h2 className="text-3xl font-display font-light text-white mb-2">{group.heading}</h2>
                    {group.blurb && (
                      <p className="text-[#9CA3AF] font-light leading-relaxed max-w-2xl">{group.blurb}</p>
                    )}
                  </div>

                  {group.items.map((section) => (
                    <article key={section.slug} id={section.slug} className="mb-14 scroll-mt-32">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-2xl font-light text-white">{section.title}</h3>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-1 border border-[#00A8B5]/25 text-[#00A8B5]/80 rounded-sm">
                          {availabilityLabel(section.moduleSlug)}
                        </span>
                        {!section.locked && (
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#94A3B8]/60">
                            {section.readMinutes} min read
                          </span>
                        )}
                      </div>
                      <p className="text-[#9CA3AF] font-light leading-relaxed mb-6">{section.summary}</p>

                      {section.locked ? (
                        <LockedBody section={section} identified={identified} />
                      ) : (
                        <div>
                          {section.blocks.map((b, i) => (
                            <Block key={i} block={b} />
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              ))}

            {!loading && grouped.length === 0 && (
              <p className="text-[#94A3B8] font-light">
                Nothing matches “{query}”. Try a module name such as “deal pipeline” or “compliance”.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="mt-24 border-t border-[#00A8B5]/20 pt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white text-lg font-light mb-1">Not yet running the Command Center?</p>
            <p className="text-[#9CA3AF] font-light">
              See how each plan maps to the modules documented here.
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 border border-[#C89B3C]/40 text-[#C89B3C] px-6 py-3 rounded-sm uppercase tracking-widest text-sm hover:bg-[#C89B3C]/10 transition-colors"
          >
            View pricing <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
