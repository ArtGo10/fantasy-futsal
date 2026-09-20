const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function compile(path) {
  const filename = require.resolve(path);
  return ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
}

function nodesOf(tree) {
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    nodes.push(node);
    visit(node.props.children);
  }
  visit(tree);
  return nodes;
}

const player = { id: "player-1", displayName: "Player", status: "active", photoUrl: "photo.png" };
const readyProfile = { player, matches: [], matchHistory: [], upcomingFixtures: [] };

function renderProfile(presentation, { profile, photoLoading = false, canQuery = true, fallback = player } = {}) {
  const loaded = {};
  const mocks = {
    react: { useEffect: () => {} },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-native": {
      Platform: { OS: "web" }, useWindowDimensions: () => ({ width: presentation === "page" ? 1440 : 390 }),
      View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView",
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../../../constants": { WEB_DESKTOP_MIN_WIDTH: 1024 },
    "../../../i18n/I18nProvider": { useI18n: () => ({ t: (key) => key }) },
    "../../../styles": { styles: {} },
    "../../../theme/tokens": { colors: { brand: {}, text: {} } },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({}) },
    "../../../lib/convexApi": { api: { fantasy: { playerProfile: "profile" } } },
    "../utils/playerProfileCacheContext": { useCachedPlayerProfile: () => profile },
    "../utils/usePlayerProfilePhoto": { usePlayerProfilePhoto: () => ({ isLoading: photoLoading, photoUrl: photoLoading ? null : player.photoUrl }) },
    "./PlayerAvatar": { PlayerAvatar: "Avatar" },
    "./PlayerProfileSkeleton": { PlayerProfileSkeleton: "Skeleton" },
    "./PlayerProfileStatistics": { PlayerProfileStatistics: "Statistics" },
    "./BottomSheet": { BottomSheet: "BottomSheet" },
  };
  const component = presentation === "page" ? "PlayerProfilePage" : "PlayerDetailSheet";
  new Function("require", "exports", compile(`../src/features/fantasy/components/${component}.tsx`))(
    (id) => mocks[id] ?? {}, loaded,
  );
  return nodesOf(loaded[component]({
    player, fallbackPlayer: fallback, playerId: player.id, canQueryPrivateData: canQuery,
    actions: require("react").createElement("Actions"),
    onAdd: () => {}, onBack: () => {}, onClose: () => {}, mode: "market", visible: true,
  }));
}

for (const presentation of ["page", "sheet"]) {
  test(`${presentation}: fallback player cannot reveal a partial profile while the query is pending`, () => {
    const nodes = renderProfile(presentation);
    assert.ok(nodes.some((node) => node.type === "Skeleton"));
    assert.equal(nodes.some((node) => node.type === "Statistics" || node.type === "Avatar" || node.type === "Actions"), false);
    assert.equal(nodes.some((node) => node.props.children === "playerDetails.add"), false);
  });

  test(`${presentation}: loaded data waits for the photo, then releases the complete profile and actions`, () => {
    const pending = renderProfile(presentation, { profile: readyProfile, photoLoading: true });
    assert.ok(pending.some((node) => node.type === "Skeleton"));
    assert.equal(pending.some((node) => node.type === "Statistics"), false);
    const ready = renderProfile(presentation, { profile: readyProfile });
    assert.equal(ready.some((node) => node.type === "Skeleton"), false);
    assert.ok(ready.some((node) => node.type === "Statistics"));
    assert.ok(ready.some((node) => node.type === "Actions" || node.props.children === "playerDetails.add"));
  });

  test(`${presentation}: query failure or disabled access stops loading without showing misleading empty stats`, () => {
    for (const args of [{ profile: null }, { canQuery: false }]) {
      const nodes = renderProfile(presentation, args);
      assert.equal(nodes.some((node) => node.type === "Skeleton" || node.type === "Statistics"), false);
      assert.ok(nodes.some((node) => node.props.children === "team.viewer.playerUnavailable"));
    }
  });
}

test("page without a fallback still reserves the full profile structure while loading", () => {
  assert.ok(renderProfile("page", { fallback: null }).some((node) => node.type === "Skeleton"));
});

function photoHarness() {
  let states = [], effects = [], cursor = 0, pendingEffects = [], nextTimer = 0;
  const timers = new Map();
  const requests = [];
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect(fn, deps) {
        const index = cursor++;
        if (!effects[index] || deps.some((value, i) => value !== effects[index].deps[i])) {
          pendingEffects.push(() => {
            effects[index]?.cleanup?.();
            effects[index] = { deps, cleanup: fn() };
          });
        }
      },
    },
    "expo-image": {
      Image: { prefetch: (url, cachePolicy) => new Promise((resolve, reject) => {
        requests.push({ url, cachePolicy, resolve, reject });
      }) },
    },
  };
  const loaded = {};
  new Function("require", "exports", "setTimeout", "clearTimeout", compile("../src/features/fantasy/utils/usePlayerProfilePhoto.ts"))(
    (id) => mocks[id], loaded,
    (fn) => { timers.set(++nextTimer, fn); return nextTimer; },
    (id) => timers.delete(id),
  );
  return {
    requests, timers,
    render(url, enabled = true) {
      cursor = 0;
      const result = loaded.usePlayerProfilePhoto(url, enabled);
      const effectsToRun = pendingEffects;
      pendingEffects = [];
      effectsToRun.forEach((fn) => fn());
      return result;
    },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
      states = []; effects = [];
    },
  };
}

test("photo is prefetched once and a revisited profile uses the warm cache without a skeleton", async () => {
  const harness = photoHarness();
  assert.equal(harness.render("photo.png").isLoading, true);
  assert.equal(harness.requests[0].cachePolicy, "memory-disk");
  harness.requests[0].resolve(true);
  await Promise.resolve();
  assert.deepEqual(harness.render("photo.png"), { isLoading: false, photoUrl: "photo.png" });
  harness.unmount();
  assert.equal(harness.render("photo.png").isLoading, false);
  assert.equal(harness.requests.length, 1);
});

for (const failure of ["reject", "false", "timeout"]) {
  test(`photo ${failure} releases the profile with a placeholder and clears the timer`, async () => {
    const harness = photoHarness();
    harness.render("photo.png");
    if (failure === "reject") harness.requests[0].reject(new Error("Image unavailable"));
    if (failure === "false") harness.requests[0].resolve(false);
    if (failure === "timeout") harness.timers.values().next().value();
    await Promise.resolve();
    assert.deepEqual(harness.render("photo.png"), { isLoading: false, photoUrl: null });
    assert.equal(harness.timers.size, 0);
    harness.requests[0].resolve(true);
    await Promise.resolve();
    assert.equal(harness.render("photo.png").photoUrl, null);
  });
}

test("switching player ignores a late photo response for the previous player", async () => {
  const harness = photoHarness();
  harness.render("first.png");
  harness.render("second.png");
  harness.requests[0].resolve(true);
  await Promise.resolve();
  assert.equal(harness.render("second.png").isLoading, true);
  harness.requests[1].resolve(true);
  await Promise.resolve();
  assert.deepEqual(harness.render("second.png"), { isLoading: false, photoUrl: "second.png" });
});

test("missing photos, disabled queries and closed profiles create no image request or lingering timer", async () => {
  const harness = photoHarness();
  assert.equal(harness.render(null).isLoading, false);
  assert.equal(harness.render("photo.png", false).isLoading, false);
  assert.equal(harness.requests.length, 0);
  harness.render("photo.png");
  harness.unmount();
  assert.equal(harness.timers.size, 0);
  harness.requests[0].resolve(true);
  await Promise.resolve();
  assert.equal(harness.render("photo.png").isLoading, true);
});

test("skeleton is a single busy region, respects reduced motion and stops animation on unmount", async () => {
  const effects = [], calls = [];
  let preferenceListener;
  const styles = new Proxy({}, { get: (_, key) => key });
  const loaded = {};
  const mocks = {
    react: { useRef: (value) => ({ current: value }), useEffect: (fn) => effects.push(fn) },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "../../../styles": { styles },
    "../../../i18n/I18nProvider": { useI18n: () => ({ t: (key) => key }) },
    "react-native": {
      View: "View", useWindowDimensions: () => ({ width: 1440 }),
      Easing: { inOut: (value) => value, quad: "quad" },
      AccessibilityInfo: {
        isReduceMotionEnabled: () => Promise.resolve(true),
        addEventListener: (_, listener) => { preferenceListener = listener; return { remove: () => calls.push("remove") }; },
      },
      Animated: {
        View: "AnimatedView", Value: class { setValue() {} },
        timing: () => ({}), sequence: (items) => items,
        loop: () => ({ start: () => calls.push("start"), stop: () => calls.push("stop") }),
      },
    },
  };
  const pulse = {};
  new Function("require", "exports", compile("../src/hooks/useSkeletonOpacity.ts"))((id) => mocks[id], pulse);
  mocks["../../../hooks/useSkeletonOpacity"] = pulse;
  new Function("require", "exports", compile("../src/features/fantasy/components/PlayerProfileSkeleton.tsx"))((id) => mocks[id], loaded);
  const nodes = nodesOf(loaded.PlayerProfileSkeleton({ isDesktopWeb: true }));
  const cleanup = effects[0]();
  await Promise.resolve();
  assert.equal(calls.includes("start"), false);
  assert.equal(nodes.filter((node) => node.props.accessibilityRole === "progressbar").length, 1);
  assert.equal(nodes[0].props.accessibilityState.busy, true);
  assert.equal(nodes.find((node) => node.type === "AnimatedView").props["aria-hidden"], true);
  preferenceListener(false);
  assert.equal(calls.includes("start"), true);
  cleanup();
  assert.deepEqual(calls, ["start", "stop", "remove"]);
});
