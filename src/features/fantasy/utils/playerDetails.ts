import type { TranslationKey } from "../../../i18n/translations";
import type { PlayerProfileMatch } from "../components/PlayerMatchHistory";

export function getPlayerMatchesForGameweek(
  matches: PlayerProfileMatch[],
  gameweekId: string | null | undefined,
) {
  if (!gameweekId) return [];

  return matches
    .filter(
      (match) =>
        (match.gameweek?.id ?? match.fixture.gameweekId) === gameweekId,
    )
    .sort((a, b) => a.fixture.scheduledAt - b.fixture.scheduledAt);
}

export type PlayerDetailSeasonStatsPlayer = {
  appearances?: number | null;
  assists?: number | null;
  averagePointsPerGameweek?: number | null;
  cleanSheets?: number | null;
  goals?: number | null;
  goalsConceded?: number | null;
  ownGoals?: number | null;
  penaltiesMissed?: number | null;
  penaltiesSaved?: number | null;
  position: "goalkeeper" | "universal";
  redCards?: number | null;
  saves?: number | null;
  seasonPoints?: number | null;
  yellowCards?: number | null;
};

export function formatPlayerDetailNumber(value: number | null | undefined) {
  const normalized = Number((value ?? 0).toFixed(1));
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(1);
}

export function getPlayerMatchStats(match: PlayerProfileMatch | null) {
  const count = (kind: PlayerProfileMatch["lines"][number]["kind"]) =>
    (match?.lines ?? []).reduce(
      (total, line) => total + (line.kind === kind ? (line.count ?? 0) : 0),
      0,
    );
  return {
    points: match?.points ?? 0,
    appeared: match?.appeared ? 1 : count("appearance"),
    goals: count("goal"),
    assists: count("assist"),
    yellowCards: count("yellow_card"),
    secondYellowRedCards: count("second_yellow_red"),
    redCards: count("red_card"),
    ownGoals: count("own_goal"),
    penaltiesMissed: count("penalty_missed"),
    penaltiesSaved: count("penalty_saved"),
  };
}

export function getPlayerDetailSeasonStatItems(
  player: PlayerDetailSeasonStatsPlayer,
  t: (key: TranslationKey) => string,
) {
  const items = [
    {
      key: "seasonPoints",
      label: t("playerDetails.totalPoints"),
      value: formatPlayerDetailNumber(player.seasonPoints),
    },
    {
      key: "averagePoints",
      label: t("playerDetails.averagePoints"),
      value: formatPlayerDetailNumber(player.averagePointsPerGameweek),
    },
    {
      key: "goals",
      label: t("players.stats.goals"),
      value: formatPlayerDetailNumber(player.goals),
    },
    {
      key: "assists",
      label: t("players.stats.assists"),
      value: formatPlayerDetailNumber(player.assists),
    },
    {
      key: "appearances",
      label: t("players.stats.matches"),
      value: formatPlayerDetailNumber(player.appearances),
    },
    {
      key: "yellowCards",
      label: t("playerDetails.yellowCards"),
      value: formatPlayerDetailNumber(player.yellowCards),
    },
    {
      key: "redCards",
      label: t("playerDetails.redCards"),
      value: formatPlayerDetailNumber(player.redCards),
    },
    {
      key: "ownGoals",
      label: t("playerDetails.ownGoals"),
      value: formatPlayerDetailNumber(player.ownGoals),
    },
    {
      key: "penaltiesMissed",
      label: t("playerDetails.penaltiesMissed"),
      value: formatPlayerDetailNumber(player.penaltiesMissed),
    },
  ];

  if (player.position === "goalkeeper") {
    items.push({
      key: "penaltiesSaved",
      label: t("playerDetails.penaltiesSaved"),
      value: formatPlayerDetailNumber(player.penaltiesSaved),
    });
  }

  return items;
}
