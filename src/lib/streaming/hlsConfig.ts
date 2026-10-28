import Hls, { type HlsConfig } from "hls.js";
import { createNormalizingPlaylistLoader } from "./manifest";
import type { NetworkProfile } from "./networkProfile";

/**
 * Adaptive-streaming configuration for the Briefing Room's explainer videos.
 *
 * Carried across from the NPC Services VSL player, where it was tuned against
 * a measured ten-minute ladder (see docs/video-briefings.md for the history).
 *
 * hls.js ships defaults tuned for live and near-live playback, where holding a
 * large forward buffer is either impossible or actively harmful. A pre-encoded
 * explainer is the opposite case: every second of buffer we can bank while the
 * network is healthy is a second of stall we never pay for later, and at two
 * to five minutes long most of a briefing fits inside the forward buffer on a
 * healthy desktop connection. The values below trade a little memory and some
 * eager bandwidth for the rebuffer-free playback the large streaming services
 * are judged on.
 */

/** Never let the automatic ladder pick something unwatchably soft. */
const MIN_AUTO_BITRATE = 180_000;

type BuildOptions = {
  profile: NetworkProfile;
  /** Set when the caller wants verbose hls.js logging (dev only). */
  debug?: boolean;
};

export function buildHlsConfig({ profile, debug = false }: BuildOptions): Partial<HlsConfig> {
  const { constrained, lowMemory, saveData, estimatedBps } = profile;

  // Buffer depth is the primary anti-stall lever. Desktop machines happily hold
  // several minutes of a 3 Mbps rendition; phones and data-saver sessions get a
  // shallower target so we neither exhaust the MSE quota nor waste the user's
  // allowance on video they may never watch.
  const maxBufferLength = saveData ? 20 : constrained ? 40 : 90;
  const maxMaxBufferLength = saveData ? 60 : constrained ? 240 : 900;
  const maxBufferSize = (lowMemory ? 45 : constrained ? 75 : 140) * 1000 * 1000;

  return {
    debug,

    // Demux and remux on a worker thread. This page runs a lot of scroll-linked
    // animation and backdrop blur; without a worker, main-thread contention
    // starves the append pipeline and produces stalls that look like network
    // problems but are not.
    enableWorker: true,

    // Repair a Windows-authored master playlist before it reaches the parser.
    pLoader: createNormalizingPlaylistLoader(Hls.DefaultConfig.loader),

    // ---------------------------------------------------------------------
    // Start-up
    // ---------------------------------------------------------------------

    // -1 lets the ABR controller choose from the seeded throughput estimate
    // rather than blindly starting at the bottom (slow visible ramp) or at the
    // manifest's first entry (immediate rebuffer on a weak connection).
    startLevel: -1,

    // Seed the estimator with what this user's network actually achieved last
    // visit, so the very first segment request is already the right size.
    abrEwmaDefaultEstimate: estimatedBps,
    abrEwmaDefaultEstimateMax: 8_000_000,

    // Fetch the first fragment as soon as loading starts, ahead of the media
    // element asking for it, so playback starts from buffer instead of from a
    // cold request. In the Briefing Room loading starts on intent — a hover or
    // focus on the poster — so this is usually done before the click lands.
    startFragPrefetch: !saveData,

    // Measure real throughput on the first fragment instead of trusting the
    // manifest's advertised peak.
    testBandwidth: true,

    // ---------------------------------------------------------------------
    // Adaptive bitrate selection
    // ---------------------------------------------------------------------

    // Shorter half-lives than the VOD defaults (3 / 9) so a bandwidth collapse
    // is reflected in the level choice within a segment or two rather than
    // after the buffer has already drained.
    abrEwmaFastVoD: 2.0,
    abrEwmaSlowVoD: 8.0,

    // Judge renditions by their measured bitrate rather than the BANDWIDTH
    // attribute. A ladder packaged by hand can advertise peak bandwidth well
    // above its own average (the NPC ladder this was tuned on ran 40% over),
    // which makes the default selector systematically under-pick and leave
    // quality on the table.
    abrMaxWithRealBitrate: true,

    // Headroom factors. `UpFactor` is the important one: requiring a healthy
    // margin before stepping up is what stops the up/starve/down oscillation
    // that users experience as intermittent buffering on a "fast enough"
    // connection.
    abrBandWidthFactor: 0.9,
    abrBandWidthUpFactor: 0.65,

    // Abandon an in-flight fragment and drop a rung once it is clear the
    // current request cannot land before the buffer runs dry.
    maxStarvationDelay: 4,
    maxLoadingDelay: 4,

    minAutoBitrate: MIN_AUTO_BITRATE,

    // Resolution capping is handled by the engine's own rule rather than
    // hls.js' built-in one. The built-in caps at the highest rendition that
    // fits *inside* the player box, which on a 1024 px player on a 1x display
    // means 720p — a real quality loss on text-heavy frames. See
    // `applyLevelCap` in mseEngine.ts for the rule used instead, which never
    // caps below the display resolution.
    capLevelToPlayerSize: false,

    // ---------------------------------------------------------------------
    // Buffering
    // ---------------------------------------------------------------------
    maxBufferLength,
    maxMaxBufferLength,
    maxBufferSize,

    // Evict watched video. Unbounded back buffer is the usual cause of MSE
    // quota errors on long videos, and every eviction we are forced into
    // mid-playback risks a visible stall.
    backBufferLength: 30,

    // Hand-packaged ladders (MPEG-TS with variable segment durations, in the
    // NPC case) leave sub-frame gaps at some boundaries. A tolerant hole
    // threshold makes the player step over them instead of waiting for data
    // that never arrives. Harmless on the CMAF ladder scripts/video emits.
    maxBufferHole: 0.5,

    // Notice a stalled buffer sooner, and try harder to nudge out of it before
    // giving up and surfacing an error.
    highBufferWatchdogPeriod: 2,
    nudgeOffset: 0.1,
    nudgeMaxRetry: 8,
    appendErrorMaxRetry: 5,

    // ---------------------------------------------------------------------
    // Network resilience
    // ---------------------------------------------------------------------
    // Generous ceilings with exponential backoff. The default policy gives up
    // quickly enough that a single slow segment on a congested mobile link is
    // escalated to a fatal error, which is precisely the case we must survive.
    fragLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: 20_000,
        maxLoadTimeMs: 180_000,
        timeoutRetry: {
          maxNumRetry: 4,
          retryDelayMs: 0,
          maxRetryDelayMs: 0,
        },
        errorRetry: {
          maxNumRetry: 8,
          retryDelayMs: 500,
          maxRetryDelayMs: 8_000,
          backoff: "exponential",
        },
      },
    },

    playlistLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: 12_000,
        maxLoadTimeMs: 25_000,
        timeoutRetry: {
          maxNumRetry: 3,
          retryDelayMs: 0,
          maxRetryDelayMs: 0,
        },
        errorRetry: {
          maxNumRetry: 5,
          retryDelayMs: 500,
          maxRetryDelayMs: 6_000,
          backoff: "exponential",
        },
      },
    },

    manifestLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: 12_000,
        maxLoadTimeMs: 25_000,
        timeoutRetry: {
          maxNumRetry: 3,
          retryDelayMs: 0,
          maxRetryDelayMs: 0,
        },
        errorRetry: {
          maxNumRetry: 6,
          retryDelayMs: 500,
          maxRetryDelayMs: 8_000,
          backoff: "exponential",
        },
      },
    },

    // ---------------------------------------------------------------------
    // Platform
    // ---------------------------------------------------------------------
    // iOS 17.1+ exposes ManagedMediaSource, which lets the tuned ladder above
    // run on iPhone instead of handing playback to the untunable native player.
    preferManagedMediaSource: true,
  };
}
