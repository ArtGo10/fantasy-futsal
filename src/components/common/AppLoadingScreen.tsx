import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import {
  Dimensions,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WEB_DESKTOP_MIN_WIDTH } from "../../constants";
import { styles } from "../../styles";
import { APP_SPLASH_IMAGE } from "../../features/fantasy/assets/fantasyAssets";
import { LoadingLogo } from "./LoadingLogo";

export function AppLoadingScreen({
  description,
  title,
}: {
  description?: string;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && windowSize.width >= WEB_DESKTOP_MIN_WIDTH;
  const screenSize = Dimensions.get("screen");
  const shellStyle = isWeb
    ? {
        minHeight: windowSize.height,
        width: "100%" as const,
      }
    : {
        minHeight: Math.max(
          windowSize.height + insets.top + insets.bottom,
          screenSize.height,
        ),
        width: Math.max(
          windowSize.width + insets.left + insets.right,
          screenSize.width,
        ),
        marginTop: -insets.top,
        marginRight: -insets.right,
        marginBottom: -insets.bottom,
        marginLeft: -insets.left,
      };

  if (isWeb) {
    return (
      <View style={[styles.appLoadingWebShell, shellStyle]}>
        <StatusBar style="dark" />
        <View style={styles.appLoadingWebPanel}>
          <LoadingLogo
            style={[
              styles.appLoadingWebLogo,
              isDesktopWeb ? styles.appLoadingWebLogoDesktop : null,
            ]}
          />
          {title ? <Text style={styles.appLoadingWebTitle}>{title}</Text> : null}
          {description ? (
            <Text style={styles.appLoadingWebDescription}>{description}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.appLoadingShell, shellStyle]}>
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
