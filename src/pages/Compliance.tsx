import { MotionConfig, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedGovernanceSystem } from "../components/AnimatedGovernanceSystem";
import { HeroBackground } from "../components/HeroBackgrounds";
import { useRouteMetadata } from "../lib/pageMetadata";

const frameworkLayers = [
  ["01", "Infrastructure Protection", "Established infrastructure, encrypted data handling and controlled access supporting the secure operation of the Aurixa environment."],
  ["02", "Client Due Diligence", "Structured AML/CTF and customer due diligence workflows supporting client information collection, review and record management."],
  ["03", "Information Governance", "Clear privacy practices, controlled information handling and defined terms governing use of the Aurixa platform."],
  ["04", "Operational Responsibility", "Application controls, internal governance and clearly assigned responsibilities supporting accountable platform use."],
] as const;

const protectionLayers = [
  ["01", "Infrastructure Assurance", "Established Infrastructure Controls", "Aurixa operates within enterprise-grade infrastructure supported by independently assessed SOC 2 Type II controls and ISO 27001:2022 certification."],
  ["02", "Data Protection", "Protected at Rest and in Transit", "Customer data is protected using AES-256 encryption while stored and TLS encryption while being transmitted between authorised systems and users."],
  ["03", "Application Governance", "Controlled Within Aurixa", "Aurixa maintains responsibility for application configuration, access governance, user permissions and internal operational safeguards within the platform environment."],
] as const;

const diligenceStages = [
  ["01", "Collect", "Client Information", "Bring relevant client details, supporting documents and onboarding information into one structured operational environment."],
  ["02", "Assess", "Due Diligence Requirements", "Coordinate customer due diligence activities through defined steps, assigned responsibilities and documented review processes."],
  ["03", "Review", "Ongoing Oversight", "Maintain visibility over outstanding information, follow-up actions, scheduled reviews and unresolved requirements."],
  ["04", "Retain", "Operational Records", "Maintain a clearer record of documents, activities, decisions and actions associated with the client relationship."],
] as const;

const responsibilities = [
  ["Aurixa provides", ["Operational structure", "Workflow visibility", "Access controls", "Record management", "Platform governance"]],
  ["The organisation maintains", ["Regulatory responsibility", "Internal compliance programs", "Business-specific controls", "Policy decisions", "Appropriate platform use"]],
] as const;

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.7, ease: "easeOut" as const } };

function Eyebrow({ children }: { children: string }) {
  return <div className="compliance-eyebrow"><span aria-hidden="true" />{children}</div>;
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <motion.header {...reveal} className="compliance-section-header compliance-section-header--centered">
    <Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2><p>{description}</p>
  </motion.header>;
}

function Corners() { return <span className="compliance-corners" aria-hidden="true" />; }

function SectionTransition({ number }: { number: string }) {
  return <div className="compliance-transition" aria-hidden="true"><span>{number}</span><i /></div>;
}

function ComplianceFrameworkVisual() {
  return <motion.div {...reveal} className="framework-visual">
    <Corners /><div className="framework-rail" aria-hidden="true"><span className="compliance-traveller" /></div>
    <div className="framework-core" aria-hidden="true"><i />CONTROL PLANE</div>
    {frameworkLayers.map(([number, title, description], index) => <article key={number} className={`framework-layer framework-layer--${index + 1}`}>
      <div className="framework-layer__meta"><span>{number}</span><i aria-hidden="true" /></div>
      <h3>{title}</h3><p>{description}</p>
    </article>)}
  </motion.div>;
}

function SecurityArchitectureVisual() {
  return <motion.div {...reveal} className="protection-visual">
    <Corners /><div className="protection-field" aria-hidden="true"><span>CONTROLLED PATHWAY</span><i /></div>
    {protectionLayers.map(([number, label, title, description]) => <article key={number} className="protection-plane">
      <div className="protection-plane__index"><span>{number}</span><i aria-hidden="true" /></div>
      <div><small>{label}</small><h3>{title}</h3><p>{description}</p></div>
      <div className="protection-plane__nodes" aria-hidden="true"><i /><i /><i /></div>
    </article>)}
  </motion.div>;
}

function DueDiligenceFlow() {
  return <motion.div {...reveal} className="diligence-flow">
    <Corners />
    <div className="diligence-grid" aria-hidden="true" />
    <div className="diligence-rail" aria-hidden="true">
      <span className="diligence-rail__line" />
      <span className="diligence-signal"><i /></span>
    </div>
    <div className="diligence-stages">
      {diligenceStages.map(([number, title, subtitle, description], index) => <article key={number} className={`diligence-stage diligence-stage--${index + 1}`}>
        <div className="diligence-checkpoint" aria-hidden="true"><span>{number}</span><i /></div>
        <div className="diligence-stage__content">
          <small>{subtitle}</small><h3>{title}</h3><p>{description}</p>
          <div className="diligence-detail" aria-hidden="true">
            <span /><span /><span /><i />
          </div>
        </div>
      </article>)}
    </div>
  </motion.div>;
}

function LegalLink({ to, children }: { to: string; children: string }) {
  return <Link className="compliance-legal-link" to={to}>{children}<ArrowRight aria-hidden="true" /></Link>;
}

function InformationGovernanceVisual() {
  return <motion.div {...reveal} className="governance-visual">
    <Corners /><div className="governance-boundary" aria-hidden="true"><span>INFORMATION GOVERNANCE</span><i /><i /><i /></div>
    <article className="governance-instrument governance-instrument--privacy">
      <small>Privacy &amp; Information Handling</small><h3>Privacy, Explained Clearly.</h3>
      <p>Aurixa’s Privacy Policy explains how personal information may be collected, used, protected and disclosed. It also outlines user rights and the available processes for privacy enquiries, access requests and correction requests.</p>
      <LegalLink to="/privacy-policy">View Privacy Policy</LegalLink>
    </article>
    <article className="governance-instrument governance-instrument--terms">
      <small>Platform Terms &amp; Responsibilities</small><h3>Clear Terms for Platform Use.</h3>
      <p>Aurixa’s Terms and Conditions define the rules governing platform access, account responsibilities, permitted use, subscriptions, intellectual property, service availability and termination.</p>
      <LegalLink to="/terms-and-conditions">View Terms &amp; Conditions</LegalLink>
    </article>
  </motion.div>;
}

function SharedGovernanceVisual() {
  return <motion.div {...reveal} className="responsibility-visual">
    <Corners /><div className="responsibility-boundary" aria-hidden="true"><span>SHARED GOVERNANCE</span><i /></div>
    {responsibilities.map(([label, items], side) => <article key={label} className={`responsibility-side responsibility-side--${side + 1}`}>
      <header><i aria-hidden="true" /><h3>{label}</h3></header>
      <ul>{items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><Check aria-hidden="true" />{item}</li>)}</ul>
    </article>)}
  </motion.div>;
}

function ComplianceConvergenceCTA() {
  return <motion.div {...reveal} className="compliance-cta">
    <Corners /><div className="convergence" aria-hidden="true">{[1,2,3,4].map(n => <i key={n} />)}<span /></div>
    <div className="compliance-cta__content"><Eyebrow>Operational Confidence</Eyebrow>
      <h2>Bring Greater Structure to Compliance Operations.</h2>
      <p>Connect security, due diligence, information governance and operational responsibility within one structured Aurixa environment.</p>
      <Link to="/contact">Join Waitlist<ArrowRight aria-hidden="true" /></Link>
    </div>
  </motion.div>;
}

export default function Compliance() {
  useRouteMetadata("/compliance");
  return <MotionConfig reducedMotion="user"><main className="compliance-page">
    <section aria-labelledby="compliance-heading" className="compliance-hero">
      <HeroBackground variant="platform" /><div className="compliance-hero__wash" aria-hidden="true" />
      <div className="compliance-container compliance-hero__grid"><motion.div {...reveal} className="compliance-hero__copy">
        <Eyebrow>Compliance &amp; Governance</Eyebrow>
        <h1 id="compliance-heading"><span className="text-liquid-chrome">Compliance, Structured</span><em className="text-chrome-prismatic">Into Every Layer.</em></h1>
        <p>Aurixa brings security, due diligence and governance workflows into one connected operational environment, helping organisations maintain stronger oversight across client onboarding, information handling and platform use.</p>
      </motion.div><div className="compliance-hero__visual"><AnimatedGovernanceSystem /></div></div>
    </section>

    <div className="compliance-story-rail" aria-hidden="true" />
    <section className="compliance-section compliance-section--framework"><SectionTransition number="01" /><div className="compliance-container">
      <SectionHeader eyebrow="Connected Compliance" title="One Environment. Four Operational Layers." description="Aurixa brings infrastructure protection, client due diligence, information governance and operational responsibility into one connected framework. Each layer supports clearer oversight while remaining part of the same operational environment." />
      <ComplianceFrameworkVisual />
    </div></section>
    <section className="compliance-section compliance-section--security"><SectionTransition number="02" /><div className="compliance-container">
      <SectionHeader eyebrow="Security Architecture" title="Protection Across Every Layer." description="Aurixa combines independently assessed infrastructure, encrypted data handling and application-level controls to support secure and accountable platform delivery." />
      <SecurityArchitectureVisual />
    </div></section>
    <section className="compliance-section compliance-section--diligence"><SectionTransition number="03" /><div className="compliance-container">
      <SectionHeader eyebrow="AML/CTF & Customer Due Diligence" title="Due Diligence in Motion." description="Aurixa supports structured AML/CTF and customer due diligence workflows throughout the client lifecycle. Information, responsibilities, reviews and operational records remain connected within one controlled process." />
      <DueDiligenceFlow />
      <motion.div {...reveal} className="compliance-crosslink">
        <LegalLink to="/compliance-passport">Explore the AML/CTF Compliance Passport</LegalLink>
      </motion.div>
    </div></section>
    <section className="compliance-section compliance-section--governance"><SectionTransition number="04" /><div className="compliance-container">
      <SectionHeader eyebrow="Information Governance" title="Clear Policies. Defined Responsibilities." description="Privacy practices and platform terms provide a clear framework for how information is handled and how the Aurixa environment may be accessed and used." />
      <InformationGovernanceVisual />
    </div></section>
    <section className="compliance-section compliance-section--responsibility"><SectionTransition number="05" /><div className="compliance-container">
      <SectionHeader eyebrow="Shared Governance" title="Structured Systems. Clear Responsibility." description="Aurixa provides the operational structure needed to organise compliance-related workflows, controls and records. Each organisation remains responsible for understanding its obligations, maintaining its internal compliance program and determining how Aurixa should be applied within its business." />
      <SharedGovernanceVisual />
    </div></section>
    <section className="compliance-section compliance-section--final"><div className="compliance-container"><ComplianceConvergenceCTA /></div></section>
  </main></MotionConfig>;
}
