import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { styles } from "../../../styles";
import { FantasyScreenFrame } from "../FantasyScreenFrame";

const hiddenPageStyle = { visibility: "hidden" } as ViewStyle;

export function PlayerDetailScreen({
  children,
  details,
  pageVisible,
}: {
  children: ReactNode;
  details: ReactNode;
  pageVisible: boolean;
}) {
  return (
    <View style={styles.fantasyScreenFrameRoot}>
      {/* Keep the source mounted at its original size to preserve drafts and scroll. */}
      <View
        accessibilityElementsHidden={pageVisible}
        aria-hidden={pageVisible}
        importantForAccessibility={pageVisible ? "no-hide-descendants" : "auto"}
        pointerEvents={pageVisible ? "none" : "auto"}
        style={[StyleSheet.absoluteFill, pageVisible ? hiddenPageStyle : null]}
      >
        {children}
      </View>
      {pageVisible ? (
        <FantasyScreenFrame kicker="" title="">
          {details}
        </FantasyScreenFrame>
      ) : (
        details
      )}
    </View>
  );
}
