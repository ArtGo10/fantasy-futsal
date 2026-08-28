import type { api as generatedApi } from "../../convex/_generated/api";

type GeneratedApi = typeof generatedApi;

function functionRef<T>(name: string) {
  return name as unknown as T;
}

export const api = {
  appDiagnostics: {
    submitCrashReport: functionRef<
      GeneratedApi["appDiagnostics"]["submitCrashReport"]
    >("appDiagnostics:submitCrashReport"),
  },
  fantasy: {
    listClubs:
      functionRef<GeneratedApi["fantasy"]["listClubs"]>("fantasy:listClubs"),
    listSeasons: functionRef<GeneratedApi["fantasy"]["listSeasons"]>(
      "fantasy:listSeasons",
    ),
    fixtureDetails: functionRef<GeneratedApi["fantasy"]["fixtureDetails"]>(
      "fantasy:fixtureDetails",
    ),
    listFantasyTeams: functionRef<GeneratedApi["fantasy"]["listFantasyTeams"]>(
      "fantasy:listFantasyTeams",
    ),
    listMyPrivateLeagues: functionRef<
      GeneratedApi["fantasy"]["listMyPrivateLeagues"]
    >("fantasy:listMyPrivateLeagues"),
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
    fantasyTeamGameweekView: functionRef<
      GeneratedApi["fantasy"]["fantasyTeamGameweekView"]
    >("fantasy:fantasyTeamGameweekView"),
    myGameweekPointsBreakdown: functionRef<
      GeneratedApi["fantasy"]["myGameweekPointsBreakdown"]
    >("fantasy:myGameweekPointsBreakdown"),
    mySeasonPointsBreakdown: functionRef<
      GeneratedApi["fantasy"]["mySeasonPointsBreakdown"]
    >("fantasy:mySeasonPointsBreakdown"),
    myTeam: functionRef<GeneratedApi["fantasy"]["myTeam"]>("fantasy:myTeam"),
    overview:
      functionRef<GeneratedApi["fantasy"]["overview"]>("fantasy:overview"),
    playerProfile: functionRef<GeneratedApi["fantasy"]["playerProfile"]>(
      "fantasy:playerProfile",
    ),
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
    createPrivateLeague: functionRef<
      GeneratedApi["fantasy"]["createPrivateLeague"]
    >("fantasy:createPrivateLeague"),
    deletePrivateLeague: functionRef<
      GeneratedApi["fantasy"]["deletePrivateLeague"]
    >("fantasy:deletePrivateLeague"),
    deleteFixtureEvent: functionRef<
      GeneratedApi["fantasy"]["deleteFixtureEvent"]
    >("fantasy:deleteFixtureEvent"),
    deleteFixtureLineup: functionRef<
      GeneratedApi["fantasy"]["deleteFixtureLineup"]
    >("fantasy:deleteFixtureLineup"),
    lockGameweek: functionRef<GeneratedApi["fantasy"]["lockGameweek"]>(
      "fantasy:lockGameweek",
    ),
    joinPrivateLeague: functionRef<
      GeneratedApi["fantasy"]["joinPrivateLeague"]
    >("fantasy:joinPrivateLeague"),
    updatePrivateLeague: functionRef<
      GeneratedApi["fantasy"]["updatePrivateLeague"]
    >("fantasy:updatePrivateLeague"),
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
    currentUserNotificationSummary: functionRef<
      GeneratedApi["notifications"]["currentUserNotificationSummary"]
    >("notifications:currentUserNotificationSummary"),
    listCurrentUserNotifications: functionRef<
      GeneratedApi["notifications"]["listCurrentUserNotifications"]
    >("notifications:listCurrentUserNotifications"),
    markAllCurrentUserNotificationsRead: functionRef<
      GeneratedApi["notifications"]["markAllCurrentUserNotificationsRead"]
    >("notifications:markAllCurrentUserNotificationsRead"),
    markCurrentUserNotificationRead: functionRef<
      GeneratedApi["notifications"]["markCurrentUserNotificationRead"]
    >("notifications:markCurrentUserNotificationRead"),
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
    deleteCurrentUserAccount: functionRef<
      GeneratedApi["users"]["deleteCurrentUserAccount"]
    >("users:deleteCurrentUserAccount"),
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
    setUserRole:
      functionRef<GeneratedApi["users"]["setUserRole"]>("users:setUserRole"),
    upsertCurrentUser: functionRef<GeneratedApi["users"]["upsertCurrentUser"]>(
      "users:upsertCurrentUser",
    ),
  },
};
