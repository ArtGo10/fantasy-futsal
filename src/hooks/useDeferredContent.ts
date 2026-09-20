import { useEffect, useState } from "react";

// Defer only the first visit; returning to prepared content must not flash a skeleton.
export function useDeferredContent(active: boolean, contentKey: string) {
  const [readyKeys, setReadyKeys] = useState(() => new Set<string>());
  const ready = readyKeys.has(contentKey);

  useEffect(() => {
    if (!active || ready) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (!cancelled) {
          setReadyKeys((keys) => new Set(keys).add(contentKey));
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, contentKey, ready]);

  return active && ready;
}
