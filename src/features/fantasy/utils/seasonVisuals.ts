import { colors } from "../../../theme/tokens";
import { getFantasySeasonAssetKey } from "../assets/fantasyAssets";

export type FantasySeasonVisualTheme = {
  accentColor?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export type FantasySeasonVisualSource = {
  displayName?: string | null;
  leagueName?: string | null;
  logoKey?: string | null;
  name?: string | null;
  slug?: string | null;
  theme?: FantasySeasonVisualTheme | null;
};

export function isPolishEkstraklasaSeason(
  season: FantasySeasonVisualSource | null | undefined,
) {
  return getFantasySeasonAssetKey(season) === "polish-ekstraklasa";
}

export function colorWithAlpha(color: string, alpha: number) {
  const trimmedColor = color.trim();
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const hexMatch = /^#([a-f0-9]{6})$/i.exec(trimmedColor);

  if (!hexMatch) return trimmedColor;

  const value = hexMatch[1];
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
}

export function getFantasySeasonPrimaryColor(
  season: FantasySeasonVisualSource | null | undefined,
) {
  if (isPolishEkstraklasaSeason(season)) {
    return season?.theme?.primaryColor ?? colors.brand.polishRed;
  }

  return season?.theme?.primaryColor ?? colors.brand.blueDark;
}

export function getFantasySeasonSecondaryColor(
  season: FantasySeasonVisualSource | null | undefined,
) {
  if (isPolishEkstraklasaSeason(season)) {
    const secondaryColor = season?.theme?.secondaryColor;
    return secondaryColor && secondaryColor !== colors.brand.blue
      ? secondaryColor
      : colors.brand.polishRedDark;
  }

  return season?.theme?.secondaryColor ?? colors.brand.blue;
}

export function getFantasySeasonAccentColor(
  season: FantasySeasonVisualSource | null | undefined,
) {
  const primaryColor = getFantasySeasonPrimaryColor(season);

  if (isPolishEkstraklasaSeason(season)) {
    const accentColor = season?.theme?.accentColor;
    return accentColor && accentColor !== colors.brand.yellow
      ? accentColor
      : primaryColor;
  }

  return season?.theme?.accentColor ?? colors.brand.yellow;
}

export function getFantasySeasonSoftColor(
  season: FantasySeasonVisualSource | null | undefined,
) {
  if (isPolishEkstraklasaSeason(season)) return colors.brand.polishRedSoft;

  return colors.brand.blueSoft;
}
