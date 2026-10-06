import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { receiveShareText } from "../domain/account-identifiers";
import { ReceiveDetailsCard } from "./ReceiveDetailsCard";

const mocks = vi.hoisted(() => ({ copyText: vi.fn() }));
vi.mock("@/shared/ui/clipboard", () => ({ copyText: mocks.copyText }));

const DETAILS = {
  holderName: "Granate Lanús",
  alias: "soy.granate.lanus",
  cvu: "0000003100010000000174",
  cvuFormatted: "0000 0031 0001 0000 0001 74",
};

function setShare(share: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
}

beforeEach(() => {
  mocks.copyText.mockResolvedValue(true);
  setShare(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "share");
});

describe("ReceiveDetailsCard", () => {
  it("shows the holder, the alias and the CVU grouped for reading", () => {
    render(<ReceiveDetailsCard details={DETAILS} />);

    expect(screen.getByText("Granate Lanús")).toBeInTheDocument();
    expect(screen.getByText("soy.granate.lanus")).toBeInTheDocument();
    expect(screen.getByText(DETAILS.cvuFormatted)).toBeInTheDocument();
  });

  it("copies the alias and the raw CVU, confirming with “Copiado”", async () => {
    const user = userEvent.setup();
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(screen.getByRole("button", { name: "Copiar alias" }));
    expect(mocks.copyText).toHaveBeenLastCalledWith("soy.granate.lanus");
    expect(
      screen.getByRole("button", { name: "Alias copiado" }),
    ).toHaveTextContent("Copiado");
    expect(screen.getByRole("status")).toHaveTextContent("Alias copiado");

    await user.click(screen.getByRole("button", { name: "Copiar CVU" }));
    expect(mocks.copyText).toHaveBeenLastCalledWith(DETAILS.cvu);
    expect(screen.getByRole("status")).toHaveTextContent("CVU copiado");
  });

  it("returns to “Copiar” after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(screen.getByRole("button", { name: "Copiar alias" }));
    act(() => vi.advanceTimersByTime(2500));

    expect(
      screen.getByRole("button", { name: "Copiar alias" }),
    ).toHaveTextContent("Copiar");
  });

  it("says so when the copy fails", async () => {
    mocks.copyText.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(screen.getByRole("button", { name: "Copiar alias" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "No pudimos copiar. Mantené presionado el texto para copiarlo.",
    );
  });

  it("shares with the Web Share API when available", async () => {
    const share = vi.fn(async () => {});
    setShare(share);
    const user = userEvent.setup();
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(
      screen.getByRole("button", { name: "Compartir mis datos" }),
    );

    expect(share).toHaveBeenCalledWith({
      title: "Mis datos de GranaBank",
      text: receiveShareText(DETAILS),
    });
    expect(mocks.copyText).not.toHaveBeenCalled();
  });

  it("does nothing more when the user closes the share sheet", async () => {
    setShare(
      vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    );
    const user = userEvent.setup();
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(
      screen.getByRole("button", { name: "Compartir mis datos" }),
    );

    expect(mocks.copyText).not.toHaveBeenCalled();
  });

  it("copies a ready-made message where sharing is unavailable", async () => {
    const user = userEvent.setup();
    render(<ReceiveDetailsCard details={DETAILS} />);

    await user.click(
      screen.getByRole("button", { name: "Compartir mis datos" }),
    );

    expect(mocks.copyText).toHaveBeenCalledWith(receiveShareText(DETAILS));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Copiamos tus datos para que los pegues donde quieras",
    );
  });
});
