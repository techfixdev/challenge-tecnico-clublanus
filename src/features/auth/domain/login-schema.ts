import { z } from "zod";

import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  LOGIN_MESSAGES,
  PASSWORD_MAX_LENGTH,
  type LoginFieldErrors,
  type LoginInput,
} from "./login-rules";

export {
  LOGIN_MESSAGES,
  parseLoginFormData,
  type LoginField,
  type LoginFieldErrors,
  type LoginInput,
} from "./login-rules";

/**
 * The server's login validation (source of truth), also used for REST bodies. Built from
 * the constants in `login-rules.ts`, whose plain check the form runs in the browser.
 */
export const loginSchema = z.object(
  {
    // `error` on z.string() covers missing / non-string values (API bodies): without it
    // zod reports its default English message instead of the field's own.
    email: z
      .string({ error: LOGIN_MESSAGES.emailRequired })
      .trim()
      .toLowerCase()
      .min(1, LOGIN_MESSAGES.emailRequired)
      .max(EMAIL_MAX_LENGTH, LOGIN_MESSAGES.emailInvalid)
      .pipe(
        z.email({ pattern: EMAIL_PATTERN, error: LOGIN_MESSAGES.emailInvalid }),
      ),
    password: z
      .string({ error: LOGIN_MESSAGES.passwordRequired })
      .min(1, LOGIN_MESSAGES.passwordRequired)
      .max(PASSWORD_MAX_LENGTH, LOGIN_MESSAGES.passwordTooLong),
    remember: z
      .boolean({ error: LOGIN_MESSAGES.rememberInvalid })
      .default(false),
  },
  { error: LOGIN_MESSAGES.bodyNotObject },
);

/** Keeps the first message per field, which is what the form displays. */
export function getLoginFieldErrors(
  error: z.ZodError<LoginInput>,
): LoginFieldErrors {
  const { fieldErrors } = z.flattenError(error);
  const result: LoginFieldErrors = {};
  if (fieldErrors.email?.[0]) result.email = fieldErrors.email[0];
  if (fieldErrors.password?.[0]) result.password = fieldErrors.password[0];
  return result;
}
