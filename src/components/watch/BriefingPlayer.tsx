import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { persistBandwidthEstimate, readNetworkProfile } from "../../lib/streaming/networkProfile";
import { PlaybackQualityTracker } from "../../lib/streaming/telemetry";
import type { MseEngine } from "../../lib/streaming/mseEngine";
import {
  SERIES_LABELS,
  formatDuration,
  mediaUrl,
  spokenDuration,
  type PublishedBriefing,
} from "../../lib/videos/catalog";
import type { PlaybackStore } from "../../lib/videos/playback";
import { readProgress, resumePosition, writeProgress } from "../../lib/videos/progress";

/**
 * The Briefing Room player.
 *
 * The delivery half is the NPC Services VSL player, carried across intact: an
 * adaptive HLS ladder through a tuned hls.js on Media Source Extensions, native
 * HLS on Apple platforms, and a progressive MP4 only as the last resort. See
 * docs/video-briefings.md for why each of those choices was made and measured.
 *
 * The presentation half is Aurixa's: a poster overlay that owns the first
 * click, an offer to resume, and the native controls from the moment playback
 * starts. Native controls, rather than a custom skin, are deliberate — they
 * bring fullscreen, picture-in-picture, AirPlay, captions, keyboard and screen
 * reader support that a hand-built bar would have to re-earn one by one.
 */

type BriefingPlayerProps = {
  briefing: PublishedBriefing;
  /** `BRF-01`-style catalogue code, shown on the poster. */
  code: string;
  store: PlaybackStore;
  /** Start as soon as the stream can play — set when "Up next" hands over. */
  autoStart?: boolean;
  /**
   * Apple platforms play HLS natively with hardware decode, AirPlay and
   * picture-in-picture intact, and never download the MSE engine at all, so
   * they do so by default. Set false to route Safari through hls.js instead.
   */
  preferNativeHls?: boolean;
};

/** Distance from the viewport at which we start warming the stream. */
const PREWARM_MARGIN = "600px";

/** How often, in seconds of playback, the resume point is written down. */
const PROGRESS_WRITE_INTERVAL = 5;

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints = navigator.maxTouchPoints || 0;

  const classicIOS = /iPad|iPhone|iPod/.test(ua) || /iPad|iPhone|iPod/.test(platform);
  // iPadOS 13+ reports itself as desktop Safari; the touch-point count is the
  // only reliable discriminator.
  const modernIPadOS = platform === "MacIntel" && touchPoints > 1;
  const desktopSafari =
    /Safari/.test(ua) && !/Chrome|Chromium|Android|Edg\//.test(ua) && /Mac OS X/.test(ua);

  return classicIOS || modernIPadOS || desktopSafari;
}

/**
 * Lock-screen, notification-shade and headset controls carry the briefing, not
 * a bare URL. The designed thumbnail is offered first, because it is the
 * briefing's face on every card, and where a browser weighs two images as
 * equally good fits the order is what decides.
 */
function announceMediaSession(briefing: PublishedBriefing, poster: string | undefined, thumbnail: string | undefined): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  if (typeof MediaMetadata === "undefined") return;
  const artwork: MediaImage[] = [];
  if (thumbnail) artwork.push({ src: thumbnail, sizes: "1920x1080", type: "image/jpeg" });
  if (poster) {
    artwork.push({ src: poster, sizes: briefing.orientation === "portrait" ? "1080x1920" : "1920x1080", type: "image/jpeg" });
  }
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: briefing.title,
      artist: "Aurixa Systems",
      album: "Briefing Room",
      artwork,
    });
  } catch {
    // Older implementations throw on artwork they cannot parse. Cosmetic only.
  }
}

function BriefingPlayerImpl({ briefing, code, store, autoStart = false, preferNativeHls }: BriefingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  // An "Up next" hand-over starts without its poster: the viewer already chose.
  const [started, setStarted] = useState(autoStart);
  const [initError, setInitError] = useState(false);
  // Read on the client only; the prerendered markup never offers a resume.
  const [resumeAt, setResumeAt] = useState<number | null>(null);

  /** A play() that could not run yet — the source was still attaching. */
  const wantsPlayRef = useRef(autoStart);
  /** Where to start once metadata has loaded. */
  const pendingSeekRef = useRef<number | null>(null);
  /**
   * The viewer pressed pause. A pause rejects a still-pending play() with the
   * same AbortError a source swap does; this is what tells the two apart, so
   * a deliberate pause before the first frame is never overridden by the next
   * `canplay`. Source swaps and `load()` fire no `pause` event, so they never
   * set it.
   */
  const userPausedRef = useRef(false);
  /**
   * Starts media fetching on the live engine. Until a viewer shows intent —
   * a hover or focus on the poster, or the play itself — only the playlists
   * are fetched, so a visitor browsing the library downloads no video.
   */
  const warmRef = useRef<(at?: number) => void>(() => {});

  const hlsUrl = mediaUrl(briefing.media.hls);
  const mp4Url = mediaUrl(briefing.media.mp4);
  const posterUrl = mediaUrl(briefing.media.poster);
  const thumbnailUrl = mediaUrl(briefing.media.thumbnail);
  const captionsUrl = mediaUrl(briefing.media.captions);
  const slug = briefing.slug;

  useEffect(() => {
    setResumeAt(resumePosition(readProgress(slug)));
  }, [slug]);

  /**
   * Defer every byte of video until the theatre is near the viewport. On the
   * hub it is above the fold and this fires at once; on a phone held in
   * landscape, or a visitor who arrived on `#library`, it may never need to.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoStart || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: PREWARM_MARGIN },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [autoStart]);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const attempt = video.play();
    if (!attempt) return;
    attempt
      .then(() => {
        wantsPlayRef.current = false;
      })
      .catch((error: unknown) => {
        const name = (error as { name?: string })?.name;
        if (name === "NotAllowedError") {
          // The browser wants a gesture first (an "Up next" hand-over on a
          // strict autoplay policy). Put the poster back so one tap starts it.
          wantsPlayRef.current = false;
          setStarted(false);
          return;
        }
        if (name === "AbortError" && userPausedRef.current) {
          wantsPlayRef.current = false;
          return;
        }
        // AbortError / NotSupportedError: the source was still attaching.
        // `canplay` will try again.
        wantsPlayRef.current = true;
      });
  }, []);

  const requestPlay = useCallback(
    (at?: number) => {
      const video = videoRef.current;
      if (!video) return;
      setShouldLoad(true);
      setStarted(true);
      setResumeAt(null);
      wantsPlayRef.current = true;
      userPausedRef.current = false;

      if (typeof at === "number") {
        if (video.readyState >= 1) video.currentTime = at;
        else pendingSeekRef.current = at;
      }

      warmRef.current(at);
      attemptPlay();
      // The poster button that took the click is about to unmount; keep
      // keyboard focus on the player rather than dropping it to <body>.
      video.focus({ preventScroll: true });
    },
    [attemptPlay],
  );

  useEffect(() => store.attach({ play: requestPlay }), [store, requestPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    setInitError(false);
    store.set({ status: wantsPlayRef.current ? "loading" : "idle", engine: null, height: null });

    const profile = readNetworkProfile();
    const tracker = new PlaybackQualityTracker((report) =>
      store.set({ height: report.currentHeight, engine: report.engine }),
    );

    const apple = isApplePlatform();
    const useNativeFirst = preferNativeHls ?? apple;

    let disposed = false;
    let engine: MseEngine | null = null;
    let nativeRetried = false;
    let lastWritten = -Infinity;
    const mediaListeners: Array<[string, EventListener]> = [];

    // Data-saver sessions should not speculatively fetch anything at all; other
    // sessions fetch metadata so the poster gives way to a real first frame.
    video.preload = profile.saveData ? "none" : "metadata";

    const addMediaListener = (type: string, handler: EventListener) => {
      video.addEventListener(type, handler);
      mediaListeners.push([type, handler]);
    };

    const saveProgress = () => {
      // Nothing has played: leave whatever was saved alone. Where metadata
      // loads ahead of play (native HLS, the MP4), leaving the page would
      // otherwise write 0:00 over a viewer's resume point.
      if (video.played.length === 0) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      writeProgress(slug, video.currentTime, video.duration);
      lastWritten = video.currentTime;
    };

    addMediaListener("loadedmetadata", () => {
      store.set({ duration: Number.isFinite(video.duration) ? video.duration : briefing.durationSeconds });
      if (pendingSeekRef.current !== null) {
        video.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    });
    addMediaListener("canplay", () => {
      tracker.markStallEnd();
      if (wantsPlayRef.current) attemptPlay();
    });
    addMediaListener("playing", () => {
      tracker.markFirstFrame();
      tracker.markStallEnd();
      store.set({ status: "playing" });
    });
    addMediaListener("play", () => announceMediaSession(briefing, posterUrl, thumbnailUrl));
    addMediaListener("waiting", () => {
      tracker.markStallStart();
      store.set({ status: "loading" });
    });
    addMediaListener("pause", () => {
      userPausedRef.current = true;
      if (!video.ended) store.set({ status: "paused" });
      saveProgress();
    });
    addMediaListener("ended", () => {
      store.set({ status: "ended", position: video.duration || briefing.durationSeconds });
      saveProgress();
    });
    addMediaListener("timeupdate", () => {
      store.set({ position: video.currentTime });
      if (Math.abs(video.currentTime - lastWritten) >= PROGRESS_WRITE_INTERVAL) saveProgress();
    });

    // A tab closed mid-briefing still leaves a resume point behind.
    const onPageHide = () => saveProgress();
    window.addEventListener("pagehide", onPageHide);

    const fail = () => {
      setInitError(true);
      store.set({ status: "error" });
    };

    /**
     * Progressive MP4 is a genuine last resort. It has no adaptation at all, so
     * a viewer who lands here on a weak network is worse off than one watching
     * the lowest rung of the ladder. We only reach it when no form of HLS is
     * available, or when every recovery attempt has been exhausted.
     */
    const useProgressiveFallback = () => {
      if (disposed) return;
      if (!mp4Url) {
        fail();
        return;
      }
      tracker.markLoadStart("progressive");
      video.src = mp4Url;
      video.load();
      // iOS, and any `preload="none"` session, fires no `canplay` until
      // play() is called, so a play that is wanted is asked for here.
      if (wantsPlayRef.current) attemptPlay();
      addMediaListener("error", () => {
        if (!disposed) fail();
      });
    };

    const startNativeHls = (url: string): boolean => {
      if (!video.canPlayType("application/vnd.apple.mpegurl")) return false;

      tracker.markLoadStart("native-hls");
      video.src = url;
      video.load();
      if (wantsPlayRef.current) attemptPlay();

      // Safari surfaces a manifest or decode failure as a plain media error, so
      // one retry and then progressive is the only ladder available to us here.
      addMediaListener("error", () => {
        if (disposed || video.src !== url) return;
        if (!nativeRetried) {
          nativeRetried = true;
          // load() cancels a pending play; ask again rather than wait for a
          // `canplay` iOS will not send.
          video.load();
          if (wantsPlayRef.current) attemptPlay();
          return;
        }
        useProgressiveFallback();
      });

      return true;
    };

    const startMse = async (url: string): Promise<boolean> => {
      try {
        const { createMseEngine, isMseSupported } = await import("../../lib/streaming/mseEngine");
        if (disposed || !isMseSupported()) return false;

        tracker.markLoadStart("mse");
        engine = createMseEngine({
          video,
          url,
          profile,
          deferLoad: true,
          debug: import.meta.env.DEV,
          onLevel: (height) => tracker.markLevel(height),
          onThroughput: (bps) => tracker.markThroughput(bps),
          onExhausted: ({ position, playing }) => {
            engine = null;
            if (disposed) return;
            // Carry the viewer across: same point in the briefing, and still
            // playing if it was. The next engine starts from a reset element.
            if (position > 0) pendingSeekRef.current = position;
            if (playing) wantsPlayRef.current = true;
            // Step down the engine ladder rather than straight to progressive.
            if (!startNativeHls(url)) useProgressiveFallback();
          },
        });

        if (engine) {
          const live = engine;
          warmRef.current = (at) => live.startLoad(at ?? pendingSeekRef.current ?? undefined);
          // A play requested while the engine chunk was still downloading.
          if (wantsPlayRef.current) live.startLoad(pendingSeekRef.current ?? undefined);
        }
        return engine !== null;
      } catch {
        // The engine chunk failed to load — an offline session, a blocked
        // request, or a stale deployment. Fall through to the next engine.
        return false;
      }
    };

    const start = async () => {
      if (!hlsUrl) {
        useProgressiveFallback();
        return;
      }

      if (useNativeFirst) {
        if (startNativeHls(hlsUrl)) return;
        if (await startMse(hlsUrl)) return;
      } else {
        if (await startMse(hlsUrl)) return;
        if (disposed) return;
        if (startNativeHls(hlsUrl)) return;
      }

      useProgressiveFallback();
    };

    void start();

    return () => {
      disposed = true;
      saveProgress();
      window.removeEventListener("pagehide", onPageHide);

      // Only persist a throughput that was actually observed. hls.js reports the
      // seeded estimate until the first fragment lands, and writing that back
      // would let a stale guess reinforce itself across sessions.
      const observed = tracker.snapshot().throughputBps;
      if (observed) persistBandwidthEstimate(engine?.bandwidthEstimate() ?? observed);

      engine?.destroy();
      engine = null;
      warmRef.current = () => {};

      mediaListeners.forEach(([type, listener]) => video.removeEventListener(type, listener));

      // Release the network and the decoder immediately rather than waiting for
      // the element to be garbage collected.
      video.removeAttribute("src");
      video.load();
    };
    // `briefing` itself is left out: the player is keyed by slug at the call
    // site, so for a given mount everything read from it is constant.
  }, [shouldLoad, hlsUrl, mp4Url, preferNativeHls, slug, store, attemptPlay]);

  const label = `${briefing.title}, ${spokenDuration(briefing.durationSeconds)}`;

  return (
    <div className="watch-player">
      <video
        ref={videoRef}
        className="watch-video"
        controls={started}
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="none"
        poster={posterUrl}
        // Sidecar captions are fetched cross-origin from storage; without this
        // the browser refuses to read the track.
        crossOrigin={captionsUrl ? "anonymous" : undefined}
        aria-label={`Video: ${label}`}
        tabIndex={started ? 0 : -1}
      >
        {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English" />}
        Your browser does not support embedded video.
      </video>

      {!started && !initError && (
        // The whole poster plays on click; the button inside is the keyboard
        // and screen-reader target, so the wrapper itself stays out of both.
        <div
          className="watch-poster"
          onClick={() => requestPlay(resumeAt ?? undefined)}
          // Intent, not a commitment: start buffering so the click that
          // usually follows lands on media that is already arriving.
          onPointerEnter={() => warmRef.current(resumeAt ?? undefined)}
          onFocus={() => warmRef.current(resumeAt ?? undefined)}
        >
          <img
            src={posterUrl ?? briefing.artwork}
            alt=""
            className="watch-poster__image"
            style={{ objectPosition: posterUrl ? "center" : briefing.artworkPosition ?? "center" }}
            decoding="async"
            fetchPriority="high"
          />
          {!posterUrl && <div className="watch-poster__tint" aria-hidden="true" />}
          <div className="watch-poster__wash" aria-hidden="true" />
          <div className="watch-poster__scan" aria-hidden="true" />

          <button
            type="button"
            className="watch-play"
            aria-label={resumeAt ? `Resume ${label} from ${formatDuration(resumeAt)}` : `Play ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              requestPlay(resumeAt ?? undefined);
            }}
          >
            <span className="watch-play__pulse" aria-hidden="true" />
            <span className="watch-play__ring" aria-hidden="true" />
            <span className="watch-play__core" aria-hidden="true">
              <Play
                className="watch-play__icon"
                style={{ stroke: "url(#icon-gold-gradient)", fill: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
              />
            </span>
          </button>

          <div className="watch-poster__caption">
            <p className="watch-mono watch-poster__code">
              {code} <span aria-hidden="true">//</span> {SERIES_LABELS[briefing.series]}
            </p>
            <p className="watch-poster__title">{briefing.title}</p>
            <p className="watch-mono watch-poster__meta">
              <span>{formatDuration(briefing.durationSeconds)}</span>
              <span aria-hidden="true" className="watch-poster__sep" />
              <span>{resumeAt ? `Resume from ${formatDuration(resumeAt)}` : "Play the briefing"}</span>
            </p>
            {resumeAt !== null && (
              <button
                type="button"
                className="watch-poster__restart"
                onClick={(event) => {
                  event.stopPropagation();
                  requestPlay(0);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start from the beginning
              </button>
            )}
          </div>
        </div>
      )}

      {initError && (
        <div className="watch-player__error" role="alert">
          <p className="watch-player__error-title">This briefing could not play in this browser session.</p>
          <p className="watch-player__error-copy">
            Refreshing usually clears it. If it does not, the video can be opened on its own.
          </p>
          <div className="watch-player__error-actions">
            <button type="button" className="watch-btn watch-btn--ghost" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
            {mp4Url && (
              <a className="watch-btn watch-btn--ghost" href={mp4Url} target="_blank" rel="noreferrer">
                Open the video directly
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memoised so a re-render above — the HUD ticking, a library filter — never
 * reaches the streaming effect. Every prop is stable for a given briefing.
 */
export const BriefingPlayer = memo(BriefingPlayerImpl);
