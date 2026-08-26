/**
 * Stage 2 — Business Readiness Questionnaire (`/questionnaire`).
 *
 * Unlisted by design: the route exists but is not linked from any navigation,
 * footer, sitemap or public page, carries a page-scoped `noindex, nofollow`
 * robots directive, and is reached only through the secure, time-bound link
 * issued with a Priority Access Application.
 *
 * The page never computes, requests or displays a qualification score, priority
 * class or tier recommendation — those are Stage 3 outputs held server-side
 * (section 7). Nothing here tells the applicant whether they qualify.
 */

import { ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";
import {
  Dropdown,
  Field,
  controlClass,
  describedBy,
  errorClass,
  helperClass,
  labelClass,
} from "../components/FormControls";
import {
  ConditionalBlock,
  QuestionFieldset,
  questionLabelClass,
} from "../components/questionnaire/QuestionFieldset";
import { QuestionnaireProgress } from "../components/questionnaire/QuestionnaireProgress";
import { MultiSelectGroup } from "../components/questionnaire/MultiSelectGroup";
import { SingleSelectGroup } from "../components/questionnaire/SingleSelectGroup";
import { RankedCapabilitySelector } from "../components/questionnaire/RankedCapabilitySelector";
import {
  ADMIN_TIME_OPTIONS,
  API_AVAILABILITY_OPTIONS,
  AUTHORITY_OPTIONS,
  AnswerMap,
  AnswerValue,
  ENTITY_STRUCTURE_OPTIONS,
  INFORMATION_MANAGEMENT_OPTIONS,
  INTEGRATIONS_EXCLUSIVE_VALUES,
  INTEGRATION_OPTIONS,
  INVESTMENT_RANGE_OPTIONS,
  LIMITS,
  MAX_PROBLEMS,
  MIGRATION_OPTIONS,
  MIGRATION_TIMING_OPTIONS,
  NEXT_STEP_OPTIONS,
  NOT_YET_KNOWN,
  PROBLEM_OPTIONS,
  Q,
  QuestionErrors,
  READINESS_COPY,
  READINESS_ROLE_OPTIONS,
  REGION_OPTIONS,
  SECTIONS,
  SECURITY_EXCLUSIVE_VALUES,
  SECURITY_OPTIONS,
  SYSTEMS_EXCLUSIVE_VALUES,
  SYSTEM_OPTIONS,
  TIMING_OPTIONS,
  USER_COUNT_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
  activeQuestionIds,
  asList,
  asText,
  buildCompletionPayload,
  buildReviewSections,
  buildStoredAnswers,
  isWithin90Days,
  needsEnterpriseReadiness,
  sectionIndexOf,
  suggestedCapabilityOrder,
  systemProductQuestionId,
  validateAll,
  validateSection,
} from "../lib/readinessQuestionnaire";
import {
  ReadinessAccessFailure,
  ReadinessSession,
  allowsOpenAccess,
  authoriseQuestionnaire,
  canAutosave,
  completeQuestionnaire,
  endHandoffSession,
  handoffSession,
  hasVerifiedPrefill,
  isPreviewAvailable,
  openAccessSession,
  resumeQuestionnaireByReference,
  saveQuestionnaireDraft,
} from "../lib/readinessQuestionnaireService";
import { readReadinessHandoff } from "../lib/readinessHandoff";
import {
  clearQuestionnaireLinkAccess,
  resolveQuestionnaireLink,
} from "../lib/questionnaireLinkAccess";
import { submitReadinessQuestionnaireWithMirrors } from "../lib/readinessSubmissionClient";
import { ResumeByReference } from "../components/questionnaire/ResumeByReference";
import { readReferenceFromUrl, type ResumeFailure } from "../lib/questionnaireResume";
import { ORGANISATION_TYPE_OPTIONS, VOLUME_OPTIONS, maskEmail } from "../lib/waitlist";
import { useRouteMetadata } from "../lib/pageMetadata";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const AUTOSAVE_RETRY_MS = 4000;

type Phase = "loading" | "blocked" | "form" | "completed";

type Completion = { applicationId: string; completedAt: string };

// ── Shared question context ─────────────────────────────────────────────────

type Ctx = {
  answers: AnswerMap;
  errors: QuestionErrors;
  set: (questionId: string, value: AnswerValue) => void;
  /** True when a verified token backs the session (prefill, autosave, resume). */
  authorised: boolean;
};

const optionLabel = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

/**
 * BRQ-01 is prefilled from the Priority Access Application and stays editable
 * (section 6.2). A saved draft always wins, and an unrecognised role is ignored
 * rather than written into the response as an invalid value.
 */
function seedPrefilledAnswers(session: ReadinessSession): AnswerMap {
  const answers: AnswerMap = { ...(session.answers ?? {}) };
  const role = session.prefill?.role;
  if (!answers[Q.role] && role && READINESS_ROLE_OPTIONS.some((option) => option.value === role)) {
    answers[Q.role] = role;
  }
  return answers;
}

export default function Questionnaire() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [blockedBy, setBlockedBy] = useState<ReadinessAccessFailure>("missing_token");
  const [session, setSession] = useState<ReadinessSession | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [errors, setErrors] = useState<QuestionErrors>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [responseVersion, setResponseVersion] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [linkedReference, setLinkedReference] = useState("");

  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);
  const tokenRef = useRef("");
  const savedSnapshotRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const linkAccessRef = useRef(false);
  /** Matches the Airtable "Stage 2 Access Method" options. */
  const accessModeRef = useRef("Secure link (token)");
  /**
   * The `token` the browser was shown, kept so it can travel with the
   * submission. Nothing here can verify it — see the note on
   * `resolveQuestionnaireLink` — so forwarding it is what gives the Make
   * scenario the option to.
   */
  const presentedTokenRef = useRef("");

  // ── Page metadata. Scoped to this page only; restored on unmount so no other
  // route's title, description or robots behaviour changes. The `noindex,
  // nofollow` directive comes from this route being `indexable: false` in the
  // registry — the same field that keeps it out of the sitemap. ─────────────
  useRouteMetadata("/questionnaire");

  // ── Secure access: exchange the opaque token for an authorised session, then
  // strip the raw token from the visible URL. ───────────────────────────────
  const startOpenAccess = useCallback(() => {
    accessModeRef.current = linkAccessRef.current ? "Secure link (token)" : "Manual entry";
    const open = openAccessSession();
    setSession(open);
    setAnswers({});
    setResponseVersion(open.responseVersion);
    savedSnapshotRef.current = "";
    setPhase("form");
  }, []);

  /**
   * Resolves access in priority order:
   *   1. A secure questionnaire token, when one was supplied in the link.
   *   2. The same-tab Stage 1 → Stage 2 handoff, which is how an
   *      applicant who just submitted Stage 1 continues in the same session.
   *   3. The explicit open-access escape hatch.
   * Anything else stays locked.
   */
  const authorise = useCallback(async (token: string) => {
    setPhase("loading");

    if (!token) {
      const prefill = readReadinessHandoff();
      if (prefill) {
        accessModeRef.current = "Same-session handoff";
        const session = handoffSession(prefill);
        setSession(session);
        setAnswers(seedPrefilledAnswers(session));
        setResponseVersion(session.responseVersion);
        savedSnapshotRef.current = "";
        setPhase("form");
        return;
      }

      if (allowsOpenAccess()) {
        startOpenAccess();
        return;
      }

      setBlockedBy("missing_token");
      setPhase("blocked");
      return;
    }

    const result = await authoriseQuestionnaire(token);

    if (!result.ok || !result.session) {
      // A completed questionnaire always blocks — that is duplicate-submission
      // protection, not access control.
      if (result.reason !== "already_completed" && allowsOpenAccess()) {
        startOpenAccess();
        return;
      }
      setBlockedBy(result.reason ?? "invalid_token");
      if (result.reason === "already_completed" && result.applicationId) {
        setCompletion({
          applicationId: result.applicationId,
          completedAt: result.completedAt ?? "",
        });
      }
      setPhase("blocked");
      return;
    }

    const authorised = result.session;
    if (authorised.status === "completed") {
      setBlockedBy("already_completed");
      setCompletion({
        applicationId: authorised.applicationId,
        completedAt: authorised.completedAt ?? "",
      });
      setPhase("blocked");
      return;
    }

    setSession(authorised);
    setAnswers(seedPrefilledAnswers(authorised));
    setResponseVersion(authorised.responseVersion);
    startedAtRef.current = authorised.startedAt;
    savedSnapshotRef.current = JSON.stringify(buildStoredAnswers(authorised.answers ?? {}));
    setPhase("form");
  }, []);

  /**
   * Fallback entry for an applicant whose secure link has expired. Returns the
   * failure reason for the form to show, or null once the questionnaire is open.
   */
  const resumeByReference = useCallback(
    async (details: { applicationId: string; workEmail: string }): Promise<ResumeFailure | null> => {
      const result = await resumeQuestionnaireByReference(details);

      if (!result.ok || !result.session) {
        if (result.reason === "already_completed" && result.applicationId) {
          setCompletion({ applicationId: result.applicationId, completedAt: result.completedAt ?? "" });
          setBlockedBy("already_completed");
        }
        return result.reason ?? "invalid_reference";
      }

      const resumed = result.session;
      if (resumed.status === "completed") {
        setBlockedBy("already_completed");
        setCompletion({ applicationId: resumed.applicationId, completedAt: resumed.completedAt ?? "" });
        return "already_completed";
      }

      accessModeRef.current = "Application ID fallback";
      setSession(resumed);
      setAnswers(seedPrefilledAnswers(resumed));
      setResponseVersion(resumed.responseVersion);
      startedAtRef.current = resumed.startedAt;
      savedSnapshotRef.current = JSON.stringify(buildStoredAnswers(resumed.answers ?? {}));
      setPhase("form");
      return null;
    },
    [],
  );

  useEffect(() => {
    const url = new URL(window.location.href);

    // `?ref=` comes from the Stage 1 email's "continue with your application ID"
    // link. It only prefills the resume form — the work email is still required
    // — so it is read before anything else and then dropped from the address bar.
    const reference = readReferenceFromUrl(url);
    if (url.searchParams.has("ref") || url.searchParams.has("reference")) {
      setLinkedReference(reference);
      url.searchParams.delete("ref");
      url.searchParams.delete("reference");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    // Captured before the parameters are stripped from the address bar below.
    presentedTokenRef.current = url.searchParams.get("token") ?? "";

    const linkAccess = resolveQuestionnaireLink(url);

    if (linkAccess === "link" || linkAccess === "session") {
      linkAccessRef.current = true;
      if (linkAccess === "link") {
        url.searchParams.delete("token");
        url.searchParams.delete("expires");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
      startOpenAccess();
      return;
    }

    if (linkAccess === "rejected") {
      setBlockedBy("invalid_token");
      setPhase("blocked");
      return;
    }

    let token = url.searchParams.get("t") ?? url.searchParams.get("token") ?? "";

    // Development-only preview. `import.meta.env.DEV` is statically false in a
    // production build, so this branch and the fixture behind it are removed.
    if (!token && isPreviewAvailable() && url.searchParams.get("preview") === "1") {
      token = "dev-preview";
    }

    if (url.searchParams.has("t") || url.searchParams.has("token")) {
      url.searchParams.delete("t");
      url.searchParams.delete("token");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    tokenRef.current = token;
    void authorise(token);
  }, [authorise, startOpenAccess]);

  // ── Autosave ───────────────────────────────────────────────────────────────
  const runSave = useCallback(
    async (draft: AnswerMap, retriesLeft: number) => {
      if (!session) return;
      const stored = buildStoredAnswers(draft);
      const snapshot = JSON.stringify(stored);
      if (snapshot === savedSnapshotRef.current) return;

      setSaveState("saving");
      const result = await saveQuestionnaireDraft({
        sessionToken: session.sessionToken,
        applicationId: session.applicationId,
        responseVersion,
        answers: stored,
      });

      if (result.ok && result.responseVersion !== undefined) {
        savedSnapshotRef.current = snapshot;
        setResponseVersion(result.responseVersion);
        setSaveState("saved");
        return;
      }

      setSaveState("failed");
      if (retriesLeft > 0) {
        saveTimerRef.current = setTimeout(() => void runSave(draft, retriesLeft - 1), AUTOSAVE_RETRY_MS);
      }
    },
    [session, responseVersion],
  );

  useEffect(() => {
    if (phase !== "form" || !canAutosave(session)) return;
    if (Object.keys(answers).length === 0) return;
    if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void runSave(answers, 2), AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, phase, session, runSave]);

  // ── Answer helpers ─────────────────────────────────────────────────────────
  const set = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }, []);

  const ctx: Ctx = { answers, errors, set, authorised: hasVerifiedPrefill(session) };

  const focusQuestion = (questionId: string) => {
    const element = document.getElementById(questionId);
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const focusFirstError = (fieldErrors: QuestionErrors) => {
    const order = activeQuestionIds(answers);
    const first = order.find((questionId) => fieldErrors[questionId]) ?? Object.keys(fieldErrors)[0];
    if (first) window.requestAnimationFrame(() => focusQuestion(first));
  };

  const goToSection = (index: number) => {
    setReviewing(false);
    setSectionIndex(index);
    setShowErrorSummary(false);
    window.requestAnimationFrame(() => {
      sectionHeadingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleContinue = () => {
    const sectionErrors = validateSection(sectionIndex, answers);
    setErrors(sectionErrors);

    if (Object.keys(sectionErrors).length > 0) {
      setShowErrorSummary(true);
      focusFirstError(sectionErrors);
      return;
    }

    setCompletedSections((current) =>
      current.includes(sectionIndex) ? current : [...current, sectionIndex],
    );

    if (sectionIndex < SECTIONS.length - 1) {
      goToSection(sectionIndex + 1);
      return;
    }

    setReviewing(true);
    setShowErrorSummary(false);
    window.requestAnimationFrame(() => {
      sectionHeadingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handlePrevious = () => {
    if (reviewing) {
      goToSection(SECTIONS.length - 1);
      return;
    }
    if (sectionIndex > 0) goToSection(sectionIndex - 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting || !session) return;
    setSubmissionError("");

    const allErrors = validateAll(answers);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstQuestion = activeQuestionIds(answers).find((questionId) => allErrors[questionId]);
      if (firstQuestion) {
        const target = sectionIndexOf(firstQuestion);
        goToSection(target);
        setShowErrorSummary(true);
        focusFirstError(allErrors);
      }
      return;
    }

    setIsSubmitting(true);

    // Flush any pending autosave so the frozen response matches the screen.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const payload = buildCompletionPayload(session.applicationId, answers, responseVersion);

    // Every access mode submits through the Stage 2 webhook: that is the
    // pipeline the response actually travels down (Airtable, the applicant's
    // confirmation, the Stage 3 invitation), and it is the same submission
    // whether the applicant arrived on a secure link, carried a session over
    // from Stage 1, or came back with their Application ID. The access mode
    // rides along so an expired-link recovery stays visible in operations
    // rather than looking like a normal submission.
    //
    // Once the webhook has landed, the same response is mirrored to Aurixa's
    // own store of record and the operator console. Those run after the fact
    // and can never change what the applicant is told.
    const result = await submitReadinessQuestionnaireWithMirrors({
      applicationId: payload.applicationId,
      answers,
      responseVersion: payload.responseVersion,
      prefill: session.prefill,
      accessMode: accessModeRef.current,
      accessTokenPresented: presentedTokenRef.current,
    });

    setIsSubmitting(false);

    if (!result.ok || !result.completedAt) {
      if (result.reason === "already_completed") {
        setBlockedBy("already_completed");
        setPhase("blocked");
        return;
      }
      setSubmissionError(READINESS_COPY.submissionError);
      return;
    }

    if (session.access === "handoff") endHandoffSession();
    if (linkAccessRef.current) clearQuestionnaireLinkAccess();

    setCompletion({
      applicationId: result.applicationId ?? session.applicationId,
      completedAt: result.completedAt,
    });
    setPhase("completed");
  };

  useEffect(() => {
    if (phase === "completed") {
      window.requestAnimationFrame(() => {
        completionHeadingRef.current?.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [phase]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <QuestionnaireShell>
        <AccessPanel
          icon={<Lock className="h-5 w-5" aria-hidden="true" />}
          heading={READINESS_COPY.access.loadingHeading}
          body={READINESS_COPY.access.loadingBody}
          live
        />
      </QuestionnaireShell>
    );
  }

  if (phase === "blocked") {
    return (
      <QuestionnaireShell>
        <BlockedState
          reason={blockedBy}
          completion={completion}
          onRetry={() => void authorise(tokenRef.current)}
          onResume={resumeByReference}
          linkedReference={linkedReference}
        />
      </QuestionnaireShell>
    );
  }

  if (phase === "completed" && completion) {
    return (
      <QuestionnaireShell>
        <CompletionState completion={completion} headingRef={completionHeadingRef} />
      </QuestionnaireShell>
    );
  }

  if (!session) return null;

  const section = SECTIONS[sectionIndex];
  const verifiedPrefill = hasVerifiedPrefill(session);
  const autosaves = canAutosave(session);
  const activeErrors = Object.keys(errors).filter((questionId) => errors[questionId]);

  return (
    <QuestionnaireShell>
      <QuestionnaireHeader authorised={autosaves} />

      {verifiedPrefill && <ApplicationSummary session={session} />}

      <div className="mt-8">
        <QuestionnaireProgress
          sections={SECTIONS}
          currentIndex={sectionIndex}
          completedIndexes={completedSections}
          reviewing={reviewing}
          onNavigate={goToSection}
        />
      </div>

      <div className="relative z-10 mt-6 border border-white/10 bg-[#0B162C]/95 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        {reviewing ? (
          <ReviewScreen
            answers={answers}
            headingRef={sectionHeadingRef}
            onEdit={goToSection}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
            onPrevious={handlePrevious}
          />
        ) : (
          <>
            <div className="border-b border-white/10 pb-5">
              <h2
                ref={sectionHeadingRef}
                tabIndex={-1}
                className="text-2xl font-display font-light text-white outline-none sm:text-[28px]"
              >
                {section.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] font-light leading-relaxed text-[#B6C0D4]">
                {section.description}
              </p>
              <p className="mt-2 text-[12px] font-light text-[#9CA3B8]">{READINESS_COPY.requiredNote}</p>
            </div>

            {showErrorSummary && activeErrors.length > 0 && (
              <ErrorSummary questionIds={activeErrors} errors={errors} onSelect={focusQuestion} />
            )}

            <div className="mt-7 space-y-9">
              {sectionIndex === 0 && <SectionOrganisation ctx={ctx} />}
              {sectionIndex === 1 && <SectionSystems ctx={ctx} />}
              {sectionIndex === 2 && <SectionCapabilities ctx={ctx} session={session} />}
              {sectionIndex === 3 && <SectionReadiness ctx={ctx} />}
            </div>

            <div className="mt-9 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <SaveStatus state={saveState} authorised={autosaves} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={sectionIndex === 0}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border border-white/20 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-[#B6C0D4] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="group relative inline-flex min-h-[52px] w-full items-center justify-center gap-3 overflow-hidden rounded-sm border-none px-7 text-[12px] font-black uppercase tracking-[0.18em] text-white btn-chrome-prismatic transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C] sm:w-auto"
                >
                  <span className="relative z-10 drop-shadow-md">
                    {sectionIndex === SECTIONS.length - 1 ? "Review answers" : "Continue"}
                  </span>
                  <ArrowRight
                    className="relative z-10 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                    style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-[12px] font-light leading-relaxed text-[#9CA3B8]">
        {READINESS_COPY.confidentiality}
      </p>
    </QuestionnaireShell>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────

/**
 * Centred questionnaire workspace beneath the existing fixed Navbar. The hero
 * background is clipped by its own wrapper rather than the page, so dropdown
 * menus near the bottom of a section are never cut off.
 */
function QuestionnaireShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full min-h-dvh bg-[#040B16] pt-32 pb-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <HeroBackground variant="about" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </div>
    </div>
  );
}

function QuestionnaireHeader({ authorised }: { authorised: boolean }) {
  return (
    <header className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-[#00A8B5]/60" aria-hidden="true" />
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#00A8B5]">
          {READINESS_COPY.eyebrow}
        </p>
      </div>

      <h1 className="text-3xl font-display font-light leading-[1.1] tracking-[-0.01em] text-white sm:text-4xl lg:text-[2.75rem]">
        {READINESS_COPY.heading}
      </h1>

      <p className="max-w-3xl text-[15px] font-light leading-relaxed text-[#B6C0D4]">
        {READINESS_COPY.supporting}
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-light text-[#9CA3B8]">
        <span className="font-mono uppercase tracking-[0.14em] text-[#C89B3C]">
          {READINESS_COPY.timeEstimate}
        </span>
        <span>{authorised ? READINESS_COPY.saveMessage : READINESS_COPY.saveMessageLocal}</span>
      </div>

      <p className="border-l-2 border-[#C89B3C]/40 pl-4 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
        {READINESS_COPY.confidentiality}
      </p>
    </header>
  );
}

/** Verified Stage 1 details. Read-only — corrections go through Aurixa. */
function ApplicationSummary({ session }: { session: ReadinessSession }) {
  const { prefill } = session;
  const rows: { label: string; value: string }[] = [
    { label: "Applicant", value: `${prefill.firstName} ${prefill.lastName}`.trim() },
    { label: "Organisation", value: prefill.organisationName },
    { label: "Work email", value: maskEmail(prefill.workEmail) },
    { label: "Organisation type", value: optionLabel(ORGANISATION_TYPE_OPTIONS, prefill.organisationType) },
    { label: "Approximate annual volume", value: optionLabel(VOLUME_OPTIONS, prefill.annualVolume) },
    { label: "Application reference", value: prefill.applicationId },
  ];

  return (
    <section aria-labelledby="application-details" className="mt-8 border border-white/10 bg-[#0B162C]/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck
            className="h-4 w-4 shrink-0"
            style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
            aria-hidden="true"
          />
          <h2 id="application-details" className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
            {READINESS_COPY.applicationSummaryHeading}
          </h2>
        </div>
        <p className="text-[12px] font-light text-[#9CA3B8]">{READINESS_COPY.applicationSummaryIntro}</p>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-white/5 px-4 py-3 sm:px-6">
            <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#9CA3B8]">{row.label}</dt>
            <dd className="mt-1 break-words text-[14px] font-light text-white">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>

      <p className="px-4 py-3 text-[12px] font-light leading-relaxed text-[#9CA3B8] sm:px-6">
        {READINESS_COPY.applicationSummaryCorrection}
      </p>
    </section>
  );
}

function SaveStatus({
  state,
  authorised,
}: {
  state: "idle" | "saving" | "saved" | "failed";
  authorised: boolean;
}) {
  if (!authorised) {
    return (
      <p className="flex items-center gap-2 text-[12px] font-light text-[#9CA3B8]">
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C89B3C]" />
        {READINESS_COPY.save.local}
      </p>
    );
  }

  const text =
    state === "saving"
      ? READINESS_COPY.save.saving
      : state === "saved"
        ? READINESS_COPY.save.saved
        : state === "failed"
          ? READINESS_COPY.save.failed
          : READINESS_COPY.save.idle;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-[12px] font-light ${
        state === "failed" ? "text-red-300" : "text-[#9CA3B8]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          state === "failed" ? "bg-red-400" : state === "saved" ? "bg-[#00A8B5]" : "bg-[#C89B3C]"
        }`}
      />
      {text}
    </p>
  );
}

function ErrorSummary({
  questionIds,
  errors,
  onSelect,
}: {
  questionIds: string[];
  errors: QuestionErrors;
  onSelect: (questionId: string) => void;
}) {
  return (
    <div
      role="alert"
      className="mt-6 border border-red-400/50 bg-red-500/[0.06] px-4 py-4 sm:px-5"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-red-200">{READINESS_COPY.validationSummary}</p>
          <ul className="space-y-1">
            {questionIds.map((questionId) => (
              <li key={questionId}>
                <button
                  type="button"
                  onClick={() => onSelect(questionId)}
                  className="text-left text-[13px] font-light text-red-200 underline underline-offset-2 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
                >
                  {errors[questionId]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Access and completion states ────────────────────────────────────────────

function AccessPanel({
  icon,
  heading,
  body,
  live,
  children,
}: {
  icon: ReactNode;
  heading: string;
  body: string;
  live?: boolean;
  children?: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      {...(live ? { role: "status" as const, "aria-live": "polite" as const } : {})}
      className="mx-auto max-w-2xl border border-white/10 bg-[#0B162C]/95 px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 shrink-0 text-[#C89B3C]">{icon}</span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-display font-light leading-snug text-white outline-none sm:text-[26px]"
        >
          {heading}
        </h1>
      </div>
      <p className="mt-4 text-[14px] font-light leading-relaxed text-[#B6C0D4]">{body}</p>
      {children}
    </section>
  );
}

function BlockedState({
  reason,
  completion,
  onRetry,
  onResume,
  linkedReference,
}: {
  reason: ReadinessAccessFailure;
  completion: Completion | null;
  onRetry: () => void;
  onResume: (details: { applicationId: string; workEmail: string }) => Promise<ResumeFailure | null>;
  linkedReference: string;
}) {
  const copy = READINESS_COPY.access;

  if (reason === "already_completed") {
    return (
      <AccessPanel
        icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        heading={copy.completedHeading}
        body={copy.completedBody}
      >
        {completion?.applicationId && (
          <CompletionFacts applicationId={completion.applicationId} completedAt={completion.completedAt} />
        )}
        <HomeLink />
      </AccessPanel>
    );
  }

  if (reason === "expired_token") {
    return (
      <AccessPanel
        icon={<Lock className="h-5 w-5" aria-hidden="true" />}
        heading={copy.expiredHeading}
        body={copy.expiredBody}
      >
        <ResumeByReference
          onResume={onResume}
          supportEmail={SUPPORT_EMAIL}
          initialReference={linkedReference}
        />
        <ContactNote />
        <HomeLink />
      </AccessPanel>
    );
  }

  if (reason === "unavailable") {
    return (
      <AccessPanel
        icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
        heading={copy.unavailableHeading}
        body={copy.unavailableBody}
      >
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center border border-white/20 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-[#B6C0D4] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
        >
          {copy.retry}
        </button>
        <HomeLink />
      </AccessPanel>
    );
  }

  // missing_token and invalid_token deliberately share one message so the page
  // never reveals whether a particular application or link exists.
  return (
    <AccessPanel
      icon={<Lock className="h-5 w-5" aria-hidden="true" />}
      heading={copy.requiredHeading}
      body={copy.requiredBody}
    >
      <ResumeByReference
          onResume={onResume}
          supportEmail={SUPPORT_EMAIL}
          initialReference={linkedReference}
        />
      <ContactNote />
      <HomeLink />
    </AccessPanel>
  );
}

const SUPPORT_EMAIL = "admin@aurixasystems.com.au";

function ContactNote() {
  return (
    <p className="mt-4 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
      Contact{" "}
      <a className="text-[#C89B3C] hover:underline" href="mailto:admin@aurixasystems.com.au">
        admin@aurixasystems.com.au
      </a>{" "}
      and quote your application reference if you need a new secure link.
    </p>
  );
}

function HomeLink() {
  return (
    <Link
      to="/"
      className="mt-6 inline-flex min-h-[44px] items-center text-[12px] font-bold uppercase tracking-[0.14em] text-[#C89B3C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
    >
      {READINESS_COPY.completion.homeLink}
    </Link>
  );
}

function CompletionFacts({ applicationId, completedAt }: { applicationId: string; completedAt: string }) {
  const completedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <dl className="mt-6 border border-white/10 divide-y divide-white/10">
      {applicationId && (
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3B8]">
            Application reference
          </dt>
          <dd className="break-all font-mono text-[14px] text-[#C89B3C]">{applicationId}</dd>
        </div>
      )}
      {completedDate && (
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3B8]">Completed</dt>
          <dd className="text-[14px] font-light text-white">{completedDate}</dd>
        </div>
      )}
      <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3B8]">Status</dt>
        <dd className="text-[14px] font-light text-white">Readiness profile submitted</dd>
      </div>
    </dl>
  );
}

function CompletionState({
  completion,
  headingRef,
}: {
  completion: Completion;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto max-w-2xl border border-white/10 bg-[#0B162C]/95 px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-1 h-6 w-6 shrink-0"
          style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
          aria-hidden="true"
        />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-display font-light leading-snug text-white outline-none sm:text-[26px]"
        >
          {READINESS_COPY.completion.heading}
        </h1>
      </div>

      <p className="mt-4 text-[14px] font-light leading-relaxed text-[#B6C0D4]">
        {READINESS_COPY.completion.body}
      </p>

      <CompletionFacts applicationId={completion.applicationId} completedAt={completion.completedAt} />

      <p className="mt-6 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
        {READINESS_COPY.completion.privacyReminder}
      </p>

      <HomeLink />
    </section>
  );
}

// ── Section 1 — Organisation Profile ────────────────────────────────────────

function SectionOrganisation({ ctx }: { ctx: Ctx }) {
  const { answers, errors, set } = ctx;
  const regions = asList(answers[Q.regions]);

  return (
    <>
      <div className="space-y-3 border-l-2 border-white/10 pl-4 sm:pl-5">
        <p aria-hidden="true" className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00A8B5]">
          01
        </p>
        <Dropdown
          id={Q.role}
          name={Q.role}
          label="What is your role within the organisation?"
          labelClassName={questionLabelClass}
          required
          placeholder="Select your role..."
          options={READINESS_ROLE_OPTIONS}
          value={asText(answers[Q.role])}
          error={errors[Q.role]}
          helper={
            ctx.authorised
              ? "Prefilled from your Priority Access Application. Correct it here if it has changed."
              : undefined
          }
          onSelect={(value) => set(Q.role, value)}
        />
        {asText(answers[Q.role]) === "other" && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.roleOther}
              label="Please describe your role."
              required
              limit={LIMITS.roleOther}
            />
          </ConditionalBlock>
        )}
      </div>

      <QuestionFieldset
        id={Q.authority}
        number="02"
        question="Which statement best describes your authority in relation to technology purchases?"
        required
        error={errors[Q.authority]}
      >
        <SingleSelectGroup
          name={Q.authority}
          options={AUTHORITY_OPTIONS}
          value={asText(answers[Q.authority])}
          onChange={(value) => set(Q.authority, value)}
          invalid={Boolean(errors[Q.authority])}
        />
        {asText(answers[Q.authority]) === "other" && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.authorityOther}
              label="Please explain your authority in relation to technology purchases."
              required
              limit={LIMITS.authorityOther}
            />
          </ConditionalBlock>
        )}
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.userCount}
        number="03"
        question="How many people may require access to Aurixa?"
        required
        error={errors[Q.userCount]}
      >
        <SingleSelectGroup
          name={Q.userCount}
          options={USER_COUNT_OPTIONS}
          value={asText(answers[Q.userCount])}
          onChange={(value) => set(Q.userCount, value)}
          invalid={Boolean(errors[Q.userCount])}
        />
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.entityStructure}
        number="04"
        question="How many offices, entities or business divisions would use the platform?"
        required
        error={errors[Q.entityStructure]}
      >
        <SingleSelectGroup
          name={Q.entityStructure}
          options={ENTITY_STRUCTURE_OPTIONS}
          value={asText(answers[Q.entityStructure])}
          onChange={(value) => set(Q.entityStructure, value)}
          invalid={Boolean(errors[Q.entityStructure])}
        />
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.regions}
        number="05"
        question="Where does the organisation currently operate?"
        required
        helper="Select all that apply."
        error={errors[Q.regions]}
      >
        <MultiSelectGroup
          name={Q.regions}
          options={REGION_OPTIONS}
          values={regions}
          onChange={(next) => set(Q.regions, next)}
          invalid={Boolean(errors[Q.regions])}
        />
      </QuestionFieldset>
    </>
  );
}

// ── Section 2 — Current Systems and Workflows ───────────────────────────────

function SectionSystems({ ctx }: { ctx: Ctx }) {
  const { answers, errors, set } = ctx;
  const systems = asList(answers[Q.systems]);
  const problems = asList(answers[Q.problems]);
  const management = asList(answers[Q.informationManagement]);
  const workflowText = asText(answers[Q.difficultWorkflow]);

  return (
    <>
      <QuestionFieldset
        id={Q.systems}
        number="06"
        question="Which systems does your organisation currently use?"
        required
        helper="Select all that apply. Where you select a category, you may optionally name the product."
        error={errors[Q.systems]}
      >
        <MultiSelectGroup
          name={Q.systems}
          options={SYSTEM_OPTIONS}
          values={systems}
          exclusiveValues={SYSTEMS_EXCLUSIVE_VALUES}
          onChange={(next) => set(Q.systems, next)}
          invalid={Boolean(errors[Q.systems])}
          renderDetail={(option) => {
            if (option.value === "no_central_system" || option.value === "other") return null;
            const id = systemProductQuestionId(option.value);
            return (
              <div className="pl-3">
                <label htmlFor={id} className="sr-only">
                  {`${option.label}: product or platform name, if known (optional)`}
                </label>
                <input
                  id={id}
                  name={id}
                  type="text"
                  maxLength={LIMITS.systemProduct}
                  placeholder="Product or platform name, if known"
                  value={asText(answers[id])}
                  onChange={(event) => set(id, event.target.value)}
                  className={`${controlClass(Boolean(errors[id]))} min-h-[40px] py-2 text-[13px]`}
                />
              </div>
            );
          }}
        />

        {systems.includes("other") && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.systemsOther}
              label="Please describe the other system."
              required
              limit={LIMITS.systemsOther}
            />
          </ConditionalBlock>
        )}

        {systems.includes("no_central_system") && (
          <ConditionalBlock>
            <QuestionFieldset
              id={Q.informationManagement}
              number="06a"
              question="How is information currently managed?"
              required
              helper="Select all that apply."
              error={errors[Q.informationManagement]}
            >
              <MultiSelectGroup
                name={Q.informationManagement}
                options={INFORMATION_MANAGEMENT_OPTIONS}
                values={management}
                onChange={(next) => set(Q.informationManagement, next)}
                invalid={Boolean(errors[Q.informationManagement])}
              />
              {management.includes("other") && (
                <ConditionalBlock>
                  <TextQuestion
                    ctx={ctx}
                    id={Q.informationManagementOther}
                    label="Please describe how information is managed."
                    required
                    limit={LIMITS.informationManagementOther}
                  />
                </ConditionalBlock>
              )}
            </QuestionFieldset>
          </ConditionalBlock>
        )}
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.problems}
        number="07"
        question="What are the three biggest operational problems you want Aurixa to solve?"
        required
        helper={
          <span>
            Select up to {MAX_PROBLEMS}.{" "}
            <span className="font-mono text-[#C89B3C]">
              {problems.length}/{MAX_PROBLEMS} selected
            </span>
          </span>
        }
        error={errors[Q.problems]}
      >
        <MultiSelectGroup
          name={Q.problems}
          options={PROBLEM_OPTIONS}
          values={problems}
          max={MAX_PROBLEMS}
          onChange={(next) => set(Q.problems, next)}
          invalid={Boolean(errors[Q.problems])}
        />
        {problems.includes("other") && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.problemsOther}
              label="Please describe the other operational problem."
              required
              limit={LIMITS.problemsOther}
            />
          </ConditionalBlock>
        )}
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.adminTime}
        number="08"
        question="Approximately how much time does your team spend each week on repetitive administration?"
        required
        error={errors[Q.adminTime]}
      >
        <SingleSelectGroup
          name={Q.adminTime}
          options={ADMIN_TIME_OPTIONS}
          value={asText(answers[Q.adminTime])}
          onChange={(value) => set(Q.adminTime, value)}
          invalid={Boolean(errors[Q.adminTime])}
        />
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.difficultWorkflow}
        number="09"
        question="Describe the workflow causing the greatest operational difficulty."
        helper="You may briefly describe the process, participants, delay and operational impact. Do not include client names, identification documents, financial records or confidential client information."
        error={errors[Q.difficultWorkflow]}
      >
        <textarea
          id={`${Q.difficultWorkflow}-input`}
          name={Q.difficultWorkflow}
          rows={5}
          maxLength={LIMITS.difficultWorkflow}
          value={workflowText}
          onChange={(event) => set(Q.difficultWorkflow, event.target.value)}
          aria-describedby={`${Q.difficultWorkflow}-helper ${Q.difficultWorkflow}-count`}
          aria-invalid={Boolean(errors[Q.difficultWorkflow])}
          className={controlClass(Boolean(errors[Q.difficultWorkflow]))}
        />
        <p id={`${Q.difficultWorkflow}-count`} className="text-right font-mono text-[11px] text-[#9CA3B8]">
          {workflowText.length}/{LIMITS.difficultWorkflow}
        </p>
      </QuestionFieldset>
    </>
  );
}

// ── Section 3 — Aurixa Capability Requirements ──────────────────────────────

function SectionCapabilities({ ctx, session }: { ctx: Ctx; session: ReadinessSession }) {
  const { answers, errors, set } = ctx;
  const integrations = asList(answers[Q.integrations]);
  const migration = asText(answers[Q.migration]);
  const showMigrationDetail = [
    "basic_contacts",
    "client_pipeline",
    "documents_history",
    "templates_reports",
    "multiple_systems_complex",
  ].includes(migration);

  const capabilityOptions = useMemo(
    () => suggestedCapabilityOrder(session.prefill.organisationType),
    [session.prefill.organisationType],
  );

  return (
    <>
      <QuestionFieldset
        id={Q.capabilities}
        number="10"
        question="Which Aurixa capabilities are most relevant to your organisation?"
        required
        helper="Select and rank your top five capabilities. Add a capability, then use the move controls to rank it."
        error={errors[Q.capabilities]}
      >
        <RankedCapabilitySelector
          name={Q.capabilities}
          options={capabilityOptions}
          value={asList(answers[Q.capabilities])}
          onChange={(next) => set(Q.capabilities, next)}
          invalid={Boolean(errors[Q.capabilities])}
        />
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.integrations}
        number="11"
        question="Which systems would need to integrate with Aurixa?"
        required
        helper="Select all that apply."
        error={errors[Q.integrations]}
      >
        <MultiSelectGroup
          name={Q.integrations}
          options={INTEGRATION_OPTIONS}
          values={integrations}
          exclusiveValues={INTEGRATIONS_EXCLUSIVE_VALUES}
          onChange={(next) => set(Q.integrations, next)}
          invalid={Boolean(errors[Q.integrations])}
        />

        {integrations.includes("telephony") && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.phoneSystem}
              label="Which phone or VoIP system does your organisation currently use?"
              question
              required
              limit={LIMITS.phoneSystem}
              helper="The provider or platform name is enough."
            />
          </ConditionalBlock>
        )}

        {integrations.includes("custom_internal_system") && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.customSystemName}
              label="System name"
              required
              limit={LIMITS.customSystemName}
            />

            <QuestionFieldset
              id={Q.customSystemApi}
              number="11a"
              question="Is an API available?"
              required
              error={errors[Q.customSystemApi]}
            >
              <SingleSelectGroup
                name={Q.customSystemApi}
                options={API_AVAILABILITY_OPTIONS}
                value={asText(answers[Q.customSystemApi])}
                onChange={(value) => set(Q.customSystemApi, value)}
                invalid={Boolean(errors[Q.customSystemApi])}
              />
            </QuestionFieldset>

            <TextQuestion
              ctx={ctx}
              id={Q.customSystemOwner}
              label="Internal business owner"
              limit={LIMITS.customSystemOwner}
              helper="Optional. The person or team responsible for the system."
            />

            <TextAreaQuestion
              ctx={ctx}
              id={Q.customSystemWorkflow}
              label="Which workflow would the integration support?"
              required
              limit={LIMITS.customSystemWorkflow}
              rows={4}
            />
          </ConditionalBlock>
        )}
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.migration}
        number="12"
        question="Would you need existing data migrated into Aurixa?"
        required
        error={errors[Q.migration]}
      >
        <SingleSelectGroup
          name={Q.migration}
          options={MIGRATION_OPTIONS}
          value={migration}
          onChange={(value) => set(Q.migration, value)}
          invalid={Boolean(errors[Q.migration])}
        />

        {showMigrationDetail && (
          <ConditionalBlock>
            <TextQuestion
              ctx={ctx}
              id={Q.migrationSources}
              label="Source systems"
              required
              limit={LIMITS.migrationSources}
              placeholder="e.g. Salesforce, HubSpot, Xero, SharePoint or spreadsheets"
              helper="Separate multiple systems with a comma."
            />

            <CountQuestion
              ctx={ctx}
              id={Q.migrationRecords}
              label="Approximate number of records"
              placeholder="e.g. 5000"
              helper="Estimate the number of individual records, such as clients, contacts, properties or transactions."
            />
            <CountQuestion
              ctx={ctx}
              id={Q.migrationDocuments}
              label="Approximate number of documents"
              placeholder="e.g. 10000"
              helper="Estimate the number of files, such as reports, contracts, forms or templates."
            />

            <TextAreaQuestion
              ctx={ctx}
              id={Q.migrationQuality}
              label="Known data-quality concerns"
              limit={LIMITS.migrationQuality}
              rows={3}
              placeholder="e.g. duplicate records, missing fields, outdated information or inconsistent formats"
              helper="Optional. For example duplicates, incomplete records or inconsistent formats."
            />

            <QuestionFieldset
              id={Q.migrationTiming}
              number="12a"
              question="Preferred migration timing"
              required
              error={errors[Q.migrationTiming]}
            >
              <SingleSelectGroup
                name={Q.migrationTiming}
                options={MIGRATION_TIMING_OPTIONS}
                value={asText(answers[Q.migrationTiming])}
                onChange={(value) => set(Q.migrationTiming, value)}
                invalid={Boolean(errors[Q.migrationTiming])}
              />
            </QuestionFieldset>
          </ConditionalBlock>
        )}
      </QuestionFieldset>
    </>
  );
}

// ── Section 4 — Implementation Readiness ────────────────────────────────────

function SectionReadiness({ ctx }: { ctx: Ctx }) {
  const { answers, errors, set } = ctx;
  const security = asList(answers[Q.security]);
  const hasNamedSecurity = security.some((value) => !SECURITY_EXCLUSIVE_VALUES.includes(value));
  const enterprise = needsEnterpriseReadiness(answers);
  const within90Days = isWithin90Days(answers);

  return (
    <>
      <QuestionFieldset
        id={Q.timing}
        number="13"
        question="When would you ideally like to commence implementation?"
        required
        error={errors[Q.timing]}
      >
        <SingleSelectGroup
          name={Q.timing}
          options={TIMING_OPTIONS}
          value={asText(answers[Q.timing])}
          onChange={(value) => set(Q.timing, value)}
          invalid={Boolean(errors[Q.timing])}
        />
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.security}
        number="14"
        question="Does your organisation have specific security, hosting or procurement requirements?"
        required
        helper="Select all that apply. Selecting a requirement records it for review. It does not confirm that Aurixa currently provides or certifies it."
        error={errors[Q.security]}
      >
        <MultiSelectGroup
          name={Q.security}
          options={SECURITY_OPTIONS}
          values={security}
          exclusiveValues={SECURITY_EXCLUSIVE_VALUES}
          onChange={(next) => set(Q.security, next)}
          invalid={Boolean(errors[Q.security])}
        />

        {hasNamedSecurity && (
          <ConditionalBlock>
            <TextAreaQuestion
              ctx={ctx}
              id={Q.securityContext}
              label="Please provide any relevant policy, questionnaire, certification or procurement context."
              limit={LIMITS.securityContext}
              rows={4}
              helper="Optional. Please do not attach or transcribe confidential documents."
            />
          </ConditionalBlock>
        )}

        {enterprise && (
          <ConditionalBlock>
            <p className="text-[12px] font-light leading-relaxed text-[#9CA3B8]">
              Because of the size or structure of your organisation, these help us understand the
              environment your team would need. They record your requirements for review.
            </p>

            <QuestionFieldset
              id={Q.enterpriseSso}
              number="14a"
              question="Would centralised identity or single sign-on be required?"
              error={errors[Q.enterpriseSso]}
            >
              <SingleSelectGroup
                name={Q.enterpriseSso}
                options={YES_NO_UNKNOWN_OPTIONS}
                value={asText(answers[Q.enterpriseSso])}
                onChange={(value) => set(Q.enterpriseSso, value)}
              />
            </QuestionFieldset>

            <QuestionFieldset
              id={Q.enterpriseBoundaries}
              number="14b"
              question="Would entity-level access boundaries or separate environments be required?"
              error={errors[Q.enterpriseBoundaries]}
            >
              <SingleSelectGroup
                name={Q.enterpriseBoundaries}
                options={YES_NO_UNKNOWN_OPTIONS}
                value={asText(answers[Q.enterpriseBoundaries])}
                onChange={(value) => set(Q.enterpriseBoundaries, value)}
              />
            </QuestionFieldset>

            <QuestionFieldset
              id={Q.enterpriseProcurement}
              number="14c"
              question="Do you expect a formal procurement or vendor-risk process?"
              error={errors[Q.enterpriseProcurement]}
            >
              <SingleSelectGroup
                name={Q.enterpriseProcurement}
                options={YES_NO_UNKNOWN_OPTIONS}
                value={asText(answers[Q.enterpriseProcurement])}
                onChange={(value) => set(Q.enterpriseProcurement, value)}
              />
            </QuestionFieldset>
          </ConditionalBlock>
        )}
      </QuestionFieldset>

      <QuestionFieldset
        id={Q.nextStep}
        number="15"
        question="Which next step would be most useful?"
        required
        helper="Your preference will help our team determine the most relevant review pathway."
        error={errors[Q.nextStep]}
      >
        <SingleSelectGroup
          name={Q.nextStep}
          options={NEXT_STEP_OPTIONS}
          value={asText(answers[Q.nextStep])}
          onChange={(value) => set(Q.nextStep, value)}
          invalid={Boolean(errors[Q.nextStep])}
        />
      </QuestionFieldset>

      {within90Days && (
        <>
          <QuestionFieldset
            id={Q.investmentRange}
            number="16"
            question="Has an indicative technology investment range been approved?"
            helper="Optional. This helps us prepare a relevant discussion. It is not a commitment."
            error={errors[Q.investmentRange]}
          >
            <SingleSelectGroup
              name={Q.investmentRange}
              options={INVESTMENT_RANGE_OPTIONS}
              value={asText(answers[Q.investmentRange])}
              onChange={(value) => set(Q.investmentRange, value)}
            />
          </QuestionFieldset>

          <QuestionFieldset
            id={Q.projectSponsor}
            number="16a"
            question="Has an internal project sponsor been identified?"
            error={errors[Q.projectSponsor]}
          >
            <SingleSelectGroup
              name={Q.projectSponsor}
              options={YES_NO_UNKNOWN_OPTIONS}
              value={asText(answers[Q.projectSponsor])}
              onChange={(value) => set(Q.projectSponsor, value)}
            />
          </QuestionFieldset>
        </>
      )}
    </>
  );
}

// ── Reusable conditional controls ───────────────────────────────────────────

function TextQuestion({
  ctx,
  id,
  label,
  required,
  limit,
  helper,
  placeholder,
  /** Set for a full-sentence prompt so it matches the other questions. */
  question,
}: {
  ctx: Ctx;
  id: string;
  label: string;
  required?: boolean;
  limit: number;
  helper?: string;
  placeholder?: string;
  question?: boolean;
}) {
  const value = asText(ctx.answers[id]);
  return (
    <Field
      id={id}
      label={label}
      required={required}
      helper={helper}
      error={ctx.errors[id]}
      labelClassName={question ? questionLabelClass : undefined}
    >
      <input
        id={id}
        name={id}
        type="text"
        maxLength={limit}
        placeholder={placeholder}
        value={value}
        onChange={(event) => ctx.set(id, event.target.value)}
        aria-required={required ? "true" : undefined}
        aria-invalid={Boolean(ctx.errors[id])}
        aria-describedby={describedBy(id, Boolean(helper), Boolean(ctx.errors[id]))}
        className={controlClass(Boolean(ctx.errors[id]))}
      />
    </Field>
  );
}

function TextAreaQuestion({
  ctx,
  id,
  label,
  required,
  limit,
  rows,
  helper,
  placeholder,
}: {
  ctx: Ctx;
  id: string;
  label: string;
  required?: boolean;
  limit: number;
  rows: number;
  helper?: string;
  placeholder?: string;
}) {
  const value = asText(ctx.answers[id]);
  return (
    <Field id={id} label={label} required={required} helper={helper} error={ctx.errors[id]}>
      <textarea
        id={id}
        name={id}
        rows={rows}
        maxLength={limit}
        placeholder={placeholder}
        value={value}
        onChange={(event) => ctx.set(id, event.target.value)}
        aria-required={required ? "true" : undefined}
        aria-invalid={Boolean(ctx.errors[id])}
        aria-describedby={
          [describedBy(id, Boolean(helper), Boolean(ctx.errors[id])), `${id}-count`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={controlClass(Boolean(ctx.errors[id]))}
      />
      <p id={`${id}-count`} className="mt-1 text-right font-mono text-[11px] text-[#9CA3B8]">
        {value.length}/{limit}
      </p>
    </Field>
  );
}

/**
 * Numeric answer with an explicit "Not yet known" alternative, so the applicant
 * is never forced to invent a figure (section 6.1).
 */
function CountQuestion({
  ctx,
  id,
  label,
  placeholder,
  helper,
}: {
  ctx: Ctx;
  id: string;
  label: string;
  placeholder?: string;
  helper?: string;
}) {
  const raw = ctx.answers[id];
  const unknown = raw === NOT_YET_KNOWN;
  const numeric = typeof raw === "number" ? String(raw) : unknown ? "" : asText(raw);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClass}>
        {label}
        <span className="text-[#C89B3C] ml-1" aria-hidden="true">
          *
        </span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          name={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder={placeholder}
          disabled={unknown}
          value={numeric}
          onChange={(event) => {
            const next = event.target.value;
            ctx.set(id, next === "" ? "" : Number(next));
          }}
          aria-required="true"
          aria-invalid={Boolean(ctx.errors[id])}
          aria-describedby={describedBy(id, Boolean(helper), Boolean(ctx.errors[id]))}
          className={`${controlClass(Boolean(ctx.errors[id]))} sm:max-w-[240px] disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <label
          htmlFor={`${id}-unknown`}
          className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] font-light text-[#B6C0D4]"
        >
          <input
            id={`${id}-unknown`}
            type="checkbox"
            checked={unknown}
            onChange={(event) => ctx.set(id, event.target.checked ? NOT_YET_KNOWN : "")}
            className="h-4 w-4 shrink-0 accent-[#00A8B5]"
          />
          Not yet known
        </label>
      </div>
      {helper && (
        <p id={`${id}-helper`} className={helperClass}>
          {helper}
        </p>
      )}
      {ctx.errors[id] && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {ctx.errors[id]}
        </p>
      )}
    </div>
  );
}

// ── Review screen ───────────────────────────────────────────────────────────

function ReviewScreen({
  answers,
  headingRef,
  onEdit,
  onSubmit,
  onPrevious,
  isSubmitting,
  submissionError,
}: {
  answers: AnswerMap;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: (index: number) => void;
  onSubmit: () => void;
  onPrevious: () => void;
  isSubmitting: boolean;
  submissionError: string;
}) {
  const sections = buildReviewSections(answers);

  return (
    <div>
      <div className="border-b border-white/10 pb-5">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-display font-light text-white outline-none sm:text-[28px]"
        >
          {READINESS_COPY.review.heading}
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] font-light leading-relaxed text-[#B6C0D4]">
          {READINESS_COPY.review.supporting}
        </p>
      </div>

      <div className="mt-7 space-y-8">
        {sections.map((section) => (
          <section key={section.key} aria-labelledby={`review-${section.key}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2.5">
              <h3
                id={`review-${section.key}`}
                className="text-[15px] font-semibold tracking-wide text-white"
              >
                {section.title}
              </h3>
              <button
                type="button"
                onClick={() => onEdit(section.sectionIndex)}
                className="inline-flex min-h-[44px] items-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#C89B3C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
              >
                Edit
                <span className="sr-only">{` ${section.title}`}</span>
              </button>
            </div>

            <dl className="divide-y divide-white/5">
              {section.items.map((item) => (
                <div
                  key={item.questionId}
                  className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] sm:gap-6"
                >
                  <dt className="text-[13px] font-light leading-snug text-[#9CA3B8]">
                    {item.question}
                    {item.required && (
                      <span className="text-[#C89B3C] ml-1" aria-hidden="true">
                        *
                      </span>
                    )}
                  </dt>
                  <dd className="min-w-0 text-[14px] font-light text-white">
                    {item.answered ? (
                      item.ranked ? (
                        <ol className="space-y-0.5">
                          {item.values.map((value, index) => (
                            <li key={value} className="break-words">
                              <span className="font-mono text-[12px] text-[#C89B3C]">{index + 1}.</span>{" "}
                              {value}
                            </li>
                          ))}
                        </ol>
                      ) : item.values.length > 1 ? (
                        <ul className="space-y-0.5">
                          {item.values.map((value) => (
                            <li key={value} className="break-words">
                              {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="break-words">{item.values[0]}</span>
                      )
                    ) : (
                      <span className={item.required ? "text-red-300" : "text-[#6B7689]"}>
                        {item.required
                          ? `${READINESS_COPY.review.unanswered}, required`
                          : READINESS_COPY.review.unanswered}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-8 border-l-2 border-[#00A8B5]/40 pl-4 text-[13px] font-light leading-relaxed text-[#9CA3B8]">
        {READINESS_COPY.review.declaration}
      </p>

      {submissionError && (
        <p className={`mt-4 ${errorClass}`} role="alert">
          {submissionError}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 border border-white/20 px-6 text-[12px] font-bold uppercase tracking-[0.16em] text-[#B6C0D4] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="group relative inline-flex min-h-[56px] w-full items-center justify-center gap-3 overflow-hidden rounded-sm border-none px-7 text-[12px] font-black uppercase tracking-[0.18em] text-white btn-chrome-prismatic transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C] sm:w-auto"
        >
          <span className="relative z-10 drop-shadow-md">
            {isSubmitting ? READINESS_COPY.review.submitting : READINESS_COPY.review.submit}
          </span>
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
