import type { ReactNode } from "react";
import { vi } from "vitest";

/**
 * The Next App Router runs on its bundled React canary, which exports `<ViewTransition>`;
 * the `react` package the unit tests load (19.2) does not yet. Tests render it as a plain
 * passthrough, which is exactly how a browser without the View Transitions API behaves.
 */
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    ViewTransition:
      react.ViewTransition ??
      (({ children }: { children?: ReactNode }) => children),
  };
});
