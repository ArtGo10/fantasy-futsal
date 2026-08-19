import type { Id } from "../../../../convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { ClearableTextInput } from "../../../components/common/ClearableTextInput";
import { SUPPORT_EMAIL, WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import type { LanguageCode, TranslationKey } from "../../../i18n/translations";
import { api } from "../../../lib/convexApi";
import { LanguageSwitcher } from "../../../components/common/LanguageSwitcher";
import {
  LegalTextSheet,
  type LegalTextKind,
} from "../../../components/legal/LegalTextSheet";
import { BottomSheet } from "../components/BottomSheet";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { getErrorMessage } from "../../../utils/auth";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import type { FantasyFixture, FantasyGameweek } from "./FixturesScreen";

type AdminGameweekAction = "lock" | "recalculate" | "complete";
type AdminFixtureEventType =
  | "goal"
  | "assist"
  | "yellow_card"
  | "second_yellow_red"
  | "red_card"
  | "own_goal"
  | "penalty_missed"
  | "penalty_saved";
type AdminFixtureSide = "home" | "away";

type FantasyPlayer = {
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  id: Id<"fantasyPlayers">;
  position: "goalkeeper" | "universal";
  status: string;
};

type ProfileScreenProps = {
  canQueryPrivateData?: boolean;
  email: string | undefined;
  fixtures: FantasyFixture[] | undefined;
  gameweeks: FantasyGameweek[] | undefined;
  isAdmin: boolean;
  mode?: "profile" | "adminActions";
  name: string;
  onAdminActionsBack?: () => void;
  onDeleteAccount: () => Promise<void>;
  onOpenAdminActions?: () => void;
  onSignOut: () => Promise<void> | void;
  players: FantasyPlayer[] | undefined;
};

const ADMIN_EVENT_TYPES: AdminFixtureEventType[] = [
  "goal",
  "assist",
  "yellow_card",
  "second_yellow_red",
  "red_card",
  "own_goal",
  "penalty_missed",
  "penalty_saved",
];

const ADMIN_EVENT_LABEL_KEYS: Record<AdminFixtureEventType, TranslationKey> = {
  assist: "profile.adminFixtureEventType.assist",
  goal: "profile.adminFixtureEventType.goal",
  own_goal: "profile.adminFixtureEventType.ownGoal",
  penalty_missed: "profile.adminFixtureEventType.penaltyMissed",
  penalty_saved: "profile.adminFixtureEventType.penaltySaved",
  red_card: "profile.adminFixtureEventType.redCard",
  second_yellow_red: "profile.adminFixtureEventType.secondYellowRed",
  yellow_card: "profile.adminFixtureEventType.yellowCard",
};

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  uk: "uk-UA",
};

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function formatAdminDateTime(
  value: number | null | undefined,
  language: LanguageCode,
) {
  if (!value) return "";

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatFixtureScore(fixture: FantasyFixture) {
  if (fixture.homeScore === null || fixture.awayScore === null) return null;
  return `${fixture.homeScore}:${fixture.awayScore}`;
}

function getFixtureClubIdBySide(
  fixture: FantasyFixture | null,
  side: AdminFixtureSide,
) {
  if (!fixture) return null;
  return side === "home" ? fixture.homeClubId : fixture.awayClubId;
}

export function ProfileScreen({
  canQueryPrivateData = true,
  email,
  fixtures,
  gameweeks,
  isAdmin,
  mode = "profile",
  name,
  onAdminActionsBack,
  onDeleteAccount,
  onOpenAdminActions,
  onSignOut,
  players,
}: ProfileScreenProps) {
  const { language, t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const shouldShowProfileLanguageSwitcher = !isDesktopWeb;
  const syncDefaultScoringRules = useMutation(
    api.fantasy.syncDefaultScoringRules,
  );
  const lockGameweek = useMutation(api.fantasy.lockGameweek);
  const recalculateGameweekScores = useMutation(
    api.fantasy.recalculateGameweekScores,
  );
  const completeGameweekAndGrantTransfers = useMutation(
    api.fantasy.completeGameweekAndGrantTransfers,
  );
  const setFixtureResult = useMutation(api.fantasy.setFixtureResult);
  const upsertFixtureEvent = useMutation(api.fantasy.upsertFixtureEvent);
  const deleteFixtureEvent = useMutation(api.fantasy.deleteFixtureEvent);
  const upsertFixtureLineup = useMutation(api.fantasy.upsertFixtureLineup);
  const deleteFixtureLineup = useMutation(api.fantasy.deleteFixtureLineup);
  const submitFeedback = useMutation(api.users.submitFeedback);
  const sendTestPush = useAction(api.notifications.sendTestPushToCurrentUser);
  const sendResultsReadyPush = useAction(
    api.notifications.sendGameweekResultsReadyPushToAll,
  );
  const [scoringBusy, setScoringBusy] = useState(false);
  const [adminStatusText, setAdminStatusText] = useState<string | null>(null);
  const [adminErrorText, setAdminErrorText] = useState<string | null>(null);
  const [adminGameweekText, setAdminGameweekText] = useState("1");
  const [adminGameweekAction, setAdminGameweekAction] =
    useState<AdminGameweekAction | null>(null);
  const [adminGameweekStatusText, setAdminGameweekStatusText] = useState<
    string | null
  >(null);
  const [adminGameweekErrorText, setAdminGameweekErrorText] = useState<
    string | null
  >(null);
  const [selectedAdminFixtureId, setSelectedAdminFixtureId] =
    useState<Id<"fantasyFixtures"> | null>(null);
  const [adminHomeScoreText, setAdminHomeScoreText] = useState("");
  const [adminAwayScoreText, setAdminAwayScoreText] = useState("");
  const [adminEventType, setAdminEventType] =
    useState<AdminFixtureEventType>("goal");
  const [adminEventSide, setAdminEventSide] =
    useState<AdminFixtureSide>("home");
  const [adminEventMinuteText, setAdminEventMinuteText] = useState("");
  const [adminEventPlayerSearch, setAdminEventPlayerSearch] = useState("");
  const [adminEventPlayerId, setAdminEventPlayerId] =
    useState<Id<"fantasyPlayers"> | null>(null);
  const [adminFixtureBusy, setAdminFixtureBusy] = useState(false);
  const [adminFixtureStatusText, setAdminFixtureStatusText] = useState<
    string | null
  >(null);
  const [adminFixtureErrorText, setAdminFixtureErrorText] = useState<
    string | null
  >(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatusText, setPushStatusText] = useState<string | null>(null);
  const [pushErrorText, setPushErrorText] = useState<string | null>(null);
  const [resultsPushBusy, setResultsPushBusy] = useState(false);
  const [resultsPushStatusText, setResultsPushStatusText] = useState<
    string | null
  >(null);
  const [resultsPushErrorText, setResultsPushErrorText] = useState<
    string | null
  >(null);
  const [legalSheetKind, setLegalSheetKind] = useState<LegalTextKind | null>(
    null,
  );
  const [feedbackSheetOpen, setFeedbackSheetOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackStatusText, setFeedbackStatusText] = useState<string | null>(
    null,
  );
  const [feedbackErrorText, setFeedbackErrorText] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useDismissKeyboardOnChange([
    mode,
    selectedAdminFixtureId,
    adminEventType,
    adminEventSide,
    adminEventPlayerId,
    legalSheetKind,
    feedbackSheetOpen,
    deleteConfirmOpen,
  ]);

  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErrorText, setDeleteErrorText] = useState<string | null>(null);

  const selectedFixtureDetails = useQuery(
    api.fantasy.fixtureDetails,
    isAdmin && mode === "adminActions" && selectedAdminFixtureId
      ? { fixtureId: selectedAdminFixtureId }
      : "skip",
  );
  const adminFeedbackItems = useQuery(
    api.users.listFeedback,
    isAdmin && mode === "adminActions" && canQueryPrivateData
      ? { limit: 10 }
      : "skip",
  );

  const sortedGameweeks = useMemo(
    () => [...(gameweeks ?? [])].sort((a, b) => a.number - b.number),
    [gameweeks],
  );
  const selectedAdminGameweek = useMemo(() => {
    const gameweekNumber = Number(adminGameweekText.trim());
    if (!Number.isInteger(gameweekNumber)) return null;
    return (
      sortedGameweeks.find((gameweek) => gameweek.number === gameweekNumber) ??
      null
    );
  }, [adminGameweekText, sortedGameweeks]);
  const adminFixtureOptions = useMemo(() => {
    if (!selectedAdminGameweek) return [];

    return [...(fixtures ?? [])]
      .filter((fixture) => fixture.gameweekId === selectedAdminGameweek.id)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [fixtures, selectedAdminGameweek]);
  const selectedAdminFixture = useMemo(
    () =>
      (fixtures ?? []).find(
        (fixture) => fixture.id === selectedAdminFixtureId,
      ) ?? null,
    [fixtures, selectedAdminFixtureId],
  );
  const selectedAdminFixtureForForm =
    selectedFixtureDetails?.fixture ?? selectedAdminFixture;
  const selectedAdminFixtureClubId = getFixtureClubIdBySide(
    selectedAdminFixture,
    adminEventSide,
  );
  const selectedAdminEventPlayer = useMemo(
    () =>
      (players ?? []).find((player) => player.id === adminEventPlayerId) ??
      null,
    [adminEventPlayerId, players],
  );
  const adminEventPlayerOptions = useMemo(() => {
    if (!selectedAdminFixtureClubId) return [];

    const searchValue = normalizeSearchValue(adminEventPlayerSearch);
    return [...(players ?? [])]
      .filter(
        (player) =>
          player.clubId === selectedAdminFixtureClubId &&
          player.status !== "left" &&
          (!searchValue ||
            normalizeSearchValue(player.displayName).includes(searchValue)),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, 12);
  }, [adminEventPlayerSearch, players, selectedAdminFixtureClubId]);

  useEffect(() => {
    if (!isAdmin || mode !== "adminActions") return;

    setSelectedAdminFixtureId((currentFixtureId) => {
      if (
        currentFixtureId &&
        adminFixtureOptions.some((fixture) => fixture.id === currentFixtureId)
      ) {
        return currentFixtureId;
      }

      return adminFixtureOptions[0]?.id
        ? (adminFixtureOptions[0].id as Id<"fantasyFixtures">)
        : null;
    });
  }, [adminFixtureOptions, isAdmin, mode]);

  useEffect(() => {
    if (!selectedAdminFixtureForForm) {
      setAdminHomeScoreText("");
      setAdminAwayScoreText("");
      return;
    }

    setAdminHomeScoreText(
      selectedAdminFixtureForForm.homeScore === null
        ? ""
        : String(selectedAdminFixtureForForm.homeScore),
    );
    setAdminAwayScoreText(
      selectedAdminFixtureForForm.awayScore === null
        ? ""
        : String(selectedAdminFixtureForForm.awayScore),
    );
  }, [
    selectedAdminFixtureForForm?.awayScore,
    selectedAdminFixtureForForm?.homeScore,
    selectedAdminFixtureForForm?.id,
  ]);

  useEffect(() => {
    setAdminEventPlayerId(null);
    setAdminEventPlayerSearch("");
  }, [adminEventSide, selectedAdminFixtureId]);

  const handleSendTestPush = async () => {
    try {
      setPushBusy(true);
      setPushStatusText(null);
      setPushErrorText(null);

      const result = await sendTestPush({});
      setPushStatusText(`${t("profile.pushTestSuccess")} ${result.sent}.`);
    } catch (error) {
      setPushErrorText(getErrorMessage(error));
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendResultsReadyPush = async () => {
    try {
      setResultsPushBusy(true);
      setResultsPushStatusText(null);
      setResultsPushErrorText(null);

      const result = await sendResultsReadyPush({});
      setResultsPushStatusText(
        `${t("profile.resultsPushSuccess")} ${result.sent}.`,
      );
    } catch (error) {
      setResultsPushErrorText(getErrorMessage(error));
    } finally {
      setResultsPushBusy(false);
    }
  };

  const handleSyncDefaultScoringRules = async () => {
    try {
      setScoringBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);

      await syncDefaultScoringRules({});
      setAdminStatusText(t("profile.adminScoringSyncSuccess"));
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setScoringBusy(false);
    }
  };

  const getAdminGameweekNumber = () => {
    const gameweekNumber = Number(adminGameweekText.trim());
    if (!Number.isInteger(gameweekNumber) || gameweekNumber < 1) {
      throw new Error(t("profile.adminGameweekInvalid"));
    }

    return gameweekNumber;
  };

  const handleAdminGameweekAction = async (action: AdminGameweekAction) => {
    try {
      const gameweekNumber = getAdminGameweekNumber();
      setAdminGameweekAction(action);
      setAdminGameweekStatusText(null);
      setAdminGameweekErrorText(null);

      if (action === "lock") {
        const result = await lockGameweek({ gameweekNumber });
        setAdminGameweekStatusText(
          `${t("profile.adminGameweekLockSuccess")} ${result.snapshotState.totalSnapshots}.`,
        );
        return;
      }

      if (action === "recalculate") {
        const result = await recalculateGameweekScores({ gameweekNumber });
        setAdminGameweekStatusText(
          `${t("profile.adminGameweekRecalculateSuccess")} ${result.participatedTeams}.`,
        );
        return;
      }

      const result = await completeGameweekAndGrantTransfers({
        gameweekNumber,
      });
      const priceChanges = result.priceChanges?.changedPlayers ?? 0;
      setAdminGameweekStatusText(
        `${t("profile.adminGameweekCompleteSuccess")} ${result.grantedTeams}. ${t("profile.adminGameweekPriceChanges")} ${priceChanges}.`,
      );
    } catch (error) {
      setAdminGameweekErrorText(getErrorMessage(error));
    } finally {
      setAdminGameweekAction(null);
    }
  };

  const handleSelectAdminFixture = (fixture: FantasyFixture) => {
    setSelectedAdminFixtureId(fixture.id as Id<"fantasyFixtures">);
    setAdminFixtureStatusText(null);
    setAdminFixtureErrorText(null);
  };

  const getAdminFixtureScore = () => {
    const homeScore = Number(adminHomeScoreText.trim());
    const awayScore = Number(adminAwayScoreText.trim());
    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      throw new Error(t("profile.adminFixtureScoreInvalid"));
    }

    return { awayScore, homeScore };
  };

  const handleSaveAdminFixtureScore = async () => {
    if (!selectedAdminFixtureId) return;

    try {
      const score = getAdminFixtureScore();
      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      await setFixtureResult({
        fixtureId: selectedAdminFixtureId,
        status: "completed",
        ...score,
      });
      setAdminFixtureStatusText(t("profile.adminFixtureScoreSaved"));
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const getAdminEventMinute = () => {
    const rawValue = adminEventMinuteText.trim();
    if (!rawValue) return undefined;

    const minute = Number(rawValue);
    if (!Number.isInteger(minute) || minute < 0) {
      throw new Error(t("profile.adminFixtureMinuteInvalid"));
    }

    return minute;
  };

  const handleMarkAdminFixtureAppearance = async () => {
    if (!selectedAdminFixtureId) return;

    try {
      if (!adminEventPlayerId) {
        throw new Error(t("profile.adminFixturePlayerRequired"));
      }

      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      await upsertFixtureLineup({
        fixtureId: selectedAdminFixtureId,
        playerId: adminEventPlayerId,
        side: adminEventSide,
      });
      setAdminFixtureStatusText(t("profile.adminFixtureAppearanceMarked"));
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const handleAddAdminFixtureEvent = async () => {
    if (!selectedAdminFixtureId) return;

    try {
      if (!adminEventPlayerId) {
        throw new Error(t("profile.adminFixturePlayerRequired"));
      }

      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      await upsertFixtureEvent({
        fixtureId: selectedAdminFixtureId,
        minute: getAdminEventMinute(),
        playerId: adminEventPlayerId,
        side: adminEventSide,
        type: adminEventType,
      });
      setAdminEventMinuteText("");
      setAdminEventPlayerId(null);
      setAdminEventPlayerSearch("");
      setAdminFixtureStatusText(t("profile.adminFixtureEventAdded"));
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const handleDeleteAdminFixtureLineup = async (
    lineupId: Id<"fantasyFixtureLineups">,
  ) => {
    try {
      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      await deleteFixtureLineup({ lineupId });
      setAdminFixtureStatusText(t("profile.adminFixtureAppearanceDeleted"));
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const handleDeleteAdminFixtureEvent = async (
    eventId: Id<"fantasyFixtureEvents">,
  ) => {
    try {
      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      await deleteFixtureEvent({ eventId });
      setAdminFixtureStatusText(t("profile.adminFixtureEventDeleted"));
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const handleOpenSupportEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const handleSubmitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (message.length < 3) {
      setFeedbackErrorText(t("profile.feedbackTooShort"));
      return;
    }

    try {
      setFeedbackBusy(true);
      setFeedbackErrorText(null);
      setFeedbackStatusText(null);
      await submitFeedback({ message, source: "profile" });
      setFeedbackMessage("");
      setFeedbackStatusText(t("profile.feedbackSuccess"));
      setFeedbackSheetOpen(false);
    } catch (error) {
      setFeedbackErrorText(getErrorMessage(error, language));
    } finally {
      setFeedbackBusy(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setDeleteBusy(true);
      setDeleteErrorText(null);
      await onDeleteAccount();
    } catch (error) {
      setDeleteErrorText(
        getErrorMessage(error) || t("profile.deleteAccountFailed"),
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const adminActionsContent = isAdmin ? (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t("profile.adminTitle")}</Text>
        <Text style={styles.adminBadge}>{t("profile.adminBadge")}</Text>
      </View>
      <Text style={styles.mutedText}>{t("profile.adminDescription")}</Text>
      <View style={styles.profileFeedbackAdminBlock}>
        <Text style={styles.adminFixtureOptionTitle}>
          {t("profile.feedbackAdminTitle")}
        </Text>
        {adminFeedbackItems === undefined ? (
          <Text style={styles.mutedText}>{t("common.loading")}</Text>
        ) : adminFeedbackItems.length === 0 ? (
          <Text style={styles.mutedText}>
            {t("profile.feedbackAdminEmpty")}
          </Text>
        ) : (
          <View style={styles.profileFeedbackAdminList}>
            {adminFeedbackItems.map((item) => (
              <View key={item.id} style={styles.profileFeedbackAdminItem}>
                <Text style={styles.adminFixtureOptionTitle}>
                  {item.name ?? item.email ?? t("user.managerFallback")}
                </Text>
                <Text style={styles.adminFixtureOptionMeta}>
                  {formatAdminDateTime(item.createdAt, language)}
                </Text>
                <Text style={styles.bodyText}>{item.message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Pressable
        disabled={pushBusy}
        onPress={handleSendTestPush}
        style={[
          styles.secondaryButton,
          pushBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {pushBusy
            ? t("profile.pushTestSending")
            : t("profile.pushTestButton")}
        </Text>
      </Pressable>
      {pushStatusText ? (
        <Text style={styles.successText}>{pushStatusText}</Text>
      ) : null}
      {pushErrorText ? (
        <Text style={styles.errorText}>{pushErrorText}</Text>
      ) : null}

      <Pressable
        disabled={resultsPushBusy}
        onPress={handleSendResultsReadyPush}
        style={[
          styles.secondaryButton,
          resultsPushBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {resultsPushBusy
            ? t("profile.resultsPushSending")
            : t("profile.resultsPushButton")}
        </Text>
      </Pressable>
      {resultsPushStatusText ? (
        <Text style={styles.successText}>{resultsPushStatusText}</Text>
      ) : null}
      {resultsPushErrorText ? (
        <Text style={styles.errorText}>{resultsPushErrorText}</Text>
      ) : null}

      <Pressable
        disabled={scoringBusy}
        onPress={handleSyncDefaultScoringRules}
        style={[
          styles.secondaryButton,
          scoringBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {scoringBusy
            ? t("profile.adminScoringSyncing")
            : t("profile.adminScoringSyncButton")}
        </Text>
      </Pressable>
      {adminStatusText ? (
        <Text style={styles.successText}>{adminStatusText}</Text>
      ) : null}
      {adminErrorText ? (
        <Text style={styles.errorText}>{adminErrorText}</Text>
      ) : null}

      <View style={styles.adminToolGroup}>
        <Text style={styles.sectionTitle}>
          {t("profile.adminGameweekTitle")}
        </Text>
        <Text style={styles.mutedText}>
          {t("profile.adminGameweekDescription")}
        </Text>
        <ClearableTextInput
          clearAccessibilityLabel={t("common.clearInput")}
          keyboardType="number-pad"
          onChangeText={setAdminGameweekText}
          placeholder={t("profile.adminGameweekPlaceholder")}
          placeholderTextColor="#7B8798"
          style={styles.input}
          value={adminGameweekText}
        />
        <View style={styles.profileLegalButtonsRow}>
          <Pressable
            disabled={adminGameweekAction !== null}
            onPress={() => void handleAdminGameweekAction("lock")}
            style={[
              styles.secondaryButton,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {adminGameweekAction === "lock"
                ? t("profile.adminGameweekLocking")
                : t("profile.adminGameweekLockButton")}
            </Text>
          </Pressable>
          <Pressable
            disabled={adminGameweekAction !== null}
            onPress={() => void handleAdminGameweekAction("recalculate")}
            style={[
              styles.secondaryButton,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {adminGameweekAction === "recalculate"
                ? t("profile.adminGameweekRecalculating")
                : t("profile.adminGameweekRecalculateButton")}
            </Text>
          </Pressable>
          <Pressable
            disabled={adminGameweekAction !== null}
            onPress={() => void handleAdminGameweekAction("complete")}
            style={[
              styles.secondaryButton,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {adminGameweekAction === "complete"
                ? t("profile.adminGameweekCompleting")
                : t("profile.adminGameweekCompleteButton")}
            </Text>
          </Pressable>
        </View>
        {adminGameweekStatusText ? (
          <Text style={styles.successText}>{adminGameweekStatusText}</Text>
        ) : null}
        {adminGameweekErrorText ? (
          <Text style={styles.errorText}>{adminGameweekErrorText}</Text>
        ) : null}
      </View>

      <View style={styles.adminToolGroup}>
        <Text style={styles.sectionTitle}>
          {t("profile.adminFixtureTitle")}
        </Text>
        <Text style={styles.mutedText}>
          {t("profile.adminFixtureDescription")}
        </Text>
        {fixtures === undefined || gameweeks === undefined ? (
          <Text style={styles.mutedText}>
            {t("profile.adminFixtureLoading")}
          </Text>
        ) : null}
        {fixtures !== undefined && adminFixtureOptions.length === 0 ? (
          <Text style={styles.mutedText}>{t("profile.adminFixtureEmpty")}</Text>
        ) : null}
        {adminFixtureOptions.length > 0 ? (
          <View style={styles.adminFixtureList}>
            {adminFixtureOptions.map((fixture) => {
              const isSelected = fixture.id === selectedAdminFixtureId;
              const score = formatFixtureScore(fixture);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={fixture.id}
                  onPress={() => handleSelectAdminFixture(fixture)}
                  style={[
                    styles.adminFixtureOption,
                    isSelected ? styles.adminFixtureOptionSelected : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.adminFixtureOptionTitle,
                      isSelected
                        ? styles.adminFixtureOptionTitleSelected
                        : null,
                    ]}
                  >
                    {fixture.homeClubName} - {fixture.awayClubName}
                  </Text>
                  <Text style={styles.adminFixtureOptionMeta}>
                    {formatAdminDateTime(fixture.scheduledAt, language)}
                    {score ? ` · ${score}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {selectedAdminFixtureForForm ? (
          <View style={styles.adminFixtureEditor}>
            <Text style={styles.sectionTitle}>
              {t("profile.adminFixtureScoreTitle")}
            </Text>
            <View style={styles.adminScoreRow}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setAdminHomeScoreText}
                placeholder={selectedAdminFixtureForForm.homeClubName}
                placeholderTextColor="#7B8798"
                style={[styles.input, styles.adminScoreInput]}
                value={adminHomeScoreText}
              />
              <TextInput
                keyboardType="number-pad"
                onChangeText={setAdminAwayScoreText}
                placeholder={selectedAdminFixtureForForm.awayClubName}
                placeholderTextColor="#7B8798"
                style={[styles.input, styles.adminScoreInput]}
                value={adminAwayScoreText}
              />
            </View>
            <Pressable
              disabled={adminFixtureBusy}
              onPress={() => void handleSaveAdminFixtureScore()}
              style={[
                styles.primaryButton,
                adminFixtureBusy ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {adminFixtureBusy
                  ? t("profile.adminFixtureSaving")
                  : t("profile.adminFixtureSaveScore")}
              </Text>
            </Pressable>

            <Text style={styles.sectionTitle}>
              {t("profile.adminFixtureEventsTitle")}
            </Text>
            <View style={styles.adminEventTypeGrid}>
              {ADMIN_EVENT_TYPES.map((eventType) => {
                const isSelected = adminEventType === eventType;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={eventType}
                    onPress={() => setAdminEventType(eventType)}
                    style={[
                      styles.adminEventTypeButton,
                      isSelected ? styles.segmentButtonActive : null,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.segmentText,
                        isSelected ? styles.segmentTextActive : null,
                      ]}
                    >
                      {t(ADMIN_EVENT_LABEL_KEYS[eventType])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.segment}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAdminEventSide("home")}
                style={[
                  styles.segmentButton,
                  adminEventSide === "home" ? styles.segmentButtonActive : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.segmentText,
                    adminEventSide === "home" ? styles.segmentTextActive : null,
                  ]}
                >
                  {selectedAdminFixtureForForm.homeClubName}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAdminEventSide("away")}
                style={[
                  styles.segmentButton,
                  adminEventSide === "away" ? styles.segmentButtonActive : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.segmentText,
                    adminEventSide === "away" ? styles.segmentTextActive : null,
                  ]}
                >
                  {selectedAdminFixtureForForm.awayClubName}
                </Text>
              </Pressable>
            </View>
            <ClearableTextInput
              clearAccessibilityLabel={t("common.clearInput")}
              onChangeText={setAdminEventPlayerSearch}
              placeholder={t("profile.adminFixturePlayerSearch")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminEventPlayerSearch}
            />
            <ScrollView
              nestedScrollEnabled
              style={styles.adminEventPlayerScroll}
              contentContainerStyle={styles.adminEventPlayerList}
            >
              {adminEventPlayerOptions.map((player) => {
                const isSelected = player.id === adminEventPlayerId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={player.id}
                    onPress={() => setAdminEventPlayerId(player.id)}
                    style={[
                      styles.adminEventPlayerOption,
                      isSelected ? styles.adminEventPlayerOptionSelected : null,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.adminEventPlayerName,
                        isSelected ? styles.adminEventPlayerNameSelected : null,
                      ]}
                    >
                      {player.displayName}
                    </Text>
                    <Text style={styles.adminEventPlayerMeta}>
                      {player.position === "goalkeeper"
                        ? t("players.positionShort.goalkeeper")
                        : t("players.positionShort.universal")}
                    </Text>
                  </Pressable>
                );
              })}
              {adminEventPlayerOptions.length === 0 ? (
                <Text style={styles.mutedText}>
                  {t("profile.adminFixtureNoPlayers")}
                </Text>
              ) : null}
            </ScrollView>
            <ClearableTextInput
              clearAccessibilityLabel={t("common.clearInput")}
              keyboardType="number-pad"
              onChangeText={setAdminEventMinuteText}
              placeholder={t("profile.adminFixtureMinutePlaceholder")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminEventMinuteText}
            />
            <View style={styles.adminFixtureActionRow}>
              <Pressable
                disabled={adminFixtureBusy || !selectedAdminEventPlayer}
                onPress={() => void handleMarkAdminFixtureAppearance()}
                style={[
                  styles.secondaryButton,
                  styles.adminFixtureActionButton,
                  adminFixtureBusy || !selectedAdminEventPlayer
                    ? styles.buttonDisabled
                    : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {t("profile.adminFixtureMarkAppearance")}
                </Text>
              </Pressable>
              <Pressable
                disabled={adminFixtureBusy || !selectedAdminEventPlayer}
                onPress={() => void handleAddAdminFixtureEvent()}
                style={[
                  styles.primaryButton,
                  styles.adminFixtureActionButton,
                  adminFixtureBusy || !selectedAdminEventPlayer
                    ? styles.buttonDisabled
                    : null,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {adminFixtureBusy
                    ? t("profile.adminFixtureAddingEvent")
                    : t("profile.adminFixtureAddEvent")}
                </Text>
              </Pressable>
            </View>

            <View style={styles.adminEventList}>
              <Text style={styles.sectionTitle}>
                {t("profile.adminFixtureAppearancesTitle")}
              </Text>
              {(selectedFixtureDetails?.lineups ?? []).map((lineup) => (
                <View key={lineup.id} style={styles.adminEventRow}>
                  <View style={styles.adminEventRowMain}>
                    <Text style={styles.adminEventRowTitle}>
                      {lineup.playerName}
                    </Text>
                    <Text style={styles.adminEventRowMeta}>
                      {lineup.side === "home"
                        ? selectedAdminFixtureForForm.homeClubName
                        : selectedAdminFixtureForForm.awayClubName}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={adminFixtureBusy}
                    onPress={() =>
                      void handleDeleteAdminFixtureLineup(
                        lineup.id as Id<"fantasyFixtureLineups">,
                      )
                    }
                    style={styles.adminEventDeleteButton}
                  >
                    <Text style={styles.adminEventDeleteText}>
                      {t("common.delete")}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {selectedFixtureDetails &&
              selectedFixtureDetails.lineups.length === 0 ? (
                <Text style={styles.mutedText}>
                  {t("profile.adminFixtureNoAppearances")}
                </Text>
              ) : null}
            </View>

            <View style={styles.adminEventList}>
              {(selectedFixtureDetails?.events ?? []).map((event) => (
                <View key={event.id} style={styles.adminEventRow}>
                  <View style={styles.adminEventRowMain}>
                    <Text style={styles.adminEventRowTitle}>
                      {event.playerName ?? "-"}
                    </Text>
                    <Text style={styles.adminEventRowMeta}>
                      {t(ADMIN_EVENT_LABEL_KEYS[event.type])}
                      {event.minute !== null ? ` · ${event.minute}'` : ""}
                      {event.points !== null ? ` · ${event.points}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={adminFixtureBusy}
                    onPress={() =>
                      void handleDeleteAdminFixtureEvent(
                        event.id as Id<"fantasyFixtureEvents">,
                      )
                    }
                    style={styles.adminEventDeleteButton}
                  >
                    <Text style={styles.adminEventDeleteText}>
                      {t("common.delete")}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {selectedFixtureDetails &&
              selectedFixtureDetails.events.length === 0 ? (
                <Text style={styles.mutedText}>
                  {t("profile.adminFixtureNoEvents")}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {adminFixtureStatusText ? (
          <Text style={styles.successText}>{adminFixtureStatusText}</Text>
        ) : null}
        {adminFixtureErrorText ? (
          <Text style={styles.errorText}>{adminFixtureErrorText}</Text>
        ) : null}
      </View>
    </View>
  ) : null;

  if (mode === "adminActions") {
    return (
      <View style={styles.fantasyScreenFrameRoot}>
        <ScrollView
          contentContainerStyle={styles.fantasyScreen}
          showsVerticalScrollIndicator={false}
          style={styles.fantasyScreenScroll}
        >
          <View style={styles.teamWorkspaceHeader}>
            <Pressable
              accessibilityLabel={t("auth.back")}
              accessibilityRole="button"
              onPress={onAdminActionsBack}
              style={styles.teamWorkspaceBackButton}
            >
              <ArrowLeft
                color={colors.brand.blueDark}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
            <View style={styles.teamWorkspaceTitleGroup}>
              <Text style={styles.teamWorkspaceTitle}>
                {t("profile.adminActionsTitle")}
              </Text>
              <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
                {t("profile.adminActionsSubtitle")}
              </Text>
            </View>
            <View style={styles.teamWorkspaceHeaderSpacer} />
          </View>

          {adminActionsContent ?? (
            <View style={styles.panel}>
              <Text style={styles.mutedText}>
                {t("profile.adminUnavailable")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  const accountPanel = (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{name}</Text>
      <Text style={styles.mutedText}>{email ?? t("profile.noEmail")}</Text>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => void onSignOut()}
      >
        <Text style={styles.secondaryButtonText}>{t("profile.signOut")}</Text>
      </Pressable>
    </View>
  );

  const adminPanel = isAdmin ? (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {t("profile.adminActionsTitle")}
        </Text>
        <Text style={styles.adminBadge}>{t("profile.adminBadge")}</Text>
      </View>
      <Text style={styles.mutedText}>
        {t("profile.adminActionsDescription")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenAdminActions}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {t("profile.adminActionsButton")}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const languagePanel = shouldShowProfileLanguageSwitcher ? (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t("profile.languageTitle")}</Text>
      <Text style={styles.mutedText}>{t("profile.languageDescription")}</Text>
      <View style={styles.profileLanguageSwitcherRow}>
        <LanguageSwitcher />
      </View>
    </View>
  ) : null;

  const feedbackPanel = (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t("profile.feedbackTitle")}</Text>
      <Text style={styles.mutedText}>{t("profile.feedbackDescription")}</Text>
      <Pressable
        accessibilityRole="link"
        onPress={handleOpenSupportEmail}
        style={styles.profileSupportEmailButton}
      >
        <Text style={styles.profileSupportEmailLabel}>
          {t("profile.supportEmailLabel")}
        </Text>
        <Text style={styles.profileSupportEmailText}>{SUPPORT_EMAIL}</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          setFeedbackErrorText(null);
          setFeedbackStatusText(null);
          setFeedbackSheetOpen(true);
        }}
      >
        <Text style={styles.secondaryButtonText}>
          {t("profile.feedbackButton")}
        </Text>
      </Pressable>
      {feedbackStatusText ? (
        <Text style={styles.successText}>{feedbackStatusText}</Text>
      ) : null}
    </View>
  );

  const legalPanel = (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t("profile.legalTitle")}</Text>
      <Text style={styles.mutedText}>{t("profile.legalDescription")}</Text>
      <View style={styles.profileLegalButtonsRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setLegalSheetKind("terms")}
        >
          <Text style={styles.secondaryButtonText}>
            {t("profile.termsButton")}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setLegalSheetKind("privacy")}
        >
          <Text style={styles.secondaryButtonText}>
            {t("profile.privacyButton")}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setLegalSheetKind("rules")}
        >
          <Text style={styles.secondaryButtonText}>
            {t("profile.rulesButton")}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const deleteAccountPanel = (
    <View style={[styles.panel, styles.dangerPanel]}>
      <Text style={styles.sectionTitle}>{t("profile.deleteAccountTitle")}</Text>
      <Text style={styles.mutedText}>
        {t("profile.deleteAccountDescription")}
      </Text>
      <Pressable
        disabled={deleteBusy}
        onPress={() => setDeleteConfirmOpen(true)}
        style={[styles.dangerButton, deleteBusy ? styles.buttonDisabled : null]}
      >
        <Text style={styles.dangerButtonText}>
          {deleteBusy
            ? t("profile.deleteAccountDeleting")
            : t("profile.deleteAccountButton")}
        </Text>
      </Pressable>
      {deleteErrorText ? (
        <Text style={styles.errorText}>{deleteErrorText}</Text>
      ) : null}
    </View>
  );

  return (
    <FantasyScreenFrame kicker={t("profile.kicker")} title={t("profile.title")}>
      {isDesktopWeb ? (
        <View style={styles.profileDesktopGrid}>
          <View style={styles.profileDesktopColumn}>
            {accountPanel}
            {adminPanel}
            {legalPanel}
          </View>
          <View style={styles.profileDesktopColumn}>
            {feedbackPanel}
            {deleteAccountPanel}
          </View>
        </View>
      ) : (
        <>
          {accountPanel}
          {adminPanel}
          {languagePanel}
          {feedbackPanel}
          {legalPanel}
          {deleteAccountPanel}
        </>
      )}

      <LegalTextSheet
        kind={legalSheetKind ?? "terms"}
        onClose={() => setLegalSheetKind(null)}
        visible={Boolean(legalSheetKind)}
      />

      <BottomSheet
        keyboardAvoidingEnabled
        onClose={() => setFeedbackSheetOpen(false)}
        visible={feedbackSheetOpen}
      >
        <Text style={styles.sectionTitle}>
          {t("profile.feedbackSheetTitle")}
        </Text>
        <ClearableTextInput
          clearAccessibilityLabel={t("common.clearInput")}
          multiline
          onChangeText={(value) => {
            setFeedbackMessage(value);
            setFeedbackErrorText(null);
          }}
          placeholder={t("profile.feedbackPlaceholder")}
          placeholderTextColor={styles.mutedText.color}
          style={[styles.input, styles.profileFeedbackTextArea]}
          textAlignVertical="top"
          value={feedbackMessage}
        />
        {feedbackErrorText ? (
          <Text style={styles.errorText}>{feedbackErrorText}</Text>
        ) : null}
        <Pressable
          disabled={feedbackBusy}
          onPress={handleSubmitFeedback}
          style={[
            styles.primaryButton,
            feedbackBusy ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {feedbackBusy
              ? t("profile.feedbackSending")
              : t("profile.feedbackSubmit")}
          </Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        onClose={() => setDeleteConfirmOpen(false)}
        visible={deleteConfirmOpen}
      >
        <Text style={styles.sectionTitle}>
          {t("profile.deleteAccountConfirmTitle")}
        </Text>
        <Text style={styles.mutedText}>
          {t("profile.deleteAccountConfirmDescription")}
        </Text>
        <View style={styles.confirmActionRow}>
          <Pressable
            disabled={deleteBusy}
            onPress={() => setDeleteConfirmOpen(false)}
            style={[
              styles.secondaryButton,
              deleteBusy ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            disabled={deleteBusy}
            onPress={handleConfirmDeleteAccount}
            style={[
              styles.dangerButton,
              deleteBusy ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.dangerButtonText}>
              {deleteBusy
                ? t("profile.deleteAccountDeleting")
                : t("common.delete")}
            </Text>
          </Pressable>
        </View>
        {deleteErrorText ? (
          <Text style={styles.errorText}>{deleteErrorText}</Text>
        ) : null}
      </BottomSheet>
    </FantasyScreenFrame>
  );
}
