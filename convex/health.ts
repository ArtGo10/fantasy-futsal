import { queryGeneric } from "convex/server";
import { query } from "./_generated/server";

export const ping = queryGeneric({
  args: {},
  handler: async () => {
    return {
      ok: true,
      now: Date.now(),
      service: "convex",
    };
  },
});

export const authStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    return {
      authenticated: Boolean(identity),
      issuer: identity?.issuer ?? null,
      subject: identity?.subject ?? null,
      tokenIdentifier: identity?.tokenIdentifier ?? null,
      email: identity?.email ?? null,
      name: identity?.name ?? null,
    };
  },
});
