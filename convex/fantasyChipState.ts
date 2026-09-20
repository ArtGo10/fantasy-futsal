import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  FANTASY_CHIPS,
  canCancelChip,
  getChipPeriod,
  isChipGameweekEditable,
  type ChipUnavailableReason,
  type TeamChipView,
} from "./fantasyChips";

export async function getTeamGameweekState(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"fantasyTeams">,
  gameweekId: Id<"fantasyGameweeks">,
) {
  return ctx.db
    .query("fantasyTeamGameweekStates")
    .withIndex("by_team_gameweek", (q) =>
      q.eq("fantasyTeamId", teamId).eq("gameweekId", gameweekId),
    )
    .first();
}

export async function ensureTeamGameweekState(
  ctx: MutationCtx,
  team: Doc<"fantasyTeams">,
  gameweekId: Id<"fantasyGameweeks">,
  picks: Doc<"fantasySquadPicks">[],
  now: number,
) {
  const existing = await getTeamGameweekState(ctx, team._id, gameweekId);
  if (existing) return existing;
  const transfers = await ctx.db
    .query("fantasyTransfers")
    .withIndex("by_team_gameweek", (q) =>
      q.eq("fantasyTeamId", team._id).eq("gameweekId", gameweekId),
    )
    .collect();
  const id = await ctx.db.insert("fantasyTeamGameweekStates", {
    seasonId: team.seasonId,
    gameweekId,
    fantasyTeamId: team._id,
    transfersUsed: transfers.length,
    // Old transfers have no historical prices/slots. Never invent a Free Hit baseline.
    baselineComplete: transfers.length === 0,
    budgetBefore: team.budgetRemaining,
    freeTransfersBefore:
      team.freeTransfers +
      transfers.filter((transfer) => transfer.penaltyPoints === 0).length,
    initialPicks: picks.map((pick) => ({
      playerId: pick.playerId,
      rosterSlot: pick.rosterSlot,
      isStarter: pick.isStarter,
      squadRole:
        pick.squadRole ??
        (pick.rosterSlot <= 5
          ? "starter"
          : pick.rosterSlot <= 9
            ? "bench"
            : "reserve"),
      isCaptain: pick.isCaptain,
      isViceCaptain: pick.isViceCaptain,
    })),
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

export async function getTeamChipView(
  ctx: QueryCtx | MutationCtx,
  team: Doc<"fantasyTeams">,
  gameweeks: Doc<"fantasyGameweeks">[],
  gameweek: Doc<"fantasyGameweeks"> | null,
  hasFullSquad: boolean,
  now: number,
): Promise<TeamChipView | null> {
  if (!gameweek) return null;
  const season = await ctx.db.get(team.seasonId);
  const period = getChipPeriod(gameweeks, gameweek._id, season?.slug);
  if (!period) return null;
  const states = await ctx.db
    .query("fantasyTeamGameweekStates")
    .withIndex("by_team", (q) => q.eq("fantasyTeamId", team._id))
    .collect();
  const current = states.find((state) => state.gameweekId === gameweek._id);
  const oldTransfers = current
    ? []
    : await ctx.db
        .query("fantasyTransfers")
        .withIndex("by_team_gameweek", (q) =>
          q.eq("fantasyTeamId", team._id).eq("gameweekId", gameweek._id),
        )
        .collect();
  const editable = isChipGameweekEditable(gameweek, now) && !current?.settledAt;
  const transfersUsed = current?.transfersUsed ?? oldTransfers.length;
  const previousFreeHit = states.some(
    (state) =>
      state.gameweekId === period.previousGameweekId &&
      state.chip === "freeHit",
  );
  return {
    gameweekId: gameweek._id,
    gameweekNumber: gameweek.number,
    deadlineAt: gameweek.deadlineAt ?? null,
    ...period,
    activeChip: current?.chip ?? null,
    transfersUsed,
    items: FANTASY_CHIPS.map((id) => {
      const played = states.find(
        (state) => state.chip === id && state.half === period.half,
      );
      const playedGameweek = gameweeks.find(
        (row) => row._id === played?.gameweekId,
      );
      const active = Boolean(
        played &&
        playedGameweek &&
        playedGameweek.status !== "completed" &&
        (played.gameweekId === gameweek._id ||
          playedGameweek.status === "live" ||
          playedGameweek.status === "locked"),
      );
      const unavailableReason: ChipUnavailableReason | null = played
        ? "used"
        : !editable
          ? "deadline"
          : !hasFullSquad
            ? "incompleteSquad"
            : current?.chip
              ? "anotherChip"
              : id === "freeHit" && previousFreeHit
                ? "consecutiveFreeHit"
                : id === "freeHit" &&
                    (current
                      ? !current.baselineComplete
                      : oldTransfers.length > 0)
                  ? "missingBaseline"
                  : null;
      return {
        id,
        status: played ? (active ? "active" : "played") : "available",
        gameweekNumber: playedGameweek?.number ?? null,
        canPlay: unavailableReason === null,
        canCancel: Boolean(
          played?.gameweekId === gameweek._id &&
          editable &&
          canCancelChip(id, transfersUsed),
        ),
        unavailableReason,
      };
    }),
  };
}

// Settle only after the boosted squad has been snapshotted for this gameweek.
export async function settleGameweekChips(
  ctx: MutationCtx,
  gameweek: Doc<"fantasyGameweeks">,
  now: number,
) {
  const states = await ctx.db
    .query("fantasyTeamGameweekStates")
    .withIndex("by_gameweek", (q) => q.eq("gameweekId", gameweek._id))
    .collect();
  for (const state of states) {
    if (state.settledAt) continue;
    if (state.chip === "freeHit" && !state.restoredAt) {
      const team = await ctx.db.get(state.fantasyTeamId);
      if (!team) continue;
      const snapshots = await ctx.db
        .query("fantasyGameweekSquadPicks")
        .withIndex("by_team_gameweek", (q) =>
          q.eq("fantasyTeamId", team._id).eq("gameweekId", gameweek._id),
        )
        .collect();
      if (snapshots.length !== state.initialPicks.length) {
        throw new Error(
          "Cannot restore Free Hit before its full squad is snapshotted.",
        );
      }
      const picks = await ctx.db
        .query("fantasySquadPicks")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", team._id))
        .collect();
      for (const pick of picks) await ctx.db.delete(pick._id);
      for (const pick of state.initialPicks) {
        await ctx.db.insert("fantasySquadPicks", {
          ...pick,
          fantasyTeamId: team._id,
          createdAt: now,
          // A late cron must still be able to snapshot subsequent overdue rounds.
          updatedAt: Math.min(now, gameweek.deadlineAt ?? now),
        });
      }
      await ctx.db.patch(team._id, {
        budgetRemaining: state.budgetBefore,
        freeTransfers: state.freeTransfersBefore,
        updatedAt: now,
      });
    }
    await ctx.db.patch(state._id, {
      settledAt: now,
      ...(state.chip === "freeHit" ? { restoredAt: now } : {}),
      updatedAt: now,
    });
  }
}

export async function repriceGameweekTransfers(
  ctx: MutationCtx,
  team: Doc<"fantasyTeams">,
  state: Doc<"fantasyTeamGameweekStates">,
  unlimited: boolean,
  penaltyPerTransfer: number,
  now: number,
) {
  const transfers = (
    await ctx.db
      .query("fantasyTransfers")
      .withIndex("by_team_gameweek", (q) =>
        q.eq("fantasyTeamId", team._id).eq("gameweekId", state.gameweekId),
      )
      .collect()
  ).sort(
    (a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime,
  );
  let free = state.freeTransfersBefore;
  for (const transfer of transfers) {
    const penaltyPoints = unlimited || free > 0 ? 0 : penaltyPerTransfer;
    if (!unlimited) free = Math.max(0, free - 1);
    const deductions = await ctx.db
      .query("fantasyPointDeductions")
      .withIndex("by_source", (q) =>
        q.eq("source", "transfer").eq("sourceId", transfer._id),
      )
      .collect();
    for (const deduction of deductions) await ctx.db.delete(deduction._id);
    await ctx.db.patch(transfer._id, { penaltyPoints, updatedAt: now });
    if (penaltyPoints > 0) {
      await ctx.db.insert("fantasyPointDeductions", {
        seasonId: team.seasonId,
        fantasyTeamId: team._id,
        userId: team.userId,
        source: "transfer",
        sourceId: transfer._id,
        points: penaltyPoints,
        reason: "Paid transfer",
        createdAt: transfer.createdAt,
        updatedAt: now,
      });
    }
  }
  await ctx.db.patch(team._id, { freeTransfers: free, updatedAt: now });
}
