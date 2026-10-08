import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "@/shared/lib/db";

/*
 * Revocable sessions against PostgreSQL: the cookie carries a signed token, but only a
 * live row in "Session" makes it valid. `next/headers` is replaced by an in-memory cookie
 * jar so the real session module (sign, insert, read, revoke) runs end to end.
 * Self-contained: its own users, deleted afterwards (their sessions cascade).
 */

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

const { SESSION_COOKIE_NAME } = await import("./session-token");
const { createSession, readSessionUser, revokeAllSessionsForUser } =
  await import("./session");
const { signOut } = await import("./sign-in");

const SECRET = "integration-secret-that-is-at-least-32-chars";
const RUN_ID = randomUUID().slice(0, 8);
let userId: string;
let otherUserId: string;

async function createUser(label: string): Promise<string> {
  const user = await db.user.create({
    data: {
      email: `it-session-${label}-${RUN_ID}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: "Session",
    },
  });
  return user.id;
}

/** Signs in and returns the raw cookie value, as an attacker who copied it would hold it. */
async function signInAndCopyToken(id: string): Promise<string> {
  await createSession(id, { remember: false });
  const token = jar.get(SESSION_COOKIE_NAME);
  if (!token) throw new Error("createSession did not set the cookie");
  return token;
}

function presentCookie(token: string) {
  jar.clear();
  jar.set(SESSION_COOKIE_NAME, token);
}

beforeAll(async () => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  userId = await createUser("owner");
  otherUserId = await createUser("other");
});

beforeEach(() => {
  jar.clear();
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  vi.unstubAllEnvs();
});

describe("revocable sessions (PostgreSQL)", () => {
  it("stores one session row per sign-in and accepts its token", async () => {
    const countLive = () =>
      db.session.count({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      });
    const before = await countLive();

    const token = await signInAndCopyToken(userId);

    expect(await countLive()).toBe(before + 1);
    presentCookie(token);
    await expect(readSessionUser()).resolves.toMatchObject({ id: userId });
  });

  it("rejects a validly signed token whose session was revoked", async () => {
    const token = await signInAndCopyToken(userId);
    const { id: sessionId } = await db.session.findFirstOrThrow({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    await db.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    presentCookie(token);
    await expect(readSessionUser()).resolves.toBeNull();
  });

  it("rejects a validly signed token whose session row is missing or expired", async () => {
    const token = await signInAndCopyToken(userId);
    await db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    presentCookie(token);
    await expect(readSessionUser()).resolves.toBeNull();

    const other = await signInAndCopyToken(userId);
    await db.session.deleteMany({ where: { userId } });
    presentCookie(other);
    await expect(readSessionUser()).resolves.toBeNull();
  });

  it("logout revokes the session server-side: a copied token stops working", async () => {
    const token = await signInAndCopyToken(userId);

    presentCookie(token);
    await signOut();

    expect(jar.has(SESSION_COOKIE_NAME)).toBe(false);
    presentCookie(token);
    await expect(readSessionUser()).resolves.toBeNull();
  });

  it("revokeAllSessionsForUser signs the user out everywhere and nobody else", async () => {
    const laptop = await signInAndCopyToken(userId);
    const phone = await signInAndCopyToken(userId);
    const someoneElse = await signInAndCopyToken(otherUserId);

    const revoked = await revokeAllSessionsForUser(userId);

    expect(revoked).toBeGreaterThanOrEqual(2);
    for (const token of [laptop, phone]) {
      presentCookie(token);
      await expect(readSessionUser()).resolves.toBeNull();
    }
    presentCookie(someoneElse);
    await expect(readSessionUser()).resolves.toMatchObject({
      id: otherUserId,
    });
  });

  it("clears the user's dead sessions when they sign in again", async () => {
    await signInAndCopyToken(userId);
    await revokeAllSessionsForUser(userId);

    await signInAndCopyToken(userId);

    const rows = await db.session.findMany({
      where: { userId },
      select: { revokedAt: true },
    });
    expect(rows).toEqual([{ revokedAt: null }]);
  });
});
