import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Play, RotateCcw, X } from "lucide-react";
import { BriefingPlayer } from "./BriefingPlayer";
import {
  SERIES_LABELS,
  briefingPath,
  formatDuration,
  isPublished,
  mediaUrl,
  type Briefing,
  type PublishedBriefing,
} from "../../lib/videos/catalog";
import { usePlayback, type PlaybackSnapshot, type PlaybackStore } from "../../lib/videos/playback";

/**
 * The frame around the player: a prismatic border, corner registration marks
 * and a HUD that reads the live state of the stream — the rendition actually
 * on screen, the running timecode, the chapter in progress. The HUD is
 * decorative (`aria-hidden`); everything in it is also available from the
 * native controls, which is where assistive technology should get it.
 */

type TheatreProps = {
  briefing: Briefing;
  code: string;
  store: PlaybackStore;
  autoStart?: boolean;
  /** What the end card offers once this briefing finishes. */
  next: PublishedBriefing | null;
};

const END_CARD_SECONDS = 10;

const ENGINE_LABEL: Record<NonNullable<PlaybackSnapshot["engine"]>, string> = {
  mse: "Adaptive",
  "native-hls": "Native HLS",
  progressive: "Progressive",
};

function statusLabel(snapshot: Pick<PlaybackSnapshot, "status" | "height" | "engine">): string {
  switch (snapshot.status) {
    case "playing":
      return snapshot.height ? `Playing · ${snapshot.height}p` : "Playing";
    case "loading":
      return "Buffering";
    case "paused":
      return "Paused";
    case "ended":
      return "Complete";
    case "error":
      return "Signal lost";
    default:
      return snapshot.engine ? `Ready · ${ENGINE_LABEL[snapshot.engine]}` : "Standby";
  }
}

function TopHud({ briefing, code, store }: { briefing: Briefing; code: string; store: PlaybackStore }) {
  const status = usePlayback(store, (s) => s.status);
  const height = usePlayback(store, (s) => s.height);
  const engine = usePlayback(store, (s) => s.engine);
  const published = isPublished(briefing);

  return (
    <div className="watch-hud watch-hud--top" aria-hidden="true">
      <span className="watch-hud__code">
        {code} <i>//</i> {SERIES_LABELS[briefing.series]}
      </span>
      <span className="watch-hud__brand">Aurixa Briefing Room</span>
      <span className={`watch-hud__status watch-hud__status--${published ? status : "premiere"}`}>
        <span className="watch-hud__dot" />
        {published ? statusLabel({ status, height, engine }) : "Premiering"}
      </span>
    </div>
  );
}

function BottomHud({ briefing, store }: { briefing: Briefing; store: PlaybackStore }) {
  // Whole seconds, so the HUD re-renders once a second rather than per tick.
  const second = usePlayback(store, (s) => Math.floor(s.position));
  const duration = usePlayback(store, (s) => s.duration) || briefing.durationSeconds || 0;
  const chapters = briefing.chapters ?? [];
  const chapter = [...chapters].reverse().find((entry) => entry.at <= second);
  const fraction = duration > 0 ? Math.min(1, second / duration) : 0;

  return (
    <div className="watch-hud watch-hud--bottom" aria-hidden="true">
      <span className="watch-hud__timecode">
        {formatDuration(second)} <i>/</i> {duration ? formatDuration(duration) : "--:--"}
      </span>
      <span className="watch-hud__track">
        <span className="watch-hud__fill" style={{ transform: `scaleX(${fraction})` }} />
      </span>
      <span className="watch-hud__chapter">{chapter?.label ?? (isPublished(briefing) ? "Programme" : "Coming soon")}</span>
    </div>
  );
}

/** A premiere: the frame, the artwork and a way forward, with no player behind it. */
function Standby({ briefing }: { briefing: Briefing }) {
  return (
    <div className="watch-standby">
      <img
        src={briefing.artwork}
        alt=""
        className="watch-standby__image"
        style={{ objectPosition: briefing.artworkPosition ?? "center" }}
        decoding="async"
      />
      <div className="watch-poster__tint" aria-hidden="true" />
      <div className="watch-standby__wash" aria-hidden="true" />
      <div className="watch-standby__radar" aria-hidden="true">
        <span className="watch-standby__sweep" />
        <span className="watch-standby__ring" />
        <span className="watch-standby__ring watch-standby__ring--2" />
        <span className="watch-standby__ring watch-standby__ring--3" />
      </div>
      <div className="watch-standby__content">
        <span className="watch-pill watch-pill--gold">
          <span className="watch-pill__dot" aria-hidden="true" /> Premiering in the Briefing Room
        </span>
        <p className="watch-standby__title">{briefing.title}</p>
        <p className="watch-standby__copy">
          This briefing premieres here first. Until it does, the full story is one click away.
        </p>
        <div className="watch-standby__actions">
          <Link to={briefing.explore.to} className="watch-btn watch-btn--primary">
            {briefing.explore.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/contact" className="watch-btn watch-btn--ghost">
            Join the waitlist
          </Link>
        </div>
      </div>
    </div>
  );
}

/** After the last frame: the next briefing on a countdown, or a way to act on this one. */
function EndCard({ store, next }: { store: PlaybackStore; next: PublishedBriefing | null }) {
  const ended = usePlayback(store, (s) => s.status === "ended");
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(END_CARD_SECONDS);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!ended) {
      setSecondsLeft(END_CARD_SECONDS);
      setCancelled(false);
      return;
    }
    if (!next || cancelled) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [ended, next, cancelled]);

  useEffect(() => {
    if (ended && next && !cancelled && secondsLeft === 0) {
      navigate(briefingPath(next.slug), { state: { briefingAutoplay: true } });
    }
  }, [ended, next, cancelled, secondsLeft, navigate]);

  if (!ended) return null;

  const replay = () => store.controller()?.play(0);
  const nextPoster = next ? mediaUrl(next.media.poster) ?? next.artwork : undefined;

  return (
    <div className="watch-endcard" role="group" aria-label="Briefing complete">
      {next ? (
        <div className="watch-endcard__inner">
          <p className="watch-mono watch-endcard__eyebrow" aria-live="polite">
            {cancelled ? "Up next" : `Up next in ${secondsLeft}`}
          </p>
          <Link
            to={briefingPath(next.slug)}
            state={{ briefingAutoplay: true }}
            className="watch-endcard__next"
          >
            <span className="watch-endcard__thumb">
              <img src={nextPoster} alt="" decoding="async" />
              {!cancelled && (
                <svg className="watch-endcard__countdown" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="24" cy="24" r="21" />
                  <circle
                    cx="24"
                    cy="24"
                    r="21"
                    className="watch-endcard__countdown-fill"
                    style={{ animationDuration: `${END_CARD_SECONDS}s` }}
                  />
                </svg>
              )}
              <Play className="watch-endcard__play" aria-hidden="true" />
            </span>
            <span className="watch-endcard__copy">
              <span className="watch-mono watch-endcard__series">{SERIES_LABELS[next.series]} · {formatDuration(next.durationSeconds)}</span>
              <span className="watch-endcard__title">{next.title}</span>
            </span>
          </Link>
          <div className="watch-endcard__actions">
            {!cancelled && (
              <button type="button" className="watch-btn watch-btn--ghost" onClick={() => setCancelled(true)}>
                <X className="h-4 w-4" aria-hidden="true" /> Cancel
              </button>
            )}
            <button type="button" className="watch-btn watch-btn--ghost" onClick={replay}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
            </button>
          </div>
        </div>
      ) : (
        <div className="watch-endcard__inner watch-endcard__inner--final">
          <p className="watch-mono watch-endcard__eyebrow">Briefing complete</p>
          <p className="watch-endcard__title">See it working on your own clients.</p>
          <div className="watch-endcard__actions">
            <Link to="/contact" className="watch-btn watch-btn--primary">
              Book your free demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button type="button" className="watch-btn watch-btn--ghost" onClick={replay}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BriefingTheatre({ briefing, code, store, autoStart, next }: TheatreProps) {
  const status = usePlayback(store, (s) => s.status);
  const published = isPublished(briefing);

  return (
    <figure className="watch-theatre" data-status={published ? status : "premiere"}>
      <div className="watch-theatre__halo" aria-hidden="true" />
      <TopHud briefing={briefing} code={code} store={store} />
      <div className="watch-stage">
        <span className="watch-corner watch-corner--tl" aria-hidden="true" />
        <span className="watch-corner watch-corner--tr" aria-hidden="true" />
        <span className="watch-corner watch-corner--bl" aria-hidden="true" />
        <span className="watch-corner watch-corner--br" aria-hidden="true" />
        <div className="watch-frame">
          {published ? (
            <>
              <BriefingPlayer briefing={briefing} code={code} store={store} autoStart={autoStart} />
              <EndCard store={store} next={next} />
            </>
          ) : (
            <Standby briefing={briefing} />
          )}
        </div>
      </div>
      <BottomHud briefing={briefing} store={store} />
      <figcaption className="sr-only">
        {published ? `${briefing.title}. ${briefing.kicker}` : `${briefing.title}, premiering soon.`}
      </figcaption>
    </figure>
  );
}
