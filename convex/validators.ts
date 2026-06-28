import { v } from "convex/values";

export const MAX_PARTICIPANTS = 16;
export const TEAMS_PER_POT = 16;
export const POTS = [1, 2, 3] as const;
export const TENNIS_MAX_PARTICIPANTS = 16;
export const TENNIS_COMPETITORS_PER_POT = 16;
export const TENNIS_POTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
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
  "third_place",
  "final",
] as const;
export const TENNIS_TOURS = ["atp", "wta"] as const;
export const TENNIS_STAGES = [
  "round_of_128",
  "round_of_64",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
] as const;

export type Pot = (typeof POTS)[number];
export type TennisPot = (typeof TENNIS_POTS)[number];
export type TeamStage = (typeof TEAM_STAGES)[number];
export type MatchStage = (typeof MATCH_STAGES)[number];
export type TennisTour = (typeof TENNIS_TOURS)[number];
export type TennisStage = (typeof TENNIS_STAGES)[number];

export const potValidator = v.union(v.literal(1), v.literal(2), v.literal(3));
export const tennisPotValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
  v.literal(7),
  v.literal(8),
);
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
  v.literal("third_place"),
  v.literal("final"),
);
export const matchStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("live"),
  v.literal("completed"),
);
export const matchDecisionValidator = v.union(
  v.literal("regular"),
  v.literal("extra_time"),
  v.literal("penalties"),
);
export const tennisTourValidator = v.union(v.literal("atp"), v.literal("wta"));
export const tennisStageValidator = v.union(
  v.literal("round_of_128"),
  v.literal("round_of_64"),
  v.literal("round_of_32"),
  v.literal("round_of_16"),
  v.literal("quarter_final"),
  v.literal("semi_final"),
  v.literal("final"),
  v.literal("champion"),
);
