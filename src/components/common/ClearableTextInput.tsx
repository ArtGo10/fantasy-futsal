import { X } from "lucide-react-native";
import { forwardRef, type ReactNode, useState } from "react";
import {
  Pressable,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";

import { styles } from "../../styles";
import { colors } from "../../theme/tokens";

type ClearableTextInputProps = Omit<
  TextInputProps,
  "onChangeText" | "value"
> & {
  clearAccessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  onChangeText: (value: string) => void;
  rightAccessory?: ReactNode;
  rightAccessoryWidth?: number;
  style?: StyleProp<TextStyle>;
  value: string;
};

export const ClearableTextInput = forwardRef<
  TextInput,
  ClearableTextInputProps
>(function ClearableTextInput(
  {
    clearAccessibilityLabel = "Clear input",
    containerStyle,
    multiline,
    onBlur,
    onChangeText,
    onFocus,
    rightAccessory,
    rightAccessoryWidth = 0,
    style,
    value,
    ...inputProps
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const shouldShowClearButton = isFocused && value.length > 0;
  const reservedRightPadding = rightAccessoryWidth + 42;
  const handleClear = () => {
    if (value.length > 0) onChangeText("");
  };

  return (
    <View style={[styles.clearableInputContainer, containerStyle]}>
      <TextInput
        {...inputProps}
        ref={ref}
        multiline={multiline}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        style={[style, { paddingRight: reservedRightPadding }]}
        value={value}
      />
      {shouldShowClearButton ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={6}
          onPress={handleClear}
          onPressIn={handleClear}
          style={[
            styles.clearableInputButton,
            multiline ? styles.clearableInputButtonMultiline : null,
            { right: rightAccessoryWidth },
          ]}
        >
          <View style={styles.clearableInputIconBackground}>
            <X color={colors.text.secondary} size={14} strokeWidth={2.4} />
          </View>
        </Pressable>
      ) : null}
      {rightAccessory ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.clearableInputAccessory,
            { width: rightAccessoryWidth },
          ]}
        >
          {rightAccessory}
        </View>
      ) : null}
    </View>
  );
});
