import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

import { internalMutation, internalQuery } from "./_generated/server";

declare const process: {
  env: Record<string, string | undefined>;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type ExpoPushRecipient = {
  tokens: string[];
  userId: Id<"users">;
};

type DeadlineReminderWindow = {
  body: (gameweekName: string) => string;
  keySuffix: string;
  maxMs: number;
  minExclusiveMs: number;
  title: string;
  type: string;
};

const DEADLINE_REMINDER_WINDOWS: DeadlineReminderWindow[] = [
  {
    keySuffix: "day-before",
    type: "deadline_reminder_day",
    title: "Дедлайн завтра",
    body: (gameweekName) =>
      `${gameweekName}: дедлайн уже завтра. Не забудьте сохранить состав.`,
    maxMs: DAY_MS,
    minExclusiveMs: HOUR_MS,
  },
  {
    keySuffix: "hour-before",
    type: "deadline_reminder_hour",
    title: "Дедлайн через час",
    body: (gameweekName) =>
      `${gameweekName}: остался примерно час, чтобы сохранить состав.`,
    maxMs: HOUR_MS,
    minExclusiveMs: 0,
  },
];

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

export const enabledExpoPushRecipientForClerkUser = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<ExpoPushRecipient | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;

    const tokens = await ctx.db
      .query("pushNotificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const enabledTokens = Array.from(
      new Set(
        tokens
          .filter((token) => token.provider === "expo" && token.enabled)
          .map((token) => token.token),
      ),
    );

    return { tokens: enabledTokens, userId: user._id };
  },
});

export const enabledExpoPushRecipientsForAllUsers = internalQuery({
  args: {},
  handler: async (ctx): Promise<ExpoPushRecipient[]> => {
    const tokens = await ctx.db.query("pushNotificationTokens").collect();
    const recipients = new Map<
      string,
      ExpoPushRecipient & { tokenSet: Set<string> }
    >();

    for (const token of tokens) {
      if (token.provider !== "expo" || !token.enabled) continue;

      const key = token.userId;
      const existing = recipients.get(key);
      if (existing) {
        existing.tokenSet.add(token.token);
        continue;
      }

      recipients.set(key, {
        tokenSet: new Set([token.token]),
        tokens: [],
        userId: token.userId,
      });
    }

    return Array.from(recipients.values()).map((recipient) => ({
      tokens: Array.from(recipient.tokenSet),
      userId: recipient.userId,
    }));
  },
});

export const pushNotificationRecipientsForAllUsers = internalQuery({
  args: {},
  handler: async (ctx): Promise<ExpoPushRecipient[]> => {
    const [users, tokens] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("pushNotificationTokens").collect(),
    ]);
    const tokensByUserId = new Map<string, Set<string>>();

    for (const token of tokens) {
      if (token.provider !== "expo" || !token.enabled) continue;

      const key = token.userId;
      const existing = tokensByUserId.get(key);
      if (existing) {
        existing.add(token.token);
      } else {
        tokensByUserId.set(key, new Set([token.token]));
      }
    }

    return users.map((user) => ({
      tokens: Array.from(tokensByUserId.get(user._id) ?? []),
      userId: user._id,
    }));
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

export const gameweekPushState = internalQuery({
  args: {
    gameweekId: v.id("fantasyGameweeks"),
  },
  handler: async (ctx, args) => {
    const gameweek = await ctx.db.get(args.gameweekId);
    if (!gameweek) return null;

    return { status: gameweek.status };
  },
});
export const pushNotificationEventExists = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("pushNotificationEvents")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    return !!event;
  },
});

export const pendingDeadlineReminders = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const seasons = await ctx.db.query("fantasySeasons").collect();
    const activeSeasons = seasons.filter(
      (season) => season.status !== "archived" && season.status !== "completed",
    );
    const reminders: Array<{
      body: string;
      key: string;
      title: string;
      type: string;
    }> = [];

    for (const season of activeSeasons) {
      const gameweeks = await ctx.db
        .query("fantasyGameweeks")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect();

      for (const gameweek of gameweeks) {
        if (!gameweek.deadlineAt) continue;
        if (gameweek.status !== "open" && gameweek.status !== "upcoming") {
          continue;
        }

        const timeUntilDeadline = gameweek.deadlineAt - args.now;
        if (timeUntilDeadline <= 0 || timeUntilDeadline > DAY_MS) continue;

        for (const reminderWindow of DEADLINE_REMINDER_WINDOWS) {
          if (timeUntilDeadline > reminderWindow.maxMs) continue;
          if (timeUntilDeadline <= reminderWindow.minExclusiveMs) continue;

          const key =
            `deadline-reminder:${reminderWindow.keySuffix}:${gameweek._id}`;
          const alreadySent = await ctx.db
            .query("pushNotificationEvents")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();
          if (alreadySent) continue;

          if (reminderWindow.keySuffix === "day-before") {
            const legacyDayReminder = await ctx.db
              .query("pushNotificationEvents")
              .withIndex("by_key", (q) =>
                q.eq("key", `deadline-reminder:${gameweek._id}`),
              )
              .first();
            if (legacyDayReminder) continue;
          }

          reminders.push({
            key,
            type: reminderWindow.type,
            title: reminderWindow.title,
            body: reminderWindow.body(gameweek.name),
          });
        }
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

export const createUserNotifications = internalMutation({
  args: {
    notifications: v.array(
      v.object({
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
        pushEventKey: v.optional(v.string()),
        sentAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let updated = 0;

    for (const notification of args.notifications) {
      const sentAt = notification.sentAt ?? now;
      const optionalPayload = {
        ...(notification.data !== undefined ? { data: notification.data } : {}),
        ...(notification.pushEventKey
          ? { pushEventKey: notification.pushEventKey }
          : {}),
      };

      if (notification.pushEventKey) {
        const existing = await ctx.db
          .query("userNotifications")
          .withIndex("by_user_push_event_key", (q) =>
            q
              .eq("userId", notification.userId)
              .eq("pushEventKey", notification.pushEventKey),
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            body: notification.body,
            ...optionalPayload,
            sentAt,
            title: notification.title,
            type: notification.type,
            updatedAt: now,
          });
          updated += 1;
          continue;
        }
      }

      await ctx.db.insert("userNotifications", {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        ...optionalPayload,
        readAt: null,
        sentAt,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }

    return { created, updated };
  },
});
