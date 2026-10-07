import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import type { Movement } from "../domain/movement";
import { toMovementDto } from "../domain/movement-dto";
import { LOAD_MORE_TIMEOUT_MS, LoadMoreMovements } from "./LoadMoreMovements";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pageOf(count: number, nextCursor: string | null = null) {
  return {
    data: Array.from({ length: count }, () => toMovementDto(makeMovement())),
    total: 40,
    nextCursor,
  };
}

/** A request that only settles when its signal aborts, like a hung server. */
function hangUntilAborted(_input: RequestInfo | URL, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });
}

function renderLoadMore(initialMovements: Movement[] = []) {
  return render(
    <LoadMoreMovements
      filters={{ query: "juan", type: "SENT" }}
      initialMovements={initialMovements}
      initialCursor="cursor-1"
      today="2026-10-07"
    />,
  );
}

beforeEach(() => {
  replace.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LoadMoreMovements", () => {
  it("requests the next page with the active filters and appends it", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(pageOf(2, "cursor-2")));
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/movements?q=juan&type=enviado&cursor=cursor-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(await screen.findAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Se cargaron 2 movimientos más",
    );
    expect(
      screen.getByRole("button", { name: "Cargar más" }),
    ).toBeInTheDocument();
  });

  it("staggers only the rows of the newest page, starting from the first of them", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pageOf(2, "cursor-2")))
      .mockResolvedValueOnce(jsonResponse(pageOf(2)));
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await screen.findAllByRole("link");
    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(4),
    );

    const steps = screen
      .getAllByRole("listitem")
      .map((item) => item.style.getPropertyValue("--row-enter-step"));
    expect(steps.slice(2)).toEqual(["0", "1"]);
  });

  it("merges a page that continues a day into that day's group", async () => {
    const user = userEvent.setup();
    const nextPage = {
      data: [
        makeMovement({ occurredAt: new Date("2026-10-05T12:00:00Z") }),
        makeMovement({ occurredAt: new Date("2026-10-04T12:00:00Z") }),
      ].map(toMovementDto),
      total: 4,
      nextCursor: null,
    };
    fetchMock.mockResolvedValue(jsonResponse(nextPage));
    renderLoadMore([
      makeMovement({ occurredAt: new Date("2026-10-07T12:00:00Z") }),
      makeMovement({ occurredAt: new Date("2026-10-05T18:00:00Z") }),
    ]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(4),
    );
    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual(["Hoy", "5 de octubre", "4 de octubre"]);
    expect(
      within(screen.getByRole("list", { name: "5 de octubre" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
  });

  it("lists a single page without a button or a live region", () => {
    render(
      <LoadMoreMovements
        filters={{}}
        initialMovements={[makeMovement()]}
        initialCursor={null}
        today="2026-10-07"
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides the button after the last page and uses the singular", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(pageOf(1)));
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se cargó 1 movimiento más",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an inline error with Reintentar, and retrying recovers", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500),
      )
      .mockResolvedValueOnce(jsonResponse(pageOf(2)));
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No pudimos cargar más movimientos.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findAllByRole("link")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a response that breaks the contract as an error", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 1 }] }));
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(
      await screen.findByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
  });

  it("sends the user to log in again when the session expired (401), without retrying", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "x" } }, 401),
    );
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?expired=1"),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Reintentar" }),
    ).not.toBeInTheDocument();
  });

  it("ends the pending state while redirecting after a 401, instead of spinning", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "x" } }, 401),
    );
    renderLoadMore();

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Tu sesión venció. Redirigiendo…",
    );
    // Nothing left to press or wait for: the navigation takes over.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("gives up after the timeout and offers to retry", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(hangUntilAborted);
    renderLoadMore();

    act(() => screen.getByRole("button", { name: "Cargar más" }).click());
    expect(screen.getByRole("button", { name: "Cargando…" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOAD_MORE_TIMEOUT_MS);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "No pudimos cargar más movimientos.",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("aborts the request in flight when it unmounts", () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const { unmount } = renderLoadMore();

    act(() => screen.getByRole("button", { name: "Cargar más" }).click());
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
