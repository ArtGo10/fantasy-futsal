const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const filename =
  require.resolve("../src/features/fantasy/utils/playerDetails.ts");
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
  fileName: filename,
});
const loaded = { exports: {} };
new Function("exports", "module", outputText)(loaded.exports, loaded);
const { getPlayerDetailSeasonStatItems, getPlayerMatchesForGameweek } =
  loaded.exports;

test("goalkeeper profile omits clean sheets, saves and goals conceded", () => {
  const items = getPlayerDetailSeasonStatItems(
    {
      position: "goalkeeper",
      cleanSheets: 3,
      saves: 20,
      goalsConceded: 10,
      penaltiesSaved: 2,
      seasonPoints: 24,
    },
    (key) => key,
  );

  assert.deepEqual(
    items.map((item) => item.key),
    [
      "seasonPoints",
      "averagePoints",
      "goals",
      "assists",
      "appearances",
      "yellowCards",
      "redCards",
      "ownGoals",
      "penaltiesMissed",
      "penaltiesSaved",
    ],
  );
  assert.equal(items.find((item) => item.key === "penaltiesSaved").value, "2");
  assert.equal(items.find((item) => item.key === "seasonPoints").value, "24");
});

test("outfield profile keeps only shared statistics", () => {
  const items = getPlayerDetailSeasonStatItems(
    { position: "universal", goals: 4, assists: 2 },
    (key) => key,
  );

  assert.equal(items.length, 9);
  assert.equal(
    items.some((item) => item.key === "penaltiesSaved"),
    false,
  );
  assert.equal(items.find((item) => item.key === "goals").value, "4");
  assert.equal(items.find((item) => item.key === "assists").value, "2");
});

function match(id, gameweekId, scheduledAt = 0, points = 0) {
  return {
    id,
    gameweek: gameweekId ? { id: gameweekId } : null,
    fixture: { gameweekId, scheduledAt },
    points,
    lines: [],
  };
}

test("team points open only matches from the viewed gameweek, not the latest match", () => {
  const latest = match("latest", "gw-4");
  const viewed = match("viewed", "gw-2", 0, 5);
  assert.deepEqual(getPlayerMatchesForGameweek([latest, viewed], "gw-2"), [
    viewed,
  ]);
});

test("keeps every match in a double gameweek, including zero points, in date order", () => {
  const earlier = match("first", "gw-2", 100, 0);
  const later = match("second", "gw-2", 200, 3);
  const other = match("other", "gw-3", 300, 8);
  const matches = [other, later, earlier];
  assert.deepEqual(getPlayerMatchesForGameweek(matches, "gw-2"), [
    earlier,
    later,
  ]);
  assert.deepEqual(matches, [other, later, earlier]);
});

test("never substitutes another gameweek when the player has no match in this one", () => {
  const matches = [match("other", "gw-4")];
  assert.deepEqual(getPlayerMatchesForGameweek(matches, "gw-2"), []);
  assert.deepEqual(getPlayerMatchesForGameweek(matches, undefined), []);
  assert.deepEqual(getPlayerMatchesForGameweek([], "gw-2"), []);
});

test("can identify a match by the fixture gameweek when the gameweek object is missing", () => {
  const item = { ...match("fixture", "gw-2"), gameweek: null };
  assert.deepEqual(getPlayerMatchesForGameweek([item], "gw-2"), [item]);
});
