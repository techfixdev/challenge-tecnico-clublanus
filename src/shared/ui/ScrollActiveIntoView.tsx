"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal list that scrolls its `aria-current` item into view, so a selected chip that
 * starts off-screen (e.g. "Enviado" on a 390px phone) is visible after navigation.
 * The list itself stays server-rendered children; this only adds the scroll behavior.
 */
export function ScrollActiveIntoView({
  activeKey,
  className,
  children,
}: {
  activeKey: string;
  className?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const active =
      listRef.current?.querySelector<HTMLElement>("[aria-current]");
    active?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }, [activeKey]);

  return (
    <ul ref={listRef} className={className}>
      {children}
    </ul>
  );
}
