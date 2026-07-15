import { useClerk, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { POTS, TOURNAMENT_LAST_DAY } from "../../constants";
import { useCurrentUserBootstrap } from "../../hooks/useCurrentUserBootstrap";
import { useDrawUnlockTicker } from "../../hooks/useDrawUnlockTicker";
import { useMatchLiveStatusSync } from "../../hooks/useMatchLiveStatusSync";
import { styles } from "../../styles";
import type {
  DashboardTab,
  DashboardView,
  MatchView,
  Pot,
  ProductTournamentTab,
  SyncStatusView,
  TeamStatusView,
  TennisTournamentSlug,
} from "../../types";
import { getErrorMessage, getMetadataDisplayName } from "../../utils/auth";
import { formatDrawCountdown, formatDrawUnlockTime, getLocalDayStart, isSameLocalDay } from "../../utils/dates";
import { formatParticipantName, formatPersonName, formatTeamName } from "../../utils/names";
import { getParticipantTotalPoints, getTeamPointDetailsById, getTeamPointsById } from "../../utils/scoring";
import { areAllScheduledMatchesCompleted } from "../../utils/standings";
import { AdminPanel } from "../admin/AdminPanel";
import { LoadingBlock } from "../common/LoadingBlock";
import { TennisTournamentHome } from "../tennis/TennisTournamentHome";
import { DrawSetupPanel } from "./DrawSetupPanel";
import { PlayersTable } from "./PlayersTable";
import { PointsPanel } from "./PointsPanel";
import { SchedulePanel } from "./SchedulePanel";
import { TabBar } from "./TabBar";
import { TeamsDrawPanel } from "./TeamsDrawPanel";

export function SignedInHome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const drawTeam = useMutation(api.draw.drawTeam);
  const seedTeams = useMutation(api.teams.seedFromCode);
  const syncLiveStatuses = useMutation(api.matches.syncLiveStatuses);
  const dashboard = useQuery(api.draw.getDashboard) as DashboardView | undefined;
  const matches = useQuery(api.matches.list) as MatchView[] | undefined;
  const syncStatus = useQuery(api.matches.syncStatus) as SyncStatusView | undefined;

  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeTournamentTab, setActiveTournamentTab] = useState<ProductTournamentTab>("world_cup_2026");
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("table");
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(() => getLocalDayStart(Date.now()));

  const rawProfileName =
    user?.fullName ?? getMetadataDisplayName(user?.unsafeMetadata) ?? user?.username ?? undefined;
  const profileName = rawProfileName ? formatPersonName(rawProfileName) : undefined;
  const profileEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;
  const clearError = useCallback(() => setErrorText(null), []);
  const setAsyncError = useCallback((message: string) => setErrorText(message), []);
  const profileReady = useCurrentUserBootstrap({
    onError: setAsyncError,
    onStart: clearError,
    profileEmail,
    profileName,
    upsertCurrentUser,
    userId: user?.id,
  });

  const currentAssignments = dashboard?.currentUser?.assignments ?? [];
  const currentUserIsAdmin = Boolean(dashboard?.currentUser?.isAdmin);
  const tournamentTabs = useMemo<Array<{ id: ProductTournamentTab; label: string }>>(
    () => [
      { id: "world_cup_2026", label: "World Cup 2026" },
      { id: "wimbledon_atp_2026", label: "Wimbledon ATP" },
      { id: "wimbledon_wta_2026", label: "Wimbledon WTA" },
    ],
    [],
  );
  const dashboardTabs = useMemo<Array<{ id: DashboardTab; label: string }>>(
    () => [
      ...(currentUserIsAdmin ? [{ id: "admin" as const, label: "Админ" }] : []),
      { id: "table" as const, label: "Таблица" },
      { id: "points" as const, label: "Очки" },
      { id: "schedule" as const, label: "Расписание" },
    ],
    [currentUserIsAdmin],
  );
  const isViewer = Boolean(dashboard?.currentUser && !dashboard.currentUser.isParticipant);
  const hasRemainingTeams = dashboard?.teamsByPot.some((pot) => pot.remaining > 0) ?? false;
  const remainingTeamCount =
    dashboard?.teamsByPot.reduce((total, pot) => total + pot.remaining, 0) ?? 0;
  const maxUserAssignments = dashboard?.teamsByPot.length ?? POTS.length;
  const drawUnlockAt = dashboard?.drawUnlockAt ?? null;
  const drawIsLocked = dashboard?.drawLocked ?? true;
  const nowMs = useDrawUnlockTicker(drawUnlockAt);
  const drawCountdownText = drawUnlockAt && drawIsLocked ? formatDrawCountdown(drawUnlockAt, nowMs) : "Пауза";
  const drawLockText = drawUnlockAt
    ? `Жеребьёвка откроется ${formatDrawUnlockTime(drawUnlockAt)}. Ждём регистрацию новых игроков.`
    : "Выбор команд временно закрыт. Ждём регистрацию новых игроков.";
  const activeTournamentTitle =
    activeTournamentTab === "world_cup_2026"
      ? "Чемпионат мира 2026"
      : activeTournamentTab === "wimbledon_atp_2026"
        ? "Wimbledon ATP"
        : "Wimbledon WTA";
  const showDrawSetupPanel = dashboard ? !dashboard.teamsReady || hasRemainingTeams : false;
  const firstScheduleDay = useMemo(() => {
    if (!matches?.length) return null;

    return getLocalDayStart(Math.min(...matches.map((match) => match.scheduledAt)));
  }, [matches]);
  const selectedScheduleMatches = useMemo(
    () =>
      (matches ?? [])
        .filter((match) => isSameLocalDay(match.scheduledAt, selectedScheduleDay))
        .sort((first, second) => first.scheduledAt - second.scheduledAt),
    [matches, selectedScheduleDay],
  );
  const selectedScheduleIsToday = isSameLocalDay(selectedScheduleDay, nowMs);
  const canGoToPreviousScheduleDay = firstScheduleDay === null || selectedScheduleDay > firstScheduleDay;
  const canGoToNextScheduleDay = selectedScheduleDay < TOURNAMENT_LAST_DAY;
  const pointsByTeamId = useMemo(() => getTeamPointsById(matches ?? []), [matches]);
  const worldCupTournamentIsComplete = useMemo(
    () => areAllScheduledMatchesCompleted(matches ?? []),
    [matches],
  );
  const detailsByTeamId = useMemo(
    () => getTeamPointDetailsById(matches ?? [], dashboard?.participants ?? []),
    [dashboard?.participants, matches],
  );
  const teamOwnersById = useMemo(() => {
    const owners = new Map<string, string>();

    for (const participant of dashboard?.participants ?? []) {
      for (const assignment of participant.assignments) {
        owners.set(assignment.teamId, formatParticipantName(participant.name));
      }
    }

    return owners;
  }, [dashboard?.participants]);
  const teamStatusById = useMemo(() => {
    const statuses = new Map<string, TeamStatusView>();

    for (const pot of dashboard?.teamsByPot ?? []) {
      for (const team of pot.teams) {
        statuses.set(team.id, { isEliminated: team.isEliminated });
      }
    }

    return statuses;
  }, [dashboard?.teamsByPot]);
  const sortedParticipants = useMemo(() => {
    return [...(dashboard?.participants ?? [])].sort((first, second) => {
      const pointsDiff =
        getParticipantTotalPoints(second, pointsByTeamId) - getParticipantTotalPoints(first, pointsByTeamId);
      if (pointsDiff !== 0) return pointsDiff;
      return first.participantNumber - second.participantNumber;
    });
  }, [dashboard?.participants, pointsByTeamId]);

  useEffect(() => {
    if (activeDashboardTab === "admin" && !currentUserIsAdmin) {
      setActiveDashboardTab("table");
    }
  }, [activeDashboardTab, currentUserIsAdmin]);

  useEffect(() => {
    let boundedScheduleDay = selectedScheduleDay;

    if (firstScheduleDay !== null && boundedScheduleDay < firstScheduleDay) {
      boundedScheduleDay = firstScheduleDay;
    }

    if (boundedScheduleDay > TOURNAMENT_LAST_DAY) {
      boundedScheduleDay = TOURNAMENT_LAST_DAY;
    }

    if (boundedScheduleDay !== selectedScheduleDay) {
      setSelectedScheduleDay(boundedScheduleDay);
    }
  }, [firstScheduleDay, selectedScheduleDay]);

  useMatchLiveStatusSync({
    matches,
    onError: setAsyncError,
    syncLiveStatuses,
  });

  const handleDraw = async (pot: Pot) => {
    if (drawIsLocked) {
      setErrorText(drawUnlockAt ? `Жеребьёвка откроется ${formatDrawUnlockTime(drawUnlockAt)}.` : "Выбор команд временно закрыт.");
      return;
    }

    const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot);
    if (
      alreadyDrawn ||
      !dashboard?.currentUser?.isParticipant ||
      !dashboard.teamsReady ||
      isBusy
    ) {
      return;
    }

    try {
      setIsBusy(true);
      setErrorText(null);
      setStatusText(null);
      const result = await drawTeam({ pot });

      if (result.team) {
        setStatusText(`Выпала команда: ${formatTeamName(result.team.name)}`);
      } else if (result.complete) {
        setStatusText("Все команды уже разобраны.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSeedTeams = async () => {
    try {
      setIsBusy(true);
      setErrorText(null);
      setStatusText(null);
      const result = await seedTeams({});
      setStatusText(result.alreadySeeded ? "Команды уже загружены." : `Загружено команд: ${result.inserted}.`);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{activeTournamentTitle}</Text>
          <Text style={styles.mutedText}>{profileEmail ?? "Вы вошли"}</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Выйти</Text>
        </Pressable>
      </View>

      {!profileReady ? (
        <LoadingBlock text="Готовим данные..." />
      ) : (
        <>
          <TabBar activeTab={activeTournamentTab} tabs={tournamentTabs} onChange={setActiveTournamentTab} />

          {activeTournamentTab === "world_cup_2026" ? (
            dashboard === undefined ? (
              <LoadingBlock text="Готовим данные..." />
            ) : (
              <>
                <TabBar activeTab={activeDashboardTab} tabs={dashboardTabs} onChange={setActiveDashboardTab} />

                {activeDashboardTab === "admin" && currentUserIsAdmin ? <AdminPanel syncStatus={syncStatus} /> : null}

                {activeDashboardTab === "table" && showDrawSetupPanel ? (
                  <DrawSetupPanel
                    currentAssignments={currentAssignments}
                    dashboard={dashboard}
                    drawIsLocked={drawIsLocked}
                    drawLockText={drawLockText}
                    errorText={errorText}
                    isBusy={isBusy}
                    isViewer={isViewer}
                    maxUserAssignments={maxUserAssignments}
                    onSeedTeams={() => void handleSeedTeams()}
                    remainingTeamCount={remainingTeamCount}
                    statusText={statusText}
                  />
                ) : null}

                {activeDashboardTab === "table" ? (
                  <PlayersTable
                    participants={sortedParticipants}
                    pointsByTeamId={pointsByTeamId}
                    tournamentIsComplete={worldCupTournamentIsComplete}
                  />
                ) : null}

                {activeDashboardTab === "points" ? (
                  <PointsPanel participants={sortedParticipants} detailsByTeamId={detailsByTeamId} />
                ) : null}

                {activeDashboardTab === "table" && dashboard.totalTeams > 0 && hasRemainingTeams ? (
                  <TeamsDrawPanel
                    currentAssignments={currentAssignments}
                    dashboard={dashboard}
                    drawCountdownText={drawCountdownText}
                    drawIsLocked={drawIsLocked}
                    isBusy={isBusy}
                    onDraw={(pot) => void handleDraw(pot)}
                  />
                ) : null}

                {activeDashboardTab === "schedule" ? (
                  <SchedulePanel
                    canGoToNextScheduleDay={canGoToNextScheduleDay}
                    canGoToPreviousScheduleDay={canGoToPreviousScheduleDay}
                    firstScheduleDay={firstScheduleDay}
                    matches={matches}
                    onSelectedDayChange={(updater) => setSelectedScheduleDay(updater)}
                    selectedScheduleDay={selectedScheduleDay}
                    selectedScheduleIsToday={selectedScheduleIsToday}
                    selectedScheduleMatches={selectedScheduleMatches}
                    teamOwnersById={teamOwnersById}
                    teamStatusById={teamStatusById}
                  />
                ) : null}
              </>
            )
          ) : (
            <TennisTournamentHome slug={activeTournamentTab as TennisTournamentSlug} />
          )}
        </>
      )}
    </ScrollView>
  );
}
