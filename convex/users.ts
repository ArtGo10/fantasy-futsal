import { mutation, query } from "./_generated/server";
import { MAX_PARTICIPANTS } from "./validators";
import { getCurrentUser, requireIdentity } from "./authHelpers";
import { v } from "convex/values";

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function capitalizeNamePart(value: string) {
  if (!value) return value;

  const [firstLetter, ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("ru-RU")}${restLetters.join("").toLocaleLowerCase("ru-RU")}`;
}

function formatPersonName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.split(/([-’'])/).map(capitalizeNamePart).join(""))
    .join(" ");
}

function resolveName(identity: Awaited<ReturnType<typeof requireIdentity>>, name?: string, email?: string) {
  const normalizedName = normalizeOptional(name);
  if (normalizedName) return formatPersonName(normalizedName);

  if (identity.name?.trim()) return formatPersonName(identity.name);
  if (identity.nickname?.trim()) return formatPersonName(identity.nickname);

  const resolvedEmail = normalizeOptional(email) ?? normalizeOptional(identity.email);
  if (resolvedEmail) return formatPersonName(resolvedEmail.split("@")[0] || "Игрок");

  return `Игрок ${identity.subject.slice(-6)}`;
}

function toUserView(user: {
  _id: string;
  clerkId: string;
  email?: string;
  name: string;
  participantNumber?: number;
  createdAt: number;
}) {
  return {
    id: user._id,
    clerkId: user.clerkId,
    email: user.email ?? null,
    name: user.name,
    participantNumber: user.participantNumber ?? null,
    isParticipant: user.participantNumber !== undefined,
    createdAt: user.createdAt,
  };
}

function getParticipants(users: Array<{ participantNumber?: number }>) {
  return users.filter((user) => user.participantNumber !== undefined);
}

function getNextParticipantNumber(users: Array<{ participantNumber?: number }>) {
  const participants = getParticipants(users);

  if (participants.length >= MAX_PARTICIPANTS) {
    return undefined;
  }

  return (
    participants.reduce(
      (highest, user) => Math.max(highest, user.participantNumber ?? 0),
      0,
    ) + 1
  );
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
    const participantCount = getParticipants(users).length;
    const email = normalizeOptional(args.email) ?? normalizeOptional(identity.email);
    const name = resolveName(identity, args.name, email);
    const now = Date.now();

    if (existing) {
      const participantNumber = existing.participantNumber ?? getNextParticipantNumber(users);
      await ctx.db.patch(existing._id, {
        email,
        name,
        participantNumber,
        updatedAt: now,
      });

      return {
        accepted: participantNumber !== undefined,
        user: toUserView({ ...existing, email, name, participantNumber }),
        participantCount:
          existing.participantNumber === undefined && participantNumber !== undefined
            ? participantCount + 1
            : participantCount,
        userCount: users.length,
        maxParticipants: MAX_PARTICIPANTS,
      };
    }

    const participantNumber = getNextParticipantNumber(users);
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      participantNumber,
      createdAt: now,
      updatedAt: now,
    });

    return {
      accepted: participantNumber !== undefined,
      user: {
        id: userId,
        clerkId: identity.subject,
        email: email ?? null,
        name,
        participantNumber: participantNumber ?? null,
        isParticipant: participantNumber !== undefined,
        createdAt: now,
      },
      participantCount: participantNumber !== undefined ? participantCount + 1 : participantCount,
      userCount: users.length + 1,
      maxParticipants: MAX_PARTICIPANTS,
    };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    const users = await ctx.db.query("users").collect();
    const participantCount = getParticipants(users).length;

    return {
      accepted: Boolean(user?.participantNumber !== undefined),
      user: user ? toUserView(user) : null,
      participantCount,
      userCount: users.length,
      maxParticipants: MAX_PARTICIPANTS,
    };
  },
});
