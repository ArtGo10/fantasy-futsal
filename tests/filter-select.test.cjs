const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function compile(source, mocks = {}, scope = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: "select.tsx",
  });
  const exports = {};
  new Function("require", "exports", ...Object.keys(scope), outputText)(
    id => mocks[id] ?? require(id), exports, ...Object.values(scope),
  );
  return exports;
}

const read = path => fs.readFileSync(require.resolve(`../src/${path}`), "utf8");
const tokens = compile(read("theme/tokens.ts"));
const { WEB_DESKTOP_MIN_WIDTH } = compile(read("constants.ts"));
const source = read("features/fantasy/components/FilterSelect.tsx");
const flattenStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

function loadSelect(platform, width, theme, effects = []) {
  const events = new Map();
  const document = {
    addEventListener: (key, fn) => events.set(key, fn),
    removeEventListener: key => events.delete(key),
  };
  const components = compile(source, {
    react: { useEffect: fn => effects.push(fn()) },
    "lucide-react-native": { Check: "Check", ChevronDown: "ChevronDown" },
    "react-native": {
      Platform: { OS: platform }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
      useWindowDimensions: () => ({ width }), StyleSheet: { create: value => value },
      BackHandler: { addEventListener: (key, fn) => { events.set(key, fn); return { remove: () => events.delete(key) }; } },
    },
    "../../../constants": { WEB_DESKTOP_MIN_WIDTH },
    "../../../theme/tokens": tokens,
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => theme },
  }, { document });
  return { ...components, events };
}

for (const primaryColor of ["#E30613", "#004D9F"]) {
  for (const [platform, width] of [["web", 375], ["web", 1440], ["ios", 375], ["android", 375]]) {
    for (const active of [false, true]) {
      for (const expanded of [false, true]) {
        test(`filter trigger ${primaryColor}, ${platform} ${width}, active=${active}, expanded=${expanded}`, () => {
          const { FilterSelectButton } = loadSelect(platform, width, { primaryColor });
          let presses = 0;
          const button = FilterSelectButton({
            accessibilityLabel: "Team", active, expanded, label: "All clubs", onPress: () => presses++,
          });
          const style = flattenStyle(button.props.style({ pressed: false }));
          assert.equal(style.backgroundColor, active ? primaryColor : tokens.colors.surface);
          assert.equal(style.borderColor, active || expanded ? primaryColor : tokens.colors.border.default);
          assert.ok(style.minHeight >= 44);
          assert.equal(button.props.accessibilityState.expanded, expanded);
          const label = button.props.children[1];
          const chevron = button.props.children[2].props.children;
          assert.equal(flattenStyle(label.props.style).color, active ? tokens.colors.text.inverse : primaryColor);
          assert.equal(chevron.props.color, active ? tokens.colors.text.inverse : primaryColor);
          assert.deepEqual(flattenStyle(button.props.children[2].props.style).transform ?? [], expanded ? [{ rotate: "180deg" }] : []);
          assert.equal(label.props.numberOfLines, 1);
          button.props.onPress();
          assert.equal(presses, 1);
        });
      }
    }
  }
}

for (const platform of ["web", "ios", "android"]) {
  test(`${platform}: shared inline options select, close, and handle Escape/back`, () => {
    const effects = [];
    const theme = { primaryColor: "red", softColor: "pink", borderColor: "red-border" };
    const { FilterSelectMenu, events } = loadSelect(platform, 375, theme, effects);
    let selected;
    let closed = 0;
    const options = [
      { label: "All clubs", value: "all" },
      { label: "Test club", menuLabel: "Full club name", leading: "logo", secondaryLabel: "Details", value: "club" },
      { label: "Unavailable", value: "disabled", disabled: true },
    ];
    const menu = FilterSelectMenu({
      accessibilityLabel: "Team", options, value: "all", onClose: () => closed++, onValueChange: value => selected = value,
    });
    const scroll = menu.props.children;
    assert.equal(scroll.type, "ScrollView");
    assert.equal(scroll.props.nestedScrollEnabled, true);
    assert.equal(scroll.props.style.maxHeight, 246);
    const rows = scroll.props.children[0];
    assert.equal(rows[1].props.children[1].props.children[0].props.children, "Full club name");
    assert.equal(rows[0].props.accessibilityState.selected, true);
    assert.equal(rows[0].props.children[2].type, "Check");
    assert.equal(flattenStyle(rows[0].props.style({ pressed: false })).backgroundColor, theme.softColor);
    assert.equal(rows[2].props.disabled, true);
    rows[1].props.onPress();
    assert.equal(selected, "club");
    assert.equal(closed, 1);
    if (platform === "web") events.get("keydown")({ key: "Escape" });
    else assert.equal(events.get("hardwareBackPress")(), true);
    assert.equal(closed, 2);
    effects.forEach(cleanup => cleanup?.());
    assert.equal(events.size, 0);
  });
}

for (const screen of ["MarketScreen", "LeagueScreen", "SeasonScreen", "MyTeamScreen"]) {
  test(`${screen}: shared filter controls replace filter drawers, including desktop active states`, () => {
    const text = read(`features/fantasy/screens/${screen}.tsx`);
    const ast = ts.createSourceFile("screen.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const nodes = [];
    function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
    visit(ast);
    const elements = nodes.filter(node => ts.isJsxSelfClosingElement(node));
    assert.ok(elements.some(node => node.tagName.getText(ast) === "FilterSelectMenu"));
    const triggers = elements.filter(node => ["DesktopSelect", "FilterSelectButton"].includes(node.tagName.getText(ast)));
    assert.ok(triggers.length);
    for (const trigger of triggers) {
      assert.ok(trigger.attributes.properties.some(prop => prop.name?.text === "active"), trigger.getText(ast));
    }
    for (const sheet of nodes.filter(node => ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === "BottomSheet")) {
      const visible = sheet.attributes.properties.find(prop => prop.name?.text === "visible")?.getText(ast) ?? "";
      assert.doesNotMatch(visible, /isLeaguePickerOpen|isModePickerOpen|activeFilter|isFavoriteClubPickerOpen|openPicker/);
    }
    assert.doesNotMatch(text, /SeasonPickerSheet/);
  });
}

test("header league selector retains its bottom sheet", () => {
  const text = read("features/fantasy/FantasyHome.tsx");
  assert.match(text, /<BottomSheet/);
});
