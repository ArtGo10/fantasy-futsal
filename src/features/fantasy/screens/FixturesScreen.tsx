import { useMemo } from "react";
import { Text, View } from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import type { LanguageCode } from "../../../i18n/translations";
import { styles } from "../../../styles";
import { FantasyScreenFrame } from "../FantasyScreenFrame";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export type FantasyGameweekFixtureProfile = {
  hasBlankTeams: boolean;
  isDoubleGameweek: boolean;
  teamsWithBlank: Array<{
    clubId: string | null;
    name: string;
  }>;
  teamsWithDouble: Array<{
    clubId: string | null;
    matchCount: number;
    name: string;
  }>;
};

export type FantasyGameweek = {
  id: string;
  number: number;
  name: string;
  status: string;
  deadlineAt: number | null;
  startsAt: number | null;
  endsAt: number | null;
  fixtureProfile: FantasyGameweekFixtureProfile | null;
};

export type FantasyFixture = {
  id: string;
  gameweekId: string | null;
  homeClubId: string | null;
  awayClubId: string | null;
  homeClubName: string;
  awayClubName: string;
  scheduledAt: number;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

export type FixturesScreenProps = {
  fixtures: FantasyFixture[] | undefined;
  gameweeks: FantasyGameweek[] | undefined;
};

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  uk: "uk-UA",
};

function formatDate(value: number | null | undefined, language: LanguageCode, fallback: string) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: number | null | undefined, language: LanguageCode, fallback: string) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatFixtureCenter(fixture: FantasyFixture, language: LanguageCode) {
  if (fixture.status === "completed" && fixture.homeScore !== null && fixture.awayScore !== null) {
    return fixture.homeScore + ":" + fixture.awayScore;
  }

  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.scheduledAt));
}

export function FixturesCalendarContent({ fixtures, gameweeks }: FixturesScreenProps) {
  const { language, t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const isLoading = fixtures === undefined || gameweeks === undefined;
  const fixturesByGameweekId = useMemo(() => {
    const result = new Map<string, FantasyFixture[]>();

    for (const fixture of fixtures ?? []) {
      const key = fixture.gameweekId ?? "ungrouped";
      const current = result.get(key) ?? [];
      current.push(fixture);
      result.set(key, current);
    }

    for (const fixtureList of result.values()) {
      fixtureList.sort((a, b) => a.scheduledAt - b.scheduledAt);
    }

    return result;
  }, [fixtures]);

  const sortedGameweeks = useMemo(
    () => [...(gameweeks ?? [])].sort((a, b) => a.number - b.number),
    [gameweeks],
  );

  return (
    <>
      {isLoading ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t("common.loading")}</Text>
          <Text style={styles.mutedText}>{t("fixtures.loadingDescription")}</Text>
        </View>
      ) : null}

      {!isLoading && sortedGameweeks.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t("fixtures.emptyTitle")}</Text>
          <Text style={styles.mutedText}>{t("fixtures.emptyDescription")}</Text>
        </View>
      ) : null}

      {!isLoading && sortedGameweeks.length > 0 ? (
        <View style={styles.fixturesList}>
          {sortedGameweeks.map((gameweek) => {
            const gameweekFixtures = fixturesByGameweekId.get(gameweek.id) ?? [];
            const fallbackDate = gameweekFixtures[0]?.scheduledAt ?? gameweek.startsAt ?? null;

            return (
              <View key={gameweek.id} style={styles.fixtureGameweekCard}>
                <View
                  style={[
                    styles.fixtureGameweekHeader,
                    { backgroundColor: fantasyTheme.softColor },
                  ]}
                >
                  <View style={styles.fixtureGameweekTitleGroup}>
                    <Text style={styles.fixtureGameweekTitle}>{gameweek.name}</Text>
                    <Text style={styles.fixtureGameweekDeadline}>
                      {t("fixtures.deadlineLabel")}: {formatDateTime(gameweek.deadlineAt, language, t("fixtures.dateUnknown"))}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.fixtureGameweekDate,
                      { color: fantasyTheme.primaryColor },
                    ]}
                  >
                    {formatDate(fallbackDate, language, t("fixtures.dateUnknown"))}
                  </Text>
                </View>

                <View style={styles.fixtureRows}>
                  {gameweekFixtures.map((fixture) => {
                    const isCompleted =
                      fixture.status === "completed" &&
                      fixture.homeScore !== null &&
                      fixture.awayScore !== null;

                    return (
                      <View key={fixture.id} style={styles.fixtureRow}>
                        <Text
                          numberOfLines={1}
                          style={[styles.fixtureClubName, styles.fixtureHomeClubName]}
                        >
                          {fixture.homeClubName}
                        </Text>
                        <View
                          style={[
                            styles.fixtureCenterPill,
                            isCompleted ? styles.fixtureCenterPillCompleted : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fixtureCenterText,
                              !isCompleted
                                ? { color: fantasyTheme.primaryColor }
                                : null,
                              isCompleted ? styles.fixtureCenterTextCompleted : null,
                            ]}
                          >
                            {formatFixtureCenter(fixture, language)}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={styles.fixtureClubName}>
                          {fixture.awayClubName}
                        </Text>
                      </View>
                    );
                  })}

                  {gameweekFixtures.length === 0 ? (
                    <Text style={styles.mutedText}>{t("fixtures.noFixturesInGameweek")}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

export function FixturesScreen(props: FixturesScreenProps) {
  const { t } = useI18n();

  return (
    <FantasyScreenFrame kicker={t("fixtures.kicker")} title={t("fixtures.title")}>
      <FixturesCalendarContent {...props} />
    </FantasyScreenFrame>
  );
}
