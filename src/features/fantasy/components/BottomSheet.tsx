import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  useWindowDimensions,
  type ViewStyle,
  View,
} from "react-native";
import { X } from "lucide-react-native";

import { WEB_DESKTOP_MIN_WIDTH } from "../../../constants";
import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";

type BottomSheetProps = {
  children: ReactNode;
  onClose: () => void;
  onCloseEnd?: () => void;
  onOpenEnd?: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  contentScrollEnabled?: boolean;
  keyboardAvoidingEnabled?: boolean;
  visible: boolean;
};

const HIDDEN_SHEET_OFFSET = Dimensions.get("window").height;

export function BottomSheet({
  children,
  onClose,
  onCloseEnd,
  onOpenEnd,
  sheetStyle,
  contentScrollEnabled = true,
  keyboardAvoidingEnabled = false,
  visible,
}: BottomSheetProps) {
  const { width: windowWidth } = useWindowDimensions();
  const shouldUseDesktopModal =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const onCloseRef = useRef(onClose);
  const onCloseEndRef = useRef(onCloseEnd);
  const onOpenEndRef = useRef(onOpenEnd);
  const translateY = useRef(new Animated.Value(HIDDEN_SHEET_OFFSET)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const isMountedRef = useRef(visible);
  const [isMounted, setIsMounted] = useState(visible);
  const renderedChildrenRef = useRef(children);

  const setMounted = useCallback((nextIsMounted: boolean) => {
    isMountedRef.current = nextIsMounted;
    setIsMounted(nextIsMounted);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onCloseEndRef.current = onCloseEnd;
  }, [onCloseEnd]);

  useEffect(() => {
    onOpenEndRef.current = onOpenEnd;
  }, [onOpenEnd]);

  const animateToOpen = useCallback(
    (shouldReset = false) => {
      translateY.stopAnimation();
      backdropOpacity.stopAnimation();

      if (shouldReset) {
        translateY.setValue(HIDDEN_SHEET_OFFSET);
        backdropOpacity.setValue(0);
      }

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          damping: 24,
          mass: 0.9,
          stiffness: 230,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        isClosingRef.current = false;

        if (finished) {
          onOpenEndRef.current?.();
        }
      });
    },
    [backdropOpacity, translateY],
  );

  const animateToClosed = useCallback(
    (shouldNotifyParent: boolean) => {
      if (isClosingRef.current) return;

      isClosingRef.current = true;
      translateY.stopAnimation();
      backdropOpacity.stopAnimation();

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          duration: 170,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 210,
          easing: Easing.in(Easing.cubic),
          toValue: HIDDEN_SHEET_OFFSET,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
        isClosingRef.current = false;
        onCloseEndRef.current?.();

        if (shouldNotifyParent) {
          onCloseRef.current();
        }
      });
    },
    [backdropOpacity, setMounted, translateY],
  );

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setMounted(true);

      const frameId = requestAnimationFrame(() => animateToOpen(true));
      return () => cancelAnimationFrame(frameId);
    }

    if (isMountedRef.current) {
      animateToClosed(false);
    }

    return undefined;
  }, [animateToClosed, animateToOpen, setMounted, visible]);

  const requestClose = useCallback(() => {
    Keyboard.dismiss();
    animateToClosed(true);
  }, [animateToClosed]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 3 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation();
          backdropOpacity.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTranslateY = Math.max(0, gestureState.dy);
          translateY.setValue(nextTranslateY);
          backdropOpacity.setValue(Math.max(0.35, 1 - nextTranslateY / 520));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 72 || gestureState.vy > 0.7) {
            requestClose();
            return;
          }

          animateToOpen(false);
        },
        onPanResponderTerminate: () => {
          animateToOpen(false);
        },
      }),
    [animateToOpen, backdropOpacity, requestClose, translateY],
  );

  if (visible) {
    renderedChildrenRef.current = children;
  }

  if (!isMounted) return null;

  const sheetChildren = visible ? children : renderedChildrenRef.current;
  const desktopModalScale = backdropOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });
  const sheetContent = contentScrollEnabled ? (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.bottomSheetScrollContent}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      style={styles.bottomSheetScroll}
    >
      {sheetChildren}
    </ScrollView>
  ) : (
    sheetChildren
  );

  const modalContent = (
    <View
      style={[
        styles.modalBackdrop,
        shouldUseDesktopModal ? styles.modalBackdropDesktop : null,
      ]}
    >
      <Animated.View
        style={[styles.modalBackdropDim, { opacity: backdropOpacity }]}
      />
      <Pressable
        accessibilityRole="button"
        onPress={requestClose}
        style={styles.modalBackdropPressTarget}
      />
      {shouldUseDesktopModal ? (
        <Animated.View
          style={[
            styles.desktopModalDialog,
            sheetStyle,
            styles.desktopModalSurfaceOverride,
            {
              opacity: backdropOpacity,
              transform: [{ scale: desktopModalScale }],
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={requestClose}
            style={styles.desktopModalCloseButton}
          >
            <X color={colors.text.secondary} size={20} strokeWidth={2.5} />
          </Pressable>
          {sheetContent}
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.bottomSheet,
            sheetStyle,
            { transform: [{ translateY }] },
          ]}
        >
          <View
            {...panResponder.panHandlers}
            style={styles.bottomSheetDragHandleArea}
          >
            <View style={styles.bottomSheetDragHandle} />
          </View>
          {sheetContent}
        </Animated.View>
      )}
    </View>
  );

  return (
    <Modal
      animationType="none"
      onRequestClose={requestClose}
      transparent
      visible={isMounted}
    >
      {keyboardAvoidingEnabled ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.modalKeyboardAvoidingRoot}
        >
          {modalContent}
        </KeyboardAvoidingView>
      ) : (
        modalContent
      )}
    </Modal>
  );
}
