"use client";

import { useLayoutEffect, useRef } from "react";

import { MOVEMENT_FILTERS_HEIGHT_VAR } from "./movement-list-layout";

/**
 * Measures the block it is rendered in (the sticky search and chips, see
 * StickyUnderHeader) and publishes its height on the page's `<main>`, so the day headers
 * of the list stick right under it. It renders nothing visible (`display: none` takes no
 * part in its parent's flex gap) and follows height changes, e.g. the chips wrapping.
 */
export function StickyFiltersHeight() {
  const probe = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const block = probe.current?.parentElement;
    const main = block?.closest("main");
    if (!block || !main) return;
    const publish = () =>
      main.style.setProperty(
        MOVEMENT_FILTERS_HEIGHT_VAR,
        `${block.getBoundingClientRect().height}px`,
      );
    publish();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(publish);
    observer?.observe(block);
    return () => {
      observer?.disconnect();
      main.style.removeProperty(MOVEMENT_FILTERS_HEIGHT_VAR);
    };
  }, []);

  return <span ref={probe} hidden />;
}
