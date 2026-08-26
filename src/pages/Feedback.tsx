import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Loader2, MessageSquareQuote, Sparkles, Zap } from "lucide-react";
import {
  fetchFeedbackContext,
  submitFeedback,
  type Credential,
  type FeedbackAnswers,
  type FeedbackContext,
  type FeedbackReceipt,
} from "../lib/billing";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * /feedback — the customer-facing feedback form.
 *
 * Reached from a workspace, never from the site's navigation: the link carries
 * a `?h=` handoff minted server-to-server, which is how a form on a marketing
 * domain knows which workspace and which person is answering without asking
 * anyone to log in or type their own company name.
 *
 * The questions are not fixed. Mission Control builds them from the plan the
 * workspace is actually on, so a Launch customer is never asked to score
 * Marketing — a module only Scale includes. Rating something you have never
 * opened produces a number that means nothing and tells the customer we do not
 * know what they bought.
 *
 * Answering earns the workspace 100 credits, once per campaign. Every
 * colleague's answer is still wanted; only the first one is paid for, and the
 * page says so rather than promising a reward it will not deliver.
 */

const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export default function Feedback() {
  useRouteMetadata("/feedback");
  const [params] = useSearchParams();
  const h = params.get("h");
  const uid = params.get("uid");

  const credential: Credential | null = h ? { h } : uid ? { uid } : null;
  const credentialKey = credential ? JSON.stringify(credential) : null;

  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [mostValuable, setMostValuable] = useState("");
  const [frustration, setFrustration] = useState("");
  const [request, setRequest] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchFeedbackContext(credentialKey ? (JSON.parse(credentialKey) as Credential) : null)
      .then((c) => !cancelled && setContext(c))
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // Serialised: the credential object is rebuilt each render, so depending on
    // it directly would refetch in a loop.
  }, [credentialKey]);

  // Something has to have been said. An empty form submitted for the credits is
  // not feedback — the server refuses it too, and the button should not invite
  // the attempt in the first place.
  const hasAnswer = useMemo(
    () =>
      overall !== null ||
      recommend !== null ||
      Object.keys(ratings).length > 0 ||
      !!mostValuable.trim() ||
      !!frustration.trim() ||
      !!request.trim() ||
      !!comments.trim(),
    [overall, recommend, ratings, mostValuable, frustration, request, comments],
  );

  const send = useCallback(async () => {
    if (!hasAnswer || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const answers: FeedbackAnswers = {
      overallRating: overall,
      recommendScore: recommend,
      moduleRatings: ratings,
      mostValuable,
      biggestFrustration: frustration,
      featureRequest: request,
      additionalComments: comments,
    };
    try {
      const r = await submitFeedback(
        answers,
        credentialKey ? (JSON.parse(credentialKey) as Credential) : null,
      );
      setReceipt(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      // Told, never swallowed: someone who has just written three paragraphs
      // must know if they did not land.
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [
    hasAnswer,
    submitting,
    overall,
    recommend,
    ratings,
    mostValuable,
    frustration,
    request,
    comments,
    credentialKey,
  ]);

  // Gated on the PERSON, never the workspace. `due` goes false the moment any
  // colleague answers, and using it here turned the form into a locked door for
  // everyone else — in a workspace where many people are meant to respond.
  const answered = context?.prompt?.youAnswered === true;
  const rewardTokens = context?.rewardTokens ?? 100;
  const rewardAvailable = context?.prompt?.rewardAvailable !== false;

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#040B16] text-white">
      <BackgroundFX />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-28 sm:pt-36">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
            <MessageSquareQuote className="h-4 w-4" />
            <span>Your feedback</span>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
            Tell us what&rsquo;s{" "}
            <span className="font-display italic text-[#C89B3C]">working</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
            {context?.workspaceName
              ? `A few minutes from ${context.workspaceName} shapes what we build next.`
              : "A few minutes of your time shapes what we build next."}
          </p>

          {!receipt && rewardAvailable && (
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-[#00A8B5]/40 bg-[#00A8B5]/10 px-5 py-2.5 backdrop-blur-xl">
              <Zap className="h-3.5 w-3.5 text-[#5EDDE8]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {rewardTokens} credits for your workspace on submit
              </span>
            </div>
          )}
        </div>

        {receipt ? (
          <ThankYou receipt={receipt} rewardTokens={rewardTokens} />
        ) : loadError ? (
          <Panel>
            <p className="text-sm text-[#94A3B8]">
              We couldn&rsquo;t load the form just now. Please try again in a moment, or reach us
              from the <Link className="text-[#5EDDE8] underline" to="/contact">contact page</Link>.
            </p>
          </Panel>
        ) : !context ? (
          <Panel>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing your questions…
            </span>
          </Panel>
        ) : !context.identified ? (
          <Panel>
            <h2 className="text-lg font-semibold">Open this from your workspace</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              The questions are tailored to the modules your firm actually uses, and the{" "}
              {rewardTokens} credits are paid into your workspace balance, so this form needs to
              know which workspace you&rsquo;re from. Head back to your dashboard and use the
              feedback prompt there.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-sm border border-[#00A8B5]/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors hover:border-[#00A8B5]"
            >
              Contact us instead <ArrowRight className="h-3 w-3" />
            </Link>
          </Panel>
        ) : answered ? (
          <Panel>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Check className="h-5 w-5 text-[#5EDDE8]" /> You&rsquo;ve already answered this one
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              Thank you. You&rsquo;ve already had your say this round. We&rsquo;ll ask again
              next quarter, and there will be another {rewardTokens} credits in it.
            </p>
          </Panel>
        ) : (
          <div className="mt-14 space-y-10">
            {context.respondent && (
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/70">
                Answering as {context.respondent}
                {context.form.planName ? ` · ${context.form.planName}` : ""}
              </p>
            )}

            <Block
              index="01"
              title="Overall"
              blurb="Start with the whole picture, then we'll get specific."
            >
              <RatingRow
                label="How is Aurixa working for your firm?"
                hint="Everything considered"
                value={overall}
                onChange={setOverall}
              />
              <Nps value={recommend} onChange={setRecommend} />
            </Block>

            {context.form.groups.map((group, gi) => {
              const questions = context.form.questions.filter((q) => q.group === group);
              if (!questions.length) return null;
              return (
                <Block
                  key={group}
                  index={String(gi + 2).padStart(2, "0")}
                  title={group}
                  blurb={
                    gi === 0
                      ? "The parts you're in most days."
                      : `Included with ${context.form.planName ?? "your plan"}.`
                  }
                >
                  {questions.map((q) => (
                    <RatingRow
                      key={q.key}
                      label={q.label}
                      hint={q.hint}
                      value={ratings[q.key] ?? null}
                      onChange={(v) => setRatings((prev) => ({ ...prev, [q.key]: v }))}
                    />
                  ))}
                </Block>
              );
            })}

            <Block
              index={String(context.form.groups.length + 2).padStart(2, "0")}
              title="In your words"
              blurb="Optional, and the part we read first."
            >
              <Written
                label="What's the most valuable thing Aurixa does for you?"
                value={mostValuable}
                onChange={setMostValuable}
                placeholder="The thing you'd miss if it disappeared tomorrow…"
              />
              <Written
                label="What frustrates you most?"
                value={frustration}
                onChange={setFrustration}
                placeholder="Be blunt. This is the one we act on fastest…"
              />
              <Written
                label="What should we build next?"
                value={request}
                onChange={setRequest}
                placeholder="A feature, an integration, a report type…"
              />
              <Written
                label="Anything else?"
                value={comments}
                onChange={setComments}
                placeholder="Optional"
              />
            </Block>

            {submitError && (
              <p className="rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-3 text-sm text-[#F2DFA8]">
                We couldn&rsquo;t save that: {submitError}. Your answers are still on this page, so
                nothing is lost. Please try again.
              </p>
            )}

            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void send()}
                disabled={!hasAnswer || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] px-8 py-4 font-mono text-[12px] font-black uppercase tracking-[0.25em] text-[#040B16] shadow-[0_0_44px_-8px] shadow-[#00A8B5]/70 transition-all hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Submit feedback
                    {rewardAvailable && <> &amp; claim {rewardTokens} credits</>}
                  </>
                )}
              </button>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
                {hasAnswer
                  ? "Every question is optional"
                  : "Answer at least one question to submit"}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ─── pieces ─────────────────────────────────────────────────────────────── */

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0B162C]/40 p-8 text-center backdrop-blur-xl">
      <CornerTicks />
      {children}
    </div>
  );
}

function Block({
  index,
  title,
  blurb,
  children,
}: {
  // No @types/react in this repo, so JSX doesn't strip `key` from props.
  key?: string;
  index: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8">
      <CornerTicks />
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          {index}
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="mt-1.5 text-xs text-[#94A3B8]">{blurb}</p>
      <div className="mt-7 space-y-7">{children}</div>
    </section>
  );
}

/**
 * A 1–5 scale.
 *
 * A radiogroup rather than five buttons, so arrow keys move between options and
 * a screen reader announces it as one question with five answers instead of
 * five unrelated controls. The chosen label is spelled out — "4 · Very good" —
 * because a number alone means different things to different people.
 */
function RatingRow({
  label,
  hint,
  value,
  onChange,
}: {
  key?: string;
  label: string;
  hint: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className="mt-0.5 text-xs text-[#94A3B8]">{hint}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div
          role="radiogroup"
          aria-label={label}
          className="flex items-center gap-1.5"
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = (value ?? 0) + (e.key === "ArrowRight" ? 1 : -1);
            if (next >= 1 && next <= 5) onChange(next);
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = value !== null && n <= value;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === n}
                aria-label={`${n} out of 5, ${RATING_LABELS[n - 1]}`}
                tabIndex={value === n || (value === null && n === 1) ? 0 : -1}
                onClick={() => onChange(n)}
                className={`h-9 w-9 rounded-lg border font-mono text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] ${
                  active
                    ? "border-[#00A8B5]/60 bg-gradient-to-br from-[#00A8B5]/30 to-[#5EDDE8]/15 text-white"
                    : "border-white/10 text-[#94A3B8] hover:border-[#00A8B5]/40 hover:text-white"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <span
          className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-[#5EDDE8]"
          aria-live="polite"
        >
          {value ? RATING_LABELS[value - 1] : ""}
        </span>
      </div>
    </div>
  );
}

/** The 0–10 recommend question, where 0 is a real answer and the most useful one. */
function Nps({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="border-t border-white/[0.07] pt-7">
      <p className="text-sm font-medium leading-snug">
        How likely are you to recommend Aurixa to another firm?
      </p>
      <p className="mt-0.5 text-xs text-[#94A3B8]">0 = not at all · 10 = without hesitation</p>
      <div role="radiogroup" aria-label="Likelihood to recommend" className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 10`}
            tabIndex={value === n || (value === null && n === 0) ? 0 : -1}
            onClick={() => onChange(n)}
            className={`h-9 min-w-9 flex-1 rounded-lg border px-1 font-mono text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] ${
              value === n
                ? "border-[#C89B3C]/60 bg-gradient-to-br from-[#C89B3C]/30 to-[#E9C877]/15 text-white"
                : "border-white/10 text-[#94A3B8] hover:border-[#C89B3C]/40 hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Written({
  label,
  value,
  onChange,
  placeholder,
}: {
  key?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const id = `fb-${label.replace(/[^a-z]/gi, "").slice(0, 24)}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium leading-snug">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        maxLength={4000}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#040B16]/50 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-[#94A3B8]/50 focus-visible:border-[#00A8B5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8]/40"
      />
    </div>
  );
}

/**
 * What happened, said plainly.
 *
 * Three outcomes, and the second is the one worth getting right: a colleague
 * already claimed this campaign's credits. Their answer still counted, and
 * pretending otherwise — or quietly showing nothing — would read as the form
 * having failed.
 */
function ThankYou({
  receipt,
  rewardTokens,
}: {
  receipt: FeedbackReceipt;
  rewardTokens: number;
}) {
  const granted = receipt.creditsGranted > 0;
  const expires = receipt.creditsExpireAt ? new Date(receipt.creditsExpireAt) : null;

  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-[#00A8B5]/45 bg-gradient-to-br from-[#00A8B5]/[0.14] via-[#0B162C]/85 to-[#0B162C]/50 p-8 text-center shadow-[0_36px_90px_-32px] shadow-[#00A8B5]/45 backdrop-blur-xl sm:p-10">
      <CornerTicks />
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00A8B5] to-transparent" />

      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A8B5]/15 text-[#5EDDE8] ring-1 ring-[#00A8B5]/35">
        <Sparkles className="h-6 w-6" />
      </span>

      <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
        Thank you. That&rsquo;s genuinely useful.
      </h2>

      {granted ? (
        <>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#94A3B8]">
            <span className="font-semibold text-white">
              {receipt.creditsGranted.toLocaleString()} credits
            </span>{" "}
            have been added to your workspace balance
            {expires && (
              <>
                {" "}
                and stay spendable until{" "}
                <span className="text-white">
                  {expires.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                </span>
              </>
            )}
            .
          </p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2.5 rounded-full border border-[#00A8B5]/40 bg-[#00A8B5]/10 px-5 py-2.5">
            <Zap className="h-3.5 w-3.5 text-[#5EDDE8]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
              +{receipt.creditsGranted.toLocaleString()} credits
            </span>
          </div>
        </>
      ) : (
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#94A3B8]">
          Your answers are recorded. Someone else in your workspace already claimed this
          round&rsquo;s {rewardTokens.toLocaleString()} credits. The reward is one per workspace,
          not one per person, but every response still gets read.
        </p>
      )}

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
        We&rsquo;ll ask again next quarter
      </p>
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
