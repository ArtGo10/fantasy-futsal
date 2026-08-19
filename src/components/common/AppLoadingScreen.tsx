import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Dimensions, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "../../styles";
import { APP_SPLASH_IMAGE } from "../../features/fantasy/assets/fantasyAssets";

export function AppLoadingScreen({
  description,
  title,
}: {
  description?: string;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const screenSize = Dimensions.get("screen");
  const shellHeight = Math.max(
    windowSize.height + insets.top + insets.bottom,
    screenSize.height,
  );
  const shellWidth = Math.max(
    windowSize.width + insets.left + insets.right,
    screenSize.width,
  );

  return (
    <View
      style={[
        styles.appLoadingShell,
        {
          minHeight: shellHeight,
          width: shellWidth,
          marginTop: -insets.top,
          marginRight: -insets.right,
          marginBottom: -insets.bottom,
          marginLeft: -insets.left,
        },
      ]}
    >
      <StatusBar style="light" />
      <Image
        accessibilityIgnoresInvertColors
        contentFit="cover"
        source={APP_SPLASH_IMAGE}
        style={styles.appLoadingBackgroundImage}
      />
      <View style={styles.appLoadingBackgroundOverlay} />
      <View style={styles.appLoadingPanel}>
        {title ? <Text style={styles.appLoadingTitle}>{title}</Text> : null}
        {description ? (
          <Text style={styles.appLoadingDescription}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
}
