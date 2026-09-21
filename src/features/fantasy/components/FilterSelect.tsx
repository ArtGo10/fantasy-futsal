import { Check, ChevronDown } from "lucide-react-native";
import { type ReactNode, useEffect } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { colors, radii, spacing, typography } from "../../../theme/tokens";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export type FilterSelectOption = {
  disabled?: boolean;
  label: string;
  menuLabel?: string;
  leading?: ReactNode;
  secondaryLabel?: string;
  value: string;
};

export function FilterSelectButton({
  accessibilityLabel,
  active = false,
  expanded = false,
  label,
  leading,
  onPress,
  style,
}: {
  accessibilityLabel: string;
  active?: boolean;
  expanded?: boolean;
  label: string;
  leading?: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useFantasySeasonTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= WEB_DESKTOP_MIN_WIDTH;
  const foreground = active ? colors.text.inverse : theme.primaryColor;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      aria-expanded={expanded}
      onPress={onPress}
      style={({ pressed }) => [
        selectStyles.button,
        desktop && selectStyles.desktopButton,
        style,
        {
          backgroundColor: active ? theme.primaryColor : colors.surface,
          borderColor:
            active || expanded ? theme.primaryColor : colors.border.default,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {leading}
      <Text
        numberOfLines={1}
        style={[
          selectStyles.label,
          width < 360 && selectStyles.narrowLabel,
          desktop && selectStyles.desktopLabel,
          { color: foreground },
        ]}
      >
        {label}
      </Text>
      <View
        pointerEvents="none"
        style={[
          selectStyles.chevron,
          expanded && { transform: [{ rotate: "180deg" }] },
        ]}
      >
        <ChevronDown color={foreground} size={18} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

// Shared by inline mobile lists and anchored desktop dropdowns.
export function FilterSelectMenu({
  accessibilityLabel,
  footer,
  maxHeight = 246,
  onClose,
  onValueChange,
  options,
  value,
}: {
  accessibilityLabel: string;
  footer?: ReactNode;
  maxHeight?: number;
  onClose: () => void;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  value: string;
}) {
  const theme = useFantasySeasonTheme();
  useEffect(() => {
    if (Platform.OS === "web") {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);

  return (
    <View style={selectStyles.menu}>
      <ScrollView
        accessibilityLabel={accessibilityLabel}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight }}
        contentContainerStyle={selectStyles.options}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{
                selected,
                disabled: Boolean(option.disabled),
              }}
              {...(Platform.OS === "web" ? { "aria-selected": selected } : {})}
              disabled={option.disabled}
              onPress={() => {
                onValueChange(option.value);
                onClose();
              }}
              style={({ pressed }) => [
                selectStyles.option,
                selected && {
                  backgroundColor: theme.softColor,
                  borderColor: theme.borderColor,
                },
                (option.disabled || pressed) && {
                  opacity: option.disabled ? 0.45 : 0.8,
                },
              ]}
            >
              {option.leading}
              <View style={selectStyles.optionBody}>
                <Text style={selectStyles.optionLabel}>
                  {option.menuLabel ?? option.label}
                </Text>
                {option.secondaryLabel ? (
                  <Text style={selectStyles.meta}>{option.secondaryLabel}</Text>
                ) : null}
              </View>
              {selected ? (
                <Check color={theme.primaryColor} size={22} strokeWidth={2.8} />
              ) : (
                <View style={selectStyles.radio} />
              )}
            </Pressable>
          );
        })}
        {footer}
      </ScrollView>
    </View>
  );
}

const selectStyles = StyleSheet.create({
  button: {
    minWidth: 0,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  desktopButton: {
    minHeight: 48,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  label: {
    flexShrink: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  narrowLabel: { fontSize: typography.size.xs },
  desktopLabel: {
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
  },
  chevron: { width: 18, height: 18, flexShrink: 0 },
  menu: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.xs,
  },
  options: { gap: spacing.xs },
  option: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  optionLabel: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  meta: { color: colors.text.muted, fontSize: typography.size.xs },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border.strong,
    borderRadius: radii.pill,
  },
});
