import {
  Children,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";

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
  const measureViewport = useCallback(() => {
    if (!fitToAvailableHeight) return;
    const node = viewportRef.current as unknown as HTMLElement | null;
    const bounds = node?.getBoundingClientRect?.();
    if (!bounds) return;
    setAvailableSize((previous) =>
      previous.width === bounds.width && previous.height === bounds.height
        ? previous
        : { width: bounds.width, height: bounds.height },
    );
  }, [fitToAvailableHeight]);

  // Measure before paint so the pitch never briefly renders at full page width.
  useLayoutEffect(() => {
    measureViewport();
  });

  const benchCount = Children.count(bench);
  const benchStyle = styles.futsalBenchRail;
  const reserveStyle = styles.futsalReserveRail;
  const fitted = fitSquadPitch({
    availableWidth: availableSize.width,
    availableHeight: availableSize.height,
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
        fitToAvailableHeight
          ? [
              styles.teamBuilderDesktopFittedField,
              {
                width: fitted.width,
                height: fitted.height,
                transform: [{ scale: fitted.scale }],
              },
            ]
          : null,
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

  if (!fitToAvailableHeight) return pitch;

  return (
    <View
      ref={viewportRef}
      onLayout={measureViewport}
      style={styles.squadPitchViewportDesktop}
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
