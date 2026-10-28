import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isComplete,
  readAllProgress,
  readProgress,
  resumePosition,
  watchedFraction,
  writeProgress,
} from "./progress";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const NOW = Date.UTC(2026, 9, 28);
const DAY = 24 * 60 * 60 * 1000;

test("a written position reads back, clamped to the running time", () => {
  const storage = memoryStorage();
  writeProgress("a", 42.5, 120, storage, NOW);
  writeProgress("b", 999, 120, storage, NOW);
  writeProgress("c", -5, 120, storage, NOW);
  assert.deepEqual(readProgress("a", storage, NOW), { position: 42.5, duration: 120, updatedAt: NOW });
  assert.equal(readProgress("b", storage, NOW)?.position, 120);
  assert.equal(readProgress("c", storage, NOW)?.position, 0);
  assert.deepEqual(Object.keys(readAllProgress(storage, NOW)).sort(), ["a", "b", "c"]);
});

test("nothing is written for a duration the player does not know yet", () => {
  const storage = memoryStorage();
  writeProgress("a", 10, Number.NaN, storage, NOW);
  writeProgress("b", 10, 0, storage, NOW);
  writeProgress("c", Number.POSITIVE_INFINITY, 120, storage, NOW);
  assert.equal(storage.data.size, 0);
});

test("stale, malformed and foreign entries are ignored rather than trusted", () => {
  const storage = memoryStorage({
    "aurixa.briefings.progress.v1": JSON.stringify({
      old: { position: 30, duration: 120, updatedAt: NOW - 91 * DAY },
      fresh: { position: 30, duration: 120, updatedAt: NOW - 89 * DAY },
      broken: { position: "30", duration: 120, updatedAt: NOW },
      zero: { position: 0, duration: 0, updatedAt: NOW },
      nil: null,
    }),
  });
  assert.deepEqual(Object.keys(readAllProgress(storage, NOW)), ["fresh"]);
  assert.deepEqual(readAllProgress(memoryStorage({ "aurixa.briefings.progress.v1": "{not json" }), NOW), {});
});

test("a browser that refuses storage reads as empty and writes nothing", () => {
  const hostile = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(readProgress("a", hostile, NOW), null);
  assert.doesNotThrow(() => writeProgress("a", 10, 100, hostile, NOW));
  assert.equal(readProgress("a", null, NOW), null);
});

test("resume is offered only between the opening seconds and the closing credits", () => {
  const at = (position: number, duration = 240) => ({ position, duration, updatedAt: NOW });
  assert.equal(resumePosition(null), null);
  assert.equal(resumePosition(at(4)), null);
  assert.equal(resumePosition(at(84.7)), 84);
  assert.equal(resumePosition(at(233)), null, "inside the closing seconds counts as watched");
  assert.equal(isComplete(at(233)), true);
  assert.equal(isComplete(at(200)), false);
  assert.equal(isComplete(at(96, 100)), true, "95% of a short video counts as watched");
});

test("the watched fraction fills the card's bar, and completes at the tail", () => {
  const at = (position: number) => ({ position, duration: 200, updatedAt: NOW });
  assert.equal(watchedFraction(null), 0);
  assert.equal(watchedFraction(at(50)), 0.25);
  assert.equal(watchedFraction(at(195)), 1);
});
