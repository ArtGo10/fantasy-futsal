import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { CalendarDays, ShoppingBag, Trophy, User, UsersRound } from "lucide-react-native";

import { useI18n } from "../../i18n/I18nProvider";
import type { TranslationKey } from "../../i18n/translations";
import { styles } from "../../styles";
import { colors } from "../../theme/tokens";
import type { FantasyTab, FantasyTabId } from "./types";

const TAB_LABEL_KEYS: Record<FantasyTabId, TranslationKey> = {
  season: "tabs.season",
  league: "tabs.league",
  market: "tabs.market",
  profile: "tabs.profile",
  team: "tabs.team",
};

type TabIconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

const TAB_ICONS: Record<FantasyTabId, TabIconComponent> = {
  season: CalendarDays,
  league: Trophy,
  market: ShoppingBag,
  profile: User,
  team: UsersRound,
};

export function FantasyBottomTabs({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: FantasyTabId;
  onChange: (tab: FantasyTabId) => void;
  tabs: FantasyTab[];
}) {
  const { t } = useI18n();

  return (
    <View style={styles.fantasyBottomTabs}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const label = t(TAB_LABEL_KEYS[tab.id]);
        const Icon = TAB_ICONS[tab.id];
        const iconColor = isActive ? colors.brand.blue : colors.text.muted;

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.fantasyBottomTabButton, isActive ? styles.fantasyBottomTabButtonActive : null]}
          >
            <Icon color={iconColor} size={22} strokeWidth={2.4} />
            <Text numberOfLines={1} style={isActive ? styles.fantasyBottomTabTextActive : styles.fantasyBottomTabText}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
