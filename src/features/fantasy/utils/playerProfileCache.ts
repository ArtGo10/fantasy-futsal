import type { FunctionArgs, FunctionReturnType } from "convex/server";

import type { api } from "../../../lib/convexApi";

type ProfileArgs = FunctionArgs<typeof api.fantasy.playerProfile>;
type Profile = FunctionReturnType<typeof api.fantasy.playerProfile>;
type Entry = {
  args: ProfileArgs;
  value: Profile | undefined;
  revision: number;
  pending: symbol | null;
  listeners: Set<() => void>;
};

// Owned by one signed-in user/season session, shared by sheets and full pages.
export function createPlayerProfileCache(
  fetchProfile: (args: ProfileArgs) => Promise<Profile>,
  onError: (error: unknown) => void,
  initialRevision?: unknown,
) {
  const entries = new Map<string, Entry>();
  let revisionSource = initialRevision;
  let revision = 0;
  let enabled = false;
  const keyOf = (args: ProfileArgs) =>
    JSON.stringify([args.seasonSlug ?? null, args.playerId]);

  function ensure(entry: Entry) {
    if (!enabled || entry.pending || entry.revision === revision) return;
    const requestedRevision = revision;
    const request = Symbol();
    entry.pending = request;
    const isCurrent = () =>
      entries.get(keyOf(entry.args)) === entry && entry.pending === request;

    void Promise.resolve()
      .then(() => {
        if (!isCurrent()) return;
        if (!enabled) {
          entry.pending = null;
          return;
        }
        return fetchProfile(entry.args);
      })
      .then(
        (value) => {
          if (!isCurrent()) return;
          entry.pending = null;
          if (requestedRevision !== revision) {
            if (entry.listeners.size) ensure(entry);
            return;
          }
          entry.value = value;
          entry.revision = requestedRevision;
          entry.listeners.forEach((notify) => notify());
        },
        (error: unknown) => {
          if (!isCurrent()) return;
          entry.pending = null;
          if (requestedRevision !== revision) {
            if (entry.listeners.size) ensure(entry);
            return;
          }
          // Keep a successful snapshot on refresh failure; allow retry on next visit.
          if (entry.value === undefined) entry.value = null;
          entry.listeners.forEach((notify) => notify());
          onError(error);
        },
      );
  }

  return {
    getSnapshot(args: ProfileArgs) {
      return entries.get(keyOf(args))?.value;
    },
    subscribe(args: ProfileArgs, notify: () => void) {
      const key = keyOf(args);
      let entry = entries.get(key);
      if (!entry) {
        entry = {
          args,
          value: undefined,
          revision: -1,
          pending: null,
          listeners: new Set(),
        };
        entries.set(key, entry);
      }
      entry.listeners.add(notify);
      ensure(entry);
      return () => {
        entry.listeners.delete(notify);
      };
    },
    configure(nextRevision: unknown, canFetch: boolean) {
      if (revisionSource !== nextRevision) {
        revisionSource = nextRevision;
        revision += 1;
      }
      enabled = canFetch;
      // Closed profiles are refreshed lazily, without clearing their cached content.
      for (const entry of entries.values()) {
        if (entry.listeners.size) ensure(entry);
      }
    },
    clear() {
      enabled = false;
      entries.clear();
    },
  };
}

export type PlayerProfileCache = ReturnType<typeof createPlayerProfileCache>;
