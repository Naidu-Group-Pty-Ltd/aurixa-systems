import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy, ExternalLink, LockKeyhole, Mail, RotateCcw } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";
import { ReviewScheduler } from "../components/schedule/ReviewScheduler";
import { StageRail, type Stage } from "../components/schedule/StageRail";
import { StrategicReviewChecking, StrategicReviewLock } from "../components/schedule/StrategicReviewLock";
import { readReadinessHandoff } from "../lib/readinessHandoff";
import { HOST_TIME_ZONE, SESSION_MINUTES } from "../lib/reviewAvailability";
import {
  buildSchedulingFallbackMailto,
  resolveApplicationAccess,
  type StageThreeAccessMode,
  resolveBookingUrl,
} from "../lib/strategicReviewBooking";
import { describeTimeZone, formatLocalTime, isValidTimeZone, readTimeZoneId, type TimeZoneDescriptor } from "../lib/timeZone";
import { verifyStrategicReviewAccess } from "../lib/strategicReviewAccessClient";
import { useRouteMetadata } from "../lib/pageMetadata";
import type { AccessDecision, AccessFailure } from "../lib/strategicReviewAccess";

/**
 * An approved Microsoft Bookings embed URL. When set, the live calendar takes
 * over from the built-in scheduler; validated in `resolveBookingUrl`, so an
 * unset or malformed value simply leaves the scheduler in place.
 */
const CONFIGURED_BOOKINGS_URL = import.meta.env.VITE_BOOKINGS_URL as string | undefined;

const SUPPORT_EMAIL = "admin@aurixasystems.com.au";

/** A calendar that has not painted within this window is treated as unreachable. */
const FRAME_LOAD_TIMEOUT_MS = 20_000;

const CLOCK_TICK_MS = 30_000;

/** Reveal-on-scroll is opt-in so the page is fully legible without it. */
const REVEAL_SUPPORTED = typeof window !== "undefined" && "IntersectionObserver" in window;

type BookingFrameState = "ready" | "loading" | "error" | "unavailable";

const STAGES: readonly Stage[] = [
  { number: "01", name: "Initial Assessment", state: "complete" },
  { number: "02", name: "Business Readiness", state: "complete" },
  { number: "03", name: "Strategic Review", state: "current" },
];

function JourneyStatus() {
  return (
    <div className="journey-status review-hero-sequence">
      <div><p>APPLICATION JOURNEY</p><span>Business Readiness Questionnaire received</span></div>
      <strong>FINAL STAGE ACTIVE</strong>
      <div className="journey-status__line" aria-hidden="true"><i /><i /><i className="is-active" /></div>
    </div>
  );
}

/** Shows the reference the applicant will be asked to quote, with one-tap copy. */
function ApplicationReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be refused; the reference stays selectable on screen.
    }
  };

  return (
    <div className="review-reference review-hero-sequence">
      <p>APPLICATION REFERENCE</p>
      <strong>{reference}</strong>
      {canCopy && (
        <button type="button" onClick={copy} aria-label={`Copy application reference ${reference}`}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      )}
    </div>
  );
}

function SchedulingVisual({ timeZone, localTime }: { timeZone: TimeZoneDescriptor; localTime: string }) {
  const slots = Array.from({ length: 15 }, (_, index) => index);
  return (
    <figure className="schedule-visual review-hero-sequence" aria-labelledby="schedule-visual-caption">
      <span className="technical-corner technical-corner--tl" aria-hidden="true" />
      <span className="technical-corner technical-corner--br" aria-hidden="true" />
      <span className="schedule-coordinate schedule-coordinate--one" aria-hidden="true">X 03.728</span>
      <span className="schedule-coordinate schedule-coordinate--two" aria-hidden="true">Y 18.442</span>
      <div className="schedule-visual__top"><span>AVAILABILITY</span><span>COORDINATION ACTIVE</span></div>
      <div className="schedule-intelligence" aria-hidden="true">
        <div className="schedule-plane schedule-plane--back" />
        <div className="schedule-plane">
          <div className="schedule-plane__header"><span>REVIEW WINDOW</span><b>LOCAL TIME</b></div>
          <div className="schedule-plane__slots">
            {slots.map((slot) => <i key={slot} className={slot === 7 ? "is-selected" : slot % 4 === 0 ? "is-muted" : ""}>{slot === 7 && <span>SELECTED SLOT</span>}</i>)}
          </div>
          <span className="schedule-plane__scan" />
        </div>
        <svg className="schedule-orbits" viewBox="0 0 520 360">
          <ellipse cx="282" cy="184" rx="196" ry="116" />
          <ellipse className="schedule-orbits__ring" cx="282" cy="184" rx="145" ry="145" />
          <path d="M46 276 C132 276 145 184 227 184 S351 91 466 91" />
          <circle cx="46" cy="276" r="4" /><circle cx="466" cy="91" r="5" />
        </svg>
        <div className="schedule-core"><span /><i /><b>03</b></div>
        <div className="schedule-agent schedule-agent--applicant"><i />APPLICANT</div>
        <div className="schedule-agent schedule-agent--aurixa"><i />AURIXA</div>
        <div className="schedule-timezone">
          <span>YOUR TIME ZONE</span>
          <b>{timeZone.offsetLabel}</b>
          <em>{timeZone.shortLabel}{localTime && ` · ${localTime}`}</em>
          <i />
        </div>
      </div>
      <div className="schedule-visual__status"><span /> FINAL STAGE <b>PATHWAY READY</b></div>
      <figcaption id="schedule-visual-caption">COORDINATED REVIEW SCHEDULING</figcaption>
    </figure>
  );
}

function InfoGroup({ index, label, value, children }: { index: string; label: string; value: string; children: string }) {
  return (
    <div className="review-info-group">
      <span>{index}</span>
      <div><p>{label}</p><strong>{value}</strong><div>{children}</div></div>
      <i aria-hidden="true" />
    </div>
  );
}

function ReviewPreparationPanel({ timeZone }: { timeZone: TimeZoneDescriptor }) {
  const topics = [
    "Your current operational environment",
    "Priority workflow and visibility requirements",
    "Areas identified through the Business Readiness Questionnaire",
    "Platform suitability and implementation considerations",
    "Recommended next steps",
  ];
  return (
    <section className="review-preparation review-reveal" data-reveal aria-labelledby="review-preparation-heading">
      <p className="review-eyebrow">YOUR STRATEGIC REVIEW</p>
      <h2 id="review-preparation-heading">A Focused Conversation About What Comes Next.</h2>
      <p className="review-copy">This session gives the Aurixa team an opportunity to understand your current environment, clarify the priorities identified through your questionnaire and discuss how Aurixa may support your organisation.</p>
      <div className="review-info-list">
        <InfoGroup index="01" label="SESSION FORMAT" value="Online strategic review">Meeting access details will be included with the booking confirmation.</InfoGroup>
        <InfoGroup index="02" label="EXPECTED DURATION" value={`${SESSION_MINUTES} minutes`}>A focused discussion structured around your organisation and operational priorities.</InfoGroup>
        <InfoGroup index="03" label="TIME ZONE" value={`${timeZone.label} (${timeZone.offsetLabel})`}>
          Detected from your device. Every time on this page is shown in this zone, and you can change it above the calendar.
        </InfoGroup>
      </div>
      <div className="review-topics">
        <p>WHAT WE WILL COVER</p>
        <ol>{topics.map((topic, index) => <li key={topic}><span>0{index + 1}</span><strong>{topic}</strong><i aria-hidden="true" /></li>)}</ol>
      </div>
    </section>
  );
}

function BookingActions({
  bookingUrl,
  mailto,
  onRetry,
}: {
  bookingUrl?: string | null;
  mailto: string;
  onRetry?: () => void;
}) {
  return (
    <div className="booking-actions">
      {onRetry && (
        <button type="button" className="booking-action booking-action--primary" onClick={onRetry}>
          <RotateCcw aria-hidden="true" /> TRY AGAIN
        </button>
      )}
      {bookingUrl && (
        <a className="booking-action" href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true" /> OPEN CALENDAR IN A NEW TAB
        </a>
      )}
      <a className="booking-action" href={mailto}>
        <Mail aria-hidden="true" /> REQUEST A TIME BY EMAIL
      </a>
    </div>
  );
}

/** Shown while the calendar itself is still painting, so the frame is never blank. */
function BookingSkeleton() {
  return (
    <div className="booking-skeleton" aria-hidden="true">
      <div className="booking-skeleton__bar" />
      <div className="booking-skeleton__grid">{Array.from({ length: 28 }, (_, index) => <i key={index} />)}</div>
      <div className="booking-skeleton__rail"><i /><i /><i /></div>
    </div>
  );
}

/**
 * Owns the Microsoft Bookings frame and its lifecycle. The iframe is remounted
 * per attempt so "try again" genuinely reloads it, and a load that never
 * resolves falls through to a recoverable error.
 */
function BookingIntegrationFrame({
  url,
  state,
  attempt,
  mailto,
  onLoad,
  onError,
  onRetry,
}: {
  url: string;
  state: BookingFrameState;
  attempt: number;
  mailto: string;
  onLoad: () => void;
  onError: () => void;
  onRetry: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * An iframe also fires `load` for the `about:blank` document it holds before
   * the real request commits, which would end the loading state too early.
   * A cross-origin document is the signal that something committed: reading its
   * location throws, whereas `about:blank` reads back cleanly.
   *
   * A browser error page is cross-origin too, so a frame that is refused rather
   * than served still reads as loaded — which is why the panel keeps the
   * "open in a new tab / email us" fallback visible alongside a live calendar.
   */
  const handleLoad = () => {
    try {
      const href = frameRef.current?.contentWindow?.location.href;
      if (href === undefined || href === "about:blank") return;
    } catch {
      // Cross-origin — the calendar document is in.
    }
    onLoad();
  };

  if (state === "error") {
    return (
      <div className="booking-frame booking-frame--message">
        <strong>The booking calendar could not be loaded.</strong>
        <span>This is usually a temporary connection issue. Try again, open the calendar in a new tab, or send your preferred times.</span>
        <BookingActions bookingUrl={url} mailto={mailto} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={`booking-frame ${state === "loading" ? "is-loading" : "is-ready"}`}>
      {state === "loading" && <BookingSkeleton />}
      <iframe
        key={attempt}
        ref={frameRef}
        src={url}
        title="Schedule an Aurixa strategic review"
        onLoad={handleLoad}
        onError={onError}
        allow="fullscreen"
      />
    </div>
  );
}

function BookingsEmbedPanel({ url, mailto }: { url: string; mailto: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BookingFrameState>("loading");

  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => setState("error"), FRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state, attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
    setState("loading");
  }, []);

  const status =
    state === "loading" ? "Loading the booking calendar."
    : state === "ready" ? "Booking calendar loaded. Select an available appointment time."
    : "The booking calendar could not be loaded. Alternative options are available.";

  return (
    <>
      <BookingIntegrationFrame
        url={url}
        state={state}
        attempt={attempt}
        mailto={mailto}
        onLoad={() => setState((current) => (current === "loading" ? "ready" : current))}
        onError={() => setState("error")}
        onRetry={retry}
      />
      <p className="booking-live" role="status" aria-live="polite">{status}</p>
      {state !== "error" && (
        <p className="booking-fallback">
          Calendar not displaying correctly?{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">Open it in a new tab</a>{" "}
          or <a href={mailto}>send your preferred times</a>.
        </p>
      )}
    </>
  );
}

function StrategicReviewBookingPanel({
  bookingUrl,
  timeZone,
  onTimeZoneChange,
  zone,
  reference,
  accessMode,
  prefill,
  buildMailto,
}: {
  bookingUrl: string | null;
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  zone: TimeZoneDescriptor;
  reference: string;
  accessMode: StageThreeAccessMode;
  prefill: { fullName: string; workEmail: string; organisation: string };
  buildMailto: (requestedTime?: string) => string;
}) {
  return (
    <section className="review-booking review-reveal" data-reveal aria-labelledby="review-booking-heading">
      <div className="review-booking__header">
        <div>
          <p className="review-eyebrow">SELECT A TIME</p>
          <h2 id="review-booking-heading">Choose a Suitable Appointment.</h2>
          <p className="review-copy">
            Pick a date, then a time that suits you. Availability is shown in {zone.label} ({zone.offsetLabel}),
            detected from your device and adjustable above the calendar.
          </p>
        </div>
        <span>CAL / 03</span>
      </div>
      <div id="booking-calendar" tabIndex={-1} className="review-booking__anchor">
        {bookingUrl ? (
          <BookingsEmbedPanel url={bookingUrl} mailto={buildMailto()} />
        ) : (
          <ReviewScheduler
            timeZone={timeZone}
            onTimeZoneChange={onTimeZoneChange}
            applicationReference={reference}
            accessMode={accessMode}
            prefill={prefill}
            supportEmail={SUPPORT_EMAIL}
            buildFallbackMailto={buildMailto}
          />
        )}
      </div>
      <div className="booking-context">
        <span>TIME-ZONE CONTEXT <b>{zone.offsetLabel} · {zone.shortLabel}</b></span>
        <span><LockKeyhole aria-hidden="true" /> SECURE SCHEDULING ENVIRONMENT</span>
      </div>
    </section>
  );
}

function TransitionRail() {
  return <div className="review-transition" aria-hidden="true"><span>STAGE 03</span><i><b /></i><span>STRATEGIC REVIEW</span><i /><span>FINAL APPLICATION STEP</span></div>;
}

function SupportRail({ mailto }: { mailto: string }) {
  return (
    <aside className="review-support review-reveal" data-reveal aria-labelledby="review-support-heading">
      <span className="review-support__signal" aria-hidden="true"><i /></span>
      <div><p>APPLICATION SUPPORT</p><h2 id="review-support-heading">Need Assistance Scheduling?</h2></div>
      <p>If no listed time suits you, or you need help with the scheduling process, the Aurixa team will arrange a time with you directly.</p>
      <div className="review-support__actions">
        <a href={mailto}><Mail aria-hidden="true" /> EMAIL THE TEAM</a>
        <Link to="/contact">CONTACT AURIXA <ArrowUpRight aria-hidden="true" /></Link>
      </div>
    </aside>
  );
}

/**
 * `checking` until the server has ruled on the reference this visit arrived
 * with. The scheduler only ever renders under `granted`.
 */
type AccessPhase = "checking" | "granted" | "locked";

export default function ScheduleStrategicReview() {
  const [phase, setPhase] = useState<AccessPhase>("checking");
  const [failure, setFailure] = useState<AccessFailure>("missing_reference");
  const [reference, setReference] = useState("");
  const [accessMode, setAccessMode] = useState<StageThreeAccessMode>("Direct visit");
  // The address this visit started on. Held because the effect below rewrites
  // the visible URL, and the reference has to be read from the original.
  const arrivalHref = useRef(typeof window === "undefined" ? "" : window.location.href);
  /**
   * The reference the link carried, kept only to prefill the locked form when
   * the server refuses it — so the applicant can see what was tried and fix a
   * typo rather than being told "no" against an empty box.
   */
  const lockPrefill = useRef("");
  const [prefill, setPrefill] = useState({ fullName: "", workEmail: "", organisation: "" });
  const [timeZone, setTimeZone] = useState(() => readTimeZoneId() || HOST_TIME_ZONE);
  const [tick, setTick] = useState(() => Date.now());
  /** Set once the applicant picks a zone, so auto-detection stops overriding it. */
  const zoneChosen = useRef(false);

  /**
   * Opens the page for a reference the server has just accepted.
   *
   * Everything the applicant sees about themselves comes from this verdict, not
   * from the link: the name and organisation shown on the booking form are the
   * ones Aurixa holds, so a doctored URL cannot put words in anybody's mouth.
   */
  const grant = useCallback((decision: AccessDecision, mode: StageThreeAccessMode) => {
    const applicant = decision.applicant;
    if (!decision.granted || !applicant) return false;
    setReference(applicant.applicationId);
    setAccessMode(mode);
    setPrefill({
      fullName: [applicant.firstName, applicant.lastName].filter(Boolean).join(" "),
      workEmail: applicant.workEmail,
      organisation: applicant.organisationName,
    });
    setPhase("granted");
    return true;
  }, []);

  /** The locked screen's way in: the applicant types the reference themselves. */
  const unlock = useCallback(
    async (typed: string): Promise<AccessFailure | null> => {
      const decision = await verifyStrategicReviewAccess(typed);
      if (grant(decision, "Manual entry")) return null;
      return decision.reason ?? "unverified";
    },
    [grant],
  );

  // Admission. A reference in the link, or one already accepted in this tab, is
  // only ever a claim — it is checked against Aurixa's records before any of
  // this page renders, and the page stays locked until that check says yes.
  useEffect(() => {
    let cancelled = false;

    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }

    // Read the address as it first arrived, not as it stands now: this effect
    // strips `ref` from the visible URL, so re-running against the live address
    // would see only the stored copy and report the arrival as a same-session
    // handoff instead of the Application ID link it actually was.
    const url = new URL(arrivalHref.current);
    const access = resolveApplicationAccess(url, storage);

    if (url.searchParams.has("ref")) {
      url.searchParams.delete("ref");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    // The Stage 2 handoff can supply a reference this tab has not stored yet.
    // It is a claim like any other and gets checked the same way.
    const handoff = readReadinessHandoff();
    const claimed = access.reference || (handoff?.applicationId ?? "");
    const mode: StageThreeAccessMode = access.reference ? access.accessMode : "Same-session handoff";
    lockPrefill.current = claimed;

    if (!claimed) {
      setPhase("locked");
      setFailure("missing_reference");
      return;
    }

    void verifyStrategicReviewAccess(claimed).then((decision) => {
      if (cancelled) return;
      if (grant(decision, mode)) return;
      setPhase("locked");
      setFailure(decision.reason === "unavailable" ? "unavailable" : "unverified");
    });

    return () => {
      cancelled = true;
    };
  }, [grant]);

  // Keep the stated time zone and clock honest across long visits and travel.
  useEffect(() => {
    const refresh = () => {
      setTick(Date.now());
      // Follow the device only while the applicant has not picked a zone.
      if (zoneChosen.current) return;
      const detected = readTimeZoneId();
      setTimeZone((current) => (detected && detected !== current ? detected : current));
    };
    const interval = setInterval(refresh, CLOCK_TICK_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  // Stage 3 is reached from the Stage 2 completion screen, never from search.
  // `indexable: false` in the registry is what emits `noindex, nofollow` here.
  useRouteMetadata("/schedule-strategic-review");

  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = REVEAL_SUPPORTED
      ? new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer?.unobserve(entry.target); } }), { threshold: 0.12 })
      : null;
    elements.forEach((element) => observer?.observe(element));
    const onVisibility = () => document.documentElement.classList.toggle("review-page-paused", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", onVisibility); document.documentElement.classList.remove("review-page-paused"); };
  }, []);

  const zone = useMemo(() => describeTimeZone(new Date(tick), timeZone), [tick, timeZone]);
  const localTime = useMemo(() => formatLocalTime(new Date(tick), timeZone), [tick, timeZone]);

  const bookingUrl = useMemo(
    () => resolveBookingUrl(CONFIGURED_BOOKINGS_URL, { name: prefill.fullName, email: prefill.workEmail }),
    [prefill.fullName, prefill.workEmail],
  );

  const buildMailto = useCallback(
    (requestedTime?: string) =>
      buildSchedulingFallbackMailto({ address: SUPPORT_EMAIL, reference, timeZone: zone, requestedTime }),
    [reference, zone],
  );

  const selectTimeZone = useCallback((next: string) => {
    if (!isValidTimeZone(next)) return;
    zoneChosen.current = true;
    setTimeZone(next);
  }, []);

  // Nothing about a real application is rendered until the server has said yes:
  // no name, no organisation, no reference, no calendar. The locked screen is
  // the whole page, not an overlay over one.
  if (phase !== "granted") {
    return (
      <div className="strategic-review-page">
        <div className="strategic-review-bg" aria-hidden="true"><HeroBackground variant="about" /><span className="review-light-field" /></div>
        <div className="review-container">
          {phase === "checking" ? (
            <StrategicReviewChecking />
          ) : (
            <StrategicReviewLock
              onUnlock={unlock}
              initialFailure={failure}
              initialReference={lockPrefill.current}
              supportEmail={SUPPORT_EMAIL}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`strategic-review-page${REVEAL_SUPPORTED ? " is-armed" : ""}`}>
      <a className="review-skip-link" href="#booking-calendar">Skip to the booking calendar</a>
      <div className="strategic-review-bg" aria-hidden="true"><HeroBackground variant="about" /><span className="review-light-field" /></div>
      <div className="review-container">
        <div className="review-reveal" data-reveal>
          <StageRail stages={STAGES} />
        </div>
        <header className="review-hero">
          <div className="review-hero__copy">
            <div className="review-eyebrow-line review-hero-sequence"><span />STAGE 03 · STRATEGIC REVIEW</div>
            <h1 className="review-hero-sequence">Schedule Your Strategic Review.</h1>
            <p className="review-hero-sequence">Your Business Readiness Questionnaire has been received. Select a suitable time to meet with the Aurixa team and review your operational priorities, platform requirements and the next steps in your Aurixa journey.</p>
            <div className="review-final-status review-hero-sequence"><span aria-hidden="true" /> FINAL STAGE</div>
            <JourneyStatus />
            {reference && <ApplicationReference reference={reference} />}
          </div>
          <SchedulingVisual timeZone={zone} localTime={localTime} />
        </header>
        <TransitionRail />
        <main className="review-workspace review-reveal" data-reveal>
          <span className="technical-corner technical-corner--tl" aria-hidden="true" /><span className="technical-corner technical-corner--br" aria-hidden="true" />
          <span className="review-workspace__coordinate" aria-hidden="true">FRAME / STRATEGIC REVIEW / 03</span>
          <ReviewPreparationPanel timeZone={zone} />
          <StrategicReviewBookingPanel
            bookingUrl={bookingUrl}
            timeZone={timeZone}
            onTimeZoneChange={selectTimeZone}
            zone={zone}
            reference={reference}
            accessMode={accessMode}
            prefill={prefill}
            buildMailto={buildMailto}
          />
        </main>
        <SupportRail mailto={buildMailto()} />
      </div>
    </div>
  );
}
