import { useEffect, useRef } from "react";
import { Animated, Easing, type ImageStyle, type StyleProp } from "react-native";

import fantasyFutsalAppIcon from "../../../assets/fantasy-futsal-big-icon.png";

const PULSE_DURATION_MS = 1150;

export function LoadingLogo({ style }: { style?: StyleProp<ImageStyle> }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulse]);

  const animatedStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.58, 1],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.04],
        }),
      },
      {
        rotate: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: ["-2deg", "2deg"],
        }),
      },
    ],
  };

  return (
    <Animated.Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={fantasyFutsalAppIcon}
      style={[style, animatedStyle]}
    />
  );
}
