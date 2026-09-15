# The Stage-2 questionnaire token is not a credential yet

**Status: open. Nothing here is built.** Written 2026-09-15 while finishing the
Airtable automation migration, because the work ran into it and the finding is
worth more than the task that found it.

## What is true today

`/questionnaire` is reached by a link carrying `?token=…&expires=…`. Anyone who
types a plausible one gets in.

[`src/lib/questionnaireLinkAccess.ts`](../src/lib/questionnaireLinkAccess.ts)
says so itself, in its own header:

> ⚠ **This is not an authorisation boundary, and cannot be made into one.**

It checks two things: that the token matches `/^[A-Za-z0-9_-]{16,256}$/`, and
that `expires` parses to a future date. There is no signature, no HMAC and no
network call. So this opens the form:

```
https://aurixasystems.com.au/questionnaire?token=aaaaaaaaaaaaaaaa&expires=2030-01-01
```

The file is right that it cannot do better. A secret able to verify the token
would have to ship to the browser, and then it is not a secret. The control has
to live somewhere a secret can.

**The read side is already safe.** `openAccessSession()` returns an empty
prefill, so a forged link discloses no applicant data and cannot be used to
probe whether an application exists. **The write side is not**: a forged session
can still submit. The submission carries `accessTokenPresented` and
`accessVerified: false` — the means to check, and an honest record that nothing
has.

## The token Airtable mints is a stand-in

The `Aurixa Lead Capture` automation in base `appFNPL7iYiuQyHAO` mints the token
with `Math.random()` and writes `Token` and `Bypass URL` onto the waitlist row.

A `crypto.getRandomValues` version was written and **refused by the runtime**,
measured 2026-09-15 by running it:

```
Error: crypto.getRandomValues is unavailable in this scripting runtime.
```

Airtable's automation script sandbox exposes no CSPRNG. The Scripting
*extension* runs in the browser and does; automation **actions** do not. There
is no way to mint a strong token from inside Airtable.

That was the right thing to stop chasing. A stronger token in front of a gate
that does not read it is a better lock on a door that is not latched. The
entropy is not what is broken.

## The correct system is already written, and switched off

[`supabase/functions/readiness-questionnaire/index.ts`](../supabase/functions/readiness-questionnaire/index.ts)
— 616 lines, **not deployed**. Its migration
`supabase/migrations/20260728120000_readiness_questionnaire.sql` is **not
applied**. Both facts are recorded in
[`readiness-questionnaire-stage-2.md`](./readiness-questionnaire-stage-2.md),
which marks them "(not deployed)" and "(not applied)" in its own file table.

What it already does:

| | |
| --- | --- |
| `issue` | mints from **32 bytes of CSPRNG**, not derived from any id; returns the raw token **exactly once**, to the caller that will email it |
| at rest | only the **SHA-256** of the questionnaire token and of the session token are stored |
| `authorise` | exchanges a questionnaire token for a short-lived session |
| failure mode | unknown, revoked and mismatched tokens all return the same `invalid_token`, so the endpoint never reveals whether an application exists |
| `resume` | a reference is exchanged for a fresh short-lived token, which then follows the ordinary `authorise` path |
| TTL | `TOKEN_TTL_DAYS = 21` |

This is the thing. It does not need designing, it needs switching on.

## What finishing it looks like

1. **Apply** `20260728120000_readiness_questionnaire.sql`.
2. **Deploy** `readiness-questionnaire`.
3. **Move minting to `issue`.** Stage 1 calls it and emails the raw token it
   gets back once. Airtable stops minting.
4. **Delete the Airtable token script.** The `Aurixa Lead Capture` automation's
   script node exists only to stand in for step 3; when `issue` is live the node
   is not a weaker version of the right thing, it is a second source of truth.
   `Token` and `Bypass URL` should stop being written by Airtable at all.
5. **Make `authorise` the gate.** `questionnaireLinkAccess.ts` keeps its local
   shape check as a cheap first pass, but the page must not treat a link as
   authorised until `authorise` has answered.
6. **Reject unissued submissions.** The Stage 2 Make scenario should refuse a
   submission whose `accessTokenPresented` it did not issue. That is the control
   the current file names as missing, and it closes the write side even before
   step 5 lands.

## Check before it goes live

**The TTL and the email must agree.** The service sets 21 days. The Airtable
stand-in sets **24 hours** (`hoursToLive = 24`). Whatever the Stage-1 invite
email tells an applicant is the number that matters — all three have to say the
same thing, and right now two of them do not.

**Existing tokens do not migrate.** Anything already in `Token` was minted by
`Math.random()` and was never hashed. Once `issue` is authoritative, those rows
are not credentials and should be reissued rather than imported — importing them
would seed the new table with values that are both weak and already in
plain text in Airtable and in people's inboxes.

**`X-Robots-Tag`.** `readiness-questionnaire-stage-2.md` already recommends
serving `X-Robots-Tag: noindex, nofollow` for `/questionnaire` from the hosting
layer rather than relying on a client-side `noindex` meta. Worth doing in the
same sitting.

## Why this was not just fixed

It crosses three systems — an Airtable automation, a Supabase migration and
function in this repo, and the Stage 1/2 Make scenarios — and it changes a live
funnel. The immediate task was finishing an automation migration. The Airtable
script was therefore left at **legacy parity**: `Math.random()`, unchanged
behaviour, carrying the exposure production already has rather than a new one,
with a comment saying what it is instead of calling itself "secure,
pseudo-random" as the source did.
