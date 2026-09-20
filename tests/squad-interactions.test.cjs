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
const { assignSquadLeadership, canSwapSquadSlots, getLeadershipSlotAfterSwap, findSquadDropTarget } = load("../src/features/fantasy/utils/squadInteractions.ts");
const slot = (rosterSlot, squadRole, position = "universal") => ({ rosterSlot, squadRole, position });
const starter = slot(1, "starter"), bench = slot(6, "bench"), reserve = slot(10, "reserve");
const picks = { 1: { id: "a" }, 6: { id: "b" }, 10: { id: "c" } };

test("assigning captain to the vice captain swaps both roles, and vice versa", () => {
  assert.deepEqual(assignSquadLeadership(1, 6, 6, "captain"), { captain: 6, viceCaptain: 1 });
  assert.deepEqual(assignSquadLeadership(1, 6, 1, "viceCaptain"), { captain: 6, viceCaptain: 1 });
});
test("assigning a third player keeps the other leadership role and reselecting a role is idempotent", () => {
  assert.deepEqual(assignSquadLeadership(1, 6, 3, "captain"), { captain: 3, viceCaptain: 6 });
  assert.deepEqual(assignSquadLeadership(1, 6, 3, "viceCaptain"), { captain: 1, viceCaptain: 3 });
  assert.deepEqual(assignSquadLeadership(1, 6, 1, "captain"), { captain: 1, viceCaptain: 6 });
  assert.deepEqual(assignSquadLeadership(1, 6, 6, "viceCaptain"), { captain: 1, viceCaptain: 6 });
});
test("missing previous leadership does not duplicate the newly assigned role", () => {
  assert.deepEqual(assignSquadLeadership(null, 6, 6, "captain"), { captain: 6, viceCaptain: null });
  assert.deepEqual(assignSquadLeadership(1, null, 1, "viceCaptain"), { captain: null, viceCaptain: 1 });
});
for (const source of [starter, bench, reserve]) {
  for (const target of [starter, bench, reserve]) {
    test(`swap ${source.squadRole} to ${target.squadRole} obeys the existing group rule`, () => {
      assert.equal(canSwapSquadSlots(source, target, picks), source.squadRole !== target.squadRole);
    });
  }
}
test("keepers can swap only with keepers, empty slots and same-group swaps are rejected", () => {
  assert.equal(canSwapSquadSlots(slot(1, "starter", "goalkeeper"), slot(10, "reserve", "goalkeeper"), picks), true);
  assert.equal(canSwapSquadSlots(slot(1, "starter", "goalkeeper"), reserve, picks), false);
  assert.equal(canSwapSquadSlots(starter, slot(6, "bench", "goalkeeper"), picks), false);
  assert.equal(canSwapSquadSlots(starter, slot(6, "starter"), picks), false);
  assert.equal(canSwapSquadSlots(starter, bench, { 1: picks[1] }), false);
  assert.equal(canSwapSquadSlots(starter, bench, { 6: picks[6] }), false);
});
test("leadership follows the player between starter and bench, but stays out of reserve", () => {
  assert.equal(getLeadershipSlotAfterSwap(1, starter, bench), 6);
  assert.equal(getLeadershipSlotAfterSwap(6, starter, bench), 1);
  assert.equal(getLeadershipSlotAfterSwap(1, starter, reserve), 1);
  assert.equal(getLeadershipSlotAfterSwap(6, reserve, bench), 6);
  assert.equal(getLeadershipSlotAfterSwap(2, starter, bench), 2);
  assert.equal(getLeadershipSlotAfterSwap(null, starter, bench), null);
});
test("hit testing uses actual scaled window bounds, never the nearest or an invalid player", () => {
  const bounds = new Map([[6, { x: 100.5, y: 200, width: 36, height: 45 }], [10, { x: 180, y: 300, width: 60, height: 80 }]]);
  assert.equal(findSquadDropTarget({ x: 110, y: 220 }, bounds, () => true), 6);
  assert.equal(findSquadDropTarget({ x: 110, y: 220 }, bounds, () => false), null);
  assert.equal(findSquadDropTarget({ x: 140, y: 220 }, bounds, () => true), null);
  assert.equal(findSquadDropTarget({ x: 200, y: 330 }, bounds, () => true), 10);
});

function gestureHarness(platform) {
  const effects = [], timers = new Map(), calls = [];
  let timerId = 0;
  const target = () => {
    const handlers = new Map();
    return {
      handlers,
      addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
      removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
      emit(name, values = {}) {
        const event = { touches: [], preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
        for (const fn of handlers.get(name) ?? []) fn(event);
        return event;
      },
    };
  };
  const node = target(), document = target(), window = target();
  const nativeListeners = new Map();
  const lifecycle = (name) => ({ addEventListener: (_, fn) => {
    nativeListeners.set(name, fn);
    return { remove: () => nativeListeners.delete(name) };
  } });
  const loaded = load(`../src/features/fantasy/utils/useSquadDragGesture${platform === "web" ? ".web" : ""}.ts`, {
    react: { useRef: (value) => ({ current: value }), useMemo: (fn) => fn(), useEffect: (fn) => effects.push(fn) },
    "react-native": {
      PanResponder: { create: (options) => ({ panHandlers: options }) },
      AppState: lifecycle("appState"), Dimensions: lifecycle("dimensions"),
    },
  }, {
    document, window,
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  const gesture = loaded.useSquadDragGesture({ current: node }, {
    enabled: true,
    ...Object.fromEntries(["begin", "move", "finish", "cancel"].map((name) => [name, (point) => calls.push({ name, point })])),
  });
  const cleanups = effects.map((fn) => fn());
  return { gesture, node, document, window, calls, timers, nativeListeners,
    hold: () => { const jobs = [...timers.values()]; timers.clear(); jobs.forEach((fn) => fn()); },
    cleanup: () => cleanups.forEach((fn) => fn?.()),
  };
}
const pointer = (x, y) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });
const touch = (x, y) => ({ identifier: 1, clientX: x, clientY: y });

test("web mouse starts only after movement, suppresses the trailing click, and supports the next click", () => {
  const h = gestureHarness("web");
  h.node.emit("pointerdown", pointer(10, 20));
  h.document.emit("pointermove", pointer(12, 20));
  assert.equal(h.calls.length, 0);
  h.document.emit("pointermove", pointer(30, 50));
  h.document.emit("pointerup", pointer(130, 150));
  assert.deepEqual(h.calls.map((x) => x.name), ["begin", "move", "finish"]);
  assert.equal(h.node.emit("click", { detail: 1 }).prevented, true);
  h.node.emit("pointerdown", pointer(10, 20));
  h.document.emit("pointerup", pointer(10, 20));
  assert.equal(h.gesture.shouldSuppressPress(), false);
  h.cleanup();
});
test("web touch lets a short swipe scroll and starts dragging only after a stationary hold", () => {
  const h = gestureHarness("web");
  h.node.emit("touchstart", { touches: [touch(10, 20)] });
  assert.equal(h.document.emit("touchmove", { touches: [touch(10, 50)] }).prevented, undefined);
  h.hold();
  assert.equal(h.calls.length, 0);
  h.node.emit("touchstart", { touches: [touch(10, 20)] });
  h.hold();
  assert.equal(h.document.emit("touchmove", { touches: [touch(130, 150)] }).prevented, true);
  assert.equal(h.document.emit("touchend", { changedTouches: [touch(130, 150)] }).prevented, true);
  assert.deepEqual(h.calls.map((x) => x.name), ["begin", "move", "finish"]);
  h.cleanup();
});
for (const cancellation of ["pointercancel", "touchcancel", "Escape", "blur", "resize", "scroll", "unmount"]) {
  test(`web ${cancellation} cancels instead of applying a drop and leaves no timer`, () => {
    const h = gestureHarness("web");
    h.node.emit("pointerdown", pointer(10, 20));
    h.document.emit("pointermove", pointer(30, 50));
    if (cancellation === "unmount") h.cleanup();
    else if (cancellation === "Escape") h.document.emit("keydown", { key: "Escape" });
    else (cancellation.endsWith("cancel") ? h.document : h.window).emit(cancellation);
    h.document.emit("pointerup", pointer(130, 150));
    assert.deepEqual(h.calls.map((x) => x.name), ["begin", "move", "cancel"]);
    assert.equal(h.timers.size, 0);
    h.cleanup();
  });
}
test("web touch tap and multitouch never start a swap; keyboard is usable after a drag", () => {
  const h = gestureHarness("web");
  h.node.emit("touchstart", { touches: [touch(10, 20)] });
  h.document.emit("touchend", { changedTouches: [touch(10, 20)] });
  h.hold();
  assert.equal(h.calls.length, 0);
  h.node.emit("touchstart", { touches: [touch(10, 20)] });
  h.hold();
  h.document.emit("touchmove", { touches: [touch(10, 20), { ...touch(100, 200), identifier: 2 }] });
  assert.deepEqual(h.calls.map((x) => x.name), ["begin", "cancel"]);
  h.document.emit("keydown", { key: "Enter" });
  assert.equal(h.gesture.shouldSuppressPress(), false);
  h.cleanup();
});

const nativeEvent = (x, y, count = 1) => ({ nativeEvent: { pageX: x, pageY: y, touches: Array(count).fill({}) } });
test("native hold captures movement and drop once, without opening the player", () => {
  const h = gestureHarness("native"), p = h.gesture.panHandlers;
  assert.equal(p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20)), false);
  h.hold();
  assert.equal(h.gesture.shouldSuppressPress(), true);
  assert.equal(p.onMoveShouldSetPanResponderCapture(nativeEvent(30, 50)), true);
  p.onPanResponderMove(nativeEvent(30, 50));
  p.onTouchEnd(nativeEvent(130, 150, 0));
  p.onPanResponderRelease(nativeEvent(130, 150, 0));
  assert.deepEqual(h.calls.map((x) => x.name), ["begin", "move", "finish"]);
  h.cleanup();
});
test("native ordinary tap and early scroll do not become a drag", () => {
  const h = gestureHarness("native"), p = h.gesture.panHandlers;
  p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20));
  p.onTouchEnd(nativeEvent(10, 20, 0));
  h.hold();
  assert.equal(h.gesture.shouldSuppressPress(), false);
  p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20));
  assert.equal(p.onMoveShouldSetPanResponderCapture(nativeEvent(10, 50)), false);
  h.hold();
  assert.equal(h.calls.length, 0);
  h.cleanup();
});
test("native interrupted gesture cancels and unmount clears a pending hold", () => {
  const h = gestureHarness("native"), p = h.gesture.panHandlers;
  p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20));
  h.hold();
  p.onPanResponderTerminate();
  assert.deepEqual(h.calls.map((x) => x.name), ["begin", "cancel"]);
  p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20));
  h.cleanup();
  assert.equal(h.timers.size, 0);
});

for (const interruption of ["appState", "dimensions"]) {
  test(`native ${interruption} ends the drag and cleans up lifecycle listeners`, () => {
    const h = gestureHarness("native"), p = h.gesture.panHandlers;
    p.onStartShouldSetPanResponderCapture(nativeEvent(10, 20));
    h.hold();
    h.nativeListeners.get(interruption)("background");
    p.onTouchEnd(nativeEvent(100, 200, 0));
    assert.deepEqual(h.calls.map((call) => call.name), ["begin", "cancel"]);
    h.cleanup();
    assert.equal(h.nativeListeners.size, 0);
  });
}

function dragHarness({ platform = "web", deferMeasurement = false } = {}) {
  const hooks = [], effects = [], locks = [], drops = [], positions = [];
  let cursor = 0, pendingEffects = [], resolveMeasurement;
  const loaded = load("../src/features/fantasy/components/SquadDragDrop.tsx", {
    react: {
      createContext: () => ({ Provider: "Provider" }),
      useRef(initial) {
        const index = cursor++;
        return hooks[index] ??= { current: initial };
      },
      useState(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = initial;
        return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
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
    "react-native": {
      Platform: { OS: platform }, View: "View", StyleSheet: { create: (value) => value },
      Animated: { View: "AnimatedView", ValueXY: class {
        setValue(point) { this.point = point; positions.push(point); }
        getTranslateTransform() { return [{ translateX: this.point?.x }, { translateY: this.point?.y }]; }
      } },
    },
    "../../../theme/tokens": { colors: { brand: { yellow: "yellow" } } },
    "../utils/squadInteractions": { findSquadDropTarget },
    "../utils/useSquadDragGesture": {},
  });
  const props = {
    enabled: true, children: null, fitToAvailableHeight: false,
    canDrop: (source, target) => source !== target && target === 6,
    onDrop: (source, target) => drops.push([source, target]),
    onDraggingChange: (value) => locks.push(value),
    renderPreview: () => "shirt",
  };
  const node = (x, y, width, height, defer = false) => ({
    getBoundingClientRect: () => ({ left: x, top: y, width, height }),
    measureInWindow: (callback) => {
      if (defer) resolveMeasurement = () => callback(x, y, width, height);
      else callback(x, y, width, height);
    },
  });
  const render = (changes = {}) => {
    Object.assign(props, changes);
    cursor = 0;
    const tree = loaded.SquadDragDrop(props);
    const jobs = pendingEffects; pendingEffects = [];
    jobs.forEach((fn) => fn());
    return tree;
  };
  const tree = render();
  tree.props.children.props.ref.current = node(20, 100, 300, 600, deferMeasurement);
  tree.props.value.register(1, node(60, 120, 62, 74));
  tree.props.value.register(6, node(220, 300, 52, 66));
  return {
    drag: tree.props.value, render, locks, drops, positions,
    resolveMeasurement: () => resolveMeasurement(),
    unmount: () => effects.forEach((effect) => effect?.cleanup?.()),
  };
}

for (const platform of ["web", "ios", "android"]) {
  test(`${platform}: preview is centered on the touch point without a fixed upward offset`, async () => {
    const h = dragHarness({ platform });
    await h.drag.begin(1, { x: 90, y: 150 });
    h.drag.move({ x: 240, y: 330 });
    assert.deepEqual(h.positions.at(-1), { x: 220, y: 230 });
    const preview = h.render().props.children.props.children[1];
    assert.deepEqual(preview.props.children.props.style.transform, [{ translateX: "-50%" }, { translateY: "-50%" }]);
    h.drag.finish({ x: 240, y: 330 });
    assert.deepEqual(h.locks, [true, false]);
    assert.deepEqual(h.drops, [[1, 6]]);
    h.unmount();
    assert.deepEqual(h.locks, [true, false]);
  });
}

for (const completion of ["drop", "invalidDrop", "cancel", "disable", "unmount"]) {
  test(`${completion}: scroll is locked before native measurement and always restored`, async () => {
    const h = dragHarness({ platform: "ios", deferMeasurement: true });
    const begun = h.drag.begin(1, { x: 90, y: 150 });
    assert.deepEqual(h.locks, [true]);
    if (completion === "drop" || completion === "invalidDrop") {
      h.resolveMeasurement();
      await begun;
      h.drag.finish(completion === "drop" ? { x: 240, y: 330 } : { x: 0, y: 0 });
    } else {
      if (completion === "cancel") h.drag.cancel();
      if (completion === "disable") h.render({ enabled: false });
      if (completion === "unmount") h.unmount();
      h.resolveMeasurement();
      await begun;
      assert.deepEqual(h.positions, [], "late measurements must not restart the drag");
    }
    assert.deepEqual(h.locks, [true, false]);
    assert.deepEqual(h.drops, completion === "drop" ? [[1, 6]] : []);
    h.drag.cancel();
    h.unmount();
    assert.deepEqual(h.locks, [true, false], "unlock is idempotent");
  });
}

test("screen frame disables scrolling without replacing the ScrollView or its contents", () => {
  const { FantasyScreenFrame } = load("../src/features/fantasy/FantasyScreenFrame.tsx", {
    "react-native": { ScrollView: "ScrollView", View: "View" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../../styles": { styles: {} },
  });
  for (const scrollEnabled of [undefined, false, true]) {
    const tree = FantasyScreenFrame({ children: "pitch", scrollEnabled });
    const scroll = tree.props.children[0];
    assert.equal(scroll.type, "ScrollView");
    assert.equal(scroll.props.scrollEnabled, scrollEnabled ?? true);
    assert.equal(scroll.props.children, "pitch");
  }
});
