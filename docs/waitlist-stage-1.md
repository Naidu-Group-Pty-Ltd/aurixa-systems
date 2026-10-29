# Stage 1 — Priority Access Application

Implementation notes for the Join Waitlist page (`/contact`), built to section 5
and Appendix A of *Aurixa Systems Priority Access, Qualification & Onboarding
Operating Model v1.0*.

Scope matches the roadmap's Week 3 exit deliverable: revised form, validation,
privacy notice, confirmation page, source tracking and application ID. Stage 2
(Business Readiness Questionnaire) and the transactional email sequence are not
part of this change.

> **Where each stage lands (29 Oct 2026).** Every stage submits to Mission
> Control (`/api/public/leads/capture`), and the applicant is told Mission
> Control's answer; the Stage 3 scheduler asks Mission Control's gate
> (`/api/public/storefront/strategic-review-access`) before it opens. Mission
> Control sends the applicant and team emails at all three stages. The Make.com
> webhooks described below lived in the EU Make account, which is deprecated —
> they answered `200 Accepted` and ran nothing, which left the scheduler
> refusing every applicant — so the site no longer calls them, and Airtable no
> longer receives applications. What follows about Make is the history of the
> payloads, which Mission Control reads unchanged.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/waitlist.ts` | Field spec, option lists, production copy, validation, intake badge, payload builder |
| `src/lib/attribution.ts` | Silent UTM / referrer / landing-page capture (section 5.4) |
| `src/pages/Contact.tsx` | Form, validation UI and confirmation screen |

## Field specification (section 5.2)

| Field | Control | Status | Notes |
| --- | --- | --- | --- |
| First Name | text | required | 2-60 characters |
| Last Name | text | required | 2-60 characters |
| Work Email | email | required | lowercased and trimmed on blur |
| Mobile Number | tel | **optional** | normalised to E.164 |
| Organisation Name | text | required | 2-120 characters |
| Your Role | dropdown | required | new field, 11 options |
| Organisation Type | dropdown | required | new option list |
| Approximate Annual Client or Transaction Volume | dropdown | required | includes "Not yet known" |
| What would you most like Aurixa to improve? | multi-select | required | min 1, max 3 |
| Anything Else We Should Know? | textarea | optional | max 500 characters, live counter |
| Privacy Acknowledgement | checkbox | required | unticked by default |
| Product Updates and Marketing | checkbox | optional | separate and unticked |

Replaces the previous all-mandatory form, the "Directive"/"Entity"/"Corporate"
labels, the static "Q4 Review Cycle" badge and the mandatory free-text
bottleneck field.

## Wording

All applicant-facing copy comes from `WAITLIST_COPY` in `src/lib/waitlist.ts`,
matching Appendix A.1/A.2: heading, supporting text, time estimate, required-field
note, helper text, pre-submit explanation, consent wording and the button label
("Apply for my free trial"; it was "Submit Priority Access Application" until
the page became the free trial application, and the trial length in this copy
comes from `FREE_TRIAL_DAYS` in `src/lib/cta.ts`).

The collection notice is presented inline above the acknowledgement checkbox —
Aurixa's identity, purposes, typical disclosures, the privacy contact pathway and
the warning against submitting confidential client information. It is versioned
(`PRIVACY_NOTICE_VERSION`) and the version is stored on every submission.

## Validation and interaction (section 5.4)

- Persistent visible labels; placeholders are examples only.
- Required fields marked with text (`*`) plus `aria-required`.
- Field-specific text errors, `role="alert"`, `aria-invalid` and a red border;
  the first invalid control receives focus and is scrolled into view.
- All values live in React state, so nothing is lost when validation fails or a
  submission errors.
- Checkbox group uses `fieldset`/`legend`; the fourth option is disabled once
  three priorities are selected.
- Duplicate submissions are prevented by the disabled button, an in-flight guard
  and a stable application ID used as an idempotency key.
- Mobile renders a single column; paired fields only survive at `md` and above.

## Application ID

`generateApplicationId()` produces a non-sequential `AX-XXXXXXXXXX` reference
from `crypto.randomUUID()`. It is generated on the client so the same value keys
the Make.com webhook (also sent as the `X-Application-Id` header), Aurixa's own
`capture-lead` backend and the Mission Control mirror. It is shown on the
confirmation screen and stays stable across retries and email corrections.

## Confirmation screen (section 5.6 / Appendix A.3)

Replaces the form on success with the received heading, the applicant's first
name and organisation, the application reference, the masked work email, the
review timeframe, the next-step explanation and a correction path for the email
address (answers retained, same reference reused).

A correction is the same application posted again with the new address.
Mission Control re-addresses it and sends the Stage 1 email again
(`aurixa-mission-control` docs/LEAD_EMAILS.md, "Address corrections"), but only
for the browser that made the application: the `201` that accepted it carries a
`correction_token`, which `submitApplication` keeps in memory for the page's
life and sends back as `correctionToken`. The reference alone is not enough. It
is printed in the Stage 1 email, which may have gone to the very address being
corrected. A correction Mission Control will not make (more than a day after
applying, after the questionnaire, or too many times) answers `409
correction_refused`. The form then says the address can no longer be changed
here and to email admin@aurixasystems.com.au quoting the reference.

When `VITE_READINESS_QUESTIONNAIRE_URL` is set, the primary button links straight
to the Stage 2 questionnaire. Until Stage 2 exists, the screen instead states
that the secure link will be emailed.

## Payload contract

Existing Make.com → Airtable field names are unchanged so the current scenario
keeps working:

`directiveFirstName`, `directiveLastName`, `corporateEmail`, `mobileNumber`,
`entityName`, `entityClassification`, `annualOriginationTransactionVolume`,
`currentTechStackBottlenecks`.

`currentTechStackBottlenecks` is now derived — selected improvement areas joined
with `; `, then the optional note appended after an em dash.

Added alongside them: `applicationId`, `formVersion`, `firstName`, `lastName`,
`workEmail`, `organisationName`, `role`, `roleLabel`, `organisationType`,
`organisationTypeLabel`, `annualVolume`, `annualVolumeLabel`,
`primaryAreasToImprove` (slugs), `primaryAreasToImproveLabels`,
`additionalNotes`, `privacyAcknowledged`, `privacyNoticeVersion`,
`marketingConsent`, `landingPage`, `referrer`, `utmSource`, `utmMedium`,
`utmCampaign`, `utmTerm`, `utmContent`, plus `name`/`email`/`company`/`phone`/
`message` aliases that populate the `leads` table columns in `capture-lead`.

**Option values changed.** `entityClassification` now uses the operating model's
organisation-type list (existing slugs `buyers_agent`, `property_advisory`,
`real_estate_agency`, `mortgage_finance`, `developer` are preserved; the
wealth/financial-planning/investment-group/enterprise slugs are retired and
`construction`, `accounting_smsf`, `conveyancing_legal`, `property_management`,
`multi_service_group`, `technology_partner`, `other` are added).
`annualOriginationTransactionVolume` now carries client/transaction counts
(`pre_launch_under_10` … `over_500`, `not_yet_known`) instead of the old dollar
brackets `tier_1`–`tier_4`. Airtable single-select fields need these options
added before launch.

## Environment variables

| Variable | Effect |
| --- | --- |
| `VITE_INTAKE_BADGE` | Badge key: `applications_open`, `priority_review_window`, `august_2026_intake`, `limited_capacity`, `under_review`, `enterprise_intake` |
| `VITE_INTAKE_BADGE_EXPIRES` | ISO date; after it passes the badge reverts to "Applications Under Review" |
| `VITE_READINESS_QUESTIONNAIRE_URL` | Stage 2 link on the confirmation screen; unset shows the "we will email you" message |
| `VITE_PRIVACY_POLICY_URL` | Adds a Privacy Policy link beside the acknowledgement |

Unset, unrecognised or expired badge values fall back to the safe default, so
stale campaign wording cannot linger on the site.

## Not included / follow-ups

- **Stage 2 questionnaire** and the **welcome, reminder and completion emails**
  (sections 6 and 10) — the Make.com scenario still owns delivery and has not
  been changed here.
- **Server-side validation.** `capture-lead` validates the email only; the new
  required fields are enforced in the browser. Add matching checks to the edge
  function (and to the Make.com scenario) before launch.
- **Country selector for mobile.** Implemented as a single field: Australian
  numbers may be entered locally and normalise to `+61`, international numbers
  require an explicit country code, per the Appendix A.2 helper text.
- **Airtable / Mission Control schema** updates for the new fields and changed
  option values.
- **Privacy Policy page.** The collection notice is presented inline; the
  Privacy Policy link appears only once `VITE_PRIVACY_POLICY_URL` is configured
  (the footer's "Legal & Privacy" link is still a placeholder).
