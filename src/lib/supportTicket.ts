/**
 * Support Portal — ticket field specification.
 *
 * Single source of truth for the /support form: option lists, validation rules
 * and the outbound payload shape for the Aurixa Mission Control support-ticket
 * ingest contract (version 1). The page renders these options and the
 * `support-ticket` edge function re-validates against the same bounds
 * server-side, so a rule change here must be mirrored there.
 *
 * Pure module — no `import.meta.env`, no browser globals — so the Node test
 * runner can exercise every rule directly.
 */

export type Option = { value: string; label: string };

/** Mission Control classifies these into P0–P3; the values are the contract's enum. */
export const CATEGORY_OPTIONS: Option[] = [
  { value: "security_threat", label: "Security threat" },
  { value: "api_outage", label: "API / integration outage" },
  { value: "provider_downtime", label: "Upstream provider downtime" },
  { value: "bug", label: "Bug or unexpected behaviour" },
  { value: "performance", label: "Performance problem" },
  { value: "data_issue", label: "Data issue or discrepancy" },
  { value: "access", label: "Access or login problem" },
  { value: "billing", label: "Billing or usage metering" },
  { value: "feature_request", label: "Feature request" },
  { value: "question", label: "Question" },
  { value: "other", label: "Something else" },
];

/** How broken things are, in the reporter's own terms. */
export const BREAKAGE_OPTIONS: Option[] = [
  { value: "full_outage", label: "Everything is down" },
  { value: "partial_outage", label: "A whole area is down" },
  { value: "degraded_performance", label: "Slow or degraded" },
  { value: "single_feature", label: "One feature is broken" },
  { value: "intermittent", label: "Comes and goes" },
  { value: "cosmetic", label: "Cosmetic / visual" },
  { value: "none", label: "No breakage: question or request" },
];

// ── Bounds (mirrored in supabase/functions/support-ticket/index.ts) ──────────

export const MAX_WORKSPACE_ID = 120;
export const MAX_USER_ID = 120;
export const MAX_REPORTER_NAME = 120;
export const MAX_REPORTER_EMAIL = 320;
export const MIN_SUBJECT = 4;
export const MAX_SUBJECT = 160;
export const MIN_DESCRIPTION = 20;
export const MAX_DESCRIPTION = 5000;
export const MAX_IMPACT = 1000;

// ── Form model ───────────────────────────────────────────────────────────────

export type SupportTicketValues = {
  workspaceId: string;
  userId: string;
  reporterName: string;
  reporterEmail: string;
  category: string;
  breakageVector: string;
  subject: string;
  description: string;
  impact: string;
  /** Honeypot. Humans never see it; a non-empty value means "silently drop". */
  website: string;
};

export const EMPTY_SUPPORT_TICKET: SupportTicketValues = {
  workspaceId: "",
  userId: "",
  reporterName: "",
  reporterEmail: "",
  category: "bug",
  breakageVector: "single_feature",
  subject: "",
  description: "",
  impact: "",
  website: "",
};

export type SupportTicketField = keyof SupportTicketValues;

const isOption = (options: Option[], value: string) =>
  options.some((option) => option.value === value);

/**
 * Deliberately loose: "chars either side of an @" catches the mistakes people
 * actually make in a support form (pasting a name, leaving it blank) without
 * rejecting valid-but-unusual addresses. Mission Control validates properly.
 */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+$/.test(value);

/** Field-specific, plain-English errors. Empty object means the form may submit. */
export function validateSupportTicket(
  values: SupportTicketValues,
): Partial<Record<SupportTicketField, string>> {
  const errors: Partial<Record<SupportTicketField, string>> = {};

  const workspaceId = values.workspaceId.trim();
  if (!workspaceId) errors.workspaceId = "Enter your workspace ID.";
  else if (workspaceId.length > MAX_WORKSPACE_ID)
    errors.workspaceId = `Workspace ID must be ${MAX_WORKSPACE_ID} characters or fewer.`;

  const reporterName = values.reporterName.trim();
  if (reporterName.length > MAX_REPORTER_NAME)
    errors.reporterName = `Please keep your name under ${MAX_REPORTER_NAME} characters.`;

  const reporterEmail = values.reporterEmail.trim();
  if (!reporterEmail) errors.reporterEmail = "Enter your email address so we can reply.";
  else if (reporterEmail.length > MAX_REPORTER_EMAIL || !looksLikeEmail(reporterEmail))
    errors.reporterEmail = "Enter a valid email address, for example name@firm.com.au.";

  if (!isOption(CATEGORY_OPTIONS, values.category))
    errors.category = "Select what kind of issue this is.";

  if (!isOption(BREAKAGE_OPTIONS, values.breakageVector))
    errors.breakageVector = "Select how much is affected.";

  const subject = values.subject.trim();
  if (!subject) errors.subject = "Give the ticket a short subject.";
  else if (subject.length < MIN_SUBJECT || subject.length > MAX_SUBJECT)
    errors.subject = `Subject must be between ${MIN_SUBJECT} and ${MAX_SUBJECT} characters.`;

  const description = values.description.trim();
  if (!description) errors.description = "Describe what happened.";
  else if (description.length < MIN_DESCRIPTION || description.length > MAX_DESCRIPTION)
    errors.description = `Description must be between ${MIN_DESCRIPTION} and ${MAX_DESCRIPTION} characters. Include what you did, what you expected and what you saw.`;

  if (values.impact.trim().length > MAX_IMPACT)
    errors.impact = `Please keep the impact note under ${MAX_IMPACT} characters.`;

  return errors;
}

// ── Outbound payload (Mission Control ingest contract, version 1) ────────────

export type SupportTicketMeta = {
  source: "npc-dashboard" | "direct";
  url: string;
  userAgent: string;
};

export type SupportTicketPayload = {
  version: 1;
  workspace_id: string;
  user_id?: string;
  reporter_name?: string;
  reporter_email: string;
  category: string;
  breakage_vector: string;
  subject: string;
  description: string;
  impact?: string;
  client_meta: { source: "npc-dashboard" | "direct"; url: string; user_agent: string };
};

/**
 * Builds the exact JSON the ingest endpoint expects: trimmed values, empty
 * optionals omitted rather than sent as "". `user_id` arrives from the
 * dashboard's URL rather than a field the reporter can edit, so an overlong
 * value is clamped instead of failing a submission nobody could fix.
 */
export function buildSupportTicketPayload(
  values: SupportTicketValues,
  meta: SupportTicketMeta,
): SupportTicketPayload {
  const payload: SupportTicketPayload = {
    version: 1,
    workspace_id: values.workspaceId.trim(),
    reporter_email: values.reporterEmail.trim().toLowerCase(),
    category: values.category,
    breakage_vector: values.breakageVector,
    subject: values.subject.trim(),
    description: values.description.trim(),
    client_meta: {
      source: meta.source === "npc-dashboard" ? "npc-dashboard" : "direct",
      url: meta.url.slice(0, 500),
      user_agent: meta.userAgent.slice(0, 400),
    },
  };

  const userId = values.userId.trim().slice(0, MAX_USER_ID);
  if (userId) payload.user_id = userId;

  const reporterName = values.reporterName.trim();
  if (reporterName) payload.reporter_name = reporterName;

  const impact = values.impact.trim();
  if (impact) payload.impact = impact;

  return payload;
}
