import { strict as assert } from "node:assert";
import test from "node:test";
import {
  COMPONENT_STATUSES,
  FALLBACK_COMPONENT_LABEL,
  LIFECYCLE_STAGE_LABELS,
  OVERALL_LABELS,
  STATUS_AREA_LABELS,
  STATUS_COMPONENT_ROSTER,
  STATUS_LABELS,
  mapAreaSlugs,
  computeOverall,
  formatDurationMs,
  historyBarTitle,
  isComponentStatus,
  normalizeDayDetailPayload,
  normalizeSummaryPayload,
  rollupDaily,
  severityRank,
} from "./statusPage";

test("severity ordering puts confirmed outages above everything else", () => {
  assert.ok(severityRank("major_outage") > severityRank("partial_outage"));
  assert.ok(severityRank("partial_outage") > severityRank("degraded"));
  assert.ok(severityRank("degraded") > severityRank("maintenance"));
  // A provider we cannot read is not evidence of an outage.
  assert.ok(severityRank("unknown") < severityRank("maintenance"));
  assert.ok(severityRank("operational") < severityRank("unknown"));
});

test("overall is the worst confirmed state", () => {
  assert.equal(computeOverall(["operational", "operational"]), "operational");
  assert.equal(computeOverall(["operational", "degraded"]), "degraded");
  assert.equal(computeOverall(["degraded", "major_outage", "operational"]), "major_outage");
  assert.equal(computeOverall(["operational", "maintenance"]), "maintenance");
});

test("unknown never drives the banner while anything is readable", () => {
  assert.equal(computeOverall(["unknown", "operational"]), "operational");
  assert.equal(computeOverall(["unknown", "degraded"]), "degraded");
  assert.equal(computeOverall(["unknown", "unknown"]), "unknown");
  assert.equal(computeOverall([]), "unknown");
});

test("status guard accepts the vocabulary and nothing else", () => {
  for (const s of COMPONENT_STATUSES) assert.ok(isComponentStatus(s));
  assert.ok(!isComponentStatus("down"));
  assert.ok(!isComponentStatus(""));
  assert.ok(!isComponentStatus(null));
});

test("daily rollup keeps the worst status per day, oldest first, capped", () => {
  const rows = [
    { date: "2026-08-02", status: "operational" as const },
    { date: "2026-08-01", status: "operational" as const },
    { date: "2026-08-02", status: "degraded" as const },
    { date: "2026-08-02", status: "operational" as const },
    { date: "2026-08-03", status: "major_outage" as const },
    { date: "2026-08-03", status: "operational" as const },
  ];
  const rolled = rollupDaily(rows, 30);
  assert.deepEqual(rolled, [
    { date: "2026-08-01", status: "operational" },
    { date: "2026-08-02", status: "degraded" },
    { date: "2026-08-03", status: "major_outage" },
  ]);
  assert.equal(rollupDaily(rows, 2).length, 2);
  assert.equal(rollupDaily(rows, 2)[0].date, "2026-08-02");
});

test("a day is unknown only when nothing that day was readable", () => {
  // One failed read among healthy polls must not grey out the whole day…
  assert.deepEqual(
    rollupDaily([
      { date: "2026-08-13", status: "operational" },
      { date: "2026-08-13", status: "unknown" },
      { date: "2026-08-13", status: "operational" },
    ]),
    [{ date: "2026-08-13", status: "operational" }],
  );
  // …a confirmed problem still beats everything…
  assert.deepEqual(
    rollupDaily([
      { date: "2026-08-13", status: "unknown" },
      { date: "2026-08-13", status: "degraded" },
      { date: "2026-08-13", status: "operational" },
    ]),
    [{ date: "2026-08-13", status: "degraded" }],
  );
  // …and a fully unreadable day is honestly unknown.
  assert.deepEqual(
    rollupDaily([{ date: "2026-08-13", status: "unknown" }]),
    [{ date: "2026-08-13", status: "unknown" }],
  );
});

test("no vendor is ever named in public-facing status copy", () => {
  // The entire point of the roster: roles, not vendors. If a vendor name
  // sneaks into a label, description, key, or shared status copy, the
  // anonymity requirement is broken and this must go red.
  const vendorNames =
    /supabase|cloudflare|vercel|github|openai|anthropic|gemini|google|stripe|resend|twilio|aws|amazon|azure|statuspage|instatus/i;
  const publicStrings = [
    ...STATUS_COMPONENT_ROSTER.flatMap((c) => [c.key, c.label, c.description, ...c.affects]),
    ...Object.values(STATUS_LABELS),
    ...Object.values(OVERALL_LABELS),
    ...Object.values(STATUS_AREA_LABELS),
    ...Object.values(LIFECYCLE_STAGE_LABELS),
    FALLBACK_COMPONENT_LABEL,
  ];
  for (const s of publicStrings) {
    assert.ok(!vendorNames.test(s), `vendor name leaked into public copy: "${s}"`);
  }
});

test("roster keys are unique and stable-format", () => {
  const keys = STATUS_COMPONENT_ROSTER.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^[a-z][a-z_]+$/);
});

test("roster labels are distinct roles, not one repeated template", () => {
  // The first cut suffixed every label with "Provider" and the page read as
  // the same row seven times. Labels must be unique and must not all share
  // a trailing word.
  const labels = STATUS_COMPONENT_ROSTER.map((c) => c.label);
  assert.equal(new Set(labels).size, labels.length);
  const lastWords = new Set(labels.map((l) => l.split(" ").pop()?.toLowerCase()));
  assert.ok(lastWords.size > 1, "every roster label ends in the same word");
  for (const entry of STATUS_COMPONENT_ROSTER) {
    assert.ok(entry.description.length >= 40, `description too thin for ${entry.key}`);
    assert.ok(entry.affects.length >= 1, `no affected features listed for ${entry.key}`);
  }
});

test("normalizeSummaryPayload joins roster copy by key", () => {
  // Regression: the server sends keys and statuses, never labels. The first
  // deploy forgot the join, so every LIVE row rendered as the generic
  // fallback while only the prerendered skeleton showed real labels.
  const result = normalizeSummaryPayload({
    ok: true,
    overall: "degraded",
    checked_at: "2026-08-13T12:25:01Z",
    stale: false,
    components: [
      {
        key: "backend",
        status: "operational",
        checked_at: "2026-08-13T12:25:01Z",
        uptime: 100,
        since: "2026-08-13T12:11:05Z",
        history: [{ date: "2026-08-13", status: "operational" }],
      },
      { key: "security_delivery", status: "degraded", checked_at: null, history: [] },
    ],
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.overall_label, OVERALL_LABELS.degraded);
  const backend = result.components[0];
  assert.equal(backend.label, "Backend platform");
  assert.notEqual(backend.label, FALLBACK_COMPONENT_LABEL);
  assert.ok(backend.description.length > 0);
  assert.ok(backend.affects.length > 0);
  assert.equal(backend.uptime, 100);
  assert.equal(backend.since, "2026-08-13T12:11:05Z");
  const edge = result.components[1];
  assert.equal(edge.label, "Edge security & delivery");
  assert.equal(edge.status_label, STATUS_LABELS.degraded);
  assert.equal(edge.uptime, null);
});

test("history bar tooltips distinguish reconstructed days from observed ones", () => {
  const observedSince = "2026-08-13T12:11:05Z";
  // A day before our first poll came from the provider's published record.
  const reconstructed = historyBarTitle("2026-08-01", "degraded", observedSince);
  assert.ok(reconstructed.includes("published history"), reconstructed);
  // Days we polled ourselves carry no qualifier — and neither does anything
  // when we do not know where observation began.
  assert.equal(historyBarTitle("2026-08-13", "operational", observedSince), "2026-08-13: Operational");
  assert.equal(historyBarTitle("2026-08-20", "degraded", observedSince), "2026-08-20: Degraded performance");
  assert.equal(historyBarTitle("2026-08-01", "degraded", null), "2026-08-01: Degraded performance");
  // The qualifier is public copy: it must never name a vendor.
  assert.ok(!/supabase|cloudflare|vercel|github|openai|stripe/i.test(reconstructed));
});

test("incident block is normalized with roster labels and safe defaults", () => {
  const result = normalizeSummaryPayload({
    ok: true,
    overall: "degraded",
    components: [],
    incidents: {
      active: [
        { key: "security_delivery", status: "degraded", started_at: "2026-08-13T12:11:05Z", confirmed: false },
        { nope: true }, // dropped: no key
      ],
      resolved: [
        {
          key: "dev_platform",
          worst_status: "partial_outage",
          started_at: "2026-08-12T21:39:05Z",
          ended_at: "2026-08-12T22:56:39Z",
          source: "vendor_feed",
        },
        { key: "backend" }, // dropped: no ended_at
      ],
    },
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.incidents.active.length, 1);
  const active = result.incidents.active[0];
  assert.equal(active.label, "Edge security & delivery");
  assert.equal(active.status_label, STATUS_LABELS.degraded);
  assert.equal(active.confirmed, false);
  assert.equal(result.incidents.resolved.length, 1);
  const resolved = result.incidents.resolved[0];
  assert.equal(resolved.label, "Code & release pipeline");
  assert.equal(resolved.source, "vendor_feed");

  // A payload with no incident block at all still normalizes.
  const bare = normalizeSummaryPayload({ ok: true, overall: "operational", components: [] });
  assert.ok(bare.ok);
  if (bare.ok) assert.deepEqual(bare.incidents, { active: [], resolved: [], maintenance: [] });
});

test("enriched incident fields survive normalization, junk does not", () => {
  const result = normalizeSummaryPayload({
    ok: true,
    overall: "degraded",
    components: [
      {
        key: "backend",
        status: "operational",
        history: [],
        stats: {
          incidents_30d: 16,
          disruption_minutes_30d: 9771,
          mttr_minutes: 747,
          days_with_issues_30d: 15,
          days_recorded: 30,
        },
      },
    ],
    incidents: {
      active: [
        {
          key: "backend",
          status: "degraded",
          started_at: "2026-08-13T12:11:05Z",
          confirmed: true,
          areas: ["database", "R2"],
          stage: "identified",
          update_count: 5,
        },
      ],
      resolved: [],
      maintenance: [
        { key: "security_delivery", starts_at: "2026-08-14T01:00:00Z", ends_at: "2026-08-14T04:00:00Z", areas: ["edge_locations"], in_progress: false },
        { key: "backend" }, // dropped: no starts_at
      ],
    },
  });
  assert.ok(result.ok);
  if (!result.ok) return;

  assert.equal(result.components[0].stats?.incidents_30d, 16);
  assert.equal(result.components[0].stats?.mttr_minutes, 747);

  const active = result.incidents.active[0];
  assert.equal(active.stage_label, "Cause identified");
  assert.equal(active.update_count, 5);
  // "R2" is not a slug this table knows, so it never reaches the page.
  assert.deepEqual(active.areas, ["Databases"]);

  assert.equal(result.incidents.maintenance.length, 1);
  assert.equal(result.incidents.maintenance[0].label, "Edge security & delivery");
  assert.deepEqual(result.incidents.maintenance[0].areas, ["Edge locations"]);
});

test("day detail carries transitions, breakdown and disruption", () => {
  const detail = normalizeDayDetailPayload({
    ok: true,
    key: "security_delivery",
    date: "2026-08-13",
    observed: true,
    day_status: "degraded",
    day_source: "observed",
    disruption_minutes: 103,
    checks: {
      total: 17,
      healthy: 0,
      unreadable: 1,
      breakdown: { degraded: 17, unknown: 1, bogus_status: 4 },
      first_at: "2026-08-13T12:11:05Z",
      last_at: "2026-08-13T13:05:00Z",
    },
    transitions: [
      { at: "2026-08-13T12:11:05Z", from: null, to: "degraded" },
      { at: "2026-08-13T12:40:00Z", from: "degraded", to: "operational" },
      { at: "2026-08-13T12:50:00Z", from: "operational", to: "nonsense" }, // dropped
    ],
  });
  assert.ok(detail.ok);
  if (!detail.ok) return;
  assert.equal(detail.disruption_minutes, 103);
  assert.equal(detail.day_source, "observed");
  assert.equal(detail.transitions.length, 2);
  assert.equal(detail.transitions[0].from, null);
  assert.equal(detail.transitions[1].to, "operational");
  assert.equal(detail.checks?.unreadable, 1);
  // Unknown status keys are dropped; the rest sort worst-first.
  assert.deepEqual(
    detail.checks?.breakdown.map((b) => b.status),
    ["degraded", "unknown"],
  );
  assert.equal(detail.checks?.breakdown[0].label, STATUS_LABELS.degraded);
});

test("area slugs render only from the closed vocabulary", () => {
  // The server derives these slugs from vendor sub-component names ("R2",
  // "Codespaces"). This table owns the words; anything it does not know is
  // dropped, so a drifted or hostile server cannot put vendor-shaped text
  // on the page.
  assert.deepEqual(mapAreaSlugs(["storage", "auth"]), ["File storage", "Sign-in"]);
  assert.deepEqual(mapAreaSlugs(["R2", "Codespaces", "Workers KV"]), []);
  assert.deepEqual(mapAreaSlugs(["storage", "storage"]), ["File storage"]);
  assert.deepEqual(mapAreaSlugs(["auth", 42, null, "not_a_slug"]), ["Sign-in"]);
  assert.deepEqual(mapAreaSlugs("storage"), []);
  assert.deepEqual(mapAreaSlugs(undefined), []);
});

test("lifecycle stages outside the known set are dropped", () => {
  const detail = normalizeDayDetailPayload({
    ok: true,
    key: "backend",
    date: "2026-08-12",
    incidents: [
      {
        source: "vendor_feed",
        worst_status: "degraded",
        started_at: "2026-08-12T16:16:17Z",
        lifecycle: [
          { stage: "investigating", at: "2026-08-12T16:16:17Z" },
          { stage: "postmortem_with_vendor_name", at: "2026-08-12T16:20:00Z" },
          { stage: "resolved", at: "2026-08-12T16:41:18Z" },
        ],
      },
    ],
  });
  assert.ok(detail.ok);
  if (!detail.ok) return;
  const stages = detail.incidents[0].lifecycle.map((l) => l.stage);
  assert.deepEqual(stages, ["investigating", "resolved"]);
  assert.equal(detail.incidents[0].lifecycle[0].label, "Investigating");
});

test("formatDurationMs reads like a human wrote it", () => {
  assert.equal(formatDurationMs(30_000), "moments");
  assert.equal(formatDurationMs(42 * 60_000), "42m");
  assert.equal(formatDurationMs(3 * 3_600_000 + 20 * 60_000), "3h 20m");
  assert.equal(formatDurationMs(4 * 3_600_000), "4h");
  assert.equal(formatDurationMs(2 * 86_400_000 + 5 * 3_600_000), "2d 5h");
  assert.equal(formatDurationMs(Number.NaN), "moments");
});

test("normalizeDayDetailPayload tolerates junk and keeps the good parts", () => {
  assert.deepEqual(normalizeDayDetailPayload(null), { ok: false });
  assert.deepEqual(normalizeDayDetailPayload({ ok: true }), { ok: false });

  const detail = normalizeDayDetailPayload({
    ok: true,
    key: "backend",
    date: "2026-08-13",
    observed: true,
    day_status: "operational",
    checks: { total: 17, healthy: 17 },
    hours: [
      { hour: 12, status: "degraded", checks: 11 },
      { hour: 13, status: "none", checks: 0 },
      { hour: 14, status: "made_up", checks: 2 }, // unknown-ized, kept
      "garbage", // dropped
    ],
    incidents: [
      { source: "observed", worst_status: "degraded", started_at: "2026-08-13T12:11:05Z", ended_at: null },
      { source: "hacked", worst_status: "nope", started_at: "2026-08-13T01:00:00Z", ended_at: "2026-08-13T02:00:00Z" },
      { no_start: true }, // dropped
    ],
  });
  assert.ok(detail.ok);
  if (!detail.ok) return;
  assert.equal(detail.observed, true);
  assert.equal(detail.checks?.total, 17);
  assert.equal(detail.checks?.healthy, 17);
  // Absent enrichment fields degrade to empty rather than undefined.
  assert.deepEqual(detail.checks?.breakdown, []);
  assert.equal(detail.checks?.unreadable, 0);
  assert.equal(detail.disruption_minutes, 0);
  assert.deepEqual(detail.transitions, []);
  assert.equal(detail.hours.length, 3);
  assert.equal(detail.hours[1].status, "none");
  assert.equal(detail.hours[2].status, "unknown");
  assert.equal(detail.incidents.length, 2);
  assert.equal(detail.incidents[0].ended_at, null);
  // Unrecognized source/status degrade to safe values, never leak through.
  assert.equal(detail.incidents[1].source, "observed");
  assert.equal(detail.incidents[1].worst_status, "degraded");
});

test("normalizeSummaryPayload degrades malformed input without breaking", () => {
  assert.deepEqual(normalizeSummaryPayload(null), { ok: false });
  assert.deepEqual(normalizeSummaryPayload("nope"), { ok: false });
  assert.deepEqual(normalizeSummaryPayload({ ok: false }), { ok: false });
  assert.deepEqual(normalizeSummaryPayload({ ok: true, components: "x" }), { ok: false });

  const result = normalizeSummaryPayload({
    ok: true,
    overall: "made_up",
    components: [
      { key: "mystery_component", status: "down", uptime: "97", history: [{ nope: 1 }, { date: "2026-08-12", status: "weird" }] },
      42,
    ],
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.overall, "unknown");
  assert.equal(result.components.length, 1);
  const mystery = result.components[0];
  assert.equal(mystery.label, FALLBACK_COMPONENT_LABEL);
  assert.equal(mystery.status, "unknown");
  assert.equal(mystery.uptime, null);
  assert.deepEqual(mystery.history, [{ date: "2026-08-12", status: "unknown" }]);
});
