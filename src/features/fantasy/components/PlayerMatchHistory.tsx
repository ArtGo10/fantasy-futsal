import type { FunctionReturnType } from "convex/server";
import { Fragment } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import type { TranslationKey } from "../../../i18n/translations";
import type { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { getPlayerPhoto } from "../utils/playerStats";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";
import { BottomSheet } from "./BottomSheet";
import { FantasyClubLogo } from "./FantasyPlayerListRow";
import { PlayerAvatar } from "./PlayerAvatar";

type PlayerProfile = NonNullable<
  FunctionReturnType<typeof api.fantasy.playerProfile>
>;
export type PlayerProfileMatch = PlayerProfile["matches"][number];
type PlayerPointLineKind = PlayerProfileMatch["lines"][number]["kind"];

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

function formatMatchScore(match: PlayerProfileMatch, fallback: string) {
  const { awayScore, homeScore } = match.fixture;
  if (homeScore === null || awayScore === null) return fallback;
  return `${homeScore} - ${awayScore}`;
}

export function PlayerMatchBreakdownSheet({
  emptyMessage,
  gameweekNumber,
  match,
  matches,
  onClose,
  onOpenFixture,
  player,
  visible,
}: {
  emptyMessage?: string;
  gameweekNumber?: number | null;
  match?: PlayerProfileMatch | null;
  matches?: PlayerProfileMatch[];
  onClose: () => void;
  onOpenFixture?: (match: PlayerProfileMatch) => void;
  player: {
    displayName: string;
    photoThumbnailUrl?: string | null;
    photoUrl?: string | null;
  } | null;
  visible: boolean;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  if (!player) return null;
  const title = player.displayName;
  const displayedMatches = matches ?? (match ? [match] : []);
  const displayedGameweekNumber =
    gameweekNumber ?? displayedMatches[0]?.gameweek?.number;

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
          <PlayerAvatar
            displayName={title}
            photoUrl={getPlayerPhoto(player)}
            size="lg"
            style={styles.playerMatchBreakdownAvatar}
          />
          <View style={styles.playerMatchBreakdownHeading}>
            <Text style={styles.playerMatchBreakdownTitle}>{title}</Text>
            {displayedGameweekNumber != null ? (
              <Text style={styles.mutedText}>
                {t("team.pointsBreakdownGameweekTitle").replace(
                  "{number}",
                  String(displayedGameweekNumber),
                )}
              </Text>
            ) : null}
          </View>
        </View>

        {displayedMatches.length === 0 ? (
          <Text style={styles.mutedText}>
            {emptyMessage ?? t("team.viewer.noMatches")}
          </Text>
        ) : (
          displayedMatches.map((match) => {
            const homeClub = match.homeClub ?? {
              name: match.fixture.homeClubName,
              logoUrl: null,
              logoThumbnailUrl: null,
              ...(!match.isHome ? match.opponent : null),
            };
            const awayClub = match.awayClub ?? {
              name: match.fixture.awayClubName,
              logoUrl: null,
              logoThumbnailUrl: null,
              ...(match.isHome ? match.opponent : null),
            };

            return (
              <Fragment key={match.id}>
                <View style={styles.playerMatchScoreCard}>
                  <View style={styles.playerMatchClub}>
                    <FantasyClubLogo club={homeClub} size="md" />
                    <Text numberOfLines={2} style={styles.playerMatchClubName}>
                      {match.fixture.homeClubName}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.playerMatchScoreText,
                      { color: fantasyTheme.primaryColor },
                    ]}
                  >
                    {formatMatchScore(match, t("fixtures.dateUnknown"))}
                  </Text>
                  <View style={styles.playerMatchClub}>
                    <FantasyClubLogo club={awayClub} size="md" />
                    <Text numberOfLines={2} style={styles.playerMatchClubName}>
                      {match.fixture.awayClubName}
                    </Text>
                  </View>
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
                  {!match.appeared ? (
                    <Text style={styles.mutedText}>
                      {t("team.viewer.noGameweekMatchDetails")}
                    </Text>
                  ) : match.lines.length === 0 ? (
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
                        <View
                          key={line.kind}
                          style={styles.playerMatchBreakdownRow}
                        >
                          <Text style={styles.playerMatchBreakdownTypeCell}>
                            {t(POINT_LINE_LABEL_KEYS[line.kind])}
                          </Text>
                          <Text style={styles.playerMatchBreakdownValueCell}>
                            {line.count !== null
                              ? formatViewerNumber(line.count)
                              : "-"}
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
                        <Text style={styles.playerMatchBreakdownValueCell}>
                          -
                        </Text>
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

                {onOpenFixture ? (
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
                ) : null}
              </Fragment>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}
