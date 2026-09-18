/**
 * Stage 1 for a BUILDER — the Builders Network access application.
 *
 * The same shape as the Priority Access waitlist next door (`waitlist.ts`):
 * one module holding the option lists, the production copy, the validation
 * rules and the outbound payload, so the page renders from it and nothing is
 * written twice. What differs is where it goes and what happens when it
 * lands, and both differences are deliberate.
 *
 *  * **The waitlist is fire-and-forget; this is not.** A lead mirrors into
 *    Mission Control after its primary webhook already succeeded, so a
 *    failure there must never reach the visitor. Here the post IS the act:
 *    it creates the applicant's organisation on the network and sends their
 *    invitation. Whether that happened is the only thing they came to find
 *    out, so the page awaits it and shows what actually occurred.
 *
 *  * **Four questions, not fourteen.** The waitlist qualifies a prospect for
 *    a sales conversation. This one provisions an account, and the only
 *    things it cannot proceed without are the ones the network's own columns
 *    refuse to be null: who the business is, what kind it is, and a person to
 *    write to. Asking a builder for an ACN and a postcode before they are
 *    allowed to express interest is how a form stops being answered.
 *
 * Validation here DISCLOSES. The network is the authority on what it will
 * accept, and its refusals are read by `readApplicationRefusal` below — two
 * validators is how one of them silently becomes wrong, so these rules exist
 * to save a round trip and to put an error beside the box it belongs to,
 * never to be the standard.
 */

export type Option = { value: string; label: string };

/** Bumped whenever fields, options or required-ness change. */
export const BUILDER_APPLICATION_VERSION = "builders-access-v1";

/**
 * `builder_organisations.org_type` — NOT NULL, no default, CHECKed over
 * exactly these four. A fifth here produces `org_type_is_not_recognised`
 * from the network rather than a row nobody meant.
 */
export const BUILDER_ORG_TYPE_OPTIONS: Option[] = [
  { value: "builder", label: "Builder" },
  { value: "developer", label: "Developer" },
  { value: "builder_developer", label: "Builder and developer" },
  { value: "sales_representative", label: "Sales representative" },
];

export const AU_STATE_OPTIONS: Option[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

export const MAX_MESSAGE = 2000;

/**
 * The hidden field a person never sees and never fills.
 *
 * Named OUTSIDE the browser autofill taxonomy. The first version called it
 * `company_website` — a plausible name, chosen so a bot skipping a field
 * called `honeypot` would still fill it — and a password manager filled it
 * for a real applicant, who was refused within thirty seconds of opening the
 * page with advice ("reload and fill it in again") that could not have
 * worked, because autofill would have filled it again.
 *
 * Mission Control names the same field and a test there asserts it contains
 * no autofill token. Two spellings of one field name is how a honeypot stops
 * being read at all, so the endpoint's allow-list never carries it and this
 * is the only place the page writes it.
 */
export const HONEYPOT_FIELD = "application_slot";

export const BUILDER_APPLICATION_COPY = {
  heading: "Apply for Builders Network access",
  supporting:
    "Publish your stock list once and reach the advisory firms placing clients into it. Tell us about your business and we will set up your organisation and email you a link to set your password.",
  timeEstimate: "Applications take about a minute.",
  requiredNote: "Required fields are marked *",
  confidentiality:
    "Please do not include client information, contracts or financial records. This form is for your own business details.",
  preSubmit:
    "We create your organisation immediately and email your access link to the address below. Your listing is reviewed before it appears in the marketplace.",
  submitButton: "Apply For Access",
  submittingButton: "Submitting Application...",
  helper: {
    legalName: "The registered name of your entity, as it appears on your ABN record.",
    tradingName: "Optional. The name your clients know you by, where it differs.",
    orgType: "Choose the one that best describes your business.",
    contactEmail:
      "Your access link is sent here, and this becomes the sign-in for the account that owns your organisation.",
    abn: "Optional, and eleven digits. Spacing is yours to write however you like.",
    acn: "Optional, and nine digits.",
    message: "Optional. Anything you would like us to know before we review your listing.",
  },
  placeholder: {
    message: "Project types, the regions you build in, how many homes you have available...",
  },
} as const;

// -- Normalisation -----------------------------------------------------------

/** Strips control characters and collapses runs of whitespace. */
export const cleanTextValue = (value: string) =>
  value
    .replace(/[\p{Cc}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const cleanEmailValue = (value: string) => cleanTextValue(value).toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Registration numbers are written with spaces and hyphens; the digits are the number. */
export const digitsOnly = (value: string) => value.replace(/[\s-]/g, "");

// -- Form model and validation -----------------------------------------------

export type BuilderApplicationValues = {
  legalName: string;
  tradingName: string;
  orgType: string;
  abn: string;
  acn: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  suburb: string;
  state: string;
  postcode: string;
  message: string;
  privacyAcknowledged: boolean;
};

export const EMPTY_BUILDER_APPLICATION: BuilderApplicationValues = {
  legalName: "",
  tradingName: "",
  orgType: "",
  abn: "",
  acn: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  suburb: "",
  state: "",
  postcode: "",
  message: "",
  privacyAcknowledged: false,
};

export type BuilderApplicationField = keyof BuilderApplicationValues;

/**
 * The order errors are reported and focused in.
 *
 * Declared rather than derived from `Object.keys`, because the first error a
 * form reports should be the first one a reader would reach — and object key
 * order is an implementation detail with no opinion about that.
 */
export const BUILDER_FIELD_ORDER: BuilderApplicationField[] = [
  "legalName",
  "tradingName",
  "orgType",
  "abn",
  "acn",
  "contactName",
  "contactEmail",
  "contactPhone",
  "website",
  "suburb",
  "state",
  "postcode",
  "message",
  "privacyAcknowledged",
];

export function validateBuilderApplication(
  values: BuilderApplicationValues,
): Partial<Record<BuilderApplicationField, string>> {
  const errors: Partial<Record<BuilderApplicationField, string>> = {};

  const legalName = cleanTextValue(values.legalName);
  if (!legalName) errors.legalName = "Enter the registered name of your business.";
  else if (legalName.length < 2 || legalName.length > 200)
    errors.legalName = "Registered name must be between 2 and 200 characters.";

  if (!values.orgType) errors.orgType = "Choose what your business does.";

  const contactName = cleanTextValue(values.contactName);
  if (!contactName) errors.contactName = "Enter your name.";
  else if (contactName.length < 2 || contactName.length > 120)
    errors.contactName = "Name must be between 2 and 120 characters.";

  const contactEmail = cleanEmailValue(values.contactEmail);
  if (!contactEmail) errors.contactEmail = "Enter your email address.";
  else if (!isValidEmail(contactEmail))
    errors.contactEmail = "Enter a valid email address, for example name@business.com.au.";

  // The optional registration numbers mirror the column CHECKs exactly. A
  // value the table refuses comes back as a refusal naming no field, so
  // catching the shape here is the difference between "an ABN is eleven
  // digits" beside the box and "we could not submit your application".
  const abn = digitsOnly(values.abn);
  if (abn && !/^\d{11}$/.test(abn)) errors.abn = "An ABN is eleven digits.";

  const acn = digitsOnly(values.acn);
  if (acn && !/^\d{9}$/.test(acn)) errors.acn = "An ACN is nine digits.";

  const postcode = digitsOnly(values.postcode);
  if (postcode && !/^\d{4}$/.test(postcode))
    errors.postcode = "An Australian postcode is four digits.";

  if (values.state && !AU_STATE_OPTIONS.some((option) => option.value === values.state))
    errors.state = "Choose your state or territory from the list.";

  if (values.message.length > MAX_MESSAGE)
    errors.message = `Please keep this under ${MAX_MESSAGE} characters.`;

  if (!values.privacyAcknowledged)
    errors.privacyAcknowledged = "Please acknowledge the collection notice to continue.";

  return errors;
}

// -- Payload -----------------------------------------------------------------

/**
 * What is posted.
 *
 * `elapsed_ms` and the decoy field are part of it: the endpoint refuses a
 * form submitted faster than a person could fill it, and one whose hidden
 * field has been filled in. Neither is a security boundary — anybody who
 * reads this page defeats both — and they are here because the overwhelming
 * majority of what reaches a public form is generic automation that fills
 * every input and posts at once.
 *
 * **`elapsed_ms` is measured by the page's own clock and is not a
 * timestamp.** It used to send the wall-clock moment the page was drawn,
 * which the server subtracted from its own wall clock; two independent
 * clocks, so a visitor's machine running fast was refused within seconds of
 * opening the form. A monotonic duration has one clock at both ends.
 *
 * `privacyAcknowledged` is deliberately NOT sent. The network has no column
 * for it, and a field that travels, is dropped by the endpoint's allow-list
 * and reads to a future maintainer as a consent recorded somewhere is worse
 * than no field at all. The acknowledgement gates the submit button on this
 * page, which is where it is stated.
 */
export function buildBuilderApplicationPayload(
  values: BuilderApplicationValues,
  elapsedMs: number | null,
  decoy: string,
  turnstileToken?: string,
) {
  return {
    legal_name: cleanTextValue(values.legalName),
    trading_name: cleanTextValue(values.tradingName),
    org_type: values.orgType,
    abn: digitsOnly(values.abn),
    acn: digitsOnly(values.acn),
    contact_name: cleanTextValue(values.contactName),
    contact_email: cleanEmailValue(values.contactEmail),
    contact_phone: cleanTextValue(values.contactPhone),
    website: cleanTextValue(values.website),
    suburb: cleanTextValue(values.suburb),
    state: values.state,
    postcode: digitsOnly(values.postcode),
    message: cleanTextValue(values.message).slice(0, MAX_MESSAGE),
    form_version: BUILDER_APPLICATION_VERSION,
    // Omitted rather than sent as null where the browser has no monotonic
    // clock: the endpoint treats an absent duration as unknown and accepts
    // it, which is what a cost raiser must do with data it cannot trust.
    ...(elapsedMs === null ? {} : { elapsed_ms: elapsedMs }),
    [HONEYPOT_FIELD]: decoy,
    ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
  };
}

// -- Refusals ----------------------------------------------------------------

export type ApplicationRefusalKind =
  /** Something they typed. The form can point at it. */
  | "field"
  /** True of the application but not of one field. */
  | "application"
  /** Ours. They did nothing wrong and cannot fix it. */
  | "ours";

export interface ApplicationRefusal {
  readonly code: string;
  readonly sentence: string;
  readonly field: BuilderApplicationField | null;
  readonly kind: ApplicationRefusalKind;
}

type Authored = Omit<ApplicationRefusal, "code">;

/**
 * Every refusal in the applicant's words.
 *
 * The operator console authors the same codes for somebody holding the
 * console — its reading of `abn_already_registered` ends "edit the
 * organisation that already holds it", which is a correct next step there
 * and an impossible one here. Three rules hold this table:
 *
 *  * **An applicant is only ever told what an applicant can do**: fix a
 *    field, wait, or get in touch. Nothing names a console, a route or a
 *    record they cannot reach.
 *
 *  * **A collision is never explained.** This page is unauthenticated, and
 *    one that confirms whether an ABN is registered — let alone to whom — is
 *    a lookup service for other people's businesses.
 *
 *  * **An unrecognised code is an apology, not a paraphrase.** Unslugging
 *    `owner_not_created` into "Owner not created." tells an applicant
 *    nothing and alarms them.
 */
const AUTHORED: Record<string, Authored> = {
  a_legal_name_is_required: {
    sentence: "Please give the registered name of your business.",
    field: "legalName",
    kind: "field",
  },
  a_contact_name_is_required: {
    sentence: "Please tell us who we are writing to.",
    field: "contactName",
    kind: "field",
  },
  a_valid_email_is_required: {
    sentence:
      "That does not look like an email address, and it is where your access link is sent — so it has to be one you can open.",
    field: "contactEmail",
    kind: "field",
  },
  an_organisation_type_is_required: {
    sentence: "Please choose whether you build, develop, or both.",
    field: "orgType",
    kind: "field",
  },
  org_type_is_not_recognised: {
    sentence: "Please choose one of the listed types of business.",
    field: "orgType",
    kind: "field",
  },
  abn_must_be_11_digits: {
    sentence: "An ABN is eleven digits.",
    field: "abn",
    kind: "field",
  },
  acn_must_be_9_digits: {
    sentence: "An ACN is nine digits.",
    field: "acn",
    kind: "field",
  },
  postcode_must_be_4_digits: {
    sentence: "An Australian postcode is four digits.",
    field: "postcode",
    kind: "field",
  },
  state_is_not_an_australian_state: {
    sentence: "Please choose your state or territory from the list.",
    field: "state",
    kind: "field",
  },

  an_application_for_that_address_is_already_with_us: {
    sentence:
      "We already have an application from this address today. Check your inbox — including your spam folder — for a message from us, and get in touch if nothing arrived.",
    field: "contactEmail",
    kind: "application",
  },
  abn_already_registered: {
    sentence:
      "That ABN is already on the network. If your business is already here, ask whoever set it up to invite you — or get in touch and we will sort it out.",
    field: "abn",
    kind: "application",
  },
  acn_already_registered: {
    sentence:
      "That ACN is already on the network. If your business is already here, ask whoever set it up to invite you — or get in touch and we will sort it out.",
    field: "acn",
    kind: "application",
  },
  legal_name_already_registered: {
    sentence:
      "A business is already registered under that name. If it is yours, ask whoever set it up to invite you — or get in touch and we will sort it out.",
    field: "legalName",
    kind: "application",
  },
  that_account_has_been_withdrawn: {
    sentence:
      "We cannot open an account for that email address. Please get in touch so we can look at it with you.",
    field: "contactEmail",
    kind: "application",
  },

  /*
   * The abuse controls, worded for the person they will occasionally catch
   * by accident — an office behind one address, or somebody who left the tab
   * open. None of them says what the limit is or which one was hit: an
   * applicant cannot act on that, and a script can.
   */
  rate_limited: {
    sentence:
      "We have had a lot of applications in the last minute. Please wait a moment and submit again.",
    field: null,
    kind: "application",
  },
  too_many_applications_from_here_just_now: {
    sentence:
      "Several applications have already come from your connection in the last hour. Please try again a little later, or get in touch if you need to register more than one business.",
    field: null,
    kind: "application",
  },
  too_many_applications_from_here_today: {
    sentence:
      "Several applications have already come from your connection today. Please get in touch and we will register the rest for you.",
    field: null,
    kind: "application",
  },
  /*
   * Deliberately states NO cause. The first wording blamed a page left open
   * too long, which was false for the applicant who met it and sent them to
   * a reload that would have refused them again. This says what happened,
   * offers the one step that always works, and names a way out that does not
   * depend on the guess being right.
   */
  submission_rejected: {
    sentence:
      "We could not accept that submission. Please try again \u2014 and if it happens a second time, get in touch and we will register you ourselves.",
    field: null,
    kind: "application",
  },
  captcha_failed: {
    sentence: "The security check did not pass. Please reload the page and try again.",
    field: null,
    kind: "application",
  },
  payload_too_large: {
    sentence: "That is more than we can accept. Please shorten your message and submit again.",
    field: "message",
    kind: "field",
  },
  forbidden_origin: {
    sentence:
      "This form could not reach us from where it is being served. Please open it at aurixasystems.com.au and try again.",
    field: null,
    kind: "ours",
  },
};

/** One sentence true of every fault that is ours rather than theirs. */
export const APPLICATION_FAULT_SENTENCE =
  "Something went wrong on our side and your application was not submitted. Please try again in a few minutes, or get in touch if it keeps happening.";

export function readApplicationRefusal(code: string | null | undefined): ApplicationRefusal {
  const raw = typeof code === "string" ? code.trim() : "";
  const authored = raw ? AUTHORED[raw] : undefined;
  if (authored) return { code: raw, ...authored };
  return { code: raw, sentence: APPLICATION_FAULT_SENTENCE, field: null, kind: "ours" };
}

/** Every code this module authors. For tests, and for nothing else. */
export const AUTHORED_REFUSAL_CODES = Object.freeze(Object.keys(AUTHORED));
