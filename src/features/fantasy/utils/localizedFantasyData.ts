import type { LanguageCode } from "../../../i18n/translations";

type LocalizableClub = {
  id: string;
  city?: string | null;
  name: string;
  shortName?: string | null;
};

type LocalizablePlayerStatusDetails = {
  message?: string | null;
  messageEn?: string | null;
  messageUk?: string | null;
  updatedAt?: number | null;
} | null;

type LocalizablePlayer = {
  clubId?: string | null;
  clubName?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  statusDetails?: LocalizablePlayerStatusDetails;
};

type LocalizableFixture = {
  awayClubId?: string | null;
  awayClubName: string;
  homeClubId?: string | null;
  homeClubName: string;
};

type LocalizableGameweek = {
  name: string;
  number: number;
};

type LocalizableTeamPick<TPlayer extends LocalizablePlayer> = {
  player: TPlayer | null;
};

type LocalizableFantasyTeam<TPlayer extends LocalizablePlayer> = {
  picks: Array<LocalizableTeamPick<TPlayer>>;
};

type ClubLocalization = {
  en: string;
  uk?: string;
  shortEn?: string;
  shortUk?: string;
};

const CLUB_LOCALIZATIONS: Record<string, ClubLocalization> = {
  агромат: { en: "Agromat" },
  альянс: { en: "Alliance" },
  атлетик: { en: "Athletic" },
  "атлетик футзал": { en: "Athletic Futsal" },
  атлетік: { en: "Athletic" },
  "атлетік футзал": { en: "Athletic Futsal" },
  авалон: { en: "Avalon" },
  сокіл: { en: "Sokil" },
  сокол: { en: "Sokil" },
  скайап: { en: "SkyUp", uk: "SkyUp", shortEn: "SkyUp", shortUk: "SkyUp" },
  skyup: { en: "SkyUp", uk: "SkyUp", shortEn: "SkyUp", shortUk: "SkyUp" },
  "skyup futsal": {
    en: "SkyUp",
    uk: "SkyUp",
    shortEn: "SkyUp",
    shortUk: "SkyUp",
  },
  "суха балка": { en: "Sukha Balka" },
  ураган: { en: "Uragan" },
  фантом: { en: "Fantom" },
  хіт: { en: "HIT" },
  хит: { en: "HIT" },
};

const CITY_LOCALIZATIONS: Record<string, { en: string }> = {
  бровари: { en: "Brovary" },
  дніпро: { en: "Dnipro" },
  "жовті води": { en: "Zhovti Vody" },
  "івано-франківськ": { en: "Ivano-Frankivsk" },
  київ: { en: "Kyiv" },
  львів: { en: "Lviv" },
  хмельницький: { en: "Khmelnytskyi" },
};

const NO_CLUB_STATUS_MESSAGES: Record<LanguageCode, string> = {
  en: "Without club right now.",
  uk: "Без клубу зараз.",
};

const LEGACY_LEFT_CLUB_STATUS_MESSAGES = new Set([
  "left club",
  "покинув клуб",
]);

function normalizePlayerStatusMessage(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\s.!?:;]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function getDisplayPlayerStatusMessage(
  player: LocalizablePlayer,
  language: LanguageCode,
) {
  const statusMessage = getLocalizedPlayerStatusMessage(
    player.statusDetails ?? null,
    language,
  );

  if (
    !player.clubId &&
    LEGACY_LEFT_CLUB_STATUS_MESSAGES.has(
      normalizePlayerStatusMessage(statusMessage),
    )
  ) {
    return NO_CLUB_STATUS_MESSAGES[language];
  }

  return statusMessage;
}

const UK_TO_LATIN_CHARS: Record<string, string> = {
  А: "A",
  Б: "B",
  В: "V",
  Г: "H",
  Ґ: "G",
  Д: "D",
  Е: "E",
  Є: "Ye",
  Ж: "Zh",
  З: "Z",
  И: "Y",
  І: "I",
  Ї: "Yi",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "Kh",
  Ц: "Ts",
  Ч: "Ch",
  Ш: "Sh",
  Щ: "Shch",
  Ь: "",
  Ю: "Yu",
  Я: "Ya",
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  ʼ: "",
  "'": "",
  "’": "",
};

function normalizeLookup(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");
}

function replaceByCharacters(
  value: string,
  characterMap: Record<string, string>,
) {
  return Array.from(value)
    .map((character) => characterMap[character] ?? character)
    .join("");
}

function localizeText(value: string, language: LanguageCode) {
  if (language === "uk") return value;
  return replaceByCharacters(value, UK_TO_LATIN_CHARS);
}

function getLocalizedGameweekName(
  gameweek: LocalizableGameweek,
  language: LanguageCode,
) {
  const sourceName = gameweek.name.trim();
  const normalizedName = normalizeLookup(sourceName);
  const defaultNameMatch = normalizedName.match(
    /^(тур|gameweek|gw|matchweek|mw)\s*(\d+)$/,
  );

  if (!sourceName || defaultNameMatch) {
    const gameweekNumber = Number(defaultNameMatch?.[2]) || gameweek.number;
    return language === "uk"
      ? "Тур " + gameweekNumber
      : "Gameweek " + gameweekNumber;
  }

  return localizeText(sourceName, language);
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: "" };
  if (parts.length === 1) return { firstName: null, lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function localizeFirstName(
  firstName: string | null | undefined,
  language: LanguageCode,
) {
  if (!firstName) return firstName ?? null;
  if (language === "uk") return firstName;
  return localizeText(firstName, language);
}

function localizeLastName(lastName: string, language: LanguageCode) {
  return localizeText(lastName, language);
}

export function getLocalizedClubName(
  name: string | null | undefined,
  language: LanguageCode,
) {
  const value = (name ?? "").trim();
  if (!value) return value;

  const localized = CLUB_LOCALIZATIONS[normalizeLookup(value)];
  if (localized) {
    return language === "uk" ? (localized.uk ?? value) : localized.en;
  }
  if (language === "uk") return value;

  return localizeText(value, language);
}

export function getLocalizedClubShortName(
  name: string | null | undefined,
  language: LanguageCode,
) {
  const value = (name ?? "").trim();
  if (!value) return value;

  const localized = CLUB_LOCALIZATIONS[normalizeLookup(value)];
  if (!localized) {
    if (language === "uk") return value;
    return getLocalizedClubName(value, language);
  }

  if (language === "uk") return localized.shortUk ?? localized.uk ?? value;
  return localized.shortEn ?? localized.en;
}

function getLocalizedCity(
  city: string | null | undefined,
  language: LanguageCode,
) {
  const value = (city ?? "").trim();
  if (!value || language === "uk") return value || null;

  const localized = CITY_LOCALIZATIONS[normalizeLookup(value)];
  if (localized) return localized.en;

  return localizeText(value, language);
}

function getLocalizedPlayerNames(
  player: LocalizablePlayer,
  language: LanguageCode,
) {
  const fallbackNames = splitDisplayName(player.displayName);
  const sourceFirstName = player.firstName ?? fallbackNames.firstName;
  const sourceLastName = player.lastName ?? fallbackNames.lastName;
  const firstName = localizeFirstName(sourceFirstName, language);
  const lastName = sourceLastName
    ? localizeLastName(sourceLastName, language)
    : "";
  const displayName =
    firstName && lastName
      ? firstName + " " + lastName
      : localizeText(player.displayName, language);

  return {
    displayName,
    firstName,
    lastName,
  };
}

export function localizeFantasyClubs<TClub extends LocalizableClub>(
  clubs: TClub[] | undefined,
  language: LanguageCode,
) {
  if (!clubs) return clubs;

  return clubs.map((club) => ({
    ...club,
    city: getLocalizedCity(club.city, language),
    name: getLocalizedClubName(club.name, language),
    shortName: club.shortName
      ? getLocalizedClubShortName(club.shortName, language)
      : club.shortName,
  }));
}

export function localizeFantasyPlayers<
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(
  players: TPlayer[] | undefined,
  language: LanguageCode,
  clubs: TClub[] | undefined,
) {
  if (!players) return players;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return players.map((player) =>
    localizeFantasyPlayer(player, language, clubsById),
  );
}

function getLocalizedPlayerStatusMessage(
  details: LocalizablePlayerStatusDetails,
  language: LanguageCode,
) {
  if (!details) return null;

  if (language === "uk") {
    return details.messageUk ?? details.message ?? details.messageEn ?? null;
  }

  return details.messageEn ?? details.message ?? details.messageUk ?? null;
}

export function localizeFantasyPlayer<
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(player: TPlayer, language: LanguageCode, clubsById?: Map<string, TClub>) {
  const localizedNames = getLocalizedPlayerNames(player, language);
  const club = player.clubId ? clubsById?.get(player.clubId) : null;

  return {
    ...player,
    ...localizedNames,
    clubName:
      club?.name ??
      (player.clubName
        ? getLocalizedClubName(player.clubName, language)
        : player.clubName),
    statusMessage: getDisplayPlayerStatusMessage(player, language),
  };
}

export function localizeFantasyFixtures<
  TFixture extends LocalizableFixture,
  TClub extends LocalizableClub,
>(
  fixtures: TFixture[] | undefined,
  language: LanguageCode,
  clubs: TClub[] | undefined,
) {
  if (!fixtures) return fixtures;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return fixtures.map((fixture) => ({
    ...fixture,
    awayClubName: fixture.awayClubId
      ? (clubsById.get(fixture.awayClubId)?.name ??
        getLocalizedClubName(fixture.awayClubName, language))
      : getLocalizedClubName(fixture.awayClubName, language),
    homeClubName: fixture.homeClubId
      ? (clubsById.get(fixture.homeClubId)?.name ??
        getLocalizedClubName(fixture.homeClubName, language))
      : getLocalizedClubName(fixture.homeClubName, language),
  }));
}

export function localizeFantasyGameweeks<TGameweek extends LocalizableGameweek>(
  gameweeks: TGameweek[] | undefined,
  language: LanguageCode,
) {
  if (!gameweeks) return gameweeks;

  return gameweeks.map((gameweek) => ({
    ...gameweek,
    name: getLocalizedGameweekName(gameweek, language),
  }));
}

export function localizeFantasyTeam<
  TTeam extends LocalizableFantasyTeam<TPlayer> | null | undefined,
  TPlayer extends LocalizablePlayer,
  TClub extends LocalizableClub,
>(team: TTeam, language: LanguageCode, clubs: TClub[] | undefined): TTeam {
  if (!team) return team;

  const clubsById = new Map((clubs ?? []).map((club) => [club.id, club]));

  return {
    ...team,
    picks: team.picks.map((pick) => ({
      ...pick,
      player: pick.player
        ? localizeFantasyPlayer(pick.player, language, clubsById)
        : null,
    })),
  } as TTeam;
}
