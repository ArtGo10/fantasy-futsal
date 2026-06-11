import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./authHelpers";
import { MAX_PARTICIPANTS, POTS, Pot, potValidator } from "./validators";

function potLabel(pot: Pot) {
  return `Pot ${pot}`;
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
    const sortedUsers = [...users].sort((a, b) => a.participantNumber - b.participantNumber);
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
              assignedTo: assignedUser
                ? {
                    id: assignedUser._id,
                    name: assignedUser.name,
                    participantNumber: assignedUser.participantNumber,
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
      participantNumber: participant.participantNumber,
      assignments: assignmentsByUser.get(participant._id) ?? [],
      isCurrentUser: user?._id === participant._id,
    }));

    return {
      currentUser: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email ?? null,
            participantNumber: user.participantNumber,
            assignments: assignmentsByUser.get(user._id) ?? [],
          }
        : null,
      participants,
      participantCount: users.length,
      maxParticipants: MAX_PARTICIPANTS,
      isFull: users.length >= MAX_PARTICIPANTS,
      totalTeams: teams.length,
      teamsReady: teams.length === 48 && teamsByPot.every((pot) => pot.total === 12),
      teamsByPot,
    };
  },
});

export const drawTeam = mutation({
  args: {
    pot: potValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("The participant list is full or your profile is not ready.");
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
        message: `You already drew from ${potLabel(args.pot)}.`,
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
      throw new Error(`${potLabel(args.pot)} is not configured yet.`);
    }

    const assignedInPot = await ctx.db
      .query("teamAssignments")
      .withIndex("by_pot", (q) => q.eq("pot", args.pot))
      .collect();
    const assignedTeamIds = new Set(assignedInPot.map((assignment) => assignment.teamId));
    const availableTeams = teamsInPot.filter((team) => !assignedTeamIds.has(team._id));

    if (availableTeams.length === 0) {
      throw new Error(`${potLabel(args.pot)} has no available teams left.`);
    }

    const selectedTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
    const existingTeamAssignment = await ctx.db
      .query("teamAssignments")
      .withIndex("by_team", (q) => q.eq("teamId", selectedTeam._id))
      .first();

    if (existingTeamAssignment) {
      throw new Error("This team was just drawn by another participant. Try again.");
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
