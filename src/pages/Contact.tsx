import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ShieldAlert, CheckCircle2, Mail } from "lucide-react";
import { HeroBackground } from "../components/HeroBackgrounds";
import {
  Dropdown,
  Field,
  controlClass,
  describedBy,
  errorClass,
  helperClass,
  labelClass,
  pairedRowClass,
} from "../components/FormControls";
import { StageOneCompleteModal } from "../components/StageOneCompleteModal";
import { captureLead } from "../lib/leads";
import { grantReadinessHandoff } from "../lib/readinessHandoff";
import { getAttribution } from "../lib/attribution";
import {
  EMPTY_WAITLIST_FORM,
  IMPROVEMENT_AREA_OPTIONS,
  MAX_ADDITIONAL_NOTES,
  MAX_IMPROVEMENT_AREAS,
  MAX_TECH_STACK_BOTTLENECKS,
  ORGANISATION_TYPE_OPTIONS,
  READINESS_QUESTIONNAIRE_URL,
  ROLE_OPTIONS,
  VOLUME_OPTIONS,
  WAITLIST_COPY,
  WaitlistFieldError,
  WaitlistFormValues,
  buildWaitlistPayload,
  cleanEmailValue,
  cleanTextValue,
  generateApplicationId,
  maskEmail,
  normaliseMobileNumber,
  resolveIntakeBadge,
  validateWaitlistForm,
} from "../lib/waitlist";
import { useRouteMetadata } from "../lib/pageMetadata";

const MAKE_WAITLIST_WEBHOOK_URL = "https://hook.eu2.make.com/589rb23xwbgovfj3iuemtcuxm75cccut";

const FIELD_ORDER: WaitlistFieldError[] = [
  "firstName",
  "lastName",
  "workEmail",
  "mobileNumber",
  "organisationName",
  "role",
  "organisationType",
  "annualVolume",
  "currentTechStackBottlenecks",
  "improvementAreas",
  "additionalNotes",
  "privacyAcknowledged",
];

export default function Contact() {
  useRouteMetadata("/contact");
  const [values, setValues] = useState<WaitlistFormValues>(EMPTY_WAITLIST_FORM);
  const [errors, setErrors] = useState<Partial<Record<WaitlistFieldError, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  /** Shown only once Make.com has accepted AND a Stage 2 session exists. */
  const [showHandoff, setShowHandoff] = useState(false);
  const [receipt, setReceipt] = useState<{
    applicationId: string;
    firstName: string;
    organisationName: string;
    workEmail: string;
  } | null>(null);

  /**
   * Stable for the lifetime of an application attempt so retries after a
   * network failure — and an email correction from the confirmation screen —
   * reference the same application rather than creating duplicates.
   */
  const applicationIdRef = useRef(generateApplicationId());
  const intakeBadge = useMemo(() => resolveIntakeBadge(), []);
  const navigate = useNavigate();

  useEffect(() => {
    getAttribution("AURIXA Contact Waitlist Page", "/contact");
  }, []);

  const setValue = <K extends keyof WaitlistFormValues>(key: K, value: WaitlistFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleImprovementArea = (value: string) => {
    setValues((current) => {
      const selected = current.improvementAreas.includes(value)
        ? current.improvementAreas.filter((item) => item !== value)
        : current.improvementAreas.length >= MAX_IMPROVEMENT_AREAS
          ? current.improvementAreas
          : [...current.improvementAreas, value];
      return { ...current, improvementAreas: selected };
    });
    setErrors((current) => {
      if (!current.improvementAreas) return current;
      const next = { ...current };
      delete next.improvementAreas;
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Partial<Record<WaitlistFieldError, string>>) => {
    const firstField = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!firstField) return;
    const element = document.getElementById(firstField);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmissionError("");

    const fieldErrors = validateWaitlistForm(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const applicationId = applicationIdRef.current;
    const payload = buildWaitlistPayload(
      values,
      applicationId,
      getAttribution("AURIXA Contact Waitlist Page", "/contact"),
    );

    const receipt = {
      applicationId,
      firstName: cleanTextValue(values.firstName),
      organisationName: cleanTextValue(values.organisationName),
      workEmail: cleanEmailValue(values.workEmail),
    };

    try {
      const response = await fetch(MAKE_WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Idempotency key — repeated deliveries of the same application must
          // collapse to a single record downstream.
          "X-Application-Id": applicationId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Waitlist webhook submission failed");
      }

      // Primary capture (Make.com → Airtable) succeeded — persist the lead in
      // Aurixa Systems' own backend (store of record) and mirror it into
      // Mission Control so operators are notified in real time.
      // Fire-and-forget: never blocks or fails the visitor's submission.
      captureLead(payload);

      const handoffCreated = grantReadinessHandoff({
        applicationId,
        firstName: cleanTextValue(values.firstName),
        lastName: cleanTextValue(values.lastName),
        workEmail: cleanEmailValue(values.workEmail),
        organisationName: cleanTextValue(values.organisationName),
        role: values.role,
        organisationType: values.organisationType,
        annualVolume: values.annualVolume,
      });
      if (handoffCreated) setShowHandoff(true);
      else setReceipt(receipt);
    } catch (error) {
      console.error(error);
      setSubmissionError(
        "We could not submit your application just now. Please try again. Your answers have been kept.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Section 5.6 — the confirmation screen offers a correction path for the work
   * email. Answers are retained and the same application reference is reused,
   * so the corrected submission updates rather than duplicates the application.
   */
  const handleCorrectEmail = () => {
    setReceipt(null);
    window.requestAnimationFrame(() => {
      const element = document.getElementById("workEmail");
      element?.focus();
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  return (
    <div className="w-full relative pt-32 pb-20 min-h-dvh bg-[#040B16] overflow-hidden">
      {showHandoff && (
        <StageOneCompleteModal
          onProceed={() => navigate("/questionnaire")}
          applicationId={applicationIdRef.current}
        />
      )}
      <HeroBackground variant="contact" />

      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 relative z-10">

        {/* Left Side */}
        <div className="pt-10 flex flex-col justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-px bg-white/50" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/50">Restricted Action</span>
            </div>
            <h1 className="text-[clamp(2.4rem,12vw,3rem)] md:text-7xl lg:text-[4.5rem] font-display font-light mb-8 tracking-[-0.02em] leading-[1.05]">
              <span className="block text-white mb-2">The</span>
              <span className="italic text-chrome-prismatic drop-shadow-2xl">Waitlist.</span>
            </h1>

            <div className="space-y-6 text-gray-400 text-lg font-light leading-relaxed mb-12">
              <p>
                We strictly cap our active partner ecosystem to ensure our infrastructure provides an unassailable, asymmetrical advantage in the market. This restricted action protects infrastructure fidelity for active partners while preserving a controlled path for firms seeking enterprise operational intelligence.
              </p>
              <p>
                Application review cycle is now open. Firms will be selected via strict merit-based hierarchy regarding transaction volume, market stance, and alignment with Aurixa's strategic objectives. The application takes 60-90 seconds; we then send a short Business Readiness Questionnaire so our team can identify the most suitable platform configuration for your firm.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 border-l-[3px] border-[#C89B3C]/40 pl-6 py-2"
          >
            <div className="flex items-center gap-2 mb-4 text-white">
              <ShieldAlert className="w-5 h-5 " style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
              <h2 className="font-display font-semibold text-xl tracking-wide uppercase">Operational Freeze</h2>
            </div>
            <p className="text-gray-400 font-light text-sm leading-relaxed mb-4">
              "To maintain extreme architectural fidelity for our Tier-1 partners, we limit new integrations. We do not accept capital for queue priority. Allocation is earned by proving your firm has the systemic capability to dominate your sector once armed with our software. Submit your credentials meticulously. Each review cycle is calibrated around transaction volume, market stance, and alignment with Aurixa Systems' strategic objectives."
            </p>
            <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-mono">
              Founding Partner, Aurixa Systems
            </div>
          </motion.div>
        </div>

        {/* Right Side / Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative group p-[1px] self-start rounded-sm bg-gradient-to-br from-[#00A8B5]/20 via-[#C89B3C]/20 to-transparent"
        >
          <div className="absolute inset-0 bg-chrome-prismatic opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none" />
          <div className="bg-[#0B162C]/95 backdrop-blur-2xl p-6 sm:p-8 md:p-10 relative z-10 border border-t-white/10 border-l-white/10">
            {receipt ? (
              <ApplicationReceipt receipt={receipt} onCorrectEmail={handleCorrectEmail} />
            ) : (
              <>
                <div className="mb-7 pb-5 border-b border-white/10 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-sm">
                    <h2 className="text-2xl font-display font-light text-white mb-2">{WAITLIST_COPY.heading}</h2>
                    <p className="text-[#B6C0D4] text-[14px] font-light leading-relaxed">{WAITLIST_COPY.supporting}</p>
                    <p className="text-[#9CA3B8] text-[12px] font-light leading-relaxed mt-2">
                      {WAITLIST_COPY.timeEstimate} {WAITLIST_COPY.requiredNote}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-[#C89B3C]/10 border border-[#C89B3C]/30 text-[#C89B3C] text-[10px] uppercase tracking-widest font-mono rounded-sm text-right leading-tight">
                    {intakeBadge}
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleWaitlistSubmit} noValidate>
                  {/* Row 1 — paired */}
                  <div className={pairedRowClass}>
                    <Field id="firstName" label="Directive First Name" required error={errors.firstName} paired>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        maxLength={60}
                        value={values.firstName}
                        onChange={(event) => setValue("firstName", event.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(errors.firstName)}
                        aria-describedby={describedBy("firstName", false, Boolean(errors.firstName))}
                        className={controlClass(Boolean(errors.firstName))}
                      />
                    </Field>
                    <Field id="lastName" label="Directive Last Name" required error={errors.lastName} paired>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        maxLength={60}
                        value={values.lastName}
                        onChange={(event) => setValue("lastName", event.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(errors.lastName)}
                        aria-describedby={describedBy("lastName", false, Boolean(errors.lastName))}
                        className={controlClass(Boolean(errors.lastName))}
                      />
                    </Field>
                  </div>

                  {/* Row 2 — full width */}
                  <Field
                    id="workEmail"
                    label="Corporate Email"
                    required
                    helper={WAITLIST_COPY.helper.workEmail}
                    error={errors.workEmail}
                  >
                    <input
                      id="workEmail"
                      name="workEmail"
                      type="email"
                      autoComplete="email"
                      maxLength={320}
                      value={values.workEmail}
                      onChange={(event) => setValue("workEmail", event.target.value)}
                      onBlur={(event) => setValue("workEmail", cleanEmailValue(event.target.value))}
                      aria-required="true"
                      aria-invalid={Boolean(errors.workEmail)}
                      aria-describedby={describedBy("workEmail", true, Boolean(errors.workEmail))}
                      className={controlClass(Boolean(errors.workEmail))}
                    />
                  </Field>

                  {/* Row 3 — full width */}
                  <Field
                    id="mobileNumber"
                    label="Mobile Number"
                    required
                    helper={WAITLIST_COPY.helper.mobileNumber}
                    error={errors.mobileNumber}
                  >
                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="04XX XXX XXX"
                      value={values.mobileNumber}
                      onChange={(event) => setValue("mobileNumber", event.target.value)}
                      onBlur={(event) => {
                        const normalised = normaliseMobileNumber(event.target.value);
                        if (normalised) setValue("mobileNumber", normalised);
                      }}
                      aria-required="true"
                      aria-invalid={Boolean(errors.mobileNumber)}
                      aria-describedby={describedBy("mobileNumber", true, Boolean(errors.mobileNumber))}
                      className={controlClass(Boolean(errors.mobileNumber))}
                    />
                  </Field>

                  {/* Row 4 — paired */}
                  <div className={pairedRowClass}>
                    <Field
                      id="organisationName"
                      label="Entity Name"
                      required
                      error={errors.organisationName}
                      paired
                    >
                      <input
                        id="organisationName"
                        name="organisationName"
                        type="text"
                        autoComplete="organization"
                        maxLength={120}
                        value={values.organisationName}
                        onChange={(event) => setValue("organisationName", event.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(errors.organisationName)}
                        aria-describedby={describedBy("organisationName", false, Boolean(errors.organisationName))}
                        className={controlClass(Boolean(errors.organisationName))}
                      />
                    </Field>
                    <Dropdown
                      id="role"
                      name="role"
                      label="Your Role"
                      required
                      paired
                      placeholder="Select your role..."
                      options={ROLE_OPTIONS}
                      value={values.role}
                      error={errors.role}
                      onSelect={(value) => setValue("role", value)}
                    />
                  </div>

                  {/* Row 5 — paired */}
                  <div className={pairedRowClass}>
                    <Dropdown
                      id="organisationType"
                      name="organisationType"
                      label="Entity Classification"
                      required
                      paired
                      placeholder="Select segment..."
                      options={ORGANISATION_TYPE_OPTIONS}
                      value={values.organisationType}
                      error={errors.organisationType}
                      onSelect={(value) => setValue("organisationType", value)}
                    />
                    <Dropdown
                      id="annualVolume"
                      name="annualVolume"
                      label="Annual Origination / Transaction Volume"
                      required
                      paired
                      placeholder="Select volume bracket..."
                      options={VOLUME_OPTIONS}
                      value={values.annualVolume}
                      error={errors.annualVolume}
                      helper={WAITLIST_COPY.helper.volume}
                      onSelect={(value) => setValue("annualVolume", value)}
                    />
                  </div>

                  {/* Row 6 — full width */}
                  <Field
                    id="currentTechStackBottlenecks"
                    label="Current Tech Stack Bottlenecks"
                    required
                    error={errors.currentTechStackBottlenecks}
                  >
                    <textarea
                      id="currentTechStackBottlenecks"
                      name="currentTechStackBottlenecks"
                      rows={3}
                      maxLength={MAX_TECH_STACK_BOTTLENECKS}
                      placeholder={WAITLIST_COPY.placeholder.techStackBottlenecks}
                      value={values.currentTechStackBottlenecks}
                      onChange={(event) => setValue("currentTechStackBottlenecks", event.target.value)}
                      aria-required="true"
                      aria-invalid={Boolean(errors.currentTechStackBottlenecks)}
                      aria-describedby={describedBy(
                        "currentTechStackBottlenecks",
                        false,
                        Boolean(errors.currentTechStackBottlenecks),
                      )}
                      className={controlClass(Boolean(errors.currentTechStackBottlenecks))}
                    />
                    <p className="text-[11px] text-[#9CA3B8] font-mono text-right mt-1">
                      {values.currentTechStackBottlenecks.length}/{MAX_TECH_STACK_BOTTLENECKS}
                    </p>
                  </Field>

                  {/* Row 7 — full width */}
                  <fieldset
                    className="space-y-2"
                    aria-required="true"
                    aria-invalid={Boolean(errors.improvementAreas)}
                    aria-describedby={describedBy("improvementAreas", true, Boolean(errors.improvementAreas))}
                  >
                    <legend className={labelClass}>
                      What Would You Most Like Aurixa to Improve?
                      <span className="text-[#C89B3C] ml-1" aria-hidden="true">*</span>
                    </legend>
                    <p id="improvementAreas-helper" className={helperClass}>
                      {WAITLIST_COPY.helper.improvementAreas} ({values.improvementAreas.length}/
                      {MAX_IMPROVEMENT_AREAS} selected)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {IMPROVEMENT_AREA_OPTIONS.map((option, index) => {
                        const checked = values.improvementAreas.includes(option.value);
                        const atLimit =
                          !checked && values.improvementAreas.length >= MAX_IMPROVEMENT_AREAS;
                        return (
                          <label
                            key={option.value}
                            htmlFor={index === 0 ? "improvementAreas" : `improvementAreas-${option.value}`}
                            className={`flex h-full items-start gap-2.5 px-3 py-2.5 border text-[13px] font-light leading-snug transition-all focus-within:ring-1 focus-within:ring-[#00A8B5] ${
                              checked
                                ? "border-[#00A8B5]/60 bg-[#00A8B5]/10 text-white cursor-pointer"
                                : atLimit
                                  ? "border-white/10 text-[#6B7689] cursor-not-allowed"
                                  : "border-white/15 text-[#B6C0D4] hover:border-white/35 cursor-pointer"
                            }`}
                          >
                            <input
                              id={index === 0 ? "improvementAreas" : `improvementAreas-${option.value}`}
                              type="checkbox"
                              name="improvementAreas"
                              value={option.value}
                              checked={checked}
                              disabled={atLimit}
                              onChange={() => toggleImprovementArea(option.value)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A8B5]"
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.improvementAreas && (
                      <p id="improvementAreas-error" className={errorClass} role="alert">
                        {errors.improvementAreas}
                      </p>
                    )}
                  </fieldset>

                  {/* Row 8 — full width */}
                  <Field
                    id="additionalNotes"
                    label="Anything Else We Should Know? (Optional)"
                    helper={WAITLIST_COPY.helper.additionalNotes}
                    error={errors.additionalNotes}
                  >
                    <textarea
                      id="additionalNotes"
                      name="additionalNotes"
                      rows={3}
                      maxLength={MAX_ADDITIONAL_NOTES}
                      value={values.additionalNotes}
                      onChange={(event) => setValue("additionalNotes", event.target.value)}
                      aria-invalid={Boolean(errors.additionalNotes)}
                      aria-describedby={describedBy("additionalNotes", true, Boolean(errors.additionalNotes))}
                      className={controlClass(Boolean(errors.additionalNotes))}
                    />
                    <p className="text-[11px] text-[#9CA3B8] font-mono text-right mt-1">
                      {values.additionalNotes.length}/{MAX_ADDITIONAL_NOTES}
                    </p>
                  </Field>

                  {/* Row 9 — collection notice and consent */}
                  {/* The vertical padding sits on the summary rather than the
                      details, so the whole strip toggles the disclosure. On the
                      details it was decoration around an 18px-tall tap target. */}
                  <details className="border border-white/10 bg-[#040B16]/60 px-4">
                    <summary className="cursor-pointer py-3 min-h-[44px] text-[11px] uppercase tracking-[0.12em] text-[#C3CCDD] font-bold list-none flex items-center gap-2">
                      <span className="text-[#C89B3C]" aria-hidden="true">+</span> Collection notice
                    </summary>
                    <div className="pb-3 space-y-2 text-[13px] text-[#9CA3B8] font-light leading-relaxed">
                      <p>
                        Aurixa Systems Pty Ltd collects the information in this form to assess your
                        priority-access application, to send you the Business Readiness Questionnaire and to
                        contact you about the outcome. Providing the information is voluntary, but we cannot
                        assess an application without it.
                      </p>
                      <p>
                        We may disclose the information to our service providers for hosting, email delivery,
                        customer relationship management and scheduling. We handle it in accordance with the
                        Australian Privacy Principles.
                      </p>
                      <p>
                        To access or correct your information, withdraw your application or make a privacy
                        complaint, contact{" "}
                        <Link className="text-[#C89B3C] underline underline-offset-2" to="/contact">Aurixa</Link>
                        .
                      </p>
                      <p>{WAITLIST_COPY.confidentiality}</p>
                    </div>
                  </details>

                  <div className="space-y-2">
                    <label
                      htmlFor="privacyAcknowledged"
                      className="flex w-full items-start gap-3 text-[13px] text-[#B6C0D4] font-light leading-relaxed cursor-pointer"
                    >
                      <input
                        id="privacyAcknowledged"
                        name="privacyAcknowledged"
                        type="checkbox"
                        checked={values.privacyAcknowledged}
                        onChange={(event) => setValue("privacyAcknowledged", event.target.checked)}
                        aria-required="true"
                        aria-invalid={Boolean(errors.privacyAcknowledged)}
                        aria-describedby={describedBy("privacyAcknowledged", false, Boolean(errors.privacyAcknowledged))}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A8B5]"
                      />
                      <span>
                        {WAITLIST_COPY.privacyAcknowledgement}
                        <span className="text-[#C89B3C] ml-1" aria-hidden="true">*</span>
                        {" "}<Link to="/privacy-policy" className="text-[#C89B3C] underline underline-offset-2">Read the Privacy Policy</Link>
                      </span>
                    </label>
                    {errors.privacyAcknowledged && (
                      <p id="privacyAcknowledged-error" className={errorClass} role="alert">
                        {errors.privacyAcknowledged}
                      </p>
                    )}
                  </div>

                  <label
                    htmlFor="marketingConsent"
                    className="flex w-full items-start gap-3 text-[13px] text-[#B6C0D4] font-light leading-relaxed cursor-pointer"
                  >
                    <input
                      id="marketingConsent"
                      name="marketingConsent"
                      type="checkbox"
                      checked={values.marketingConsent}
                      onChange={(event) => setValue("marketingConsent", event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A8B5]"
                    />
                    <span>{WAITLIST_COPY.marketingConsent}</span>
                  </label>

                  {/* Row 10 — pre-submit explanation */}
                  <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed border-l-2 border-[#00A8B5]/40 pl-4">
                    {WAITLIST_COPY.preSubmit}
                  </p>

                  {submissionError && (
                    <p className={errorClass} role="alert">
                      {submissionError}
                    </p>
                  )}

                  {/* Row 11 — submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full group relative flex items-center justify-center gap-3 px-5 py-4 min-h-[56px] text-[12px] font-black tracking-[0.18em] uppercase text-white btn-chrome-prismatic transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_0_20px_rgba(200,155,60,0.18)] hover:shadow-[0_0_32px_rgba(0,168,181,0.3)] border-none rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C]"
                    >
                      <span className="relative z-10 text-center text-white drop-shadow-md">
                        {isSubmitting ? WAITLIST_COPY.submittingButton : WAITLIST_COPY.submitButton}
                      </span>
                      <ArrowRight className="w-5 h-5 shrink-0 relative z-10 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-md" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}/>
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500 ease-out z-0"></div>
                    </button>
                  </div>

                  {/* Row 12 — status footer */}
                  <div className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-[#9CA3B8] uppercase tracking-widest font-mono flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" aria-hidden="true"></span>
                      {WAITLIST_COPY.queueStatus}
                    </p>
                    <p className="text-[10px] text-[#C89B3C] uppercase tracking-widest font-mono">
                      {WAITLIST_COPY.reviewStatus}
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Section 5.6 / Appendix A.3 — confirmation screen. */
function ApplicationReceipt({
  receipt,
  onCorrectEmail,
}: {
  receipt: { applicationId: string; firstName: string; organisationName: string; workEmail: string };
  onCorrectEmail: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="w-6 h-6 mt-1 shrink-0"
          style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
          aria-hidden="true"
        />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl font-display font-light text-white outline-none leading-snug"
        >
          Your Aurixa application has been received
        </h2>
      </div>

      <p className="text-[14px] text-[#B6C0D4] font-light leading-relaxed">
        Thank you, {receipt.firstName}. Your priority access application for{" "}
        <span className="text-white">{receipt.organisationName}</span> has been successfully received.
      </p>

      <dl className="border border-white/10 divide-y divide-white/10">
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-[#9CA3B8] font-bold">
            Application reference
          </dt>
          <dd className="text-[#C89B3C] font-mono text-[14px] break-all">{receipt.applicationId}</dd>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-[#9CA3B8] font-bold">Sent to</dt>
          <dd className="text-white font-light text-[14px] break-all">{maskEmail(receipt.workEmail)}</dd>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-[#9CA3B8] font-bold">
            Review timeframe
          </dt>
          <dd className="text-white font-light text-[14px] sm:text-right">
            Within two business days of questionnaire completion
          </dd>
        </div>
      </dl>

      <p className="text-[14px] text-[#B6C0D4] font-light leading-relaxed">
        The next step is to complete our Business Readiness Questionnaire. It takes approximately 6-8 minutes
        and allows our team to understand your workflows, technology environment and preferred Aurixa modules.
      </p>

      {READINESS_QUESTIONNAIRE_URL ? (
        <a
          href={READINESS_QUESTIONNAIRE_URL}
          className="w-full group relative flex items-center justify-center gap-3 px-5 py-4 min-h-[56px] text-[12px] font-black tracking-[0.18em] uppercase text-white btn-chrome-prismatic transition-all rounded-sm overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B162C]"
        >
          <span className="relative z-10 text-center drop-shadow-md">
            Complete Business Readiness Questionnaire
          </span>
          <ArrowRight className="w-5 h-5 shrink-0 relative z-10 group-hover:translate-x-1 transition-transform" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }} />
        </a>
      ) : (
        <div className="flex items-start gap-3 border border-[#00A8B5]/30 bg-[#00A8B5]/5 px-4 py-4">
          <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }} aria-hidden="true" />
          <p className="text-[13px] text-[#B6C0D4] font-light leading-relaxed">
            We will email your secure questionnaire link to the address above shortly. Quote your application
            reference in any correspondence.
          </p>
        </div>
      )}

      <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed">
        Once the questionnaire is completed, our team will assess your application and advise whether the
        appropriate next step is a platform discovery session, guided demonstration or enterprise requirements
        consultation.
      </p>

      <button
        type="button"
        onClick={onCorrectEmail}
        className="inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.14em] text-[#C89B3C] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] rounded-sm"
      >
        Not the right email address? Correct it
      </button>
    </div>
  );
}
