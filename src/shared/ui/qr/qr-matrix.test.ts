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

/* -------------------------------------------------------------------------------------
 * A minimal, independent QR reader for the test: it rebuilds the module grid from the
 * SVG path and decodes it per ISO/IEC 18004, for versions 1–2 (one error-correction
 * block, no version information) in byte mode. Decoding what was drawn, instead of
 * comparing with the encoder's own output, proves the picture carries the payload.
 * ----------------------------------------------------------------------------------- */

/** The dark modules the path draws, as a `modules`-sided grid (quiet zone removed). */
function gridFromPath(path: string, modules: number, quietZone: number) {
  const grid = Array.from({ length: modules }, () =>
    Array<boolean>(modules).fill(false),
  );
  for (const [, x, y, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(run); i++) {
      grid[Number(y) - quietZone]![Number(x) - quietZone + i] = true;
    }
  }
  return grid;
}

const ECC_LEVEL_BY_BITS = { 0b01: "L", 0b00: "M", 0b11: "Q", 0b10: "H" };

/** Error-correction level and mask pattern, from the format bits around the top-left finder. */
function readFormat(grid: boolean[][]) {
  // prettier-ignore
  const positions: Array<[row: number, column: number]> = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const raw = positions.reduce(
    (bits, [row, column]) => (bits << 1) | Number(grid[row]![column]),
    0,
  );
  const format = raw ^ 0b101010000010010;
  return {
    eccLevel:
      ECC_LEVEL_BY_BITS[(format >> 13) as keyof typeof ECC_LEVEL_BY_BITS],
    mask: (format >> 10) & 0b111,
  };
}

const MASKS: Array<(row: number, column: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Finders with their separators and format areas, timing lines, version 2's alignment. */
function isFunctionModule(row: number, column: number, size: number) {
  const nearFinder =
    (row < 9 && column < 9) ||
    (row < 9 && column >= size - 8) ||
    (row >= size - 8 && column < 9);
  const onTiming = row === 6 || column === 6;
  const onAlignment =
    size === 25 && Math.abs(row - 18) <= 2 && Math.abs(column - 18) <= 2;
  return nearFinder || onTiming || onAlignment;
}

/** Data bits in placement order: two-column strips from the right, zigzagging. */
function readDataBits(grid: boolean[][], mask: number) {
  const size = grid.length;
  const bits: number[] = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5; // the vertical timing line is skipped
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const column of [right, right - 1]) {
        if (isFunctionModule(row, column, size)) continue;
        bits.push(Number(grid[row]![column] !== MASKS[mask]!(row, column)));
      }
    }
    upward = !upward;
  }
  return bits;
}

/** The byte-mode payload of a version 1–2 code. */
function decodeQr(grid: boolean[][]) {
  const { eccLevel, mask } = readFormat(grid);
  const bits = readDataBits(grid, mask);
  const read = (from: number, count: number) =>
    bits.slice(from, from + count).reduce((value, bit) => value * 2 + bit, 0);
  const mode = read(0, 4);
  const length = read(4, 8);
  const bytes = Array.from({ length }, (_, i) => read(12 + i * 8, 8));
  return {
    eccLevel,
    isByteMode: mode === 0b0100,
    text: new TextDecoder().decode(Uint8Array.from(bytes)),
  };
}

describe("qrSvgModel", () => {
  it("draws a code that decodes back to the exact text, at error correction level H", () => {
    // 9 bytes at level H take version 2 (25 modules), with its alignment pattern.
    const text = "GranaBank";
    const model = qrSvgModel(text);
    expect(model.modules).toBe(25);

    const decoded = decodeQr(
      gridFromPath(model.path, model.modules, QR_QUIET_ZONE),
    );

    expect(decoded).toEqual({ eccLevel: "H", isByteMode: true, text });
  });

  it("decodes non-ASCII text as UTF-8", () => {
    const text = "Lanús ñ";
    const model = qrSvgModel(text);

    const decoded = decodeQr(
      gridFromPath(model.path, model.modules, QR_QUIET_ZONE),
    );

    expect(decoded.text).toBe(text);
  });

  it("frames the code in the 4-module quiet zone scanners need", () => {
    const model = qrSvgModel("GranaBank\nAlias: soy.granate.lanus");
    expect(QR_QUIET_ZONE).toBe(4);
    // Version 1 is 21 modules; every version adds 4.
    expect((model.modules - 21) % 4).toBe(0);
    expect(model.viewBoxSize).toBe(model.modules + 2 * QR_QUIET_ZONE);
    expect(model.path.startsWith("M4 4h7v1h-7z")).toBe(true); // finder pattern's top edge
  });
});
