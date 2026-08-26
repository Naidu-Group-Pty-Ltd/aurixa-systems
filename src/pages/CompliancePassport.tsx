import { MotionConfig, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroBackground } from "../components/HeroBackgrounds";
import { PassportCover } from "../components/PassportCover";
import { useRouteMetadata } from "../lib/pageMetadata";

/**
 * The AML/CTF Compliance Passport — the marketing page for the cross-portal
 * compliance journey: Client Portal → Command Centre → professional portals,
 * with the Passport as the verified record that travels between them.
 *
 * Wording note: everything a partner receives is conditional in the product
 * (consent, an authorised sharing arrangement, controlled access), so the copy
 * here says "can", "authorised" and "recorded sharing arrangement" on purpose.
 * Do not strengthen those into unconditional claims.
 */

const journeySteps = [
  ["01", "Identity Verification", "The client confirms who they are through a clear, guided verification step, with no jargon and no guesswork."],
  ["02", "Documents & Evidence", "Required documents are requested, provided and kept together in one place, against the one journey."],
  ["03", "Screening", "Screening is carried out and its outcome is recorded as part of the client's journey, visible to the people who need it."],
  ["04", "Ownership", "Ownership and control are captured so the full picture sits behind the matter, not across systems."],
  ["05", "Source of Funds", "Funding information is gathered and reviewed within the same journey rather than a separate chase."],
  ["06", "Review & Approval", "The matter is reviewed, the decision is recorded, and the client can progress with confidence."],
] as const;

const surfaces = [
  ["Client Portal", "For your clients", "Clients are guided through a purpose-built portal where they complete their requirements step by step, seeing where they are, what has been completed and what requires their attention.", null],
  ["Aurixa Command Centre", "For your team", "Your team works from the Aurixa Command Centre, with visibility across the entire journey, from initial onboarding through to review, approval and progression.", null],
  ["Professional Portals", "For connected professionals", "As the transaction moves forward, authorised professionals can be connected through their own dedicated portal experience, with roles, permissions and information access controlled.", ["Finance", "Solicitors", "Conveyancers", "Builders", "Developers"]],
] as const;

const milestones = [
  "Client Consent Recorded",
  "Identity Verified",
  "Documents Verified",
  "Screening Completed",
  "Ownership Verified",
  "Source of Funds Reviewed",
  "Passport Issued",
] as const;

const beforeChain = ["Forms", "Emails", "Follow-ups", "Documents", "More Emails", "Repetition"] as const;
const afterChain = ["Invite", "Verify", "Review", "Approve", "Passport", "Connect", "Progress"] as const;

const roles = [
  ["The Client", "Knows what they need to do, what has been completed and what requires their attention, without being overwhelmed by compliance terminology."],
  ["Your Team", "Knows where the matter stands, who needs to act next and whether the client can progress."],
  ["The Reviewer", "Knows exactly what requires attention and what is ready to be reviewed."],
  ["The MLRO", "Can see what requires a decision, with the recorded journey behind it."],
  ["Authorised Professionals", "Receive the information appropriate to their role and the recorded sharing arrangement, and nothing more."],
] as const;

const propertyJourney = [
  "Client Onboarding",
  "Identity Verification",
  "Documents & Evidence",
  "Screening & Ownership",
  "Funding & Source of Funds",
  "Review & Decision",
  "Aurixa Compliance Passport",
  "Professional Collaboration",
  "Transaction Completion",
  "Ongoing Review",
] as const;

const clientView = [
  "Where they are in the journey",
  "What has been completed",
  "What requires their attention",
  "Clear instructions and next steps",
  "Progress without compliance jargon",
] as const;

const businessView = [
  "Has identity verification been completed?",
  "Have the required documents been provided?",
  "Has screening been completed?",
  "Has source of funds been reviewed?",
  "Who needs to act next, and can the client progress?",
  "Has the Passport been issued, and to whom?",
] as const;

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.7, ease: "easeOut" as const } };

function Eyebrow({ children }: { children: string }) {
  return <div className="compliance-eyebrow"><span aria-hidden="true" />{children}</div>;
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <motion.header {...reveal} className="compliance-section-header compliance-section-header--centered">
    <Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{description && <p>{description}</p>}
  </motion.header>;
}

function Corners() { return <span className="compliance-corners" aria-hidden="true" />; }

function SectionTransition({ number }: { number: string }) {
  return <div className="compliance-transition" aria-hidden="true"><span>{number}</span><i /></div>;
}

/**
 * The hero artefact: the passport itself, with the two attestations that make
 * it a record rather than a status screen.
 *
 * The plates carry the site's teal rather than the Command Centre's green —
 * the cover is the artefact and is reproduced exactly, but everything around
 * it belongs to this page's palette. The fingerprint is an illustrative
 * sample, which is why the whole block is labelled as an illustration.
 */
function PassportArtefact() {
  return <div className="passport-artefact">
    <PassportCover />
    <div className="passport-attest">
      <div className="passport-attest__row passport-attest__row--issued">
        <Check aria-hidden="true" />
        <div><strong>Issued · Current</strong><span>Every verified milestone in one sealed record</span></div>
      </div>
      <div className="passport-attest__row passport-attest__row--sealed">
        <i aria-hidden="true" />
        <div><strong>Digitally verified by Aurixa Systems</strong><span className="passport-attest__hash">8F3C · B41D · 9AE0 · 72CF · SHA-256</span></div>
      </div>
    </div>
  </div>;
}

function GuidedJourney() {
  return <motion.div {...reveal} className="passport-frame">
    <Corners />
    <div className="passport-steps">
      {journeySteps.map(([number, title, description]) => <article key={number} className="passport-step">
        <header><span>{number}</span><i aria-hidden="true" /></header>
        <h3>{title}</h3><p>{description}</p>
      </article>)}
    </div>
    <div className="passport-noes">
      <span>No confusing handovers</span>
      <span>No unnecessary chasing</span>
      <span>No wondering where the client is up to</span>
    </div>
  </motion.div>;
}

function ConnectedSurfaces() {
  return <motion.div {...reveal}>
    <div className="passport-surfaces">
      {surfaces.map(([title, audience, description, chips], index) => <article key={title} className={`passport-surface${index === 1 ? " passport-surface--core" : ""}`}>
        <small>{audience}</small><h3>{title}</h3><p>{description}</p>
        {chips && <ul>{chips.map((chip) => <li key={chip}>{chip}</li>)}</ul>}
      </article>)}
    </div>
    <div className="passport-tagline">
      <span>Different professionals</span><i aria-hidden="true" /><span>Different responsibilities</span><i aria-hidden="true" /><span>One connected journey</span>
    </div>
  </motion.div>;
}

function PassportLedger() {
  return <motion.div {...reveal} className="passport-ledger">
    <Corners />
    <div>
      <ul className="passport-ledger__stamps">
        {milestones.map((milestone, index) => <li key={milestone}>
          <span>{String(index + 1).padStart(2, "0")}</span>{milestone}<i aria-hidden="true" />
        </li>)}
      </ul>
    </div>
    <div className="passport-ledger__copy">
      <h3>A record that evolves with the client.</h3>
      <p>As verified stages are completed, the Passport can reflect each milestone. It can be updated. It can be refreshed. It can record new verified milestones, and previous versions can be superseded while access remains controlled.</p>
      <p>Where appropriately authorised and configured, relevant Passport information and evidence can support the next professional involved in the property transaction. The client moves forward without feeling like they are starting again.</p>
    </div>
  </motion.div>;
}

function JourneyContrast() {
  return <motion.div {...reveal} className="passport-contrast">
    <article className="passport-chain passport-chain--before">
      <small>Instead of</small>
      <ol>{beforeChain.map((step) => <li key={step}><span>{step}</span></li>)}</ol>
    </article>
    <article className="passport-chain passport-chain--after">
      <Corners />
      <small>Aurixa creates</small>
      <ol>{afterChain.map((step) => <li key={step} className={step === "Passport" ? "is-passport" : ""}><span>{step}</span></li>)}</ol>
    </article>
    <p className="passport-contrast__note">A journey the client can actually follow. A journey your team can actually control. A journey designed to keep the property transaction moving.</p>
  </motion.div>;
}

function RoleClarity() {
  return <motion.div {...reveal} className="passport-roles">
    <Corners />
    {roles.map(([role, description]) => <article key={role} className="passport-role">
      <h3><i aria-hidden="true" />{role}</h3><p>{description}</p>
    </article>)}
  </motion.div>;
}

function PropertyJourneyRail() {
  return <motion.div {...reveal} className="passport-route">
    {propertyJourney.map((stop, index) => <div key={stop} className={`passport-stop${stop === "Aurixa Compliance Passport" ? " passport-stop--passport" : ""}`}>
      <h3><span>{String(index + 1).padStart(2, "0")}</span>{stop}</h3>
    </div>)}
  </motion.div>;
}

function ExperienceAndControl() {
  return <motion.div {...reveal}>
    <div className="responsibility-visual">
      <Corners /><div className="responsibility-boundary" aria-hidden="true"><span>ONE JOURNEY</span><i /></div>
      <article className="responsibility-side responsibility-side--1">
        <header><i aria-hidden="true" /><h3>Your clients can see</h3></header>
        <ul>{clientView.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><Check aria-hidden="true" />{item}</li>)}</ul>
      </article>
      <article className="responsibility-side responsibility-side--2">
        <header><i aria-hidden="true" /><h3>Your team can answer</h3></header>
        <ul>{businessView.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><Check aria-hidden="true" />{item}</li>)}</ul>
      </article>
    </div>
    <div className="passport-tagline">
      <span>Less administration</span><i aria-hidden="true" /><span>More visibility</span><i aria-hidden="true" /><span>Faster progression</span>
    </div>
  </motion.div>;
}

function PassportCTA() {
  return <motion.div {...reveal} className="compliance-cta">
    <Corners /><div className="convergence" aria-hidden="true">{[1, 2, 3, 4].map(n => <i key={n} />)}<span /></div>
    <div className="compliance-cta__content"><Eyebrow>Make AML/CTF Feel Effortless</Eyebrow>
      <h2>Compliance Made Clearer. The Journey Kept Moving.</h2>
      <p>The regulatory responsibility remains important. The experience does not need to feel difficult. Guide your clients, control the journey, connect your professionals, and bring the verified journey together through the Aurixa Compliance Passport.</p>
      <div className="passport-actions">
        <Link className="passport-btn" to="/contact">Book Your Free Demo<ArrowRight aria-hidden="true" /></Link>
        <a className="passport-btn passport-btn--ghost" href="#passport">Explore the Compliance Passport<ArrowRight aria-hidden="true" /></a>
      </div>
    </div>
  </motion.div>;
}

export default function CompliancePassport() {
  useRouteMetadata("/compliance-passport");
  return <MotionConfig reducedMotion="user"><main className="compliance-page">
    <section aria-labelledby="passport-heading" className="compliance-hero">
      <HeroBackground variant="platform" /><div className="compliance-hero__wash" aria-hidden="true" />
      <div className="compliance-container compliance-hero__grid"><motion.div {...reveal} className="compliance-hero__copy">
        <Eyebrow>The AML/CTF Compliance Passport</Eyebrow>
        <h1 id="passport-heading"><span className="text-liquid-chrome">The Trust Layer</span><em className="text-chrome-prismatic">For the Modern Property Transaction.</em></h1>
        <p>One client. One clear journey. Every professional connected. Aurixa brings the entire compliance journey into one clear, guided experience, helping property professionals move clients from onboarding through to transaction completion with confidence, visibility and far less friction.</p>
        <div className="passport-actions passport-actions--hero">
          <Link className="passport-btn" to="/contact">Book Your Free Demo<ArrowRight aria-hidden="true" /></Link>
          <a className="passport-btn passport-btn--ghost" href="#passport">Explore the Compliance Passport<ArrowRight aria-hidden="true" /></a>
        </div>
      </motion.div><motion.div {...reveal} className="compliance-hero__visual passport-hero-visual"><PassportArtefact /></motion.div></div>
    </section>

    <div className="compliance-story-rail" aria-hidden="true" />
    <section className="compliance-section compliance-section--framework"><SectionTransition number="01" /><div className="compliance-container">
      <SectionHeader eyebrow="One Clear Journey" title="Compliance Does Not Need to Feel Complicated." description="From the moment a client is invited, Aurixa guides them through each required step in a logical, easy-to-follow journey, with each stage clearly showing what has been completed, what needs attention and what happens next." />
      <GuidedJourney />
    </div></section>

    <section className="compliance-section compliance-section--security"><SectionTransition number="02" /><div className="compliance-container">
      <SectionHeader eyebrow="Compliance That Moves With Your Client" title="Three Connected Experiences. One Journey." description="The experience is designed around one simple principle: make compliance easy to understand, easy to complete and easy to manage." />
      <ConnectedSurfaces />
    </div></section>

    <section id="passport" className="compliance-section compliance-section--diligence passport-anchor"><SectionTransition number="03" /><div className="compliance-container">
      <SectionHeader eyebrow="Introducing the Compliance Passport" title="Your Client's Verified Journey. In One Place." description="At the centre of the experience is the Aurixa Systems AML/CTF Compliance Passport, which transforms completed compliance activity into a clear, evolving record of the client's journey, instead of letting it disappear into folders, emails and disconnected systems." />
      <PassportLedger />
    </div></section>

    <section className="compliance-section compliance-section--governance"><SectionTransition number="04" /><div className="compliance-container">
      <SectionHeader eyebrow="From Obligation to Guided Experience" title="Aurixa Changes the Way the Journey Feels." />
      <JourneyContrast />
    </div></section>

    <section className="compliance-section compliance-section--framework"><SectionTransition number="05" /><div className="compliance-container">
      <SectionHeader eyebrow="Clarity at Every Step" title="Every Step Has a Purpose. Every User Knows What Comes Next." description="No more guessing what happens next. Aurixa helps turn every stage into a clear next action for the person who owns it." />
      <RoleClarity />
    </div></section>

    <section className="compliance-section compliance-section--diligence"><SectionTransition number="06" /><div className="compliance-container">
      <SectionHeader eyebrow="Built Around the Property Journey" title="Compliance That Moves With the Transaction." description="The AML/CTF process should not sit beside the property transaction. It should move with it. One continuous journey from the first client interaction through to the completion of the transaction." />
      <PropertyJourneyRail />
    </div></section>

    <section className="compliance-section compliance-section--responsibility"><SectionTransition number="07" /><div className="compliance-container">
      <SectionHeader eyebrow="Experience & Control" title="A Better Experience for Clients. Greater Control for Your Business." description="Your clients should never have to ask what they need to do now, and your team should never have to piece the answers together across multiple systems." />
      <ExperienceAndControl />
    </div></section>

    <section className="compliance-section compliance-section--final"><div className="compliance-container"><PassportCTA /></div></section>
  </main></MotionConfig>;
}
