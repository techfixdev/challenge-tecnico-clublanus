import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LOGIN_MESSAGES } from "../domain/login-schema";
import type { LoginAction, LoginFormState } from "../domain/login-form-state";
import { LoginForm } from "./LoginForm";

function renderForm(
  action: LoginAction = vi.fn(async (state: LoginFormState) => state),
) {
  const user = userEvent.setup();
  render(<LoginForm action={action} />);
  return {
    user,
    action,
    email: screen.getByLabelText("Email"),
    password: screen.getByLabelText("Contraseña"),
    submit: screen.getByRole("button", { name: "Ingresar" }),
  };
}

describe("LoginForm", () => {
  it("renders the design copy, labels and placeholders", () => {
    const { email, password } = renderForm();

    expect(
      screen.getByRole("heading", { level: 1, name: "GranaBank" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Con cada compra, sumás orgullo granate"),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("placeholder", "Ingresá tu email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("placeholder", "Ingresá tu contraseña");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Recordarme")).not.toBeChecked();
  });

  it("shows field errors and does not submit when the form is invalid", async () => {
    const { user, action, email, password, submit } = renderForm();

    await user.click(submit);

    expect(
      await screen.findByText(LOGIN_MESSAGES.emailRequired),
    ).toHaveAttribute("id", "email-error");
    expect(screen.getByText(LOGIN_MESSAGES.passwordRequired)).toHaveAttribute(
      "id",
      "password-error",
    );
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-describedby", "password-error");
    expect(action).not.toHaveBeenCalled();
  });

  it("flags a malformed email", async () => {
    const { user, email, password, submit } = renderForm();

    await user.type(email, "soygranate@");
    await user.type(password, "secret");
    await user.click(submit);

    expect(
      await screen.findByText(LOGIN_MESSAGES.emailInvalid),
    ).toBeInTheDocument();
    expect(password).toHaveAttribute("aria-invalid", "false");
  });

  it("submits valid data and shows the generic credentials error from the server", async () => {
    const action = vi.fn<LoginAction>(async () => ({
      formError: LOGIN_MESSAGES.invalidCredentials,
      values: { email: "soygranate@clublanus.com", remember: true },
    }));
    const { user, email, password, submit } = renderForm(action);

    await user.type(email, "soygranate@clublanus.com");
    await user.type(password, "wrong");
    await user.click(screen.getByLabelText("Recordarme"));
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      LOGIN_MESSAGES.invalidCredentials,
    );
    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0][1];
    expect(formData.get("email")).toBe("soygranate@clublanus.com");
    expect(formData.get("remember")).toBe("on");
    // The typed email survives the round trip; the password does not.
    await waitFor(() =>
      expect(screen.getByLabelText("Email")).toHaveValue(
        "soygranate@clublanus.com",
      ),
    );
  });

  it("toggles password visibility with an accessible button", async () => {
    const { user, password } = renderForm();
    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });

    expect(password).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-controls", "password");

    await user.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows a pending state while the action runs", async () => {
    let resolve: (state: LoginFormState) => void = () => {};
    const action = vi.fn<LoginAction>(
      () =>
        new Promise<LoginFormState>((r) => {
          resolve = r;
        }),
    );
    const { user, email, password, submit } = renderForm(action);

    await user.type(email, "soygranate@clublanus.com");
    await user.type(password, "GRANATE1@");
    await user.click(submit);

    const pending = await screen.findByRole("button", { name: "Ingresando…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    resolve({});
    expect(
      await screen.findByRole("button", { name: "Ingresar" }),
    ).toBeEnabled();
  });
});
