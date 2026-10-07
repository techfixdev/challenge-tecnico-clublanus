import { describe, expect, it, vi } from "vitest";

import type { TransferRepository } from "./transfer";
import {
  parseTransferTo,
  resolveTransferPrefill,
  transferToHref,
} from "./transfer-prefill";

const VALID_CVU = "0000003100010000000176";

describe("transferToHref", () => {
  it("opens the send flow addressed to an alias", () => {
    expect(transferToHref("hincha.granate")).toBe(
      "/transferir?to=hincha.granate",
    );
  });

  it("encodes whatever it is given", () => {
    expect(transferToHref("a b&c")).toBe("/transferir?to=a%20b%26c");
  });
});

describe("parseTransferTo", () => {
  it("accepts a well-formed alias, normalized like the form does", () => {
    expect(parseTransferTo("  Hincha.Granate ")).toBe("hincha.granate");
  });

  it.each([
    ["missing", undefined],
    ["repeated", ["hincha.granate", "otro.alias"]],
    ["empty", ""],
    ["malformed", "no!"],
    ["too long", "a".repeat(80)],
  ])("ignores a %s value", (_label, raw) => {
    expect(parseTransferTo(raw)).toBeNull();
  });

  it("never takes a CVU from a URL (only aliases are shared in links)", () => {
    expect(parseTransferTo(VALID_CVU)).toBeNull();
  });
});

function repositoryFinding(
  account: {
    id: string;
    firstName: string;
    lastName: string;
    alias: string | null;
    cvu: string | null;
  } | null,
): TransferRepository {
  return {
    findRecipient: vi.fn(async () => account),
  } as unknown as TransferRepository;
}

const HINCHA = {
  id: "user_hincha",
  firstName: "Hincha",
  lastName: "Granate",
  alias: "hincha.granate",
  cvu: VALID_CVU,
};

describe("resolveTransferPrefill", () => {
  it("confirms a recipient the server can find", async () => {
    const prefill = await resolveTransferPrefill(
      repositoryFinding(HINCHA),
      "user_owner",
      "hincha.granate",
    );

    expect(prefill).toEqual({
      kind: "confirmed",
      recipient: {
        fullName: "Hincha Granate",
        alias: "hincha.granate",
        cvuMasked: expect.stringContaining("01 76"),
        query: "hincha.granate",
      },
    });
  });

  it("only types the alias when nobody has it, so the step shows why", async () => {
    expect(
      await resolveTransferPrefill(
        repositoryFinding(null),
        "user_owner",
        "nadie.granate",
      ),
    ).toEqual({ kind: "typed", text: "nadie.granate" });
  });

  it("only types the alias when it is the user's own", async () => {
    expect(
      await resolveTransferPrefill(
        repositoryFinding({ ...HINCHA, id: "user_owner" }),
        "user_owner",
        "hincha.granate",
      ),
    ).toEqual({ kind: "typed", text: "hincha.granate" });
  });

  it("does not look anything up for an invalid value", async () => {
    const repository = repositoryFinding(HINCHA);
    expect(
      await resolveTransferPrefill(repository, "user_owner", "no!"),
    ).toBeNull();
    expect(repository.findRecipient).not.toHaveBeenCalled();
  });
});
