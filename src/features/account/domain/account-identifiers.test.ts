import { describe, expect, it } from "vitest";

import {
  receiveShareText,
  buildCvu,
  formatCvu,
  getReceiveDetails,
  isValidAlias,
  isValidCvu,
  maskCvu,
  normalizeAlias,
  normalizeCvu,
  type ReceiveDetailsRepository,
} from "./account-identifiers";

// A real-world CBU often used as an example; CBU and CVU share the check-digit scheme.
const KNOWN_VALID = "2850590940090418135201";

describe("CVU", () => {
  it("validates both check digits", () => {
    expect(isValidCvu(KNOWN_VALID)).toBe(true);
    // One mistyped digit in either block breaks its check digit.
    expect(isValidCvu("2850590940090418135202")).toBe(false);
    expect(isValidCvu("2850591940090418135201")).toBe(false);
  });

  it("requires exactly 22 digits", () => {
    expect(isValidCvu("285059094009041813520")).toBe(false);
    expect(isValidCvu("28505909400904181352011")).toBe(false);
    expect(isValidCvu("28505909400904181352O1")).toBe(false);
  });

  it("builds a valid CVU from its entity and account numbers", () => {
    expect(buildCvu("2850590", "4009041813520")).toBe(KNOWN_VALID);
    const cvu = buildCvu("0000003", "1000000000017");
    expect(cvu).toHaveLength(22);
    expect(isValidCvu(cvu)).toBe(true);
  });

  it("refuses to build from malformed parts", () => {
    expect(() => buildCvu("123", "4009041813520")).toThrow(RangeError);
  });

  it("drops the spaces and dashes people paste", () => {
    expect(normalizeCvu(" 2850590-9 4009041813520 1 ")).toBe(KNOWN_VALID);
  });

  it("groups it in fours from the end, so it never ends on a short group", () => {
    // 22 digits = a leading pair + five fours; the last group is the last 4 digits.
    expect(formatCvu(KNOWN_VALID)).toBe("28 5059 0940 0904 1813 5201");
  });

  it("masks all but the last 4 digits, which stay one whole group", () => {
    expect(maskCvu(KNOWN_VALID)).toBe("•• •••• •••• •••• •••• 5201");
  });
});

describe("alias", () => {
  it("is case-insensitive: stored and compared in lowercase", () => {
    expect(normalizeAlias("  Soy.Granate.LANUS ")).toBe("soy.granate.lanus");
  });

  it("allows 6 to 20 letters, digits, dots and hyphens", () => {
    expect(isValidAlias("soy.granate.lanus")).toBe(true);
    expect(isValidAlias("hincha-granate-1")).toBe(true);
    expect(isValidAlias("corto")).toBe(false);
    expect(isValidAlias("un.alias.demasiado.largo")).toBe(false);
    expect(isValidAlias("con espacio")).toBe(false);
    expect(isValidAlias("ñandú.granate")).toBe(false);
  });
});

describe("getReceiveDetails", () => {
  const repository = (
    row: Awaited<ReturnType<ReceiveDetailsRepository["findByUserId"]>>,
  ): ReceiveDetailsRepository => ({ findByUserId: async () => row });

  it("returns the holder name, alias and the full CVU (formatted too)", async () => {
    await expect(
      getReceiveDetails(
        repository({
          firstName: "Granate",
          lastName: "Lanús",
          alias: "soy.granate.lanus",
          cvu: KNOWN_VALID,
        }),
        "user_1",
      ),
    ).resolves.toEqual({
      holderName: "Granate Lanús",
      alias: "soy.granate.lanus",
      cvu: KNOWN_VALID,
      cvuFormatted: "28 5059 0940 0904 1813 5201",
    });
  });

  it("is null for an unknown user or an account without identifiers yet", async () => {
    await expect(getReceiveDetails(repository(null), "x")).resolves.toBeNull();
    await expect(
      getReceiveDetails(
        repository({ firstName: "A", lastName: "B", alias: null, cvu: null }),
        "x",
      ),
    ).resolves.toBeNull();
  });
});

describe("receiveShareText", () => {
  it("is a ready-to-send message with the raw CVU (easy to paste)", () => {
    expect(
      receiveShareText({
        holderName: "Granate Lanús",
        alias: "soy.granate.lanus",
        cvu: KNOWN_VALID,
        cvuFormatted: "28 5059 0940 0904 1813 5201",
      }),
    ).toBe(
      [
        "Te paso mis datos de GranaBank para que me transfieras:",
        "Titular: Granate Lanús",
        "Alias: soy.granate.lanus",
        `CVU: ${KNOWN_VALID}`,
      ].join("\n"),
    );
  });
});
