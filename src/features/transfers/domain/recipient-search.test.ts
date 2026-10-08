import { describe, expect, it } from "vitest";

import type { ConfirmedRecipient } from "./transfer-form";
import { matchRecipients, searchRecipients } from "./recipient-search";

const recent = (
  fullName: string,
  alias: string,
  lastFour: string,
): ConfirmedRecipient => ({
  fullName,
  alias,
  cvuMasked: `•• •••• •••• •••• •••• ${lastFour}`,
  query: alias,
});

const HINCHA = recent("Hincha Granate", "hincha.granate", "0255");
const SOFIA = recent("Sofía Núñez", "sofi.lanus", "0310");
const MATI = recent("Matías Pérez", "mati.granate", "9912");
const RECENTS = [HINCHA, SOFIA, MATI];

/** A well-formed CVU no recent has (the check digits are right). */
const UNKNOWN_CVU = "2850590940090418135201";

describe("matchRecipients", () => {
  it("keeps every recent, in order, while nothing is typed", () => {
    expect(matchRecipients("", RECENTS)).toEqual(RECENTS);
    expect(matchRecipients("   ", RECENTS)).toEqual(RECENTS);
  });

  it("matches the name ignoring case and accents", () => {
    expect(matchRecipients("sofia", RECENTS)).toEqual([SOFIA]);
    expect(matchRecipients("NUÑEZ", RECENTS)).toEqual([SOFIA]);
    expect(matchRecipients("nunez", RECENTS)).toEqual([SOFIA]);
    expect(matchRecipients("  matías  pé", RECENTS)).toEqual([MATI]);
  });

  it("matches the alias, keeping the recents' order", () => {
    expect(matchRecipients("granate", RECENTS)).toEqual([HINCHA, MATI]);
    expect(matchRecipients("Sofi.Lan", RECENTS)).toEqual([SOFIA]);
  });

  it("matches the CVU's visible digits, ignoring spaces and dashes", () => {
    expect(matchRecipients("0255", RECENTS)).toEqual([HINCHA]);
    expect(matchRecipients("03 1", RECENTS)).toEqual([SOFIA]);
    expect(matchRecipients("99-12", RECENTS)).toEqual([MATI]);
  });

  it("does not claim a full CVU for a recent: only its last digits are known", () => {
    expect(matchRecipients(UNKNOWN_CVU, RECENTS)).toEqual([]);
  });

  it("finds nobody for text no recent has", () => {
    expect(matchRecipients("ramiro", RECENTS)).toEqual([]);
  });
});

describe("searchRecipients", () => {
  it("offers no lookup while nothing is typed", () => {
    expect(searchRecipients("", RECENTS)).toEqual({
      matches: RECENTS,
      lookup: null,
    });
  });

  it("offers looking up a well-formed alias no recent has", () => {
    expect(searchRecipients(" Ramiro.Lanus ", RECENTS)).toEqual({
      matches: [],
      lookup: "ramiro.lanus",
    });
  });

  it("offers looking up a well-formed CVU, as digits", () => {
    expect(searchRecipients("2850 5909 4009 0418 1352 01", RECENTS)).toEqual({
      matches: [],
      lookup: UNKNOWN_CVU,
    });
  });

  it("offers nothing for text that is no alias nor CVU", () => {
    expect(searchRecipients("Ramiro Díaz", RECENTS)).toEqual({
      matches: [],
      lookup: null,
    });
    expect(searchRecipients("12345", RECENTS)).toEqual({
      matches: [],
      lookup: null,
    });
  });

  it("does not offer looking up a recent's own alias: the tile is the answer", () => {
    expect(searchRecipients("Hincha.Granate", RECENTS)).toEqual({
      matches: [HINCHA],
      lookup: null,
    });
  });

  it("still offers an alias that only partly matches a recent, so it stays reachable", () => {
    // "hincha" is someone else's alias: the recent "hincha.granate" must not shadow it.
    expect(searchRecipients("hincha", RECENTS)).toEqual({
      matches: [HINCHA],
      lookup: "hincha",
    });
  });
});
