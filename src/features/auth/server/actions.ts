"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/shared/lib/routes";

import { LOGIN_MESSAGES, parseLoginFormData } from "../domain/login-schema";
import type { LoginFormState } from "../domain/login-form-state";
import { signIn, signOut, type SignInResult } from "./sign-in";

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const input = parseLoginFormData(formData);
  const values = { email: input.email, remember: input.remember ?? false };

  let result: SignInResult;
  try {
    result = await signIn(input);
  } catch (error) {
    // Infrastructure failure (DB down, missing secret): log it, show a neutral message.
    console.error("Login failed unexpectedly", error);
    return { formError: LOGIN_MESSAGES.unexpected, values };
  }

  if (!result.ok) {
    return result.reason === "invalid_input"
      ? { fieldErrors: result.fieldErrors, values }
      : { formError: LOGIN_MESSAGES.invalidCredentials, values };
  }

  // Outside try/catch: `redirect` works by throwing.
  redirect(ROUTES.home);
}

export async function logout(): Promise<void> {
  await signOut();
  redirect(ROUTES.login);
}
