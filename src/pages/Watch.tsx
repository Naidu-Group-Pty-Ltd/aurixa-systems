import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { preconnect } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Clapperboard } from "lucide-react";
import { BriefingTheatre } from "../components/watch/BriefingTheatre";
import { BriefingCard } from "../components/watch/BriefingCard";
import { BriefingChapters } from "../components/watch/BriefingChapters";
import { ShareBar } from "../components/watch/ShareBar";
import NotFound from "./NotFound";
import { captureAttribution } from "../lib/attribution";
import { useRouteMetadata } from "../lib/pageMetadata";
import {
  BRIEFINGS,
  BRIEFING_ROOM_PATH,
  SERIES_LABELS,
  briefingBySlug,
  briefingPath,
  featuredBriefing,
  formatDuration,
  formatPublished,
  isPublished,
  mediaOriginFor,
  publishedBriefings,
  upNextAfter,
  type Briefing,
  type BriefingSeries,
} from "../lib/videos/catalog";
import { createPlaybackStore } from "../lib/videos/playback";
import { readAllProgress, watchedFraction, type BriefingProgress } from "../lib/videos/progress";

/**
 * The Briefing Room: Aurixa's own channel for its explainer videos.
 *
 * One component serves both shapes of the page. `/watch` is the hub — the
 * featured briefing in the theatre and the whole library below it.
 * `/watch/<slug>` is one briefing's own page, prerendered with its own title,
 * description and social card, so a shared link unfurls as that video.
 *
 * It follows the NPC Services VSL page in the way that matters: the video is
 * the first thing on the page, and the call to action sits directly beneath
 * it, so the moment a viewer is persuaded there is somewhere to go.
 */

/** `BRF-01`: the briefing's position in the library, stable for the catalogue's order. */
function codeFor(briefing: Briefing): string {
  return `BRF-${String(BRIEFINGS.indexOf(briefing) + 1).padStart(2, "0")}`;
}

/**
 * Light motes drifting up through the projector beam. Positions come from a
 * fixed-seed generator rather than `Math.random()`, so the prerendered markup
 * and every client render draw the same field.
 */
const MOTES = (() => {
  let seed = 0x2f6e2b1;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 26 }, () => ({
    left: 30 + next() * 40,
    top: 20 + next() * 70,
    size: 1 + next() * 2.4,
    duration: 14 + next() * 18,
    delay: -next() * 30,
    gold: next() > 0.55,
  }));
})();

function Backdrop() {
  return (
    <div className="watch-backdrop" aria-hidden="true">
      <div className="watch-backdrop__beam" />
      <div className="watch-backdrop__beam watch-backdrop__beam--core" />
      <div className="watch-backdrop__floor" />
      {MOTES.map((mote, index) => (
        <span
          key={index}
          className={`watch-backdrop__mote${mote.gold ? " is-gold" : ""}`}
          style={{
            left: `${mote.left}%`,
            top: `${mote.top}%`,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            animationDuration: `${mote.duration}s`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
      <div className="watch-backdrop__grain" />
      <div className="watch-backdrop__vignette" />
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

function BriefingRoom({ briefing, isHub }: { briefing: Briefing; isHub: boolean }) {
  const location = useLocation();
  const autoStart = Boolean((location.state as { briefingAutoplay?: boolean } | null)?.briefingAutoplay);
  // One store per briefing: a new slug is a new programme, with nothing carried over.
  const store = useMemo(() => createPlaybackStore(), [briefing.slug]);
  const published = isPublished(briefing);
  const code = codeFor(briefing);
  const next = upNextAfter(briefing.slug);
  const live = publishedBriefings();
  const pagePath = isHub ? BRIEFING_ROOM_PATH : briefingPath(briefing.slug);

  // Read once on the client. The prerendered library shows no progress, which
  // is correct: progress belongs to a viewer, not to the page.
  const [progress, setProgress] = useState<Record<string, BriefingProgress>>({});
  useEffect(() => {
    setProgress(readAllProgress());
    const refresh = () => setProgress(readAllProgress());
    window.addEventListener("pagehide", refresh);
    return () => window.removeEventListener("pagehide", refresh);
  }, [briefing.slug]);

  const seriesPresent = useMemo(
    () => (Object.keys(SERIES_LABELS) as BriefingSeries[]).filter((series) => BRIEFINGS.some((entry) => entry.series === series)),
    [],
  );
  const [filter, setFilter] = useState<BriefingSeries | "all">("all");
  const shown = filter === "all" ? BRIEFINGS : BRIEFINGS.filter((entry) => entry.series === filter);

  // A visitor arriving on a shared link carries its campaign tags. Recording
  // them here keeps them for the session, so applying later — on /contact —
  // still credits the channel that sent them. See src/lib/videos/share.ts.
  useEffect(() => {
    captureAttribution();
  }, []);

  // Warm the media origin while the page is still settling. The player itself
  // waits for the theatre to be in view before it fetches a byte.
  useEffect(() => {
    const origin = mediaOriginFor(briefing);
    if (origin) preconnect(origin, { crossOrigin: "anonymous" });
  }, [briefing]);

  return (
    <div className="watch-page marketing-page w-full">
      {/* ── The theatre ──────────────────────────────────────────────────── */}
      <section className="watch-hero" aria-labelledby="watch-heading">
        <Backdrop />
        <div className="watch-container">
          <motion.header
            {...fadeUp}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`watch-intro${isHub ? "" : " watch-intro--episode"}`}
          >
            {!isHub && (
              <nav aria-label="Breadcrumb" className="watch-crumbs watch-mono">
                <Link to={BRIEFING_ROOM_PATH}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Briefing Room
                </Link>
                <span aria-hidden="true">/</span>
                <span>{SERIES_LABELS[briefing.series]}</span>
              </nav>
            )}
            <p className="watch-chip">
              <span className={`watch-chip__dot${live.length ? " is-live" : ""}`} aria-hidden="true" />
              {isHub ? "Aurixa // Briefing Room" : `${code} // ${SERIES_LABELS[briefing.series]}`}
              <span className="watch-chip__meta">
                {isHub
                  ? live.length
                    ? `${live.length} on demand`
                    : "Premieres soon"
                  : published
                    ? formatDuration(briefing.durationSeconds)
                    : "Premiering"}
              </span>
            </p>
            {isHub ? (
              <h1 id="watch-heading" className="watch-title">
                <span className="text-liquid-chrome">The Briefing Room.</span>
                <em className="text-chrome-prismatic">The platform, in motion.</em>
              </h1>
            ) : (
              <h1 id="watch-heading" className="watch-title watch-title--episode">
                <span className="text-liquid-chrome">{briefing.title}</span>
              </h1>
            )}
            <p className="watch-lede">
              {isHub
                ? "Short explainer videos on how Aurixa works, streamed from Aurixa's own platform rather than a social feed. Start with the flagship, then go deeper, one module at a time."
                : briefing.kicker}
            </p>
          </motion.header>

          <motion.div {...fadeUp} transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}>
            <BriefingTheatre
              key={briefing.slug}
              briefing={briefing}
              code={code}
              store={store}
              autoStart={autoStart && published}
              next={next}
            />
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
            className="watch-cta-rail"
          >
            <Link to="/contact" className="watch-btn watch-btn--hero btn-chrome-prismatic">
              <span>Book your free demo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.75 }} />
            </Link>
            <p className="watch-mono watch-cta-rail__note">
              Step 1 · Apply for priority access · Every application is reviewed by the Aurixa team
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Programme notes ──────────────────────────────────────────────── */}
      <section className="watch-notes" aria-labelledby="watch-notes-heading">
        <div className="watch-container watch-notes__grid">
          <div className="watch-notes__main">
            <p className="watch-eyebrow">
              <span aria-hidden="true" /> Programme notes
            </p>
            <h2 id="watch-notes-heading" className="watch-notes__title">
              {isHub ? briefing.title : "About this briefing"}
            </h2>
            <p className="watch-notes__summary">{briefing.summary}</p>

            <dl className="watch-facts">
              <div>
                <dt className="watch-mono">Series</dt>
                <dd>{SERIES_LABELS[briefing.series]}</dd>
              </div>
              <div>
                <dt className="watch-mono">Running time</dt>
                <dd>{published ? formatDuration(briefing.durationSeconds) : "Premiering"}</dd>
              </div>
              <div>
                <dt className="watch-mono">Published</dt>
                <dd>{published ? formatPublished(briefing.publishedOn) : "Coming soon"}</dd>
              </div>
            </dl>

            <h3 className="watch-notes__subhead watch-mono">What you will take away</h3>
            <ul className="watch-takeaways">
              {briefing.takeaways.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <Link to={briefing.explore.to} className="watch-explore">
              {briefing.explore.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <ShareBar path={pagePath} title={isHub ? "The Aurixa Briefing Room" : briefing.title} content={isHub ? "hub" : briefing.slug} />
          </div>

          <aside className="watch-panel" aria-labelledby="watch-panel-heading">
            <span className="watch-panel__corner watch-panel__corner--a" aria-hidden="true" />
            <span className="watch-panel__corner watch-panel__corner--b" aria-hidden="true" />
            {published && briefing.chapters?.length ? (
              <>
                <h2 id="watch-panel-heading" className="watch-panel__title watch-mono">
                  Running order
                </h2>
                <BriefingChapters chapters={briefing.chapters} duration={briefing.durationSeconds} store={store} />
              </>
            ) : (
              <>
                <h2 id="watch-panel-heading" className="watch-panel__title watch-mono">
                  {published ? "At a glance" : "Premiere"}
                </h2>
                <div className="watch-panel__glance">
                  <Clapperboard className="watch-panel__icon" aria-hidden="true" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.25 }} />
                  <p className="watch-panel__lead">
                    {published
                      ? `A ${formatDuration(briefing.durationSeconds)} ${SERIES_LABELS[briefing.series].toLowerCase()} briefing.`
                      : "This briefing premieres in the Briefing Room first."}
                  </p>
                  <p className="watch-panel__copy">
                    {published
                      ? "Streamed adaptively from Aurixa's own media storage, so it starts quickly and holds its quality on any connection."
                      : "Explainers land here before anywhere else. The page it explains already covers the detail in full."}
                  </p>
                </div>
              </>
            )}
            <div className="watch-panel__cta">
              <p>Want this working on your own clients?</p>
              <Link to="/contact" className="watch-btn watch-btn--primary">
                Apply for priority access <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>

        {briefing.transcript?.length ? (
          <div className="watch-container">
            <details className="watch-transcript">
              <summary className="watch-mono">Read the transcript</summary>
              <div>
                {briefing.transcript.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </details>
          </div>
        ) : null}
      </section>

      {/* ── The library ──────────────────────────────────────────────────── */}
      <section id="library" className="watch-library" aria-labelledby="watch-library-heading">
        <div className="watch-container">
          <div className="watch-library__head">
            <div>
              <p className="watch-eyebrow">
                <span aria-hidden="true" /> The library
              </p>
              <h2 id="watch-library-heading" className="watch-library__title">
                Every briefing. <em className="text-chrome-prismatic">On demand.</em>
              </h2>
            </div>
            <p className="watch-library__count watch-mono">
              {String(BRIEFINGS.length).padStart(2, "0")} briefings
              <span aria-hidden="true">·</span>
              {String(live.length).padStart(2, "0")} live
            </p>
          </div>

          <div className="watch-filters" role="toolbar" aria-label="Filter the library by series">
            {(["all", ...seriesPresent] as const).map((series) => (
              <button
                key={series}
                type="button"
                className="watch-filter"
                aria-pressed={filter === series}
                onClick={() => setFilter(series)}
              >
                {series === "all" ? "All" : SERIES_LABELS[series]}
                <span className="watch-filter__count">
                  {series === "all" ? BRIEFINGS.length : BRIEFINGS.filter((entry) => entry.series === series).length}
                </span>
              </button>
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            {`Showing ${shown.length} ${shown.length === 1 ? "briefing" : "briefings"}`}
          </p>

          <ul className="watch-grid">
            {shown.map((entry) => (
              <li key={entry.slug}>
                <BriefingCard
                  briefing={entry}
                  code={codeFor(entry)}
                  current={entry.slug === briefing.slug && isPublished(entry)}
                  watched={watchedFraction(progress[entry.slug] ?? null)}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="watch-closing" aria-labelledby="watch-closing-heading">
        <div className="watch-closing__glow" aria-hidden="true" />
        <div className="watch-container watch-closing__inner">
          <p className="watch-eyebrow watch-eyebrow--center">
            <span aria-hidden="true" /> After the briefing
          </p>
          <h2 id="watch-closing-heading" className="watch-closing__title">
            Seen it in motion? <em className="text-chrome-prismatic">Now see it on your numbers.</em>
          </h2>
          <p className="watch-closing__copy">
            Bring a real client scenario to a demo and watch the platform model it, report it and keep it compliant, live.
          </p>
          <div className="watch-closing__actions">
            <Link to="/contact" className="watch-btn watch-btn--hero btn-chrome-prismatic">
              <span>Book your free demo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.75 }} />
            </Link>
            <Link to="/platform" className="watch-btn watch-btn--ghost">
              Explore the platform
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** The registry entry decides the title, description and card; see routeMetadata.ts. */
function BriefingRoomPage({ briefing, isHub }: { briefing: Briefing; isHub: boolean }) {
  useRouteMetadata(isHub ? BRIEFING_ROOM_PATH : briefingPath(briefing.slug));
  return <BriefingRoom briefing={briefing} isHub={isHub} />;
}

export default function Watch() {
  const { slug } = useParams();

  if (slug === undefined) {
    return <BriefingRoomPage key={BRIEFING_ROOM_PATH} briefing={featuredBriefing()} isHub />;
  }

  const briefing = briefingBySlug(slug);
  // A premiere has no page yet, and an unknown slug never had one. On a direct
  // hit neither reaches here — no file was prerendered, so the host serves the
  // real 404 — but a client-side navigation lands on this.
  if (!briefing || !isPublished(briefing)) return <NotFound />;

  // Keyed by slug, so moving between briefings is a fresh page — filter,
  // progress and player state included — exactly as a full load would be.
  return <BriefingRoomPage key={briefing.slug} briefing={briefing} isHub={false} />;
}
