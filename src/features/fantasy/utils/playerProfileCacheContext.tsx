import { useConvex } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../lib/convexApi";
import {
  createCrashReport,
  storeCrashReport,
} from "../../../utils/crashReporter";
import {
  createPlayerProfileCache,
  type PlayerProfileCache,
} from "./playerProfileCache";

type CacheSession = { cache: PlayerProfileCache; seasonSlug: string };
const PlayerProfileCacheContext = createContext<CacheSession | null>(null);
export const PlayerProfileCacheProvider = PlayerProfileCacheContext.Provider;

export function usePlayerProfileCacheSession({
  scopeKey,
  seasonSlug,
  enabled,
  revision,
}: {
  scopeKey: string | undefined;
  seasonSlug: string | null;
  enabled: boolean;
  revision: unknown;
}) {
  const client = useConvex();
  const session = useMemo(() => {
    if (!scopeKey || !seasonSlug) return null;
    const cache = createPlayerProfileCache(
      (args) => client.query(api.fantasy.playerProfile, args),
      (error) => {
        const report = createCrashReport({
          error,
          fatal: false,
          source: "queryError",
        });
        void client
          .mutation(api.appDiagnostics.submitCrashReport, { report })
          .catch(() => storeCrashReport(report));
      },
    );
    return { cache, seasonSlug };
  }, [client, scopeKey, seasonSlug]);

  useEffect(() => {
    session?.cache.configure(revision, enabled);
  }, [session, revision, enabled]);
  useEffect(() => () => session?.cache.clear(), [session]);
  return session;
}

export function useCachedPlayerProfile(
  playerId: Id<"fantasyPlayers"> | null,
  enabled: boolean,
  seasonSlug?: string | null,
) {
  const session = useContext(PlayerProfileCacheContext);
  const cache = session?.cache;
  const args = useMemo(
    () => enabled && playerId && session
      ? { playerId, seasonSlug: seasonSlug ?? session.seasonSlug }
      : null,
    [enabled, playerId, seasonSlug, session],
  );
  const subscribe = useCallback(
    (notify: () => void) => args && cache
      ? cache.subscribe(args, notify)
      : () => {},
    [args, cache],
  );
  const getSnapshot = useCallback(
    () => args && cache ? cache.getSnapshot(args) : null,
    [args, cache],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
