import { describe, expect, it } from "vitest";

import {
  INITIAL_REVEAL_STATE,
  revealReducer,
  type CardSecrets,
  type RevealState,
} from "./card-reveal";

const SECRETS: CardSecrets = {
  number: "5412751234561234",
  cvv: "042",
  balance: "978.85",
};

function run(...events: Parameters<typeof revealReducer>[1][]): RevealState {
  return events.reduce(revealReducer, INITIAL_REVEAL_STATE);
}

describe("revealReducer", () => {
  it("starts hidden, with nothing in memory", () => {
    expect(INITIAL_REVEAL_STATE).toEqual({ status: "hidden", request: 0 });
  });

  it("asks for the data on toggle, and shows it when that request answers", () => {
    const revealing = run({ type: "toggle" });
    expect(revealing).toEqual({ status: "revealing", request: 1 });

    expect(
      revealReducer(revealing, {
        type: "loaded",
        request: 1,
        secrets: SECRETS,
      }),
    ).toEqual({ status: "revealed", request: 1, secrets: SECRETS });
  });

  it("hides again on the next toggle and forgets the data", () => {
    const state = run(
      { type: "toggle" },
      { type: "loaded", request: 1, secrets: SECRETS },
      { type: "toggle" },
    );
    expect(state).toEqual({ status: "hidden", request: 1 });
    expect(JSON.stringify(state)).not.toContain(SECRETS.number);
  });

  it("toggling while the request is in flight cancels it: a late answer is ignored", () => {
    const state = run(
      { type: "toggle" },
      { type: "toggle" },
      { type: "loaded", request: 1, secrets: SECRETS },
    );
    expect(state).toEqual({ status: "hidden", request: 1 });
  });

  it("ignores an answer to an older request", () => {
    const state = run(
      { type: "toggle" },
      { type: "toggle" },
      { type: "toggle" },
      { type: "loaded", request: 1, secrets: SECRETS },
    );
    expect(state).toEqual({ status: "revealing", request: 2 });
  });

  it("falls back to hidden with an error when the request fails", () => {
    const state = run({ type: "toggle" }, { type: "failed", request: 1 });
    expect(state).toEqual({ status: "hidden", request: 1, error: true });
    // Trying again clears the error.
    expect(revealReducer(state, { type: "toggle" })).toEqual({
      status: "revealing",
      request: 2,
    });
  });

  it("keeps the wait the server asked for when the reveal is rate-limited", () => {
    const state = run(
      { type: "toggle" },
      { type: "failed", request: 1, retryAfterSeconds: 420 },
    );
    expect(state).toEqual({
      status: "hidden",
      request: 1,
      error: true,
      retryAfterSeconds: 420,
    });
  });

  it.each(["expired", "pageHidden"] as const)(
    "re-hides a revealed card on %s",
    (type) => {
      const state = run(
        { type: "toggle" },
        { type: "loaded", request: 1, secrets: SECRETS },
        { type },
      );
      expect(state).toEqual({ status: "hidden", request: 1 });
    },
  );

  it("cancels a pending request when the page is hidden", () => {
    const state = run({ type: "toggle" }, { type: "pageHidden" });
    expect(state).toEqual({ status: "hidden", request: 1 });
    expect(
      revealReducer(state, { type: "loaded", request: 1, secrets: SECRETS }),
    ).toBe(state);
  });

  it("leaves a hidden card alone on expired / pageHidden", () => {
    expect(run({ type: "expired" })).toBe(INITIAL_REVEAL_STATE);
    expect(run({ type: "pageHidden" })).toBe(INITIAL_REVEAL_STATE);
  });
});
