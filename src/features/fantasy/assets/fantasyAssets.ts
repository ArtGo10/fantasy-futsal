import { Asset } from "expo-asset";

export type PlayerPosition = "goalkeeper" | "universal";

export const FANTASY_STATIC_IMAGE_PROPS = {
  accessibilityIgnoresInvertColors: true,
  cachePolicy: "memory-disk",
  priority: "high",
  transition: 0,
} as const;

export const APP_SPLASH_IMAGE = require("../../../../assets/fantasy-futsal-splash.png");
export const APP_BRAND_ICON_IMAGE = require("../../../../assets/fantasy-futsal-big-icon.png");
export const APP_ICON_IMAGE = require("../../../../assets/app-icon.png");
export const EXTRA_LIGA_HEADER_ICON_IMAGE = require("../../../../assets/extra-liga-big-icon.png");
export const EXTRA_LIGA_SMALL_ICON_IMAGE = require("../../../../assets/extra-liga-small-icon.jpg");
export const EXTRA_LIGA_WELCOME_GRADIENT_IMAGE = require("../../../../assets/extra-liga-welcome-gradient.png");
export const EXTRA_LIGA_WELCOME_ICON_IMAGE = require("../../../../assets/extra-liga-big-icon.png");
export const FANTASY_TEAM_IMAGE = require("../../../../assets/fantasy-team.png");
export const FUTSAL_FIELD_IMAGE = require("../../../../assets/futsal-field.png");

export const CLUB_KITS = {
  agromat: require("../../../../assets/agromat.png"),
  alliance: require("../../../../assets/alliance.png"),
  athletic: require("../../../../assets/athletic.png"),
  avalon: require("../../../../assets/avalon.png"),
  hit: require("../../../../assets/hit.png"),
  fantom: require("../../../../assets/fantom.png"),
  skyup: require("../../../../assets/skyup.png"),
  sokil: require("../../../../assets/sokil.png"),
  sukhaBalka: require("../../../../assets/sukha-balka.png"),
  uragan: require("../../../../assets/uragan.png"),
} as const;

export const CLUB_GOALKEEPER_KITS = {
  agromat: require("../../../../assets/agromat-gk.png"),
  alliance: require("../../../../assets/alliance-gk.png"),
  athletic: require("../../../../assets/athletic-gk.png"),
  avalon: require("../../../../assets/avalon-gk.png"),
  hit: require("../../../../assets/hit-gk.png"),
  fantom: require("../../../../assets/fantom-gk.png"),
  skyup: require("../../../../assets/skyup-gk.png"),
  sokil: require("../../../../assets/sokil-gk.png"),
  sukhaBalka: require("../../../../assets/sukha-balka-gk.png"),
  uragan: require("../../../../assets/uragan-gk.png"),
} as const;

export const CLUB_LOGOS = {
  agromat: require("../../../../assets/agromat-logo.png"),
  alliance: require("../../../../assets/alliance-logo.png"),
  athletic: require("../../../../assets/athletic-logo.png"),
  avalon: require("../../../../assets/avalon-logo.png"),
  hit: require("../../../../assets/hit-logo.png"),
  fantom: require("../../../../assets/fantom-logo.png"),
  skyup: require("../../../../assets/skyup-logo.png"),
  sokil: require("../../../../assets/sokil-logo.png"),
  sukhaBalka: require("../../../../assets/sukha-balka-logo.png"),
  uragan: require("../../../../assets/uragan-logo.png"),
} as const;

type ClubKey = keyof typeof CLUB_KITS;
type ClubKitSource =
  | (typeof CLUB_KITS)[ClubKey]
  | (typeof CLUB_GOALKEEPER_KITS)[ClubKey];
type ClubLogoSource = (typeof CLUB_LOGOS)[ClubKey];

type ClubAssetRule = {
  key: ClubKey;
  keys: string[];
};

const CLUB_ASSET_RULES: ClubAssetRule[] = [
  { key: "agromat", keys: ["agromat", "ahromat", "агромат"] },
  { key: "alliance", keys: ["alliance", "aliance", "alians", "альянс"] },
  { key: "athletic", keys: ["athletic", "atletic", "атлетік", "атлетик"] },
  { key: "avalon", keys: ["avalon", "авалон"] },
  { key: "hit", keys: ["khit", "hit", "хіт", "хит"] },
  { key: "fantom", keys: ["fantom", "phantom", "фантом"] },
  { key: "skyup", keys: ["skyup"] },
  { key: "sokil", keys: ["sokil", "сокіл", "сокол"] },
  { key: "sukhaBalka", keys: ["sukhabalka", "сухабалка"] },
  { key: "uragan", keys: ["uragan", "ураган"] },
];

export const FANTASY_CRITICAL_IMAGE_MODULES = [
  APP_SPLASH_IMAGE,
  APP_BRAND_ICON_IMAGE,
  APP_ICON_IMAGE,
  EXTRA_LIGA_HEADER_ICON_IMAGE,
  EXTRA_LIGA_SMALL_ICON_IMAGE,
  EXTRA_LIGA_WELCOME_GRADIENT_IMAGE,
  EXTRA_LIGA_WELCOME_ICON_IMAGE,
  FANTASY_TEAM_IMAGE,
  FUTSAL_FIELD_IMAGE,
] as const;

const FANTASY_STATIC_ASSET_MODULES = [
  ...FANTASY_CRITICAL_IMAGE_MODULES,
  ...Object.values(CLUB_KITS),
  ...Object.values(CLUB_GOALKEEPER_KITS),
  ...Object.values(CLUB_LOGOS),
];

const FANTASY_BOOT_IMAGE_MODULES = [APP_SPLASH_IMAGE] as const;

let bootPreloadPromise: Promise<void> | null = null;
let criticalPreloadPromise: Promise<void> | null = null;
let preloadPromise: Promise<void> | null = null;

function normalizeClubAssetName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase()
    .replace(/[\s_\-.'’`]+/g, "");
}

function findClubAssetKey(
  clubName?: string | null,
  clubShortName?: string | null,
) {
  const candidates = [clubShortName, clubName]
    .map(normalizeClubAssetName)
    .filter(Boolean);

  for (const candidate of candidates) {
    const matchedRule = CLUB_ASSET_RULES.find((rule) =>
      rule.keys.some((key) => candidate.includes(normalizeClubAssetName(key))),
    );
    if (matchedRule) return matchedRule.key;
  }

  return null;
}

export function getClubKitSource(
  clubName?: string | null,
  clubShortName?: string | null,
  position?: PlayerPosition | null,
): ClubKitSource | null {
  const clubKey = findClubAssetKey(clubName, clubShortName);
  if (!clubKey) return null;

  return position === "goalkeeper"
    ? CLUB_GOALKEEPER_KITS[clubKey]
    : CLUB_KITS[clubKey];
}

export function getClubLogoSource(
  clubName?: string | null,
  clubShortName?: string | null,
): ClubLogoSource | null {
  const clubKey = findClubAssetKey(clubName, clubShortName);
  return clubKey ? CLUB_LOGOS[clubKey] : null;
}

export function preloadFantasyBootAssets() {
  if (!bootPreloadPromise) {
    bootPreloadPromise = Asset.loadAsync([...FANTASY_BOOT_IMAGE_MODULES])
      .then(() => undefined)
      .catch((error) => {
        bootPreloadPromise = null;
        throw error;
      });
  }

  return bootPreloadPromise;
}

export function preloadFantasyCriticalAssets() {
  if (!criticalPreloadPromise) {
    criticalPreloadPromise = Asset.loadAsync([...FANTASY_CRITICAL_IMAGE_MODULES])
      .then(() => undefined)
      .catch((error) => {
        criticalPreloadPromise = null;
        throw error;
      });
  }

  return criticalPreloadPromise;
}

export function preloadFantasyStaticAssets() {
  if (!preloadPromise) {
    preloadPromise = preloadFantasyCriticalAssets()
      .then(() => Asset.loadAsync(FANTASY_STATIC_ASSET_MODULES))
      .then(() => undefined)
      .catch((error) => {
        preloadPromise = null;
        throw error;
      });
  }

  return preloadPromise;
}
