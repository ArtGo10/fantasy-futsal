import { Animated, StyleSheet, View } from "react-native";

import { useSkeletonOpacity } from "../../../hooks/useSkeletonOpacity";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { useFutsalFieldLayout } from "../utils/useFutsalFieldLayout";

export function TeamWorkspaceSkeleton({ variant, fitToAvailableHeight = false }: {
  variant: "players" | "pitch";
  fitToAvailableHeight?: boolean;
}) {
  const { t } = useI18n();
  const opacity = useSkeletonOpacity();
  const { aspectRatio } = useFutsalFieldLayout();
  return (
    <View
      accessibilityLabel={t("common.loading")}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      testID={`team-${variant}-skeleton`}
      style={variant === "players" ? local.list : [
        local.pitch,
        fitToAvailableHeight ? local.fittedPitch : { aspectRatio },
      ]}
    >
      <Animated.View
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[{ opacity }, variant === "pitch" ? local.pitchContent : null]}
      >
        {variant === "players" ? (
          <>
            <View style={local.header}>
              {[160, 50, 50, 50, 50].map((width, index) => (
                <View key={index} style={[styles.profileSkeletonBlock, { width, height: 14 }]} />
              ))}
            </View>
            {Array.from({ length: 10 }, (_, row) => (
              <View key={row} style={local.row}>
                <View style={[styles.profileSkeletonBlock, local.avatar]} />
                <View style={local.nameGroup}>
                  <View style={[styles.profileSkeletonBlock, local.name]} />
                  <View style={[styles.profileSkeletonBlock, local.club]} />
                </View>
                {[0, 1, 2, 3, 4].map((stat) => (
                  <View key={stat} style={[styles.profileSkeletonBlock, local.stat]} />
                ))}
              </View>
            ))}
          </>
        ) : (
          [2, 5, 5].map((count, row) => (
            <View key={row} style={local.pitchRow}>
              {Array.from({ length: count }, (_, index) => (
                <View key={index} style={[styles.profileSkeletonBlock, local.slot]} />
              ))}
            </View>
          ))
        )}
      </Animated.View>
    </View>
  );
}

const local = StyleSheet.create({
  list: { flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: colors.surface },
  header: { height: 42, flexDirection: "row", alignItems: "center", gap: 24, paddingHorizontal: 16 },
  row: { height: 64, flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 16, borderTopWidth: 1, borderColor: colors.border.default },
  avatar: { width: 32, height: 40 },
  nameGroup: { gap: 8, width: 128 },
  name: { width: 116, height: 14 },
  club: { width: 76, height: 10 },
  stat: { width: 36, height: 14 },
  pitch: { width: "100%", borderRadius: 8, backgroundColor: colors.surfaceSubtle, overflow: "hidden" },
  fittedPitch: { flex: 1, minHeight: 0 },
  pitchContent: { flex: 1, justifyContent: "space-around" },
  pitchRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" },
  slot: { width: "12%", maxWidth: 56, aspectRatio: 56 / 76 },
});
