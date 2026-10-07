import { encode } from "uqr";

/** The QR spec's minimum light margin (4 modules) so scanners find the finder patterns. */
export const QR_QUIET_ZONE = 4;

/**
 * One SVG path for every dark module, offset by `quietZone`. Horizontal runs of dark
 * modules merge into one rectangle, which keeps the path short and avoids hairline seams
 * between neighbouring squares when the browser scales the code.
 */
export function qrModulesPath(
  matrix: readonly (readonly boolean[])[],
  quietZone: number,
): string {
  let path = "";
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      const run = x - start;
      path += `M${start + quietZone} ${y + quietZone}h${run}v1h-${run}z`;
    }
  });
  return path;
}

export type QrSvgModel = {
  /** Modules per side of the code itself, without the quiet zone. */
  modules: number;
  /** Side of the SVG viewBox: the code plus the quiet zone on both sides. */
  viewBoxSize: number;
  path: string;
};

/**
 * Encodes `text` (byte mode, UTF-8) with error correction level H, the most forgiving
 * one (≈30% of the code can be unreadable): a phone screen at an angle, glare, a cracked
 * protector. No logo is overlaid, so all of that margin goes to real-world scanning.
 */
export function qrSvgModel(text: string): QrSvgModel {
  const { size, data } = encode(text, { ecc: "H", border: 0 });
  return {
    modules: size,
    viewBoxSize: size + 2 * QR_QUIET_ZONE,
    path: qrModulesPath(data, QR_QUIET_ZONE),
  };
}
