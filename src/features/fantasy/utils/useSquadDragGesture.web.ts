import { useEffect, useRef, type RefObject } from "react";
import type { View } from "react-native";
import type { SquadDragGesture } from "./useSquadDragGesture";
import type { DragPoint } from "./squadInteractions";

export function useSquadDragGesture(
  ref: RefObject<View | null>,
  handlers: SquadDragGesture,
) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const suppressPress = useRef(false);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || !handlers.enabled) return;
    let origin: DragPoint | null = null;
    let active = false;
    let pointerId: number | null = null;
    let touchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const reset = () => {
      clearTimer();
      origin = null;
      active = false;
      pointerId = null;
      touchId = null;
    };
    const cancel = () => {
      if (active) latest.current.cancel();
      reset();
    };
    const begin = (point: DragPoint) => {
      if (!latest.current.enabled) return cancel();
      active = true;
      suppressPress.current = true;
      latest.current.begin(point);
    };
    const finish = (point: DragPoint) => {
      if (active) latest.current.finish(point);
      reset();
    };
    const pointOf = (event: { clientX: number; clientY: number }) => ({
      x: event.clientX,
      y: event.clientY,
    });
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      cancel();
      suppressPress.current = false;
      pointerId = event.pointerId;
      origin = pointOf(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || !origin) return;
      const point = pointOf(event);
      if (!active && Math.hypot(point.x - origin.x, point.y - origin.y) >= 5)
        begin(point);
      if (active) {
        event.preventDefault();
        latest.current.move(point);
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId === pointerId) finish(pointOf(event));
    };
    const onTouchStart = (event: TouchEvent) => {
      cancel();
      suppressPress.current = false;
      if (event.touches.length !== 1) return;
      touchId = event.touches[0].identifier;
      origin = pointOf(event.touches[0]);
      timer = setTimeout(() => {
        if (origin) begin(origin);
      }, 350);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null || !origin) return;
      if (event.touches.length !== 1) return cancel();
      const touch = Array.from(event.touches).find(
        (item) => item.identifier === touchId,
      );
      if (!touch) return cancel();
      const point = pointOf(touch);
      if (!active && Math.hypot(point.x - origin.x, point.y - origin.y) > 8)
        return cancel();
      // Before the hold threshold, leave scrolling entirely to the browser.
      if (active) {
        event.preventDefault();
        latest.current.move(point);
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return cancel();
      const touch = Array.from(event.changedTouches).find(
        (item) => item.identifier === touchId,
      );
      if (!touch) return;
      if (active) event.preventDefault();
      finish(pointOf(touch));
    };
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) suppressPress.current = false;
      if (suppressPress.current && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
      if (event.key === "Enter" || event.key === " ")
        suppressPress.current = false;
    };
    const preventNativeDrag = (event: Event) => event.preventDefault();
    const onContextMenu = (event: Event) => {
      if (touchId !== null || active) event.preventDefault();
    };
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("click", onClick, true);
    node.addEventListener("dragstart", preventNativeDrag);
    node.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("touchcancel", cancel);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("scroll", cancel, true);
    return () => {
      cancel();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("click", onClick, true);
      node.removeEventListener("dragstart", preventNativeDrag);
      node.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", cancel);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("scroll", cancel, true);
    };
  }, [handlers.enabled, ref]);

  return { panHandlers: {}, shouldSuppressPress: () => suppressPress.current };
}
