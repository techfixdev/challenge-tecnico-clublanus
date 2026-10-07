import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProfileMenu } from "./ProfileMenu";

const USER = {
  firstName: "Granate",
  lastName: "Lanús",
  email: "soygranate@clublanus.com",
};

function renderMenu() {
  const logout = vi.fn(async () => {});
  const user = userEvent.setup();
  render(<ProfileMenu {...USER} logoutAction={logout} />);
  return { user, logout };
}

describe("ProfileMenu", () => {
  it("is a button with the user's initials that opens the profile sheet", async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole("button", { name: "Tu perfil" });
    expect(trigger).toHaveTextContent("GL");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);

    const sheet = screen.getByRole("dialog", { name: "Tu perfil" });
    expect(sheet).toHaveTextContent("Granate Lanús");
    expect(sheet).toHaveTextContent("soygranate@clublanus.com");
  });

  it("asks before signing out, and cancelling keeps the session", async () => {
    const { user, logout } = renderMenu();
    await user.click(screen.getByRole("button", { name: "Tu perfil" }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.getByText("¿Cerrar sesión?")).toBeInTheDocument();
    // The safe choice takes the focus.
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    expect(cancel).toHaveFocus();
    await user.click(cancel);

    expect(logout).not.toHaveBeenCalled();
    expect(screen.queryByText("¿Cerrar sesión?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveFocus();
  });

  it("signs out through the logout action once confirmed", async () => {
    const { user, logout } = renderMenu();
    await user.click(screen.getByRole("button", { name: "Tu perfil" }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Sí, cerrar sesión" }));

    expect(logout).toHaveBeenCalledOnce();
  });

  it("closes from its close button, and opens again at the first view", async () => {
    const { user } = renderMenu();
    await user.click(screen.getByRole("button", { name: "Tu perfil" }));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tu perfil" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Tu perfil" }));
    expect(screen.queryByText("¿Cerrar sesión?")).not.toBeInTheDocument();
  });
});
