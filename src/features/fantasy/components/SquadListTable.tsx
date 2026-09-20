import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { styles } from "../../../styles";

export function SquadListTable({
  children,
  fitToAvailableHeight = false,
  header,
}: {
  children: ReactNode;
  fitToAvailableHeight?: boolean;
  header: ReactNode;
}) {
  return (
    <View
      style={[
        styles.squadListPanel,
        fitToAvailableHeight ? styles.squadContentFill : null,
      ]}
    >
      <ScrollView
        horizontal
        bounces={false}
        disableScrollViewPanResponder
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={[
          styles.squadListHorizontalScrollContent,
          fitToAvailableHeight ? { height: "100%" } : null,
        ]}
        style={[
          styles.squadListHorizontalScroll,
          fitToAvailableHeight ? styles.squadContentFill : null,
        ]}
      >
        <View
          style={[
            styles.squadListStatsTable,
            fitToAvailableHeight ? styles.squadContentFill : null,
          ]}
        >
          {header}
          {fitToAvailableHeight ? (
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.squadContentFill}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </ScrollView>
    </View>
  );
}
