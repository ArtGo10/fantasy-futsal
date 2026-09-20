import type { FunctionReturnType } from "convex/server";
import { useEffect, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { LoadingBlock } from "../../../components/common/LoadingBlock";
import { useI18n } from "../../../i18n/I18nProvider";
import type { TranslationKey } from "../../../i18n/translations";
import type { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { getLocalizedClubShortName } from "../utils/localizedFantasyData";
import { formatFantasyMoney } from "../utils/money";
import {
  formatPlayerDetailNumber,
  getPlayerMatchStats,
} from "../utils/playerDetails";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { FantasyClubLogo } from "./FantasyPlayerListRow";
import type { PlayerDetail } from "./PlayerDetailSheet";
import type { PlayerProfileMatch } from "./PlayerMatchHistory";

type PlayerProfile = NonNullable<
  FunctionReturnType<typeof api.fantasy.playerProfile>
>;
type ProfileFixture = PlayerProfile["upcomingFixtures"][number];
type MatchStats = ReturnType<typeof getPlayerMatchStats>;
const LANGUAGE_LOCALES = { en: "en-GB", uk: "uk-UA", pl: "pl-PL" };
const HISTORY_COLUMNS: Array<{
  key: keyof MatchStats;
  label: TranslationKey;
  title: TranslationKey;
}> = [
  {
    key: "points",
    label: "team.list.points",
    title: "playerDetails.totalPoints",
  },
  {
    key: "appeared",
    label: "season.stats.appsShort",
    title: "team.pointsLine.appearance",
  },
  {
    key: "goals",
    label: "season.stats.goalsShort",
    title: "players.stats.goals",
  },
  {
    key: "assists",
    label: "season.stats.assistsShort",
    title: "players.stats.assists",
  },
  {
    key: "yellowCards",
    label: "season.stats.yellowCardsShort",
    title: "playerDetails.yellowCards",
  },
  {
    key: "redCards",
    label: "season.stats.redCardsShort",
    title: "playerDetails.redCards",
  },
  {
    key: "ownGoals",
    label: "playerDetails.ownGoalsShort",
    title: "playerDetails.ownGoals",
  },
  {
    key: "penaltiesMissed",
    label: "season.stats.penaltiesMissedShort",
    title: "playerDetails.penaltiesMissed",
  },
  {
    key: "penaltiesSaved",
    label: "season.stats.penaltiesSavedShort",
    title: "playerDetails.penaltiesSaved",
  },
];

function Opponent({ match }: { match: ProfileFixture }) {
  const { t, language } = useI18n();
  return (
    <View style={styles.profileHistoryOpponent}>
      <FantasyClubLogo club={match.opponent} size="sm" />
      <Text numberOfLines={2} style={styles.profileTableText}>
        {getLocalizedClubShortName(
          match.opponent.shortName || match.opponent.name,
          language,
        )}{" "}
        <Text style={styles.profileMutedText}>
          (
          {t(
            match.isHome
              ? "playerDetails.homeShort"
              : "playerDetails.awayShort",
          )}
          )
        </Text>
      </Text>
    </View>
  );
}

function HistoryTable({ matches }: { matches: PlayerProfileMatch[] }) {
  const { t } = useI18n();
  const theme = useFantasySeasonTheme();
  const totals = matches
    .map(getPlayerMatchStats)
    .reduce<MatchStats>((sum, row) => {
      for (const { key } of HISTORY_COLUMNS) sum[key] += row[key];
      return sum;
    }, getPlayerMatchStats(null));
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      style={styles.profileTableScroll}
      contentContainerStyle={styles.profileTableScrollContent}
    >
      <View style={styles.profileHistoryTable}>
        <View style={[styles.profileTableRow, styles.profileTableHeader]}>
          <Text style={[styles.profileTableHeading, styles.profileGwColumn]}>
            {t("team.list.gw")}
          </Text>
          <Text
            style={[styles.profileTableHeading, styles.profileOpponentColumn]}
          >
            {t("team.viewer.opponent")}
          </Text>
          <Text
            style={[styles.profileTableHeading, styles.profileResultColumn]}
          >
            {t("team.viewer.result")}
          </Text>
          {HISTORY_COLUMNS.map((column) => (
            <Text
              key={column.key}
              accessibilityLabel={t(column.title)}
              {...(Platform.OS === "web" ? { title: t(column.title) } : {})}
              style={[styles.profileTableHeading, styles.profileMetricColumn]}
            >
              {t(column.label)}
            </Text>
          ))}
        </View>
        {matches.map((match) => {
          const stats = getPlayerMatchStats(match);
          return (
            <View key={match.id} style={styles.profileTableRow}>
              <Text style={[styles.profileTableText, styles.profileGwColumn]}>
                {match.gameweek?.number ?? "-"}
              </Text>
              <View style={styles.profileOpponentColumn}>
                <Opponent match={match} />
              </View>
              <View style={styles.profileResultColumn}>
                <Text
                  style={[
                    styles.profileResultBadge,
                    match.resultKind === "win"
                      ? styles.playerProfileMatchResultWin
                      : null,
                    match.resultKind === "loss"
                      ? styles.playerProfileMatchResultLoss
                      : null,
                  ]}
                >
                  {match.fixture.homeScore ?? "-"} -{" "}
                  {match.fixture.awayScore ?? "-"}
                </Text>
              </View>
              {HISTORY_COLUMNS.map((column) => (
                <Text
                  key={column.key}
                  style={[
                    styles.profileTableText,
                    styles.profileMetricColumn,
                    column.key === "points"
                      ? [
                          styles.profilePointsText,
                          { color: theme.primaryColor },
                        ]
                      : null,
                  ]}
                >
                  {formatPlayerDetailNumber(stats[column.key])}
                </Text>
              ))}
            </View>
          );
        })}
        <View style={[styles.profileTableRow, styles.profileTableTotals]}>
          <Text style={[styles.profileTableHeading, styles.profileTotalsLabel]}>
            {t("playerDetails.totals")}
          </Text>
          {HISTORY_COLUMNS.map((column) => (
            <Text
              key={column.key}
              style={[
                styles.profileTableText,
                styles.profileMetricColumn,
                styles.profilePointsText,
              ]}
            >
              {formatPlayerDetailNumber(totals[column.key])}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export function PlayerProfileStatistics({
  children,
  player,
  profile,
}: {
  children?: ReactNode;
  player: PlayerDetail | PlayerProfile["player"];
  profile: PlayerProfile | null | undefined;
}) {
  const { t, language } = useI18n();
  const theme = useFantasySeasonTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<"history" | "fixtures">("history");
  useEffect(() => setTab("history"), [player.id]);
  const history = profile?.matchHistory ?? profile?.matches ?? [];
  const recent = history
    .filter((match) => match.fixture.status === "completed")
    .slice()
    .sort((a, b) => b.fixture.scheduledAt - a.fixture.scheduledAt)
    .slice(0, 5)
    .reverse();
  const upcoming = profile?.upcomingFixtures ?? [];
  const gameweekNumber = profile?.player.lastCompletedGameweekNumber;
  const value = (number: number | null | undefined) =>
    profile ? formatPlayerDetailNumber(number) : "-";
  const metrics = [
    {
      key: "price",
      label: t("players.priceLabel"),
      value: formatFantasyMoney(player.price),
    },
    {
      key: "form",
      label: t("team.list.form"),
      value: value(profile?.player.form),
    },
    {
      key: "average",
      label: t("playerDetails.pointsPerMatch"),
      value: value(profile?.player.averagePointsPerGameweek),
    },
    {
      key: "last",
      label:
        gameweekNumber != null
          ? t("playerDetails.gameweekShort").replace(
              "{number}",
              String(gameweekNumber),
            )
          : t("playerDetails.lastGameweekPoints"),
      value: value(profile?.player.lastCompletedGameweekPoints),
    },
    {
      key: "total",
      label: t("playerDetails.totalPoints"),
      value: value(profile?.player.seasonPoints),
    },
  ];
  const formatDate = (match: ProfileFixture, compact = false) => {
    if (match.fixture.status === "postponed")
      return t("playerDetails.postponed");
    if (!match.fixture.scheduledAt) return t("fixtures.dateUnknown");
    return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
      day: "numeric",
      month: "short",
      ...(compact
        ? {}
        : ({ year: "numeric", hour: "2-digit", minute: "2-digit" } as const)),
    }).format(new Date(match.fixture.scheduledAt));
  };
  const miniFixtures = (matches: ProfileFixture[], past: boolean) => (
    <View style={styles.profilePreviewMatches}>
      {matches.map((match) => (
        <View key={match.id} style={styles.profilePreviewMatch}>
          <Text style={styles.profilePreviewGameweek}>
            {t("playerDetails.gameweekShort").replace(
              "{number}",
              String(match.gameweek?.number ?? "-"),
            )}
          </Text>
          <FantasyClubLogo club={match.opponent} size="md" />
          <Text numberOfLines={2} style={styles.profilePreviewOpponent}>
            {getLocalizedClubShortName(
              match.opponent.shortName || match.opponent.name,
              language,
            )}
          </Text>
          <Text style={styles.profileMutedText}>
            (
            {t(
              match.isHome
                ? "playerDetails.homeShort"
                : "playerDetails.awayShort",
            )}
            )
          </Text>
          <Text
            style={[
              styles.profilePreviewValue,
              past
                ? {
                    backgroundColor: theme.softColor,
                    color: theme.primaryColor,
                  }
                : null,
            ]}
          >
            {past
              ? `${formatPlayerDetailNumber((match as PlayerProfileMatch).points)} ${t("team.list.points")}`
              : formatDate(match, true)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.profileStatistics}>
      <View style={styles.profileMetrics}>
        {metrics.map((metric, index) => (
          <View
            key={metric.key}
            style={[
              styles.profileMetric,
              metric.key === "price" && width < 600
                ? styles.profilePriceMetricCompact
                : null,
              index > 0 ? styles.profileMetricDivider : null,
            ]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={styles.profileMetricLabel}
            >
              {metric.label}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[
                styles.profileMetricValue,
                width < 600 ? styles.profileMetricValueCompact : null,
                { color: theme.primaryColor },
              ]}
            >
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
      {children}
      {profile === undefined ? (
        <LoadingBlock />
      ) : profile === null ? (
        <Text style={styles.mutedText}>
          {t("team.viewer.playerUnavailable")}
        </Text>
      ) : (
        <>
          <View
            style={[
              styles.profilePreviews,
              width >= 900 ? styles.profilePreviewsWide : null,
            ]}
          >
            <View style={styles.profilePreviewSection}>
              <Text style={styles.playerDetailSectionTitle}>
                {t("team.list.form")}
              </Text>
              {miniFixtures(recent, true)}
            </View>
            <View
              style={[
                styles.profilePreviewSection,
                width >= 900 ? styles.profilePreviewDivider : null,
              ]}
            >
              <Text style={styles.playerDetailSectionTitle}>
                {t("playerDetails.fixtures")}
              </Text>
              {upcoming.length ? (
                miniFixtures(upcoming.slice(0, 5), false)
              ) : (
                <Text style={styles.mutedText}>
                  {t("playerDetails.noFixtures")}
                </Text>
              )}
            </View>
          </View>
          <View
            accessibilityRole="tablist"
            style={[
              styles.teamViewSwitch,
              styles.profileTabs,
              {
                backgroundColor: theme.softColor,
                borderColor: theme.borderColor,
              },
            ]}
          >
            {(["history", "fixtures"] as const).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                style={[
                  styles.teamViewSwitchButton,
                  tab === key ? { backgroundColor: theme.primaryColor } : null,
                ]}
              >
                <Text
                  style={
                    tab === key
                      ? styles.teamViewSwitchTextActive
                      : [
                          styles.teamViewSwitchText,
                          { color: theme.primaryColor },
                        ]
                  }
                >
                  {t(
                    key === "history"
                      ? "playerDetails.history"
                      : "playerDetails.fixtures",
                  )}
                </Text>
              </Pressable>
            ))}
          </View>
          {tab === "history" ? (
            <View style={styles.profileHistorySection}>
              <Text style={styles.playerDetailSectionTitle}>
                {t("playerDetails.currentSeason")}
              </Text>
              {history.length ? (
                <HistoryTable matches={history} />
              ) : (
                <Text style={styles.mutedText}>
                  {t("team.viewer.noMatches")}
                </Text>
              )}
            </View>
          ) : upcoming.length ? (
            <View style={styles.profileFixtureTable}>
              <View style={[styles.profileTableRow, styles.profileTableHeader]}>
                <Text
                  style={[styles.profileTableHeading, styles.profileDateColumn]}
                >
                  {t("playerDetails.date")}
                </Text>
                <Text
                  style={[styles.profileTableHeading, styles.profileGwColumn]}
                >
                  {t("team.list.gw")}
                </Text>
                <Text
                  style={[
                    styles.profileTableHeading,
                    styles.profileFixtureOpponent,
                  ]}
                >
                  {t("team.viewer.opponent")}
                </Text>
              </View>
              {upcoming.map((match) => (
                <View key={match.id} style={styles.profileTableRow}>
                  <Text
                    style={[styles.profileTableText, styles.profileDateColumn]}
                  >
                    {formatDate(match)}
                  </Text>
                  <Text
                    style={[styles.profileTableText, styles.profileGwColumn]}
                  >
                    {match.gameweek?.number ?? "-"}
                  </Text>
                  <View style={styles.profileFixtureOpponent}>
                    <Opponent match={match} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>
              {t("playerDetails.noFixtures")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
