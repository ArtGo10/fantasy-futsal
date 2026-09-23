import type { Id } from "../../../../convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
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
import { ArrowLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react-native";

import { ClearableTextInput } from "../../../components/common/ClearableTextInput";
import { LoadingBlock } from "../../../components/common/LoadingBlock";
import { SUPPORT_EMAIL, WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import { useSafeQuery } from "../../../hooks/useSafeQuery";
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
import {
  getDeleteAccountErrorMessage,
  getErrorMessage,
} from "../../../utils/auth";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import { normalizeFantasySearchValue } from "../utils/localizedFantasyData";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import type { FantasyFixture, FantasyGameweek } from "./FixturesScreen";

type AdminGameweekAction = "lock" | "recalculate" | "complete";
type AdminTab = "fixtures" | "players" | "tools";
type AdminFixtureStatus =
  | "scheduled"
  | "live"
  | "completed"
  | "postponed"
  | "cancelled";
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
type AdminPlayerPosition = "goalkeeper" | "universal";
type AdminPlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";

type FantasyClub = {
  id: Id<"fantasyClubs">;
  isActive?: boolean;
  name: string;
  shortName: string | null;
  sortOrder?: number;
};

type FantasyPlayer = {
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  firstName: string | null;
  id: Id<"fantasyPlayers">;
  initialPrice?: number | null;
  jerseyNumber?: number | null;
  lastName: string;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  position: "goalkeeper" | "universal";
  price: number;
  status: AdminPlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messagePl?: string | null;
    messageUk?: string | null;
    updatedAt?: number | null;
  } | null;
};

type AdminPlayerFormState = {
  clubId: string;
  displayName: string;
  firstName: string;
  initialPrice: string;
  jerseyNumber: string;
  lastName: string;
  photoThumbnailUrl: string;
  photoUrl: string;
  position: AdminPlayerPosition;
  price: string;
  status: AdminPlayerStatus;
  statusMessage: string;
};

type AdminFixtureSheetRow = {
  playerId: Id<"fantasyPlayers">;
  side: AdminFixtureSide;
  appeared: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  secondYellowRedCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
};

type ProfileScreenProps = {
  canQueryPrivateData?: boolean;
  clubs: FantasyClub[] | undefined;
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
  seasonSlug?: string | null;
};

const ADMIN_TABS: AdminTab[] = ["fixtures", "players", "tools"];

const ADMIN_TAB_LABEL_KEYS: Record<AdminTab, TranslationKey> = {
  fixtures: "profile.adminTabFixtures",
  players: "profile.adminTabPlayers",
  tools: "profile.adminTabTools",
};

const ADMIN_FIXTURE_STAT_FIELDS: Array<{
  key: keyof Omit<
    AdminFixtureSheetRow,
    "appeared" | "playerId" | "side"
  >;
  labelKey: TranslationKey;
}> = [
  { key: "goals", labelKey: "profile.adminFixtureStat.goals" },
  { key: "assists", labelKey: "profile.adminFixtureStat.assists" },
  { key: "yellowCards", labelKey: "profile.adminFixtureStat.yellowCards" },
  {
    key: "secondYellowRedCards",
    labelKey: "profile.adminFixtureStat.secondYellowRedCards",
  },
  { key: "redCards", labelKey: "profile.adminFixtureStat.redCards" },
  { key: "ownGoals", labelKey: "profile.adminFixtureStat.ownGoals" },
  {
    key: "penaltiesMissed",
    labelKey: "profile.adminFixtureStat.penaltiesMissed",
  },
  {
    key: "penaltiesSaved",
    labelKey: "profile.adminFixtureStat.penaltiesSaved",
  },
];

const ADMIN_FIXTURE_STAT_EVENT_TYPES: Record<
  keyof Omit<AdminFixtureSheetRow, "appeared" | "playerId" | "side">,
  AdminFixtureEventType
> = {
  assists: "assist",
  goals: "goal",
  ownGoals: "own_goal",
  penaltiesMissed: "penalty_missed",
  penaltiesSaved: "penalty_saved",
  redCards: "red_card",
  secondYellowRedCards: "second_yellow_red",
  yellowCards: "yellow_card",
};

const ADMIN_FIXTURE_STAT_MAX = 9;

const ADMIN_FIXTURE_STAT_ZERO_ROW = {
  assists: 0,
  goals: 0,
  ownGoals: 0,
  penaltiesMissed: 0,
  penaltiesSaved: 0,
  redCards: 0,
  secondYellowRedCards: 0,
  yellowCards: 0,
};

const ADMIN_FIXTURE_STAT_LABEL_SHORT: Record<
  keyof typeof ADMIN_FIXTURE_STAT_ZERO_ROW,
  string
> = {
  assists: "A",
  goals: "G",
  ownGoals: "OG",
  penaltiesMissed: "PM",
  penaltiesSaved: "PS",
  redCards: "RC",
  secondYellowRedCards: "2Y",
  yellowCards: "YC",
};

const ADMIN_FIXTURE_STAT_KEY_BY_EVENT_TYPE: Record<
  AdminFixtureEventType,
  keyof typeof ADMIN_FIXTURE_STAT_ZERO_ROW
> = {
  assist: "assists",
  goal: "goals",
  own_goal: "ownGoals",
  penalty_missed: "penaltiesMissed",
  penalty_saved: "penaltiesSaved",
  red_card: "redCards",
  second_yellow_red: "secondYellowRedCards",
  yellow_card: "yellowCards",
};

const ADMIN_FIXTURE_STAT_EVENT_TYPE_SET = new Set<AdminFixtureEventType>(
  Object.values(ADMIN_FIXTURE_STAT_EVENT_TYPES),
);

const ADMIN_FIXTURE_STAT_KEYS = Object.keys(
  ADMIN_FIXTURE_STAT_ZERO_ROW,
) as Array<keyof typeof ADMIN_FIXTURE_STAT_ZERO_ROW>;

const ADMIN_PLAYER_STATUSES: AdminPlayerStatus[] = [
  "active",
  "doubtful",
  "injured",
  "suspended",
  "unavailable",
  "left",
];

const ADMIN_PLAYER_STATUS_LABEL_KEYS: Record<
  AdminPlayerStatus,
  TranslationKey
> = {
  active: "players.playerStatus.active",
  doubtful: "players.playerStatus.doubtful",
  injured: "players.playerStatus.injured",
  left: "players.playerStatus.left",
  suspended: "players.playerStatus.suspended",
  unavailable: "players.playerStatus.unavailable",
};

const ADMIN_FIXTURE_STATUSES: AdminFixtureStatus[] = [
  "scheduled",
  "live",
  "completed",
  "postponed",
  "cancelled",
];

const ADMIN_FIXTURE_STATUS_LABEL_KEYS: Record<
  AdminFixtureStatus,
  TranslationKey
> = {
  cancelled: "profile.adminFixtureStatus.cancelled",
  completed: "profile.adminFixtureStatus.completed",
  live: "profile.adminFixtureStatus.live",
  postponed: "profile.adminFixtureStatus.postponed",
  scheduled: "profile.adminFixtureStatus.scheduled",
};

const EMPTY_ADMIN_PLAYER_FORM: AdminPlayerFormState = {
  clubId: "",
  displayName: "",
  firstName: "",
  initialPrice: "",
  jerseyNumber: "",
  lastName: "",
  photoThumbnailUrl: "",
  photoUrl: "",
  position: "universal",
  price: "",
  status: "active",
  statusMessage: "",
};

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  uk: "uk-UA",
};

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeFantasySearchValue(value);
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

function formatDateTimeInputValue(value: number | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeInputValue(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("Дата матча обязательна.");

  const timestamp = new Date(normalized).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Введите дату матча в формате YYYY-MM-DDTHH:mm.");
  }

  return timestamp;
}

function parseNullableAdminInteger(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}: нужно неотрицательное целое число.`);
  }

  return parsed;
}

function parseRequiredAdminNumber(value: string, fieldName: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName}: нужно неотрицательное число.`);
  }

  return parsed;
}

function getFixtureClubIdBySide(
  fixture: FantasyFixture | null,
  side: AdminFixtureSide,
) {
  if (!fixture) return null;
  return side === "home" ? fixture.homeClubId : fixture.awayClubId;
}

function createAdminPlayerForm(player?: FantasyPlayer | null) {
  if (!player) return EMPTY_ADMIN_PLAYER_FORM;

  return {
    clubId: player.clubId ?? "",
    displayName: player.displayName,
    firstName: player.firstName ?? "",
    initialPrice: String(player.initialPrice ?? player.price),
    jerseyNumber:
      player.jerseyNumber === null || player.jerseyNumber === undefined
        ? ""
        : String(player.jerseyNumber),
    lastName: player.lastName,
    photoThumbnailUrl: player.photoThumbnailUrl ?? "",
    photoUrl: player.photoUrl ?? "",
    position: player.position,
    price: String(player.price),
    status: player.status,
    statusMessage:
      player.statusDetails?.message ??
      player.statusDetails?.messageEn ??
      player.statusDetails?.messageUk ??
      player.statusDetails?.messagePl ??
      "",
  };
}

function getAdminFixtureRowEventCount(row: AdminFixtureSheetRow) {
  return ADMIN_FIXTURE_STAT_KEYS.reduce((total, key) => total + row[key], 0);
}

export function ProfileScreen({
  canQueryPrivateData = true,
  clubs,
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
  seasonSlug,
}: ProfileScreenProps) {
  const { language, t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const shouldShowProfileLanguageSwitcher = !isDesktopWeb;
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
  const saveAdminFixtureSheet = useMutation(api.fantasy.saveAdminFixtureSheet);
  const upsertAdminPlayer = useMutation(api.fantasy.upsertAdminPlayer);
  const deleteAdminPlayer = useMutation(api.fantasy.deleteAdminPlayer);
  const submitFeedback = useMutation(api.users.submitFeedback);
  const sendTestPush = useAction(api.notifications.sendTestPushToCurrentUser);
  const sendResultsReadyPush = useAction(
    api.notifications.sendGameweekResultsReadyPushToAll,
  );
  const [scoringBusy, setScoringBusy] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("fixtures");
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
  const [adminFixtureDateText, setAdminFixtureDateText] = useState("");
  const [adminFixtureStatus, setAdminFixtureStatus] =
    useState<AdminFixtureStatus>("scheduled");
  const [adminHomeScoreText, setAdminHomeScoreText] = useState("");
  const [adminAwayScoreText, setAdminAwayScoreText] = useState("");
  const [adminFixtureRows, setAdminFixtureRows] = useState<
    Record<string, AdminFixtureSheetRow>
  >({});
  const [adminFixtureBusy, setAdminFixtureBusy] = useState(false);
  const [adminFixtureStatusText, setAdminFixtureStatusText] = useState<
    string | null
  >(null);
  const [adminFixtureErrorText, setAdminFixtureErrorText] = useState<
    string | null
  >(null);
  const [adminPlayerSearch, setAdminPlayerSearch] = useState("");
  const [adminPlayerFormOpen, setAdminPlayerFormOpen] = useState(false);
  const [adminPlayerEditingId, setAdminPlayerEditingId] =
    useState<Id<"fantasyPlayers"> | null>(null);
  const [adminPlayerForm, setAdminPlayerForm] = useState<AdminPlayerFormState>(
    EMPTY_ADMIN_PLAYER_FORM,
  );
  const [adminPlayerBusy, setAdminPlayerBusy] = useState(false);
  const [adminPlayerStatusText, setAdminPlayerStatusText] = useState<
    string | null
  >(null);
  const [adminPlayerErrorText, setAdminPlayerErrorText] = useState<
    string | null
  >(null);
  const [adminPlayerDeleteTargetId, setAdminPlayerDeleteTargetId] =
    useState<Id<"fantasyPlayers"> | null>(null);
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
    adminTab,
    selectedAdminFixtureId,
    adminPlayerFormOpen,
    adminPlayerEditingId,
    legalSheetKind,
    feedbackSheetOpen,
    deleteConfirmOpen,
  ]);

  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErrorText, setDeleteErrorText] = useState<string | null>(null);

  const selectedFixtureDetails = useSafeQuery(
    api.fantasy.fixtureDetails,
    isAdmin &&
      mode === "adminActions" &&
      adminTab === "fixtures" &&
      selectedAdminFixtureId
      ? { fixtureId: selectedAdminFixtureId }
      : "skip",
  );
  const adminFeedbackItems = useSafeQuery(
    api.users.listFeedback,
    isAdmin &&
      mode === "adminActions" &&
      adminTab === "tools" &&
      canQueryPrivateData
      ? { limit: 10 }
      : "skip",
  );
  const playersById = useMemo(() => {
    const result = new Map<Id<"fantasyPlayers">, FantasyPlayer>();
    for (const player of players ?? []) result.set(player.id, player);
    return result;
  }, [players]);
  const sortedAdminClubs = useMemo(
    () =>
      [...(clubs ?? [])].sort(
        (a, b) =>
          (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
          a.name.localeCompare(b.name),
      ),
    [clubs],
  );
  const filteredAdminPlayers = useMemo(() => {
    const searchValue = normalizeSearchValue(adminPlayerSearch);
    return [...(players ?? [])]
      .filter((player) => {
        if (!searchValue) return true;
        return [
          player.displayName,
          player.firstName,
          player.lastName,
          player.clubName,
          player.jerseyNumber === null || player.jerseyNumber === undefined
            ? null
            : String(player.jerseyNumber),
        ].some((value) => normalizeSearchValue(value).includes(searchValue));
      })
      .sort(
        (a, b) =>
          (a.clubName ?? "").localeCompare(b.clubName ?? "") ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [adminPlayerSearch, players]);
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
  const getAdminFixturePlayersBySide = (side: AdminFixtureSide) => {
    const clubId = getFixtureClubIdBySide(selectedAdminFixtureForForm, side);
    if (!clubId) return [];

    return [...(players ?? [])]
      .filter((player) => player.clubId === clubId)
      .sort(
        (a, b) =>
          (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) ||
          a.displayName.localeCompare(b.displayName),
      );
  };
  const adminHomeFixturePlayers = useMemo(
    () => getAdminFixturePlayersBySide("home"),
    [players, selectedAdminFixtureForForm?.homeClubId],
  );
  const adminAwayFixturePlayers = useMemo(
    () => getAdminFixturePlayersBySide("away"),
    [players, selectedAdminFixtureForForm?.awayClubId],
  );

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
      setAdminFixtureDateText("");
      setAdminFixtureStatus("scheduled");
      setAdminHomeScoreText("");
      setAdminAwayScoreText("");
      setAdminFixtureRows({});
      return;
    }

    setAdminFixtureDateText(
      formatDateTimeInputValue(selectedAdminFixtureForForm.scheduledAt),
    );
    setAdminFixtureStatus(
      ADMIN_FIXTURE_STATUSES.includes(
        selectedAdminFixtureForForm.status as AdminFixtureStatus,
      )
        ? (selectedAdminFixtureForForm.status as AdminFixtureStatus)
        : "scheduled",
    );
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

    const nextRows: Record<string, AdminFixtureSheetRow> = {};
    const addPlayerRow = (player: FantasyPlayer, side: AdminFixtureSide) => {
      nextRows[player.id] = {
        playerId: player.id,
        side,
        appeared: false,
        ...ADMIN_FIXTURE_STAT_ZERO_ROW,
      };
    };
    for (const player of adminHomeFixturePlayers) addPlayerRow(player, "home");
    for (const player of adminAwayFixturePlayers) addPlayerRow(player, "away");

    for (const lineup of selectedFixtureDetails?.lineups ?? []) {
      if (!lineup.playerId) continue;
      const player = playersById.get(lineup.playerId as Id<"fantasyPlayers">);
      const fallbackSide = lineup.side as AdminFixtureSide;
      const current =
        nextRows[lineup.playerId] ??
        (player
          ? {
              playerId: player.id,
              side: fallbackSide,
              appeared: false,
              ...ADMIN_FIXTURE_STAT_ZERO_ROW,
            }
          : null);
      if (!current) continue;
      nextRows[lineup.playerId] = { ...current, appeared: true };
    }

    for (const event of selectedFixtureDetails?.events ?? []) {
      if (
        !event.playerId ||
        !ADMIN_FIXTURE_STAT_EVENT_TYPE_SET.has(event.type)
      ) {
        continue;
      }
      const player = playersById.get(event.playerId as Id<"fantasyPlayers">);
      const key = ADMIN_FIXTURE_STAT_KEY_BY_EVENT_TYPE[event.type];
      const current =
        nextRows[event.playerId] ??
        (player
          ? {
              playerId: player.id,
              side: event.side as AdminFixtureSide,
              appeared: false,
              ...ADMIN_FIXTURE_STAT_ZERO_ROW,
            }
          : null);
      if (!current) continue;
      nextRows[event.playerId] = {
        ...current,
        [key]: Math.min(ADMIN_FIXTURE_STAT_MAX, current[key] + 1),
      };
    }

    setAdminFixtureRows(nextRows);
  }, [
    selectedAdminFixtureForForm?.awayScore,
    selectedAdminFixtureForForm?.homeScore,
    selectedAdminFixtureForForm?.id,
    selectedAdminFixtureForForm?.scheduledAt,
    selectedAdminFixtureForForm?.status,
    selectedFixtureDetails?.events,
    selectedFixtureDetails?.lineups,
    adminHomeFixturePlayers,
    adminAwayFixturePlayers,
    playersById,
  ]);

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

      await syncDefaultScoringRules(seasonSlug ? { seasonSlug } : {});
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
        const result = await lockGameweek(
          seasonSlug ? { gameweekNumber, seasonSlug } : { gameweekNumber },
        );
        setAdminGameweekStatusText(
          `${t("profile.adminGameweekLockSuccess")} ${result.snapshotState.totalSnapshots}.`,
        );
        return;
      }

      if (action === "recalculate") {
        const result = await recalculateGameweekScores(
          seasonSlug ? { gameweekNumber, seasonSlug } : { gameweekNumber },
        );
        setAdminGameweekStatusText(
          `${t("profile.adminGameweekRecalculateSuccess")} ${result.participatedTeams}.`,
        );
        return;
      }

      const result = await completeGameweekAndGrantTransfers({
        gameweekNumber,
        ...(seasonSlug ? { seasonSlug } : {}),
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

  const updateAdminFixtureRow = (
    playerId: Id<"fantasyPlayers">,
    updater: (row: AdminFixtureSheetRow) => AdminFixtureSheetRow,
  ) => {
    setAdminFixtureRows((currentRows) => {
      const current = currentRows[playerId];
      if (!current) return currentRows;
      return {
        ...currentRows,
        [playerId]: updater(current),
      };
    });
  };

  const handleSaveAdminFixtureSheet = async () => {
    if (!selectedAdminFixtureId) return;

    try {
      setAdminFixtureBusy(true);
      setAdminFixtureStatusText(null);
      setAdminFixtureErrorText(null);

      const scheduledAt = parseDateTimeInputValue(adminFixtureDateText);
      const rows = Object.values(adminFixtureRows);
      const result = await saveAdminFixtureSheet({
        fixtureId: selectedAdminFixtureId,
        scheduledAt,
        status: adminFixtureStatus,
        homeScore: parseNullableAdminInteger(
          adminHomeScoreText,
          t("profile.adminFixtureHomeScore"),
        ),
        awayScore: parseNullableAdminInteger(
          adminAwayScoreText,
          t("profile.adminFixtureAwayScore"),
        ),
        rows,
      });
      setAdminFixtureStatusText(
        `${t("profile.adminFixtureSheetSaved")} ${result.lineups}/${result.events}.`,
      );
    } catch (error) {
      setAdminFixtureErrorText(getErrorMessage(error));
    } finally {
      setAdminFixtureBusy(false);
    }
  };

  const handleOpenAdminPlayerCreate = () => {
    setAdminPlayerEditingId(null);
    setAdminPlayerForm(EMPTY_ADMIN_PLAYER_FORM);
    setAdminPlayerFormOpen(true);
    setAdminPlayerStatusText(null);
    setAdminPlayerErrorText(null);
    setAdminPlayerDeleteTargetId(null);
  };

  const handleOpenAdminPlayerEdit = (player: FantasyPlayer) => {
    setAdminPlayerEditingId(player.id);
    setAdminPlayerForm(createAdminPlayerForm(player));
    setAdminPlayerFormOpen(true);
    setAdminPlayerStatusText(null);
    setAdminPlayerErrorText(null);
    setAdminPlayerDeleteTargetId(null);
  };

  const handleSaveAdminPlayer = async () => {
    try {
      setAdminPlayerBusy(true);
      setAdminPlayerStatusText(null);
      setAdminPlayerErrorText(null);

      const price = parseRequiredAdminNumber(
        adminPlayerForm.price,
        t("players.priceLabel"),
      );
      const initialPrice = parseRequiredAdminNumber(
        adminPlayerForm.initialPrice || adminPlayerForm.price,
        t("profile.adminPlayerInitialPrice"),
      );
      const jerseyNumber = parseNullableAdminInteger(
        adminPlayerForm.jerseyNumber,
        t("profile.adminPlayerJerseyNumber"),
      );
      const result = await upsertAdminPlayer({
        ...(seasonSlug ? { seasonSlug } : {}),
        ...(adminPlayerEditingId ? { playerId: adminPlayerEditingId } : {}),
        clubId: adminPlayerForm.clubId
          ? (adminPlayerForm.clubId as Id<"fantasyClubs">)
          : null,
        displayName: adminPlayerForm.displayName,
        firstName: adminPlayerForm.firstName || null,
        initialPrice,
        jerseyNumber,
        lastName: adminPlayerForm.lastName,
        photoThumbnailUrl: adminPlayerForm.photoThumbnailUrl || null,
        photoUrl: adminPlayerForm.photoUrl || null,
        position: adminPlayerForm.position,
        price,
        status: adminPlayerForm.status,
        statusDetails: adminPlayerForm.statusMessage.trim()
          ? { message: adminPlayerForm.statusMessage.trim() }
          : null,
      });

      setAdminPlayerEditingId(result.playerId);
      setAdminPlayerStatusText(
        result.created
          ? t("profile.adminPlayerCreated")
          : t("profile.adminPlayerSaved"),
      );
    } catch (error) {
      setAdminPlayerErrorText(getErrorMessage(error));
    } finally {
      setAdminPlayerBusy(false);
    }
  };

  const handleDeleteAdminPlayer = async (playerId: Id<"fantasyPlayers">) => {
    try {
      setAdminPlayerBusy(true);
      setAdminPlayerStatusText(null);
      setAdminPlayerErrorText(null);
      const result = await deleteAdminPlayer({ playerId });
      setAdminPlayerDeleteTargetId(null);
      if (adminPlayerEditingId === playerId) {
        setAdminPlayerEditingId(null);
        setAdminPlayerForm(EMPTY_ADMIN_PLAYER_FORM);
        setAdminPlayerFormOpen(false);
      }
      setAdminPlayerStatusText(
        result.deleted
          ? t("profile.adminPlayerDeleted")
          : t("profile.adminPlayerAlreadyDeleted"),
      );
    } catch (error) {
      setAdminPlayerErrorText(getErrorMessage(error));
    } finally {
      setAdminPlayerBusy(false);
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
    let shouldKeepDeletingState = false;

    try {
      setDeleteBusy(true);
      setDeleteErrorText(null);
      await onDeleteAccount();
      shouldKeepDeletingState = true;
    } catch (error) {
      setDeleteErrorText(
        getDeleteAccountErrorMessage(error, language) ||
          t("profile.deleteAccountFailed"),
      );
    } finally {
      if (!shouldKeepDeletingState) {
        setDeleteBusy(false);
      }
    }
  };

  const renderAdminStatStepper = (
    row: AdminFixtureSheetRow,
    key: keyof typeof ADMIN_FIXTURE_STAT_ZERO_ROW,
  ) => (
    <View key={key} style={styles.adminStatStepper}>
      <Text style={styles.adminStatLabel}>
        {ADMIN_FIXTURE_STAT_LABEL_SHORT[key]}
      </Text>
      <View style={styles.adminStatControls}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            updateAdminFixtureRow(row.playerId, (current) => ({
              ...current,
              [key]: Math.max(0, current[key] - 1),
            }))
          }
          style={styles.adminStatButton}
        >
          <Text style={styles.adminStatButtonText}>-</Text>
        </Pressable>
        <Text style={styles.adminStatValue}>{row[key]}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            updateAdminFixtureRow(row.playerId, (current) => ({
              ...current,
              [key]: Math.min(ADMIN_FIXTURE_STAT_MAX, current[key] + 1),
            }))
          }
          style={styles.adminStatButton}
        >
          <Text style={styles.adminStatButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderAdminFixturePlayerRow = (player: FantasyPlayer) => {
    const row = adminFixtureRows[player.id];
    if (!row) return null;
    const eventCount = getAdminFixtureRowEventCount(row);

    return (
      <View key={player.id} style={styles.adminFixtureSheetRow}>
        <View style={styles.adminFixtureSheetPlayerCell}>
          <Text numberOfLines={1} style={styles.adminEventRowTitle}>
            {player.jerseyNumber ? `${player.jerseyNumber}. ` : ""}
            {player.displayName}
          </Text>
          <Text style={styles.adminEventRowMeta}>
            {player.position === "goalkeeper"
              ? t("players.positionShort.goalkeeper")
              : t("players.positionShort.universal")}
            {eventCount > 0 ? ` · ${eventCount}` : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: row.appeared }}
          onPress={() =>
            updateAdminFixtureRow(player.id, (current) => ({
              ...current,
              appeared: !current.appeared,
            }))
          }
          style={[
            styles.adminAppearanceToggle,
            row.appeared
              ? [
                  styles.adminAppearanceToggleActive,
                  { backgroundColor: fantasyTheme.primaryColor },
                ]
              : null,
          ]}
        >
          <Text
            style={[
              styles.adminAppearanceToggleText,
              row.appeared ? styles.adminAppearanceToggleTextActive : null,
            ]}
          >
            {row.appeared ? "Y" : ""}
          </Text>
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.adminFixtureSheetStatsScroll}
          contentContainerStyle={styles.adminFixtureSheetStats}
        >
          {ADMIN_FIXTURE_STAT_KEYS.map((key) =>
            renderAdminStatStepper(row, key),
          )}
        </ScrollView>
      </View>
    );
  };

  const renderAdminFixtureTeamEditor = (
    side: AdminFixtureSide,
    title: string,
    teamPlayers: FantasyPlayer[],
  ) => (
    <View style={styles.adminFixtureTeamColumn}>
      <Text style={styles.adminFixtureTeamTitle}>{title}</Text>
      <View style={styles.adminFixtureSheetHeader}>
        <Text style={styles.adminFixtureSheetHeaderPlayer}>
          {t("profile.adminFixturePlayerColumn")}
        </Text>
        <Text style={styles.adminFixtureSheetHeaderAppear}>
          {t("profile.adminFixtureAppearedShort")}
        </Text>
      </View>
      {teamPlayers.length === 0 ? (
        <Text style={styles.mutedText}>{t("profile.adminFixtureNoPlayers")}</Text>
      ) : (
        teamPlayers.map((player) => renderAdminFixturePlayerRow(player))
      )}
    </View>
  );

  const adminFixturesContent = (
    <View style={styles.adminToolGroup}>
      <Text style={styles.sectionTitle}>{t("profile.adminFixtureTitle")}</Text>
      <Text style={styles.mutedText}>
        {t("profile.adminFixtureSheetDescription")}
      </Text>
      {fixtures === undefined || gameweeks === undefined ? (
        <LoadingBlock />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.adminGameweekChips}
      >
        {sortedGameweeks.map((gameweek) => {
          const isSelected = gameweek.number === Number(adminGameweekText);
          return (
            <Pressable
              accessibilityRole="button"
              key={gameweek.id}
              onPress={() => setAdminGameweekText(String(gameweek.number))}
              style={[
                styles.adminGameweekChip,
                isSelected
                  ? [
                      styles.adminGameweekChipActive,
                      {
                        backgroundColor: fantasyTheme.softColor,
                        borderColor: fantasyTheme.primaryColor,
                      },
                    ]
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.adminGameweekChipText,
                  isSelected ? { color: fantasyTheme.primaryColor } : null,
                ]}
              >
                {gameweek.number}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
                  isSelected
                    ? [
                        styles.adminFixtureOptionSelected,
                        {
                          backgroundColor: fantasyTheme.softColor,
                          borderColor: fantasyTheme.primaryColor,
                        },
                      ]
                    : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.adminFixtureOptionTitle,
                    isSelected
                      ? [
                          styles.adminFixtureOptionTitleSelected,
                          { color: fantasyTheme.primaryColor },
                        ]
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
          <View style={styles.adminFixtureMetaGrid}>
            <View style={styles.adminFixtureMetaField}>
              <Text style={styles.label}>{t("profile.adminFixtureDate")}</Text>
              <TextInput
                onChangeText={setAdminFixtureDateText}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor="#7B8798"
                style={styles.input}
                value={adminFixtureDateText}
              />
            </View>
            <View style={styles.adminFixtureMetaField}>
              <Text style={styles.label}>{t("profile.adminFixtureScoreTitle")}</Text>
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
            </View>
          </View>
          <View style={styles.adminEventTypeGrid}>
            {ADMIN_FIXTURE_STATUSES.map((status) => {
              const isSelected = adminFixtureStatus === status;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={status}
                  onPress={() => setAdminFixtureStatus(status)}
                  style={[
                    styles.adminEventTypeButton,
                    isSelected
                      ? [
                          styles.segmentButtonActive,
                          {
                            backgroundColor: fantasyTheme.softColor,
                            borderColor: fantasyTheme.primaryColor,
                          },
                        ]
                      : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentText,
                      isSelected
                        ? [
                            styles.segmentTextActive,
                            { color: fantasyTheme.primaryColor },
                          ]
                        : null,
                    ]}
                  >
                    {t(ADMIN_FIXTURE_STATUS_LABEL_KEYS[status])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.adminStatLegend}>
            {ADMIN_FIXTURE_STAT_FIELDS.map((field) => (
              <Text key={field.key} style={styles.adminFixtureOptionMeta}>
                {ADMIN_FIXTURE_STAT_LABEL_SHORT[field.key]} ·{" "}
                {t(field.labelKey)}
              </Text>
            ))}
          </View>
          <View style={styles.adminFixtureSheetColumns}>
            {renderAdminFixtureTeamEditor(
              "home",
              selectedAdminFixtureForForm.homeClubName,
              adminHomeFixturePlayers,
            )}
            {renderAdminFixtureTeamEditor(
              "away",
              selectedAdminFixtureForForm.awayClubName,
              adminAwayFixturePlayers,
            )}
          </View>
          <Pressable
            disabled={adminFixtureBusy}
            onPress={() => void handleSaveAdminFixtureSheet()}
            style={[
              themedPrimaryButtonStyle,
              styles.adminButtonInline,
              adminFixtureBusy ? styles.buttonDisabled : null,
            ]}
          >
            <Save color="#FFFFFF" size={18} strokeWidth={2.5} />
            <Text style={styles.primaryButtonText}>
              {adminFixtureBusy
                ? t("profile.adminFixtureSaving")
                : t("profile.adminFixtureSaveSheet")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {adminFixtureStatusText ? (
        <Text style={styles.successText}>{adminFixtureStatusText}</Text>
      ) : null}
      {adminFixtureErrorText ? (
        <Text style={styles.errorText}>{adminFixtureErrorText}</Text>
      ) : null}
    </View>
  );

  const adminPlayersContent = (
    <View style={styles.adminToolGroup}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>{t("profile.adminPlayersTitle")}</Text>
          <Text style={styles.mutedText}>
            {t("profile.adminPlayersDescription")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleOpenAdminPlayerCreate}
          style={[themedSecondaryButtonStyle, styles.adminCompactButton]}
        >
          <Plus color={fantasyTheme.primaryColor} size={17} strokeWidth={2.6} />
          <Text style={themedSecondaryButtonTextStyle}>
            {t("profile.adminPlayerAdd")}
          </Text>
        </Pressable>
      </View>
      <ClearableTextInput
        clearAccessibilityLabel={t("common.clearInput")}
        onChangeText={setAdminPlayerSearch}
        placeholder={t("profile.adminPlayerSearch")}
        placeholderTextColor="#7B8798"
        style={styles.input}
        value={adminPlayerSearch}
      />
      {players === undefined ? <LoadingBlock /> : null}
      {adminPlayerFormOpen ? (
        <View style={styles.adminPlayerEditor}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {adminPlayerEditingId
                ? t("profile.adminPlayerEditTitle")
                : t("profile.adminPlayerCreateTitle")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdminPlayerFormOpen(false)}
              style={styles.adminIconButton}
            >
              <X color={colors.text.secondary} size={18} strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={styles.adminPlayerFormGrid}>
            <TextInput
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({
                  ...current,
                  firstName: value,
                }))
              }
              placeholder={t("profile.adminPlayerFirstName")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.firstName}
            />
            <TextInput
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({
                  ...current,
                  lastName: value,
                }))
              }
              placeholder={t("profile.adminPlayerLastName")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.lastName}
            />
            <TextInput
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({
                  ...current,
                  displayName: value,
                }))
              }
              placeholder={t("profile.adminPlayerDisplayName")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.displayName}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({
                  ...current,
                  initialPrice: value,
                }))
              }
              placeholder={t("profile.adminPlayerInitialPrice")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.initialPrice}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({ ...current, price: value }))
              }
              placeholder={t("players.priceLabel")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.price}
            />
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                setAdminPlayerForm((current) => ({
                  ...current,
                  jerseyNumber: value,
                }))
              }
              placeholder={t("profile.adminPlayerJerseyNumber")}
              placeholderTextColor="#7B8798"
              style={styles.input}
              value={adminPlayerForm.jerseyNumber}
            />
          </View>
          <Text style={styles.label}>{t("profile.adminPlayerClub")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.adminGameweekChips}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setAdminPlayerForm((current) => ({ ...current, clubId: "" }))
              }
              style={[
                styles.adminGameweekChip,
                !adminPlayerForm.clubId
                  ? [
                      styles.adminGameweekChipActive,
                      {
                        backgroundColor: fantasyTheme.softColor,
                        borderColor: fantasyTheme.primaryColor,
                      },
                    ]
                  : null,
              ]}
            >
              <Text style={styles.adminGameweekChipText}>
                {t("players.freeAgents")}
              </Text>
            </Pressable>
            {sortedAdminClubs.map((club) => {
              const isSelected = adminPlayerForm.clubId === club.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={club.id}
                  onPress={() =>
                    setAdminPlayerForm((current) => ({
                      ...current,
                      clubId: club.id,
                    }))
                  }
                  style={[
                    styles.adminGameweekChip,
                    isSelected
                      ? [
                          styles.adminGameweekChipActive,
                          {
                            backgroundColor: fantasyTheme.softColor,
                            borderColor: fantasyTheme.primaryColor,
                          },
                        ]
                      : null,
                  ]}
                >
                  <Text style={styles.adminGameweekChipText}>
                    {club.shortName ?? club.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.label}>{t("players.statusLabel")}</Text>
          <View style={styles.adminEventTypeGrid}>
            {ADMIN_PLAYER_STATUSES.map((status) => {
              const isSelected = adminPlayerForm.status === status;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={status}
                  onPress={() =>
                    setAdminPlayerForm((current) => ({
                      ...current,
                      status,
                    }))
                  }
                  style={[
                    styles.adminEventTypeButton,
                    isSelected
                      ? [
                          styles.segmentButtonActive,
                          {
                            backgroundColor: fantasyTheme.softColor,
                            borderColor: fantasyTheme.primaryColor,
                          },
                        ]
                      : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentText,
                      isSelected
                        ? [
                            styles.segmentTextActive,
                            { color: fantasyTheme.primaryColor },
                          ]
                        : null,
                    ]}
                  >
                    {t(ADMIN_PLAYER_STATUS_LABEL_KEYS[status])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>{t("players.position.goalkeeper")}</Text>
          <View style={styles.segment}>
            {(["goalkeeper", "universal"] as AdminPlayerPosition[]).map(
              (position) => {
                const isSelected = adminPlayerForm.position === position;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={position}
                    onPress={() =>
                      setAdminPlayerForm((current) => ({
                        ...current,
                        position,
                      }))
                    }
                    style={[
                      styles.segmentButton,
                      isSelected
                        ? [
                            styles.segmentButtonActive,
                            {
                              backgroundColor: fantasyTheme.softColor,
                              borderColor: fantasyTheme.primaryColor,
                            },
                          ]
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isSelected
                          ? [
                              styles.segmentTextActive,
                              { color: fantasyTheme.primaryColor },
                            ]
                          : null,
                      ]}
                    >
                      {position === "goalkeeper"
                        ? t("players.position.goalkeeper")
                        : t("players.position.universal")}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
          <TextInput
            onChangeText={(value) =>
              setAdminPlayerForm((current) => ({
                ...current,
                photoUrl: value,
              }))
            }
            placeholder={t("profile.adminPlayerPhotoUrl")}
            placeholderTextColor="#7B8798"
            style={styles.input}
            value={adminPlayerForm.photoUrl}
          />
          <TextInput
            onChangeText={(value) =>
              setAdminPlayerForm((current) => ({
                ...current,
                photoThumbnailUrl: value,
              }))
            }
            placeholder={t("profile.adminPlayerPhotoThumbnailUrl")}
            placeholderTextColor="#7B8798"
            style={styles.input}
            value={adminPlayerForm.photoThumbnailUrl}
          />
          <TextInput
            multiline
            onChangeText={(value) =>
              setAdminPlayerForm((current) => ({
                ...current,
                statusMessage: value,
              }))
            }
            placeholder={t("profile.adminPlayerStatusMessage")}
            placeholderTextColor="#7B8798"
            style={[styles.input, styles.profileFeedbackTextArea]}
            value={adminPlayerForm.statusMessage}
          />
          <Pressable
            disabled={adminPlayerBusy}
            onPress={() => void handleSaveAdminPlayer()}
            style={[
              themedPrimaryButtonStyle,
              styles.adminButtonInline,
              adminPlayerBusy ? styles.buttonDisabled : null,
            ]}
          >
            <Save color="#FFFFFF" size={18} strokeWidth={2.5} />
            <Text style={styles.primaryButtonText}>
              {adminPlayerBusy
                ? t("profile.adminPlayerSaving")
                : t("common.save")}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.adminPlayerList}>
        {filteredAdminPlayers.map((player) => {
          const deletePending = adminPlayerDeleteTargetId === player.id;
          return (
            <View key={player.id} style={styles.adminPlayerRow}>
              <View style={styles.adminPlayerMain}>
                <Text numberOfLines={1} style={styles.adminEventRowTitle}>
                  {player.displayName}
                </Text>
                <Text style={styles.adminEventRowMeta}>
                  {player.clubName ?? t("players.freeAgents")} ·{" "}
                  {player.position === "goalkeeper"
                    ? t("players.positionShort.goalkeeper")
                    : t("players.positionShort.universal")}{" "}
                  · {player.price.toFixed(1)}
                </Text>
              </View>
              {deletePending ? (
                <View style={styles.adminPlayerActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={adminPlayerBusy}
                    onPress={() => void handleDeleteAdminPlayer(player.id)}
                    style={styles.adminEventDeleteButton}
                  >
                    <Text style={styles.adminEventDeleteText}>
                      {t("profile.adminPlayerConfirmDelete")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAdminPlayerDeleteTargetId(null)}
                    style={styles.adminIconButton}
                  >
                    <X color={colors.text.secondary} size={18} strokeWidth={2.4} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.adminPlayerActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleOpenAdminPlayerEdit(player)}
                    style={styles.adminIconButton}
                  >
                    <Pencil
                      color={fantasyTheme.primaryColor}
                      size={18}
                      strokeWidth={2.4}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAdminPlayerDeleteTargetId(player.id)}
                    style={styles.adminIconButtonDanger}
                  >
                    <Trash2
                      color={colors.state.danger}
                      size={18}
                      strokeWidth={2.4}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
        {players !== undefined && filteredAdminPlayers.length === 0 ? (
          <Text style={styles.mutedText}>{t("profile.adminPlayersEmpty")}</Text>
        ) : null}
      </View>
      {adminPlayerStatusText ? (
        <Text style={styles.successText}>{adminPlayerStatusText}</Text>
      ) : null}
      {adminPlayerErrorText ? (
        <Text style={styles.errorText}>{adminPlayerErrorText}</Text>
      ) : null}
    </View>
  );

  const adminToolsContent = (
    <View style={styles.adminToolGroup}>
      <View style={styles.profileFeedbackAdminBlock}>
        <Text style={styles.adminFixtureOptionTitle}>
          {t("profile.feedbackAdminTitle")}
        </Text>
        {adminFeedbackItems === undefined ? (
          <LoadingBlock />
        ) : adminFeedbackItems.length === 0 ? (
          <Text style={styles.mutedText}>{t("profile.feedbackAdminEmpty")}</Text>
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
          themedSecondaryButtonStyle,
          pushBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={themedSecondaryButtonTextStyle}>
          {pushBusy ? t("profile.pushTestSending") : t("profile.pushTestButton")}
        </Text>
      </Pressable>
      {pushStatusText ? <Text style={styles.successText}>{pushStatusText}</Text> : null}
      {pushErrorText ? <Text style={styles.errorText}>{pushErrorText}</Text> : null}
      <Pressable
        disabled={resultsPushBusy}
        onPress={handleSendResultsReadyPush}
        style={[
          themedSecondaryButtonStyle,
          resultsPushBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={themedSecondaryButtonTextStyle}>
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
          themedSecondaryButtonStyle,
          scoringBusy ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={themedSecondaryButtonTextStyle}>
          {scoringBusy
            ? t("profile.adminScoringSyncing")
            : t("profile.adminScoringSyncButton")}
        </Text>
      </Pressable>
      {adminStatusText ? <Text style={styles.successText}>{adminStatusText}</Text> : null}
      {adminErrorText ? <Text style={styles.errorText}>{adminErrorText}</Text> : null}
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
              themedSecondaryButtonStyle,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={themedSecondaryButtonTextStyle}>
              {adminGameweekAction === "lock"
                ? t("profile.adminGameweekLocking")
                : t("profile.adminGameweekLockButton")}
            </Text>
          </Pressable>
          <Pressable
            disabled={adminGameweekAction !== null}
            onPress={() => void handleAdminGameweekAction("recalculate")}
            style={[
              themedSecondaryButtonStyle,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={themedSecondaryButtonTextStyle}>
              {adminGameweekAction === "recalculate"
                ? t("profile.adminGameweekRecalculating")
                : t("profile.adminGameweekRecalculateButton")}
            </Text>
          </Pressable>
          <Pressable
            disabled={adminGameweekAction !== null}
            onPress={() => void handleAdminGameweekAction("complete")}
            style={[
              themedSecondaryButtonStyle,
              adminGameweekAction !== null ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={themedSecondaryButtonTextStyle}>
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
    </View>
  );

  const activeAdminContent =
    adminTab === "fixtures"
      ? adminFixturesContent
      : adminTab === "players"
        ? adminPlayersContent
        : adminToolsContent;

  const adminActionsContent = isAdmin ? (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t("profile.adminTitle")}</Text>
        <Text
          style={[
            styles.adminBadge,
            {
              backgroundColor: fantasyTheme.softColor,
              color: fantasyTheme.primaryColor,
            },
          ]}
        >
          {t("profile.adminBadge")}
        </Text>
      </View>
      <Text style={styles.mutedText}>{t("profile.adminDescription")}</Text>
      <View style={styles.adminTabs}>
        {ADMIN_TABS.map((tab) => {
          const isSelected = adminTab === tab;
          return (
            <Pressable
              accessibilityRole="button"
              key={tab}
              onPress={() => setAdminTab(tab)}
              style={[
                styles.adminTabButton,
                isSelected
                  ? [
                      styles.segmentButtonActive,
                      {
                        backgroundColor: fantasyTheme.softColor,
                        borderColor: fantasyTheme.primaryColor,
                      },
                    ]
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected
                    ? [
                        styles.segmentTextActive,
                        { color: fantasyTheme.primaryColor },
                      ]
                    : null,
                ]}
              >
                {t(ADMIN_TAB_LABEL_KEYS[tab])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {activeAdminContent}
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
              style={themedBackButtonStyle}
            >
              <ArrowLeft
                color={fantasyTheme.primaryColor}
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
        style={themedSecondaryButtonStyle}
        onPress={() => void onSignOut()}
      >
        <Text style={themedSecondaryButtonTextStyle}>
          {t("profile.signOut")}
        </Text>
      </Pressable>
    </View>
  );

  const adminPanel = isAdmin ? (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {t("profile.adminActionsTitle")}
        </Text>
        <Text
          style={[
            styles.adminBadge,
            {
              backgroundColor: fantasyTheme.softColor,
              color: fantasyTheme.primaryColor,
            },
          ]}
        >
          {t("profile.adminBadge")}
        </Text>
      </View>
      <Text style={styles.mutedText}>
        {t("profile.adminActionsDescription")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenAdminActions}
        style={themedPrimaryButtonStyle}
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
        <LanguageSwitcher activeColor={fantasyTheme.primaryColor} />
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
        <Text
          style={[
            styles.profileSupportEmailText,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {SUPPORT_EMAIL}
        </Text>
      </Pressable>
      <Pressable
        style={themedSecondaryButtonStyle}
        onPress={() => {
          setFeedbackErrorText(null);
          setFeedbackStatusText(null);
          setFeedbackSheetOpen(true);
        }}
      >
        <Text style={themedSecondaryButtonTextStyle}>
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
          style={themedSecondaryButtonStyle}
          onPress={() => setLegalSheetKind("terms")}
        >
          <Text style={themedSecondaryButtonTextStyle}>
            {t("profile.termsButton")}
          </Text>
        </Pressable>
        <Pressable
          style={themedSecondaryButtonStyle}
          onPress={() => setLegalSheetKind("privacy")}
        >
          <Text style={themedSecondaryButtonTextStyle}>
            {t("profile.privacyButton")}
          </Text>
        </Pressable>
        <Pressable
          style={themedSecondaryButtonStyle}
          onPress={() => setLegalSheetKind("rules")}
        >
          <Text style={themedSecondaryButtonTextStyle}>
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
            themedPrimaryButtonStyle,
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
              themedSecondaryButtonStyle,
              deleteBusy ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={themedSecondaryButtonTextStyle}>
              {t("common.cancel")}
            </Text>
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
