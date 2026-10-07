import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MovementActions } from "./MovementActions";

const mocks = vi.hoisted(() => ({ copyText: vi.fn() }));
vi.mock("@/shared/ui/clipboard", () => ({ copyText: mocks.copyText }));

const SHARE_TEXT = "Comprobante de GranaBank\nReferencia: ENV-186Y-CDM8";

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
  Reflect.deleteProperty(navigator, "share");
});

function renderActions(repeatHref: string | null = null) {
  render(
    <MovementActions
      shareText={SHARE_TEXT}
      reference="ENV-186Y-CDM8"
      repeatHref={repeatHref}
    />,
  );
}

describe("MovementActions", () => {
  it("shares the receipt with the Web Share API when available", async () => {
    const share = vi.fn(async () => {});
    setShare(share);
    const user = userEvent.setup();
    renderActions();

    await user.click(
      screen.getByRole("button", { name: "Compartir comprobante" }),
    );

    expect(share).toHaveBeenCalledWith({
      title: "Comprobante de GranaBank",
      text: SHARE_TEXT,
    });
    expect(mocks.copyText).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("does nothing more when the user closes the share sheet", async () => {
    setShare(
      vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    );
    const user = userEvent.setup();
    renderActions();

    await user.click(
      screen.getByRole("button", { name: "Compartir comprobante" }),
    );

    expect(mocks.copyText).not.toHaveBeenCalled();
  });

  it("copies the summary where sharing is unavailable, with a quiet confirmation", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(
      screen.getByRole("button", { name: "Compartir comprobante" }),
    );

    expect(mocks.copyText).toHaveBeenCalledWith(SHARE_TEXT);
    expect(screen.getByRole("status")).toHaveTextContent("Copiado");
  });

  it("copies the reference", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Copiar referencia" }));

    expect(mocks.copyText).toHaveBeenCalledWith("ENV-186Y-CDM8");
    expect(screen.getByRole("status")).toHaveTextContent("Referencia copiada");
  });

  it("says so when nothing could be copied", async () => {
    mocks.copyText.mockResolvedValue(false);
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Copiar referencia" }));

    expect(screen.getByRole("status")).toHaveTextContent("No pudimos copiar");
  });

  it("offers to repeat a transfer only when given where to go", () => {
    renderActions("/transferir?to=hincha.granate");
    expect(
      screen.getByRole("link", { name: "Repetir transferencia" }),
    ).toHaveAttribute("href", "/transferir?to=hincha.granate");
  });

  it("has no repeat action otherwise", () => {
    renderActions(null);
    expect(
      screen.queryByRole("link", { name: "Repetir transferencia" }),
    ).not.toBeInTheDocument();
  });
});
