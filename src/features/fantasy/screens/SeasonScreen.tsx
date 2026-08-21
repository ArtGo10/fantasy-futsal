import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { BottomSheet } from "../components/BottomSheet";
import { DesktopSelect } from "../components/DesktopSelect";
import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import type { LanguageCode, TranslationKey } from "../../../i18n/translations";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import { FantasyClubLogo } from "../components/FantasyPlayerListRow";
import { TeamKitAvatar } from "../components/TeamKitAvatar";
import {
  getLocalizedClubName,
  localizeFantasyPlayer,
} from "../utils/localizedFantasyData";
import type {
  FantasyFixture,
  FantasyGameweek,
  FixturesScreenProps,
} from "./FixturesScreen";

type SeasonSection = "calendar" | "table" | "stats";
type TableMode = "short" | "full" | "form";
type TableScope = "all" | "home" | "away";
type PickerKind = "calendarGameweek" | "calendarClub";
type ResultKind = "win" | "draw" | "loss";

const ALL_GAMEWEEKS_FILTER_ID = "__all_gameweeks__";
const ALL_CALENDAR_CLUBS_FILTER_ID = "__all_clubs__";
const REGULAR_SEASON_GAMEWEEK_LIMIT = 18;
const SEASON_CALENDAR_INITIAL_GROUPS = 4;
const SEASON_CALENDAR_GROUP_BATCH_SIZE = 4;
const SEASON_CALENDAR_GROUP_BATCH_DELAY_MS = 36;

function isRegularSeasonCalendarGameweek(gameweek: FantasyGameweek) {
  return gameweek.number <= REGULAR_SEASON_GAMEWEEK_LIMIT;
}
type MatchDetailEventType =
  | "goal"
  | "assist"
  | "yellow_card"
  | "second_yellow_red"
  | "red_card"
  | "own_goal"
  | "penalty_missed"
  | "penalty_saved";

type FantasyClub = {
  id: string;
  isActive: boolean;
  logoThumbnailUrl: string | null;
  logoUrl: string | null;
  name: string;
  shortName: string | null;
  sortOrder: number;
};

type SeasonScreenProps = FixturesScreenProps & {
  clubs: FantasyClub[] | undefined;
  playerStatistics: SeasonPlayerStatistics | undefined;
};

type PickerOption = {
  club?: FantasyClub | null;
  isSelected?: boolean;
  key: string;
  label: string;
  onPress: () => void;
  secondaryLabel?: string;
};

type StandingFormItem = {
  opponent: FantasyClub | null;
  result: ResultKind;
};

type StandingRow = {
  club: FantasyClub;
  draws: number;
  form: StandingFormItem[];
  goalsAgainst: number;
  goalsFor: number;
  goalDifference: number;
  losses: number;
  nextOpponent: FantasyClub | null;
  played: number;
  points: number;
  wins: number;
};

type SeasonPlayerStat = {
  id: string;
  clubId: string | null;
  clubName: string | null;
  clubLogoThumbnailUrl: string | null;
  clubLogoUrl: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string;
  photoThumbnailUrl: string | null;
  photoUrl: string | null;
  position: "goalkeeper" | "universal";
  price: number;
  status: string;
  appearances: number;
  assists: number;
  averagePointsPerGameweek: number;
  cleanSheets: number;
  goals: number;
  goalsConceded: number;
  lastGameweekPoints: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  points: number;
  redCards: number;
  saves: number;
  selectedByTeams: number;
  selectedPercent: number;
  valueScore: number;
  yellowCards: number;
};

type SeasonPlayerStatistics = {
  leaderboard: SeasonPlayerStat[];
  leaders: {
    bestValue: SeasonPlayerStat | null;
    mostAssists: SeasonPlayerStat | null;
    mostPicked: SeasonPlayerStat | null;
    topScorer: SeasonPlayerStat | null;
  };
  topPerformers: SeasonPlayerStat[];
  totals: {
    fantasyTeams: number;
    hasGameweekStats: boolean;
    players: number;
  };
};

const SEASON_SECTIONS: Array<{ id: SeasonSection; labelKey: TranslationKey }> =
  [
    { id: "calendar", labelKey: "season.calendarTab" },
    { id: "table", labelKey: "season.tableTab" },
    { id: "stats", labelKey: "season.statsTab" },
  ];

const MATCH_EVENT_LABEL_KEYS: Record<MatchDetailEventType, TranslationKey> = {
  assist: "matchDetails.event.assist",
  goal: "matchDetails.event.goal",
  own_goal: "matchDetails.event.own_goal",
  penalty_missed: "matchDetails.event.penalty_missed",
  penalty_saved: "matchDetails.event.penalty_saved",
  red_card: "matchDetails.event.red_card",
  second_yellow_red: "matchDetails.event.second_yellow_red",
  yellow_card: "matchDetails.event.yellow_card",
};

const TABLE_MODES: Array<{ id: TableMode; labelKey: TranslationKey }> = [
  { id: "short", labelKey: "season.tableMode.short" },
  { id: "full", labelKey: "season.tableMode.full" },
  { id: "form", labelKey: "season.tableMode.form" },
];

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  uk: "uk-UA",
};

function normalizeClubName(name: string | null | undefined) {
  const value = (name ?? "").trim().replace(/\s+/g, " ");
  if (!value) return "";

  return getLocalizedClubName(value, "en")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function getDayKey(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(
  value: number | null | undefined,
  language: LanguageCode,
  fallback: string,
) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatDateRange(
  fixtures: FantasyFixture[],
  language: LanguageCode,
  fallback: string,
) {
  if (fixtures.length === 0) return fallback;

  const timestamps = fixtures
    .map((fixture) => fixture.scheduledAt)
    .sort((a, b) => a - b);
  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const firstLabel = formatDate(first, language, fallback);
  const lastLabel = formatDate(last, language, fallback);

  return firstLabel === lastLabel ? firstLabel : `${firstLabel} - ${lastLabel}`;
}

function formatMatchDetailDate(value: number, language: LanguageCode) {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function localizeMatchPlayerName(name: string, language: LanguageCode) {
  return localizeFantasyPlayer(
    {
      clubName: null,
      displayName: name,
      firstName: "",
      lastName: "",
    },
    language,
  ).displayName;
}

function formatMatchTime(fixture: FantasyFixture, language: LanguageCode) {
  if (
    fixture.status === "completed" &&
    fixture.homeScore !== null &&
    fixture.awayScore !== null
  ) {
    return `${fixture.homeScore}:${fixture.awayScore}`;
  }

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.scheduledAt));
}

function formatPickerDate(value: number, language: LanguageCode) {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    month: "short",
    weekday: "short",
  }).format(new Date(value));
}

function formatFixtureProfileList(items: string[]) {
  const visibleItems = items.slice(0, 3);
  const hiddenCount = items.length - visibleItems.length;
  const suffix = hiddenCount > 0 ? ` +${hiddenCount}` : "";

  return visibleItems.join(", ") + suffix;
}

function SeasonFixtureProfileNotice({
  gameweek,
}: {
  gameweek: FantasyGameweek | null;
}) {
  const { t } = useI18n();
  const profile = gameweek?.fixtureProfile;
  if (!profile || (!profile.isDoubleGameweek && !profile.hasBlankTeams))
    return null;

  const doubleTeams = profile.teamsWithDouble.map(
    (team) => `${team.name} x${team.matchCount}`,
  );
  const blankTeams = profile.teamsWithBlank.map((team) => team.name);

  return (
    <View style={styles.seasonFixtureProfileStack}>
      {doubleTeams.length > 0 ? (
        <View
          style={[
            styles.seasonFixtureProfilePill,
            styles.seasonFixtureProfilePillDouble,
          ]}
        >
          <Text style={styles.seasonFixtureProfileLabel}>
            {t("season.fixtureProfile.double")}
          </Text>
          <Text numberOfLines={2} style={styles.seasonFixtureProfileText}>
            {formatFixtureProfileList(doubleTeams)}
          </Text>
        </View>
      ) : null}
      {blankTeams.length > 0 ? (
        <View
          style={[
            styles.seasonFixtureProfilePill,
            styles.seasonFixtureProfilePillBlank,
          ]}
        >
          <Text style={styles.seasonFixtureProfileLabel}>
            {t("season.fixtureProfile.blank")}
          </Text>
          <Text numberOfLines={2} style={styles.seasonFixtureProfileText}>
            {formatFixtureProfileList(blankTeams)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function isCompletedFixture(fixture: FantasyFixture) {
  return (
    fixture.status === "completed" &&
    fixture.homeScore !== null &&
    fixture.awayScore !== null
  );
}

function getDefaultGameweekId(
  gameweeks: FantasyGameweek[],
  fixtures: FantasyFixture[],
) {
  if (gameweeks.length === 0) return null;

  const fixturesByGameweek = new Map<string, FantasyFixture[]>();
  for (const fixture of fixtures) {
    if (!fixture.gameweekId) continue;

    const current = fixturesByGameweek.get(fixture.gameweekId) ?? [];
    current.push(fixture);
    fixturesByGameweek.set(fixture.gameweekId, current);
  }

  const currentGameweek = gameweeks.find((gameweek) => {
    const gameweekFixtures = fixturesByGameweek.get(gameweek.id) ?? [];
    return (
      gameweekFixtures.length === 0 ||
      gameweekFixtures.some((fixture) => !isCompletedFixture(fixture))
    );
  });

  return currentGameweek?.id ?? gameweeks[gameweeks.length - 1]?.id ?? null;
}

function isSameClub(
  club: FantasyClub,
  clubId: string | null,
  clubName: string,
) {
  if (clubId && club.id === clubId) return true;
  return (
    normalizeClubName(club.name) === normalizeClubName(clubName) ||
    normalizeClubName(club.shortName) === normalizeClubName(clubName)
  );
}

function getFixtureClub(
  fixture: FantasyFixture,
  side: "home" | "away",
  clubsById: Map<string, FantasyClub>,
  clubsByName: Map<string, FantasyClub>,
) {
  const clubId = side === "home" ? fixture.homeClubId : fixture.awayClubId;
  const clubName =
    side === "home" ? fixture.homeClubName : fixture.awayClubName;

  if (clubId) {
    const club = clubsById.get(clubId);
    if (club) return club;
  }

  return clubsByName.get(normalizeClubName(clubName)) ?? null;
}

function fixtureIncludesClub(fixture: FantasyFixture, club: FantasyClub) {
  return (
    isSameClub(club, fixture.homeClubId, fixture.homeClubName) ||
    isSameClub(club, fixture.awayClubId, fixture.awayClubName)
  );
}

function getResultKind(goalsFor: number, goalsAgainst: number): ResultKind {
  if (goalsFor > goalsAgainst) return "win";
  if (goalsFor === goalsAgainst) return "draw";
  return "loss";
}

function getResultPoints(result: ResultKind) {
  if (result === "win") return 3;
  if (result === "draw") return 1;
  return 0;
}

function getResultLetterKey(result: ResultKind): TranslationKey {
  if (result === "win") return "season.form.winLetter";
  if (result === "draw") return "season.form.drawLetter";
  return "season.form.lossLetter";
}

function SeasonSelectButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.seasonSelectButton}
    >
      <Text numberOfLines={1} style={styles.seasonSelectButtonText}>
        {label}
      </Text>
      <ChevronDown color={colors.text.secondary} size={18} strokeWidth={2.3} />
    </Pressable>
  );
}

function SeasonPickerSheet({
  onClose,
  onCloseEnd,
  options,
  visible,
}: {
  onClose: () => void;
  onCloseEnd?: () => void;
  options: PickerOption[];
  visible: boolean;
}) {
  return (
    <BottomSheet
      contentScrollEnabled={false}
      onClose={onClose}
      onCloseEnd={onCloseEnd}
      visible={visible}
    >
      <View style={styles.seasonPickerSheetContent}>
        <ScrollView
          style={styles.seasonPickerScroll}
          contentContainerStyle={styles.seasonPickerOptions}
        >
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.key}
              onPress={option.onPress}
              style={[
                styles.seasonPickerOption,
                option.isSelected ? styles.seasonPickerOptionSelected : null,
              ]}
            >
              <View style={styles.seasonPickerOptionBody}>
                {option.club ? (
                  <FantasyClubLogo club={option.club} size="sm" />
                ) : null}
                <View style={styles.seasonPickerOptionTextGroup}>
                  <Text numberOfLines={1} style={styles.seasonPickerOptionText}>
                    {option.label}
                  </Text>
                  {option.secondaryLabel ? (
                    <Text
                      numberOfLines={1}
                      style={styles.seasonPickerOptionMeta}
                    >
                      {option.secondaryLabel}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View
                style={[
                  styles.seasonPickerOptionRadio,
                  option.isSelected
                    ? styles.seasonPickerOptionRadioSelected
                    : null,
                ]}
              >
                {option.isSelected ? (
                  <View style={styles.seasonPickerOptionRadioDot} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function formatSeasonStatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SeasonStatsCard({
  label,
  player,
  value,
}: {
  label: string;
  player: SeasonPlayerStat | null;
  value: string;
}) {
  return (
    <View style={styles.seasonStatsCard}>
      <Text style={styles.seasonStatsCardLabel}>{label}</Text>
      {player ? (
        <View style={styles.seasonStatsCardBody}>
          <TeamKitAvatar
            clubName={player.clubName}
            displayName={player.displayName}
            position={player.position}
            size="sm"
          />
          <View style={styles.seasonStatsCardTextGroup}>
            <Text numberOfLines={1} style={styles.seasonStatsCardName}>
              {player.displayName}
            </Text>
            <Text numberOfLines={1} style={styles.seasonStatsCardMeta}>
              {value}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.seasonStatsEmptyValue}>0</Text>
      )}
    </View>
  );
}

function SeasonStatsRow({
  index,
  player,
  t,
}: {
  index: number;
  player: SeasonPlayerStat;
  t: (key: TranslationKey) => string;
}) {
  return (
    <View style={styles.seasonStatsRow}>
      <Text style={styles.seasonStatsRank}>{index + 1}</Text>
      <TeamKitAvatar
        clubName={player.clubName}
        displayName={player.displayName}
        position={player.position}
        size="sm"
      />
      <View style={styles.seasonStatsPlayerMain}>
        <Text numberOfLines={1} style={styles.seasonStatsPlayerName}>
          {player.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.seasonStatsPlayerClub}>
          {player.clubName ?? t("players.noClub")}
        </Text>
      </View>
      <Text style={styles.seasonStatsPoints}>
        {formatSeasonStatNumber(player.points)}
      </Text>
    </View>
  );
}

function SeasonStatsLeaderboardRow({
  index,
  player,
  t,
}: {
  index: number;
  player: SeasonPlayerStat;
  t: (key: TranslationKey) => string;
}) {
  return (
    <View style={styles.seasonStatsLeaderboardRow}>
      <Text style={styles.seasonStatsLeaderboardRank}>{index + 1}</Text>
      <View style={styles.seasonStatsLeaderboardPlayer}>
        <TeamKitAvatar
          clubName={player.clubName}
          displayName={player.displayName}
          position={player.position}
          size="xs"
        />
        <View style={styles.seasonStatsLeaderboardNameGroup}>
          <Text numberOfLines={1} style={styles.seasonStatsLeaderboardName}>
            {player.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.seasonStatsLeaderboardClub}>
            {player.clubName ?? t("players.noClub")}
          </Text>
        </View>
      </View>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {player.appearances}
      </Text>
      <Text style={styles.seasonStatsLeaderboardCell}>{player.goals}</Text>
      <Text style={styles.seasonStatsLeaderboardCell}>{player.assists}</Text>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {player.yellowCards}
      </Text>
      <Text style={styles.seasonStatsLeaderboardCell}>{player.redCards}</Text>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {player.penaltiesMissed}
      </Text>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {player.penaltiesSaved}
      </Text>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {formatSeasonStatNumber(player.selectedPercent)}%
      </Text>
      <Text style={styles.seasonStatsLeaderboardCell}>
        {formatSeasonStatNumber(player.averagePointsPerGameweek)}
      </Text>
      <Text style={styles.seasonStatsLeaderboardPoints}>
        {formatSeasonStatNumber(player.points)}
      </Text>
    </View>
  );
}

function SeasonStats({
  clubs,
  playerStatistics,
}: {
  clubs: FantasyClub[];
  playerStatistics: SeasonPlayerStatistics | undefined;
}) {
  const { language, t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const clubsById = useMemo(
    () => new Map(clubs.map((club) => [club.id, club])),
    [clubs],
  );
  const localizedStatistics = useMemo(() => {
    if (!playerStatistics) return undefined;

    const localizedById = new Map(
      playerStatistics.leaderboard.map((player) => [
        player.id,
        localizeFantasyPlayer(player, language, clubsById),
      ]),
    );
    const hasClub = (player: SeasonPlayerStat | null) =>
      Boolean(player?.clubId);
    const getLocalizedLeader = (player: SeasonPlayerStat | null) => {
      const localizedPlayer = player
        ? (localizedById.get(player.id) ??
          localizeFantasyPlayer(player, language, clubsById))
        : null;

      return hasClub(localizedPlayer) ? localizedPlayer : null;
    };
    const localizedLeaderboard = playerStatistics.leaderboard
      .map((player) => localizedById.get(player.id) ?? player)
      .filter(hasClub);
    const localizedTopPerformers = playerStatistics.topPerformers
      .map((player) => localizedById.get(player.id) ?? player)
      .filter(hasClub);

    return {
      ...playerStatistics,
      leaderboard: localizedLeaderboard,
      leaders: {
        bestValue: getLocalizedLeader(playerStatistics.leaders.bestValue),
        mostAssists: getLocalizedLeader(playerStatistics.leaders.mostAssists),
        mostPicked: getLocalizedLeader(playerStatistics.leaders.mostPicked),
        topScorer: getLocalizedLeader(playerStatistics.leaders.topScorer),
      },
      topPerformers: localizedTopPerformers,
    };
  }, [clubsById, language, playerStatistics]);

  if (!localizedStatistics) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t("common.loading")}</Text>
        <Text style={styles.mutedText}>{t("season.statsLoading")}</Text>
      </View>
    );
  }

  const { leaderboard, leaders, topPerformers } = localizedStatistics;
  const visibleLeaderboard = leaderboard.slice(0, 20);

  if (leaderboard.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t("season.statsTitle")}</Text>
        <Text style={styles.mutedText}>{t("season.statsEmpty")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.seasonStatsStack}>
      <View style={styles.seasonStatsCardsGrid}>
        <SeasonStatsCard
          label={t("season.stats.topScorer")}
          player={leaders.topScorer}
          value={`${leaders.topScorer?.goals ?? 0} ${t("season.stats.goals")}`}
        />
        <SeasonStatsCard
          label={t("season.stats.mostAssists")}
          player={leaders.mostAssists}
          value={`${leaders.mostAssists?.assists ?? 0} ${t("season.stats.assists")}`}
        />
        <SeasonStatsCard
          label={t("season.stats.bestValue")}
          player={leaders.bestValue}
          value={`${formatSeasonStatNumber(leaders.bestValue?.valueScore ?? 0)} ${t("season.stats.valueUnit")}`}
        />
        <SeasonStatsCard
          label={t("season.stats.mostPicked")}
          player={leaders.mostPicked}
          value={`${formatSeasonStatNumber(leaders.mostPicked?.selectedPercent ?? 0)}% ${t("season.stats.picked")}`}
        />
      </View>

      <View style={styles.seasonStatsListCard}>
        <Text style={styles.seasonStatsSectionLabel}>
          {t("season.stats.topPerformers")}
        </Text>
        {topPerformers.slice(0, 5).map((player, index) => (
          <SeasonStatsRow key={player.id} index={index} player={player} t={t} />
        ))}
      </View>

      <View style={styles.seasonStatsListCard}>
        <Text style={styles.seasonStatsSectionLabel}>
          {t("season.stats.fullLeaderboard")}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.seasonStatsLeaderboardTable}>
            <View style={styles.seasonStatsLeaderboardHeader}>
              <Text style={styles.seasonStatsLeaderboardRank}>
                {t("season.table.pos")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardPlayerHeader}>
                {t("season.stats.player")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.appsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.goalsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.assistsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.yellowCardsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.redCardsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.penaltiesMissedShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.penaltiesSavedShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.selectedPercentShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderCell}>
                {t("season.stats.averagePointsShort")}
              </Text>
              <Text style={styles.seasonStatsLeaderboardHeaderPoints}>
                {t("season.stats.pointsShort")}
              </Text>
            </View>
            {visibleLeaderboard.map((player, index) => (
              <SeasonStatsLeaderboardRow
                key={player.id}
                index={index}
                player={player}
                t={t}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function getMatchFixtureClubName(
  fixture: FantasyFixture,
  side: "home" | "away",
  clubsById: Map<string, FantasyClub>,
  language: LanguageCode,
) {
  const clubId = side === "home" ? fixture.homeClubId : fixture.awayClubId;
  const clubName =
    side === "home" ? fixture.homeClubName : fixture.awayClubName;

  if (clubId) {
    const club = clubsById.get(clubId);
    if (club) return club.name;
  }

  return getLocalizedClubName(clubName, language);
}

function MatchDetailsPage({
  clubsById,
  clubsByName,
  details,
  fallbackFixture,
  onBack,
}: {
  clubsById: Map<string, FantasyClub>;
  clubsByName: Map<string, FantasyClub>;
  details:
    | {
        events: Array<{
          id: string;
          minute: number | null;
          playerName: string | null;
          points: number | null;
          side: "home" | "away";
          type: MatchDetailEventType;
        }>;
        fixture: FantasyFixture;
        lineups: Array<{
          id: string;
          isStarter: boolean | null;
          jerseyNumber: number | null;
          playerName: string;
          side: "home" | "away";
        }>;
      }
    | null
    | undefined;
  fallbackFixture: FantasyFixture | null;
  onBack: () => void;
}) {
  const { language, t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const fixture = details?.fixture ?? fallbackFixture;
  const events = details?.events ?? [];
  const homeLineups = (details?.lineups ?? []).filter(
    (lineup) => lineup.side === "home",
  );
  const awayLineups = (details?.lineups ?? []).filter(
    (lineup) => lineup.side === "away",
  );
  const homeClub = fixture
    ? getFixtureClub(fixture, "home", clubsById, clubsByName)
    : null;
  const awayClub = fixture
    ? getFixtureClub(fixture, "away", clubsById, clubsByName)
    : null;
  const homeClubName = fixture
    ? (homeClub?.name ??
      getMatchFixtureClubName(fixture, "home", clubsById, language))
    : "";
  const awayClubName = fixture
    ? (awayClub?.name ??
      getMatchFixtureClubName(fixture, "away", clubsById, language))
    : "";

  return (
    <View style={styles.matchDetailsPage}>
      <View style={styles.teamWorkspaceHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.teamWorkspaceBackButton}
        >
          <ChevronLeft
            color={colors.brand.blueDark}
            size={22}
            strokeWidth={2.5}
          />
        </Pressable>
        <View style={styles.teamWorkspaceTitleGroup}>
          <Text style={styles.teamWorkspaceTitle}>
            {t("matchDetails.title")}
          </Text>
          {fixture ? (
            <Text numberOfLines={1} style={styles.teamWorkspaceDeadline}>
              {formatMatchDetailDate(fixture.scheduledAt, language)}
            </Text>
          ) : null}
        </View>
        <View style={styles.teamWorkspaceHeaderSpacer} />
      </View>

      {!fixture ? (
        <View style={styles.panel}>
          <Text style={styles.mutedText}>{t("matchDetails.loading")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.matchDetailsScoreCard}>
            <View style={styles.matchDetailsTeamNameGroup}>
              <View style={styles.matchDetailsTeamIdentity}>
                <FantasyClubLogo club={homeClub} size="md" />
                <Text numberOfLines={2} style={styles.matchDetailsTeamName}>
                  {homeClubName}
                </Text>
              </View>
            </View>
            <Text style={styles.matchDetailsScoreText}>
              {formatMatchTime(fixture, language)}
            </Text>
            <View style={styles.matchDetailsTeamNameGroup}>
              <View style={styles.matchDetailsTeamIdentity}>
                <FantasyClubLogo club={awayClub} size="md" />
                <Text numberOfLines={2} style={styles.matchDetailsTeamName}>
                  {awayClubName}
                </Text>
              </View>
            </View>
          </View>
          {fixture.venue ? (
            <Text style={styles.mutedText}>
              {t("matchDetails.venue") + ": " + fixture.venue}
            </Text>
          ) : null}

          <View
            style={[
              styles.matchDetailsContentGrid,
              isDesktopWeb ? styles.matchDetailsContentGridDesktop : null,
            ]}
          >
            <View
              style={[
                styles.matchDetailsSection,
                isDesktopWeb ? styles.matchDetailsContentPaneDesktop : null,
              ]}
            >
              <Text style={styles.teamOverviewTitle}>
                {t("matchDetails.eventsTitle")}
              </Text>
              {events.length === 0 ? (
                <Text style={styles.mutedText}>
                  {t("matchDetails.noEvents")}
                </Text>
              ) : (
                <View style={styles.matchDetailsList}>
                  {events.map((event) => (
                    <View key={event.id} style={styles.matchDetailsEventRow}>
                      <View style={styles.matchDetailsEventMain}>
                        <Text style={styles.matchDetailsEventType}>
                          {t(MATCH_EVENT_LABEL_KEYS[event.type])}
                          {event.minute !== null
                            ? " · " + event.minute + "'"
                            : ""}
                        </Text>
                        <Text style={styles.mutedText}>
                          {event.playerName
                            ? localizeMatchPlayerName(
                                event.playerName,
                                language,
                              )
                            : event.side === "home"
                              ? homeClubName
                              : awayClubName}
                        </Text>
                      </View>
                      {event.points !== null ? (
                        <Text style={styles.matchDetailsEventPoints}>
                          {event.points > 0 ? "+" : ""}
                          {event.points}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View
              style={[
                styles.matchDetailsSection,
                isDesktopWeb ? styles.matchDetailsContentPaneDesktop : null,
              ]}
            >
              <Text style={styles.teamOverviewTitle}>
                {t("matchDetails.lineupsTitle")}
              </Text>
              {homeLineups.length === 0 && awayLineups.length === 0 ? (
                <Text style={styles.mutedText}>
                  {t("matchDetails.noLineups")}
                </Text>
              ) : (
                <View style={styles.matchDetailsLineupColumns}>
                  {[
                    { title: homeClubName, lineups: homeLineups },
                    { title: awayClubName, lineups: awayLineups },
                  ].map((column) => (
                    <View
                      key={column.title}
                      style={styles.matchDetailsLineupColumn}
                    >
                      <Text
                        numberOfLines={1}
                        style={styles.matchDetailsLineupTitle}
                      >
                        {column.title}
                      </Text>
                      {column.lineups.map((lineup) => (
                        <Text
                          key={lineup.id}
                          style={styles.matchDetailsLineupPlayer}
                        >
                          {lineup.jerseyNumber !== null
                            ? lineup.jerseyNumber + ". "
                            : ""}
                          {localizeMatchPlayerName(lineup.playerName, language)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function SeasonCalendar({
  clubs,
  clubsById,
  clubsByName,
  filtersDirty,
  fixtures,
  gameweeks,
  onOpenClubPicker,
  onOpenFixtureDetails,
  onOpenGameweekPicker,
  onResetFilters,
  onSelectClub,
  onSelectGameweek,
  selectedClubId,
  selectedGameweekId,
}: {
  clubs: FantasyClub[];
  clubsById: Map<string, FantasyClub>;
  clubsByName: Map<string, FantasyClub>;
  filtersDirty: boolean;
  fixtures: FantasyFixture[];
  gameweeks: FantasyGameweek[];
  onOpenClubPicker: () => void;
  onOpenFixtureDetails: (fixture: FantasyFixture) => void;
  onOpenGameweekPicker: () => void;
  onResetFilters: () => void;
  onSelectClub: (clubId: string | null) => void;
  onSelectGameweek: (gameweekId: string | null) => void;
  selectedClubId: string | null;
  selectedGameweekId: string | null;
}) {
  const { language, t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const selectedClub = selectedClubId
    ? (clubs.find((club) => club.id === selectedClubId) ?? null)
    : null;
  const selectedClubLabel = selectedClub
    ? (selectedClub.shortName ?? selectedClub.name)
    : t("season.allClubs");
  const isAllGameweeksSelected = selectedGameweekId === ALL_GAMEWEEKS_FILTER_ID;
  const selectedGameweek = isAllGameweeksSelected
    ? null
    : (gameweeks.find((gameweek) => gameweek.id === selectedGameweekId) ??
      gameweeks[0] ??
      null);
  const selectedGameweekLabel = isAllGameweeksSelected
    ? t("season.allGameweeks")
    : (selectedGameweek?.name ?? t("season.allGameweeks"));
  const selectedGameweekIndex = selectedGameweek
    ? gameweeks.findIndex((gameweek) => gameweek.id === selectedGameweek.id)
    : -1;
  const gameweekSelectOptions = useMemo(
    () => [
      { label: t("season.allGameweeks"), value: ALL_GAMEWEEKS_FILTER_ID },
      ...gameweeks.map((gameweek) => ({
        label: gameweek.name,
        value: gameweek.id,
      })),
    ],
    [gameweeks, t],
  );
  const clubSelectOptions = useMemo(
    () => [
      { label: t("season.allClubs"), value: ALL_CALENDAR_CLUBS_FILTER_ID },
      ...clubs.map((club) => ({
        label: club.shortName ?? club.name,
        leading: <FantasyClubLogo club={club} size="sm" />,
        value: club.id,
      })),
    ],
    [clubs, t],
  );
  const selectedGameweekSelectValue = isAllGameweeksSelected
    ? ALL_GAMEWEEKS_FILTER_ID
    : (selectedGameweek?.id ?? ALL_GAMEWEEKS_FILTER_ID);
  const gameweeksById = useMemo(
    () => new Map(gameweeks.map((gameweek) => [gameweek.id, gameweek])),
    [gameweeks],
  );
  const sortedFixtures = useMemo(
    () => [...fixtures].sort((a, b) => a.scheduledAt - b.scheduledAt),
    [fixtures],
  );
  const gameweekFixtures = useMemo(
    () =>
      sortedFixtures.filter((fixture) => {
        if (
          !isAllGameweeksSelected &&
          selectedGameweek &&
          fixture.gameweekId !== selectedGameweek.id
        ) {
          return false;
        }

        if (selectedClub && !fixtureIncludesClub(fixture, selectedClub)) {
          return false;
        }

        return true;
      }),
    [isAllGameweeksSelected, selectedClub, selectedGameweek, sortedFixtures],
  );
  const matchGroups = useMemo(() => {
    const dateUnknown = t("fixtures.dateUnknown");

    if (isAllGameweeksSelected || selectedClub) {
      const result = new Map<
        string,
        {
          fixtures: FantasyFixture[];
          key: string;
          sortValue: number;
          status: string | null;
          title: string;
        }
      >();

      for (const fixture of gameweekFixtures) {
        const gameweek = fixture.gameweekId
          ? (gameweeksById.get(fixture.gameweekId) ?? null)
          : null;
        const key = gameweek?.id ?? fixture.id;
        const current = result.get(key) ?? {
          fixtures: [],
          key,
          sortValue: gameweek?.number ?? fixture.scheduledAt,
          status: gameweek?.status ?? null,
          title:
            gameweek?.name ??
            formatDate(fixture.scheduledAt, language, dateUnknown),
        };
        current.fixtures.push(fixture);
        result.set(key, current);
      }

      return [...result.values()]
        .sort((a, b) => a.sortValue - b.sortValue)
        .map((group) => {
          const sortedFixtures = [...group.fixtures].sort(
            (a, b) => a.scheduledAt - b.scheduledAt,
          );
          return {
            ...group,
            fixtures: sortedFixtures,
            title:
              group.title +
              " · " +
              formatDateRange(sortedFixtures, language, dateUnknown),
          };
        });
    }

    const result = new Map<
      string,
      {
        fixtures: FantasyFixture[];
        key: string;
        sortValue: number;
        status: string | null;
        title: string;
      }
    >();

    for (const fixture of gameweekFixtures) {
      const key = getDayKey(fixture.scheduledAt);
      const current = result.get(key) ?? {
        fixtures: [],
        key,
        sortValue: fixture.scheduledAt,
        status: selectedGameweek?.status ?? null,
        title: formatPickerDate(fixture.scheduledAt, language),
      };
      current.fixtures.push(fixture);
      result.set(key, current);
    }

    return [...result.values()]
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((group) => ({
        ...group,
        fixtures: [...group.fixtures].sort(
          (a, b) => a.scheduledAt - b.scheduledAt,
        ),
      }));
  }, [
    gameweekFixtures,
    gameweeksById,
    isAllGameweeksSelected,
    language,
    selectedClub,
    t,
  ]);

  const moveGameweek = (direction: -1 | 1) => {
    const nextGameweek = gameweeks[selectedGameweekIndex + direction];
    if (!nextGameweek) return;
    onSelectGameweek(nextGameweek.id);
  };

  const [visibleMatchGroupCount, setVisibleMatchGroupCount] = useState(
    SEASON_CALENDAR_INITIAL_GROUPS,
  );
  useEffect(() => {
    setVisibleMatchGroupCount(SEASON_CALENDAR_INITIAL_GROUPS);
    if (matchGroups.length <= SEASON_CALENDAR_INITIAL_GROUPS) return undefined;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const revealNextBatch = () => {
      timeoutId = setTimeout(() => {
        if (isCancelled) return;

        setVisibleMatchGroupCount((current) => {
          const next = Math.min(
            matchGroups.length,
            current + SEASON_CALENDAR_GROUP_BATCH_SIZE,
          );
          if (next < matchGroups.length) {
            revealNextBatch();
          }
          return next;
        });
      }, SEASON_CALENDAR_GROUP_BATCH_DELAY_MS);
    };

    revealNextBatch();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [matchGroups]);
  const visibleMatchGroups =
    matchGroups.length > SEASON_CALENDAR_INITIAL_GROUPS
      ? matchGroups.slice(0, visibleMatchGroupCount)
      : matchGroups;

  return (
    <View style={styles.seasonSectionStack}>
      <View style={styles.seasonControlRow}>
        {isDesktopWeb ? (
          <>
            <DesktopSelect
              accessibilityLabel={t("season.allGameweeks")}
              onValueChange={(value) => onSelectGameweek(value)}
              options={gameweekSelectOptions}
              style={styles.playerPickerDesktopSelect}
              value={selectedGameweekSelectValue}
            />
            <DesktopSelect
              accessibilityLabel={t("season.allClubs")}
              onValueChange={(value) => {
                onSelectClub(
                  value === ALL_CALENDAR_CLUBS_FILTER_ID ? null : value,
                );
              }}
              options={clubSelectOptions}
              style={styles.playerPickerDesktopSelect}
              value={selectedClubId ?? ALL_CALENDAR_CLUBS_FILTER_ID}
            />
          </>
        ) : (
          <>
            <SeasonSelectButton
              label={selectedGameweekLabel}
              onPress={onOpenGameweekPicker}
            />
            <SeasonSelectButton
              label={selectedClubLabel}
              onPress={onOpenClubPicker}
            />
          </>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!filtersDirty}
          onPress={onResetFilters}
          style={[
            styles.seasonResetButton,
            !filtersDirty ? styles.seasonResetButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.seasonResetText,
              !filtersDirty ? styles.seasonResetTextDisabled : null,
            ]}
          >
            {t("season.reset")}
          </Text>
          <RotateCcw
            color={filtersDirty ? colors.text.primary : colors.text.muted}
            size={16}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {!isAllGameweeksSelected && selectedGameweek ? (
        <>
          <View style={styles.seasonGameweekNav}>
            <Pressable
              accessibilityRole="button"
              disabled={selectedGameweekIndex <= 0}
              onPress={() => moveGameweek(-1)}
              style={[
                styles.seasonNavButton,
                selectedGameweekIndex <= 0
                  ? styles.seasonNavButtonDisabled
                  : null,
              ]}
            >
              <ChevronLeft
                color={colors.brand.blueDark}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
            <View style={styles.seasonGameweekNavTextGroup}>
              <View style={styles.seasonGameweekNavTitleRow}>
                <Text numberOfLines={1} style={styles.seasonGameweekNavTitle}>
                  {selectedGameweek.name}
                </Text>
                {selectedGameweek.status === "live" ? (
                  <Text style={styles.seasonLiveBadge}>{t("common.live")}</Text>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.seasonGameweekNavDates}>
                {formatDateRange(
                  gameweekFixtures,
                  language,
                  t("fixtures.dateUnknown"),
                )}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={
                selectedGameweekIndex < 0 ||
                selectedGameweekIndex >= gameweeks.length - 1
              }
              onPress={() => moveGameweek(1)}
              style={[
                styles.seasonNavButton,
                selectedGameweekIndex < 0 ||
                selectedGameweekIndex >= gameweeks.length - 1
                  ? styles.seasonNavButtonDisabled
                  : null,
              ]}
            >
              <ChevronRight
                color={colors.brand.blueDark}
                size={22}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
          <SeasonFixtureProfileNotice gameweek={selectedGameweek} />
        </>
      ) : null}

      <View style={styles.seasonMatchDayCard}>
        {visibleMatchGroups.map((group) => (
          <View key={group.key} style={styles.seasonMatchDayGroup}>
            <View style={styles.seasonMatchDayTitleRow}>
              <Text style={styles.seasonMatchDayTitle}>{group.title}</Text>
              {group.status === "live" ? (
                <Text style={styles.seasonLiveBadge}>{t("common.live")}</Text>
              ) : null}
            </View>
            <View style={styles.seasonMatchList}>
              {group.fixtures.map((fixture) => {
                const homeClub = getFixtureClub(
                  fixture,
                  "home",
                  clubsById,
                  clubsByName,
                );
                const awayClub = getFixtureClub(
                  fixture,
                  "away",
                  clubsById,
                  clubsByName,
                );
                const isCompleted = isCompletedFixture(fixture);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={fixture.id}
                    onPress={() => onOpenFixtureDetails(fixture)}
                    style={styles.seasonMatchRow}
                  >
                    <View style={styles.seasonMatchClubHome}>
                      <Text
                        numberOfLines={1}
                        style={styles.seasonMatchClubName}
                      >
                        {homeClub?.shortName ?? fixture.homeClubName}
                      </Text>
                      <FantasyClubLogo club={homeClub} size="sm" />
                    </View>
                    <View
                      style={[
                        styles.seasonMatchCenter,
                        isCompleted ? styles.seasonMatchCenterCompleted : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.seasonMatchTime,
                          isCompleted ? styles.seasonMatchScore : null,
                        ]}
                      >
                        {formatMatchTime(fixture, language)}
                      </Text>
                    </View>
                    <View style={styles.seasonMatchClubAway}>
                      <FantasyClubLogo club={awayClub} size="sm" />
                      <Text
                        numberOfLines={1}
                        style={styles.seasonMatchClubName}
                      >
                        {awayClub?.shortName ?? fixture.awayClubName}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        {matchGroups.length === 0 ? (
          <Text style={styles.mutedText}>
            {selectedClub
              ? t("season.noMatchesForClub")
              : t("season.noMatchesForDay")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function buildStandings({
  clubs,
  clubsById,
  clubsByName,
  fixtures,
  gameweeksById,
  tableGameweekLimit,
  tableScope,
}: {
  clubs: FantasyClub[];
  clubsById: Map<string, FantasyClub>;
  clubsByName: Map<string, FantasyClub>;
  fixtures: FantasyFixture[];
  gameweeksById: Map<string, FantasyGameweek>;
  tableGameweekLimit: number | null;
  tableScope: TableScope;
}) {
  const rows = new Map<string, StandingRow>();

  for (const club of clubs) {
    rows.set(club.id, {
      club,
      draws: 0,
      form: [],
      goalsAgainst: 0,
      goalsFor: 0,
      goalDifference: 0,
      losses: 0,
      nextOpponent: null,
      played: 0,
      points: 0,
      wins: 0,
    });
  }

  const sortedFixtures = [...fixtures].sort(
    (a, b) => a.scheduledAt - b.scheduledAt,
  );

  const applyResult = (
    club: FantasyClub | null,
    opponent: FantasyClub | null,
    goalsFor: number,
    goalsAgainst: number,
  ) => {
    if (!club) return;
    const row = rows.get(club.id);
    if (!row) return;
    const result = getResultKind(goalsFor, goalsAgainst);

    row.played += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.points += getResultPoints(result);
    if (result === "win") row.wins += 1;
    if (result === "draw") row.draws += 1;
    if (result === "loss") row.losses += 1;
    row.form.push({ opponent, result });
  };

  for (const fixture of sortedFixtures) {
    const gameweekNumber = fixture.gameweekId
      ? (gameweeksById.get(fixture.gameweekId)?.number ?? null)
      : null;
    if (
      tableGameweekLimit !== null &&
      gameweekNumber !== null &&
      gameweekNumber > tableGameweekLimit
    )
      continue;
    if (!isCompletedFixture(fixture)) continue;

    const homeClub = getFixtureClub(fixture, "home", clubsById, clubsByName);
    const awayClub = getFixtureClub(fixture, "away", clubsById, clubsByName);

    if (tableScope !== "away") {
      applyResult(
        homeClub,
        awayClub,
        fixture.homeScore ?? 0,
        fixture.awayScore ?? 0,
      );
    }
    if (tableScope !== "home") {
      applyResult(
        awayClub,
        homeClub,
        fixture.awayScore ?? 0,
        fixture.homeScore ?? 0,
      );
    }
  }

  for (const row of rows.values()) {
    const nextFixture = sortedFixtures.find((fixture) => {
      if (isCompletedFixture(fixture)) return false;
      return (
        isSameClub(row.club, fixture.homeClubId, fixture.homeClubName) ||
        isSameClub(row.club, fixture.awayClubId, fixture.awayClubName)
      );
    });

    if (nextFixture) {
      const isHome = isSameClub(
        row.club,
        nextFixture.homeClubId,
        nextFixture.homeClubName,
      );
      row.nextOpponent = getFixtureClub(
        nextFixture,
        isHome ? "away" : "home",
        clubsById,
        clubsByName,
      );
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.club.sortOrder - b.club.sortOrder ||
      a.club.name.localeCompare(b.club.name),
  );
}

function HeaderText({ children, style }: { children: string; style?: object }) {
  return <Text style={[styles.seasonTableHeaderText, style]}>{children}</Text>;
}

function StatText({
  children,
  isStrong = false,
}: {
  children: number | string;
  isStrong?: boolean;
}) {
  return (
    <Text
      style={isStrong ? styles.seasonTableStatStrong : styles.seasonTableStat}
    >
      {children}
    </Text>
  );
}

function SeasonStandings({
  clubs,
  clubsById,
  clubsByName,
  fixtures,
  gameweeks,
  tableMode,
  setTableMode,
}: {
  clubs: FantasyClub[];
  clubsById: Map<string, FantasyClub>;
  clubsByName: Map<string, FantasyClub>;
  fixtures: FantasyFixture[];
  gameweeks: FantasyGameweek[];
  tableMode: TableMode;
  setTableMode: (mode: TableMode) => void;
}) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const gameweeksById = useMemo(
    () => new Map(gameweeks.map((gameweek) => [gameweek.id, gameweek])),
    [gameweeks],
  );
  const rows = useMemo(
    () =>
      buildStandings({
        clubs,
        clubsById,
        clubsByName,
        fixtures,
        gameweeksById,
        tableGameweekLimit: null,
        tableScope: "all",
      }),
    [clubs, clubsById, clubsByName, fixtures, gameweeksById],
  );

  return (
    <View style={styles.seasonSectionStack}>
      <View style={styles.seasonTableModeTabs}>
        {TABLE_MODES.map((mode) => {
          const isActive = tableMode === mode.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={mode.id}
              onPress={() => setTableMode(mode.id)}
              style={[
                styles.seasonTableModeButton,
                isActive ? styles.seasonTableModeButtonActive : null,
              ]}
            >
              <Text
                style={
                  isActive
                    ? styles.seasonTableModeTextActive
                    : styles.seasonTableModeText
                }
              >
                {t(mode.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.seasonTableCard}>
        {tableMode === "full" ? (
          <ScrollView
            contentContainerStyle={
              isDesktopWeb
                ? styles.seasonTableHorizontalContentDesktop
                : undefined
            }
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View
              style={[
                styles.seasonTableFullWidth,
                isDesktopWeb ? styles.seasonTableFullWidthDesktop : null,
              ]}
            >
              <View style={styles.seasonTableRowHeader}>
                <HeaderText style={styles.seasonTablePosCell}>
                  {t("season.table.pos")}
                </HeaderText>
                <HeaderText
                  style={[
                    styles.seasonTableTeamCell,
                    styles.seasonTableTeamHeaderCell,
                  ]}
                >
                  {t("season.table.team")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.played")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.wins")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.draws")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.losses")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.goalsFor")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.goalsAgainst")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.goalDifference")}
                </HeaderText>
                <HeaderText style={styles.seasonTableCell}>
                  {t("season.table.points")}
                </HeaderText>
                <HeaderText style={styles.seasonTableNextCell}>
                  {t("season.table.next")}
                </HeaderText>
              </View>
              {rows.map((row, index) => (
                <View key={row.club.id} style={styles.seasonTableRow}>
                  <StatText>{index + 1}</StatText>
                  <View style={styles.seasonTableTeamCell}>
                    <FantasyClubLogo club={row.club} size="sm" />
                    <Text numberOfLines={1} style={styles.seasonTableTeamName}>
                      {row.club.shortName ?? row.club.name}
                    </Text>
                  </View>
                  <StatText>{row.played}</StatText>
                  <StatText>{row.wins}</StatText>
                  <StatText>{row.draws}</StatText>
                  <StatText>{row.losses}</StatText>
                  <StatText>{row.goalsFor}</StatText>
                  <StatText>{row.goalsAgainst}</StatText>
                  <StatText>{row.goalDifference}</StatText>
                  <StatText isStrong>{row.points}</StatText>
                  <View style={styles.seasonTableNextCell}>
                    <FantasyClubLogo club={row.nextOpponent} size="sm" />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {tableMode === "short" ? (
          <View>
            <View style={styles.seasonTableRowHeader}>
              <HeaderText style={styles.seasonTablePosCell}>
                {t("season.table.pos")}
              </HeaderText>
              <HeaderText
                style={[
                  styles.seasonTableTeamCell,
                  styles.seasonTableTeamHeaderCell,
                ]}
              >
                {t("season.table.team")}
              </HeaderText>
              <HeaderText style={styles.seasonTableCell}>
                {t("season.table.played")}
              </HeaderText>
              <HeaderText style={styles.seasonTableCell}>
                {t("season.table.wins")}
              </HeaderText>
              <HeaderText style={styles.seasonTableCell}>
                {t("season.table.goalDifference")}
              </HeaderText>
              <HeaderText style={styles.seasonTableCell}>
                {t("season.table.points")}
              </HeaderText>
            </View>
            {rows.map((row, index) => (
              <View key={row.club.id} style={styles.seasonTableRow}>
                <View style={styles.seasonTablePosCell}>
                  <StatText isStrong>{index + 1}</StatText>
                </View>
                <View style={styles.seasonTableTeamCell}>
                  <FantasyClubLogo club={row.club} size="sm" />
                  <Text numberOfLines={1} style={styles.seasonTableTeamName}>
                    {row.club.shortName ?? row.club.name}
                  </Text>
                </View>
                <View style={styles.seasonTableCell}>
                  <StatText>{row.played}</StatText>
                </View>
                <View style={styles.seasonTableCell}>
                  <StatText>{row.wins}</StatText>
                </View>
                <View style={styles.seasonTableCell}>
                  <StatText>{row.goalDifference}</StatText>
                </View>
                <View style={styles.seasonTableCell}>
                  <StatText isStrong>{row.points}</StatText>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {tableMode === "form" ? (
          <View>
            <View style={styles.seasonTableRowHeader}>
              <HeaderText style={styles.seasonTablePosCell}>
                {t("season.table.pos")}
              </HeaderText>
              <HeaderText
                style={[
                  styles.seasonTableTeamCell,
                  styles.seasonTableTeamHeaderCell,
                ]}
              >
                {t("season.table.team")}
              </HeaderText>
              <HeaderText style={styles.seasonTableFormCell}>
                {t("season.table.form")}
              </HeaderText>
            </View>
            {rows.map((row, index) => (
              <View key={row.club.id} style={styles.seasonTableRow}>
                <View style={styles.seasonTablePosCell}>
                  <StatText isStrong>{index + 1}</StatText>
                </View>
                <View style={styles.seasonTableTeamCell}>
                  <FantasyClubLogo club={row.club} size="sm" />
                  <Text numberOfLines={1} style={styles.seasonTableTeamName}>
                    {row.club.shortName ?? row.club.name}
                  </Text>
                </View>
                <View style={styles.seasonTableFormCell}>
                  {row.form.slice(-5).map((formItem, formIndex) => (
                    <View
                      key={`${row.club.id}-${formIndex}`}
                      style={styles.seasonFormItem}
                    >
                      <FantasyClubLogo club={formItem.opponent} size="sm" />
                      <Text
                        style={[
                          styles.seasonFormLetter,
                          formItem.result === "win"
                            ? styles.seasonFormLetterWin
                            : null,
                          formItem.result === "draw"
                            ? styles.seasonFormLetterDraw
                            : null,
                          formItem.result === "loss"
                            ? styles.seasonFormLetterLoss
                            : null,
                        ]}
                      >
                        {t(getResultLetterKey(formItem.result))}
                      </Text>
                    </View>
                  ))}
                  {row.form.length === 0 ? (
                    <Text style={styles.seasonTableMutedDash}>—</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {rows.length === 0 ? (
          <Text style={styles.mutedText}>{t("season.noStandings")}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SeasonScreen({
  clubs,
  fixtures,
  gameweeks,
  playerStatistics,
}: SeasonScreenProps) {
  const { language, t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktopWeb =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const [activeSection, setActiveSection] = useState<SeasonSection>("calendar");
  const [selectedGameweekId, setSelectedGameweekId] = useState<string | null>(
    null,
  );
  const [selectedCalendarClubId, setSelectedCalendarClubId] = useState<
    string | null
  >(null);
  const [isCalendarGameweekDirty, setCalendarGameweekDirty] = useState(false);
  const [tableMode, setTableMode] = useState<TableMode>("short");
  const [openPicker, setOpenPicker] = useState<PickerKind | null>(null);
  const [selectedFixtureDetailsId, setSelectedFixtureDetailsId] =
    useState<Id<"fantasyFixtures"> | null>(null);

  useDismissKeyboardOnChange([
    activeSection,
    tableMode,
    openPicker,
    selectedGameweekId,
    selectedCalendarClubId,
    selectedFixtureDetailsId,
  ]);
  const isLoading =
    clubs === undefined || fixtures === undefined || gameweeks === undefined;
  const sortedGameweeks = useMemo(
    () => [...(gameweeks ?? [])].sort((a, b) => a.number - b.number),
    [gameweeks],
  );
  const calendarGameweeks = useMemo(
    () => sortedGameweeks.filter(isRegularSeasonCalendarGameweek),
    [sortedGameweeks],
  );
  const calendarGameweekIds = useMemo(
    () => new Set(calendarGameweeks.map((gameweek) => gameweek.id)),
    [calendarGameweeks],
  );
  const calendarFixtures = useMemo(
    () =>
      (fixtures ?? []).filter(
        (fixture) =>
          !fixture.gameweekId || calendarGameweekIds.has(fixture.gameweekId),
      ),
    [calendarGameweekIds, fixtures],
  );
  const activeClubs = useMemo(
    () => (clubs ?? []).filter((club) => club.isActive),
    [clubs],
  );
  const clubsById = useMemo(
    () => new Map(activeClubs.map((club) => [club.id, club])),
    [activeClubs],
  );
  const clubsByName = useMemo(() => {
    const result = new Map<string, FantasyClub>();
    for (const club of activeClubs) {
      result.set(normalizeClubName(club.name), club);
      if (club.shortName) result.set(normalizeClubName(club.shortName), club);
    }
    return result;
  }, [activeClubs]);
  const defaultGameweekId = useMemo(
    () => getDefaultGameweekId(calendarGameweeks, calendarFixtures),
    [calendarFixtures, calendarGameweeks],
  );
  const isAllGameweeksSelected = selectedGameweekId === ALL_GAMEWEEKS_FILTER_ID;
  const selectedGameweek = isAllGameweeksSelected
    ? null
    : (calendarGameweeks.find(
        (gameweek) => gameweek.id === selectedGameweekId,
      ) ??
      calendarGameweeks.find((gameweek) => gameweek.id === defaultGameweekId) ??
      calendarGameweeks[0] ??
      null);
  const calendarFiltersDirty =
    selectedCalendarClubId !== null ||
    isAllGameweeksSelected ||
    (selectedGameweek?.id ?? null) !== defaultGameweekId;
  useEffect(() => {
    if (isAllGameweeksSelected) return;

    const fallbackGameweekId =
      defaultGameweekId ?? calendarGameweeks[0]?.id ?? null;
    if (!fallbackGameweekId) return;

    const selectionIsValid =
      selectedGameweekId !== null &&
      calendarGameweeks.some((gameweek) => gameweek.id === selectedGameweekId);
    if (selectionIsValid && isCalendarGameweekDirty) return;

    if (selectedGameweekId !== fallbackGameweekId) {
      setSelectedGameweekId(fallbackGameweekId);
    }
    if (!selectionIsValid && isCalendarGameweekDirty) {
      setCalendarGameweekDirty(false);
    }
  }, [
    defaultGameweekId,
    isAllGameweeksSelected,
    isCalendarGameweekDirty,
    selectedGameweekId,
    calendarGameweeks,
  ]);

  const pendingCalendarPickerSelectionRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      pendingCalendarPickerSelectionRef.current = null;
    };
  }, []);

  const closePicker = () => setOpenPicker(null);
  const applyCalendarGameweekSelection = (gameweekId: string | null) => {
    setSelectedGameweekId(gameweekId);
    setCalendarGameweekDirty(gameweekId !== defaultGameweekId);
  };
  const selectCalendarGameweek = (gameweekId: string | null) => {
    applyCalendarGameweekSelection(gameweekId);
  };
  const queueCalendarPickerSelection = (callback: () => void) => {
    pendingCalendarPickerSelectionRef.current = callback;
    closePicker();
  };
  const flushCalendarPickerSelection = () => {
    const pendingSelection = pendingCalendarPickerSelectionRef.current;
    pendingCalendarPickerSelectionRef.current = null;
    pendingSelection?.();
  };
  const selectCalendarGameweekFromPicker = (gameweekId: string | null) => {
    queueCalendarPickerSelection(() => {
      applyCalendarGameweekSelection(gameweekId);
    });
  };
  const selectCalendarClubFromPicker = (clubId: string | null) => {
    queueCalendarPickerSelection(() => {
      setSelectedCalendarClubId(clubId);
    });
  };
  const resetCalendarFilters = () => {
    setSelectedCalendarClubId(null);
    setSelectedGameweekId(
      defaultGameweekId ?? calendarGameweeks[0]?.id ?? null,
    );
    setCalendarGameweekDirty(false);
  };
  const selectedFixtureDetails = useQuery(
    api.fantasy.fixtureDetails,
    selectedFixtureDetailsId ? { fixtureId: selectedFixtureDetailsId } : "skip",
  );
  const selectedFixtureDetailsFallback = useMemo(
    () =>
      (fixtures ?? []).find(
        (fixture) => fixture.id === selectedFixtureDetailsId,
      ) ?? null,
    [fixtures, selectedFixtureDetailsId],
  );

  const pickerOptions = useMemo<PickerOption[]>(() => {
    if (openPicker === "calendarGameweek") {
      return [
        {
          isSelected: isAllGameweeksSelected,
          key: ALL_GAMEWEEKS_FILTER_ID,
          label: t("season.allGameweeks"),
          onPress: () => {
            selectCalendarGameweekFromPicker(ALL_GAMEWEEKS_FILTER_ID);
          },
        },
        ...calendarGameweeks.map((gameweek) => ({
          isSelected:
            !isAllGameweeksSelected && selectedGameweek?.id === gameweek.id,
          key: gameweek.id,
          label: gameweek.name,
          onPress: () => {
            selectCalendarGameweekFromPicker(gameweek.id);
          },
          secondaryLabel: formatDateRange(
            (calendarFixtures ?? []).filter(
              (fixture) => fixture.gameweekId === gameweek.id,
            ),
            language,
            t("fixtures.dateUnknown"),
          ),
        })),
      ];
    }

    if (openPicker === "calendarClub") {
      return [
        {
          isSelected: selectedCalendarClubId === null,
          key: "all",
          label: t("season.allClubs"),
          onPress: () => {
            selectCalendarClubFromPicker(null);
          },
        },
        ...[...activeClubs]
          .sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          )
          .map((club) => ({
            club,
            isSelected: selectedCalendarClubId === club.id,
            key: club.id,
            label: club.name,
            onPress: () => {
              selectCalendarClubFromPicker(club.id);
            },
            secondaryLabel: club.shortName ?? undefined,
          })),
      ];
    }

    return [];
  }, [
    activeClubs,
    defaultGameweekId,
    language,
    openPicker,
    isAllGameweeksSelected,
    selectedCalendarClubId,
    selectedGameweek?.id,
    calendarFixtures,
    calendarGameweeks,
    t,
  ]);

  return (
    <FantasyScreenFrame kicker={t("season.kicker")} title={t("season.title")}>
      {selectedFixtureDetailsId ? (
        <MatchDetailsPage
          clubsById={clubsById}
          clubsByName={clubsByName}
          details={selectedFixtureDetails}
          fallbackFixture={selectedFixtureDetailsFallback}
          onBack={() => setSelectedFixtureDetailsId(null)}
        />
      ) : (
        <>
          <View style={styles.seasonTabs}>
            {SEASON_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={section.id}
                  onPress={() => setActiveSection(section.id)}
                  style={styles.seasonTabButton}
                >
                  <Text
                    style={
                      isActive
                        ? styles.seasonTabTextActive
                        : styles.seasonTabText
                    }
                  >
                    {t(section.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t("common.loading")}</Text>
              <Text style={styles.mutedText}>
                {t("fixtures.loadingDescription")}
              </Text>
            </View>
          ) : null}

          {!isLoading && activeSection === "calendar" ? (
            <SeasonCalendar
              clubs={activeClubs}
              clubsById={clubsById}
              clubsByName={clubsByName}
              filtersDirty={calendarFiltersDirty}
              fixtures={calendarFixtures}
              gameweeks={calendarGameweeks}
              onOpenClubPicker={() => setOpenPicker("calendarClub")}
              onOpenFixtureDetails={(fixture) =>
                setSelectedFixtureDetailsId(fixture.id as Id<"fantasyFixtures">)
              }
              onOpenGameweekPicker={() => setOpenPicker("calendarGameweek")}
              onResetFilters={resetCalendarFilters}
              onSelectClub={setSelectedCalendarClubId}
              onSelectGameweek={selectCalendarGameweek}
              selectedClubId={selectedCalendarClubId}
              selectedGameweekId={
                isAllGameweeksSelected
                  ? ALL_GAMEWEEKS_FILTER_ID
                  : (selectedGameweek?.id ?? null)
              }
            />
          ) : null}

          {!isLoading && activeSection === "table" ? (
            <SeasonStandings
              clubs={activeClubs}
              clubsById={clubsById}
              clubsByName={clubsByName}
              fixtures={fixtures ?? []}
              gameweeks={sortedGameweeks}
              tableMode={tableMode}
              setTableMode={setTableMode}
            />
          ) : null}

          {!isLoading && activeSection === "stats" ? (
            <SeasonStats
              clubs={activeClubs}
              playerStatistics={playerStatistics}
            />
          ) : null}

          <SeasonPickerSheet
            onClose={closePicker}
            onCloseEnd={flushCalendarPickerSelection}
            options={pickerOptions}
            visible={!isDesktopWeb && openPicker !== null}
          />
        </>
      )}
    </FantasyScreenFrame>
  );
}
