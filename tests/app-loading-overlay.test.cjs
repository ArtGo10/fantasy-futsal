const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function load(path, mocks = {}) {
  const filename = require.resolve(path);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const result = {};
  new Function("require", "exports", source)((id) => mocks[id] ?? require(id), result);
  return result;
}

const { styles } = load("../src/styles.ts", {
  "react-native": {
    Platform: { OS: "web" },
    StyleSheet: {
      create: (value) => value,
      absoluteFillObject: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  },
  "./theme/tokens": load("../src/theme/tokens.ts"),
});
const flatten = (values) => Object.assign({}, ...values.filter(Boolean));

function render(platform, width, props) {
  const { AppLoadingOverlay } = load("../src/components/common/AppLoadingOverlay.tsx", {
    "react-native": {
      Platform: { OS: platform }, Modal: "Modal", View: "View",
      useWindowDimensions: () => ({ width }),
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 54, bottom: 34, left: 0, right: 0 }) },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "../../constants": { WEB_DESKTOP_MIN_WIDTH: 1024 },
    "../../styles": { styles },
    "./LoadingLogo": { LoadingLogo: "LoadingLogo" },
  });
  return AppLoadingOverlay(props);
}

for (const [platform, width] of [["web", 1440], ["web", 390], ["ios", 390], ["android", 412]]) {
  test(`${platform}/${width}: fullscreen loading is independent of parent size, padding, scroll and safe area`, () => {
    let closed = false;
    const modal = render(platform, width, {
      fullScreen: true, title: "Loading team", onRequestClose: () => { closed = true; },
    });
    assert.equal(modal.type, "Modal");
    assert.equal(modal.props.visible, true);
    assert.equal(modal.props.transparent, true);
    assert.equal(modal.props.animationType, "none");
    assert.equal(modal.props.presentationStyle, "overFullScreen");
    assert.equal(modal.props.statusBarTranslucent, true);
    assert.equal(modal.props.navigationBarTranslucent, true);
    const overlay = modal.props.children;
    const style = flatten(overlay.props.style);
    assert.equal(style.position, "absolute");
    for (const edge of ["top", "right", "bottom", "left"]) assert.equal(style[edge], 0);
    assert.equal(style.alignItems, "center");
    assert.equal(style.justifyContent, "center");
    assert.equal(overlay.props.pointerEvents, "auto");
    assert.equal(overlay.props.accessibilityRole, "progressbar");
    assert.equal(overlay.props.accessibilityLabel, "Loading team");
    assert.equal(overlay.props.accessibilityState.busy, true);
    const logo = overlay.props.children.find((node) => node.type === "LoadingLogo");
    const standard = render(platform, width, { title: "Loading" });
    const standardLogo = standard.props.children.find((node) => node.type === "LoadingLogo");
    assert.deepEqual(logo.props.style, standardLogo.props.style, "reuse the standard animated logo and its size");
    modal.props.onRequestClose();
    assert.equal(closed, true);
  });
}

test("existing root overlays retain their native safe-area treatment", () => {
  const overlay = render("ios", 390, { title: "Loading" });
  assert.equal(overlay.type, "View");
  const style = flatten(overlay.props.style);
  assert.equal(style.top, -54);
  assert.equal(style.bottom, -34);
});

test("a fullscreen busy state without a back action has a safe modal close handler", () => {
  const modal = render("android", 412, { fullScreen: true });
  assert.doesNotThrow(() => modal.props.onRequestClose());
});
