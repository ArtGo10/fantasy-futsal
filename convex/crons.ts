import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync live match statuses",
  { minutes: 1 },
  internal.matches.syncLiveStatusesInternal,
);

crons.interval(
  "sync match results from ESPN",
  { hours: 1 },
  internal.matches.syncFromEspnInternal,
);

export default crons;
