import { Text, View } from "react-native";

import { styles } from "../../styles";
import { LoadingLogo } from "./LoadingLogo";

export function LoadingBlock({ text }: { text?: string | null }) {
  return (
    <View style={styles.centerBlock}>
      <LoadingLogo style={styles.inlineLoadingLogo} />
      {text ? <Text style={styles.mutedText}>{text}</Text> : null}
    </View>
  );
}
