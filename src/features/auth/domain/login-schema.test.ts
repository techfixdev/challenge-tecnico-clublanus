import { describe, expect, it } from "vitest";

import {
  LOGIN_MESSAGES,
  getLoginFieldErrors,
  loginSchema,
  parseLoginFormData,
} from "./login-schema";

describe("loginSchema", () => {
  it("accepts valid credentials and normalizes the email", () => {
    const result = loginSchema.safeParse({
      email: "  SoyGranate@ClubLanus.com ",
      password: "GRANATE1@",
      remember: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: "soygranate@clublanus.com",
      password: "GRANATE1@",
      remember: true,
    });
  });

  it("defaults remember to false", () => {
    const result = loginSchema.safeParse({
      email: "a@b.co",
      password: "x",
    });
    expect(result.data?.remember).toBe(false);
  });

  it("requires the email", () => {
    const result = loginSchema.safeParse({ email: "   ", password: "x" });
    expect(result.success).toBe(false);
    expect(getLoginFieldErrors(result.error!)).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
    });
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({
      email: "soygranate@",
      password: "x",
    });
    expect(getLoginFieldErrors(result.error!)).toEqual({
      email: LOGIN_MESSAGES.emailInvalid,
    });
  });

  it("requires the password and does not trim it", () => {
    const empty = loginSchema.safeParse({ email: "a@b.co", password: "" });
    expect(getLoginFieldErrors(empty.error!)).toEqual({
      password: LOGIN_MESSAGES.passwordRequired,
    });

    const spaced = loginSchema.safeParse({ email: "a@b.co", password: " x " });
    expect(spaced.data?.password).toBe(" x ");
  });

  it("reports missing or non-string fields with the same messages (API bodies)", () => {
    const missing = loginSchema.safeParse({});
    expect(getLoginFieldErrors(missing.error!)).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    });

    const wrongType = loginSchema.safeParse({ email: 42, password: null });
    expect(getLoginFieldErrors(wrongType.error!)).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    });
  });

  it("reports one message per invalid field", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(getLoginFieldErrors(result.error!)).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    });
  });
});

describe("parseLoginFormData", () => {
  it("maps the checkbox 'on' value to remember = true", () => {
    const formData = new FormData();
    formData.set("email", "a@b.co");
    formData.set("password", "secret");
    formData.set("remember", "on");

    expect(parseLoginFormData(formData)).toEqual({
      email: "a@b.co",
      password: "secret",
      remember: true,
    });
  });

  it("treats missing fields as empty strings and an unchecked box as false", () => {
    expect(parseLoginFormData(new FormData())).toEqual({
      email: "",
      password: "",
      remember: false,
    });
  });
});
