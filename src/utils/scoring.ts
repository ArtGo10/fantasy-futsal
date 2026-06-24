import { formatMatchScore } from "./matches";
import { TEAM_STAGE_LABELS } from "./labels";
import type { AssignmentView, MatchView, ParticipantView, TeamPointDetails, TeamStage } from "../types";

export const TEAM_STAGE_BONUSES: Record<TeamStage, number> = {
  group: 0,
  round_of_32: 3,
  round_of_16: 4,
  quarter_final: 5,
  semi_final: 6,
  final: 8,
  champion: 10,
};

export const THIRD_PLACE_WIN_BONUS = 3;

export const TEAM_STAGE_ORDER: TeamStage[] = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
];

export function getTeamStageBonus(stageReached: TeamStage) {
  const stageIndex = TEAM_STAGE_ORDER.indexOf(stageReached);
  if (stageIndex <= 0) return 0;

  return TEAM_STAGE_ORDER.slice(1, stageIndex + 1).reduce((total, stage) => total + TEAM_STAGE_BONUSES[stage], 0);
}

export function getTeamMatchPoints(teamId: string | null, match: MatchView) {
  if (match.status !== "completed" || match.homeScore === null || match.awayScore === null) {
    return 0;
  }
  if (!teamId) return 0;

  const isHomeTeam = match.homeTeam.id === teamId;
  const isAwayTeam = match.awayTeam.id === teamId;
  if (!isHomeTeam && !isAwayTeam) return 0;

  if (match.decidedBy === "penalties" && match.homeScore === match.awayScore) {
    return 1;
  }

  if (match.stage !== "group") {
    if (match.winnerTeamId) return match.winnerTeamId === teamId ? 3 : 0;
    if (match.homeScore === match.awayScore) return 0;
  }

  if (match.homeScore === match.awayScore) return 1;

  const teamWon =
    (isHomeTeam && match.homeScore > match.awayScore) ||
    (isAwayTeam && match.awayScore > match.homeScore);

  return teamWon ? 3 : 0;
}

export function getThirdPlaceWinBonus(teamId: string | null, match: MatchView) {
  if (match.stage !== "third_place" || match.status !== "completed") return 0;
  if (!teamId) return 0;

  return match.winnerTeamId === teamId ? THIRD_PLACE_WIN_BONUS : 0;
}

export function getTeamPointsById(matches: MatchView[]) {
  const pointsByTeamId = new Map<string, number>();

  for (const match of matches) {
    if (!match.homeTeam.id || !match.awayTeam.id) continue;

    const homePoints = getTeamMatchPoints(match.homeTeam.id, match) + getThirdPlaceWinBonus(match.homeTeam.id, match);
    const awayPoints = getTeamMatchPoints(match.awayTeam.id, match) + getThirdPlaceWinBonus(match.awayTeam.id, match);

    pointsByTeamId.set(match.homeTeam.id, (pointsByTeamId.get(match.homeTeam.id) ?? 0) + homePoints);
    pointsByTeamId.set(match.awayTeam.id, (pointsByTeamId.get(match.awayTeam.id) ?? 0) + awayPoints);
  }

  return pointsByTeamId;
}

export function getAssignmentPoints(assignment: AssignmentView, pointsByTeamId: Map<string, number>) {
  return (pointsByTeamId.get(assignment.teamId) ?? 0) + getTeamStageBonus(assignment.stageReached);
}

export function getParticipantTotalPoints(participant: ParticipantView, pointsByTeamId: Map<string, number>) {
  return participant.assignments.reduce((total, assignment) => total + getAssignmentPoints(assignment, pointsByTeamId), 0);
}

export function getTeamPointDetailsById(matches: MatchView[], participants: ParticipantView[]) {
  const detailsByTeamId = new Map<string, TeamPointDetails>();

  const ensureDetails = (teamId: string) => {
    const existing = detailsByTeamId.get(teamId);
    if (existing) return existing;

    const details: TeamPointDetails = {
      matchPoints: 0,
      stageBonus: 0,
      specialBonus: 0,
      total: 0,
      lines: [],
    };
    detailsByTeamId.set(teamId, details);

    return details;
  };

  for (const match of matches) {
    if (match.status !== "completed") continue;

    const homePoints = getTeamMatchPoints(match.homeTeam.id, match);
    const awayPoints = getTeamMatchPoints(match.awayTeam.id, match);
    const homeThirdPlaceBonus = getThirdPlaceWinBonus(match.homeTeam.id, match);
    const awayThirdPlaceBonus = getThirdPlaceWinBonus(match.awayTeam.id, match);
    const scoreText = formatMatchScore(match);

    if (homePoints > 0 && match.homeTeam.id) {
      const details = ensureDetails(match.homeTeam.id);
      details.matchPoints += homePoints;
      details.total += homePoints;
      details.lines.push(`${match.homeTeam.name} - ${match.awayTeam.name} ${scoreText}: +${homePoints}`);
    }

    if (awayPoints > 0 && match.awayTeam.id) {
      const details = ensureDetails(match.awayTeam.id);
      details.matchPoints += awayPoints;
      details.total += awayPoints;
      details.lines.push(`${match.homeTeam.name} - ${match.awayTeam.name} ${scoreText}: +${awayPoints}`);
    }

    if (homeThirdPlaceBonus > 0 && match.homeTeam.id) {
      const details = ensureDetails(match.homeTeam.id);
      details.specialBonus += homeThirdPlaceBonus;
      details.total += homeThirdPlaceBonus;
      details.lines.push(`Победа в матче за 3-е место: +${homeThirdPlaceBonus}`);
    }

    if (awayThirdPlaceBonus > 0 && match.awayTeam.id) {
      const details = ensureDetails(match.awayTeam.id);
      details.specialBonus += awayThirdPlaceBonus;
      details.total += awayThirdPlaceBonus;
      details.lines.push(`Победа в матче за 3-е место: +${awayThirdPlaceBonus}`);
    }
  }

  for (const participant of participants) {
    for (const assignment of participant.assignments) {
      const stageBonus = getTeamStageBonus(assignment.stageReached);
      const details = ensureDetails(assignment.teamId);

      details.stageBonus = stageBonus;
      details.total = details.matchPoints + details.stageBonus + details.specialBonus;

      if (stageBonus > 0) {
        details.lines.push(`${TEAM_STAGE_LABELS[assignment.stageReached]}: +${stageBonus}`);
      }
    }
  }

  return detailsByTeamId;
}
