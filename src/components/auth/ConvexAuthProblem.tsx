import { useClerk } from "@clerk/expo";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "../../i18n/I18nProvider";
import { styles } from "../../styles";
import { LoadingBlock } from "../common/LoadingBlock";

export function ConvexAuthProblem() {
  const { signOut } = useClerk();
  const { t } = useI18n();

  return (
    <View style={styles.authShell}>
      <View style={styles.panel}>
        <LoadingBlock text={t("session.connectingProfile")} />
        <Text style={styles.mutedText}>{t("session.authProblemLong")}</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => void signOut()}
        >
          <Text style={styles.secondaryButtonText}>
            {t("session.signOutAndTryAgain")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
