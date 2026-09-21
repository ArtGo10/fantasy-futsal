import {
  Animated,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { useSkeletonOpacity } from "../../../hooks/useSkeletonOpacity";

function Block({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.profileSkeletonBlock, style]} />;
}

export function PlayerProfileSkeleton({
  isDesktopWeb,
  presentation = "page",
}: {
  isDesktopWeb: boolean;
  presentation?: "page" | "sheet";
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const opacity = useSkeletonOpacity();

  return (
    <View
      accessibilityLabel={t("common.loading")}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      testID="player-profile-skeleton"
    >
      <Animated.View
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          presentation === "page" ? styles.playerProfilePage : styles.playerDetailScrollContent,
          { opacity },
        ]}
      >
        <View style={[
          styles.playerProfileHero,
          isDesktopWeb ? styles.playerProfileHeroDesktop : null,
          styles.profileSkeletonHero,
        ]}>
          <Block style={[
            styles.playerProfileHeroAvatar,
            isDesktopWeb ? styles.playerProfileHeroAvatarDesktop : null,
            styles.profileSkeletonPhoto,
          ]} />
          <View style={styles.playerProfileHeroText}>
            <Block style={styles.profileSkeletonPosition} />
            <Block style={styles.profileSkeletonName} />
            <Block style={styles.profileSkeletonClub} />
          </View>
        </View>
        <View style={styles.profileStatistics}>
          <View style={styles.profileMetrics}>
            {Array.from({ length: 5 }, (_, index) => (
              <View key={index} style={[
                styles.profileMetric,
                index === 0 && width < 600 ? styles.profilePriceMetricCompact : null,
                index > 0 ? styles.profileMetricDivider : null,
              ]}>
                <View style={styles.profileSkeletonMetricLabel}>
                  <Block style={styles.profileSkeletonLabel} />
                </View>
                <Block style={[
                  styles.profileSkeletonValue,
                  width < 600 ? styles.profileSkeletonValueCompact : null,
                ]} />
              </View>
            ))}
          </View>
          <View style={[styles.profilePreviews, width >= 900 ? styles.profilePreviewsWide : null]}>
            {[0, 1].map((section) => (
              <View key={section} style={[
                styles.profilePreviewSection,
                section === 1 && width >= 900 ? styles.profilePreviewDivider : null,
              ]}>
                <Block style={styles.profileSkeletonSectionTitle} />
                <View style={styles.profilePreviewMatches}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <View key={index} style={styles.profilePreviewMatch}>
                      <View style={styles.profileSkeletonGameweek}><Block style={styles.profileSkeletonLabel} /></View>
                      <Block style={styles.profileSkeletonLogo} />
                      <Block style={styles.profileSkeletonOpponent} />
                      <Block style={styles.profileSkeletonVenue} />
                      <Block style={styles.profileSkeletonPoints} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
          <Block style={[styles.profileTabs, styles.profileSkeletonTabs]} />
          <View style={styles.profileHistorySection}>
            <Block style={styles.profileSkeletonSectionTitle} />
            <View style={styles.profileTableScroll}>
              {[0, 1, 2, 3].map((row) => (
                <View key={row} style={[
                  styles.profileTableRow,
                  row === 0 ? styles.profileTableHeader : null,
                  styles.profileSkeletonTableRow,
                ]}>
                  <Block style={styles.profileSkeletonTableWeek} />
                  <Block style={styles.profileSkeletonTableOpponent} />
                  {Array.from({ length: width < 600 ? 2 : 9 }, (_, index) => (
                    <Block key={index} style={styles.profileSkeletonTableStat} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
