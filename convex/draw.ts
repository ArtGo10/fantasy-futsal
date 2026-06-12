import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./authHelpers";
import { MAX_PARTICIPANTS, POTS, Pot, TEAMS_PER_POT, TeamStage, potValidator } from "./validators";

declare const process: {
  env: Record<string, string | undefined>;
};

function getDrawUnlockAt() {
  const rawValue = process.env.DRAW_UNLOCK_AT?.trim();
  if (!rawValue) return null;

  const timestamp = Date.parse(rawValue);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isDrawLocked() {
  const drawUnlockAt = getDrawUnlockAt();
  return drawUnlockAt === null || Date.now() < drawUnlockAt;
}

function potLabel(pot: Pot) {
  return `корзина ${pot}`;
}

async function getParticipantAssignments(ctx: QueryCtx) {
  const assignments = await ctx.db.query("teamAssignments").collect();
  const teams = await ctx.db.query("teams").collect();
  const teamById = new Map(teams.map((team) => [team._id, team]));
  const assignmentsByUser = new Map<Id<"users">, Array<{
    id: Id<"teamAssignments">;
    pot: Pot;
    teamId: Id<"teams">;
    teamName: string;
    stageReached: TeamStage;
    isEliminated: boolean;
    createdAt: number;
  }>>();

  for (const assignment of assignments) {
    const team = teamById.get(assignment.teamId);
    if (!team) continue;

    const current = assignmentsByUser.get(assignment.userId) ?? [];
    current.push({
      id: assignment._id,
      pot: assignment.pot,
      teamId: assignment.teamId,
      teamName: team.name,
      stageReached: team.stageReached ?? "group",
      isEliminated: team.isEliminated ?? false,
      createdAt: assignment.createdAt,
    });
    assignmentsByUser.set(assignment.userId, current);
  }

  for (const userAssignments of assignmentsByUser.values()) {
    userAssignments.sort((a, b) => a.pot - b.pot);
  }

  return { assignments, teams, assignmentsByUser };
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    const users = await ctx.db.query("users").collect();
    const participantUsers = users.filter((participant) => participant.participantNumber !== undefined);
    const sortedUsers = [...participantUsers].sort(
      (a, b) => (a.participantNumber ?? 0) - (b.participantNumber ?? 0),
    );
    const { assignments, teams, assignmentsByUser } = await getParticipantAssignments(ctx);
    const userById = new Map(users.map((participant) => [participant._id, participant]));
    const assignmentByTeamId = new Map(assignments.map((assignment) => [assignment.teamId, assignment]));

    const teamsByPot = POTS.map((pot) => {
      const total = teams.filter((team) => team.pot === pot).length;
      const assigned = assignments.filter((assignment) => assignment.pot === pot).length;

      return {
        pot,
        label: potLabel(pot),
        total,
        assigned,
        remaining: Math.max(0, total - assigned),
        teams: teams
          .filter((team) => team.pot === pot)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((team) => {
            const assignment = assignmentByTeamId.get(team._id);
            const assignedUser = assignment ? userById.get(assignment.userId) : null;

            return {
              id: team._id,
              name: team.name,
              pot: team.pot,
              stageReached: team.stageReached ?? "group",
              isEliminated: team.isEliminated ?? false,
              assignedTo: assignedUser
                ? {
                    id: assignedUser._id,
                    name: assignedUser.name,
                    participantNumber: assignedUser.participantNumber ?? null,
                  }
                : null,
            };
          }),
      };
    });

    const participants = sortedUsers.map((participant) => ({
      id: participant._id,
      name: participant.name,
      email: participant.email ?? null,
      participantNumber: participant.participantNumber ?? null,
      assignments: assignmentsByUser.get(participant._id) ?? [],
      isCurrentUser: user?._id === participant._id,
    }));

    return {
      currentUser: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email ?? null,
            participantNumber: user.participantNumber ?? null,
            isParticipant: user.participantNumber !== undefined,
            assignments: assignmentsByUser.get(user._id) ?? [],
          }
        : null,
      participants,
      participantCount: participantUsers.length,
      userCount: users.length,
      spectatorCount: users.length - participantUsers.length,
      maxParticipants: MAX_PARTICIPANTS,
      isFull: participantUsers.length >= MAX_PARTICIPANTS,
      totalTeams: teams.length,
      teamsReady: teams.length === POTS.length * TEAMS_PER_POT && teamsByPot.every((pot) => pot.total === TEAMS_PER_POT),
      drawUnlockAt: getDrawUnlockAt(),
      teamsByPot,
    };
  },
});

export const drawTeam = mutation({
  args: {
    pot: potValidator,
  },
  handler: async (ctx, args) => {
    if (isDrawLocked()) {
      throw new Error("Выбор команд временно закрыт.");
    }

    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Ваш профиль ещё не готов.");
    }

    if (user.participantNumber === undefined) {
      throw new Error(`Все ${MAX_PARTICIPANTS} мест игроков уже заняты. Вы можете смотреть жеребьёвку как зритель.`);
    }

    const userAssignments = await ctx.db
      .query("teamAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const existingForPot = userAssignments.find((assignment) => assignment.pot === args.pot);
    if (existingForPot) {
      const team = await ctx.db.get(existingForPot.teamId);
      return {
        complete: false as const,
        alreadyAssigned: true as const,
        message: `Вы уже вытаскивали команду из корзины ${args.pot}.`,
        team: team
          ? {
              id: team._id,
              name: team.name,
              pot: team.pot,
            }
          : null,
      };
    }

    const teamsInPot = await ctx.db
      .query("teams")
      .withIndex("by_pot", (q) => q.eq("pot", args.pot))
      .collect();

    if (teamsInPot.length === 0) {
      throw new Error(`Команды из корзины ${args.pot} ещё не настроены.`);
    }

    const assignedInPot = await ctx.db
      .query("teamAssignments")
      .withIndex("by_pot", (q) => q.eq("pot", args.pot))
      .collect();
    const assignedTeamIds = new Set(assignedInPot.map((assignment) => assignment.teamId));
    const availableTeams = teamsInPot.filter((team) => !assignedTeamIds.has(team._id));

    if (availableTeams.length === 0) {
      throw new Error(`В корзине ${args.pot} не осталось свободных команд.`);
    }

    const selectedTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
    const existingTeamAssignment = await ctx.db
      .query("teamAssignments")
      .withIndex("by_team", (q) => q.eq("teamId", selectedTeam._id))
      .first();

    if (existingTeamAssignment) {
      throw new Error("Эту команду только что вытащил другой игрок. Попробуйте ещё раз.");
    }

    await ctx.db.insert("teamAssignments", {
      userId: user._id,
      teamId: selectedTeam._id,
      pot: selectedTeam.pot,
      createdAt: Date.now(),
    });

    return {
      complete: false as const,
      alreadyAssigned: false as const,
      team: {
        id: selectedTeam._id,
        name: selectedTeam.name,
        pot: selectedTeam.pot,
      },
    };
  },
});
