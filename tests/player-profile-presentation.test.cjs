const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");
function load(path, mocks = {}) {
  const filename = require.resolve(path);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const result = {};
  new Function("require", "exports", source)((id) => mocks[id] ?? require(id), result);
  return result;
}
function nodesOf(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodesOf);
  if (!tree?.props) return [];
  if (typeof tree.type === "function") return nodesOf(tree.type(tree.props));
  return [tree, ...nodesOf(tree.props.children)];
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node?.props) return textOf(node.props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
const translations = load("../src/i18n/translations.ts");
const localization = load("../src/features/fantasy/utils/localizedFantasyData.ts");
const details = load("../src/features/fantasy/utils/playerDetails.ts");
function renderFormPreview(profile, width = 390) {
  const { PlayerProfileStatistics } = load("../src/features/fantasy/components/PlayerProfileStatistics.tsx", {
    react: { useState: () => ["history", () => {}], useEffect: () => {} },
    "react-native": { Text: "Text", View: "View", ScrollView: "ScrollView", Pressable: "Pressable", Platform: { OS: "web" }, useWindowDimensions: () => ({ width }) },
    "../../../styles": { styles: new Proxy({}, { get: (_, key) => key }) },
    "../../../i18n/I18nProvider": { useI18n: () => ({ language: "en", t: (key) => translations.getTranslation("en", key) }) },
    "../../../components/common/LoadingBlock": {},
    "../utils/localizedFantasyData": localization,
    "../utils/playerDetails": details,
    "../utils/money": { formatFantasyMoney: String },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({}) },
    "./FantasyPlayerListRow": { FantasyClubLogo: "Logo" },
  });
  const player = { id: "p", price: 10 };
  const nodes = nodesOf(PlayerProfileStatistics({ player, profile: { player, upcomingFixtures: [], ...profile } }));
  return nodes.find((node) => node.props.style === "profilePreviewSection");
}
const formMatch = (number, points = 0, appeared = false, status = "completed") => ({
  id: `fixture-${number}`, gameweek: { number }, points, appeared, lines: [],
  fixture: { scheduledAt: number * 1000, status },
  opponent: { name: `Opponent ${number}` }, isHome: number % 2 === 0,
});

for (const width of [390, 1280]) {
  test(`${width}px: a player with no appearances sees zero-point team fixtures in form`, () => {
    const preview = renderFormPreview({ matches: [], matchHistory: [formMatch(2), formMatch(1)] }, width);
    const tiles = nodesOf(preview).filter((node) => node.props.style === "profilePreviewMatch");
    assert.equal(tiles.length, 2);
    assert.ok(textOf(tiles[0]).includes("Opponent 1"));
    assert.ok(textOf(tiles[1]).includes("Opponent 2"));
    assert.ok(tiles.every((tile) => textOf(tile).includes(`0 ${translations.getTranslation("en", "team.list.points")}`)));
    assert.ok(!textOf(preview).includes(translations.getTranslation("en", "team.viewer.noMatches")));
  });
}

test("form keeps the latest five completed team fixtures, oldest first, with earned and missed-game points", () => {
  const matchHistory = [formMatch(4, -1, true), formMatch(8, 30, true, "live"),
    formMatch(2, 5, true), formMatch(6), formMatch(1, 20, true),
    formMatch(7, 0, false, "scheduled"), formMatch(3), formMatch(5, 2, true)];
  const before = [...matchHistory];
  const preview = renderFormPreview({ matches: matchHistory.filter((match) => match.appeared), matchHistory });
  const nodes = nodesOf(preview);
  assert.deepEqual(nodes.filter((node) => node.props.style === "profilePreviewOpponent").map(textOf),
    [2, 3, 4, 5, 6].map((number) => `Opponent ${number}`));
  assert.deepEqual(nodes.filter((node) => Array.isArray(node.props.style) && node.props.style[0] === "profilePreviewValue").map(textOf),
    [5, 0, -1, 2, 0].map((points) => `${points} ${translations.getTranslation("en", "team.list.points")}`));
  assert.deepEqual(matchHistory, before);
});

test("form does not fabricate games or show the player-no-matches message before the team has completed games", () => {
  const preview = renderFormPreview({ matches: [], matchHistory: [] });
  assert.equal(nodesOf(preview).filter((node) => node.props.style === "profilePreviewMatch").length, 0);
  assert.ok(!textOf(preview).includes(translations.getTranslation("en", "team.viewer.noMatches")));
});

for (const [language, expectedName, average] of [["en", "Avalon", "Pts/M"], ["uk", "Авалон", "ФО/М"], ["pl", "Avalon", "Pkt/M"]]) {
  test(`${language}: form, preview and detailed fixtures localize opponents; all five metric labels stay single-line`, () => {
    const mocks = {
      react: { useState: () => ["fixtures", () => {}], useEffect: () => {} },
      "react/jsx-runtime": require("react/jsx-runtime"),
      "react-native": { Text: "Text", View: "View", ScrollView: "ScrollView", Pressable: "Pressable", Platform: { OS: "web" }, useWindowDimensions: () => ({ width: 390 }) },
      "../../../styles": { styles: new Proxy({}, { get: (_, key) => key }) },
      "../../../i18n/I18nProvider": { useI18n: () => ({ language, t: (key) => translations.getTranslation(language, key) }) },
      "../../../components/common/LoadingBlock": {},
      "../utils/localizedFantasyData": localization,
      "../utils/playerDetails": details,
      "../utils/money": { formatFantasyMoney: String },
      "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({}) },
      "./FantasyPlayerListRow": { FantasyClubLogo: "Logo" },
    };
    const { PlayerProfileStatistics } = load("../src/features/fantasy/components/PlayerProfileStatistics.tsx", mocks);
    const fixture = { id: "fixture", gameweek: { number: 5 }, fixture: { scheduledAt: 1790413200000, status: "scheduled" }, opponent: { name: "МФК Авалон", shortName: "Авалон" }, isHome: true };
    const player = { id: "p", price: 10, lastCompletedGameweekNumber: 12, lastCompletedGameweekPoints: 0 };
    const nodes = nodesOf(PlayerProfileStatistics({ player, profile: {
      player,
      matches: [{ ...fixture, fixture: { ...fixture.fixture, status: "completed" }, points: 3 }],
      upcomingFixtures: [fixture],
    } }));
    const previews = nodes.filter((node) => node.props.style === "profilePreviewOpponent");
    assert.equal(previews.length, 2);
    assert.deepEqual(previews.map(textOf), [expectedName, expectedName]);
    assert.ok(nodes.some((node) => node.props.style === "profileTableText" && textOf(node).includes(expectedName)));
    const metrics = nodes.filter((node) => node.props.style === "profileMetricLabel");
    assert.equal(metrics.length, 5);
    assert.equal(textOf(metrics[2]), average);
    assert.ok(textOf(metrics[3]).includes("12"));
    assert.ok(metrics.every((node) => node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit));
  });
}
