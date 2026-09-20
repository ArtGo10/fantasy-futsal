const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function load(path, mocks = {}, globals = {}) {
  const filename = require.resolve(path);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const result = {};
  new Function("require", "exports", ...Object.keys(globals), source)(
    (id) => mocks[id] ?? require(id), result, ...Object.values(globals),
  );
  return result;
}
function nodesOf(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodesOf);
  return tree?.props ? [tree, ...nodesOf(tree.props.children)] : [];
}
const guardModule = load("../src/features/fantasy/utils/scrollTapGuard.ts");
const theme = { primaryColor: "#004494", softColor: "#edf4ff" };
const baseMocks = {
  react: { memo: (fn) => fn, useRef: (value) => ({ current: value }) },
  "react/jsx-runtime": require("react/jsx-runtime"),
  "react-native": { Pressable: "Pressable", Text: "Text", View: "View" },
  "expo-image": { Image: "Image" },
  "lucide-react-native": {},
  "../../../styles": { styles: new Proxy({}, { get: (_, key) => key }) },
  "../../../theme/tokens": { colors: { text: {}, state: {}, border: {} } },
  "../assets/fantasyAssets": { FANTASY_STATIC_IMAGE_PROPS: {}, getClubKitSource: () => "kit.png" },
  "../utils/money": { formatFantasyMoney: (value) => String(value) },
  "../utils/seasonThemeContext": { useFantasySeasonTheme: () => theme },
  "../utils/scrollTapGuard": guardModule,
  "./TeamKitAvatar": { TeamKitAvatar: "Kit" },
};
const listModule = load("../src/features/fantasy/components/FantasyPlayerListRow.tsx", baseMocks);
function rowHarness() {
  const actions = [];
  const row = listModule.FantasyPlayerListRow({
    player: { displayName: "Test Player", price: 8, status: "active", position: "universal" },
    club: null, t: (key) => key, variant: "pickerStats",
    onPress: () => actions.push("add"), onInfoPress: () => actions.push("info"),
  });
  const buttons = nodesOf(row).filter((node) => node.type === "Pressable");
  return {
    actions,
    touch: (phase, x, y) => row.props[phase]({ nativeEvent: { pageX: x, pageY: y } }),
    press: (index = 0, nativeEvent = {}) => buttons[index].props.onPress({ nativeEvent }),
    accessiblePress: () => buttons[0].props.onAccessibilityTap(),
  };
}
test("picker accepts a tap with small finger jitter", () => {
  const h = rowHarness();
  h.touch("onTouchStart", 100, 100);
  h.touch("onTouchMove", 102, 103);
  h.touch("onTouchEnd", 102, 103);
  h.press();
  assert.deepEqual(h.actions, ["add"]);
});
for (const [x, y] of [[10, 100], [100, 200], [180, 160]]) {
  test(`swipe to ${x},${y} cannot add a player or open info, even if a trailing click arrives`, () => {
    const h = rowHarness();
    h.touch("onTouchStart", 100, 100);
    h.touch("onTouchMove", x, y);
    h.touch("onTouchEnd", x, y);
    h.press(0, { detail: 1 });
    h.press(1, { detail: 1 });
    assert.deepEqual(h.actions, []);
    h.touch("onTouchStart", 100, 100);
    h.touch("onTouchEnd", 100, 100);
    h.press();
    assert.deepEqual(h.actions, ["add"]);
  });
}
test("touch ending at a different position is a swipe even when move events were intercepted", () => {
  const h = rowHarness();
  h.touch("onTouchStart", 0, 0);
  h.touch("onTouchEnd", 100, 0);
  h.press();
  assert.deepEqual(h.actions, []);
});
test("returning to the touch origin does not turn a scroll into a tap", () => {
  const h = rowHarness();
  h.touch("onTouchStart", 0, 0);
  h.touch("onTouchMove", 100, 0);
  h.touch("onTouchEnd", 0, 0);
  h.press();
  assert.deepEqual(h.actions, []);
});
test("cancelled gestures cannot select; keyboard and screen reader actions still work", () => {
  const h = rowHarness();
  h.touch("onTouchStart", 0, 0);
  h.touch("onTouchCancel", 0, 0);
  h.press();
  assert.deepEqual(h.actions, []);
  h.press(0, { type: "click", detail: 0 });
  h.accessiblePress();
  assert.deepEqual(h.actions, ["add", "add"]);
});
test("shirt image cannot intercept the parent slot or start browser-native image dragging", () => {
  const { TeamKitAvatar } = load("../src/features/fantasy/components/TeamKitAvatar.tsx", baseMocks);
  const tree = TeamKitAvatar({ displayName: "Test Player" });
  assert.equal(tree.props.pointerEvents, "none");
  assert.equal(nodesOf(tree).find((node) => node.type === "Image").props.draggable, false);
});
test("compact player names keep initials, Unicode and single-name players", () => {
  const format = listModule.formatFantasyPlayerListName;
  assert.equal(format({ displayName: "Vadym Danyliuk", firstName: "Vadym", lastName: "Danyliuk" }), "V. Danyliuk");
  assert.equal(format({ displayName: "Вадим Данилюк", firstName: "Вадим", lastName: "Данилюк" }), "В. Данилюк");
  assert.equal(format({ displayName: "Kaká" }), "Kaká");
  assert.equal(format({ displayName: "Andre Luiz De Lima Silva (Andre)" }), "A. Andre");
});

function deferredHarness() {
  let state, dependencies, cleanup, effect, sequence = 0;
  const frames = new Map();
  const { useDeferredContent } = load("../src/hooks/useDeferredContent.ts", {
    react: {
      useState: (initial) => {
        if (state === undefined) state = typeof initial === "function" ? initial() : initial;
        return [state, (value) => { state = typeof value === "function" ? value(state) : value; }];
      },
      useEffect: (fn, deps) => {
        if (!dependencies || deps.some((value, index) => value !== dependencies[index])) {
          effect = fn; dependencies = deps;
        }
      },
    },
  }, {
    requestAnimationFrame: (fn) => { frames.set(++sequence, fn); return sequence; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  return {
    frames,
    render(active, key = "picker") {
      const value = useDeferredContent(active, key);
      if (effect) { cleanup?.(); cleanup = effect(); effect = null; }
      return value;
    },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn()); },
    unmount() { cleanup?.(); },
  };
}
test("first navigation defers mounting, but reopening prepared content is immediate", () => {
  const h = deferredHarness();
  assert.equal(h.render(false), false);
  assert.equal(h.frames.size, 0);
  assert.equal(h.render(true), false);
  h.frame();
  assert.equal(h.render(true), false);
  h.frame();
  assert.equal(h.render(true), true);
  assert.equal(h.render(false), false);
  assert.equal(h.render(true), true);
  assert.equal(h.frames.size, 0);
});
test("back and unmount cancel scheduled mounting, including a late callback", () => {
  const h = deferredHarness();
  h.render(true); h.frame();
  const stale = [...h.frames.values()][0];
  h.render(false);
  assert.equal(h.frames.size, 0);
  stale();
  assert.equal(h.render(true), false);
  h.unmount();
  assert.equal(h.frames.size, 0);
});
test("switching workspace does not reveal content prepared for another screen", () => {
  const h = deferredHarness();
  h.render(true, "pick"); h.frame(); h.frame();
  assert.equal(h.render(true, "pick"), true);
  assert.equal(h.render(true, "transfers"), false);
  h.frame(); h.frame();
  assert.equal(h.render(true, "transfers"), true);
  assert.equal(h.render(true, "pick"), true);
  assert.equal(h.frames.size, 0);
  assert.equal(h.render(true, "another-season:pick"), false);
});

for (const [variant, fitted] of [["players", false], ["pitch", false], ["pitch", true]]) {
  test(`${variant}/${fitted}: skeleton reserves list rows or pitch space and is non-interactive`, () => {
    const { TeamWorkspaceSkeleton } = load("../src/features/fantasy/components/TeamWorkspaceSkeleton.tsx", {
      ...baseMocks,
      "react-native": { View: "View", Animated: { View: "AnimatedView" }, StyleSheet: { create: (value) => value } },
      "../../../theme/tokens": { colors: { border: {} } },
      "../../../hooks/useSkeletonOpacity": { useSkeletonOpacity: () => 1 },
      "../../../i18n/I18nProvider": { useI18n: () => ({ t: (key) => key }) },
      "../utils/useFutsalFieldLayout": { useFutsalFieldLayout: () => ({ aspectRatio: 631 / 755 }) },
    });
    const tree = TeamWorkspaceSkeleton({ variant, fitToAvailableHeight: fitted });
    const nodes = nodesOf(tree);
    assert.equal(nodes.filter((node) => node.props.accessibilityRole === "progressbar").length, 1);
    const animation = nodes.find((node) => node.type === "AnimatedView");
    assert.equal(animation.props.pointerEvents, "none");
    assert.equal(animation.props["aria-hidden"], true);
    if (variant === "players") {
      assert.equal(nodes.filter((node) => node.props.style?.height === 64).length, 10);
    } else {
      const style = Object.assign({}, ...tree.props.style);
      assert.equal(fitted ? style.flex : style.aspectRatio, fitted ? 1 : 631 / 755);
      assert.equal(nodes.filter((node) => Array.isArray(node.props.style) && node.props.style.some((style) => style?.aspectRatio === 56 / 76)).length, 12);
    }
  });
}
