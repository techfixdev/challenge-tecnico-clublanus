import { expect, type Page } from "@playwright/test";

/** Phones (incl. 320px and Android's page zoom), the 390px design, tablets, desktop. */
export const WIDTHS = [240, 280, 320, 360, 390, 412, 768, 1024];
/** Extreme page zoom: wrapping and stacking are fine, sideways page scroll is not. */
export const EXTREME_WIDTHS = [180, 200];

export type LayoutReport = { overflow: number; problems: string[] };

/**
 * What a narrow viewport breaks: the page scrolling sideways, an element sticking out of
 * the viewport, or text that does not fit its box (spilling over its neighbours, or cut
 * with an ellipsis). Content inside horizontal scroll containers (the filter chips, the
 * card deck, which scrolls from code and into view, never under a wheel) may extend
 * past the viewport, since it scrolls into view, and so may the tiles of a dragged strip
 * (`data-gesture-viewport`, the transfer's recipient carousel): its viewport clips them
 * and the finger brings them in. Visually hidden texts and the odometer strips (taller
 * than their row on purpose) are skipped.
 */
export function auditLayout(page: Page): Promise<LayoutReport> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const problems: string[] = [];
    const describe = (element: Element) =>
      `<${element.tagName.toLowerCase()}> "${(element.textContent ?? "").trim().slice(0, 40)}"`;
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (
        element.closest(
          ".sr-only, [data-digit], [aria-hidden=true], script, style, svg",
        )
      ) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      let inScroller = false;
      for (
        let ancestor = element.parentElement;
        ancestor && ancestor !== document.body;
        ancestor = ancestor.parentElement
      ) {
        const { overflowX, overflowY } = getComputedStyle(ancestor);
        // Hidden on x alone is a row scrolled from code; hidden on both is a clip.
        const scrolledFromCode =
          overflowX === "hidden" && overflowY !== "hidden";
        if (overflowX === "auto" || overflowX === "scroll" || scrolledFromCode)
          inScroller = true;
        if (ancestor.hasAttribute("data-gesture-viewport")) inScroller = true;
      }
      if (!inScroller && rect.right > viewportWidth + 0.5) {
        problems.push(
          `sticks out to ${Math.round(rect.right)}px: ${describe(element)}`,
        );
      }
      const hasOwnText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      if (!hasOwnText || element instanceof HTMLInputElement) continue;
      const style = getComputedStyle(element);
      if (
        style.display !== "inline" &&
        element.scrollWidth > element.clientWidth + 1
      ) {
        const kind = style.textOverflow === "ellipsis" ? "cut" : "spills";
        problems.push(`text ${kind}: ${describe(element)}`);
      }
    }
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      problems: [...new Set(problems)],
    };
  });
}

/**
 * Resizes the current screen through every width and expects it to fit each one; at the
 * extreme widths only the page itself must not scroll sideways.
 */
export async function expectFitsEveryWidth(page: Page, screen: string) {
  await page.evaluate(() => document.fonts.ready);
  for (const width of [...EXTREME_WIDTHS, ...WIDTHS]) {
    await page.setViewportSize({ width, height: 844 });
    const strict = !EXTREME_WIDTHS.includes(width);
    await expect
      .poll(
        async () => {
          const report = await auditLayout(page);
          return strict
            ? report
            : { overflow: report.overflow, problems: [] as string[] };
        },
        { message: `${screen} at ${width}px` },
      )
      .toEqual({ overflow: 0, problems: [] });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
