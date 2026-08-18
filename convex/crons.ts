import { cronJobs, makeFunctionReference, type FunctionReference } from "convex/server";

const crons = cronJobs();

const sendDeadlineRemindersInternal = makeFunctionReference<"action", Record<string, never>, { reminders: number; sent: number }>(
  "notifications:sendDeadlineRemindersInternal",
) as unknown as FunctionReference<"action", "internal", Record<string, never>, { reminders: number; sent: number }>;
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

crons.interval("send deadline push reminders", { hours: 1 }, sendDeadlineRemindersInternal);
crons.interval("process fantasy gameweek deadlines", { minutes: 1 }, processPassedGameweekDeadlinesInternal);

export default crons;
