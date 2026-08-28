import { createContext, useContext, useMemo, type ReactNode } from "react";

import { colors } from "../../../theme/tokens";
import {
  colorWithAlpha,
  getFantasySeasonAccentColor,
  getFantasySeasonPrimaryColor,
  getFantasySeasonSecondaryColor,
  getFantasySeasonSoftColor,
  isPolishEkstraklasaSeason,
  type FantasySeasonVisualSource,
} from "./seasonVisuals";

type FantasySeasonThemeContextValue = {
  accentColor: string;
  borderColor: string;
  isPolishSeason: boolean;
  primaryColor: string;
  secondaryColor: string;
  softColor: string;
};

const DEFAULT_THEME: FantasySeasonThemeContextValue = {
  accentColor: colors.brand.yellow,
  borderColor: colors.border.strong,
  isPolishSeason: false,
  primaryColor: colors.brand.blueDark,
  secondaryColor: colors.brand.blue,
  softColor: colors.brand.blueSoft,
};

const FantasySeasonThemeContext =
  createContext<FantasySeasonThemeContextValue>(DEFAULT_THEME);

export function FantasySeasonThemeProvider({
  children,
  season,
}: {
  children: ReactNode;
  season?: FantasySeasonVisualSource | null;
}) {
  const value = useMemo(() => {
    const primaryColor = getFantasySeasonPrimaryColor(season);

    return {
      accentColor: getFantasySeasonAccentColor(season),
      borderColor: colorWithAlpha(primaryColor, 0.32),
      isPolishSeason: isPolishEkstraklasaSeason(season),
      primaryColor,
      secondaryColor: getFantasySeasonSecondaryColor(season),
      softColor: getFantasySeasonSoftColor(season),
    };
  }, [season]);

  return (
    <FantasySeasonThemeContext.Provider value={value}>
      {children}
    </FantasySeasonThemeContext.Provider>
  );
}

export function useFantasySeasonTheme() {
  return useContext(FantasySeasonThemeContext);
}
