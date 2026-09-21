import type { Id } from "../../../../convex/_generated/dataModel";
import { Image } from "expo-image";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { AppLoadingOverlay } from "../../../components/common/AppLoadingOverlay";
import { useSafeQuery } from "../../../hooks/useSafeQuery";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { FANTASY_STATIC_IMAGE_PROPS } from "../assets/fantasyAssets";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { useFutsalFieldLayout } from "../utils/useFutsalFieldLayout";
import {
  FantasyPlayerListRow,
  FantasyPlayerPickerStatsHeader,
  type FantasyPlayerListRowClub,
  type FantasyPlayerListRowPlayer,
} from "./FantasyPlayerListRow";
import { SquadPitchLayout } from "./SquadPitchLayout";
import { SquadListTable } from "./SquadListTable";
import {
  PlayerMatchBreakdownSheet,
  type PlayerProfileMatch,
} from "./PlayerMatchHistory";
import { TeamKitAvatar } from "./TeamKitAvatar";

type PlayerPosition = "goalkeeper" | "universal";
type PlayerStatus =
  | "active"
  | "doubtful"
  | "injured"
  | "suspended"
  | "unavailable"
  | "left";

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

type PointLine = {
  count: number | null;
  kind: PlayerPointLineKind;
  points: number;
};

type ViewerClub = {
  id: string | null;
  isActive?: boolean;
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName: string | null;
  sortOrder?: number;
};

type ViewerPlayer = {
  appearances?: number | null;
  assists?: number | null;
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  firstName?: string | null;
  cleanSheets?: number | null;
  form?: number | null;
  goals?: number | null;
  goalsConceded?: number | null;
  id: Id<"fantasyPlayers">;
  lastGameweekPoints?: number | null;
  lastName?: string | null;
  ownGoals?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  photoThumbnailUrl?: string | null;
  photoUrl?: string | null;
  position: PlayerPosition;
  previousPrice?: number | null;
  price?: number | null;
  priceChangedAt?: number | null;
  priceDelta?: number | null;
  redCards?: number | null;
  saves?: number | null;
  seasonPoints?: number | null;
  selectedPercent?: number | null;
  status?: PlayerStatus | null;
  yellowCards?: number | null;
};

type TeamGameweekPlayer = {
  appeared: boolean;
  captainBonusPoints: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  lines: PointLine[];
  matches: PlayerProfileMatch[];
  managerPoints: number;
  multiplier: number;
  player: ViewerPlayer | null;
  rawPlayerPoints: number;
  rolePoints: number;
  rosterSlot: number;
  squadRole: "starter" | "bench" | "reserve";
};

type TeamGameweekView =
  | {
      averagePoints: number;
      gameweek: {
        id: Id<"fantasyGameweeks">;
        name: string;
        number: number;
        status: string;
      } | null;
      highestTeam: {
        id: Id<"fantasyTeams">;
        managerName: string | null;
        name: string;
        points: number;
      } | null;
      players: TeamGameweekPlayer[];
      score: {
        participated: boolean;
        points: number;
      } | null;
      team: {
        id: Id<"fantasyTeams">;
        managerName: string | null;
        name: string;
      };
    }
  | null
  | undefined;

function useLastDefinedTeamGameweekView(
  value: TeamGameweekView,
  cacheKey: string | undefined,
) {
  const cachedRef = useRef<{
    cacheKey: string | undefined;
    value: TeamGameweekView;
  }>({ cacheKey, value: undefined });

  if (cachedRef.current.cacheKey !== cacheKey) {
    cachedRef.current = { cacheKey, value: undefined };
  }

  if (value !== undefined) {
    cachedRef.current.value = value;
  }

  return value === undefined ? cachedRef.current.value : value;
}



type SquadSlotDefinition = {
  position: PlayerPosition;
  rosterSlot: number;
  squadRole: "starter" | "bench" | "reserve";
};

const SQUAD_SLOT_DEFINITIONS: SquadSlotDefinition[] = [
  { position: "universal", rosterSlot: 1, squadRole: "starter" },
  { position: "universal", rosterSlot: 2, squadRole: "starter" },
  { position: "universal", rosterSlot: 3, squadRole: "starter" },
  { position: "universal", rosterSlot: 4, squadRole: "starter" },
  { position: "goalkeeper", rosterSlot: 5, squadRole: "starter" },
  { position: "universal", rosterSlot: 6, squadRole: "bench" },
  { position: "universal", rosterSlot: 7, squadRole: "bench" },
  { position: "universal", rosterSlot: 8, squadRole: "bench" },
  { position: "universal", rosterSlot: 9, squadRole: "bench" },
  { position: "goalkeeper", rosterSlot: 10, squadRole: "reserve" },
  { position: "universal", rosterSlot: 11, squadRole: "reserve" },
  { position: "universal", rosterSlot: 12, squadRole: "reserve" },
];


function formatViewerNumber(value: number | null | undefined) {
  const rounded = Number((value ?? 0).toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}


function formatSlotPoints(item: TeamGameweekPlayer) {
  return `${formatViewerNumber(item.rawPlayerPoints)} (${formatViewerNumber(
    item.managerPoints,
  )})`;
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

function getPointLineCount(
  lines: PointLine[],
  kinds: readonly PlayerPointLineKind[],
) {
  return lines.reduce((total, line) => {
    if (!kinds.includes(line.kind)) return total;
    return total + (line.count ?? 1);
  }, 0);
}

function toReadonlyListPlayer(
  item: TeamGameweekPlayer,
): FantasyPlayerListRowPlayer | null {
  const player = item.player;
  if (!player) return null;

  return {
    appearances:
      player.appearances ?? getPointLineCount(item.lines, ["appearance"]),
    assists: player.assists ?? getPointLineCount(item.lines, ["assist"]),
    clubName: player.clubName,
    displayName: player.displayName,
    firstName: player.firstName ?? null,
    goals: player.goals ?? getPointLineCount(item.lines, ["goal"]),
    lastGameweekPoints: item.rawPlayerPoints,
    lastName: player.lastName ?? null,
    penaltiesMissed:
      player.penaltiesMissed ??
      getPointLineCount(item.lines, ["penalty_missed"]),
    penaltiesSaved:
      player.penaltiesSaved ?? getPointLineCount(item.lines, ["penalty_saved"]),
    photoThumbnailUrl: player.photoThumbnailUrl ?? null,
    photoUrl: player.photoUrl ?? null,
    position: player.position,
    previousPrice: player.previousPrice ?? null,
    price: player.price ?? 0,
    priceChangedAt: player.priceChangedAt ?? null,
    priceDelta: player.priceDelta ?? null,
    redCards:
      player.redCards ??
      getPointLineCount(item.lines, ["red_card", "second_yellow_red"]),
    seasonPoints: player.seasonPoints ?? item.rawPlayerPoints,
    selectedPercent: player.selectedPercent ?? 0,
    status: player.status ?? "active",
    yellowCards:
      player.yellowCards ?? getPointLineCount(item.lines, ["yellow_card"]),
  };
}

function getPlayerSurnameLabel(displayName: string) {
  const fallbackLabel = displayName.trim();
  const labelSource = getBracketAliasLabel(fallbackLabel) ?? fallbackLabel;
  const parts = labelSource.split(/\s+/).filter(Boolean);
  const rawLabel = parts.at(-1) ?? labelSource;
  return normalizePlayerShortLabel(rawLabel) || fallbackLabel;
}

function normalizeClubNameKey(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function ViewerStat({
  isPrimary,
  label,
  onPress,
  value,
}: {
  isPrimary?: boolean;
  label: string;
  onPress?: () => void;
  value: string;
}) {
  const fantasyTheme = useFantasySeasonTheme();
  const content = (
    <>
      <Text
        numberOfLines={1}
        style={[
          styles.gameweekViewerStatValue,
          isPrimary ? styles.gameweekViewerStatValuePrimary : null,
          !isPrimary ? { color: fantasyTheme.primaryColor } : null,
        ]}
      >
        {value}
      </Text>
      <View style={styles.gameweekViewerStatLabelRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.gameweekViewerStatLabel,
            isPrimary ? styles.gameweekViewerStatLabelPrimary : null,
          ]}
        >
          {label}
        </Text>
        {onPress ? (
          <ChevronRight
            color={isPrimary ? colors.text.inverse : fantasyTheme.primaryColor}
            size={15}
            strokeWidth={2.6}
          />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.gameweekViewerStat,
          isPrimary ? styles.gameweekViewerStatPrimary : null,
          isPrimary ? { backgroundColor: fantasyTheme.primaryColor } : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.gameweekViewerStat,
        isPrimary ? styles.gameweekViewerStatPrimary : null,
        isPrimary ? { backgroundColor: fantasyTheme.primaryColor } : null,
      ]}
    >
      {content}
    </View>
  );
}

function TeamViewerStats({
  averagePoints,
  highestPoints,
  onHighestPress,
  points,
}: {
  averagePoints: number;
  highestPoints: number;
  onHighestPress?: () => void;
  points: number;
}) {
  const { t } = useI18n();

  return (
    <View style={styles.gameweekViewerStatsRow}>
      <ViewerStat
        label={t("team.dashboard.averageLabel")}
        value={formatViewerNumber(averagePoints)}
      />
      <ViewerStat
        isPrimary
        label={t("team.viewer.totalPts")}
        value={formatViewerNumber(points)}
      />
      <ViewerStat
        label={t("team.dashboard.highestLabel")}
        onPress={onHighestPress}
        value={formatViewerNumber(highestPoints)}
      />
    </View>
  );
}

function TeamViewerHeader({
  gameweekNumber,
  onBack,
  teamName,
}: {
  gameweekNumber: number | null;
  onBack: () => void;
  teamName: string;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const gameweekLabel = t("team.dashboard.gameweekLabel").replace(
    "{number}",
    gameweekNumber ? String(gameweekNumber) : "-",
  );

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
        <Text numberOfLines={1} style={styles.teamWorkspaceTitle}>
          {teamName}
        </Text>
        <Text style={styles.teamWorkspaceDeadline}>{gameweekLabel}</Text>
      </View>
      <View style={styles.teamWorkspaceHeaderSpacer} />
    </View>
  );
}

function getPlayerSlotAccessibilityLabel(item: TeamGameweekPlayer | null) {
  if (!item?.player) return "";
  return `${item.player.displayName}: ${formatSlotPoints(item)}`;
}

type ReadonlySquadSlotSize = "field" | "side" | "compact";

function ReadonlySquadSlot({
  item,
  onPlayerPress,
  position,
  size = "field",
}: {
  item: TeamGameweekPlayer | null;
  onPlayerPress: (playerId: Id<"fantasyPlayers">) => void;
  position: PlayerPosition;
  size?: ReadonlySquadSlotSize;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const player = item?.player ?? null;
  const isCompactSlot = size === "compact";
  const isSideSlot = size === "side";
  const leadershipLabel = item?.isCaptain
    ? t("team.leadership.captainShort")
    : item?.isViceCaptain
      ? t("team.leadership.viceCaptainShort")
      : null;
  const avatarSize = isCompactSlot ? "sm" : isSideSlot ? "md" : "lg";

  return (
    <Pressable
      accessibilityLabel={getPlayerSlotAccessibilityLabel(item)}
      accessibilityRole="button"
      disabled={!player}
      onPress={() => {
        if (player) onPlayerPress(player.id);
      }}
      style={[
        styles.futsalSquadSlotButton,
        isSideSlot ? styles.futsalSquadSlotButtonSide : null,
        player ? styles.futsalSquadSlotButtonFilled : null,
        styles.gameweekViewerSlotButton,
        isSideSlot ? styles.gameweekViewerSlotButtonSide : null,
        isCompactSlot ? styles.gameweekViewerSlotButtonCompact : null,
      ]}
    >
      {leadershipLabel ? (
        <Text
          style={[
            styles.futsalSquadLeadershipBadge,
            { backgroundColor: fantasyTheme.primaryColor },
            item?.isViceCaptain
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
      {player ? (
        <>
          <TeamKitAvatar
            clubName={player.clubName}
            displayName={player.displayName}
            position={player.position}
            size={avatarSize}
            variant="slot"
          />
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.68}
            numberOfLines={1}
            style={[
              styles.futsalSquadSlotName,
              isCompactSlot ? styles.gameweekViewerSlotNameCompact : null,
            ]}
          >
            {getPlayerSurnameLabel(player.displayName)}
          </Text>
          <View
            style={[
              styles.gameweekViewerSlotScoreFooter,
              { backgroundColor: fantasyTheme.softColor },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.gameweekViewerSlotScore,
                { color: fantasyTheme.primaryColor },
                isCompactSlot ? styles.gameweekViewerSlotScoreCompact : null,
              ]}
            >
              {item ? formatSlotPoints(item) : ""}
            </Text>
          </View>
        </>
      ) : (
        <Text
          style={[
            styles.futsalSquadSlotPosition,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {position === "goalkeeper"
            ? t("players.positionShort.goalkeeper")
            : t("players.positionShort.universal")}
        </Text>
      )}
    </Pressable>
  );
}

function ReadonlyPitch({
  onPlayerPress,
  players,
}: {
  onPlayerPress: (playerId: Id<"fantasyPlayers">) => void;
  players: TeamGameweekPlayer[];
}) {
  const fantasyTheme = useFantasySeasonTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const {
    aspectRatio,
    isLandscape,
    source: fieldImage,
  } = useFutsalFieldLayout();

  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const shouldUseCompactPitch =
    Platform.OS !== "web" && (windowWidth <= 420 || windowHeight <= 900);
  const playersBySlot = new Map(players.map((item) => [item.rosterSlot, item]));
  const starters = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "starter",
  );
  const bench = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "bench",
  );
  const reserve = SQUAD_SLOT_DEFINITIONS.filter(
    (slot) => slot.squadRole === "reserve",
  );
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
  const fieldSlotStyles = isLandscape
    ? [
        styles.futsalFieldSlotGoalkeeperLandscape,
        styles.futsalFieldSlotLeftDeepLandscape,
        styles.futsalFieldSlotRightDeepLandscape,
        styles.futsalFieldSlotLeftHighLandscape,
        styles.futsalFieldSlotRightHighLandscape,
      ]
    : [
        styles.futsalFieldSlotGoalkeeper,
        styles.futsalFieldSlotLeftDeep,
        styles.futsalFieldSlotRightDeep,
        styles.futsalFieldSlotLeftHigh,
        styles.futsalFieldSlotRightHigh,
      ];
  const compactFieldSlotStyles = [
    styles.futsalFieldSlotGoalkeeperCompact,
    styles.futsalFieldSlotLeftDeepCompact,
    styles.futsalFieldSlotRightDeepCompact,
    styles.futsalFieldSlotLeftHighCompact,
    styles.futsalFieldSlotRightHighCompact,
  ];
  const fieldSlotSize: ReadonlySquadSlotSize = shouldUseCompactPitch
    ? "compact"
    : "field";

  const renderSlot = (
    slot: SquadSlotDefinition,
    size: ReadonlySquadSlotSize = "field",
  ) => (
    <ReadonlySquadSlot
      item={playersBySlot.get(slot.rosterSlot) ?? null}
      onPlayerPress={onPlayerPress}
      position={slot.position}
      size={size}
    />
  );

  return (
    <SquadPitchLayout
      aspectRatio={aspectRatio}
      fitToAvailableHeight={isDesktopWeb}
      sideSlotHeight={styles.gameweekViewerSlotButtonSide.height}
      bench={bench.map((slot) => (
        <View key={slot.rosterSlot} style={styles.futsalBenchSlotWrap}>
          {renderSlot(slot, "side")}
        </View>
      ))}
      reserve={reserve.map((slot) => (
        <View key={slot.rosterSlot} style={styles.futsalReserveSlotWrap}>
          {renderSlot(slot, "side")}
        </View>
      ))}
    >
      <View
        style={[
          styles.futsalFieldFrame,
          {
            alignSelf: isLandscape ? "flex-start" : "stretch",
            aspectRatio,
            backgroundColor: fantasyTheme.softColor,
            borderColor: fantasyTheme.borderColor,
          },
        ]}
      >
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit={isLandscape ? "contain" : "cover"}
          recyclingKey={
            isLandscape
              ? "gameweek-viewer-field-horizontal"
              : "gameweek-viewer-field"
          }
          source={fieldImage}
          style={styles.futsalFieldImage}
        />
        {fieldSlots.map((slot, index) =>
          slot ? (
            <View
              key={slot.rosterSlot}
              style={[
                styles.futsalFieldSlot,
                fieldSlotStyles[index],
                shouldUseCompactPitch ? styles.futsalFieldSlotCompact : null,
                shouldUseCompactPitch && !isLandscape
                  ? compactFieldSlotStyles[index]
                  : null,
              ]}
            >
              {renderSlot(slot, fieldSlotSize)}
            </View>
          ) : null,
        )}
      </View>
    </SquadPitchLayout>
  );
}

function ReadonlyList({
  clubs,
  fitToAvailableHeight = false,
  onPlayerPress,
  players,
}: {
  clubs: ViewerClub[] | undefined;
  fitToAvailableHeight?: boolean;
  onPlayerPress: (playerId: Id<"fantasyPlayers">) => void;
  players: TeamGameweekPlayer[];
}) {
  const { t } = useI18n();
  const clubsById = useMemo(
    () =>
      new Map<string, FantasyPlayerListRowClub>(
        (clubs ?? [])
          .filter((club) => Boolean(club.id))
          .map((club) => [club.id as string, club]),
      ),
    [clubs],
  );
  const clubsByName = useMemo(() => {
    const result = new Map<string, FantasyPlayerListRowClub>();
    (clubs ?? []).forEach((club) => {
      result.set(normalizeClubNameKey(club.name), club);
      if (club.shortName) {
        result.set(normalizeClubNameKey(club.shortName), club);
      }
    });
    return result;
  }, [clubs]);
  const sections = [
    {
      key: "goalkeepers",
      slots: SQUAD_SLOT_DEFINITIONS.filter(
        (slot) => slot.position === "goalkeeper",
      ),
      title: t("team.list.goalkeepers"),
    },
    {
      key: "universals",
      slots: SQUAD_SLOT_DEFINITIONS.filter(
        (slot) => slot.position === "universal",
      ),
      title: t("team.list.universals"),
    },
  ];
  const playersBySlot = new Map(players.map((item) => [item.rosterSlot, item]));
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

  const getClubForPlayer = (player: ViewerPlayer) => {
    if (player.clubId && clubsById.has(player.clubId)) {
      return clubsById.get(player.clubId) ?? null;
    }
    return clubsByName.get(normalizeClubNameKey(player.clubName)) ?? null;
  };

  return (
    <SquadListTable
      fitToAvailableHeight={fitToAvailableHeight}
      header={<FantasyPlayerPickerStatsHeader t={t} />}
    >
      {sections.map((section) => (
        <View key={section.key} style={styles.squadListSection}>
          <View style={styles.squadSectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.slots.map((slot) => {
            const item = playersBySlot.get(slot.rosterSlot) ?? null;
            const player = item?.player ?? null;
            const rowPlayer = item ? toReadonlyListPlayer(item) : null;
            const positionShortLabel = t(
              slot.position === "goalkeeper"
                ? "players.positionShort.goalkeeper"
                : "players.positionShort.universal",
            );

            if (item && player && rowPlayer) {
              return (
                <View
                  key={slot.rosterSlot}
                  style={styles.squadListPlayerStatsRowWrap}
                >
                  <FantasyPlayerListRow
                    club={getClubForPlayer(player)}
                    onPress={() => onPlayerPress(player.id)}
                    player={rowPlayer}
                    stateLabel={
                      item.isCaptain
                        ? t("team.leadership.captainShort")
                        : item.isViceCaptain
                          ? t("team.leadership.viceCaptainShort")
                          : undefined
                    }
                    stateTone={
                      item.isCaptain || item.isViceCaptain
                        ? "success"
                        : undefined
                    }
                    t={t}
                    variant="pickerStats"
                  />
                </View>
              );
            }

            return (
              <View
                key={slot.rosterSlot}
                style={styles.squadListPlayerStatsRowWrap}
              >
                <View style={styles.playerPickerStatsPlayerRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled
                    style={styles.playerPickerStatsPlayerCell}
                  >
                    <View style={styles.squadListStatusPlaceholder} />
                    <TeamKitAvatar
                      displayName={t("team.viewer.emptySlot")}
                      isMuted
                      position={slot.position}
                      size="xs"
                    />
                    <View style={styles.playerPickerStatsPlayerMain}>
                      <Text
                        numberOfLines={1}
                        style={styles.playerPickerStatsPlayerName}
                      >
                        {t("team.viewer.emptySlot")}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={styles.playerPickerStatsClubName}
                      >
                        {positionShortLabel}
                      </Text>
                    </View>
                  </Pressable>
                  {renderEmptyMetrics()}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </SquadListTable>
  );
}

export function GameweekTeamViewer({
  canQueryPrivateData = true,
  clubs,
  fantasyTeamId,
  gameweekId,
  highestPointsOverride,
  highestTeamIdOverride,
  onBack,
  onOpenTeam,
  seasonSlug,
}: {
  canQueryPrivateData?: boolean;
  clubs: ViewerClub[] | undefined;
  fantasyTeamId: Id<"fantasyTeams">;
  gameweekId?: Id<"fantasyGameweeks"> | null;
  highestPointsOverride?: number | null;
  highestTeamIdOverride?: Id<"fantasyTeams"> | null;
  onBack: () => void;
  onOpenTeam?: (teamId: Id<"fantasyTeams">) => void;
  seasonSlug?: string | null;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= WEB_DESKTOP_MIN_WIDTH;
  const [teamViewMode, setTeamViewMode] = useState<"pitch" | "list">("pitch");
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"fantasyPlayers"> | null>(null);
  const teamViewArgs = useMemo(
    () => {
      const baseArgs = gameweekId
        ? { fantasyTeamId, gameweekId }
        : { fantasyTeamId };
      return seasonSlug ? { ...baseArgs, seasonSlug } : baseArgs;
    },
    [fantasyTeamId, gameweekId, seasonSlug],
  );
  const teamViewCacheKey = `${fantasyTeamId}:${gameweekId ?? "current"}:${
    seasonSlug ?? "default"
  }`;
  const dataQuery = useSafeQuery(
    api.fantasy.fantasyTeamGameweekView,
    canQueryPrivateData ? teamViewArgs : "skip",
    { fallback: null },
  ) as TeamGameweekView;
  const data = useLastDefinedTeamGameweekView(
    canQueryPrivateData ? dataQuery : null,
    canQueryPrivateData ? teamViewCacheKey : undefined,
  );
  const selectedPick = data?.players.find(
    (item) => item.player?.id === selectedPlayerId,
  );
  const selectedPlayer = selectedPick?.player ?? null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (selectedPlayerId) {
          setSelectedPlayerId(null);
          return true;
        }
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, selectedPlayerId]);

  useEffect(() => {
    setSelectedPlayerId(null);
  }, [teamViewCacheKey, data?.gameweek?.id]);

  if (data === undefined) {
    return (
      <AppLoadingOverlay
        fullScreen
        onRequestClose={onBack}
        title={t("team.dashboard.loadingTitle")}
      />
    );
  }

  if (!data) {
    return (
      <View style={styles.teamBuilderPanel}>
        <Text style={styles.sectionTitle}>
          {t("team.viewer.teamUnavailable")}
        </Text>
      </View>
    );
  }

  const totalPoints = data.score?.participated ? data.score.points : 0;
  const highestPoints = highestPointsOverride ?? data.highestTeam?.points ?? 0;
  const highestTeamId = highestTeamIdOverride ?? data.highestTeam?.id ?? null;
  const canOpenHighestTeam = highestTeamId && highestTeamId !== fantasyTeamId;
  const handleHighestPress =
    canOpenHighestTeam && onOpenTeam
      ? () => {
          setSelectedPlayerId(null);
          onOpenTeam(highestTeamId);
        }
      : undefined;
  const statsPanel = (
    <TeamViewerStats
      averagePoints={data.averagePoints}
      highestPoints={highestPoints}
      onHighestPress={handleHighestPress}
      points={totalPoints}
    />
  );
  const viewSwitch = (
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
        onPress={() => setTeamViewMode("pitch")}
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
        onPress={() => setTeamViewMode("list")}
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

  return (
    <View
      style={[
        styles.gameweekViewerScreen,
        isDesktopWeb ? styles.squadContentFill : null,
      ]}
    >
      <TeamViewerHeader
        gameweekNumber={data.gameweek?.number ?? null}
        onBack={onBack}
        teamName={data.team.name}
      />
      {statsPanel}

      {data.players.length === 0 ? (
        <View style={styles.teamBuilderPanel}>
          <Text style={styles.sectionTitle}>{t("team.viewer.noSquad")}</Text>
          <Text style={styles.mutedText}>
            {t("team.viewer.noSquadDescription")}
          </Text>
        </View>
      ) : (
        <>
          {viewSwitch}
          {teamViewMode === "list" ? (
            <ReadonlyList
              clubs={clubs}
              fitToAvailableHeight={isDesktopWeb}
              onPlayerPress={setSelectedPlayerId}
              players={data.players}
            />
          ) : (
            <ReadonlyPitch
              onPlayerPress={setSelectedPlayerId}
              players={data.players}
            />
          )}
        </>
      )}
      <PlayerMatchBreakdownSheet
        emptyMessage={t("team.viewer.noMatches")}
        gameweekNumber={data.gameweek?.number}
        matches={selectedPick?.matches ?? []}
        onClose={() => setSelectedPlayerId(null)}
        player={selectedPlayer}
        visible={Boolean(selectedPlayer)}
      />
    </View>
  );
}
