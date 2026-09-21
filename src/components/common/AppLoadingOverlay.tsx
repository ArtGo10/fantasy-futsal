import { StatusBar } from "expo-status-bar";
import { Modal, Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_DESKTOP_MIN_WIDTH } from "../../constants";
import { styles } from "../../styles";
import { LoadingLogo } from "./LoadingLogo";

type AppLoadingOverlayProps = {
  title?: string;
  fullScreen?: boolean;
  onRequestClose?: () => void;
};

export function AppLoadingOverlay({
  title,
  fullScreen = false,
  onRequestClose,
}: AppLoadingOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && windowWidth >= WEB_DESKTOP_MIN_WIDTH;

  const overlay = (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityState={{ busy: true }}
      pointerEvents="auto"
      style={[
        styles.appLoadingOverlay,
        isWeb ? styles.appLoadingOverlayWeb : null,
        isWeb || fullScreen
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

  // A modal keeps nested screen loaders outside ScrollViews and clipped panels.
  return fullScreen ? (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose ?? (() => {})}
    >
      {overlay}
    </Modal>
  ) : (
    overlay
  );
}
