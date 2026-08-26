import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { useRouteMetadata } from "../lib/pageMetadata";
import {
  STATUS_COMPONENT_ROSTER,
  STATUS_LABELS,
  formatDurationMs,
  type ComponentStatus,
  type DayDetail,
  type DayDetailIncident,
  type StatusComponent,
  type StatusSummary,
} from "../lib/statusPage";
import {
  fetchStatusDayDetail,
  fetchStatusSummary,
  type StatusResult,
} from "../lib/statusPageClient";

/**
 * /status — live health of the upstream services this product is built on.
 *
 * Every provider is ANONYMIZED to its role: the only strings this page ever
 * renders about a provider come from the shared roster, the response payload
 * and the shared status labels. No vendor is named anywhere in this file —
 * not in copy, not in comments — and `statusPage.test.ts` pins the same rule
 * on the shared vocabulary.
 *
 * The page is prerendered as static markup (header, banner frame, one
 * skeleton row per roster entry); the data arrives client-side on mount and
 * then again every 60 seconds.
 */

const HISTORY_DAYS = 30;
const REFRESH_MS = 60_000;

type StatusStyle = {
  /** The state dot. */
  dot: string;
  /** Soft glow behind the dot, matching its colour. */
  glow: string;
  /** Label text inside the status pill. */
  text: string;
  /** Pill border + wash. */
  pill: string;
  /** History bar fill. */
  bar: string;
  /** Overall banner border tint. */
  banner: string;
};

/**
 * One colour story per status, written out as full literal class strings so
 * Tailwind's scanner sees every one of them. The site has no green/amber
 * tokens, so these are raw hex arbitrary values like the rest of the site.
 */
const STATUS_STYLES: Record<ComponentStatus, StatusStyle> = {
  operational: {
    dot: "bg-[#4ADE80]",
    glow: "shadow-[0_0_14px_rgba(74,222,128,0.55)]",
    text: "text-[#4ADE80]",
    pill: "border-[#4ADE80]/30 bg-[#4ADE80]/[0.08]",
    bar: "bg-[#4ADE80]/90",
    banner: "border-[#4ADE80]/25",
  },
  maintenance: {
    dot: "bg-[#60A5FA]",
    glow: "shadow-[0_0_14px_rgba(96,165,250,0.55)]",
    text: "text-[#60A5FA]",
    pill: "border-[#60A5FA]/30 bg-[#60A5FA]/[0.08]",
    bar: "bg-[#60A5FA]/90",
    banner: "border-[#60A5FA]/25",
  },
  degraded: {
    dot: "bg-[#FBBF24]",
    glow: "shadow-[0_0_14px_rgba(251,191,36,0.55)]",
    text: "text-[#FBBF24]",
    pill: "border-[#FBBF24]/30 bg-[#FBBF24]/[0.08]",
    bar: "bg-[#FBBF24]/90",
    banner: "border-[#FBBF24]/25",
  },
  partial_outage: {
    dot: "bg-[#FB923C]",
    glow: "shadow-[0_0_14px_rgba(251,146,60,0.55)]",
    text: "text-[#FB923C]",
    pill: "border-[#FB923C]/30 bg-[#FB923C]/[0.08]",
    bar: "bg-[#FB923C]/90",
    banner: "border-[#FB923C]/25",
  },
  major_outage: {
    dot: "bg-[#F87171]",
    glow: "shadow-[0_0_14px_rgba(248,113,113,0.55)]",
    text: "text-[#F87171]",
    pill: "border-[#F87171]/30 bg-[#F87171]/[0.08]",
    bar: "bg-[#F87171]/90",
    banner: "border-[#F87171]/25",
  },
  unknown: {
    dot: "bg-[#94A3B8]",
    glow: "shadow-[0_0_14px_rgba(148,163,184,0.4)]",
    text: "text-[#94A3B8]",
    pill: "border-white/15 bg-white/[0.04]",
    bar: "bg-[#94A3B8]/60",
    banner: "border-white/10",
  },
};

/** "13 Aug" — for monitoring-since captions. */
function formatDay(date: string): string {
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** 99.966 → "99.9%", 100 → "100%". */
function formatUptime(uptime: number): string {
  const rounded = Math.round(uptime * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

/** "13 August 2026" — drilldown panel headers. */
function formatDayLong(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "12:11" — UTC clock time of an ISO timestamp, for incident windows. */
function formatClockUtc(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().slice(11, 16);
}

/** "14 Aug 01:00" — for scheduled windows, which are often days out. */
function formatDateTimeUtc(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return `${formatDay(iso)} ${formatClockUtc(iso)}`;
}

/** "42 seconds ago" — for the "Last checked" line under the banner. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatusPill({ status, label }: { status: ComponentStatus; label: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 ${style.pill}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot} ${style.glow}`} />
      <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${style.text}`}>
        {label}
      </span>
    </span>
  );
}

/**
 * The 30-day strip. Oldest on the left, today on the right; days the ledger
 * has not seen yet are left-padded as neutral placeholder cells so every
 * strip is the same width and "Today" always sits under the last real day.
 * Each real bar carries a rich hover card and clicks through to the day
 * drilldown panel.
 */
function HistoryBars({
  label,
  history,
  observedSince,
  selectedDate,
  onSelectDate,
}: {
  label: string;
  history: Array<{ date: string; status: ComponentStatus }>;
  observedSince: string | null;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const entries = history.slice(-HISTORY_DAYS);
  const padding = Math.max(0, HISTORY_DAYS - entries.length);
  const observedDay = observedSince ? observedSince.slice(0, 10) : null;
  // A short strip is not missing data — say where the record starts instead
  // of showing a wall of grey that reads as broken. (Bars can predate our
  // own polling: those days are reconstructed from the provider's published
  // incident history, and their hover cards say so.)
  const leftCaption =
    padding > 0 && entries.length > 0 ? `Since ${formatDay(entries[0].date)}` : "30 days";
  return (
    <div className="w-fit max-w-full">
      <div className="flex flex-nowrap items-center gap-1" aria-label={`${label} 30 day history`}>
        {Array.from({ length: padding }, (_, index) => (
          <span
            key={`pad-${index}`}
            title="No published record for this day"
            className="h-8 w-1.5 rounded-sm bg-white/[0.06]"
          />
        ))}
        {entries.map((entry) => {
          const style = STATUS_STYLES[entry.status];
          const reconstructed = observedDay !== null && entry.date < observedDay;
          const selected = selectedDate === entry.date;
          return (
            <button
              key={entry.date}
              type="button"
              onClick={() => onSelectDate(entry.date)}
              aria-label={`${formatDayLong(entry.date)}, ${STATUS_LABELS[entry.status]}, view details`}
              aria-expanded={selected}
              className="group relative rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8]/70"
            >
              <span
                aria-hidden="true"
                className={`block h-8 w-1.5 rounded-sm transition-transform group-hover:scale-y-110 ${style.bar} ${
                  selected ? "outline outline-2 outline-offset-1 outline-white/60" : ""
                }`}
              />
              {/* Hover card — pure CSS, no vendor names, pointer-safe. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#060F1F] px-3 py-2 text-left shadow-xl group-hover:block group-focus-visible:block"
              >
                <span className="block text-[11px] font-semibold text-white">
                  {formatDayLong(entry.date)}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${style.text}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                </span>
                <span className="mt-1 block text-[10px] text-[#94A3B8]">
                  {reconstructed ? "Provider's published record" : "Our monitoring"}
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#5EDDE8]">
                  Click for day detail
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
        <span>{leftCaption}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Session-scoped cache for day drilldowns; today's detail is never cached
 * because it changes with every 5-minute poll. */
const dayDetailCache = new Map<string, DayDetail>();

/** Small labelled figures across the top of a day panel. */
function DayStatRow({ detail }: { detail: Extract<DayDetail, { ok: true }> }) {
  const cells: Array<{ label: string; value: string }> = [];
  if (detail.day_status) {
    cells.push({ label: "Worst state", value: STATUS_LABELS[detail.day_status] });
  }
  cells.push({
    label: "Disrupted",
    value: detail.disruption_minutes > 0 ? formatDurationMs(detail.disruption_minutes * 60_000) : "none",
  });
  if (detail.checks) {
    cells.push({ label: "Our checks", value: `${detail.checks.total + detail.checks.unreadable}` });
    if (detail.checks.unreadable > 0) {
      cells.push({ label: "Unreadable", value: `${detail.checks.unreadable}` });
    }
  }
  cells.push({
    label: "Record",
    value: detail.observed ? "our monitoring" : "provider's published",
  });

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label}>
          <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
            {cell.label}
          </dt>
          <dd className="mt-0.5 text-sm text-white">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AreaChips({ areas }: { areas: string[] }) {
  if (areas.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {areas.map((area) => (
        <span
          key={area}
          className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#94A3B8]"
        >
          {area}
        </span>
      ))}
    </span>
  );
}

/**
 * One incident window inside a day panel: when it ran, how long, what the
 * provider said it affected, and the stage timeline they published.
 */
function IncidentWindowCard({
  incident,
  date,
}: {
  incident: DayDetailIncident;
  date: string;
}) {
  const style = STATUS_STYLES[incident.worst_status];
  const startDay = incident.started_at.slice(0, 10);
  const endIso = incident.ended_at ?? incident.scheduled_until;
  const endDay = endIso?.slice(0, 10) ?? null;
  const start =
    (startDay !== date ? `${formatDay(startDay)} ` : "") + formatClockUtc(incident.started_at);
  const end = endIso
    ? (endDay !== date ? `${formatDay(endDay!)} ` : "") + formatClockUtc(endIso)
    : "ongoing";
  const duration = formatDurationMs(
    (incident.ended_at ? Date.parse(incident.ended_at) : Date.now()) -
      Date.parse(incident.started_at),
  );
  const planned = incident.kind === "maintenance";

  return (
    <li className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${style.text}`}>
          {planned ? "Planned maintenance" : incident.status_label}
        </span>
        <span className="text-[#E2E8F0]">
          {start} &rarr; {end}
        </span>
        {!planned && <span className="text-[#94A3B8]">({duration})</span>}
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#94A3B8]/60">
          {incident.source === "vendor_feed" ? "provider's record" : "our checks"}
        </span>
      </div>

      {(incident.areas.length > 0 || incident.update_count > 0 ||
        incident.time_to_identify_minutes !== null) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <AreaChips areas={incident.areas} />
          {incident.time_to_identify_minutes !== null && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#94A3B8]/60">
              cause found in {formatDurationMs(incident.time_to_identify_minutes * 60_000)}
            </span>
          )}
          {incident.update_count > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#94A3B8]/60">
              {incident.update_count} provider update{incident.update_count === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {incident.lifecycle.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-l border-white/10 pl-3">
          {incident.lifecycle.map((step, index) => {
            const previous = incident.lifecycle[index - 1];
            const gapMs = previous ? Date.parse(step.at) - Date.parse(previous.at) : 0;
            return (
              <li key={step.stage} className="flex flex-wrap items-center gap-x-2.5 text-[11px]">
                <span className="font-mono tabular-nums text-[#94A3B8]">
                  {formatClockUtc(step.at)}
                </span>
                <span className="text-[#E2E8F0]">{step.label}</span>
                {previous && gapMs > 0 && (
                  <span className="text-[#94A3B8]/70">+{formatDurationMs(gapMs)}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

function DayDetailPanel({
  componentKey,
  label,
  date,
  onClose,
}: {
  componentKey: string;
  label: string;
  date: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DayDetail | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${componentKey}:${date}`;
    const cached = dayDetailCache.get(cacheKey);
    if (cached) {
      setDetail(cached);
      return;
    }
    setDetail("loading");
    void fetchStatusDayDetail(componentKey, date).then((result) => {
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      if (result.ok && date !== today) dayDetailCache.set(cacheKey, result);
      setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [componentKey, date]);

  return (
    <div
      role="region"
      aria-label={`${label}, ${formatDayLong(date)} detail`}
      className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-white">
          {formatDayLong(date)}
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#94A3B8]/60">
            times in UTC
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day detail"
          className="rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
        >
          Close
        </button>
      </div>

      {detail === "loading" ? (
        <p className="mt-3 animate-pulse text-xs text-[#94A3B8]">Loading day detail&hellip;</p>
      ) : !detail.ok ? (
        <p className="mt-3 text-xs text-[#94A3B8]">
          Couldn&rsquo;t load this day&rsquo;s detail. Close and try again.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <DayStatRow detail={detail} />

          {detail.observed && detail.hours.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
                  Hour by hour · our checks
                </p>
                {detail.checks && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]/70">
                    {detail.checks.breakdown
                      .map((b) => `${b.count} ${b.label.toLowerCase()}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-nowrap items-center gap-[3px]">
                {detail.hours.map((h) => (
                  <span
                    key={h.hour}
                    title={
                      h.status === "none"
                        ? `${String(h.hour).padStart(2, "0")}:00, no checks`
                        : `${String(h.hour).padStart(2, "0")}:00, ${STATUS_LABELS[h.status]}, ${h.checks} check${h.checks === 1 ? "" : "s"}`
                    }
                    className={`h-6 min-w-0 flex-1 rounded-[3px] ${
                      h.status === "none" ? "bg-white/[0.05]" : STATUS_STYLES[h.status].bar
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/50">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          )}

          {detail.transitions.length > 1 && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
                What our checks saw change
              </p>
              <ol className="mt-2 space-y-1.5">
                {detail.transitions.map((t, index) => {
                  const style = STATUS_STYLES[t.to];
                  const next = detail.transitions[index + 1];
                  const heldMs =
                    (next ? Date.parse(next.at) : Math.min(Date.now(), Date.parse(`${date}T23:59:59Z`))) -
                    Date.parse(t.at);
                  return (
                    <li key={t.at} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      <span className="font-mono text-[10px] tabular-nums text-[#94A3B8]">
                        {formatClockUtc(t.at)}
                      </span>
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      <span className="text-[#E2E8F0]">
                        {t.from ? (
                          <>
                            {STATUS_LABELS[t.from]} &rarr;{" "}
                            <span className={style.text}>{STATUS_LABELS[t.to]}</span>
                          </>
                        ) : (
                          <>
                            first check &mdash;{" "}
                            <span className={style.text}>{STATUS_LABELS[t.to]}</span>
                          </>
                        )}
                      </span>
                      {heldMs > 0 && (
                        <span className="text-[#94A3B8]/70">held {formatDurationMs(heldMs)}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {detail.incidents.length > 0 ? (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
                Incident windows touching this day
              </p>
              <ul className="mt-2 space-y-3">
                {detail.incidents.map((incident, index) => (
                  <IncidentWindowCard
                    key={`${incident.started_at}-${index}`}
                    incident={incident}
                    date={date}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8]">
              No incident windows recorded for this day
              {!detail.observed && detail.day_status
                ? `, and the provider's published record shows it as ${STATUS_LABELS[detail.day_status].toLowerCase()}`
                : ""}
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AffectsChips({ affects }: { affects: readonly string[] }) {
  if (affects.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
        Can affect
      </span>
      {affects.map((feature) => (
        <span
          key={feature}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-[#94A3B8]"
        >
          {feature}
        </span>
      ))}
    </div>
  );
}

function ComponentRow({ component }: { component: StatusComponent }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  return (
    <li className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{component.label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{component.description}</p>
          <AffectsChips affects={component.affects} />
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <StatusPill status={component.status} label={component.status_label} />
          {component.checked_at && (
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#94A3B8]/60">
              checked <time dateTime={component.checked_at}>{relativeTime(component.checked_at)}</time>
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <HistoryBars
          label={component.label}
          history={component.history}
          observedSince={component.since}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
        />
        <div className="flex flex-col gap-1 sm:items-end">
          {component.uptime !== null && (
            <p
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#94A3B8]/70"
              title="Share of readable checks reporting a healthy state"
            >
              {formatUptime(component.uptime)} of checks healthy
              {component.since ? ` since ${formatDay(component.since)}` : ""}
            </p>
          )}
          {component.stats && component.stats.days_recorded > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#94A3B8]/60">
              {component.stats.incidents_30d === 0 ? (
                <>no incidents on record &middot; {component.stats.days_recorded}d</>
              ) : (
                <>
                  {component.stats.incidents_30d} incident
                  {component.stats.incidents_30d === 1 ? "" : "s"} &middot;{" "}
                  {formatDurationMs(component.stats.disruption_minutes_30d * 60_000)} disrupted
                  {component.stats.mttr_minutes !== null && (
                    <> &middot; {formatDurationMs(component.stats.mttr_minutes * 60_000)} avg fix</>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>
      {selectedDate && (
        <DayDetailPanel
          componentKey={component.key}
          label={component.label}
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </li>
  );
}

/**
 * The jumbotron: what is broken RIGHT NOW, and what broke recently and has
 * already been resolved. Renders nothing when there is nothing to say —
 * the overall banner already covers "all clear".
 */
function IncidentsJumbotron({ incidents }: { incidents: StatusSummary["incidents"] }) {
  const { active, resolved, maintenance } = incidents;
  if (active.length === 0 && resolved.length === 0 && maintenance.length === 0) return null;
  return (
    <section aria-label="Incident activity" className="mt-6 space-y-6">
      {active.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#FBBF24]">
            Active issues
          </h2>
          <ul className="mt-3 space-y-3">
            {active.map((incident) => {
              const style = STATUS_STYLES[incident.status];
              const roster = STATUS_COMPONENT_ROSTER.find((c) => c.key === incident.key);
              return (
                <li
                  key={incident.key}
                  className={`relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-5 backdrop-blur-xl sm:p-6 ${style.banner}`}
                >
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 animate-pulse rounded-full ${style.dot} ${style.glow}`}
                      />
                      <div>
                        <p className="font-semibold text-white">{incident.label}</p>
                        <p className={`mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${style.text}`}>
                          {incident.status_label}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {incident.started_at && (
                        <p className="text-sm text-[#94A3B8]">
                          Ongoing for{" "}
                          <span className="text-white">
                            {formatDurationMs(Date.now() - Date.parse(incident.started_at))}
                          </span>
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#94A3B8]/60">
                        {incident.confirmed
                          ? "Confirmed on the provider's status feed"
                          : "Detected by our checks"}
                      </p>
                      {(incident.stage_label || incident.update_count > 0) && (
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#94A3B8]/60">
                          {incident.stage_label ?? "In progress"}
                          {incident.update_count > 0 && (
                            <> &middot; {incident.update_count} update{incident.update_count === 1 ? "" : "s"}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {incident.areas.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
                        Provider reports
                      </span>
                      <AreaChips areas={incident.areas} />
                    </div>
                  )}
                  {roster && <AffectsChips affects={roster.affects} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
            Recently resolved &middot; last 72h
          </h2>
          <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#0B162C]/40 backdrop-blur-xl">
            {resolved.slice(0, 5).map((incident, index) => (
              <li
                key={`${incident.key}-${incident.ended_at}-${index}`}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${STATUS_STYLES[incident.worst_status].dot}`}
                  />
                  <span className="text-sm font-medium text-white">{incident.label}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_STYLES[incident.worst_status].text}`}
                  >
                    {incident.status_label}
                  </span>
                  <AreaChips areas={incident.areas} />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]/70">
                  {incident.started_at
                    ? `lasted ${formatDurationMs(Date.parse(incident.ended_at) - Date.parse(incident.started_at))} · `
                    : ""}
                  resolved {relativeTime(incident.ended_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {maintenance.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#60A5FA]">
            Scheduled maintenance
          </h2>
          <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-[#60A5FA]/20 bg-[#0B162C]/40 backdrop-blur-xl">
            {maintenance.map((window, index) => (
              <li
                key={`${window.key}-${window.starts_at}-${index}`}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_STYLES.maintenance.dot}`} />
                  <span className="text-sm font-medium text-white">{window.label}</span>
                  {window.in_progress && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#60A5FA]">
                      in progress
                    </span>
                  )}
                  <AreaChips areas={window.areas} />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]/70">
                  <time dateTime={window.starts_at}>{formatDateTimeUtc(window.starts_at)}</time>
                  {window.ends_at && (
                    <>
                      {" "}&rarr; {formatClockUtc(window.ends_at)} UTC &middot;{" "}
                      {formatDurationMs(Date.parse(window.ends_at) - Date.parse(window.starts_at))}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#94A3B8]/50">
            Planned work announced by our providers &middot; not an outage
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * First-load placeholders. The roster's own labels and descriptions render
 * statically — this is the markup the prerender pass ships — with pulsing
 * stand-ins where live state will land.
 */
function SkeletonRows() {
  return (
    <ul className="space-y-4">
      {STATUS_COMPONENT_ROSTER.map((component) => (
        <li
          key={component.key}
          className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">{component.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{component.description}</p>
              <AffectsChips affects={component.affects} />
            </div>
            <span className="h-7 w-32 shrink-0 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="mt-6 flex flex-nowrap items-center gap-1">
            {Array.from({ length: HISTORY_DAYS }, (_, index) => (
              <span
                key={index}
                className="h-8 w-1.5 animate-pulse rounded-sm bg-white/[0.06]"
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function OverallBanner({ summary }: { summary: StatusSummary }) {
  const style = STATUS_STYLES[summary.overall];
  return (
    <section
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border bg-[#0B162C]/40 p-8 backdrop-blur-xl ${style.banner}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 rounded-full ${style.dot} ${style.glow}`} />
          <p className="text-xl font-semibold tracking-[-0.015em] text-white md:text-2xl">
            {summary.overall_label}
          </p>
        </div>
        <div className="sm:text-right">
          {summary.checked_at && (
            <p className="text-sm text-[#94A3B8]">
              Last checked{" "}
              <time dateTime={summary.checked_at}>{relativeTime(summary.checked_at)}</time>
            </p>
          )}
          <p className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60 sm:justify-end">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ADE80]" />
            Live &middot; polled every 5 min &middot; page refreshes every 60s
          </p>
          {summary.stale && (
            <p className="mt-1 animate-pulse text-xs text-[#94A3B8]/80">
              checking for fresh data&hellip;
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Calm fallback when the summary endpoint itself cannot be read. */
function UnavailablePanel() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-8 text-center backdrop-blur-xl"
    >
      <p className="text-xl font-semibold text-white">Status temporarily unavailable</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8]">
        If you&rsquo;re seeing an issue, raise a ticket on the Support Portal and the team will
        pick it up.
      </p>
      <Link
        to="/support"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:text-white"
      >
        Raise a support ticket &rarr;
      </Link>
    </section>
  );
}

export default function Status() {
  useRouteMetadata("/status");

  // null = first load still pending (the prerendered state). A poll that
  // fails AFTER a successful read keeps the last good summary on screen —
  // a transient fetch hiccup should not blank a page of real history.
  const [result, setResult] = useState<StatusResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchStatusSummary();
      if (cancelled) return;
      setResult((prev) => (next.ok || !prev || !prev.ok ? next : prev));
    };
    void load();
    const interval = setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Split the union once, so the JSX below stays simple: `summary` is the
  // last good payload (or null while the first load is pending) and
  // `unavailable` is true only when the endpoint itself could not be read.
  const summary: StatusSummary | null = result !== null && result.ok ? result : null;
  const unavailable = result !== null && !result.ok;

  return (
    <div className="w-full relative pt-32 pb-20 bg-[#040B16] min-h-dvh overflow-hidden">
      <HeroBackground variant="about" />
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
            Aurixa System Status
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.025em] md:text-6xl">
            System <span className="font-display italic text-[#C89B3C]">status</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-[#94A3B8] md:text-base">
            The live health of every service Aurixa Systems runs on, polled directly from each
            provider&rsquo;s official status feed every five minutes. Providers are shown by role
            rather than by name. Each card says what it does for us and which features an
            incident there can touch.
          </p>
        </div>

        <div className="mx-auto mt-14 w-full max-w-4xl">
          {unavailable ? (
            <UnavailablePanel />
          ) : (
            <>
              {summary === null ? (
                <section
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-white/10 bg-[#0B162C]/40 p-8 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-white/20" />
                      <p className="text-xl font-semibold tracking-[-0.015em] text-white md:text-2xl">
                        Fetching live status&hellip;
                      </p>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60 sm:text-right">
                      Live &middot; polled every 5 min
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <OverallBanner summary={summary} />
                  <IncidentsJumbotron incidents={summary.incidents} />
                </>
              )}

              <h2 className="mt-12 font-mono text-[10px] uppercase tracking-[0.35em] text-[#94A3B8]">
                Service health
              </h2>
              <div className="mt-4">
                {summary === null ? (
                  <SkeletonRows />
                ) : (
                  <ul className="space-y-4">
                    {summary.components.map((component) => (
                      <ComponentRow key={component.key} component={component} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* Page footer */}
          <div className="mt-14 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center">
            <Link
              to="/support"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:text-white"
            >
              Something broken for you specifically? &rarr; Raise a support ticket
            </Link>
            <p className="max-w-lg text-xs leading-relaxed text-[#94A3B8]/70">
              Every state on this page is live: our servers poll each provider&rsquo;s official
              status feed every five minutes and keep the history you see here. Days before our
              own polling began are reconstructed from each provider&rsquo;s published incident
              record, and re-synced daily. Nothing is entered by hand, and nothing is cached for
              more than a minute.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
