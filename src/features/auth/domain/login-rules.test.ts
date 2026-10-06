import { describe, expect, it } from "vitest";

import { LOGIN_MESSAGES, validateLoginFields } from "./login-rules";
import { getLoginFieldErrors, loginSchema } from "./login-schema";

const VALID_PASSWORD = "secreto123";

// [email, password, expected errors]: run by the form (no zod) and the server (zod).
const CASES: [string, string, Record<string, string>][] = [
  ["hincha@granabank.com", VALID_PASSWORD, {}],
  ["  Hincha@GranaBank.com ", VALID_PASSWORD, {}],
  ["juan.perez+lanus@club-lanus.com.ar", VALID_PASSWORD, {}],
  ["", VALID_PASSWORD, { email: LOGIN_MESSAGES.emailRequired }],
  ["   ", VALID_PASSWORD, { email: LOGIN_MESSAGES.emailRequired }],
  ["hincha", VALID_PASSWORD, { email: LOGIN_MESSAGES.emailInvalid }],
  ["hincha@granabank", VALID_PASSWORD, { email: LOGIN_MESSAGES.emailInvalid }],
  ["a@b.c", VALID_PASSWORD, { email: LOGIN_MESSAGES.emailInvalid }],
  [
    ".hincha@granabank.com",
    VALID_PASSWORD,
    { email: LOGIN_MESSAGES.emailInvalid },
  ],
  [
    "hin..cha@granabank.com",
    VALID_PASSWORD,
    { email: LOGIN_MESSAGES.emailInvalid },
  ],
  [
    "hincha @granabank.com",
    VALID_PASSWORD,
    { email: LOGIN_MESSAGES.emailInvalid },
  ],
  ["hincha@granabank.com", "", { password: LOGIN_MESSAGES.passwordRequired }],
  // The password is never trimmed: spaces are characters like any other.
  ["hincha@granabank.com", "   ", {}],
  ["hincha@granabank.com", "x".repeat(128), {}],
  [
    "hincha@granabank.com",
    "x".repeat(129),
    { password: LOGIN_MESSAGES.passwordTooLong },
  ],
  [
    "",
    "",
    {
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    },
  ],
];

describe("validateLoginFields", () => {
  it.each(CASES)(
    "agrees with the server schema on %j / %j",
    (email, password, expected) => {
      expect(validateLoginFields({ email, password })).toEqual(expected);

      const server = loginSchema.safeParse({ email, password });
      expect(server.success ? {} : getLoginFieldErrors(server.error)).toEqual(
        expected,
      );
    },
  );
});
