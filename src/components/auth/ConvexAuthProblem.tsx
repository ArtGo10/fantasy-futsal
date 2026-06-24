import { useClerk } from "@clerk/clerk-expo";
import { Pressable, Text, View } from "react-native";

import { styles } from "../../styles";
import { LoadingBlock } from "../common/LoadingBlock";

export function ConvexAuthProblem() {
  const { signOut } = useClerk();

  return (
    <View style={styles.authShell}>
      <View style={styles.panel}>
        <LoadingBlock text="Подключаем профиль..." />
        <Text style={styles.mutedText}>
          Если экран не обновляется дольше минуты, проверьте интернет или попробуйте выйти и войти снова.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Выйти и войти снова</Text>
        </Pressable>
      </View>
    </View>
  );
}
