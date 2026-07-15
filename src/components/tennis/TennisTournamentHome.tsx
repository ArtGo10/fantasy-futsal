import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { api } from "../../../convex/_generated/api";
import { TENNIS_POTS } from "../../constants";
import { useDrawUnlockTicker } from "../../hooks/useDrawUnlockTicker";
import { styles } from "../../styles";
import type {
  TennisAssignmentView,
  TennisCompetitorView,
  TennisDashboardTab,
  TennisMatchView,
  TennisOverviewView,
  TennisParticipantView,
  TennisPot,
  TennisPotView,
  TennisStage,
  TennisTournamentSlug,
} from "../../types";
import { getErrorMessage } from "../../utils/auth";
import { formatDrawCountdown, formatDrawUnlockTime } from "../../utils/dates";
import { formatParticipantName } from "../../utils/names";
import { areAllScheduledMatchesCompleted, getPrizePlaceByIndex, type PrizePlace } from "../../utils/standings";
import { LoadingBlock } from "../common/LoadingBlock";
import { TabBar } from "../dashboard/TabBar";

const STAGE_LABELS: Record<TennisStage, string> = {
  round_of_128: "1/64",
  round_of_64: "1/32",
  round_of_32: "1/16",
  round_of_16: "1/8",
  quarter_final: "1/4",
  semi_final: "1/2",
  final: "Финал",
  champion: "Чемпион",
};
const BRACKET_ROUNDS = [
  { order: 1, title: "1/64" },
  { order: 2, title: "1/32" },
  { order: 3, title: "1/16" },
  { order: 4, title: "1/8" },
  { order: 5, title: "1/4" },
  { order: 6, title: "1/2" },
  { order: 7, title: "Финал" },
] as const;
const BRACKET_CARD_HEIGHT = 72;
const BRACKET_ROW_STEP = 82;
const BRACKET_FIRST_ROUND_MATCHES = 64;
const BRACKET_MATCHES_HEIGHT = (BRACKET_FIRST_ROUND_MATCHES - 1) * BRACKET_ROW_STEP + BRACKET_CARD_HEIGHT;
const SURNAME_PARTICLES = new Set([
  "da",
  "de",
  "del",
  "della",
  "der",
  "di",
  "dos",
  "du",
  "la",
  "le",
  "van",
  "von",
  "да",
  "де",
  "дель",
  "дер",
  "ди",
  "дос",
  "дю",
  "ла",
  "ле",
  "ван",
  "фон",
]);

type BracketMatch = {
  match: TennisMatchView;
  position: number;
};
type BracketRound = {
  order: number;
  title: string;
  matches: BracketMatch[];
};
type BracketPlayerInfo = {
  competitorId: string | null;
  country: string | null;
  flagUrl: string | null;
  name: string;
};

const NEUTRAL_FLAG_COUNTRIES = new Set(["belarus", "russia", "russian federation"]);

function isKnownPlayerName(name: string) {
  const normalized = name.trim().toLowerCase();

  return Boolean(normalized && normalized !== "tbd");
}

function getPlayerSurname(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!isKnownPlayerName(normalized)) return "";

  const beforeComma = normalized.split(",")[0]?.trim() ?? normalized;
  const parts = beforeComma.split(" ").filter(Boolean);
  if (parts.length <= 1) return beforeComma;

  let surnameStart = parts.length - 1;
  while (surnameStart > 0 && SURNAME_PARTICLES.has(parts[surnameStart - 1].toLowerCase())) {
    surnameStart -= 1;
  }

  return parts.slice(surnameStart).join(" ");
}

function getPlayerSurnameWithInitial(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!isKnownPlayerName(normalized)) return "";

  const beforeComma = normalized.split(",")[0]?.trim() ?? normalized;
  const parts = beforeComma.split(" ").filter(Boolean);
  if (parts.length <= 1) return beforeComma;

  const surname = getPlayerSurname(beforeComma);
  const firstName = parts[0] ?? "";
  const [initial] = Array.from(firstName);

  return initial ? `${surname} ${initial}.` : surname;
}

function getMatchWinnerName(match: TennisMatchView) {
  if (!match.winnerCompetitorId) return null;
  if (match.player1CompetitorId === match.winnerCompetitorId) return match.player1Name;
  if (match.player2CompetitorId === match.winnerCompetitorId) return match.player2Name;

  return null;
}

function shouldUseNeutralFlag(country: string | null | undefined) {
  return country ? NEUTRAL_FLAG_COUNTRIES.has(country.trim().toLowerCase()) : false;
}

function TennisFlag({
  country,
  flagUrl,
}: {
  country: string | null | undefined;
  flagUrl: string | null | undefined;
}) {
  if (shouldUseNeutralFlag(country)) {
    return <View style={styles.tennisNeutralFlagIcon} />;
  }

  if (!flagUrl) return null;

  return <Image source={{ uri: flagUrl }} style={styles.tennisFlagIcon} resizeMode="cover" />;
}

function getBracketTopOffset(roundIndex: number) {
  return roundIndex === 0 ? 0 : (2 ** roundIndex - 1) * (BRACKET_ROW_STEP / 2);
}

function getBracketMatchTop(roundIndex: number, position: number) {
  return getBracketTopOffset(roundIndex) + position * (2 ** roundIndex) * BRACKET_ROW_STEP;
}

function getBracketMatchMarginTop(roundIndex: number, matches: BracketMatch[], matchIndex: number) {
  const matchTop = getBracketMatchTop(roundIndex, matches[matchIndex].position);

  if (matchIndex === 0) return matchTop;

  const previousMatchTop = getBracketMatchTop(roundIndex, matches[matchIndex - 1].position);

  return Math.max(0, matchTop - previousMatchTop - BRACKET_CARD_HEIGHT);
}

function getBracketRoundMatchCount(roundIndex: number) {
  return Math.max(1, BRACKET_FIRST_ROUND_MATCHES / 2 ** roundIndex);
}

function compareTennisMatches(first: TennisMatchView, second: TennisMatchView) {
  return (
    (first.bracketOrder ?? 9999) - (second.bracketOrder ?? 9999) ||
    first.scheduledAt - second.scheduledAt ||
    first.espnCompetitionId.localeCompare(second.espnCompetitionId)
  );
}

function inferBracketPosition(match: TennisMatchView, previousRoundMatches: BracketMatch[] | undefined) {
  if (!previousRoundMatches) return null;

  const inferredPositions = new Set<number>();

  for (const competitorId of [match.player1CompetitorId, match.player2CompetitorId]) {
    if (!competitorId) continue;

    const sourceMatch = previousRoundMatches.find(
      (candidate) => candidate.match.winnerCompetitorId === competitorId,
    );

    if (sourceMatch) {
      inferredPositions.add(Math.floor(sourceMatch.position / 2));
    }
  }

  return inferredPositions.size === 1 ? [...inferredPositions][0] : null;
}

function getTennisMatchKnownPlayerCount(match: TennisMatchView) {
  return Number(Boolean(match.player1CompetitorId)) + Number(Boolean(match.player2CompetitorId));
}

function getBracketMatchPriority(bracketMatch: BracketMatch) {
  const match = bracketMatch.match;

  return (
    getTennisMatchKnownPlayerCount(match) * 10 +
    Number(Boolean(match.winnerCompetitorId)) * 5 +
    Number(match.status === "live") * 3 +
    Number(match.status === "completed") * 4
  );
}

function shouldPreferBracketMatch(candidate: BracketMatch, current: BracketMatch) {
  const priorityDelta = getBracketMatchPriority(candidate) - getBracketMatchPriority(current);

  if (priorityDelta !== 0) return priorityDelta > 0;

  return compareTennisMatches(candidate.match, current.match) < 0;
}

function dedupeBracketMatchesByPosition(matches: BracketMatch[]) {
  const matchByPosition = new Map<number, BracketMatch>();

  for (const match of matches) {
    const currentMatch = matchByPosition.get(match.position);

    if (!currentMatch || shouldPreferBracketMatch(match, currentMatch)) {
      matchByPosition.set(match.position, match);
    }
  }

  return [...matchByPosition.values()];
}

function createPlaceholderBracketMatch(roundOrder: number, title: string, position: number): BracketMatch {
  return {
    position,
    match: {
      id: `placeholder-${roundOrder}-${position}`,
      espnCompetitionId: `placeholder-${roundOrder}-${position}`,
      roundName: title,
      roundOrder,
      bracketOrder: position,
      scheduledAt: 0,
      court: null,
      player1CompetitorId: null,
      player2CompetitorId: null,
      player1Name: "TBD",
      player2Name: "TBD",
      player1SetScores: [],
      player2SetScores: [],
      winnerCompetitorId: null,
      status: "scheduled",
      note: null,
    },
  };
}

function fillBracketRoundSlots(
  matches: BracketMatch[],
  round: (typeof BRACKET_ROUNDS)[number],
  roundIndex: number,
) {
  const matchCount = getBracketRoundMatchCount(roundIndex);
  const matchByPosition = new Map(matches.map((match) => [match.position, match]));
  const filledMatches: BracketMatch[] = [];

  for (let position = 0; position < matchCount; position += 1) {
    filledMatches.push(matchByPosition.get(position) ?? createPlaceholderBracketMatch(round.order, round.title, position));
  }

  const extraMatches = matches.filter((match) => match.position < 0 || match.position >= matchCount);

  return [...filledMatches, ...extraMatches].sort(
    (first, second) => first.position - second.position || compareTennisMatches(first.match, second.match),
  );
}

function buildBracketRounds(matches: TennisMatchView[]) {
  if (matches.length === 0) return [];

  const grouped = new Map<number, TennisMatchView[]>();
  const roundsByOrder = new Map<number, BracketMatch[]>();
  const rounds: BracketRound[] = [];

  for (const match of matches) {
    const roundMatches = grouped.get(match.roundOrder) ?? [];
    roundMatches.push(match);
    grouped.set(match.roundOrder, roundMatches);
  }

  for (const [roundIndex, round] of BRACKET_ROUNDS.entries()) {
    const previousRoundMatches = roundsByOrder.get(round.order - 1);
    const roundMatches = [...(grouped.get(round.order) ?? [])].sort(compareTennisMatches);
    const bracketMatches = roundMatches
      .map((match, index) => ({
        match,
        position: inferBracketPosition(match, previousRoundMatches) ?? match.bracketOrder ?? index,
      }));
    const visibleBracketMatches = dedupeBracketMatchesByPosition(bracketMatches)
      .sort((first, second) => first.position - second.position || compareTennisMatches(first.match, second.match));
    const completeBracketMatches = fillBracketRoundSlots(visibleBracketMatches, round, roundIndex);

    roundsByOrder.set(round.order, completeBracketMatches);
    rounds.push({
      order: round.order,
      title: round.title,
      matches: completeBracketMatches,
    });
  }

  return rounds;
}

function getBracketPlayerName({
  bracketMatch,
  competitorById,
  side,
  roundsByOrder,
}: {
  bracketMatch: BracketMatch;
  competitorById: Map<string, TennisCompetitorView>;
  side: 0 | 1;
  roundsByOrder: Map<number, BracketMatch[]>;
}): BracketPlayerInfo {
  const match = bracketMatch.match;
  const playerName = side === 0 ? match.player1Name : match.player2Name;
  const competitorId = side === 0 ? match.player1CompetitorId : match.player2CompetitorId;
  const competitor = competitorId ? competitorById.get(competitorId) : null;
  const displayName = isKnownPlayerName(playerName) ? competitor?.name ?? playerName : "";

  if (isKnownPlayerName(displayName)) {
    return {
      competitorId,
      country: competitor?.country ?? null,
      flagUrl: competitor?.flagUrl ?? null,
      name: getPlayerSurname(displayName),
    };
  }

  const previousRound = roundsByOrder.get(match.roundOrder - 1);
  const sourceMatch = previousRound?.find((candidate) => candidate.position === bracketMatch.position * 2 + side);
  const winnerCompetitorId = sourceMatch?.match.winnerCompetitorId ?? null;
  const winnerCompetitor = winnerCompetitorId ? competitorById.get(winnerCompetitorId) : null;
  const winnerName = winnerCompetitorId && sourceMatch
    ? winnerCompetitor?.name ?? getMatchWinnerName(sourceMatch.match)
    : sourceMatch
      ? getMatchWinnerName(sourceMatch.match)
      : null;

  if (winnerName && isKnownPlayerName(winnerName)) {
    return {
      competitorId: winnerCompetitorId,
      country: winnerCompetitor?.country ?? null,
      flagUrl: winnerCompetitor?.flagUrl ?? null,
      name: getPlayerSurname(winnerName),
    };
  }

  return {
    competitorId: null,
    country: null,
    flagUrl: null,
    name: "",
  };
}

function getBracketPlayerLabel(player: BracketPlayerInfo, ownerByCompetitorId: Map<string, string>) {
  if (!player.name) return "";

  const ownerName = player.competitorId ? ownerByCompetitorId.get(player.competitorId) : undefined;

  return ownerName ? `${player.name} (${ownerName})` : player.name;
}

function TennisBracketPlayer({
  country,
  flagUrl,
  isEliminated,
  name,
  isWinner,
  isPending,
}: {
  country: string | null;
  flagUrl: string | null;
  isEliminated: boolean;
  name: string;
  isWinner: boolean;
  isPending: boolean;
}) {
  return (
    <View style={styles.bracketPlayerRow}>
      <TennisFlag country={country} flagUrl={flagUrl} />
      <Text
        style={[
          styles.bracketPlayerName,
          isWinner ? styles.bracketPlayerWinner : null,
          isEliminated ? styles.bracketPlayerEliminated : null,
          isPending ? styles.bracketPlayerPending : null,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

function TennisBracketMatchCard({
  bracketMatch,
  competitorById,
  isFinalRound,
  ownerByCompetitorId,
  roundsByOrder,
  style,
}: {
  bracketMatch: BracketMatch;
  competitorById: Map<string, TennisCompetitorView>;
  isFinalRound: boolean;
  ownerByCompetitorId: Map<string, string>;
  roundsByOrder: Map<number, BracketMatch[]>;
  style?: StyleProp<ViewStyle>;
}) {
  const match = bracketMatch.match;
  const player1 = getBracketPlayerName({ bracketMatch, competitorById, side: 0, roundsByOrder });
  const player2 = getBracketPlayerName({ bracketMatch, competitorById, side: 1, roundsByOrder });
  const player1IsWinner = Boolean(match.winnerCompetitorId && match.player1CompetitorId === match.winnerCompetitorId);
  const player2IsWinner = Boolean(match.winnerCompetitorId && match.player2CompetitorId === match.winnerCompetitorId);
  const player1IsEliminated = Boolean(
    match.status === "completed" &&
      match.winnerCompetitorId &&
      match.player1CompetitorId &&
      match.player1CompetitorId !== match.winnerCompetitorId,
  );
  const player2IsEliminated = Boolean(
    match.status === "completed" &&
      match.winnerCompetitorId &&
      match.player2CompetitorId &&
      match.player2CompetitorId !== match.winnerCompetitorId,
  );

  return (
    <View style={[styles.bracketMatchWrap, style]}>
      <View style={[styles.bracketMatchCard, match.status === "live" ? styles.bracketMatchCardLive : null]}>
        <TennisBracketPlayer
          country={player1.country}
          flagUrl={player1.flagUrl}
          name={getBracketPlayerLabel(player1, ownerByCompetitorId)}
          isEliminated={player1IsEliminated}
          isWinner={player1IsWinner}
          isPending={!player1.name}
        />
        <TennisBracketPlayer
          country={player2.country}
          flagUrl={player2.flagUrl}
          name={getBracketPlayerLabel(player2, ownerByCompetitorId)}
          isEliminated={player2IsEliminated}
          isWinner={player2IsWinner}
          isPending={!player2.name}
        />
      </View>

      {!isFinalRound ? <View style={styles.bracketConnectorLine} /> : null}
    </View>
  );
}

function TennisBracket({
  competitors,
  matches,
  participants,
}: {
  competitors: TennisOverviewView["competitors"];
  matches: TennisMatchView[];
  participants: TennisParticipantView[];
}) {
  const rounds = useMemo(() => buildBracketRounds(matches), [matches]);
  const roundsByOrder = useMemo(
    () => new Map(rounds.map((round) => [round.order, round.matches])),
    [rounds],
  );
  const competitorById = useMemo(
    () => new Map(competitors.map((competitor) => [competitor.id, competitor])),
    [competitors],
  );
  const ownerByCompetitorId = useMemo(() => {
    const owners = new Map<string, string>();

    for (const participant of participants) {
      const ownerName = formatParticipantName(participant.name);
      if (!ownerName) continue;

      for (const assignment of participant.assignments) {
        owners.set(assignment.competitorId, ownerName);
      }
    }

    return owners;
  }, [participants]);

  if (rounds.length === 0) {
    return <Text style={styles.mutedText}>Сетка ещё не загружена.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.bracketScrollContent}>
      <View style={styles.bracketBoard}>
        {rounds.map((round, roundIndex) => (
          <View key={round.order} style={styles.bracketRoundColumn}>
            <Text style={styles.bracketRoundTitle}>{round.title}</Text>
            <View
              style={[
                styles.bracketRoundMatches,
                {
                  minHeight: BRACKET_MATCHES_HEIGHT,
                },
              ]}
            >
              {round.matches.map((bracketMatch, matchIndex) => (
                <TennisBracketMatchCard
                  key={bracketMatch.match.id}
                  bracketMatch={bracketMatch}
                  competitorById={competitorById}
                  isFinalRound={roundIndex === rounds.length - 1}
                  ownerByCompetitorId={ownerByCompetitorId}
                  roundsByOrder={roundsByOrder}
                  style={{
                    marginTop: getBracketMatchMarginTop(roundIndex, round.matches, matchIndex),
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function getTennisParticipantTotalPoints(participant: TennisParticipantView) {
  return participant.assignments.reduce((total, assignment) => total + assignment.points, 0);
}

function getPrizeCellStyle(prizePlace: PrizePlace | null) {
  if (prizePlace === "gold") return styles.playerTablePrizeGoldCell;
  if (prizePlace === "silver") return styles.playerTablePrizeSilverCell;
  if (prizePlace === "bronze") return styles.playerTablePrizeBronzeCell;

  return null;
}

function TennisAssignmentCells({
  assignments,
  prizePlace,
  tournamentIsComplete,
}: {
  assignments: TennisAssignmentView[];
  prizePlace: PrizePlace | null;
  tournamentIsComplete: boolean;
}) {
  return (
    <>
      {TENNIS_POTS.map((pot) => {
        const assignment = assignments.find((item) => item.pot === pot);
        const prizeCellStyle = getPrizeCellStyle(prizePlace);

        return (
          <View
            key={pot}
            style={[
              styles.playerTableCell,
              styles.playerTableTeamCell,
              styles.tennisPlayerTableTeamCell,
              styles.playerTableDataCell,
              !assignment ? styles.playerTableCellEmpty : null,
              tournamentIsComplete
                ? prizeCellStyle
                : assignment
                  ? assignment.isEliminated
                    ? styles.playerTableTeamCellEliminated
                    : styles.playerTableTeamCellActive
                  : null,
            ]}
          >
            {assignment ? (
              <View style={[styles.assignmentCellContent, styles.tennisAssignmentCellContent]}>
                <View style={styles.assignmentInfo}>
                  <View style={styles.tennisNameWithFlag}>
                    <TennisFlag country={assignment.competitorCountry} flagUrl={assignment.competitorFlagUrl} />
                    <Text
                      style={[
                        styles.assignmentText,
                        !tournamentIsComplete && assignment.isEliminated ? styles.assignmentTextEliminated : null,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getPlayerSurnameWithInitial(assignment.competitorName)}
                    </Text>
                  </View>
                  <Text style={styles.pointsDetailsText}>{STAGE_LABELS[assignment.stageReached]}</Text>
                  <Text style={styles.assignmentPoints}>{assignment.points}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyCellText}>-</Text>
            )}
          </View>
        );
      })}
    </>
  );
}

function TennisParticipantsTable({
  participants,
  tournamentIsComplete,
}: {
  participants: TennisParticipantView[];
  tournamentIsComplete: boolean;
}) {
  if (participants.length === 0) {
    return <Text style={styles.mutedText}>Пока никто не вошёл в этот Wimbledon-турнир.</Text>;
  }

  const sortedParticipants = [...participants].sort((first, second) => {
    const pointsDiff = getTennisParticipantTotalPoints(second) - getTennisParticipantTotalPoints(first);
    if (pointsDiff !== 0) return pointsDiff;

    return first.participantNumber - second.participantNumber;
  });
  const getParticipantStatusCellStyle = (participant: TennisParticipantView, prizePlace: PrizePlace | null) => {
    if (tournamentIsComplete) return getPrizeCellStyle(prizePlace);

    const hasAssignments = participant.assignments.length > 0;
    if (!hasAssignments) return null;

    return participant.assignments.some((assignment) => !assignment.isEliminated)
      ? styles.playerTableStatusCellActive
      : styles.playerTableStatusCellEliminated;
  };

  return (
    <View style={styles.playerTable}>
        <View style={styles.playerTableFrozenLayout}>
          <View style={styles.playerTablePinnedColumn}>
            <View
              style={[
                styles.playerTableRow,
                styles.playerTableHeaderRow,
                styles.playerTableHeaderFixedRow,
            ]}
          >
              <View
                style={[
                  styles.playerTableCell,
                  styles.playerTableNameCell,
                  styles.playerTablePinnedNameCell,
                  styles.playerTableHeaderCell,
                ]}
              >
                <Text style={styles.playerTableHeaderText}>Игрок</Text>
              </View>
          </View>

          {sortedParticipants.map((participant, participantIndex) => {
            const prizePlace = tournamentIsComplete ? getPrizePlaceByIndex(participantIndex) : null;

            return (
            <View
              key={participant.id}
              style={[styles.playerTableRow, styles.playerTableDataRow, styles.tennisPlayerTableDataRow]}
            >
              <View
                style={[
                  styles.playerTableCell,
                  styles.playerTableNameCell,
                  styles.playerTablePinnedNameCell,
                  styles.playerTableDataCell,
                  getParticipantStatusCellStyle(participant, prizePlace),
                ]}
              >
                <Text style={styles.playerName} numberOfLines={2}>
                  {formatParticipantName(participant.name)}
                </Text>
                <Text style={styles.pointsDetailsText}>#{participant.participantNumber}</Text>
              </View>
            </View>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.playerTableScrollableColumn}
          contentContainerStyle={styles.playerTableScrollableContent}
        >
          <View style={styles.playerTableScrollableRows}>
            <View style={[styles.playerTableRow, styles.playerTableHeaderRow, styles.playerTableHeaderFixedRow]}>
              {TENNIS_POTS.map((pot) => (
                <View
                  key={pot}
                  style={[
                    styles.playerTableCell,
                    styles.playerTableTeamCell,
                    styles.tennisPlayerTableTeamCell,
                    styles.playerTableHeaderCell,
                  ]}
                >
                  <Text style={styles.playerTableHeaderText}>Игрок</Text>
                </View>
              ))}
            </View>

            {sortedParticipants.map((participant, participantIndex) => (
              <View
                key={participant.id}
                style={[styles.playerTableRow, styles.playerTableDataRow, styles.tennisPlayerTableDataRow]}
              >
                <TennisAssignmentCells
                  assignments={participant.assignments}
                  prizePlace={tournamentIsComplete ? getPrizePlaceByIndex(participantIndex) : null}
                  tournamentIsComplete={tournamentIsComplete}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.playerTablePinnedColumn}>
          <View
            style={[
              styles.playerTableRow,
              styles.playerTableHeaderRow,
              styles.playerTableHeaderFixedRow,
            ]}
          >
            <View
              style={[
                styles.playerTableCell,
                styles.playerTableTotalCell,
                styles.playerTablePinnedTotalCell,
                styles.playerTableHeaderCell,
              ]}
            >
              <Text style={styles.playerTableHeaderText}>Итого</Text>
            </View>
          </View>

          {sortedParticipants.map((participant, participantIndex) => {
            const prizePlace = tournamentIsComplete ? getPrizePlaceByIndex(participantIndex) : null;

            return (
            <View
              key={participant.id}
              style={[styles.playerTableRow, styles.playerTableDataRow, styles.tennisPlayerTableDataRow]}
            >
              <View
                style={[
                  styles.playerTableCell,
                  styles.playerTableTotalCell,
                  styles.playerTablePinnedTotalCell,
                  styles.playerTableDataCell,
                  getParticipantStatusCellStyle(participant, prizePlace),
                ]}
              >
                <Text style={styles.playerTotalPoints}>{getTennisParticipantTotalPoints(participant)}</Text>
              </View>
            </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TennisDrawPanel({
  currentAssignments,
  drawIsLocked,
  drawCountdownText,
  isBusy,
  isFull,
  isViewer,
  onDraw,
  pots,
  ready,
}: {
  currentAssignments: TennisAssignmentView[];
  drawIsLocked: boolean;
  drawCountdownText: string;
  isBusy: boolean;
  isFull: boolean;
  isViewer: boolean;
  onDraw: (pot: TennisPot) => void;
  pots: TennisPotView[];
  ready: boolean;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Жеребьёвка</Text>
        <Text style={styles.mutedText}>{currentAssignments.length}/{TENNIS_POTS.length}</Text>
      </View>

      {isViewer && isFull ? (
        <Text style={styles.mutedText}>Все 16 мест уже заняты. Можно смотреть таблицу и результаты как зритель.</Text>
      ) : null}

      <View style={styles.teamColumns}>
        {pots.map((pot) => {
          const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot.pot);
          const canDraw =
            ready &&
            !drawIsLocked &&
            !alreadyDrawn &&
            !isViewer &&
            !isBusy &&
            pot.remaining > 0;

          return (
            <View key={pot.pot} style={styles.teamColumn}>
              <View style={styles.teamColumnHeader}>
                <Text style={styles.label}>Корзина {pot.pot}</Text>
                <Text style={styles.potCount}>
                  {pot.remaining}/{pot.total}
                </Text>
              </View>

              <View style={styles.teamList}>
                {pot.competitors.map((competitor) => (
                  <View
                    key={competitor.id}
                    style={[
                      styles.teamRow,
                      competitor.isEliminated ? styles.teamRowEliminated : styles.teamRowActive,
                      competitor.assignedTo ? styles.teamRowAssigned : null,
                    ]}
                  >
                    <View style={styles.tennisNameWithFlag}>
                      <TennisFlag country={competitor.country} flagUrl={competitor.flagUrl} />
                      <Text
                        style={[
                          competitor.assignedTo ? styles.teamNameAssigned : styles.teamName,
                          competitor.isEliminated ? styles.teamNameEliminated : styles.teamNameActive,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {getPlayerSurnameWithInitial(competitor.name)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.primaryButton, !canDraw ? styles.buttonDisabled : null]}
                disabled={!canDraw}
                onPress={() => onDraw(pot.pot)}
              >
                <Text style={styles.primaryButtonText}>
                  {alreadyDrawn
                    ? "Выбрано"
                    : !ready
                      ? "Не готово"
                      : drawIsLocked
                        ? drawCountdownText
                        : isBusy
                          ? "Выбираем..."
                          : pot.remaining === 0
                            ? "Пусто"
                            : "Вытащить"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function TennisTournamentHome({ slug }: { slug: TennisTournamentSlug }) {
  const overview = useQuery(api.tennis.getOverview, { slug }) as TennisOverviewView | undefined;
  const seedFromEspn = useAction(api.tennis.seedFromEspn);
  const syncFromEspn = useAction(api.tennis.syncFromEspn);
  const drawCompetitor = useMutation(api.tennis.drawCompetitor);
  const rebuildPots = useMutation(api.tennis.rebuildPots);
  const setDrawLock = useMutation(api.tennis.setDrawLock);

  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [adminStatusText, setAdminStatusText] = useState<string | null>(null);
  const [adminErrorText, setAdminErrorText] = useState<string | null>(null);
  const [activeTennisTab, setActiveTennisTab] = useState<TennisDashboardTab>("table");

  const currentAssignments = overview?.currentUser?.assignments ?? [];
  const canAdminSync = Boolean(overview?.currentUser?.isAdmin);
  const drawUnlockAt = overview?.tournament.drawUnlockAt ?? null;
  const nowMs = useDrawUnlockTicker(drawUnlockAt);
  const serverDrawIsLocked = overview?.tournament.drawLocked ?? true;
  const drawIsLocked = drawUnlockAt !== null ? nowMs < drawUnlockAt : serverDrawIsLocked;
  const drawCountdownText = drawUnlockAt && drawIsLocked ? formatDrawCountdown(drawUnlockAt, nowMs) : "Пауза";
  const drawLockText = drawUnlockAt
    ? `Жеребьёвка откроется ${formatDrawUnlockTime(drawUnlockAt)}.`
    : "Жеребьёвка временно закрыта.";
  const isViewer = Boolean(overview?.currentUser && !overview.currentUser.isParticipant && overview.isFull);
  const tennisTabs = useMemo<Array<{ id: TennisDashboardTab; label: string }>>(
    () => [
      ...(canAdminSync ? [{ id: "admin" as const, label: "Админ" }] : []),
      { id: "table" as const, label: "Таблица" },
      { id: "points" as const, label: "Очки" },
      { id: "results" as const, label: "Результаты" },
    ],
    [canAdminSync],
  );

  useEffect(() => {
    if (activeTennisTab === "admin" && !canAdminSync) {
      setActiveTennisTab("table");
    }
  }, [activeTennisTab, canAdminSync]);

  const handleEspnSync = async (mode: "seed" | "sync") => {
    try {
      setIsBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      await (mode === "seed" ? seedFromEspn : syncFromEspn)({ slug });
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRebuildPots = async () => {
    try {
      setIsBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      const result = await rebuildPots({ slug });
      setAdminStatusText(`Корзины пересчитаны по рейтингу. Обновлено: ${result.updatedPots}.`);
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDrawLock = async (locked: boolean) => {
    try {
      setIsBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      await setDrawLock({ slug, locked });
      setAdminStatusText(locked ? "Жеребьёвка закрыта." : "Жеребьёвка открыта.");
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDrawCompetitor = async (pot: TennisPot) => {
    if (drawIsLocked) {
      setErrorText(drawLockText);
      return;
    }

    if (!overview?.competitorsReady) {
      setErrorText("Корзины ещё не готовы: нужно по 16 теннисистов в каждой из 8 корзин.");
      return;
    }

    const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot);
    if (alreadyDrawn || isBusy) return;

    try {
      setIsBusy(true);
      setStatusText(null);
      setErrorText(null);
      await drawCompetitor({ slug, pot });
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  if (overview === undefined) {
    return <LoadingBlock text="Готовим Wimbledon..." />;
  }

  const assignedCompetitorCount = overview.competitorsByPot.reduce((total, pot) => total + pot.assigned, 0);
  const expectedAssignmentCount = overview.maxParticipants * TENNIS_POTS.length;
  const drawIsComplete = expectedAssignmentCount > 0 && assignedCompetitorCount >= expectedAssignmentCount;
  const tournamentIsComplete = areAllScheduledMatchesCompleted(overview.matches);

  return (
    <>
      <TabBar activeTab={activeTennisTab} tabs={tennisTabs} onChange={setActiveTennisTab} />

      {activeTennisTab === "admin" && canAdminSync ? (
        <View style={[styles.panel, styles.adminPanel]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Админ-панель</Text>
            <Text style={styles.adminBadge}>ESPN</Text>
          </View>

          <View style={styles.segment}>
            <Pressable
              style={[styles.secondaryButton, styles.summaryItem, isBusy ? styles.buttonDisabled : null]}
              disabled={isBusy}
              onPress={() => void handleEspnSync("seed")}
            >
              <Text style={styles.secondaryButtonText}>
                {overview.seeded ? "Перезагрузить ESPN" : "Загрузить ESPN"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.summaryItem, isBusy ? styles.buttonDisabled : null]}
              disabled={isBusy || !overview.seeded}
              onPress={() => void handleEspnSync("sync")}
            >
              <Text style={styles.primaryButtonText}>Обновить результаты</Text>
            </Pressable>
          </View>

          <View style={styles.segment}>
            <Pressable
              style={[styles.secondaryButton, styles.summaryItem, isBusy || !overview.seeded ? styles.buttonDisabled : null]}
              disabled={isBusy || !overview.seeded}
              onPress={() => void handleRebuildPots()}
            >
              <Text style={styles.secondaryButtonText}>Пересчитать корзины</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                styles.summaryItem,
                isBusy || (!overview.competitorsReady && drawIsLocked) ? styles.buttonDisabled : null,
              ]}
              disabled={isBusy || (!overview.competitorsReady && drawIsLocked)}
              onPress={() => void handleDrawLock(!drawIsLocked)}
            >
              <Text style={styles.primaryButtonText}>
                {drawIsLocked ? "Открыть жеребьёвку" : "Закрыть жеребьёвку"}
              </Text>
            </Pressable>
          </View>

          {adminStatusText ? <Text style={styles.successText}>{adminStatusText}</Text> : null}
          {adminErrorText ? <Text style={styles.errorText}>{adminErrorText}</Text> : null}
        </View>
      ) : null}

      {activeTennisTab === "table" ? (
        <>
          {overview.participants.length > 0 ? (
            <View style={styles.panel}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Таблица игроков</Text>
                <Text style={styles.mutedText}>{overview.participantCount}/{overview.maxParticipants}</Text>
              </View>

              {statusText ? <Text style={styles.successText}>{statusText}</Text> : null}
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

              <TennisParticipantsTable
                participants={overview.participants}
                tournamentIsComplete={tournamentIsComplete}
              />
            </View>
          ) : null}

          {overview.seeded && !drawIsComplete ? (
            <TennisDrawPanel
              currentAssignments={currentAssignments}
              drawCountdownText={drawCountdownText}
              drawIsLocked={drawIsLocked}
              isBusy={isBusy}
              isFull={overview.isFull}
              isViewer={isViewer}
              onDraw={(pot) => void handleDrawCompetitor(pot)}
              pots={overview.competitorsByPot}
              ready={overview.competitorsReady}
            />
          ) : !overview.seeded ? (
            <View style={styles.panel}>
              <Text style={styles.mutedText}>Список теннисистов ещё не загружен.</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {activeTennisTab === "points" ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Очки</Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Очки начисляются за лучшую достигнутую стадию. Отдельных очков за победы в матчах нет: победа уже означает проход дальше.
            </Text>
          </View>

          <View style={styles.potGrid}>
            {overview.scoring.rules.map((rule) => (
              <View key={rule.stage} style={styles.potCell}>
                <Text style={styles.label}>{rule.label}</Text>
                <Text style={styles.potCount}>+{rule.increment}</Text>
              </View>
            ))}
          </View>

        </View>
      ) : null}

      {activeTennisTab === "results" ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Сетка турнира</Text>
          </View>

          <TennisBracket competitors={overview.competitors} matches={overview.matches} participants={overview.participants} />
        </View>
      ) : null}
    </>
  );
}
