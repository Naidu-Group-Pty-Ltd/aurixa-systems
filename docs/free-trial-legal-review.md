# The free trial: what counsel needs to review

Since 28 October 2026 the website offers a **14-day free trial** in every call
to action, and `/contact` is the free trial application. The published Terms
were written before the trial was real: their "Trials, Demonstrations and Early
Access" section is generic and states none of what the trial actually does.

This is the brief for Aurixa's Australian legal adviser. It records how the
trial works today, where it is promised, what the Terms do not yet say, and the
decisions only counsel and the business can make. Nothing here is legal advice
or approved wording. `LEGAL_REVIEW_CHECKLIST.md` remains the publication gate.

---

## 1. How the trial works today

These are facts about the running system, not proposals. The source of each is
named so counsel can ask for it to be shown.

| Question | What happens | Where it is decided |
| --- | --- | --- |
| Who can get one | An organisation applies at `/contact`. The Aurixa team reviews every application before a workspace is provisioned. Nothing is automatic. | Website copy (`src/lib/cta.ts`), Mission Control provisioning |
| How long | **14 days by default.** An operator can set 1 to 365 days for a workspace, or apply a named *trial offer*. An offer is a code with its own length, shared as `aurixasystems.com.au/contact?trial=CODE`, and it can expire. An operator can also extend a live trial. | Mission Control: `clone_gate_default_hours` = 336 hours, `trial_offers`, Extend trial |
| When it starts | When the workspace is provisioned, which is the day it goes live. The website says: "Your 14-day trial starts the day your workspace goes live, and you can activate your plan at any time during it." | Mission Control `armGate` at provisioning |
| Payment details at sign-up | **None are collected.** The application form takes no card. | `/contact` form |
| What ends the trial | The customer activating a plan. That is a Stripe Checkout payment for a seat plan or setup package, at the plan's **current** price. A credit top-up does not count as activation. | Mission Control payment gate |
| What happens at the end without payment | **The workspace locks.** Its dashboard shows the payment screen. Endpoints that spend Aurixa's own vendor budget (AI inference, data, identity verification) refuse with a 402. Usage reporting stays open so incurred spend is accounted for. | `clonePaymentGate.pure.ts`, `assertGateOpen` |
| Automatic charge or conversion | **None.** Mission Control never creates a Stripe trial subscription, and a lapsed trial is never charged. Since 28 Oct a Stripe "trialing" subscription, a $0 invoice or a no-payment checkout is not treated as payment either, so a trial cannot be mistaken for a paid plan. | `docs/CLONE_PAYMENT_GATES.md` in Mission Control |
| Customer data at the end | **Nothing deletes it.** The lapse locks access only. No retention period or deletion schedule after a lapse is defined. | — (a decision for counsel and the business, below) |
| Refunds | A refund records a warning and never re-locks a workspace on its own. Locking is a deliberate operator act. | Mission Control payment gate |

## 2. Where the trial is promised

Counsel should review the trial terms against every place a customer reads
about them, because the Terms must not narrow what these say.

- **Website calls to action:** "Start your free trial" on every page (`src/lib/cta.ts` holds the wording in one place).
- **The trial application** (`/contact`): heading, pre-submit text, confirmation screen. The confirmation says the review is "within two business days of questionnaire completion".
- **Pricing FAQ:** "Is there a free trial? Yes. Every new workspace starts with a 14-day free trial… The trial runs for 14 days from the day your workspace goes live, and you can activate your plan at any time during it."
- **Marketing videos** on `/watch`: all three close on the 14-day free trial (for example "Experience it yourself with a 14-day free trial"). Two add "Fourteen days. Your business. Your experience. Your decision." The transcripts are published verbatim.
- **Search and AI summaries:** the `/contact` description and `llms.txt`.
- **Emails to applicants:** the Make scenarios and Mission Control's backstop emails (both moving from "priority access" to "free trial" wording).
- **Not yet updated:** the voice agents' knowledge base still says there is no free trial. That change is waiting on an upload to the voice platform.

Deliberately **not** claimed anywhere: "no credit card required", "cancel
anytime", "no obligation", or any statement about what happens to data after
a trial.

## 3. What the current Terms do not say

The current clause ("Trials, Demonstrations and Early Access") says trials are
for evaluation, may be restricted, changed or ended, and that limitations are
"communicated with the relevant offer". It does not state:

1. that a trial is free and how long it lasts by default;
2. when it starts (workspace provisioning, not application);
3. that it does not convert into a paid plan or charge anything on its own;
4. what happens at the end: the workspace locks until a plan is activated;
5. what happens to customer data after a lapse, and for how long;
6. that Aurixa reviews applications and may decline one;
7. that offer codes can set a different length and can expire, and that Aurixa may extend a trial;
8. whether one organisation may have more than one trial;
9. whether paid add-ons (for example usage credits) can be bought during a trial, and on what terms.

## 4. Decisions for counsel and the business

These need an answer before the trial clause can be approved.

**Commercial**

- **Data after a lapse:** how long a locked workspace and its data are kept, whether the customer is told before deletion, and whether an export is offered. Today nothing is deleted.
- **One trial per organisation?** Today nothing prevents a second application.
- **Declining an application:** whether the Terms should say Aurixa may decline, and whether reasons are given.
- **Add-ons during a trial:** whether credits or setup packages bought during a trial are refundable if the plan is not activated.
- **What "free" includes:** whether any part of the platform is excluded from the trial, or is usage-capped.

**Consumer and contract law** (questions for counsel, not conclusions)

- **"Free" representations under the Australian Consumer Law.** Does the trial wording, wherever it appears, accurately state the conditions: review before provisioning, and a plan to continue? Must any condition be shown more prominently beside the CTA?
- **Unfair contract terms.** The trial is offered on standard-form terms to businesses, many of them small. Do clauses letting Aurixa restrict, change or end a trial at its discretion need limiting, given the penalty regime for unfair terms in small business contracts?
- **Paid plans after the trial.** The paid plans renew. Are renewal and cancellation terms disclosed at activation in the way counsel requires? The Government has also consulted on banning unfair trading practices, including subscription traps. Ask counsel for the current position and whether it affects the move from trial to paid plan.
- **Formation.** When is an agreement formed for a trial workspace, and how is acceptance of the Terms recorded at provisioning?

**Privacy**

- **What the application collects:**
  - Stage 1: name, work email, mobile, organisation, role, transaction volume and improvement areas.
  - Stage 2: a business readiness questionnaire of about 40 answers.
  - Stage 3: a strategic review booking.

  Is all of this covered by the Privacy Policy's collection notice?
- **Overseas disclosure (APP 8).** The application data passes through:
  - Make (EU zone);
  - Airtable;
  - Microsoft 365 (email);
  - Mission Control's database;
  - Cal.com (bookings);
  - the voice platform (calls).

  Payment at activation adds Stripe. The Privacy Policy says processing countries "will be confirmed as part of the final legal and operational review". The trial makes that confirmation due.
- **Follow-up contact.** Applicants receive emails and may receive calls from voice agents. Confirm the consent basis under the Spam Act 2003 and the Do Not Call Register Act 2006, and any call-recording notice that applies.

## 5. A starting draft for counsel to edit

This draft states only what the system does today. Bracketed items are the
decisions in section 4.

> **Free trials.** Aurixa may offer an organisation a free trial of the
> platform after reviewing its application. Aurixa may decline an
> application. Unless the offer states a different period, a trial lasts 14
> days and starts on the day the organisation's workspace is first made
> available. No fees are charged for the trial, and the trial does not convert
> into a paid plan or result in any charge unless the organisation chooses to
> activate a plan. The organisation may activate a plan at any time during the
> trial. If no plan is activated by the end of the trial, access to the
> workspace is suspended until a plan is activated. [Customer data in a
> suspended workspace is retained for [period], after which it may be deleted
> after [notice].] Aurixa may extend a trial. An offer code may provide a
> different trial period and may expire. [Each organisation is eligible for one
> trial.] [Add-ons purchased during a trial are subject to [terms].]

---

**Owner:** Aurixa Systems. **Prepared:** 29 October 2026, from the live
configuration after the free trial shipped. Re-check section 1 against
Mission Control before relying on it; the trial's length and offers are
operator settings.
