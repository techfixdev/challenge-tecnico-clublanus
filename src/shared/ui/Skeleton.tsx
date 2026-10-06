import type { CSSProperties } from "react";

/**
 * Placeholder block for loading states, with a shimmer (`skeleton` utility in globals.css,
 * static under reduced motion). Purely visual: the region sets `aria-busy`.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`skeleton block rounded-lg ${className}`}
    />
  );
}
