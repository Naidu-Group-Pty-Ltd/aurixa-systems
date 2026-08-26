/**
 * Four-section progress indicator (sections 6.1 and 14.4).
 *
 * State is never carried by colour alone: each step shows its number, a tick
 * for completed sections, an explicit "Current"/"Completed" label in text and
 * a thicker rule under the active step. The current step is exposed with
 * `aria-current="step"`, and section changes are announced through a polite
 * live region.
 */

import { Check } from "lucide-react";
import { QuestionnaireSection } from "../../lib/readinessQuestionnaire";

type QuestionnaireProgressProps = {
  sections: QuestionnaireSection[];
  /** Zero-based index of the section on screen. */
  currentIndex: number;
  /** Sections the applicant has completed and moved past. */
  completedIndexes: number[];
  /** True once the applicant reaches the review step. */
  reviewing?: boolean;
  /** Jump to a section. Only offered for sections already reached. */
  onNavigate: (index: number) => void;
};

export function QuestionnaireProgress({
  sections,
  currentIndex,
  completedIndexes,
  reviewing,
  onNavigate,
}: QuestionnaireProgressProps) {
  const completed = new Set(completedIndexes);
  const status = reviewing
    ? "Review: all four sections complete"
    : `Section ${currentIndex + 1} of ${sections.length}: ${sections[currentIndex].title}`;

  return (
    <nav aria-label="Questionnaire progress" className="space-y-3">
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C89B3C]">
          {reviewing ? "REVIEW" : `SECTION ${currentIndex + 1} OF ${sections.length}`}
        </p>
        <p className="text-[13px] font-light text-[#B6C0D4]">
          {reviewing ? "Review your readiness profile" : sections[currentIndex].title}
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map((section, index) => {
          const isCurrent = !reviewing && index === currentIndex;
          const isComplete = completed.has(index);
          const reachable = isComplete || index <= currentIndex || reviewing;

          const state = isCurrent ? "Current" : isComplete ? "Completed" : "Not started";

          return (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => onNavigate(index)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex w-full min-h-[62px] flex-col gap-1 border-t-2 px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${
                  isCurrent
                    ? "border-t-[#C89B3C] bg-white/[0.04]"
                    : isComplete
                      ? "border-t-[#00A8B5] hover:bg-white/[0.03]"
                      : "border-t-white/15"
                } ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <span className="flex items-center gap-1.5">
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#00A8B5]" aria-hidden="true" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`font-mono text-[12px] ${isCurrent ? "text-[#C89B3C]" : "text-[#6B7689]"}`}
                    >
                      0{index + 1}
                    </span>
                  )}
                  <span
                    className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
                      isCurrent ? "text-[#C89B3C]" : isComplete ? "text-[#00A8B5]" : "text-[#6B7689]"
                    }`}
                  >
                    {state}
                  </span>
                </span>
                <span
                  className={`text-[13px] font-light leading-snug ${
                    isCurrent || isComplete ? "text-white" : "text-[#8B95A8]"
                  }`}
                >
                  <span className="sr-only">{`Section ${index + 1} of ${sections.length}: `}</span>
                  {section.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
