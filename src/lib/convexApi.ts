import type { api as generatedApi } from "../../convex/_generated/api";

type GeneratedApi = typeof generatedApi;

function functionRef<T>(name: string) {
  return name as unknown as T;
}

export const api = {
  fantasy: {
    listClubs:
      functionRef<GeneratedApi["fantasy"]["listClubs"]>("fantasy:listClubs"),
    fixtureDetails: functionRef<GeneratedApi["fantasy"]["fixtureDetails"]>(
      "fantasy:fixtureDetails",
    ),
    listFantasyTeams: functionRef<GeneratedApi["fantasy"]["listFantasyTeams"]>(
      "fantasy:listFantasyTeams",
    ),
    listFixtures: functionRef<GeneratedApi["fantasy"]["listFixtures"]>(
      "fantasy:listFixtures",
    ),
    listGameweeks: functionRef<GeneratedApi["fantasy"]["listGameweeks"]>(
      "fantasy:listGameweeks",
    ),
    listPlayers: functionRef<GeneratedApi["fantasy"]["listPlayers"]>(
      "fantasy:listPlayers",
    ),
    myFavoritePlayerIds: functionRef<
      GeneratedApi["fantasy"]["myFavoritePlayerIds"]
    >("fantasy:myFavoritePlayerIds"),
    myGameweekPointsBreakdown: functionRef<
      GeneratedApi["fantasy"]["myGameweekPointsBreakdown"]
    >("fantasy:myGameweekPointsBreakdown"),
    mySeasonPointsBreakdown: functionRef<
      GeneratedApi["fantasy"]["mySeasonPointsBreakdown"]
    >("fantasy:mySeasonPointsBreakdown"),
    myTeam: functionRef<GeneratedApi["fantasy"]["myTeam"]>("fantasy:myTeam"),
    overview:
      functionRef<GeneratedApi["fantasy"]["overview"]>("fantasy:overview"),
    saveMyTeam:
      functionRef<GeneratedApi["fantasy"]["saveMyTeam"]>("fantasy:saveMyTeam"),
    seasonPlayerStatistics: functionRef<
      GeneratedApi["fantasy"]["seasonPlayerStatistics"]
    >("fantasy:seasonPlayerStatistics"),
    cleanupAccidentalDevSeasonSeed: functionRef<
      GeneratedApi["fantasy"]["cleanupAccidentalDevSeasonSeed"]
    >("fantasy:cleanupAccidentalDevSeasonSeed"),
    completeGameweekAndGrantTransfers: functionRef<
      GeneratedApi["fantasy"]["completeGameweekAndGrantTransfers"]
    >("fantasy:completeGameweekAndGrantTransfers"),
    deleteFixtureEvent: functionRef<
      GeneratedApi["fantasy"]["deleteFixtureEvent"]
    >("fantasy:deleteFixtureEvent"),
    deleteFixtureLineup: functionRef<
      GeneratedApi["fantasy"]["deleteFixtureLineup"]
    >("fantasy:deleteFixtureLineup"),
    lockGameweek: functionRef<GeneratedApi["fantasy"]["lockGameweek"]>(
      "fantasy:lockGameweek",
    ),
    recalculateGameweekScores: functionRef<
      GeneratedApi["fantasy"]["recalculateGameweekScores"]
    >("fantasy:recalculateGameweekScores"),
    resetGameweekSimulation: functionRef<
      GeneratedApi["fantasy"]["resetGameweekSimulation"]
    >("fantasy:resetGameweekSimulation"),
    setFixtureResult: functionRef<GeneratedApi["fantasy"]["setFixtureResult"]>(
      "fantasy:setFixtureResult",
    ),
    syncDefaultScoringRules: functionRef<
      GeneratedApi["fantasy"]["syncDefaultScoringRules"]
    >("fantasy:syncDefaultScoringRules"),
    toggleFavoritePlayer: functionRef<
      GeneratedApi["fantasy"]["toggleFavoritePlayer"]
    >("fantasy:toggleFavoritePlayer"),
    upsertFixtureEvent: functionRef<
      GeneratedApi["fantasy"]["upsertFixtureEvent"]
    >("fantasy:upsertFixtureEvent"),
    upsertFixtureLineup: functionRef<
      GeneratedApi["fantasy"]["upsertFixtureLineup"]
    >("fantasy:upsertFixtureLineup"),
  },
  notifications: {
    sendGameweekResultsReadyPushToAll: functionRef<
      GeneratedApi["notifications"]["sendGameweekResultsReadyPushToAll"]
    >("notifications:sendGameweekResultsReadyPushToAll"),
    sendTestPushToCurrentUser: functionRef<
      GeneratedApi["notifications"]["sendTestPushToCurrentUser"]
    >("notifications:sendTestPushToCurrentUser"),
    upsertExpoPushToken: functionRef<
      GeneratedApi["notifications"]["upsertExpoPushToken"]
    >("notifications:upsertExpoPushToken"),
  },
  users: {
    acceptCurrentUserTerms: functionRef<
      GeneratedApi["users"]["acceptCurrentUserTerms"]
    >("users:acceptCurrentUserTerms"),
    deleteCurrentUserData: functionRef<
      GeneratedApi["users"]["deleteCurrentUserData"]
    >("users:deleteCurrentUserData"),
    listFeedback:
      functionRef<GeneratedApi["users"]["listFeedback"]>("users:listFeedback"),
    me: functionRef<GeneratedApi["users"]["me"]>("users:me"),
    submitFeedback: functionRef<GeneratedApi["users"]["submitFeedback"]>(
      "users:submitFeedback",
    ),
    updateFavoriteFantasyClub: functionRef<
      GeneratedApi["users"]["updateFavoriteFantasyClub"]
    >("users:updateFavoriteFantasyClub"),
    upsertCurrentUser: functionRef<GeneratedApi["users"]["upsertCurrentUser"]>(
      "users:upsertCurrentUser",
    ),
  },
};
