import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { potValidator } from "./validators";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.string(),
    participantNumber: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_participant_number", ["participantNumber"]),

  teams: defineTable({
    name: v.string(),
    pot: potValidator,
    createdAt: v.number(),
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
});
