# Stage 2 — Business Readiness Questionnaire

Implementation notes for `/questionnaire`, built to section 6, Appendix B and
sections 13, 14 and 17 of *Aurixa Systems Priority Access, Qualification &
Onboarding Operating Model v1.0*.

Stage 1 (`/contact`) retains its existing form and direct Make.com payload. Stage 3 scoring, the transactional email
sequence and the CRM routing in sections 7, 10 and 11 are not part of this
change.

> **The service below is written and switched off, and the Stage 2 gate is not a
> gate until it is on.** What that costs, why raising the Airtable token's
> entropy is the wrong repair, and the steps to activate it are in
> [`readiness-questionnaire-activation.md`](./readiness-questionnaire-activation.md).

## Files

| File | Purpose |
| --- | --- |
| `src/pages/Questionnaire.tsx` | Page: access states, four sections, review screen, completion screen |
| `src/lib/readinessQuestionnaire.ts` | Question bank, option slugs, copy, conditional logic, validation, review model |
| `src/lib/readinessQuestionnaireService.ts` | Typed client for the questionnaire service (authorise / save / complete) |
| `src/lib/readinessQuestionnaire.test.ts` | Logic tests — `npm test` |
| `src/components/questionnaire/QuestionFieldset.tsx` | Fieldset/legend chrome and conditional block |
| `src/components/questionnaire/QuestionnaireProgress.tsx` | Four-section progress indicator |
| `src/components/questionnaire/SingleSelectGroup.tsx` | Native radio group in Aurixa option cards |
| `src/components/questionnaire/MultiSelectGroup.tsx` | Native checkbox group: exclusive options, max count |
| `src/components/questionnaire/RankedCapabilitySelector.tsx` | BRQ-10 ranked top five, buttons only |
| `src/components/FormControls.tsx` | `Field`, `Dropdown` and the Aurixa control classes, moved out of `Contact.tsx` so both stages share one implementation |
| `src/components/StageOneCompleteModal.tsx` | The unchanged PROCEED handoff dialog |
| `src/lib/readinessHandoff.ts` | Two-hour same-tab `sessionStorage` journey gate |
| `supabase/functions/readiness-questionnaire/index.ts` | Questionnaire service (**not deployed**) |
| `supabase/migrations/20260728120000_readiness_questionnaire.sql` | Tables, RLS (**not applied**) |

## Visibility

The route exists but is unlisted. It is not in the Navbar, mobile menu, Footer,
any public page, any CTA or any sitemap (the site has no sitemap file), and the
page appends its own `robots: noindex, nofollow` meta on mount and removes it on
unmount so no other route's metadata changes. A browser check across `/`,
`/platform`, `/solutions`, `/industries`, `/about`, `/resources` and `/contact`
confirms no anchor references `/questionnaire`.

A `noindex` meta added by client-side JavaScript is weaker than a response
header. Serving `X-Robots-Tag: noindex, nofollow` for `/questionnaire` from the
hosting layer is recommended before launch.

## Question bank

Identifiers are stable; labels may be reworded. Questionnaire version:
`business-readiness-v1`.

| ID | Question | Control | Required |
| --- | --- | --- | --- |
| BRQ-01 | Role within the organisation | Dropdown, prefilled and correctable | Yes |
| BRQ-02 | Authority for technology purchases | Single select | Yes |
| BRQ-03 | People requiring access | Single select | Yes |
| BRQ-04 | Offices, entities or divisions | Single select | Yes |
| BRQ-05 | Operating locations (Australian states and territories) | Multi-select | Yes |
| BRQ-06 | Systems currently used | Multi-select + optional product names | Yes |
| BRQ-07 | Three biggest operational problems | Multi-select, max 3 | Yes |
| BRQ-08 | Weekly repetitive administration | Single select | Yes |
| BRQ-09 | Workflow causing the greatest difficulty | Textarea, 750 chars | No |
| BRQ-10 | Most relevant Aurixa capabilities | Ranked top five | Yes |
| BRQ-11 | Systems needing integration | Multi-select | Yes |
| BRQ-12 | Data migration | Single select + follow-ups | Yes |
| BRQ-13 | Implementation timing | Single select | Yes |
| BRQ-14 | Security, hosting, procurement requirements | Multi-select | Yes |
| BRQ-15 | Most useful next step | Single select | Yes |
| BRQ-16 | Indicative investment range | Single select, within 90 days only | No |

BRQ-01 reuses `ROLE_OPTIONS` from `src/lib/waitlist.ts` — there is no second
role list.

Conditional detail fields hang off their parent with a suffixed identifier
(`BRQ-01-OTHER`, `BRQ-11-PHONE-SYSTEM`, `BRQ-11-CUSTOM-NAME`, `BRQ-12-SOURCES`,
`BRQ-14-CONTEXT`, `BRQ-16-SPONSOR`, …). Optional product names use
`BRQ-06-PRODUCT:<system>`.

### Deviations from Appendix B

Requested by Aurixa after review of the live page:

- **BRQ-05 is Australian states and territories only.** New Zealand, Malaysia and
  "Other international markets" were removed, so the `BRQ-05-OTHER` follow-up has
  no trigger and was removed with them. BRQ-04 still offers "International or
  multi-jurisdiction organisation" if an applicant needs to signal offshore
  operations.
- **BRQ-10 "Voice automation" reads "AI Voice Agents & Call Logging"** — the
  Aurixa capability (inbound and outbound agents, lead follow-up, qualification,
  appointment scheduling, call logging, record updates and workflow actions)
  rather than the mechanism. Slug remains `voice_automation`.
- **BRQ-11 "Telephony" reads "Existing Phone or VoIP System"** and, when
  selected, asks "Which phone or VoIP system does your organisation currently
  use?" (`BRQ-11-PHONE-SYSTEM`, required, 160 chars). This keeps Aurixa Voice
  positioned as the product capability while the applicant's own phone system is
  only ever an integration target. Slug remains `telephony`.

Slugs are deliberately unchanged: labels may be reworded, identifiers must not
move. The questionnaire version stays `business-readiness-v1` because no response
has ever been stored — the first bump belongs to the first option change made
*after* responses start being persisted.

## Conditional logic (section 6.6)

`activeQuestionIds(answers)` is the single source of truth for what is on
screen. It drives rendering, validation, the review screen and the `active` flag
on every stored answer.

- Any "Other" selection requires an explanation.
- "No central system", "None initially", "Not yet known" and "None" are mutually
  exclusive with the named options in their group.
- Migration follow-ups appear for the five migration categories only.
- The phone-system follow-up appears only for "Existing Phone or VoIP System".
- Custom-integration follow-ups appear only for "Custom internal system".
- The security context field appears only when a named requirement is selected.
- More than 100 users, or multiple legal entities / national / international
  structure, reveals the three enterprise-readiness questions.
- Implementation within 90 days reveals BRQ-16 and the project-sponsor question;
  "Researching only", "3-6 months" and "6-12 months" suppress both.
- "No central system" reveals the information-management question.

**Nothing is deleted silently.** A conditional answer that stops being displayed
is retained in the draft and marked `active: false`, so changing a selection back
restores it, and inactive answers are never submitted as live responses. The one
case that genuinely discards answers — choosing a mutually exclusive option while
named options are selected — shows an inline confirmation first.

## Access

`/questionnaire` is reachable three ways, resolved in this order:

1. **A secure questionnaire token** in the link (`?t=…`) — prefill, draft resume
   and autosave through the existing Stage 2 service.
2. **The Stage 1 → Stage 2 same-tab handoff** — after the existing direct
   Make.com submission succeeds, `/contact` writes `aurixa_readiness_access` to
   `sessionStorage` with the cleaned Stage 1 prefill and a two-hour expiry.
3. **The open-access escape hatch** — `VITE_QUESTIONNAIRE_OPEN_ACCESS="true"`.
   Off by default.

Anything else sees the existing locked screen. A direct visit, another browser,
an incognito session, or a separate unrelated tab has no handoff record and
therefore remains locked. Refreshing the authorised questionnaire tab remains
open until the record expires; closing the browser tab/session removes access.
Malformed and expired records are removed and fail closed.

### Stage 1 → Stage 2 handoff

    Stage 1 submitted directly to the existing Make.com webhook
      → Make.com accepts the unchanged payload and X-Application-Id header
      → current tab writes a two-hour sessionStorage record
      → unchanged PROCEED modal appears
      → user clicks PROCEED
      → same tab navigates to /questionnaire with no query string

If Make.com rejects the submission, no record or modal is created. If browser
storage is unexpectedly unavailable after Make.com accepts, the application
still stands and the existing receipt screen is shown instead of offering a
questionnaire that cannot unlock. The record is cleared after successful Stage
2 completion, not during refreshes or movement between questionnaire sections.

This handoff is intentionally a client-side journey gate, **not server-side
authentication**. It uses no cookies, encryption, serverless handoff endpoints,
PowerShell/OpenSSL setup, or Vercel secret. `READINESS_SESSION_SECRET` is no
longer required. Secure token-based questionnaire access remains separately
available and unchanged.

## Secure access and prefill

1. The applicant opens `/questionnaire?t=<opaque token>`.
2. The page exchanges the token for a session, then strips it from the visible
   URL with `history.replaceState`.
3. Autosave and completion authenticate with the session token only.

No name, email, organisation or answer ever appears in a URL. The token is 32
bytes of CSPRNG output, not derived from any identifier, and only its SHA-256
hash is stored.

Prefill (application id, name, work email, organisation, role, organisation type,
annual volume) is returned by the server against the verified token — never read
from the URL. It is displayed read-only in the application summary, with the work
email masked. Only BRQ-01 is editable, as section 6.2 allows; other corrections
are directed to Aurixa.

With the gate on, the form does not render without a valid session. Missing and invalid tokens
share one message so the page cannot be used to test whether an application or
email exists. Expired links, already-completed questionnaires and service
failures each get their own state.

> ### ⚠ That paragraph describes the *server* path, which is not deployed
>
> The above holds for `authorise` — the token exchanged with the
> `readiness-questionnaire` edge function. **That function has never been
> deployed** (see the table at the top of this document; confirmed against the
> project's live function list). So it is not what runs.
>
> What runs is the *dynamic link* path in
> `src/lib/questionnaireLinkAccess.ts`. When a link carries `token` **and**
> `expires`, access is granted on a **regex shape check and a date comparison**
> — no signature, no HMAC, no network call. In practice:
>
> ```
> /questionnaire?token=aaaaaaaaaaaaaaaa&expires=2030-01-01
> ```
>
> opens the full form to anyone who types it. This is not a devtools bypass; it
> is a hand-typed URL.
>
> **No data is disclosed.** `openAccessSession()` returns an empty prefill, so a
> forged link exposes no applicant PII and still cannot be used to probe whether
> an application exists — that half of the paragraph above is accurate.
>
> **The exposure is write-side.** A forged session can complete the form and
> reach the Stage 2 Make webhook, injecting responses into the Business
> Readiness pipeline.
>
> This cannot be fixed in the browser. A secret able to verify the token would
> have to ship to the browser, at which point it is not a secret. Two things
> have been done in the meantime, and neither is a fix:
>
> - the submission now carries `accessTokenPresented` (the raw token) so the
>   Make scenario **can** validate it, and `accessVerified: false` so the
>   operations record stops implying something was checked;
> - `resolveQuestionnaireLink` carries a comment saying plainly what it is.
>
> **The actual fix is one of two things, both outside this repo:**
>
> 1. the Stage 2 Make scenario rejects any submission whose
>    `accessTokenPresented` it did not issue; or
> 2. `readiness-questionnaire` is deployed and the client switches to
>    `authorise` — which also requires Make to call the `issue` action, or every
>    link already in an applicant's inbox stops working.
>
> Until one of those lands, treat Stage 2 submissions as unauthenticated input.

A development-only preview (`/questionnaire?preview=1`) is guarded by
`import.meta.env.DEV`; Vite removes the branch and its fixture from production
builds (verified by grepping `dist/`). The fixture contains no real data.

## Save and resume

Answers are debounced 1.2 s and saved through the service, with one automatic
retry after 4 s. The applicant sees "Saving…", "Saved" or "Save failed —
retrying" in a polite live region. Drafts are held in memory while a request is
in flight and are never written to `localStorage`, the URL or analytics.

`responseVersion` is optimistic-concurrency control: the client sends the version
it holds and the server rejects a stale write instead of overwriting a newer
draft from another device.

Autosave only runs against an authorised session. With the token gate off there
is nothing to save to, and the page says so rather than showing "Saved".

**Cross-device resume is implemented but not yet live** — it depends on the
migration and edge function below being applied and deployed.

## Service contract

`POST {VITE_READINESS_API_URL}` (default
`{storefront functions base}/readiness-questionnaire`):

| Action | Purpose |
| --- | --- |
| `issue` | Admin only (`x-aurixa-admin-secret`). Stores the Stage 1 snapshot, revokes outstanding links and returns a new raw token once, for the transactional email. Never called by the browser. |
| `authorise` | Verifies the token, issues a 2-hour session, returns prefill, draft, questionnaire version, response version and completion state. |
| `save` | Upserts answers against a session, bumps the response version, records `readiness.started` on first response. |
| `complete` | Revalidates every active required answer server-side, freezes the response version, records `completed_at`, revokes the link and emits `readiness.completed`. |

Score, priority class and tier are Stage 3 outputs. They are not computed in the
browser and never returned by any of these actions.

## Data model

`readiness_applications`, `readiness_questionnaire_tokens`, `readiness_sessions`,
`readiness_responses`, `qualification_responses` and `readiness_events`. RLS is
enabled with **no policies** on every table, so only the service role — the edge
function — can read or write. Public references are the existing non-sequential
`AX-XXXXXXXXXX` id; everything internal is a UUID.

`qualification_responses` carries question id, answer, active flag, response
version, questionnaire version and timestamps, per section 13.2.

## Accessibility

Keyboard-only completion, `fieldset`/`legend` for every group, persistent
labels, required state in text as well as colour, field-level errors with an
error summary, focus moved to the first invalid question, focus moved to the
completion heading, `aria-current="step"` on the progress indicator, and polite
live regions for save status, section changes and ranked-order changes. The
ranked selector uses Add / Move up / Move down / Remove buttons — there is no
drag-and-drop.

## Verification

- `npm run lint` (tsc) — clean.
- `npm run build` — clean.
- `npm test` — 28 logic tests covering validation, every conditional rule, the
  max-three and ranked-five limits, mutual exclusivity, inactive-answer handling
  and the review model.
- Browser sweep at 1440, 1024, 768, 430, 390 and 320 px: no horizontal overflow
  in any section, on the review screen or on the completion screen; section
  validation, focus-to-first-error, forward/back answer retention, every
  conditional branch, review labels (no slugs), submission and completion focus.
- Access states driven through intercepted responses: invalid, expired,
  already-completed and service-unavailable, each stripping the token from the
  URL.
- Prefill, resumed draft, autosave success, autosave failure, automatic retry and
  recovery.
- Contact page regression: control styling and dropdown behaviour unchanged after
  the `FormControls` extraction.

## Outstanding before launch

- **Submission has no destination.** With no backend deployed, completing the
  questionnaire shows "not yet connected for submission" and the answers are
  lost when the tab closes. Either deploy the service below, or route Stage 2
  submissions through the existing Make.com webhook the way Stage 1 does — that
  decision has not been made.
- **Apply the migration and deploy the edge function.** Neither has been run.
- **Set `READINESS_ADMIN_SECRET`** in the function's environment.
- **Issue links from Stage 1.** The Make.com scenario (or `capture-lead`) must
  call the `issue` action after a Priority Access Application and put the
  returned token in the welcome email as `…/questionnaire?t=<token>`. Until that
  exists, `VITE_READINESS_QUESTIONNAIRE_URL` should stay unset so the Stage 1
  receipt keeps saying the link will be emailed.
- **Keep the server-side required rules in step** with
  `src/lib/readinessQuestionnaire.ts`; the edge function duplicates them
  deliberately so the browser is never the only check.
- **Link expiry, reissue and reminder suppression** (section 10) are supported by
  the schema but have no operational process yet.
- **`X-Robots-Tag` header** for `/questionnaire` at the hosting layer.
- **Retention and deletion jobs** for abandoned and withdrawn questionnaires
  (section 14.1).
