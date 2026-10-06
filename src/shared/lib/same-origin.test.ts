import { describe, expect, it } from "vitest";

import { isCrossOriginRequest } from "./same-origin";

function request(headers: Record<string, string>) {
  return new Request("http://0.0.0.0:3000/api/transfers", {
    method: "POST",
    headers,
  });
}

describe("isCrossOriginRequest", () => {
  it("lets through requests without an Origin header (curl, server-to-server)", () => {
    expect(isCrossOriginRequest(request({ host: "localhost:3000" }))).toBe(
      false,
    );
  });

  it("compares the Origin's host with the Host header, not the address the server listens on", () => {
    // `next dev -H 0.0.0.0` reports 0.0.0.0 as the URL's host; the browser sends its own.
    expect(
      isCrossOriginRequest(
        request({ origin: "http://localhost:3000", host: "localhost:3000" }),
      ),
    ).toBe(false);
    expect(
      isCrossOriginRequest(
        request({
          origin: "http://192.168.100.49:3000",
          host: "192.168.100.49:3000",
        }),
      ),
    ).toBe(false);
  });

  it("prefers x-forwarded-host, the public host behind a proxy (Vercel)", () => {
    expect(
      isCrossOriginRequest(
        request({
          origin: "https://granabank.vercel.app",
          host: "internal:3000",
          "x-forwarded-host": "granabank.vercel.app",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a foreign origin, a different port and a malformed Origin", () => {
    const host = { host: "localhost:3000" };
    expect(
      isCrossOriginRequest(
        request({ ...host, origin: "https://evil.example" }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginRequest(
        request({ ...host, origin: "http://localhost:4000" }),
      ),
    ).toBe(true);
    expect(isCrossOriginRequest(request({ ...host, origin: "null" }))).toBe(
      true,
    );
  });
});
