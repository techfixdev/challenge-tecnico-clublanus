/**
 * The login rules with no validation library, so the form can check them in the browser
 * without downloading zod. The server validates with its zod schema (`login-schema.ts`),
 * built from these same constants; a shared test proves both give the same verdict.
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
export const PASSWORD_MAX_LENGTH = 128;

// The longest address SMTP allows (RFC 5321); also keeps rate-limit keys within their column.
export const EMAIL_MAX_LENGTH = 254;

/** zod's own email pattern, passed to `z.email()` on the server so the two cannot drift. */
export const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export type LoginInput = {
  email: string;
  password: string;
  remember?: boolean;
};

export type LoginField = "email" | "password";
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

/** The form's instant check: the first message per invalid field, like the server's. */
export function validateLoginFields({
  email,
  password,
}: Pick<LoginInput, "email" | "password">): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) errors.email = LOGIN_MESSAGES.emailRequired;
  else if (
    normalizedEmail.length > EMAIL_MAX_LENGTH ||
    !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    errors.email = LOGIN_MESSAGES.emailInvalid;
  }
  // Never trimmed: spaces are part of a password.
  if (!password) errors.password = LOGIN_MESSAGES.passwordRequired;
  else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = LOGIN_MESSAGES.passwordTooLong;
  }
  return errors;
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
