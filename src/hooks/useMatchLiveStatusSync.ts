import { useEffect } from "react";

import type { MatchView } from "../types";
import { getErrorMessage } from "../utils/auth";

type SyncLiveStatuses = (args: Record<string, never>) => Promise<unknown>;

export function useMatchLiveStatusSync({
  matches,
  onError,
  syncLiveStatuses,
}: {
  matches: MatchView[] | undefined;
  onError: (message: string) => void;
  syncLiveStatuses: SyncLiveStatuses;
}) {
  useEffect(() => {
    if (!matches) return;

    const syncStartedMatches = () => {
      const hasStartedScheduledMatch = matches.some(
        (match) => (match.storedStatus ?? match.status) === "scheduled" && match.scheduledAt <= Date.now(),
      );

      if (hasStartedScheduledMatch) {
        void syncLiveStatuses({}).catch((error) => {
          onError(getErrorMessage(error));
        });
      }
    };

    syncStartedMatches();

    const now = Date.now();
    const nextScheduledMatch = matches
      .filter((match) => match.status === "scheduled" && match.scheduledAt > now)
      .sort((first, second) => first.scheduledAt - second.scheduledAt)[0];

    if (!nextScheduledMatch) return;

    const delayMs = Math.min(Math.max(nextScheduledMatch.scheduledAt - now + 1000, 1000), 2147483647);
    const timeoutId = setTimeout(syncStartedMatches, delayMs);

    return () => clearTimeout(timeoutId);
  }, [matches, onError, syncLiveStatuses]);
}
