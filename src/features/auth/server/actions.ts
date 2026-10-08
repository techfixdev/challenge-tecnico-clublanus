"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { tooManyAttemptsMessage } from "@/shared/lib/rate-limit";
import { ROUTES } from "@/shared/lib/routes";
import { clientIpFrom } from "@/shared/server/client-ip";

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
    result = await signIn(input, { clientIp: clientIpFrom(await headers()) });
  } catch (error) {
    // Infrastructure failure (DB down, missing secret): log it, show a neutral message.
    console.error("Login failed unexpectedly", error);
    return { formError: LOGIN_MESSAGES.unexpected, values };
  }

  if (!result.ok) {
    switch (result.reason) {
      case "invalid_input":
        return { fieldErrors: result.fieldErrors, values };
      case "invalid_credentials":
        return { formError: LOGIN_MESSAGES.invalidCredentials, values };
      case "rate_limited":
        // Same place and shape as a wrong password: says nothing about the account.
        return {
          formError: tooManyAttemptsMessage(result.retryAfterSeconds),
          values,
        };
    }
  }

  // Outside try/catch: `redirect` works by throwing.
  redirect(ROUTES.home);
}

export async function logout(): Promise<void> {
  await signOut();
  redirect(ROUTES.login);
}
