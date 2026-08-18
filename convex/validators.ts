import { v } from "convex/values";

export const FANTASY_SEASON_STATUSES = ["draft", "setup", "active", "completed", "archived"] as const;
export const FANTASY_GAMEWEEK_STATUSES = ["upcoming", "open", "locked", "live", "completed"] as const;
export const FANTASY_FIXTURE_STATUSES = ["scheduled", "live", "completed", "postponed", "cancelled"] as const;
export const FANTASY_PLAYER_POSITIONS = ["goalkeeper", "universal"] as const;
export const FANTASY_PLAYER_STORAGE_POSITIONS = ["goalkeeper", "fixo", "winger", "pivot", "universal"] as const;
export const FANTASY_PLAYER_STATUSES = ["active", "doubtful", "injured", "suspended", "unavailable", "left"] as const;
export const FANTASY_SQUAD_ROLES = ["starter", "bench", "reserve"] as const;
export const FANTASY_FIXTURE_EVENT_TYPES = [
  "goal",
  "assist",
  "yellow_card",
  "red_card",
  "own_goal",
  "penalty_missed",
  "penalty_saved",
] as const;
export const FANTASY_FIXTURE_SIDES = ["home", "away"] as const;

export type FantasySeasonStatus = (typeof FANTASY_SEASON_STATUSES)[number];
export type FantasyGameweekStatus = (typeof FANTASY_GAMEWEEK_STATUSES)[number];
export type FantasyFixtureStatus = (typeof FANTASY_FIXTURE_STATUSES)[number];
export type FantasyPlayerPosition = (typeof FANTASY_PLAYER_POSITIONS)[number];
export type FantasyPlayerStoragePosition = (typeof FANTASY_PLAYER_STORAGE_POSITIONS)[number];
export type FantasyPlayerStatus = (typeof FANTASY_PLAYER_STATUSES)[number];
export type FantasySquadRole = (typeof FANTASY_SQUAD_ROLES)[number];
export type FantasyFixtureEventType = (typeof FANTASY_FIXTURE_EVENT_TYPES)[number];
export type FantasyFixtureSide = (typeof FANTASY_FIXTURE_SIDES)[number];

export const fantasySeasonStatusValidator = v.union(
  v.literal("draft"),
  v.literal("setup"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);
export const fantasyGameweekStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("open"),
  v.literal("locked"),
  v.literal("live"),
  v.literal("completed"),
);
export const fantasyFixtureStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("live"),
  v.literal("completed"),
  v.literal("postponed"),
  v.literal("cancelled"),
);
export const fantasyPlayerPositionValidator = v.union(
  v.literal("goalkeeper"),
  v.literal("universal"),
);
export const fantasyPlayerStoragePositionValidator = v.union(
  v.literal("goalkeeper"),
  v.literal("fixo"),
  v.literal("winger"),
  v.literal("pivot"),
  v.literal("universal"),
);
export const fantasyPlayerStatusValidator = v.union(
  v.literal("active"),
  v.literal("doubtful"),
  v.literal("injured"),
  v.literal("suspended"),
  v.literal("unavailable"),
  v.literal("left"),
);
export const fantasyPlayerStatusDetailsValidator = v.object({
  message: v.optional(v.string()),
  messageEn: v.optional(v.string()),
  messageUk: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
});
export const fantasySquadRoleValidator = v.union(
  v.literal("starter"),
  v.literal("bench"),
  v.literal("reserve"),
);
export const fantasyFixtureEventTypeValidator = v.union(
  v.literal("goal"),
  v.literal("assist"),
  v.literal("yellow_card"),
  v.literal("red_card"),
  v.literal("own_goal"),
  v.literal("penalty_missed"),
  v.literal("penalty_saved"),
);
export const fantasyFixtureSideValidator = v.union(
  v.literal("home"),
  v.literal("away"),
);
