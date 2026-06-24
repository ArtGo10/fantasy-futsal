import { MATCH_STAGE_LABELS } from "./labels";
import type { MatchView } from "../types";

export function formatMatchScore(match: MatchView) {
  if (match.status === "live" && (match.homeScore === null || match.awayScore === null)) {
    return "LIVE";
  }

  if (match.homeScore === null || match.awayScore === null) {
    return "-";
  }

  const score = `${match.homeScore} - ${match.awayScore}`;

  if (match.decidedBy === "extra_time") {
    return `${score} д.в.`;
  }

  if (match.decidedBy === "penalties") {
    if (match.homePenaltyScore !== null && match.awayPenaltyScore !== null) {
      return `${score} пен. ${match.homePenaltyScore}:${match.awayPenaltyScore}`;
    }

    return `${score} пен.`;
  }

  return score;
}

export function getMatchMeta(match: MatchView) {
  return match.stage === "group" && match.group ? `Группа ${match.group}` : MATCH_STAGE_LABELS[match.stage];
}
