import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";
import type { DashboardTab } from "../../types";

export function TabBar({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: DashboardTab;
  tabs: Array<{ id: DashboardTab; label: string }>;
  onChange: (tab: DashboardTab) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Pressable
            key={tab.id}
            style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
            onPress={() => onChange(tab.id)}
          >
            <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
