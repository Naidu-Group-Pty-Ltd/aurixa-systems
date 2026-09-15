# Activating the Stage 2 questionnaire service — the real fix

Companion to [`readiness-questionnaire-stage-2.md`](./readiness-questionnaire-stage-2.md),
which describes what was built. This one records **why the Stage 2 gate is not a
gate today**, why the obvious repair is the wrong one, and what activating the
service that already exists actually involves.

Written 2026-09-15, out of the Airtable automation migration. Nothing here has
been done — it is the plan, kept so the next person does not have to re-derive
it.

## The finding

The Stage 2 questionnaire URL is minted by an Airtable automation script
(`Aurixa Lead Capture`, node `wacH9k8BK7X3AZZSk` in base `appFNPL7iYiuQyHAO`),
which generates a token with `Math.random()` and writes it to the applicant's
`Token` and `Bypass URL` columns.

The migration snapshot called that token "guessable, not secure" and a
`crypto.getRandomValues` replacement was written to fix it. Two things came out
of trying, and both matter more than the original finding.

### 1. Airtable's automation runtime has no CSPRNG

Measured by running it on 2026-09-15:

```
Error: crypto.getRandomValues is unavailable in this scripting runtime.
```

The Scripting **extension** runs in the browser and has `crypto`; automation
**actions** run in a restricted server sandbox that does not. There is no way to
mint a strong token from inside Airtable, so the shipped script deliberately
keeps the legacy `Math.random()` behaviour — pasting it is parity with the source
base, not a regression.

### 2. The token is not checked anywhere, so its entropy is not the control

`src/lib/questionnaireLinkAccess.ts` gates `/questionnaire`, and its own header
says so:

> ⚠ **This is not an authorisation boundary, and cannot be made into one.**

It tests only that the token is *shaped* like one — `^[A-Za-z0-9_-]{16,256}$` —
and that `expires` parses to a future date. There is no signature, no HMAC and no
network call, so `?token=aaaaaaaaaaaaaaaa&expires=2030-01-01` admits anyone who
types it. Nothing client-side can do better: a secret capable of verifying the
token would have to ship to the browser, at which point it is not a secret.

**Raising the entropy of this script's token would therefore change nothing about
who gets in.** It is a stronger lock on a door with no latch, and chasing it is
how the real gap stays open for another cycle.

## What is actually exposed, precisely

The gate's own analysis is more careful than "the door is open", and the
distinction decides how urgent this is:

- **The read side is safe.** `openAccessSession()` returns an *empty* prefill, so
  a forged link discloses no applicant data and cannot be used to probe whether a
  given application or email exists.
- **The write side is not.** A forged session can still submit. The submission
  carries `accessTokenPresented` and `accessVerified: false`, so the record is
  honest about having been unverified — but nothing downstream currently acts on
  that flag.

So the exposure is **unauthenticated submission of Stage 2 responses**, not
disclosure of anyone's answers. That is a data-integrity problem (junk or
impersonated responses entering the qualification pipeline) rather than a breach.

## The correct system already exists, and is switched off

`supabase/functions/readiness-questionnaire/index.ts` — 616 lines, **not
deployed** — and `supabase/migrations/20260728120000_readiness_questionnaire.sql`
— **not applied**. It does exactly the right thing:

| | |
| --- | --- |
| `issue` | Admin-only (shared secret). Mints a token from `crypto.getRandomValues`, stores **only** its SHA-256, and returns the raw value **once**, to the caller that emails it. Never called by the browser. |
| `authorise` | Exchanges the token for a short-lived session (120 min) plus the verified prefill and existing draft. |
| `resume` | The expired-link fallback: application reference **plus** the work email it was filed under, exchanged for a fresh short-lived token. |
| `save` / `complete` | Autosave, then server-side revalidation of every active required answer before freezing the version. |

Three properties worth keeping: only hashes are stored, so database access cannot
be replayed as a link; **unknown, revoked and mismatched tokens all return the
same `invalid_token`**, so the endpoint is not an enumeration oracle; and the
score, priority class and tier recommendation are Stage 3 outputs that are never
computed here and never returned to the browser.

The migration creates six tables — `readiness_applications`,
`readiness_questionnaire_tokens`, `readiness_sessions`, `readiness_responses`,
`qualification_responses`, `readiness_events` — all with RLS enabled.

## What activation involves

1. **Apply the migration.** Six tables, RLS on each. Nothing else reads them, so
   this is additive and safe to do ahead of the rest.
2. **Deploy the function.** `verify_jwt = false` is already declared for it in
   `supabase/config.toml`, which is correct — it authenticates by token, not by a
   Supabase JWT.
3. **Set the admin shared secret** the `issue` action checks
   (`x-aurixa-admin-secret`).
4. **Re-point Stage 1 to call `issue`.** Today the Make scenario relies on
   Airtable having already written `Bypass URL`. It needs to call `issue`, take
   the raw token from that one response, and put it in the email.
5. **Switch the front end from shape-checking to `authorise`.**
   `readinessQuestionnaireService.ts` is already the typed client for it.
6. **Delete the Airtable token script.** Once `issue` mints the token, minting
   stops being Airtable's job, and leaving a second minter in place is how the
   two drift. `SCRIPT_NODES.md` in `npc-property-dashbord` carries the same
   instruction at the other end.

## Check before it goes live

**The two TTLs disagree.** The Airtable script sets the link to expire in **24
hours**; the service's `TOKEN_TTL_DAYS` is **21 days**. Neither is obviously
right, but the Stage 1 email's own wording is what has to be honoured — if it
promises a week, both are wrong. Settle that against the email copy before
deploying, because changing it afterwards invalidates links already sent.

Two smaller ones. `RESUME_TOKEN_TTL_MINUTES` is 30, which is the window an
applicant has after using the reference-plus-email fallback — short enough to
matter if the email is slow. And `issue` **revokes** any previous active token
for the application before inserting the new one, so re-sending an invitation
invalidates the earlier link; that is correct, and it needs to be what the email
says.

## Why this is not urgent, and not optional either

It is not urgent because the read side discloses nothing: no applicant's answers
can be read through a forged link.

It is not optional because the write side accepts unverified submissions into the
qualification pipeline, and because the current arrangement has two systems
minting one credential while only one of them is designed to. The Airtable script
is a stand-in for a service that is already written, already reviewed and already
configured — it just has never been switched on.
