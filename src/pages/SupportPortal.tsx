import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";
import {
  Dropdown,
  Field,
  controlClass,
  describedBy,
  errorClass,
  helperClass,
  pairedRowClass,
} from "../components/FormControls";
import SupportAssistant from "../components/SupportAssistant";
import { useRouteMetadata } from "../lib/pageMetadata";
import type { AssistantContext, TicketPrefill } from "../lib/supportAssistant";
import {
  BREAKAGE_OPTIONS,
  CATEGORY_OPTIONS,
  EMPTY_SUPPORT_TICKET,
  MAX_DESCRIPTION,
  MAX_IMPACT,
  buildSupportTicketPayload,
  validateSupportTicket,
  type SupportTicketField,
  type SupportTicketValues,
} from "../lib/supportTicket";
import {
  submitSupportTicket,
  type SupportTicketReceipt,
} from "../lib/supportTicketClient";

/**
 * /support — the Aurixa Support Portal.
 *
 * Reached from the NPC property dashboard as
 * `/support?workspace_id=…&user_id=…&user_name=…&source=npc-dashboard`
 * (optionally `&dashboard_url=…`), which pre-fills the ticket's context so
 * the reporter never types identifiers they would have to go looking for.
 * Reached directly, the workspace ID becomes an ordinary required field.
 *
 * The page is a two-step gateway. Step one is a chat assistant answering
 * how-do-I questions straight from the NPC dashboard User Guide, so most
 * questions never become tickets at all. Step two is the ticket form —
 * reached by escalating out of the chat (which attaches the conversation),
 * by the visible "skip" link, or directly via `?skip_assistant=1`. The
 * assistant is never a trapdoor: the form is always one click away.
 *
 * Tickets go through the `support-ticket` edge function to Aurixa Mission
 * Control, which classifies severity (P0–P3) and auto-remediates eligible
 * issues. The page never talks to Mission Control itself.
 */

/** Tab order on the page, and therefore the order errors are focused in. */
const FIELD_ORDER: SupportTicketField[] = [
  "workspaceId",
  "reporterName",
  "reporterEmail",
  "category",
  "breakageVector",
  "subject",
  "description",
  "impact",
];

/** Mission Control field names → the form fields that carry their errors. */
const SERVER_FIELD_MAP: Record<string, SupportTicketField> = {
  workspace_id: "workspaceId",
  user_id: "userId",
  reporter_name: "reporterName",
  reporter_email: "reporterEmail",
  category: "category",
  breakage_vector: "breakageVector",
  subject: "subject",
  description: "description",
  impact: "impact",
};

/** Re-submits within this window are blocked client-side before any request. */
const THROTTLE_MS = 30_000;
const LAST_SUBMIT_KEY = "aurixa.support.lastSubmit";

type Outcome = {
  /** Null when the server sent no receipt (or the honeypot dropped the submit). */
  ticket: SupportTicketReceipt | null;
  reporterEmail: string;
};

type Step = "screen" | "form" | "resolved";
type FormOrigin = "skip" | "escalate";

export default function SupportPortal() {
  useRouteMetadata("/support");
  const [params] = useSearchParams();

  // URL-supplied context is clamped to the contract bounds on the way in: the
  // reporter cannot edit these values, so an overlong one must never be the
  // reason a finished ticket fails validation.
  const workspaceParam = (params.get("workspace_id") ?? "").trim().slice(0, 120);
  const userIdParam = (params.get("user_id") ?? "").trim().slice(0, 120);
  const userNameParam = (params.get("user_name") ?? "").trim().slice(0, 120);
  const source = params.get("source") === "npc-dashboard" ? "npc-dashboard" : "direct";
  // Validated (https, credential-free) inside buildAskPayload before sending.
  const dashboardUrlParam = (params.get("dashboard_url") ?? "").trim().slice(0, 500);
  const hasContext = workspaceParam.length > 0;

  const [step, setStep] = useState<Step>(() =>
    params.get("skip_assistant") === "1" ? "form" : "screen",
  );
  const [formOrigin, setFormOrigin] = useState<FormOrigin>("skip");
  const [prefill, setPrefill] = useState<TicketPrefill | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Scroll to the form when the visitor moves onto it — but not on first
  // paint when ?skip_assistant=1 already landed there.
  const formTopRef = useRef<HTMLDivElement>(null);
  const wasOnFormRef = useRef(step === "form");
  useEffect(() => {
    if (step === "form" && !wasOnFormRef.current) {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    wasOnFormRef.current = step === "form";
  }, [step]);

  const assistantContext: AssistantContext = {
    workspace_id: workspaceParam,
    user_id: userIdParam,
    source,
    dashboard_url: dashboardUrlParam || undefined,
  };

  const handleEscalate = (conversationPrefill: TicketPrefill) => {
    setPrefill(conversationPrefill);
    setFormOrigin("escalate");
    setStep("form");
  };

  const handleSkip = () => {
    setFormOrigin("skip");
    setStep("form");
  };

  // The assistant stays MOUNTED (hidden at most) so the conversation survives
  // every hop between steps; it is visible on the screen step and above the
  // form when the visitor arrived there by escalating.
  const assistantVisible =
    step === "screen" || (step === "form" && formOrigin === "escalate");

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#040B16] text-white">
      <BackgroundFX />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-28 sm:pt-36">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
            <LifeBuoy className="h-4 w-4" />
            <span>Aurixa Support Portal</span>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
            Raise a <span className="font-display italic text-[#C89B3C]">support ticket</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
            Tickets go straight to Aurixa Mission Control, are classified by severity (P0&ndash;P3),
            and eligible issues are remediated automatically, often before an engineer picks them up.
          </p>
        </div>

        {outcome ? (
          <TicketReceipt outcome={outcome} />
        ) : (
          <>
            <div className={assistantVisible ? "" : "hidden"}>
              <Panel>
                <SupportAssistant
                  context={assistantContext}
                  onEscalate={handleEscalate}
                  onResolved={() => setStep("resolved")}
                />
              </Panel>
              {step === "screen" && (
                <div className="mt-6 space-y-3 text-center">
                  <p>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#94A3B8] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                    >
                      Skip and raise a ticket directly
                    </button>
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]/70">
                    Seeing an outage?{" "}
                    <Link
                      to="/status"
                      className="text-[#94A3B8] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                    >
                      System status ↗
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {step === "resolved" && <ResolvedPanel onBack={() => setStep("screen")} />}

            <div ref={formTopRef} className={step === "form" ? "" : "hidden"}>
              <div className="mt-10 space-y-3">
                <button
                  type="button"
                  onClick={() => setStep("screen")}
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to assistant
                </button>
                {formOrigin === "escalate" && prefill && (
                  <p className="rounded-lg border border-[#00A8B5]/25 bg-[#00A8B5]/[0.07] px-4 py-2.5 text-[13px] text-[#94A3B8]">
                    Context from your assistant conversation is attached. You can edit anything
                    below before sending.
                  </p>
                )}
              </div>
              <TicketForm
                hasContext={hasContext}
                workspaceParam={workspaceParam}
                userIdParam={userIdParam}
                userNameParam={userNameParam}
                source={source}
                prefill={formOrigin === "escalate" ? prefill : null}
                onSubmitted={setOutcome}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* ─── pieces ─────────────────────────────────────────────────────────────── */

/**
 * The ticket form, exactly as it worked when it was the whole page — the
 * validation, honeypot, client throttle, server error mapping and focus
 * handling are unchanged. It lives in its own component (still in this file)
 * so the gateway can keep it mounted-but-hidden and a visitor who hops back
 * to the assistant loses nothing they typed. `prefill` arrives only from an
 * escalated conversation; each new escalation reapplies it.
 */
function TicketForm({
  hasContext,
  workspaceParam,
  userIdParam,
  userNameParam,
  source,
  prefill,
  onSubmitted,
}: {
  hasContext: boolean;
  workspaceParam: string;
  userIdParam: string;
  userNameParam: string;
  source: "npc-dashboard" | "direct";
  prefill: TicketPrefill | null;
  onSubmitted: (outcome: Outcome) => void;
}) {
  const [values, setValues] = useState<SupportTicketValues>(() => ({
    ...EMPTY_SUPPORT_TICKET,
    workspaceId: workspaceParam,
    userId: userIdParam,
    reporterName: userNameParam,
  }));
  const [errors, setErrors] = useState<Partial<Record<SupportTicketField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [throttleMessage, setThrottleMessage] = useState("");

  const lastSubmitRef = useRef(0);

  // A new escalation replaces subject/description (the visitor can still edit
  // them) and clears any stale errors those fields carried.
  useEffect(() => {
    if (!prefill) return;
    setValues((current) => ({
      ...current,
      subject: prefill.subject,
      description: prefill.description,
    }));
    setErrors((current) => {
      if (!current.subject && !current.description) return current;
      const next = { ...current };
      delete next.subject;
      delete next.description;
      return next;
    });
  }, [prefill]);

  const setValue = <K extends keyof SupportTicketValues>(
    key: K,
    value: SupportTicketValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Partial<Record<SupportTicketField, string>>) => {
    const firstField = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!firstField) return;
    const element = document.getElementById(firstField);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /** The ref survives re-renders; localStorage survives a reload mid-tantrum. */
  const readLastSubmit = (): number => {
    if (lastSubmitRef.current) return lastSubmitRef.current;
    try {
      const stored = Number(window.localStorage.getItem(LAST_SUBMIT_KEY));
      return Number.isFinite(stored) ? stored : 0;
    } catch {
      return 0;
    }
  };

  const recordSubmit = (at: number) => {
    lastSubmitRef.current = at;
    try {
      window.localStorage.setItem(LAST_SUBMIT_KEY, String(at));
    } catch {
      // Private browsing — the ref still throttles this tab.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmissionError("");
    setThrottleMessage("");

    // Honeypot: a filled "website" field is a bot. Show the success screen and
    // send nothing — an error would only teach the script what to fix.
    if (values.website.trim()) {
      onSubmitted({ ticket: null, reporterEmail: values.reporterEmail.trim() });
      return;
    }

    const fieldErrors = validateSupportTicket(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors);
      return;
    }

    const now = Date.now();
    const wait = THROTTLE_MS - (now - readLastSubmit());
    if (wait > 0) {
      setThrottleMessage(
        `You submitted a ticket a moment ago. Please wait ${Math.ceil(wait / 1000)} seconds before sending another.`,
      );
      return;
    }

    setIsSubmitting(true);
    recordSubmit(now);

    const payload = buildSupportTicketPayload(values, {
      source,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    const result = await submitSupportTicket(payload);
    setIsSubmitting(false);

    // `=== true`, not truthiness: with `strict` off in this repo's tsconfig,
    // only an equality check on the discriminant narrows the union below.
    if (result.ok === true) {
      onSubmitted({ ticket: result.ticket, reporterEmail: payload.reporter_email });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (result.kind === "throttled") {
      const minutes = result.retryAfterSeconds
        ? Math.max(1, Math.round(result.retryAfterSeconds / 60))
        : null;
      setThrottleMessage(
        minutes
          ? `Too many attempts from your connection just now. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}. Nothing you typed has been lost.`
          : "Too many attempts from your connection just now. Please try again shortly. Nothing you typed has been lost.",
      );
      return;
    }

    if (result.kind === "invalid") {
      const mapped: Partial<Record<SupportTicketField, string>> = {};
      for (const [serverField, message] of Object.entries(result.fields ?? {})) {
        const field = SERVER_FIELD_MAP[serverField];
        if (field && typeof message === "string") mapped[field] = message;
      }
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
        focusFirstError(mapped);
      } else {
        setSubmissionError(
          "Mission Control rejected the ticket. Please check your answers and try again.",
        );
      }
      return;
    }

    // The message below invites an immediate retry, so the attempt that never
    // landed must not cost 30 seconds of client throttle. The server-side
    // throttle still counts whatever reached it.
    lastSubmitRef.current = 0;
    try {
      window.localStorage.removeItem(LAST_SUBMIT_KEY);
    } catch {
      // Private browsing — nothing stored, nothing to clear.
    }
    setSubmissionError(
      "We couldn't send your ticket just now. Please try again. Your answers are still on this page, so nothing is lost.",
    );
  };

  return (
    <Panel>
      <form className="space-y-5 text-left" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {hasContext ? (
          <div className="rounded-lg border border-[#00A8B5]/25 bg-[#040B16]/60 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]/70">
              Ticket context
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 font-mono text-[11px] tracking-[0.08em] sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="uppercase text-[10px] tracking-[0.2em] text-[#94A3B8]/60">Workspace</dt>
                <dd className="truncate text-[#5EDDE8]" title={values.workspaceId}>
                  {values.workspaceId}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="uppercase text-[10px] tracking-[0.2em] text-[#94A3B8]/60">User</dt>
                <dd className="truncate text-white/80" title={userNameParam || userIdParam || undefined}>
                  {userNameParam || userIdParam || "—"}
                  {userNameParam && userIdParam ? ` · ${userIdParam}` : ""}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="uppercase text-[10px] tracking-[0.2em] text-[#94A3B8]/60">Source</dt>
                <dd className="truncate text-white/80">{source}</dd>
              </div>
            </dl>
            {errors.workspaceId && (
              <p className={`${errorClass} mt-2`} role="alert">
                {errors.workspaceId}
              </p>
            )}
          </div>
        ) : (
          <Field
            id="workspaceId"
            label="Workspace ID"
            required
            helper="Find this in your dashboard under Support."
            error={errors.workspaceId}
          >
            <input
              id="workspaceId"
              name="workspaceId"
              type="text"
              autoComplete="off"
              maxLength={120}
              value={values.workspaceId}
              onChange={(event) => setValue("workspaceId", event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors.workspaceId)}
              aria-describedby={describedBy("workspaceId", true, Boolean(errors.workspaceId))}
              className={controlClass(Boolean(errors.workspaceId))}
            />
          </Field>
        )}

        {/* Honeypot. Hidden from people and assistive tech; a bot that
            fills every input it can find gives itself away here. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        >
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => setValue("website", event.target.value)}
          />
        </div>

        <div className={pairedRowClass}>
          <Field id="reporterName" label="Your Name" error={errors.reporterName} paired>
            <input
              id="reporterName"
              name="reporterName"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={values.reporterName}
              onChange={(event) => setValue("reporterName", event.target.value)}
              aria-invalid={Boolean(errors.reporterName)}
              aria-describedby={describedBy("reporterName", false, Boolean(errors.reporterName))}
              className={controlClass(Boolean(errors.reporterName))}
            />
          </Field>
          <Field
            id="reporterEmail"
            label="Your Email"
            required
            helper="Updates about this ticket land here."
            error={errors.reporterEmail}
            paired
          >
            <input
              id="reporterEmail"
              name="reporterEmail"
              type="email"
              autoComplete="email"
              maxLength={320}
              value={values.reporterEmail}
              onChange={(event) => setValue("reporterEmail", event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors.reporterEmail)}
              aria-describedby={describedBy("reporterEmail", true, Boolean(errors.reporterEmail))}
              className={controlClass(Boolean(errors.reporterEmail))}
            />
          </Field>
        </div>

        <div className={pairedRowClass}>
          <Dropdown
            id="category"
            name="category"
            label="What kind of issue?"
            required
            paired
            placeholder="Select a category..."
            options={CATEGORY_OPTIONS}
            value={values.category}
            error={errors.category}
            onSelect={(value) => setValue("category", value)}
          />
          <Dropdown
            id="breakageVector"
            name="breakageVector"
            label="How much is affected?"
            required
            paired
            placeholder="Select the blast radius..."
            options={BREAKAGE_OPTIONS}
            value={values.breakageVector}
            error={errors.breakageVector}
            onSelect={(value) => setValue("breakageVector", value)}
          />
        </div>

        <Field
          id="subject"
          label="Subject"
          required
          helper="A short headline, like 'Listings page shows no photographs'."
          error={errors.subject}
        >
          <input
            id="subject"
            name="subject"
            type="text"
            autoComplete="off"
            maxLength={160}
            value={values.subject}
            onChange={(event) => setValue("subject", event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={describedBy("subject", true, Boolean(errors.subject))}
            className={controlClass(Boolean(errors.subject))}
          />
        </Field>

        <Field
          id="description"
          label="What happened?"
          required
          helper="What you did, what you expected, and what you saw instead. Please don't include passwords or client documents."
          error={errors.description}
        >
          <textarea
            id="description"
            name="description"
            rows={6}
            maxLength={MAX_DESCRIPTION}
            placeholder="Steps to reproduce, error messages, when it started…"
            value={values.description}
            onChange={(event) => setValue("description", event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy("description", true, Boolean(errors.description))}
            className={`${controlClass(Boolean(errors.description))} resize-y`}
          />
          <p className="text-[11px] text-[#9CA3B8] font-mono text-right mt-1">
            {values.description.length}/{MAX_DESCRIPTION}
          </p>
        </Field>

        <Field
          id="impact"
          label="Business impact (optional)"
          helper="Who is blocked, and what can't they do?"
          error={errors.impact}
        >
          <textarea
            id="impact"
            name="impact"
            rows={3}
            maxLength={MAX_IMPACT}
            placeholder="e.g. Three agents can't issue investment reports until this is fixed…"
            value={values.impact}
            onChange={(event) => setValue("impact", event.target.value)}
            aria-invalid={Boolean(errors.impact)}
            aria-describedby={describedBy("impact", true, Boolean(errors.impact))}
            className={`${controlClass(Boolean(errors.impact))} resize-y`}
          />
          <p className="text-[11px] text-[#9CA3B8] font-mono text-right mt-1">
            {values.impact.length}/{MAX_IMPACT}
          </p>
        </Field>

        {throttleMessage && (
          <p
            className="rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-3 text-sm text-[#F2DFA8]"
            role="alert"
          >
            {throttleMessage}
          </p>
        )}

        {submissionError && (
          <p
            className="rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-3 text-sm text-[#F2DFA8]"
            role="alert"
          >
            {submissionError}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] px-8 py-4 font-mono text-[12px] font-black uppercase tracking-[0.25em] text-[#040B16] shadow-[0_0_44px_-8px] shadow-[#00A8B5]/70 transition-all hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending&hellip;
              </>
            ) : (
              <>
                Submit ticket <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
            Required fields are marked *
          </p>
        </div>
      </form>
    </Panel>
  );
}

/**
 * The assistant answered it and the visitor said so. Same visual weight as
 * the ticket receipt — this outcome is the gateway working, not a dead end.
 */
function ResolvedPanel({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="status"
      className="relative mt-14 overflow-hidden rounded-2xl border border-[#00A8B5]/45 bg-gradient-to-br from-[#00A8B5]/[0.14] via-[#0B162C]/85 to-[#0B162C]/50 p-8 text-center shadow-[0_36px_90px_-32px] shadow-[#00A8B5]/45 backdrop-blur-xl sm:p-10"
    >
      <CornerTicks />
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />

      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A8B5]/15 text-[#5EDDE8] ring-1 ring-[#00A8B5]/35">
        <CheckCircle2 className="h-6 w-6" />
      </span>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 text-2xl font-semibold tracking-tight outline-none md:text-3xl"
      >
        Glad that sorted it.
      </h2>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#94A3B8]">
        You can close this tab, or raise a ticket if anything else comes up.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-sm border border-[#00A8B5]/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors hover:border-[#00A8B5]"
      >
        Back to the assistant <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * What happens next, said plainly. The reference is the thing to keep: it is
 * how the reporter and Mission Control talk about the same incident later.
 */
function TicketReceipt({ outcome }: { outcome: Outcome }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const { ticket, reporterEmail } = outcome;
  const slaDue = ticket?.sla_due_at ? new Date(ticket.sla_due_at) : null;
  const slaValid = slaDue && !Number.isNaN(slaDue.getTime());

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mt-14 overflow-hidden rounded-2xl border border-[#00A8B5]/45 bg-gradient-to-br from-[#00A8B5]/[0.14] via-[#0B162C]/85 to-[#0B162C]/50 p-8 text-center shadow-[0_36px_90px_-32px] shadow-[#00A8B5]/45 backdrop-blur-xl sm:p-10"
    >
      <CornerTicks />
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />

      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A8B5]/15 text-[#5EDDE8] ring-1 ring-[#00A8B5]/35">
        <CheckCircle2 className="h-6 w-6" />
      </span>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 text-2xl font-semibold tracking-tight outline-none md:text-3xl"
      >
        Your ticket has been received.
      </h2>

      {ticket ? (
        <>
          <dl className="mx-auto mt-6 max-w-md divide-y divide-white/10 border border-white/10 text-left">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
                Reference
              </dt>
              <dd className="break-all font-mono text-[14px] text-[#C89B3C]">{ticket.reference}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
                Priority
              </dt>
              <dd className="font-mono text-[14px] text-white">{ticket.priority}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
                Status
              </dt>
              <dd className="font-mono text-[14px] text-white">{ticket.status}</dd>
            </div>
            {slaValid && (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
                  Response due
                </dt>
                <dd className="font-mono text-[14px] text-white">
                  {slaDue.toLocaleString("en-AU", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            )}
          </dl>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#94A3B8]">
            P2 and below are queued for automatic remediation; P0 and P1 go straight to an
            engineer. Either way, updates will be emailed to{" "}
            <span className="text-white">{reporterEmail || "the address you gave"}</span>. Quote
            the reference above in any follow-up.
          </p>
        </>
      ) : (
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#94A3B8]">
          Thank you. The Aurixa team will review it and email{" "}
          <span className="text-white">{reporterEmail || "the address you gave"}</span> with what
          happens next.
        </p>
      )}

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
        Aurixa Mission Control · Severity-classified · P0&ndash;P3
      </p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8">
      <CornerTicks />
      {children}
    </div>
  );
}

function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#00A8B5]/40" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#00A8B5]/40" />
    </>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-[#00A8B5]/10 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#C89B3C]/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,168,181,0.08),transparent_55%)]" />
    </div>
  );
}
