/**
 * Accessible ranked selection for BRQ-10 (Appendix B, question 10).
 *
 * Ranking is performed entirely with buttons — Add, Move up, Move down and
 * Remove — so it is completable with the keyboard alone and with a screen
 * reader. There is deliberately no drag-and-drop: it would be an inaccessible
 * primary interaction and the operating model forbids it as the only method.
 *
 * Every change is announced through a polite live region, including the item's
 * new position, so a screen-reader user always knows the resulting order.
 */

import { ReactNode, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Option, RANKED_CAPABILITY_COUNT, labelFor } from "../../lib/readinessQuestionnaire";

type RankedCapabilitySelectorProps = {
  /** Stable question identifier. */
  name: string;
  /** All capabilities, already ordered so the most likely appear first. */
  options: Option[];
  /** Selected values in rank order, position 1 first. */
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
};

export function RankedCapabilitySelector({
  name,
  options,
  value,
  onChange,
  invalid,
}: RankedCapabilitySelectorProps) {
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  const remaining = RANKED_CAPABILITY_COUNT - value.length;
  const isFull = remaining <= 0;
  const available = options.filter((option) => !value.includes(option.value));

  /** Keeps keyboard focus on the control the applicant just used. */
  const refocus = (buttonName: string) => {
    window.requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLButtonElement>(`[data-control="${buttonName}"]`);
      next?.focus();
    });
  };

  const add = (optionValue: string) => {
    if (isFull || value.includes(optionValue)) return;
    const next = [...value, optionValue];
    onChange(next);
    setAnnouncement(
      `${labelFor(options, optionValue)} added at position ${next.length} of ${RANKED_CAPABILITY_COUNT}. ${
        RANKED_CAPABILITY_COUNT - next.length
      } remaining.`,
    );
  };

  const remove = (optionValue: string) => {
    const next = value.filter((item) => item !== optionValue);
    onChange(next);
    setAnnouncement(
      `${labelFor(options, optionValue)} removed. ${next.length} of ${RANKED_CAPABILITY_COUNT} selected.`,
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setAnnouncement(
      `${labelFor(options, next[target])} moved to position ${target + 1} of ${next.length}.`,
    );
    refocus(`${direction === -1 ? "up" : "down"}-${next[target]}`);
  };

  return (
    <div className="space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#C89B3C]">
          {value.length}/{RANKED_CAPABILITY_COUNT} ranked
        </span>
        <span className="text-[12px] font-light text-[#9CA3B8]">
          {RANKED_CAPABILITY_COUNT} capabilities required
          {remaining > 0 ? `, ${remaining} still to add` : ", ranking complete"}
        </span>
      </div>

      {/* Ranked list */}
      <div
        className={`border ${invalid ? "border-red-400/50" : "border-white/15"} bg-[#040B16]/60`}
      >
        <p className="border-b border-white/10 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[#9CA3B8]">
          Your ranked capabilities
        </p>
        {value.length === 0 ? (
          <p className="px-4 py-5 text-[13px] font-light text-[#9CA3B8]">
            No capabilities ranked yet. Use “Add” below to build your top five, then reorder them.
          </p>
        ) : (
          <ol ref={listRef} className="divide-y divide-white/10">
            {value.map((optionValue, index) => {
              const label = labelFor(options, optionValue);
              return (
                <li
                  key={optionValue}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#C89B3C]/50 font-mono text-[12px] text-[#C89B3C]"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-light text-white">
                    <span className="sr-only">{`Rank ${index + 1} of ${value.length}: `}</span>
                    {label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <RankButton
                      control={`up-${optionValue}`}
                      label={`Move ${label} up to position ${index}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </RankButton>
                    <RankButton
                      control={`down-${optionValue}`}
                      label={`Move ${label} down to position ${index + 2}`}
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </RankButton>
                    <RankButton
                      control={`remove-${optionValue}`}
                      label={`Remove ${label} from your ranked capabilities`}
                      onClick={() => remove(optionValue)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </RankButton>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Available capabilities */}
      <div>
        <p
          id={`${name}-available`}
          className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#9CA3B8]"
        >
          Available capabilities
        </p>
        <ul aria-labelledby={`${name}-available`} className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {available.map((option) => (
            <li key={option.value} className="flex">
              <button
                type="button"
                onClick={() => add(option.value)}
                disabled={isFull}
                aria-label={`Add ${option.label} to your ranked capabilities`}
                className={`flex min-h-[48px] w-full items-center justify-between gap-3 border px-3 py-2.5 text-left text-[13px] font-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${
                  isFull
                    ? "cursor-not-allowed border-white/10 text-[#6B7689]"
                    : "border-white/15 text-[#B6C0D4] hover:border-[#00A8B5]/50 hover:text-white"
                }`}
              >
                <span>{option.label}</span>
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {isFull && (
          <p className="mt-2 text-[12px] font-light text-[#9CA3B8]">
            You have ranked {RANKED_CAPABILITY_COUNT} capabilities. Remove one to add a different
            capability.
          </p>
        )}
      </div>
    </div>
  );
}

function RankButton({
  control,
  label,
  disabled,
  onClick,
  children,
}: {
  control: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-control={control}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${
        disabled
          ? "cursor-not-allowed border-white/5 text-[#4B5565]"
          : "border-white/15 text-[#B6C0D4] hover:border-[#00A8B5]/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
