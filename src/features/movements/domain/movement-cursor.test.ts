// @vitest-environment node
import { describe, expect, it } from "vitest";

import { decodeMovementCursor, encodeMovementCursor } from "./movement-cursor";

describe("movement cursor", () => {
  it("round-trips the keyset position (date + id)", () => {
    const position = {
      occurredAt: new Date("2026-10-01T12:30:00.000Z"),
      id: "cmuvt8zut00035dm61qeqiekh",
    };

    const cursor = encodeMovementCursor(position);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/); // URL-safe, opaque
    expect(decodeMovementCursor(cursor)).toEqual(position);
  });

  it("returns null for garbage, malformed JSON or wrong shapes", () => {
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");

    expect(decodeMovementCursor("not-a-cursor")).toBeNull();
    expect(decodeMovementCursor("")).toBeNull();
    expect(decodeMovementCursor(encode({ id: "x" }))).toBeNull();
    expect(
      decodeMovementCursor(encode({ t: "yesterday", id: "x" })),
    ).toBeNull();
    expect(
      decodeMovementCursor(encode({ t: "2026-10-01T12:30:00.000Z", id: "" })),
    ).toBeNull();
  });
});
