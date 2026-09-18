/**
 * The Builders Network access application, as the applicant meets it.
 *
 * This form is unlike every other on the site: submitting it creates an
 * account and sends mail, with no operator in between. So these tests pin
 * three things that would otherwise go wrong silently —
 *
 *   what it insists on before it will let somebody try,
 *   what travels when they do,
 *   and what they are told when the network says no.
 *
 * The last is the one worth guarding hardest. The operator console authors
 * the same refusal codes for somebody holding the console, and its wording
 * ends in acts only an operator can perform. Handing those to a stranger is
 * a dead control pointed at the public.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APPLICATION_FAULT_SENTENCE,
  AUTHORED_REFUSAL_CODES,
  AU_STATE_OPTIONS,
  BUILDER_FIELD_ORDER,
  BUILDER_ORG_TYPE_OPTIONS,
  BuilderApplicationValues,
  EMPTY_BUILDER_APPLICATION,
  HONEYPOT_FIELD,
  MAX_MESSAGE,
  buildBuilderApplicationPayload,
  cleanTextValue,
  digitsOnly,
  readApplicationRefusal,
  validateBuilderApplication,
} from "./builderApplication";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
/** Source with its comments removed — a rule must not be met by prose. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PAGE = "src/pages/BuilderApply.tsx";
const TRANSPORT = "src/lib/builderApply.ts";

const filled = (patch: Partial<BuilderApplicationValues> = {}): BuilderApplicationValues => ({
  ...EMPTY_BUILDER_APPLICATION,
  legalName: "Hawthorn Homes Pty Ltd",
  orgType: "builder",
  contactName: "Jo Rivera",
  contactEmail: "Jo@Example.COM",
  privacyAcknowledged: true,
  ...patch,
});

/**
 * Every code the network and the endpoint can answer this form with.
 *
 * Stated rather than imported: they are two other repositories and two other
 * deployments, so nothing here can read them. A code that exists there and
 * not in this list is a refusal an applicant meets as a generic apology,
 * which is safe and is also invisible — so the list is written down where
 * somebody adding one will see it.
 */
const UPSTREAM_CODES = [
  // builder-network-admin, submit_access_request
  "a_legal_name_is_required",
  "a_contact_name_is_required",
  "a_valid_email_is_required",
  "an_organisation_type_is_required",
  "org_type_is_not_recognised",
  "abn_must_be_11_digits",
  "acn_must_be_9_digits",
  "postcode_must_be_4_digits",
  "state_is_not_an_australian_state",
  "an_application_for_that_address_is_already_with_us",
  "too_many_applications_from_here_just_now",
  "too_many_applications_from_here_today",
  "abn_already_registered",
  "acn_already_registered",
  "legal_name_already_registered",
  "that_account_has_been_withdrawn",
  // mission control, /api/public/builders/apply
  "forbidden_origin",
  "payload_too_large",
  "submission_rejected",
  "rate_limited",
  "captcha_failed",
];

// ── What it insists on ──────────────────────────────────────────────────────

test("four questions are required, and only four", () => {
  assert.deepEqual(validateBuilderApplication(filled()), {});

  const required: Array<[keyof BuilderApplicationValues, unknown]> = [
    ["legalName", ""],
    ["orgType", ""],
    ["contactName", ""],
    ["contactEmail", ""],
    ["privacyAcknowledged", false],
  ];
  for (const [field, empty] of required) {
    const errors = validateBuilderApplication(filled({ [field]: empty } as never));
    assert.ok(errors[field], `${String(field)} should be required`);
  }

  // Everything else is description an operator can chase. Demanding an ACN
  // and a postcode before somebody may express interest is how a form stops
  // being answered.
  for (const optional of ["tradingName", "abn", "acn", "contactPhone", "website", "suburb", "state", "postcode", "message"] as const) {
    assert.deepEqual(
      validateBuilderApplication(filled({ [optional]: "" } as never)),
      {},
      optional,
    );
  }
});

test("an optional registration number is checked only when given", () => {
  // The shape mirrors the column CHECK exactly, so a value the table would
  // refuse never travels — a refusal naming no field is what an operator met
  // in production on 18 Sep 2026.
  assert.equal(validateBuilderApplication(filled({ abn: "" })).abn, undefined);
  assert.ok(validateBuilderApplication(filled({ abn: "123" })).abn);
  assert.equal(validateBuilderApplication(filled({ abn: "12 345 678 901" })).abn, undefined);
  assert.ok(validateBuilderApplication(filled({ acn: "12345678901" })).acn);
  assert.equal(validateBuilderApplication(filled({ acn: "123-456-789" })).acn, undefined);
  assert.ok(validateBuilderApplication(filled({ postcode: "31" })).postcode);
  assert.ok(validateBuilderApplication(filled({ state: "Victoria" })).state);
  assert.equal(validateBuilderApplication(filled({ state: "VIC" })).state, undefined);
});

test("the message is capped where the column is", () => {
  assert.ok(validateBuilderApplication(filled({ message: "x".repeat(MAX_MESSAGE + 1) })).message);
  assert.equal(
    validateBuilderApplication(filled({ message: "x".repeat(MAX_MESSAGE) })).message,
    undefined,
  );
});

test("the reported order is the reading order, not the object's", () => {
  // The first error a form reports should be the first one a reader reaches.
  for (const field of Object.keys(EMPTY_BUILDER_APPLICATION)) {
    assert.ok(BUILDER_FIELD_ORDER.includes(field as never), `${field} missing from the order`);
  }
  assert.equal(BUILDER_FIELD_ORDER[0], "legalName");
  assert.ok(
    BUILDER_FIELD_ORDER.indexOf("contactEmail") > BUILDER_FIELD_ORDER.indexOf("orgType"),
  );
});

// ── What travels ────────────────────────────────────────────────────────────

test("the payload is normalised, so a padded value is the same value", () => {
  const payload = buildBuilderApplicationPayload(
    filled({ legalName: "  Hawthorn   Homes  ", abn: "12 345 678 901" }),
    30_000,
    "",
  );
  assert.equal(payload.legal_name, "Hawthorn Homes");
  assert.equal(payload.abn, "12345678901");
  // The address the window is keyed on is lower-cased, or the one-a-day rule
  // is one a day per SPELLING, which is no rule at all.
  assert.equal(payload.contact_email, "jo@example.com");
});

test("a control character never reaches a stored name", () => {
  // Written as escapes on purpose: a literal NUL or unit separator in this
  // file is invisible in every diff and survives exactly until somebody
  // reformats it away, at which point the test passes and checks nothing.
  const payload = buildBuilderApplicationPayload(
    filled({ legalName: "Haw\u0000thorn\u0009Homes\u000A" }),
    30_000,
    "",
  );
  assert.equal(payload.legal_name, "Haw thorn Homes");
  assert.equal(cleanTextValue("a\u001Fb"), "a b");
  assert.equal(cleanTextValue("a\u007Fb"), "a b");
});

test("the acknowledgement is never sent as though it were recorded", () => {
  // The network has no column for it. A field that travels, is dropped by the
  // endpoint's allow-list and reads to a maintainer as a stored consent is
  // worse than no field at all.
  const payload = buildBuilderApplicationPayload(filled(), 30_000, "");
  assert.equal("privacyAcknowledged" in payload, false);
  assert.equal("privacy_acknowledged" in payload, false);
});

test("the decoy and the clock travel, and the captcha token only when held", () => {
  const without = buildBuilderApplicationPayload(filled(), 30_000, "");
  assert.equal(without[HONEYPOT_FIELD], "");
  assert.equal(without.elapsed_ms, 30_000);
  assert.equal("turnstile_token" in without, false);

  const withToken = buildBuilderApplicationPayload(filled(), 30_000, "", "tok");
  assert.equal(withToken.turnstile_token, "tok");
});

test("the fill clock is a DURATION, never a timestamp", () => {
  // The first version sent the wall-clock moment the page was drawn and the
  // server subtracted it from its own wall clock. Two independent clocks: a
  // visitor's machine running half a minute fast made a form open for twenty
  // seconds look instant, and it was refused within thirty seconds of the
  // page opening. A monotonic duration has one clock at both ends.
  const payload = buildBuilderApplicationPayload(filled(), 30_000, "");
  assert.equal(typeof payload.elapsed_ms, "number");
  assert.ok(!("rendered_at" in payload), "a timestamp is being sent again");
  const page = code(PAGE);
  assert.match(page, /performance\.now\(\)/);
  assert.ok(
    !/new Date\(\)\.toISOString\(\)/.test(page),
    "the page is stamping a wall-clock time again",
  );
});

test("a browser with no monotonic clock omits the duration rather than lying", () => {
  // The endpoint treats an absent duration as unknown and accepts it, which
  // is what a cost raiser must do with data it cannot trust. Sending a zero
  // or a null would be refused or coerced.
  const payload = buildBuilderApplicationPayload(filled(), null, "");
  assert.ok(!("elapsed_ms" in payload), "a value is sent where none was measured");
});

test("the decoy is named outside the browser autofill taxonomy", () => {
  // `company_website` was chosen as a plausible name so a bot skipping
  // `honeypot` would still fill it. The flip side cost a real applicant: a
  // plausible name is exactly what a password manager fills.
  const tokens = [
    "address", "city", "company", "country", "email", "name", "organization",
    "phone", "postal", "postcode", "state", "street", "suburb", "tel",
    "title", "url", "website", "zip",
  ];
  for (const token of tokens) {
    assert.ok(!HONEYPOT_FIELD.includes(token), `${HONEYPOT_FIELD} contains "${token}"`);
  }
  // And it still does not announce itself to a bot reading field names.
  for (const giveaway of ["honey", "trap", "bot", "spam", "decoy"]) {
    assert.ok(!HONEYPOT_FIELD.includes(giveaway), giveaway);
  }
});

test("the decoy is display:none and carries no label to match on", () => {
  // An off-screen input is autofilled where a `display: none` one generally
  // is not, and the label text is itself a matching signal.
  const page = code(PAGE);
  const block = page.slice(
    page.indexOf('aria-hidden="true"'),
    page.indexOf("<section"),
  );
  assert.match(block, /display: "none"/);
  assert.ok(!/left: "-9999px"/.test(block), "still hidden by position");
  assert.ok(!/<label/.test(block), "the decoy carries a label to match on");
  assert.match(block, /tabIndex=\{-1\}/);
  assert.match(block, /autoComplete="off"/);
});

test("a refusal clears the decoy, so a person has a way past", () => {
  // A browser that filled it once will fill it again on reload, so without
  // this the applicant is in a loop they cannot break. It costs nothing
  // against the automation the decoy is for: a bot that does not read the
  // error never reaches that line.
  const page = code(PAGE);
  assert.match(page, /if \(decoy\) setDecoy\(""\);/);
});

test("the refusal for a tripped heuristic asserts no cause", () => {
  // The first wording blamed a page left open too long, which was false for
  // the applicant who met it and sent them to a reload that would have
  // refused them again.
  const { sentence } = readApplicationRefusal("submission_rejected");
  assert.ok(!/left this page open/i.test(sentence), sentence);
  assert.ok(!/reload/i.test(sentence), sentence);
  // And it names a way out that does not depend on a guess being right.
  assert.match(sentence, /get in touch/i);
});

test("the decoy is hidden from assistive technology, not only from sight", () => {
  // A screen reader user filling in a trap is the one failure this control
  // must not have.
  const source = code(PAGE);
  const block = source.slice(source.indexOf('aria-hidden="true"'), source.indexOf("<section"));
  assert.match(block, /name=\{HONEYPOT_FIELD\}/);
  assert.match(block, /tabIndex=\{-1\}/);
});

test("every posted field carries a name the focus logic can find", () => {
  // `focusField` looks a control up by `[name=...]`, so a field without one
  // is a refusal that points at nothing.
  const source = code(PAGE);
  for (const field of BUILDER_FIELD_ORDER) {
    assert.ok(source.includes(`name="${field}"`), field);
  }
});

test("the options are the four the network stores and the eight states", () => {
  assert.deepEqual(
    BUILDER_ORG_TYPE_OPTIONS.map((option) => option.value).sort(),
    ["builder", "builder_developer", "developer", "sales_representative"],
  );
  assert.deepEqual(
    AU_STATE_OPTIONS.map((option) => option.value).sort(),
    ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"],
  );
  for (const option of [...BUILDER_ORG_TYPE_OPTIONS, ...AU_STATE_OPTIONS]) {
    assert.ok(option.label.length > 0 && !option.label.includes("_"), option.value);
  }
});

// ── What they are told ──────────────────────────────────────────────────────

test("every upstream refusal is authored", () => {
  const missing = UPSTREAM_CODES.filter((code) => !AUTHORED_REFUSAL_CODES.includes(code));
  assert.deepEqual(missing, []);
});

test("an applicant is never told to do something only an operator could", () => {
  const forbidden: Array<[RegExp, string]> = [
    [/\bconsole\b/i, "names the console"],
    [/\bedit the organisation\b/i, "tells them to edit a record"],
    [/\bmint\b/i, "names minting"],
    [/\boperator\b/i, "names an operator"],
    [/\bMission Control\b/i, "names Mission Control"],
    [/_[a-z]+_/, "carries database vocabulary"],
    [/\b(429|403|500|502)\b/, "carries an HTTP status"],
  ];
  for (const code of AUTHORED_REFUSAL_CODES) {
    const { sentence } = readApplicationRefusal(code);
    for (const [pattern, why] of forbidden) {
      assert.ok(!pattern.test(sentence), `${code} ${why}: ${sentence}`);
    }
  }
});

test("a collision says nothing about whose registration it hit", () => {
  // This page is unauthenticated. One that confirms an ABN is registered, let
  // alone to whom, is a lookup service for other people's businesses.
  for (const code of ["abn_already_registered", "acn_already_registered", "legal_name_already_registered"]) {
    const { sentence } = readApplicationRefusal(code);
    assert.ok(!/another organisation/i.test(sentence), code);
    assert.ok(!/registered (to|by) /i.test(sentence), code);
  }
});

test("a rate limit never says what the limit is", () => {
  // An applicant cannot act on the number. A script can.
  for (const code of [
    "rate_limited",
    "too_many_applications_from_here_just_now",
    "too_many_applications_from_here_today",
  ]) {
    const { sentence } = readApplicationRefusal(code);
    assert.ok(!/\d/.test(sentence), `${code} states a number: ${sentence}`);
  }
});

test("a field refusal names its field and the rest do not pretend to", () => {
  for (const code of AUTHORED_REFUSAL_CODES) {
    const reading = readApplicationRefusal(code);
    if (reading.kind === "field") {
      assert.ok(reading.field, `${code} is a field refusal with no field`);
      assert.ok(BUILDER_FIELD_ORDER.includes(reading.field as never), `${code} names ${reading.field}`);
    }
    if (reading.kind === "ours") assert.equal(reading.field, null, code);
  }
});

test("an unrecognised code apologises rather than being unslugged", () => {
  // The console humanises an unknown code because its reader is technical.
  // "Owner not created." tells an applicant nothing and alarms them.
  for (const code of ["owner_not_created", "invite_not_issued", "application_not_recorded", "", null, undefined]) {
    const reading = readApplicationRefusal(code);
    assert.equal(reading.sentence, APPLICATION_FAULT_SENTENCE, String(code));
    assert.equal(reading.kind, "ours");
    assert.equal(reading.field, null);
  }
});

test("the page renders refusals from the table and holds no copy of its own", () => {
  const source = code(PAGE);
  assert.match(source, /readApplicationRefusal/);
  for (const authored of AUTHORED_REFUSAL_CODES) {
    assert.ok(!source.includes(authored), `${authored} is spelled on the page`);
  }
});

test("a refusal that names a field marks and focuses that field", () => {
  // Otherwise the message sits at the top of the form and the box looks fine.
  const source = code(PAGE);
  assert.match(source, /if \(refusal\.field\)/);
  assert.match(source, /focusField\(refusal\.field\)/);
  assert.match(source, /setErrors\(\{ \[refusal\.field\]: refusal\.sentence \}\)/);
});

// ── The transport ───────────────────────────────────────────────────────────

test("the submission is awaited, unlike the waitlist's fire-and-forget mirror", () => {
  // The post IS the act here: it creates the organisation and sends the
  // invitation. Whether that happened is the only thing the applicant came
  // to find out.
  const source = code(TRANSPORT);
  assert.match(source, /await fetch\(/);
  assert.ok(!source.includes("keepalive"), "a keepalive post is a post nobody reads");
  assert.ok(!source.includes("void fetch("), "fire-and-forget");
});

test("nothing retries a submission", () => {
  // A retry that succeeds against a completed first attempt collides with
  // the address window the applicant has just spent.
  const source = code(TRANSPORT);
  assert.ok(!/retry|attempts|for \(/i.test(source), "the transport retries");
});

test("a transport failure answers no invented code", () => {
  // `network_error` would be a vocabulary the endpoint does not share, and
  // the refusal table would then apologise for it anyway — through a code
  // that looks authored.
  const source = code(TRANSPORT);
  assert.match(source, /return \{ ok: false, code: "" \};/);
  assert.ok(!/network_error|transport_error|unknown_error/.test(source));
});

test("a body that will not parse is never read as a success", () => {
  const source = code(TRANSPORT);
  const parse = source.slice(source.indexOf("await response.json()"));
  assert.match(parse, /catch[\s\S]{0,120}return \{ ok: false/);
  // And the status alone is not the verdict: the endpoint says `ok`.
  assert.match(source, /!response\.ok \|\| body\.ok !== true/);
});

test("the CAPTCHA is only half a control, and the page says which half", () => {
  // A site key is public and proves nothing; the SECRET in Mission Control
  // decides whether a token is required. Publishing one without the other
  // either renders a widget nobody checks or refuses every application.
  const source = code(TRANSPORT);
  assert.match(source, /VITE_BUILDER_APPLY_TURNSTILE_SITE_KEY/);
  const page = code(PAGE);
  // No key, no widget, no third-party script — a page that fetches
  // Cloudflare to discover it has no CAPTCHA is paying for one it lacks.
  assert.match(page, /TURNSTILE_SITE_KEY\.length > 0/);
  assert.match(page, /if \(!enabled \|\| !holder\.current\) return;/);
});

test("the confirmation tells the truth when the email did not send", () => {
  // Saying "check your email" there sends somebody to an empty inbox and
  // then to a second application, which the day-long window would refuse.
  const source = code(PAGE);
  assert.match(source, /accepted\.emailSent \?/);
  assert.match(source, /could not send your email/i);
  assert.match(source, /no need to apply again/i);
});

test("the confirmation never shows an invitation link", () => {
  // It is the credential and it goes to the mailbox on the application.
  const source = code(PAGE);
  for (const leak of ["invite_url", "inviteUrl", "invite_token", "/join/"]) {
    assert.ok(!source.includes(leak), leak);
  }
});

test("a registration number is its digits, however it was typed", () => {
  // "12 345 678 901" and "12345678901" are the same number; refusing the
  // spaced form refuses the way it is printed on every invoice.
  for (const typed of ["12 345 678 901", "12345678901", " 12-345-678-901 "]) {
    assert.equal(digitsOnly(typed), "12345678901", typed);
  }
  // And it strips separators only — a letter is kept so the shape check can
  // refuse it, rather than being silently deleted into a valid-looking one.
  assert.equal(digitsOnly("12345678901X"), "12345678901X");
});
