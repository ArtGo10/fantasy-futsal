import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { styles } from "../../styles";

export function MissingEnv() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.title}>Нужно настроить окружение</Text>
          <Text style={styles.bodyText}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
          <Text style={styles.bodyText}>EXPO_PUBLIC_CONVEX_URL</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
