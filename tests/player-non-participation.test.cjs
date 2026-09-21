const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const originalTsLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { markGameweekNonParticipantsDoubtful } = require("../convex/fantasy.ts");
if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
else delete require.extensions[".ts"];

function setup() {
  const player = {
    _id: "player", seasonId: "season", clubId: "club", status: "active",
    displayName: "Test Player", createdAt: 1, updatedAt: 1,
  };
  const tables = {
    users: [{ _id: "admin", clerkId: "admin", role: "admin" }],
    fantasySeasons: [{ _id: "season", slug: "test-season" }],
    fantasyPlayers: [player],
    fantasyClubs: [{ _id: "club", seasonId: "season", name: "Club" }],
    fantasyGameweeks: [], fantasyFixtures: [], fantasyFixtureLineups: [], fantasyFixtureEvents: [],
  };
  const patches = [];
  function get(id) { return Object.values(tables).flat().find(row => row._id === id); }
  const ctx = {
    auth: { getUserIdentity: async () => ({ subject: "admin" }) },
    db: {
      get: async id => get(id) ?? null,
      patch: async (id, values) => { patches.push({ id, values }); Object.assign(get(id), values); },
      query(table) {
        const filters = [];
        const query = {
          withIndex(_index, apply) {
            const range = { eq(field, value) { filters.push([field, value]); return range; } };
            apply(range);
            return query;
          },
          collect: async () => tables[table].filter(row => filters.every(([field, value]) => row[field] === value)),
          first: async () => (await query.collect())[0] ?? null,
        };
        return query;
      },
    },
  };
  function addWeek(number, { appeared = false, status = "completed", homeLineups = true, awayLineups = true, suffix = "" } = {}) {
    const gameweekId = `gw-${number}`;
    if (!get(gameweekId)) tables.fantasyGameweeks.push({ _id: gameweekId, seasonId: "season", number, status: "completed" });
    const fixtureId = `fixture-${number}${suffix}`;
    const fixture = {
      _id: fixtureId, seasonId: "season", gameweekId, status,
      homeClubId: "club", awayClubId: "opponent", homeClubName: "Club", awayClubName: "Opponent",
    };
    tables.fantasyFixtures.push(fixture);
    if (homeLineups) tables.fantasyFixtureLineups.push({
      _id: `home-${fixtureId}`, seasonId: "season", fixtureId, side: "home", playerId: appeared ? "player" : "teammate",
    });
    if (awayLineups) tables.fantasyFixtureLineups.push({
      _id: `away-${fixtureId}`, seasonId: "season", fixtureId, side: "away", playerId: "opponent-player",
    });
    return fixture;
  }
  function addEvent(number, type = "goal") {
    tables.fantasyFixtureEvents.push({
      _id: `event-${tables.fantasyFixtureEvents.length}`, seasonId: "season",
      fixtureId: `fixture-${number}`, gameweekId: `gw-${number}`, playerId: "player", side: "home", type,
    });
  }
  const run = (gameweekNumber, dryRun = false) => markGameweekNonParticipantsDoubtful._handler(ctx, {
    seasonSlug: "test-season", gameweekNumber, dryRun,
  });
  return { player, tables, patches, addWeek, addEvent, run };
}

test("a single absence names the gameweek in every language", async () => {
  const f = setup();
  f.addWeek(1, { appeared: true }); f.addWeek(2);
  await f.run(2);
  assert.equal(f.player.status, "doubtful");
  assert.equal(f.player.statusDetails.message, "Не грав у турі 2");
  assert.equal(f.player.statusDetails.messageUk, "Не грав у турі 2");
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 2");
  assert.equal(f.player.statusDetails.messagePl, "Nie zagrał w 2. kolejce");
});

test("consecutive missed gameweeks are calculated from lineups, not earlier status writes", async () => {
  const f = setup();
  f.addWeek(1, { appeared: true }); f.addWeek(2); f.addWeek(3); f.addWeek(4);
  const result = await f.run(4);
  assert.equal(result.targets[0].missedGameweeks, 3);
  assert.equal(f.player.statusDetails.messageUk, "Не грав в останніх 3 турах");
  assert.equal(f.player.statusDetails.messageEn, "Did not play in the last 3 gameweeks");
  assert.equal(f.player.statusDetails.messagePl, "Nie zagrał w ostatnich 3 kolejkach");
  const snapshot = structuredClone(f.player);
  assert.equal((await f.run(4)).updated, 0);
  assert.deepEqual(f.player, snapshot);
});

test("returning clears the automatic status and the next missed match starts at one", async () => {
  const f = setup();
  f.addWeek(1); f.addWeek(2);
  await f.run(2);
  f.addWeek(3, { appeared: true });
  assert.equal((await f.run(3)).clearedAutomaticDoubtful, 1);
  assert.equal(f.player.status, "active");
  assert.equal(f.player.statusDetails, undefined);
  f.addWeek(4); await f.run(4);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 4");
});

test("corrected historic lineups shorten the current streak on recalculation", async () => {
  const f = setup();
  f.addWeek(1); f.addWeek(2); f.addWeek(3);
  await f.run(3);
  f.tables.fantasyFixtureLineups.find(row => row._id === "home-fixture-2").playerId = "player";
  await f.run(3);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 3");
});

for (const message of [
  { messageEn: "Did not play last gameweek" },
  { messageUk: "Не грав у турі 1" },
  { messagePl: "Nie zagrał w ostatnich 2 kolejkach" },
]) {
  test(`old/localized automatic status is recognized: ${Object.values(message)[0]}`, async () => {
    const f = setup();
    Object.assign(f.player, { status: "doubtful", statusDetails: message });
    f.addWeek(1, { appeared: true });
    await f.run(1);
    assert.equal(f.player.status, "active");
    assert.equal(f.player.statusDetails, undefined);
  });
}

for (const status of ["injured", "suspended", "unavailable", "left", "doubtful", "active"]) {
  test(`known reason is preserved for ${status}, whether absent or present`, async () => {
    const f = setup();
    Object.assign(f.player, { status, statusDetails: { messageEn: "Severe knee injury" } });
    const original = structuredClone(f.player);
    f.addWeek(1); await f.run(1);
    assert.deepEqual(f.player, original);
    f.addWeek(2, { appeared: true }); await f.run(2);
    assert.deepEqual(f.player, original);
  });
}

test("a known reason in one language is not erased by a stale automatic translation", async () => {
  const f = setup();
  Object.assign(f.player, { status: "doubtful", statusDetails: { messageUk: "Травма коліна", messageEn: "Did not play in Gameweek 1" } });
  const original = structuredClone(f.player);
  f.addWeek(2, { appeared: true }); await f.run(2);
  assert.deepEqual(f.player, original);
});

test("suspension is excluded and breaks the unknown-absence streak", async () => {
  const f = setup();
  f.addWeek(1, { appeared: true }); f.addEvent(1, "red_card");
  f.addWeek(2);
  const suspended = await f.run(2);
  assert.equal(suspended.skippedSuspended, 1);
  assert.equal(f.player.status, "active");
  assert.equal(f.player.statusDetails, undefined);
  f.addWeek(3); await f.run(3);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 3");
});

for (const options of [
  { status: "scheduled" }, { status: "live" }, { status: "postponed" }, { status: "cancelled" },
  { homeLineups: false, awayLineups: true }, { homeLineups: false, awayLineups: false },
]) {
  test(`unconfirmed absence is not counted: ${JSON.stringify(options)}`, async () => {
    const f = setup();
    f.addWeek(1); f.addWeek(2, options);
    await f.run(2);
    assert.equal(f.player.status, "active");
    f.addWeek(3); await f.run(3);
    assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 3");
  });
}

test("a club's blank gameweek is not a missed gameweek", async () => {
  const f = setup(); f.addWeek(1); f.addWeek(3);
  await f.run(3);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 3");
});

test("double gameweeks require complete lineups and count once", async () => {
  const f = setup(); f.addWeek(1);
  const second = f.addWeek(1, { suffix: "-second", status: "scheduled" });
  await f.run(1);
  assert.equal(f.player.status, "active");
  second.status = "completed"; await f.run(1);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 1");
  f.tables.fantasyFixtureLineups.find(row => row._id === "home-fixture-1-second").playerId = "player";
  await f.run(1);
  assert.equal(f.player.status, "active");
});

test("a recorded event clears automatic absence even if the lineup has not been entered", async () => {
  const f = setup(); f.addWeek(1); await f.run(1);
  f.addWeek(2, { homeLineups: false, awayLineups: false }); f.addEvent(2);
  await f.run(2);
  assert.equal(f.player.status, "active");
  assert.equal(f.player.statusDetails, undefined);
});

test("an older-gameweek replay cannot overwrite the latest absence or return", async () => {
  const f = setup(); f.addWeek(1); f.addWeek(2); await f.run(2);
  const original = structuredClone(f.player);
  await f.run(1); assert.deepEqual(f.player, original);
  f.addWeek(3, { appeared: true }); await f.run(3);
  await f.run(1); assert.equal(f.player.status, "active");
});

test("dry run previews streaks without changing player records", async () => {
  const f = setup(); f.addWeek(1); f.addWeek(2);
  const result = await f.run(2, true);
  assert.equal(result.targets[0].missedGameweeks, 2);
  assert.equal(result.updated, 0);
  assert.equal(f.patches.length, 0);
  assert.equal(f.player.status, "active");
});

test("other clubs and seasons cannot extend an absence streak", async () => {
  const f = setup();
  const otherSeasonFixture = f.addWeek(1);
  otherSeasonFixture.seasonId = "other-season";
  f.addWeek(2); await f.run(2);
  assert.equal(f.player.statusDetails.messageEn, "Did not play in Gameweek 2");
  f.player.clubId = "different-club";
  const snapshot = structuredClone(f.player);
  f.addWeek(3); await f.run(3);
  assert.deepEqual(f.player, snapshot);
});
