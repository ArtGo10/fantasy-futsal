import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";

export function MissingEnv() {
  const { t } = useI18n();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.title}>{t("auth.missingEnvTitle")}</Text>
          <Text style={styles.mutedText}>
            {t("auth.missingEnvDescription")}
          </Text>
          <Text style={styles.bodyText}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
          <Text style={styles.bodyText}>EXPO_PUBLIC_CONVEX_URL</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
