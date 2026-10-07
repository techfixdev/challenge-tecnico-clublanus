import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormField, fieldIds } from "./FormField";

function EmailField({ error }: { error?: string }) {
  const ids = fieldIds("email");
  return (
    <FormField name="email" label="Email" error={error}>
      <input
        id={ids.inputId}
        name="email"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? ids.errorId : undefined}
      />
    </FormField>
  );
}

describe("fieldIds", () => {
  it("derives the control id from the field name and the error id from the control", () => {
    expect(fieldIds("password")).toEqual({
      inputId: "password",
      errorId: "password-error",
    });
  });
});

describe("FormField", () => {
  it("labels its control, so it is found by its visible name", () => {
    render(<EmailField />);

    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });

  it("shows no message while the field is valid", () => {
    render(<EmailField />);

    expect(screen.getByRole("textbox", { name: "Email" })).toBeValid();
    expect(document.getElementById(fieldIds("email").errorId)).toBeNull();
  });

  it("shows the error under the control and wires it as the control's description", () => {
    render(<EmailField error="Ingresá un email válido" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Ingresá un email válido");
  });
});
