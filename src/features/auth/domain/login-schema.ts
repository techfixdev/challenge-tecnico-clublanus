import { z } from "zod";

/**
 * Login validation shared by the client (instant feedback) and the server (source of truth).
 * Messages are UI copy, so they are in Spanish.
 */
export const LOGIN_MESSAGES = {
  emailRequired: "Ingresá tu email",
  emailInvalid: "Ingresá un email válido",
  passwordRequired: "Ingresá tu contraseña",
  passwordTooLong: "La contraseña es demasiado larga",
  // Deliberately generic: never reveal whether the email or the password was wrong.
  invalidCredentials: "Email o contraseña incorrectos",
  unexpected: "No pudimos iniciar sesión. Intentá de nuevo.",
  // Only reachable through the REST API (the form always sends an object with a boolean).
  bodyNotObject: "Enviá un objeto JSON con email y contraseña",
  rememberInvalid: "Recordarme debe ser verdadero o falso",
} as const;

// bcrypt only uses the first 72 bytes; the cap just stops absurd payloads early.
const PASSWORD_MAX_LENGTH = 128;

export const loginSchema = z.object(
  {
    // `error` on z.string() covers missing / non-string values (API bodies): without it
    // zod reports its default English message instead of the field's own.
    email: z
      .string({ error: LOGIN_MESSAGES.emailRequired })
      .trim()
      .toLowerCase()
      .min(1, LOGIN_MESSAGES.emailRequired)
      .pipe(z.email(LOGIN_MESSAGES.emailInvalid)),
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

export type LoginInput = z.input<typeof loginSchema>;

export type LoginField = "email" | "password";
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

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

/** Converts a submitted login form into the schema input (checkbox sends "on" when checked). */
export function parseLoginFormData(formData: FormData): LoginInput {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    email: text("email"),
    password: text("password"),
    remember: formData.get("remember") === "on",
  };
}
