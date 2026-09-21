export function getPlayerProfileSummary({
  gameweeks,
  gameweekStats,
  matches,
}: {
  gameweeks: Array<{ _id: string; number: number; status: string }>;
  gameweekStats: Array<{ gameweekId: string; points: number }>;
  matches: Array<{
    appeared: boolean;
    fixture: { status: string; scheduledAt: number };
    points: number;
  }>;
}) {
  const recentMatches = matches
    .filter((match) => match.appeared && match.fixture.status === "completed")
    .sort((a, b) => b.fixture.scheduledAt - a.fixture.scheduledAt)
    .slice(0, 5);
  const latestGameweek = gameweeks
    .filter((gameweek) => gameweek.status === "completed")
    .sort((a, b) => b.number - a.number)[0];

  return {
    form: recentMatches.length
      ? Number(
          (
            recentMatches.reduce((sum, match) => sum + match.points, 0) /
            recentMatches.length
          ).toFixed(1),
        )
      : 0,
    lastCompletedGameweekNumber: latestGameweek?.number ?? null,
    lastCompletedGameweekPoints: latestGameweek
      ? Number(
          gameweekStats
            .filter((stat) => stat.gameweekId === latestGameweek._id)
            .reduce((sum, stat) => sum + stat.points, 0)
            .toFixed(1),
        )
      : 0,
  };
}
