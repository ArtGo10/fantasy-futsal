export const FANTASY_INITIAL_PRICE_MIN = 5.5;
export const FANTASY_INITIAL_PRICE_MAX = 14.0;
export const FANTASY_INITIAL_PRICE_STEP = 0.5;

const FANTASY_INITIAL_PRICE_BASE = 5.7;

const EXTRA_LEAGUE_STAT_WEIGHT = 1;
const FIRST_LEAGUE_STAT_WEIGHT = 0.25;

const CLUB_PRICE_BONUS_BY_EXTERNAL_ID = new Map([
  ["3438", 1.2], // ХІТ
  ["21695", 0.85], // SkyUp
  ["5586", 0.85], // Атлетік Футзал
  ["5584", 0.4], // Суха Балка
  ["3430", 0.4], // Сокіл
]);

const PLAYER_REPUTATION_BONUS_BY_NAME = new Map([
  ["Владислав Первєєв", 1.0],
  ["Євгеній Жук", 0.9],
  ["Андрій Мельник", 2.4],
]);

function roundPrice(value) {
  return (
    Math.round(value / FANTASY_INITIAL_PRICE_STEP) * FANTASY_INITIAL_PRICE_STEP
  );
}

function clampPrice(value) {
  return Math.min(
    FANTASY_INITIAL_PRICE_MAX,
    Math.max(FANTASY_INITIAL_PRICE_MIN, value),
  );
}

function calculateCompetitionScore(stats) {
  if (!stats) return 0;

  return Math.max(
    0,
    stats.goals * 2.15 +
      stats.assists * 1.9 +
      stats.appearances * 0.2 -
      stats.yellowCards * 0.12 -
      stats.redCards * 0.55 -
      stats.ownGoals * 0.35,
  );
}

function calculatePerformanceBonus(score) {
  if (score <= 0) return 0;
  return Math.sqrt(score) * 0.72 + score * 0.04;
}

export function calculateSuggestedPrice({
  clubExternalId,
  displayName,
  statsByCompetition,
}) {
  const extraLeagueScore =
    calculateCompetitionScore(statsByCompetition.extraLeague2025_26 ?? null) *
    EXTRA_LEAGUE_STAT_WEIGHT;
  const firstLeagueScore =
    calculateCompetitionScore(statsByCompetition.firstLeague2025_26 ?? null) *
    FIRST_LEAGUE_STAT_WEIGHT;
  const performanceScore = Math.max(extraLeagueScore, firstLeagueScore);
  const clubBonus = CLUB_PRICE_BONUS_BY_EXTERNAL_ID.get(clubExternalId) ?? 0;
  const reputationBonus = PLAYER_REPUTATION_BONUS_BY_NAME.get(displayName) ?? 0;

  return roundPrice(
    clampPrice(
      FANTASY_INITIAL_PRICE_BASE +
        clubBonus +
        reputationBonus +
        calculatePerformanceBonus(performanceScore),
    ),
  );
}
