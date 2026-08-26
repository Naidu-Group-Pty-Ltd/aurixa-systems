/**
 * Stage 2 resume-by-reference.
 *
 * The secure questionnaire link is time-limited, so an applicant who comes back
 * after it expires needs another way in. They resume with the application
 * reference issued at Stage 1 *plus* the work email that application was filed
 * under — the reference on its own is never enough, because it travels in
 * emails and is the sort of thing people forward.
 *
 * Everything here is pure so the rules can be tested without a browser; the
 * network call lives in `readinessQuestionnaireService`.
 */

import {
  formatReferenceInput,
  isApplicationReference,
  normaliseReference,
  readReferenceFromUrl,
} from "./applicationReference";

// The reference format itself lives in ./applicationReference, which the Stage 3
// gate shares. Re-exported here so the resume form keeps a single import.
export { formatReferenceInput, isApplicationReference, normaliseReference, readReferenceFromUrl };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ResumeDetails = {
  reference: string;
  workEmail: string;
};

export type ResumeDetailErrors = Partial<Record<keyof ResumeDetails, string>>;

export const EMPTY_RESUME_DETAILS: ResumeDetails = { reference: "", workEmail: "" };

/** Field-level validation for the resume form. */
export function validateResumeDetails(details: ResumeDetails): ResumeDetailErrors {
  const errors: ResumeDetailErrors = {};
  const email = details.workEmail.trim();

  if (!details.reference.trim()) {
    errors.reference = "Enter the application reference from your Aurixa email.";
  } else if (!normaliseReference(details.reference)) {
    errors.reference = "That does not look like an Aurixa reference. It looks like AX-7Q2M4L9XZ1.";
  }

  if (!email) errors.workEmail = "Enter the work email your application was submitted with.";
  else if (!EMAIL_PATTERN.test(email) || email.length > 320) errors.workEmail = "Enter a valid email address.";

  return errors;
}

/**
 * Why a resume attempt failed.
 *
 * `invalid_reference` deliberately covers an unknown reference, a reference
 * belonging to somebody else, and a mismatched email alike: the page must never
 * reveal whether a particular application exists.
 */
export type ResumeFailure =
  | "invalid_reference"
  | "already_completed"
  | "throttled"
  | "not_configured"
  | "unavailable";

export const RESUME_COPY: Record<ResumeFailure, string> = {
  invalid_reference:
    "We could not match that reference and email. Check both against your Aurixa confirmation email, or contact the team for a new secure link.",
  already_completed:
    "This questionnaire has already been submitted. No further action is needed. Aurixa will be in touch about the next step.",
  throttled: "Too many attempts. Please wait a few minutes before trying again.",
  not_configured:
    "Resuming by reference is not available just yet. Please contact the Aurixa team and quote your reference for a new secure link.",
  unavailable: "We could not reach the questionnaire service. Please try again in a few minutes.",
};
