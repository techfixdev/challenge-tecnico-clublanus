"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { announceNavigation } from "./navigation";

/**
 * A `next/link` whose navigation carries view-transition types (see navigation.ts). It
 * passes them to Next (`transitionTypes`) and also announces them when tapped, so the
 * screens still move the right way if React drops the types on the way.
 */
export function MotionLink({
  transitionTypes,
  onNavigate,
  ...props
}: ComponentProps<typeof Link> & { transitionTypes: string[] }) {
  return (
    <Link
      {...props}
      transitionTypes={transitionTypes}
      onNavigate={(event) => {
        onNavigate?.(event);
        announceNavigation(transitionTypes);
      }}
    />
  );
}
