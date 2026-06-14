import type { MutationCtx, QueryCtx } from "./_generated/server";

declare const process: {
  env: Record<string, string | undefined>;
};

type AppUser = {
  _id: string;
  clerkId: string;
  email?: string;
  participantNumber?: number;
};

function getEnvList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  user: AppUser | null,
) {
  const adminEmails = getEnvList("ADMIN_EMAILS");
  const adminClerkIds = getEnvList("ADMIN_CLERK_IDS");
  const identityEmail = identity.email?.trim().toLowerCase();
  const userEmail = user?.email?.trim().toLowerCase();

  if (adminClerkIds.includes(identity.subject.toLowerCase())) return true;
  if (identityEmail && adminEmails.includes(identityEmail)) return true;
  if (userEmail && adminEmails.includes(userEmail)) return true;

  return user?.participantNumber === 1;
}

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Вы не авторизованы.");
  }

  return identity;
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return { identity, user };
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { identity, user } = await getCurrentUser(ctx);

  if (!isAdminUser(identity, user)) {
    throw new Error("Это действие доступно только администратору.");
  }

  return { identity, user };
}
