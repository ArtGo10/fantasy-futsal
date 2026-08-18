import { useState, type ReactNode } from "react";
import { ScrollView, type LayoutChangeEvent, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles } from "../../styles";
import { spacing } from "../../theme/tokens";

export function FantasyScreenFrame({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
  kicker: string;
  title: string;
}) {
  const [footerHeight, setFooterHeight] = useState(0);

  const handleFooterLayout = (event: LayoutChangeEvent) => {
    const nextFooterHeight = event.nativeEvent.layout.height;
    setFooterHeight((currentFooterHeight) =>
      Math.abs(currentFooterHeight - nextFooterHeight) < 1
        ? currentFooterHeight
        : nextFooterHeight,
    );
  };

  return (
    <View style={styles.fantasyScreenFrameRoot}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.fantasyScreenScroll}
        contentContainerStyle={[
          styles.fantasyScreen,
          footer ? { paddingBottom: footerHeight + spacing.lg } : null,
        ]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <SafeAreaView
          edges={["right", "bottom", "left"]}
          onLayout={handleFooterLayout}
          style={styles.fantasyScreenFixedFooterSafe}
        >
          <View style={styles.fantasyScreenFixedFooter}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
