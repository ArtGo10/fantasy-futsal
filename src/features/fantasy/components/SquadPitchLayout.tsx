import {
  Children,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform, View, type LayoutChangeEvent } from "react-native";

import { styles } from "../../../styles";
import { colors } from "../../../theme/tokens";
import { fitSquadPitch } from "../utils/fitSquadPitch";

export function SquadPitchLayout({
  aspectRatio,
  bench,
  children,
  fitToAvailableHeight = false,
  reserve,
  sideSlotHeight,
}: {
  aspectRatio: number;
  bench: ReactNode;
  children: ReactNode;
  fitToAvailableHeight?: boolean;
  reserve: ReactNode;
  sideSlotHeight: number;
}) {
  const viewportRef = useRef<View>(null);
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });
  const updateAvailableSize = useCallback((width: number, height: number) => {
    setAvailableSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);
  const measureViewport = useCallback(() => {
    if (Platform.OS !== "web") return;
    const node = viewportRef.current as unknown as HTMLElement | null;
    const bounds = node?.getBoundingClientRect?.();
    if (!bounds) return;
    updateAvailableSize(bounds.width, fitToAvailableHeight ? bounds.height : 0);
  }, [fitToAvailableHeight, updateAvailableSize]);

  function onViewportLayout(event: LayoutChangeEvent) {
    if (Platform.OS === "web") measureViewport();
    else {
      const { width, height } = event.nativeEvent.layout;
      updateAvailableSize(width, fitToAvailableHeight ? height : 0);
    }
  }

  // Measure before paint so the pitch never briefly renders at full page width.
  useLayoutEffect(() => {
    measureViewport();
  });

  const benchCount = Children.count(bench);
  const benchStyle = styles.futsalBenchRail;
  const reserveStyle = styles.futsalReserveRail;
  const fitted = fitSquadPitch({
    availableWidth: availableSize.width,
    availableHeight: fitToAvailableHeight ? availableSize.height : undefined,
    aspectRatio,
    sideWidth: benchStyle.width,
    bottomHeight:
      sideSlotHeight +
      reserveStyle.paddingVertical * 2 +
      reserveStyle.borderWidth * 2 +
      styles.futsalSquadLayout.gap,
    minimumFieldHeight:
      Math.max(sideSlotHeight, styles.futsalBenchSlotWrap.minHeight) *
        benchCount +
      benchStyle.gap * Math.max(0, benchCount - 1) +
      benchStyle.paddingTop +
      benchStyle.paddingBottom +
      benchStyle.borderWidth * 2,
  });

  const pitch = (
    <View
      style={[
        styles.futsalSquadLayout,
        styles.teamBuilderDesktopFittedField,
        {
          width: fitted.width,
          height: fitted.height,
          transform: [{ scale: fitted.scale }],
        },
      ]}
    >
      <View style={styles.futsalSquadMainRow}>
        {children}
        <View style={[benchStyle, { backgroundColor: colors.brand.blueDark }]}>
          {bench}
        </View>
      </View>
      <View
        style={[
          reserveStyle,
          {
            backgroundColor: colors.brand.blueDark,
            marginRight: benchStyle.width,
          },
        ]}
      >
        {reserve}
      </View>
    </View>
  );

  return (
    <View
      ref={viewportRef}
      onLayout={onViewportLayout}
      style={[
        { width: "100%", alignItems: "center" },
        fitToAvailableHeight ? styles.squadPitchViewportDesktop : null,
      ]}
    >
      <View
        style={{
          width: fitted.width * fitted.scale,
          height: fitted.height * fitted.scale,
        }}
      >
        {pitch}
      </View>
    </View>
  );
}
