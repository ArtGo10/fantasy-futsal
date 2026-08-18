import { Text, View } from "react-native";

import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";
import { LoadingLogo } from "./LoadingLogo";

export function LoadingBlock({ text }: { text?: string }) {
  const { t } = useI18n();

  return (
    <View style={styles.centerBlock}>
      <LoadingLogo style={styles.inlineLoadingLogo} />
      <Text style={styles.mutedText}>{text ?? t("common.loading")}</Text>
    </View>
  );
}
