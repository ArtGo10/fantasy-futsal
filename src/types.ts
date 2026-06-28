export type AuthMode = "sign_in" | "sign_up";
export type DashboardTab = "admin" | "table" | "points" | "schedule";
export type TennisTournamentSlug = "wimbledon_atp_2026" | "wimbledon_wta_2026";
export type TennisDashboardTab = "admin" | "table" | "points" | "results";
export type ProductTournamentTab = "world_cup_2026" | TennisTournamentSlug;
export type Pot = 1 | 2 | 3;
export type TennisPot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type TeamStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "champion";

export type MatchStage = Exclude<TeamStage, "champion"> | "third_place";
export type MatchDecision = "regular" | "extra_time" | "penalties";
export type TennisStage =
  | "round_of_128"
  | "round_of_64"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "champion";

export type ClerkEmailCodeSecondFactor = {
  strategy?: string;
};

export type ClerkSignInAttempt = {
  status?: string | null;
  createdSessionId?: string | null;
  supportedSecondFactors?: ClerkEmailCodeSecondFactor[] | null;
  prepareSecondFactor?: (params: { strategy: "email_code" }) => Promise<unknown>;
  attemptSecondFactor?: (params: { strategy: "email_code"; code: string }) => Promise<ClerkSignInAttempt>;
};

export type AssignmentView = {
  id: string;
  pot: Pot;
  teamId: string;
  teamName: string;
  stageReached: TeamStage;
  isEliminated: boolean;
  createdAt: number;
};

export type ParticipantView = {
  id: string;
  name: string;
  email: string | null;
  participantNumber: number;
  assignments: AssignmentView[];
  isCurrentUser: boolean;
};

export type PotTeamView = {
  id: string;
  name: string;
  pot: Pot;
  stageReached: TeamStage;
  isEliminated: boolean;
  assignedTo: null | {
    id: string;
    name: string;
    participantNumber: number | null;
  };
};

export type PotView = {
  pot: Pot;
  label: string;
  total: number;
  assigned: number;
  remaining: number;
  teams: PotTeamView[];
};

export type DashboardView = {
  currentUser: null | {
    id: string;
    name: string;
    email: string | null;
    participantNumber: number | null;
    isParticipant: boolean;
    isAdmin: boolean;
    assignments: AssignmentView[];
  };
  participants: ParticipantView[];
  participantCount: number;
  userCount: number;
  spectatorCount: number;
  maxParticipants: number;
  isFull: boolean;
  totalTeams: number;
  teamsReady: boolean;
  drawLocked: boolean;
  drawUnlockAt: number | null;
  teamsByPot: PotView[];
};

export type MatchView = {
  id: string;
  externalId: string;
  matchNumber: number;
  stage: MatchStage;
  group: string | null;
  scheduledAt: number;
  sourceKickoff: string;
  homeTeam: {
    id: string | null;
    name: string;
    slotName: string | null;
  };
  awayTeam: {
    id: string | null;
    name: string;
    slotName: string | null;
  };
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  decidedBy: MatchDecision | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status: "scheduled" | "live" | "completed";
  storedStatus?: "scheduled" | "live" | "completed";
  apiFootballFixtureId?: number | null;
  apiFootballStatus?: string | null;
  apiFootballUpdatedAt?: number | null;
  espnEventId?: string | null;
  espnStatus?: string | null;
  espnUpdatedAt?: number | null;
  venue: string | null;
};

export type SyncStatusView = {
  latest: null | {
    id: string;
    provider: string;
    ok: boolean;
    dateParam: string | null;
    fetched: number | null;
    normalized: number | null;
    matched: number | null;
    updated: number | null;
    completed: number | null;
    live: number | null;
    scheduled: number | null;
    unmatched: number | null;
    error: string | null;
    createdAt: number;
  };
  matches: {
    total: number;
    scheduled: number;
    live: number;
    completed: number;
  };
};

export type TennisCompetitorView = {
  id: string;
  name: string;
  originalName: string;
  country: string | null;
  seed: number | null;
  ranking: number | null;
  rankingPoints: number | null;
  pot: number | null;
  stageReached: TennisStage;
  points: number;
  isEliminated: boolean;
  sortOrder: number;
};

export type TennisAssignmentView = {
  id: string;
  pot: TennisPot;
  competitorId: string;
  competitorName: string;
  stageReached: TennisStage;
  points: number;
  isEliminated: boolean;
  createdAt: number;
};

export type TennisParticipantView = {
  id: string;
  name: string;
  email: string | null;
  participantNumber: number;
  assignments: TennisAssignmentView[];
  isCurrentUser: boolean;
};

export type TennisPotCompetitorView = TennisCompetitorView & {
  pot: TennisPot;
  assignedTo: null | {
    id: string;
    name: string;
    participantNumber: number | null;
  };
};

export type TennisPotView = {
  pot: TennisPot;
  label: string;
  total: number;
  assigned: number;
  remaining: number;
  competitors: TennisPotCompetitorView[];
};

export type TennisScoringRuleView = {
  stage: TennisStage;
  label: string;
  points: number;
  increment: number;
};

export type TennisMatchView = {
  id: string;
  espnCompetitionId: string;
  roundName: string;
  roundOrder: number;
  bracketOrder: number | null;
  scheduledAt: number;
  court: string | null;
  player1CompetitorId: string | null;
  player2CompetitorId: string | null;
  player1Name: string;
  player2Name: string;
  player1SetScores: number[];
  player2SetScores: number[];
  winnerCompetitorId: string | null;
  status: "scheduled" | "live" | "completed";
  note: string | null;
};

export type TennisOverviewView = {
  tournament: {
    id?: string;
    slug: TennisTournamentSlug;
    title: string;
    tour: "atp" | "wta";
    providerEventId: string;
    groupingSlug: string;
    year: number;
    drawLocked?: boolean;
    drawUnlockAt?: number | null;
  };
  currentUser: null | {
    id: string;
    name: string;
    email: string | null;
    participantNumber: number | null;
    isParticipant: boolean;
    isAdmin: boolean;
    assignments: TennisAssignmentView[];
  };
  seeded: boolean;
  participants: TennisParticipantView[];
  participantCount: number;
  maxParticipants: number;
  isFull: boolean;
  competitorsReady: boolean;
  competitorsByPot: TennisPotView[];
  scoring: {
    version: string;
    description: string;
    rules: TennisScoringRuleView[];
  };
  competitors: TennisCompetitorView[];
  matches: TennisMatchView[];
  latestSync: null | {
    ok: boolean;
    provider: string;
    fetchedCompetitors: number | null;
    fetchedMatches: number | null;
    updatedCompetitors: number | null;
    updatedMatches: number | null;
    error: string | null;
    createdAt: number;
  };
  stats: {
    participants: number;
    competitors: number;
    matches: number;
    completedMatches: number;
    liveMatches: number;
    scheduledMatches: number;
  };
};

export type TeamPointDetails = {
  matchPoints: number;
  stageBonus: number;
  specialBonus: number;
  total: number;
  lines: string[];
};

export type TeamStatusView = {
  isEliminated: boolean;
};
