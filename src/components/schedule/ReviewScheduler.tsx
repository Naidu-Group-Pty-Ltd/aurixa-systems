import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe2,
  Loader2,
  Mail,
  RotateCcw,
  Video,
} from "lucide-react";
import {
  BOOKING_HORIZON_DAYS,
  HOST_TIME_ZONE,
  SESSION_MINUTES,
  SUGGESTED_TIME_ZONES,
  buildMonthMatrix,
  crossesDateBoundary,
  firstAvailableDay,
  formatDayLabel,
  formatMonthLabel,
  formatSlotRange,
  formatSlotTime,
  generateReviewSlots,
  groupSlotsByDay,
  parseDayKey,
  shiftDayKey,
} from "../../lib/reviewAvailability";
import {
  EMPTY_BOOKING_DETAILS,
  buildBookingPayload,
  buildReviewIcs,
  icsFileName,
  validateBookingDetails,
  type BookingDetailErrors,
  type BookingDetails,
} from "../../lib/reviewBooking";
import { announceConfirmedBooking, submitBookingRequest } from "../../lib/reviewBookingClient";
import {
  rememberAnnounced,
  shouldAnnounce,
  type CalendarBookingOutcome,
  type CalendarUnavailableReason,
  type ReviewBookingView,
} from "../../lib/reviewCalendar";
import { bookReviewInCalendar, loadReviewAvailability } from "../../lib/reviewCalendarClient";
import { describeTimeZone, isValidTimeZone, toDayKey } from "../../lib/timeZone";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Availability is re-read on this cadence so the lead time, and the calendar, stay honest. */
const AVAILABILITY_REFRESH_MS = 5 * 60_000;

type Phase = "selecting" | "details" | "submitting" | "confirmed" | "failed";

/**
 * Where the times come from. `live` is Mission Control's calendar (Cal.com),
 * where choosing a time books it. `legacy` is the published review window,
 * where choosing a time requests it; it is used only where Mission Control
 * says there is no live calendar. An outage is `unavailable` — never quietly
 * turned into `legacy`, because the request form cannot see the calendar and
 * would offer a time somebody else already holds.
 */
type CalendarState =
  | { status: "loading" }
  | { status: "live"; slots: number[] }
  | { status: "legacy" }
  | { status: "unavailable"; reason: CalendarUnavailableReason };

/** What the confirmed view shows. */
type Confirmation =
  | { mode: "request"; slot: number }
  | {
      mode: "calendar";
      /** `kept`: they chose to keep the review they already held. */
      outcome: "booked" | "already_booked" | "rescheduled" | "kept";
      booking: ReviewBookingView;
      previous: ReviewBookingView | null;
    };

/** Why the last attempt did not book, in the terms the applicant needs. */
type Failure =
  | { kind: "request" }
  | { kind: "refused" }
  | { kind: "calendar"; reason: CalendarUnavailableReason; existing: ReviewBookingView | null };

const FIELD_ERRORS: Record<string, { field: keyof BookingDetails; message: string }> = {
  email: { field: "workEmail", message: "Enter a valid email address - the invitation is sent there." },
  name: { field: "fullName", message: "Enter the name the review should be booked under." },
  phone: { field: "phone", message: "Enter a shorter phone number, or leave it blank." },
  organisation: { field: "organisation", message: "Organisation name is too long." },
  notes: { field: "notes", message: "Please keep context under 2000 characters." },
};

export type ReviewSchedulerProps = {
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  applicationReference: string;
  /** How the applicant reached the scheduler; recorded with the booking. */
  accessMode: string;
  prefill: { fullName: string; workEmail: string; organisation: string };
  supportEmail: string;
  /** Mailto fallback, given the currently selected time. */
  buildFallbackMailto: (requestedTime: string) => string;
};

/** The zone picker: the detected zone first, then the zones Aurixa commonly meets in. */
function useZoneOptions(timeZone: string) {
  return useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; offset: string }[] = [];
    const add = (id: string, label: string) => {
      if (!id || seen.has(id) || !isValidTimeZone(id)) return;
      seen.add(id);
      options.push({ id, label, offset: describeTimeZone(new Date(), id).offsetLabel });
    };
    add(timeZone, `${timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone} (detected)`);
    for (const zone of SUGGESTED_TIME_ZONES) add(zone.id, zone.label);
    return options;
  }, [timeZone]);
}

/** A booking's time, e.g. `Friday 7 August 2026, 9:00 am – 9:30 am`, in `timeZone`. */
function bookingLabel(booking: ReviewBookingView, timeZone: string): string {
  const start = Date.parse(booking.start);
  return `${formatDayLabel(toDayKey(new Date(start), timeZone))}, ${formatSlotRange(start, timeZone)}`;
}

/** Session storage, where the browser allows it. */
function sessionStore(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function ReviewScheduler({
  timeZone,
  onTimeZoneChange,
  applicationReference,
  accessMode,
  prefill,
  supportEmail,
  buildFallbackMailto,
}: ReviewSchedulerProps) {
  const [now, setNow] = useState(() => new Date());
  const [calendar, setCalendar] = useState<CalendarState>({ status: "loading" });
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parts = toDayKey(new Date(), timeZone).split("-");
    return { year: Number(parts[0]), month: Number(parts[1]) };
  });
  const [details, setDetails] = useState<BookingDetails>(EMPTY_BOOKING_DETAILS);
  const [errors, setErrors] = useState<BookingDetailErrors>({});
  const [phase, setPhase] = useState<Phase>("selecting");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  /** Shown above the calendar: a time that was taken, or a move in progress. */
  const [notice, setNotice] = useState("");
  /** The review they already hold, when the calendar refused to book a second. */
  const [held, setHeld] = useState<ReviewBookingView | null>(null);
  /** Set while they are choosing a new time for the review they hold. */
  const [moveFrom, setMoveFrom] = useState<ReviewBookingView | null>(null);
  const [focusedDay, setFocusedDay] = useState("");
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const confirmedRef = useRef<HTMLDivElement | null>(null);
  const heldRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusDay = useRef(false);
  const mounted = useRef(true);
  const loadSequence = useRef(0);
  const calendarRef = useRef(calendar);
  const phaseRef = useRef(phase);

  useEffect(() => {
    calendarRef.current = calendar;
  }, [calendar]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Reads the calendar. A quiet read keeps the times already on screen when it
   * fails — a refresh that could not reach the calendar is not a reason to take
   * away times the applicant may be choosing between; the booking itself is
   * checked against the calendar anyway.
   */
  const loadCalendar = useCallback(async (quiet = false) => {
    const sequence = ++loadSequence.current;
    if (!quiet) setCalendar({ status: "loading" });
    const result = await loadReviewAvailability();
    if (!mounted.current || sequence !== loadSequence.current) return;
    setNow(new Date());
    if (result.mode === "live") setCalendar({ status: "live", slots: result.slots });
    else if (result.mode === "legacy") setCalendar({ status: "legacy" });
    else
      setCalendar((current) =>
        quiet && current.status === "live" ? current : { status: "unavailable", reason: result.reason },
      );
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      // Only while they are browsing. Once a time is chosen, a fresh read can
      // no longer help: mid-booking it sees the chosen time as taken — by this
      // very booking — and would take it off the page along with the form, and
      // after a lost answer it would remove the "try again" that gets the
      // calendar's own reply. A booking is checked against the calendar anyway.
      if (calendarRef.current.status === "live" && phaseRef.current === "selecting") void loadCalendar(true);
    }, AVAILABILITY_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadCalendar]);

  useEffect(() => {
    setDetails((current) => ({
      ...current,
      fullName: current.fullName || prefill.fullName,
      workEmail: current.workEmail || prefill.workEmail,
      organisation: current.organisation || prefill.organisation,
    }));
  }, [prefill.fullName, prefill.workEmail, prefill.organisation]);

  const live = calendar.status === "live";
  const slots = useMemo(() => {
    if (calendar.status === "live") return calendar.slots.filter((slot) => slot > now.getTime());
    if (calendar.status === "legacy") return generateReviewSlots(now);
    return [];
  }, [calendar, now]);
  const byDay = useMemo(() => groupSlotsByDay(slots, timeZone), [slots, timeZone]);

  const todayKey = toDayKey(now, timeZone);
  const horizonKey = toDayKey(new Date(now.getTime() + BOOKING_HORIZON_DAYS * 86_400_000), timeZone);

  // Keep a valid day selected as availability, or the applicant's zone, changes.
  useEffect(() => {
    setSelectedDay((current) => {
      if (current && (byDay.get(current)?.length ?? 0) > 0) return current;
      return firstAvailableDay(byDay, current || todayKey);
    });
  }, [byDay, todayKey]);

  useEffect(() => {
    if (!selectedDay) return;
    const parsed = parseDayKey(selectedDay);
    if (!parsed) return;
    setVisibleMonth((current) =>
      current.year === parsed.year && current.month === parsed.month ? current : { year: parsed.year, month: parsed.month },
    );
  }, [selectedDay]);

  // A slot belongs to the day it was chosen on; clear it when that changes, or
  // when a fresh read of the calendar no longer offers it.
  useEffect(() => {
    setSelectedSlot((current) =>
      current !== null && (byDay.get(selectedDay) ?? []).includes(current) ? current : null,
    );
  }, [selectedDay, byDay]);

  // The keyboard cursor follows the selection unless the applicant moved it.
  useEffect(() => {
    setFocusedDay((current) => (current ? current : selectedDay));
  }, [selectedDay]);

  useEffect(() => {
    if (!shouldFocusDay.current) return;
    shouldFocusDay.current = false;
    dayRefs.current.get(focusedDay)?.focus();
  }, [focusedDay]);

  const daySlots = byDay.get(selectedDay) ?? [];
  const matrix = useMemo(() => buildMonthMatrix(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const zoneOptions = useZoneOptions(timeZone);
  const zone = useMemo(() => describeTimeZone(new Date(selectedSlot ?? Date.now()), timeZone), [timeZone, selectedSlot]);

  const monthStartKey = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-01`;
  const monthEndKey = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-31`;
  const monthHasEarlier = useMemo(() => firstAvailableDay(byDay) < monthStartKey, [byDay, monthStartKey]);
  const monthHasLater = horizonKey > monthEndKey;

  /** Exactly one cell is tabbable, and it is always one the grid can focus. */
  const tabbableDay = useMemo(() => {
    const keys = matrix.flat().map((cell) => cell.key);
    if (keys.includes(focusedDay)) return focusedDay;
    if (keys.includes(selectedDay)) return selectedDay;
    const inMonth = matrix.flat().filter((cell) => cell.inMonth);
    return inMonth.find((cell) => (byDay.get(cell.key)?.length ?? 0) > 0)?.key ?? inMonth[0]?.key ?? "";
  }, [matrix, focusedDay, selectedDay, byDay]);

  const step = useCallback(
    (months: number) => {
      setVisibleMonth((current) => {
        const index = current.year * 12 + (current.month - 1) + months;
        return { year: Math.floor(index / 12), month: (index % 12) + 1 };
      });
    },
    [],
  );

  const selectDay = useCallback((key: string) => {
    setSelectedDay(key);
    setFocusedDay(key);
    const parsed = parseDayKey(key);
    if (parsed) setVisibleMonth({ year: parsed.year, month: parsed.month });
  }, []);

  /** Arrow-key roving focus across the month grid, as a date picker should. */
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target = "";

    if (event.key in moves) target = shiftDayKey(key, moves[event.key]);
    else if (event.key === "PageUp") target = shiftDayKey(key, -28);
    else if (event.key === "PageDown") target = shiftDayKey(key, 28);
    else if (event.key === "Home") target = firstAvailableDay(byDay, todayKey);
    else if (event.key === "End") target = [...byDay.keys()].sort().pop() ?? key;
    else return;

    event.preventDefault();
    if (!target || target < todayKey || target > horizonKey) return;
    shouldFocusDay.current = true;
    setFocusedDay(target);
    const parsed = parseDayKey(target);
    if (parsed) setVisibleMonth({ year: parsed.year, month: parsed.month });
  };

  const chooseSlot = (slot: number) => {
    setSelectedSlot(slot);
    setHeld(null);
    setFailure(null);
    setPhase("details");
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  /** Move the reader to the outcome rather than leaving them on a gone form. */
  const showConfirmation = (next: Confirmation) => {
    setConfirmation(next);
    setHeld(null);
    setMoveFrom(null);
    setNotice("");
    setFailure(null);
    setPhase("confirmed");
    window.requestAnimationFrame(() => {
      confirmedRef.current?.focus();
      confirmedRef.current?.scrollIntoView({ block: "nearest" });
    });
  };

  /**
   * Sends a booking the calendar confirmed down the Stage 3 scenario, which
   * records it and sends the branded confirmation. The page does not wait for
   * it: the booking and its invitation already stand.
   */
  const announce = (outcome: CalendarBookingOutcome, previous: ReviewBookingView | null) => {
    if (outcome.kind !== "booked" && outcome.kind !== "already_booked" && outcome.kind !== "rescheduled") return;
    const storage = sessionStore();
    if (!shouldAnnounce(outcome, storage)) return;
    const payload = buildBookingPayload({
      slot: Date.parse(outcome.booking.start),
      details,
      applicantTimeZone: timeZone,
      applicationReference,
      accessMode,
      confirmed: {
        uid: outcome.booking.uid,
        meetingUrl: outcome.booking.meetingUrl,
        previousStart: previous?.start ?? null,
      },
    });
    void announceConfirmedBooking(payload).then((result) => {
      if (result.ok) rememberAnnounced(storage, outcome.booking);
    });
  };

  /** The request form: used only where there is no live calendar. */
  const submitRequest = async (slot: number) => {
    const result = await submitBookingRequest({
      slot,
      details,
      applicantTimeZone: timeZone,
      applicationReference,
      accessMode,
    });
    if (!mounted.current) return;
    if (result.ok) showConfirmation({ mode: "request", slot });
    else {
      setFailure({ kind: "request" });
      setPhase("failed");
    }
  };

  const book = async (slot: number, rescheduleExisting: boolean) => {
    setPhase("submitting");
    setFailure(null);
    const outcome = await bookReviewInCalendar({
      applicationId: applicationReference,
      start: slot,
      timeZone,
      details,
      rescheduleExisting,
    });
    if (!mounted.current) return;

    switch (outcome.kind) {
      case "booked":
      case "already_booked": {
        showConfirmation({ mode: "calendar", outcome: outcome.kind, booking: outcome.booking, previous: null });
        announce(outcome, null);
        return;
      }
      case "rescheduled": {
        const previous = outcome.previous ?? moveFrom ?? held;
        showConfirmation({ mode: "calendar", outcome: "rescheduled", booking: outcome.booking, previous });
        announce(outcome, previous);
        return;
      }
      case "held":
        // Nothing changed. They decide whether the review they hold moves.
        setHeld(outcome.existing);
        setPhase("details");
        window.requestAnimationFrame(() => heldRef.current?.focus());
        return;
      case "slot_taken":
        setNotice(
          outcome.existing
            ? `That time was taken just before you chose it, so your review stays booked for ${bookingLabel(outcome.existing, timeZone)}. Choose another highlighted time to move it.`
            : "That time was taken just before you booked it. Choose another highlighted time.",
        );
        if (outcome.existing) setMoveFrom(outcome.existing);
        setHeld(null);
        setSelectedSlot(null);
        setPhase("selecting");
        void loadCalendar(true);
        return;
      case "invalid": {
        const mapped = outcome.field ? FIELD_ERRORS[outcome.field] : undefined;
        if (mapped) {
          setErrors({ [mapped.field]: mapped.message });
          setPhase("details");
          window.requestAnimationFrame(() =>
            detailsRef.current?.querySelector<HTMLElement>(`[name="${mapped.field}"]`)?.focus(),
          );
          return;
        }
        setFailure({ kind: "calendar", reason: "invalid_response", existing: null });
        setPhase("failed");
        return;
      }
      case "refused":
        setFailure({ kind: "refused" });
        setPhase("failed");
        return;
      case "not_configured":
        // The live calendar has gone away since the page loaded: request the
        // time the way the page did before there was one.
        setCalendar({ status: "legacy" });
        await submitRequest(slot);
        return;
      case "unavailable":
        setFailure({ kind: "calendar", reason: outcome.reason, existing: outcome.existing });
        setPhase("failed");
        return;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedSlot === null) return;

    const found = validateBookingDetails(details);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = Object.keys(found)[0];
      detailsRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    if (live) {
      await book(selectedSlot, moveFrom !== null);
      return;
    }
    setPhase("submitting");
    await submitRequest(selectedSlot);
  };

  /** They said yes to moving the review they hold to the time they chose. */
  const confirmMove = () => {
    if (selectedSlot === null || !held) return;
    setMoveFrom(held);
    void book(selectedSlot, true);
  };

  /** They would rather keep the review they already hold. */
  const keepExisting = (booking: ReviewBookingView) => {
    showConfirmation({ mode: "calendar", outcome: "kept", booking, previous: null });
  };

  /** From the confirmed view: choose a new time for the review they hold. */
  const startMove = (booking: ReviewBookingView) => {
    setMoveFrom(booking);
    setConfirmation(null);
    setSelectedSlot(null);
    setHeld(null);
    setFailure(null);
    setNotice(`Choose a new time. Your review stays booked for ${bookingLabel(booking, timeZone)} until the move is confirmed.`);
    setPhase("selecting");
    void loadCalendar(true);
  };

  const downloadIcs = (slot: number) => {
    const ics = buildReviewIcs({
      slot,
      organiserEmail: supportEmail,
      attendeeName: details.fullName.trim(),
      attendeeEmail: details.workEmail.trim(),
      applicationReference,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = icsFileName(slot, timeZone);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const restart = () => {
    setPhase("selecting");
    setConfirmation(null);
    setSelectedSlot(null);
  };

  const selectedLabel =
    selectedSlot !== null
      ? `${formatDayLabel(toDayKey(new Date(selectedSlot), timeZone))}, ${formatSlotRange(selectedSlot, timeZone)}`
      : "";

  if (phase === "confirmed" && confirmation?.mode === "request") {
    const confirmedSlot = confirmation.slot;
    return (
      <div className="scheduler scheduler--confirmed" role="status" aria-live="polite" tabIndex={-1} ref={confirmedRef}>
        <span className="scheduler-confirmed__mark" aria-hidden="true"><Check /></span>
        <p className="scheduler-eyebrow">TIME REQUESTED</p>
        <h3>We have your preferred time.</h3>
        <p className="scheduler-confirmed__lead">
          The Aurixa team will confirm this session by email, usually within one business day. Add it to your
          calendar now so the slot is held in your own schedule.
        </p>
        <dl className="scheduler-confirmed__facts">
          <div>
            <dt>Requested time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(confirmedSlot), timeZone))}<span>{formatSlotRange(confirmedSlot, timeZone)} · {zone.label} ({zone.offsetLabel})</span></dd>
          </div>
          <div>
            <dt>Aurixa time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(confirmedSlot), HOST_TIME_ZONE))}<span>{formatSlotRange(confirmedSlot, HOST_TIME_ZONE)} · {HOST_TIME_ZONE.replace("_", " ")}</span></dd>
          </div>
          <div>
            <dt>Confirmation</dt>
            <dd>{details.workEmail.trim()}<span>Meeting access details arrive with the confirmation.</span></dd>
          </div>
          {applicationReference && (
            <div>
              <dt>Application reference</dt>
              <dd className="is-mono">{applicationReference}</dd>
            </div>
          )}
        </dl>
        <div className="scheduler-actions">
          <button type="button" className="scheduler-button scheduler-button--primary" onClick={() => downloadIcs(confirmedSlot)}>
            <CalendarCheck aria-hidden="true" /> ADD TO YOUR CALENDAR
          </button>
          <button type="button" className="scheduler-button" onClick={restart}>
            CHOOSE A DIFFERENT TIME
          </button>
        </div>
      </div>
    );
  }

  if (phase === "confirmed" && confirmation?.mode === "calendar") {
    const { booking, outcome, previous } = confirmation;
    const start = Date.parse(booking.start);
    const bookingZone = describeTimeZone(new Date(start), timeZone);
    const moved = outcome === "rescheduled";
    // A review that already existed had its invitation sent when it was made;
    // saying one is "on its way" would send them looking for an email that
    // never comes.
    const lead =
      outcome === "booked"
        ? `It is confirmed in the Aurixa calendar. The calendar invitation, with the video link, is on its way to ${details.workEmail.trim()} - accept it to hold the time in your own calendar.`
        : moved
          ? `It is confirmed in the Aurixa calendar${previous ? `, replacing ${bookingLabel(previous, timeZone)}` : ""}. The updated calendar invitation is on its way by email.`
          : "This time is already yours - nothing new was booked. The calendar invitation, with the video link, was emailed when it was booked.";
    return (
      <div className="scheduler scheduler--confirmed" role="status" aria-live="polite" tabIndex={-1} ref={confirmedRef}>
        <span className="scheduler-confirmed__mark" aria-hidden="true"><Check /></span>
        <p className="scheduler-eyebrow">{moved ? "REVIEW MOVED" : "REVIEW BOOKED"}</p>
        <h3>{moved ? "Your strategic review has moved." : "Your strategic review is booked."}</h3>
        <p className="scheduler-confirmed__lead">{lead}</p>
        <dl className="scheduler-confirmed__facts">
          <div>
            <dt>Your time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(start), timeZone))}<span>{formatSlotRange(start, timeZone)} · {bookingZone.label} ({bookingZone.offsetLabel})</span></dd>
          </div>
          <div>
            <dt>Aurixa time</dt>
            <dd>{formatDayLabel(toDayKey(new Date(start), HOST_TIME_ZONE))}<span>{formatSlotRange(start, HOST_TIME_ZONE)} · {HOST_TIME_ZONE.replace("_", " ")}</span></dd>
          </div>
          <div>
            <dt>Video call</dt>
            {booking.meetingUrl ? (
              <dd>
                <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer">Join link</a>
                <span>The same link is in your calendar invitation.</span>
              </dd>
            ) : (
              <dd>In your invitation<span>The video link travels with the calendar invitation.</span></dd>
            )}
          </div>
          {applicationReference && (
            <div>
              <dt>Application reference</dt>
              <dd className="is-mono">{applicationReference}</dd>
            </div>
          )}
        </dl>
        <div className="scheduler-actions">
          <button type="button" className="scheduler-button" onClick={() => startMove(booking)}>
            <CalendarDays aria-hidden="true" /> MOVE TO A DIFFERENT TIME
          </button>
        </div>
      </div>
    );
  }

  const failureMessage = (() => {
    if (!failure) return null;
    if (failure.kind === "request") {
      return {
        title: "That request did not reach the Aurixa team.",
        body: (
          <>
            Please try once more, or <a href={buildFallbackMailto(selectedLabel)}>send this time by email</a> and the
            team will confirm it.
          </>
        ),
      };
    }
    if (failure.kind === "refused") {
      return {
        title: "We could not book a review for this application.",
        body: (
          <>
            Nothing was booked. <a href={buildFallbackMailto(selectedLabel)}>Email the team</a>, quoting your
            application reference, and they will arrange the session with you.
          </>
        ),
      };
    }
    if (failure.existing) {
      return {
        title: "Your review has not moved.",
        body: (
          <>
            It stays booked for {bookingLabel(failure.existing, timeZone)}. The calendar could not be reached just
            now - try again in a moment, or <a href={buildFallbackMailto(selectedLabel)}>email the team</a>.
          </>
        ),
      };
    }
    if (failure.reason === "access_unverifiable") {
      return {
        title: "That booking did not go through.",
        body: (
          <>
            Your application could not be checked just now, so nothing was booked. Please try again in a moment,
            or <a href={buildFallbackMailto(selectedLabel)}>send this time by email</a> and the team will book it.
          </>
        ),
      };
    }
    if (failure.reason === "timeout" || failure.reason === "network_error") {
      return {
        title: "We could not confirm that booking.",
        body: (
          <>
            Please try again - if it did go through, trying again simply confirms it. Or{" "}
            <a href={buildFallbackMailto(selectedLabel)}>send this time by email</a> and the team will book it.
          </>
        ),
      };
    }
    return {
      title: "That booking did not go through.",
      body: (
        <>
          The calendar could not be reached just now, so nothing was booked. Please try again in a moment, or{" "}
          <a href={buildFallbackMailto(selectedLabel)}>send this time by email</a> and the team will book it.
        </>
      ),
    };
  })();

  const submitLabel = (() => {
    if (phase === "submitting") {
      if (!live) return "SENDING REQUEST";
      return moveFrom ? "MOVING YOUR REVIEW" : "BOOKING";
    }
    if (phase === "failed") return "TRY AGAIN";
    if (!live) return "REQUEST THIS TIME";
    return moveFrom ? "MOVE TO THIS TIME" : "BOOK THIS TIME";
  })();

  return (
    <div className="scheduler">
      <div className="scheduler-toolbar">
        <div className="scheduler-month">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!monthHasEarlier}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <strong aria-live="polite">{formatMonthLabel(visibleMonth.year, visibleMonth.month)}</strong>
          <button type="button" onClick={() => step(1)} disabled={!monthHasLater} aria-label="Next month">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <label className="scheduler-zone">
          <Globe2 aria-hidden="true" />
          <span>Times shown in</span>
          <select value={timeZone} onChange={(event) => onTimeZoneChange(event.target.value)}>
            {zoneOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label} · {option.offset}</option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div className="scheduler-notice" role="status">
          <span>{notice}</span>
          {moveFrom && (
            <button
              type="button"
              className="scheduler-button"
              onClick={() => keepExisting(moveFrom)}
              disabled={phase === "submitting"}
            >
              KEEP MY CURRENT TIME
            </button>
          )}
        </div>
      )}

      {calendar.status === "unavailable" ? (
        <div className="scheduler-unavailable">
          <p className="scheduler-error" role="alert">
            <strong>The live calendar could not be loaded.</strong>
            <span>
              This is usually brief, and nothing has been booked. Try again, or send your preferred times by email
              and the team will book them for you.
            </span>
          </p>
          <div className="scheduler-actions">
            <button type="button" className="scheduler-button scheduler-button--primary" onClick={() => void loadCalendar()}>
              <RotateCcw aria-hidden="true" /> TRY AGAIN
            </button>
            <a className="scheduler-button" href={buildFallbackMailto("")}>
              <Mail aria-hidden="true" /> EMAIL THE TEAM
            </a>
          </div>
        </div>
      ) : (
        <div className="scheduler-body" aria-busy={calendar.status === "loading"}>
          <div className="scheduler-calendar">
            <div className="scheduler-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="scheduler-grid" role="group" aria-label="Choose a date">
              {matrix.flat().map((cell) => {
                const count = byDay.get(cell.key)?.length ?? 0;
                const available = count > 0;
                const isSelected = cell.key === selectedDay;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    ref={(node) => {
                      if (node) dayRefs.current.set(cell.key, node);
                      else dayRefs.current.delete(cell.key);
                    }}
                    className={[
                      "scheduler-day",
                      cell.inMonth ? "" : "is-outside",
                      available ? "is-available" : "is-empty",
                      isSelected ? "is-selected" : "",
                      cell.key === todayKey ? "is-today" : "",
                    ].filter(Boolean).join(" ")}
                    aria-disabled={!available}
                    tabIndex={cell.key === tabbableDay ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-label={`${formatDayLabel(cell.key)}${available ? `, ${count} times available` : ", no times available"}`}
                    onFocus={() => setFocusedDay(cell.key)}
                    onClick={() => { if (available) selectDay(cell.key); }}
                    onKeyDown={(event) => onDayKeyDown(event, cell.key)}
                  >
                    <span>{cell.day}</span>
                    {available && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <p className="scheduler-legend">
              <span className="scheduler-legend__dot" aria-hidden="true" /> Available
              <span className="scheduler-legend__rule" aria-hidden="true" />
              {SESSION_MINUTES}-minute session
            </p>
          </div>

          <div className="scheduler-slots">
            <p className="scheduler-slots__heading">
              <Clock aria-hidden="true" />
              {selectedDay ? formatDayLabel(selectedDay, { year: undefined }) : "Select a date"}
            </p>
            {calendar.status === "loading" ? (
              <p className="scheduler-empty" role="status">
                <Loader2 className="is-spinning" aria-hidden="true" /> Reading the Aurixa calendar...
              </p>
            ) : daySlots.length === 0 ? (
              <p className="scheduler-empty">
                {byDay.size === 0
                  ? "No review times are open at the moment. Send your preferred times and the team will arrange a session."
                  : "No times remain on this date. Choose another highlighted date."}
              </p>
            ) : (
              <>
                <div className="scheduler-slot-list" role="group" aria-label={`Available times on ${formatDayLabel(selectedDay)}`}>
                  {daySlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`scheduler-slot ${slot === selectedSlot ? "is-selected" : ""}`}
                      aria-pressed={slot === selectedSlot}
                      onClick={() => chooseSlot(slot)}
                    >
                      {formatSlotTime(slot, timeZone)}
                      {crossesDateBoundary(slot, timeZone) && (
                        <em title={`${formatSlotTime(slot, HOST_TIME_ZONE)} in ${HOST_TIME_ZONE}`}>+1</em>
                      )}
                    </button>
                  ))}
                </div>
                <p className="scheduler-zone-note">
                  Shown in {zone.label} ({zone.offsetLabel}{zone.abbreviation ? ` · ${zone.abbreviation}` : ""}).
                  {timeZone !== HOST_TIME_ZONE && selectedSlot !== null && (
                    <> Aurixa sees this as {formatSlotTime(selectedSlot, HOST_TIME_ZONE)} {HOST_TIME_ZONE.split("/").pop()?.replace("_", " ")} time.</>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {selectedSlot !== null && calendar.status !== "unavailable" && (
        <div className="scheduler-details" ref={detailsRef}>
          <div className="scheduler-summary">
            <CalendarDays aria-hidden="true" />
            <div>
              <p>{moveFrom ? "YOUR NEW TIME" : "YOUR SELECTION"}</p>
              <strong>{selectedLabel}</strong>
              <span>{zone.label} ({zone.offsetLabel}) · {SESSION_MINUTES} minutes</span>
            </div>
          </div>

          {held && (
            <div className="scheduler-notice scheduler-notice--decision" role="alert" tabIndex={-1} ref={heldRef}>
              <span>
                <strong>You already have a strategic review booked</strong> for {bookingLabel(held, timeZone)}.
                Nothing new was booked. Would you like to move it to {selectedLabel}?
              </span>
              <div className="scheduler-actions">
                <button
                  type="button"
                  className="scheduler-button scheduler-button--primary"
                  onClick={confirmMove}
                  disabled={phase === "submitting"}
                >
                  <CalendarCheck aria-hidden="true" /> MOVE MY REVIEW TO THIS TIME
                </button>
                <button
                  type="button"
                  className="scheduler-button"
                  onClick={() => keepExisting(held)}
                  disabled={phase === "submitting"}
                >
                  KEEP MY CURRENT TIME
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className="scheduler-fields">
              <label>
                <span>Full name<i aria-hidden="true">*</i></span>
                <input
                  name="fullName"
                  value={details.fullName}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "booking-error-fullName" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, fullName: event.target.value }))}
                />
                {errors.fullName && <b id="booking-error-fullName">{errors.fullName}</b>}
              </label>
              <label>
                <span>Work email<i aria-hidden="true">*</i></span>
                <input
                  name="workEmail"
                  type="email"
                  value={details.workEmail}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.workEmail)}
                  aria-describedby={errors.workEmail ? "booking-error-workEmail" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, workEmail: event.target.value }))}
                />
                {errors.workEmail && <b id="booking-error-workEmail">{errors.workEmail}</b>}
              </label>
              <label>
                <span>Organisation</span>
                <input
                  name="organisation"
                  value={details.organisation}
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.organisation)}
                  aria-describedby={errors.organisation ? "booking-error-organisation" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, organisation: event.target.value }))}
                />
                {errors.organisation && <b id="booking-error-organisation">{errors.organisation}</b>}
              </label>
              <label>
                <span>Phone <em>optional</em></span>
                <input
                  name="phone"
                  type="tel"
                  value={details.phone}
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "booking-error-phone" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                />
                {errors.phone && <b id="booking-error-phone">{errors.phone}</b>}
              </label>
              <label className="scheduler-fields__wide">
                <span>Anything to cover in the session <em>optional</em></span>
                <textarea
                  name="notes"
                  rows={3}
                  value={details.notes}
                  aria-invalid={Boolean(errors.notes)}
                  aria-describedby={errors.notes ? "booking-error-notes" : undefined}
                  onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))}
                />
                {errors.notes && <b id="booking-error-notes">{errors.notes}</b>}
              </label>
            </div>

            {phase === "failed" && failureMessage && (
              <p className="scheduler-error" role="alert">
                <strong>{failureMessage.title}</strong>
                <span>{failureMessage.body}</span>
              </p>
            )}

            {!held && (
              <div className="scheduler-actions">
                <button type="submit" className="scheduler-button scheduler-button--primary" disabled={phase === "submitting"}>
                  {phase === "submitting"
                    ? <><Loader2 className="is-spinning" aria-hidden="true" /> {submitLabel}</>
                    : <>{live ? <Video aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />} {submitLabel}</>}
                </button>
                <a className="scheduler-button" href={buildFallbackMailto(selectedLabel)}>
                  <Mail aria-hidden="true" /> EMAIL INSTEAD
                </a>
              </div>
            )}
            <p className="scheduler-consent">
              {live
                ? "Aurixa uses these details to book your strategic review and to prepare for the session. Booking sends the calendar invitation, with the video link, to the email above straight away."
                : "Aurixa uses these details to confirm your strategic review and to prepare for the session. The team confirms your time by email, usually within one business day."}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
