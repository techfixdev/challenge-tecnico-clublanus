import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAxisDrag, type AxisDragOptions } from "./use-axis-drag";

type Callbacks = Omit<AxisDragOptions, "axis" | "startDirection" | "canStart">;

function Draggable({
  options,
  onClick,
}: {
  options: AxisDragOptions;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useAxisDrag(ref, options);
  return (
    <div ref={ref} data-testid="surface">
      <button type="button" onClick={onClick}>
        Botón
      </button>
    </div>
  );
}

function callbacks(): Callbacks & { [K in keyof Callbacks]-?: Callbacks[K] } {
  return {
    onStart: vi.fn(),
    onMove: vi.fn(),
    onRelease: vi.fn(),
    onCancel: vi.fn(),
  };
}

/** A primary mouse pointer, as a browser reports one. */
const MOUSE = { pointerId: 1, isPrimary: true, button: 0 };

function press(target: Element, x: number, y: number) {
  fireEvent.pointerDown(target, { ...MOUSE, clientX: x, clientY: y });
}
function move(target: Element, x: number, y: number) {
  fireEvent.pointerMove(target, { ...MOUSE, clientX: x, clientY: y });
}
function lift(target: Element, x: number, y: number) {
  fireEvent.pointerUp(target, { ...MOUSE, clientX: x, clientY: y });
}

describe("useAxisDrag", () => {
  beforeEach(() => {
    // jsdom has no pointer capture; the hook only needs the call to exist.
    Element.prototype.setPointerCapture = vi.fn();
  });
  afterEach(() => {
    // @ts-expect-error -- removing the stub put in place above.
    delete Element.prototype.setPointerCapture;
  });

  it("follows a press that moves along its axis past the slop, and releases it", () => {
    const on = callbacks();
    render(<Draggable options={{ axis: "x", canStart: () => true, ...on }} />);
    const surface = screen.getByTestId("surface");

    press(surface, 10, 100);
    move(surface, 15, 100);
    expect(on.onStart).not.toHaveBeenCalled();
    move(surface, 40, 102);
    lift(surface, 40, 102);

    expect(on.onStart).toHaveBeenCalledOnce();
    expect(on.onMove).toHaveBeenLastCalledWith(30);
    expect(on.onRelease).toHaveBeenCalledWith(30, expect.any(Number));
  });

  it("leaves a press moving along the other axis to the browser", () => {
    const on = callbacks();
    render(<Draggable options={{ axis: "x", canStart: () => true, ...on }} />);
    const surface = screen.getByTestId("surface");

    press(surface, 10, 100);
    move(surface, 12, 140);
    move(surface, 80, 140);
    lift(surface, 80, 140);

    expect(on.onStart).not.toHaveBeenCalled();
    expect(on.onRelease).not.toHaveBeenCalled();
  });

  it("only takes a positive start when asked to", () => {
    const on = callbacks();
    render(
      <Draggable
        options={{
          axis: "x",
          startDirection: "positive",
          canStart: () => true,
          ...on,
        }}
      />,
    );
    const surface = screen.getByTestId("surface");

    press(surface, 100, 100);
    move(surface, 60, 100);
    lift(surface, 60, 100);
    expect(on.onStart).not.toHaveBeenCalled();

    press(surface, 100, 100);
    move(surface, 140, 100);
    expect(on.onStart).toHaveBeenCalledOnce();
  });

  it("swallows the click that ends a drag, never a plain tap's", () => {
    const on = callbacks();
    const onClick = vi.fn();
    render(
      <Draggable
        options={{ axis: "y", canStart: () => true, ...on }}
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Botón" });

    press(button, 10, 10);
    move(button, 10, 60);
    lift(button, 10, 60);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    press(button, 10, 10);
    lift(button, 10, 10);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("settles back when the browser takes a drag over", () => {
    const on = callbacks();
    render(<Draggable options={{ axis: "y", canStart: () => true, ...on }} />);
    const surface = screen.getByTestId("surface");

    press(surface, 10, 10);
    move(surface, 10, 60);
    fireEvent.pointerCancel(surface, MOUSE);

    expect(on.onCancel).toHaveBeenCalledOnce();
    expect(on.onRelease).not.toHaveBeenCalled();
  });

  it("still starts a drag after a press that was lifted somewhere else", () => {
    const on = callbacks();
    render(<Draggable options={{ axis: "x", canStart: () => true, ...on }} />);
    const surface = screen.getByTestId("surface");

    // A mouse press that leaves the element before it is a drag: nothing captured the
    // pointer, so its pointerup lands elsewhere and never reaches the element.
    press(surface, 10, 100);
    move(surface, 14, 100);
    lift(document.body, 4, 100);

    // The next press is measured from where it landed, not from the forgotten one.
    press(surface, 200, 300);
    move(surface, 250, 300);
    expect(on.onStart).toHaveBeenCalledOnce();
    expect(on.onMove).toHaveBeenLastCalledWith(50);
  });
});
