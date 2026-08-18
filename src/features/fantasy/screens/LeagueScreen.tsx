import { ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import { useDismissKeyboardOnChange } from "../../../hooks/useDismissKeyboardOnChange";
import type { TranslationKey } from "../../../i18n/translations";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { BottomSheet } from "../components/BottomSheet";
import { FantasyScreenFrame } from "../FantasyScreenFrame";

type LeagueMode = "total" | "average" | "record" | "lastWeek";

type FantasyLeagueTeam = {
  averagePoints?: number | null;
  bestGameweekPoints?: number | null;
  id: string;
  lastGameweekPoints?: number | null;
  managerName: string | null;
  name: string;
  totalPoints?: number | null;
};

const LEAGUE_MODES: Array<{ id: LeagueMode; labelKey: TranslationKey }> = [
  { id: "total", labelKey: "league.mode.total" },
  { id: "lastWeek", labelKey: "league.mode.lastWeek" },
  { id: "average", labelKey: "league.mode.average" },
  { id: "record", labelKey: "league.mode.record" },
];

const LANGUAGE_LOCALES = {
  en: "en-US",
  uk: "uk-UA",
} as const;

function normalizeLeagueMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getLeagueMetric(team: FantasyLeagueTeam, mode: LeagueMode) {
  if (mode === "average") return normalizeLeagueMetric(team.averagePoints);
  if (mode === "record") return normalizeLeagueMetric(team.bestGameweekPoints);
  if (mode === "lastWeek")
    return normalizeLeagueMetric(team.lastGameweekPoints);
  return normalizeLeagueMetric(team.totalPoints);
}

function getFormattedLeagueMetric(
  value: number | null | undefined,
  mode: LeagueMode,
  language: keyof typeof LANGUAGE_LOCALES,
) {
  const normalizedValue = normalizeLeagueMetric(value);

  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
    maximumFractionDigits: mode === "average" ? 1 : 0,
    minimumFractionDigits:
      mode === "average" && !Number.isInteger(normalizedValue) ? 1 : 0,
  }).format(normalizedValue);
}

export function LeagueScreen({
  teams,
}: {
  teams: FantasyLeagueTeam[] | undefined;
}) {
  const { language, t } = useI18n();
  const [leagueMode, setLeagueMode] = useState<LeagueMode>("total");
  const [isModePickerOpen, setModePickerOpen] = useState(false);

  useDismissKeyboardOnChange([leagueMode, isModePickerOpen]);
  const isLoading = teams === undefined;
  const selectedMode =
    LEAGUE_MODES.find((mode) => mode.id === leagueMode) ?? LEAGUE_MODES[0];
  const sortedTeams = useMemo(
    () =>
      [...(teams ?? [])].sort(
        (a, b) =>
          getLeagueMetric(b, leagueMode) - getLeagueMetric(a, leagueMode) ||
          normalizeLeagueMetric(b.totalPoints) -
            normalizeLeagueMetric(a.totalPoints) ||
          a.name.localeCompare(b.name),
      ),
    [leagueMode, teams],
  );

  return (
    <FantasyScreenFrame kicker={t("league.kicker")} title={t("league.title")}>
      {isLoading ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t("common.loading")}</Text>
        </View>
      ) : null}

      {!isLoading && teams.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t("league.emptyTitle")}</Text>
          <Text style={styles.mutedText}>{t("league.emptyDescription")}</Text>
        </View>
      ) : null}

      {!isLoading && teams.length > 0 ? (
        <>
          <View style={styles.leagueToolbar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setModePickerOpen(true)}
              style={styles.leagueModeButton}
            >
              <Text numberOfLines={1} style={styles.leagueModeButtonText}>
                {t(selectedMode.labelKey)}
              </Text>
              <ChevronDown
                color={colors.text.secondary}
                size={18}
                strokeWidth={2.3}
              />
            </Pressable>
          </View>

          <View style={styles.leagueList}>
            {sortedTeams.map((team, index) => (
              <View key={team.id} style={styles.leagueRow}>
                <Text style={styles.leagueRank}>{index + 1}</Text>
                <View style={styles.leagueTeamTextGroup}>
                  <Text numberOfLines={1} style={styles.leagueTeamName}>
                    {team.name}
                  </Text>
                  {team.managerName ? (
                    <Text numberOfLines={1} style={styles.leagueManagerName}>
                      {team.managerName}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.leaguePoints}>
                  {getFormattedLeagueMetric(
                    getLeagueMetric(team, leagueMode),
                    leagueMode,
                    language,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <BottomSheet
        contentScrollEnabled={false}
        onClose={() => setModePickerOpen(false)}
        visible={isModePickerOpen}
      >
        <View style={styles.leaguePickerContent}>
          <ScrollView
            style={styles.leaguePickerScroll}
            contentContainerStyle={styles.seasonPickerOptions}
          >
            {LEAGUE_MODES.map((mode) => {
              const isSelected = mode.id === leagueMode;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={mode.id}
                  onPress={() => {
                    setLeagueMode(mode.id);
                    setModePickerOpen(false);
                  }}
                  style={[
                    styles.seasonPickerOption,
                    isSelected ? styles.seasonPickerOptionSelected : null,
                  ]}
                >
                  <View style={styles.seasonPickerOptionBody}>
                    <View style={styles.seasonPickerOptionTextGroup}>
                      <Text
                        numberOfLines={1}
                        style={styles.seasonPickerOptionText}
                      >
                        {t(mode.labelKey)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.seasonPickerOptionRadio,
                      isSelected
                        ? styles.seasonPickerOptionRadioSelected
                        : null,
                    ]}
                  >
                    {isSelected ? (
                      <View style={styles.seasonPickerOptionRadioDot} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </BottomSheet>
    </FantasyScreenFrame>
  );
}
