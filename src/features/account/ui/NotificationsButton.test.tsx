import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NotificationsButton } from "./NotificationsButton";

describe("NotificationsButton", () => {
  it("is an accessible button that announces the feature is coming soon", async () => {
    const user = userEvent.setup();
    render(<NotificationsButton />);

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(status).toHaveTextContent("Próximamente");
  });
});
