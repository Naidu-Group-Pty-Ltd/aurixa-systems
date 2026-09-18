/**
 * The Builders Network access application.
 *
 * Every other action on `/builders` leaves this site for the network's own
 * domain, because accounts live there. This one cannot: the whole point is
 * that the applicant has no account yet, so the form is here and Mission
 * Control's public endpoint does the privileged part server-side.
 *
 * Three things about the shape of this page are deliberate.
 *
 *  * **It waits.** The waitlist form next door fires its webhook and mirrors
 *    everything else fire-and-forget, because the mirror is not the act. Here
 *    the post IS the act — it creates the organisation and sends the
 *    invitation — so the applicant is shown what actually happened, including
 *    the case where their organisation exists and the email did not go.
 *
 *  * **A refusal lands on its own field.** `readApplicationRefusal` carries
 *    the field for every refusal that names one, and this focuses it. A
 *    sentence above thirteen boxes that leaves a reader to work out which one
 *    is withholding an answer the page already has.
 *
 *  * **The decoy field is hidden from assistive technology as well as from
 *    sight.** `aria-hidden`, `tabIndex={-1}` and `autoComplete="off"` — a
 *    screen reader user filling in a trap is the one failure this control
 *    must not have, and `display: none` alone does not guarantee it.
 */
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, MailCheck, ShieldAlert, TriangleAlert } from "lucide-react";
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
import {
  AU_STATE_OPTIONS,
  BUILDER_APPLICATION_COPY,
  BUILDER_FIELD_ORDER,
  BUILDER_ORG_TYPE_OPTIONS,
  BuilderApplicationField,
  BuilderApplicationValues,
  EMPTY_BUILDER_APPLICATION,
  MAX_MESSAGE,
  buildBuilderApplicationPayload,
  cleanEmailValue,
  cleanTextValue,
  readApplicationRefusal,
  validateBuilderApplication,
} from "../lib/builderApplication";
import { submitBuilderApplication, TURNSTILE_SITE_KEY } from "../lib/builderApply";
import { useRouteMetadata } from "../lib/pageMetadata";

type Accepted = {
  outcome: "provisioned" | "attached";
  organisationLegalName: string;
  emailSent: boolean;
  contactEmail: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Load the Turnstile script and render a widget, only where a key exists.
 *
 * No key means no widget, no script tag and no third-party request — the
 * control is off, and a page that fetches Cloudflare in order to discover
 * that is paying for a control it does not have.
 */
function useTurnstile(enabled: boolean) {
  const holder = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!enabled || !holder.current) return;
    const el = holder.current;

    const render = () => {
      if (!window.turnstile || el.childElementCount > 0) return;
      window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: (value: string) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    };

    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [enabled]);

  return { holder, token };
}

export default function BuilderApply() {
  useRouteMetadata("/builders/apply");

  const [values, setValues] = useState<BuilderApplicationValues>(EMPTY_BUILDER_APPLICATION);
  const [errors, setErrors] = useState<Partial<Record<BuilderApplicationField, string>>>({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState<Accepted | null>(null);
  const [decoy, setDecoy] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // When this page was drawn. The endpoint refuses a submission faster than a
  // person could type one — a cost raiser, not a boundary, and forgeable by
  // anybody who reads this file.
  const renderedAt = useMemo(() => new Date().toISOString(), []);
  const captcha = useTurnstile(TURNSTILE_SITE_KEY.length > 0);

  const set =
    <K extends BuilderApplicationField>(key: K) =>
    (value: BuilderApplicationValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }));

  const focusField = (field: BuilderApplicationField) => {
    const element = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const focusFirstError = (fieldErrors: Partial<Record<BuilderApplicationField, string>>) => {
    const first = BUILDER_FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) focusField(first);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmissionError("");
    const fieldErrors = validateBuilderApplication(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitBuilderApplication(
        buildBuilderApplicationPayload(values, renderedAt, decoy, captcha.token || undefined),
      );

      if (result.ok === false) {
        const refusal = readApplicationRefusal(result.code);
        setSubmissionError(refusal.sentence);
        if (refusal.field) {
          // The server refused a field, so mark it as well as saying so —
          // otherwise the message sits at the top and the box looks fine.
          setErrors({ [refusal.field]: refusal.sentence });
          focusField(refusal.field);
        } else {
          formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        }
        window.turnstile?.reset();
        return;
      }

      setAccepted({
        outcome: result.outcome,
        organisationLegalName: result.organisationLegalName || cleanTextValue(values.legalName),
        emailSent: result.emailSent,
        contactEmail: cleanEmailValue(values.contactEmail),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#02060F] text-white">
        <HeroBackground variant="industries" />
        <div className="relative max-w-3xl mx-auto px-6 py-32">
          <div className="glass-panel border border-white/10 p-8 sm:p-12">
            <div className="flex items-center gap-4 mb-8">
              <CheckCircle2 className="w-8 h-8 text-[#00A8B5]" aria-hidden="true" />
              <h1 className="text-3xl font-display font-light tracking-tight">
                Application received
              </h1>
            </div>
            <p className="text-[#9CA3B8] font-light leading-relaxed mb-8">
              <span className="text-white">{accepted.organisationLegalName}</span> has been set up
              on the Aurixa Builders Network and you are its owner.
            </p>

            {accepted.emailSent ? (
              <div className="border border-[#00A8B5]/30 bg-[#00A8B5]/5 p-6 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <MailCheck className="w-5 h-5 text-[#00A8B5]" aria-hidden="true" />
                  <h2 className="text-[13px] uppercase tracking-[0.18em] font-bold text-[#C3CCDD]">
                    Check your email
                  </h2>
                </div>
                <p className="text-[14px] text-[#9CA3B8] font-light leading-relaxed">
                  {accepted.outcome === "attached" ? (
                    <>
                      We have written to {accepted.contactEmail}. You already have a Builders
                      Network account, so sign in as usual — {accepted.organisationLegalName} is now
                      in your organisation switcher.
                    </>
                  ) : (
                    <>
                      We have sent {accepted.contactEmail} a link to choose a password. It can be
                      used once and expires, so please open it soon. If it has not arrived in a few
                      minutes, check your spam folder.
                    </>
                  )}
                </p>
              </div>
            ) : (
              /*
               * The organisation exists and the message did not go. Saying
               * "check your email" here sends somebody to an empty inbox and
               * then to a second application, which the day-long window would
               * refuse — so it says what actually happened instead.
               */
              <div className="border border-[#C89B3C]/40 bg-[#C89B3C]/5 p-6 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <TriangleAlert className="w-5 h-5 text-[#C89B3C]" aria-hidden="true" />
                  <h2 className="text-[13px] uppercase tracking-[0.18em] font-bold text-[#C3CCDD]">
                    We could not send your email
                  </h2>
                </div>
                <p className="text-[14px] text-[#9CA3B8] font-light leading-relaxed">
                  Your application went through and {accepted.organisationLegalName} is set up, but
                  we were unable to write to {accepted.contactEmail}. Please{" "}
                  <Link to="/contact" className="text-[#00A8B5] hover:text-[#5EDDE8]">
                    get in touch
                  </Link>{" "}
                  and quote your business name — there is no need to apply again.
                </p>
              </div>
            )}

            <p className="text-[13px] text-[#9CA3B8] font-light leading-relaxed">
              Your listing is reviewed before it appears in the marketplace. We will be in touch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02060F] text-white">
      <HeroBackground variant="industries" />
      <div className="relative max-w-3xl mx-auto px-6 py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C89B3C] border border-[#C89B3C]/30 mb-8 rounded-sm">
            Registration Open
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-6">
            {BUILDER_APPLICATION_COPY.heading}
          </h1>
          <p className="text-[#9CA3AF] font-light leading-relaxed mb-4">
            {BUILDER_APPLICATION_COPY.supporting}
          </p>
          <p className="text-[13px] text-[#6B7A94] font-light mb-10">
            {BUILDER_APPLICATION_COPY.timeEstimate} {BUILDER_APPLICATION_COPY.requiredNote}
          </p>
        </motion.div>

        <div className="glass-panel border border-white/10 p-6 sm:p-10">
          {submissionError && (
            <div
              className="flex gap-3 border border-red-400/40 bg-red-400/5 p-4 mb-8"
              role="alert"
            >
              <ShieldAlert className="w-5 h-5 text-red-300 shrink-0" aria-hidden="true" />
              <p className="text-[14px] text-red-200 font-light leading-relaxed">
                {submissionError}
              </p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-8">
            {/*
              The decoy. Hidden from sight AND from assistive technology, out
              of the tab order, and never autofilled — a real person cannot
              reach it, which is the only thing that makes refusing a filled
              one safe.
            */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
              <label htmlFor="company_website">Company website</label>
              <input
                id="company_website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={decoy}
                onChange={(event) => setDecoy(event.target.value)}
              />
            </div>

            <section className="space-y-5">
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#6B7A94] font-bold">
                Your business
              </h2>
              <Field
                id="legalName"
                label="Registered name"
                required
                helper={BUILDER_APPLICATION_COPY.helper.legalName}
                error={errors.legalName}
              >
                <input
                  id="legalName"
                  name="legalName"
                  type="text"
                  autoComplete="organization"
                  className={controlClass(Boolean(errors.legalName))}
                  aria-invalid={Boolean(errors.legalName)}
                  aria-describedby={describedBy("legalName", true, Boolean(errors.legalName))}
                  value={values.legalName}
                  onChange={(event) => set("legalName")(event.target.value)}
                />
              </Field>

              <div className={pairedRowClass}>
                <Field
                  id="tradingName"
                  label="Trading name"
                  paired
                  helper={BUILDER_APPLICATION_COPY.helper.tradingName}
                  error={errors.tradingName}
                >
                  <input
                    id="tradingName"
                    name="tradingName"
                    type="text"
                    className={controlClass(Boolean(errors.tradingName))}
                    value={values.tradingName}
                    onChange={(event) => set("tradingName")(event.target.value)}
                  />
                </Field>
                <Dropdown
                  id="orgType"
                  name="orgType"
                  label="What you do"
                  required
                  paired
                  options={BUILDER_ORG_TYPE_OPTIONS}
                  value={values.orgType}
                  placeholder="Choose one"
                  helper={BUILDER_APPLICATION_COPY.helper.orgType}
                  error={errors.orgType}
                  onSelect={(value) => set("orgType")(value)}
                />
              </div>

              <div className={pairedRowClass}>
                <Field
                  id="abn"
                  label="ABN"
                  paired
                  helper={BUILDER_APPLICATION_COPY.helper.abn}
                  error={errors.abn}
                >
                  <input
                    id="abn"
                    name="abn"
                    type="text"
                    inputMode="numeric"
                    className={controlClass(Boolean(errors.abn))}
                    aria-invalid={Boolean(errors.abn)}
                    aria-describedby={describedBy("abn", true, Boolean(errors.abn))}
                    value={values.abn}
                    onChange={(event) => set("abn")(event.target.value)}
                  />
                </Field>
                <Field
                  id="acn"
                  label="ACN"
                  paired
                  helper={BUILDER_APPLICATION_COPY.helper.acn}
                  error={errors.acn}
                >
                  <input
                    id="acn"
                    name="acn"
                    type="text"
                    inputMode="numeric"
                    className={controlClass(Boolean(errors.acn))}
                    aria-invalid={Boolean(errors.acn)}
                    aria-describedby={describedBy("acn", true, Boolean(errors.acn))}
                    value={values.acn}
                    onChange={(event) => set("acn")(event.target.value)}
                  />
                </Field>
              </div>

              <Field id="website" label="Website" error={errors.website}>
                <input
                  id="website"
                  name="website"
                  type="text"
                  inputMode="url"
                  placeholder="https://"
                  className={controlClass(Boolean(errors.website))}
                  value={values.website}
                  onChange={(event) => set("website")(event.target.value)}
                />
              </Field>
            </section>

            <section className="space-y-5">
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#6B7A94] font-bold">
                Who we write to
              </h2>
              <div className={pairedRowClass}>
                <Field id="contactName" label="Your name" required paired error={errors.contactName}>
                  <input
                    id="contactName"
                    name="contactName"
                    type="text"
                    autoComplete="name"
                    className={controlClass(Boolean(errors.contactName))}
                    aria-invalid={Boolean(errors.contactName)}
                    aria-describedby={describedBy("contactName", false, Boolean(errors.contactName))}
                    value={values.contactName}
                    onChange={(event) => set("contactName")(event.target.value)}
                  />
                </Field>
                <Field id="contactPhone" label="Phone" paired error={errors.contactPhone}>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    autoComplete="tel"
                    className={controlClass(Boolean(errors.contactPhone))}
                    value={values.contactPhone}
                    onChange={(event) => set("contactPhone")(event.target.value)}
                  />
                </Field>
              </div>
              <Field
                id="contactEmail"
                label="Email"
                required
                helper={BUILDER_APPLICATION_COPY.helper.contactEmail}
                error={errors.contactEmail}
              >
                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  className={controlClass(Boolean(errors.contactEmail))}
                  aria-invalid={Boolean(errors.contactEmail)}
                  aria-describedby={describedBy("contactEmail", true, Boolean(errors.contactEmail))}
                  value={values.contactEmail}
                  onChange={(event) => set("contactEmail")(event.target.value)}
                />
              </Field>
            </section>

            <section className="space-y-5">
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-[#6B7A94] font-bold">
                Where you are
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Field id="suburb" label="Suburb" error={errors.suburb}>
                  <input
                    id="suburb"
                    name="suburb"
                    type="text"
                    autoComplete="address-level2"
                    className={controlClass(Boolean(errors.suburb))}
                    value={values.suburb}
                    onChange={(event) => set("suburb")(event.target.value)}
                  />
                </Field>
                <Dropdown
                  id="state"
                  name="state"
                  label="State"
                  options={AU_STATE_OPTIONS}
                  value={values.state}
                  placeholder="Choose"
                  error={errors.state}
                  onSelect={(value) => set("state")(value)}
                />
                <Field id="postcode" label="Postcode" error={errors.postcode}>
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className={controlClass(Boolean(errors.postcode))}
                    aria-invalid={Boolean(errors.postcode)}
                    aria-describedby={describedBy("postcode", false, Boolean(errors.postcode))}
                    value={values.postcode}
                    onChange={(event) => set("postcode")(event.target.value)}
                  />
                </Field>
              </div>
            </section>

            <Field
              id="message"
              label="Anything else we should know"
              helper={BUILDER_APPLICATION_COPY.helper.message}
              error={errors.message}
            >
              <textarea
                id="message"
                name="message"
                rows={4}
                maxLength={MAX_MESSAGE}
                placeholder={BUILDER_APPLICATION_COPY.placeholder.message}
                className={`${controlClass(Boolean(errors.message))} resize-y`}
                value={values.message}
                onChange={(event) => set("message")(event.target.value)}
              />
            </Field>

            <div className="border-t border-white/10 pt-8 space-y-5">
              <p className={helperClass}>{BUILDER_APPLICATION_COPY.confidentiality}</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="privacyAcknowledged"
                  className="mt-1 w-4 h-4 accent-[#00A8B5] shrink-0"
                  checked={values.privacyAcknowledged}
                  onChange={(event) => set("privacyAcknowledged")(event.target.checked)}
                />
                <span className="text-[13px] text-[#9CA3B8] font-light leading-relaxed">
                  I acknowledge that Aurixa Systems will collect and use the information in
                  accordance with the{" "}
                  <Link to="/privacy-policy" className="text-[#00A8B5] hover:text-[#5EDDE8]">
                    Privacy Policy
                  </Link>
                  , and that I am authorised to register this business.
                </span>
              </label>
              {errors.privacyAcknowledged && (
                <p className={errorClass} role="alert">
                  {errors.privacyAcknowledged}
                </p>
              )}

              {TURNSTILE_SITE_KEY.length > 0 && (
                <div>
                  <span className={labelClass}>Security check</span>
                  <div ref={captcha.holder} className="mt-2" />
                </div>
              )}

              <p className={helperClass}>{BUILDER_APPLICATION_COPY.preSubmit}</p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative inline-flex w-full items-center justify-center px-10 py-4 text-[12px] tracking-[0.25em] font-bold text-white btn-chrome-prismatic rounded-sm transition-all hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100 shadow-[0_0_30px_rgba(200,155,60,0.3)]"
              >
                <span className="drop-shadow-md">
                  {isSubmitting
                    ? BUILDER_APPLICATION_COPY.submittingButton
                    : BUILDER_APPLICATION_COPY.submitButton}
                </span>
                {!isSubmitting && (
                  <ArrowRight
                    className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform drop-shadow-md"
                    style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}
                  />
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-[13px] text-[#6B7A94] font-light">
          Already registered?{" "}
          <a
            href="https://builders.aurixasystems.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00A8B5] hover:text-[#5EDDE8]"
          >
            Sign in to the network
          </a>
          .
        </p>
      </div>
    </div>
  );
}
