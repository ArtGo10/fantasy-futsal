import { useEffect, useState } from "react";

export function useDrawUnlockTicker(drawUnlockAt: number | null) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!drawUnlockAt || nowMs >= drawUnlockAt) return;

    const delayMs = Math.min(Math.max(drawUnlockAt - Date.now(), 250), 1000);
    const timeoutId = setTimeout(() => setNowMs(Date.now()), delayMs);

    return () => clearTimeout(timeoutId);
  }, [drawUnlockAt, nowMs]);

  return nowMs;
}
