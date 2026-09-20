const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");
const { ConvexError } = require("convex/values");

function load(path, mocks = {}) {
  const filename = require.resolve(path);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const result = {};
  new Function("require", "exports", source)(
    (id) => mocks[id] ?? require(id),
    result,
  );
  return result;
}
const { FANTASY_CHIPS, getChipSeasonPeriod } = load("../convex/fantasyChips.ts");
const { getTranslation } = load("../src/i18n/translations.ts");
const { colors } = load("../src/theme/tokens.ts");
const flattenStyle = value => Object.assign({}, ...(Array.isArray(value) ? value.filter(Boolean) : [value]));
const nodesOf = (tree) =>
  Array.isArray(tree)
    ? tree.flatMap(nodesOf)
    : tree?.props
      ? [tree, ...nodesOf(tree.props.children)]
      : [];
const textOf = (tree) =>
  Array.isArray(tree)
    ? tree.map(textOf).join("")
    : tree?.props
      ? textOf(tree.props.children)
      : typeof tree === "string"
        ? tree
        : "";

function harness(language = "en") {
  const hooks = [];
  const calls = [];
  const viewedGameweeks = [];
  let cursor = 0;
  let fail = false;
  let resolve;
  let hold = false;
  const view = {
    gameweekId: "gw4",
    gameweekNumber: 4,
    deadlineAt: Date.now() + 100000,
    half: 1,
    firstHalfEndGameweek: 9,
    firstHalfDeadlineAt: Date.now() + 9e7,
    secondHalfStartGameweek: 10,
    lastGameweek: 18,
    activeChip: null,
    transfersUsed: 0,
    items: FANTASY_CHIPS.map((id) => ({
      id,
      status: "available",
      gameweekNumber: null,
      canPlay: true,
      canCancel: false,
      unavailableReason: null,
    })),
  };
  const props = {
    view,
    seasonSlug: "season",
    onViewPlayedGameweek: number => viewedGameweeks.push(number),
    hasUnsavedChanges: false,
    isSaving: false,
  };
  const component = load(
    "../src/features/fantasy/components/TeamChipTokenRail.tsx",
    {
      react: {
        useState(initial) {
          const i = cursor++;
          if (!(i in hooks))
            hooks[i] = typeof initial === "function" ? initial() : initial;
          return [
            hooks[i],
            (next) => {
              hooks[i] = next;
            },
          ];
        },
        useRef(initial) {
          const i = cursor++;
          return (hooks[i] ??= { current: initial });
        },
        useEffect() {},
      },
      "convex/react": {
        useMutation: (name) => async (args) => {
          calls.push({ name, args });
          if (hold)
            await new Promise((done) => {
              resolve = done;
            });
          if (fail) throw new ConvexError("chips.deadline");
        },
      },
      "react-native": {
        StyleSheet: { create: (value) => value },
        Pressable: "Pressable",
        ScrollView: "ScrollView",
        View: "View",
        Text: "Text",
      },
      "lucide-react-native": {
        ArrowUpFromLine: "Icon",
        ChevronRight: "ChevronRight",
        CircleStar: "Icon",
        Ticket: "Icon",
        WandSparkles: "Icon",
      },
      "../../../../convex/fantasyChips": { FANTASY_CHIPS, getChipSeasonPeriod },
      "../../../components/common/AppLoadingOverlay": {
        AppLoadingOverlay: "Loader",
      },
      "../../../i18n/I18nProvider": {
        useI18n: () => ({
          language,
          t: (key) => getTranslation(language, key),
        }),
      },
      "../../../lib/convexApi": {
        api: { fantasy: { playMyChip: "play", cancelMyChip: "cancel" } },
      },
      "../../../styles": { styles: {} },
      "../../../theme/tokens": { colors },
      "../utils/seasonThemeContext": {
        useFantasySeasonTheme: () => ({ primaryColor: "#004494" }),
      },
      "./BottomSheet": { BottomSheet: "Sheet" },
      "./TransferSummaryMetrics": { TransferSummaryMetrics: "TransferSummaryMetrics" },
    },
  ).TeamChipTokenRail;
  let tree;
  function render() {
    cursor = 0;
    tree = component(props);
    return nodesOf(tree);
  }
  function button(label) {
    const buttons = render().filter((node) => node.type === "Pressable");
    return buttons.find((node) => node.props.accessibilityLabel === label) ??
      buttons.reverse().find((node) => textOf(node) === label);
  }
  const press = (label) => {
    const node = button(label);
    assert.ok(node, label);
    assert.ok(!node.props.disabled, label);
    return node.props.onPress();
  };
  render();
  return {
    props,
    view,
    calls,
    viewedGameweeks,
    button,
    press,
    render,
    text: () => textOf(tree),
    fail: () => {
      fail = true;
    },
    hold: () => {
      hold = true;
    },
    finish: () => resolve(),
  };
}

for (const language of ["en", "uk", "pl"]) {
  test(`${language}: description uses our calendar, Play opens a second confirmation without mutation`, async () => {
    const h = harness(language);
    const t = (key) => getTranslation(language, key);
    h.press(`${t("team.overview.benchBoost")}, ${t("team.chips.play")}`);
    assert.ok(h.render().find((node) => node.type === "Sheet").props.visible);
    assert.equal(
      h.render().find((node) => node.type === "Sheet").props
        .contentScrollEnabled,
      false,
    );
    const scrollBody = h.render().find((node) => node.type === "ScrollView");
    assert.ok(
      !nodesOf(scrollBody).some((node) => node.type === "Pressable"),
      "actions remain outside scrolling description",
    );
    assert.ok(h.text().includes("12"));
    assert.ok(h.text().includes("100%"));
    assert.ok(h.text().includes("18"));
    assert.ok(!h.text().includes("GW19"));
    assert.ok(!h.render().some(node => node.type === "Text" &&
      textOf(node) === t("team.chips.gameweek").replace("{gw}", "4")));
    h.press(t("team.chips.play"));
    h.render();
    assert.equal(h.calls.length, 0);
    assert.ok(
      h
        .text()
        .includes(
          t("team.chips.confirmPlay")
            .replace("{chip}", t("team.overview.benchBoost"))
            .replace("{gw}", "4"),
        ),
    );
    h.press(t("common.cancel"));
    assert.equal(h.calls.length, 0);
    h.press(t("team.chips.play"));
    h.press(t("team.chips.confirm"));
    await Promise.resolve();
    assert.deepEqual(h.calls, [
      {
        name: "play",
        args: { chip: "benchBoost", seasonSlug: "season", gameweekId: "gw4" },
      },
    ]);
  });
}

for (const language of ["en", "uk", "pl"]) {
  test(`${language}: chip names are translated on cards, details and confirmation`, () => {
    const h = harness(language);
    const t = (key) => getTranslation(language, key);
    for (const chip of FANTASY_CHIPS) {
      const name = t(`team.overview.${chip}`);
      if (language !== "en") assert.notEqual(name, getTranslation("en", `team.overview.${chip}`));
      h.press(`${name}, ${t("team.chips.play")}`);
      const heading = h.render().find(node => node.props.accessibilityRole === "header");
      assert.equal(textOf(heading), name);
      h.press(t("team.chips.play"));
      h.render();
      assert.ok(h.text().includes(t("team.chips.confirmPlay").replace("{chip}", name).replace("{gw}", "4")));
    }
  });
}

test("the entire card is one accessible button with a compact non-interactive Play badge", () => {
  const h = harness();
  const tree = h.render();
  const rail = tree.find(node => node.type === "View");
  const railStyle = Object.assign({}, ...rail.props.style.filter(Boolean));
  assert.equal(railStyle.maxWidth, 560);
  assert.equal(railStyle.alignSelf, "center");
  assert.equal(railStyle.marginHorizontal, "auto");
  const cards = nodesOf(rail).filter(node => node.type === "Pressable");
  assert.equal(cards.length, 4);
  for (const card of cards) {
    assert.equal(card.type, "Pressable");
    assert.equal(card.props.accessibilityRole, "button");
    assert.equal(typeof card.props.onPress, "function");
    const actions = nodesOf(card).filter(node => node.type === "Pressable");
    assert.equal(actions.length, 1);
    const cardStyle = Object.assign({}, ...card.props.style({ pressed: false }).filter(Boolean));
    assert.equal(cardStyle.height, 92);
    assert.equal(cardStyle.gap, 4);
    assert.equal(cardStyle.paddingVertical, 8);
    const statusSlot = card.props.children[2];
    assert.equal(flattenStyle(statusSlot.props.style).height, 20);
    const style = Object.assign({}, ...statusSlot.props.children.props.style.filter(Boolean));
    assert.equal(style.backgroundColor, "#004494");
    assert.equal(style.width, undefined);
    assert.equal(style.minHeight, 20);
    assert.equal(style.paddingHorizontal, 6);
    assert.equal(style.paddingVertical, 3);
    const titleSlot = card.props.children[1];
    assert.equal(flattenStyle(titleSlot.props.style).justifyContent, "center");
    assert.equal(flattenStyle(titleSlot.props.style).height, 24);
  }
});

test("transfers render three metrics and only Wildcard and Free Hit, sharing their normal confirmation", async () => {
  const h = harness();
  h.props.transferSummary = { bankValue: "10.5M", costPoints: 8, freeTransfersValue: "0", isBankNegative: false };
  const tree = h.render();
  const metrics = tree.find(node => node.type === "TransferSummaryMetrics");
  assert.equal(metrics.props.summary, h.props.transferSummary);
  const cards = tree.filter(node => node.type === "Pressable" && node.props.accessibilityLabel);
  assert.deepEqual(cards.map(node => node.props.accessibilityLabel), ["Wildcard, Play", "Free Hit, Play"]);
  const opened = [];
  h.props.onPlayed = chip => opened.push(chip);
  h.press("Wildcard, Play");
  h.press("Play");
  assert.deepEqual(opened, []);
  await h.press("Confirm");
  assert.deepEqual(opened, ["wildcard"]);
});

test("transfer metrics and chips share one non-shrinking row at every container width", () => {
  const h = harness();
  h.props.transferSummary = { bankValue: "10.5M", costPoints: 0, freeTransfersValue: "1", isBankNegative: false };
  for (const width of [288, 358, 434, 480, 760]) {
    h.render().find(node => node.type === "View").props.onLayout({ nativeEvent: { layout: { width } } });
    const rail = h.render().find(node => node.type === "View");
    const style = flattenStyle(rail.props.style);
    assert.equal(style.flexShrink, 0);
    assert.notEqual(style.flexDirection, "column");
    const children = rail.props.children.flat().filter(Boolean);
    assert.deepEqual(children.map(node => node.type), ["TransferSummaryMetrics", "Pressable", "Pressable"]);
    assert.equal(children[0].props.compact, width < 480);
    assert.equal(children[0].props.narrow, width < 352);
    for (const card of children.slice(1)) {
      assert.equal(flattenStyle(card.props.style({ pressed: false })).height, width < 480 ? 72 : 92);
      assert.equal(card.props.children[0].props.size, width < 480 ? 16 : 20);
    }
  }
});

test("narrow transfer history uses a readable week abbreviation and retains the full accessible status", () => {
  for (const language of ["en", "uk", "pl"]) {
    const h = harness(language);
    const t = key => getTranslation(language, key);
    h.props.transferSummary = { bankValue: "10.5M", costPoints: 0, freeTransfersValue: "1", isBankNegative: false };
    Object.assign(h.view.items[2], { status: "played", gameweekNumber: 12, canPlay: false });
    for (const width of [288, 358]) {
      h.render().find(node => node.type === "View").props.onLayout({ nativeEvent: { layout: { width } } });
      const card = h.button(`${t("team.overview.wildcard")}, ${t("team.chips.played").replace("{gw}", "12")}`);
      assert.equal(textOf(card.props.children[2]), t(width < 352 ? "team.chips.playedNarrow" : "team.chips.playedShort").replace("{gw}", "12"));
    }
  }
});

test("activation callback waits for success and never runs on cancellation or a rejected activation", async () => {
  for (const mode of ["success", "failure", "cancel"]) {
    const h = harness();
    const opened = [];
    h.props.onPlayed = chip => opened.push(chip);
    if (mode === "cancel") {
      Object.assign(h.view.items[2], { status: "active", canPlay: false, canCancel: true });
      h.press("Wildcard, Active");
      h.press(getTranslation("en", "team.chips.cancel"));
    } else {
      h.press("Wildcard, Play");
      h.press("Play");
    }
    h.hold();
    if (mode === "failure") h.fail();
    const pending = h.press("Confirm");
    assert.deepEqual(opened, []);
    h.finish();
    await pending;
    await new Promise(setImmediate);
    assert.deepEqual(opened, mode === "success" ? ["wildcard"] : []);
  }
});

test("missing chip view shows availability without a current gameweek heading or false deadline", () => {
  const h = harness("uk");
  h.props.view = undefined;
  h.press("Підсилення лави, Зіграти");
  assert.ok(!h.text().includes("Тур 5"));
  assert.ok(h.text().includes(getTranslation("uk", "team.chips.unavailable")));
  assert.ok(!h.text().includes(getTranslation("uk", "team.chips.deadline")));
  assert.equal(h.button("Зіграти").props.disabled, true);
  assert.equal(h.calls.length, 0);
});

for (const chip of FANTASY_CHIPS) {
  test(`${chip}: played token opens its historical gameweek, never the description or activation`, () => {
    const h = harness();
    h.props.hasUnsavedChanges = true;
    Object.assign(h.view.items.find(row => row.id === chip), {
      status: "played", gameweekNumber: 2, canPlay: false,
    });
    const label = `${getTranslation("en", `team.overview.${chip}`)}, Played in GW2`;
    assert.ok(nodesOf(h.button(label)).some(node => node.type === "ChevronRight"));
    h.press(label);
    assert.deepEqual(h.viewedGameweeks, [2]);
    assert.equal(h.render().find(node => node.type === "Sheet").props.visible, false);
    assert.equal(h.calls.length, 0);
  });
}

test("a played chip cannot open a description or navigate to a guessed week when history is unavailable", () => {
  for (const missing of ["callback", "gameweek"]) {
    const h = harness();
    const row = h.view.items[0];
    Object.assign(row, { status: "played", gameweekNumber: 2, canPlay: false });
    if (missing === "callback") h.props.onViewPlayedGameweek = undefined;
    else row.gameweekNumber = null;
    const label = `Bench Boost, Played in GW${row.gameweekNumber ?? ""}`;
    assert.equal(h.button(label).props.disabled, true);
    h.button(label).props.onPress();
    assert.equal(h.render().find(node => node.type === "Sheet").props.visible, false);
    assert.deepEqual(h.viewedGameweeks, []);
  }
});

test("unknown target gameweek never renders an empty Gameweek label", () => {
  const h = harness();
  h.props.view = undefined;
  h.press("Bench Boost, Play");
  assert.ok(!h.render().some(node => node.type === "Text" && textOf(node) === "Gameweek "));
  assert.equal(h.button("Play").props.disabled, true);
});

test("played cards use one abbreviated line with the week number and a full accessible label", () => {
  for (const language of ["en", "uk", "pl"]) {
    const h = harness(language);
    const t = key => getTranslation(language, key);
    Object.assign(h.view.items[0], { status: "played", gameweekNumber: 12, canPlay: false });
    const button = h.button(`${t("team.overview.benchBoost")}, ${t("team.chips.played").replace("{gw}", "12")}`);
    const badge = button.props.children[2];
    assert.equal(textOf(badge), t("team.chips.playedShort").replace("{gw}", "12"));
    assert.equal(textOf(badge).split("\n").length, 1);
    assert.equal(badge.props.children.props.children[0].props.numberOfLines, 1);
    assert.ok(textOf(button).endsWith("12"));
    assert.ok(nodesOf(button).some(node => node.type === "ChevronRight"));
  }
});

test("history text fits narrow cards without changing card or status slot dimensions", () => {
  const h = harness("uk");
  Object.assign(h.view.items[0], { status: "played", gameweekNumber: 18, canPlay: false });
  for (const [width, fontSize] of [[288, 8], [358, 10], [560, 10]]) {
    const rail = h.render().find(node => node.type === "View");
    rail.props.onLayout({ nativeEvent: { layout: { width } } });
    const button = h.button("Підсилення лави, Зіграно в турі 18");
    const status = button.props.children[2].props.children.props.children[0];
    assert.equal(Object.assign({}, ...status.props.style.filter(Boolean)).fontSize, fontSize);
    assert.equal(textOf(status), "Зіграно ІТ18");
    assert.equal(status.props.numberOfLines, 1);
    assert.equal(Object.assign({}, ...button.props.style({ pressed: false }).filter(Boolean)).height, 92);
  }
});

for (const language of ["en", "uk", "pl"]) {
  for (const [seasonSlug, loadedRounds, end, start, last] of [
    ["ukrainian-extra-league-2026-27", 33, 9, 10, 18],
    ["polish-futsal-ekstraklasa-2026-27", 15, 15, 16, 30],
  ]) {
    test(`${language}: every chip explains both halves even without backend chip data (${seasonSlug})`, () => {
      const h = harness(language);
      const t = key => getTranslation(language, key);
      h.props.view = undefined;
      h.props.seasonSlug = seasonSlug;
      h.props.gameweeks = Array.from({ length: loadedRounds }, (_, i) => ({ number: i + 1, deadlineAt: 1_800_000_000_000 + i * 86400000 }));
      for (const chip of FANTASY_CHIPS) {
        h.press(`${t(`team.overview.${chip}`)}, ${t("team.chips.play")}`);
        h.render();
        assert.ok(h.text().includes(t("team.chips.seasonAllowance")));
        assert.ok(h.text().includes(t("team.chips.period").replaceAll("{end}", String(end)).replace("{start}", String(start)).replace("{last}", String(last))));
        assert.ok(!/\{(?:end|start|last|date)\}/.test(h.text()));
        assert.ok(h.text().includes("2027"));
        assert.equal(h.button(t("team.chips.play")).props.disabled, true);
      }
      assert.equal(h.calls.length, 0);
    });
  }
}

test("season limit remains visible before either the calendar or chip state loads", () => {
  const h = harness();
  h.props.view = undefined;
  h.press("Bench Boost, Play");
  h.render();
  assert.ok(h.text().includes(getTranslation("en", "team.chips.seasonAllowance")));
  assert.ok(!h.text().includes("undefined"));
  assert.ok(!h.text().includes("{end}"));
  assert.equal(h.button("Play").props.disabled, true);
});

test("unsaved draft, expired deadline and played chip disable activation", () => {
  for (const condition of ["draft", "deadline", "played"]) {
    const h = harness();
    h.press("Bench Boost, Play");
    if (condition === "draft") h.props.hasUnsavedChanges = true;
    if (condition === "deadline") h.view.deadlineAt = 1;
    if (condition === "played")
      Object.assign(h.view.items[0], {
        status: "played",
        gameweekNumber: 2,
        canPlay: false,
      });
    assert.equal(
      h.button(condition === "played" ? "Played in GW2" : "Play").props
        .disabled,
      true,
    );
    assert.equal(h.calls.length, 0);
  }
});

test("active token cancellation also confirms; a used irreversible chip has no cancellation action", async () => {
  const h = harness();
  Object.assign(h.view.items[0], {
    status: "active",
    gameweekNumber: 4,
    canPlay: false,
    canCancel: true,
  });
  h.press("Bench Boost, Active");
  assert.ok(h.render().find(node => node.type === "Sheet").props.visible);
  assert.deepEqual(h.viewedGameweeks, []);
  h.press("Cancel chip");
  assert.equal(h.calls.length, 0);
  h.press("Confirm");
  await Promise.resolve();
  assert.equal(h.calls[0].name, "cancel");
  Object.assign(h.view.items[0], { canCancel: false });
  h.press("Bench Boost, Active");
  assert.equal(h.button("Cancel chip"), undefined);
});

test("double confirmation cannot issue two requests; failures remain visible and localized", async () => {
  const h = harness();
  h.fail();
  h.hold();
  h.press("Bench Boost, Play");
  h.press("Play");
  const confirm = h.button("Confirm");
  confirm.props.onPress();
  confirm.props.onPress();
  assert.equal(h.calls.length, 1);
  assert.ok(
    h.render().some((node) => node.type === "Loader" && node.props.fullScreen),
  );
  h.finish();
  await new Promise((resolve) => setImmediate(resolve));
  h.render();
  assert.ok(h.text().includes(getTranslation("en", "team.chips.deadline")));
  assert.ok(!h.render().some((node) => node.type === "Loader"));
});
