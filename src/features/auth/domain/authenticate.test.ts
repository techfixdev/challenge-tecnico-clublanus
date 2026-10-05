import { describe, expect, it, vi } from "vitest";

import {
  DUMMY_PASSWORD_HASH,
  authenticate,
  type AuthenticateDeps,
} from "./authenticate";

const STORED_USER = { id: "user_1", passwordHash: "$2b$10$stored-hash" };

function makeDeps(overrides: Partial<AuthenticateDeps> = {}) {
  return {
    findUserByEmail: vi.fn<AuthenticateDeps["findUserByEmail"]>(
      async () => STORED_USER,
    ),
    verifyPassword: vi.fn<AuthenticateDeps["verifyPassword"]>(async () => true),
    ...overrides,
  };
}

const credentials = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
};

describe("authenticate", () => {
  it("returns the user id when the password matches", async () => {
    const deps = makeDeps();

    await expect(authenticate(credentials, deps)).resolves.toEqual({
      ok: true,
      userId: "user_1",
    });
    expect(deps.findUserByEmail).toHaveBeenCalledWith(credentials.email);
    expect(deps.verifyPassword).toHaveBeenCalledWith(
      credentials.password,
      STORED_USER.passwordHash,
    );
  });

  it("fails when the password is wrong", async () => {
    const deps = makeDeps({ verifyPassword: vi.fn(async () => false) });

    await expect(authenticate(credentials, deps)).resolves.toEqual({
      ok: false,
    });
  });

  it("fails with the same result when the user does not exist", async () => {
    const deps = makeDeps({ findUserByEmail: vi.fn(async () => null) });

    await expect(authenticate(credentials, deps)).resolves.toEqual({
      ok: false,
    });
  });

  it("still runs a password comparison for unknown users to equalize timing", async () => {
    const verifyPassword = vi.fn(async () => true);
    const deps = makeDeps({
      findUserByEmail: vi.fn(async () => null),
      verifyPassword,
    });

    // Even if the dummy comparison "succeeded", an unknown user never authenticates.
    await expect(authenticate(credentials, deps)).resolves.toEqual({
      ok: false,
    });
    expect(verifyPassword).toHaveBeenCalledWith(
      credentials.password,
      DUMMY_PASSWORD_HASH,
    );
  });

  it("uses a real bcrypt hash with the same cost as stored passwords", () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$10\$.{53}$/);
  });
});
