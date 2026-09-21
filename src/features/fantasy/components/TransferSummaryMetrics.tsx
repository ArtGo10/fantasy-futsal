import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import { colors } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export type TransferSummary = {
  bankValue: string;
  costPoints: number;
  freeTransfersValue: string;
  isBankNegative: boolean;
};

export function TransferSummaryMetrics({
  summary,
  compact,
  narrow = false,
}: {
  summary: TransferSummary;
  compact: boolean;
  narrow?: boolean;
}) {
  const { t } = useI18n();
  const theme = useFantasySeasonTheme();
  const unlimited = summary.freeTransfersValue === "∞";
  const items = [
    {
      label: t("team.freeTransfersLabel"),
      value: summary.freeTransfersValue,
      accessibleValue: unlimited
        ? t("team.freeTransfersUnlimited")
        : summary.freeTransfersValue,
      color: theme.primaryColor,
    },
    {
      label: t("team.transfers.costLabel"),
      value: String(summary.costPoints),
      color: summary.costPoints > 0 ? colors.state.danger : theme.primaryColor,
    },
    {
      label: t("team.bankLabel"),
      value: summary.bankValue,
      color: summary.isBankNegative
        ? colors.state.danger
        : colors.state.success,
      backgroundColor: summary.isBankNegative
        ? colors.state.dangerSoft
        : colors.state.successSoft,
    },
  ];
  return (
    <>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.accessibleValue ?? item.value}`}
          style={[
            local.metric,
            compact && local.compactMetric,
            { backgroundColor: item.backgroundColor },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              local.value,
              compact && local.compactValue,
              narrow && local.narrowValue,
              { color: item.color },
            ]}
          >
            {item.value}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              local.label,
              compact && local.compactLabel,
              narrow && local.narrowLabel,
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </>
  );
}

const local = StyleSheet.create({
  metric: {
    flex: 1,
    minWidth: 0,
    height: 92,
    paddingHorizontal: 2,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  compactMetric: { height: 72 },
  compactValue: { fontSize: 13, lineHeight: 18 },
  narrowValue: { fontSize: 12 },
  compactLabel: { height: 22, fontSize: 9, lineHeight: 11 },
  narrowLabel: { height: 20, fontSize: 8, lineHeight: 10 },
  label: {
    height: 24,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
    color: colors.text.muted,
  },
});
