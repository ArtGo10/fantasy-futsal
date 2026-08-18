import { makeFunctionReference, type FunctionReference } from "convex/server";
import { v } from "convex/values";

import { action, internalAction, mutation } from "./_generated/server";
import { getCurrentUser } from "./authHelpers";

type ExpoPushMessage = {
  body: string;
  data: { kind: string };
  sound: string;
  title: string;
  to: string;
};

type DeadlineReminder = {
  body: string;
  key: string;
  title: string;
  type: string;
};

function normalizeToken(token: string) {
  return token.trim();
}

const enabledExpoTokensForClerkUser = makeFunctionReference<"query", { clerkId: string }, string[]>(
  "notificationInternals:enabledExpoTokensForClerkUser",
) as unknown as FunctionReference<"query", "internal", { clerkId: string }, string[]>;

const enabledExpoTokensForAllUsers = makeFunctionReference<"query", Record<string, never>, string[]>(
  "notificationInternals:enabledExpoTokensForAllUsers",
) as unknown as FunctionReference<"query", "internal", Record<string, never>, string[]>;

const isAdminClerkUser = makeFunctionReference<"query", { clerkId: string; email?: string }, boolean>(
  "notificationInternals:isAdminClerkUser",
) as unknown as FunctionReference<"query", "internal", { clerkId: string; email?: string }, boolean>;

const pendingDeadlineReminders = makeFunctionReference<"query", { now: number }, DeadlineReminder[]>(
  "notificationInternals:pendingDeadlineReminders",
) as unknown as FunctionReference<"query", "internal", { now: number }, DeadlineReminder[]>;

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

function createExpoMessages(tokens: string[], message: { body: string; kind: string; title: string }) {
  return tokens.map((token) => ({
    to: token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: { kind: message.kind },
  }));
}

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

    const tokens = await ctx.runQuery(enabledExpoTokensForClerkUser, {
      clerkId: identity.subject,
    });
    if (tokens.length === 0) {
      throw new Error("Для этого аккаунта пока нет сохранённого push token. Разрешите уведомления и перезапустите приложение.");
    }

    const sent = await sendExpoPushMessages(
      createExpoMessages(tokens, {
        title: "Fantasy Futsal",
        body: "Тестовое push-уведомление работает.",
        kind: "test",
      }),
    );

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

    const tokens = await ctx.runQuery(enabledExpoTokensForAllUsers, {});
    if (tokens.length === 0) {
      throw new Error("Пока нет сохранённых push token для рассылки.");
    }

    const sent = await sendExpoPushMessages(
      createExpoMessages(tokens, {
        title: "Итоги тура готовы",
        body: "Очки тура уже посчитаны. Откройте приложение, чтобы посмотреть таблицу.",
        kind: "gameweek_results_ready",
      }),
    );

    return { sent };
  },
});

export const sendDeadlineRemindersInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [tokens, reminders] = await Promise.all([
      ctx.runQuery(enabledExpoTokensForAllUsers, {}),
      ctx.runQuery(pendingDeadlineReminders, { now }),
    ]);

    if (tokens.length === 0 || reminders.length === 0) {
      return { reminders: reminders.length, sent: 0 };
    }

    let sent = 0;
    for (const reminder of reminders) {
      const sentForReminder = await sendExpoPushMessages(
        createExpoMessages(tokens, {
          title: reminder.title,
          body: reminder.body,
          kind: reminder.type,
        }),
      );

      await ctx.runMutation(markPushNotificationEventSent, {
        key: reminder.key,
        tokensCount: sentForReminder,
        type: reminder.type,
      });
      sent += sentForReminder;
    }

    return { reminders: reminders.length, sent };
  },
});
