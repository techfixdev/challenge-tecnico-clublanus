import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MotionProvider } from "@/shared/ui/motion/MotionProvider";
import { stubReducedMotion } from "@/test/reduced-motion";

import type { ConfirmedRecipient } from "../domain/transfer-form";
import { RecipientCarousel } from "./RecipientCarousel";

const RECENTS: ConfirmedRecipient[] = ["hincha", "socia", "mati", "cami"].map(
  (name) => ({
    fullName: `${name[0].toUpperCase()}${name.slice(1)} Granate`,
    alias: `${name}.granate`,
    cvuMasked: null,
    query: `${name}.granate`,
  }),
);

beforeEach(() => {
  // The springs run: the strip glides, as on a phone.
  stubReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The carousel as the recipient step wires it: choosing someone writes the field. */
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [field, setField] = useState("");
  const chosen = RECENTS.find((recipient) => recipient.query === field);
  return (
    <MotionProvider>
      <RecipientCarousel
        recipients={RECENTS}
        selectedQuery={chosen?.query ?? null}
        onSelect={(recipient) => setField(recipient.query)}
        onPick={(recipient) => setField(recipient.query)}
        disabled={disabled}
      />
      <input
        aria-label="Alias o CVU"
        value={field}
        onChange={(event) => setField(event.target.value)}
      />
    </MotionProvider>
  );
}

/** The strip's translation, as Motion writes it. */
function stripX(): string {
  const tile = screen.getByRole("option", { name: /Hincha Granate/ });
  return tile.parentElement?.style.transform ?? "";
}

describe("RecipientCarousel", () => {
  it("follows an alias typed while the strip is still settling", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("listbox", { name: "Recientes" }).focus();
    // Starts a settle spring toward the second tile...
    await user.keyboard("{ArrowRight}");
    // ...and before it lands, the user types the fourth one's alias.
    const field = screen.getByLabelText("Alias o CVU");
    await user.clear(field);
    await user.type(field, "cami.granate");

    expect(
      screen.getByRole("option", { name: /Cami Granate/ }),
    ).toHaveAttribute("aria-selected", "true");
    // The strip ends on the tile the field names, not on the one it was heading to.
    await waitFor(() => expect(stripX()).toBe("translateX(-324px)"), {
      timeout: 2000,
    });
  });

  it("keeps the choice while a lookup is pending: the arrows do not move it", async () => {
    const user = userEvent.setup();
    render(<Harness disabled />);
    const field = screen.getByLabelText("Alias o CVU");

    screen.getByRole("listbox", { name: "Recientes" }).focus();
    await user.keyboard("{ArrowRight}{End}");

    expect(field).toHaveValue("");
    expect(
      screen.getByRole("option", { name: /Socia Granate/ }),
    ).toHaveAttribute("aria-selected", "false");
  });
});
