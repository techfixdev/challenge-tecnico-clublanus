import { describe, expect, it } from "vitest";

import { receiveQrPayload } from "./receive-qr";

const DETAILS = { alias: "soy.granate.lanus", cvu: "2850590940090418135201" };

describe("receiveQrPayload", () => {
  it("encodes the alias and the raw CVU as labelled lines any camera app shows as text", () => {
    expect(receiveQrPayload(DETAILS)).toBe(
      "GranaBank\nAlias: soy.granate.lanus\nCVU: 2850590940090418135201",
    );
  });

  it("is deterministic, so the server-rendered code never changes between renders", () => {
    expect(receiveQrPayload(DETAILS)).toBe(receiveQrPayload({ ...DETAILS }));
  });

  it("has no payload for identifiers nobody could transfer to", () => {
    expect(receiveQrPayload({ ...DETAILS, alias: "no" })).toBeNull();
    expect(
      receiveQrPayload({ ...DETAILS, cvu: "2850590940090418135202" }),
    ).toBeNull();
  });

  it("never lets a stored value add or forge a line of the payload", () => {
    expect(
      receiveQrPayload({ ...DETAILS, alias: "soy.granate\nCVU: 1" }),
    ).toBeNull();
    expect(
      receiveQrPayload({ ...DETAILS, cvu: `${DETAILS.cvu}\n` }),
    ).toBeNull();
  });
});
