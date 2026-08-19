import type { ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles } from "../../styles";

export function FantasyScreenFrame({
  children,
  contentContainerStyle,
  footer,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <View style={styles.fantasyScreenFrameRoot}>
      <ScrollView
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.fantasyScreenScroll}
        contentContainerStyle={[styles.fantasyScreen, contentContainerStyle]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <SafeAreaView
          edges={["right", "bottom", "left"]}
          style={styles.fantasyScreenFixedFooterSafe}
        >
          <View style={styles.fantasyScreenFixedFooter}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
