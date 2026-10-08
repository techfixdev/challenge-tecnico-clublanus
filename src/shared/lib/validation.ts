import { z } from "zod";

/** Validation errors in a JSON-friendly shape: per-field messages plus root-level ones. */
export type ValidationDetails = {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
};

/** Every field error (not only the ones a form shows) plus root-level errors. */
export function validationDetails(error: z.ZodError): ValidationDetails {
  const { fieldErrors, formErrors } = z.flattenError(error);
  return {
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] =>
        Array.isArray(entry[1]),
      ),
    ),
    formErrors,
  };
}
