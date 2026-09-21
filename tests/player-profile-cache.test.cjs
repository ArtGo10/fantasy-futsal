const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const source = ts.transpileModule(fs.readFileSync(require.resolve("../src/features/fantasy/utils/playerProfileCache.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = {};
new Function("exports", source)(loaded);
const { createPlayerProfileCache } = loaded;
const args = { playerId: "player-1", seasonSlug: "extra-liga" };
const profile = { player: { id: args.playerId }, stats: { points: 10 } };
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const calls = [], errors = [];
  const cache = createPlayerProfileCache((args) => new Promise((resolve, reject) => {
    calls.push({ args, resolve, reject });
  }), (error) => errors.push(error), "initial");
  cache.configure("initial", true);
  return { cache, calls, errors };
}

test("profiles load lazily, deduplicate simultaneous views and reopen synchronously without requests", async () => {
  const h = harness();
  assert.equal(h.calls.length, 0);
  assert.equal(h.cache.getSnapshot(args), undefined);
  let updates = 0;
  const closeSheet = h.cache.subscribe(args, () => updates++);
  const closePage = h.cache.subscribe({ ...args }, () => updates++);
  await flush();
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve(profile);
  await flush();
  assert.equal(updates, 2);
  closeSheet(); closePage();
  assert.equal(h.cache.getSnapshot(args), profile);
  const close = h.cache.subscribe(args, () => updates++);
  h.cache.configure("initial", true);
  await flush();
  assert.equal(h.calls.length, 1);
  assert.equal(h.cache.getSnapshot(args), profile);
  close();
});

test("closing a pending profile does not discard its result or start another request on reopen", async () => {
  const h = harness();
  let updates = 0;
  const close = h.cache.subscribe(args, () => updates++);
  await flush(); close();
  const closeAgain = h.cache.subscribe(args, () => updates++);
  await flush();
  assert.equal(h.calls.length, 1);
  closeAgain();
  h.calls[0].resolve(profile);
  await flush();
  assert.equal(updates, 0);
  assert.equal(h.cache.getSnapshot(args), profile);
});

test("live league changes refresh only open profiles and preserve their visible snapshots", async () => {
  const h = harness();
  const other = { ...args, playerId: "player-2" };
  const close = h.cache.subscribe(args, () => {});
  const closeOther = h.cache.subscribe(other, () => {});
  await flush();
  h.calls.forEach((call) => call.resolve(profile));
  await flush(); closeOther();
  h.cache.configure("new-score", true);
  assert.equal(h.cache.getSnapshot(args), profile);
  assert.equal(h.cache.getSnapshot(other), profile);
  await flush();
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.calls[2].args, args);
  const updated = { ...profile, stats: { points: 15 } };
  h.calls[2].resolve(updated);
  await flush();
  assert.equal(h.cache.getSnapshot(args), updated);
  h.cache.subscribe(other, () => {});
  assert.equal(h.cache.getSnapshot(other), profile);
  await flush();
  assert.equal(h.calls.length, 4);
  close();
});

test("an older in-flight result cannot overwrite a newer revision", async () => {
  const h = harness();
  let updates = 0;
  h.cache.subscribe(args, () => updates++);
  await flush();
  h.cache.configure("score-1", true);
  h.cache.configure("score-2", true);
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve(profile);
  await flush();
  assert.equal(h.cache.getSnapshot(args), undefined);
  assert.equal(updates, 0);
  assert.equal(h.calls.length, 2);
  const updated = { ...profile, stats: { points: 15 } };
  h.calls[1].resolve(updated);
  await flush();
  assert.equal(h.cache.getSnapshot(args), updated);
  assert.equal(updates, 1);
});

test("invalidation of a closed pending profile waits until the next visit to fetch again", async () => {
  const h = harness();
  const close = h.cache.subscribe(args, () => {});
  await flush(); close();
  h.cache.configure("new-score", true);
  h.calls[0].resolve(profile);
  await flush();
  assert.equal(h.calls.length, 1);
  h.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.calls.length, 2);
});

test("failed initial load reports once, stops loading, and retries on next visit", async () => {
  const h = harness();
  const close = h.cache.subscribe(args, () => {});
  await flush();
  const error = new Error("offline");
  h.calls[0].reject(error);
  await flush();
  assert.equal(h.cache.getSnapshot(args), null);
  assert.deepEqual(h.errors, [error]);
  assert.equal(h.calls.length, 1);
  close();
  h.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.calls.length, 2);
  h.calls[1].resolve(profile);
  await flush();
  assert.equal(h.cache.getSnapshot(args), profile);
});

test("background refresh failure retains the previous profile", async () => {
  const h = harness();
  h.cache.subscribe(args, () => {});
  await flush(); h.calls[0].resolve(profile); await flush();
  h.cache.configure("new-score", true);
  await flush(); h.calls[1].reject(new Error("offline")); await flush();
  assert.equal(h.cache.getSnapshot(args), profile);
  assert.equal(h.calls.length, 2);
  assert.equal(h.errors.length, 1);
});

test("a successful unavailable result is cached rather than retried on every open", async () => {
  const h = harness();
  const close = h.cache.subscribe(args, () => {});
  await flush(); h.calls[0].resolve(null); await flush(); close();
  h.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.cache.getSnapshot(args), null);
  assert.equal(h.calls.length, 1);
});

test("offline invalidation starts no requests and resumes only needed profiles on reconnect", async () => {
  const h = harness();
  h.cache.configure("initial", false);
  h.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.calls.length, 0);
  h.cache.configure("new-score", false);
  h.cache.configure("new-score", true);
  await flush();
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve(profile); await flush();
  h.cache.configure("new-score", false);
  h.cache.configure("new-score", true);
  await flush();
  assert.equal(h.calls.length, 1);
});

test("session reset ignores late results and errors; a fresh session cannot expose another account", async () => {
  const h = harness();
  h.cache.subscribe(args, () => assert.fail("old session notified"));
  h.cache.subscribe({ ...args, playerId: "player-2" }, () => assert.fail("old session notified"));
  await flush();
  h.cache.clear();
  const next = harness();
  next.cache.subscribe(args, () => {});
  h.calls[0].resolve(profile);
  h.calls[1].reject(new Error("stale session"));
  await flush();
  assert.equal(h.cache.getSnapshot(args), undefined);
  assert.equal(next.cache.getSnapshot(args), undefined);
  assert.deepEqual(h.errors, []);
});

test("clearing before a scheduled fetch prevents it and supports strict-mode effect replay", async () => {
  const h = harness();
  const close = h.cache.subscribe(args, () => {});
  close(); h.cache.clear();
  await flush();
  assert.equal(h.calls.length, 0);
  h.cache.subscribe(args, () => {});
  h.cache.configure("initial", true);
  await flush();
  assert.equal(h.calls.length, 1);
  h.calls[0].resolve(profile); await flush();
  assert.equal(h.cache.getSnapshot(args), profile);
});

test("profiles are keyed by both player and season", async () => {
  const h = harness();
  const otherSeason = { ...args, seasonSlug: "ekstraklasa" };
  const otherPlayer = { ...args, playerId: "player-2" };
  h.cache.subscribe(args, () => {});
  h.cache.subscribe(otherSeason, () => {});
  h.cache.subscribe(otherPlayer, () => {});
  await flush();
  assert.equal(h.calls.length, 3);
  h.calls[0].resolve(profile); await flush();
  assert.equal(h.cache.getSnapshot(otherSeason), undefined);
  assert.equal(h.cache.getSnapshot(otherPlayer), undefined);
});

function ownerHarness() {
  let cursor = 0, pendingEffects = [];
  const hooks = [], requests = [];
  const client = {
    query: async (_query, args) => { requests.push(args); return profile; },
    mutation: async () => {},
  };
  const changed = (index, deps) => !hooks[index] || deps.some((dep, i) => dep !== hooks[index].deps[i]);
  const mocks = {
    "convex/react": { useConvex: () => client },
    react: {
      createContext: () => ({ Provider: "Provider" }),
      useMemo(fn, deps) {
        const index = cursor++;
        if (changed(index, deps)) hooks[index] = { deps, value: fn() };
        return hooks[index].value;
      },
      useEffect(fn, deps) {
        const index = cursor++;
        if (changed(index, deps)) pendingEffects.push(() => {
          hooks[index]?.cleanup?.();
          hooks[index] = { deps, cleanup: fn() };
        });
      },
    },
    "../../../lib/convexApi": { api: { fantasy: { playerProfile: "profile" }, appDiagnostics: {} } },
    "../../../utils/crashReporter": {},
    "./playerProfileCache": { createPlayerProfileCache },
  };
  const context = {};
  const source = ts.transpileModule(fs.readFileSync(require.resolve("../src/features/fantasy/utils/playerProfileCacheContext.tsx"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", source)((id) => mocks[id], context);
  return {
    requests,
    render(options) {
      cursor = 0;
      const result = context.usePlayerProfileCacheSession(options);
      pendingEffects.forEach((effect) => effect());
      pendingEffects = [];
      return result;
    },
    unmount() { hooks.forEach((hook) => hook.cleanup?.()); },
  };
}

test("the root cache owner survives rerenders and data revisions but clears on account/season changes", async () => {
  const h = ownerHarness();
  const options = { scopeKey: "user-1:extra-liga", seasonSlug: "extra-liga", enabled: true, revision: {} };
  const session = h.render(options);
  assert.equal(h.requests.length, 0);
  session.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.render({ ...options }), session);
  assert.equal(h.requests.length, 1);
  const revised = h.render({ ...options, revision: {} });
  assert.equal(revised, session);
  assert.equal(revised.cache.getSnapshot(args), profile);
  await flush();
  assert.equal(h.requests.length, 2);

  const otherAccount = h.render({ ...options, scopeKey: "user-2:extra-liga" });
  assert.notEqual(otherAccount, session);
  assert.equal(session.cache.getSnapshot(args), undefined);
  assert.equal(otherAccount.cache.getSnapshot(args), undefined);
  otherAccount.cache.subscribe(args, () => {});
  await flush();
  const otherSeason = h.render({ ...options, scopeKey: "user-2:ekstraklasa", seasonSlug: "ekstraklasa" });
  assert.notEqual(otherSeason, otherAccount);
  assert.equal(otherAccount.cache.getSnapshot(args), undefined);
  assert.equal(otherSeason.seasonSlug, "ekstraklasa");
  h.unmount();
});

test("sign-out drops cached profiles and disabled root access does not fetch", async () => {
  const h = ownerHarness();
  const options = { scopeKey: "user-1:extra-liga", seasonSlug: "extra-liga", enabled: false, revision: {} };
  const session = h.render(options);
  session.cache.subscribe(args, () => {});
  await flush();
  assert.equal(h.requests.length, 0);
  assert.equal(h.render({ ...options, enabled: true }), session);
  await flush();
  assert.equal(session.cache.getSnapshot(args), profile);
  assert.equal(h.render({ ...options, scopeKey: undefined }), null);
  assert.equal(session.cache.getSnapshot(args), undefined);
});
