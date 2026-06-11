import { v } from "convex/values";

export const MAX_PARTICIPANTS = 12;
export const POTS = [1, 2, 3, 4] as const;

export type Pot = (typeof POTS)[number];

export const potValidator = v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4));
