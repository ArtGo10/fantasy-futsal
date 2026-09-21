const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const filename = require.resolve("../src/features/fantasy/screens/MyTeamScreen.tsx");
const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findNode(predicate) {
  let found;
  function visit(node) {
    if (predicate(node)) found = node;
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, "screen navigation node exists");
  return found;
}
function compile(sourceText, name, scope) {
  const { outputText } = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: "navigation.tsx",
  });
  const exports = {};
  new Function("require", "exports", ...Object.keys(scope), outputText)(require, exports, ...Object.values(scope));
  return exports[name];
}
function screenFunction(name, scope) {
  const node = findNode(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  return compile(`export ${node.getText(source)}`, name, scope);
}

for (const mode of ["pick", "transfers"]) {
  test(`${mode}: chip navigation selects the owner's exact historical week and returns without changing the draft`, () => {
    const changes = [];
    const scope = {
      fantasyGameweeks: [{ id: "season-gw2", number: 2 }, { id: "season-gw4", number: 4 }],
      fantasyTeam: { id: "my-team", chips: {} },
      teamWorkspaceMode: mode,
      pointsViewerReturnModeRef: { current: "overview" },
      setPointsViewerTeamId: id => changes.push(["team", id]),
      setPointsViewerGameweekId: id => changes.push(["week", id]),
      setTeamWorkspaceMode: value => changes.push(["mode", value]),
    };
    const open = screenFunction("handleViewPlayedChipGameweek", scope);
    const lead = screenFunction("renderTeamWorkspaceLeadContent", {
      ...scope, isInitialTeamCreation: false, TeamChipTokenRail: "Rail",
      season: { slug: "season" }, hasUnsavedChanges: true, isSaving: false,
      handleViewPlayedChipGameweek: open,
      handleChipPlayed: () => {},
    })();
    const rail = mode === "transfers" ? screenFunction("renderTransferSummaryBar", {
      ...scope, TeamChipTokenRail: "Rail", season: { slug: "season" },
      hasUnsavedChanges: true, isSaving: false, handleViewPlayedChipGameweek: open,
      handleChipPlayed: () => {}, budgetValue: "10M", isBudgetNegative: false,
      transferSummary: { totalPenaltyPoints: 8, freeTransfersValue: "0" },
    })() : lead;
    if (mode === "transfers") {
      assert.equal(lead, null, "no duplicate four-chip rail on transfers");
      assert.equal(rail.props.transferSummary.costPoints, 8);
    }
    assert.equal(rail.type, "Rail");
    assert.equal(rail.props.hasUnsavedChanges, true);
    assert.equal(rail.props.gameweeks, scope.fantasyGameweeks);
    rail.props.onViewPlayedGameweek(2);
    assert.deepEqual(changes, [["team", "my-team"], ["week", "season-gw2"], ["mode", "pointsDetails"]]);
    assert.equal(scope.pointsViewerReturnModeRef.current, mode);
    screenFunction("handleClosePointsViewer", scope)();
    assert.deepEqual(changes.slice(3), [["team", null], ["week", null], ["mode", mode]]);
    assert.equal(scope.pointsViewerReturnModeRef.current, "overview");
  });
}

test("successful unlimited-chip activation opens a clean transfers workspace; scoring chips do not navigate", () => {
  for (const chip of ["wildcard", "freeHit", "benchBoost", "tripleCaptain"]) {
    const changes = [];
    screenFunction("handleChipPlayed", {
      isUnlimitedTransferChip: value => value === "wildcard" || value === "freeHit",
      handleResetTransferDraft: () => changes.push("reset"),
      setTeamWorkspaceMode: mode => changes.push(mode),
    })(chip);
    assert.deepEqual(changes, chip === "wildcard" || chip === "freeHit" ? ["reset", "transfers"] : []);
  }
});

test("unknown week or absent team never falls back to the dashboard or another team", () => {
  for (const missing of ["week", "team"]) {
    const changes = [];
    const scope = {
      fantasyGameweeks: missing === "week" ? [] : [{ id: "gw2", number: 2 }],
      fantasyTeam: missing === "team" ? null : { id: "my-team" },
      teamWorkspaceMode: "pick", pointsViewerReturnModeRef: { current: "overview" },
      setPointsViewerTeamId: id => changes.push(id),
      setPointsViewerGameweekId: id => changes.push(id),
      setTeamWorkspaceMode: mode => changes.push(mode),
    };
    screenFunction("handleViewPlayedChipGameweek", scope)(2);
    assert.deepEqual(changes, []);
  }
});

test("historical viewer receives the selected week and cannot inherit this week's highest-team statistics", () => {
  const viewer = findNode(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "GameweekTeamViewer");
  const variable = findNode(node => ts.isVariableDeclaration(node) && node.name.getText(source) === "isViewingDashboardGameweek");
  for (const gameweekId of ["gw2", "gw4"]) {
    const changed = [];
    const scope = {
      GameweekTeamViewer: "Viewer", canQueryPrivateData: true, fantasyClubs: [],
      pointsViewerTeamId: "my-team", fantasyTeam: { id: "my-team" },
      pointsViewerGameweekId: gameweekId, dashboardCurrentGameweekId: "gw4",
      dashboardHighestTeam: { id: "current-leader", currentGameweekPoints: 70 },
      getFiniteFantasyNumber: Number, handleClosePointsViewer: () => changed.push("back"),
      setPointsViewerTeamId: value => changed.push(["team", value]),
      setPointsViewerGameweekId: value => changed.push(["week", value]),
      fantasyOverview: { season: { slug: "season" } },
    };
    const render = compile(`export const render = () => { const ${variable.getText(source)}; return (${viewer.getText(source)}); };`, "render", scope);
    const { props } = render();
    assert.equal(props.gameweekId, gameweekId);
    assert.equal(props.fantasyTeamId, "my-team");
    assert.equal(props.highestTeamIdOverride, gameweekId === "gw4" ? "current-leader" : undefined);
    assert.equal(props.highestPointsOverride, gameweekId === "gw4" ? 70 : undefined);
    props.onOpenTeam("historical-leader");
    assert.deepEqual(changed, [["team", "historical-leader"], ["week", gameweekId]]);
    props.onBack();
    assert.equal(changed.at(-1), "back");
  }
});
