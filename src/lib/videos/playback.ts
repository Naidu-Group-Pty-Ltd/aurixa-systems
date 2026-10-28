import { useSyncExternalStore } from "react";
import type { PlaybackQualityReport } from "../streaming/telemetry";

/**
 * Playback state shared between the player and everything around it — the
 * theatre's HUD, the chapter list, the end card.
 *
 * An external store rather than page state because `timeupdate` fires four
 * times a second. Held in React state at the page, that would re-render the
 * whole Briefing Room, library grid included, for every tick; here only the
 * components that select the value that changed re-render.
 */

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type PlaybackSnapshot = {
  status: PlaybackStatus;
  /** Seconds from the start. */
  position: number;
  /** Seconds; 0 until metadata has loaded. */
  duration: number;
  /** Height of the rendition on screen, when the engine reports one. */
  height: number | null;
  engine: PlaybackQualityReport["engine"];
};

/** What the page may ask of the player. Registered by the player on mount. */
export type PlaybackController = {
  /** Start, or resume, playback — from `at` seconds when given. */
  play: (at?: number) => void;
};

export type PlaybackStore = {
  get: () => PlaybackSnapshot;
  set: (patch: Partial<PlaybackSnapshot>) => void;
  subscribe: (listener: () => void) => () => void;
  attach: (controller: PlaybackController) => () => void;
  controller: () => PlaybackController | null;
};

const INITIAL: PlaybackSnapshot = {
  status: "idle",
  position: 0,
  duration: 0,
  height: null,
  engine: null,
};

export function createPlaybackStore(): PlaybackStore {
  let state = INITIAL;
  let current: PlaybackController | null = null;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(patch) {
      let changed = false;
      for (const key of Object.keys(patch) as (keyof PlaybackSnapshot)[]) {
        if (patch[key] !== state[key]) changed = true;
      }
      if (!changed) return;
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach(controller) {
      current = controller;
      return () => {
        if (current === controller) current = null;
      };
    },
    controller: () => current,
  };
}

/**
 * Subscribe to one derived value. The selector must return a primitive (or a
 * stable reference): it is compared by identity on every store update.
 */
export function usePlayback<T>(store: PlaybackStore, select: (snapshot: PlaybackSnapshot) => T): T {
  const read = () => select(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}
