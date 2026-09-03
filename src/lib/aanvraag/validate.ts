import { isAllowedTestEmail, isValidEmailAddress, normalizeEmail } from "../email/guard";
import { USER_MESSAGES } from "./messages";

export type AanvraagInput = {
  naam: string;
  email: string;
  reisSlug: string;
  reisTitel: string;
  opmerking?: string;
  submissionId?: string;
};

export type NormalizedAanvraag = {
  naam: string;
  email: string;
  reisSlug: string;
  reisTitel: string;
  opmerking: string;
};

export type FieldName = "naam" | "email" | "reisSlug" | "reisTitel" | "opmerking";

export type FieldError = {
  field: FieldName;
  message: string;
};

export type ValidationResult =
  | { ok: true; value: NormalizedAanvraag }
  | { ok: false; errors: FieldError[] };

/** Fields the form is allowed to collect. Payment data is intentionally absent. */
export const AANVRAAG_FIELDS = ["naam", "email", "reisSlug", "reisTitel", "opmerking"] as const;

export const PAYMENT_FIELDS_NEVER_ASKED = [
  "iban",
  "bic",
  "creditcard",
  "kaartnummer",
  "cvv",
  "cvc",
  "rekeningnummer",
  "betaalmethode",
] as const;

export function validateAanvraag(input: AanvraagInput): ValidationResult {
  const errors: FieldError[] = [];
  const naam = input.naam.trim();
  const email = normalizeEmail(input.email);
  const reisSlug = input.reisSlug.trim();
  const reisTitel = input.reisTitel.trim();
  const opmerking = (input.opmerking ?? "").trim();

  if (naam.length < 2) {
    errors.push({ field: "naam", message: "Vul je naam in (minimaal twee letters)." });
  }

  if (!isValidEmailAddress(email)) {
    errors.push({ field: "email", message: "Vul een geldig e-mailadres in." });
  } else if (!isAllowedTestEmail(email)) {
    errors.push({ field: "email", message: USER_MESSAGES.realEmailForbidden });
  }

  if (!reisSlug) {
    errors.push({ field: "reisSlug", message: "Kies een reis." });
  }

  if (!reisTitel) {
    errors.push({ field: "reisTitel", message: "Kies een reis." });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { naam, email, reisSlug, reisTitel, opmerking },
  };
}
