const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const previousLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { playerProfile, fantasyTeamGameweekView } = require("../convex/fantasy.ts");
const { getPlayerProfileSummary } = require("../convex/playerProfileStats.ts");
const {
  getPlayerMatchStats,
} = require("../src/features/fantasy/utils/playerDetails.ts");
if (previousLoader) require.extensions[".ts"] = previousLoader;
else delete require.extensions[".ts"];

const gameweeks = [
  { _id: "gw1", number: 1, status: "completed" },
  { _id: "gw2", number: 2, status: "completed" },
  { _id: "gw3", number: 3, status: "live" },
  { _id: "gw4", number: 4, status: "upcoming" },
];
const match = (points, time, appeared = true, status = "completed") => ({
  appeared,
  points,
  fixture: { status, scheduledAt: time },
});

test("form averages only the five most recent completed appearances, not all season points", () => {
  const matches = [
    match(50, 1),
    match(1, 2),
    match(2, 3),
    match(3, 4),
    match(4, 5),
    match(5, 6),
    match(0, 7, false),
    match(90, 8, true, "live"),
  ];
  const before = [...matches];
  const summary = getPlayerProfileSummary({
    matches,
    gameweeks,
    gameweekStats: [],
  });
  assert.equal(summary.form, 3);
  assert.deepEqual(matches, before);
});

test("fewer than five appearances use the actual denominator and retain zero and negative points", () => {
  const summary = getPlayerProfileSummary({
    matches: [match(0, 1), match(-1, 2), match(5, 3)],
    gameweeks,
    gameweekStats: [],
  });
  assert.equal(summary.form, 1.3);
});

test("last gameweek means the league's last completed gameweek, even if a player missed it", () => {
  const summary = getPlayerProfileSummary({
    matches: [match(7, 1)],
    gameweeks,
    gameweekStats: [
      { gameweekId: "gw1", points: 7 },
      { gameweekId: "gw3", points: 9 },
    ],
  });
  assert.equal(summary.lastCompletedGameweekNumber, 2);
  assert.equal(summary.lastCompletedGameweekPoints, 0);
});

test("last completed gameweek aggregates its points, never a newer live gameweek", () => {
  const summary = getPlayerProfileSummary({
    matches: [],
    gameweeks,
    gameweekStats: [
      { gameweekId: "gw2", points: 3 },
      { gameweekId: "gw2", points: 4 },
      { gameweekId: "gw3", points: 20 },
    ],
  });
  assert.equal(summary.lastCompletedGameweekPoints, 7);
});

test("before the first completed gameweek the profile has no week number and zero points/form", () => {
  assert.deepEqual(
    getPlayerProfileSummary({ matches: [], gameweeks: [], gameweekStats: [] }),
    {
      form: 0,
      lastCompletedGameweekNumber: null,
      lastCompletedGameweekPoints: 0,
    },
  );
});

test("history columns show event counts, not their fantasy point rewards", () => {
  const row = getPlayerMatchStats({
    appeared: true,
    points: 8,
    lines: [
      { kind: "goal", count: 2, points: 8 },
      { kind: "assist", count: 1, points: 3 },
      { kind: "yellow_card", count: 1, points: -1 },
      { kind: "second_yellow_red", count: 1, points: -3 },
      { kind: "penalty_missed", count: 1, points: -2 },
      { kind: "penalty_saved", count: 1, points: 5 },
    ],
  });
  assert.equal(row.appeared, 1);
  assert.equal(row.goals, 2);
  assert.equal(row.assists, 1);
  assert.equal(row.secondYellowRedCards, 1);
  assert.equal(row.redCards, 0);
  assert.equal(row.penaltiesMissed, 1);
  assert.equal(row.penaltiesSaved, 1);
  assert.equal(row.points, 8);
  assert.ok(
    Object.values(getPlayerMatchStats(null)).every((value) => value === 0),
  );
});

function profileFixture() {
  const fixture = (id, week, status, scheduledAt, extra = {}) => ({
    _id: id,
    seasonId: "season",
    gameweekId: week,
    status,
    scheduledAt,
    homeClubId: "club",
    awayClubId: "opponent",
    homeClubName: "Club",
    awayClubName: "Opponent",
    ...(status === "completed" || status === "live"
      ? { homeScore: 3, awayScore: 1 }
      : {}),
    ...extra,
  });
  const tables = {
    fantasyPlayers: [
      {
        _id: "player",
        seasonId: "season",
        clubId: "club",
        displayName: "Player",
        lastName: "Player",
        position: "universal",
        price: 8,
        status: "active",
      },
    ],
    fantasySeasons: [
      {
        _id: "season",
        slug: "test-season",
        status: "active",
        name: "Test",
        leagueName: "Test",
      },
    ],
    fantasyClubs: [
      { _id: "club", seasonId: "season", name: "Club", isActive: true },
      { _id: "opponent", seasonId: "season", name: "Opponent", isActive: true },
    ],
    fantasyGameweeks: gameweeks.map((week) => ({
      ...week,
      seasonId: "season",
    })),
    fantasyFixtures: [
      fixture("played", "gw1", "completed", 100),
      fixture("missed", "gw2", "completed", 200),
      fixture("later", "gw4", "scheduled", 500),
      fixture("next", "gw3", "scheduled", 400),
      fixture("postponed", "gw2", "postponed", 150),
      fixture("cancelled", "gw4", "cancelled", 600),
      fixture("other-season", "gw4", "scheduled", 600, { seasonId: "other" }),
    ],
    fantasyFixtureLineups: [
      {
        _id: "lineup",
        playerId: "player",
        fixtureId: "played",
        seasonId: "season",
        side: "home",
      },
    ],
    fantasyFixtureEvents: [
      {
        _id: "goal",
        playerId: "player",
        fixtureId: "played",
        seasonId: "season",
        type: "goal",
        side: "home",
      },
    ],
    fantasyPlayerGameweekStats: [
      {
        _id: "stats",
        seasonId: "season",
        playerId: "player",
        gameweekId: "gw1",
        appeared: true,
        appearances: 1,
        points: 5,
        goals: 1,
      },
    ],
  };
  const reads = [];
  const ctx = {
    auth: { getUserIdentity: async () => ({ subject: "manager" }) },
    db: {
      async get(id) {
        return (
          Object.values(tables)
            .flat()
            .find((row) => row._id === id) ?? null
        );
      },
      query(table) {
        reads.push(table);
        const filters = [];
        const query = {
          withIndex(_name, apply) {
            const range = {
              eq(field, value) {
                filters.push([field, value]);
                return range;
              },
            };
            apply(range);
            return query;
          },
          async collect() {
            return (tables[table] ?? []).filter((row) =>
              filters.every(([key, value]) => row[key] === value),
            );
          },
          async first() {
            return (await query.collect())[0] ?? null;
          },
        };
        return query;
      },
    },
  };
  return { ctx, tables, reads };
}

test("profile includes missed games in history but preserves the direct gameweek breakdown contract", async () => {
  const { ctx } = profileFixture();
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.deepEqual(
    profile.matches.map((match) => match.id),
    ["played"],
  );
  assert.deepEqual(
    profile.matchHistory.map((match) => match.id),
    ["missed", "played"],
  );
  assert.equal(profile.matchHistory[0].appeared, false);
  assert.equal(profile.matchHistory[0].points, 0);
  assert.equal(profile.player.lastCompletedGameweekPoints, 0);
  assert.equal(profile.player.averagePointsPerGameweek, 5);
  assert.equal(profile.player.form, 5);
});

test("upcoming fixtures are chronological and exclude completed, cancelled and other-season games", async () => {
  const { ctx } = profileFixture();
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.deepEqual(
    profile.upcomingFixtures.map((match) => match.id),
    ["next", "later", "postponed"],
  );
  assert.equal(profile.upcomingFixtures[0].opponent.name, "Opponent");
  assert.equal(profile.upcomingFixtures[0].isHome, true);
});

test("a player without appearances receives zero-point completed team fixtures for the form preview", async () => {
  const { ctx, tables } = profileFixture();
  tables.fantasyFixtureLineups = [];
  tables.fantasyFixtureEvents = [];
  tables.fantasyPlayerGameweekStats = [];
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.deepEqual(profile.matches, []);
  assert.deepEqual(profile.matchHistory.map((match) => match.id), ["missed", "played"]);
  assert.ok(profile.matchHistory.every((match) => match.points === 0 && !match.appeared));
  assert.equal(profile.player.form, 0);
});

test("a previous club's recorded appearance stays in history with the correct opponent", async () => {
  const { ctx, tables } = profileFixture();
  Object.assign(tables.fantasyFixtures[0], {
    homeClubId: "opponent",
    awayClubId: "former",
    awayClubName: "Former",
  });
  tables.fantasyFixtureLineups[0].side = "away";
  tables.fantasyFixtureEvents[0].side = "away";
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.equal(profile.matches[0].isHome, false);
  assert.equal(profile.matches[0].opponent.name, "Opponent");
  assert.equal(profile.matches[0].resultKind, "loss");
});

test("a clubless player keeps past appearances but has no upcoming club fixtures", async () => {
  const { ctx, tables } = profileFixture();
  delete tables.fantasyPlayers[0].clubId;
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.equal(profile.matches.length, 1);
  assert.equal(profile.matchHistory.length, 1);
  assert.deepEqual(profile.upcomingFixtures, []);
});

test("a live match is not a completed history result but remains available to the gameweek viewer", async () => {
  const { ctx, tables } = profileFixture();
  tables.fantasyFixtures[0].status = "live";
  const profile = await playerProfile._handler(ctx, { playerId: "player" });
  assert.equal(profile.matches[0].id, "played");
  assert.deepEqual(profile.matchHistory.map((match) => match.id), ["missed"]);
  assert.equal(profile.player.form, 0);
});

function teamFixture() {
  const setup = profileFixture();
  const { tables } = setup;
  tables.users = [{ _id: "manager", clerkId: "manager", name: "Manager" }];
  tables.fantasyTeams = [{ _id: "team", seasonId: "season", userId: "manager", name: "Team", createdAt: 0 }];
  const base = tables.fantasyPlayers[0];
  tables.fantasyPlayers.push(
    { ...base, _id: "bench", displayName: "Bench" },
    { ...base, _id: "reserve", displayName: "Reserve", clubId: "opponent" },
  );
  tables.fantasyGameweekSquadPicks = tables.fantasyPlayers.map((player, index) => ({
    _id: `pick-${index}`, fantasyTeamId: "team", playerId: player._id,
    gameweekId: "gw1", rosterSlot: index, squadRole: ["starter", "bench", "reserve"][index],
    isStarter: index === 0, pointsMultiplier: [1, 0.5, 0][index],
    isCaptain: index === 0, isViceCaptain: index === 1,
  }));
  tables.fantasyClubs[0].logoUrl = "club.png";
  tables.fantasyClubs[1].logoUrl = "opponent.png";
  return setup;
}

const teamArgs = { fantasyTeamId: "team", gameweekId: "gw1" };

test("team view preloads scored fixture details for starters, bench, and reserves, including absentees", async () => {
  const { ctx, reads } = teamFixture();
  const result = await fantasyTeamGameweekView._handler(ctx, teamArgs);
  assert.equal(result.players.length, 3);
  const [starter, bench, reserve] = result.players;
  assert.equal(starter.matches[0].points, 5);
  assert.equal(starter.managerPoints, 10);
  assert.equal(starter.matches[0].appeared, true);
  assert.equal(bench.matches[0].appeared, false);
  assert.equal(reserve.matches[0].appeared, false);
  assert.equal(reserve.matches[0].isHome, false);
  assert.equal(bench.matches[0].fixture.homeScore, 3);
  assert.equal(bench.matches[0].fixture.awayScore, 1);
  assert.equal(bench.matches[0].homeClub.logoUrl, "club.png");
  assert.equal(bench.matches[0].awayClub.logoUrl, "opponent.png");
  assert.deepEqual(bench.matches[0].lines, []);
  assert.equal(reads.filter((table) => table === "fantasyFixtureLineups").length, 1);
  assert.equal(reads.filter((table) => table === "fantasyFixtureEvents").length, 1);
  assert.equal(reads.includes("fantasyPlayerPriceHistory"), false);
});

test("team details preserve multiple matches and exclude other gameweeks, cancelled and unplayed fixtures", async () => {
  const { ctx, tables } = teamFixture();
  const first = tables.fantasyFixtures[0];
  tables.fantasyFixtures.push(
    { ...first, _id: "second", scheduledAt: 150, status: "live" },
    { ...first, _id: "not-played", status: "scheduled" },
    { ...first, _id: "cancelled-1", status: "cancelled" },
    { ...first, _id: "bad-season", seasonId: "other" },
  );
  const result = await fantasyTeamGameweekView._handler(ctx, teamArgs);
  assert.deepEqual(result.players[0].matches.map((match) => match.id), ["played", "second"]);
  assert.equal(result.players[0].matches[1].appeared, false);
});

test("a former-club appearance resolves its recorded side rather than the player's current club", async () => {
  const { ctx, tables } = teamFixture();
  tables.fantasyPlayers[0].clubId = "new-club";
  tables.fantasyFixtureLineups[0].side = "away";
  tables.fantasyFixtureEvents[0].side = "away";
  const result = await fantasyTeamGameweekView._handler(ctx, teamArgs);
  assert.equal(result.players[0].matches[0].isHome, false);
  assert.equal(result.players[0].matches[0].opponent.name, "Club");
  assert.equal(result.players[0].matches[0].points, 5);
});

test("missing club/fixture and missing authentication do not fabricate player match details", async () => {
  const { ctx, tables } = teamFixture();
  delete tables.fantasyPlayers[1].clubId;
  const result = await fantasyTeamGameweekView._handler(ctx, teamArgs);
  assert.deepEqual(result.players[1].matches, []);
  ctx.auth.getUserIdentity = async () => null;
  assert.equal(await fantasyTeamGameweekView._handler(ctx, teamArgs), null);
});
