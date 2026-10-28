import { formatDuration, type BriefingChapter } from "../../lib/videos/catalog";
import { usePlayback, type PlaybackStore } from "../../lib/videos/playback";

type BriefingChaptersProps = {
  chapters: BriefingChapter[];
  duration: number;
  store: PlaybackStore;
};

/**
 * The running order. Each chapter starts the player from its mark — before
 * the first play as well as during, so a viewer can go straight to the part
 * they came for. The chapter in progress is marked, and fills as it plays.
 */
export function BriefingChapters({ chapters, duration, store }: BriefingChaptersProps) {
  const second = usePlayback(store, (s) => Math.floor(s.position));
  const started = usePlayback(store, (s) => s.status !== "idle");

  const activeIndex = started
    ? chapters.reduce((found, chapter, index) => (chapter.at <= second ? index : found), 0)
    : -1;

  return (
    <ol className="watch-chapters">
      {chapters.map((chapter, index) => {
        const end = chapters[index + 1]?.at ?? duration;
        const active = index === activeIndex;
        const fill = active && end > chapter.at ? Math.min(1, (second - chapter.at) / (end - chapter.at)) : 0;
        return (
          <li key={chapter.at}>
            <button
              type="button"
              className={`watch-chapter${active ? " is-active" : ""}`}
              aria-current={active ? "step" : undefined}
              onClick={() => {
                store.controller()?.play(chapter.at);
                document.querySelector(".watch-theatre")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <span className="watch-chapter__time watch-mono">{formatDuration(chapter.at)}</span>
              <span className="watch-chapter__label">{chapter.label}</span>
              <span className="watch-chapter__fill" aria-hidden="true" style={{ transform: `scaleX(${fill})` }} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
