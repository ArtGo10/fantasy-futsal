import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { syncGameweekDeadlineReminderSchedules } from "./deadlineReminderScheduling";

const GAMEWEEK_DEADLINE_LEAD_MS = 60 * 60 * 1000;

export async function syncGameweekScheduleFromFixtures(
  ctx: MutationCtx,
  gameweek: Doc<"fantasyGameweeks">,
  now: number,
) {
  if (gameweek.status === "completed") return gameweek;

  const fixtures = await ctx.db
    .query("fantasyFixtures")
    .withIndex("by_gameweek", (q) => q.eq("gameweekId", gameweek._id))
    .collect();
  const activeFixtures = fixtures.filter(
    (fixture) =>
      fixture.seasonId === gameweek.seasonId &&
      fixture.status !== "cancelled" &&
      fixture.status !== "postponed" &&
      Number.isFinite(fixture.scheduledAt) &&
      fixture.scheduledAt > 0,
  );
  if (activeFixtures.length === 0) return gameweek;

  const startsAt = Math.min(
    ...activeFixtures.map((fixture) => fixture.scheduledAt),
  );
  const hasStartedFixture = activeFixtures.some(
    (fixture) => fixture.status === "live" || fixture.status === "completed",
  );
  let deadlineAt = startsAt - GAMEWEEK_DEADLINE_LEAD_MS;
  if (hasStartedFixture) deadlineAt = Math.min(deadlineAt, now);

  // Keep a fixed cutoff once squads have been locked, including across rule changes.
  if (
    gameweek.deadlineAt !== undefined &&
    gameweek.deadlineAt <= now &&
    (gameweek.status === "locked" ||
      gameweek.status === "live" ||
      gameweek.freeTransfersGrantedAt !== undefined)
  ) {
    deadlineAt = gameweek.deadlineAt;
  } else if (
    gameweek.deadlineAt !== undefined &&
    (gameweek.deadlineAt <= now ||
      gameweek.status === "locked" ||
      gameweek.status === "live" ||
      gameweek.freeTransfersGrantedAt !== undefined)
  ) {
    deadlineAt = Math.min(deadlineAt, gameweek.deadlineAt);
  }

  if (gameweek.startsAt === startsAt && gameweek.deadlineAt === deadlineAt) {
    return gameweek;
  }

  const updatedGameweek = { ...gameweek, startsAt, deadlineAt, updatedAt: now };
  await ctx.db.patch(gameweek._id, { startsAt, deadlineAt, updatedAt: now });
  await syncGameweekDeadlineReminderSchedules(ctx, updatedGameweek, now);
  return updatedGameweek;
}
