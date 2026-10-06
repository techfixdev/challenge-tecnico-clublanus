import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { REVEAL_TIMEOUT_MS } from "./card-reveal";
import {
  CardRevealProvider,
  CardRevealToggle,
  RevealedBalance,
  RevealedCardNumber,
  RevealedCvv,
} from "./CardReveal";

const DETAILS = {
  card_mc: { number: "5412751234561234", cvv: "042", balance: "978.85" },
  card_visa: { number: "4539148803435678", cvv: "917", balance: "312400.50" },
} as const;

function Card({
  id,
  phrase,
  last4,
}: {
  id: string;
  phrase: string;
  last4: string;
}) {
  return (
    <section aria-label={phrase}>
      <CardRevealProvider cardId={id} phrase={phrase}>
        <CardRevealToggle className="" />
        <RevealedBalance currency="USD" />
        <RevealedCardNumber last4={last4} />
        <RevealedCvv className="" />
      </CardRevealProvider>
    </section>
  );
}

function renderBoth() {
  return render(
    <>
      <Card
        id="card_mc"
        phrase="tarjeta Mastercard terminada en 1234"
        last4="1234"
      />
      <Card
        id="card_visa"
        phrase="tarjeta Visa terminada en 5678"
        last4="5678"
      />
    </>,
  );
}

const fetchMock = vi.fn();

function answerWithDetails() {
  fetchMock.mockImplementation(async (url: string) => {
    const id = /cards\/(\w+)\/details/.exec(url)![1] as keyof typeof DETAILS;
    return new Response(
      JSON.stringify({ data: { id, currency: "USD", ...DETAILS[id] } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
}

const mastercard = () =>
  screen.getByRole("region", { name: "tarjeta Mastercard terminada en 1234" });
const visa = () =>
  screen.getByRole("region", { name: "tarjeta Visa terminada en 5678" });
const eye = (card: HTMLElement) => within(card).getByRole("button");

beforeEach(() => {
  stubReducedMotion(true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  answerWithDetails();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("card reveal", () => {
  it("starts hidden and fetches nothing until asked", () => {
    renderBoth();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(mastercard()).getByTestId("card-number")).toHaveTextContent(
      "**** **** **** 1234",
    );
    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "•••",
    );
    expect(within(mastercard()).getByText("Saldo oculto")).toBeInTheDocument();
  });

  it("reveals balance, full number and CVV of that card only, fetched without cache", async () => {
    const user = userEvent.setup();
    renderBoth();

    await user.click(eye(mastercard()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/cards/card_mc/details",
      expect.objectContaining({ cache: "no-store" }),
    );
    const card = mastercard();
    expect(await within(card).findByText("978,85 dólares")).toBeInTheDocument();
    expect(within(card).getByTestId("card-number")).toHaveTextContent(
      "5412 7512 3456 1234",
    );
    expect(
      within(card).getByText("Número de tarjeta 5412 7512 3456 1234"),
    ).toHaveClass("sr-only");
    expect(within(card).getByTestId("card-cvv")).toHaveTextContent("042");
    expect(eye(card)).toHaveAttribute("aria-pressed", "true");

    // The other card stays hidden: its eye controls only itself.
    expect(within(visa()).getByText("Saldo oculto")).toBeInTheDocument();
    expect(within(visa()).getByTestId("card-cvv")).toHaveTextContent("•••");
    expect(eye(visa())).toHaveAttribute("aria-pressed", "false");
  });

  it("reveals the balance and CVV but keeps the number masked when the card has none", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "card_mc",
            currency: "USD",
            number: null,
            cvv: "042",
            balance: "978.85",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderBoth();

    await user.click(eye(mastercard()));

    const card = mastercard();
    expect(await within(card).findByText("978,85 dólares")).toBeInTheDocument();
    expect(within(card).getByTestId("card-number")).toHaveTextContent(
      "**** **** **** 1234",
    );
    expect(within(card).getByTestId("card-cvv")).toHaveTextContent("042");
    expect(eye(card)).toHaveAttribute("aria-pressed", "true");
  });

  it("hides again (and forgets the data) on a second tap", async () => {
    const user = userEvent.setup();
    renderBoth();
    await user.click(eye(mastercard()));
    await within(mastercard()).findByText("978,85 dólares");

    await user.click(eye(mastercard()));

    expect(within(mastercard()).getByTestId("card-number")).toHaveTextContent(
      "**** **** **** 1234",
    );
    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "•••",
    );
    expect(document.body).not.toHaveTextContent("5412751234561234");
    expect(document.body).not.toHaveTextContent("5412 7512");
  });

  it(`re-hides by itself after ${REVEAL_TIMEOUT_MS / 1000} seconds`, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBoth();
    await user.click(eye(mastercard()));
    await within(mastercard()).findByText("978,85 dólares");

    act(() => vi.advanceTimersByTime(REVEAL_TIMEOUT_MS - 1000));
    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "042",
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "•••",
    );
    expect(eye(mastercard())).toHaveAttribute("aria-pressed", "false");
  });

  it("re-hides when the tab becomes hidden", async () => {
    const user = userEvent.setup();
    renderBoth();
    await user.click(eye(mastercard()));
    await within(mastercard()).findByText("978,85 dólares");

    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    visibility.mockRestore();

    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "•••",
    );
  });

  it("stays hidden and says so when the server refuses", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), {
        status: 401,
      }),
    );
    const user = userEvent.setup();
    renderBoth();

    await user.click(eye(mastercard()));

    expect(
      await within(mastercard()).findByText(
        "No pudimos mostrar los datos. Probá de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(eye(mastercard())).toHaveAttribute("aria-pressed", "false");
    expect(within(mastercard()).getByTestId("card-cvv")).toHaveTextContent(
      "•••",
    );
  });
});
