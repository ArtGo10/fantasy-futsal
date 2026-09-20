export const FANTASY_CHIPS = [
  "benchBoost",
  "tripleCaptain",
  "wildcard",
  "freeHit",
] as const;
export type FantasyChip = (typeof FANTASY_CHIPS)[number];
export type ChipGameweek = {
  _id: string;
  number: number;
  status: string;
  deadlineAt?: number;
};

export type ChipCalendarGameweek = {
  number: number;
  deadlineAt?: number | null;
};

// Imported calendars may include playoff placeholders or only the first leg.
const SEASON_CHIP_ROUNDS: Record<string, number> = {
  "ukrainian-extra-league-2026-27": 18,
  "polish-futsal-ekstraklasa-2026-27": 30,
};

export function getChipSeasonPeriod(
  gameweeks: readonly ChipCalendarGameweek[],
  seasonSlug?: string,
) {
  const sorted = [...gameweeks].sort((a, b) => a.number - b.number);
  const seasonRounds = seasonSlug ? SEASON_CHIP_ROUNDS[seasonSlug] : undefined;
  if (seasonRounds) {
    const split = Math.ceil(seasonRounds / 2);
    return {
      firstHalfEndGameweek: split,
      firstHalfDeadlineAt: sorted.find((row) => row.number === split)?.deadlineAt ?? null,
      secondHalfStartGameweek: split + 1,
      lastGameweek: seasonRounds,
    };
  }
  if (!sorted.length) return null;
  const split = Math.ceil(sorted.length / 2);
  return {
    firstHalfEndGameweek: sorted[split - 1].number,
    firstHalfDeadlineAt: sorted[split - 1].deadlineAt ?? null,
    secondHalfStartGameweek: sorted[split]?.number ?? null,
    lastGameweek: sorted[sorted.length - 1].number,
  };
}

export function getChipPeriod(gameweeks: ChipGameweek[], gameweekId: string, seasonSlug?: string) {
  const sorted = [...gameweeks].sort((a, b) => a.number - b.number);
  const index = sorted.findIndex((gameweek) => gameweek._id === gameweekId);
  if (index < 0) return null;
  const period = getChipSeasonPeriod(sorted, seasonSlug)!;
  if (sorted[index].number > period.lastGameweek) return null;
  return {
    half: sorted[index].number <= period.firstHalfEndGameweek ? 1 : 2,
    ...period,
    previousGameweekId: sorted[index - 1]?._id ?? null,
  };
}

export function isChipGameweekEditable(gameweek: ChipGameweek, now: number) {
  return (
    (gameweek.status === "open" || gameweek.status === "upcoming") &&
    gameweek.deadlineAt !== undefined &&
    now < gameweek.deadlineAt
  );
}

export function isUnlimitedTransferChip(chip?: FantasyChip | null) {
  return chip === "wildcard" || chip === "freeHit";
}

export function canCancelChip(chip: FantasyChip, transfersUsed: number) {
  if (chip === "wildcard") return transfersUsed < 2;
  if (chip === "freeHit") return transfersUsed === 0;
  return true;
}

export function chipRoleMultiplier(
  role: "starter" | "bench" | "reserve",
  chip?: FantasyChip | null,
) {
  if (chip === "benchBoost") return 1;
  return role === "starter" ? 1 : role === "bench" ? 0.5 : 0;
}

export function chipCaptainBonusMultiplier(chip?: FantasyChip | null) {
  return chip === "tripleCaptain" ? 2 : 1;
}

export type ChipUnavailableReason =
  | "deadline"
  | "used"
  | "anotherChip"
  | "consecutiveFreeHit"
  | "missingBaseline"
  | "incompleteSquad";
export type TeamChipView = {
  gameweekId: string;
  gameweekNumber: number;
  deadlineAt: number | null;
  half: number;
  firstHalfEndGameweek: number;
  firstHalfDeadlineAt: number | null;
  secondHalfStartGameweek: number | null;
  lastGameweek: number;
  activeChip: FantasyChip | null;
  transfersUsed: number;
  items: Array<{
    id: FantasyChip;
    status: "available" | "active" | "played";
    gameweekNumber: number | null;
    canPlay: boolean;
    canCancel: boolean;
    unavailableReason: ChipUnavailableReason | null;
  }>;
};
