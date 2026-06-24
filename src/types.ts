export type AuthMode = "sign_in" | "sign_up";
export type DashboardTab = "admin" | "table" | "points" | "schedule";
export type Pot = 1 | 2 | 3;

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
