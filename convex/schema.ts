import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { matchDecisionValidator, matchStageValidator, matchStatusValidator, potValidator, teamStageValidator } from "./validators";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.string(),
    participantNumber: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_participant_number", ["participantNumber"]),

  teams: defineTable({
    name: v.string(),
    pot: potValidator,
    stageReached: v.optional(teamStageValidator),
    isEliminated: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_pot", ["pot"]),

  teamAssignments: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
    pot: potValidator,
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_pot", ["pot"])
    .index("by_user_pot", ["userId", "pot"]),

  gameSettings: defineTable({
    key: v.string(),
    drawLocked: v.optional(v.boolean()),
    drawUnlockAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  matches: defineTable({
    externalId: v.string(),
    matchNumber: v.number(),
    stage: matchStageValidator,
    group: v.optional(v.string()),
    scheduledAt: v.number(),
    sourceKickoff: v.string(),
    homeTeamId: v.optional(v.id("teams")),
    awayTeamId: v.optional(v.id("teams")),
    homeTeamName: v.string(),
    awayTeamName: v.string(),
    homeSlotName: v.optional(v.string()),
    awaySlotName: v.optional(v.string()),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    winnerTeamId: v.optional(v.id("teams")),
    decidedBy: v.optional(matchDecisionValidator),
    homePenaltyScore: v.optional(v.number()),
    awayPenaltyScore: v.optional(v.number()),
    status: matchStatusValidator,
    apiFootballFixtureId: v.optional(v.number()),
    apiFootballStatus: v.optional(v.string()),
    apiFootballUpdatedAt: v.optional(v.number()),
    espnEventId: v.optional(v.string()),
    espnStatus: v.optional(v.string()),
    espnUpdatedAt: v.optional(v.number()),
    venue: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduled_at", ["scheduledAt"])
    .index("by_external_id", ["externalId"])
    .index("by_match_number", ["matchNumber"])
    .index("by_status", ["status"])
    .index("by_api_football_fixture_id", ["apiFootballFixtureId"])
    .index("by_espn_event_id", ["espnEventId"]),

  syncLogs: defineTable({
    provider: v.string(),
    ok: v.boolean(),
    dateParam: v.optional(v.string()),
    fetched: v.optional(v.number()),
    normalized: v.optional(v.number()),
    matched: v.optional(v.number()),
    updated: v.optional(v.number()),
    completed: v.optional(v.number()),
    live: v.optional(v.number()),
    scheduled: v.optional(v.number()),
    unmatched: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_provider_created_at", ["provider", "createdAt"]),
});
