const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const originalLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  let { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: filename,
  });
  if (filename.endsWith("/convex/fantasy.ts"))
    outputText += `\nexports.testing = {
    ensureGameweekSquadSnapshots, processSeasonDeadlineRollovers,
    recalculateGameweekScoresInternal, buildFantasyTeamGameweekPointsBreakdown
  };`;
  module._compile(outputText, filename);
};
const fantasy = require("../convex/fantasy.ts");
const chips = require("../convex/fantasyChips.ts");
const chipState = require("../convex/fantasyChipState.ts");
if (originalLoader) require.extensions[".ts"] = originalLoader;
else delete require.extensions[".ts"];

const BASE = 2_000_000_000_000;
const DAY = 86400000;
let now = BASE;
const realNow = Date.now;
test.before(() => {
  Date.now = () => now;
});
test.after(() => {
  Date.now = realNow;
});
test.beforeEach(() => {
  now = BASE;
});
const clone = (value) => structuredClone(value);

test("filling a pre-created empty team is not counted as 12 transfers", async () => {
  const f = fixture();
  const picks = f
    .rows("fantasySquadPicks")
    .map(({ playerId, rosterSlot, isCaptain, isViceCaptain, isStarter }) => ({
      playerId,
      rosterSlot,
      isCaptain,
      isViceCaptain,
      isStarter,
    }));
  for (const pick of f.rows("fantasySquadPicks"))
    await f.ctx.db.delete(pick._id);
  for (const score of f.rows("fantasyTeamGameweekScores"))
    await f.ctx.db.delete(score._id);
  await f.ctx.db.patch("team", {
    budgetRemaining: 100,
    freeTransfers: 0,
    totalPoints: 0,
  });
  await f.save({}, { picks });
  assert.equal(f.rows("fantasyTransfers").length, 0);
  await f.play("freeHit");
  assert.equal((await f.view()).transfersUsed, 0);
  await f.cancel("freeHit");
});

test("deadline locks cancellation, and a new half restores exactly one use", async () => {
  const f = fixture();
  await f.play("benchBoost");
  now = f.get("gw2").deadlineAt;
  await assert.rejects(f.cancel("benchBoost"), /deadline/);
  await f.rollover();
  assert.equal((await f.view("gw3")).items[0].status, "active");
  await f.ctx.db.patch("gw2", { status: "completed" });
  assert.equal((await f.view("gw3")).items[0].status, "played");
  await assert.rejects(f.play("benchBoost", "gw3"), /used/);
  now = f.get("gw10").deadlineAt + 1;
  for (let i = 3; i <= 10; i++)
    await f.ctx.db.patch(`gw${i}`, { status: "completed" });
  await f.ctx.db.patch("season", { currentGameweekId: "gw11" });
  await f.play("benchBoost", "gw11");
  assert.deepEqual(
    f
      .rows("fantasyTeamGameweekStates")
      .filter((row) => row.chip)
      .map((row) => row.half),
    [1, 2],
  );
  await assert.rejects(f.play("benchBoost", "gw11"), /used/);
});

test("Free Hit never restores before a complete snapshot exists", async () => {
  const f = fixture();
  await f.play("freeHit");
  await f.save({ 2: "p14" });
  await assert.rejects(
    chipState.settleGameweekChips(f.ctx, f.get("gw2"), now),
    /full squad/,
  );
  assert.ok(f.rows("fantasySquadPicks").some((row) => row.playerId === "p14"));
  assert.equal(f.rows("fantasyTeamGameweekStates")[0].restoredAt, undefined);
});

function fixture() {
  let serial = 0;
  let actor = "owner";
  let tables = {
    users: [
      { _id: "owner", clerkId: "owner", role: "admin" },
      { _id: "other", clerkId: "other" },
    ],
    fantasySeasons: [
      {
        _id: "season",
        slug: "test-season",
        name: "Test",
        currentGameweekId: "gw2",
        status: "active",
        budget: 100,
        squadSize: 12,
        startingSlots: 5,
        activeSlots: 9,
        createdAt: BASE - 10 * DAY,
      },
    ],
    fantasyGameweeks: Array.from({ length: 20 }, (_, i) => ({
      _id: `gw${i + 1}`,
      seasonId: "season",
      number: i + 1,
      name: `GW${i + 1}`,
      deadlineAt: BASE + (i - 0.5) * DAY,
      startsAt: BASE + (i - 0.5) * DAY + 3600000,
      status: i === 0 ? "completed" : i === 1 ? "open" : "upcoming",
      freeTransfersGrantedAt: i === 0 ? BASE - DAY : undefined,
    })),
    fantasyClubs: Array.from({ length: 4 }, (_, i) => ({
      _id: `club${i}`,
      seasonId: "season",
      name: `Club ${i}`,
    })),
    fantasyTeams: [
      {
        _id: "team",
        userId: "owner",
        seasonId: "season",
        name: "Test team",
        budgetRemaining: 40,
        freeTransfers: 1,
        totalPoints: 100,
        createdAt: BASE - 3 * DAY,
        updatedAt: BASE - DAY,
      },
    ],
    fantasyPlayers: Array.from({ length: 36 }, (_, i) => ({
      _id: `p${i + 1}`,
      seasonId: "season",
      clubId: `club${Math.floor((i % 12) / 3)}`,
      displayName: `Player ${i + 1}`,
      lastName: `${i + 1}`,
      position: [0, 9].includes(i % 12) ? "goalkeeper" : "universal",
      price: 5,
      status: "active",
    })),
    fantasySquadPicks: Array.from({ length: 12 }, (_, i) => ({
      _id: `pick${i + 1}`,
      fantasyTeamId: "team",
      playerId: `p${i + 1}`,
      rosterSlot: i + 1,
      isStarter: i < 5,
      squadRole: i < 5 ? "starter" : i < 9 ? "bench" : "reserve",
      isCaptain: i === 1,
      isViceCaptain: i === 2,
      createdAt: BASE - DAY,
      updatedAt: BASE - DAY,
    })),
    fantasyTeamGameweekScores: [
      {
        _id: "score1",
        seasonId: "season",
        fantasyTeamId: "team",
        gameweekId: "gw1",
        participated: true,
        points: 100,
      },
    ],
  };
  for (const rows of Object.values(tables))
    for (const row of rows) row._creationTime = ++serial;
  function row(id) {
    return Object.values(tables)
      .flat()
      .find((row) => row._id === id);
  }
  const ctx = {
    auth: { getUserIdentity: async () => (actor ? { subject: actor } : null) },
    scheduler: {
      runAfter: async () => "scheduled",
      runAt: async () => "scheduled",
      cancel: async () => {},
    },
    db: {
      get: async (id) => clone(row(id) ?? null),
      patch: async (id, values) => {
        assert.ok(row(id), `missing ${id}`);
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined) delete row(id)[key];
          else row(id)[key] = clone(value);
        }
      },
      insert: async (table, values) => {
        const id = `${table}:${++serial}`;
        (tables[table] ??= []).push({
          ...clone(values),
          _id: id,
          _creationTime: serial,
        });
        return id;
      },
      delete: async (id) => {
        for (const table of Object.keys(tables))
          tables[table] = tables[table].filter((row) => row._id !== id);
      },
      query(table) {
        const conditions = [];
        const query = {
          withIndex(_index, apply) {
            const range = {
              eq(key, value) {
                conditions.push((row) => row[key] === value);
                return range;
              },
            };
            if (apply) apply(range);
            return query;
          },
          order() {
            return query;
          },
          async collect() {
            return clone(
              (tables[table] ?? []).filter((row) =>
                conditions.every((test) => test(row)),
              ),
            );
          },
          async first() {
            return (await query.collect())[0] ?? null;
          },
          async unique() {
            const rows = await query.collect();
            assert.ok(rows.length <= 1);
            return rows[0] ?? null;
          },
        };
        return query;
      },
    },
  };
  const rows = (table) => clone(tables[table] ?? []);
  const get = (id) => clone(row(id));
  // Convex mutations are atomic; failed assertions must not leave rollover writes behind.
  const run = async (mutation, args) => {
    const before = clone(tables);
    try {
      return await mutation._handler(ctx, args);
    } catch (error) {
      tables = before;
      throw error;
    }
  };
  const play = (chip, gameweekId = "gw2") =>
    run(fantasy.playMyChip, { chip, gameweekId, seasonSlug: "test-season" });
  const cancel = (chip, gameweekId = "gw2") =>
    run(fantasy.cancelMyChip, { chip, gameweekId, seasonSlug: "test-season" });
  const save = (replacements = {}, extras = {}) =>
    run(fantasy.saveMyTeam, {
      seasonSlug: "test-season",
      expectedGameweekId: "gw2",
      name: "Test team",
      picks: rows("fantasySquadPicks").map(
        ({ playerId, rosterSlot, isCaptain, isViceCaptain, isStarter }) => ({
          playerId: replacements[rosterSlot] ?? playerId,
          rosterSlot,
          isCaptain,
          isViceCaptain,
          isStarter,
        }),
      ),
      ...extras,
    });
  const view = async (gw = "gw2") =>
    chipState.getTeamChipView(
      ctx,
      get("team"),
      rows("fantasyGameweeks"),
      get(gw),
      true,
      now,
    );
  const rollover = () =>
    fantasy.testing.processSeasonDeadlineRollovers(ctx, get("season"), now);
  return {
    ctx,
    rows,
    get,
    run,
    play,
    cancel,
    save,
    view,
    rollover,
    actor: (value) => {
      actor = value;
    },
  };
}

test("calendar halves follow actual 18/20/30 round calendars and expire without stacking", () => {
  for (const count of [18, 20, 30, 19]) {
    const calendar = Array.from({ length: count }, (_, i) => ({
      _id: `${i}`,
      number: i + 1,
      deadlineAt: i * DAY,
    }));
    const split = Math.ceil(count / 2);
    const first = chips.getChipPeriod(calendar.reverse(), String(split - 1));
    assert.equal(first.half, 1);
    assert.equal(first.firstHalfEndGameweek, split);
    assert.equal(first.secondHalfStartGameweek, split + 1);
    assert.equal(first.firstHalfDeadlineAt, (split - 1) * DAY);
    assert.equal(chips.getChipPeriod(calendar, String(split)).half, 2);
  }
});

test("Ukrainian playoff placeholders and partial Polish imports do not move the chip reset", () => {
  const calendar = Array.from({ length: 33 }, (_, i) => ({
    _id: `gw${i + 1}`, number: i + 1, deadlineAt: BASE + i * DAY,
  }));
  const uk = "ukrainian-extra-league-2026-27";
  const pl = "polish-futsal-ekstraklasa-2026-27";
  assert.deepEqual(chips.getChipSeasonPeriod(calendar, uk), {
    firstHalfEndGameweek: 9, firstHalfDeadlineAt: BASE + 8 * DAY,
    secondHalfStartGameweek: 10, lastGameweek: 18,
  });
  assert.equal(chips.getChipPeriod(calendar, "gw9", uk).half, 1);
  assert.equal(chips.getChipPeriod(calendar, "gw10", uk).half, 2);
  assert.equal(chips.getChipPeriod(calendar, "gw19", uk), null);
  assert.deepEqual(chips.getChipSeasonPeriod(calendar.slice(0, 15), pl), {
    firstHalfEndGameweek: 15, firstHalfDeadlineAt: BASE + 14 * DAY,
    secondHalfStartGameweek: 16, lastGameweek: 30,
  });
  assert.equal(chips.getChipPeriod(calendar.slice(0, 15), "gw15", pl).half, 1);
  assert.equal(chips.getChipPeriod(calendar.slice(0, 30), "gw16", pl).half, 2);
  assert.equal(chips.getChipSeasonPeriod([]), null);
});

test("server chip availability uses the Ukrainian season boundary at GW9/10", async () => {
  const f = fixture();
  await f.ctx.db.patch("season", { slug: "ukrainian-extra-league-2026-27" });
  await f.ctx.db.insert("fantasyTeamGameweekStates", {
    fantasyTeamId: "team", seasonId: "season", gameweekId: "gw9",
    chip: "benchBoost", half: 1, transfersUsed: 0, settledAt: BASE,
  });
  await f.ctx.db.patch("gw9", { status: "completed" });
  const first = await f.view("gw9");
  assert.equal(first.items[0].status, "played");
  const second = await f.view("gw10");
  assert.equal(second.half, 2);
  assert.equal(second.firstHalfEndGameweek, 9);
  assert.equal(second.items[0].status, "available");
  assert.equal(second.items[0].canPlay, true);
  assert.equal(await f.view("gw19"), null);
});

test("a partial Polish calendar cannot renew a used chip early in GW9", async () => {
  const f = fixture();
  await f.ctx.db.patch("season", { slug: "polish-futsal-ekstraklasa-2026-27" });
  for (let number = 16; number <= 20; number++) await f.ctx.db.delete(`gw${number}`);
  await f.ctx.db.insert("fantasyTeamGameweekStates", {
    fantasyTeamId: "team", seasonId: "season", gameweekId: "gw8",
    chip: "tripleCaptain", half: 1, transfersUsed: 0, settledAt: BASE,
  });
  await f.ctx.db.patch("gw8", { status: "completed" });
  const view = await f.view("gw9");
  assert.equal(view.half, 1);
  assert.equal(view.firstHalfEndGameweek, 15);
  assert.equal(view.secondHalfStartGameweek, 16);
  assert.equal(view.items[1].status, "played");
  assert.equal(view.items[1].canPlay, false);
});

for (const chip of chips.FANTASY_CHIPS) {
  test(`${chip}: activation, one per round, cancellation and reactivation`, async () => {
    const f = fixture();
    await f.play(chip);
    const view = await f.view();
    assert.equal(view.activeChip, chip);
    assert.equal(view.items.find((row) => row.id === chip).status, "active");
    await assert.rejects(f.play(chip), /chips.used/);
    await assert.rejects(
      f.play(chips.FANTASY_CHIPS.find((id) => id !== chip)),
      /chips.anotherChip/,
    );
    assert.equal(f.rows("fantasyTeamGameweekStates").length, 1);
    await f.cancel(chip);
    assert.equal((await f.view()).activeChip, null);
    await f.play(chip);
    assert.equal(f.rows("fantasyTeamGameweekStates").length, 1);
  });
}

test("authentication, saved squad, wrong season/round and deadline are checked on the server", async () => {
  const f = fixture();
  f.actor(null);
  await assert.rejects(f.play("benchBoost"), /авторизованы/);
  f.actor("other");
  await assert.rejects(f.play("benchBoost"), /incompleteSquad/);
  f.actor("owner");
  await assert.rejects(f.play("benchBoost", "gw3"), /deadline/);
  await assert.rejects(
    f.run(fantasy.playMyChip, {
      chip: "benchBoost",
      gameweekId: "gw2",
      seasonSlug: "missing",
    }),
    /Сезон/,
  );
  now = f.get("gw2").deadlineAt;
  await assert.rejects(f.play("benchBoost"), /deadline/);
  await assert.rejects(f.save(), /deadline/);
  assert.equal(f.rows("fantasyTeamGameweekStates").length, 0);
  now = BASE;
  await f.ctx.db.delete("pick12");
  await assert.rejects(f.play("benchBoost"), /incompleteSquad/);
});

test("Wildcard refunds earlier hits, preserves free transfers and commits after two cumulative transfers", async () => {
  const f = fixture();
  await f.save({ 2: "p14", 3: "p15" });
  assert.equal(f.get("team").totalPoints, 96);
  assert.equal(f.get("team").freeTransfers, 0);
  await f.play("wildcard");
  assert.equal(f.get("team").totalPoints, 100);
  assert.equal(f.get("team").freeTransfers, 1);
  assert.equal(f.rows("fantasyPointDeductions").length, 0);
  assert.ok(f.rows("fantasyTransfers").every((row) => row.penaltyPoints === 0));
  await assert.rejects(f.cancel("wildcard"), /cannotCancel/);
  await f.save({ 4: "p16", 5: "p17", 6: "p18", 7: "p19", 8: "p20", 9: "p21" });
  assert.equal(f.get("team").freeTransfers, 1);
  assert.equal(f.rows("fantasyTeamGameweekStates")[0].transfersUsed, 8);
});

test("myTeam exposes cumulative transfer cost for the current week only, including chip refunds", async () => {
  const f = fixture();
  const cost = async () => (await fantasy.myTeam._handler(f.ctx, { seasonSlug: "test-season" })).currentGameweekTransferPenaltyPoints;
  assert.equal(await cost(), 0);
  await f.save({ 2: "p14", 3: "p15" });
  assert.equal(await cost(), 4);
  await f.save({ 4: "p16" });
  assert.equal(await cost(), 8);
  const transfer = f.rows("fantasyTransfers")[0];
  await f.ctx.db.insert("fantasyTransfers", { ...transfer, gameweekId: "gw1", penaltyPoints: 20 });
  await f.ctx.db.insert("fantasyTransfers", { ...transfer, fantasyTeamId: "other-team", penaltyPoints: 20 });
  assert.equal(await cost(), 8);
  await f.play("wildcard");
  assert.equal(await cost(), 0);
});

test("myTeam restores a cancelled Wildcard's cost without doubling it", async () => {
  const f = fixture();
  await f.ctx.db.patch("team", { freeTransfers: 0 });
  await f.play("wildcard");
  await f.save({ 2: "p14" });
  assert.equal((await fantasy.myTeam._handler(f.ctx, { seasonSlug: "test-season" })).currentGameweekTransferPenaltyPoints, 0);
  await f.cancel("wildcard");
  assert.equal((await fantasy.myTeam._handler(f.ctx, { seasonSlug: "test-season" })).currentGameweekTransferPenaltyPoints, 4);
});

test("cancelling a one-transfer Wildcard restores its normal deduction exactly once", async () => {
  const f = fixture();
  await f.ctx.db.patch("team", { freeTransfers: 0 });
  await f.play("wildcard");
  await f.save({ 2: "p14" });
  assert.equal(f.get("team").totalPoints, 100);
  await f.cancel("wildcard");
  assert.equal(f.get("team").totalPoints, 96);
  assert.equal(f.rows("fantasyPointDeductions").length, 1);
  await assert.rejects(f.cancel("wildcard"), /cannotCancel/);
  await f.play("wildcard");
  await f.cancel("wildcard");
  assert.equal(f.get("team").totalPoints, 96);
  assert.equal(f.rows("fantasyPointDeductions").length, 1);
});

test("ordinary transfer limit is cumulative across saves; chips lift it without spending banked transfers", async () => {
  const f = fixture();
  await f.save({ 2: "p14", 3: "p15", 4: "p16" });
  await f.save({ 5: "p17", 6: "p18" });
  await assert.rejects(f.save({ 7: "p19" }), /максимум 5/);
  assert.equal(f.rows("fantasyTeamGameweekStates")[0].transfersUsed, 5);
  await f.play("wildcard");
  await f.save({ 7: "p19" });
  assert.equal(f.get("team").freeTransfers, 1);
});

test("Free Hit includes earlier transfers and restores original picks, leadership, cash and allowances after snapshot", async () => {
  const f = fixture();
  const baseline = f.rows("fantasySquadPicks");
  await f.ctx.db.patch("p14", { price: 8 });
  await f.save({ 2: "p14" });
  await f.play("freeHit");
  await f.save({ 3: "p15" });
  assert.equal(f.get("team").budgetRemaining, 37);
  await assert.rejects(f.cancel("freeHit"), /cannotCancel/);
  now = f.get("gw2").deadlineAt;
  await f.rollover();
  const snapshots = f
    .rows("fantasyGameweekSquadPicks")
    .filter((row) => row.gameweekId === "gw2");
  assert.equal(snapshots.length, 12);
  assert.ok(snapshots.some((row) => row.playerId === "p14" && row.isCaptain));
  assert.deepEqual(
    f
      .rows("fantasySquadPicks")
      .map((row) => [row.playerId, row.isCaptain, row.isViceCaptain]),
    baseline.map((row) => [row.playerId, row.isCaptain, row.isViceCaptain]),
  );
  assert.equal(f.get("team").budgetRemaining, 40);
  assert.equal(f.get("team").freeTransfers, 2);
  await f.rollover();
  assert.equal(f.get("team").freeTransfers, 2);
  const saved = f.rows("fantasySquadPicks");
  await fantasy.testing.ensureGameweekSquadSnapshots(
    f.ctx,
    f.get("season"),
    f.get("gw2"),
    now,
  );
  assert.deepEqual(f.rows("fantasySquadPicks"), saved);
});

test("late deadline rollover snapshots the restored Free Hit team for subsequent overdue rounds", async () => {
  const f = fixture();
  await f.play("freeHit");
  await f.save({ 2: "p14" });
  now = f.get("gw3").deadlineAt;
  await f.rollover();
  const snapshots = f.rows("fantasyGameweekSquadPicks");
  assert.equal(
    snapshots.find((row) => row.gameweekId === "gw2" && row.rosterSlot === 2)
      .playerId,
    "p14",
  );
  assert.equal(
    snapshots.find((row) => row.gameweekId === "gw3" && row.rosterSlot === 2)
      .playerId,
    "p2",
  );
  assert.equal(f.get("team").freeTransfers, 3);
});

for (const chip of ["wildcard", "freeHit"]) {
  test(`${chip}: historical team viewer retains the played squad after later transfers`, async () => {
    const f = fixture();
    await f.play(chip);
    await f.save({ 2: "p14" });
    now = f.get("gw2").deadlineAt;
    await f.rollover();
    await f.ctx.db.patch("gw2", { status: "completed" });
    await f.save({ 2: "p26" }, { expectedGameweekId: "gw3" });

    const view = await fantasy.fantasyTeamGameweekView._handler(f.ctx, {
      fantasyTeamId: "team", gameweekId: "gw2", seasonSlug: "test-season",
    });
    assert.equal(view.gameweek.id, "gw2");
    assert.equal(view.team.id, "team");
    assert.equal(view.players.length, 12);
    assert.equal(view.players.find(row => row.isCaptain).player.id, "p14");
    assert.ok(!view.players.some(row => row.player.id === "p26"));
    assert.ok(f.rows("fantasySquadPicks").some(row => row.playerId === "p26"));
    assert.equal((await f.view("gw3")).items.find(row => row.id === chip).gameweekNumber, 2);
  });
}

test("a used token renews once at the half boundary, but Free Hit cannot cross it consecutively", async () => {
  const f = fixture();
  await f.ctx.db.insert("fantasyTeamGameweekStates", {
    fantasyTeamId: "team",
    seasonId: "season",
    gameweekId: "gw10",
    chip: "freeHit",
    half: 1,
    transfersUsed: 0,
    baselineComplete: true,
    initialPicks: [],
    budgetBefore: 40,
    freeTransfersBefore: 1,
    settledAt: BASE,
    restoredAt: BASE,
  });
  now = f.get("gw10").deadlineAt + 1;
  let view = await f.view("gw11");
  const freeHit = view.items.find((row) => row.id === "freeHit");
  assert.equal(freeHit.status, "available");
  assert.equal(freeHit.unavailableReason, "consecutiveFreeHit");
  view = await f.view("gw12");
  assert.equal(view.items.find((row) => row.id === "freeHit").canPlay, true);
  assert.equal(view.items.filter((row) => row.canPlay).length, 4);
});

test("old transfers without a baseline disable only Free Hit, rather than inventing a historical team", async () => {
  const f = fixture();
  await f.ctx.db.insert("fantasyTransfers", {
    seasonId: "season",
    gameweekId: "gw2",
    fantasyTeamId: "team",
    fromPlayerId: "p2",
    toPlayerId: "p14",
    penaltyPoints: 0,
    createdAt: BASE - 1,
  });
  await assert.rejects(f.play("freeHit"), /missingBaseline/);
  await f.play("wildcard");
  assert.equal(f.get("team").freeTransfers, 2);
});

for (const chip of ["benchBoost", "tripleCaptain"]) {
  for (const captainAppears of [true, false]) {
    test(`${chip}: scoring, public breakdown and manager history agree (captain appears: ${captainAppears})`, async () => {
      const f = fixture();
      await f.play(chip);
      now = f.get("gw2").deadlineAt;
      await f.rollover();
      await f.ctx.db.insert("fantasyFixtures", {
        _ignored: true,
        seasonId: "season",
        gameweekId: "gw2",
        homeClubId: "club0",
        awayClubId: "club1",
        status: "live",
        scheduledAt: now,
        homeScore: 0,
        awayScore: 0,
      });
      const fixtureId = f.rows("fantasyFixtures")[0]._id;
      for (let n = 1; n <= 12; n++) {
        if (n === 2 && !captainAppears) continue;
        await f.ctx.db.insert("fantasyFixtureLineups", {
          fixtureId,
          playerId: `p${n}`,
          side: "home",
        });
      }
      // Exercise negative captain points, not just positive multipliers.
      await f.ctx.db.insert("fantasyFixtureEvents", {
        fixtureId,
        playerId: captainAppears ? "p2" : "p3",
        type: "red_card",
        side: "home",
      });
      await fantasy.testing.recalculateGameweekScoresInternal(
        f.ctx,
        f.get("season"),
        f.get("gw2"),
        now,
      );
      const snapshots = f.rows("fantasyGameweekSquadPicks");
      assert.ok(
        snapshots.every(
          (row) =>
            row.pointsMultiplier ===
            chips.chipRoleMultiplier(row.squadRole, chip),
        ),
      );
      const stats = new Map(
        f
          .rows("fantasyPlayerGameweekStats")
          .map((row) => [row.playerId, row.points]),
      );
      const base = snapshots.reduce(
        (sum, pick) =>
          sum + (stats.get(pick.playerId) ?? 0) * pick.pointsMultiplier,
        0,
      );
      const bonus =
        stats.get(captainAppears ? "p2" : "p3") *
        (chip === "tripleCaptain" ? 2 : 1);
      assert.ok(bonus < 0);
      const score = f
        .rows("fantasyTeamGameweekScores")
        .find((row) => row.gameweekId === "gw2");
      assert.equal(score.basePoints, base);
      assert.equal(score.captainBonusPoints, bonus);
      assert.equal(score.points, base + bonus);
      const breakdown =
        await fantasy.testing.buildFantasyTeamGameweekPointsBreakdown(
          f.ctx,
          f.get("season"),
          f.get("team"),
          f.get("gw2"),
        );
      assert.equal(
        breakdown.players.reduce((sum, row) => sum + row.managerPoints, 0),
        score.points,
      );
      const team = await fantasy.myTeam._handler(f.ctx, {
        seasonSlug: "test-season",
      });
      assert.equal(team.totalPoints, 100 + score.points);
      assert.equal(
        team.picks.reduce(
          (sum, pick) => sum + pick.player.managerSeasonPoints,
          0,
        ),
        score.points,
      );
      await fantasy.testing.recalculateGameweekScoresInternal(
        f.ctx,
        f.get("season"),
        f.get("gw2"),
        now,
      );
      assert.equal(f.get("team").totalPoints, 100 + score.points);
    });
  }
}
