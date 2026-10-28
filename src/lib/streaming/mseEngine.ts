import Hls, { ErrorDetails, ErrorTypes, Events } from "hls.js";
import { buildHlsConfig } from "./hlsConfig";
import { onNetworkChange, readNetworkProfile, type NetworkProfile } from "./networkProfile";

/**
 * Media Source Extensions playback engine.
 *
 * Isolated in its own module so the component can reach it through a dynamic
 * import. hls.js is roughly 130 kB gzipped — more than the rest of the Briefing
 * Room put together — and on Apple platforms, where native HLS handles
 * playback, it is never needed at all. Loading it lazily keeps it out of the
 * entry chunk every other page on the site shares, and out of the critical
 * path that has to render the theatre before the viewer can even see it.
 */

/** Attempts before we stop retrying a network failure and change engine. */
const MAX_NETWORK_RECOVERIES = 4;
/** Attempts before we stop trying to recover a decode failure. */
const MAX_MEDIA_RECOVERIES = 2;

export type MseEngine = {
  destroy: () => void;
  /** Latest throughput measurement in bits per second, if one has been made. */
  bandwidthEstimate: () => number | null;
  /**
   * Begin fetching media, from `at` seconds (or the start). Only meaningful
   * with `deferLoad`; safe to call more than once, and before the manifest
   * has been parsed — the request is held until it has.
   */
  startLoad: (at?: number) => void;
};

export type MseEngineOptions = {
  video: HTMLVideoElement;
  url: string;
  profile: NetworkProfile;
  debug?: boolean;
  /** Called with the height of the rendition now playing. */
  onLevel?: (height: number | null) => void;
  /** Called with each new throughput measurement. */
  onThroughput?: (bps: number) => void;
  /** Called once recovery is exhausted, so the caller can change engine. */
  onExhausted?: () => void;
  /**
   * Parse the manifest but fetch no media until `startLoad()`. The NPC VSL
   * buffered from the moment it attached, which suits a page whose only job
   * is that one video; a library page whose visitors may never press play
   * would otherwise download up to `maxBufferLength` seconds of each stream
   * for nothing.
   */
  deferLoad?: boolean;
};

export function isMseSupported(): boolean {
  return Hls.isSupported();
}

export function createMseEngine(options: MseEngineOptions): MseEngine | null {
  if (!Hls.isSupported()) return null;

  const { video, url, profile, debug = false, onLevel, onThroughput, onExhausted, deferLoad = false } = options;

  const hls = new Hls({ ...buildHlsConfig({ profile, debug }), autoStartLoad: !deferLoad });

  let destroyed = false;
  let manifestParsed = false;
  let loadStarted = !deferLoad;
  let loadRequested = false;
  let requestedStart: number | undefined;
  let networkRecoveries = 0;
  let mediaRecoveries = 0;
  let recoveryTimer: number | undefined;
  let stopNetworkWatch: (() => void) | undefined;

  let resizeObserver: ResizeObserver | undefined;

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
    stopNetworkWatch?.();
    resizeObserver?.disconnect();
    hls.destroy();
  };

  const giveUp = () => {
    if (destroyed) return;
    destroy();
    onExhausted?.();
  };

  /**
   * Bound the automatic ladder by what the display can actually resolve and by
   * what the connection can sustain.
   *
   * hls.js' own `capLevelToPlayerSize` caps at the highest rendition that fits
   * *inside* the player box. That is too aggressive here: the player is roughly
   * 1024 px wide on desktop, so on a 1x display it would pin playback to 720p,
   * which is visibly softer on the interface captures and on-screen type an
 * explainer is full of.
   *
   * The rule below instead caps at the first rendition that *meets or exceeds*
   * the display resolution, with headroom on top, so the stream is never
   * upscaled and never capped below what the panel can show. A phone still
   * drops out of 1080p — a 390 px box at 2x with headroom asks for about
   * 1014 px, so 720p satisfies it and roughly 45% of the bitrate is saved for
   * no visible difference.
   */
  const applyLevelCap = () => {
    if (destroyed) return;
    if (hls.levels.length === 0) return;

    const current = readNetworkProfile();

    // Bias upward so a display sitting just above a rung's width still gets the
    // next one up rather than a downscale that is only barely sufficient.
    const HEADROOM = 1.3;
    // Beyond 2x, extra device pixels buy nothing perceptible on video.
    const pixelRatio = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2,
    );

    const boxWidth = video.clientWidth || video.width || 0;
    const targetWidth = boxWidth > 0 ? boxWidth * pixelRatio * HEADROOM : Infinity;

    let capIndex = -1;
    if (Number.isFinite(targetWidth)) {
      // hls.js orders levels by ascending bitrate, and the ladder is ordered by
      // ascending resolution alongside it.
      const sufficient = hls.levels.findIndex((level) => (level.width || 0) >= targetWidth);
      if (sufficient !== -1) capIndex = sufficient;
    }

    // Constrained and data-saver sessions get a hard ceiling on top of the
    // display-based one, because there the bitrate matters more than the pixels.
    if (current.saveData || current.constrained) {
      const ceiling = current.saveData ? 480 : 720;
      let byBitrate = -1;
      hls.levels.forEach((level, index) => {
        if (level.height && level.height <= ceiling) byBitrate = index;
      });
      // If no rung sits at or below the ceiling, pin to the cheapest one rather
      // than leaving the stream uncapped, which is what -1 would mean.
      if (byBitrate < 0) byBitrate = 0;
      capIndex = capIndex >= 0 ? Math.min(capIndex, byBitrate) : byBitrate;
    }

    hls.autoLevelCapping = capIndex;
  };

  hls.on(Events.MEDIA_ATTACHED, () => hls.loadSource(url));

  /**
   * hls.js ignores `startLoad` until the manifest is parsed, so a request that
   * arrives first — a click on the poster while the playlist is in flight —
   * is held and replayed rather than dropped.
   */
  const beginLoad = (at?: number) => {
    if (destroyed || loadStarted) return;
    loadRequested = true;
    requestedStart = at;
    if (!manifestParsed) return;
    loadStarted = true;
    // -1 is hls.js for "from the start position"; a resume passes its own.
    hls.startLoad(typeof at === "number" && at > 0 ? at : -1);
  };

  hls.on(Events.MANIFEST_PARSED, () => {
    manifestParsed = true;
    if (loadRequested) beginLoad(requestedStart);
    applyLevelCap();
    stopNetworkWatch = onNetworkChange(applyLevelCap);

    // Entering fullscreen or rotating a phone changes what the display can
    // resolve, so the cap has to be recomputed rather than fixed at start-up.
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => applyLevelCap());
      resizeObserver.observe(video);
    }
  });

  hls.on(Events.LEVEL_SWITCHED, (_event, data) => {
    onLevel?.(hls.levels[data.level]?.height ?? null);
  });

  hls.on(Events.FRAG_BUFFERED, () => {
    const estimate = hls.bandwidthEstimate;
    if (Number.isFinite(estimate) && estimate > 0) onThroughput?.(estimate);
  });

  hls.on(Events.ERROR, (_event, data) => {
    if (debug) {
      console.warn("[Briefing][HLS]", data.type, data.details, data.fatal ? "(fatal)" : "");
    }
    if (!data.fatal || destroyed) return;

    switch (data.type) {
      case ErrorTypes.NETWORK_ERROR: {
        // A manifest that cannot be parsed will not become parseable on a
        // retry, so that case skips straight to the next engine.
        if (data.details === ErrorDetails.MANIFEST_PARSING_ERROR) {
          giveUp();
          return;
        }
        if (networkRecoveries >= MAX_NETWORK_RECOVERIES) {
          giveUp();
          return;
        }

        const attempt = networkRecoveries++;
        const delay = Math.min(8000, 500 * 2 ** attempt);
        recoveryTimer = window.setTimeout(() => {
          if (destroyed) return;
          // Resume from where playback actually is, so a retry does not
          // re-download everything the viewer has already watched.
          hls.startLoad(video.currentTime);
        }, delay);
        return;
      }

      case ErrorTypes.MEDIA_ERROR: {
        if (mediaRecoveries >= MAX_MEDIA_RECOVERIES) {
          giveUp();
          return;
        }

        mediaRecoveries += 1;
        if (mediaRecoveries === 1) {
          hls.recoverMediaError();
        } else {
          // A second decode failure is usually an audio codec the device
          // cannot handle in its current configuration.
          hls.swapAudioCodec();
          hls.recoverMediaError();
        }
        return;
      }

      default:
        giveUp();
    }
  });

  hls.attachMedia(video);

  return {
    destroy,
    startLoad: beginLoad,
    bandwidthEstimate: () => {
      const estimate = hls.bandwidthEstimate;
      return Number.isFinite(estimate) && estimate > 0 ? estimate : null;
    },
  };
}
