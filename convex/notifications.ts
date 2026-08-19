import { makeFunctionReference, type FunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { action, internalAction, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./authHelpers";

type ExpoPushMessage = {
  body: string;
  data: { kind: string };
  sound: string;
  title: string;
  to: string;
};

type ExpoPushRecipient = {
  tokens: string[];
  userId: Id<"users">;
};

type UserNotificationInput = {
  body: string;
  data?: { kind: string };
  pushEventKey?: string;
  sentAt?: number;
  title: string;
  type: string;
  userId: Id<"users">;
};

type DeadlineReminder = {
  body: string;
  key: string;
  title: string;
  type: string;
};

type GameweekPushState = { status: string } | null;

function normalizeToken(token: string) {
  return token.trim();
}

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 50;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

const enabledExpoPushRecipientForClerkUser = makeFunctionReference<
  "query",
  { clerkId: string },
  ExpoPushRecipient | null
>("notificationInternals:enabledExpoPushRecipientForClerkUser") as unknown as FunctionReference<
  "query",
  "internal",
  { clerkId: string },
  ExpoPushRecipient | null
>;

const enabledExpoPushRecipientsForAllUsers = makeFunctionReference<
  "query",
  Record<string, never>,
  ExpoPushRecipient[]
>("notificationInternals:enabledExpoPushRecipientsForAllUsers") as unknown as FunctionReference<
  "query",
  "internal",
  Record<string, never>,
  ExpoPushRecipient[]
>;
const pushNotificationRecipientsForAllUsers = makeFunctionReference<
  "query",
  Record<string, never>,
  ExpoPushRecipient[]
>("notificationInternals:pushNotificationRecipientsForAllUsers") as unknown as FunctionReference<
  "query",
  "internal",
  Record<string, never>,
  ExpoPushRecipient[]
>;

const isAdminClerkUser = makeFunctionReference<"query", { clerkId: string; email?: string }, boolean>(
  "notificationInternals:isAdminClerkUser",
) as unknown as FunctionReference<"query", "internal", { clerkId: string; email?: string }, boolean>;

const pendingDeadlineReminders = makeFunctionReference<"query", { now: number }, DeadlineReminder[]>(
  "notificationInternals:pendingDeadlineReminders",
) as unknown as FunctionReference<"query", "internal", { now: number }, DeadlineReminder[]>;
const pushNotificationEventExists = makeFunctionReference<"query", { key: string }, boolean>(
  "notificationInternals:pushNotificationEventExists",
) as unknown as FunctionReference<"query", "internal", { key: string }, boolean>;

const gameweekPushState = makeFunctionReference<
  "query",
  { gameweekId: Id<"fantasyGameweeks"> },
  GameweekPushState
>("notificationInternals:gameweekPushState") as unknown as FunctionReference<
  "query",
  "internal",
  { gameweekId: Id<"fantasyGameweeks"> },
  GameweekPushState
>;

const markPushNotificationEventSent = makeFunctionReference<
  "mutation",
  { key: string; tokensCount: number; type: string },
  { created: boolean; id: string }
>("notificationInternals:markPushNotificationEventSent") as unknown as FunctionReference<
  "mutation",
  "internal",
  { key: string; tokensCount: number; type: string },
  { created: boolean; id: string }
>;

const createUserNotifications = makeFunctionReference<
  "mutation",
  { notifications: UserNotificationInput[] },
  { created: number; updated: number }
>("notificationInternals:createUserNotifications") as unknown as FunctionReference<
  "mutation",
  "internal",
  { notifications: UserNotificationInput[] },
  { created: number; updated: number }
>;

async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  const chunks: ExpoPushMessage[][] = [];
  for (let index = 0; index < messages.length; index += 100) {
    chunks.push(messages.slice(index, index + 100));
  }

  let sent = 0;
  for (const chunk of chunks) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      throw new Error(`Expo Push API вернул ${response.status}.`);
    }

    const result = (await response.json()) as { data?: Array<{ status?: string; message?: string }> };
    const failed = result.data?.filter((item) => item.status !== "ok") ?? [];
    if (failed.length > 0) {
      throw new Error(failed[0]?.message ?? "Expo Push API не принял уведомление.");
    }

    sent += chunk.length;
  }

  return sent;
}

function createExpoMessages(
  tokens: string[],
  message: { body: string; kind: string; title: string },
) {
  return tokens.map((token) => ({
    to: token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: { kind: message.kind },
  }));
}

function createExpoMessagesForRecipients(
  recipients: ExpoPushRecipient[],
  message: { body: string; kind: string; title: string },
) {
  return recipients.flatMap((recipient) =>
    createExpoMessages(recipient.tokens, message),
  );
}

function countRecipientTokens(recipients: ExpoPushRecipient[]) {
  return recipients.reduce(
    (total, recipient) => total + recipient.tokens.length,
    0,
  );
}

function createNotificationRecordsForRecipients(
  recipients: ExpoPushRecipient[],
  message: { body: string; kind: string; title: string },
  sentAt: number,
  pushEventKey?: string,
): UserNotificationInput[] {
  return recipients.map((recipient) => ({
    userId: recipient.userId,
    type: message.kind,
    title: message.title,
    body: message.body,
    data: { kind: message.kind },
    ...(pushEventKey ? { pushEventKey } : {}),
    sentAt,
  }));
}

function toNotificationView(notification: {
  _id: Id<"userNotifications">;
  body: string;
  data?: unknown;
  readAt: number | null;
  sentAt: number;
  title: string;
  type: string;
}) {
  return {
    id: notification._id,
    body: notification.body,
    data: notification.data ?? null,
    readAt: notification.readAt,
    sentAt: notification.sentAt,
    title: notification.title,
    type: notification.type,
  };
}

export const listCurrentUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      return { items: [], unreadCount: 0 };
    }

    const limit = normalizeLimit(args.limit);
    const [items, unreadItems] = await Promise.all([
      ctx.db
        .query("userNotifications")
        .withIndex("by_user_sent_at", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit),
      ctx.db
        .query("userNotifications")
        .withIndex("by_user_read_at", (q) =>
          q.eq("userId", user._id).eq("readAt", null),
        )
        .collect(),
    ]);

    return {
      items: items.map(toNotificationView),
      unreadCount: unreadItems.length,
    };
  },
});

export const currentUserNotificationSummary = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) return { unreadCount: 0 };

    const unreadItems = await ctx.db
      .query("userNotifications")
      .withIndex("by_user_read_at", (q) =>
        q.eq("userId", user._id).eq("readAt", null),
      )
      .collect();

    return { unreadCount: unreadItems.length };
  },
});

export const markCurrentUserNotificationRead = mutation({
  args: {
    notificationId: v.id("userNotifications"),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) return { updated: false };

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      return { updated: false };
    }
    if (notification.readAt !== null) {
      return { updated: false };
    }

    await ctx.db.patch(notification._id, {
      readAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { updated: true };
  },
});

export const markAllCurrentUserNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) return { updated: 0 };

    const unreadItems = await ctx.db
      .query("userNotifications")
      .withIndex("by_user_read_at", (q) =>
        q.eq("userId", user._id).eq("readAt", null),
      )
      .collect();

    const now = Date.now();
    for (const item of unreadItems) {
      await ctx.db.patch(item._id, { readAt: now, updatedAt: now });
    }

    return { updated: unreadItems.length };
  },
});

export const upsertExpoPushToken = mutation({
  args: {
    platform: v.optional(v.string()),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Сначала нужно подготовить профиль пользователя.");
    }

    const token = normalizeToken(args.token);
    if (!token) {
      throw new Error("Push token не может быть пустым.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("pushNotificationTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        lastSeenAt: now,
        platform: args.platform,
        provider: "expo",
        updatedAt: now,
        userId: user._id,
      });

      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("pushNotificationTokens", {
      userId: user._id,
      provider: "expo",
      token,
      platform: args.platform,
      enabled: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { id, created: true };
  },
});

export const disableExpoPushToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const token = normalizeToken(args.token);
    if (!token) return { updated: false };

    const existing = await ctx.db
      .query("pushNotificationTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!existing) return { updated: false };

    await ctx.db.patch(existing._id, {
      enabled: false,
      updatedAt: Date.now(),
    });

    return { updated: true };
  },
});

export const sendTestPushToCurrentUser = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Сначала нужно войти в аккаунт.");
    }

    const recipient = await ctx.runQuery(enabledExpoPushRecipientForClerkUser, {
      clerkId: identity.subject,
    });
    if (!recipient || recipient.tokens.length === 0) {
      throw new Error("Для этого аккаунта пока нет сохранённого push token. Разрешите уведомления и перезапустите приложение.");
    }

    const sentAt = Date.now();
    const message = {
      title: "Fantasy Futsal",
      body: "Тестовое push-уведомление работает.",
      kind: "test",
    };
    const sent = await sendExpoPushMessages(
      createExpoMessagesForRecipients([recipient], message),
    );

    await ctx.runMutation(createUserNotifications, {
      notifications: createNotificationRecordsForRecipients(
        [recipient],
        message,
        sentAt,
      ),
    });

    return { sent };
  },
});

export const sendGameweekResultsReadyPushToAll = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Сначала нужно войти в аккаунт.");
    }

    const isAdmin = await ctx.runQuery(isAdminClerkUser, {
      clerkId: identity.subject,
      email: identity.email,
    });
    if (!isAdmin) {
      throw new Error("Это действие доступно только администратору.");
    }

    const recipients = await ctx.runQuery(
      enabledExpoPushRecipientsForAllUsers,
      {},
    );
    if (countRecipientTokens(recipients) === 0) {
      throw new Error("Пока нет сохранённых push token для рассылки.");
    }

    const sentAt = Date.now();
    const message = {
      title: "Итоги тура готовы",
      body: "Очки тура уже посчитаны. Откройте приложение, чтобы посмотреть таблицу.",
      kind: "gameweek_results_ready",
    };
    const sent = await sendExpoPushMessages(
      createExpoMessagesForRecipients(recipients, message),
    );

    await ctx.runMutation(createUserNotifications, {
      notifications: createNotificationRecordsForRecipients(
        recipients,
        message,
        sentAt,
        `gameweek-results-ready:${sentAt}`,
      ),
    });

    return { sent };
  },
});

export const sendPushToAllUsersInternal = internalAction({
  args: {
    body: v.string(),
    data: v.optional(v.object({ kind: v.string() })),
    gameweekId: v.optional(v.id("fantasyGameweeks")),
    key: v.string(),
    skipIfGameweekCompleted: v.optional(v.boolean()),
    title: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const alreadySent = await ctx.runQuery(pushNotificationEventExists, {
      key: args.key,
    });
    if (alreadySent) {
      return { created: 0, sent: 0, skippedDuplicate: true, updated: 0 };
    }

    if (args.skipIfGameweekCompleted && args.gameweekId) {
      const gameweek = await ctx.runQuery(gameweekPushState, {
        gameweekId: args.gameweekId,
      });
      if (!gameweek || gameweek.status === "completed") {
        return { created: 0, sent: 0, skippedDuplicate: false, updated: 0 };
      }
    }

    const recipients = await ctx.runQuery(
      pushNotificationRecipientsForAllUsers,
      {},
    );
    const message = {
      title: args.title,
      body: args.body,
      kind: args.data?.kind ?? args.type,
    };
    const tokenCount = countRecipientTokens(recipients);
    const sent =
      tokenCount > 0
        ? await sendExpoPushMessages(
            createExpoMessagesForRecipients(recipients, message),
          )
        : 0;
    const sentAt = Date.now();

    await ctx.runMutation(markPushNotificationEventSent, {
      key: args.key,
      tokensCount: sent,
      type: args.type,
    });

    const notificationResult =
      recipients.length > 0
        ? await ctx.runMutation(createUserNotifications, {
            notifications: createNotificationRecordsForRecipients(
              recipients,
              message,
              sentAt,
              args.key,
            ),
          })
        : { created: 0, updated: 0 };

    return {
      created: notificationResult.created,
      sent,
      skippedDuplicate: false,
      updated: notificationResult.updated,
    };
  },
});

export const sendDeadlineRemindersInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [recipients, reminders] = await Promise.all([
      ctx.runQuery(pushNotificationRecipientsForAllUsers, {}),
      ctx.runQuery(pendingDeadlineReminders, { now }),
    ]);

    if (reminders.length === 0) {
      return { created: 0, reminders: 0, sent: 0, updated: 0 };
    }

    let created = 0;
    let sent = 0;
    let updated = 0;
    for (const reminder of reminders) {
      const sentAt = Date.now();
      const message = {
        title: reminder.title,
        body: reminder.body,
        kind: reminder.type,
      };
      const tokenCount = countRecipientTokens(recipients);
      const sentForReminder =
        tokenCount > 0
          ? await sendExpoPushMessages(
              createExpoMessagesForRecipients(recipients, message),
            )
          : 0;

      await ctx.runMutation(markPushNotificationEventSent, {
        key: reminder.key,
        tokensCount: sentForReminder,
        type: reminder.type,
      });

      if (recipients.length > 0) {
        const notificationResult = await ctx.runMutation(createUserNotifications, {
          notifications: createNotificationRecordsForRecipients(
            recipients,
            message,
            sentAt,
            reminder.key,
          ),
        });
        created += notificationResult.created;
        updated += notificationResult.updated;
      }
      sent += sentForReminder;
    }

    return { created, reminders: reminders.length, sent, updated };
  },
});
