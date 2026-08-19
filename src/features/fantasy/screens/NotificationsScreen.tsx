import { useMutation, useQuery } from "convex/react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { BellOff, BellRing, CheckCheck, ChevronLeft } from "lucide-react-native";

import { useI18n } from "../../../i18n/I18nProvider";
import type { LanguageCode } from "../../../i18n/translations";
import { api } from "../../../lib/convexApi";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";

const LANGUAGE_LOCALES: Record<LanguageCode, string> = {
  en: "en-US",
  uk: "uk-UA",
};

function formatNotificationDate(value: number, language: LanguageCode) {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { language, t } = useI18n();
  const notifications = useQuery(api.notifications.listCurrentUserNotifications, {
    limit: 50,
  });
  const markNotificationRead = useMutation(
    api.notifications.markCurrentUserNotificationRead,
  );
  const markAllNotificationsRead = useMutation(
    api.notifications.markAllCurrentUserNotificationsRead,
  );

  const unreadCount = notifications?.unreadCount ?? 0;

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
        {unreadCount > 0 ? (
          <Pressable
            accessibilityLabel={t("notifications.markAllRead")}
            accessibilityRole="button"
            onPress={() => void markAllNotificationsRead({})}
            style={styles.notificationsHeaderAction}
          >
            <CheckCheck color={colors.brand.blue} size={20} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={styles.notificationsHeaderSpacer} />
        )}
      </View>

      {notifications === undefined ? (
        <View style={styles.notificationsLoadingState}>
          <ActivityIndicator color={colors.brand.blue} />
          <Text style={styles.notificationsEmptyText}>
            {t("notifications.loading")}
          </Text>
        </View>
      ) : notifications.items.length === 0 ? (
        <View style={styles.notificationsEmptyState}>
          <View style={styles.notificationsEmptyIconWrap}>
            <BellOff color={colors.text.inverse} size={44} strokeWidth={2.4} />
          </View>
          <Text style={styles.notificationsEmptyTitle}>
            {t("notifications.emptyTitle")}
          </Text>
          <Text style={styles.notificationsEmptyText}>
            {t("notifications.emptyDescription")}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.notificationsListContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.items.map((notification) => {
            const isUnread = notification.readAt === null;

            return (
              <Pressable
                accessibilityRole="button"
                key={notification.id}
                onPress={() => {
                  if (!isUnread) return;
                  void markNotificationRead({
                    notificationId: notification.id,
                  });
                }}
                style={[
                  styles.notificationCard,
                  isUnread ? styles.notificationCardUnread : null,
                ]}
              >
                <View
                  style={[
                    styles.notificationIconWrap,
                    isUnread ? styles.notificationIconWrapUnread : null,
                  ]}
                >
                  <BellRing
                    color={isUnread ? colors.text.inverse : colors.brand.blue}
                    size={20}
                    strokeWidth={2.4}
                  />
                </View>
                <View style={styles.notificationCardTextGroup}>
                  <View style={styles.notificationCardHeader}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.notificationCardTitle,
                        isUnread ? styles.notificationCardTitleUnread : null,
                      ]}
                    >
                      {notification.title}
                    </Text>
                    {isUnread ? (
                      <View style={styles.notificationUnreadPill}>
                        <Text style={styles.notificationUnreadPillText}>
                          {t("notifications.unread")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.notificationCardBody}>
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationCardTime}>
                    {formatNotificationDate(notification.sentAt, language)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
