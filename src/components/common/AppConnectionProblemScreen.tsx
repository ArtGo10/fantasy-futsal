import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";
import fantasyFutsalAppIcon from "../../../assets/fantasy-futsal-big-icon.png";

export function AppConnectionProblemScreen({
  description,
  title,
}: {
  description?: string;
  title?: string;
} = {}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const resolvedTitle = title ?? t("network.offlineTitle");
  const resolvedDescription = description ?? t("network.offlineDescription");

  return (
    <View
      style={[
        styles.appLoadingShell,
        {
          marginTop: -insets.top,
          marginRight: -insets.right,
          marginBottom: -insets.bottom,
          marginLeft: -insets.left,
        },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.appLoadingPanel}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={fantasyFutsalAppIcon}
          style={styles.appLoadingLogo}
        />
        <Text style={styles.appLoadingBrand}>{t("app.title")}</Text>
        <View style={styles.appLoadingTextGroup}>
          <Text style={styles.appLoadingTitle}>{resolvedTitle}</Text>
          <Text style={styles.appLoadingDescription}>
            {resolvedDescription}
          </Text>
        </View>
      </View>
    </View>
  );
}
