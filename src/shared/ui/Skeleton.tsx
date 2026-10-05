import type { CSSProperties } from "react";

/** Placeholder block for loading states; purely visual (the region sets `aria-busy`). */
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
      className={`block animate-pulse rounded-lg bg-skeleton motion-reduce:animate-none ${className}`}
    />
  );
}
