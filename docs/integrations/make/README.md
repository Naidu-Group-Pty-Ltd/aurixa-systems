# Make.com blueprints — Aurixa Systems

> **Deprecated (29 Oct 2026).** The EU Make account these scenarios ran in is
> deprecated: their hooks answer `200 Accepted` and run nothing. The website no
> longer calls them — every stage submits to Mission Control, which sends the
> applicant and team emails and answers the Stage 3 access check — and the us2
> account's copies of the Stage 1–3 scenarios are switched off. These exports
> are the record of what the funnel did, and of the payloads Mission Control
> still reads.

A point-in-time export of the Aurixa scenarios in the Make organisation
(`eu2.make.com`, org `1620547`, team `528268`), taken **2026-08-18**.

These four scenarios are the priority-access application funnel end to end, and
they hand off to each other in order:

| Blueprint | Scenario id | In Make | Modules |
| --- | --- | --- | --- |
| [`waitlist/aurixa-stage-3-access.9602082.json`](waitlist/aurixa-stage-3-access.9602082.json) | `9602082` | live | 4 |
| [`waitlist/aurixa-waitlist-stage-1.9389960.json`](waitlist/aurixa-waitlist-stage-1.9389960.json) | `9389960` | live | 7 |
| [`waitlist/aurixa-waitlist-stage-2.9590512.json`](waitlist/aurixa-waitlist-stage-2.9590512.json) | `9590512` | live | 4 |
| [`waitlist/aurixa-waitlist-stage-3.9601915.json`](waitlist/aurixa-waitlist-stage-3.9601915.json) | `9601915` | live | 7 |

- **Stage 1** takes the waitlist submission, writes the applicant to Airtable
  and sends the acknowledgement.
- **Stage 2** receives the Business Readiness Questionnaire, writes ~40 answer
  fields to Airtable and emails the "book your strategic review" invitation.
- **Stage 3 Access** is a synchronous gate: the site posts an application id and
  the scenario answers `{"ok": true|false, "applicant": {…}}` only when
  Airtable holds both a matching application **and** a `Stage 3 Access` value of
  `GRANT`. It is what stops the scheduling page opening for an unapproved
  applicant.
- **Stage 3** records the requested slot, waits, re-reads the row, and sends the
  confirmation email only if `Send Booking Confirmation` still reads `SEND` —
  so a slot withdrawn in Airtable between request and send is not confirmed.

All four run on the Airtable base `apptyShYE0yzL4IGB` and send through Microsoft
Graph rather than a mail app, which is why the HTML email bodies are inlined in
the blueprint.

`manifest.json` is the machine-readable index.

## What a file here is

Each `.json` is a Make **blueprint object** — `flow`, `metadata`, `name`,
`scheduling`, `interface` — which is exactly what Make's own *Export Blueprint*
button produces and exactly what Make's *Import Blueprint* accepts. It is not
the API's scenario envelope: the surrounding metadata (active state, hook id,
folder, timestamps) lives in `manifest.json` instead, so a blueprint file can be
re-imported without being edited first.

Filenames are `<slug>.<scenarioId>.json`. The numeric id is the Make scenario id
and is the stable identifier — names get renamed, ids do not.

## Credentials are placeholders, not values

Several scenarios hard-code an API key into an HTTP module's `Authorization`
header rather than using a Make connection. Those literals have been replaced
with named placeholders of the form `{{SECRET:NAME}}`.

They are **replaced, never deleted**. A deleted key produces a blueprint that
imports cleanly and then fails at runtime with nothing to point at; a named one
fails loudly and says which key is missing. Re-importing is a find-and-replace
of each placeholder with the live value before you paste the blueprint in.

Scenarios that use a Make *connection* (Airtable, Microsoft 365, OpenAI, Twilio,
Google) are unaffected — those carry only a numeric connection id, never a
secret, and the id is meaningless outside this Make account.

None of the four Aurixa blueprints contains a hard-coded credential — they use
Make connections throughout, so no placeholder appears in this directory.

## Re-importing a blueprint

1. Substitute any `{{SECRET:*}}` placeholder with the live credential.
2. Make → Scenarios → **Create a new scenario** → ⋯ → **Import Blueprint**.
3. Re-map every connection and webhook. Connection ids and `hook` ids in these
   files refer to objects in the original account; an import into any other
   account (or a re-import after a webhook is deleted) must re-point them.

An import creates a *new* scenario. It does not update the scenario the
blueprint came from, and the new one starts inactive.

## The emails are moving to Mission Control (29 Oct 2026)

Mission Control can now send all three applicant emails itself, in copy edited
on its **Email → Lead emails** page (Mission Control `docs/LEAD_EMAILS.md`).
Each stage moves on its own, and only after its email modules are taken out of
the scenario here — otherwise every applicant gets the email twice. The rest of
each scenario stays: it still writes the stage to Airtable.

| Scenario | Remove | Then |
| --- | --- | --- |
| Aurixa Waitlist Stage 1 (`9389960`) | modules 19 and 21 (create and send) and 22 (record the send) | — |
| Aurixa Waitlist Stage 2 (`9590512`) | modules 3 and 4 (create and send) | — |
| Aurixa Waitlist Stage 3 (`9601915`) | modules 7 and 8 (create and send) | connect module 4 to module 9, give that link module 7's filter (`Send Booking Confirmation` equal to `SEND`), and clear module 9's Confirmation Message ID field |

Aurixa Stage 3 Access (`9602082`) sends no email and is unaffected. A stage
handed over no longer needs the wording edits below.

## Free trial wording (29 Oct 2026)

Since 28 Oct 2026 the funnel's first stage is the **free trial application**,
but the three email-sending scenarios still say *priority access*. Edit the
live scenarios in place rather than re-importing (an import creates a new
scenario). In each one, open the Microsoft Graph **HTTP · Make a request**
module named below, find each phrase in its request body, and replace it.
Trial lengths are left out on purpose, because an offer code can change the
length.

| Scenario | Module | Find | Replace with |
| --- | --- | --- | --- |
| Aurixa Waitlist Stage 1 (`9389960`) | 19 | `"subject": "Application Received — Aurixa Systems Waitlist"` | `"subject": "Application Received — Your Aurixa Systems Free Trial"` |
| | 19 | `<title>Aurixa Systems — Priority Access Application Received</title>` | `<title>Aurixa Systems — Free Trial Application Received</title>` |
| | 19 | `Your Aurixa Systems priority access application has been received.` | `Your Aurixa Systems free trial application has been received.` |
| | 19 | `Your priority access application for` | `Your free trial application for` |
| | 19 | `in connection with an Aurixa Systems priority access application.` | `in connection with an Aurixa Systems free trial application.` |
| Aurixa Waitlist Stage 2 (`9590512`) | 3 | `in connection with an Aurixa Systems priority access application.` | `in connection with an Aurixa Systems free trial application.` |
| Aurixa Waitlist Stage 3 (`9601915`) | 7 | `The final stage of your priority access application is booked.` | `The final stage of your free trial application is booked.` |
| | 7 | `in connection with an Aurixa Systems priority access application.` | `in connection with an Aurixa Systems free trial application.` |

The phrases come from the 2026-08-18 exports in this directory. If the live
module was edited since, search for "priority access" and "Waitlist" to find
anything else. Afterwards, export the three scenarios again so these files
match what is live. The scenario names are internal and can stay as they are.
