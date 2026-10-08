import type { LoginFieldErrors } from "./login-rules";

/** State returned by the login Server Action and rendered by `LoginForm` (via `useActionState`). */
export type LoginFormState = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: { email: string; remember: boolean };
};

export type LoginAction = (
  state: LoginFormState,
  formData: FormData,
) => Promise<LoginFormState>;

export const INITIAL_LOGIN_FORM_STATE: LoginFormState = {};
