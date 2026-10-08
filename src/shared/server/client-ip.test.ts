import { describe, expect, it } from "vitest";

import { clientIpFrom } from "./client-ip";

function headers(init: Record<string, string>) {
  return new Headers(init);
}

describe("clientIpFrom", () => {
  it("takes the first hop of x-forwarded-for (the client, as Vercel sets it)", () => {
    expect(
      clientIpFrom(
        headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1, 10.0.0.2" }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFrom(headers({ "x-real-ip": "2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("returns null without either header, or with an empty or oversized value", () => {
    expect(clientIpFrom(headers({}))).toBeNull();
    expect(
      clientIpFrom(headers({ "x-forwarded-for": " , 10.0.0.1" })),
    ).toBeNull();
    expect(clientIpFrom(headers({ "x-real-ip": "x".repeat(46) }))).toBeNull();
  });
});
