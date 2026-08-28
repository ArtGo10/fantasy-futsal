import type { TranslationKey } from "../../../i18n/translations";
import { getFantasySeasonAssetKey } from "../assets/fantasyAssets";
import type { FantasySeasonVisualSource } from "./seasonVisuals";

type Translate = (key: TranslationKey) => string;

const SEASON_SUFFIX_PATTERN = /\b\d{4}\/\d{2}\b/;

function getSeasonSuffix(season: FantasySeasonVisualSource | null | undefined) {
  const value = season?.name ?? season?.displayName ?? season?.leagueName ?? "";
  return value.match(SEASON_SUFFIX_PATTERN)?.[0] ?? null;
}

function withSeasonSuffix(title: string, suffix: string | null) {
  return suffix ? `${title} ${suffix}` : title;
}

export function getFantasySeasonDisplayTitle(
  season: FantasySeasonVisualSource | null | undefined,
  t: Translate,
  fallback: string,
) {
  const assetKey = getFantasySeasonAssetKey(season);

  if (assetKey === "polish-ekstraklasa") {
    return t("competition.polishEkstraklasa.shortTitle");
  }

  if (assetKey === "extra-liga") {
    return t("competition.extraLiga.shortTitle");
  }

  return season?.displayName ?? season?.leagueName ?? season?.name ?? fallback;
}

export function getFantasySeasonDisplaySubtitle(
  season: FantasySeasonVisualSource | null | undefined,
  t: Translate,
  fallback?: string | null,
) {
  const assetKey = getFantasySeasonAssetKey(season);
  const suffix = getSeasonSuffix(season);

  if (assetKey === "polish-ekstraklasa") {
    return withSeasonSuffix(t("competition.polishEkstraklasa.seasonName"), suffix);
  }

  if (assetKey === "extra-liga") {
    return withSeasonSuffix(t("competition.extraLiga.seasonName"), suffix);
  }

  return fallback ?? season?.name ?? season?.displayName ?? season?.leagueName ?? "";
}
