/**
 * Stage 1 → Stage 2 handoff dialog.
 *
 * Shown only after BOTH the Make.com submission has been accepted and the
 * short-lived Stage 2 session has been created. It has exactly one action —
 * PROCEED — and cannot be dismissed by backdrop click, Escape or a close
 * control: the applicant's next step is the questionnaire.
 *
 * The copy confirms receipt and progression only. It does not say the applicant
 * has been approved, accepted, qualified or allocated anything.
 */

import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const STAGE_ONE_MODAL_COPY = {
  eyebrow: "STAGE 01 COMPLETE",
  heading: "Free Trial Application Received",
  message:
    "Your free trial application has been successfully recorded. You may now proceed to the Business Readiness Questionnaire, where we will gather the operational, technical and implementation context required to identify the most relevant Aurixa pathway for your organisation.",
  supporting: "The next stage takes approximately 6–8 minutes to complete.",
  action: "PROCEED",
  referenceLabel: "YOUR APPLICATION REFERENCE",
  referenceHint:
    "Keep this. If your secure questionnaire link expires, this reference and your work email will reopen the questionnaire.",
} as const;

export function StageOneCompleteModal({
  onProceed,
  applicationId = "",
}: {
  onProceed: () => void;
  /** Shown so the applicant keeps the reference the expiry fallback needs. */
  applicationId?: string;
}) {
  const proceedRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    proceedRef.current?.focus();

    // Background must not scroll while the dialog is open.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    /**
     * Escape must not dismiss, and Tab must not reach the page behind. With a
     * single interactive control the focus trap is simply: keep focus here.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        proceedRef.current?.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) proceedRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#020509]/90 px-4 py-8 backdrop-blur-sm sm:px-6"
      // Backdrop clicks are inert by design: PROCEED is the only action.
      onMouseDown={(event) => event.preventDefault()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-one-complete-heading"
        aria-describedby="stage-one-complete-message"
        className="motion-safe:animate-[stage-one-modal-in_260ms_ease-out] relative w-full max-w-[560px] rounded-sm border border-[#00A8B5]/40 bg-[#0B162C] px-6 py-7 shadow-[0_28px_70px_-20px_rgba(0,0,0,0.95)] sm:px-9 sm:py-9"
      >
        {/* Restrained gold completion accent. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent"
        />

        <div className="flex items-center gap-2.5">
          <CheckCircle2
            className="h-4 w-4 shrink-0"
            style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.75 }}
            aria-hidden="true"
          />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C89B3C]">
            {STAGE_ONE_MODAL_COPY.eyebrow}
          </p>
        </div>

        <h2
          id="stage-one-complete-heading"
          className="mt-4 font-display text-[22px] font-light leading-snug text-white sm:text-[26px]"
        >
          {STAGE_ONE_MODAL_COPY.heading}
        </h2>

        {applicationId && (
          <div className="mt-5 border border-[#C89B3C]/35 bg-[#C89B3C]/[0.07] px-4 py-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3B8]">
              {STAGE_ONE_MODAL_COPY.referenceLabel}
            </p>
            <p className="mt-1.5 select-all font-mono text-[17px] tracking-[0.06em] text-[#F5D17A]">
              {applicationId}
            </p>
            <p className="mt-2 text-[12px] font-light leading-relaxed text-[#9CA3B8]">
              {STAGE_ONE_MODAL_COPY.referenceHint}
            </p>
          </div>
        )}

        <p
          id="stage-one-complete-message"
          className="mt-4 text-[14px] font-light leading-relaxed text-[#B6C0D4]"
        >
          {STAGE_ONE_MODAL_COPY.message}
        </p>

        <p className="mt-4 border-l-2 border-[#00A8B5]/40 pl-4 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
          {STAGE_ONE_MODAL_COPY.supporting}
        </p>

        <button
          ref={proceedRef}
          type="button"
          onClick={onProceed}
          className="btn-chrome-prismatic group relative mt-7 flex min-h-[56px] w-full items-center justify-center gap-3 overflow-hidden rounded-sm border-none px-6 text-[12px] font-black uppercase tracking-[0.22em] text-white transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C]"
        >
          <span className="relative z-10 drop-shadow-md">{STAGE_ONE_MODAL_COPY.action}</span>
          <ArrowRight
            className="relative z-10 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
            style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
