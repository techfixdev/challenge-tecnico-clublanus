import { describe, expect, it } from "vitest";

import { QR_QUIET_ZONE, qrModulesPath, qrSvgModel } from "./qr-matrix";

describe("qrModulesPath", () => {
  it("draws one unit square per dark module, offset by the quiet zone", () => {
    const path = qrModulesPath(
      [
        [true, false],
        [false, true],
      ],
      4,
    );
    expect(path).toBe("M4 4h1v1h-1zM5 5h1v1h-1z");
  });

  it("merges horizontal runs of dark modules into one rectangle", () => {
    expect(qrModulesPath([[true, true, true, false, true]], 0)).toBe(
      "M0 0h3v1h-3zM4 0h1v1h-1z",
    );
  });
});

describe("qrSvgModel", () => {
  it("encodes the text with high error correction and a 4-module quiet zone", () => {
    const model = qrSvgModel("GranaBank\nAlias: soy.granate.lanus");
    expect(QR_QUIET_ZONE).toBe(4);
    // Version 1 is 21 modules; every version adds 4.
    expect((model.modules - 21) % 4).toBe(0);
    expect(model.viewBoxSize).toBe(model.modules + 2 * QR_QUIET_ZONE);
    expect(model.path.startsWith("M4 4h7v1h-7z")).toBe(true); // finder pattern's top edge
  });
});
