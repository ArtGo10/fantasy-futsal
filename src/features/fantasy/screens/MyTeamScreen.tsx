import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Repeat2,
  Shirt,
} from "lucide-react-native";
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Id } from "../../../../convex/_generated/dataModel";
import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { ClearableTextInput } from "../../../components/common/ClearableTextInput";
import { LoadingLogo } from "../../../components/common/LoadingLogo";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import {
  LegalTextSheet,
  type LegalTextKind,
} from "../../../components/legal/LegalTextSheet";
import { useI18n } from "../../../i18n/I18nProvider";
import type { LanguageCode, TranslationKey } from "../../../i18n/translations";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import {
  FANTASY_STATIC_IMAGE_PROPS,
  FUTSAL_FIELD_IMAGE,
  getFantasySeasonTeamImageSource,
  getFantasySeasonWelcomeBackgroundSource,
  getFantasySeasonWelcomeIconSource,
  preloadFantasyStaticAssets,
} from "../assets/fantasyAssets";
import { BottomSheet } from "../components/BottomSheet";
import { DesktopSelect } from "../components/DesktopSelect";
import { GameweekTeamViewer } from "../components/GameweekTeamViewer";
import {
  FANTASY_PLAYER_PICKER_STATS_ITEM_HEIGHT,
  FantasyClubLogo,
  FantasyPlayerListRow,
  FantasyPlayerPickerStatsHeader,
  FantasyPlayerStatusBadge,
} from "../components/FantasyPlayerListRow";
import type { HeaderActionOverlayConfig } from "../components/HeaderActionOverlay";
import { TeamKitAvatar } from "../components/TeamKitAvatar";
import { PlayerDetailSheet } from "../components/PlayerDetailSheet";
import { formatFantasyMoney } from "../utils/money";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import { getFantasySeasonDisplayTitle } from "../utils/seasonDisplay";
import {
  colorWithAlpha,
  getFantasySeasonAccentColor,
  getFantasySeasonPrimaryColor,
  getFantasySeasonSecondaryColor,
  isPolishEkstraklasaSeason,
  type FantasySeasonVisualSource,
} from "../utils/seasonVisuals";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";
type LeadershipRole = "captain" | "viceCaptain" | null;
type TeamWorkspaceMode =
  | "overview"
  | "setup"
  | "pick"
  | "transfers"
  | "pointsDetails";
type TeamViewMode = "pitch" | "list";
type TransferStep = "edit" | "review";
type PlayerPickerPurpose = "slot" | "incomingTransfer";
type PlayerPickerDropdown = "club" | "sort" | null;
type PlayerPickerSortMode =
  | "default"
  | "available_first"
  | "price_desc"
  | "price_asc"
  | "price_increased"
  | "price_dropped"
  | "club";
const FAVORITE_CLUB_NONE_VALUE = "__no_favorite__";
const PLAYER_PICKER_ALL_CLUBS_VALUE = "__all_clubs__";
type PlayerPickerClubFilterValue = Id<"fantasyClubs"> | null;

const PLAYER_PICKER_SORT_OPTIONS: Array<{
  id: PlayerPickerSortMode;
  labelKey: TranslationKey;
}> = [
  { id: "default", labelKey: "team.playerPicker.sortDefault" },
  { id: "available_first", labelKey: "team.playerPicker.sortAvailableFirst" },
  { id: "price_desc", labelKey: "team.playerPicker.sortPriceHigh" },
  { id: "price_asc", labelKey: "team.playerPicker.sortPriceLow" },
  { id: "price_increased", labelKey: "team.playerPicker.sortPriceIncreased" },
  { id: "price_dropped", labelKey: "team.playerPicker.sortPriceDropped" },
  { id: "club", labelKey: "team.playerPicker.sortClub" },
];

type PlayerPointLineKind =
  | "appearance"
  | "goal"
  | "assist"
  | "yellow_card"
  | "second_yellow_red"
  | "red_card"
  | "own_goal"
  | "penalty_missed"
  | "penalty_saved"
  | "team_goals_scored"
  | "team_goals_conceded";

type FantasyOverview =
  | {
      season: {
        budget: number;
        name: string;
        slug: string;
        squadSize: number;
        startingSlots: number;
        activeSlots: number;
        status: string;
        transferPenaltyPoints?: number | null;
      } | null;
      currentGameweek: {
        deadlineAt: number | null;
        id: string;
        name: string;
        number: number;
        status: string;
      } | null;
      nextDeadlineAt: number | null;
    }
  | null
  | undefined;

type FantasyClub = {
  id: Id<"fantasyClubs">;
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName: string | null;
};

type FantasyPlayer = {
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  id: Id<"fantasyPlayers">;
  photoThumbnailUrl: string | null;
  photoUrl: string | null;
  appearances?: number | null;
  assists?: number | null;
  activeGameweeks?: number | null;
  averagePointsPerGameweek?: number | null;
  cleanSheets?: number | null;
  goals?: number | null;
  goalsConceded?: number | null;
  lastGameweekPoints?: number | null;
  managerAveragePointsPerGameweek?: number | null;
  managerLastGameweekPoints?: number | null;
  managerSeasonPoints?: number | null;
  ownGoals?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: PlayerPosition;
  price: number;
  previousPrice?: number | null;
  priceChangedAt?: number | null;
  priceDelta?: number | null;
  redCards?: number | null;
  saves?: number | null;
  seasonPoints?: number | null;
  selectedByTeams?: number | null;
  selectedPercent?: number | null;
  status: PlayerStatus;
  statusDetails?: {
    message?: string | null;
    messageEn?: string | null;
    messageUk?: string | null;
    updatedAt?: number | null;
  } | null;
  statusMessage?: string | null;
  yellowCards?: number | null;
};

type FantasyPlayers = FantasyPlayer[] | undefined;

type FantasyLeagueTeam = {
  currentGameweekId?: string | null;
  currentGameweekNumber?: number | null;
  currentGameweekParticipated?: boolean | null;
  currentGameweekPoints?: number | null;
  currentGameweekStatus?: string | null;
  id: string;
  managerName?: string | null;
  name: string;
  totalPoints?: number | null;
};

type FantasyGameweek = {
  deadlineAt?: number | null;
  id: string;
  name: string;
  number: number;
  status: string;
};

type FantasyTeam =
  | {
      id: Id<"fantasyTeams">;
      budgetRemaining: number;
      bestGameweekPoints?: number | null;
      freeTransfers?: number;
      hasParticipated?: boolean;
      lastGameweekPoints?: number | null;
      name: string;
      teamValue?: number;
      totalPoints?: number;
      picks: Array<{
        isCaptain: boolean;
        isStarter: boolean;
        isViceCaptain: boolean;
        player: FantasyPlayer | null;
        playerId: Id<"fantasyPlayers">;
        rosterSlot: number;
      }>;
    }
  | null
  | undefined;

type SquadSlotDefinition = {
  isStarter: boolean;
  order: number;
  position: PlayerPosition;
  rosterSlot: number;
  squadRole: "starter" | "bench" | "reserve";
};

type DraftPicks = Record<number, FantasyPlayer | null>;
type RemovedTransferPlayers = Record<number, FantasyPlayer>;
type TransferChange = {
  incomingPlayer: FantasyPlayer;
  outgoingPlayer: FantasyPlayer;
  slot: SquadSlotDefinition;
};

type TeamPointsBreakdownPlayer = {
  appeared: boolean;
  captainBonusPoints: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  lines: Array<{
    count: number | null;
    kind: PlayerPointLineKind;
    points: number;
  }>;
  managerPoints: number;
  multiplier: number;
  player: {
    clubId: Id<"fantasyClubs"> | null;
    clubName: string | null;
    displayName: string;
    firstName: string | null;
    id: Id<"fantasyPlayers">;
    lastName: string;
    position: PlayerPosition;
  } | null;
  rawPlayerPoints: number;
  rolePoints: number;
  rosterSlot: number;
  squadRole: SquadSlotDefinition["squadRole"];
};

type GameweekPointsBreakdown =
  | {
      gameweek: {
        deadlineAt: number | null;
        id: Id<"fantasyGameweeks">;
        number: number;
      } | null;
      players: TeamPointsBreakdownPlayer[];
      score: {
        basePoints: number | null;
        captainBonusPoints: number | null;
        participated: boolean;
        points: number;
        totalPointsAfterGameweek: number | null;
        transferPenaltyPoints: number | null;
      } | null;
      team: { id: Id<"fantasyTeams">; name: string };
      transferPenaltyPoints: number;
    }
  | null
  | undefined;

type GameweekPointsBreakdownData = Exclude<
  GameweekPointsBreakdown,
  null | undefined
>;

type SeasonPointsBreakdown =
  | {
      deductionPoints: number;
      deductions: Array<{
        createdAt: number;
        id: Id<"fantasyPointDeductions">;
        points: number;
        reason: string | null;
        source: "transfer";
        sourceId: Id<"fantasyTransfers"> | null;
      }>;
      gameweekPoints: number;
      gameweeks: GameweekPointsBreakdownData[];
      overallPoints: number;
      team: { id: Id<"fantasyTeams">; name: string };
    }
  | null
  | undefined;

type FutsalSquadSlotCircleProps = {
  isIncomingTransfer?: boolean;
  leadershipRole: LeadershipRole;
  onPress: () => void;
  player: FantasyPlayer | null;
  positionShortLabel: string;
  showPlayerPrice?: boolean;
  size?: "field" | "side";
  swapState?: "candidate" | "source" | "unavailable" | null;
};

type FutsalSquadLayoutProps = {
  captainSlot: number | null;
  draftPicks: DraftPicks;
  incomingPlayerIds?: ReadonlySet<string>;
  getSlotSwapState: (
    slot: SquadSlotDefinition,
  ) => "candidate" | "source" | "unavailable" | null;
  onSlotPress: (slot: SquadSlotDefinition) => void;
  showPlayerPrices?: boolean;
  slots: SquadSlotDefinition[];
  viceCaptainSlot: number | null;
};

type FutsalRosterLayoutProps = FutsalSquadLayoutProps & {
  showLeadershipBadges?: boolean;
};

type CompactSquadCardProps = {
  isIncomingTransfer?: boolean;
  leadershipRole: LeadershipRole;
  onPress: () => void;
  player: FantasyPlayer | null;
  positionLabel: string;
  swapState?: "candidate" | "source" | "unavailable" | null;
  title: string;
};

type TeamDashboardCardProps = {
  actionDeadlineValue: string;
  actionGameweekNumber: number | null;
  averagePoints: string;
  currentGameweekNumber: number | null;
  highestPoints: string;
  onOpenHighestDetails?: () => void;
  onOpenPointsDetails: () => void;
  onPickTeam: () => void;
  onTransfers: () => void;
  points: string;
  season?: FantasySeasonVisualSource | null;
  teamName: string;
};

type TeamCreateWelcomeProps = {
  onPickTeam: () => void;
  onRules: () => void;
  season?: FantasySeasonVisualSource | null;
  t: (key: TranslationKey) => string;
};

type TeamCreateSetupProps = {
  canContinue: boolean;
  favoriteClub: FantasyClub | null;
  favoriteClubId: Id<"fantasyClubs"> | null;
  favoriteClubOptions: FantasyClub[];
  isDesktopWeb: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onFavoriteClubChange: (clubId: Id<"fantasyClubs"> | null) => void;
  onOpenFavoriteClubPicker: () => void;
  onTeamNameChange: (value: string) => void;
  season?: FantasySeasonVisualSource | null;
  shouldHighlightTeamName: boolean;
  t: (key: TranslationKey) => string;
  teamName: string;
  teamNameErrorText: string | null;
};

type TeamOverviewPanelProps = {
  bankValue: string;
  freeTransfersValue: string;
  gameweekPointsValue: string;
  overallPointsValue: string;
  overallRankValue: string;
  squadValue: string;
  t: (key: TranslationKey) => string;
};

type IncomingTransferSlotBlockerReason =
  | "alreadySelected"
  | "budget"
  | "clubLimit"
  | "position";

const MAX_PLAYERS_PER_CLUB = 3;

const POINT_LINE_LABEL_KEYS: Record<PlayerPointLineKind, TranslationKey> = {
  appearance: "team.pointsLine.appearance",
  assist: "team.pointsLine.assist",
  goal: "team.pointsLine.goal",
  own_goal: "team.pointsLine.own_goal",
  penalty_missed: "team.pointsLine.penalty_missed",
  penalty_saved: "team.pointsLine.penalty_saved",
  red_card: "team.pointsLine.red_card",
  second_yellow_red: "team.pointsLine.second_yellow_red",
  team_goals_conceded: "team.pointsLine.team_goals_conceded",
  team_goals_scored: "team.pointsLine.team_goals_scored",
  yellow_card: "team.pointsLine.yellow_card",
};

const SQUAD_ROLE_LABEL_KEYS: Record<
  SquadSlotDefinition["squadRole"],
  TranslationKey
> = {
  bench: "team.role.bench",
  reserve: "team.role.reserve",
  starter: "team.role.starter",
};

const SQUAD_SLOT_DEFINITIONS: SquadSlotDefinition[] = [
  {
    isStarter: true,
    order: 1,
    position: "universal",
    rosterSlot: 1,
    squadRole: "starter",
  },
  {
    isStarter: true,
    order: 2,
    position: "universal",
    rosterSlot: 2,
    squadRole: "starter",
  },
  {
    isStarter: true,
    order: 3,
    position: "universal",
    rosterSlot: 3,
    squadRole: "starter",
  },
  {
    isStarter: true,
    order: 4,
    position: "universal",
    rosterSlot: 4,
    squadRole: "starter",
  },
  {
    isStarter: true,
    order: 1,
    position: "goalkeeper",
    rosterSlot: 5,
    squadRole: "starter",
  },
  {
    isStarter: false,
    order: 1,
    position: "universal",
    rosterSlot: 6,
    squadRole: "bench",
  },
  {
    isStarter: false,
    order: 2,
    position: "universal",
    rosterSlot: 7,
    squadRole: "bench",
  },
  {
    isStarter: false,
    order: 3,
    position: "universal",
    rosterSlot: 8,
    squadRole: "bench",
  },
  {
    isStarter: false,
    order: 4,
    position: "universal",
    rosterSlot: 9,
    squadRole: "bench",
  },
  {
    isStarter: false,
    order: 1,
    position: "goalkeeper",
    rosterSlot: 10,
    squadRole: "reserve",
  },
  {
    isStarter: false,
    order: 1,
    position: "universal",
    rosterSlot: 11,
    squadRole: "reserve",
  },
  {
    isStarter: false,
    order: 2,
    position: "universal",
    rosterSlot: 12,
    squadRole: "reserve",
  },
];

const SQUAD_SLOT_NUMBERS = new Set(
  SQUAD_SLOT_DEFINITIONS.map((slot) => slot.rosterSlot),
);

const POSITION_LABEL_KEYS: Record<PlayerPosition, TranslationKey> = {
  goalkeeper: "players.position.goalkeeper",
  universal: "players.position.universal",
};

const TEAM_NAME_MAX_LENGTH = 20;

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  uk: "uk-UA",
};

function createEmptyDraftPicks() {
  return SQUAD_SLOT_DEFINITIONS.reduce<DraftPicks>((result, slot) => {
    result[slot.rosterSlot] = null;
    return result;
  }, {});
}

function cloneDraftPicks(draftPicks: DraftPicks) {
  return { ...draftPicks };
}

function mergeLocalizedPlayerReference(
  player: FantasyPlayer | null,
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>,
) {
  if (!player) return player;

  const localizedPlayer = playersById.get(player.id);
  return localizedPlayer ? { ...player, ...localizedPlayer } : player;
}

function remapDraftPicksByPlayerId(
  draftPicks: DraftPicks,
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>,
) {
  let didChange = false;
  const nextDraftPicks = { ...draftPicks };

  for (const slot of SQUAD_SLOT_DEFINITIONS) {
    const player = draftPicks[slot.rosterSlot];
    const nextPlayer = mergeLocalizedPlayerReference(player, playersById);
    if (nextPlayer !== player) {
      nextDraftPicks[slot.rosterSlot] = nextPlayer;
      didChange = true;
    }
  }

  return didChange ? nextDraftPicks : draftPicks;
}

function remapRemovedTransferPlayersByPlayerId(
  players: RemovedTransferPlayers,
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>,
) {
  let didChange = false;
  const nextPlayers: RemovedTransferPlayers = {};

  for (const [slot, player] of Object.entries(players)) {
    const nextPlayer = mergeLocalizedPlayerReference(player, playersById);
    nextPlayers[Number(slot)] = nextPlayer ?? player;
    if (nextPlayer !== player) didChange = true;
  }

  return didChange ? nextPlayers : players;
}

function formatBudget(value: number | null | undefined) {
  return formatFantasyMoney(value, { fallback: 100 });
}

function sortPlayerPickerPlayers(
  players: FantasyPlayer[],
  sortMode: PlayerPickerSortMode,
  getDisabledReason?: (player: FantasyPlayer) => string | null,
) {
  if (sortMode === "default") return players;

  return [...players].sort((a, b) => {
    if (sortMode === "available_first") {
      const aUnavailable = Boolean(getDisabledReason?.(a));
      const bUnavailable = Boolean(getDisabledReason?.(b));
      return Number(aUnavailable) - Number(bUnavailable);
    }

    if (sortMode === "price_asc") {
      return a.price - b.price || a.displayName.localeCompare(b.displayName);
    }

    if (sortMode === "price_desc") {
      return b.price - a.price || a.displayName.localeCompare(b.displayName);
    }

    if (sortMode === "price_increased") {
      const aDelta = Number((a.priceDelta ?? 0).toFixed(1));
      const bDelta = Number((b.priceDelta ?? 0).toFixed(1));
      const aRank = aDelta > 0 ? 0 : 1;
      const bRank = bDelta > 0 ? 0 : 1;
      return (
        aRank - bRank ||
        bDelta - aDelta ||
        (b.priceChangedAt ?? 0) - (a.priceChangedAt ?? 0) ||
        b.price - a.price ||
        a.displayName.localeCompare(b.displayName)
      );
    }

    if (sortMode === "price_dropped") {
      const aDelta = Number((a.priceDelta ?? 0).toFixed(1));
      const bDelta = Number((b.priceDelta ?? 0).toFixed(1));
      const aRank = aDelta < 0 ? 0 : 1;
      const bRank = bDelta < 0 ? 0 : 1;
      return (
        aRank - bRank ||
        aDelta - bDelta ||
        (b.priceChangedAt ?? 0) - (a.priceChangedAt ?? 0) ||
        a.price - b.price ||
        a.displayName.localeCompare(b.displayName)
      );
    }

    return (
      (a.clubName ?? "").localeCompare(b.clubName ?? "") ||
      a.displayName.localeCompare(b.displayName)
    );
  });
}

function formatDeadline(
  deadlineAt: number | null | undefined,
  language: LanguageCode,
  fallback: string,
) {
  if (!deadlineAt) return fallback;

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(deadlineAt));
}

function formatWholeNumber(value: number | null | undefined) {
  return String(value ?? 0);
}

function getFiniteFantasyNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatFantasyPointsValue(value: number | null | undefined) {
  const rounded = Number((value ?? 0).toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatSignedFantasyPoints(value: number | null | undefined) {
  const normalized = value ?? 0;
  const formatted = formatFantasyPointsValue(normalized);
  return normalized > 0 ? "+" + formatted : formatted;
}

function formatSquadListMetric(value: number | null | undefined) {
  const rounded = Number((value ?? 0).toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatSquadListPercent(value: number | null | undefined) {
  return `${formatSquadListMetric(value)}%`;
}

function TeamDashboardStat({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress?: () => void;
  value: string;
}) {
  return (
    <View style={styles.teamDashboardStat}>
      <Text numberOfLines={1} style={styles.teamDashboardStatValue}>
        {value}
      </Text>
      <View style={styles.teamDashboardStatLabelRow}>
        <Text numberOfLines={1} style={styles.teamDashboardStatLabel}>
          {label}
        </Text>
        {onPress ? (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => [
              styles.teamDashboardStatDetailsButton,
              pressed ? styles.teamDashboardStatDetailsButtonPressed : null,
            ]}
          >
            <ChevronRight
              color={colors.text.inverse}
              size={16}
              strokeWidth={2.8}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TeamCreateWelcome({
  onPickTeam,
  onRules,
  season,
  t,
}: TeamCreateWelcomeProps) {
  const isPolishSeason = isPolishEkstraklasaSeason(season);
  const primaryColor = getFantasySeasonPrimaryColor(season);
  const secondaryColor = getFantasySeasonSecondaryColor(season);
  const accentColor = getFantasySeasonAccentColor(season);
  const welcomeCardBaseColor = primaryColor;
  const welcomeLogoBorderColor = isPolishSeason
    ? colors.text.inverse
    : accentColor;
  const welcomePrimaryButtonColor = isPolishSeason
    ? colorWithAlpha(colors.brand.polishRedDark, 0.46)
    : colorWithAlpha(secondaryColor, 0.45);
  const seasonTitle = getFantasySeasonDisplayTitle(
    season,
    t,
    t("competition.extraLiga.shortTitle"),
  );
  const description = t("team.welcome.leagueDescription").replace(
    "{league}",
    seasonTitle,
  );

  return (
    <View
      style={[
        styles.teamCreateWelcomeCard,
        { backgroundColor: welcomeCardBaseColor },
      ]}
    >
      <Image
        {...FANTASY_STATIC_IMAGE_PROPS}
        contentFit="cover"
        source={getFantasySeasonWelcomeBackgroundSource(season)}
        style={styles.teamCreateWelcomeBackground}
      />
      <View style={styles.teamCreateWelcomeContent}>
        <View
          style={[
            styles.teamCreateWelcomeLogoWrap,
            { borderColor: welcomeLogoBorderColor },
          ]}
        >
          <Image
            {...FANTASY_STATIC_IMAGE_PROPS}
            contentFit="contain"
            source={getFantasySeasonWelcomeIconSource(season)}
            style={[
              styles.teamCreateWelcomeLogo,
              isPolishSeason ? styles.teamCreateWelcomeLogoSquare : null,
            ]}
          />
        </View>
        <Text style={styles.teamCreateWelcomeTitle}>{seasonTitle}</Text>
        <Text style={styles.teamCreateWelcomeDescription}>
          {description}
        </Text>
        <View style={styles.teamCreateWelcomeActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onPickTeam}
            style={[
              styles.teamCreateWelcomePrimaryButton,
              { backgroundColor: welcomePrimaryButtonColor },
            ]}
          >
            <Shirt color={colors.text.inverse} size={22} strokeWidth={2.4} />
            <Text style={styles.teamCreateWelcomePrimaryText}>
              {t("team.create.button")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onRules}
            style={styles.teamCreateWelcomeSecondaryButton}
          >
            <BookOpen
              color={primaryColor}
              size={20}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.teamCreateWelcomeSecondaryText,
                { color: primaryColor },
              ]}
            >
              {t("team.welcome.rulesButton")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TeamCreateSetup({
  canContinue,
  favoriteClub,
  favoriteClubId,
  favoriteClubOptions,
  isDesktopWeb,
  onCancel,
  onContinue,
  onFavoriteClubChange,
  onOpenFavoriteClubPicker,
  onTeamNameChange,
  season,
  shouldHighlightTeamName,
  t,
  teamName,
  teamNameErrorText,
}: TeamCreateSetupProps) {
  const fantasyTheme = useFantasySeasonTheme();
  const { height: windowHeight } = useWindowDimensions();
  const teamNameInputRef = useRef<TextInput>(null);
  const heroHeight = Math.min(Math.max(windowHeight * 0.5, 300), 460);
  const favoriteClubSelectOptions = useMemo(
    () => [
      {
        label: t("team.setup.favoriteClubPlaceholder"),
        value: FAVORITE_CLUB_NONE_VALUE,
      },
      ...favoriteClubOptions.map((club) => ({
        label: club.name,
        leading: <FantasyClubLogo club={club} size="sm" />,
        value: club.id,
      })),
    ],
    [favoriteClubOptions, t],
  );
  const dismissSetupKeyboard = useCallback(() => {
    teamNameInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);
  const handleCancelPress = useCallback(() => {
    dismissSetupKeyboard();
    onCancel();
  }, [dismissSetupKeyboard, onCancel]);
  const handleContinuePress = useCallback(() => {
    dismissSetupKeyboard();
    onContinue();
  }, [dismissSetupKeyboard, onContinue]);
  const handleOpenFavoriteClubPicker = useCallback(() => {
    dismissSetupKeyboard();
    onOpenFavoriteClubPicker();
  }, [dismissSetupKeyboard, onOpenFavoriteClubPicker]);

  const setupPanel = (
    <View
      style={[
        styles.teamCreateSetupPanel,
        isDesktopWeb ? styles.teamCreateSetupPanelDesktop : null,
      ]}
    >
      <View style={styles.teamCreateSetupFieldGroup}>
        <Text style={styles.teamCreateSetupLabel}>
          {t("team.setup.teamNameLabel")}
        </Text>
        <ClearableTextInput
          ref={teamNameInputRef}
          clearAccessibilityLabel={t("common.clearInput")}
          onChangeText={onTeamNameChange}
          placeholder={t("team.namePlaceholder")}
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            styles.teamCreateSetupInput,
            shouldHighlightTeamName ? styles.inputError : null,
          ]}
          value={teamName}
        />
        {teamNameErrorText ? (
          <Text style={styles.teamCreateSetupErrorText}>
            {teamNameErrorText}
          </Text>
        ) : null}
      </View>

      <View style={styles.teamCreateSetupFieldGroup}>
        <Text style={styles.teamCreateSetupLabel}>
          {t("team.setup.favoriteClubLabel")}
        </Text>
        {isDesktopWeb ? (
          <DesktopSelect
            accessibilityLabel={t("team.setup.favoriteClubLabel")}
            onValueChange={(value) => {
              onFavoriteClubChange(
                value === FAVORITE_CLUB_NONE_VALUE
                  ? null
                  : (value as Id<"fantasyClubs">),
              );
            }}
            options={favoriteClubSelectOptions}
            style={styles.teamCreateSetupClubSelect}
            value={favoriteClubId ?? FAVORITE_CLUB_NONE_VALUE}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenFavoriteClubPicker}
            onPressIn={dismissSetupKeyboard}
            style={styles.teamCreateSetupClubButton}
          >
            {favoriteClub ? <FantasyClubLogo club={favoriteClub} /> : null}
            <Text
              numberOfLines={1}
              style={
                favoriteClub
                  ? styles.teamCreateSetupClubText
                  : styles.teamCreateSetupClubPlaceholder
              }
            >
              {favoriteClub?.name ?? t("team.setup.favoriteClubPlaceholder")}
            </Text>
            <ChevronDown
              color={fantasyTheme.primaryColor}
              size={24}
              strokeWidth={2.4}
            />
          </Pressable>
        )}
      </View>
    </View>
  );

  const setupFooter = (
    <View
      style={[
        styles.teamBuilderFooterActions,
        isDesktopWeb ? styles.teamCreateSetupFooterActionsDesktop : null,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={handleCancelPress}
        onPressIn={dismissSetupKeyboard}
        style={[
          styles.teamBuilderFooterSecondaryButton,
          { borderColor: fantasyTheme.borderColor },
        ]}
      >
        <Text
          style={[
            styles.teamBuilderFooterSecondaryText,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {t("team.cancelButton")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        onPress={handleContinuePress}
        onPressIn={dismissSetupKeyboard}
        style={[
          styles.teamBuilderFooterPrimaryButton,
          canContinue ? { backgroundColor: fantasyTheme.primaryColor } : null,
          canContinue ? null : styles.teamBuilderFooterButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.teamBuilderFooterPrimaryText,
            canContinue ? null : styles.teamBuilderFooterTextDisabled,
          ]}
        >
          {t("team.setup.continueButton")}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View
      style={[
        styles.teamCreateSetupScreen,
        isDesktopWeb ? styles.teamCreateSetupScreenDesktop : null,
      ]}
    >
      <View
        style={[
          styles.teamCreateSetupHero,
          { backgroundColor: fantasyTheme.primaryColor },
          isDesktopWeb
            ? styles.teamCreateSetupHeroDesktop
            : { height: heroHeight },
        ]}
      >
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="cover"
          contentPosition="center"
          source={getFantasySeasonTeamImageSource(season)}
          style={styles.teamCreateSetupHeroImage}
        />
      </View>

      {isDesktopWeb ? (
        <View
          style={[
            styles.teamCreateSetupControls,
            styles.teamCreateSetupControlsDesktop,
          ]}
        >
          {setupPanel}
          {setupFooter}
        </View>
      ) : (
        <>
          {setupPanel}
          {setupFooter}
        </>
      )}
    </View>
  );
}

function TeamDashboardCard({
  actionDeadlineValue,
  actionGameweekNumber,
  averagePoints,
  currentGameweekNumber,
  highestPoints,
  onOpenHighestDetails,
  onOpenPointsDetails,
  onPickTeam,
  onTransfers,
  points,
  season,
  teamName,
}: TeamDashboardCardProps) {
  const { t } = useI18n();
  const isPolishSeason = isPolishEkstraklasaSeason(season);
  const primaryColor = getFantasySeasonPrimaryColor(season);
  const secondaryColor = getFantasySeasonSecondaryColor(season);
  const actionButtonColor = isPolishSeason
    ? colorWithAlpha(colors.brand.polishRedDark, 0.58)
    : colorWithAlpha(secondaryColor, 0.45);
  const currentGameweekLabel = t("team.dashboard.gameweekLabel").replace(
    "{number}",
    currentGameweekNumber ? String(currentGameweekNumber) : "-",
  );
  const actionGameweekLabel = t("team.dashboard.gameweekLabel").replace(
    "{number}",
    actionGameweekNumber ? String(actionGameweekNumber) : "-",
  );

  return (
    <View style={[styles.teamDashboardCard, { backgroundColor: primaryColor }]}>
      <Image
        {...FANTASY_STATIC_IMAGE_PROPS}
        contentFit="cover"
        source={getFantasySeasonWelcomeBackgroundSource(season)}
        style={styles.teamDashboardCardBackground}
      />
      <View style={styles.teamDashboardProfileRow}>
        <View style={styles.teamDashboardProfileText}>
          <Text numberOfLines={1} style={styles.teamDashboardTeamName}>
            {teamName}
          </Text>
        </View>
      </View>

      <View style={styles.teamDashboardGameweekTextGroup}>
        <Text style={styles.teamDashboardGameweekTitle}>
          {currentGameweekLabel}
        </Text>
      </View>

      <View style={styles.teamDashboardStatsRow}>
        <TeamDashboardStat
          label={t("team.dashboard.averageLabel")}
          value={averagePoints}
        />
        <TeamDashboardStat
          label={t("team.dashboard.pointsLabel")}
          onPress={onOpenPointsDetails}
          value={points}
        />
        <TeamDashboardStat
          label={t("team.dashboard.highestLabel")}
          onPress={onOpenHighestDetails}
          value={highestPoints}
        />
      </View>

      <View style={styles.teamDashboardDivider} />

      <View style={styles.teamDashboardGameweekTextGroup}>
        <Text style={styles.teamDashboardGameweekTitle}>
          {actionGameweekLabel}
        </Text>
        <Text numberOfLines={1} style={styles.teamDashboardDeadlineText}>
          {t("team.dashboard.deadlineLabel")}: {actionDeadlineValue}
        </Text>
      </View>

      <View style={styles.teamDashboardActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPickTeam}
          style={[
            styles.teamDashboardActionButton,
            { backgroundColor: actionButtonColor },
          ]}
        >
          <Shirt color={colors.text.inverse} size={22} strokeWidth={2.4} />
          <Text style={styles.teamDashboardActionText}>
            {t("team.dashboard.pickTeamButton")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onTransfers}
          style={[
            styles.teamDashboardActionButton,
            { backgroundColor: actionButtonColor },
          ]}
        >
          <Repeat2 color={colors.text.inverse} size={22} strokeWidth={2.4} />
          <Text style={styles.teamDashboardActionText}>
            {t("team.dashboard.transfersButton")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeamOverviewRow({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: string;
  valueTone?: "danger" | "success";
}) {
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <View style={styles.teamOverviewRow}>
      <Text numberOfLines={1} style={styles.teamOverviewRowLabel}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.teamOverviewRowValue,
          !valueTone ? { color: fantasyTheme.primaryColor } : null,
          valueTone === "success" ? styles.teamOverviewRowValueSuccess : null,
          valueTone === "danger" ? styles.teamOverviewRowValueDanger : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function TeamOverviewPanel({
  bankValue,
  freeTransfersValue,
  gameweekPointsValue,
  overallPointsValue,
  overallRankValue,
  squadValue,
  t,
}: TeamOverviewPanelProps) {
  return (
    <View style={styles.teamOverviewBlock}>
      <View style={styles.teamOverviewPanel}>
        <TeamOverviewRow
          label={t("team.overview.gameweekPoints")}
          value={gameweekPointsValue}
        />
        <TeamOverviewRow
          label={t("team.overview.overallPoints")}
          value={overallPointsValue}
        />
        <TeamOverviewRow
          label={t("team.overview.overallRank")}
          value={overallRankValue}
        />
        <TeamOverviewRow
          label={t("team.freeTransfersLabel")}
          value={freeTransfersValue}
        />
        <TeamOverviewRow label={t("team.bankLabel")} value={bankValue} />
        <TeamOverviewRow label={t("team.teamValueLabel")} value={squadValue} />
      </View>
    </View>
  );
}

function getVisibleBreakdownPlayers(breakdown: GameweekPointsBreakdownData) {
  return breakdown.players;
}

function TeamPointsDetailsPlayerCard({
  item,
  playersById,
}: {
  item: TeamPointsBreakdownPlayer;
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const localizedPlayer = item.player ? playersById.get(item.player.id) : null;
  const playerName =
    localizedPlayer?.displayName ?? item.player?.displayName ?? "-";
  const clubName = localizedPlayer?.clubName ?? item.player?.clubName ?? null;
  const roleLabel = t(SQUAD_ROLE_LABEL_KEYS[item.squadRole]);
  const leadershipLabel = item.isCaptain
    ? "C"
    : item.isViceCaptain
      ? "VC"
      : null;
  const hasCaptainBonus = Math.abs(item.captainBonusPoints) >= 0.001;

  return (
    <View style={styles.teamPointsBreakdownPlayerCard}>
      <View style={styles.teamPointsBreakdownPlayerHeader}>
        <View style={styles.teamPointsBreakdownPlayerIdentity}>
          <TeamKitAvatar
            clubName={clubName}
            displayName={playerName}
            position={item.player?.position ?? "universal"}
            size="xs"
          />
          <View style={styles.teamPointsBreakdownPlayerTitleGroup}>
            <Text
              numberOfLines={1}
              style={styles.teamPointsBreakdownPlayerName}
            >
              {playerName}
            </Text>
            <Text numberOfLines={1} style={styles.mutedText}>
              {roleLabel}
              {leadershipLabel ? " · " + leadershipLabel : ""}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.teamPointsBreakdownManagerPoints,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {formatFantasyPointsValue(item.managerPoints)}
        </Text>
      </View>

      <View style={styles.teamPointsBreakdownMiniGrid}>
        <View style={styles.teamPointsBreakdownMiniCell}>
          <Text style={styles.teamPointsBreakdownMiniLabel}>
            {t("team.pointsBreakdownRaw")}
          </Text>
          <Text
            style={[
              styles.teamPointsBreakdownMiniValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatFantasyPointsValue(item.rawPlayerPoints)}
          </Text>
        </View>
        <View style={styles.teamPointsBreakdownMiniCell}>
          <Text style={styles.teamPointsBreakdownMiniLabel}>
            {t("team.pointsBreakdownMultiplier")}
          </Text>
          <Text
            style={[
              styles.teamPointsBreakdownMiniValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {"×" + formatFantasyPointsValue(item.multiplier)}
          </Text>
        </View>
        <View style={styles.teamPointsBreakdownMiniCell}>
          <Text style={styles.teamPointsBreakdownMiniLabel}>
            {t("team.pointsBreakdownRole")}
          </Text>
          <Text
            style={[
              styles.teamPointsBreakdownMiniValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatFantasyPointsValue(item.rolePoints)}
          </Text>
        </View>
        <View style={styles.teamPointsBreakdownMiniCell}>
          <Text style={styles.teamPointsBreakdownMiniLabel}>
            {t("team.pointsBreakdownManager")}
          </Text>
          <Text
            style={[
              styles.teamPointsBreakdownMiniValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatFantasyPointsValue(item.managerPoints)}
          </Text>
        </View>
      </View>

      {item.lines.length > 0 || hasCaptainBonus ? (
        <View style={styles.teamPointsBreakdownLines}>
          {item.lines.map((line) => (
            <View
              key={`${line.kind}-${line.count ?? "none"}`}
              style={styles.teamPointsBreakdownLine}
            >
              <Text style={styles.teamPointsBreakdownLineLabel}>
                {t(POINT_LINE_LABEL_KEYS[line.kind])}
                {line.count !== null ? " · " + line.count : ""}
              </Text>
              <Text style={styles.teamPointsBreakdownLineValue}>
                {formatSignedFantasyPoints(line.points)}
              </Text>
            </View>
          ))}
          {hasCaptainBonus ? (
            <View style={styles.teamPointsBreakdownLine}>
              <Text style={styles.teamPointsBreakdownLineLabel}>
                {t("team.pointsBreakdownCaptain")}
              </Text>
              <Text style={styles.teamPointsBreakdownLineValue}>
                {formatSignedFantasyPoints(item.captainBonusPoints)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.teamPointsBreakdownEmptyLine}>
          {t("team.pointsBreakdownNoPlayerLines")}
        </Text>
      )}
    </View>
  );
}

function TeamPointsGameweekDetailsCard({
  breakdown,
  playersById,
}: {
  breakdown: GameweekPointsBreakdownData;
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const visiblePlayers = getVisibleBreakdownPlayers(breakdown);
  const gameweekTitle = breakdown.gameweek
    ? t("team.pointsBreakdownGameweekTitle").replace(
        "{number}",
        String(breakdown.gameweek.number),
      )
    : t("team.pointsBreakdownEmpty");

  return (
    <View style={styles.teamPointsDetailsGameweekCard}>
      <View style={styles.teamPointsDetailsGameweekHeader}>
        <View style={styles.teamPointsDetailsGameweekTitleGroup}>
          <Text style={styles.teamPointsDetailsGameweekTitle}>
            {gameweekTitle}
          </Text>
          {breakdown.score?.totalPointsAfterGameweek !== null &&
          breakdown.score?.totalPointsAfterGameweek !== undefined ? (
            <Text style={styles.mutedText}>
              {t("team.pointsBreakdownAfterGameweek")}:{" "}
              {formatFantasyPointsValue(
                breakdown.score.totalPointsAfterGameweek,
              )}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.teamPointsDetailsGameweekPoints,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {formatFantasyPointsValue(breakdown.score?.points)}
        </Text>
      </View>

      <View style={styles.teamPointsBreakdownSummary}>
        <TeamOverviewRow
          label={t("team.pointsBreakdownBase")}
          value={formatFantasyPointsValue(breakdown.score?.basePoints)}
        />
        <TeamOverviewRow
          label={t("team.pointsBreakdownCaptain")}
          value={formatSignedFantasyPoints(breakdown.score?.captainBonusPoints)}
        />
        <TeamOverviewRow
          label={t("team.pointsBreakdownTotal")}
          value={formatFantasyPointsValue(breakdown.score?.points)}
        />
      </View>

      {visiblePlayers.length === 0 ? (
        <Text style={styles.mutedText}>{t("team.pointsBreakdownEmpty")}</Text>
      ) : (
        <View style={styles.teamPointsBreakdownList}>
          {visiblePlayers.map((item) => (
            <TeamPointsDetailsPlayerCard
              item={item}
              key={item.player?.id ?? item.rosterSlot}
              playersById={playersById}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function TeamPointsDetailsScreen({
  breakdown,
  onBack,
  playersById,
  totalPointsFallback,
}: {
  breakdown: SeasonPointsBreakdown;
  onBack: () => void;
  playersById: Map<Id<"fantasyPlayers">, FantasyPlayer>;
  totalPointsFallback: string;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const gameweeks = breakdown?.gameweeks ?? [];
  const deductions = breakdown?.deductions ?? [];
  const hasContent = gameweeks.length > 0 || deductions.length > 0;
  const overallPointsValue = breakdown
    ? formatFantasyPointsValue(breakdown.overallPoints)
    : totalPointsFallback;

  return (
    <View style={styles.teamPointsDetailsScreen}>
      <View style={styles.teamWorkspaceHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.teamWorkspaceBackButton,
            { backgroundColor: fantasyTheme.softColor },
          ]}
        >
          <ArrowLeft
            color={fantasyTheme.primaryColor}
            size={22}
            strokeWidth={2.5}
          />
        </Pressable>
        <View style={styles.teamWorkspaceTitleGroup}>
          <Text style={styles.teamWorkspaceTitle}>
            {t("team.pointsBreakdownTitle")}
          </Text>
          <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
            {t("team.overview.overallPoints")}
          </Text>
        </View>
        <View style={styles.teamWorkspaceHeaderSpacer} />
      </View>

      <View
        style={[
          styles.teamPointsDetailsHero,
          { backgroundColor: fantasyTheme.primaryColor },
        ]}
      >
        <Text style={styles.teamPointsDetailsHeroLabel}>
          {t("team.overview.overallPoints")}
        </Text>
        <Text style={styles.teamPointsDetailsHeroValue}>
          {overallPointsValue}
        </Text>
        <Text style={styles.teamPointsDetailsHeroText}>
          {t("team.pointsBreakdownDescription")}
        </Text>
      </View>

      {breakdown === undefined ? (
        <View style={[styles.teamBuilderPanel, styles.centerBlock]}>
          <ActivityIndicator color={fantasyTheme.primaryColor} />
          <Text style={styles.mutedText}>{t("common.loading")}</Text>
        </View>
      ) : !breakdown || !hasContent ? (
        <View style={styles.teamBuilderPanel}>
          <Text style={styles.sectionTitle}>
            {t("team.pointsBreakdownEmpty")}
          </Text>
          <Text style={styles.mutedText}>
            {t("team.pointsBreakdownEmptyDescription")}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.teamPointsBreakdownSummary}>
            <TeamOverviewRow
              label={t("team.pointsBreakdownGameweekPoints")}
              value={formatFantasyPointsValue(breakdown.gameweekPoints)}
            />
            <TeamOverviewRow
              label={t("team.pointsBreakdownDeductions")}
              value={formatSignedFantasyPoints(
                -Math.abs(breakdown.deductionPoints),
              )}
              valueTone={breakdown.deductionPoints > 0 ? "danger" : undefined}
            />
            <TeamOverviewRow
              label={t("team.overview.overallPoints")}
              value={overallPointsValue}
            />
          </View>

          {deductions.length > 0 ? (
            <View style={styles.teamPointsDetailsDeductionsCard}>
              <Text style={styles.teamPointsDetailsSectionTitle}>
                {t("team.pointsBreakdownDeductionsTitle")}
              </Text>
              <View style={styles.teamPointsBreakdownLines}>
                {deductions.map((deduction) => (
                  <View
                    key={deduction.id}
                    style={styles.teamPointsBreakdownLine}
                  >
                    <Text style={styles.teamPointsBreakdownLineLabel}>
                      {deduction.source === "transfer"
                        ? t("team.pointsBreakdownPenalty")
                        : deduction.reason ||
                          t("team.pointsBreakdownDeductions")}
                    </Text>
                    <Text style={styles.teamPointsBreakdownLineValue}>
                      {formatSignedFantasyPoints(-Math.abs(deduction.points))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.teamPointsDetailsGameweekList}>
            {gameweeks.map((gameweekBreakdown) => (
              <TeamPointsGameweekDetailsCard
                breakdown={gameweekBreakdown}
                key={
                  gameweekBreakdown.gameweek?.id ?? gameweekBreakdown.team.id
                }
                playersById={playersById}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function TeamChipTokenRail({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <View style={styles.teamChipTokenRail}>
      <View
        style={[styles.teamChipTokenCard, styles.teamChipTokenCardDisabled]}
      >
        <Shirt color={colors.text.muted} size={22} strokeWidth={2.4} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.teamChipTokenTitle, styles.teamChipTokenTitleDisabled]}
        >
          {t("team.overview.benchBoost")}
        </Text>
        <Text
          style={[
            styles.teamChipTokenStatus,
            styles.teamChipTokenStatusDisabled,
          ]}
        >
          {t("team.chips.soon")}
        </Text>
      </View>
      <View
        style={[styles.teamChipTokenCard, styles.teamChipTokenCardDisabled]}
      >
        <Check color={colors.text.muted} size={22} strokeWidth={2.8} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.teamChipTokenTitle, styles.teamChipTokenTitleDisabled]}
        >
          {t("team.overview.tripleCaptain")}
        </Text>
        <Text
          style={[
            styles.teamChipTokenStatus,
            styles.teamChipTokenStatusDisabled,
          ]}
        >
          {t("team.chips.soon")}
        </Text>
      </View>
      <View
        style={[styles.teamChipTokenCard, styles.teamChipTokenCardDisabled]}
      >
        <BookOpen color={colors.text.muted} size={22} strokeWidth={2.4} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.teamChipTokenTitle, styles.teamChipTokenTitleDisabled]}
        >
          {t("team.overview.wildcard")}
        </Text>
        <Text
          style={[
            styles.teamChipTokenStatus,
            styles.teamChipTokenStatusDisabled,
          ]}
        >
          {t("team.chips.soon")}
        </Text>
      </View>
      <View
        style={[styles.teamChipTokenCard, styles.teamChipTokenCardDisabled]}
      >
        <Repeat2 color={colors.text.muted} size={22} strokeWidth={2.4} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.teamChipTokenTitle, styles.teamChipTokenTitleDisabled]}
        >
          {t("team.overview.freeHit")}
        </Text>
        <Text
          style={[
            styles.teamChipTokenStatus,
            styles.teamChipTokenStatusDisabled,
          ]}
        >
          {t("team.chips.soon")}
        </Text>
      </View>
    </View>
  );
}

function TeamWorkspaceHeader({
  deadlineValue,
  gameweekLabel,
  mode,
  onBack,
  onRightAction,
  rightActionLabel,
  t,
  titleOverride,
}: {
  deadlineValue: string;
  gameweekLabel: string;
  mode: TeamWorkspaceMode;
  onBack: () => void;
  onRightAction?: () => void;
  rightActionLabel?: string;
  t: (key: TranslationKey) => string;
  titleOverride?: string;
}) {
  const fantasyTheme = useFantasySeasonTheme();
  const title =
    titleOverride ??
    (mode === "transfers"
      ? t("team.dashboard.transfersButton")
      : t("team.dashboard.pickTeamButton"));

  return (
    <View style={styles.teamWorkspaceHeader}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={[
          styles.teamWorkspaceBackButton,
          { backgroundColor: fantasyTheme.softColor },
        ]}
      >
        <ArrowLeft
          color={fantasyTheme.primaryColor}
          size={22}
          strokeWidth={2.5}
        />
      </Pressable>
      <View style={styles.teamWorkspaceTitleGroup}>
        <Text style={styles.teamWorkspaceTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
          <Text style={styles.teamWorkspaceGameweek}>{gameweekLabel}</Text>
          <Text>{" · " + t("team.dashboard.deadlineLabel") + ": "}</Text>
          <Text
            style={[
              styles.teamWorkspaceDeadlineValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {deadlineValue}
          </Text>
        </Text>
      </View>
      {onRightAction && rightActionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRightAction}
          style={[
            styles.teamWorkspaceHeaderActionButton,
            { backgroundColor: fantasyTheme.primaryColor },
          ]}
        >
          <Text style={styles.teamWorkspaceHeaderActionText}>
            {rightActionLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.teamWorkspaceHeaderSpacer} />
      )}
    </View>
  );
}

function TransferSummaryBar({
  bankValue,
  freeTransfersValue,
  isBankNegative,
  squadValue,
  t,
}: {
  bankValue: string;
  freeTransfersValue: string;
  isBankNegative: boolean;
  squadValue: string;
  t: (key: TranslationKey) => string;
}) {
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <View style={styles.teamTransferSummaryBar}>
      <View style={styles.teamTransferSummaryItem}>
        <Text
          style={[
            styles.teamTransferSummaryValue,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {freeTransfersValue}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.teamTransferSummaryLabel}
        >
          {t("team.freeTransfersLabel")}
        </Text>
      </View>
      <View style={styles.teamTransferSummaryItem}>
        <Text
          style={[
            styles.teamTransferSummaryValue,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {squadValue}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.teamTransferSummaryLabel}
        >
          {t("team.teamValueLabel")}
        </Text>
      </View>
      <View
        style={[
          styles.teamTransferSummaryItemActive,
          isBankNegative ? styles.teamTransferSummaryItemDanger : null,
        ]}
      >
        <Text
          style={[
            styles.teamTransferSummaryValueActive,
            isBankNegative ? styles.teamTransferSummaryValueDanger : null,
          ]}
        >
          {bankValue}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={[
            styles.teamTransferSummaryLabelActive,
            isBankNegative ? styles.teamTransferSummaryLabelDanger : null,
          ]}
        >
          {t("team.bankLabel")}
        </Text>
      </View>
    </View>
  );
}

function TransferMiniPlayer({
  player,
  t,
  tone,
}: {
  player: FantasyPlayer;
  t: (key: TranslationKey) => string;
  tone?: "incoming" | "outgoing";
}) {
  return (
    <View style={styles.transferMiniPlayer}>
      <TeamKitAvatar
        clubName={player.clubName}
        displayName={player.displayName}
        position={player.position}
        size="sm"
      />
      <View style={styles.transferMiniPlayerTextGroup}>
        <Text numberOfLines={1} style={styles.transferMiniPlayerName}>
          {player.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.transferMiniPlayerMeta}>
          {player.clubName ?? t("players.noClub")}
        </Text>
      </View>
      <Text
        style={[
          styles.transferMiniPlayerArrow,
          tone === "incoming" ? styles.transferMiniPlayerArrowIn : null,
          tone === "outgoing" ? styles.transferMiniPlayerArrowOut : null,
        ]}
      >
        {tone === "incoming" ? "←" : tone === "outgoing" ? "→" : ""}
      </Text>
    </View>
  );
}

function IncomingTransferCard({
  onClear,
  player,
  t,
}: {
  onClear: () => void;
  player: FantasyPlayer;
  t: (key: TranslationKey) => string;
}) {
  const fantasyTheme = useFantasySeasonTheme();

  return (
    <View style={styles.incomingTransferPanel}>
      <View
        style={[
          styles.incomingTransferHeader,
          { backgroundColor: fantasyTheme.primaryColor },
        ]}
      >
        <Repeat2 color={colors.text.inverse} size={16} strokeWidth={2.4} />
        <Text style={styles.incomingTransferHeaderText}>
          {t("team.transfers.incomingPlayer")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          style={styles.incomingTransferClearButton}
        >
          <Text style={styles.incomingTransferClearText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.incomingTransferTableRow}>
        <View style={styles.incomingTransferPlayerCell}>
          <FantasyPlayerStatusBadge status={player.status} t={t} size="sm" />
          <TeamKitAvatar
            clubName={player.clubName}
            displayName={player.displayName}
            position={player.position}
            size="sm"
          />
          <View style={styles.squadListPlayerGroup}>
            <Text numberOfLines={1} style={styles.squadListName}>
              {player.displayName}
            </Text>
            <Text numberOfLines={1} style={styles.squadListMeta}>
              {player.clubName ?? t("players.noClub")}
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          bounces={false}
          disableScrollViewPanResponder
          directionalLockEnabled
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.squadListStatsScroll}
        >
          <View style={styles.squadListStatsRow}>
            <View style={styles.squadListStatCell}>
              <Text style={styles.incomingTransferMetricLabel}>
                {t("team.list.form")}
              </Text>
              <Text style={styles.squadListStatText}>
                {formatSquadListMetric(player.lastGameweekPoints)}
              </Text>
            </View>
            <View style={styles.squadListPriceCell}>
              <Text style={styles.incomingTransferMetricLabel}>
                {t("team.transfers.price")}
              </Text>
              <Text style={styles.squadListStatText}>
                {formatFantasyMoney(player.price)}
              </Text>
            </View>
            <View style={styles.squadListStatCell}>
              <Text style={styles.incomingTransferMetricLabel}>
                {t("team.list.points")}
              </Text>
              <Text style={styles.squadListStatText}>
                {formatSquadListMetric(player.seasonPoints)}
              </Text>
            </View>
            <View style={styles.squadListGameweeksCell}>
              <Text style={styles.incomingTransferMetricLabel}>
                {t("season.stats.appsShort")}
              </Text>
              <Text style={styles.squadListStatText}>
                {formatWholeNumber(player.appearances)}
              </Text>
            </View>
            <View style={styles.squadListSelectedCell}>
              <Text style={styles.incomingTransferMetricLabel}>
                {t("team.list.selected")}
              </Text>
              <Text style={styles.squadListStatText}>
                {formatSquadListPercent(player.selectedPercent)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function TransferReviewScreen({
  additionalTransfersUsed,
  bankValue,
  changes,
  isBankNegative,
  deadlineValue,
  freeTransfersUsed,
  gameweekLabel,
  pointsSpentValue,
  hasPointsPenalty,
  t,
}: {
  additionalTransfersUsed: number;
  bankValue: string;
  changes: TransferChange[];
  deadlineValue: string;
  freeTransfersUsed: number;
  gameweekLabel: string;
  hasPointsPenalty: boolean;
  isBankNegative: boolean;
  pointsSpentValue: string;
  t: (key: TranslationKey) => string;
}) {
  const fantasyTheme = useFantasySeasonTheme();
  const transferCount = changes.length;

  return (
    <>
      <View style={styles.transferReviewCard}>
        <View
          style={[
            styles.transferReviewBanner,
            { backgroundColor: fantasyTheme.softColor },
          ]}
        >
          <Text
            style={[
              styles.transferReviewBannerText,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {t("team.transfers.reviewBanner").replace(
              "{count}",
              String(transferCount),
            )}
          </Text>
        </View>

        <View style={styles.transferReviewColumnsHeader}>
          <Text style={styles.transferReviewColumnTitle}>
            {t("team.transfers.transferOut")}
          </Text>
          <Repeat2
            color={fantasyTheme.primaryColor}
            size={22}
            strokeWidth={2.4}
          />
          <Text style={styles.transferReviewColumnTitle}>
            {t("team.transfers.transferIn")}
          </Text>
        </View>

        <View style={styles.transferReviewRows}>
          {changes.map((change) => (
            <View key={change.slot.rosterSlot} style={styles.transferReviewRow}>
              <TransferMiniPlayer
                player={change.outgoingPlayer}
                t={t}
                tone="outgoing"
              />
              <TransferMiniPlayer
                player={change.incomingPlayer}
                t={t}
                tone="incoming"
              />
            </View>
          ))}
        </View>

        <Text style={styles.transferReviewNote}>
          {t("team.transfers.reviewNote")
            .replace("{gameweek}", gameweekLabel)
            .replace("{deadline}", deadlineValue)}
        </Text>
      </View>

      <View style={styles.transferReviewCard}>
        <Text style={styles.transferReviewSectionTitle}>
          {t("team.transfers.pointsOverview")}
        </Text>
        <TeamOverviewRow
          label={t("team.transfers.freeTransfersUsed")}
          value={String(freeTransfersUsed)}
        />
        <TeamOverviewRow
          label={t("team.transfers.additionalTransfersUsed")}
          value={String(additionalTransfersUsed)}
        />
        <TeamOverviewRow
          label={t("team.transfers.pointsSpent")}
          value={pointsSpentValue}
          valueTone={hasPointsPenalty ? "danger" : undefined}
        />
        <TeamOverviewRow
          label={t("team.transfers.leftInBank")}
          value={bankValue}
          valueTone={isBankNegative ? "danger" : "success"}
        />
      </View>
    </>
  );
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function formatPlayerCurrentSeasonPoints(
  player: FantasyPlayer,
  t: (key: TranslationKey) => string,
) {
  return `${t("market.fantasyPointsShort")} ${Number((player.seasonPoints ?? 0).toFixed(1))}`;
}

function getSlotLabel(
  slot: SquadSlotDefinition,
  t: (key: TranslationKey) => string,
) {
  const prefix =
    slot.squadRole === "starter"
      ? t("team.slot.starterPrefix")
      : slot.squadRole === "bench"
        ? t("team.slot.benchPrefix")
        : t("team.slot.reservePrefix");
  return prefix + " " + slot.order;
}

function canSlotHaveLeadership(slot: SquadSlotDefinition) {
  return slot.squadRole !== "reserve";
}

function getLeadershipSlotAfterSwap(
  currentLeadershipSlot: number | null,
  sourceSlot: SquadSlotDefinition,
  targetSlot: SquadSlotDefinition,
) {
  if (!currentLeadershipSlot) return null;

  const sourceRosterSlot = sourceSlot.rosterSlot;
  const targetRosterSlot = targetSlot.rosterSlot;
  const isSourceLeadershipSlot = currentLeadershipSlot === sourceRosterSlot;
  const isTargetLeadershipSlot = currentLeadershipSlot === targetRosterSlot;

  if (!isSourceLeadershipSlot && !isTargetLeadershipSlot) {
    return currentLeadershipSlot;
  }

  const sourceCanHaveLeadership = canSlotHaveLeadership(sourceSlot);
  const targetCanHaveLeadership = canSlotHaveLeadership(targetSlot);

  if (sourceCanHaveLeadership && targetCanHaveLeadership) {
    return isSourceLeadershipSlot ? targetRosterSlot : sourceRosterSlot;
  }

  if (sourceCanHaveLeadership) return sourceRosterSlot;
  if (targetCanHaveLeadership) return targetRosterSlot;

  return null;
}

function getDraftPlayers(draftPicks: DraftPicks) {
  return SQUAD_SLOT_DEFINITIONS.map(
    (slot) => draftPicks[slot.rosterSlot],
  ).filter((player): player is FantasyPlayer => Boolean(player));
}

function getSelectedPlayerIds(draftPicks: DraftPicks) {
  return new Set(getDraftPlayers(draftPicks).map((player) => player.id));
}

function getTransferChanges(
  previousDraftPicks: DraftPicks,
  nextDraftPicks: DraftPicks,
) {
  return SQUAD_SLOT_DEFINITIONS.map((slot) => {
    const outgoingPlayer = previousDraftPicks[slot.rosterSlot];
    const incomingPlayer = nextDraftPicks[slot.rosterSlot];

    if (!outgoingPlayer || !incomingPlayer) return null;
    if (outgoingPlayer.id === incomingPlayer.id) return null;

    return { incomingPlayer, outgoingPlayer, slot };
  }).filter((change): change is TransferChange => Boolean(change));
}

function getDraftPlayersExcludingSlot(
  draftPicks: DraftPicks,
  rosterSlot: number,
) {
  return SQUAD_SLOT_DEFINITIONS.map((slot) =>
    slot.rosterSlot === rosterSlot ? null : draftPicks[slot.rosterSlot],
  ).filter((player): player is FantasyPlayer => Boolean(player));
}

function getClubLimitViolation(
  players: FantasyPlayer[],
  maxPlayers = MAX_PLAYERS_PER_CLUB,
) {
  const clubCounts = new Map<string, { clubName: string; count: number }>();

  for (const player of players) {
    if (!player.clubId) continue;

    const current = clubCounts.get(player.clubId) ?? {
      clubName: player.clubName ?? "",
      count: 0,
    };
    clubCounts.set(player.clubId, {
      clubName: current.clubName || player.clubName || "",
      count: current.count + 1,
    });
  }

  return (
    Array.from(clubCounts.values()).find((club) => club.count > maxPlayers) ??
    null
  );
}

function wouldExceedClubLimitForSlot(
  draftPicks: DraftPicks,
  rosterSlot: number,
  player: FantasyPlayer,
) {
  if (!player.clubId) return false;

  const playersWithoutSlot = getDraftPlayersExcludingSlot(
    draftPicks,
    rosterSlot,
  );
  const selectedFromClub = playersWithoutSlot.filter(
    (selectedPlayer) => selectedPlayer.clubId === player.clubId,
  ).length;

  return selectedFromClub >= MAX_PLAYERS_PER_CLUB;
}

function getIncomingTransferSlotBlockerReason(
  slot: SquadSlotDefinition,
  incomingPlayer: FantasyPlayer,
  draftPicks: DraftPicks,
  selectedPlayerIds: Set<Id<"fantasyPlayers">>,
  budgetRemaining: number | undefined,
): IncomingTransferSlotBlockerReason | null {
  if (slot.position !== incomingPlayer.position) return "position";

  const outgoingPlayer = draftPicks[slot.rosterSlot];
  if (outgoingPlayer?.id === incomingPlayer.id) return "alreadySelected";
  if (selectedPlayerIds.has(incomingPlayer.id)) return "alreadySelected";

  const nextBudgetRemaining =
    typeof budgetRemaining === "number"
      ? Number(
          (
            budgetRemaining +
            (outgoingPlayer?.price ?? 0) -
            incomingPlayer.price
          ).toFixed(1),
        )
      : undefined;
  if (
    typeof nextBudgetRemaining === "number" &&
    nextBudgetRemaining < -0.0001
  ) {
    return "budget";
  }

  if (
    wouldExceedClubLimitForSlot(draftPicks, slot.rosterSlot, incomingPlayer)
  ) {
    return "clubLimit";
  }

  return null;
}

function formatClubLimitMessage(
  clubName: string | null | undefined,
  t: (key: TranslationKey) => string,
) {
  return t("team.builder.clubLimitExceeded")
    .replace("{limit}", String(MAX_PLAYERS_PER_CLUB))
    .replace("{club}", clubName || t("players.noClub"));
}

function formatIncomingTransferClubLimitMessage(
  clubName: string | null | undefined,
  t: (key: TranslationKey) => string,
) {
  return t("team.transfers.noAvailableReplacementsClubLimit")
    .replace("{limit}", String(MAX_PLAYERS_PER_CLUB))
    .replace("{club}", clubName || t("players.noClub"));
}

function createDraftSignature(
  draftPicks: DraftPicks,
  teamName: string,
  captainSlot: number | null,
  viceCaptainSlot: number | null,
) {
  const picksSignature = SQUAD_SLOT_DEFINITIONS.map((slot) => {
    const player = draftPicks[slot.rosterSlot];
    return String(slot.rosterSlot) + ":" + (player?.id ?? "empty");
  }).join("|");

  return (
    teamName.trim() +
    "::" +
    picksSignature +
    "::C" +
    (captainSlot ?? "none") +
    "::VC" +
    (viceCaptainSlot ?? "none")
  );
}

type TeamDraftState = {
  captainSlot: number | null;
  draftPicks: DraftPicks;
  teamName: string;
  viceCaptainSlot: number | null;
};

function createDraftStateFromFantasyTeam(
  fantasyTeam: FantasyTeam,
): TeamDraftState {
  const draftPicks = createEmptyDraftPicks();
  let captainSlot: number | null = null;
  let viceCaptainSlot: number | null = null;

  for (const pick of fantasyTeam?.picks ?? []) {
    if (!SQUAD_SLOT_NUMBERS.has(pick.rosterSlot)) continue;

    if (pick.player) {
      draftPicks[pick.rosterSlot] = pick.player;
    }
    if (pick.isCaptain) captainSlot = pick.rosterSlot;
    if (pick.isViceCaptain) viceCaptainSlot = pick.rosterSlot;
  }

  return {
    captainSlot,
    draftPicks,
    teamName: fantasyTeam?.name ?? "",
    viceCaptainSlot,
  };
}

function createFantasyTeamDraftSignature(fantasyTeam: FantasyTeam) {
  if (fantasyTeam === undefined) return "loading";
  if (fantasyTeam === null) return "empty";

  const picksByRosterSlot = new Map(
    fantasyTeam.picks.map((pick) => [pick.rosterSlot, pick]),
  );
  const picksSignature = SQUAD_SLOT_DEFINITIONS.map((slot) => {
    const pick = picksByRosterSlot.get(slot.rosterSlot);
    return (
      String(slot.rosterSlot) +
      ":" +
      (pick?.player?.id ?? "empty") +
      ":" +
      String(Boolean(pick?.isCaptain)) +
      ":" +
      String(Boolean(pick?.isViceCaptain))
    );
  }).join("|");

  return fantasyTeam.name + ":" + picksSignature;
}

function shouldUseSlotPositionOnly(slot: SquadSlotDefinition) {
  return (
    slot.squadRole === "starter" ||
    slot.squadRole === "bench" ||
    slot.squadRole === "reserve"
  );
}

function normalizePlayerShortLabel(label: string) {
  return label
    .trim()
    .replace(/^[([{]+/, "")
    .replace(/[)\]},]+$/g, "")
    .trim();
}

function getBracketAliasLabel(displayName: string) {
  const aliasMatch = displayName.match(/\(([^()]*)\)\s*$/);
  return aliasMatch?.[1]?.trim() ?? null;
}

function getPlayerSurnameLabel(displayName: string) {
  const fallbackLabel = displayName.trim();
  const labelSource = getBracketAliasLabel(fallbackLabel) ?? fallbackLabel;
  const nameParts = labelSource.split(/\s+/).filter(Boolean);
  const rawLabel = nameParts.at(-1) ?? labelSource;
  return normalizePlayerShortLabel(rawLabel) || fallbackLabel;
}

function shouldShowPlayerStatusWarning(
  player: FantasyPlayer | null | undefined,
) {
  return Boolean(player && player.status !== "active");
}

function isDoubtfulPlayer(player: FantasyPlayer | null | undefined) {
  return player?.status === "doubtful";
}

function FutsalSquadSlotCircle({
  isIncomingTransfer = false,
  leadershipRole,
  onPress,
  player,
  positionShortLabel,
  showPlayerPrice = false,
  size = "field",
  swapState,
}: FutsalSquadSlotCircleProps) {
  const fantasyTheme = useFantasySeasonTheme();
  const leadershipLabel =
    leadershipRole === "captain"
      ? "C"
      : leadershipRole === "viceCaptain"
        ? "VC"
        : null;
  const avatarSize = showPlayerPrice ? "sm" : size === "side" ? "md" : "lg";
  const playerSlotLabel = player
    ? getPlayerSurnameLabel(player.displayName)
    : "";
  const hasStatusWarning = shouldShowPlayerStatusWarning(player);
  const isDoubtfulStatus = isDoubtfulPlayer(player);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={swapState === "unavailable"}
      onPress={onPress}
      style={[
        styles.futsalSquadSlotButton,
        size === "side" ? styles.futsalSquadSlotButtonSide : null,
        player ? styles.futsalSquadSlotButtonFilled : null,
        player && showPlayerPrice ? styles.futsalSquadSlotButtonPriced : null,
        isIncomingTransfer ? styles.futsalSquadSlotButtonIncoming : null,
        swapState === "source" ? styles.squadSlotSwapSource : null,
        swapState === "candidate" ? styles.squadSlotSwapCandidate : null,
        swapState === "unavailable" ? styles.squadSlotSwapUnavailable : null,
      ]}
    >
      {leadershipLabel ? (
        <Text
          style={[
            styles.futsalSquadLeadershipBadge,
            { backgroundColor: fantasyTheme.primaryColor },
            leadershipRole === "viceCaptain"
              ? [
                  styles.futsalSquadLeadershipBadgeVice,
                  { backgroundColor: fantasyTheme.secondaryColor },
                ]
              : null,
          ]}
        >
          {leadershipLabel}
        </Text>
      ) : null}
      {hasStatusWarning ? (
        <View style={styles.futsalSquadStatusBadge}>
          <View
            style={[
              styles.futsalSquadStatusTriangle,
              isDoubtfulStatus
                ? styles.futsalSquadStatusTriangleDoubtful
                : null,
            ]}
          />
          <Text
            style={[
              styles.futsalSquadStatusBadgeText,
              isDoubtfulStatus
                ? styles.futsalSquadStatusBadgeTextDoubtful
                : null,
            ]}
          >
            {isDoubtfulStatus ? "?" : "!"}
          </Text>
        </View>
      ) : null}
      {player && showPlayerPrice ? (
        <Text numberOfLines={1} style={styles.futsalSquadSlotPrice}>
          {formatFantasyMoney(player.price)}
        </Text>
      ) : null}
      {player ? (
        <TeamKitAvatar
          clubName={player.clubName}
          displayName={player.displayName}
          position={player.position}
          size={avatarSize}
          variant="slot"
        />
      ) : (
        <View style={styles.futsalSquadSlotPlaceholder}>
          <View
            style={[
              styles.futsalSquadSlotAddBadge,
              { backgroundColor: fantasyTheme.primaryColor },
            ]}
          >
            <Plus
              color={colors.text.inverse}
              size={size === "side" ? 13 : 15}
              strokeWidth={3}
            />
          </View>
          <Text
            style={[
              styles.futsalSquadSlotPosition,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {positionShortLabel}
          </Text>
        </View>
      )}
      {player ? (
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          numberOfLines={1}
          style={[
            styles.futsalSquadSlotName,
            player && showPlayerPrice ? styles.futsalSquadSlotNamePriced : null,
            hasStatusWarning
              ? isDoubtfulStatus
                ? styles.futsalSquadSlotNameDoubtful
                : styles.futsalSquadSlotNameWarning
              : null,
          ]}
        >
          {playerSlotLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FutsalRosterLayout({
  captainSlot,
  draftPicks,
  getSlotSwapState,
  incomingPlayerIds,
  onSlotPress,
  showLeadershipBadges = true,
  showPlayerPrices = false,
  slots,
  viceCaptainSlot,
}: FutsalRosterLayoutProps) {
  const { t } = useI18n();
  const goalkeepers = slots.filter((slot) => slot.position === "goalkeeper");
  const universalRows = [
    slots.filter((slot) => slot.position === "universal").slice(0, 5),
    slots.filter((slot) => slot.position === "universal").slice(5, 10),
  ];
  const renderSlot = (slot: SquadSlotDefinition) => {
    const player = draftPicks[slot.rosterSlot];
    return (
      <FutsalSquadSlotCircle
        key={slot.rosterSlot}
        leadershipRole={
          showLeadershipBadges
            ? captainSlot === slot.rosterSlot
              ? "captain"
              : viceCaptainSlot === slot.rosterSlot
                ? "viceCaptain"
                : null
            : null
        }
        isIncomingTransfer={Boolean(
          player && incomingPlayerIds?.has(player.id),
        )}
        onPress={() => onSlotPress(slot)}
        player={player}
        positionShortLabel={
          slot.position === "goalkeeper"
            ? t("players.positionShort.goalkeeper")
            : t("players.positionShort.universal")
        }
        showPlayerPrice={showPlayerPrices}
        size="side"
        swapState={getSlotSwapState(slot)}
      />
    );
  };

  return (
    <View style={styles.futsalRosterLayout}>
      <View
        style={[
          styles.futsalRosterFieldFrame,
          {
            backgroundColor: colors.brand.blueSoft,
            borderColor: colors.brand.blueDark,
          },
        ]}
      >
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="cover"
          recyclingKey="futsal-field"
          source={FUTSAL_FIELD_IMAGE}
          style={styles.futsalFieldImage}
        />
        <View
          style={[styles.futsalRosterRow, styles.futsalRosterGoalkeeperRow]}
        >
          {goalkeepers.map(renderSlot)}
        </View>
        {universalRows.map((row, index) => (
          <View
            key={index}
            style={[
              styles.futsalRosterRow,
              index === 0
                ? styles.futsalRosterUniversalRowOne
                : styles.futsalRosterUniversalRowTwo,
            ]}
          >
            {row.map(renderSlot)}
          </View>
        ))}
      </View>
    </View>
  );
}

function FutsalSquadLayout({
  captainSlot,
  draftPicks,
  getSlotSwapState,
  incomingPlayerIds,
  onSlotPress,
  slots,
  viceCaptainSlot,
}: FutsalSquadLayoutProps) {
  const { t } = useI18n();
  const starters = slots.filter((slot) => slot.squadRole === "starter");
  const bench = slots.filter((slot) => slot.squadRole === "bench");
  const reserve = slots.filter((slot) => slot.squadRole === "reserve");
  const starterUniversals = starters.filter(
    (slot) => slot.position === "universal",
  );
  const starterGoalkeeper =
    starters.find((slot) => slot.position === "goalkeeper") ?? null;
  const fieldSlots = [
    starterGoalkeeper,
    starterUniversals[0] ?? null,
    starterUniversals[1] ?? null,
    starterUniversals[2] ?? null,
    starterUniversals[3] ?? null,
  ];
  const fieldSlotStyles = [
    styles.futsalFieldSlotGoalkeeper,
    styles.futsalFieldSlotLeftDeep,
    styles.futsalFieldSlotRightDeep,
    styles.futsalFieldSlotLeftHigh,
    styles.futsalFieldSlotRightHigh,
  ];

  const renderSlot = (
    slot: SquadSlotDefinition,
    size: "field" | "side" = "field",
  ) => {
    const player = draftPicks[slot.rosterSlot];
    return (
      <FutsalSquadSlotCircle
        key={slot.rosterSlot}
        leadershipRole={
          captainSlot === slot.rosterSlot
            ? "captain"
            : viceCaptainSlot === slot.rosterSlot
              ? "viceCaptain"
              : null
        }
        isIncomingTransfer={Boolean(
          player && incomingPlayerIds?.has(player.id),
        )}
        onPress={() => onSlotPress(slot)}
        player={player}
        positionShortLabel={
          slot.position === "goalkeeper"
            ? t("players.positionShort.goalkeeper")
            : t("players.positionShort.universal")
        }
        size={size}
        swapState={getSlotSwapState(slot)}
      />
    );
  };

  return (
    <View style={styles.futsalSquadLayout}>
      <View style={styles.futsalSquadMainRow}>
        <View
          style={[
            styles.futsalFieldFrame,
            {
              backgroundColor: colors.brand.blueSoft,
              borderColor: colors.brand.blueDark,
            },
          ]}
        >
          <Image
            {...FANTASY_STATIC_IMAGE_PROPS}
            contentFit="cover"
            recyclingKey="futsal-field"
            source={FUTSAL_FIELD_IMAGE}
            style={styles.futsalFieldImage}
          />
          {fieldSlots.map((slot, index) =>
            slot ? (
              <View
                key={slot.rosterSlot}
                style={[styles.futsalFieldSlot, fieldSlotStyles[index]]}
              >
                {renderSlot(slot)}
              </View>
            ) : null,
          )}
        </View>

        <View
          style={[
            styles.futsalBenchRail,
            { backgroundColor: colors.brand.blueDark },
          ]}
        >
          {bench.map((slot) => (
            <View key={slot.rosterSlot} style={styles.futsalBenchSlotWrap}>
              {renderSlot(slot, "side")}
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.futsalReserveRail,
          { backgroundColor: colors.brand.blueDark },
        ]}
      >
        {reserve.map((slot) => (
          <View key={slot.rosterSlot} style={styles.futsalReserveSlotWrap}>
            {renderSlot(slot, "side")}
          </View>
        ))}
      </View>
    </View>
  );
}

function FutsalSquadListLayout({
  captainSlot,
  clubsById,
  draftPicks,
  getSlotSwapState,
  incomingPlayerIds,
  onSlotPress,
  slots,
  viceCaptainSlot,
}: FutsalSquadLayoutProps & {
  clubsById: Map<Id<"fantasyClubs">, FantasyClub>;
}) {
  const { t } = useI18n();
  const goalkeeperSlots = slots.filter(
    (slot) => slot.position === "goalkeeper",
  );
  const universalSlots = slots.filter((slot) => slot.position === "universal");
  const sections = [
    {
      key: "goalkeepers",
      slots: goalkeeperSlots,
      title: t("team.list.goalkeepers"),
    },
    {
      key: "universals",
      slots: universalSlots,
      title: t("team.list.universals"),
    },
  ];

  const renderEmptyMetrics = () => (
    <View style={styles.playerPickerStatsMetrics}>
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.playerPickerStatsMetric,
            index === 0 ? styles.playerPickerStatsMetricFirst : null,
            index === 0 || index === 3
              ? styles.playerPickerStatsMetricWide
              : null,
          ]}
        >
          <Text numberOfLines={1} style={styles.playerPickerStatsMetricValue}>
            -
          </Text>
        </View>
      ))}
    </View>
  );

  const renderSlot = (slot: SquadSlotDefinition) => {
    const player = draftPicks[slot.rosterSlot];
    const leadershipRole =
      captainSlot === slot.rosterSlot
        ? "captain"
        : viceCaptainSlot === slot.rosterSlot
          ? "viceCaptain"
          : null;
    const leadershipLabel =
      leadershipRole === "captain"
        ? t("team.leadership.captainShort")
        : leadershipRole === "viceCaptain"
          ? t("team.leadership.viceCaptainShort")
          : null;
    const slotLabel = shouldUseSlotPositionOnly(slot)
      ? t(POSITION_LABEL_KEYS[slot.position])
      : getSlotLabel(slot, t);
    const positionShortLabel = t(
      slot.position === "goalkeeper"
        ? "players.positionShort.goalkeeper"
        : "players.positionShort.universal",
    );
    const hasStatusWarning = shouldShowPlayerStatusWarning(player);
    const isIncomingTransfer = Boolean(
      player && incomingPlayerIds?.has(player.id),
    );
    const rowStateStyle = [
      styles.squadListPlayerStatsRowWrap,
      isIncomingTransfer ? styles.squadListRowIncoming : null,
      hasStatusWarning ? styles.squadListRowWarning : null,
    ];

    if (player) {
      return (
        <View key={slot.rosterSlot} style={rowStateStyle}>
          <FantasyPlayerListRow
            club={player.clubId ? (clubsById.get(player.clubId) ?? null) : null}
            isHighlighted={isIncomingTransfer}
            onPress={() => onSlotPress(slot)}
            player={player}
            showStatsMarkerColumn
            statsMarkerLabel={leadershipLabel}
            t={t}
            variant="pickerStats"
          />
        </View>
      );
    }

    return (
      <View key={slot.rosterSlot} style={rowStateStyle}>
        <View style={styles.playerPickerStatsPlayerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSlotPress(slot)}
            style={styles.playerPickerStatsPlayerCell}
          >
            <View style={styles.squadListStatusPlaceholder} />
            <TeamKitAvatar
              displayName={slotLabel}
              isMuted
              position={slot.position}
              size="xs"
            />
            <View style={styles.playerPickerStatsPlayerMain}>
              <Text
                numberOfLines={1}
                style={styles.playerPickerStatsPlayerName}
              >
                {slotLabel}
              </Text>
              <Text numberOfLines={1} style={styles.playerPickerStatsClubName}>
                {positionShortLabel}
              </Text>
            </View>
          </Pressable>
          <View style={styles.playerPickerStatsMarkerCell} />
          {renderEmptyMetrics()}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.squadListPanel}>
      <ScrollView
        horizontal
        bounces={false}
        disableScrollViewPanResponder
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.squadListHorizontalScrollContent}
        style={styles.squadListHorizontalScroll}
      >
        <View style={styles.squadListStatsTable}>
          <FantasyPlayerPickerStatsHeader showStatsMarkerColumn t={t} />
          {sections.map((section) => (
            <View key={section.key} style={styles.squadListSection}>
              <View style={styles.squadSectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.slots.map(renderSlot)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CompactSquadCard({
  isIncomingTransfer = false,
  leadershipRole,
  onPress,
  player,
  positionLabel,
  swapState,
  title,
}: CompactSquadCardProps) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const leadershipLabel =
    leadershipRole === "captain"
      ? t("team.leadership.captainShort")
      : leadershipRole === "viceCaptain"
        ? t("team.leadership.viceCaptainShort")
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={swapState === "unavailable"}
      onPress={onPress}
      style={[
        styles.compactSquadCard,
        player ? null : styles.compactSquadCardEmpty,
        leadershipRole
          ? [
              styles.compactSquadCardLeader,
              { borderColor: fantasyTheme.primaryColor },
            ]
          : null,
        isIncomingTransfer ? styles.compactSquadCardIncoming : null,
        swapState === "source" ? styles.squadSlotSwapSource : null,
        swapState === "candidate" ? styles.squadSlotSwapCandidate : null,
        swapState === "unavailable" ? styles.squadSlotSwapUnavailable : null,
      ]}
    >
      <View style={styles.compactSquadCardTopRow}>
        <TeamKitAvatar
          clubName={player?.clubName}
          displayName={player?.displayName ?? title}
          isMuted={!player}
          position={player?.position}
          size="xs"
        />
        <View style={styles.compactSquadBadgeGroup}>
          {leadershipLabel ? (
            <Text
              style={[
                styles.compactLeadershipBadge,
                { backgroundColor: fantasyTheme.primaryColor },
                leadershipRole === "viceCaptain"
                  ? [
                      styles.compactLeadershipBadgeVice,
                      { backgroundColor: fantasyTheme.secondaryColor },
                    ]
                  : null,
              ]}
            >
              {leadershipLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} style={styles.compactSquadName}>
        {player?.displayName ?? title}
      </Text>
      <Text numberOfLines={1} style={styles.compactSquadMeta}>
        {player ? (player.clubName ?? t("players.noClub")) : positionLabel}
      </Text>
    </Pressable>
  );
}

function CompactSquadSection({
  badge,
  captainSlot,
  incomingPlayerIds,
  onSlotPress,
  slots,
  title,
  viceCaptainSlot,
  draftPicks,
  getSlotSwapState,
}: {
  badge: string;
  captainSlot: number | null;
  draftPicks: DraftPicks;
  incomingPlayerIds?: ReadonlySet<string>;
  getSlotSwapState: (
    slot: SquadSlotDefinition,
  ) => "candidate" | "source" | "unavailable" | null;
  onSlotPress: (slot: SquadSlotDefinition) => void;
  slots: SquadSlotDefinition[];
  title: string;
  viceCaptainSlot: number | null;
}) {
  const { t } = useI18n();
  const universalSlots = slots.filter((slot) => slot.position === "universal");
  const goalkeeperSlot =
    slots.find((slot) => slot.position === "goalkeeper") ?? null;

  const renderCard = (slot: SquadSlotDefinition) => {
    const player = draftPicks[slot.rosterSlot];

    return (
      <CompactSquadCard
        key={slot.rosterSlot}
        isIncomingTransfer={Boolean(
          player && incomingPlayerIds?.has(player.id),
        )}
        leadershipRole={
          captainSlot === slot.rosterSlot
            ? "captain"
            : viceCaptainSlot === slot.rosterSlot
              ? "viceCaptain"
              : null
        }
        onPress={() => onSlotPress(slot)}
        player={player}
        positionLabel={t(POSITION_LABEL_KEYS[slot.position])}
        swapState={getSlotSwapState(slot)}
        title={getSlotLabel(slot, t)}
      />
    );
  };

  return (
    <View style={styles.compactSquadSection}>
      <View style={styles.compactSquadHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.squadRoleBadge}>{badge}</Text>
      </View>
      <View style={styles.compactSquadFourRow}>
        {universalSlots.map(renderCard)}
      </View>
      {goalkeeperSlot ? (
        <View style={styles.compactSquadGoalkeeperRow}>
          <View style={styles.compactSquadGoalkeeperCardWrap}>
            {renderCard(goalkeeperSlot)}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function MyTeamScreen({
  fantasyClubs,
  fantasyOverview,
  fantasyPlayers,
  fantasyTeam,
  fantasyTeams,
  fantasySeason,
  fantasyGameweeks,
  isActive = true,
  managerName,
  onBottomTabsHiddenChange,
  onHeaderActionOverlayChange,
  onShellHeaderHiddenChange,
  onTopEdgeToEdgeChange,
}: {
  fantasyClubs: FantasyClub[] | undefined;
  fantasyOverview: FantasyOverview;
  fantasyPlayers: FantasyPlayers;
  fantasyTeam: FantasyTeam;
  fantasyTeams: FantasyLeagueTeam[] | undefined;
  fantasySeason?: FantasySeasonVisualSource | null;
  fantasyGameweeks: FantasyGameweek[] | undefined;
  isActive?: boolean;
  managerName: string;
  onBottomTabsHiddenChange?: (isHidden: boolean) => void;
  onHeaderActionOverlayChange?: (
    config: HeaderActionOverlayConfig | null,
  ) => void;
  onShellHeaderHiddenChange?: (isHidden: boolean) => void;
  onTopEdgeToEdgeChange?: (isEnabled: boolean) => void;
}) {
  const { language, t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const shouldUseTeamOverviewWideLayout = isDesktopWeb;
  const themedMarketFilterButtonActiveStyle = [
    styles.marketFilterButtonActive,
    {
      backgroundColor: fantasyTheme.primaryColor,
      borderColor: fantasyTheme.primaryColor,
    },
  ];
  const themedSeasonPickerOptionSelectedStyle = [
    styles.seasonPickerOptionSelected,
    {
      backgroundColor: fantasyTheme.softColor,
      borderColor: fantasyTheme.borderColor,
    },
  ];
  const themedClubPickerOptionSelectedStyle = [
    styles.clubPickerOptionSelected,
    {
      backgroundColor: fantasyTheme.softColor,
      borderColor: fantasyTheme.borderColor,
    },
  ];
  const themedFooterPrimaryButtonStyle = [
    styles.teamBuilderFooterPrimaryButton,
    { backgroundColor: fantasyTheme.primaryColor },
  ];
  const themedFooterSecondaryButtonStyle = [
    styles.teamBuilderFooterSecondaryButton,
    { borderColor: fantasyTheme.borderColor },
  ];
  const themedFooterSecondaryTextStyle = [
    styles.teamBuilderFooterSecondaryText,
    { color: fantasyTheme.primaryColor },
  ];
  const saveMyTeam = useMutation(api.fantasy.saveMyTeam);
  const updateFavoriteFantasyClub = useMutation(
    api.users.updateFavoriteFantasyClub,
  );
  const cancelDraftChangesRef = useRef<() => void>(() => undefined);
  const saveTeamRef = useRef<() => void>(() => undefined);
  const playerPickerListRef = useRef<FlashListRef<FantasyPlayer> | null>(null);
  const playerPickerHorizontalScrollRef = useRef<ScrollView | null>(null);
  const playerPickerScrollResetFrameRef = useRef<number | null>(null);
  const playerPickerScrollResetTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [initialDraftState] = useState(() =>
    createDraftStateFromFantasyTeam(fantasyTeam),
  );
  const [activeSlot, setActiveSlot] = useState<SquadSlotDefinition | null>(
    null,
  );
  const [isPlayerPickerOpen, setIsPlayerPickerOpen] = useState(false);
  const [detailSlot, setDetailSlot] = useState<SquadSlotDefinition | null>(
    null,
  );
  const [teamWorkspaceMode, setTeamWorkspaceMode] =
    useState<TeamWorkspaceMode>("overview");
  const [teamViewMode, setTeamViewMode] = useState<TeamViewMode>("pitch");
  const [transferStep, setTransferStep] = useState<TransferStep>("edit");
  const [playerPickerPurpose, setPlayerPickerPurpose] =
    useState<PlayerPickerPurpose>("slot");
  const [incomingTransferPlayer, setIncomingTransferPlayer] =
    useState<FantasyPlayer | null>(null);
  const [removedTransferPlayers, setRemovedTransferPlayers] =
    useState<RemovedTransferPlayers>({});
  const [restoreTransferSlot, setRestoreTransferSlot] =
    useState<SquadSlotDefinition | null>(null);
  const [pendingReplacementSlot, setPendingReplacementSlot] =
    useState<SquadSlotDefinition | null>(null);
  const [favoriteClubId, setFavoriteClubId] =
    useState<Id<"fantasyClubs"> | null>(null);
  const [isFavoriteClubPickerOpen, setIsFavoriteClubPickerOpen] =
    useState(false);
  const [legalSheetKind, setLegalSheetKind] = useState<LegalTextKind | null>(
    null,
  );
  const [hasCreatedTeamOptimistically, setHasCreatedTeamOptimistically] =
    useState(false);
  const [optimisticBudgetRemaining, setOptimisticBudgetRemaining] = useState<
    number | null
  >(null);
  const [draftPicks, setDraftPicks] = useState<DraftPicks>(
    () => initialDraftState.draftPicks,
  );
  const [savedDraftPicks, setSavedDraftPicks] = useState<DraftPicks>(() =>
    cloneDraftPicks(initialDraftState.draftPicks),
  );
  const [captainSlot, setCaptainSlot] = useState<number | null>(
    () => initialDraftState.captainSlot,
  );
  const [viceCaptainSlot, setViceCaptainSlot] = useState<number | null>(
    () => initialDraftState.viceCaptainSlot,
  );

  const [savedCaptainSlot, setSavedCaptainSlot] = useState<number | null>(
    () => initialDraftState.captainSlot,
  );
  const [savedViceCaptainSlot, setSavedViceCaptainSlot] = useState<
    number | null
  >(() => initialDraftState.viceCaptainSlot);
  const [savedTeamName, setSavedTeamName] = useState(
    () => initialDraftState.teamName,
  );
  const [swapSourceSlot, setSwapSourceSlot] =
    useState<SquadSlotDefinition | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerPickerClubId, setPlayerPickerClubId] =
    useState<PlayerPickerClubFilterValue>(null);
  const [playerPickerSortMode, setPlayerPickerSortMode] =
    useState<PlayerPickerSortMode>("default");
  const [playerPickerDropdown, setPlayerPickerDropdown] =
    useState<PlayerPickerDropdown>(null);
  const [showSaveHint, setShowSaveHint] = useState(false);
  const [teamName, setTeamName] = useState(() => initialDraftState.teamName);
  const [pointsViewerTeamId, setPointsViewerTeamId] =
    useState<Id<"fantasyTeams"> | null>(null);
  const [pointsViewerGameweekId, setPointsViewerGameweekId] =
    useState<Id<"fantasyGameweeks"> | null>(null);

  const resetPlayerPickerScroll = useCallback(() => {
    const scrollToStart = () => {
      playerPickerHorizontalScrollRef.current?.scrollTo({
        animated: false,
        x: 0,
        y: 0,
      });
      playerPickerListRef.current?.scrollToOffset({
        animated: false,
        offset: 0,
      });
    };

    if (playerPickerScrollResetFrameRef.current !== null) {
      cancelAnimationFrame(playerPickerScrollResetFrameRef.current);
      playerPickerScrollResetFrameRef.current = null;
    }
    if (playerPickerScrollResetTimeoutRef.current !== null) {
      clearTimeout(playerPickerScrollResetTimeoutRef.current);
      playerPickerScrollResetTimeoutRef.current = null;
    }

    scrollToStart();
    playerPickerScrollResetFrameRef.current = requestAnimationFrame(() => {
      playerPickerScrollResetFrameRef.current = null;
      scrollToStart();
    });
    playerPickerScrollResetTimeoutRef.current = setTimeout(() => {
      playerPickerScrollResetTimeoutRef.current = null;
      scrollToStart();
    }, 80);
  }, []);

  useDismissKeyboardOnChange([
    teamWorkspaceMode,
    teamViewMode,
    transferStep,
    isPlayerPickerOpen,
    detailSlot?.rosterSlot ?? null,
    isFavoriteClubPickerOpen,
    legalSheetKind,
  ]);

  const fantasyTeamDraftSignature =
    createFantasyTeamDraftSignature(fantasyTeam);
  const syncedFantasyTeamDraftSignatureRef = useRef(fantasyTeamDraftSignature);

  useEffect(() => {
    if (fantasyTeam === undefined) return;
    if (
      syncedFantasyTeamDraftSignatureRef.current === fantasyTeamDraftSignature
    )
      return;

    const nextDraftState = createDraftStateFromFantasyTeam(fantasyTeam);
    syncedFantasyTeamDraftSignatureRef.current = fantasyTeamDraftSignature;
    setDraftPicks(nextDraftState.draftPicks);
    setSavedDraftPicks(cloneDraftPicks(nextDraftState.draftPicks));
    setTeamName(nextDraftState.teamName);
    setSavedTeamName(nextDraftState.teamName);
    setCaptainSlot(nextDraftState.captainSlot);
    setSavedCaptainSlot(nextDraftState.captainSlot);
    setViceCaptainSlot(nextDraftState.viceCaptainSlot);
    setSavedViceCaptainSlot(nextDraftState.viceCaptainSlot);
  }, [fantasyTeam, fantasyTeamDraftSignature]);

  useEffect(() => {
    if (fantasyTeam) {
      setHasCreatedTeamOptimistically(true);
      return;
    }

    if (fantasyTeam === null) {
      setHasCreatedTeamOptimistically(false);
      setOptimisticBudgetRemaining(null);
    }
  }, [fantasyTeam]);

  const fantasyPlayersById = useMemo(
    () => new Map((fantasyPlayers ?? []).map((player) => [player.id, player])),
    [fantasyPlayers],
  );

  useEffect(() => {
    if (!fantasyPlayers) return;

    setDraftPicks((current) =>
      remapDraftPicksByPlayerId(current, fantasyPlayersById),
    );
    setSavedDraftPicks((current) =>
      remapDraftPicksByPlayerId(current, fantasyPlayersById),
    );
    setIncomingTransferPlayer((current) =>
      mergeLocalizedPlayerReference(current, fantasyPlayersById),
    );
    setRemovedTransferPlayers((current) =>
      remapRemovedTransferPlayersByPlayerId(current, fantasyPlayersById),
    );
  }, [fantasyPlayers, fantasyPlayersById]);

  useEffect(() => {
    return () => {
      if (playerPickerScrollResetFrameRef.current !== null) {
        cancelAnimationFrame(playerPickerScrollResetFrameRef.current);
      }
      if (playerPickerScrollResetTimeoutRef.current !== null) {
        clearTimeout(playerPickerScrollResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlayerPickerOpen) return;

    resetPlayerPickerScroll();
  }, [isPlayerPickerOpen, resetPlayerPickerScroll]);

  const isOverviewLoading = fantasyOverview === undefined;
  const season = fantasyOverview?.season ?? null;
  const currentGameweek = fantasyOverview?.currentGameweek ?? null;
  const liveGameweek = useMemo(
    () =>
      (fantasyGameweeks ?? []).find((gameweek) => gameweek.status === "live") ??
      null,
    [fantasyGameweeks],
  );
  const liveGameweekNotice = liveGameweek
    ? t("team.liveGameweekNotice").replace(
        "{number}",
        String(liveGameweek.number),
      )
    : null;
  const deadlineAt = currentGameweek
    ? currentGameweek.deadlineAt
    : (fantasyOverview?.nextDeadlineAt ?? null);
  const selectedPlayers = useMemo(
    () => getDraftPlayers(draftPicks),
    [draftPicks],
  );
  const savedPlayers = useMemo(
    () => getDraftPlayers(savedDraftPicks),
    [savedDraftPicks],
  );
  const selectedPlayerIds = useMemo(
    () => getSelectedPlayerIds(draftPicks),
    [draftPicks],
  );
  const selectedCount = selectedPlayers.length;
  const totalPrice = selectedPlayers.reduce(
    (sum, player) => sum + player.price,
    0,
  );
  const savedTeamValue = savedPlayers.reduce(
    (sum, player) => sum + player.price,
    0,
  );
  const teamValue = Number(totalPrice.toFixed(1));
  const teamHasParticipated = fantasyTeam?.hasParticipated ?? false;
  const isFantasyTeamLoading = fantasyTeam === undefined;
  const hasTeamForUi = Boolean(fantasyTeam) || hasCreatedTeamOptimistically;
  const isInitialTeamCreation = !hasTeamForUi;
  const shouldUseTeamBuilderDesktopFieldLayout =
    isDesktopWeb &&
    (isInitialTeamCreation || teamViewMode === "pitch") &&
    (teamWorkspaceMode === "pick" ||
      (teamWorkspaceMode === "transfers" && transferStep === "edit"));
  const clubLimitViolation = useMemo(
    () => getClubLimitViolation(selectedPlayers),
    [selectedPlayers],
  );
  const clubLimitMessage = clubLimitViolation
    ? formatClubLimitMessage(clubLimitViolation.clubName, t)
    : null;
  const savedBudgetRemaining =
    fantasyTeam?.budgetRemaining ?? optimisticBudgetRemaining;
  const hasSavedSquadForBudget =
    hasTeamForUi &&
    savedPlayers.length > 0 &&
    typeof savedBudgetRemaining === "number";
  const budgetRemaining =
    typeof season?.budget === "number"
      ? hasSavedSquadForBudget
        ? Number(
            (savedBudgetRemaining + savedTeamValue - totalPrice).toFixed(1),
          )
        : Number((season.budget - totalPrice).toFixed(1))
      : undefined;
  const gameweekLabel = currentGameweek
    ? t("team.kicker") + " " + currentGameweek.number
    : t("team.kicker");
  const deadlineValue = formatDeadline(
    deadlineAt,
    language,
    t("team.dashboard.deadlineValue"),
  );
  const budgetValue = formatBudget(
    budgetRemaining ?? fantasyTeam?.budgetRemaining ?? season?.budget,
  );
  const teamValueText = formatBudget(
    selectedCount > 0 ? teamValue : fantasyTeam?.teamValue,
  );
  const trimmedTeamName = teamName.trim();
  const teamNameTooLong = trimmedTeamName.length > TEAM_NAME_MAX_LENGTH;
  const teamNameLengthError = teamNameTooLong
    ? t("team.builder.nameTooLong")
    : null;
  const dashboardTeamName =
    trimmedTeamName || fantasyTeam?.name || t("team.overview.unnamedTeam");
  const dashboardLeagueTeam = fantasyTeam
    ? ((fantasyTeams ?? []).find((team) => team.id === fantasyTeam.id) ?? null)
    : null;
  const dashboardCurrentGameweekId = dashboardLeagueTeam?.currentGameweekId
    ? (dashboardLeagueTeam.currentGameweekId as Id<"fantasyGameweeks">)
    : null;
  const dashboardCurrentGameweekNumber =
    dashboardLeagueTeam?.currentGameweekNumber ??
    liveGameweek?.number ??
    currentGameweek?.number ??
    null;
  const dashboardSortedGameweeks = (fantasyGameweeks ?? [])
    .slice()
    .sort((a, b) => a.number - b.number);
  const dashboardGameweekTeams =
    dashboardCurrentGameweekNumber === null
      ? (fantasyTeams ?? [])
      : (fantasyTeams ?? []).filter(
          (team) =>
            (team.currentGameweekNumber ?? dashboardCurrentGameweekNumber) ===
            dashboardCurrentGameweekNumber,
        );
  const dashboardMetricTeams =
    dashboardGameweekTeams.length > 0
      ? dashboardGameweekTeams
      : (fantasyTeams ?? []);
  const dashboardGameweekPoints = getFiniteFantasyNumber(
    dashboardLeagueTeam?.currentGameweekPoints ??
      fantasyTeam?.lastGameweekPoints,
  );
  const dashboardAveragePoints =
    dashboardMetricTeams.length > 0
      ? dashboardMetricTeams.reduce(
          (sum, team) =>
            sum + getFiniteFantasyNumber(team.currentGameweekPoints),
          0,
        ) / dashboardMetricTeams.length
      : 0;
  const dashboardHighestTeam =
    dashboardMetricTeams.reduce<FantasyLeagueTeam | null>((highest, team) => {
      if (!highest) return team;
      const pointsDiff =
        getFiniteFantasyNumber(team.currentGameweekPoints) -
        getFiniteFantasyNumber(highest.currentGameweekPoints);
      if (pointsDiff !== 0) return pointsDiff > 0 ? team : highest;

      const totalDiff =
        getFiniteFantasyNumber(team.totalPoints) -
        getFiniteFantasyNumber(highest.totalPoints);
      if (totalDiff !== 0) return totalDiff > 0 ? team : highest;

      return team.name.localeCompare(highest.name) < 0 ? team : highest;
    }, null);
  const now = Date.now();
  const dashboardActionGameweek =
    dashboardSortedGameweeks
      .filter(
        (gameweek) =>
          typeof gameweek.deadlineAt === "number" && gameweek.deadlineAt > now,
      )
      .sort((a, b) => (a.deadlineAt ?? 0) - (b.deadlineAt ?? 0))[0] ??
    dashboardSortedGameweeks.find(
      (gameweek) => gameweek.status !== "completed",
    ) ??
    null;
  const dashboardActionDeadlineValue = formatDeadline(
    dashboardActionGameweek?.deadlineAt ?? fantasyOverview?.nextDeadlineAt,
    language,
    t("team.dashboard.deadlineValue"),
  );
  const totalPointsText = formatWholeNumber(fantasyTeam?.totalPoints);
  const gameweekPointsText = formatFantasyPointsValue(dashboardGameweekPoints);
  const averagePointsText = formatFantasyPointsValue(dashboardAveragePoints);
  const highestPointsText = formatFantasyPointsValue(
    dashboardHighestTeam?.currentGameweekPoints,
  );
  const canOpenDashboardHighestTeam =
    Boolean(dashboardHighestTeam?.id) &&
    Boolean(fantasyTeam?.id) &&
    dashboardHighestTeam?.id !== fantasyTeam?.id;
  const overallRank = fantasyTeam
    ? [...(fantasyTeams ?? [])]
        .sort(
          (a, b) =>
            (b.totalPoints ?? 0) - (a.totalPoints ?? 0) ||
            a.name.localeCompare(b.name),
        )
        .findIndex((team) => team.id === fantasyTeam.id) + 1
    : 0;
  const overallRankText = overallRank > 0 ? `#${overallRank}` : "-";
  const freeTransfersText = teamHasParticipated
    ? String(fantasyTeam?.freeTransfers ?? 0)
    : "∞";
  const starterSlots = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "starter",
  );
  const benchSlots = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "bench",
  );
  const reserveSlots = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "reserve",
  );
  const activeSlotPlayer = activeSlot
    ? draftPicks[activeSlot.rosterSlot]
    : null;
  const detailSlotPlayer = detailSlot
    ? draftPicks[detailSlot.rosterSlot]
    : null;
  const normalizedPlayerSearchQuery = normalizeSearchValue(playerSearchQuery);
  const sortedPlayersByPosition = useMemo(
    () => ({
      goalkeeper: (fantasyPlayers ?? [])
        .filter(
          (player) =>
            player.clubId !== null &&
            player.status !== "left" &&
            player.position === "goalkeeper",
        )
        .sort(
          (a, b) =>
            b.price - a.price || a.displayName.localeCompare(b.displayName),
        ),
      universal: (fantasyPlayers ?? [])
        .filter(
          (player) =>
            player.clubId !== null &&
            player.status !== "left" &&
            player.position === "universal",
        )
        .sort(
          (a, b) =>
            b.price - a.price || a.displayName.localeCompare(b.displayName),
        ),
    }),
    [fantasyPlayers],
  );
  const clubsById = useMemo(
    () => new Map((fantasyClubs ?? []).map((club) => [club.id, club])),
    [fantasyClubs],
  );
  const activeClubs = useMemo(
    () =>
      [...(fantasyClubs ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [fantasyClubs],
  );
  const favoriteClub = favoriteClubId
    ? (clubsById.get(favoriteClubId) ?? null)
    : null;
  const playerPickerClub = playerPickerClubId
    ? (clubsById.get(playerPickerClubId) ?? null)
    : null;
  const playerPickerClubLabel = playerPickerClub
    ? (playerPickerClub.shortName ?? playerPickerClub.name)
    : t("team.playerPicker.allClubs");

  useEffect(() => {
    if (!playerPickerClubId) return;
    if (clubsById.has(playerPickerClubId)) return;

    setPlayerPickerClubId(null);
  }, [clubsById, playerPickerClubId]);

  const playerPickerSortOptionLabel = t(
    PLAYER_PICKER_SORT_OPTIONS.find(
      (option) => option.id === playerPickerSortMode,
    )?.labelKey ?? "team.playerPicker.sortDefault",
  );
  const playerPickerSortLabel =
    playerPickerSortMode === "default"
      ? t("team.playerPicker.sortFilter")
      : playerPickerSortOptionLabel;
  const playerPickerClubOptions = useMemo(
    () => [
      {
        label: t("team.playerPicker.allClubs"),
        value: PLAYER_PICKER_ALL_CLUBS_VALUE,
      },
      ...activeClubs.map((club) => ({
        label: club.shortName ?? club.name,
        leading: <FantasyClubLogo club={club} size="sm" />,
        value: club.id,
      })),
    ],
    [activeClubs, t],
  );
  const playerPickerSortOptions = useMemo(
    () =>
      PLAYER_PICKER_SORT_OPTIONS.map((option) => ({
        label: t(option.labelKey),
        value: option.id,
      })),
    [t],
  );
  const isBudgetNegative =
    typeof budgetRemaining === "number" && budgetRemaining < -0.0001;
  const slotBankValue =
    typeof budgetRemaining === "number"
      ? Number((budgetRemaining + (activeSlotPlayer?.price ?? 0)).toFixed(1))
      : undefined;
  const playerPickerBudgetRemaining =
    playerPickerPurpose === "incomingTransfer"
      ? budgetRemaining
      : (slotBankValue ?? budgetRemaining);
  const isPlayerPickerBudgetNegative =
    typeof playerPickerBudgetRemaining === "number" &&
    playerPickerBudgetRemaining < -0.0001;
  const currentDraftSignature = createDraftSignature(
    draftPicks,
    teamName,
    captainSlot,
    viceCaptainSlot,
  );
  const savedDraftSignature = createDraftSignature(
    savedDraftPicks,
    savedTeamName,
    savedCaptainSlot,
    savedViceCaptainSlot,
  );
  const hasUnsavedChanges = currentDraftSignature !== savedDraftSignature;
  const transferChanges = useMemo(
    () => getTransferChanges(savedDraftPicks, draftPicks),
    [draftPicks, savedDraftPicks],
  );
  const incomingTransferPlayerIds = useMemo(() => {
    if (teamWorkspaceMode !== "transfers") return undefined;

    const savedPlayerIds = getSelectedPlayerIds(savedDraftPicks);
    return new Set(
      transferChanges
        .map((change) => change.incomingPlayer.id)
        .filter((playerId) => !savedPlayerIds.has(playerId)),
    );
  }, [savedDraftPicks, teamWorkspaceMode, transferChanges]);
  const hasRemovedTransferPlayers =
    Object.keys(removedTransferPlayers).length > 0;
  const hasPendingTransferState = Boolean(
    incomingTransferPlayer || hasRemovedTransferPlayers || hasUnsavedChanges,
  );
  const restoreTransferPlayer = restoreTransferSlot
    ? (removedTransferPlayers[restoreTransferSlot.rosterSlot] ?? null)
    : null;
  const captainPlayer = captainSlot ? draftPicks[captainSlot] : null;
  const viceCaptainPlayer = viceCaptainSlot
    ? draftPicks[viceCaptainSlot]
    : null;
  const captainSlotDefinition = captainSlot
    ? (SQUAD_SLOT_DEFINITIONS.find((slot) => slot.rosterSlot === captainSlot) ??
      null)
    : null;
  const viceCaptainSlotDefinition = viceCaptainSlot
    ? (SQUAD_SLOT_DEFINITIONS.find(
        (slot) => slot.rosterSlot === viceCaptainSlot,
      ) ?? null)
    : null;
  const getPlayerPickerDisabledReason = useCallback(
    (player: FantasyPlayer) => {
      const isIncomingPicker = playerPickerPurpose === "incomingTransfer";
      const alreadySelectedInAnotherSlot = isIncomingPicker
        ? selectedPlayerIds.has(player.id)
        : selectedPlayerIds.has(player.id) &&
          activeSlotPlayer?.id !== player.id;
      const isCurrent = !isIncomingPicker && activeSlotPlayer?.id === player.id;
      const exceedsBudget =
        !isIncomingPicker &&
        !isCurrent &&
        typeof slotBankValue === "number" &&
        player.price > slotBankValue + 0.0001;
      const exceedsClubLimit =
        !isIncomingPicker &&
        !isCurrent &&
        activeSlot !== null &&
        wouldExceedClubLimitForSlot(draftPicks, activeSlot.rosterSlot, player);

      if (alreadySelectedInAnotherSlot) return t("team.alreadyPicked");
      if (exceedsBudget) return t("team.budgetLimitShort");
      if (exceedsClubLimit) return t("team.clubLimitShort");
      return null;
    },
    [
      activeSlot,
      activeSlotPlayer?.id,
      draftPicks,
      playerPickerPurpose,
      selectedPlayerIds,
      slotBankValue,
      t,
    ],
  );

  const activeSlotPlayers = useMemo(() => {
    if (!isPlayerPickerOpen || fantasyPlayers === undefined) {
      return [];
    }

    const sourcePlayers =
      playerPickerPurpose === "incomingTransfer"
        ? [...(fantasyPlayers ?? [])]
            .filter(
              (player) =>
                player.clubId !== null && player.status !== "left",
            )
            .sort(
              (a, b) =>
                b.price - a.price || a.displayName.localeCompare(b.displayName),
            )
        : activeSlot
          ? sortedPlayersByPosition[activeSlot.position]
          : [];

    const filteredPlayers = sourcePlayers
      .filter((player) =>
        playerPickerClubId ? player.clubId === playerPickerClubId : true,
      )
      .filter((player) => {
        if (!normalizedPlayerSearchQuery) return true;

        const searchableValue = [
          player.displayName,
          player.clubName ?? t("players.noClub"),
          t(POSITION_LABEL_KEYS[player.position]),
          formatPlayerCurrentSeasonPoints(player, t),
          player.price.toFixed(1),
          formatFantasyMoney(player.price),
        ]
          .map(normalizeSearchValue)
          .join(" ");

        return searchableValue.includes(normalizedPlayerSearchQuery);
      });

    return sortPlayerPickerPlayers(
      filteredPlayers,
      playerPickerSortMode,
      getPlayerPickerDisabledReason,
    );
  }, [
    activeSlot,
    activeSlotPlayer?.id,
    fantasyPlayers,
    getPlayerPickerDisabledReason,
    isPlayerPickerOpen,
    normalizedPlayerSearchQuery,
    playerPickerClubId,
    playerPickerPurpose,
    playerPickerSortMode,
    sortedPlayersByPosition,
    t,
  ]);
  const playerPickerWarmupPlayers = useMemo(
    () => [
      ...sortedPlayersByPosition.goalkeeper.slice(0, 4),
      ...sortedPlayersByPosition.universal.slice(0, 12),
    ],
    [sortedPlayersByPosition],
  );
  const handleWarmupPlayerPress = useCallback(() => undefined, []);
  const renderPlayerPickerWarmupItem = useCallback(
    ({ item: player }: { item: FantasyPlayer; index: number }) => (
      <FantasyPlayerListRow
        club={player.clubId ? (clubsById.get(player.clubId) ?? null) : null}
        onPress={handleWarmupPlayerPress}
        pickerNameFormat="initialLastName"
        player={player}
        t={t}
        variant="pickerStats"
      />
    ),
    [clubsById, handleWarmupPlayerPress, t],
  );
  const renderPlayerPickerItem = useCallback(
    ({ item: player }: { item: FantasyPlayer; index: number }) => {
      const isIncomingPicker = playerPickerPurpose === "incomingTransfer";
      const isCurrent = !isIncomingPicker && activeSlotPlayer?.id === player.id;
      const disabledReason = getPlayerPickerDisabledReason(player);
      const isDisabled = Boolean(disabledReason);

      return (
        <FantasyPlayerListRow
          key={player.id}
          club={player.clubId ? (clubsById.get(player.clubId) ?? null) : null}
          isDisabled={isDisabled}
          isSelected={isCurrent || incomingTransferPlayer?.id === player.id}
          onPress={handleSelectPlayer}
          pickerNameFormat="initialLastName"
          player={player}
          stateLabel={isCurrent ? t("team.currentPick") : disabledReason}
          stateTone={disabledReason ? "danger" : "success"}
          t={t}
          variant="pickerStats"
        />
      );
    },
    [
      activeSlotPlayer?.id,
      clubsById,
      getPlayerPickerDisabledReason,
      handleSelectPlayer,
      incomingTransferPlayer?.id,
      playerPickerPurpose,
      t,
    ],
  );
  const createTeamBlocker = useMemo(() => {
    if (!season) return t("team.builder.noSeason");
    if (!trimmedTeamName) return t("team.builder.nameRequired");
    if (teamNameTooLong) return t("team.builder.nameTooLong");
    return null;
  }, [season, t, teamNameTooLong, trimmedTeamName]);
  const leadershipBlocker = useMemo(() => {
    if (selectedCount !== season?.squadSize) return null;
    if (!captainSlot || !captainPlayer)
      return t("team.builder.captainRequired");
    if (!viceCaptainSlot || !viceCaptainPlayer)
      return t("team.builder.viceCaptainRequired");
    if (captainSlot === viceCaptainSlot)
      return t("team.builder.captainDistinct");
    if (
      captainSlotDefinition?.squadRole === "reserve" ||
      viceCaptainSlotDefinition?.squadRole === "reserve"
    ) {
      return t("team.builder.captainStarterOnly");
    }
    return null;
  }, [
    captainPlayer,
    captainSlot,
    captainSlotDefinition?.squadRole,
    season?.squadSize,
    selectedCount,
    t,
    viceCaptainPlayer,
    viceCaptainSlot,
    viceCaptainSlotDefinition?.squadRole,
  ]);
  const saveBlocker = useMemo(() => {
    if (createTeamBlocker) return createTeamBlocker;
    if (selectedCount !== season?.squadSize)
      return t("team.builder.incomplete");
    if (leadershipBlocker) return leadershipBlocker;
    if (typeof budgetRemaining === "number" && budgetRemaining < -0.0001)
      return t("team.builder.budgetExceeded");
    if (clubLimitMessage) return clubLimitMessage;
    return null;
  }, [
    budgetRemaining,
    clubLimitMessage,
    createTeamBlocker,
    leadershipBlocker,
    season?.squadSize,
    selectedCount,
    t,
  ]);
  const canSave = !saveBlocker && !isSaving;
  const hasValidTransferChanges =
    teamWorkspaceMode === "transfers" &&
    transferChanges.length > 0 &&
    selectedCount === season?.squadSize &&
    !incomingTransferPlayer &&
    !saveBlocker &&
    !isSaving;
  const canProceedTransfers =
    transferStep === "edit" && hasValidTransferChanges;
  const canConfirmTransfers =
    transferStep === "review" && hasValidTransferChanges;
  const incomingTransferBlocker = useMemo(() => {
    if (
      teamWorkspaceMode !== "transfers" ||
      transferStep !== "edit" ||
      !incomingTransferPlayer
    ) {
      return null;
    }

    const matchingPositionSlots = SQUAD_SLOT_DEFINITIONS.filter(
      (slot) => slot.position === incomingTransferPlayer.position,
    );
    if (matchingPositionSlots.length === 0) {
      return t("team.transfers.noAvailableReplacements");
    }

    const blockerReasons = matchingPositionSlots
      .map((slot) =>
        getIncomingTransferSlotBlockerReason(
          slot,
          incomingTransferPlayer,
          draftPicks,
          selectedPlayerIds,
          budgetRemaining,
        ),
      )
      .filter(
        (reason): reason is IncomingTransferSlotBlockerReason =>
          reason !== null,
      );

    if (blockerReasons.length < matchingPositionSlots.length) return null;

    const uniqueReasons = new Set(blockerReasons);
    if (uniqueReasons.has("alreadySelected")) {
      return t("team.transfers.noAvailableReplacementsAlreadyPicked");
    }
    if (uniqueReasons.has("budget") && uniqueReasons.has("clubLimit")) {
      return t("team.transfers.noAvailableReplacementsBudgetOrClub");
    }
    if (uniqueReasons.has("clubLimit")) {
      return formatIncomingTransferClubLimitMessage(
        incomingTransferPlayer.clubName,
        t,
      );
    }
    if (uniqueReasons.has("budget")) {
      return t("team.transfers.noAvailableReplacementsBudget");
    }

    return t("team.transfers.noAvailableReplacements");
  }, [
    budgetRemaining,
    draftPicks,
    incomingTransferPlayer,
    selectedPlayerIds,
    t,
    teamWorkspaceMode,
    transferStep,
  ]);
  const transferFreeAllowance = teamHasParticipated
    ? (fantasyTeam?.freeTransfers ?? 0)
    : transferChanges.length;
  const freeTransfersUsed = Math.min(
    transferChanges.length,
    transferFreeAllowance,
  );
  const additionalTransfersUsed = Math.max(
    0,
    transferChanges.length - transferFreeAllowance,
  );
  const transferPenaltyPointsPerPaidMove = season?.transferPenaltyPoints ?? 4;
  const transferPenaltyPoints =
    additionalTransfersUsed * transferPenaltyPointsPerPaidMove;
  const transferPenaltyValue =
    transferPenaltyPoints > 0
      ? formatSignedFantasyPoints(-transferPenaltyPoints)
      : formatFantasyPointsValue(0);
  const transferPenaltyWarningText =
    teamWorkspaceMode === "transfers" &&
    transferStep === "edit" &&
    transferPenaltyPoints > 0
      ? t("team.transfers.paidTransfersWarning").replace(
          "{points}",
          formatFantasyPointsValue(transferPenaltyPoints),
        )
      : null;
  const squadStatusWarningText = useMemo(() => {
    const warningSlots =
      teamWorkspaceMode === "pick"
        ? SQUAD_SLOT_DEFINITIONS.filter((slot) => slot.squadRole !== "reserve")
        : SQUAD_SLOT_DEFINITIONS;
    const warningPlayers = warningSlots
      .map((slot) => draftPicks[slot.rosterSlot])
      .filter((player): player is FantasyPlayer =>
        shouldShowPlayerStatusWarning(player),
      );
    if (warningPlayers.length === 0) return null;

    const visiblePlayers = warningPlayers.slice(0, 3);
    const names = visiblePlayers
      .map((player) => getPlayerSurnameLabel(player.displayName))
      .join(", ");
    const remainingCount = warningPlayers.length - visiblePlayers.length;
    const playersText =
      names +
      (remainingCount > 0
        ? t("team.squadStatusWarningMore").replace(
            "{count}",
            String(remainingCount),
          )
        : "");

    return t("team.squadStatusWarning").replace("{players}", playersText);
  }, [draftPicks, t, teamWorkspaceMode]);
  const shouldSurfaceSaveBlocker =
    teamWorkspaceMode === "pick" && hasUnsavedChanges && Boolean(saveBlocker);
  const feedbackBannerText =
    feedbackText ??
    incomingTransferBlocker ??
    transferPenaltyWarningText ??
    (shouldSurfaceSaveBlocker || showSaveHint
      ? saveBlocker
      : clubLimitMessage) ??
    squadStatusWarningText;
  const shouldHighlightTeamName =
    teamNameTooLong ||
    (showSaveHint && createTeamBlocker === t("team.builder.nameRequired"));
  const shouldUseRosterLayout =
    isInitialTeamCreation || teamWorkspaceMode === "transfers";
  const canEditDetailPlayerPool =
    isInitialTeamCreation || teamWorkspaceMode === "transfers";
  const canSwapDetailPlayer =
    teamWorkspaceMode === "pick" && !isInitialTeamCreation;
  function canApplyIncomingTransferToSlot(
    slot: SquadSlotDefinition,
    incomingPlayer: FantasyPlayer,
  ) {
    return (
      getIncomingTransferSlotBlockerReason(
        slot,
        incomingPlayer,
        draftPicks,
        selectedPlayerIds,
        budgetRemaining,
      ) === null
    );
  }

  function getSlotSwapState(slot: SquadSlotDefinition) {
    if (teamWorkspaceMode === "transfers" && incomingTransferPlayer) {
      return canApplyIncomingTransferToSlot(slot, incomingTransferPlayer)
        ? null
        : ("unavailable" as const);
    }

    if (!swapSourceSlot) return null;

    const slotPlayer = draftPicks[slot.rosterSlot];
    if (swapSourceSlot.rosterSlot === slot.rosterSlot) return "source" as const;
    if (!slotPlayer) return "unavailable" as const;

    return slot.position === swapSourceSlot.position &&
      slot.squadRole !== swapSourceSlot.squadRole
      ? ("candidate" as const)
      : ("unavailable" as const);
  }

  function openPlayerPicker(slot: SquadSlotDefinition) {
    Keyboard.dismiss();
    setPlayerPickerPurpose("slot");
    setActiveSlot(slot);
    setPlayerSearchQuery("");
    setPlayerPickerDropdown(null);
    setIsPlayerPickerOpen(true);
    resetPlayerPickerScroll();
  }

  function openIncomingTransferPicker() {
    Keyboard.dismiss();
    setPlayerPickerPurpose("incomingTransfer");
    setActiveSlot(null);
    setPlayerSearchQuery("");
    setPlayerPickerDropdown(null);
    setIsPlayerPickerOpen(true);
    resetPlayerPickerScroll();
  }

  function closePlayerPicker() {
    Keyboard.dismiss();
    setIsPlayerPickerOpen(false);
    setSwapSourceSlot(null);
    setActiveSlot(null);
    setPlayerPickerPurpose("slot");
    setPlayerPickerDropdown(null);
  }

  function handleSetupContinue() {
    if (!trimmedTeamName || teamNameTooLong) {
      setFeedbackText(null);
      setShowSaveHint(true);
      return;
    }

    setFeedbackText(null);
    setShowSaveHint(false);
    setTeamWorkspaceMode("pick");
  }

  function handleCancelTeamSetup() {
    setTeamName("");
    setFavoriteClubId(null);
    setFeedbackText(null);
    setShowSaveHint(false);
    setIsFavoriteClubPickerOpen(false);
    setTeamWorkspaceMode("overview");
  }

  function clearTransferState() {
    setTransferStep("edit");
    setIncomingTransferPlayer(null);
    setRemovedTransferPlayers({});
    setRestoreTransferSlot(null);
    setPendingReplacementSlot(null);
    setPlayerPickerPurpose("slot");
  }

  function handleResetTransferDraft() {
    setDraftPicks(cloneDraftPicks(savedDraftPicks));
    setCaptainSlot(savedCaptainSlot);
    setViceCaptainSlot(savedViceCaptainSlot);
    setFeedbackText(null);
    setShowSaveHint(false);
    setSwapSourceSlot(null);
    setIsPlayerPickerOpen(false);
    setActiveSlot(null);
    setDetailSlot(null);
    setPlayerSearchQuery("");
    clearTransferState();
  }

  function handleWorkspaceBack() {
    Keyboard.dismiss();
    setSwapSourceSlot(null);
    if (teamWorkspaceMode === "pointsDetails") {
      setPointsViewerTeamId(null);
      setPointsViewerGameweekId(null);
      setTeamWorkspaceMode("overview");
      return;
    }

    if (teamWorkspaceMode === "transfers" && transferStep === "review") {
      setTransferStep("edit");
      return;
    }

    if (isInitialTeamCreation && teamWorkspaceMode === "pick") {
      setActiveSlot(null);
      setDetailSlot(null);
      setFeedbackText(null);
      setShowSaveHint(false);
      setTeamWorkspaceMode("setup");
      return;
    }

    if (teamWorkspaceMode === "transfers") {
      handleResetTransferDraft();
    }

    setTeamWorkspaceMode("overview");
  }

  function handleResetDraft() {
    if (isInitialTeamCreation) {
      setDraftPicks(createEmptyDraftPicks());
      setCaptainSlot(null);
      setViceCaptainSlot(null);
      setFeedbackText(null);
      setShowSaveHint(false);
      setSwapSourceSlot(null);
      setIsPlayerPickerOpen(false);
      setActiveSlot(null);
      setDetailSlot(null);
      setPlayerSearchQuery("");
      clearTransferState();
      return;
    }

    handleCancelDraftChanges();
  }

  function handleCancelDraftChanges() {
    setDraftPicks(cloneDraftPicks(savedDraftPicks));
    setTeamName(savedTeamName);
    setCaptainSlot(savedCaptainSlot);
    setViceCaptainSlot(savedViceCaptainSlot);
    setFeedbackText(null);
    setShowSaveHint(false);
    setSwapSourceSlot(null);
    setIsPlayerPickerOpen(false);
    setActiveSlot(null);
    setDetailSlot(null);
    setPlayerSearchQuery("");
    clearTransferState();
  }

  function clearLeadershipForSlot(rosterSlot: number) {
    setCaptainSlot((current) => (current === rosterSlot ? null : current));
    setViceCaptainSlot((current) => (current === rosterSlot ? null : current));
  }

  function maybeAssignDefaultLeadership(slot: SquadSlotDefinition) {
    if (slot.squadRole === "reserve") return;

    if (!captainSlot || !draftPicks[captainSlot]) {
      setCaptainSlot(slot.rosterSlot);
      return;
    }

    if (
      (!viceCaptainSlot || !draftPicks[viceCaptainSlot]) &&
      captainSlot !== slot.rosterSlot
    ) {
      setViceCaptainSlot(slot.rosterSlot);
    }
  }

  function handleSetCaptainFromDetail() {
    if (teamWorkspaceMode !== "pick") return;
    if (!detailSlot || detailSlot.squadRole === "reserve") return;

    setCaptainSlot(detailSlot.rosterSlot);
    setViceCaptainSlot((current) =>
      current === detailSlot.rosterSlot ? null : current,
    );
    setFeedbackText(null);
    setShowSaveHint(false);
  }

  function handleSetViceCaptainFromDetail() {
    if (teamWorkspaceMode !== "pick") return;
    if (!detailSlot || detailSlot.squadRole === "reserve") return;

    setViceCaptainSlot(detailSlot.rosterSlot);
    setCaptainSlot((current) =>
      current === detailSlot.rosterSlot ? null : current,
    );
    setFeedbackText(null);
    setShowSaveHint(false);
  }

  function handleSwapSlot(targetSlot: SquadSlotDefinition) {
    if (!swapSourceSlot) return;

    if (targetSlot.rosterSlot === swapSourceSlot.rosterSlot) {
      setSwapSourceSlot(null);
      setFeedbackText(null);
      return;
    }

    const sourcePlayer = draftPicks[swapSourceSlot.rosterSlot];
    const targetPlayer = draftPicks[targetSlot.rosterSlot];

    if (!sourcePlayer || !targetPlayer) {
      setFeedbackText(t("team.swapPickPlayerRequired"));
      return;
    }

    if (targetSlot.position !== swapSourceSlot.position) {
      setFeedbackText(t("team.swapSamePositionOnly"));
      return;
    }

    if (targetSlot.squadRole === swapSourceSlot.squadRole) {
      setFeedbackText(null);
      return;
    }

    const sourceRosterSlot = swapSourceSlot.rosterSlot;
    const targetRosterSlot = targetSlot.rosterSlot;
    const nextCaptainSlot = getLeadershipSlotAfterSwap(
      captainSlot,
      swapSourceSlot,
      targetSlot,
    );
    const nextViceCaptainSlot = getLeadershipSlotAfterSwap(
      viceCaptainSlot,
      swapSourceSlot,
      targetSlot,
    );

    setDraftPicks((current) => ({
      ...current,
      [sourceRosterSlot]: current[targetRosterSlot],
      [targetRosterSlot]: current[sourceRosterSlot],
    }));
    setCaptainSlot(nextCaptainSlot);
    setViceCaptainSlot(
      nextViceCaptainSlot === nextCaptainSlot ? null : nextViceCaptainSlot,
    );
    setFeedbackText(null);
    setShowSaveHint(false);
    setSwapSourceSlot(null);
  }

  function handleApplyIncomingTransferToSlot(slot: SquadSlotDefinition) {
    if (!incomingTransferPlayer) return;

    if (!canApplyIncomingTransferToSlot(slot, incomingTransferPlayer)) {
      setFeedbackText(t("team.transfers.replacementUnavailable"));
      setShowSaveHint(false);
      return;
    }

    setDraftPicks((current) => ({
      ...current,
      [slot.rosterSlot]: incomingTransferPlayer,
    }));
    if (!draftPicks[slot.rosterSlot]) {
      maybeAssignDefaultLeadership(slot);
    }
    setRemovedTransferPlayers((current) => {
      const next = { ...current };
      delete next[slot.rosterSlot];
      return next;
    });
    setIncomingTransferPlayer(null);
    setFeedbackText(null);
    setShowSaveHint(false);
    setTransferStep("edit");
  }

  function handleSlotDefinitionPress(slot: SquadSlotDefinition) {
    if (teamWorkspaceMode === "transfers" && incomingTransferPlayer) {
      handleApplyIncomingTransferToSlot(slot);
      return;
    }

    if (swapSourceSlot) {
      handleSwapSlot(slot);
      return;
    }

    const player = draftPicks[slot.rosterSlot];
    if (player) {
      setDetailSlot(slot);
      return;
    }

    if (
      teamWorkspaceMode === "transfers" &&
      removedTransferPlayers[slot.rosterSlot]
    ) {
      setRestoreTransferSlot(slot);
      return;
    }

    openPlayerPicker(slot);
  }

  function handleRemoveDetailPlayer() {
    if (!detailSlot) return;

    const removedPlayer = draftPicks[detailSlot.rosterSlot];
    setDraftPicks((current) => ({
      ...current,
      [detailSlot.rosterSlot]: null,
    }));
    if (teamWorkspaceMode === "transfers" && removedPlayer) {
      setRemovedTransferPlayers((current) => ({
        ...current,
        [detailSlot.rosterSlot]: removedPlayer,
      }));
      setIncomingTransferPlayer(null);
      setTransferStep("edit");
    }
    clearLeadershipForSlot(detailSlot.rosterSlot);
    setDetailSlot(null);
    setFeedbackText(null);
    setShowSaveHint(false);
    setSwapSourceSlot(null);
  }

  function handleReplaceDetailPlayer() {
    if (!detailSlot) return;

    openPlayerPicker(detailSlot);
    setDetailSlot(null);
    setFeedbackText(null);
    setShowSaveHint(false);
    setSwapSourceSlot(null);
  }

  function handleStartSwapFromDetail() {
    if (!detailSlot) return;

    setSwapSourceSlot(detailSlot);
    setTeamViewMode("pitch");
    setDetailSlot(null);
    setFeedbackText(t("team.swapPickPrompt"));
    setShowSaveHint(false);
  }

  function handleShowPitchView() {
    setTeamViewMode("pitch");
  }

  function handleShowListView() {
    setSwapSourceSlot(null);
    setFeedbackText(null);
    setTeamViewMode("list");
  }

  function handleSelectPlayer(player: FantasyPlayer) {
    if (playerPickerPurpose === "incomingTransfer") {
      if (selectedPlayerIds.has(player.id)) return;

      setIncomingTransferPlayer(player);
      setTeamViewMode("pitch");
      setFeedbackText(null);
      setShowSaveHint(false);
      closePlayerPicker();
      return;
    }

    if (!activeSlot) return;

    const alreadySelectedInAnotherSlot =
      selectedPlayerIds.has(player.id) && activeSlotPlayer?.id !== player.id;
    if (alreadySelectedInAnotherSlot) return;

    const exceedsBudget =
      typeof slotBankValue === "number" &&
      player.price > slotBankValue + 0.0001;
    if (exceedsBudget) {
      setFeedbackText(t("team.builder.budgetExceeded"));
      setShowSaveHint(false);
      return;
    }

    const exceedsClubLimit = wouldExceedClubLimitForSlot(
      draftPicks,
      activeSlot.rosterSlot,
      player,
    );
    if (exceedsClubLimit) {
      setFeedbackText(formatClubLimitMessage(player.clubName, t));
      setShowSaveHint(false);
      return;
    }

    setDraftPicks((current) => ({
      ...current,
      [activeSlot.rosterSlot]: player,
    }));
    setRemovedTransferPlayers((current) => {
      const next = { ...current };
      delete next[activeSlot.rosterSlot];
      return next;
    });
    maybeAssignDefaultLeadership(activeSlot);
    setFeedbackText(null);
    setShowSaveHint(false);
    setTransferStep("edit");
    closePlayerPicker();
  }

  function handleAddTransferPlayer() {
    setIncomingTransferPlayer(null);
    setFeedbackText(null);
    setShowSaveHint(false);
    openIncomingTransferPicker();
  }

  function handleRestoreTransferPlayer() {
    if (!restoreTransferSlot || !restoreTransferPlayer) return;

    setDraftPicks((current) => ({
      ...current,
      [restoreTransferSlot.rosterSlot]: restoreTransferPlayer,
    }));
    setRemovedTransferPlayers((current) => {
      const next = { ...current };
      delete next[restoreTransferSlot.rosterSlot];
      return next;
    });
    setRestoreTransferSlot(null);
    setFeedbackText(null);
    setShowSaveHint(false);
  }

  function handleChooseReplacementForRestoredSlot() {
    if (!restoreTransferSlot) return;

    setPendingReplacementSlot(restoreTransferSlot);
    setRestoreTransferSlot(null);
  }

  function handleRestoreSheetCloseEnd() {
    if (!pendingReplacementSlot) return;

    const slot = pendingReplacementSlot;
    setPendingReplacementSlot(null);
    openPlayerPicker(slot);
  }

  async function handleSaveTeam() {
    if (!canSave || !season) {
      setFeedbackText(null);
      setShowSaveHint(true);
      return false;
    }

    setIsSaving(true);
    setShowSaveHint(false);
    setFeedbackText(null);
    try {
      const saveResult = await saveMyTeam({
        name: trimmedTeamName,
        seasonSlug: season.slug,
        picks: SQUAD_SLOT_DEFINITIONS.map((slot) => {
          const player = draftPicks[slot.rosterSlot];
          if (!player) {
            throw new Error(t("team.builder.incomplete"));
          }

          return {
            isCaptain: captainSlot === slot.rosterSlot,
            isStarter: slot.isStarter,
            isViceCaptain: viceCaptainSlot === slot.rosterSlot,
            playerId: player.id,
            rosterSlot: slot.rosterSlot,
          };
        }),
      });
      if (isInitialTeamCreation && favoriteClubId) {
        try {
          await updateFavoriteFantasyClub({ favoriteClubId });
        } catch {
          // Favourite club is optional and should not block squad creation.
        }
      }

      setOptimisticBudgetRemaining(saveResult.budgetRemaining);
      setSavedDraftPicks(cloneDraftPicks(draftPicks));
      setSavedTeamName(trimmedTeamName);
      setSavedCaptainSlot(captainSlot);
      setSavedViceCaptainSlot(viceCaptainSlot);
      setFeedbackText(null);
      if (isInitialTeamCreation) {
        setHasCreatedTeamOptimistically(true);
        setTeamViewMode("pitch");
        setTeamWorkspaceMode("pick");
      }
      return true;
    } catch (error) {
      setFeedbackText(
        error instanceof Error ? error.message : t("team.builder.saveFailed"),
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmTransfers() {
    if (!canConfirmTransfers) {
      setFeedbackText(null);
      setShowSaveHint(true);
      return;
    }

    const didSave = await handleSaveTeam();
    if (!didSave) return;

    clearTransferState();
    setTeamViewMode("pitch");
    setTeamWorkspaceMode("pick");
  }

  useEffect(() => {
    cancelDraftChangesRef.current = handleCancelDraftChanges;
    saveTeamRef.current = () => void handleSaveTeam();
  });

  useEffect(() => {
    void preloadFantasyStaticAssets().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isPlayerPickerOpen) return undefined;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closePlayerPicker();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isPlayerPickerOpen]);

  useEffect(() => {
    if (
      !isActive ||
      isPlayerPickerOpen ||
      teamWorkspaceMode === "overview" ||
      teamWorkspaceMode === "pointsDetails"
    ) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleWorkspaceBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isActive, isPlayerPickerOpen, teamWorkspaceMode, transferStep]);

  useEffect(() => {
    if (!isActive || teamWorkspaceMode !== "pointsDetails") return undefined;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setPointsViewerTeamId(null);
        setPointsViewerGameweekId(null);
        setTeamWorkspaceMode("overview");
        return true;
      },
    );

    return () => subscription.remove();
  }, [isActive, teamWorkspaceMode]);

  useEffect(() => {
    if (teamWorkspaceMode !== "pick") {
      setSwapSourceSlot(null);
    }
  }, [teamWorkspaceMode]);

  useEffect(() => {
    if (!isActive) {
      setIsPlayerPickerOpen(false);
      setActiveSlot(null);
      setDetailSlot(null);
      setPlayerSearchQuery("");
      setSwapSourceSlot(null);
      setIsFavoriteClubPickerOpen(false);
      setPointsViewerTeamId(null);
      setPointsViewerGameweekId(null);
      clearTransferState();
    }
  }, [isActive]);

  useEffect(() => {
    if (!onShellHeaderHiddenChange) return undefined;

    onShellHeaderHiddenChange(
      isActive && (teamWorkspaceMode !== "overview" || isPlayerPickerOpen),
    );
    return () => onShellHeaderHiddenChange(false);
  }, [
    isActive,
    isPlayerPickerOpen,
    onShellHeaderHiddenChange,
    teamWorkspaceMode,
  ]);

  useEffect(() => {
    if (!onBottomTabsHiddenChange) return undefined;

    onBottomTabsHiddenChange(
      isActive && (teamWorkspaceMode !== "overview" || isPlayerPickerOpen),
    );
    return () => onBottomTabsHiddenChange(false);
  }, [
    isActive,
    isPlayerPickerOpen,
    onBottomTabsHiddenChange,
    teamWorkspaceMode,
  ]);

  useEffect(() => {
    if (!onTopEdgeToEdgeChange) return undefined;

    onTopEdgeToEdgeChange(
      isActive && (teamWorkspaceMode === "setup" || isPlayerPickerOpen),
    );
    return () => onTopEdgeToEdgeChange(false);
  }, [isActive, isPlayerPickerOpen, onTopEdgeToEdgeChange, teamWorkspaceMode]);

  useEffect(() => {
    if (!onHeaderActionOverlayChange) return undefined;

    if (
      !isActive ||
      isPlayerPickerOpen ||
      teamWorkspaceMode === "overview" ||
      teamWorkspaceMode === "setup" ||
      teamWorkspaceMode === "transfers" ||
      teamWorkspaceMode === "pointsDetails" ||
      isInitialTeamCreation ||
      !hasUnsavedChanges
    ) {
      onHeaderActionOverlayChange(null);
      return undefined;
    }

    onHeaderActionOverlayChange({
      cancelLabel: "× " + t("team.cancelButton"),
      confirmLabel:
        "✓ " + (isSaving ? t("team.savingButton") : t("team.confirmButton")),
      isConfirmDisabled: isSaving,
      onCancel: () => cancelDraftChangesRef.current(),
      onConfirm: () => saveTeamRef.current(),
    });

    return () => onHeaderActionOverlayChange(null);
  }, [
    hasUnsavedChanges,
    isActive,
    isSaving,
    isPlayerPickerOpen,
    onHeaderActionOverlayChange,
    t,
    teamWorkspaceMode,
    isInitialTeamCreation,
  ]);

  const setupCanContinue = Boolean(trimmedTeamName) && !teamNameTooLong;
  const teamWorkspaceFooter =
    teamWorkspaceMode === "transfers" && transferStep === "review" ? (
      <View style={styles.teamBuilderFooterActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTransferStep("edit")}
          style={themedFooterSecondaryButtonStyle}
        >
          <Text style={themedFooterSecondaryTextStyle}>
            {t("team.transfers.editTransfers")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void handleConfirmTransfers()}
          style={[
            themedFooterPrimaryButtonStyle,
            isSaving ? styles.teamBuilderFooterButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.teamBuilderFooterPrimaryText,
              isSaving ? styles.teamBuilderFooterTextDisabled : null,
            ]}
          >
            {isSaving ? t("team.savingButton") : t("team.confirmButton")}
          </Text>
        </Pressable>
      </View>
    ) : isInitialTeamCreation && teamWorkspaceMode === "pick" ? (
      <View style={styles.teamBuilderFooterActions}>
        <Pressable
          accessibilityRole="button"
          onPress={handleResetDraft}
          style={themedFooterSecondaryButtonStyle}
        >
          <Text style={themedFooterSecondaryTextStyle}>
            {t("team.resetButton")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => void handleSaveTeam()}
          style={[
            themedFooterPrimaryButtonStyle,
            canSave ? null : styles.teamBuilderFooterButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.teamBuilderFooterPrimaryText,
              canSave ? null : styles.teamBuilderFooterTextDisabled,
            ]}
          >
            {isSaving ? t("team.savingButton") : t("team.saveButton")}
          </Text>
        </Pressable>
      </View>
    ) : teamWorkspaceMode === "transfers" ? (
      incomingTransferPlayer ? (
        <IncomingTransferCard
          onClear={() => setIncomingTransferPlayer(null)}
          player={incomingTransferPlayer}
          t={t}
        />
      ) : (
        <View style={styles.teamBuilderFooterActions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleAddTransferPlayer}
            style={themedFooterPrimaryButtonStyle}
          >
            <Text style={styles.teamBuilderFooterPrimaryText}>
              {t("team.transfers.addPlayer")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!canProceedTransfers}
            onPress={() => setTransferStep("review")}
            style={[
              themedFooterPrimaryButtonStyle,
              canProceedTransfers
                ? null
                : styles.teamBuilderFooterButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.teamBuilderFooterPrimaryText,
                canProceedTransfers
                  ? null
                  : styles.teamBuilderFooterTextDisabled,
              ]}
            >
              {t("team.transfers.next")}
            </Text>
          </Pressable>
        </View>
      )
    ) : null;
  const shouldRenderTransferListFooterInline =
    isDesktopWeb &&
    teamWorkspaceMode === "transfers" &&
    transferStep === "edit" &&
    teamViewMode === "list";
  const shouldPlaceTransferTabsBeforeSummary =
    isDesktopWeb &&
    teamWorkspaceMode === "transfers" &&
    transferStep === "edit";
  const shouldPlacePickTabsBeforeLeadContent =
    isDesktopWeb && teamWorkspaceMode === "pick" && !isInitialTeamCreation;
  const shouldPlaceTeamViewSwitchBeforeLeadContent =
    shouldPlaceTransferTabsBeforeSummary ||
    shouldPlacePickTabsBeforeLeadContent;

  function renderTransferSummaryBar() {
    return (
      <TransferSummaryBar
        bankValue={budgetValue}
        freeTransfersValue={freeTransfersText}
        isBankNegative={isBudgetNegative}
        squadValue={teamValueText}
        t={t}
      />
    );
  }

  function renderInitialTeamCreationSummaryPanel() {
    return (
      <View style={styles.teamBuilderPanel}>
        <View style={styles.teamBuilderCompactTopRow}>
          <View style={styles.teamBuilderIdentityBlock}>
            <Text numberOfLines={1} style={styles.teamBuilderIdentityTeamName}>
              {dashboardTeamName}
            </Text>
            <Text numberOfLines={1} style={styles.teamBuilderIdentityManager}>
              {managerName}
            </Text>
          </View>
          <View style={styles.teamBuilderSummaryPills}>
            <View style={styles.teamBuilderProgressRow}>
              <View
                style={[
                  styles.teamBuilderProgressPill,
                  selectedCount === season?.squadSize
                    ? styles.teamBuilderProgressPillSuccess
                    : styles.teamBuilderProgressPillDanger,
                ]}
              >
                <Text
                  style={[
                    styles.teamBuilderProgressValue,
                    selectedCount === season?.squadSize
                      ? styles.teamBuilderProgressValueSuccess
                      : styles.teamBuilderProgressValueDanger,
                  ]}
                >
                  {selectedCount}/{season?.squadSize ?? 12}
                </Text>
                <Text style={styles.teamBuilderProgressLabel}>
                  {t("team.create.playersSelected")}
                </Text>
              </View>
              <View
                style={[
                  styles.teamBuilderProgressPillBank,
                  isBudgetNegative
                    ? styles.teamBuilderProgressPillDanger
                    : styles.teamBuilderProgressPillSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.teamBuilderProgressValueBank,
                    isBudgetNegative
                      ? styles.teamBuilderProgressValueDanger
                      : styles.teamBuilderProgressValueSuccess,
                  ]}
                >
                  {budgetValue}
                </Text>
                <Text style={styles.teamBuilderProgressLabel}>
                  {t("team.bankLabel")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isOverviewLoading || !season ? (
          <Text style={styles.mutedText}>
            {isOverviewLoading
              ? t("team.dashboard.loadingDescription")
              : t("team.dashboard.noSeasonDescription")}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderTeamWorkspaceLeadContent() {
    if (isInitialTeamCreation) {
      return renderInitialTeamCreationSummaryPanel();
    }

    if (teamWorkspaceMode === "pick") {
      return <TeamChipTokenRail t={t} />;
    }

    if (isOverviewLoading || !season) {
      return (
        <Text style={styles.mutedText}>
          {isOverviewLoading
            ? t("team.dashboard.loadingDescription")
            : t("team.dashboard.noSeasonDescription")}
        </Text>
      );
    }

    return null;
  }

  function renderTeamViewSwitch() {
    if (isInitialTeamCreation) {
      return null;
    }

    return (
      <View
        style={[
          styles.teamViewSwitch,
          {
            backgroundColor: fantasyTheme.softColor,
            borderColor: fantasyTheme.borderColor,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleShowPitchView}
          style={[
            styles.teamViewSwitchButton,
            teamViewMode === "pitch"
              ? [
                  styles.teamViewSwitchButtonActive,
                  {
                    backgroundColor: fantasyTheme.primaryColor,
                    borderColor: fantasyTheme.primaryColor,
                  },
                ]
              : null,
          ]}
        >
          <Text
            style={[
              teamViewMode === "pitch"
                ? styles.teamViewSwitchTextActive
                : styles.teamViewSwitchText,
              teamViewMode !== "pitch"
                ? { color: fantasyTheme.primaryColor }
                : null,
            ]}
          >
            {t("team.view.pitch")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleShowListView}
          style={[
            styles.teamViewSwitchButton,
            teamViewMode === "list"
              ? [
                  styles.teamViewSwitchButtonActive,
                  {
                    backgroundColor: fantasyTheme.primaryColor,
                    borderColor: fantasyTheme.primaryColor,
                  },
                ]
              : null,
          ]}
        >
          <Text
            style={[
              teamViewMode === "list"
                ? styles.teamViewSwitchTextActive
                : styles.teamViewSwitchText,
              teamViewMode !== "list" ? { color: fantasyTheme.primaryColor } : null,
            ]}
          >
            {t("team.view.list")}
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderTeamPitchContent() {
    if (shouldUseRosterLayout) {
      return (
        <FutsalRosterLayout
          captainSlot={captainSlot}
          draftPicks={draftPicks}
          getSlotSwapState={getSlotSwapState}
          incomingPlayerIds={incomingTransferPlayerIds}
          onSlotPress={handleSlotDefinitionPress}
          showLeadershipBadges={teamWorkspaceMode !== "transfers"}
          showPlayerPrices={teamWorkspaceMode === "transfers"}
          slots={SQUAD_SLOT_DEFINITIONS}
          viceCaptainSlot={viceCaptainSlot}
        />
      );
    }

    return (
      <FutsalSquadLayout
        captainSlot={captainSlot}
        draftPicks={draftPicks}
        getSlotSwapState={getSlotSwapState}
        incomingPlayerIds={incomingTransferPlayerIds}
        onSlotPress={handleSlotDefinitionPress}
        slots={SQUAD_SLOT_DEFINITIONS}
        viceCaptainSlot={viceCaptainSlot}
      />
    );
  }

  const playerPickerRenderedPlayers = isPlayerPickerOpen
    ? activeSlotPlayers
    : playerPickerWarmupPlayers;
  const renderMountedPlayerPickerItem = isPlayerPickerOpen
    ? renderPlayerPickerItem
    : renderPlayerPickerWarmupItem;

  const playerPickerScreenNode = (
    <SafeAreaView
      accessibilityElementsHidden={!isPlayerPickerOpen}
      edges={["top", "right", "bottom", "left"]}
      importantForAccessibility={
        isPlayerPickerOpen ? "auto" : "no-hide-descendants"
      }
      pointerEvents={isPlayerPickerOpen ? "auto" : "none"}
      style={[
        styles.playerPickerScreen,
        styles.playerPickerScreenMounted,
        isPlayerPickerOpen
          ? styles.playerPickerScreenVisible
          : styles.playerPickerScreenHidden,
      ]}
    >
      <View style={styles.playerPickerHeader}>
        <Pressable
          accessibilityLabel={t("auth.back")}
          accessibilityRole="button"
          onPress={closePlayerPicker}
          style={styles.playerPickerBackButton}
        >
          <ArrowLeft color={colors.text.primary} size={22} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.playerPickerTitleGroup}>
          <Text style={styles.sectionTitle}>
            {t("team.transfers.addPlayer")}
          </Text>
          {playerPickerPurpose === "slot" && activeSlot ? (
            <Text style={styles.mutedText}>
              {shouldUseRosterLayout
                ? t(POSITION_LABEL_KEYS[activeSlot.position])
                : getSlotLabel(activeSlot, t) +
                  " · " +
                  t(POSITION_LABEL_KEYS[activeSlot.position])}
            </Text>
          ) : null}
        </View>
        <View style={styles.teamWorkspaceHeaderSpacer} />
      </View>

      <View
        style={[
          styles.playerPickerBankStrip,
          isPlayerPickerBudgetNegative
            ? styles.playerPickerBankStripDanger
            : styles.playerPickerBankStripSuccess,
        ]}
      >
        <Text
          style={[
            styles.playerPickerBankLabel,
            isPlayerPickerBudgetNegative
              ? styles.playerPickerBankLabelDanger
              : styles.playerPickerBankLabelSuccess,
          ]}
        >
          {t("team.bankLabel")}
        </Text>
        <Text
          style={[
            styles.playerPickerBankValue,
            isPlayerPickerBudgetNegative
              ? styles.playerPickerBankValueDanger
              : styles.playerPickerBankValueSuccess,
          ]}
        >
          {formatBudget(playerPickerBudgetRemaining)}
        </Text>
      </View>

      <View
        style={
          isDesktopWeb
            ? styles.playerPickerDesktopToolbar
            : styles.playerPickerControlStack
        }
      >
        <ClearableTextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearAccessibilityLabel={t("common.clearInput")}
          containerStyle={
            isDesktopWeb ? styles.playerPickerSearchInputContainerDesktop : null
          }
          onChangeText={setPlayerSearchQuery}
          placeholder={t("team.playerSearchPlaceholder")}
          placeholderTextColor="#6B7280"
          style={[
            styles.input,
            styles.playerPickerSearchInput,
            isDesktopWeb ? styles.playerPickerSearchInputDesktop : null,
          ]}
          value={playerSearchQuery}
        />

        <View
          style={[
            styles.playerPickerFilters,
            isDesktopWeb ? styles.playerPickerDesktopFilters : null,
          ]}
        >
          <View style={styles.playerPickerSelectRow}>
            {isDesktopWeb ? (
              <>
                <DesktopSelect
                  accessibilityLabel={t("team.playerPicker.allClubs")}
                  onValueChange={(value) => {
                    setPlayerPickerClubId(
                      value === PLAYER_PICKER_ALL_CLUBS_VALUE
                        ? null
                        : (value as Id<"fantasyClubs">),
                    );
                    setPlayerPickerDropdown(null);
                  }}
                  options={playerPickerClubOptions}
                  style={styles.playerPickerDesktopSelect}
                  value={playerPickerClubId ?? PLAYER_PICKER_ALL_CLUBS_VALUE}
                />
                <DesktopSelect
                  accessibilityLabel={t("team.playerPicker.sortFilter")}
                  onValueChange={(value) => {
                    setPlayerPickerSortMode(value as PlayerPickerSortMode);
                    setPlayerPickerDropdown(null);
                  }}
                  options={playerPickerSortOptions}
                  style={styles.playerPickerDesktopSelect}
                  value={playerPickerSortMode}
                />
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    setPlayerPickerDropdown((current) =>
                      current === "club" ? null : "club",
                    );
                  }}
                  style={[
                    styles.marketFilterButton,
                    styles.playerPickerSelectButton,
                    playerPickerClubId !== null
                      ? themedMarketFilterButtonActiveStyle
                      : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={
                      playerPickerClubId !== null
                        ? styles.marketFilterTextActive
                        : styles.marketFilterText
                    }
                  >
                    {playerPickerClubLabel}
                  </Text>
                  <ChevronDown
                    color={
                      playerPickerClubId !== null
                        ? colors.text.inverse
                        : colors.text.secondary
                    }
                    size={18}
                    strokeWidth={2.4}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    setPlayerPickerDropdown((current) =>
                      current === "sort" ? null : "sort",
                    );
                  }}
                  style={[
                    styles.marketFilterButton,
                    styles.playerPickerSelectButton,
                    playerPickerSortMode !== "default"
                      ? themedMarketFilterButtonActiveStyle
                      : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={
                      playerPickerSortMode !== "default"
                        ? styles.marketFilterTextActive
                        : styles.marketFilterText
                    }
                  >
                    {playerPickerSortLabel}
                  </Text>
                  <ChevronDown
                    color={
                      playerPickerSortMode !== "default"
                        ? colors.text.inverse
                        : colors.text.secondary
                    }
                    size={18}
                    strokeWidth={2.4}
                  />
                </Pressable>
              </>
            )}
          </View>

          {!isDesktopWeb && playerPickerDropdown === "club" ? (
            <View style={styles.playerPickerDropdown}>
              <ScrollView
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={styles.playerPickerDropdownScroll}
                contentContainerStyle={styles.playerPickerDropdownOptions}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPlayerPickerClubId(null);
                    setPlayerPickerDropdown(null);
                  }}
                  style={[
                    styles.seasonPickerOption,
                    playerPickerClubId === null
                      ? themedSeasonPickerOptionSelectedStyle
                      : null,
                  ]}
                >
                  <View style={styles.seasonPickerOptionBody}>
                    <View style={styles.seasonPickerOptionTextGroup}>
                      <Text
                        numberOfLines={1}
                        style={styles.seasonPickerOptionText}
                      >
                        {t("team.playerPicker.allClubs")}
                      </Text>
                    </View>
                  </View>
                  {playerPickerClubId === null ? (
                    <Check
                      color={fantasyTheme.primaryColor}
                      size={22}
                      strokeWidth={2.8}
                    />
                  ) : (
                    <View style={styles.seasonPickerOptionRadio} />
                  )}
                </Pressable>

                {activeClubs.map((club) => {
                  const isSelectedClub = playerPickerClubId === club.id;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={club.id}
                      onPress={() => {
                        setPlayerPickerClubId(club.id);
                        setPlayerPickerDropdown(null);
                      }}
                      style={[
                        styles.seasonPickerOption,
                        isSelectedClub
                          ? themedSeasonPickerOptionSelectedStyle
                          : null,
                      ]}
                    >
                      <View style={styles.seasonPickerOptionBody}>
                        <FantasyClubLogo club={club} size="sm" />
                        <View style={styles.seasonPickerOptionTextGroup}>
                          <Text
                            numberOfLines={1}
                            style={styles.seasonPickerOptionText}
                          >
                            {club.name}
                          </Text>
                        </View>
                      </View>
                      {isSelectedClub ? (
                        <Check
                          color={fantasyTheme.primaryColor}
                          size={22}
                          strokeWidth={2.8}
                        />
                      ) : (
                        <View style={styles.seasonPickerOptionRadio} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {!isDesktopWeb && playerPickerDropdown === "sort" ? (
            <View style={styles.playerPickerDropdown}>
              <View style={styles.playerPickerDropdownOptions}>
                {PLAYER_PICKER_SORT_OPTIONS.map((option) => {
                  const isSelectedSort = playerPickerSortMode === option.id;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.id}
                      onPress={() => {
                        setPlayerPickerSortMode(option.id);
                        setPlayerPickerDropdown(null);
                      }}
                      style={[
                        styles.seasonPickerOption,
                        isSelectedSort
                          ? themedSeasonPickerOptionSelectedStyle
                          : null,
                      ]}
                    >
                      <View style={styles.seasonPickerOptionBody}>
                        <View style={styles.seasonPickerOptionTextGroup}>
                          <Text
                            numberOfLines={1}
                            style={styles.seasonPickerOptionText}
                          >
                            {t(option.labelKey)}
                          </Text>
                        </View>
                      </View>
                      {isSelectedSort ? (
                        <Check
                          color={fantasyTheme.primaryColor}
                          size={22}
                          strokeWidth={2.8}
                        />
                      ) : (
                        <View style={styles.seasonPickerOptionRadio} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {fantasyPlayers === undefined ? (
        <View style={styles.playerPickerLoadingState}>
          <LoadingLogo style={styles.playerPickerLoadingLogo} />
          <Text style={styles.mutedText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <View style={styles.playerPickerListFrame}>
          {isPlayerPickerOpen && activeSlotPlayers.length === 0 ? (
            <Text style={styles.mutedText}>
              {normalizedPlayerSearchQuery
                ? t("team.noPlayersSearchResults")
                : t("team.noPlayersForSlot")}
            </Text>
          ) : null}

          {playerPickerRenderedPlayers.length > 0 ? (
            <ScrollView
              ref={playerPickerHorizontalScrollRef}
              horizontal
              bounces={false}
              disableScrollViewPanResponder
              directionalLockEnabled
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.playerPickerHorizontalScrollContent}
              style={styles.playerPickerHorizontalScroll}
            >
              <View style={styles.playerPickerStatsTable}>
                <FantasyPlayerPickerStatsHeader t={t} />
                <FlashList
                  ref={playerPickerListRef}
                  contentContainerStyle={styles.playerPickerList}
                  data={playerPickerRenderedPlayers}
                  drawDistance={FANTASY_PLAYER_PICKER_STATS_ITEM_HEIGHT * 8}
                  getItemType={(player) => player.position}
                  keyExtractor={(player) => player.id}
                  keyboardShouldPersistTaps="always"
                  maintainVisibleContentPosition={{ disabled: true }}
                  nestedScrollEnabled
                  renderItem={renderMountedPlayerPickerItem}
                  style={styles.playerPickerVirtualList}
                />
              </View>
            </ScrollView>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );

  return (
    <View style={styles.fantasyScreenFrameRoot}>
      <FantasyScreenFrame
        contentContainerStyle={
          teamWorkspaceMode === "setup"
            ? [
                styles.teamCreateSetupFrameContent,
                isDesktopWeb ? styles.teamCreateSetupFrameContentDesktop : null,
              ]
            : undefined
        }
        kicker={t("team.kicker")}
        title={t("team.title")}
      >
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="cover"
          recyclingKey="futsal-field-preload"
          source={FUTSAL_FIELD_IMAGE}
          style={styles.futsalFieldPreloadImage}
        />
        {teamWorkspaceMode === "overview" ? (
          isFantasyTeamLoading ? (
            <View style={styles.teamBuilderPanel}>
              <Text style={styles.sectionTitle}>
                {t("team.dashboard.loadingTitle")}
              </Text>
              <Text style={styles.mutedText}>
                {t("team.dashboard.loadingDescription")}
              </Text>
            </View>
          ) : !hasTeamForUi ? (
            <TeamCreateWelcome
              onPickTeam={() => {
                setFeedbackText(null);
                setShowSaveHint(false);
                setTeamWorkspaceMode("setup");
              }}
              onRules={() => setLegalSheetKind("rules")}
              season={fantasySeason}
              t={t}
            />
          ) : (
            <>
              {liveGameweekNotice ? (
                <View style={styles.teamLiveGameweekNotice}>
                  <Text style={styles.teamLiveGameweekNoticeText}>
                    {liveGameweekNotice}
                  </Text>
                </View>
              ) : null}

              <View
                style={
                  shouldUseTeamOverviewWideLayout
                    ? styles.teamOverviewWebGrid
                    : styles.teamOverviewStack
                }
              >
                <View
                  style={
                    shouldUseTeamOverviewWideLayout
                      ? styles.teamOverviewWebCardPane
                      : undefined
                  }
                >
                  <TeamDashboardCard
                    actionDeadlineValue={dashboardActionDeadlineValue}
                    actionGameweekNumber={
                      dashboardActionGameweek?.number ?? null
                    }
                    averagePoints={averagePointsText}
                    currentGameweekNumber={dashboardCurrentGameweekNumber}
                    highestPoints={highestPointsText}
                    onOpenHighestDetails={
                      canOpenDashboardHighestTeam
                        ? () => {
                            const highestTeam = dashboardHighestTeam;
                            if (!highestTeam?.id) return;
                            setPointsViewerTeamId(
                              highestTeam.id as Id<"fantasyTeams">,
                            );
                            setPointsViewerGameweekId(
                              (highestTeam.currentGameweekId ??
                                dashboardCurrentGameweekId) as Id<"fantasyGameweeks"> | null,
                            );
                            setTeamWorkspaceMode("pointsDetails");
                          }
                        : undefined
                    }
                    onOpenPointsDetails={() => {
                      if (fantasyTeam?.id) {
                        setPointsViewerTeamId(fantasyTeam.id);
                      }
                      setPointsViewerGameweekId(dashboardCurrentGameweekId);
                      setTeamWorkspaceMode("pointsDetails");
                    }}
                    onPickTeam={() => setTeamWorkspaceMode("pick")}
                    onTransfers={() => {
                      handleResetTransferDraft();
                      setTeamViewMode("pitch");
                      setTeamWorkspaceMode("transfers");
                    }}
                    points={gameweekPointsText}
                    season={fantasySeason}
                    teamName={dashboardTeamName}
                  />
                </View>

                <View
                  style={
                    shouldUseTeamOverviewWideLayout
                      ? styles.teamOverviewWebListPane
                      : undefined
                  }
                >
                  <TeamOverviewPanel
                    bankValue={budgetValue}
                    freeTransfersValue={freeTransfersText}
                    gameweekPointsValue={gameweekPointsText}
                    overallPointsValue={totalPointsText}
                    overallRankValue={overallRankText}
                    squadValue={teamValueText}
                    t={t}
                  />
                </View>
              </View>
            </>
          )
        ) : teamWorkspaceMode === "pointsDetails" ? (
          pointsViewerTeamId || fantasyTeam?.id ? (
            <GameweekTeamViewer
              clubs={fantasyClubs}
              fantasyTeamId={
                (pointsViewerTeamId ?? fantasyTeam?.id) as Id<"fantasyTeams">
              }
              gameweekId={pointsViewerGameweekId ?? dashboardCurrentGameweekId}
              highestPointsOverride={
                dashboardHighestTeam
                  ? getFiniteFantasyNumber(
                      dashboardHighestTeam.currentGameweekPoints,
                    )
                  : undefined
              }
              highestTeamIdOverride={
                dashboardHighestTeam?.id
                  ? (dashboardHighestTeam.id as Id<"fantasyTeams">)
                  : undefined
              }
              key={`${pointsViewerTeamId ?? fantasyTeam?.id}:${
                pointsViewerGameweekId ??
                dashboardCurrentGameweekId ??
                "current"
              }`}
              onBack={() => {
                setPointsViewerTeamId(null);
                setPointsViewerGameweekId(null);
                setTeamWorkspaceMode("overview");
              }}
              onOpenTeam={(teamId) => {
                setPointsViewerTeamId(teamId);
                setPointsViewerGameweekId(
                  pointsViewerGameweekId ?? dashboardCurrentGameweekId,
                );
              }}
              seasonSlug={fantasyOverview?.season?.slug ?? null}
            />
          ) : (
            <View style={styles.teamBuilderPanel}>
              <Text style={styles.sectionTitle}>
                {t("team.viewer.teamUnavailable")}
              </Text>
            </View>
          )
        ) : teamWorkspaceMode === "setup" ? (
          <TeamCreateSetup
            canContinue={setupCanContinue}
            favoriteClub={favoriteClub}
            favoriteClubId={favoriteClubId}
            favoriteClubOptions={activeClubs}
            isDesktopWeb={isDesktopWeb}
            onCancel={handleCancelTeamSetup}
            onContinue={handleSetupContinue}
            onFavoriteClubChange={setFavoriteClubId}
            onOpenFavoriteClubPicker={() => setIsFavoriteClubPickerOpen(true)}
            onTeamNameChange={(value) => {
              setTeamName(value);
              setFeedbackText(null);
              setShowSaveHint(false);
            }}
            season={fantasySeason}
            shouldHighlightTeamName={shouldHighlightTeamName}
            t={t}
            teamName={teamName}
            teamNameErrorText={
              teamNameLengthError ??
              (showSaveHint && !trimmedTeamName
                ? t("team.builder.nameRequired")
                : null)
            }
          />
        ) : (
          <>
            <TeamWorkspaceHeader
              deadlineValue={deadlineValue}
              gameweekLabel={gameweekLabel}
              mode={teamWorkspaceMode}
              onBack={handleWorkspaceBack}
              onRightAction={
                teamWorkspaceMode === "transfers" &&
                transferStep === "edit" &&
                hasPendingTransferState
                  ? handleResetTransferDraft
                  : undefined
              }
              rightActionLabel={
                teamWorkspaceMode === "transfers" &&
                transferStep === "edit" &&
                hasPendingTransferState
                  ? t("team.resetButton")
                  : undefined
              }
              t={t}
              titleOverride={
                isInitialTeamCreation
                  ? t("team.setup.createTeamTitle")
                  : undefined
              }
            />

            {feedbackBannerText ? (
              <View pointerEvents="none" style={styles.teamMessageStrip}>
                <View
                  style={[
                    styles.teamMessageBanner,
                    styles.teamMessageBannerError,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.teamMessageTextError}>
                    {feedbackBannerText}
                  </Text>
                </View>
              </View>
            ) : null}

            {teamWorkspaceMode === "transfers" && transferStep === "review" ? (
              <TransferReviewScreen
                additionalTransfersUsed={additionalTransfersUsed}
                bankValue={budgetValue}
                changes={transferChanges}
                isBankNegative={isBudgetNegative}
                deadlineValue={deadlineValue}
                freeTransfersUsed={freeTransfersUsed}
                gameweekLabel={gameweekLabel}
                pointsSpentValue={transferPenaltyValue}
                hasPointsPenalty={transferPenaltyPoints > 0}
                t={t}
              />
            ) : (
              <>
                {shouldUseTeamBuilderDesktopFieldLayout ? (
                  <View style={styles.teamBuilderDesktopDraftLayout}>
                    <View style={styles.teamBuilderDesktopFieldPane}>
                      {renderTeamPitchContent()}
                    </View>
                    <View style={styles.teamBuilderDesktopSidePane}>
                      {shouldPlaceTeamViewSwitchBeforeLeadContent
                        ? renderTeamViewSwitch()
                        : null}
                      {teamWorkspaceMode === "transfers"
                        ? renderTransferSummaryBar()
                        : null}
                      {renderTeamWorkspaceLeadContent()}
                      {shouldPlaceTeamViewSwitchBeforeLeadContent
                        ? null
                        : renderTeamViewSwitch()}
                      {teamWorkspaceFooter}
                    </View>
                  </View>
                ) : (
                  <>
                    {shouldPlaceTeamViewSwitchBeforeLeadContent
                      ? renderTeamViewSwitch()
                      : null}
                    {teamWorkspaceMode === "transfers"
                      ? renderTransferSummaryBar()
                      : null}

                    {renderTeamWorkspaceLeadContent()}
                    {shouldPlaceTeamViewSwitchBeforeLeadContent
                      ? null
                      : renderTeamViewSwitch()}
                    {shouldRenderTransferListFooterInline
                      ? teamWorkspaceFooter
                      : null}

                    {!isInitialTeamCreation && teamViewMode === "list" ? (
                      <FutsalSquadListLayout
                        captainSlot={captainSlot}
                        clubsById={clubsById}
                        draftPicks={draftPicks}
                        getSlotSwapState={getSlotSwapState}
                        incomingPlayerIds={incomingTransferPlayerIds}
                        onSlotPress={handleSlotDefinitionPress}
                        slots={SQUAD_SLOT_DEFINITIONS}
                        viceCaptainSlot={viceCaptainSlot}
                      />
                    ) : (
                      renderTeamPitchContent()
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {teamWorkspaceFooter &&
        !shouldUseTeamBuilderDesktopFieldLayout &&
        !shouldRenderTransferListFooterInline
          ? teamWorkspaceFooter
          : null}

        <PlayerDetailSheet
          canSetLeadership={Boolean(
            teamWorkspaceMode === "pick" &&
            detailSlot &&
            detailSlot.squadRole !== "reserve",
          )}
          isCaptain={detailSlot?.rosterSlot === captainSlot}
          isViceCaptain={detailSlot?.rosterSlot === viceCaptainSlot}
          mode="squad"
          onClose={() => setDetailSlot(null)}
          onRemove={
            canEditDetailPlayerPool ? handleRemoveDetailPlayer : undefined
          }
          onReplace={
            canEditDetailPlayerPool ? handleReplaceDetailPlayer : undefined
          }
          onSetCaptain={handleSetCaptainFromDetail}
          onSetViceCaptain={handleSetViceCaptainFromDetail}
          onSwap={canSwapDetailPlayer ? handleStartSwapFromDetail : undefined}
          player={detailSlotPlayer}
          visible={Boolean(detailSlotPlayer)}
        />

        <BottomSheet
          onClose={() => setRestoreTransferSlot(null)}
          onCloseEnd={handleRestoreSheetCloseEnd}
          sheetStyle={styles.transferRestoreSheet}
          visible={Boolean(restoreTransferSlot && restoreTransferPlayer)}
        >
          <View style={styles.transferRestoreOptions}>
            <Text numberOfLines={1} style={styles.transferRestorePlayerName}>
              {restoreTransferPlayer?.displayName ?? ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRestoreTransferPlayer}
              style={styles.transferRestoreOption}
            >
              <Text style={styles.transferRestoreOptionTitle}>
                {t("team.transfers.restorePlayer")}
              </Text>
              <Text style={styles.transferRestoreOptionMeta}>
                {t("team.transfers.restorePlayerDescription")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleChooseReplacementForRestoredSlot}
              style={styles.transferRestoreOption}
            >
              <Text style={styles.transferRestoreOptionTitle}>
                {t("team.transfers.chooseReplacement")}
              </Text>
              <Text style={styles.transferRestoreOptionMeta}>
                {t("team.transfers.chooseReplacementDescription")}
              </Text>
            </Pressable>
          </View>
        </BottomSheet>

        {!isDesktopWeb ? (
          <BottomSheet
            onClose={() => setIsFavoriteClubPickerOpen(false)}
            sheetStyle={styles.clubPickerSheet}
            visible={isFavoriteClubPickerOpen}
          >
            <View style={styles.clubPickerOptions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setFavoriteClubId(null);
                  setIsFavoriteClubPickerOpen(false);
                }}
                style={[
                  styles.clubPickerOption,
                  favoriteClubId === null
                    ? themedClubPickerOptionSelectedStyle
                    : null,
                ]}
              >
                <View style={styles.clubPickerOptionTextGroup}>
                  <Text style={styles.clubPickerOptionText}>
                    {t("team.setup.favoriteClubPlaceholder")}
                  </Text>
                  <Text style={styles.clubPickerOptionMeta}>
                    {t("team.setup.favoriteClubOptional")}
                  </Text>
                </View>
                {favoriteClubId === null ? (
                  <Check
                    color={fantasyTheme.primaryColor}
                    size={20}
                    strokeWidth={3}
                  />
                ) : null}
              </Pressable>

              {activeClubs.map((club) => (
                <Pressable
                  accessibilityRole="button"
                  key={club.id}
                  onPress={() => {
                    setFavoriteClubId(club.id);
                    setIsFavoriteClubPickerOpen(false);
                  }}
                  style={[
                  styles.clubPickerOption,
                  favoriteClubId === club.id
                      ? themedClubPickerOptionSelectedStyle
                      : null,
                  ]}
                >
                  <FantasyClubLogo club={club} />
                  <View style={styles.clubPickerOptionTextGroup}>
                    <Text numberOfLines={1} style={styles.clubPickerOptionText}>
                      {club.name}
                    </Text>
                    {club.shortName ? (
                      <Text
                        numberOfLines={1}
                        style={styles.clubPickerOptionMeta}
                      >
                        {club.shortName}
                      </Text>
                    ) : null}
                  </View>
                  {favoriteClubId === club.id ? (
                    <Check
                      color={fantasyTheme.primaryColor}
                      size={20}
                      strokeWidth={3}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </BottomSheet>
        ) : null}

        <LegalTextSheet
          kind={legalSheetKind ?? "rules"}
          onClose={() => setLegalSheetKind(null)}
          visible={Boolean(legalSheetKind)}
        />
      </FantasyScreenFrame>
      {playerPickerScreenNode}
    </View>
  );
}
