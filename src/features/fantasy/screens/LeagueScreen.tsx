import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Cog,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import type { Id } from "../../../../convex/_generated/dataModel";
import { LoadingBlock } from "../../../components/common/LoadingBlock";
import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import type { TranslationKey } from "../../../i18n/translations";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { BottomSheet } from "../components/BottomSheet";
import { DesktopSelect } from "../components/DesktopSelect";
import { FilterSelectButton, FilterSelectMenu } from "../components/FilterSelect";
import { FilterResetButton } from "../components/FilterResetButton";
import { GameweekTeamViewer } from "../components/GameweekTeamViewer";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

const TOTAL_LEAGUE_SCOPE_ID = "total";
const GLOBAL_LEAGUE_FILTER_ID = "global";
type LeagueScopeId = typeof TOTAL_LEAGUE_SCOPE_ID | Id<"fantasyGameweeks">;
type LeagueFilterId =
  | typeof GLOBAL_LEAGUE_FILTER_ID
  | Id<"fantasyPrivateLeagues">;

type FantasyLeagueTeam = {
  gameweekScores?: Array<{
    gameweekId: string;
    gameweekNumber: number;
    participated: boolean;
    points: number;
    totalPointsAfterGameweek?: number | null;
  }>;
  id: string;
  managerName: string | null;
  name: string;
  totalPoints?: number | null;
};

type FantasyLeagueGameweek = {
  id: Id<"fantasyGameweeks">;
  name: string;
  number: number;
  status: string;
};

type FantasyPrivateLeague = {
  id: string;
  inviteCode: string;
  isOwner: boolean;
  memberCount: number;
  memberTeamIds: string[];
  name: string;
  ownerUserId: string;
};

type FantasyClub = {
  id: string;
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName: string | null;
};

const LANGUAGE_LOCALES = {
  en: "en-US",
  pl: "pl-PL",
  uk: "uk-UA",
} as const;

function normalizeLeagueMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getTeamGameweekPoints(
  team: FantasyLeagueTeam,
  gameweekId: string | null,
) {
  if (!gameweekId) return normalizeLeagueMetric(team.totalPoints);

  const score = team.gameweekScores?.find(
    (item) => item.gameweekId === gameweekId,
  );
  return score?.participated ? normalizeLeagueMetric(score.points) : 0;
}

function getFormattedLeagueMetric(
  value: number | null | undefined,
  language: keyof typeof LANGUAGE_LOCALES,
) {
  const normalizedValue = normalizeLeagueMetric(value);

  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
    maximumFractionDigits: 1,
    minimumFractionDigits: !Number.isInteger(normalizedValue) ? 1 : 0,
  }).format(normalizedValue);
}

function getRawErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong.";
  const uncaughtMatch = rawMessage.match(
    /Uncaught Error:\s*([\s\S]*?)(?:\s+at\s|\s+Called by client|$)/,
  );
  if (uncaughtMatch?.[1]) return uncaughtMatch[1].trim();
  const serverMatch = rawMessage.match(
    /Server Error\s*([\s\S]*?)(?:\s+Called by client|$)/,
  );
  if (serverMatch?.[1]) return serverMatch[1].trim();
  return rawMessage.trim();
}

function getLeagueActionErrorMessage(
  error: unknown,
  t: (key: TranslationKey) => string,
) {
  const message = getRawErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("fantasy-команд") ||
    normalized.includes("fantasy team")
  ) {
    return t("league.error.teamRequired");
  }
  if (
    normalized.includes("таким кодом") ||
    normalized.includes("such code") ||
    normalized.includes("invite code was not found")
  ) {
    return t("league.error.inviteNotFound");
  }
  if (
    normalized.includes("код запрошення") ||
    normalized.includes("invite code")
  ) {
    return t("league.error.inviteRequired");
  }

  if (message) return message;
  return "Something went wrong.";
}

export function LeagueScreen({
  canQueryPrivateData = true,
  clubs,
  currentFantasyTeamId,
  gameweeks,
  onBottomTabsHiddenChange,
  onShellHeaderHiddenChange,
  privateLeagues,
  seasonSlug,
  teams,
}: {
  canQueryPrivateData?: boolean;
  clubs: FantasyClub[] | undefined;
  currentFantasyTeamId?: Id<"fantasyTeams"> | null;
  gameweeks: FantasyLeagueGameweek[] | undefined;
  isAdmin?: boolean;
  onBottomTabsHiddenChange?: (isHidden: boolean) => void;
  onShellHeaderHiddenChange?: (isHidden: boolean) => void;
  privateLeagues: FantasyPrivateLeague[] | undefined;
  seasonSlug?: string | null;
  teams: FantasyLeagueTeam[] | undefined;
}) {
  const { language, t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const themedBackButtonStyle = [
    styles.teamWorkspaceBackButton,
    { backgroundColor: fantasyTheme.softColor },
  ];
  const themedPrimaryButtonStyle = [
    styles.primaryButton,
    { backgroundColor: fantasyTheme.primaryColor },
  ];
  const themedSecondaryButtonStyle = [
    styles.secondaryButton,
    { borderColor: fantasyTheme.borderColor },
  ];
  const themedSecondaryButtonTextStyle = [
    styles.secondaryButtonText,
    { color: fantasyTheme.primaryColor },
  ];
  const [leagueScopeId, setLeagueScopeId] = useState<LeagueScopeId>(
    TOTAL_LEAGUE_SCOPE_ID,
  );
  const [leagueFilterId, setLeagueFilterId] = useState<LeagueFilterId>(
    GLOBAL_LEAGUE_FILTER_ID,
  );
  const filtersDirty =
    leagueScopeId !== TOTAL_LEAGUE_SCOPE_ID ||
    leagueFilterId !== GLOBAL_LEAGUE_FILTER_ID;

  function resetFilters() {
    setLeagueScopeId(TOTAL_LEAGUE_SCOPE_ID);
    setLeagueFilterId(GLOBAL_LEAGUE_FILTER_ID);
    setLeaguePickerOpen(false);
    setModePickerOpen(false);
  }
  const [createLeagueName, setCreateLeagueName] = useState("");
  const [joinLeagueCode, setJoinLeagueCode] = useState("");
  const [createLeagueError, setCreateLeagueError] = useState<string | null>(
    null,
  );
  const [joinLeagueError, setJoinLeagueError] = useState<string | null>(
    null,
  );
  const [leagueActionSuccess, setLeagueActionSuccess] = useState<string | null>(
    null,
  );
  const [leagueActionBusy, setLeagueActionBusy] = useState<
    "create" | "delete" | "join" | "update" | null
  >(null);
  const [isJoinLeagueOpen, setJoinLeagueOpen] = useState(false);
  const [isLeagueManagerOpen, setLeagueManagerOpen] = useState(false);
  const [isLeaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [isModePickerOpen, setModePickerOpen] = useState(false);
  const [editingPrivateLeague, setEditingPrivateLeague] =
    useState<FantasyPrivateLeague | null>(null);
  const [editLeagueName, setEditLeagueName] = useState("");
  const [editLeagueError, setEditLeagueError] = useState<string | null>(null);
  const [removedLeagueTeamIds, setRemovedLeagueTeamIds] = useState<
    Id<"fantasyTeams">[]
  >([]);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    privateLeagueId: Id<"fantasyPrivateLeagues">;
    team: FantasyLeagueTeam;
  } | null>(null);
  const [deletePrivateLeagueTarget, setDeletePrivateLeagueTarget] =
    useState<FantasyPrivateLeague | null>(null);
  const [deleteLeagueError, setDeleteLeagueError] = useState<string | null>(
    null,
  );
  const [selectedTeamId, setSelectedTeamId] =
    useState<Id<"fantasyTeams"> | null>(null);
  const createPrivateLeague = useMutation(api.fantasy.createPrivateLeague);
  const deletePrivateLeague = useMutation(api.fantasy.deletePrivateLeague);
  const joinPrivateLeague = useMutation(api.fantasy.joinPrivateLeague);
  const updatePrivateLeague = useMutation(api.fantasy.updatePrivateLeague);
  const selectedGameweekId =
    leagueScopeId === TOTAL_LEAGUE_SCOPE_ID ? null : leagueScopeId;
  const selectedScopeGameweek =
    leagueScopeId === TOTAL_LEAGUE_SCOPE_ID
      ? null
      : (gameweeks ?? []).find((gameweek) => gameweek.id === leagueScopeId) ??
        null;
  const tableGameweek = useMemo(() => {
    if (selectedScopeGameweek) return selectedScopeGameweek;

    const sortedGameweeks = [...(gameweeks ?? [])].sort(
      (a, b) => a.number - b.number,
    );
    const latestCompletedGameweek =
      [...sortedGameweeks]
        .reverse()
        .find((gameweek) => gameweek.status === "completed") ?? null;

    return (
      sortedGameweeks.find((gameweek) => gameweek.status === "live") ??
      latestCompletedGameweek ??
      sortedGameweeks[0] ??
      null
    );
  }, [gameweeks, selectedScopeGameweek]);
  const tableGameweekId = tableGameweek?.id ?? null;
  const viewerGameweekId = selectedGameweekId ?? tableGameweekId;
  const tableGameweekLabel = tableGameweek
    ? t("team.dashboard.gameweekLabel").replace(
        "{number}",
        String(tableGameweek.number),
      )
    : t("team.dashboard.gameweekLabel").replace("{number}", "1");
  const selectedPrivateLeague =
    leagueFilterId === GLOBAL_LEAGUE_FILTER_ID
      ? null
      : (privateLeagues ?? []).find((league) => league.id === leagueFilterId) ??
        null;
  const ownedPrivateLeagues = useMemo(
    () => (privateLeagues ?? []).filter((league) => league.isOwner),
    [privateLeagues],
  );
  const currentEditingLeague = (privateLeagues ?? []).find(
    (league) => league.id === editingPrivateLeague?.id,
  );
  const editingLeagueMembers = useMemo(() => {
    const memberIds = new Set(currentEditingLeague?.memberTeamIds ?? []);
    for (const teamId of removedLeagueTeamIds) memberIds.delete(teamId);
    return (teams ?? [])
      .filter((team) => memberIds.has(team.id))
      .sort(
        (a, b) =>
          Number(b.id === currentFantasyTeamId) -
            Number(a.id === currentFantasyTeamId) ||
          a.name.localeCompare(b.name),
      );
  }, [currentEditingLeague, currentFantasyTeamId, removedLeagueTeamIds, teams]);
  const isNestedLeagueViewOpen = Boolean(selectedTeamId) || isLeagueManagerOpen;

  useDismissKeyboardOnChange([
    leagueScopeId,
    leagueFilterId,
    isModePickerOpen,
    isLeaguePickerOpen,
    isJoinLeagueOpen,
    isLeagueManagerOpen,
    editingPrivateLeague,
    removeMemberTarget,
    deletePrivateLeagueTarget,
    selectedTeamId,
  ]);
  useEffect(() => {
    onShellHeaderHiddenChange?.(isNestedLeagueViewOpen);
    return () => onShellHeaderHiddenChange?.(false);
  }, [isNestedLeagueViewOpen, onShellHeaderHiddenChange]);
  useEffect(() => {
    onBottomTabsHiddenChange?.(isNestedLeagueViewOpen);
    return () => onBottomTabsHiddenChange?.(false);
  }, [isNestedLeagueViewOpen, onBottomTabsHiddenChange]);
  useEffect(() => {
    if (!isLeagueManagerOpen) return undefined;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setLeagueManagerOpen(false);
        return true;
      },
    );

    return () => subscription.remove();
  }, [isLeagueManagerOpen]);
  const isLoading = teams === undefined;
  const selectableGameweeks = useMemo(
    () =>
      [...(gameweeks ?? [])]
        .filter(
          (gameweek) =>
            gameweek.status === "live" || gameweek.status === "completed",
        )
        .sort((a, b) => a.number - b.number),
    [gameweeks],
  );
  const leagueScopeOptions = useMemo(
    () => [
      {
        label: t("league.mode.total"),
        value: TOTAL_LEAGUE_SCOPE_ID,
      },
      ...selectableGameweeks.map((gameweek) => ({
        label: t("team.dashboard.gameweekLabel").replace(
          "{number}",
          String(gameweek.number),
        ),
        value: gameweek.id,
      })),
    ],
    [selectableGameweeks, t],
  );
  const leagueFilterOptions = useMemo(
    () => [
      {
        label: t("league.scope.global"),
        value: GLOBAL_LEAGUE_FILTER_ID,
      },
      ...(privateLeagues ?? []).map((league) => ({
        label: league.name,
        value: league.id,
      })),
    ],
    [privateLeagues, t],
  );
  const selectedScopeLabel =
    leagueScopeOptions.find((option) => option.value === leagueScopeId)
      ?.label ?? t("league.mode.total");
  const selectedLeagueLabel =
    leagueFilterOptions.find((option) => option.value === leagueFilterId)
      ?.label ?? t("league.scope.global");
  const visibleTeams = useMemo(() => {
    if (!selectedPrivateLeague) return teams ?? [];

    const memberTeamIds = new Set(selectedPrivateLeague.memberTeamIds);
    return (teams ?? []).filter((team) => memberTeamIds.has(team.id));
  }, [selectedPrivateLeague, teams]);
  const sortedTeams = useMemo(
    () =>
      [...visibleTeams].sort(
        (a, b) =>
          getTeamGameweekPoints(b, selectedGameweekId) -
            getTeamGameweekPoints(a, selectedGameweekId) ||
          normalizeLeagueMetric(b.totalPoints) -
            normalizeLeagueMetric(a.totalPoints) ||
          a.name.localeCompare(b.name),
      ),
    [selectedGameweekId, visibleTeams],
  );
  const selectedViewerLeader = useMemo(
    () =>
      [...visibleTeams].sort(
        (a, b) =>
          getTeamGameweekPoints(b, viewerGameweekId) -
            getTeamGameweekPoints(a, viewerGameweekId) ||
          normalizeLeagueMetric(b.totalPoints) -
            normalizeLeagueMetric(a.totalPoints) ||
          a.name.localeCompare(b.name),
      )[0] ?? null,
    [viewerGameweekId, visibleTeams],
  );
  const rankedTeams = useMemo(() => {
    let previousScore: number | null = null;
    let previousRank = 0;

    return sortedTeams.map((team, index) => {
      const rankingScore = getTeamGameweekPoints(team, selectedGameweekId);
      const rank =
        previousScore !== null && rankingScore === previousScore
          ? previousRank
          : index + 1;
      previousScore = rankingScore;
      previousRank = rank;

      return {
        gameweekPoints: getTeamGameweekPoints(team, tableGameweekId),
        rank,
        team,
        totalPoints: normalizeLeagueMetric(team.totalPoints),
      };
    });
  }, [selectedGameweekId, sortedTeams, tableGameweekId]);
  const canOpenTeam = (teamId: string) => Boolean(teamId);
  const openTeam = (teamId: Id<"fantasyTeams">) => {
    if (!canOpenTeam(teamId)) return;
    setSelectedTeamId(teamId);
  };

  const handleCreatePrivateLeague = async () => {
    setCreateLeagueError(null);
    setJoinLeagueError(null);
    setEditLeagueError(null);
    setDeleteLeagueError(null);
    setLeagueActionSuccess(null);
    setLeagueActionBusy("create");
    try {
      const mutationArgs = seasonSlug
        ? { name: createLeagueName, seasonSlug }
        : { name: createLeagueName };
      const result = await createPrivateLeague(mutationArgs);
      setLeagueFilterId(result.id as Id<"fantasyPrivateLeagues">);
      setCreateLeagueName("");
    } catch (error) {
      setCreateLeagueError(getLeagueActionErrorMessage(error, t));
    } finally {
      setLeagueActionBusy(null);
    }
  };

  const handleJoinPrivateLeague = async () => {
    setCreateLeagueError(null);
    setJoinLeagueError(null);
    setEditLeagueError(null);
    setDeleteLeagueError(null);
    setLeagueActionSuccess(null);
    setLeagueActionBusy("join");
    try {
      const mutationArgs = seasonSlug
        ? { inviteCode: joinLeagueCode, seasonSlug }
        : { inviteCode: joinLeagueCode };
      const result = await joinPrivateLeague(mutationArgs);
      setLeagueFilterId(result.id as Id<"fantasyPrivateLeagues">);
      setJoinLeagueCode("");
      setLeagueActionSuccess(t("league.joinSuccess"));
    } catch (error) {
      setJoinLeagueError(getLeagueActionErrorMessage(error, t));
    } finally {
      setLeagueActionBusy(null);
    }
  };

  const startEditingPrivateLeague = (league: FantasyPrivateLeague) => {
    setEditLeagueError(null);
    setRemoveMemberTarget(null);
    setRemovedLeagueTeamIds([]);
    setLeagueActionSuccess(null);
    setEditingPrivateLeague(league);
    setEditLeagueName(league.name);
  };

  const closeLeagueEditor = () => {
    setEditingPrivateLeague(null);
    setEditLeagueName("");
    setEditLeagueError(null);
    setRemovedLeagueTeamIds([]);
    setRemoveMemberTarget(null);
  };

  const handleRemovePrivateLeagueMember = () => {
    if (
      !removeMemberTarget ||
      removeMemberTarget.privateLeagueId !== editingPrivateLeague?.id ||
      leagueActionBusy !== null
    ) {
      return;
    }

    const teamId = removeMemberTarget.team.id as Id<"fantasyTeams">;
    setRemovedLeagueTeamIds((ids) =>
      ids.includes(teamId) ? ids : [...ids, teamId],
    );
    setEditLeagueError(null);
    setRemoveMemberTarget(null);
  };

  const handleUpdatePrivateLeague = async () => {
    if (!editingPrivateLeague || leagueActionBusy !== null) return;

    setEditLeagueError(null);
    setLeagueActionSuccess(null);
    setLeagueActionBusy("update");
    try {
      await updatePrivateLeague({
        name: editLeagueName,
        privateLeagueId:
          editingPrivateLeague.id as Id<"fantasyPrivateLeagues">,
        removedTeamIds: removedLeagueTeamIds,
      });
      closeLeagueEditor();
      setLeagueActionSuccess(t("league.editSuccess"));
    } catch (error) {
      setEditLeagueError(getLeagueActionErrorMessage(error, t));
    } finally {
      setLeagueActionBusy(null);
    }
  };

  const startDeletingPrivateLeague = (league: FantasyPrivateLeague) => {
    setDeleteLeagueError(null);
    setLeagueActionSuccess(null);
    setDeletePrivateLeagueTarget(league);
  };

  const handleDeletePrivateLeague = async () => {
    if (!deletePrivateLeagueTarget) return;

    const deletingLeagueId = deletePrivateLeagueTarget.id;
    setDeleteLeagueError(null);
    setLeagueActionSuccess(null);
    setLeagueActionBusy("delete");
    try {
      await deletePrivateLeague({
        privateLeagueId:
          deletePrivateLeagueTarget.id as Id<"fantasyPrivateLeagues">,
      });
      if (leagueFilterId === deletingLeagueId) {
        setLeagueFilterId(GLOBAL_LEAGUE_FILTER_ID);
      }
      setDeletePrivateLeagueTarget(null);
      setLeagueActionSuccess(t("league.deleteSuccess"));
    } catch (error) {
      setDeleteLeagueError(getLeagueActionErrorMessage(error, t));
    } finally {
      setLeagueActionBusy(null);
    }
  };

  const handleCopyInviteCode = async (inviteCode: string) => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(inviteCode);
      setLeagueActionSuccess(t("league.copySuccess"));
    } catch (error) {
      console.warn("[league-invite-code-copy-failed]", error);
    }
  };

  useEffect(() => {
    if (
      leagueScopeId !== TOTAL_LEAGUE_SCOPE_ID &&
      !selectableGameweeks.some((gameweek) => gameweek.id === leagueScopeId)
    ) {
      setLeagueScopeId(TOTAL_LEAGUE_SCOPE_ID);
    }
  }, [leagueScopeId, selectableGameweeks]);
  useEffect(() => {
    if (
      leagueFilterId !== GLOBAL_LEAGUE_FILTER_ID &&
      privateLeagues !== undefined &&
      !privateLeagues.some((league) => league.id === leagueFilterId)
    ) {
      setLeagueFilterId(GLOBAL_LEAGUE_FILTER_ID);
    }
  }, [leagueFilterId, privateLeagues]);

  const isCreateLeagueDisabled =
    leagueActionBusy !== null || createLeagueName.trim().length < 2;
  const isEditLeagueDisabled =
    leagueActionBusy !== null || editLeagueName.trim().length < 2;
  const isJoinLeagueDisabled =
    leagueActionBusy !== null || joinLeagueCode.trim().length < 4;

  return (
    <FantasyScreenFrame
      kicker={t("league.kicker")}
      title={t("league.title")}
      scrollable={!(isDesktopWeb && selectedTeamId && !isLeagueManagerOpen)}
    >
      {isLeagueManagerOpen ? (
        <>
          <View style={styles.teamWorkspaceHeader}>
            <Pressable
              accessibilityLabel={t("auth.back")}
              accessibilityRole="button"
              onPress={() => setLeagueManagerOpen(false)}
              style={themedBackButtonStyle}
            >
              <ArrowLeft
                color={fantasyTheme.primaryColor}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
            <View style={styles.teamWorkspaceTitleGroup}>
              <Text numberOfLines={1} style={styles.teamWorkspaceTitle}>
                {t("league.configureTitle")}
              </Text>
              <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
                {t("league.configureSubtitle")}
              </Text>
            </View>
            <View style={styles.teamWorkspaceHeaderSpacer} />
          </View>

          <View
            style={[
              styles.leagueManagerLayout,
              isDesktopWeb && styles.leagueManagerLayoutDesktop,
            ]}
          >
            <View
              style={
                isDesktopWeb ? styles.leagueCreateSectionDesktop : styles.panel
              }
            >
              <View style={styles.leagueActionsHeader}>
                <Text style={styles.sectionTitle}>
                  {t("league.createTitle")}
                </Text>
                <Text style={styles.mutedText}>
                  {t("league.createDescription")}
                </Text>
              </View>
              <TextInput
                autoCapitalize="words"
                editable={leagueActionBusy === null}
                onChangeText={(value) => {
                  setCreateLeagueName(value);
                  setCreateLeagueError(null);
                  setLeagueActionSuccess(null);
                }}
                placeholder={t("league.createPlaceholder")}
                placeholderTextColor={colors.text.muted}
                style={styles.input}
                value={createLeagueName}
              />
              <Pressable
                accessibilityRole="button"
                disabled={isCreateLeagueDisabled}
                onPress={handleCreatePrivateLeague}
                style={[
                  themedPrimaryButtonStyle,
                  isDesktopWeb && styles.leagueCreateButtonDesktop,
                  isCreateLeagueDisabled ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {leagueActionBusy === "create"
                    ? t("league.creating")
                    : t("league.createButton")}
                </Text>
              </Pressable>
              {createLeagueError ? (
                <Text style={styles.errorText}>{createLeagueError}</Text>
              ) : null}
            </View>

            <View
              style={
                isDesktopWeb ? styles.leagueOwnedSectionDesktop : styles.panel
              }
            >
              <View style={styles.leagueActionsHeader}>
                <Text style={styles.sectionTitle}>
                  {t("league.ownedTitle")}
                </Text>
              </View>
              {ownedPrivateLeagues.length > 0 ? (
                <View style={styles.leagueManagementList}>
                  {ownedPrivateLeagues.map((league) => (
                    <View key={league.id} style={styles.leagueManagementRow}>
                      <View style={styles.leagueManagementRowMain}>
                        <Text
                          numberOfLines={1}
                          style={styles.leagueManagementName}
                        >
                          {league.name}
                        </Text>
                        <Pressable
                          accessibilityHint={t("league.copyInviteCodeHint")}
                          accessibilityLabel={t("league.inviteCodeLabel")}
                          accessibilityRole="button"
                          onPress={() =>
                            void handleCopyInviteCode(league.inviteCode)
                          }
                          style={[
                            styles.leagueManagementCodeButton,
                            {
                              backgroundColor: fantasyTheme.softColor,
                              borderColor: fantasyTheme.borderColor,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.leagueManagementCode,
                              { color: fantasyTheme.primaryColor },
                            ]}
                          >
                            {league.inviteCode}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.leagueManagementActions}>
                        <Pressable
                          accessibilityLabel={t("common.edit")}
                          accessibilityRole="button"
                          disabled={leagueActionBusy !== null}
                          onPress={() => startEditingPrivateLeague(league)}
                          style={styles.leagueIconButton}
                        >
                          <Pencil
                            color={fantasyTheme.primaryColor}
                            size={18}
                            strokeWidth={2.4}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={t("common.delete")}
                          accessibilityRole="button"
                          disabled={leagueActionBusy !== null}
                          onPress={() => startDeletingPrivateLeague(league)}
                          style={[
                            styles.leagueIconButton,
                            styles.leagueIconButtonDanger,
                          ]}
                        >
                          <Trash2
                            color={colors.state.danger}
                            size={18}
                            strokeWidth={2.4}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>{t("league.ownedEmpty")}</Text>
              )}
              {leagueActionSuccess ? (
                <Text style={styles.successText}>{leagueActionSuccess}</Text>
              ) : null}
            </View>
          </View>

          <BottomSheet
            keyboardAvoidingEnabled
            onClose={closeLeagueEditor}
            sheetStyle={isDesktopWeb ? styles.leagueEditorDesktop : undefined}
            visible={Boolean(editingPrivateLeague)}
          >
            <View style={styles.leagueActionsContent}>
              <Text style={styles.sectionTitle}>{t("league.editTitle")}</Text>
              <TextInput
                accessibilityLabel={t("league.createPlaceholder")}
                autoCapitalize="words"
                editable={leagueActionBusy === null}
                onChangeText={(value) => {
                  setEditLeagueName(value);
                  setEditLeagueError(null);
                }}
                placeholder={t("league.createPlaceholder")}
                placeholderTextColor={colors.text.muted}
                style={styles.input}
                value={editLeagueName}
              />
              <View style={styles.leagueMembersSection}>
                <Text style={styles.sectionTitle}>
                  {t("league.membersTitle")}
                </Text>
                {teams === undefined || privateLeagues === undefined ? (
                  <LoadingBlock />
                ) : editingLeagueMembers.length === 0 ? (
                  <Text style={styles.mutedText}>
                    {t("league.membersEmpty")}
                  </Text>
                ) : (
                  editingLeagueMembers.map((team) => (
                    <View key={team.id} style={styles.leagueMemberRow}>
                      <View style={styles.leagueManagementRowMain}>
                        <Text style={styles.leagueManagementName}>
                          {team.name}
                        </Text>
                        <Text style={styles.mutedText}>
                          {team.managerName ?? t("user.managerFallback")}
                        </Text>
                      </View>
                      {team.id === currentFantasyTeamId &&
                      currentEditingLeague?.isOwner ? (
                        <Text style={styles.leagueMemberOwnerLabel}>
                          {t("league.owner")}
                        </Text>
                      ) : currentEditingLeague?.isOwner &&
                        currentFantasyTeamId ? (
                        <Pressable
                          accessibilityLabel={t("league.removeMember").replace(
                            "{name}",
                            team.name,
                          )}
                          accessibilityRole="button"
                          disabled={leagueActionBusy !== null}
                          onPress={() => {
                            setRemoveMemberTarget({
                              privateLeagueId:
                                currentEditingLeague.id as Id<"fantasyPrivateLeagues">,
                              team,
                            });
                          }}
                          style={[
                            styles.leagueIconButton,
                            styles.leagueIconButtonDanger,
                            leagueActionBusy !== null && styles.buttonDisabled,
                          ]}
                        >
                          <Trash2
                            color={colors.state.danger}
                            size={18}
                            strokeWidth={2.4}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
              {editLeagueError ? (
                <Text style={styles.errorText}>{editLeagueError}</Text>
              ) : null}
              <View style={styles.leagueDialogActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={leagueActionBusy !== null}
                  onPress={closeLeagueEditor}
                  style={[
                    themedSecondaryButtonStyle,
                    styles.leagueDialogActionButton,
                    leagueActionBusy !== null ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      themedSecondaryButtonTextStyle,
                      styles.leagueDialogActionText,
                    ]}
                  >
                    {t("common.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isEditLeagueDisabled}
                  onPress={handleUpdatePrivateLeague}
                  style={[
                    themedPrimaryButtonStyle,
                    styles.leagueDialogActionButton,
                    isEditLeagueDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      styles.leagueDialogActionText,
                    ]}
                  >
                    {leagueActionBusy === "update"
                      ? t("league.saving")
                      : t("common.save")}
                  </Text>
                </Pressable>
              </View>
            </View>
            <BottomSheet
              onClose={() => setRemoveMemberTarget(null)}
              sheetStyle={isDesktopWeb ? styles.leagueEditorDesktop : undefined}
              visible={Boolean(removeMemberTarget)}
            >
              <View style={styles.leagueActionsContent}>
                <Text style={styles.sectionTitle}>
                  {t("league.removeMemberConfirmTitle")}
                </Text>
                <Text style={styles.mutedText}>
                  {t("league.removeMemberConfirmDescription").replace(
                    "{name}",
                    removeMemberTarget?.team.name ?? "",
                  )}
                </Text>
                <View style={styles.leagueDialogActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={leagueActionBusy !== null}
                    onPress={() => setRemoveMemberTarget(null)}
                    style={[
                      themedSecondaryButtonStyle,
                      styles.leagueDialogActionButton,
                      leagueActionBusy !== null && styles.buttonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        themedSecondaryButtonTextStyle,
                        styles.leagueDialogActionText,
                      ]}
                    >
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={leagueActionBusy !== null}
                    onPress={handleRemovePrivateLeagueMember}
                    style={[
                      styles.dangerButton,
                      styles.leagueDialogActionButton,
                      leagueActionBusy !== null && styles.buttonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dangerButtonText,
                        styles.leagueDialogActionText,
                      ]}
                    >
                      {t("common.delete")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </BottomSheet>
          </BottomSheet>

          <BottomSheet
            onClose={() => setDeletePrivateLeagueTarget(null)}
            visible={Boolean(deletePrivateLeagueTarget)}
          >
            <View style={styles.leagueActionsContent}>
              <Text style={styles.sectionTitle}>
                {t("league.deleteConfirmTitle")}
              </Text>
              <Text style={styles.mutedText}>
                {t("league.deleteConfirmDescription").replace(
                  "{name}",
                  deletePrivateLeagueTarget?.name ?? "",
                )}
              </Text>
              <View style={styles.leagueDialogActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={leagueActionBusy !== null}
                  onPress={() => setDeletePrivateLeagueTarget(null)}
                  style={[
                    themedSecondaryButtonStyle,
                    styles.leagueDialogActionButton,
                    leagueActionBusy !== null ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      themedSecondaryButtonTextStyle,
                      styles.leagueDialogActionText,
                    ]}
                  >
                    {t("common.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={leagueActionBusy !== null}
                  onPress={handleDeletePrivateLeague}
                  style={[
                    styles.dangerButton,
                    styles.leagueDialogActionButton,
                    leagueActionBusy !== null ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dangerButtonText,
                      styles.leagueDialogActionText,
                    ]}
                  >
                    {leagueActionBusy === "delete"
                      ? t("league.deleting")
                      : t("common.delete")}
                  </Text>
                </Pressable>
              </View>
              {deleteLeagueError ? (
                <Text style={styles.errorText}>{deleteLeagueError}</Text>
              ) : null}
            </View>
          </BottomSheet>
        </>
      ) : selectedTeamId ? (
        <GameweekTeamViewer
          canQueryPrivateData={canQueryPrivateData}
          clubs={clubs}
          fantasyTeamId={selectedTeamId}
          gameweekId={viewerGameweekId}
          highestPointsOverride={
            selectedViewerLeader
              ? getTeamGameweekPoints(
                  selectedViewerLeader,
                  viewerGameweekId,
                )
              : undefined
          }
          highestTeamIdOverride={
            selectedViewerLeader
              ? (selectedViewerLeader.id as Id<"fantasyTeams">)
              : undefined
          }
          key={`${selectedTeamId}:${viewerGameweekId ?? "current"}`}
          onBack={() => setSelectedTeamId(null)}
          onOpenTeam={openTeam}
          seasonSlug={seasonSlug}
        />
      ) : (
        <>
          {isLoading ? (
            <View style={styles.panel}>
              <LoadingBlock />
            </View>
          ) : null}

          {!isLoading && teams.length === 0 ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t("league.emptyTitle")}</Text>
              <Text style={styles.mutedText}>
                {t("league.emptyDescription")}
              </Text>
            </View>
          ) : null}

          {!isLoading && teams.length > 0 ? (
            <>
              <View
                style={[
                  styles.leagueToolbar,
                  isDesktopWeb && styles.leagueToolbarDesktop,
                ]}
              >
                <View
                  style={[
                    styles.leagueFilterRow,
                    isDesktopWeb && styles.leagueFilterRowDesktop,
                  ]}
                >
                  {isDesktopWeb ? (
                    <>
                      <DesktopSelect
                        accessibilityLabel={t("league.scopeTitle")}
                        active={leagueFilterId !== GLOBAL_LEAGUE_FILTER_ID}
                        onValueChange={(value) =>
                          setLeagueFilterId(value as LeagueFilterId)
                        }
                        options={leagueFilterOptions}
                        style={styles.desktopSelectCompact}
                        value={leagueFilterId}
                      />
                      <DesktopSelect
                        accessibilityLabel={t("season.gameweekSelectTitle")}
                        active={leagueScopeId !== TOTAL_LEAGUE_SCOPE_ID}
                        onValueChange={(value) =>
                          setLeagueScopeId(value as LeagueScopeId)
                        }
                        options={leagueScopeOptions}
                        style={styles.desktopSelectCompact}
                        value={leagueScopeId}
                      />
                    </>
                  ) : (
                    <>
                      <FilterSelectButton
                        accessibilityLabel={t("league.scopeTitle")}
                        active={leagueFilterId !== GLOBAL_LEAGUE_FILTER_ID}
                        expanded={isLeaguePickerOpen}
                        label={selectedLeagueLabel}
                        onPress={() => {
                          setModePickerOpen(false);
                          setLeaguePickerOpen(current => !current);
                        }}
                        style={styles.filterControlFlexible}
                      />
                      <FilterSelectButton
                        accessibilityLabel={t("season.gameweekSelectTitle")}
                        active={leagueScopeId !== TOTAL_LEAGUE_SCOPE_ID}
                        expanded={isModePickerOpen}
                        label={selectedScopeLabel}
                        onPress={() => {
                          setLeaguePickerOpen(false);
                          setModePickerOpen(current => !current);
                        }}
                        style={styles.filterControlFlexible}
                      />
                    </>
                  )}
                  <FilterResetButton
                    compact={!isDesktopWeb}
                    disabled={!filtersDirty}
                    onPress={resetFilters}
                  />
                </View>
                {!isDesktopWeb && isLeaguePickerOpen ? (
                  <FilterSelectMenu
                    accessibilityLabel={t("league.scopeTitle")}
                    onClose={() => setLeaguePickerOpen(false)}
                    onValueChange={value => setLeagueFilterId(value as LeagueFilterId)}
                    options={leagueFilterOptions}
                    value={leagueFilterId}
                    footer={privateLeagues?.length === 0 ? (
                      <Text style={styles.mutedText}>{t("league.noPrivateLeagues")}</Text>
                    ) : null}
                  />
                ) : null}
                {!isDesktopWeb && isModePickerOpen ? (
                  <FilterSelectMenu
                    accessibilityLabel={t("season.gameweekSelectTitle")}
                    onClose={() => setModePickerOpen(false)}
                    onValueChange={value => setLeagueScopeId(value as LeagueScopeId)}
                    options={leagueScopeOptions}
                    value={leagueScopeId}
                  />
                ) : null}
                <View
                  style={[
                    styles.leagueToolbarActions,
                    isDesktopWeb && styles.leagueToolbarActionsDesktop,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setJoinLeagueError(null);
                      setLeagueActionSuccess(null);
                      setJoinLeagueOpen(true);
                    }}
                    style={[
                      styles.leagueJoinButton,
                      styles.filterControlFlexible,
                      isDesktopWeb && styles.leagueToolbarActionDesktop,
                      { borderColor: fantasyTheme.borderColor },
                    ]}
                  >
                    <Plus
                      color={fantasyTheme.primaryColor}
                      size={18}
                      strokeWidth={2.5}
                    />
                    <Text
                      numberOfLines={isDesktopWeb ? 1 : 2}
                      style={[
                        styles.leagueJoinButtonText,
                        { color: fantasyTheme.primaryColor },
                      ]}
                    >
                      {t("league.joinLeagueButton")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setCreateLeagueError(null);
                      setEditLeagueError(null);
                      setDeleteLeagueError(null);
                      setLeagueActionSuccess(null);
                      setLeagueManagerOpen(true);
                    }}
                    style={[
                      styles.leagueManageButton,
                      styles.filterControlFlexible,
                      isDesktopWeb && styles.leagueToolbarActionDesktop,
                      { backgroundColor: fantasyTheme.primaryColor },
                    ]}
                  >
                    <Cog
                      color={colors.text.inverse}
                      size={18}
                      strokeWidth={2.6}
                    />
                    <Text
                      numberOfLines={isDesktopWeb ? 1 : 2}
                      style={styles.leagueManageButtonText}
                    >
                      {t("league.configureButton")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {selectedPrivateLeague && sortedTeams.length === 0 ? (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>
                    {t("league.privateLeagueEmptyTitle")}
                  </Text>
                  <Text style={styles.mutedText}>
                    {t("league.privateLeagueEmptyDescription")}
                  </Text>
                </View>
              ) : null}

              {rankedTeams.length > 0 ? (
                <View style={styles.leagueList}>
                  <View style={styles.leagueTableHeader}>
                    <Text numberOfLines={1} style={styles.leagueTableRankHead}>
                      {t("season.table.pos")}
                    </Text>
                    <Text numberOfLines={1} style={styles.leagueTableTeamHead}>
                      {t("season.table.team")}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={styles.leagueTablePointsHead}
                    >
                      {tableGameweekLabel}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={styles.leagueTableTotalHead}
                    >
                      {t("league.mode.total")}
                    </Text>
                  </View>
                  {rankedTeams.map(
                    ({ gameweekPoints, rank, team, totalPoints }) => {
                      const isOpenable = canOpenTeam(team.id);
                      return (
                        <Pressable
                          accessibilityRole={isOpenable ? "button" : undefined}
                          disabled={!isOpenable}
                          key={team.id}
                          onPress={() =>
                            openTeam(team.id as Id<"fantasyTeams">)
                          }
                          style={[
                            styles.leagueRow,
                            !isOpenable ? styles.leagueRowLocked : null,
                          ]}
                        >
                          <Text numberOfLines={1} style={styles.leagueRank}>
                            {rank}
                          </Text>
                          <View style={styles.leagueTeamTextGroup}>
                            <Text
                              numberOfLines={1}
                              style={styles.leagueTeamName}
                            >
                              {team.name}
                            </Text>
                            {team.managerName ? (
                              <Text
                                numberOfLines={1}
                                style={styles.leagueManagerName}
                              >
                                {team.managerName}
                              </Text>
                            ) : null}
                          </View>
                          <Text numberOfLines={1} style={styles.leagueGwPoints}>
                            {getFormattedLeagueMetric(gameweekPoints, language)}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.leagueTotalPoints,
                              { color: fantasyTheme.primaryColor },
                            ]}
                          >
                            {getFormattedLeagueMetric(totalPoints, language)}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              ) : null}
            </>
          ) : null}

          <BottomSheet
            keyboardAvoidingEnabled
            onClose={() => setJoinLeagueOpen(false)}
            visible={isJoinLeagueOpen}
          >
            <View style={styles.leagueActionsContent}>
              <View style={styles.leagueActionsHeader}>
                <Text style={styles.sectionTitle}>{t("league.joinTitle")}</Text>
                <Text style={styles.mutedText}>
                  {t("league.joinDescription")}
                </Text>
              </View>

              <View style={styles.leagueActionForm}>
                <TextInput
                  accessibilityLabel={t("league.inviteCodeLabel")}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={leagueActionBusy === null}
                  onChangeText={(value) => {
                    setJoinLeagueCode(value.toUpperCase());
                    setJoinLeagueError(null);
                    setLeagueActionSuccess(null);
                  }}
                  placeholder={t("league.joinPlaceholder")}
                  placeholderTextColor={colors.text.muted}
                  style={styles.input}
                  value={joinLeagueCode}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isJoinLeagueDisabled}
                  onPress={handleJoinPrivateLeague}
                  style={[
                    themedPrimaryButtonStyle,
                    isJoinLeagueDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {leagueActionBusy === "join"
                      ? t("league.joining")
                      : t("league.joinButton")}
                  </Text>
                </Pressable>
                {joinLeagueError ? (
                  <Text style={styles.errorText}>{joinLeagueError}</Text>
                ) : null}
              </View>

              {leagueActionSuccess ? (
                <Text style={styles.successText}>{leagueActionSuccess}</Text>
              ) : null}
            </View>
          </BottomSheet>
        </>
      )}
    </FantasyScreenFrame>
  );
}
