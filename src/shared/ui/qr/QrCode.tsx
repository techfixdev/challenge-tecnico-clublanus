import { qrSvgModel } from "./qr-matrix";

type QrCodeProps = {
  /** The text to encode. */
  value: string;
  /** What the code is, for screen readers (the SVG is one image). */
  label: string;
  className?: string;
};

/**
 * A QR code as inline SVG, computed on the server (no client JS, no image request):
 * garnet modules on a white quiet zone. It has no intrinsic size, so it fills its
 * container's width; `crispEdges` keeps module edges sharp at any scale.
 */
export function QrCode({ value, label, className = "" }: QrCodeProps) {
  const { viewBoxSize, path } = qrSvgModel(value);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className={`block aspect-square h-auto w-full ${className}`}
    >
      <rect width={viewBoxSize} height={viewBoxSize} className="fill-surface" />
      <path d={path} className="fill-primary" />
    </svg>
  );
}
