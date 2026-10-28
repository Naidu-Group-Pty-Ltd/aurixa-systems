/**
 * Stage 2 — Business Readiness Questionnaire.
 *
 * Single source of truth for the question bank, option lists, production copy,
 * conditional logic and validation defined in the Aurixa Systems Priority
 * Access, Qualification & Onboarding Operating Model (v1.0, section 6 and
 * Appendix B).
 *
 * Question identifiers (BRQ-NN) and option slugs are stable: labels may be
 * reworded after usability testing, but identifiers and slugs must not change
 * or historical reporting and response-version comparison break (Appendix B).
 *
 * Nothing in this module computes, stores or exposes a qualification score,
 * priority class or tier recommendation — those are Stage 3 outputs produced
 * server-side and are never sent to the applicant (section 7).
 */

import { Option, ROLE_OPTIONS, cleanTextValue } from "./waitlist";

/** Stored on every response. Bump when questions, options or requiredness change. */
export const QUESTIONNAIRE_VERSION = "business-readiness-v1";

export type { Option };

// ── Answer model ────────────────────────────────────────────────────────────

export type AnswerValue = string | string[] | number | null;

/** Answers keyed by stable question identifier. */
export type AnswerMap = Record<string, AnswerValue>;

/**
 * One stored answer. `active` reflects whether the question was displayed under
 * the applicant's current answers — inactive conditional answers are retained
 * (so nothing is lost when a selection is changed back) but are never submitted
 * as active responses.
 */
export type StoredAnswer = {
  questionId: string;
  value: AnswerValue;
  active: boolean;
};

/** Mirrors the `qualification_responses` object in section 13.2. */
export type ReadinessResponseDocument = {
  applicationId: string;
  questionnaireVersion: string;
  responseVersion: number;
  status: "not_started" | "in_progress" | "completed";
  startedAt: string | null;
  lastSavedAt: string | null;
  completedAt: string | null;
  answers: StoredAnswer[];
  activeConditionalQuestionIds: string[];
};

// ── Question identifiers ────────────────────────────────────────────────────

export const Q = {
  role: "BRQ-01",
  roleOther: "BRQ-01-OTHER",

  authority: "BRQ-02",
  authorityOther: "BRQ-02-OTHER",

  userCount: "BRQ-03",
  entityStructure: "BRQ-04",

  regions: "BRQ-05",

  systems: "BRQ-06",
  systemsOther: "BRQ-06-OTHER",
  /** Optional product name per selected system category: `BRQ-06-PRODUCT:<slug>`. */
  systemProductPrefix: "BRQ-06-PRODUCT",
  informationManagement: "BRQ-06A",
  informationManagementOther: "BRQ-06A-OTHER",

  problems: "BRQ-07",
  problemsOther: "BRQ-07-OTHER",

  adminTime: "BRQ-08",
  difficultWorkflow: "BRQ-09",

  capabilities: "BRQ-10",

  integrations: "BRQ-11",
  customSystemName: "BRQ-11-CUSTOM-NAME",
  customSystemApi: "BRQ-11-CUSTOM-API",
  customSystemOwner: "BRQ-11-CUSTOM-OWNER",
  customSystemWorkflow: "BRQ-11-CUSTOM-WORKFLOW",
  phoneSystem: "BRQ-11-PHONE-SYSTEM",

  migration: "BRQ-12",
  migrationSources: "BRQ-12-SOURCES",
  migrationRecords: "BRQ-12-RECORDS",
  migrationDocuments: "BRQ-12-DOCUMENTS",
  migrationQuality: "BRQ-12-QUALITY",
  migrationTiming: "BRQ-12-TIMING",

  timing: "BRQ-13",

  security: "BRQ-14",
  securityContext: "BRQ-14-CONTEXT",
  enterpriseSso: "BRQ-14-SSO",
  enterpriseBoundaries: "BRQ-14-BOUNDARIES",
  enterpriseProcurement: "BRQ-14-PROCUREMENT",

  nextStep: "BRQ-15",

  investmentRange: "BRQ-16",
  projectSponsor: "BRQ-16-SPONSOR",
} as const;

/** Sentinel stored in a numeric field when the applicant cannot supply a figure. */
export const NOT_YET_KNOWN = "not_yet_known";

export const systemProductQuestionId = (systemValue: string) =>
  `${Q.systemProductPrefix}:${systemValue}`;

// ── Option lists (Appendix B) ───────────────────────────────────────────────

/** BRQ-01 reuses the Stage 1 role list verbatim — no second, conflicting list. */
export const READINESS_ROLE_OPTIONS = ROLE_OPTIONS;

export const AUTHORITY_OPTIONS: Option[] = [
  { value: "final_decision_maker", label: "Final decision-maker" },
  { value: "decision_group", label: "Part of the decision group" },
  { value: "recommender", label: "Recommend to the decision-maker" },
  { value: "researching", label: "Researching" },
  { value: "other", label: "Other" },
];

export const USER_COUNT_OPTIONS: Option[] = [
  { value: "1_to_3", label: "1-3" },
  { value: "4_to_10", label: "4-10" },
  { value: "11_to_25", label: "11-25" },
  { value: "26_to_50", label: "26-50" },
  { value: "51_to_100", label: "51-100" },
  { value: "more_than_100", label: "More than 100" },
  { value: "not_yet_known", label: "Not yet known" },
];

export const ENTITY_STRUCTURE_OPTIONS: Option[] = [
  { value: "single_office", label: "One office or entity" },
  { value: "multiple_offices_one_entity", label: "Multiple offices within one entity" },
  { value: "multiple_legal_entities", label: "Multiple legal entities" },
  { value: "franchise_network", label: "Franchise or network" },
  { value: "national", label: "National organisation" },
  { value: "international", label: "International or multi-jurisdiction organisation" },
];

export const REGION_OPTIONS: Option[] = [
  { value: "act", label: "ACT" },
  { value: "nsw", label: "NSW" },
  { value: "nt", label: "NT" },
  { value: "qld", label: "QLD" },
  { value: "sa", label: "SA" },
  { value: "tas", label: "TAS" },
  { value: "vic", label: "VIC" },
  { value: "wa", label: "WA" },
];

export const SYSTEM_OPTIONS: Option[] = [
  { value: "crm", label: "CRM" },
  { value: "onboarding", label: "Onboarding system" },
  { value: "email_automation", label: "Email automation" },
  { value: "property_data", label: "Property data" },
  { value: "document_management", label: "Document management" },
  { value: "reporting", label: "Reporting" },
  { value: "accounting", label: "Accounting" },
  { value: "aml_kyc_idv", label: "AML, KYC or identity verification" },
  { value: "telephony", label: "Telephony" },
  { value: "calendar", label: "Calendar" },
  { value: "project_task_management", label: "Project or task management" },
  { value: "no_central_system", label: "No central system" },
  { value: "other", label: "Other" },
];

/** "No central system" cannot coexist with a named central system (section 6.6). */
export const SYSTEMS_EXCLUSIVE_VALUES = ["no_central_system"];

export const INFORMATION_MANAGEMENT_OPTIONS: Option[] = [
  { value: "spreadsheets", label: "Spreadsheets" },
  { value: "email", label: "Email" },
  { value: "documents", label: "Documents" },
  { value: "separate_applications", label: "Separate individual applications" },
  { value: "other", label: "Other" },
];

export const PROBLEM_OPTIONS: Option[] = [
  { value: "duplicate_entry", label: "Duplicate data entry" },
  { value: "fragmented_platforms", label: "Fragmented platforms" },
  { value: "slow_onboarding", label: "Slow client onboarding" },
  { value: "manual_reports", label: "Manual report preparation" },
  { value: "inconsistent_communications", label: "Inconsistent client communications" },
  { value: "limited_pipeline_visibility", label: "Limited pipeline visibility" },
  { value: "poor_task_accountability", label: "Poor task accountability" },
  { value: "finance_handover_delays", label: "Finance handover delays" },
  { value: "manual_documents", label: "Manual document handling" },
  { value: "compliance_administration", label: "Compliance administration" },
  { value: "limited_analytics", label: "Limited analytics" },
  { value: "difficulty_scaling", label: "Difficulty scaling" },
  { value: "other", label: "Other" },
];

export const MAX_PROBLEMS = 3;

export const ADMIN_TIME_OPTIONS: Option[] = [
  { value: "under_5_hours", label: "Less than 5 hours" },
  { value: "5_to_10_hours", label: "5-10 hours" },
  { value: "11_to_20_hours", label: "11-20 hours" },
  { value: "21_to_40_hours", label: "21-40 hours" },
  { value: "more_than_40_hours", label: "More than 40 hours" },
  { value: "not_measured", label: "Not measured" },
];

export const CAPABILITY_OPTIONS: Option[] = [
  { value: "crm", label: "CRM" },
  { value: "onboarding_workflow", label: "Onboarding and workflow" },
  { value: "buyers_agency_workflow", label: "Buyer's agency workflow" },
  { value: "client_partner_portals", label: "Client and partner portals" },
  { value: "finance_portal", label: "Finance portal" },
  { value: "borrowing_capacity", label: "Borrowing capacity" },
  { value: "cashflow_portfolio_analysis", label: "Cash-flow and portfolio analysis" },
  { value: "property_due_diligence", label: "Property comparison and due diligence" },
  { value: "report_generation", label: "Report generation" },
  { value: "suburb_market_reporting", label: "Suburb and market reporting" },
  { value: "template_builder", label: "Template builder" },
  { value: "ai_communications", label: "AI communications" },
  // Slug stays `voice_automation`: labels may be reworded, identifiers must not
  // change or historical reporting breaks (Appendix B).
  { value: "voice_automation", label: "AI Voice Agents & Call Logging" },
  { value: "calendar_task_automation", label: "Calendar and task automation" },
  { value: "aml_compliance", label: "AML and compliance" },
  { value: "smsf_workflow", label: "SMSF workflow" },
  { value: "market_intelligence", label: "Market intelligence" },
  { value: "api_integrations", label: "API and integrations" },
];

export const RANKED_CAPABILITY_COUNT = 5;

/**
 * Section 6.6 — organisation type may surface the most likely capabilities
 * first. It never removes, reorders away or preselects anything: every option
 * remains selectable and the applicant makes every choice.
 */
const CAPABILITY_PRIORITY_BY_ORGANISATION_TYPE: Record<string, string[]> = {
  buyers_agent: [
    "buyers_agency_workflow",
    "property_due_diligence",
    "report_generation",
    "finance_portal",
    "client_partner_portals",
  ],
  property_advisory: [
    "buyers_agency_workflow",
    "property_due_diligence",
    "report_generation",
    "finance_portal",
    "client_partner_portals",
  ],
  mortgage_finance: [
    "finance_portal",
    "onboarding_workflow",
    "crm",
    "api_integrations",
    "aml_compliance",
  ],
};

export function suggestedCapabilityOrder(organisationType: string | undefined): Option[] {
  const priority = organisationType
    ? CAPABILITY_PRIORITY_BY_ORGANISATION_TYPE[organisationType]
    : undefined;
  if (!priority) return CAPABILITY_OPTIONS;

  const rank = new Map(priority.map((value, index) => [value, index]));
  return [...CAPABILITY_OPTIONS].sort((a, b) => {
    const rankA = rank.get(a.value) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rank.get(b.value) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return CAPABILITY_OPTIONS.indexOf(a) - CAPABILITY_OPTIONS.indexOf(b);
  });
}

export const INTEGRATION_OPTIONS: Option[] = [
  { value: "microsoft_365", label: "Microsoft 365" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "gohighlevel", label: "GoHighLevel" },
  { value: "xero", label: "Xero" },
  { value: "myob", label: "MYOB" },
  { value: "cotality_corelogic", label: "Cotality or CoreLogic" },
  { value: "existing_crm", label: "Existing CRM" },
  { value: "identity_verification", label: "Identity-verification provider" },
  { value: "telephony", label: "Existing Phone or VoIP System" },
  { value: "electronic_signing", label: "Electronic signing" },
  { value: "custom_internal_system", label: "Custom internal system" },
  { value: "none_initially", label: "None initially" },
  { value: "not_yet_known", label: "Not yet known" },
];

export const INTEGRATIONS_EXCLUSIVE_VALUES = ["none_initially", "not_yet_known"];

export const API_AVAILABILITY_OPTIONS: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_yet_known", label: "Not yet known" },
];

export const MIGRATION_OPTIONS: Option[] = [
  { value: "no", label: "No" },
  { value: "basic_contacts", label: "Basic contacts" },
  { value: "client_pipeline", label: "Client and pipeline data" },
  { value: "documents_history", label: "Documents and history" },
  { value: "templates_reports", label: "Templates and reports" },
  { value: "multiple_systems_complex", label: "Multiple systems or complex migration" },
  { value: "not_yet_known", label: "Not yet known" },
];

/** Migration follow-ups appear only for these categories (section 6.6). */
export const MIGRATION_FOLLOW_UP_VALUES = [
  "basic_contacts",
  "client_pipeline",
  "documents_history",
  "templates_reports",
  "multiple_systems_complex",
];

export const MIGRATION_TIMING_OPTIONS: Option[] = [
  { value: "with_go_live", label: "At go-live" },
  { value: "within_30_days", label: "Within 30 days of go-live" },
  { value: "phased", label: "Phased over several stages" },
  { value: "after_go_live", label: "After go-live" },
  { value: "not_yet_known", label: "Not yet known" },
];

export const TIMING_OPTIONS: Option[] = [
  { value: "immediately", label: "Immediately" },
  { value: "within_30_days", label: "Within 30 days" },
  { value: "60_to_90_days", label: "60-90 days" },
  { value: "3_to_6_months", label: "3-6 months" },
  { value: "6_to_12_months", label: "6-12 months" },
  { value: "researching_only", label: "Researching only" },
];

/** Section 6.6 — commercial-readiness follow-ups apply within 90 days only. */
export const WITHIN_90_DAYS_VALUES = ["immediately", "within_30_days", "60_to_90_days"];

export const SECURITY_OPTIONS: Option[] = [
  { value: "mfa", label: "Multi-factor authentication" },
  { value: "sso", label: "Single sign-on" },
  { value: "australian_data_residency", label: "Australian data residency" },
  { value: "rbac", label: "Role-based access control" },
  { value: "penetration_testing", label: "Penetration testing" },
  { value: "sla", label: "Service-level agreement" },
  { value: "vendor_risk_assessment", label: "Vendor-risk assessment" },
  { value: "cyber_insurance", label: "Cyber insurance" },
  { value: "dedicated_environment", label: "Dedicated environment" },
  { value: "none", label: "None" },
  { value: "not_yet_known", label: "Not yet known" },
];

export const SECURITY_EXCLUSIVE_VALUES = ["none", "not_yet_known"];

export const NEXT_STEP_OPTIONS: Option[] = [
  { value: "general_demonstration", label: "General platform demonstration" },
  { value: "workflow_demonstration", label: "Workflow-specific demonstration" },
  { value: "technical_integration", label: "Technical integration consultation" },
  { value: "enterprise_security", label: "Enterprise security consultation" },
  { value: "pricing_discussion", label: "Pricing discussion" },
  { value: "written_information", label: "Written information only" },
];

export const INVESTMENT_RANGE_OPTIONS: Option[] = [
  { value: "not_yet", label: "Not yet" },
  { value: "under_1000", label: "Under A$1,000 per month" },
  { value: "1000_to_2500", label: "A$1,000-A$2,500 per month" },
  { value: "2500_to_5000", label: "A$2,500-A$5,000 per month" },
  { value: "more_than_5000", label: "More than A$5,000 per month" },
  { value: "project_enterprise", label: "Project or enterprise budget" },
  { value: "private_discussion", label: "Prefer a private discussion" },
];

export const YES_NO_UNKNOWN_OPTIONS: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_yet_known", label: "Not yet known" },
];

// ── Character limits ────────────────────────────────────────────────────────

export const LIMITS = {
  roleOther: 120,
  authorityOther: 200,
  systemsOther: 200,
  systemProduct: 80,
  informationManagementOther: 200,
  problemsOther: 200,
  difficultWorkflow: 750,
  customSystemName: 160,
  phoneSystem: 160,
  customSystemOwner: 160,
  customSystemWorkflow: 500,
  migrationSources: 300,
  migrationQuality: 500,
  securityContext: 750,
} as const;

/** Guards against an implausible figure being typed into the numeric fields. */
export const MAX_MIGRATION_COUNT = 100_000_000;

// ── Production copy (sections 6.1, 6.7, 14) ─────────────────────────────────

export const READINESS_COPY = {
  eyebrow: "STAGE 02 / BUSINESS READINESS",
  heading: "Business Readiness Questionnaire",
  supporting:
    "Help us understand your organisation's current systems, operational requirements and implementation priorities so we can identify the most relevant Aurixa pathway.",
  timeEstimate: "Approximately 6-8 minutes",
  saveMessage: "Your progress is saved as you continue.",
  /** Used while there is no authorised session to save against. */
  saveMessageLocal: "Your answers are kept as you move between sections.",
  confidentiality:
    "Please do not include client identification documents, financial records or confidential client information.",
  requiredNote: "Required questions are marked *",

  applicationSummaryHeading: "Application details",
  applicationSummaryIntro: "These details were provided in your free trial application.",
  applicationSummaryCorrection:
    "Need to correct your application details? Contact Aurixa or use the verified correction process supplied with your application.",

  review: {
    heading: "Review your readiness profile",
    supporting:
      "Review the information below before submitting it to Aurixa. You can return to any section to make changes.",
    declaration:
      "By submitting this readiness profile, you confirm that the information is accurate to the best of your knowledge and does not contain confidential client records or identification documents.",
    submit: "Submit Readiness Profile",
    submitting: "Submitting Readiness Profile...",
    unanswered: "Not yet answered",
  },

  completion: {
    heading: "Your Aurixa readiness profile has been received",
    body: "Our team will review the information against your organisation's operational, technical and implementation requirements. No further submission is required at this stage. We aim to complete the initial review within two business days.",
    privacyReminder:
      "Your responses are handled in accordance with the Australian Privacy Principles and the collection notice provided with your application.",
    homeLink: "Return to aurixasystems.com.au",
  },

  access: {
    loadingHeading: "Opening your secure questionnaire",
    loadingBody: "Verifying your questionnaire link.",

    requiredHeading: "Secure questionnaire access required",
    requiredBody:
      "This questionnaire is available through the secure link issued with an Aurixa free trial application. Please use the link provided in your confirmation email or contact Aurixa if a new link is required.",

    expiredHeading: "This secure questionnaire link has expired",
    expiredBody:
      "For your protection, questionnaire links are time-limited. Please use the latest link issued by Aurixa or request a new secure link.",

    completedHeading: "Your readiness profile has already been submitted",
    completedBody:
      "No further submission is required. Aurixa will contact you regarding the appropriate next step.",

    unavailableHeading: "The questionnaire is temporarily unavailable",
    unavailableBody:
      "We could not open your questionnaire just now. Please try again in a few minutes, or contact Aurixa if the problem continues.",
    retry: "Try again",
  },

  save: {
    saving: "Saving...",
    saved: "Saved",
    failed: "Save failed - retrying",
    idle: "Your progress is saved as you continue.",
    /** No authorised session: answers live in the page only, and we say so. */
    local: "Your answers are kept in this browser until you submit.",
  },

  submissionError:
    "We could not submit your readiness profile just now. Please try again - your answers have been kept.",
  validationSummary:
    "Some answers need attention before you can continue. Please review the questions marked below.",
} as const;

// ── Sections (section 6.2 - 6.5) ────────────────────────────────────────────

export type SectionKey = "organisation" | "systems" | "capabilities" | "readiness";

export type QuestionnaireSection = {
  key: SectionKey;
  title: string;
  description: string;
  /** Core questions, in display order. Conditional detail fields validate with their parent. */
  questionIds: string[];
};

export const SECTIONS: QuestionnaireSection[] = [
  {
    key: "organisation",
    title: "Organisation Profile",
    description:
      "Confirm how your organisation is structured, who will participate in decisions and the expected platform access requirements.",
    questionIds: [Q.role, Q.authority, Q.userCount, Q.entityStructure, Q.regions],
  },
  {
    key: "systems",
    title: "Current Systems and Workflows",
    description:
      "Help us understand the systems currently in use, the operational problems affecting your team and the time being spent on repetitive administration.",
    questionIds: [Q.systems, Q.problems, Q.adminTime, Q.difficultWorkflow],
  },
  {
    key: "capabilities",
    title: "Aurixa Capability Requirements",
    description:
      "Identify the Aurixa capabilities, integrations and data requirements most relevant to your organisation.",
    questionIds: [Q.capabilities, Q.integrations, Q.migration],
  },
  {
    key: "readiness",
    title: "Implementation Readiness",
    description:
      "Confirm your preferred timing, security requirements and the next conversation that would be most useful.",
    questionIds: [Q.timing, Q.security, Q.nextStep, Q.investmentRange],
  },
];

export const SECTION_COUNT = SECTIONS.length;

// ── Answer helpers ──────────────────────────────────────────────────────────

export const asText = (value: AnswerValue): string => (typeof value === "string" ? value : "");

export const asList = (value: AnswerValue): string[] => (Array.isArray(value) ? value : []);

export const labelFor = (options: Option[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

export const labelsFor = (options: Option[], values: string[]): string[] =>
  values.map((value) => labelFor(options, value));

const has = (values: string[], value: string) => values.includes(value);

// ── Conditional logic (section 6.6) ─────────────────────────────────────────

/** True when the applicant's structure warrants the enterprise-readiness follow-ups. */
export function needsEnterpriseReadiness(answers: AnswerMap): boolean {
  const users = asText(answers[Q.userCount]);
  const structure = asText(answers[Q.entityStructure]);
  return (
    users === "more_than_100" ||
    ["multiple_legal_entities", "national", "international"].includes(structure)
  );
}

export function isWithin90Days(answers: AnswerMap): boolean {
  return WITHIN_90_DAYS_VALUES.includes(asText(answers[Q.timing]));
}

/**
 * Every question currently displayed to the applicant, given their answers.
 * Anything not in this set is an inactive conditional answer: kept in the draft
 * so a changed selection does not destroy work, never submitted as active.
 */
export function activeQuestionIds(answers: AnswerMap): string[] {
  const active: string[] = [];
  const add = (id: string) => active.push(id);

  // Section 1
  add(Q.role);
  if (asText(answers[Q.role]) === "other") add(Q.roleOther);
  add(Q.authority);
  if (asText(answers[Q.authority]) === "other") add(Q.authorityOther);
  add(Q.userCount);
  add(Q.entityStructure);
  add(Q.regions);

  // Section 2
  add(Q.systems);
  const systems = asList(answers[Q.systems]);
  systems
    .filter((value) => value !== "no_central_system" && value !== "other")
    .forEach((value) => add(systemProductQuestionId(value)));
  if (has(systems, "other")) add(Q.systemsOther);
  if (has(systems, "no_central_system")) {
    add(Q.informationManagement);
    if (has(asList(answers[Q.informationManagement]), "other")) add(Q.informationManagementOther);
  }
  add(Q.problems);
  if (has(asList(answers[Q.problems]), "other")) add(Q.problemsOther);
  add(Q.adminTime);
  add(Q.difficultWorkflow);

  // Section 3
  add(Q.capabilities);
  add(Q.integrations);
  if (has(asList(answers[Q.integrations]), "telephony")) add(Q.phoneSystem);
  if (has(asList(answers[Q.integrations]), "custom_internal_system")) {
    add(Q.customSystemName);
    add(Q.customSystemApi);
    add(Q.customSystemOwner);
    add(Q.customSystemWorkflow);
  }
  add(Q.migration);
  if (MIGRATION_FOLLOW_UP_VALUES.includes(asText(answers[Q.migration]))) {
    add(Q.migrationSources);
    add(Q.migrationRecords);
    add(Q.migrationDocuments);
    add(Q.migrationQuality);
    add(Q.migrationTiming);
  }

  // Section 4
  add(Q.timing);
  add(Q.security);
  const security = asList(answers[Q.security]);
  if (security.some((value) => !SECURITY_EXCLUSIVE_VALUES.includes(value))) add(Q.securityContext);
  if (needsEnterpriseReadiness(answers)) {
    add(Q.enterpriseSso);
    add(Q.enterpriseBoundaries);
    add(Q.enterpriseProcurement);
  }
  add(Q.nextStep);
  if (isWithin90Days(answers)) {
    add(Q.investmentRange);
    add(Q.projectSponsor);
  }

  return active;
}

/**
 * Applies a multi-select toggle with mutually exclusive options: choosing an
 * exclusive option clears the named options and vice versa (section 6.6).
 */
export function toggleExclusiveMultiSelect(
  current: string[],
  value: string,
  exclusiveValues: string[],
): string[] {
  if (current.includes(value)) return current.filter((item) => item !== value);

  if (exclusiveValues.includes(value)) return [value];
  return [...current.filter((item) => !exclusiveValues.includes(item)), value];
}

/**
 * Named selections that choosing `value` would clear. Used to confirm with the
 * applicant before a meaningful set of answers disappears.
 */
export function clearedByExclusiveSelection(
  current: string[],
  value: string,
  exclusiveValues: string[],
): string[] {
  if (current.includes(value) || !exclusiveValues.includes(value)) return [];
  return current.filter((item) => item !== value);
}

// ── Validation (section 6, section 14.4) ────────────────────────────────────

export type QuestionErrors = Record<string, string>;

const requireSelection = (
  errors: QuestionErrors,
  answers: AnswerMap,
  questionId: string,
  message: string,
) => {
  if (!asText(answers[questionId])) errors[questionId] = message;
};

const requireText = (
  errors: QuestionErrors,
  answers: AnswerMap,
  questionId: string,
  message: string,
  limit: number,
) => {
  const value = cleanTextValue(asText(answers[questionId]));
  if (!value) errors[questionId] = message;
  else if (value.length > limit) errors[questionId] = `Please keep this under ${limit} characters.`;
};

const limitOptionalText = (
  errors: QuestionErrors,
  answers: AnswerMap,
  questionId: string,
  limit: number,
) => {
  if (asText(answers[questionId]).length > limit)
    errors[questionId] = `Please keep this under ${limit} characters.`;
};

const validateCount = (errors: QuestionErrors, answers: AnswerMap, questionId: string) => {
  const value = answers[questionId];
  if (value === NOT_YET_KNOWN || value === null || value === undefined || value === "") {
    if (value === null || value === undefined || value === "")
      errors[questionId] = 'Enter an approximate number, or select "Not yet known".';
    return;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || !Number.isInteger(numeric))
    errors[questionId] = "Enter a whole number, or select “Not yet known”.";
  else if (numeric > MAX_MIGRATION_COUNT)
    errors[questionId] = "Enter a smaller approximate figure.";
};

/** Section 1 — Organisation Profile. */
function validateOrganisation(answers: AnswerMap, errors: QuestionErrors) {
  requireSelection(errors, answers, Q.role, "Select your role within the organisation.");
  if (asText(answers[Q.role]) === "other")
    requireText(errors, answers, Q.roleOther, "Please describe your role.", LIMITS.roleOther);

  requireSelection(errors, answers, Q.authority, "Select the statement that best describes your authority.");
  if (asText(answers[Q.authority]) === "other")
    requireText(
      errors,
      answers,
      Q.authorityOther,
      "Please describe your authority in relation to technology purchases.",
      LIMITS.authorityOther,
    );

  requireSelection(errors, answers, Q.userCount, "Select how many people may require access.");
  requireSelection(
    errors,
    answers,
    Q.entityStructure,
    "Select how many offices, entities or divisions would use the platform.",
  );

  if (asList(answers[Q.regions]).length === 0)
    errors[Q.regions] = "Select at least one location where the organisation operates.";
}

/** Section 2 — Current Systems and Workflows. */
function validateSystems(answers: AnswerMap, errors: QuestionErrors) {
  const systems = asList(answers[Q.systems]);
  if (systems.length === 0) errors[Q.systems] = "Select at least one option.";
  else {
    if (has(systems, "other"))
      requireText(
        errors,
        answers,
        Q.systemsOther,
        "Please describe the other system.",
        LIMITS.systemsOther,
      );

    systems
      .filter((value) => value !== "no_central_system" && value !== "other")
      .forEach((value) => limitOptionalText(errors, answers, systemProductQuestionId(value), LIMITS.systemProduct));

    if (has(systems, "no_central_system")) {
      const management = asList(answers[Q.informationManagement]);
      if (management.length === 0)
        errors[Q.informationManagement] = "Select how information is currently managed.";
      else if (has(management, "other"))
        requireText(
          errors,
          answers,
          Q.informationManagementOther,
          "Please describe how information is managed.",
          LIMITS.informationManagementOther,
        );
    }
  }

  const problems = asList(answers[Q.problems]);
  if (problems.length === 0) errors[Q.problems] = "Select at least one operational problem.";
  else if (problems.length > MAX_PROBLEMS)
    errors[Q.problems] = `Select no more than ${MAX_PROBLEMS} operational problems.`;
  else if (has(problems, "other"))
    requireText(
      errors,
      answers,
      Q.problemsOther,
      "Please describe the other operational problem.",
      LIMITS.problemsOther,
    );

  requireSelection(
    errors,
    answers,
    Q.adminTime,
    "Select the approximate time spent each week on repetitive administration.",
  );

  limitOptionalText(errors, answers, Q.difficultWorkflow, LIMITS.difficultWorkflow);
}

/** Section 3 — Aurixa Capability Requirements. */
function validateCapabilities(answers: AnswerMap, errors: QuestionErrors) {
  const ranked = asList(answers[Q.capabilities]);
  if (ranked.length !== RANKED_CAPABILITY_COUNT)
    errors[Q.capabilities] =
      `Select and rank ${RANKED_CAPABILITY_COUNT} capabilities. You have selected ${ranked.length}.`;
  else if (new Set(ranked).size !== ranked.length)
    errors[Q.capabilities] = "Each ranked capability must be different.";

  const integrations = asList(answers[Q.integrations]);
  if (integrations.length === 0) errors[Q.integrations] = "Select at least one option.";

  if (has(integrations, "telephony"))
    requireText(
      errors,
      answers,
      Q.phoneSystem,
      "Name the phone or VoIP system your organisation uses.",
      LIMITS.phoneSystem,
    );

  if (has(integrations, "custom_internal_system")) {
    requireText(
      errors,
      answers,
      Q.customSystemName,
      "Enter the name of the custom internal system.",
      LIMITS.customSystemName,
    );
    requireSelection(errors, answers, Q.customSystemApi, "Select whether an API is available.");
    limitOptionalText(errors, answers, Q.customSystemOwner, LIMITS.customSystemOwner);
    requireText(
      errors,
      answers,
      Q.customSystemWorkflow,
      "Describe the workflow the integration would support.",
      LIMITS.customSystemWorkflow,
    );
  }

  const migration = asText(answers[Q.migration]);
  if (!migration) errors[Q.migration] = "Select whether existing data would need to be migrated.";
  else if (MIGRATION_FOLLOW_UP_VALUES.includes(migration)) {
    requireText(
      errors,
      answers,
      Q.migrationSources,
      "List the source systems the data would come from.",
      LIMITS.migrationSources,
    );
    validateCount(errors, answers, Q.migrationRecords);
    validateCount(errors, answers, Q.migrationDocuments);
    limitOptionalText(errors, answers, Q.migrationQuality, LIMITS.migrationQuality);
    requireSelection(errors, answers, Q.migrationTiming, "Select your preferred migration timing.");
  }
}

/** Section 4 — Implementation Readiness. */
function validateReadiness(answers: AnswerMap, errors: QuestionErrors) {
  requireSelection(errors, answers, Q.timing, "Select when you would ideally like to commence.");

  const security = asList(answers[Q.security]);
  if (security.length === 0) errors[Q.security] = "Select at least one option.";
  else if (security.some((value) => !SECURITY_EXCLUSIVE_VALUES.includes(value)))
    limitOptionalText(errors, answers, Q.securityContext, LIMITS.securityContext);

  requireSelection(errors, answers, Q.nextStep, "Select the next step that would be most useful.");

  // BRQ-16 and the project-sponsor follow-up are optional by specification.
}

const SECTION_VALIDATORS: Record<SectionKey, (answers: AnswerMap, errors: QuestionErrors) => void> = {
  organisation: validateOrganisation,
  systems: validateSystems,
  capabilities: validateCapabilities,
  readiness: validateReadiness,
};

/** Validates one section. Conditional detail fields validate with their parent. */
export function validateSection(sectionIndex: number, answers: AnswerMap): QuestionErrors {
  const section = SECTIONS[sectionIndex];
  if (!section) return {};
  const errors: QuestionErrors = {};
  SECTION_VALIDATORS[section.key](answers, errors);
  return errors;
}

/** Validates every section — used before the review screen and final submission. */
export function validateAll(answers: AnswerMap): QuestionErrors {
  return SECTIONS.reduce<QuestionErrors>(
    (errors, _section, index) => ({ ...errors, ...validateSection(index, answers) }),
    {},
  );
}

/** Index of the first section carrying an error, or -1 when everything is valid. */
export function firstInvalidSection(answers: AnswerMap): number {
  return SECTIONS.findIndex((_section, index) => Object.keys(validateSection(index, answers)).length > 0);
}

// ── Submission payload ──────────────────────────────────────────────────────

const trimAnswer = (questionId: string, value: AnswerValue): AnswerValue => {
  if (typeof value !== "string") return value;
  if (value === NOT_YET_KNOWN) return value;

  const limits: Record<string, number> = {
    [Q.roleOther]: LIMITS.roleOther,
    [Q.authorityOther]: LIMITS.authorityOther,
    [Q.systemsOther]: LIMITS.systemsOther,
    [Q.informationManagementOther]: LIMITS.informationManagementOther,
    [Q.problemsOther]: LIMITS.problemsOther,
    [Q.difficultWorkflow]: LIMITS.difficultWorkflow,
    [Q.phoneSystem]: LIMITS.phoneSystem,
    [Q.customSystemName]: LIMITS.customSystemName,
    [Q.customSystemOwner]: LIMITS.customSystemOwner,
    [Q.customSystemWorkflow]: LIMITS.customSystemWorkflow,
    [Q.migrationSources]: LIMITS.migrationSources,
    [Q.migrationQuality]: LIMITS.migrationQuality,
    [Q.securityContext]: LIMITS.securityContext,
  };

  const limit = questionId.startsWith(`${Q.systemProductPrefix}:`)
    ? LIMITS.systemProduct
    : limits[questionId];
  if (!limit) return value;
  return cleanTextValue(value).slice(0, limit);
};

/**
 * Normalises the draft into the stored answer set. Free text is trimmed and
 * length-capped; conditional answers that are not currently displayed are
 * retained but flagged inactive so they are never treated as live responses.
 */
export function buildStoredAnswers(answers: AnswerMap): StoredAnswer[] {
  const active = new Set(activeQuestionIds(answers));

  return Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== "" &&
      !(Array.isArray(value) && value.length === 0))
    .map(([questionId, value]) => ({
      questionId,
      value: trimAnswer(questionId, value),
      active: active.has(questionId),
    }))
    .sort((a, b) => a.questionId.localeCompare(b.questionId));
}

/** The completion payload sent to the questionnaire service. */
export function buildCompletionPayload(applicationId: string, answers: AnswerMap, responseVersion: number) {
  const stored = buildStoredAnswers(answers);
  return {
    applicationId,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion,
    answers: stored,
    activeConditionalQuestionIds: stored.filter((answer) => answer.active).map((answer) => answer.questionId),
  };
}

// ── Review summary ──────────────────────────────────────────────────────────

export type ReviewItem = {
  questionId: string;
  question: string;
  /** Display labels — never raw slugs. Empty when the question is unanswered. */
  values: string[];
  /** Ranked answers render as "1. Label". */
  ranked?: boolean;
  required: boolean;
  answered: boolean;
};

export type ReviewSection = {
  key: SectionKey;
  title: string;
  sectionIndex: number;
  items: ReviewItem[];
};

const QUESTION_TEXT: Record<string, string> = {
  [Q.role]: "What is your role within the organisation?",
  [Q.roleOther]: "Please describe your role.",
  [Q.authority]: "Which statement best describes your authority in relation to technology purchases?",
  [Q.authorityOther]: "Please explain your authority.",
  [Q.userCount]: "How many people may require access to Aurixa?",
  [Q.entityStructure]: "How many offices, entities or business divisions would use the platform?",
  [Q.regions]: "Where does the organisation currently operate?",
  [Q.systems]: "Which systems does your organisation currently use?",
  [Q.systemsOther]: "Please describe the other system.",
  [Q.informationManagement]: "How is information currently managed?",
  [Q.informationManagementOther]: "Please describe how information is managed.",
  [Q.problems]: "What are the three biggest operational problems you want Aurixa to solve?",
  [Q.problemsOther]: "Please describe the other operational problem.",
  [Q.adminTime]:
    "Approximately how much time does your team spend each week on repetitive administration?",
  [Q.difficultWorkflow]: "Describe the workflow causing the greatest operational difficulty.",
  [Q.capabilities]: "Which Aurixa capabilities are most relevant to your organisation?",
  [Q.integrations]: "Which systems would need to integrate with Aurixa?",
  [Q.phoneSystem]: "Which phone or VoIP system does your organisation currently use?",
  [Q.customSystemName]: "Custom internal system name",
  [Q.customSystemApi]: "Is an API available?",
  [Q.customSystemOwner]: "Internal business owner",
  [Q.customSystemWorkflow]: "Which workflow would the integration support?",
  [Q.migration]: "Would you need existing data migrated into Aurixa?",
  [Q.migrationSources]: "Source systems",
  [Q.migrationRecords]: "Approximate number of records",
  [Q.migrationDocuments]: "Approximate number of documents",
  [Q.migrationQuality]: "Known data-quality concerns",
  [Q.migrationTiming]: "Preferred migration timing",
  [Q.timing]: "When would you ideally like to commence implementation?",
  [Q.security]: "Does your organisation have specific security, hosting or procurement requirements?",
  [Q.securityContext]: "Relevant policy, questionnaire, certification or procurement context",
  [Q.enterpriseSso]: "Would centralised identity or single sign-on be required?",
  [Q.enterpriseBoundaries]:
    "Would entity-level access boundaries or separate environments be required?",
  [Q.enterpriseProcurement]: "Do you expect a formal procurement or vendor-risk process?",
  [Q.nextStep]: "Which next step would be most useful?",
  [Q.investmentRange]: "Has an indicative technology investment range been approved?",
  [Q.projectSponsor]: "Has an internal project sponsor been identified?",
};

const OPTIONS_BY_QUESTION: Record<string, Option[]> = {
  [Q.role]: READINESS_ROLE_OPTIONS,
  [Q.authority]: AUTHORITY_OPTIONS,
  [Q.userCount]: USER_COUNT_OPTIONS,
  [Q.entityStructure]: ENTITY_STRUCTURE_OPTIONS,
  [Q.regions]: REGION_OPTIONS,
  [Q.systems]: SYSTEM_OPTIONS,
  [Q.informationManagement]: INFORMATION_MANAGEMENT_OPTIONS,
  [Q.problems]: PROBLEM_OPTIONS,
  [Q.adminTime]: ADMIN_TIME_OPTIONS,
  [Q.capabilities]: CAPABILITY_OPTIONS,
  [Q.integrations]: INTEGRATION_OPTIONS,
  [Q.customSystemApi]: API_AVAILABILITY_OPTIONS,
  [Q.migration]: MIGRATION_OPTIONS,
  [Q.migrationTiming]: MIGRATION_TIMING_OPTIONS,
  [Q.timing]: TIMING_OPTIONS,
  [Q.security]: SECURITY_OPTIONS,
  [Q.nextStep]: NEXT_STEP_OPTIONS,
  [Q.investmentRange]: INVESTMENT_RANGE_OPTIONS,
  [Q.enterpriseSso]: YES_NO_UNKNOWN_OPTIONS,
  [Q.enterpriseBoundaries]: YES_NO_UNKNOWN_OPTIONS,
  [Q.enterpriseProcurement]: YES_NO_UNKNOWN_OPTIONS,
  [Q.projectSponsor]: YES_NO_UNKNOWN_OPTIONS,
};

const OPTIONAL_QUESTIONS = new Set<string>([
  Q.difficultWorkflow,
  Q.customSystemOwner,
  Q.migrationQuality,
  Q.securityContext,
  Q.investmentRange,
  Q.projectSponsor,
  Q.enterpriseSso,
  Q.enterpriseBoundaries,
  Q.enterpriseProcurement,
]);

const reviewValues = (questionId: string, value: AnswerValue): string[] => {
  if (questionId.startsWith(`${Q.systemProductPrefix}:`)) return asText(value) ? [asText(value)] : [];

  const options = OPTIONS_BY_QUESTION[questionId];
  if (Array.isArray(value)) return options ? labelsFor(options, value) : value;
  if (value === NOT_YET_KNOWN) return ["Not yet known"];
  if (typeof value === "number") return [value.toLocaleString("en-AU")];

  const text = asText(value);
  if (!text) return [];
  return options ? [labelFor(options, text)] : [text];
};

/**
 * Review-screen model. Only active questions appear — inactive conditional
 * answers are excluded so the applicant reviews exactly what will be submitted.
 *
 * An unanswered OPTIONAL question is omitted rather than listed as blank; an
 * unanswered REQUIRED question is always listed, and flagged, so the applicant
 * can see exactly what is still outstanding.
 */
export function buildReviewSections(answers: AnswerMap): ReviewSection[] {
  const active = activeQuestionIds(answers);
  const activeSet = new Set(active);

  return SECTIONS.map((section, sectionIndex) => {
    // Preserve the display order defined by activeQuestionIds within this section.
    const sectionQuestions = active.filter((questionId) => sectionOf(questionId) === section.key);

    const items = sectionQuestions
      .filter((questionId) => activeSet.has(questionId))
      .map<ReviewItem>((questionId) => {
        const values = reviewValues(questionId, answers[questionId]);
        return {
          questionId,
          question:
            QUESTION_TEXT[questionId] ??
            (questionId.startsWith(`${Q.systemProductPrefix}:`)
              ? `${labelFor(SYSTEM_OPTIONS, questionId.split(":")[1])} - product or platform name`
              : questionId),
          values,
          ranked: questionId === Q.capabilities,
          required: !OPTIONAL_QUESTIONS.has(questionId) && !questionId.startsWith(`${Q.systemProductPrefix}:`),
          answered: values.length > 0,
        };
      })
      .filter((item) => item.answered || item.required);

    return { key: section.key, title: section.title, sectionIndex, items };
  });
}

const SECTION_BY_QUESTION: Record<string, SectionKey> = {};
{
  const register = (ids: string[], key: SectionKey) => ids.forEach((id) => (SECTION_BY_QUESTION[id] = key));
  register([Q.role, Q.roleOther, Q.authority, Q.authorityOther, Q.userCount, Q.entityStructure, Q.regions], "organisation");
  register([Q.systems, Q.systemsOther, Q.informationManagement, Q.informationManagementOther, Q.problems, Q.problemsOther, Q.adminTime, Q.difficultWorkflow], "systems");
  register([Q.capabilities, Q.integrations, Q.phoneSystem, Q.customSystemName, Q.customSystemApi, Q.customSystemOwner, Q.customSystemWorkflow, Q.migration, Q.migrationSources, Q.migrationRecords, Q.migrationDocuments, Q.migrationQuality, Q.migrationTiming], "capabilities");
  register([Q.timing, Q.security, Q.securityContext, Q.enterpriseSso, Q.enterpriseBoundaries, Q.enterpriseProcurement, Q.nextStep, Q.investmentRange, Q.projectSponsor], "readiness");
}

/** Which section a question belongs to, including conditional detail fields. */
export function sectionOf(questionId: string): SectionKey {
  if (questionId.startsWith(`${Q.systemProductPrefix}:`)) return "systems";
  return SECTION_BY_QUESTION[questionId] ?? "organisation";
}

export function sectionIndexOf(questionId: string): number {
  return SECTIONS.findIndex((section) => section.key === sectionOf(questionId));
}
