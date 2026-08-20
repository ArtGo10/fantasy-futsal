import { makeFunctionReference, type FunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalAction, mutation, query } from "./_generated/server";
import { getCurrentUser, isAdminUser, requireIdentity } from "./authHelpers";

const MAX_FEEDBACK_MESSAGE_LENGTH = 4000;
const SUPPORT_EMAIL = "support@fantasyfutsal.app";
const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FEEDBACK_EMAIL_FROM = "Fantasy Futsal <" + SUPPORT_EMAIL + ">";

type SendFeedbackEmailArgs = {
  createdAt: number;
  email?: string;
  feedbackId: Id<"userFeedback">;
  message: string;
  name?: string;
  source?: string;
};

type SendFeedbackEmailResult = {
  sent: boolean;
  skipped: boolean;
};

const sendFeedbackEmailInternalRef = makeFunctionReference<
  "action",
  SendFeedbackEmailArgs,
  SendFeedbackEmailResult
>("users:sendFeedbackEmailInternal") as unknown as FunctionReference<
  "action",
  "internal",
  SendFeedbackEmailArgs,
  SendFeedbackEmailResult
>;

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFeedbackEmailText(args: {
  createdAt: number;
  email?: string;
  feedbackId: string;
  message: string;
  name?: string;
  source?: string;
}) {
  const submittedAt = new Date(args.createdAt).toISOString();

  return [
    "New Fantasy Futsal feedback",
    "",
    "Feedback ID: " + args.feedbackId,
    "Submitted at: " + submittedAt,
    "Name: " + (args.name ?? "Unknown"),
    "Email: " + (args.email ?? "Not provided"),
    "Source: " + (args.source ?? "Not provided"),
    "",
    "Message:",
    args.message,
  ].join("\n");
}

function formatFeedbackEmailHtml(args: {
  createdAt: number;
  email?: string;
  feedbackId: string;
  message: string;
  name?: string;
  source?: string;
}) {
  const submittedAt = new Date(args.createdAt).toISOString();
  const rows = [
    ["Feedback ID", args.feedbackId],
    ["Submitted at", submittedAt],
    ["Name", args.name ?? "Unknown"],
    ["Email", args.email ?? "Not provided"],
    ["Source", args.source ?? "Not provided"],
  ];
  const tableRows = rows
    .map(
      ([label, value]) =>
        '<tr>' +
        '<td style="padding: 4px 16px 4px 0; color: #6B7280; font-weight: 700;">' +
        escapeHtml(label) +
        '</td>' +
        '<td style="padding: 4px 0;">' +
        escapeHtml(value) +
        '</td>' +
        '</tr>',
    )
    .join("");

  return (
    '<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">' +
    '<h1 style="font-size: 20px; margin: 0 0 16px;">New Fantasy Futsal feedback</h1>' +
    '<table style="border-collapse: collapse; margin-bottom: 18px;">' +
    tableRows +
    '</table>' +
    '<div style="font-weight: 700; margin-bottom: 8px;">Message</div>' +
    '<div style="white-space: pre-wrap; border: 1px solid #D7DFEA; border-radius: 8px; padding: 12px; background: #F8FAFC;">' +
    escapeHtml(args.message) +
    '</div>' +
    '</div>'
  );
}

function capitalizeNamePart(value: string) {
  if (!value) return value;

  const [firstLetter, ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("uk-UA")}${restLetters.join("").toLocaleLowerCase("uk-UA")}`;
}

function formatPersonName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word
        .split(/([-’'])/)
        .map(capitalizeNamePart)
        .join(""),
    )
    .join(" ");
}

function resolveName(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  name?: string,
  email?: string,
) {
  const normalizedName = normalizeOptional(name);
  if (normalizedName) return formatPersonName(normalizedName);

  if (identity.name?.trim()) return formatPersonName(identity.name);
  if (identity.nickname?.trim()) return formatPersonName(identity.nickname);

  const resolvedEmail =
    normalizeOptional(email) ?? normalizeOptional(identity.email);
  if (resolvedEmail)
    return formatPersonName(resolvedEmail.split("@")[0] || "Manager");

  return `Manager ${identity.subject.slice(-6)}`;
}

function toUserView(user: {
  _id: string;
  clerkId: string;
  email?: string;
  name: string;
  participantNumber?: number;
  favoriteFantasyClubId?: string;
  preferredLanguage?: "en" | "uk";
  termsAcceptedAt?: number;
  termsVersion?: string;
  createdAt: number;
}) {
  return {
    id: user._id,
    clerkId: user.clerkId,
    email: user.email ?? null,
    name: user.name,
    participantNumber: user.participantNumber ?? null,
    favoriteFantasyClubId: user.favoriteFantasyClubId ?? null,
    preferredLanguage: user.preferredLanguage ?? null,
    termsAcceptedAt: user.termsAcceptedAt ?? null,
    termsVersion: user.termsVersion ?? null,
    createdAt: user.createdAt,
  };
}

export const upsertCurrentUser = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(v.literal("en"), v.literal("uk"))),
    termsAcceptedAt: v.optional(v.number()),
    termsVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const email =
      normalizeOptional(args.email) ?? normalizeOptional(identity.email);
    const name = resolveName(identity, args.name, email);
    const now = Date.now();

    const legalAcceptancePatch =
      args.termsAcceptedAt && args.termsVersion
        ? {
            termsAcceptedAt: args.termsAcceptedAt,
            termsVersion: args.termsVersion,
          }
        : {};
    const preferredLanguagePatch = args.preferredLanguage
      ? { preferredLanguage: args.preferredLanguage }
      : {};

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        ...legalAcceptancePatch,
        ...preferredLanguagePatch,
        updatedAt: now,
      });

      return {
        user: toUserView({
          ...existing,
          email,
          name,
          ...legalAcceptancePatch,
          ...preferredLanguagePatch,
        }),
      };
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      ...legalAcceptancePatch,
      ...preferredLanguagePatch,
      createdAt: now,
      updatedAt: now,
    });

    return {
      user: {
        id: userId,
        clerkId: identity.subject,
        email: email ?? null,
        name,
        participantNumber: null,
        favoriteFantasyClubId: null,
        preferredLanguage: preferredLanguagePatch.preferredLanguage ?? null,
        termsAcceptedAt: legalAcceptancePatch.termsAcceptedAt ?? null,
        termsVersion: legalAcceptancePatch.termsVersion ?? null,
        createdAt: now,
      },
    };
  },
});

export const acceptCurrentUserTerms = mutation({
  args: {
    termsAcceptedAt: v.number(),
    termsVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User profile is not ready yet.");
    }

    await ctx.db.patch(user._id, {
      termsAcceptedAt: args.termsAcceptedAt,
      termsVersion: args.termsVersion,
      updatedAt: Date.now(),
    });

    return {
      user: toUserView({
        ...user,
        termsAcceptedAt: args.termsAcceptedAt,
        termsVersion: args.termsVersion,
      }),
    };
  },
});

export const updateFavoriteFantasyClub = mutation({
  args: {
    favoriteClubId: v.union(v.id("fantasyClubs"), v.null()),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User profile is not ready yet.");
    }

    const patch = args.favoriteClubId
      ? { favoriteFantasyClubId: args.favoriteClubId, updatedAt: Date.now() }
      : { favoriteFantasyClubId: undefined, updatedAt: Date.now() };

    await ctx.db.patch(user._id, patch);
    return { favoriteFantasyClubId: args.favoriteClubId };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await getCurrentUser(ctx);

    return {
      isAdmin: isAdminUser(identity, user),
      user: user ? toUserView(user) : null,
    };
  },
});

export const sendFeedbackEmailInternal = internalAction({
  args: {
    createdAt: v.number(),
    email: v.optional(v.string()),
    feedbackId: v.id("userFeedback"),
    message: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = normalizeOptional(process.env.RESEND_API_KEY);
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Feedback email was not sent.");
      return { sent: false, skipped: true };
    }

    const to = normalizeOptional(process.env.FEEDBACK_EMAIL_TO) ?? SUPPORT_EMAIL;
    const from =
      normalizeOptional(process.env.FEEDBACK_EMAIL_FROM) ??
      DEFAULT_FEEDBACK_EMAIL_FROM;
    const author = args.name ?? args.email ?? "user";
    const payload = {
      from,
      to: [to],
      subject: "New Fantasy Futsal feedback from " + author,
      text: formatFeedbackEmailText(args),
      html: formatFeedbackEmailHtml(args),
      ...(args.email ? { reply_to: args.email } : {}),
    };

    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        ("Could not send feedback email: " + response.status + " " + errorText).trim(),
      );
    }

    return { sent: true, skipped: false };
  },
});

export const submitFeedback = mutation({
  args: {
    message: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User profile is not ready yet.");
    }

    const message = args.message.trim();
    if (message.length < 3) {
      throw new Error("Feedback message is too short.");
    }
    if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
      throw new Error("Feedback message is too long.");
    }

    const now = Date.now();
    const source = normalizeOptional(args.source);
    const feedbackId = await ctx.db.insert("userFeedback", {
      userId: user._id,
      email: user.email,
      name: user.name,
      message,
      source,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, sendFeedbackEmailInternalRef, {
      feedbackId,
      email: user.email,
      name: user.name,
      message,
      source,
      createdAt: now,
    });

    return { feedbackId };
  },
});

export const listFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!isAdminUser(identity, user)) return [];

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 50);
    const items = await ctx.db
      .query("userFeedback")
      .withIndex("by_status_created_at", (q) => q.eq("status", "new"))
      .order("desc")
      .take(limit);

    return items.map((item) => ({
      id: item._id,
      userId: item.userId ?? null,
      email: item.email ?? null,
      name: item.name ?? null,
      message: item.message,
      source: item.source ?? null,
      status: item.status,
      createdAt: item.createdAt,
    }));
  },
});

export const deleteCurrentUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      return {
        deleted: false,
        favorites: 0,
        feedback: 0,
        gameweekSquadPicks: 0,
        pushTokens: 0,
        notifications: 0,
        squadPicks: 0,
        pointDeductions: 0,
        teamScores: 0,
        teams: 0,
        transfers: 0,
      };
    }

    let deletedGameweekSquadPicks = 0;
    let deletedSquadPicks = 0;
    let deletedTeamScores = 0;
    let deletedTransfers = 0;
    let deletedPointDeductions = 0;
    const fantasyTeams = await ctx.db
      .query("fantasyTeams")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const fantasyTeam of fantasyTeams) {
      const picks = await ctx.db
        .query("fantasySquadPicks")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", fantasyTeam._id))
        .collect();
      for (const pick of picks) {
        await ctx.db.delete(pick._id);
        deletedSquadPicks += 1;
      }

      const gameweekPicks = await ctx.db
        .query("fantasyGameweekSquadPicks")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", fantasyTeam._id))
        .collect();
      for (const gameweekPick of gameweekPicks) {
        await ctx.db.delete(gameweekPick._id);
        deletedGameweekSquadPicks += 1;
      }

      const deductions = await ctx.db
        .query("fantasyPointDeductions")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", fantasyTeam._id))
        .collect();
      for (const deduction of deductions) {
        await ctx.db.delete(deduction._id);
        deletedPointDeductions += 1;
      }

      const transfers = await ctx.db
        .query("fantasyTransfers")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", fantasyTeam._id))
        .collect();
      for (const transfer of transfers) {
        await ctx.db.delete(transfer._id);
        deletedTransfers += 1;
      }

      const scores = await ctx.db
        .query("fantasyTeamGameweekScores")
        .withIndex("by_team", (q) => q.eq("fantasyTeamId", fantasyTeam._id))
        .collect();
      for (const score of scores) {
        await ctx.db.delete(score._id);
        deletedTeamScores += 1;
      }
    }

    const favorites = await ctx.db
      .query("fantasyPlayerFavorites")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    const pushTokens = await ctx.db
      .query("pushNotificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const pushToken of pushTokens) {
      await ctx.db.delete(pushToken._id);
    }

    const notifications = await ctx.db
      .query("userNotifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    const feedbackItems = await ctx.db
      .query("userFeedback")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const feedbackItem of feedbackItems) {
      await ctx.db.delete(feedbackItem._id);
    }

    const remainingDeductions = await ctx.db
      .query("fantasyPointDeductions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const deduction of remainingDeductions) {
      await ctx.db.delete(deduction._id);
      deletedPointDeductions += 1;
    }

    const remainingTransfers = await ctx.db
      .query("fantasyTransfers")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const transfer of remainingTransfers) {
      await ctx.db.delete(transfer._id);
      deletedTransfers += 1;
    }

    for (const fantasyTeam of fantasyTeams) {
      await ctx.db.delete(fantasyTeam._id);
    }

    await ctx.db.delete(user._id);

    return {
      deleted: true,
      favorites: favorites.length,
      feedback: feedbackItems.length,
      gameweekSquadPicks: deletedGameweekSquadPicks,
      pointDeductions: deletedPointDeductions,
      pushTokens: pushTokens.length,
      notifications: notifications.length,
      squadPicks: deletedSquadPicks,
      teamScores: deletedTeamScores,
      teams: fantasyTeams.length,
      transfers: deletedTransfers,
    };
  },
});
