/**
 * Stage 1 — Priority Access Application.
 *
 * Single source of truth for the waitlist field specification defined in the
 * Aurixa Systems Priority Access, Qualification & Onboarding Operating Model
 * (v1.0, section 5 and Appendix A): option lists, production copy, validation
 * rules, the admin-controlled intake badge and the outbound payload shape.
 *
 * Option identifiers are stable slugs — labels may be reworded after usability
 * testing, but slugs must not change or historical reporting breaks.
 */

import { FREE_TRIAL_DAYS, freeTrialOf } from "./cta";

/** The form's heading and closing note for a trial of `days` — the default, or an offer's. */
export const trialFormHeading = (days: number) => `Apply for your ${freeTrialOf(days)}`;
export const trialPreSubmit = (days: number) =>
  `After you submit, we will email a secure questionnaire. It takes approximately 6-8 minutes and helps us assess your workflows, technology environment and preferred Aurixa capabilities. The Aurixa team reviews every application before your workspace is provisioned, and your ${days}-day trial begins the day that workspace goes live.`;

/** Bumped whenever fields, options or required-ness change. Stored on every lead. */
export const WAITLIST_FORM_VERSION = "stage-1-priority-access-v3";

/** Bumped whenever the collection notice wording changes. Stored on every lead. */
export const PRIVACY_NOTICE_VERSION = "collection-notice-2026-07-v1";

export type Option = { value: string; label: string };

/** Section 5.3 — Your Role. */
export const ROLE_OPTIONS: Option[] = [
  { value: "founder_director", label: "Founder or Director" },
  { value: "ceo", label: "Chief Executive Officer" },
  { value: "coo", label: "Chief Operating Officer" },
  { value: "technology_lead", label: "Technology or Systems Lead" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "compliance_risk_manager", label: "Compliance or Risk Manager" },
  { value: "buyers_agent", label: "Buyer's Agent" },
  { value: "property_advisor", label: "Property Advisor" },
  { value: "finance_professional", label: "Finance or Mortgage Professional" },
  { value: "administration_support", label: "Administration or Support" },
  { value: "other", label: "Other" },
];

/**
 * Section 5.3 — Organisation Type.
 *
 * Slugs already carried by the Make.com → Airtable pipeline are preserved
 * (buyers_agent, property_advisory, real_estate_agency, mortgage_finance,
 * developer) so existing records stay comparable.
 */
export const ORGANISATION_TYPE_OPTIONS: Option[] = [
  { value: "buyers_agent", label: "Buyer's Agency" },
  { value: "property_advisory", label: "Property Advisory" },
  { value: "real_estate_agency", label: "Real Estate Agency" },
  { value: "mortgage_finance", label: "Mortgage or Finance Brokerage" },
  { value: "developer", label: "Property Development" },
  { value: "construction", label: "Construction or Building" },
  { value: "accounting_smsf", label: "Accounting or SMSF Advisory" },
  { value: "conveyancing_legal", label: "Conveyancing or Legal Services" },
  { value: "property_management", label: "Property Management" },
  { value: "multi_service_group", label: "Multi-service Property Group" },
  { value: "technology_partner", label: "Technology or Integration Partner" },
  { value: "other", label: "Other" },
];

/** Section 5.3 — Approximate Annual Client or Transaction Volume. */
export const VOLUME_OPTIONS: Option[] = [
  { value: "pre_launch_under_10", label: "Pre-launch or fewer than 10" },
  { value: "10_to_25", label: "10 - 25" },
  { value: "26_to_75", label: "26 - 75" },
  { value: "76_to_150", label: "76 - 150" },
  { value: "151_to_300", label: "151 - 300" },
  { value: "301_to_500", label: "301 - 500" },
  { value: "over_500", label: "More than 500" },
  { value: "not_yet_known", label: "Not yet known" },
];

/** Section 5.3 — Primary Areas to Improve (multi-select, 1-3 selections). */
export const IMPROVEMENT_AREA_OPTIONS: Option[] = [
  { value: "disconnected_systems", label: "Disconnected systems and duplicate data entry" },
  { value: "onboarding_delays", label: "Client onboarding delays" },
  { value: "manual_reporting", label: "Manual report preparation" },
  { value: "client_communication", label: "Client communication and follow-up" },
  { value: "finance_coordination", label: "Finance or broker coordination" },
  { value: "document_management", label: "Document collection and management" },
  { value: "compliance_aml", label: "Compliance and AML administration" },
  { value: "property_research", label: "Property research and due diligence" },
  { value: "workflow_visibility", label: "Workflow visibility and accountability" },
  { value: "data_security", label: "Data security and access controls" },
  { value: "other", label: "Other" },
];

export const MAX_IMPROVEMENT_AREAS = 3;
export const MAX_ADDITIONAL_NOTES = 500;
export const MAX_TECH_STACK_BOTTLENECKS = 1000;

const labelFor = (options: Option[], value: string) =>
  options.find((option) => option.value === value)?.label ?? "";

/** Appendix A.1 / A.2 — production copy deck. */
export const WAITLIST_COPY = {
  heading: trialFormHeading(FREE_TRIAL_DAYS),
  supporting:
    "Tell us a little about your organisation. Once submitted, we will send you a short Business Readiness Questionnaire to help identify the most suitable Aurixa platform configuration.",
  timeEstimate: "Applications generally take 60-90 seconds to complete.",
  requiredNote: "Required fields are marked *",
  confidentiality:
    "Please do not include client identification documents, financial records or confidential client information.",
  preSubmit: trialPreSubmit(FREE_TRIAL_DAYS),
  submitButton: "Apply for my free trial",
  submittingButton: "Transmitting Credentials...",
  queueStatus: "Queue Active",
  reviewStatus: "Application Review Pending",
  privacyAcknowledgement:
    "I acknowledge that Aurixa Systems will collect and use the information in accordance with the collection notice and Privacy Policy.",
  marketingConsent:
    "I would like to receive optional Aurixa product, event and future-intake updates. I can unsubscribe at any time.",
  helper: {
    workEmail: "Use your organisation-issued email address.",
    mobileNumber: "Include country code where outside Australia.",
    volume: 'A best estimate is sufficient. Select "Not yet known" where appropriate.',
    improvementAreas: "Select up to three priorities.",
    additionalNotes: "Optional. Please do not include confidential client or financial information.",
  },
  placeholder: {
    techStackBottlenecks:
      "Detail the fragmentation or inefficiencies currently stalling your firm's pipeline...",
  },
} as const;

/**
 * Vite replaces `import.meta.env` with the resolved env object at build time.
 * Reading it once through this constant keeps the module importable outside a
 * Vite pipeline (the Node test runner), where `import.meta.env` is undefined.
 */
const viteEnv: Record<string, string | undefined> =
  (import.meta.env as Record<string, string | undefined>) ?? {};

/**
 * Section 3.3 / section 20 — the intake badge is administration-controlled and
 * expires to a safe default so stale campaign wording cannot linger on the site.
 *
 * VITE_INTAKE_BADGE selects one of the approved labels; VITE_INTAKE_BADGE_EXPIRES
 * is an ISO date after which the badge reverts to the default. Anything
 * unrecognised, malformed or expired falls back to "Applications Under Review".
 */
const INTAKE_BADGES: Record<string, string> = {
  applications_open: "Applications Now Open",
  priority_review_window: "Priority Review Window",
  august_2026_intake: "August 2026 Intake",
  limited_capacity: "Limited Onboarding Capacity",
  under_review: "Applications Under Review",
  enterprise_intake: "Enterprise Intake Open",
};

const DEFAULT_INTAKE_BADGE = INTAKE_BADGES.under_review;

export function resolveIntakeBadge(now: Date = new Date()): string {
  const selected = viteEnv.VITE_INTAKE_BADGE;
  const badge = selected ? INTAKE_BADGES[selected] : undefined;
  if (!badge) return DEFAULT_INTAKE_BADGE;

  const expiry = viteEnv.VITE_INTAKE_BADGE_EXPIRES;
  if (expiry) {
    const expiresAt = new Date(expiry);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return DEFAULT_INTAKE_BADGE;
    }
  }

  return badge;
}

/** Stage 2 link is only offered once the readiness questionnaire is live. */
export const READINESS_QUESTIONNAIRE_URL = viteEnv.VITE_READINESS_QUESTIONNAIRE_URL ?? "";

export const PRIVACY_POLICY_URL = viteEnv.VITE_PRIVACY_POLICY_URL ?? "";

// ── Normalisation ───────────────────────────────────────────────────────────

export const cleanTextValue = (value: string) =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const cleanEmailValue = (value: string) => cleanTextValue(value).toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Normalise a telephone number to E.164. Australian numbers may be entered in
 * local form (04XX XXX XXX or 02 XXXX XXXX) and default to +61; anything else
 * must carry an explicit country code. Returns "" when the value is not a
 * recognisable number.
 */
export function normaliseMobileNumber(value: string): string {
  const compact = value.replace(/[\s().-]/g, "");
  if (!compact) return "";

  if (/^0[2-9]\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^61[2-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+61[2-9]\d{8}$/.test(compact)) return compact;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;

  return "";
}

/** Masks an email for display on the confirmation screen (section 5.6). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

/**
 * Non-sequential public application reference (section 13.3). Generated on the
 * client so the same value can be used as an idempotency key across the
 * Make.com webhook, Aurixa's own backend and Mission Control.
 */
export function generateApplicationId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  return `AX-${uuid.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

// ── Form model, validation and payload ──────────────────────────────────────

export type WaitlistFormValues = {
  firstName: string;
  lastName: string;
  workEmail: string;
  mobileNumber: string;
  organisationName: string;
  role: string;
  organisationType: string;
  annualVolume: string;
  currentTechStackBottlenecks: string;
  improvementAreas: string[];
  additionalNotes: string;
  privacyAcknowledged: boolean;
  marketingConsent: boolean;
};

export const EMPTY_WAITLIST_FORM: WaitlistFormValues = {
  firstName: "",
  lastName: "",
  workEmail: "",
  mobileNumber: "",
  organisationName: "",
  role: "",
  organisationType: "",
  annualVolume: "",
  currentTechStackBottlenecks: "",
  improvementAreas: [],
  additionalNotes: "",
  privacyAcknowledged: false,
  marketingConsent: false,
};

export type WaitlistFieldError = keyof WaitlistFormValues;

/** Field-specific, text-based errors (section 5.4 / 14.4). */
export function validateWaitlistForm(
  values: WaitlistFormValues,
): Partial<Record<WaitlistFieldError, string>> {
  const errors: Partial<Record<WaitlistFieldError, string>> = {};

  const firstName = cleanTextValue(values.firstName);
  if (!firstName) errors.firstName = "Enter your first name.";
  else if (firstName.length < 2 || firstName.length > 60)
    errors.firstName = "First name must be between 2 and 60 characters.";

  const lastName = cleanTextValue(values.lastName);
  if (!lastName) errors.lastName = "Enter your last name.";
  else if (lastName.length < 2 || lastName.length > 60)
    errors.lastName = "Last name must be between 2 and 60 characters.";

  const workEmail = cleanEmailValue(values.workEmail);
  if (!workEmail) errors.workEmail = "Enter your corporate email address.";
  else if (!isValidEmail(workEmail)) errors.workEmail = "Enter a valid email address, for example name@firm.com.au.";

  if (!values.mobileNumber.trim()) {
    errors.mobileNumber = "Enter your mobile number.";
  } else if (!normaliseMobileNumber(values.mobileNumber)) {
    errors.mobileNumber =
      "Enter an Australian mobile or landline (for example 0412 345 678), or include the country code for international numbers.";
  }

  const organisationName = cleanTextValue(values.organisationName);
  if (!organisationName) errors.organisationName = "Enter your entity name.";
  else if (organisationName.length < 2 || organisationName.length > 120)
    errors.organisationName = "Entity name must be between 2 and 120 characters.";

  if (!values.role) errors.role = "Select your role.";
  if (!values.organisationType) errors.organisationType = "Select your organisation type.";
  if (!values.annualVolume) errors.annualVolume = "Select an approximate annual volume.";

  const techStackBottlenecks = cleanTextValue(values.currentTechStackBottlenecks);
  if (!techStackBottlenecks)
    errors.currentTechStackBottlenecks =
      "Describe the current technology or workflow bottlenecks affecting your organisation.";
  else if (techStackBottlenecks.length > MAX_TECH_STACK_BOTTLENECKS)
    errors.currentTechStackBottlenecks = `Please keep this under ${MAX_TECH_STACK_BOTTLENECKS} characters.`;

  if (values.improvementAreas.length === 0)
    errors.improvementAreas = "Select at least one area you would like Aurixa to improve.";
  else if (values.improvementAreas.length > MAX_IMPROVEMENT_AREAS)
    errors.improvementAreas = `Select no more than ${MAX_IMPROVEMENT_AREAS} priorities.`;

  if (values.additionalNotes.length > MAX_ADDITIONAL_NOTES)
    errors.additionalNotes = `Please keep this under ${MAX_ADDITIONAL_NOTES} characters.`;

  if (!values.privacyAcknowledged)
    errors.privacyAcknowledged = "Please acknowledge the collection notice to continue.";

  return errors;
}

export type WaitlistAttribution = {
  source: string;
  page: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
};

/**
 * Builds the outbound payload.
 *
 * The original Make.com → Airtable field names are retained verbatim so the
 * existing scenario keeps working; the Stage 1 structured answers are added
 * alongside them. `currentTechStackBottlenecks` carries the applicant's own
 * bottleneck description; the structured selections are summarised into
 * `message` for systems that expect a single free-text column.
 */
export function buildWaitlistPayload(
  values: WaitlistFormValues,
  applicationId: string,
  attribution: WaitlistAttribution,
  /** The trial offer the visitor arrived on (`?trial=CODE`), once Mission Control confirmed it. */
  trialOfferCode: string | null = null,
) {
  const firstName = cleanTextValue(values.firstName);
  const lastName = cleanTextValue(values.lastName);
  const workEmail = cleanEmailValue(values.workEmail);
  const mobileNumber = normaliseMobileNumber(values.mobileNumber);
  const organisationName = cleanTextValue(values.organisationName);
  const additionalNotes = cleanTextValue(values.additionalNotes).slice(0, MAX_ADDITIONAL_NOTES);
  const currentTechStackBottlenecks = cleanTextValue(values.currentTechStackBottlenecks).slice(
    0,
    MAX_TECH_STACK_BOTTLENECKS,
  );

  const improvementAreaLabels = values.improvementAreas.map((value) =>
    labelFor(IMPROVEMENT_AREA_OPTIONS, value),
  );
  const bottleneckSummary = [
    currentTechStackBottlenecks,
    improvementAreaLabels.join("; "),
    additionalNotes,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    // Legacy field names — unchanged for the existing Make.com scenario.
    directiveFirstName: firstName,
    directiveLastName: lastName,
    corporateEmail: workEmail,
    mobileNumber,
    entityName: organisationName,
    entityClassification: values.organisationType,
    annualOriginationTransactionVolume: values.annualVolume,
    currentTechStackBottlenecks,

    // Stage 1 structured answers.
    applicationId,
    formVersion: WAITLIST_FORM_VERSION,
    firstName,
    lastName,
    workEmail,
    organisationName,
    role: values.role,
    roleLabel: labelFor(ROLE_OPTIONS, values.role),
    organisationType: values.organisationType,
    organisationTypeLabel: labelFor(ORGANISATION_TYPE_OPTIONS, values.organisationType),
    annualVolume: values.annualVolume,
    annualVolumeLabel: labelFor(VOLUME_OPTIONS, values.annualVolume),
    primaryAreasToImprove: values.improvementAreas,
    primaryAreasToImproveLabels: improvementAreaLabels,
    additionalNotes,

    // Consent is recorded separately from the application itself (section 14.2).
    privacyAcknowledged: values.privacyAcknowledged,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    marketingConsent: values.marketingConsent,

    // Column-friendly aliases for the capture-lead store of record.
    name: `${firstName} ${lastName}`.trim(),
    email: workEmail,
    company: organisationName,
    phone: mobileNumber,
    message: bottleneckSummary,

    ...attribution,
    // Only when an offer applies, so every other application's payload is
    // exactly what Make and Airtable have always received.
    ...(trialOfferCode ? { trialOfferCode } : {}),
    submittedAt: new Date().toISOString(),
  };
}
