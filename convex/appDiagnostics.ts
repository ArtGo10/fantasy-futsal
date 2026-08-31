import { v } from "convex/values";

import { mutation } from "./_generated/server";

const CRASH_REPORT_TEXT_LIMIT = 2200;
const CRASH_REPORT_MESSAGE_LIMIT = 900;
const CRASH_REPORT_NAME_LIMIT = 120;

const crashReportSourceValidator = v.union(
  v.literal("errorBoundary"),
  v.literal("globalError"),
  v.literal("queryError"),
  v.literal("unhandledRejection"),
);

function trimNullableText(
  value: string | null,
  maxLength: number,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
}

export const submitCrashReport = mutation({
  args: {
    report: v.object({
      id: v.string(),
      timestamp: v.number(),
      source: crashReportSourceValidator,
      fatal: v.union(v.boolean(), v.null()),
      message: v.string(),
      name: v.union(v.string(), v.null()),
      stack: v.union(v.string(), v.null()),
      componentStack: v.union(v.string(), v.null()),
      platform: v.string(),
      platformVersion: v.union(v.string(), v.number(), v.null()),
      appVersion: v.union(v.string(), v.null()),
      buildVersion: v.union(v.string(), v.null()),
      runtimeVersion: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const existingReport = await ctx.db
      .query("appCrashReports")
      .withIndex("by_report_id", (q) => q.eq("reportId", args.report.id))
      .first();

    if (existingReport) {
      return { crashReportId: existingReport._id, created: false };
    }

    const identity = await ctx.auth.getUserIdentity();
    const user = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .first()
      : null;
    const now = Date.now();
    const crashReportId = await ctx.db.insert("appCrashReports", {
      reportId: args.report.id,
      userId: user?._id,
      clerkId: identity?.subject,
      source: args.report.source,
      fatal: args.report.fatal,
      message:
        trimNullableText(args.report.message, CRASH_REPORT_MESSAGE_LIMIT) ??
        "Unknown error",
      name: trimNullableText(args.report.name, CRASH_REPORT_NAME_LIMIT),
      stack: trimNullableText(args.report.stack, CRASH_REPORT_TEXT_LIMIT),
      componentStack: trimNullableText(
        args.report.componentStack,
        CRASH_REPORT_TEXT_LIMIT,
      ),
      platform: args.report.platform,
      platformVersion: args.report.platformVersion,
      appVersion: args.report.appVersion,
      buildVersion: args.report.buildVersion,
      runtimeVersion: args.report.runtimeVersion,
      occurredAt: args.report.timestamp,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { crashReportId, created: true };
  },
});
