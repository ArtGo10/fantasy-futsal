import { Check, ChevronDown } from "lucide-react-native";
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing, typography } from "../../../theme/tokens";
import { colorWithAlpha } from "../utils/seasonVisuals";
import { useFantasySeasonTheme } from "../utils/seasonThemeContext";

export type DesktopSelectOption = {
  disabled?: boolean;
  label: string;
  leading?: ReactNode;
  value: string;
};

type DesktopSelectProps = {
  accessibilityLabel: string;
  onValueChange: (value: string) => void;
  options: DesktopSelectOption[];
  style?: StyleProp<ViewStyle>;
  value: string;
};

const SELECT_ROOT_STYLE = {
  position: "relative",
} as const;

const SELECT_ROOT_OPEN_STYLE = {
  zIndex: 30000,
  elevation: 30000,
} as const;

const SELECT_BUTTON_STYLE = {
  width: "100%",
  minHeight: 48,
  borderWidth: 1,
  borderColor: colors.border.strong,
  borderRadius: radii.md,
  backgroundColor: colors.surface,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.sm,
  boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.04)",
  cursor: "pointer",
} as const;

const SELECT_BUTTON_OPEN_STYLE = {
  borderColor: colors.brand.blue,
  backgroundColor: "#FBFDFF",
  boxShadow: "0px 0px 0px 3px rgba(33, 113, 184, 0.12)",
} as const;

const SELECT_BUTTON_PRESSED_STYLE = {
  backgroundColor: colors.brand.blueSoft,
} as const;

const SELECT_LABEL_ROW_STYLE = {
  flex: 1,
  minWidth: 0,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
} as const;

const SELECT_OPTION_LEADING_STYLE = {
  flexShrink: 0,
} as const;

const SELECT_LABEL_STYLE = {
  flex: 1,
  minWidth: 0,
  color: colors.text.primary,
  fontSize: typography.size.base,
  fontWeight: typography.weight.bold,
  lineHeight: typography.lineHeight.base,
} as const;

const SELECT_CHEVRON_STYLE = {
  width: 30,
  height: 30,
  borderRadius: radii.pill,
  backgroundColor: colors.brand.blueSoft,
  alignItems: "center",
  justifyContent: "center",
} as const;

const SELECT_CHEVRON_OPEN_STYLE = {
  transform: [{ rotate: "180deg" }],
} as const;

const SELECT_MENU_MAX_HEIGHT = 280;
const SELECT_MENU_VERTICAL_GAP = spacing.xs;
const SELECT_OPTION_ESTIMATED_HEIGHT = 43;

const SELECT_MENU_STYLE = {
  position: "absolute",
  left: 0,
  right: 0,
  zIndex: 30001,
  elevation: 30001,
  borderWidth: 1,
  borderColor: colors.border.strong,
  borderRadius: radii.lg,
  backgroundColor: colors.surface,
  overflow: "hidden",
  boxShadow: "0px 16px 34px rgba(15, 23, 42, 0.16)",
} as const;

const SELECT_MENU_DOWN_STYLE = {
  top: "100%",
  marginTop: SELECT_MENU_VERTICAL_GAP,
} as const;

const SELECT_MENU_UP_STYLE = {
  bottom: "100%",
  marginBottom: SELECT_MENU_VERTICAL_GAP,
} as const;

const SELECT_MENU_SCROLL_STYLE = {
  maxHeight: SELECT_MENU_MAX_HEIGHT,
} as const;

const SELECT_OPTION_STYLE = {
  minHeight: 42,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border.default,
  cursor: "pointer",
} as const;

const SELECT_OPTION_SELECTED_STYLE = {
  backgroundColor: colors.brand.blueSoft,
} as const;

const SELECT_OPTION_PRESSED_STYLE = {
  backgroundColor: "#DCEBFF",
} as const;

const SELECT_OPTION_DISABLED_STYLE = {
  opacity: 0.45,
} as const;

const SELECT_OPTION_CHECK_STYLE = {
  width: 22,
  height: 22,
  borderRadius: radii.pill,
  alignItems: "center",
  justifyContent: "center",
} as const;

const SELECT_OPTION_CHECK_ACTIVE_STYLE = {
  backgroundColor: colors.brand.blue,
} as const;

const SELECT_OPTION_TEXT_STYLE = {
  flex: 1,
  minWidth: 0,
  color: colors.text.secondary,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.bold,
  lineHeight: typography.lineHeight.sm,
} as const;

const SELECT_OPTION_TEXT_SELECTED_STYLE = {
  color: colors.brand.blueDark,
  fontWeight: typography.weight.black,
} as const;

export function DesktopSelect({
  accessibilityLabel,
  onValueChange,
  options,
  style,
  value,
}: DesktopSelectProps) {
  const fantasyTheme = useFantasySeasonTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<View>(null);
  const [menuPlacement, setMenuPlacement] = useState<"down" | "up">("down");
  const [menuMaxHeight, setMenuMaxHeight] = useState(SELECT_MENU_MAX_HEIGHT);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );
  const updateMenuPlacement = useCallback(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const rootNode = rootRef.current as unknown as {
      getBoundingClientRect?: () => DOMRect;
    } | null;
    const rect = rootNode?.getBoundingClientRect?.();
    if (!rect) return;

    const estimatedMenuHeight = Math.min(
      SELECT_MENU_MAX_HEIGHT,
      Math.max(
        SELECT_OPTION_ESTIMATED_HEIGHT,
        options.length * SELECT_OPTION_ESTIMATED_HEIGHT,
      ),
    );
    const bottomSpace = window.innerHeight - rect.bottom;
    const topSpace = rect.top;
    const shouldOpenUp =
      bottomSpace < estimatedMenuHeight + SELECT_MENU_VERTICAL_GAP &&
      topSpace > bottomSpace;
    const availableSpace = shouldOpenUp ? topSpace : bottomSpace;

    setMenuPlacement(shouldOpenUp ? "up" : "down");
    setMenuMaxHeight(
      Math.min(
        SELECT_MENU_MAX_HEIGHT,
        Math.max(
          SELECT_OPTION_ESTIMATED_HEIGHT,
          availableSpace - SELECT_MENU_VERTICAL_GAP - spacing.sm,
        ),
      ),
    );
  }, [options.length]);

  useEffect(() => {
    if (!isOpen || Platform.OS !== "web") return undefined;

    updateMenuPlacement();

    if (typeof window === "undefined") return undefined;

    const animationFrame = window.requestAnimationFrame(updateMenuPlacement);
    const handleViewportChange = () => updateMenuPlacement();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updateMenuPlacement]);

  useEffect(() => {
    if (!isOpen || Platform.OS !== "web" || typeof document === "undefined")
      return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const rootNode = rootRef.current as unknown as {
        contains?: (target: EventTarget | null) => boolean;
      } | null;

      if (rootNode?.contains?.(event.target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (Platform.OS !== "web") return null;

  return (
    <View
      collapsable={false}
      ref={rootRef}
      style={[SELECT_ROOT_STYLE, style, isOpen ? SELECT_ROOT_OPEN_STYLE : null]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => {
          if (!isOpen) {
            updateMenuPlacement();
          }
          setIsOpen((current) => !current);
        }}
        style={({ pressed }) => [
          SELECT_BUTTON_STYLE,
          isOpen
            ? [
                SELECT_BUTTON_OPEN_STYLE,
                {
                  borderColor: fantasyTheme.primaryColor,
                  boxShadow: `0px 0px 0px 3px ${colorWithAlpha(
                    fantasyTheme.primaryColor,
                    0.12,
                  )}`,
                },
              ]
            : null,
          pressed
            ? [
                SELECT_BUTTON_PRESSED_STYLE,
                { backgroundColor: fantasyTheme.softColor },
              ]
            : null,
        ]}
      >
        <View style={SELECT_LABEL_ROW_STYLE}>
          {selectedOption?.leading ? (
            <View style={SELECT_OPTION_LEADING_STYLE}>
              {selectedOption.leading}
            </View>
          ) : null}
          <Text numberOfLines={1} style={SELECT_LABEL_STYLE}>
            {selectedOption?.label ?? ""}
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            SELECT_CHEVRON_STYLE,
            { backgroundColor: fantasyTheme.softColor },
            isOpen ? SELECT_CHEVRON_OPEN_STYLE : null,
          ]}
        >
          <ChevronDown
            color={fantasyTheme.primaryColor}
            size={18}
            strokeWidth={3}
          />
        </View>
      </Pressable>

      {isOpen ? (
        <View
          style={[
            SELECT_MENU_STYLE,
            menuPlacement === "up"
              ? SELECT_MENU_UP_STYLE
              : SELECT_MENU_DOWN_STYLE,
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={[SELECT_MENU_SCROLL_STYLE, { maxHeight: menuMaxHeight }]}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: option.disabled,
                    selected: isSelected,
                  }}
                  disabled={option.disabled}
                  key={option.value}
                  onPress={() => {
                    setIsOpen(false);
                    onValueChange(option.value);
                  }}
                  style={({ pressed }) => [
                    SELECT_OPTION_STYLE,
                    isSelected
                      ? [
                          SELECT_OPTION_SELECTED_STYLE,
                          { backgroundColor: fantasyTheme.softColor },
                        ]
                      : null,
                    pressed && !option.disabled
                      ? [
                          SELECT_OPTION_PRESSED_STYLE,
                          {
                            backgroundColor: colorWithAlpha(
                              fantasyTheme.primaryColor,
                              0.14,
                            ),
                          },
                        ]
                      : null,
                    option.disabled ? SELECT_OPTION_DISABLED_STYLE : null,
                  ]}
                >
                  {option.leading ? (
                    <View style={SELECT_OPTION_LEADING_STYLE}>
                      {option.leading}
                    </View>
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[
                      SELECT_OPTION_TEXT_STYLE,
                      isSelected ? SELECT_OPTION_TEXT_SELECTED_STYLE : null,
                      isSelected ? { color: fantasyTheme.primaryColor } : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      SELECT_OPTION_CHECK_STYLE,
                      isSelected ? SELECT_OPTION_CHECK_ACTIVE_STYLE : null,
                      isSelected
                        ? { backgroundColor: fantasyTheme.primaryColor }
                        : null,
                    ]}
                  >
                    {isSelected ? (
                      <Check
                        color={colors.text.inverse}
                        size={14}
                        strokeWidth={3}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
