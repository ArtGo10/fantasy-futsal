import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AppState,
  Dimensions,
  PanResponder,
  type GestureResponderEvent,
  type View,
} from "react-native";
import type { DragPoint } from "./squadInteractions";

export type SquadDragGesture = {
  enabled: boolean;
  begin: (point: DragPoint) => void;
  move: (point: DragPoint) => void;
  finish: (point: DragPoint) => void;
  cancel: () => void;
};

export function useSquadDragGesture(
  _ref: RefObject<View | null>,
  handlers: SquadDragGesture,
) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const suppressPress = useRef(false);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<DragPoint | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const cancel = () => {
    clearTimer();
    if (active.current) latest.current.cancel();
    active.current = false;
    origin.current = null;
  };
  useEffect(() => {
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancel();
    });
    const dimensions = Dimensions.addEventListener("change", cancel);
    return () => {
      cancel();
      appState.remove();
      dimensions.remove();
    };
  }, []);
  useEffect(() => {
    if (!handlers.enabled) cancel();
  }, [handlers.enabled]);

  const pointOf = (event: GestureResponderEvent) => ({
    x: event.nativeEvent.pageX,
    y: event.nativeEvent.pageY,
  });
  const finish = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length > 0) return cancel();
    clearTimer();
    if (active.current) latest.current.finish(pointOf(event));
    active.current = false;
    origin.current = null;
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) => {
          cancel();
          if (!latest.current.enabled || event.nativeEvent.touches.length !== 1)
            return false;
          suppressPress.current = false;
          origin.current = pointOf(event);
          timer.current = setTimeout(() => {
            if (!origin.current || !latest.current.enabled) return;
            active.current = true;
            suppressPress.current = true;
            latest.current.begin(origin.current);
          }, 350);
          return false;
        },
        onMoveShouldSetPanResponderCapture: (event) => {
          if (event.nativeEvent.touches.length !== 1) {
            cancel();
            return false;
          }
          const point = pointOf(event);
          if (
            !active.current &&
            origin.current &&
            Math.hypot(point.x - origin.current.x, point.y - origin.current.y) >
              8
          )
            cancel();
          return active.current;
        },
        onPanResponderMove: (event) => {
          if (event.nativeEvent.touches.length !== 1) cancel();
          else if (active.current) latest.current.move(pointOf(event));
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: cancel,
        onPanResponderTerminationRequest: () => !active.current,
      }),
    [],
  );

  return {
    panHandlers: {
      ...responder.panHandlers,
      onTouchEnd: finish,
      onTouchCancel: cancel,
    },
    shouldSuppressPress: () => suppressPress.current,
  };
}
