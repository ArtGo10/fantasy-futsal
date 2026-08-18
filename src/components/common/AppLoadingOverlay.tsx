import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../styles";
import { LoadingLogo } from "./LoadingLogo";

type AppLoadingOverlayProps = {
  title?: string;
};

export function AppLoadingOverlay({ title: _title }: AppLoadingOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.appLoadingOverlay,
        {
          top: -insets.top,
          right: -insets.right,
          bottom: -insets.bottom,
          left: -insets.left,
        },
      ]}
    >
      <StatusBar style="light" />
      <LoadingLogo style={styles.appLoadingOverlayLogo} />
    </View>
  );
}
