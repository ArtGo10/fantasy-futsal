type TouchPoint = { pageX: number; pageY: number };

export function createScrollTapGuard() {
  let origin: TouchPoint | null = null;
  let moved = false;
  return {
    start(point: TouchPoint) {
      origin = point;
      moved = false;
    },
    move(point: TouchPoint) {
      if (origin && Math.hypot(point.pageX - origin.pageX, point.pageY - origin.pageY) > 8) {
        moved = true;
      }
    },
    cancel() { moved = true; },
    allowsPress(event?: object) {
      // Web keyboard activation is a click with no pointer. Do not treat a
      // native touch/pointer event with detail=0 as keyboard activation.
      const keyboardClick = event && "type" in event && event.type === "click" &&
        "detail" in event && event.detail === 0;
      return !moved || Boolean(keyboardClick);
    },
  };
}
