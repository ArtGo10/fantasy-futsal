import { StatusBar } from "expo-status-bar";
import { Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_DESKTOP_MIN_WIDTH } from "../../constants";
import { styles } from "../../styles";
import { LoadingLogo } from "./LoadingLogo";

type AppLoadingOverlayProps = {
  title?: string;
};

export function AppLoadingOverlay({ title: _title }: AppLoadingOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && windowWidth >= WEB_DESKTOP_MIN_WIDTH;

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.appLoadingOverlay,
        isWeb ? styles.appLoadingOverlayWeb : null,
        isWeb
          ? null
          : {
              top: -insets.top,
              right: -insets.right,
              bottom: -insets.bottom,
              left: -insets.left,
            },
      ]}
    >
      <StatusBar style={isWeb ? "auto" : "light"} />
      <LoadingLogo
        style={[
          styles.appLoadingOverlayLogo,
          isWeb ? styles.appLoadingOverlayLogoWeb : null,
          isDesktopWeb ? styles.appLoadingOverlayLogoDesktop : null,
        ]}
      />
    </View>
  );
}
