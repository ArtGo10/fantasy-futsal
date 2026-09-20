import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Platform,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";

import {
  FUTSAL_FIELD_HORIZONTAL_IMAGE,
  FUTSAL_FIELD_IMAGE,
} from "../assets/fantasyAssets";

const PORTRAIT_FIELD = {
  aspectRatio: 631 / 755,
  isLandscape: false,
  source: FUTSAL_FIELD_IMAGE,
} as const;

const LANDSCAPE_FIELD = {
  aspectRatio: 755 / 459,
  isLandscape: true,
  source: FUTSAL_FIELD_HORIZONTAL_IMAGE,
} as const;

export function useFutsalFieldLayout() {
  const { width, height } = useWindowDimensions();
  return width > height ? LANDSCAPE_FIELD : PORTRAIT_FIELD;
}

export function useFutsalFieldSlotScale(isLandscape: boolean) {
  const fieldRef = useRef<View>(null);
  const [slotScale, setSlotScale] = useState(1);
  const updateScale = useCallback((height: number) => {
    if (height > 0) setSlotScale(Math.min(1, height / 300));
  }, []);
  const measureField = useCallback(() => {
    if (!isLandscape || Platform.OS !== "web") return;

    const node = fieldRef.current as unknown as {
      getBoundingClientRect?: () => DOMRect;
    } | null;
    const bounds = node?.getBoundingClientRect?.();
    if (bounds) updateScale(bounds.height);
  }, [isLandscape, updateScale]);

  // Size cards before paint when the wide pitch is rendered in a narrow panel.
  useLayoutEffect(() => {
    measureField();
  });

  function onFieldLayout(event: LayoutChangeEvent) {
    if (Platform.OS === "web") measureField();
    else updateScale(event.nativeEvent.layout.height);
  }

  return {
    fieldRef,
    onFieldLayout: isLandscape ? onFieldLayout : undefined,
    slotScale: isLandscape ? slotScale : 1,
  };
}
