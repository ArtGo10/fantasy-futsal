import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

declare const process: {
  env: Record<string, string | undefined>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getEnvList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const enabledExpoTokensForClerkUser = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];

    const tokens = await ctx.db
      .query("pushNotificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return Array.from(
      new Set(
        tokens
          .filter((token) => token.provider === "expo" && token.enabled)
          .map((token) => token.token),
      ),
    );
  },
});

export const enabledExpoTokensForAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("pushNotificationTokens").collect();

    return Array.from(
      new Set(
        tokens
          .filter((token) => token.provider === "expo" && token.enabled)
          .map((token) => token.token),
      ),
    );
  },
});

export const isAdminClerkUser = internalQuery({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const adminClerkIds = getEnvList("ADMIN_CLERK_IDS");
    const adminEmails = getEnvList("ADMIN_EMAILS");
    const identityEmail = args.email?.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();

    if (adminClerkIds.includes(args.clerkId.toLowerCase())) return true;
    if (identityEmail && adminEmails.includes(identityEmail)) return true;
    if (userEmail && adminEmails.includes(userEmail)) return true;

    return user?.participantNumber === 1;
  },
});

export const pendingDeadlineReminders = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const seasons = await ctx.db.query("fantasySeasons").collect();
    const activeSeasons = seasons.filter((season) => season.status !== "archived" && season.status !== "completed");
    const reminders: Array<{ body: string; key: string; title: string; type: string }> = [];

    for (const season of activeSeasons) {
      const gameweeks = await ctx.db
        .query("fantasyGameweeks")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect();

      for (const gameweek of gameweeks) {
        if (!gameweek.deadlineAt) continue;

        const timeUntilDeadline = gameweek.deadlineAt - args.now;
        if (timeUntilDeadline <= 0 || timeUntilDeadline > DAY_MS) continue;

        const key = `deadline-reminder:${gameweek._id}`;
        const alreadySent = await ctx.db
          .query("pushNotificationEvents")
          .withIndex("by_key", (q) => q.eq("key", key))
          .first();
        if (alreadySent) continue;

        reminders.push({
          key,
          type: "deadline_reminder",
          title: "Fantasy Futsal",
          body: `${gameweek.name}: дедлайн уже завтра. Не забудьте сохранить состав.`,
        });
      }
    }

    return reminders;
  },
});

export const markPushNotificationEventSent = internalMutation({
  args: {
    key: v.string(),
    tokensCount: v.number(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushNotificationEvents")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) return { created: false, id: existing._id };

    const now = Date.now();
    const id = await ctx.db.insert("pushNotificationEvents", {
      key: args.key,
      type: args.type,
      tokensCount: args.tokensCount,
      sentAt: now,
      createdAt: now,
    });

    return { created: true, id };
  },
});
