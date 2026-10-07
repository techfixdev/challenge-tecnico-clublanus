// @vitest-environment node
import { describe, expect, it } from "vitest";

import { mutationAllowed } from "./capture-screens";

describe("pnpm screens:capture mutation guard", () => {
  it("never submits a transfer unless explicitly allowed", () => {
    expect(mutationAllowed({})).toBe(false);
    expect(
      mutationAllowed({ DATABASE_URL: "postgresql://u@h/granabank_test" }),
    ).toBe(false);
  });

  it("allows it when asked, against a _test database", () => {
    expect(mutationAllowed({ CAPTURE_ALLOW_MUTATION: "1" })).toBe(true);
    expect(
      mutationAllowed({
        CAPTURE_ALLOW_MUTATION: "1",
        DATABASE_URL: "postgresql://u@h:5432/granabank_test",
      }),
    ).toBe(true);
  });

  it("refuses when asked while DATABASE_URL names another database", () => {
    expect(() =>
      mutationAllowed({
        CAPTURE_ALLOW_MUTATION: "1",
        DATABASE_URL: "postgresql://u@h:5432/granabank",
      }),
    ).toThrow(/not a _test database/);
  });
});
