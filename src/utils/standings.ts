export type PrizePlace = "gold" | "silver" | "bronze";

export function areAllScheduledMatchesCompleted(matches: ReadonlyArray<{ status: string }>) {
  return matches.length > 0 && matches.every((match) => match.status === "completed");
}

export function getPrizePlaceByIndex(index: number): PrizePlace | null {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";

  return null;
}
