import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReceiveQrCard } from "./ReceiveQrCard";

const DETAILS = { alias: "soy.granate.lanus", cvu: "2850590940090418135201" };

describe("ReceiveQrCard", () => {
  it("shows the QR code of the alias and CVU under its own heading", () => {
    render(<ReceiveQrCard details={DETAILS} />);

    expect(
      screen.getByRole("region", { name: "Tu código QR" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Código QR con tu alias soy.granate.lanus y tu CVU",
      }),
    ).toBeInTheDocument();
  });

  it("renders nothing, instead of breaking the screen, when the identifiers are not valid", () => {
    const { container } = render(
      <ReceiveQrCard details={{ ...DETAILS, cvu: "123" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
