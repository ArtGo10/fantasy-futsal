const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function compile(source, scope = {}, mocks = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: "filters.tsx",
  });
  const exports = {};
  new Function("require", "exports", ...Object.keys(scope), outputText)(
    id => mocks[id] ?? require(id), exports, ...Object.values(scope),
  );
  return exports;
}

function screenNodes(screen) {
  const file = require.resolve(`../src/features/fantasy/screens/${screen}.tsx`);
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = [];
  function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
  visit(source);
  return { source, nodes };
}

function screenValue(screen, name, scope) {
  const { source, nodes } = screenNodes(screen);
  const node = nodes.find(node =>
    (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(source) === name,
  );
  assert.ok(node, `${screen}.${name} exists`);
  const code = ts.isFunctionDeclaration(node)
    ? `export ${node.getText(source)}`
    : `export const ${node.getText(source)};`;
  return compile(code, { useCallback: fn => fn, ...scope })[name];
}

const cases = [
  {
    screen: "MarketScreen", dirty: "filtersDirty", reset: "resetFilters", buttons: 2,
    defaults: { searchQuery: "", favoritesOnly: false, selectedClubId: null, positionFilter: "all", sort: "price_desc" },
    changes: { searchQuery: "  ", favoritesOnly: true, selectedClubId: "club-2", positionFilter: "goalkeeper", sort: "points_desc" },
    menus: { openFilter: "club" }, closed: { openFilter: null },
  },
  {
    screen: "MyTeamScreen", dirty: "playerPickerFiltersDirty", reset: "resetPlayerPickerFilters", buttons: 2,
    defaults: { playerSearchQuery: "", playerPickerClubId: null, playerPickerPosition: "all", playerPickerSortMode: "default" },
    changes: { playerSearchQuery: "Player", playerPickerClubId: "club-2", playerPickerPosition: "universal", playerPickerSortMode: "available_first" },
    menus: { playerPickerDropdown: "sort" }, closed: { playerPickerDropdown: null },
  },
  {
    screen: "LeagueScreen", dirty: "filtersDirty", reset: "resetFilters", buttons: 1,
    defaults: { leagueScopeId: "total", leagueFilterId: "global" },
    changes: { leagueScopeId: "gw-2", leagueFilterId: "private-league" },
    menus: { leaguePickerOpen: true, modePickerOpen: true }, closed: { leaguePickerOpen: false, modePickerOpen: false },
  },
];

for (const config of cases) {
  function scopeFor(state) {
    const effects = [];
    const scope = {
      ...state,
      TOTAL_LEAGUE_SCOPE_ID: "total", GLOBAL_LEAGUE_FILTER_ID: "global",
      Keyboard: { dismiss: () => effects.push("dismiss") },
      resetPlayerPickerScroll: () => effects.push("scroll"),
      // No roster/transfer setters are provided: filter reset must not call them.
      ...Object.fromEntries(Object.keys(state).map(key => [
        `set${key[0].toUpperCase()}${key.slice(1)}`,
        value => { state[key] = value; },
      ])),
    };
    return { scope, effects };
  }

  test(`${config.screen}: reset is disabled for the default filters`, () => {
    const { scope } = scopeFor({ ...config.defaults, ...config.closed });
    assert.equal(screenValue(config.screen, config.dirty, scope), false);
  });

  for (const [key, value] of [...Object.entries(config.changes), ["all", null]]) {
    test(`${config.screen}: reset clears ${key} filters and closes selectors`, () => {
      const state = { ...config.defaults, ...(key === "all" ? config.changes : { [key]: value }), ...config.menus };
      const { scope, effects } = scopeFor(state);
      assert.equal(screenValue(config.screen, config.dirty, scope), true);
      screenValue(config.screen, config.reset, scope)();
      assert.deepEqual(state, { ...config.defaults, ...config.closed });
      assert.equal(screenValue(config.screen, config.dirty, { ...scope, ...state }), false);
      if (config.screen === "MyTeamScreen") assert.deepEqual(effects, ["dismiss", "scroll"]);
    });
  }

  test(`${config.screen}: every reset control uses the shared button and correct handler`, () => {
    const { source, nodes } = screenNodes(config.screen);
    const buttons = nodes.filter(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "FilterResetButton");
    assert.equal(buttons.length, config.buttons);
    for (const button of buttons) {
      for (const dirty of [false, true]) {
        let called = false;
        const { render } = compile(`export const render = () => (${button.getText(source)});`, {
          FilterResetButton: "Reset", [config.dirty]: dirty,
          [config.reset]: () => { called = true; }, styles: {}, isDesktopWeb: false,
        });
        const { props } = render();
        assert.equal(props.disabled, !dirty);
        props.onPress();
        assert.equal(called, true);
      }
    }
  });
}

test("season reset keeps its current-gameweek defaults", () => {
  const changes = [];
  screenValue("SeasonScreen", "resetCalendarFilters", {
    defaultGameweekId: "current-gw", calendarGameweeks: [{ id: "gw-1" }],
    setSelectedCalendarClubId: value => changes.push(["club", value]),
    setSelectedGameweekId: value => changes.push(["week", value]),
    setCalendarGameweekDirty: value => changes.push(["dirty", value]),
  })();
  assert.deepEqual(changes, [["club", null], ["week", "current-gw"], ["dirty", false]]);
});

const translations = compile(fs.readFileSync(require.resolve("../src/i18n/translations.ts"), "utf8")).translations;
const { WEB_DESKTOP_MIN_WIDTH } = compile(fs.readFileSync(require.resolve("../src/constants.ts"), "utf8"));
const resetViewports = [
  ["web", 375], ["web", 768], ["web", WEB_DESKTOP_MIN_WIDTH - 1],
  ["web", WEB_DESKTOP_MIN_WIDTH], ["web", 1440], ["ios", 1280], ["android", 375],
];
for (const language of ["en", "uk", "pl"]) {
  for (const disabled of [false, true]) {
    for (const [platform, width] of resetViewports) {
    test(`shared reset button: ${language}, disabled=${disabled}, ${platform} ${width}px`, () => {
      const iconOnly = platform !== "web" || width < WEB_DESKTOP_MIN_WIDTH;
      const source = fs.readFileSync(require.resolve("../src/features/fantasy/components/FilterResetButton.tsx"), "utf8");
      const { FilterResetButton } = compile(source, {}, {
        "react-native": { Platform: { OS: platform }, Pressable: "Pressable", Text: "Text", useWindowDimensions: () => ({ width }) },
        "../../../constants": { WEB_DESKTOP_MIN_WIDTH },
        "lucide-react-native": { RotateCcw: "ResetIcon" },
        "../../../i18n/I18nProvider": { useI18n: () => ({ t: key => translations[language][key] }) },
        "../../../styles": { styles: new Proxy({}, { get: (_, key) => key }) },
        "../../../theme/tokens": { colors: { text: { muted: "muted" } } },
        "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({ primaryColor: "league-color" }) },
      });
      let presses = 0;
      const row = FilterResetButton({ disabled, onPress: () => presses++, style: "placement" });
      assert.equal(row.props.disabled, disabled);
      assert.deepEqual(row.props.accessibilityState, { disabled });
      assert.equal(row.props.accessibilityLabel, translations[language]["season.reset"]);
      assert.equal(row.props.children[0]?.props.children ?? null, iconOnly ? null : row.props.accessibilityLabel);
      assert.equal(row.props.children[1].props.size, iconOnly ? 18 : 16);
      assert.equal(row.props.style.includes("filterResetButtonCompact"), iconOnly);
      assert.equal(row.props.children[1].props.color, disabled ? "muted" : "league-color");
      assert.equal(row.props.style.includes("seasonResetButtonDisabled"), disabled);
      assert.ok(row.props.style.includes("placement"));
      assert.equal(row.props.title, platform === "web" ? row.props.accessibilityLabel : undefined);
      const explicitFull = FilterResetButton({ compact: false, disabled, onPress: () => {} });
      assert.equal(explicitFull.props.children[0]?.props.children ?? null, iconOnly ? null : row.props.accessibilityLabel);
      const compact = FilterResetButton({ compact: true, disabled, onPress: () => presses++ });
      assert.equal(compact.props.children[0], null);
      assert.equal(compact.props.accessibilityLabel, row.props.accessibilityLabel);
      assert.equal(compact.props.title, row.props.title);
      assert.equal(compact.props.disabled, disabled);
      assert.equal(compact.props.children[1].props.size, 18);
      assert.ok(compact.props.style.includes("filterResetButtonCompact"));
      if (!disabled) row.props.onPress();
      assert.equal(presses, disabled ? 0 : 1);
    });
    }
  }
}

for (const isDesktopWeb of [false, true]) {
  test(`team creation and transfer reset: ${isDesktopWeb ? "desktop label" : "mobile icon"}`, () => {
    let presses = 0;
    const scope = {
      isDesktopWeb, t: key => translations.en[key],
      styles: new Proxy({}, { get: (_, key) => key }),
      colors: { text: { inverse: "white" } },
      fantasyTheme: { primaryColor: "league-color" },
      useFantasySeasonTheme: () => ({ primaryColor: "league-color" }),
      themedFooterSecondaryButtonStyle: {}, themedFooterSecondaryTextStyle: {},
      View: "View", Pressable: "Pressable", Text: "Text", RotateCcw: "ResetIcon", ArrowLeft: "BackIcon",
      handleResetDraft: () => presses++,
    };
    const { source, nodes } = screenNodes("MyTeamScreen");
    const draftReset = nodes.find(node => ts.isJsxElement(node)
      && node.openingElement.tagName.getText(source) === "Pressable"
      && node.openingElement.attributes.properties.some(attribute => attribute.name?.text === "onPress"
        && attribute.initializer?.expression?.getText(source) === "handleResetDraft"));
    assert.ok(draftReset);
    const creation = compile(`export const render = () => (${draftReset.getText(source)});`, scope).render();
    const Header = screenValue("MyTeamScreen", "TeamWorkspaceHeader", scope);
    const header = Header({
      isDesktopWeb, t: scope.t, mode: "transfers", deadlineValue: "Tomorrow", gameweekLabel: "GW 5",
      onBack: () => {}, onRightAction: () => presses++, rightActionLabel: translations.en["team.resetButton"],
    });
    const transfer = header.props.children[2];
    for (const button of [creation, transfer]) {
      assert.equal(button.props.accessibilityLabel, "Reset");
      assert.equal(button.props.children.type, isDesktopWeb ? "Text" : "ResetIcon");
      if (isDesktopWeb) assert.equal(button.props.children.props.children, "Reset");
      button.props.onPress();
    }
    assert.equal(presses, 2);
  });
}

function jsxViewStyle(node, source) {
  if (!ts.isJsxElement(node) || node.openingElement.tagName.getText(source) !== "View") return null;
  return node.openingElement.attributes.properties
    .find(attribute => attribute.name?.text === "style")?.initializer?.getText(source);
}

for (const [screen, rowStyle] of [
  ["MyTeamScreen", "playerPickerSelectRow"],
  ["MarketScreen", "marketFilterSecondaryRow"],
  ["LeagueScreen", "leagueFilterRow"],
]) {
  test(`${screen}: compact reset stays inside the filter row`, () => {
    const { source, nodes } = screenNodes(screen);
    const button = nodes.find(node => ts.isJsxSelfClosingElement(node)
      && node.tagName.getText(source) === "FilterResetButton"
      && node.attributes.properties.some(attribute => attribute.name?.text === "compact"));
    assert.ok(button);
    assert.match(jsxViewStyle(button.parent, source), new RegExp(`styles\\.${rowStyle}\\b`));
  });
}

test("league filters and management actions remain separate groups", () => {
  const { source, nodes } = screenNodes("LeagueScreen");
  const filters = nodes.find(node => /styles\.leagueFilterRow\b/.test(jsxViewStyle(node, source) ?? ""));
  const actions = nodes.find(node => /styles\.leagueToolbarActions\b/.test(jsxViewStyle(node, source) ?? ""));
  assert.ok(filters && actions);
  assert.equal(filters.parent, actions.parent);
  assert.match(jsxViewStyle(filters.parent, source), /styles\.leagueToolbar\b/);
  assert.match(actions.getText(source), /league\.joinLeagueButton/);
  assert.match(actions.getText(source), /league\.configureButton/);
  assert.doesNotMatch(actions.getText(source), /FilterResetButton/);
});

for (const isDesktopWeb of [false, true]) {
  test(`league toolbar: ${isDesktopWeb ? "one desktop row" : "two mobile rows"}`, () => {
    const tokens = compile(fs.readFileSync(require.resolve("../src/theme/tokens.ts"), "utf8"));
    const { styles } = compile(fs.readFileSync(require.resolve("../src/styles.ts"), "utf8"), {}, {
      "react-native": { Platform: { OS: "web" }, StyleSheet: { create: value => value } },
      "./theme/tokens": tokens,
    });
    const { source, nodes } = screenNodes("LeagueScreen");
    function resolvedStyle(name) {
      const node = nodes.find(node => new RegExp(`styles\\.${name}\\b`).test(jsxViewStyle(node, source) ?? ""));
      const attribute = node.openingElement.attributes.properties.find(p => p.name?.text === "style");
      const { value } = compile(`export const value = ${attribute.initializer.expression.getText(source)};`, { styles, isDesktopWeb });
      return Object.assign({}, ...[value].flat().filter(Boolean));
    }
    const toolbar = resolvedStyle("leagueToolbar");
    const filters = resolvedStyle("leagueFilterRow");
    const actions = resolvedStyle("leagueToolbarActions");
    assert.equal(toolbar.flexDirection ?? "column", isDesktopWeb ? "row" : "column");
    assert.equal(filters.width, isDesktopWeb ? "auto" : "100%");
    assert.equal(actions.width, isDesktopWeb ? "auto" : "100%");
    assert.equal(filters.flexDirection, "row");
    assert.equal(actions.flexDirection, "row");
    if (isDesktopWeb) {
      assert.equal(toolbar.flexWrap, "nowrap");
      assert.equal(toolbar.alignItems, "center");
      assert.ok(toolbar.zIndex > 0, "dropdowns stay above the standings table");
      assert.equal(actions.flexShrink, 0);
      assert.equal(actions.marginLeft, "auto", "management actions align to the right edge");
    } else {
      assert.notEqual(actions.marginLeft, "auto", "mobile actions keep the full-width layout");
    }
  });
}
