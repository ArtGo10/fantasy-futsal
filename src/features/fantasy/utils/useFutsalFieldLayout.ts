import { useWindowDimensions } from "react-native";

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
