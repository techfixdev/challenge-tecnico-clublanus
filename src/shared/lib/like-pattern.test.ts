import { describe, expect, it } from "vitest";

import { containsPattern, escapeLikePattern } from "./like-pattern";

describe("escapeLikePattern", () => {
  it("leaves plain text untouched, accents included", () => {
    expect(escapeLikePattern("José Suárez")).toBe("José Suárez");
  });

  it("escapes the LIKE wildcards % and _", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes the escape character itself", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
    expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
  });

  it("does not treat SQL quotes specially (they travel as a bound parameter)", () => {
    expect(escapeLikePattern("' OR 1=1 --")).toBe("' OR 1=1 --");
  });
});

describe("containsPattern", () => {
  it("wraps the escaped term in % wildcards", () => {
    expect(containsPattern("adobe")).toBe("%adobe%");
    expect(containsPattern("%")).toBe("%\\%%");
  });
});
