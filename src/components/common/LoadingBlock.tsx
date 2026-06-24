import { ActivityIndicator, Text, View } from "react-native";

import { styles } from "../../styles";

export function LoadingBlock({ text = "Загрузка..." }: { text?: string }) {
  return (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="small" />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}
