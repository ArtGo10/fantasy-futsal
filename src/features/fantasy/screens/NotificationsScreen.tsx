import { Pressable, Text, View } from "react-native";
import { BellOff, ChevronLeft } from "lucide-react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();

  return (
    <View style={styles.notificationsScreen}>
      <View style={styles.notificationsHeader}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.notificationsBackButton}
        >
          <ChevronLeft color={colors.brand.blue} size={26} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.notificationsTitle}>{t("notifications.title")}</Text>
        <View style={styles.notificationsHeaderSpacer} />
      </View>

      <View style={styles.notificationsEmptyState}>
        <View style={styles.notificationsEmptyIconWrap}>
          <BellOff color={colors.text.inverse} size={44} strokeWidth={2.4} />
        </View>
        <Text style={styles.notificationsEmptyTitle}>{t("notifications.emptyTitle")}</Text>
        <Text style={styles.notificationsEmptyText}>{t("notifications.emptyDescription")}</Text>
      </View>
    </View>
  );
}
