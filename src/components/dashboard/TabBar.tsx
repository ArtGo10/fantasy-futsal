import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";

export function TabBar<TabId extends string>({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: TabId;
  tabs: Array<{ id: TabId; label: string }>;
  onChange: (tab: TabId) => void;
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
