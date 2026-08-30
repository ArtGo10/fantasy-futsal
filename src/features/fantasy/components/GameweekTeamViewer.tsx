import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import type { TranslationKey } from "../../../i18n/translations";
import { useI18n } from "../../../i18n/I18nProvider";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import {
  FANTASY_STATIC_IMAGE_PROPS,
  FUTSAL_FIELD_IMAGE,
} from "../assets/fantasyAssets";
import { formatFantasyMoney } from "../utils/money";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { BottomSheet } from "./BottomSheet";
import {
  FantasyClubLogo,
  FantasyPlayerListRow,
  FantasyPlayerPickerStatsHeader,
  type FantasyPlayerListRowClub,
  type FantasyPlayerListRowPlayer,
} from "./FantasyPlayerListRow";
import { getPlayerDetailSeasonStatItems } from "./PlayerDetailSheet";
import { PlayerAvatar } from "./PlayerAvatar";
import { TeamKitAvatar } from "./TeamKitAvatar";
import { MatchDetailsPage } from "../screens/SeasonScreen";

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

type MatchDetailsPageProps = Parameters<typeof MatchDetailsPage>[0];
type MatchDetailsClub =
  MatchDetailsPageProps["clubsById"] extends Map<string, infer Club>
    ? Club
    : never;

type ViewerPlayer = {
  appearances?: number | null;
  assists?: number | null;
  clubId: Id<"fantasyClubs"> | null;
  clubName: string | null;
  displayName: string;
  firstName?: string | null;
  cleanSheets?: number | null;
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

type PlayerProfileMatch = {
  fixture: {
    awayClubId: string | null;
    awayClubName: string;
    awayScore: number | null;
    externalId: string | null;
    gameweekId: string | null;
    homeClubId: string | null;
    homeClubName: string;
    homeScore: number | null;
    id: Id<"fantasyFixtures">;
    scheduledAt: number;
    seasonId: string;
    sourceUrl: string | null;
    status: string;
    venue: string | null;
  };
  gameweek: {
    id: Id<"fantasyGameweeks">;
    number: number;
    name: string;
  } | null;
  id: Id<"fantasyFixtures">;
  isHome: boolean;
  lines: PointLine[];
  opponent: ViewerClub | null;
  points: number;
  resultKind: "win" | "draw" | "loss" | null;
};

type PlayerProfileData =
  | {
      matches: PlayerProfileMatch[];
      player: ViewerPlayer & {
        appearances: number;
        assists: number;
        averagePointsPerGameweek: number;
        cleanSheets: number;
        goals: number;
        goalsConceded: number;
        ownGoals: number;
        penaltiesMissed: number;
        penaltiesSaved: number;
        redCards: number;
        saves: number;
        seasonPoints: number;
        selectedPercent: number;
        yellowCards: number;
      };
    }
  | null
  | undefined;

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

function formatViewerNumber(value: number | null | undefined) {
  const rounded = Number((value ?? 0).toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatSignedViewerPoints(value: number | null | undefined) {
  const normalized = Number((value ?? 0).toFixed(1));
  const text = formatViewerNumber(normalized);
  return normalized > 0 ? `+${text}` : text;
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

function toMatchDetailsClub(club: ViewerClub, index: number): MatchDetailsClub {
  return {
    id: club.id ?? club.name,
    isActive: club.isActive ?? true,
    logoThumbnailUrl: club.logoThumbnailUrl,
    logoUrl: club.logoUrl,
    name: club.name,
    shortName: club.shortName,
    sortOrder: club.sortOrder ?? index,
  };
}

function formatMatchScore(match: PlayerProfileMatch, fallback: string) {
  const { awayScore, homeScore } = match.fixture;
  if (homeScore === null || awayScore === null) return fallback;
  return `${homeScore} - ${awayScore}`;
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

function ReadonlySquadSlot({
  item,
  onPlayerPress,
  position,
  size = "field",
}: {
  item: TeamGameweekPlayer | null;
  onPlayerPress: (playerId: Id<"fantasyPlayers">) => void;
  position: PlayerPosition;
  size?: "field" | "side";
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const player = item?.player ?? null;
  const leadershipLabel = item?.isCaptain
    ? t("team.leadership.captainShort")
    : item?.isViceCaptain
      ? t("team.leadership.viceCaptainShort")
      : null;
  const avatarSize = size === "side" ? "md" : "lg";

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
        size === "side" ? styles.futsalSquadSlotButtonSide : null,
        player ? styles.futsalSquadSlotButtonFilled : null,
        styles.gameweekViewerSlotButton,
        size === "side" ? styles.gameweekViewerSlotButtonSide : null,
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
            style={styles.futsalSquadSlotName}
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
  ) => (
    <ReadonlySquadSlot
      item={playersBySlot.get(slot.rosterSlot) ?? null}
      onPlayerPress={onPlayerPress}
      position={slot.position}
      size={size}
    />
  );

  return (
    <View style={styles.futsalSquadLayout}>
      <View style={styles.futsalSquadMainRow}>
        <View
          style={[
            styles.futsalFieldFrame,
            {
              backgroundColor: fantasyTheme.softColor,
              borderColor: fantasyTheme.borderColor,
            },
          ]}
        >
          <Image
            {...FANTASY_STATIC_IMAGE_PROPS}
            contentFit="cover"
            recyclingKey="gameweek-viewer-field"
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
            { backgroundColor: fantasyTheme.primaryColor },
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
          { backgroundColor: fantasyTheme.primaryColor },
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

function ReadonlyList({
  clubs,
  onPlayerPress,
  players,
}: {
  clubs: ViewerClub[] | undefined;
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
    <View style={styles.squadListPanel}>
      <ScrollView
        horizontal
        bounces={false}
        disableScrollViewPanResponder
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.squadListHorizontalScrollContent}
        style={styles.squadListHorizontalScroll}
      >
        <View style={styles.squadListStatsTable}>
          <FantasyPlayerPickerStatsHeader t={t} />
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
        </View>
      </ScrollView>
    </View>
  );
}

function PlayerMatchBreakdownSheet({
  match,
  onClose,
  onOpenFixture,
  player,
  visible,
}: {
  match: PlayerProfileMatch | null;
  onClose: () => void;
  onOpenFixture: (match: PlayerProfileMatch) => void;
  player: ViewerPlayer | null;
  visible: boolean;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  if (!match || !player) return null;
  const title = getPlayerSurnameLabel(player.displayName);

  return (
    <BottomSheet
      contentScrollEnabled={false}
      onClose={onClose}
      sheetStyle={styles.playerMatchBreakdownSheet}
      visible={visible}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.playerMatchBreakdownContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playerMatchBreakdownHeader}>
          <Text style={styles.playerMatchBreakdownTitle}>
            {title}
          </Text>
          {match.gameweek ? (
            <Text style={styles.mutedText}>
              {t("team.pointsBreakdownGameweekTitle").replace(
                "{number}",
                String(match.gameweek.number),
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.playerMatchScoreCard}>
          <Text numberOfLines={1} style={styles.playerMatchClubName}>
            {match.fixture.homeClubName}
          </Text>
          <Text
            style={[
              styles.playerMatchScoreText,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatMatchScore(match, t("fixtures.dateUnknown"))}
          </Text>
          <Text numberOfLines={1} style={styles.playerMatchClubName}>
            {match.fixture.awayClubName}
          </Text>
        </View>

        <View style={styles.teamPointsBreakdownPlayerCard}>
          <Text
            style={[
              styles.teamOverviewTitle,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {t("team.viewer.pointsBreakdown")}
          </Text>
          {match.lines.length === 0 ? (
            <Text style={styles.mutedText}>
              {t("team.pointsBreakdownNoPlayerLines")}
            </Text>
          ) : (
            <View style={styles.playerMatchBreakdownTable}>
              <View style={styles.playerMatchBreakdownTableHeader}>
                <Text style={styles.playerMatchBreakdownTypeCell}>
                  {t("team.viewer.type")}
                </Text>
                <Text style={styles.playerMatchBreakdownValueCell}>
                  {t("team.viewer.value")}
                </Text>
                <Text
                  style={[
                    styles.playerMatchBreakdownPointsCell,
                    { color: fantasyTheme.primaryColor },
                  ]}
                >
                  {t("team.viewer.totalPts")}
                </Text>
              </View>
              {match.lines.map((line) => (
                <View key={line.kind} style={styles.playerMatchBreakdownRow}>
                  <Text style={styles.playerMatchBreakdownTypeCell}>
                    {t(POINT_LINE_LABEL_KEYS[line.kind])}
                  </Text>
                  <Text style={styles.playerMatchBreakdownValueCell}>
                    {line.count !== null ? formatViewerNumber(line.count) : "-"}
                  </Text>
                  <Text
                    style={[
                      styles.playerMatchBreakdownPointsCell,
                      { color: fantasyTheme.primaryColor },
                    ]}
                  >
                    {formatSignedViewerPoints(line.points)}
                  </Text>
                </View>
              ))}
              <View style={styles.playerMatchBreakdownRow}>
                <Text style={styles.playerMatchBreakdownTypeCell}>
                  {t("team.pointsBreakdownTotal")}
                </Text>
                <Text style={styles.playerMatchBreakdownValueCell}>-</Text>
                <Text
                  style={[
                    styles.playerMatchBreakdownPointsCell,
                    { color: fantasyTheme.primaryColor },
                  ]}
                >
                  {formatViewerNumber(match.points)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.playerMatchBreakdownActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenFixture(match)}
            style={[
              styles.teamBuilderFooterPrimaryButton,
              { backgroundColor: fantasyTheme.primaryColor },
            ]}
          >
            <Text style={styles.teamBuilderFooterPrimaryText}>
              {t("team.viewer.viewMatchInfo")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function PlayerProfilePage({
  onBack,
  onOpenFixture,
  playerId,
  seasonSlug,
}: {
  onBack: () => void;
  onOpenFixture: (match: PlayerProfileMatch) => void;
  playerId: Id<"fantasyPlayers">;
  seasonSlug?: string | null;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const profile = useQuery(
    api.fantasy.playerProfile,
    seasonSlug ? { playerId, seasonSlug } : { playerId },
  ) as PlayerProfileData;
  const [selectedMatch, setSelectedMatch] = useState<PlayerProfileMatch | null>(
    null,
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (selectedMatch) {
          setSelectedMatch(null);
          return true;
        }
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, selectedMatch]);

  if (profile === undefined) {
    return (
      <View style={styles.gameweekViewerLoading}>
        <ActivityIndicator color={fantasyTheme.primaryColor} />
        <Text style={styles.mutedText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.teamBuilderPanel}>
        <Text style={styles.sectionTitle}>
          {t("team.viewer.playerUnavailable")}
        </Text>
      </View>
    );
  }

  const player = profile.player;
  const seasonStatItems = getPlayerDetailSeasonStatItems(player, t);

  return (
    <View style={styles.playerProfilePage}>
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
            {player.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
            {player.clubName ?? t("players.noClub")}
          </Text>
        </View>
        <View style={styles.teamWorkspaceHeaderSpacer} />
      </View>

      <View
        style={[
          styles.playerProfileHero,
          isDesktopWeb ? styles.playerProfileHeroDesktop : null,
          { backgroundColor: fantasyTheme.primaryColor },
        ]}
      >
        <PlayerAvatar
          displayName={player.displayName}
          photoUrl={player.photoUrl ?? player.photoThumbnailUrl ?? null}
          size="xl"
        />
        <View style={styles.playerProfileHeroText}>
          <Text style={styles.playerDetailPosition}>
            {t(
              player.position === "goalkeeper"
                ? "players.position.goalkeeper"
                : "players.position.universal",
            )}
          </Text>
          <Text numberOfLines={2} style={styles.playerDetailName}>
            {player.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.playerDetailClub}>
            {player.clubName ?? t("players.noClub")}
          </Text>
        </View>
      </View>

      <View style={styles.playerDetailQuickStats}>
        <View style={styles.playerDetailQuickStat}>
          <Text style={styles.playerDetailQuickLabel}>
            {t("players.priceLabel")}
          </Text>
          <Text
            style={[
              styles.playerDetailQuickValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatFantasyMoney(player.price ?? 0)}
          </Text>
        </View>
        <View style={styles.playerDetailQuickStat}>
          <Text style={styles.playerDetailQuickLabel}>
            {t("playerDetails.averagePoints")}
          </Text>
          <Text
            style={[
              styles.playerDetailQuickValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatViewerNumber(player.averagePointsPerGameweek)}
          </Text>
        </View>
        <View style={styles.playerDetailQuickStat}>
          <Text style={styles.playerDetailQuickLabel}>
            {t("playerDetails.selectedPercent")}
          </Text>
          <Text
            style={[
              styles.playerDetailQuickValue,
              { color: fantasyTheme.primaryColor },
            ]}
          >
            {formatViewerNumber(player.selectedPercent)}%
          </Text>
        </View>
      </View>

      <View style={styles.playerDetailStatsPanel}>
        <Text style={styles.playerDetailSectionTitle}>
          {t("playerDetails.currentSeason")}
        </Text>
        <View
          style={[
            styles.playerDetailStatsGrid,
            isDesktopWeb ? styles.playerDetailStatsGridDesktop : null,
          ]}
        >
          {seasonStatItems.map((item) => (
            <View
              key={item.key}
              style={[
                styles.playerDetailStatCell,
                isDesktopWeb ? styles.playerDetailStatCellDesktop : null,
              ]}
            >
              <Text
                style={[
                  styles.playerDetailStatValue,
                  { color: fantasyTheme.primaryColor },
                ]}
              >
                {item.value}
              </Text>
              <Text style={styles.playerDetailStatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.playerProfileMatchesPanel}>
        <Text
          style={[
            styles.teamOverviewTitle,
            { color: fantasyTheme.primaryColor },
          ]}
        >
          {t("team.viewer.matches")}
        </Text>
        {profile.matches.length === 0 ? (
          <Text style={styles.mutedText}>{t("team.viewer.noMatches")}</Text>
        ) : (
          <View style={styles.playerProfileMatchTable}>
            <View style={styles.playerProfileMatchHeader}>
              <Text style={styles.playerProfileMatchGwCell}>
                {t("team.list.gw")}
              </Text>
              <Text style={styles.playerProfileMatchOpponentCell}>
                {t("team.viewer.opponent")}
              </Text>
              <Text
                style={[
                  styles.playerProfileMatchCell,
                  styles.playerProfileMatchResultColumn,
                ]}
              >
                {t("team.viewer.result")}
              </Text>
              <Text
                style={[
                  styles.playerProfileMatchCell,
                  styles.playerProfileMatchPointsColumn,
                ]}
              >
                {t("team.viewer.totalPts")}
              </Text>
              <Text
                style={[
                  styles.playerProfileMatchCell,
                  styles.playerProfileMatchMoreColumn,
                ]}
              >
                {t("team.viewer.more")}
              </Text>
            </View>
            {profile.matches.map((match) => (
              <View key={match.id} style={styles.playerProfileMatchRow}>
                <Text style={styles.playerProfileMatchGwCell}>
                  {match.gameweek?.number ?? "-"}
                </Text>
                <View style={styles.playerProfileMatchOpponentCell}>
                  <FantasyClubLogo club={match.opponent} size="sm" />
                  <Text
                    numberOfLines={1}
                    style={styles.playerProfileMatchOpponent}
                  >
                    {match.opponent?.shortName ?? match.opponent?.name ?? "-"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.playerProfileMatchResult,
                    match.resultKind === "win"
                      ? styles.playerProfileMatchResultWin
                      : null,
                    match.resultKind === "loss"
                      ? styles.playerProfileMatchResultLoss
                      : null,
                    styles.playerProfileMatchResultColumn,
                  ]}
                >
                  {formatMatchScore(match, "-")}
                </Text>
                <Text
                  style={[
                    styles.playerProfileMatchPoints,
                    { color: fantasyTheme.primaryColor },
                    styles.playerProfileMatchPointsColumn,
                  ]}
                >
                  {formatViewerNumber(match.points)}
                </Text>
                <Pressable
                  accessibilityLabel={t("team.viewer.more")}
                  accessibilityRole="button"
                  onPress={() => setSelectedMatch(match)}
                  style={[
                    styles.playerProfileMoreButton,
                    styles.playerProfileMatchMoreColumn,
                  ]}
                >
                  <Plus
                    color={fantasyTheme.primaryColor}
                    size={22}
                    strokeWidth={3}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <PlayerMatchBreakdownSheet
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onOpenFixture={(match) => {
          setSelectedMatch(null);
          onOpenFixture(match);
        }}
        player={player}
        visible={Boolean(selectedMatch)}
      />
    </View>
  );
}

export function GameweekTeamViewer({
  clubs,
  fantasyTeamId,
  gameweekId,
  highestPointsOverride,
  highestTeamIdOverride,
  onBack,
  onOpenTeam,
  seasonSlug,
}: {
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
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const [teamViewMode, setTeamViewMode] = useState<"pitch" | "list">("pitch");
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"fantasyPlayers"> | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] =
    useState<Id<"fantasyFixtures"> | null>(null);
  const [selectedFixtureFallback, setSelectedFixtureFallback] =
    useState<MatchDetailsPageProps["fallbackFixture"]>(null);
  const teamViewArgs = useMemo(
    () => {
      const baseArgs = gameweekId
        ? { fantasyTeamId, gameweekId }
        : { fantasyTeamId };
      return seasonSlug ? { ...baseArgs, seasonSlug } : baseArgs;
    },
    [fantasyTeamId, gameweekId, seasonSlug],
  );
  const data = useQuery(
    api.fantasy.fantasyTeamGameweekView,
    teamViewArgs,
  ) as TeamGameweekView;
  const selectedFixtureDetails = useQuery(
    api.fantasy.fixtureDetails,
    selectedFixtureId ? { fixtureId: selectedFixtureId } : "skip",
  );
  const clubsById = useMemo<MatchDetailsPageProps["clubsById"]>(
    () =>
      new Map(
        (clubs ?? []).map((club, index) => {
          const matchDetailsClub = toMatchDetailsClub(club, index);
          return [matchDetailsClub.id, matchDetailsClub];
        }),
      ),
    [clubs],
  );
  const clubsByName = useMemo<MatchDetailsPageProps["clubsByName"]>(() => {
    const result = new Map<string, MatchDetailsClub>();
    (clubs ?? []).forEach((club, index) => {
      const matchDetailsClub = toMatchDetailsClub(club, index);
      result.set(normalizeClubNameKey(club.name), matchDetailsClub);
      if (club.shortName) {
        result.set(normalizeClubNameKey(club.shortName), matchDetailsClub);
      }
    });

    return result;
  }, [clubs]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (selectedFixtureId) {
          setSelectedFixtureId(null);
          setSelectedFixtureFallback(null);
          return true;
        }
        if (selectedPlayerId) {
          setSelectedPlayerId(null);
          return true;
        }
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, selectedFixtureId, selectedPlayerId]);

  useEffect(() => {
    setSelectedFixtureId(null);
    setSelectedFixtureFallback(null);
    setSelectedPlayerId(null);
  }, [fantasyTeamId, gameweekId]);

  if (selectedFixtureId) {
    return (
      <MatchDetailsPage
        clubsById={clubsById}
        clubsByName={clubsByName}
        details={selectedFixtureDetails}
        fallbackFixture={selectedFixtureFallback}
        onBack={() => {
          setSelectedFixtureId(null);
          setSelectedFixtureFallback(null);
        }}
        onPlayerPress={(playerId) => {
          setSelectedFixtureId(null);
          setSelectedFixtureFallback(null);
          setSelectedPlayerId(playerId);
        }}
      />
    );
  }

  if (selectedPlayerId) {
    return (
      <PlayerProfilePage
        onBack={() => setSelectedPlayerId(null)}
        onOpenFixture={(match) => {
          setSelectedFixtureFallback(match.fixture);
          setSelectedFixtureId(match.fixture.id);
        }}
        playerId={selectedPlayerId}
        seasonSlug={seasonSlug}
      />
    );
  }

  if (data === undefined) {
    return (
      <View style={styles.gameweekViewerLoading}>
        <ActivityIndicator color={fantasyTheme.primaryColor} />
        <Text style={styles.mutedText}>{t("common.loading")}</Text>
      </View>
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
          setSelectedFixtureId(null);
          setSelectedFixtureFallback(null);
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
    <View style={styles.gameweekViewerScreen}>
      <TeamViewerHeader
        gameweekNumber={data.gameweek?.number ?? null}
        onBack={onBack}
        teamName={data.team.name}
      />

      {data.players.length === 0 ? (
        <>
          {statsPanel}
          <View style={styles.teamBuilderPanel}>
            <Text style={styles.sectionTitle}>{t("team.viewer.noSquad")}</Text>
            <Text style={styles.mutedText}>
              {t("team.viewer.noSquadDescription")}
            </Text>
          </View>
        </>
      ) : isDesktopWeb && teamViewMode === "pitch" ? (
        <View style={styles.gameweekViewerDesktopLayout}>
          <View style={styles.gameweekViewerDesktopFieldPane}>
            <ReadonlyPitch
              onPlayerPress={setSelectedPlayerId}
              players={data.players}
            />
          </View>
          <View style={styles.gameweekViewerDesktopSidePane}>
            {viewSwitch}
            {statsPanel}
          </View>
        </View>
      ) : teamViewMode === "list" ? (
        <>
          {statsPanel}
          {viewSwitch}
          <ReadonlyList
            clubs={clubs}
            onPlayerPress={setSelectedPlayerId}
            players={data.players}
          />
        </>
      ) : (
        <>
          {statsPanel}
          {viewSwitch}
          <ReadonlyPitch
            onPlayerPress={setSelectedPlayerId}
            players={data.players}
          />
        </>
      )}
    </View>
  );
}
