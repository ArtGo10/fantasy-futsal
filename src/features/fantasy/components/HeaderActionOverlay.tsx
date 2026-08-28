import { Pressable, Text, View } from "react-native";

import { styles } from "../../../styles";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export type HeaderActionOverlayConfig = {
  cancelLabel: string;
  confirmLabel: string;
  isConfirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function HeaderActionOverlay({
  config,
}: {
  config: HeaderActionOverlayConfig | null;
}) {
  const fantasyTheme = useFantasySeasonTheme();

  if (!config) return null;

  return (
    <View style={styles.headerActionOverlay}>
      <Pressable
        accessibilityRole="button"
        onPress={config.onCancel}
        style={styles.headerActionCancelButton}
      >
        <Text style={styles.headerActionCancelText}>{config.cancelLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={config.isConfirmDisabled}
        onPress={config.onConfirm}
        style={[
          styles.headerActionConfirmButton,
          { backgroundColor: fantasyTheme.primaryColor },
          config.isConfirmDisabled ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.headerActionConfirmText}>{config.confirmLabel}</Text>
      </Pressable>
    </View>
  );
}
