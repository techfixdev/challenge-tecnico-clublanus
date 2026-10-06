import { describe, expect, it } from "vitest";

import {
  REFERENCE_ALPHABET,
  movementReference,
  newTransferCode,
} from "./transfer-reference";

const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

describe("newTransferCode", () => {
  it("is two groups of four Crockford base32 symbols, without I, L, O or U", () => {
    expect(REFERENCE_ALPHABET).toHaveLength(32);
    expect(REFERENCE_ALPHABET).not.toMatch(/[ILOU]/);
    for (let index = 0; index < 200; index += 1) {
      expect(newTransferCode()).toMatch(CODE_PATTERN);
    }
  });

  it("maps each random byte to one symbol, uniformly (32 divides 256)", () => {
    const bytes = Uint8Array.from([0, 1, 31, 32, 63, 200, 255, 10]);
    // byte mod 32: 0→0, 1→1, 31→Z, 32→0, 63→Z, 200→8, 255→Z, 10→A.
    expect(newTransferCode(() => bytes)).toBe("01Z0-Z8ZA");
  });

  it("is different every time (40 random bits)", () => {
    const codes = new Set(
      Array.from({ length: 1000 }, () => newTransferCode()),
    );
    expect(codes.size).toBe(1000);
  });
});

describe("movementReference", () => {
  it("prefixes the shared code with the side of the transfer", () => {
    expect(movementReference("7Q4K-92XA", "SENT")).toBe("ENV-7Q4K-92XA");
    expect(movementReference("7Q4K-92XA", "RECEIVED")).toBe("REC-7Q4K-92XA");
  });
});
