import { RotateCcw } from "lucide-react-native";
import { Platform, Pressable, Text, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { useI18n } from "../../../i18n/I18nProvider";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export function FilterResetButton({
  compact = false,
  disabled,
  onPress,
  style,
}: {
  compact?: boolean;
  disabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const fantasyTheme = useFantasySeasonTheme();
  const { width } = useWindowDimensions();
  const isCompact = compact || Platform.OS !== "web" || width < WEB_DESKTOP_MIN_WIDTH;

  return (
    <Pressable
      {...(Platform.OS === "web" ? { title: t("season.reset") } : {})}
      accessibilityRole="button"
      accessibilityLabel={t("season.reset")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.seasonResetButton,
        isCompact ? styles.filterResetButtonCompact : null,
        disabled ? styles.seasonResetButtonDisabled : null,
        style,
      ]}
    >
      {!isCompact ? (
        <Text
          numberOfLines={1}
          style={[
            styles.seasonResetText,
            disabled ? styles.seasonResetTextDisabled : null,
          ]}
        >
          {t("season.reset")}
        </Text>
      ) : null}
      <RotateCcw
        color={disabled ? colors.text.muted : fantasyTheme.primaryColor}
        size={isCompact ? 18 : 16}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}
