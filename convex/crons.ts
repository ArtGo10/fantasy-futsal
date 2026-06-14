import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync live match statuses",
  { minutes: 1 },
  internal.matches.syncLiveStatusesInternal,
);

export default crons;
