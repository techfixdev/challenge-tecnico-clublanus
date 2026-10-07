"use client";

import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/shared/ui/Button";

import {
  parseLoginFormData,
  validateLoginFields,
  type LoginField,
  type LoginFieldErrors,
} from "../domain/login-rules";
import {
  INITIAL_LOGIN_FORM_STATE,
  type LoginAction,
} from "../domain/login-form-state";
import { FormField, INPUT_CLASSES, fieldIds } from "./FormField";
import { LoginHeader } from "./LoginHeader";
import { PasswordInput } from "./PasswordInput";

type LoginFormProps = {
  /** Injected so the page wires the Server Action and tests can pass a fake. */
  action: LoginAction;
};

const FIELD_ORDER: LoginField[] = ["email", "password"];

/**
 * Login screen. Checks the fields on the client for instant feedback, with the plain rules
 * the server's zod schema shares (no zod in the browser); the Server Action validates
 * again because client checks can be bypassed.
 */
export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_LOGIN_FORM_STATE,
  );
  const [clientErrors, setClientErrors] = useState<LoginFieldErrors | null>(
    null,
  );

  const fieldErrors = clientErrors ?? state.fieldErrors ?? {};
  const formError = clientErrors ? undefined : state.formError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const errors = validateLoginFields(parseLoginFormData(new FormData(form)));
    if (Object.keys(errors).length === 0) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    setClientErrors(errors);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
    }
  }

  const email = fieldIds("email");
  const password = fieldIds("password");

  return (
    // Above the fixed backdrop the login page draws behind it.
    <div className="relative flex flex-1 flex-col px-6 pt-14 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <LoginHeader />

      <form
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="mt-12 flex flex-1 flex-col"
      >
        <div className="flex flex-col gap-5">
          <FormField name="email" label="Email" error={fieldErrors.email}>
            <input
              id={email.inputId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Ingresá tu email"
              defaultValue={state.values?.email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? email.errorId : undefined}
              className={INPUT_CLASSES}
            />
          </FormField>

          <FormField
            name="password"
            label="Contraseña"
            error={fieldErrors.password}
          >
            <PasswordInput
              id={password.inputId}
              name="password"
              autoComplete="current-password"
              placeholder="Ingresá tu contraseña"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? password.errorId : undefined
              }
            />
          </FormField>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-white/85">
            <input
              type="checkbox"
              name="remember"
              defaultChecked={state.values?.remember}
              className="login-checkbox"
            />
            Recordarme
          </label>

          {formError ? (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {formError}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-10">
          <Button
            type="submit"
            variant="inverse"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
