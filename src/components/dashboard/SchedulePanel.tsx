import { Pressable, Text, View } from "react-native";

import { TOURNAMENT_LAST_DAY } from "../../constants";
import { styles } from "../../styles";
import type { MatchView, TeamStatusView } from "../../types";
import { addLocalDays, formatMatchDate, formatMatchTime } from "../../utils/dates";
import { formatMatchScore, getMatchMeta } from "../../utils/matches";
import { LoadingBlock } from "../common/LoadingBlock";

function MatchRow({
  match,
  teamOwnersById,
  teamStatusById,
}: {
  match: MatchView;
  teamOwnersById: Map<string, string>;
  teamStatusById: Map<string, TeamStatusView>;
}) {
  const homeOwnerName = match.homeTeam.id ? teamOwnersById.get(match.homeTeam.id) : undefined;
  const awayOwnerName = match.awayTeam.id ? teamOwnersById.get(match.awayTeam.id) : undefined;
  const homeStatus = match.homeTeam.id ? teamStatusById.get(match.homeTeam.id) : undefined;
  const awayStatus = match.awayTeam.id ? teamStatusById.get(match.awayTeam.id) : undefined;
  const homeTeamStyle = !match.homeTeam.id
    ? styles.matchTeamPending
    : homeStatus?.isEliminated
      ? styles.matchTeamEliminated
      : styles.matchTeamActive;
  const awayTeamStyle = !match.awayTeam.id
    ? styles.matchTeamPending
    : awayStatus?.isEliminated
      ? styles.matchTeamEliminated
      : styles.matchTeamActive;

  return (
    <View style={[styles.matchRow, match.status === "live" ? styles.matchRowLive : null]}>
      <View style={styles.matchTimeColumn}>
        <Text style={styles.matchTime}>{formatMatchTime(match.scheduledAt)}</Text>
        <Text style={styles.matchMeta} numberOfLines={1}>
          {getMatchMeta(match)}
        </Text>
      </View>

      <View style={styles.matchTeamsColumn}>
        <Text style={styles.matchTeams}>
          <Text style={homeTeamStyle}>{match.homeTeam.name}</Text>
          {homeOwnerName ? <Text style={styles.matchTeamOwner}> ({homeOwnerName})</Text> : null}
          {" - "}
          <Text style={awayTeamStyle}>{match.awayTeam.name}</Text>
          {awayOwnerName ? <Text style={styles.matchTeamOwner}> ({awayOwnerName})</Text> : null}
        </Text>
      </View>

      <View style={styles.matchScoreBox}>
        <Text
          style={[
            styles.matchScore,
            match.status === "live" ? styles.matchScoreLive : null,
            match.status === "completed" ? styles.matchScoreCompleted : null,
          ]}
        >
          {formatMatchScore(match)}
        </Text>
      </View>
    </View>
  );
}

export function SchedulePanel({
  canGoToNextScheduleDay,
  canGoToPreviousScheduleDay,
  firstScheduleDay,
  matches,
  onSelectedDayChange,
  selectedScheduleDay,
  selectedScheduleIsToday,
  selectedScheduleMatches,
  teamOwnersById,
  teamStatusById,
}: {
  canGoToNextScheduleDay: boolean;
  canGoToPreviousScheduleDay: boolean;
  firstScheduleDay: number | null;
  matches: MatchView[] | undefined;
  onSelectedDayChange: (updater: (day: number) => number) => void;
  selectedScheduleDay: number;
  selectedScheduleIsToday: boolean;
  selectedScheduleMatches: MatchView[];
  teamOwnersById: Map<string, string>;
  teamStatusById: Map<string, TeamStatusView>;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Все матчи</Text>

      <View style={styles.scheduleSliderHeader}>
        <Pressable
          style={[
            styles.pointsSliderButton,
            !canGoToPreviousScheduleDay ? styles.pointsSliderButtonDisabled : null,
          ]}
          disabled={!canGoToPreviousScheduleDay}
          onPress={() =>
            onSelectedDayChange((day) => {
              const previousDay = addLocalDays(day, -1);
              return firstScheduleDay === null ? previousDay : Math.max(previousDay, firstScheduleDay);
            })
          }
        >
          <Text style={styles.pointsSliderButtonText}>‹</Text>
        </Pressable>

        <View style={styles.scheduleSliderDate}>
          <Text style={styles.scheduleSliderTitle}>
            {selectedScheduleIsToday ? "Сегодня" : formatMatchDate(selectedScheduleDay)}
          </Text>
          {selectedScheduleIsToday ? (
            <Text style={styles.scheduleSliderMeta}>{formatMatchDate(selectedScheduleDay)}</Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.pointsSliderButton, !canGoToNextScheduleDay ? styles.pointsSliderButtonDisabled : null]}
          disabled={!canGoToNextScheduleDay}
          onPress={() => onSelectedDayChange((day) => Math.min(addLocalDays(day, 1), TOURNAMENT_LAST_DAY))}
        >
          <Text style={styles.pointsSliderButtonText}>›</Text>
        </Pressable>
      </View>

      {matches === undefined ? (
        <LoadingBlock text="Загружаем матчи..." />
      ) : matches.length === 0 ? (
        <Text style={styles.mutedText}>Расписание матчей ещё не загружено.</Text>
      ) : selectedScheduleMatches.length === 0 ? (
        <Text style={styles.mutedText}>На этот день матчей нет.</Text>
      ) : (
        <View style={styles.matchList}>
          {selectedScheduleMatches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              teamOwnersById={teamOwnersById}
              teamStatusById={teamStatusById}
            />
          ))}
        </View>
      )}
    </View>
  );
}
