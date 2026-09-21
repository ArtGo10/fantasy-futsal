import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";

import { spacing } from "../../../theme/tokens";
import {
  FilterSelectButton,
  FilterSelectMenu,
  type FilterSelectOption,
} from "./FilterSelect";

export type DesktopSelectOption = FilterSelectOption;

type DesktopSelectProps = {
  accessibilityLabel: string;
  active?: boolean;
  onValueChange: (value: string) => void;
  options: DesktopSelectOption[];
  style?: StyleProp<ViewStyle>;
  value: string;
};

const SELECT_ROOT_STYLE = { position: "relative" } as const;
const SELECT_ROOT_OPEN_STYLE = { zIndex: 30000, elevation: 30000 } as const;
const SELECT_MENU_MAX_HEIGHT = 280;
const SELECT_MENU_VERTICAL_GAP = spacing.xs;
const SELECT_OPTION_ESTIMATED_HEIGHT = 56;
const SELECT_MENU_STYLE = {
  position: "absolute",
  left: 0,
  right: 0,
  zIndex: 30001,
  elevation: 30001,
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

export function DesktopSelect({
  accessibilityLabel,
  active = false,
  onValueChange,
  options,
  style,
  value,
}: DesktopSelectProps) {
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

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  if (Platform.OS !== "web") return null;

  return (
    <View
      collapsable={false}
      ref={rootRef}
      style={[SELECT_ROOT_STYLE, style, isOpen ? SELECT_ROOT_OPEN_STYLE : null]}
    >
      <FilterSelectButton
        accessibilityLabel={accessibilityLabel}
        active={active}
        expanded={isOpen}
        label={selectedOption?.label ?? ""}
        leading={selectedOption?.leading}
        onPress={() => {
          if (!isOpen) updateMenuPlacement();
          setIsOpen((current) => !current);
        }}
      />
      {isOpen ? (
        <View
          style={[
            SELECT_MENU_STYLE,
            menuPlacement === "up"
              ? SELECT_MENU_UP_STYLE
              : SELECT_MENU_DOWN_STYLE,
          ]}
        >
          <FilterSelectMenu
            accessibilityLabel={accessibilityLabel}
            maxHeight={menuMaxHeight}
            onClose={() => setIsOpen(false)}
            onValueChange={onValueChange}
            options={options}
            value={value}
          />
        </View>
      ) : null}
    </View>
  );
}
