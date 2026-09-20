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

const source = compile("../src/features/fantasy/components/GameweekTeamViewer.tsx");
const player = { id: "player-1", displayName: "Player", photoUrl: "photo.png" };
const match = {
  id: "match-2",
  gameweek: { id: "gw-2", number: 2 },
  fixture: { scheduledAt: 1, homeClubName: "Home", awayClubName: "Away", homeScore: 3, awayScore: 2 },
  appeared: true,
  points: 1,
  lines: [{ kind: "appearance", count: 1, points: 1 }],
};

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

// Render only the viewer's selection/query state; native layout is covered in browser QA.
function render({ selectedId = player.id, mode = "pitch", canQuery = true, state = "ready", role = "starter", matches = [match], onBack = () => {} } = {}) {
  const loaded = {};
  const queries = [];
  const mocks = {
    react: {
      useState: (initial) => [initial === "pitch" ? mode : selectedId, () => {}],
      useMemo: (fn) => fn(),
      useRef: (value) => ({ current: value }),
      useEffect: () => {},
    },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-native": {
      Platform: { OS: "web" },
      useWindowDimensions: () => ({ width: 1440 }),
      View: "View", Text: "Text", Pressable: "Pressable",
    },
    "../../../constants": { WEB_DESKTOP_MIN_WIDTH: 1024 },
    "../../../components/common/AppLoadingOverlay": { AppLoadingOverlay: "AppLoadingOverlay" },
    "../../../i18n/I18nProvider": { useI18n: () => ({ t: (key) => key }) },
    "../../../styles": { styles: {} },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({}) },
    "../../../lib/convexApi": { api: { fantasy: { fantasyTeamGameweekView: "team" } } },
    "../../../hooks/useSafeQuery": {
      useSafeQuery: (query, args) => {
        queries.push({ query, args });
        assert.equal(query, "team", "opening details must not fetch a player profile");
        if (state === "loading") return undefined;
        if (state === "error") return null;
        return { gameweek: { id: "gw-2", number: 2 }, team: { name: "Team" }, players: [{ player, squadRole: role, matches }] };
      },
    },
    "./PlayerMatchHistory": { PlayerMatchBreakdownSheet: "MatchSheet" },
  };
  new Function("require", "exports", source)((id) => mocks[id] ?? {}, loaded);
  const nodes = nodesOf(loaded.GameweekTeamViewer({
    fantasyTeamId: "team-1", gameweekId: "gw-2", canQueryPrivateData: canQuery, onBack,
  }));
  return {
    sheet: nodes.find((node) => node.type === "MatchSheet")?.props,
    squad: nodes.find((node) => "onPlayerPress" in node.props)?.props,
    loading: nodes.some((node) => node.type === "AppLoadingOverlay"),
    loader: nodes.find((node) => node.type === "AppLoadingOverlay")?.props,
    queries,
  };
}

for (const mode of ["pitch", "list"]) {
  for (const role of ["starter", "bench", "reserve"]) {
    test(`${mode}/${role}: opens preloaded details immediately without a per-player request or spinner`, () => {
      const { sheet, squad, loading, queries } = render({ mode, role });
      assert.equal(sheet.visible, true);
      assert.deepEqual(sheet.matches, [match]);
      assert.equal("loadingPlayerId" in squad, false);
      assert.equal(loading, false);
      assert.equal(queries.length, 1);
    });
  }
}

test("the initial team request uses the fullscreen standard loader without mounting a sheet", () => {
  let returned = false;
  const view = render({ state: "loading", onBack: () => { returned = true; } });
  assert.equal(view.loading, true);
  assert.equal(view.loader.fullScreen, true);
  assert.equal(view.loader.title, "team.dashboard.loadingTitle");
  assert.equal(view.sheet, undefined);
  view.loader.onRequestClose();
  assert.equal(returned, true, "back remains available while loading");
});

test("a missing appearance retains the preloaded fixture and player identity", () => {
  const absent = { ...match, appeared: false, points: 0, lines: [] };
  const { sheet } = render({ matches: [absent] });
  assert.equal(sheet.visible, true);
  assert.deepEqual(sheet.player, player);
  assert.deepEqual(sheet.matches, [absent]);
  assert.equal(sheet.gameweekNumber, 2);
});

test("a blank gameweek does not claim that the player was absent from a nonexistent match", () => {
  const { sheet } = render({ matches: [] });
  assert.equal(sheet.emptyMessage, "team.viewer.noMatches");
});

test("clearing selection closes details without another query", () => {
  const { sheet, queries } = render({ selectedId: null });
  assert.equal(sheet.visible, false);
  assert.equal(queries.length, 1);
});

test("failed or disabled requests cannot leave a player spinner or open a false absence message", () => {
  for (const args of [{ state: "error" }, { canQuery: false }]) {
    const view = render(args);
    assert.equal(view.loading, false);
    assert.equal(view.sheet, undefined);
  }
});

test("absent player's sheet shows identity, week, score, both logos, and absence inside the breakdown", () => {
  const loaded = {};
  const mocks = {
    react: require("react"),
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-native": { View: "View", Text: "Text", ScrollView: "ScrollView" },
    "../../../i18n/I18nProvider": { useI18n: () => ({ t: (key) => key }) },
    "../../../styles": { styles: { teamPointsBreakdownPlayerCard: "breakdown" } },
    "../utils/playerStats": { getPlayerPhoto: (player) => player.photoUrl },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => ({}) },
    "./BottomSheet": { BottomSheet: "BottomSheet" },
    "./FantasyPlayerListRow": { FantasyClubLogo: "Logo" },
    "./PlayerAvatar": { PlayerAvatar: "Avatar" },
  };
  new Function("require", "exports", compile("../src/features/fantasy/components/PlayerMatchHistory.tsx"))(
    (id) => mocks[id] ?? {}, loaded,
  );
  const absent = { ...match, appeared: false, points: 0, lines: [], homeClub: { logoUrl: "home.png" }, awayClub: { logoUrl: "away.png" } };
  const nodes = nodesOf(loaded.PlayerMatchBreakdownSheet({ matches: [absent], player, visible: true, onClose: () => {} }));
  assert.equal(nodes.find((node) => node.type === "Avatar").props.photoUrl, "photo.png");
  assert.ok(nodes.some((node) => node.props.children === "Player"));
  assert.ok(nodes.some((node) => node.props.children === "team.pointsBreakdownGameweekTitle"));
  assert.ok(nodes.some((node) => node.props.children === "3 - 2"));
  assert.deepEqual(nodes.filter((node) => node.type === "Logo").map((node) => node.props.club.logoUrl), ["home.png", "away.png"]);
  const breakdown = nodes.find((node) => node.props.style === "breakdown");
  assert.ok(nodesOf(breakdown).some((node) => node.props.children === "team.viewer.noGameweekMatchDetails"));
});
