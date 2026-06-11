import { mutation, query } from "./_generated/server";
import { MAX_PARTICIPANTS } from "./validators";
import { getCurrentUser, requireIdentity } from "./authHelpers";
import { v } from "convex/values";

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveName(identity: Awaited<ReturnType<typeof requireIdentity>>, name?: string, email?: string) {
  const normalizedName = normalizeOptional(name);
  if (normalizedName) return normalizedName;

  if (identity.name?.trim()) return identity.name.trim();
  if (identity.nickname?.trim()) return identity.nickname.trim();

  const resolvedEmail = normalizeOptional(email) ?? normalizeOptional(identity.email);
  if (resolvedEmail) return resolvedEmail.split("@")[0] || "Player";

  return `Player ${identity.subject.slice(-6)}`;
}

function toUserView(user: {
  _id: string;
  clerkId: string;
  email?: string;
  name: string;
  participantNumber: number;
  createdAt: number;
}) {
  return {
    id: user._id,
    clerkId: user.clerkId,
    email: user.email ?? null,
    name: user.name,
    participantNumber: user.participantNumber,
    createdAt: user.createdAt,
  };
}

export const upsertCurrentUser = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const users = await ctx.db.query("users").collect();
    const email = normalizeOptional(args.email) ?? normalizeOptional(identity.email);
    const name = resolveName(identity, args.name, email);
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        updatedAt: now,
      });

      return {
        accepted: true as const,
        user: toUserView({ ...existing, email, name }),
        participantCount: users.length,
        maxParticipants: MAX_PARTICIPANTS,
      };
    }

    if (users.length >= MAX_PARTICIPANTS) {
      return {
        accepted: false as const,
        reason: "full" as const,
        user: null,
        participantCount: users.length,
        maxParticipants: MAX_PARTICIPANTS,
      };
    }

    const highestParticipantNumber = users.reduce(
      (highest, user) => Math.max(highest, user.participantNumber),
      0,
    );
    const participantNumber = highestParticipantNumber + 1;
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      participantNumber,
      createdAt: now,
      updatedAt: now,
    });

    return {
      accepted: true as const,
      user: {
        id: userId,
        clerkId: identity.subject,
        email: email ?? null,
        name,
        participantNumber,
        createdAt: now,
      },
      participantCount: users.length + 1,
      maxParticipants: MAX_PARTICIPANTS,
    };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    const participantCount = (await ctx.db.query("users").collect()).length;

    return {
      accepted: Boolean(user),
      user: user ? toUserView(user) : null,
      participantCount,
      maxParticipants: MAX_PARTICIPANTS,
    };
  },
});
