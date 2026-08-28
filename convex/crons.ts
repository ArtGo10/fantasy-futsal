import { cronJobs, makeFunctionReference, type FunctionReference } from "convex/server";

const crons = cronJobs();

const sendDeadlineRemindersInternal = makeFunctionReference<
  "action",
  Record<string, never>,
  { created: number; reminders: number; sent: number; updated: number }
>("notifications:sendDeadlineRemindersInternal") as unknown as FunctionReference<
  "action",
  "internal",
  Record<string, never>,
  { created: number; reminders: number; sent: number; updated: number }
>;
const processPassedGameweekDeadlinesInternal = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { createdSnapshots: number; grantedTeams: number; processedGameweeks: number }
>(
  "fantasy:processPassedGameweekDeadlines",
) as unknown as FunctionReference<
  "mutation",
  "internal",
  Record<string, never>,
  { createdSnapshots: number; grantedTeams: number; processedGameweeks: number }
>;
const processAccountDeletionCleanupJobsInternal = makeFunctionReference<
  "action",
  Record<string, never>,
  { cleaned: number; failed: number; processed: number; rescheduled: number }
>("users:processAccountDeletionCleanupJobsInternal") as unknown as FunctionReference<
  "action",
  "internal",
  Record<string, never>,
  { cleaned: number; failed: number; processed: number; rescheduled: number }
>;

crons.interval(
  "send deadline push reminders",
  { minutes: 15 },
  sendDeadlineRemindersInternal,
);
crons.interval(
  "process fantasy gameweek deadlines",
  { minutes: 1 },
  processPassedGameweekDeadlinesInternal,
);
crons.interval(
  "cleanup deleted account data",
  { minutes: 15 },
  processAccountDeletionCleanupJobsInternal,
);

export default crons;
