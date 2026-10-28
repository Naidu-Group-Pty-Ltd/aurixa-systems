/**
 * Where each viewer got to in each briefing, so the library can show what has
 * been watched and the theatre can offer to resume.
 *
 * Kept in `localStorage` on the viewer's own device and nowhere else: it is a
 * convenience, not a record, and nothing here is sent anywhere. Every access is
 * guarded because private windows and hardened browsers throw on storage, and
 * the page must behave identically without it. The storage object is a
 * parameter so the rules can be tested without a browser.
 */

const STORAGE_KEY = "aurixa.briefings.progress.v1";

/** An entry older than this is forgotten: the viewer has moved on. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Below this, there is nothing worth resuming. */
const RESUME_MIN_SECONDS = 10;

/** Within this many seconds of the end, the briefing counts as watched. */
const COMPLETE_TAIL_SECONDS = 8;

/** Beyond this share of the running time, the briefing counts as watched. */
const COMPLETE_FRACTION = 0.95;

export type BriefingProgress = {
  /** Seconds from the start. */
  position: number;
  /** Running time when recorded, in seconds. */
  duration: number;
  /** Epoch milliseconds. */
  updatedAt: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readAll(storage: StorageLike | null, now: number): Record<string, BriefingProgress> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fresh: Record<string, BriefingProgress> = {};
    for (const [slug, value] of Object.entries(parsed ?? {})) {
      const entry = value as Partial<BriefingProgress> | null;
      if (
        typeof entry?.position === "number" &&
        typeof entry.duration === "number" &&
        typeof entry.updatedAt === "number" &&
        Number.isFinite(entry.position) &&
        Number.isFinite(entry.duration) &&
        entry.duration > 0 &&
        now - entry.updatedAt <= RETENTION_MS
      ) {
        fresh[slug] = { position: entry.position, duration: entry.duration, updatedAt: entry.updatedAt };
      }
    }
    return fresh;
  } catch {
    return {};
  }
}

export function readProgress(
  slug: string,
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): BriefingProgress | null {
  return readAll(storage, now)[slug] ?? null;
}

export function readAllProgress(
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): Record<string, BriefingProgress> {
  return readAll(storage, now);
}

export function writeProgress(
  slug: string,
  position: number,
  duration: number,
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): void {
  if (!storage || !Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
  try {
    const all = readAll(storage, now);
    all[slug] = {
      position: Math.min(Math.max(0, position), duration),
      duration,
      updatedAt: now,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Quota or a locked-down browser. Losing a resume point is harmless.
  }
}

export function isComplete(progress: BriefingProgress | null): boolean {
  if (!progress) return false;
  return (
    progress.position >= progress.duration - COMPLETE_TAIL_SECONDS ||
    progress.position / progress.duration >= COMPLETE_FRACTION
  );
}

/** Where to offer to resume from, or `null` when starting over is the better default. */
export function resumePosition(progress: BriefingProgress | null): number | null {
  if (!progress || isComplete(progress)) return null;
  return progress.position >= RESUME_MIN_SECONDS ? Math.floor(progress.position) : null;
}

/** 0–1, for the progress bar under a library card. */
export function watchedFraction(progress: BriefingProgress | null): number {
  if (!progress) return 0;
  if (isComplete(progress)) return 1;
  return Math.min(1, Math.max(0, progress.position / progress.duration));
}
