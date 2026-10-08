// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  decide,
  LOGIN_EMAIL_CLIENT_POLICY,
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  windowStartFor,
} from "@/shared/lib/rate-limit";

/*
 * The login service's rate limiting: failed attempts per email from one client, per email
 * overall and per client IP. The verdict logic is the real one; the PostgreSQL counter is
 * replaced by one in memory (it has its own integration test), and so are the user store,
 * bcrypt and the cookie.
 */
const mocks = vi.hoisted(() => ({
  findCredentialsByEmail: vi.fn(),
  createSession: vi.fn(),
  compare: vi.fn(),
  consumeRateLimit: vi.fn(),
  refundRateLimit: vi.fn(),
}));

vi.mock("../data/user-repository", () => ({
  findCredentialsByEmail: mocks.findCredentialsByEmail,
}));
vi.mock("./session", () => ({
  createSession: mocks.createSession,
  deleteSession: vi.fn(),
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));
vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  refundRateLimit: mocks.refundRateLimit,
}));

const { signIn } = await import("./sign-in");

const NOW = new Date("2026-10-08T12:05:00.000Z");
const WINDOW_START = new Date("2026-10-08T12:00:00.000Z");
const IP = "203.0.113.7";
const ATTACKER_IP = "198.51.100.66";
const USER = { email: "soygranate@clublanus.com", password: "GRANATE1@" };
const WRONG = { ...USER, password: "wrong-password" };
let counts: Map<string, number>;

beforeEach(() => {
  counts = new Map();
  mocks.consumeRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string, policy) => {
      const count = (counts.get(`${scope}|${key}`) ?? 0) + 1;
      counts.set(`${scope}|${key}`, count);
      const windowStart = windowStartFor(NOW, policy);
      return { ...decide(count, windowStart, NOW, policy), windowStart };
    });
  mocks.refundRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string) => {
      const count = counts.get(`${scope}|${key}`) ?? 0;
      counts.set(`${scope}|${key}`, Math.max(0, count - 1));
    });
  mocks.findCredentialsByEmail
    .mockReset()
    .mockImplementation(async (email) =>
      email === USER.email
        ? { id: "user_1", passwordHash: "$2b$10$stored" }
        : null,
    );
  mocks.compare
    .mockReset()
    .mockImplementation(async (plain: string) => plain === USER.password);
  mocks.createSession.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function failTimes(
  times: number,
  email = USER.email,
  clientIp: string | null = IP,
) {
  for (let attempt = 0; attempt < times; attempt++) {
    const result = await signIn({ ...WRONG, email }, { clientIp });
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  }
}

describe("signIn rate limiting", () => {
  it("blocks a client's 6th failed attempt for an email without verifying the password", async () => {
    await failTimes(5);
    mocks.compare.mockClear();
    mocks.findCredentialsByEmail.mockClear();

    // Even the right password: the attempt is refused before it is checked.
    const sixth = await signIn(USER, { clientIp: IP });

    // Window 12:00–12:15, now 12:05 → 600 s.
    expect(sixth).toEqual({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 600,
    });
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.findCredentialsByEmail).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("does not let an attacker lock the owner out: failures from one IP leave other IPs alone", async () => {
    await failTimes(5, USER.email, ATTACKER_IP);
    expect(await signIn(WRONG, { clientIp: ATTACKER_IP })).toMatchObject({
      reason: "rate_limited",
    });

    expect(await signIn(USER, { clientIp: IP })).toEqual({
      ok: true,
      userId: "user_1",
    });
  });

  it("caps failed attempts for one email at 50 across all IPs, without verifying the password", async () => {
    for (let client = 0; client < 10; client++) {
      await failTimes(5, USER.email, `192.0.2.${client}`);
    }
    mocks.compare.mockClear();

    const result = await signIn(USER, { clientIp: "192.0.2.200" });

    expect(result).toEqual({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 600,
    });
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "login:email",
      USER.email,
      LOGIN_EMAIL_POLICY,
    );
  });

  it("treats an unknown email exactly like a known one", async () => {
    const unknown = "nadie@clublanus.com";
    await failTimes(5, unknown);

    expect(
      await signIn({ ...WRONG, email: unknown }, { clientIp: IP }),
    ).toMatchObject({ ok: false, reason: "rate_limited" });
  });

  it("counts the normalized email, so case and spaces do not reset the count", async () => {
    await failTimes(5, "SoyGranate@ClubLanus.com ");

    expect(await signIn(WRONG, { clientIp: IP })).toMatchObject({
      reason: "rate_limited",
    });
  });

  it("blocks a client IP after 20 failed attempts across different emails", async () => {
    for (let n = 0; n < 4; n++) await failTimes(5, `user${n}@clublanus.com`);

    const result = await signIn(
      { ...WRONG, email: "otro@clublanus.com" },
      { clientIp: IP },
    );

    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "login:ip",
      IP,
      LOGIN_IP_POLICY,
    );
    // The same email from another IP is still allowed.
    expect(
      await signIn(
        { ...WRONG, email: "otro@clublanus.com" },
        { clientIp: "198.51.100.9" },
      ),
    ).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("does not count a successful login: every bucket it took is given back, in the window it was taken from", async () => {
    await failTimes(4);
    expect(await signIn(USER, { clientIp: IP })).toEqual({
      ok: true,
      userId: "user_1",
    });

    // Still one attempt left: the success gave its slot back.
    await failTimes(1);
    expect(mocks.refundRateLimit).toHaveBeenCalledWith(
      "login:email-client",
      `${USER.email}|${IP}`,
      WINDOW_START,
    );
    expect(mocks.refundRateLimit).toHaveBeenCalledWith(
      "login:email",
      USER.email,
      WINDOW_START,
    );
    expect(mocks.refundRateLimit).toHaveBeenCalledWith(
      "login:ip",
      IP,
      WINDOW_START,
    );
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "login:email-client",
      `${USER.email}|${IP}`,
      LOGIN_EMAIL_CLIENT_POLICY,
    );
  });

  it("still signs in when giving the attempt back fails (the failure is only logged)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.refundRateLimit.mockRejectedValue(new Error("database down"));

    expect(await signIn(USER, { clientIp: IP })).toEqual({
      ok: true,
      userId: "user_1",
    });
    expect(mocks.createSession).toHaveBeenCalledWith("user_1", {
      remember: false,
    });
    expect(log).toHaveBeenCalled();
  });

  it("puts requests without a client IP in one shared bucket per email, and skips the per-IP limit", async () => {
    await failTimes(5, USER.email, null);

    expect(await signIn(WRONG, { clientIp: null })).toMatchObject({
      reason: "rate_limited",
    });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalledWith(
      "login:ip",
      expect.anything(),
      expect.anything(),
    );
    // A client that does carry an IP is not affected.
    expect(await signIn(USER, { clientIp: IP })).toMatchObject({ ok: true });
  });

  it("does not count invalid input", async () => {
    const result = await signIn({ email: "", password: "" }, { clientIp: IP });

    expect(result).toMatchObject({ ok: false, reason: "invalid_input" });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });
});
