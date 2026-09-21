const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

// Load the actual Convex handler without a deployment or a live database.
const originalTsLoader = require.extensions[".ts"];
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
const { removePrivateLeagueMember, updatePrivateLeague } = require("../convex/fantasy.ts");
if (originalTsLoader) require.extensions[".ts"] = originalTsLoader;
else delete require.extensions[".ts"];

const args = { privateLeagueId: "league-a", fantasyTeamId: "team-member" };

function fixture(actor = "owner") {
  const tables = {
    users: [
      { _id: "owner", clerkId: "owner" },
      { _id: "member", clerkId: "member" },
      { _id: "admin", clerkId: "admin", role: "admin" },
    ],
    fantasyPrivateLeagues: [
      { _id: "league-a", seasonId: "season-a", ownerUserId: "owner", name: "Original league" },
      { _id: "league-b", seasonId: "season-a", ownerUserId: "admin" },
    ],
    fantasyTeams: [
      {
        _id: "team-owner",
        userId: "owner",
        seasonId: "season-a",
        totalPoints: 50,
      },
      {
        _id: "team-member",
        userId: "member",
        seasonId: "season-a",
        totalPoints: 40,
      },
      { _id: "team-other-season", userId: "member", seasonId: "season-b" },
    ],
    fantasyPrivateLeagueMembers: [
      {
        _id: "membership-owner",
        privateLeagueId: "league-a",
        fantasyTeamId: "team-owner",
        userId: "owner",
        seasonId: "season-a",
        role: "owner",
      },
      {
        _id: "membership-a",
        privateLeagueId: "league-a",
        fantasyTeamId: "team-member",
        userId: "member",
        seasonId: "season-a",
        role: "member",
      },
      {
        _id: "membership-b",
        privateLeagueId: "league-b",
        fantasyTeamId: "team-member",
        userId: "member",
        seasonId: "season-a",
        role: "member",
      },
    ],
    fantasySquadPicks: [
      { _id: "pick", fantasyTeamId: "team-member", playerId: "player" },
    ],
    fantasyTeamGameweekScores: [
      { _id: "score", fantasyTeamId: "team-member", points: 40 },
    ],
  };
  const rows = new Map(
    Object.values(tables)
      .flat()
      .map((row) => [row._id, row]),
  );
  const deleted = [];
  const patched = [];
  const ctx = {
    auth: { getUserIdentity: async () => (actor ? { subject: actor } : null) },
    db: {
      get: async (id) => rows.get(id) ?? null,
      patch: async (id, values) => {
        patched.push({ id, values });
        Object.assign(rows.get(id), values);
      },
      delete: async (id) => {
        deleted.push(id);
        rows.delete(id);
      },
      query(table) {
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
            return tables[table].filter(
              (row) =>
                rows.has(row._id) &&
                filters.every(([field, value]) => row[field] === value),
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
  return { ctx, rows, deleted, patched, tables };
}

test("owner removes only membership in the selected league, preserving teams, picks and scores", async () => {
  const { ctx, rows, deleted } = fixture();
  const before = structuredClone(rows);
  assert.deepEqual(await removePrivateLeagueMember._handler(ctx, args), {
    removed: true,
  });
  assert.deepEqual(deleted, ["membership-a"]);
  before.delete("membership-a");
  assert.deepEqual(rows, before);
});

for (const actor of [null, "unknown", "member", "admin"]) {
  test(`rejects unauthorized actor ${actor}, including non-owner admins`, async () => {
    const { ctx, rows, deleted } = fixture(actor);
    const before = structuredClone(rows);
    await assert.rejects(removePrivateLeagueMember._handler(ctx, args));
    assert.deepEqual(rows, before);
    assert.deepEqual(deleted, []);
  });
}

test("owner cannot remove their own team", async () => {
  const { ctx, deleted } = fixture();
  await assert.rejects(
    removePrivateLeagueMember._handler(ctx, {
      ...args,
      fantasyTeamId: "team-owner",
    }),
  );
  assert.deepEqual(deleted, []);
});

test("rejects a team from another season", async () => {
  const { ctx, deleted } = fixture();
  await assert.rejects(
    removePrivateLeagueMember._handler(ctx, {
      ...args,
      fantasyTeamId: "team-other-season",
    }),
  );
  assert.deepEqual(deleted, []);
});

test("repeated removal is harmless and does not affect other leagues", async () => {
  const { ctx, rows, deleted } = fixture();
  await removePrivateLeagueMember._handler(ctx, args);
  assert.deepEqual(await removePrivateLeagueMember._handler(ctx, args), {
    removed: false,
  });
  assert.deepEqual(deleted, ["membership-a"]);
  assert.ok(rows.has("membership-b"));
});

test("a member of another league is not removed from that league", async () => {
  const { ctx, rows, deleted } = fixture();
  rows.delete("membership-a");
  assert.deepEqual(await removePrivateLeagueMember._handler(ctx, args), {
    removed: false,
  });
  assert.deepEqual(deleted, []);
  assert.ok(rows.has("membership-b"));
});

for (const overrides of [
  { role: "owner" },
  { userId: "owner" },
  { userId: "admin" },
  { seasonId: "season-b" },
]) {
  test(`rejects inconsistent membership ${JSON.stringify(overrides)}`, async () => {
    const { ctx, rows, deleted } = fixture();
    Object.assign(rows.get("membership-a"), overrides);
    await assert.rejects(removePrivateLeagueMember._handler(ctx, args));
    assert.deepEqual(deleted, []);
  });
}

test("missing league or team fails without deleting anything", async () => {
  for (const id of ["league-a", "team-member"]) {
    const { ctx, rows, deleted } = fixture();
    rows.delete(id);
    await assert.rejects(removePrivateLeagueMember._handler(ctx, args));
    assert.deepEqual(deleted, []);
  }
});

const saveArgs = {
  privateLeagueId: "league-a",
  name: "  New   league  ",
  removedTeamIds: ["team-member"],
};

test("saving updates the name and removes only the requested league membership", async () => {
  const { ctx, rows, deleted, patched } = fixture();
  const before = structuredClone(rows);
  assert.deepEqual(await updatePrivateLeague._handler(ctx, saveArgs), {
    id: "league-a",
    name: "New league",
  });
  assert.equal(patched.length, 1);
  assert.equal(typeof rows.get("league-a").updatedAt, "number");
  before.delete("membership-a");
  Object.assign(before.get("league-a"), patched[0].values);
  assert.deepEqual(rows, before);
  assert.deepEqual(deleted, ["membership-a"]);
});

test("saving only a name remains compatible with existing clients", async () => {
  const { ctx, rows, deleted } = fixture();
  await updatePrivateLeague._handler(ctx, {
    privateLeagueId: "league-a",
    name: "Renamed league",
  });
  assert.equal(rows.get("league-a").name, "Renamed league");
  assert.ok(rows.has("membership-a"));
  assert.deepEqual(deleted, []);
});

test("saving member removals does not require a name change and tolerates retries", async () => {
  const { ctx, rows, deleted } = fixture();
  const request = {
    ...saveArgs,
    name: "Original league",
    removedTeamIds: ["team-member", "team-member"],
  };
  await updatePrivateLeague._handler(ctx, request);
  await updatePrivateLeague._handler(ctx, request);
  assert.equal(rows.get("league-a").name, "Original league");
  assert.deepEqual(deleted, ["membership-a"]);
  assert.ok(rows.has("membership-b"));
});

for (const actor of [null, "unknown", "member", "admin"]) {
  test(`league settings cannot be saved by ${actor}`, async () => {
    const { ctx, rows, deleted, patched } = fixture(actor);
    const before = structuredClone(rows);
    await assert.rejects(updatePrivateLeague._handler(ctx, saveArgs));
    assert.deepEqual(rows, before);
    assert.deepEqual(deleted, []);
    assert.deepEqual(patched, []);
  });
}

for (const teamId of ["team-owner", "team-other-season", "missing-team"]) {
  test(`validates the entire removal batch before any writes: ${teamId}`, async () => {
    const { ctx, rows, deleted, patched } = fixture();
    const before = structuredClone(rows);
    await assert.rejects(updatePrivateLeague._handler(ctx, {
      ...saveArgs,
      removedTeamIds: ["team-member", teamId],
    }));
    assert.deepEqual(rows, before);
    assert.deepEqual(deleted, []);
    assert.deepEqual(patched, []);
  });
}

test("an invalid name does not apply staged removals", async () => {
  const { ctx, rows, deleted, patched } = fixture();
  const before = structuredClone(rows);
  await assert.rejects(updatePrivateLeague._handler(ctx, { ...saveArgs, name: " " }));
  assert.deepEqual(rows, before);
  assert.deepEqual(deleted, []);
  assert.deepEqual(patched, []);
});

test("saving preserves members who joined after the editor was opened", async () => {
  const { ctx, rows, tables } = fixture();
  const team = { _id: "team-new", userId: "new", seasonId: "season-a" };
  const membership = {
    _id: "membership-new",
    privateLeagueId: "league-a",
    fantasyTeamId: team._id,
    userId: team.userId,
    seasonId: team.seasonId,
    role: "member",
  };
  tables.fantasyTeams.push(team);
  tables.fantasyPrivateLeagueMembers.push(membership);
  rows.set(team._id, team);
  rows.set(membership._id, membership);
  await updatePrivateLeague._handler(ctx, saveArgs);
  assert.deepEqual(rows.get(membership._id), membership);
  assert.ok(!rows.has("membership-a"));
});
