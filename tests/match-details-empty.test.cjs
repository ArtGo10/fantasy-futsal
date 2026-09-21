const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function load(file, mocks = {}) {
  const path = require.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: path,
  }).outputText;
  const exports = {};
  new Function("require", "exports", source)(id => mocks[id] ?? {}, exports);
  return exports;
}
const { translations } = load("../src/i18n/translations.ts");
const fixture = { id: "match", scheduledAt: Date.UTC(2026, 8, 26, 12), status: "scheduled", homeScore: null, awayScore: null, homeClubId: "home", awayClubId: "away", homeClubName: "Home", awayClubName: "Away", venue: null };
function nodesOf(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodesOf);
  return tree?.props ? [tree, ...nodesOf(tree.props.children)] : [];
}
function render({ language = "en", status = "scheduled", homeScore = null, awayScore = null, lineups = [], events = [], state = "ready", fallback = true } = {}) {
  const currentFixture = { ...fixture, status, homeScore, awayScore };
  const mocks = {
    react: { useMemo: fn => fn() },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-native": { View: "View", Text: "Text", Pressable: "Pressable" },
    "lucide-react-native": { Clock3: "Clock", ChevronLeft: "BackIcon" },
    "../../../styles": { styles: new Proxy({}, { get: (_, key) => key }) },
    "../../../theme/tokens": { colors: { state: {} } },
    "../../../components/common/LoadingBlock": { LoadingBlock: "Loading" },
    "../../../i18n/I18nProvider": { useI18n: () => ({ language, t: key => translations[language][key] }) },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({ primaryColor: "blue" }) },
    "../components/FantasyPlayerListRow": { FantasyClubLogo: "Logo" },
    "../utils/localizedFantasyData": { localizeFantasyPlayer: player => player, transliterateLatinNameToEnglish: value => value ?? "", getLocalizedClubName: club => club.name },
  };
  const { MatchDetailsPage } = load("../src/features/fantasy/screens/SeasonScreen.tsx", mocks);
  const clubs = new Map(["home", "away"].map(id => [id, { id, name: id }]));
  const nodes = nodesOf(MatchDetailsPage({
    clubsById: clubs, clubsByName: new Map(),
    details: state === "loading" ? undefined : state === "missing" ? null : { fixture: currentFixture, events, lineups },
    fallbackFixture: fallback ? currentFixture : null, onBack: () => {},
  }));
  return {
    nodes,
    empty: nodes.find(node => node.props.style === "matchDetailsEmptyState"),
    loading: nodes.some(node => node.type === "Loading"),
    text: nodes.filter(node => node.type === "Text").map(node => node.props.children),
  };
}

for (const language of ["en", "uk", "pl"]) {
  test(`${language}: a scheduled match explains that lineups are pending`, () => {
    const view = render({ language });
    assert.ok(view.empty);
    assert.equal(view.loading, false);
    assert.ok(view.text.includes(translations[language]["matchDetails.awaitingLineupsTitle"]));
    assert.ok(view.text.includes(translations[language]["matchDetails.awaitingLineupsDescription"]));
  });
  test(`${language}: a completed 0:0 match with no details retains the result`, () => {
    const view = render({ language, status: "completed", homeScore: 0, awayScore: 0 });
    assert.ok(view.empty);
    assert.ok(view.text.includes(translations[language]["matchDetails.scoreOnlyDescription"]));
    assert.ok(view.text.includes("0:0"));
  });
}
for (const fallback of [true, false]) {
  test(`loading with fallback=${fallback} never flashes an empty state`, () => {
    const view = render({ state: "loading", fallback });
    assert.equal(view.empty, undefined);
    assert.equal(view.loading, true);
  });
  test(`resolved missing data with fallback=${fallback} never leaves a spinner`, () => {
    const view = render({ state: "missing", fallback });
    assert.ok(view.empty);
    assert.equal(view.loading, false);
  });
}
for (const status of ["live", "postponed", "cancelled", "completed"]) {
  test(`${status}: no score does not claim a final result is available`, () => {
    const view = render({ status });
    assert.ok(view.empty);
    assert.ok(view.text.includes(translations.en["matchDetails.noDetailsDescription"]));
  });
}
test("lineups without goals remain visible instead of an empty state", () => {
  const view = render({ lineups: [{ id: "lineup", side: "home", jerseyNumber: 9, playerId: "p1", playerName: "Test Player" }] });
  assert.equal(view.empty, undefined);
  assert.ok(view.text.some(text => typeof text === "string" && text.includes("Player")));
});
test("events without a lineup still render the named players and their badges", () => {
  const view = render({ events: [{ id: "goal", type: "goal", side: "away", playerId: "p1", playerName: "Test Player" }] });
  assert.equal(view.empty, undefined);
  assert.ok(view.nodes.some(node => node.props.badges?.some(badge => badge.type === "goal")));
});
