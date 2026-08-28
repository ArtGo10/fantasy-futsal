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
export const EKSTRAKLASA_WELCOME_GRADIENT_IMAGE = require("../../../../assets/ekstraklasa-welcome-gradient.png");
export const EXTRA_LIGA_WELCOME_ICON_IMAGE = require("../../../../assets/extra-liga-big-icon.png");
export const EKSTRAKLASA_SMALL_ICON_IMAGE = require("../../../../assets/ekstraklasa-small.jpg");
export const EKSTRAKLASA_WELCOME_ICON_IMAGE = require("../../../../assets/ekstraklasa.jpeg");
export const FANTASY_TEAM_IMAGE = require("../../../../assets/fantasy-team.png");
export const EKSTRAKLASA_FANTASY_TEAM_IMAGE = require("../../../../assets/fantasy-team-ekstraklasa.png");
export const FUTSAL_FIELD_IMAGE = require("../../../../assets/futsal-field.png");

type FantasySeasonAssetSource = {
  leagueName?: string | null;
  logoKey?: string | null;
  name?: string | null;
  slug?: string | null;
};

type FantasySeasonAssetKey = "extra-liga" | "polish-ekstraklasa";

const FANTASY_SEASON_ASSETS = {
  "extra-liga": {
    smallLogo: EXTRA_LIGA_SMALL_ICON_IMAGE,
    teamImage: FANTASY_TEAM_IMAGE,
    welcomeBackground: EXTRA_LIGA_WELCOME_GRADIENT_IMAGE,
    welcomeIcon: EXTRA_LIGA_WELCOME_ICON_IMAGE,
  },
  "polish-ekstraklasa": {
    smallLogo: EKSTRAKLASA_SMALL_ICON_IMAGE,
    teamImage: EKSTRAKLASA_FANTASY_TEAM_IMAGE,
    welcomeBackground: EKSTRAKLASA_WELCOME_GRADIENT_IMAGE,
    welcomeIcon: EKSTRAKLASA_WELCOME_ICON_IMAGE,
  },
} as const;

function normalizeSeasonAssetValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getFantasySeasonAssetKey(
  season: FantasySeasonAssetSource | null | undefined,
): FantasySeasonAssetKey {
  const candidates = [
    season?.logoKey,
    season?.slug,
    season?.leagueName,
    season?.name,
  ]
    .map(normalizeSeasonAssetValue)
    .filter(Boolean);

  if (
    candidates.some(
      (candidate) =>
        candidate.includes("polish") ||
        candidate.includes("polska") ||
        candidate.includes("ekstraklasa"),
    )
  ) {
    return "polish-ekstraklasa";
  }

  return "extra-liga";
}

export function getFantasySeasonSmallLogoSource(
  season: FantasySeasonAssetSource | null | undefined,
) {
  return FANTASY_SEASON_ASSETS[getFantasySeasonAssetKey(season)].smallLogo;
}

export function getFantasySeasonWelcomeBackgroundSource(
  season: FantasySeasonAssetSource | null | undefined,
) {
  return FANTASY_SEASON_ASSETS[getFantasySeasonAssetKey(season)]
    .welcomeBackground;
}

export function getFantasySeasonWelcomeIconSource(
  season: FantasySeasonAssetSource | null | undefined,
) {
  return FANTASY_SEASON_ASSETS[getFantasySeasonAssetKey(season)].welcomeIcon;
}

export function getFantasySeasonTeamImageSource(
  season: FantasySeasonAssetSource | null | undefined,
) {
  return FANTASY_SEASON_ASSETS[getFantasySeasonAssetKey(season)].teamImage;
}

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
  polishAzsUsKatowice: require("../../../../assets/polish-azs-us-katowice-kit.png"),
  polishBsfAbjBochnia: require("../../../../assets/polish-bsf-abj-bochnia-kit.png"),
  polishConstractOlsztyn: require("../../../../assets/polish-constract-olsztyn-kit.png"),
  polishFcReiterTorun: require("../../../../assets/polish-fc-reiter-torun-kit.png"),
  polishFutsalSwiecie: require("../../../../assets/polish-futsal-swiecie-kit.png"),
  polishGiMalepszyLeszno: require("../../../../assets/polish-gi-malepszy-leszno-kit.png"),
  polishJagielloniaBialystok: require("../../../../assets/polish-jagiellonia-bialystok-kit.png"),
  polishJaxanSlaskWroclaw: require("../../../../assets/polish-jaxan-slask-wroclaw-kit.png"),
  polishKkfMotus: require("../../../../assets/polish-kkf-motus-kit.png"),
  polishLegiaWarszawa: require("../../../../assets/polish-legia-warszawa-kit.png"),
  polishPiastGliwice: require("../../../../assets/polish-piast-gliwice-kit.png"),
  polishRedDragonsPniewy: require("../../../../assets/polish-red-dragons-pniewy-kit.png"),
  polishRekordBielskoBiala: require("../../../../assets/polish-rekord-bielsko-biala-kit.png"),
  polishTexomEurobusPrzemysl: require("../../../../assets/polish-texom-eurobus-przemysl-kit.png"),
  polishWeMetSierakowice: require("../../../../assets/polish-we-met-sierakowice-kit.png"),
  polishWiaraLechaPoznan: require("../../../../assets/polish-wiara-lecha-poznan-kit.png"),
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
  polishAzsUsKatowice: require("../../../../assets/polish-azs-us-katowice-gk.png"),
  polishBsfAbjBochnia: require("../../../../assets/polish-bsf-abj-bochnia-gk.png"),
  polishConstractOlsztyn: require("../../../../assets/polish-constract-olsztyn-gk.png"),
  polishFcReiterTorun: require("../../../../assets/polish-fc-reiter-torun-gk.png"),
  polishFutsalSwiecie: require("../../../../assets/polish-futsal-swiecie-gk.png"),
  polishGiMalepszyLeszno: require("../../../../assets/polish-gi-malepszy-leszno-gk.png"),
  polishJagielloniaBialystok: require("../../../../assets/polish-jagiellonia-bialystok-gk.png"),
  polishJaxanSlaskWroclaw: require("../../../../assets/polish-jaxan-slask-wroclaw-gk.png"),
  polishKkfMotus: require("../../../../assets/polish-kkf-motus-gk.png"),
  polishLegiaWarszawa: require("../../../../assets/polish-legia-warszawa-gk.png"),
  polishPiastGliwice: require("../../../../assets/polish-piast-gliwice-gk.png"),
  polishRedDragonsPniewy: require("../../../../assets/polish-red-dragons-pniewy-gk.png"),
  polishRekordBielskoBiala: require("../../../../assets/polish-rekord-bielsko-biala-gk.png"),
  polishTexomEurobusPrzemysl: require("../../../../assets/polish-texom-eurobus-przemysl-gk.png"),
  polishWeMetSierakowice: require("../../../../assets/polish-we-met-sierakowice-gk.png"),
  polishWiaraLechaPoznan: require("../../../../assets/polish-wiara-lecha-poznan-gk.png"),
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
  polishAzsUsKatowice: require("../../../../assets/polish-azs-us-katowice-logo.png"),
  polishBsfAbjBochnia: require("../../../../assets/polish-bsf-abj-bochnia-logo.png"),
  polishConstractOlsztyn: require("../../../../assets/polish-constract-olsztyn-logo.png"),
  polishFcReiterTorun: require("../../../../assets/polish-fc-reiter-torun-logo.png"),
  polishFutsalSwiecie: require("../../../../assets/polish-futsal-swiecie-logo.png"),
  polishGiMalepszyLeszno: require("../../../../assets/polish-gi-malepszy-leszno-logo.png"),
  polishJagielloniaBialystok: require("../../../../assets/polish-jagiellonia-bialystok-logo.png"),
  polishJaxanSlaskWroclaw: require("../../../../assets/polish-jaxan-slask-wroclaw-logo.png"),
  polishKkfMotus: require("../../../../assets/polish-kkf-motus-logo.png"),
  polishLegiaWarszawa: require("../../../../assets/polish-legia-warszawa-logo.png"),
  polishPiastGliwice: require("../../../../assets/polish-piast-gliwice-logo.png"),
  polishRedDragonsPniewy: require("../../../../assets/polish-red-dragons-pniewy-logo.png"),
  polishRekordBielskoBiala: require("../../../../assets/polish-rekord-bielsko-biala-logo.png"),
  polishTexomEurobusPrzemysl: require("../../../../assets/polish-texom-eurobus-przemysl-logo.png"),
  polishWeMetSierakowice: require("../../../../assets/polish-we-met-sierakowice-logo.png"),
  polishWiaraLechaPoznan: require("../../../../assets/polish-wiara-lecha-poznan-logo.png"),
} as const;

type ClubFieldKitKey = keyof typeof CLUB_KITS;
type ClubGoalkeeperKitKey = keyof typeof CLUB_GOALKEEPER_KITS;
type ClubLogoKey = keyof typeof CLUB_LOGOS;
type ClubKitSource =
  | (typeof CLUB_KITS)[ClubFieldKitKey]
  | (typeof CLUB_GOALKEEPER_KITS)[ClubGoalkeeperKitKey];
type ClubLogoSource = (typeof CLUB_LOGOS)[ClubLogoKey];

type ClubAssetRule = {
  key: ClubLogoKey;
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
  {
    key: "polishTexomEurobusPrzemysl",
    keys: [
      "texomeurobusprzemysl",
      "eurobusprzemysl",
      "texomєвробусперемишль",
      "євробусперемишль",
    ],
  },
  {
    key: "polishPiastGliwice",
    keys: ["piastgliwice", "пястглівіце"],
  },
  {
    key: "polishConstractOlsztyn",
    keys: ["constractolsztyn", "constractlubawa", "констрактольштин"],
  },
  {
    key: "polishGiMalepszyLeszno",
    keys: [
      "gimalepszyleszno",
      "malepszyleszno",
      "giмалепшилешно",
      "малепшилешно",
    ],
  },
  {
    key: "polishRekordBielskoBiala",
    keys: ["rekordbielskobiala", "btsrekord", "рекордбельськобяла"],
  },
  {
    key: "polishLegiaWarszawa",
    keys: ["legiawarszawa", "легіяваршава"],
  },
  {
    key: "polishWeMetSierakowice",
    keys: [
      "wemet",
      "sierakowice",
      "kamienicakrolewska",
      "wemetсераковіце",
      "сераковіце",
    ],
  },
  {
    key: "polishAzsUsKatowice",
    keys: [
      "azsuskatowice",
      "azskatowice",
      "uniwersytetslaskikatowice",
      "azsusкатовіце",
      "катовіце",
    ],
  },
  {
    key: "polishFcReiterTorun",
    keys: [
      "fcreitertorun",
      "fctorun",
      "footballclubreitertorun",
      "fcreiterторунь",
      "торунь",
    ],
  },
  {
    key: "polishRedDragonsPniewy",
    keys: ["reddragonspniewy", "реддрегонспнєви"],
  },
  {
    key: "polishBsfAbjBochnia",
    keys: [
      "bsfabjbochnia",
      "bsfbochnia",
      "bsfabjpowiatbochnia",
      "bsfabjбохня",
      "бохня",
    ],
  },
  {
    key: "polishFutsalSwiecie",
    keys: ["futsalswiecie", "ksfutsalswiecie", "футзалсвеце"],
  },
  {
    key: "polishJaxanSlaskWroclaw",
    keys: [
      "jaxanslaskwroclaw",
      "wkslaskwroclaw",
      "jaxanшльонськвроцлав",
      "шльонськвроцлав",
    ],
  },
  {
    key: "polishJagielloniaBialystok",
    keys: ["jagielloniabialystok", "ягеллоніябілосток"],
  },
  {
    key: "polishKkfMotus",
    keys: [
      "kkfmotus",
      "kkfkazimierzawielka",
      "kkfcaffaro",
      "kkfmotusказімежавелька",
    ],
  },
  {
    key: "polishWiaraLechaPoznan",
    keys: ["wiaralechapoznan", "вяралехапознань"],
  },
];

export const FANTASY_CRITICAL_IMAGE_MODULES = [
  APP_SPLASH_IMAGE,
  APP_BRAND_ICON_IMAGE,
  APP_ICON_IMAGE,
  EXTRA_LIGA_HEADER_ICON_IMAGE,
  EXTRA_LIGA_SMALL_ICON_IMAGE,
  EXTRA_LIGA_WELCOME_GRADIENT_IMAGE,
  EXTRA_LIGA_WELCOME_ICON_IMAGE,
  EKSTRAKLASA_SMALL_ICON_IMAGE,
  EKSTRAKLASA_WELCOME_GRADIENT_IMAGE,
  EKSTRAKLASA_WELCOME_ICON_IMAGE,
  FANTASY_TEAM_IMAGE,
  EKSTRAKLASA_FANTASY_TEAM_IMAGE,
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
    .replace(/[łŁ]/g, "l")
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

function hasClubFieldKitSource(
  clubKey: ClubLogoKey,
): clubKey is ClubFieldKitKey {
  return Object.prototype.hasOwnProperty.call(CLUB_KITS, clubKey);
}

function hasClubGoalkeeperKitSource(
  clubKey: ClubLogoKey,
): clubKey is ClubGoalkeeperKitKey {
  return Object.prototype.hasOwnProperty.call(CLUB_GOALKEEPER_KITS, clubKey);
}

export function getClubKitSource(
  clubName?: string | null,
  clubShortName?: string | null,
  position?: PlayerPosition | null,
): ClubKitSource | null {
  const clubKey = findClubAssetKey(clubName, clubShortName);
  if (!clubKey) return null;

  if (position === "goalkeeper") {
    return hasClubGoalkeeperKitSource(clubKey)
      ? CLUB_GOALKEEPER_KITS[clubKey]
      : null;
  }

  return hasClubFieldKitSource(clubKey) ? CLUB_KITS[clubKey] : null;
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
