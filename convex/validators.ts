import { v } from "convex/values";

export const MAX_PARTICIPANTS = 16;
export const TEAMS_PER_POT = 16;
export const POTS = [1, 2, 3] as const;
export const TEAM_STAGES = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
] as const;
export const MATCH_STAGES = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
] as const;

export type Pot = (typeof POTS)[number];
export type TeamStage = (typeof TEAM_STAGES)[number];
export type MatchStage = (typeof MATCH_STAGES)[number];

export const potValidator = v.union(v.literal(1), v.literal(2), v.literal(3));
export const teamStageValidator = v.union(
  v.literal("group"),
  v.literal("round_of_32"),
  v.literal("round_of_16"),
  v.literal("quarter_final"),
  v.literal("semi_final"),
  v.literal("final"),
  v.literal("champion"),
);
export const matchStageValidator = v.union(
  v.literal("group"),
  v.literal("round_of_32"),
  v.literal("round_of_16"),
  v.literal("quarter_final"),
  v.literal("semi_final"),
  v.literal("final"),
);
export const matchStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
);
export const matchDecisionValidator = v.union(
  v.literal("regular"),
  v.literal("extra_time"),
  v.literal("penalties"),
);
