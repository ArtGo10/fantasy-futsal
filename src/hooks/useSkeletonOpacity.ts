import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

export function useSkeletonOpacity() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const updateMotion = (reducedMotion: boolean) => {
      if (!active) return;
      animation?.stop();
      opacity.setValue(1);
      if (reducedMotion) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5, duration: 900, easing: Easing.inOut(Easing.quad),
          useNativeDriver: true, isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad),
          useNativeDriver: true, isInteraction: false,
        }),
      ]));
      animation.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(updateMotion, () => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", updateMotion);
    return () => {
      active = false;
      animation?.stop();
      subscription?.remove();
    };
  }, [opacity]);
  return opacity;
}
