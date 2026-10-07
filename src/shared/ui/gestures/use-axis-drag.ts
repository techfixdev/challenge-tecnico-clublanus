"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import {
  AXIS_LOCK_SLOP_PX,
  releaseVelocity,
  lockAxis,
  type Axis,
  type DragSample,
} from "./drag-physics";

export type AxisDragOptions = {
  /** The axis the element is dragged along. */
  axis: Axis;
  /** "positive": only a drag that starts toward +axis (right, down) is taken. */
  startDirection?: "positive" | "any";
  /** Whether this press may become the drag (where it landed, the element's state). */
  canStart: (event: PointerEvent) => boolean;
  /** The drag took over the press (it moved past the slop along `axis`). */
  onStart?: () => void;
  /** The finger is `offset` px from where it pressed, along `axis`. */
  onMove: (offset: number) => void;
  /** The finger lifted at `offset`, moving at `velocity` (px/s). */
  onRelease: (offset: number, velocity: number) => void;
  /** The browser took the press back (a system gesture, a scroll): settle back. */
  onCancel: () => void;
};

type Press = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
  samples: DragSample[];
};

function alongAxis(axis: Axis, event: PointerEvent, press: Press) {
  return axis === "x"
    ? event.clientX - press.startX
    : event.clientY - press.startY;
}

/**
 * A one-axis drag on `ref`'s element, from raw pointer events (mouse, pen, touch).
 *
 * A press only becomes a drag once it has moved a few pixels, and only along `axis`:
 * a press that heads the other way is left to the browser (a vertical page scroll beats
 * a horizontal swipe), and a press that never moves stays a plain tap. Once it is a drag
 * the element captures the pointer, so the gesture follows the finger anywhere, and the
 * click that ends it is swallowed: lifting over a button after a drag never presses it.
 *
 * The element should set `touch-action` so the browser leaves this axis to the page
 * (`pan-y` for a horizontal drag); otherwise a touch drag is cancelled as a scroll.
 * The callbacks are read fresh on every event, so they may close over render state.
 */
export function useAxisDrag(
  ref: RefObject<HTMLElement | null>,
  options: AxisDragOptions,
) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const found = ref.current;
    if (!found) return;
    const element: HTMLElement = found;
    let press: Press | null = null;
    let swallowNextClick = false;

    function endPress() {
      press = null;
      delete element.dataset.dragging;
    }

    function onPointerDown(event: PointerEvent) {
      // A new press: whatever click a previous drag left pending never came.
      swallowNextClick = false;
      if (press || !event.isPrimary || event.button !== 0) return;
      if (!latest.current.canStart(event)) return;
      press = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        // The press itself is the first sample: a flick can be over within a frame or two,
        // too few moves to measure its speed from on their own.
        samples: [{ time: event.timeStamp, position: 0 }],
      };
    }

    function takeOver(event: PointerEvent, current: Press) {
      const { axis, startDirection = "any" } = latest.current;
      const locked = lockAxis(
        event.clientX - current.startX,
        event.clientY - current.startY,
        AXIS_LOCK_SLOP_PX,
      );
      if (locked === null) return false;
      const heading = alongAxis(axis, event, current);
      if (locked !== axis || (startDirection === "positive" && heading <= 0)) {
        endPress();
        return false;
      }
      current.dragging = true;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "";
      latest.current.onStart?.();
      return true;
    }

    function onPointerMove(event: PointerEvent) {
      const current = press;
      if (!current || event.pointerId !== current.pointerId) return;
      if (!current.dragging && !takeOver(event, current)) return;
      const offset = alongAxis(latest.current.axis, event, current);
      current.samples.push({ time: event.timeStamp, position: offset });
      latest.current.onMove(offset);
    }

    function onPointerUp(event: PointerEvent) {
      const current = press;
      if (!current || event.pointerId !== current.pointerId) return;
      endPress();
      if (!current.dragging) return;
      swallowNextClick = true;
      latest.current.onRelease(
        alongAxis(latest.current.axis, event, current),
        releaseVelocity(current.samples, event.timeStamp),
      );
    }

    function onPointerCancel(event: PointerEvent) {
      const current = press;
      if (!current || event.pointerId !== current.pointerId) return;
      endPress();
      if (current.dragging) latest.current.onCancel();
    }

    function onClickCapture(event: MouseEvent) {
      if (!swallowNextClick) return;
      swallowNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerCancel);
    element.addEventListener("click", onClickCapture, { capture: true });
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerCancel);
      element.removeEventListener("click", onClickCapture, { capture: true });
      delete element.dataset.dragging;
    };
  }, [ref]);
}
