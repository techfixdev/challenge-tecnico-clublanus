import { expect, test, type Page } from "@playwright/test";

/*
 * The payment cards scale with their own width (container units), so nothing inside
 * them may be clipped or pushed out on narrow phones, under Android's page zoom (which
 * shrinks the CSS viewport well below 320px) or on tablets.
 */

const WIDTHS = [240, 280, 320, 390, 768];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Elements of each card that leave the card's content box (its padding excluded), plus
 * a clipped number line. The odometer strips are taller than their row on purpose (the
 * row clips them), and the screen-reader texts are visually hidden, so both are skipped.
 */
function cardOverflows(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("section[data-brand]")].flatMap(
      (card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        // The carousel scales the cards that are not in front; padding scales with them.
        const scale = rect.width / card.offsetWidth;
        const box = {
          left: rect.left + parseFloat(style.paddingLeft) * scale,
          right: rect.right - parseFloat(style.paddingRight) * scale,
          top: rect.top + parseFloat(style.paddingTop) * scale,
          bottom: rect.bottom - parseFloat(style.paddingBottom) * scale,
        };
        const escaping = [...card.querySelectorAll("*")]
          .filter((element) => !element.closest("[data-digit], .sr-only"))
          .filter((element) => {
            const r = element.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return (
              r.left < box.left - 0.5 ||
              r.right > box.right + 0.5 ||
              r.top < box.top - 0.5 ||
              r.bottom > box.bottom + 0.5
            );
          })
          .map(
            (element) =>
              `${card.dataset.brand}: <${element.tagName.toLowerCase()}> "${element.textContent?.trim() ?? ""}"`,
          );
        const number = card.querySelector<HTMLElement>(
          "[data-testid=card-number]",
        )!;
        if (number.scrollWidth > number.clientWidth) {
          escaping.push(`${card.dataset.brand}: clipped card number`);
        }
        return escaping;
      },
    ),
  );
}

test("the cards fit their content at every width and the page never scrolls sideways", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => document.fonts.ready);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => cardOverflows(page), { message: `cards at ${width}px` })
      .toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBe(0);
  }
});
