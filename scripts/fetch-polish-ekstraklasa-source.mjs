#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateSuggestedPrice } from "./futsal-pricing.mjs";

const OFFICIAL_BASE_URL = "https://www.futsalekstraklasa.pl";
const FUTSAL_POLSKA_BASE_URL = "https://www.futsal-polska.pl";
const STATSCORE_QUERY_URL =
  "https://futsal-ekstraklasa.statscore.com/pl/futsal/futsal-ekstraklasa,6294/71147/query";
const STATSCORE_LOGO_BASE_URL =
  "https://scor-s3-cdn.statscore.com/assets/scoreframe/img/logos";

const SEASON_SLUG = "polish-futsal-ekstraklasa-2026-27";
const STATSCORE_COMPETITION_ID = "6294";
const STATSCORE_SEASON_ID = "71147";
const DEFAULT_OUTPUT_PATH = "data/futsal/polish-ekstraklasa-2026-27.json";
const DEFAULT_PRICE = 5.5;
const WARSAW_TIME_ZONE = "Europe/Warsaw";
const FUTSAL_POLSKA_ROSTER_INDEX_URLS = [
  `${FUTSAL_POLSKA_BASE_URL}/futsal-ekstraklasa`,
  `${FUTSAL_POLSKA_BASE_URL}/i-liga-grupa-i`,
  `${FUTSAL_POLSKA_BASE_URL}/i-liga-grupa-ii`,
];

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const CLUB_CONFIGS = [
  {
    statscoreId: "1164696",
    officialSlug: "texom-eurobus-przemysl",
    name: "TEXOM Eurobus Przemyśl",
    shortName: "Eurobus Przemyśl",
    city: "Przemyśl",
    aliases: ["Texom Eurobus Przemyśl", "Eurobus Przemyśl"],
  },
  {
    statscoreId: "1068865",
    officialSlug: "piast-gliwice",
    name: "Piast Gliwice",
    shortName: "Piast Gliwice",
    city: "Gliwice",
    aliases: ["Piast Gliwice Futsal", "Piast Gliwice"],
  },
  {
    statscoreId: "1069050",
    officialSlug: "constract-olsztyn",
    name: "Constract Olsztyn",
    shortName: "Constract Olsztyn",
    city: "Olsztyn",
    aliases: ["Constract Olsztyn", "Constract Lubawa"],
  },
  {
    statscoreId: "1069049",
    officialSlug: "gi-malepszy-leszno",
    name: "GI Malepszy Leszno",
    shortName: "GI Malepszy Leszno",
    city: "Leszno",
    aliases: ["GI Malepszy Futsal Leszno", "GI Malepszy Leszno"],
  },
  {
    statscoreId: "971760",
    officialSlug: "rekord-bielsko-biala",
    name: "Rekord Bielsko-Biała",
    shortName: "Rekord Bielsko-Biała",
    city: "Bielsko-Biała",
    aliases: ["Rekord Bielsko-Biała"],
  },
  {
    statscoreId: "1100259",
    officialSlug: "legia-warszawa",
    name: "Legia Warszawa",
    shortName: "Legia Warszawa",
    city: "Warszawa",
    aliases: ["Legia Warszawa Futsal", "Legia Warszawa"],
  },
  {
    statscoreId: "1164695",
    officialSlug: "we-met-futsal-club-gmina-sierakowice",
    name: "We-Met Futsal Club Gmina Sierakowice",
    shortName: "We-Met Sierakowice",
    city: "Sierakowice",
    aliases: [
      "We-Met Futsal Club Gmina Sierakowice",
      "We-Met Kamienica Królewska",
      "We-Met Sierakowice",
    ],
  },
  {
    statscoreId: "971765",
    officialSlug: "azs-us-katowice",
    name: "AZS UŚ Katowice",
    shortName: "AZS UŚ Katowice",
    city: "Katowice",
    aliases: ["AZS UŚ Katowice", "AZS Uniwersytet Śląski Katowice"],
  },
  {
    statscoreId: "971771",
    officialSlug: "fc-reiter-torun",
    name: "FC Reiter Toruń",
    shortName: "FC Reiter Toruń",
    city: "Toruń",
    aliases: ["FC Reiter Toruń", "FC Toruń", "Football Club Reiter Toruń"],
  },
  {
    statscoreId: "971768",
    officialSlug: "red-dragons-pniewy",
    name: "Red Dragons Pniewy",
    shortName: "Red Dragons Pniewy",
    city: "Pniewy",
    aliases: ["Red Dragons Pniewy"],
  },
  {
    statscoreId: "1124279",
    officialSlug: "bsf-abj-bochnia",
    name: "BSF ABJ Bochnia",
    shortName: "BSF ABJ Bochnia",
    city: "Bochnia",
    aliases: ["BSF ABJ Powiat Bochnia", "BSF ABJ Bochnia", "BSF Bochnia"],
  },
  {
    statscoreId: "1100261",
    officialSlug: "futsal-swiecie",
    name: "Futsal Świecie",
    shortName: "Futsal Świecie",
    city: "Świecie",
    aliases: ["KS Futsal Świecie", "Futsal Świecie"],
  },
  {
    statscoreId: "1100264",
    officialSlug: "jaxan-slask-wroclaw",
    name: "JAXAN Śląsk Wrocław",
    shortName: "JAXAN Śląsk Wrocław",
    city: "Wrocław",
    aliases: [
      "Jaxan WKS Śląsk Futsal Wrocław",
      "Jaxan WKS Śląsk Wrocław Futsal",
      "Jaxan Śląsk Wrocław",
      "JAXAN Śląsk Wrocław",
    ],
  },
  {
    statscoreId: "971766",
    officialSlug: "jagiellonia-bialystok",
    name: "Jagiellonia Białystok",
    shortName: "Jagiellonia Białystok",
    city: "Białystok",
    aliases: ["Jagiellonia Białystok", "Jagiellonia Białystok Futsal"],
  },
  {
    statscoreId: "1203274",
    officialSlug: "kkf-motus-kazimierza-wielka",
    name: "KKF Motus Kazimierza Wielka",
    shortName: "KKF Motus",
    city: "Kazimierza Wielka",
    aliases: [
      "KKF Motus Kazimierza Wielka",
      "KKF Motus Kazimierza Wielka Beniaminek",
      "KKF Caffaro Kazimierza Wielka",
      "KKF Kazimierza",
    ],
  },
  {
    statscoreId: "1261090",
    officialSlug: "wiara-lecha-poznan",
    name: "Wiara Lecha Poznań",
    shortName: "Wiara Lecha Poznań",
    city: "Poznań",
    aliases: ["Wiara Lecha Poznań", "Wiara Lecha Poznań Beniaminek"],
  },
];

const CLUB_PHOTO_PAGE_CONFIGS = [
  {
    clubExternalId: "1068865",
    sourceUrl: "https://piastgliwice.com/zawodnicy/",
    parser: "piast-wordpress-grid",
  },
  {
    clubExternalId: "1164696",
    sourceUrl: "https://www.eurobusfutsal.pl/kadra",
    parser: "eurobus-hostinger-builder",
  },
  {
    clubExternalId: "1100259",
    sourceUrl: "https://legiafutsal.com/kadra/",
    parser: "legia-wordpress-grid",
  },
  {
    clubExternalId: "1124279",
    sourceUrl: "https://bsfbochnia.pl/players",
    parser: "sportigio-player-cards",
  },
  {
    clubExternalId: "971771",
    sourceUrl: "https://torunfc.pl/players",
    parser: "sportigio-player-cards",
  },
  {
    clubExternalId: "1203274",
    sourceUrl: "https://kkfkazimierzawielka.pl/players",
    parser: "sportigio-player-cards",
  },
  {
    clubExternalId: "1164695",
    sourceUrl: "https://wemet-futsal.pl/index.php",
    parser: "sportigio-player-cards",
  },
  {
    clubExternalId: "1100264",
    sourceUrl: "https://futsalslaskwroclaw.pl/?team=18",
    parser: "sportigio-player-cards",
  },
  {
    clubExternalId: "1100261",
    sourceUrl: "https://futsalswiecie.pl/kadra-i-sztab-2024-25/",
    parser: "wordpress-linked-player-photos",
  },
  {
    clubExternalId: "971766",
    sourceUrl: "https://jagielloniafutsal.pl/kadra/",
    parser: "wordpress-linked-player-photos",
  },
  {
    clubExternalId: "1261090",
    sourceUrl: "https://www.wiaralecha.pl/index.php/list/kadra-25-26-2/",
    parser: "wordpress-linked-player-photos",
  },
  {
    clubExternalId: "1069049",
    sourceUrl: "https://www.futsal.leszno.pl/kadra/",
    parser: "siteorigin-paired-cells",
  },
  {
    clubExternalId: "971760",
    sourceUrl: "https://bts.rekord.com.pl/rozgrywki/fogo-futsal-ekstraklasa-2",
    parser: "rekord-board",
  },
  {
    clubExternalId: "971765",
    sourceUrl: "https://futsalazs.pl/kadra-20262027",
    parser: "azs-webwave",
  },
  {
    clubExternalId: "971768",
    sourceUrl: "http://futsalpniewy.pl/kadra-aktualny-sezon/",
    parser: "red-dragons-current",
  },
];

const TRANSFER_NAME_ALIASES = new Map(
  [
    ["1068865", "Eric Panés", "Eric Panes Felix"],
    ["1068865", "Jason García", "Jason Garcia Gual"],
    ["1068865", "Juan Emilio", "Juan Emilio Gil Camacho"],
    ["1068865", "Mati Starna", "Matias Starna"],
    ["1068865", "Rafa Félix", "Rafael Felix"],
    ["971760", "Matheus", "Matheus Ferreira Ribeiro"],
    ["971760", "Gabriel Shiga", "Gabriel da Silva Shiga"],
    ["1100264", "Claudio", "Claudinho"],
    ["1203274", "Vitinho III", "Víctor Dias"],
  ].map(([clubExternalId, sourceName, displayName]) => [
    `${clubExternalId}:${normalizeNameKey(sourceName)}`,
    displayName,
  ]),
);

const PHOTO_NAME_ALIASES = new Map(
  [
    ["1068865", "Vinicius Lazzaretti", "Vini Lazzaretti"],
    ["1068865", "Carlos Eduardo Gonçalves", "Dill"],
    ["1100259", "Yaroslav Zmiivskyi", "Jarosław Zmijiwski"],
    ["1100259", "Vladyslav Tkachenko", "Władysław Tkaczenko"],
    ["1100259", "Mykyta Storozhuk", "Mykyta Storożuk"],
    ["1100259", "Mykyta Mozheiko", "Mykyta Możejko"],
    ["1100259", "Sava Lutai", "Sawa Łutaj"],
    ["1100264", "Jonatan De Agostini", "Jonatan De Agostini Machado"],
    ["1100264", "Lion Ribeiro De Souza", "Lion de Souza"],
    ["1100264", "Lion Ribeiro", "Lion de Souza"],
    ["1100264", "Luiz Claudio Sampaio Filho", "Claudinho"],
    ["1069049", "Deiby Pamplona Arango", "Deiby Arango"],
    ["1069049", "Serhii Malyshko", "Serhij Małyszko"],
    ["1069049", "Renard Udris", "Renards Ūdris"],
    ["1069049", "Benjamin Dorogi", "Benjámin Dorogi"],
    ["971765", "Sergey Lapa", "Serhij Łapa"],
  ].map(([clubExternalId, sourceName, displayName]) => [
    `${clubExternalId}:${normalizeNameKey(sourceName)}`,
    displayName,
  ]),
);

const EUROBUS_PHOTO_NAME_BY_PATH = new Map([
  ["trener-analityk-39-EQ2P15jnt7Ukt7rD.png", "Roman Kołtok"],
  ["trener-analityk-38-ZRpWnjGVsj26bB5g.png", "Krzysztof Iwanek"],
  ["trener-analityk-37-FwQCS9aU2I8yCLUc.png", "Paweł Palko"],
  ["trener-analityk-45-pYYcXCHNSKVNZOC0.png", "Artur Kuźma"],
  ["trener-analityk-42-6uTeAq5DMuLgkGmo.png", "Artem Fareniuk"],
  ["trener-analityk-41-wsPIk0w5bQfH8VlC.png", "Diniz"],
  ["trener-analityk-40-hof2PioU87bBzw26.png", "Jarosław Łebid´"],
  ["trener-analityk-36-DOq0Ms1SI62pu7Qh.png", "Fábio Cecílio"],
  ["trener-analityk-34-e3dUVwY1zex2AWLI.png", "Nazar Szwed"],
  ["trener-analityk-35-lXn4EbzVFXck9KoP.png", "Oskar Dmochewicz"],
  ["trener-analityk-33-0iyqJPE2IXfNDPO0.png", "Rúben Santos"],
  ["trener-analityk-32-f7M9Sp64RyzFCqdK.png", "Hryhorij Zańko"],
  ["trener-analityk-31-3CEMmTSFnIYRIjEG.png", "Danyjił Abakszyn"],
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    out: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") {
      options.out = args[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Fetch Polish Futsal Ekstraklasa 2026/27 source data.

Usage:
  npm run data:futsal:poland
  npm run data:futsal:poland -- --out data/futsal/polish-ekstraklasa-2026-27.json

Options:
  --out <path>   Output JSON path. Default: ${DEFAULT_OUTPUT_PATH}
`);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&oacute;/g, "ó")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É");
}

function stripTags(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]*>/g, " "));
}

function normalizeText(value) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (letter) => {
      const map = {
        ą: "a",
        ć: "c",
        ę: "e",
        ł: "l",
        ń: "n",
        ó: "o",
        ś: "s",
        ź: "z",
        ż: "z",
      };
      return map[letter] ?? letter;
    })
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeNameKey(value) {
  return normalizeSearchText(value);
}

function slugify(value) {
  return normalizeSearchText(value).replace(/\s+/g, "-") || "item";
}

function toAbsoluteUrl(value, baseUrl) {
  if (!value) return null;
  const decoded = decodeHtml(value.trim());
  if (!decoded || decoded === "/img/user.png") return null;
  if (/^https?:\/\//i.test(decoded)) return decoded;
  if (decoded.startsWith("//")) return `https:${decoded}`;
  return new URL(decoded, baseUrl).toString();
}

function getAttr(html, attrName) {
  const match = html.match(
    new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i"),
  );
  return match ? decodeHtml(match[1]) : null;
}

function toNumber(value) {
  const normalized = normalizeText(value).replace(",", ".");
  if (!normalized || normalized === "-") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptySourceStats() {
  return {
    extraLeague2025_26: null,
    firstLeague2025_26: null,
  };
}

function splitName(displayName) {
  const parts = normalizeText(displayName).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return {
      firstName: null,
      lastName: parts[0] ?? normalizeText(displayName),
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function mapPosition(value) {
  return normalizeSearchText(value).includes("bramkarz")
    ? "goalkeeper"
    : "universal";
}

function suggestedPriceFor(player) {
  return (
    calculateSuggestedPrice({
      clubExternalId: player.clubExternalId,
      displayName: player.displayName,
      position: player.position,
      statsByCompetition: player.sourceStats ?? emptySourceStats(),
    }) || DEFAULT_PRICE
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });

  if (!response.ok) {
    if (attempt < 3 && response.status >= 500) {
      await sleep(800 * attempt);
      return await fetchText(url, attempt + 1);
    }

    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return await response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

async function fetchStatscoreTeams(warnings) {
  const url = new URL(STATSCORE_QUERY_URL);
  url.searchParams.set("TeamsList[__attach]", "true");

  try {
    const payload = await fetchJson(url);
    if (!Array.isArray(payload.TeamsList)) {
      throw new Error("Statscore TeamsList payload is not an array");
    }
    return payload.TeamsList;
  } catch (error) {
    warnings.push({
      type: "statscore-teams-fetch-failed",
      sourceUrl: url.toString(),
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function parseOfficialClubLogos(html) {
  const logosBySlug = new Map();
  const itemRegex =
    /<a[^>]+href=["']\/zespol\/([^"']+)["'][\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(itemRegex)) {
    const slug = decodeHtml(match[1]);
    if (logosBySlug.has(slug)) continue;
    logosBySlug.set(slug, toAbsoluteUrl(match[2], OFFICIAL_BASE_URL));
  }

  return logosBySlug;
}

function buildClubs({ statscoreTeams, officialLogoUrlBySlug }) {
  const statscoreById = new Map(
    statscoreTeams.map((team) => [String(team.id), team]),
  );

  return CLUB_CONFIGS.map((config, index) => {
    const statscoreTeam = statscoreById.get(config.statscoreId);
    const statscoreLogo = statscoreTeam?.logo_url
      ? `${STATSCORE_LOGO_BASE_URL}/${statscoreTeam.logo_url}`
      : null;
    const officialLogo = officialLogoUrlBySlug.get(config.officialSlug) ?? null;
    const logoUrl = statscoreLogo ?? officialLogo;

    return {
      externalId: config.statscoreId,
      sourceSlug: config.officialSlug,
      sourceUrl: `${OFFICIAL_BASE_URL}/zespol/${config.officialSlug}`,
      sourceName: normalizeText(statscoreTeam?.name ?? config.name),
      name: config.name,
      shortName: config.shortName,
      city: config.city,
      logoUrl,
      logoThumbnailUrl: logoUrl,
      rosterListExternalIds: [],
      sortOrder: index + 1,
      isActive: true,
    };
  });
}

function buildClubAliasMap() {
  const aliasMap = new Map();
  for (const club of CLUB_CONFIGS) {
    const values = [
      club.name,
      club.shortName,
      club.officialSlug.replace(/-/g, " "),
      ...club.aliases,
    ];
    for (const value of values) {
      aliasMap.set(normalizeSearchText(value), club.statscoreId);
    }
  }
  return aliasMap;
}

function resolveClubIdFromName(value, aliasMap) {
  const normalized = normalizeSearchText(value).replace(/\bbeniaminek\b/g, "").trim();
  if (aliasMap.has(normalized)) return aliasMap.get(normalized);

  for (const [alias, clubExternalId] of aliasMap.entries()) {
    if (alias.length < 4) continue;
    if (normalized === alias || normalized.includes(alias) || alias.includes(normalized)) {
      return clubExternalId;
    }
  }

  return null;
}

function resolveClubIdFromHeader(value, aliasMap) {
  const normalized = normalizeSearchText(value).replace(/\bbeniaminek\b/g, "").trim();
  return aliasMap.get(normalized) ?? null;
}

function findExistingPlayer(playersByClub, clubExternalId, displayName) {
  const candidates = playersByClub.get(clubExternalId) ?? [];
  const candidateKey = normalizeNameKey(displayName);
  const candidateWords = candidateKey.split(" ").filter(Boolean);

  for (const player of candidates) {
    const playerKey = normalizeNameKey(player.displayName);
    if (playerKey === candidateKey) return player;

    const playerWords = playerKey.split(" ").filter(Boolean);
    if (candidateWords.length < 2 || playerWords.length < 2) continue;

    const candidateInPlayer = candidateWords.every((word) =>
      playerWords.includes(word),
    );
    const playerInCandidate = playerWords.every((word) =>
      candidateWords.includes(word),
    );
    if (candidateInPlayer || playerInCandidate) return player;
  }

  return null;
}

function normalizePhotoNameKey(value) {
  return normalizeNameKey(value)
    .replace(/\bjaroslaw\b/g, "yaroslav")
    .replace(/\bwlady?slaw\b/g, "vladyslav")
    .replace(/\bsawa\b/g, "sava")
    .replace(/cz/g, "ch")
    .replace(/sz/g, "sh")
    .replace(/w/g, "v")
    .replace(/j/g, "y")
    .replace(/yi/g, "y")
    .replace(/ii/g, "iy")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function arePhotoNameWordsSimilar(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (
    left.length >= 4 &&
    right.length >= 4 &&
    (left.startsWith(right) || right.startsWith(left))
  ) {
    return true;
  }

  const distance = levenshteinDistance(left, right);
  const maxLength = Math.max(left.length, right.length);
  return maxLength >= 7 ? distance <= 2 : distance <= 1;
}

function arePhotoNamesSimilar(left, right) {
  const leftKey = normalizePhotoNameKey(left);
  const rightKey = normalizePhotoNameKey(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;

  const leftWords = leftKey.split(" ").filter(Boolean);
  const rightWords = rightKey.split(" ").filter(Boolean);
  if (leftWords.length === 1 || rightWords.length === 1) {
    return leftWords.length === 1 && rightWords.length === 1 && leftWords[0] === rightWords[0];
  }

  return (
    arePhotoNameWordsSimilar(leftWords[0], rightWords[0]) &&
    arePhotoNameWordsSimilar(leftWords.at(-1), rightWords.at(-1))
  );
}

function findExistingPlayerForPhoto(playersByClub, clubExternalId, sourceName) {
  const aliasName =
    PHOTO_NAME_ALIASES.get(`${clubExternalId}:${normalizeNameKey(sourceName)}`) ??
    null;
  const directMatch =
    findExistingPlayer(playersByClub, clubExternalId, sourceName) ??
    (aliasName ? findExistingPlayer(playersByClub, clubExternalId, aliasName) : null);
  if (directMatch) return directMatch;

  const candidates = playersByClub.get(clubExternalId) ?? [];
  return (
    candidates.find((player) =>
      arePhotoNamesSimilar(sourceName, player.displayName),
    ) ?? null
  );
}

function addPlayer(players, playersByClub, player, warnings) {
  const existing = findExistingPlayer(
    playersByClub,
    player.clubExternalId,
    player.displayName,
  );

  if (existing) {
    if (!existing.photoUrl && player.photoUrl) {
      existing.photoUrl = player.photoUrl;
      existing.photoThumbnailUrl = player.photoThumbnailUrl ?? player.photoUrl;
      existing.photoProvider = player.photoProvider;
      existing.photoSourceUrl = player.photoSourceUrl;
      existing.photoSourceThumbnailUrl = player.photoSourceThumbnailUrl;
    }

    warnings.push({
      type: "duplicate-player-skipped",
      clubExternalId: player.clubExternalId,
      displayName: player.displayName,
      existingExternalId: existing.externalId,
      skippedExternalId: player.externalId,
    });
    return existing;
  }

  players.push(player);
  if (!playersByClub.has(player.clubExternalId)) {
    playersByClub.set(player.clubExternalId, []);
  }
  playersByClub.get(player.clubExternalId).push(player);
  return player;
}

function createPlayer({
  externalId,
  sourceSlug,
  sourceUrl,
  displayName,
  position,
  jerseyNumber,
  clubExternalId,
  photoUrl,
  photoThumbnailUrl,
  photoProvider,
  photoSourceUrl,
  photoSourceThumbnailUrl,
  sourceStats = emptySourceStats(),
}) {
  const names = splitName(displayName);
  const player = {
    externalId,
    sourceSlug,
    sourceUrl,
    displayName: normalizeText(displayName),
    firstName: names.firstName,
    lastName: names.lastName,
    position,
    status: "active",
    jerseyNumber,
    clubExternalId,
    currentTeamExternalIds: [clubExternalId],
    listedTeamExternalIds: [clubExternalId],
    photoUrl,
    photoThumbnailUrl,
    photoProvider,
    photoSourceUrl,
    photoSourceThumbnailUrl,
    sourceStats,
    suggestedPrice: DEFAULT_PRICE,
  };
  player.suggestedPrice = suggestedPriceFor(player);
  return player;
}

function parseRosterRows(html, club) {
  const rows = [];
  const rowRegex =
    /<tr[^>]+class=["'][^"']*\bitem\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const rowHtml = match[1];
    const cells = [
      ...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
    ].map((cell) => cell[1]);
    const playerCell = cells[1] ?? "";
    const name =
      normalizeText(playerCell.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
      normalizeText(getAttr(playerCell, "alt"));

    if (!name) continue;

    const downloadPhoto = playerCell.match(
      /<a[^>]+class=["'][^"']*\bdownloadPhoto\b[^"']*["'][^>]+href=["']([^"']+)["']/i,
    )?.[1];
    const imgPhoto = playerCell.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    const fullPhotoUrl = toAbsoluteUrl(downloadPhoto, OFFICIAL_BASE_URL);
    const thumbnailUrl = toAbsoluteUrl(imgPhoto, OFFICIAL_BASE_URL);
    const sourcePhotoUrl = fullPhotoUrl ?? thumbnailUrl;
    const jerseyNumber = toNumber(cells[0]);
    const position = mapPosition(cells[6]);

    rows.push(
      createPlayer({
        externalId: `pol-fe:${club.statscoreId}:${slugify(name)}`,
        sourceSlug: slugify(name),
        sourceUrl: `${OFFICIAL_BASE_URL}/zawodnicy/${club.officialSlug}`,
        displayName: name,
        position,
        jerseyNumber,
        clubExternalId: club.statscoreId,
        photoUrl: sourcePhotoUrl,
        photoThumbnailUrl: thumbnailUrl ?? sourcePhotoUrl,
        photoProvider: sourcePhotoUrl ? "external_url" : null,
        photoSourceUrl: sourcePhotoUrl,
        photoSourceThumbnailUrl: thumbnailUrl ?? sourcePhotoUrl,
      }),
    );
  }

  return rows;
}

function isUsablePhotoUrl(value) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    !normalized.startsWith("data:") &&
    !normalized.includes("/img/user.png") &&
    !normalized.includes("/img/players/default") &&
    !normalized.includes("player-placeholder") &&
    !normalized.endsWith("/rd.jpg") &&
    !normalized.includes("/wp-content/uploads/rd-") &&
    !normalized.includes("/wp-content/uploads/rd.") &&
    !normalized.includes("red-dragons-13-sezon") &&
    !normalized.includes("cropped-red_dragons") &&
    !normalized.includes("header_partners") &&
    !normalized.includes("sponsors") &&
    !normalized.includes("mini_pzpn") &&
    !normalized.includes("mini_futsal_pzpn") &&
    !normalized.includes("mini_wzpn") &&
    !normalized.includes("flagcdn.com") &&
    !normalized.includes("facebook.com/tr") &&
    !normalized.includes("track.adform.net") &&
    !normalized.includes("logo") &&
    !normalized.includes("herb")
  );
}

function getImageUrlsFromHtml(html, baseUrl) {
  const urls = [];
  for (const imageMatch of html.matchAll(/<img[^>]*>/gi)) {
    const imageTag = imageMatch[0];
    const dataRwd = getAttr(imageTag, "data-ww_rwd") ?? "";
    const candidates = [
      getAttr(imageTag, "data-src"),
      getAttr(imageTag, "data-lazy-src"),
      ...[...dataRwd.matchAll(/"data-lazy-load-src"\s*:\s*\{[^}]*"[^"]+"\s*:\s*"([^"]+)"/gi)].map(
        (match) => match[1],
      ),
      getAttr(imageTag, "src"),
    ];
    const srcset = getAttr(imageTag, "srcset");
    if (srcset) {
      for (const srcsetPart of srcset.split(",")) {
        const [srcsetUrl] = srcsetPart.trim().split(/\s+/);
        candidates.push(srcsetUrl);
      }
    }

    for (const candidate of candidates) {
      const absoluteUrl = toAbsoluteUrl(candidate, baseUrl);
      if (!absoluteUrl || !isUsablePhotoUrl(absoluteUrl)) continue;
      urls.push(absoluteUrl);
    }
  }

  return [...new Set(urls)];
}

function createPhotoRow({ clubExternalId, displayName, photoUrl, sourceUrl }) {
  return {
    displayName: normalizeText(displayName),
    clubExternalId,
    photoUrl,
    photoThumbnailUrl: photoUrl,
    photoProvider: "external_url",
    photoSourceUrl: photoUrl,
    photoSourceThumbnailUrl: photoUrl,
    sourceUrl,
  };
}

function extractPiastWordPressGridPhotos(html, config) {
  const rows = [];
  const itemRegex =
    /<div[^>]+class=["'][^"']*\bgdlr-core-sp-player-grid-2\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+class=["'][^"']*\bgdlr-core-sp-player-grid-2\b|<div[^>]+class=["'][^"']*\bgdlr-core-pagination\b|<\/section>)/gi;

  for (const match of html.matchAll(itemRegex)) {
    const itemHtml = match[1];
    const name = normalizeText(
      itemHtml.match(
        /<h3[^>]+class=["'][^"']*\bgdlr-core-sp-player-title\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
      )?.[1],
    );
    const photoUrl = getImageUrlsFromHtml(itemHtml, config.sourceUrl)[0] ?? null;
    if (!name || !photoUrl) continue;

    const href = itemHtml.match(
      /<a[^>]+class=["'][^"']*\bgdlr-core-sp-player-link\b[^"']*["'][^>]+href=["']([^"']+)["']/i,
    )?.[1];
    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName: name,
        photoUrl,
        sourceUrl: toAbsoluteUrl(href, config.sourceUrl) ?? config.sourceUrl,
      }),
    );
  }

  return rows;
}

function extractLegiaWordPressGridPhotos(html, config) {
  const rows = [];
  const events = [];
  const eventRegex =
    /<img[^>]+src=["']([^"']*LWF_[^"']+)["'][^>]*>|<h2[^>]+class=["'][^"']*\bsc_item_title\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi;

  for (const match of html.matchAll(eventRegex)) {
    if (match[1]) {
      const photoUrl = toAbsoluteUrl(match[1], config.sourceUrl);
      if (photoUrl && isUsablePhotoUrl(photoUrl)) {
        events.push({ type: "photo", photoUrl });
      }
      continue;
    }

    const displayName = normalizeText(match[2]);
    if (displayName) events.push({ type: "name", displayName });
  }

  for (let index = 0; index < events.length - 1; index += 1) {
    const photoEvent = events[index];
    const nameEvent = events[index + 1];
    if (photoEvent.type !== "photo" || nameEvent.type !== "name") continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName: nameEvent.displayName,
        photoUrl: photoEvent.photoUrl,
        sourceUrl: config.sourceUrl,
      }),
    );
  }

  return rows;
}

function extractHostingerAssetFolder(html) {
  return (
    html.match(
      /https:\/\/assets\.zyrosite\.com\/(?:cdn-cgi\/image\/[^/]+\/)?([^/"'<&]+)\//i,
    )?.[1] ?? null
  );
}

function buildHostingerAssetUrl(assetFolder, assetPath) {
  return `https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=768,fit=crop/${assetFolder}/${assetPath}`;
}

function extractEurobusHostingerPhotos(html, config) {
  const rows = [];
  const assetFolder = extractHostingerAssetFolder(html);
  if (!assetFolder) return rows;

  for (const [assetPath, displayName] of EUROBUS_PHOTO_NAME_BY_PATH.entries()) {
    if (!html.includes(assetPath)) continue;
    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName,
        photoUrl: buildHostingerAssetUrl(assetFolder, assetPath),
        sourceUrl: config.sourceUrl,
      }),
    );
  }

  return rows;
}

function titleCaseFromSlug(value) {
  return normalizeText(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function extractSportigioCardName(cardHtml, href) {
  const modernName = normalizeText(
    cardHtml.match(
      /<span[^>]+class=["'][^"']*\bplcard-modern-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    )?.[1],
  );
  if (modernName) return modernName;

  const headingHtml = cardHtml.match(/<h4\b[\s\S]*?<\/h4>/i)?.[0] ?? "";
  const headingParts = [...headingHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((part) => normalizeText(part[1]))
    .filter(Boolean);
  if (headingParts.length > 0) return headingParts.join(" ");

  const slug = decodeURIComponent(href.split("/").filter(Boolean).at(-2) ?? "");
  return titleCaseFromSlug(slug);
}

function extractSportigioPlayerCardPhotos(html, config) {
  const rows = [];
  const cardRegex =
    /<a\b[^>]*href=["']([^"']*\/players\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(cardRegex)) {
    const href = toAbsoluteUrl(match[1], config.sourceUrl);
    if (!href) continue;

    const cardHtml = match[2];
    const photoUrl = getImageUrlsFromHtml(cardHtml, config.sourceUrl)[0] ?? null;
    if (!photoUrl) continue;

    const displayName = extractSportigioCardName(cardHtml, href);
    if (!displayName) continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName,
        photoUrl,
        sourceUrl: href,
      }),
    );
  }

  return rows;
}

function cleanClubPhotoDisplayName(value) {
  return normalizeText(value)
    .replace(/^\d+\s+/, "")
    .replace(/\s+\d+$/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWordPressLinkedPlayerPhotos(html, config) {
  const rows = [];
  const links = [];
  const linkRegex =
    /<a\b[^>]*href=["']([^"']*\/player\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkRegex)) {
    const href = toAbsoluteUrl(match[1], config.sourceUrl);
    const linkHtml = match[2];
    if (!href) continue;

    links.push({
      href,
      text: cleanClubPhotoDisplayName(linkHtml),
      photoUrl: getImageUrlsFromHtml(linkHtml, config.sourceUrl)[0] ?? null,
    });
  }

  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    if (!link.photoUrl) continue;

    const name =
      link.text ||
      cleanClubPhotoDisplayName(
        links.find(
          (candidate, candidateIndex) =>
            candidateIndex > index &&
            candidate.href === link.href &&
            candidate.text,
        )?.text,
      );
    if (!name) continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName: name,
        photoUrl: link.photoUrl,
        sourceUrl: link.href,
      }),
    );
  }

  return rows;
}

function extractSiteOriginPairedCellPhotos(html, config) {
  const rows = [];
  const cellRegex =
    /<div[^>]+class=["'][^"']*\bpanel-grid-cell\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+class=["'][^"']*\bpanel-grid-cell\b|<\/article>|<footer|$)/gi;
  let pendingPhotoUrl = null;

  for (const match of html.matchAll(cellRegex)) {
    const cellHtml = match[1];
    const photoUrl = getImageUrlsFromHtml(cellHtml, config.sourceUrl)[0] ?? null;
    if (photoUrl) {
      pendingPhotoUrl = photoUrl;
      continue;
    }

    const displayName = cleanClubPhotoDisplayName(
      cellHtml.match(
        /<h3[^>]+class=["'][^"']*\bwidget-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
      )?.[1],
    );
    if (!displayName || !pendingPhotoUrl) continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName,
        photoUrl: pendingPhotoUrl,
        sourceUrl: config.sourceUrl,
      }),
    );
    pendingPhotoUrl = null;
  }

  return rows;
}

function extractRekordBoardPhotos(html, config) {
  const rows = [];
  const cardRegex =
    /<a\b[^>]+class=["'][^"']*\bdruzyna\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(cardRegex)) {
    const cardHtml = match[1];
    const displayName = cleanClubPhotoDisplayName(
      cardHtml.match(
        /<div[^>]+class=["'][^"']*\bboard-name\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1],
    );
    const photoUrl = getImageUrlsFromHtml(cardHtml, config.sourceUrl)[0] ?? null;
    if (!displayName || !photoUrl) continue;

    const sourcePath = getAttr(match[0], "data-src");
    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName,
        photoUrl,
        sourceUrl: toAbsoluteUrl(sourcePath, config.sourceUrl) ?? config.sourceUrl,
      }),
    );
  }

  return rows;
}

function extractAzsWebwavePhotos(html, config) {
  const rows = [];
  const eventRegex =
    /<p[^>]+id=["'][^"']*_text_1["'][^>]*>([\s\S]*?)<\/p>|<img[^>]+data-ww_rwd=["'][^"']*data-lazy-load-src[\s\S]*?>/gi;
  let pendingName = null;

  for (const match of html.matchAll(eventRegex)) {
    if (match[1]) {
      const displayName = cleanClubPhotoDisplayName(match[1]);
      if (displayName) pendingName = displayName;
      continue;
    }

    const photoUrl = getImageUrlsFromHtml(match[0], config.sourceUrl)[0] ?? null;
    if (!pendingName || !photoUrl) continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName: pendingName,
        photoUrl,
        sourceUrl: config.sourceUrl,
      }),
    );
    pendingName = null;
  }

  return rows;
}

function extractRedDragonsCurrentPhotos(html, config) {
  const rows = [];
  const headings = [...html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)];

  for (let index = 0; index < headings.length; index += 1) {
    const displayName = cleanClubPhotoDisplayName(headings[index][1]);
    if (!displayName) continue;

    const blockStart = headings[index].index + headings[index][0].length;
    const blockEnd = headings[index + 1]?.index ?? html.length;
    const blockHtml = html.slice(blockStart, blockEnd);
    const photoUrl = getImageUrlsFromHtml(blockHtml, config.sourceUrl)[0] ?? null;
    if (!photoUrl) continue;

    rows.push(
      createPhotoRow({
        clubExternalId: config.clubExternalId,
        displayName,
        photoUrl,
        sourceUrl: config.sourceUrl,
      }),
    );
  }

  return rows;
}

function parseClubPhotoRows(html, config) {
  if (config.parser === "piast-wordpress-grid") {
    return extractPiastWordPressGridPhotos(html, config);
  }
  if (config.parser === "legia-wordpress-grid") {
    return extractLegiaWordPressGridPhotos(html, config);
  }
  if (config.parser === "eurobus-hostinger-builder") {
    return extractEurobusHostingerPhotos(html, config);
  }
  if (config.parser === "sportigio-player-cards") {
    return extractSportigioPlayerCardPhotos(html, config);
  }
  if (config.parser === "wordpress-linked-player-photos") {
    return extractWordPressLinkedPlayerPhotos(html, config);
  }
  if (config.parser === "siteorigin-paired-cells") {
    return extractSiteOriginPairedCellPhotos(html, config);
  }
  if (config.parser === "rekord-board") {
    return extractRekordBoardPhotos(html, config);
  }
  if (config.parser === "azs-webwave") {
    return extractAzsWebwavePhotos(html, config);
  }
  if (config.parser === "red-dragons-current") {
    return extractRedDragonsCurrentPhotos(html, config);
  }
  return [];
}

async function fetchOfficialRosterPlayers(warnings) {
  const players = [];
  const playersByClub = new Map();
  const rowsByClub = {};

  for (const club of CLUB_CONFIGS) {
    const url = `${OFFICIAL_BASE_URL}/zawodnicy/${club.officialSlug}`;
    try {
      const html = await fetchText(url);
      const rosterPlayers = parseRosterRows(html, club);
      rowsByClub[club.statscoreId] = rosterPlayers.length;

      if (rosterPlayers.length === 0) {
        warnings.push({
          type: "official-roster-empty",
          clubExternalId: club.statscoreId,
          clubName: club.name,
          sourceUrl: url,
        });
      }

      for (const player of rosterPlayers) {
        addPlayer(players, playersByClub, player, warnings);
      }
    } catch (error) {
      rowsByClub[club.statscoreId] = 0;
      warnings.push({
        type: "official-roster-fetch-failed",
        clubExternalId: club.statscoreId,
        clubName: club.name,
        sourceUrl: url,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { players, playersByClub, rowsByClub };
}

function buildCompetitionStats({ goals, yellowCards, redCards }) {
  return {
    goals: goals ?? 0,
    assists: 0,
    appearances: 0,
    yellowCards: yellowCards ?? 0,
    redCards: redCards ?? 0,
    ownGoals: 0,
  };
}

function buildFutsalPolskaRosterStats(sourceUrl, statValues) {
  const sourceStats = emptySourceStats();
  const stats = buildCompetitionStats(statValues);
  if (sourceUrl.includes("/i-liga-")) {
    sourceStats.firstLeague2025_26 = stats;
  } else {
    sourceStats.extraLeague2025_26 = stats;
  }
  return sourceStats;
}

function resolveClubIdFromRosterHref(href, aliasMap) {
  const lastSegment = decodeURIComponent(href.split("/").filter(Boolean).at(-1) ?? "");
  const withoutNumericPrefix = lastSegment.replace(/^\d+-/, "").replace(/-/g, " ");
  return resolveClubIdFromName(withoutNumericPrefix, aliasMap);
}

function extractFutsalPolskaRosterLinks(html, sourceUrl, aliasMap) {
  const links = [];
  const linkRegex =
    /<a[^>]+href=["']([^"']*\/roster\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkRegex)) {
    const href = toAbsoluteUrl(match[1], sourceUrl);
    if (!href) continue;

    const label = normalizeText(match[2]);
    const clubExternalId =
      resolveClubIdFromHeader(label, aliasMap) ??
      resolveClubIdFromName(label, aliasMap) ??
      resolveClubIdFromRosterHref(href, aliasMap);

    if (!clubExternalId) continue;

    links.push({
      clubExternalId,
      label,
      url: href,
      sourceUrl,
    });
  }

  return links;
}

async function discoverFutsalPolskaRosterLinks(warnings) {
  const aliasMap = buildClubAliasMap();
  const linksByClub = new Map();
  const candidatesByClub = {};

  for (const indexUrl of FUTSAL_POLSKA_ROSTER_INDEX_URLS) {
    let html = "";
    try {
      html = await fetchText(indexUrl);
    } catch (error) {
      warnings.push({
        type: "futsal-polska-roster-index-fetch-failed",
        sourceUrl: indexUrl,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const link of extractFutsalPolskaRosterLinks(html, indexUrl, aliasMap)) {
      if (!candidatesByClub[link.clubExternalId]) {
        candidatesByClub[link.clubExternalId] = [];
      }
      candidatesByClub[link.clubExternalId].push(link.url);
      if (!linksByClub.has(link.clubExternalId)) {
        linksByClub.set(link.clubExternalId, link);
      }
    }
  }

  for (const club of CLUB_CONFIGS) {
    if (linksByClub.has(club.statscoreId)) continue;
    warnings.push({
      type: "futsal-polska-roster-link-missing",
      clubExternalId: club.statscoreId,
      clubName: club.name,
    });
  }

  return { linksByClub, candidatesByClub };
}

function getPlayerSourceSlugFromUrl(sourceUrl, fallbackName) {
  const lastSegment = decodeURIComponent(
    sourceUrl.split("/").filter(Boolean).at(-1) ?? "",
  );
  return lastSegment.replace(/^\d+-/, "") || slugify(fallbackName);
}

function getFutsalPolskaPlayerExternalId(sourceUrl, clubExternalId, displayName) {
  const playerId = sourceUrl.match(/\/(\d+)-[^/]+$/)?.[1];
  if (playerId) return `pol-fp:${playerId}`;
  return `pol-fp:${clubExternalId}:${slugify(displayName)}`;
}

function extractRosterNumericStats(rowHtml) {
  const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
    (cell) => cell[1],
  );
  const numbers = cells
    .map((cell) => toNumber(cell))
    .filter((value) => value !== null);
  const birthYearIndex = numbers.findIndex(
    (value) => value >= 1900 && value <= 2012,
  );
  const statNumbers =
    birthYearIndex >= 0 ? numbers.slice(birthYearIndex + 1) : numbers.slice(-3);

  return {
    goals: statNumbers[0] ?? 0,
    yellowCards: statNumbers[1] ?? 0,
    redCards: statNumbers[2] ?? 0,
  };
}

function parseFutsalPolskaRosterRows(html, club, sourceUrl) {
  const rows = [];
  const rowRegex = /<tr\b[\s\S]*?<\/tr>/gi;
  let currentPosition = "universal";

  for (const match of html.matchAll(rowRegex)) {
    const rowHtml = match[0];
    const rowText = normalizeText(rowHtml);
    const rowKey = normalizeSearchText(rowText);

    if (rowKey.includes("bramkarze")) {
      currentPosition = "goalkeeper";
    } else if (
      rowKey.includes("rozgrywajacy") ||
      rowKey.includes("skrzydlowi") ||
      rowKey.includes("pivot")
    ) {
      currentPosition = "universal";
    }

    const name = normalizeText(
      rowHtml.match(
        /<span[^>]+class=["'][^"']*\bplayername\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      )?.[1],
    );
    if (!name) continue;

    const href = rowHtml.match(
      /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<span[^>]+class=["'][^"']*\bplayername\b/i,
    )?.[1];
    const playerSourceUrl = toAbsoluteUrl(href, FUTSAL_POLSKA_BASE_URL) ?? sourceUrl;
    const statValues = extractRosterNumericStats(rowHtml);
    const sourceStats = buildFutsalPolskaRosterStats(sourceUrl, statValues);

    rows.push(
      createPlayer({
        externalId: getFutsalPolskaPlayerExternalId(
          playerSourceUrl,
          club.statscoreId,
          name,
        ),
        sourceSlug: getPlayerSourceSlugFromUrl(playerSourceUrl, name),
        sourceUrl: playerSourceUrl,
        displayName: name,
        position: currentPosition,
        jerseyNumber: null,
        clubExternalId: club.statscoreId,
        photoUrl: null,
        photoThumbnailUrl: null,
        photoProvider: null,
        photoSourceUrl: null,
        photoSourceThumbnailUrl: null,
        sourceStats,
      }),
    );
  }

  return rows;
}

async function fetchFutsalPolskaRosterPlayers(warnings) {
  const players = [];
  const playersByClub = new Map();
  const rowsByClub = {};
  const { linksByClub, candidatesByClub } =
    await discoverFutsalPolskaRosterLinks(warnings);

  for (const club of CLUB_CONFIGS) {
    const rosterLink = linksByClub.get(club.statscoreId);
    if (!rosterLink) {
      rowsByClub[club.statscoreId] = 0;
      continue;
    }

    try {
      const html = await fetchText(rosterLink.url);
      const rosterPlayers = parseFutsalPolskaRosterRows(
        html,
        club,
        rosterLink.url,
      );
      rowsByClub[club.statscoreId] = rosterPlayers.length;

      if (rosterPlayers.length === 0) {
        warnings.push({
          type: "futsal-polska-roster-empty",
          clubExternalId: club.statscoreId,
          clubName: club.name,
          sourceUrl: rosterLink.url,
        });
      }

      for (const player of rosterPlayers) {
        addPlayer(players, playersByClub, player, warnings);
      }
    } catch (error) {
      rowsByClub[club.statscoreId] = 0;
      warnings.push({
        type: "futsal-polska-roster-fetch-failed",
        clubExternalId: club.statscoreId,
        clubName: club.name,
        sourceUrl: rosterLink.url,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    players,
    playersByClub,
    rowsByClub,
    rosterLinksByClub: Object.fromEntries(
      [...linksByClub.entries()].map(([clubExternalId, link]) => [
        clubExternalId,
        link.url,
      ]),
    ),
    rosterCandidatesByClub: candidatesByClub,
  };
}

async function enrichPlayersWithOfficialRosterPhotos(
  players,
  playersByClub,
  warnings,
) {
  let rows = 0;
  let photosApplied = 0;

  for (const club of CLUB_CONFIGS) {
    const url = `${OFFICIAL_BASE_URL}/zawodnicy/${club.officialSlug}`;
    try {
      const html = await fetchText(url);
      const rosterPlayers = parseRosterRows(html, club);
      rows += rosterPlayers.length;

      for (const officialPlayer of rosterPlayers) {
        if (!officialPlayer.photoUrl) continue;
        const existing = findExistingPlayer(
          playersByClub,
          club.statscoreId,
          officialPlayer.displayName,
        );
        if (!existing || existing.photoUrl) continue;

        existing.photoUrl = officialPlayer.photoUrl;
        existing.photoThumbnailUrl =
          officialPlayer.photoThumbnailUrl ?? officialPlayer.photoUrl;
        existing.photoProvider = officialPlayer.photoProvider;
        existing.photoSourceUrl = officialPlayer.photoSourceUrl;
        existing.photoSourceThumbnailUrl =
          officialPlayer.photoSourceThumbnailUrl ??
          officialPlayer.photoSourceUrl;
        photosApplied += 1;
      }
    } catch (error) {
      warnings.push({
        type: "official-photo-roster-fetch-failed",
        clubExternalId: club.statscoreId,
        clubName: club.name,
        sourceUrl: url,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { rows, photosApplied };
}

async function enrichPlayersWithClubPagePhotos(playersByClub, warnings) {
  let rows = 0;
  let photosApplied = 0;
  const rowsByClub = {};
  const appliedByClub = {};

  for (const config of CLUB_PHOTO_PAGE_CONFIGS) {
    const club = CLUB_CONFIGS.find(
      (clubConfig) => clubConfig.statscoreId === config.clubExternalId,
    );
    try {
      const html = await fetchText(config.sourceUrl);
      const photoRows = parseClubPhotoRows(html, config);
      rows += photoRows.length;
      rowsByClub[config.clubExternalId] = photoRows.length;
      appliedByClub[config.clubExternalId] = 0;

      const unmatched = [];
      for (const photoRow of photoRows) {
        const existing = findExistingPlayerForPhoto(
          playersByClub,
          config.clubExternalId,
          photoRow.displayName,
        );

        if (!existing) {
          unmatched.push(photoRow.displayName);
          continue;
        }
        if (existing.photoUrl) continue;

        existing.photoUrl = photoRow.photoUrl;
        existing.photoThumbnailUrl =
          photoRow.photoThumbnailUrl ?? photoRow.photoUrl;
        existing.photoProvider = photoRow.photoProvider;
        existing.photoSourceUrl = photoRow.photoSourceUrl;
        existing.photoSourceThumbnailUrl =
          photoRow.photoSourceThumbnailUrl ?? photoRow.photoSourceUrl;
        photosApplied += 1;
        appliedByClub[config.clubExternalId] += 1;
      }

      if (unmatched.length > 0) {
        warnings.push({
          type: "club-photo-player-not-matched",
          clubExternalId: config.clubExternalId,
          clubName: club?.name ?? config.clubExternalId,
          sourceUrl: config.sourceUrl,
          rows: unmatched.length,
          sample: unmatched.slice(0, 12),
        });
      }
    } catch (error) {
      rowsByClub[config.clubExternalId] = 0;
      appliedByClub[config.clubExternalId] = 0;
      warnings.push({
        type: "club-photo-page-fetch-failed",
        clubExternalId: config.clubExternalId,
        clubName: club?.name ?? config.clubExternalId,
        sourceUrl: config.sourceUrl,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    rows,
    photosApplied,
    rowsByClub,
    appliedByClub,
  };
}

function extractTransferArticleLines(html) {
  const startIndex = html.indexOf("Fogo Futsal Ekstraklasa. Transfery lato 2026");
  const body = startIndex >= 0 ? html.slice(startIndex) : html;
  const withLineBreaks = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");

  return withLineBreaks
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function cleanTransferPlayerName(line) {
  let value = normalizeText(line);
  value = value.replace(/\s*\([^)]*\)/g, " ");
  value = value.replace(/\s*,\s*$/g, "");
  value = value.replace(/\s*\.\s*$/g, "");
  value = value.replace(/\s+/g, " ").trim();

  if (!value) return null;
  if (/^trener\b/i.test(value)) return null;
  if (/^brak ruch[oó]w$/i.test(value)) return null;
  if (normalizeSearchText(value).split(" ").length === 0) return null;
  return value;
}

function normalizeTransferDisplayName(clubExternalId, displayName) {
  const aliasKey = `${clubExternalId}:${normalizeNameKey(displayName)}`;
  return TRANSFER_NAME_ALIASES.get(aliasKey) ?? displayName;
}

function parseTransferMovements(html, aliasMap, warnings) {
  const lines = extractTransferArticleLines(html);
  const incoming = [];
  const outgoing = [];
  let currentClubExternalId = null;
  let section = null;

  for (const line of lines) {
    const maybeClubExternalId = resolveClubIdFromHeader(line, aliasMap);
    const lineKey = normalizeSearchText(line);
    const isKnownClubHeader =
      maybeClubExternalId !== null &&
      lineKey.split(" ").length <= 8 &&
      !lineKey.includes("skocz do klubu");

    if (isKnownClubHeader) {
      currentClubExternalId = maybeClubExternalId;
      section = null;
      continue;
    }

    if (line.includes("Przychodzą")) {
      section = "incoming";
      continue;
    }

    if (line.includes("Odchodzą")) {
      section = "outgoing";
      continue;
    }

    if (
      (section !== "incoming" && section !== "outgoing") ||
      !currentClubExternalId
    ) {
      continue;
    }

    const displayName = cleanTransferPlayerName(line);
    if (!displayName) continue;

    const movement = {
      clubExternalId: currentClubExternalId,
      displayName: normalizeTransferDisplayName(
        currentClubExternalId,
        displayName,
      ),
      rawLine: line,
    };

    if (section === "incoming") incoming.push(movement);
    else outgoing.push(movement);
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    warnings.push({
      type: "transfer-report-empty",
      sourceUrl: `${FUTSAL_POLSKA_BASE_URL}/transfery2026`,
    });
  }

  return { incoming, outgoing };
}

function removePlayer(players, playersByClub, player) {
  const playerIndex = players.indexOf(player);
  if (playerIndex >= 0) players.splice(playerIndex, 1);

  const clubPlayers = playersByClub.get(player.clubExternalId) ?? [];
  const clubPlayerIndex = clubPlayers.indexOf(player);
  if (clubPlayerIndex >= 0) clubPlayers.splice(clubPlayerIndex, 1);
}

function findExistingPlayerAcrossClubs(
  playersByClub,
  displayName,
  excludedClubExternalId,
) {
  const candidateWords = normalizeNameKey(displayName).split(" ").filter(Boolean);
  if (candidateWords.length < 2) return null;

  for (const [clubExternalId] of playersByClub.entries()) {
    if (clubExternalId === excludedClubExternalId) continue;
    const existing = findExistingPlayer(playersByClub, clubExternalId, displayName);
    if (existing) return existing;
  }

  return null;
}

async function applyTransferUpdates(players, playersByClub, warnings) {
  const sourceUrl = `${FUTSAL_POLSKA_BASE_URL}/transfery2026`;
  let html = "";
  try {
    html = await fetchText(sourceUrl);
  } catch (error) {
    warnings.push({
      type: "transfer-report-fetch-failed",
      sourceUrl,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      incomingCount: 0,
      outgoingCount: 0,
      createdCount: 0,
      removedCount: 0,
      movedCount: 0,
      skippedExistingCount: 0,
      missingOutgoingCount: 0,
    };
  }

  const aliasMap = buildClubAliasMap();
  const movements = parseTransferMovements(html, aliasMap, warnings);
  let createdCount = 0;
  let removedCount = 0;
  let movedCount = 0;
  let skippedExistingCount = 0;
  let missingOutgoingCount = 0;

  for (const transfer of movements.outgoing) {
    const existing = findExistingPlayer(
      playersByClub,
      transfer.clubExternalId,
      transfer.displayName,
    );
    if (!existing) {
      missingOutgoingCount += 1;
      continue;
    }

    removePlayer(players, playersByClub, existing);
    removedCount += 1;
  }

  for (const transfer of movements.incoming) {
    if (
      findExistingPlayer(
        playersByClub,
        transfer.clubExternalId,
        transfer.displayName,
      )
    ) {
      skippedExistingCount += 1;
      continue;
    }

    const existingInAnotherClub = findExistingPlayerAcrossClubs(
      playersByClub,
      transfer.displayName,
      transfer.clubExternalId,
    );
    if (existingInAnotherClub) {
      removePlayer(players, playersByClub, existingInAnotherClub);
      movedCount += 1;
    }

    const player = createPlayer({
      externalId: `pol-fp-transfer:${transfer.clubExternalId}:${slugify(transfer.displayName)}`,
      sourceSlug: slugify(transfer.displayName),
      sourceUrl,
      displayName: transfer.displayName,
      position: "universal",
      jerseyNumber: null,
      clubExternalId: transfer.clubExternalId,
      photoUrl: null,
      photoThumbnailUrl: null,
      photoProvider: null,
      photoSourceUrl: null,
      photoSourceThumbnailUrl: null,
    });
    addPlayer(players, playersByClub, player, warnings);
    createdCount += 1;
  }

  return {
    incomingCount: movements.incoming.length,
    outgoingCount: movements.outgoing.length,
    createdCount,
    removedCount,
    movedCount,
    skippedExistingCount,
    missingOutgoingCount,
  };
}

function parseDateParts(value) {
  const match = normalizeText(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return asUtc - date.getTime();
}

function toUtcIsoFromWarsaw({ dateText, timeText }) {
  const dateParts = parseDateParts(dateText);
  const timeMatch = normalizeText(timeText).match(/^(\d{1,2}):(\d{2})$/);
  if (!dateParts || !timeMatch) return null;

  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
  );
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), WARSAW_TIME_ZONE);
  return new Date(utcGuess - offset).toISOString();
}

function addMinutes(isoString, minutes) {
  return new Date(Date.parse(isoString) + minutes * 60 * 1000).toISOString();
}

function extractClubFromFixtureCell(cellHtml, aliasMap) {
  const link = cellHtml.match(/<a[^>]+href=["']\/zespol\/([^"']+)["'][^>]*>/i);
  const slug = link ? decodeHtml(link[1]) : null;
  const title = link ? getAttr(link[0], "title") : null;
  const spanName = normalizeText(
    cellHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1],
  );
  const name = title || spanName || normalizeText(cellHtml);
  const bySlug = CLUB_CONFIGS.find((club) => club.officialSlug === slug);
  const clubExternalId =
    bySlug?.statscoreId ?? resolveClubIdFromName(name, aliasMap);

  return {
    clubExternalId,
    slug,
    name: bySlug?.name ?? name,
  };
}

function parseOfficialFixtures(html, warnings) {
  const fixtures = [];
  const aliasMap = buildClubAliasMap();
  const roundRegex =
    /<div[^>]+id=["']round(\d+)["'][^>]*class=["'][^"']*\bround\b[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+id=["']round\d+["'][^>]*class=["'][^"']*\bround\b|<script>|<\/section>)/gi;

  for (const roundMatch of html.matchAll(roundRegex)) {
    const gameweekNumber = Number(roundMatch[1]);
    const roundHtml = roundMatch[2];
    const dayChunks = roundHtml.split(/<div[^>]+class=["']dayHeader["'][^>]*>/i);

    for (const dayChunk of dayChunks.slice(1)) {
      const dateText = normalizeText(dayChunk.match(/<data>([^<]+)<\/data>/i)?.[1]);
      if (!dateText) continue;

      const fixtureRegex =
        /<div[^>]+class=["']gameTime["'][^>]*>([^<]*)<\/div>\s*<div[^>]+class=["']div-match-result["'][^>]*>\s*<div[^>]+class=["']homeTeam["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["']scoreBox["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["']guestTeam["'][^>]*>([\s\S]*?)<\/div>/gi;

      for (const fixtureMatch of dayChunk.matchAll(fixtureRegex)) {
        const timeText = normalizeText(fixtureMatch[1]);
        const home = extractClubFromFixtureCell(fixtureMatch[2], aliasMap);
        const away = extractClubFromFixtureCell(fixtureMatch[4], aliasMap);
        const scheduledAt = toUtcIsoFromWarsaw({ dateText, timeText });
        const scoreValues = [
          ...fixtureMatch[3].matchAll(
            /<span[^>]+class=["'][^"']*\bscore\b[^"']*["'][^>]*>([^<]*)<\/span>/gi,
          ),
        ].map((score) => toNumber(score[1]));
        const homeScore = scoreValues[0] ?? null;
        const awayScore = scoreValues[1] ?? null;
        const status =
          homeScore !== null && awayScore !== null ? "completed" : "scheduled";

        if (!home.clubExternalId || !away.clubExternalId || !scheduledAt) {
          warnings.push({
            type: "fixture-parse-incomplete",
            gameweekNumber,
            dateText,
            timeText,
            homeName: home.name,
            awayName: away.name,
          });
        }

        fixtures.push({
          externalId: `pol-fe-fixture:${gameweekNumber}:${dateText}:${timeText}:${home.slug ?? slugify(home.name)}:${away.slug ?? slugify(away.name)}`,
          sourceSlug: `${slugify(home.name)}-${slugify(away.name)}-${gameweekNumber}`,
          sourceUrl: `${OFFICIAL_BASE_URL}/terminarz`,
          title: `${home.name} — ${away.name}`,
          gameweekNumber,
          scheduledAt,
          homeClubExternalId: home.clubExternalId,
          awayClubExternalId: away.clubExternalId,
          homeClubName: home.name,
          awayClubName: away.name,
          homeScore,
          awayScore,
          status,
          venue: null,
          leagueExternalIds: [STATSCORE_COMPETITION_ID],
          seasonExternalIds: [STATSCORE_SEASON_ID],
          venueExternalIds: [],
        });
      }
    }
  }

  return fixtures.filter((fixture) => fixture.scheduledAt);
}

function buildGameweeks(fixtures) {
  const fixturesByRound = new Map();
  for (const fixture of fixtures) {
    if (!fixture.gameweekNumber) continue;
    if (!fixturesByRound.has(fixture.gameweekNumber)) {
      fixturesByRound.set(fixture.gameweekNumber, []);
    }
    fixturesByRound.get(fixture.gameweekNumber).push(fixture);
  }

  const now = Date.now();
  return [...fixturesByRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([number, roundFixtures]) => {
      const timestamps = roundFixtures
        .map((fixture) => Date.parse(fixture.scheduledAt))
        .filter(Number.isFinite)
        .sort((left, right) => left - right);
      const startsAt = timestamps[0] ? new Date(timestamps[0]).toISOString() : null;
      const endsAt = timestamps.at(-1)
        ? addMinutes(new Date(timestamps.at(-1)).toISOString(), 120)
        : null;
      const deadlineAt = startsAt ? addMinutes(startsAt, -1) : null;
      const deadlineTime = deadlineAt ? Date.parse(deadlineAt) : Infinity;
      const endTime = endsAt ? Date.parse(endsAt) : -Infinity;
      const status =
        now < deadlineTime ? "upcoming" : now <= endTime ? "live" : "completed";

      return {
        number,
        name: `Тур ${number}`,
        status,
        deadlineAt,
        startsAt,
        endsAt,
      };
    });
}

function buildSummary({
  clubs,
  players,
  fixtures,
  gameweeks,
  warnings,
  rosterInfo,
  transferInfo,
  photoInfo,
  clubPhotoInfo,
}) {
  const playersBySource = players.reduce((acc, player) => {
    let source = "futsal-polska-roster";
    if (player.externalId.startsWith("pol-fp-transfer:")) {
      source = "futsal-polska-transfer-incoming";
    } else if (!player.externalId.startsWith("pol-fp:")) {
      source = "other";
    }
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});
  const playersByClub = {};
  for (const club of clubs) {
    playersByClub[club.externalId] = players.filter(
      (player) => player.clubExternalId === club.externalId,
    ).length;
  }

  return {
    clubs: clubs.length,
    players: players.length,
    fixtures: fixtures.length,
    gameweeks: gameweeks.length,
    playersWithPhotos: players.filter((player) => Boolean(player.photoUrl)).length,
    playersWithoutPhotos: players.filter((player) => !player.photoUrl).length,
    playersBySource,
    playersByClub,
    futsalPolskaRosterRowsByClub: rosterInfo.rowsByClub,
    futsalPolskaRosterLinksByClub: rosterInfo.rosterLinksByClub,
    transferIncomingRows: transferInfo.incomingCount,
    transferOutgoingRows: transferInfo.outgoingCount,
    transferPlayersAdded: transferInfo.createdCount,
    transferPlayersRemoved: transferInfo.removedCount,
    transferPlayersMovedFromRoster: transferInfo.movedCount,
    transferPlayersSkippedExisting: transferInfo.skippedExistingCount,
    transferOutgoingRowsNotFoundInRoster: transferInfo.missingOutgoingCount,
    officialPhotoRows: photoInfo.rows,
    officialPhotosApplied: photoInfo.photosApplied,
    clubPhotoRows: clubPhotoInfo.rows,
    clubPhotosApplied: clubPhotoInfo.photosApplied,
    clubPhotoRowsByClub: clubPhotoInfo.rowsByClub,
    clubPhotosAppliedByClub: clubPhotoInfo.appliedByClub,
    warnings: warnings.length,
    warningsByType: warnings.reduce((acc, warning) => {
      acc[warning.type] = (acc[warning.type] ?? 0) + 1;
      return acc;
    }, {}),
    pricing: {
      version: "initial-polish-ekstraklasa-v6-balanced-stars",
      min: Math.min(...players.map((player) => player.suggestedPrice)),
      max: Math.max(...players.map((player) => player.suggestedPrice)),
      step: 0.5,
      updatedAt: new Date().toISOString(),
    },
  };
}

async function buildSource() {
  const warnings = [];
  const scheduleHtml = await fetchText(`${OFFICIAL_BASE_URL}/terminarz`);
  const officialLogoUrlBySlug = parseOfficialClubLogos(scheduleHtml);
  const statscoreTeams = await fetchStatscoreTeams(warnings);
  const clubs = buildClubs({ statscoreTeams, officialLogoUrlBySlug });
  const rosterInfo = await fetchFutsalPolskaRosterPlayers(warnings);
  const { players, playersByClub } = rosterInfo;
  const transferInfo = await applyTransferUpdates(players, playersByClub, warnings);
  const photoInfo = await enrichPlayersWithOfficialRosterPhotos(
    players,
    playersByClub,
    warnings,
  );
  const clubPhotoInfo = await enrichPlayersWithClubPagePhotos(
    playersByClub,
    warnings,
  );
  const fixtures = parseOfficialFixtures(scheduleHtml, warnings);
  const gameweeks = buildGameweeks(fixtures);

  for (const club of clubs) {
    club.rosterListExternalIds = players
      .filter((player) => player.clubExternalId === club.externalId)
      .map((player) => player.externalId);
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      baseUrl: FUTSAL_POLSKA_BASE_URL,
      apiBaseUrl: STATSCORE_QUERY_URL,
      tableSlug: "futsal-ekstraklasa-2026-27",
      leagueExternalId: STATSCORE_COMPETITION_ID,
      statSources: [
        {
          id: "futsal-polska-rosters",
          slug: "rosters-2025-26",
          title: "Futsal-Polska roster pages",
          sourceKind: "rosters",
          sourceUrl: `${FUTSAL_POLSKA_BASE_URL}/futsal-ekstraklasa`,
          rows: Object.values(rosterInfo.rowsByClub).reduce(
            (sum, count) => sum + count,
            0,
          ),
        },
        {
          id: "futsal-polska-transfery2026",
          slug: "transfery2026",
          title: "Futsal-Polska transfer report summer 2026",
          sourceKind: "transfer-updates",
          sourceUrl: `${FUTSAL_POLSKA_BASE_URL}/transfery2026`,
          rows: transferInfo.incomingCount + transferInfo.outgoingCount,
        },
        {
          id: "official-futsalekstraklasa-photo-enrichment",
          slug: "zawodnicy",
          title: "Official Futsal Ekstraklasa roster photos",
          sourceKind: "photo-enrichment",
          sourceUrl: `${OFFICIAL_BASE_URL}/zawodnicy/piast-gliwice`,
          rows: photoInfo.rows,
        },
        {
          id: "club-photo-page-enrichment",
          slug: "club-photo-pages",
          title: "Official club player photo pages",
          sourceKind: "photo-enrichment",
          sourceUrl: CLUB_PHOTO_PAGE_CONFIGS[0]?.sourceUrl ?? null,
          rows: clubPhotoInfo.rows,
        },
        {
          id: "official-futsalekstraklasa-schedule",
          slug: "terminarz",
          title: "Official Futsal Ekstraklasa schedule",
          sourceKind: "fixtures",
          sourceUrl: `${OFFICIAL_BASE_URL}/terminarz`,
          rows: fixtures.length,
        },
        {
          id: "statscore-futsal-ekstraklasa",
          slug: "statscore-teams",
          title: "Statscore Futsal Ekstraklasa teams",
          sourceKind: "clubs",
          sourceUrl: "https://futsal-ekstraklasa.statscore.com/",
          rows: statscoreTeams.length,
        },
      ],
    },
    season: {
      slug: SEASON_SLUG,
      sourceTableExternalId: STATSCORE_SEASON_ID,
      sourceTableUrl: "https://futsal-ekstraklasa.statscore.com/",
      name: "Polish Futsal Ekstraklasa 2026/27",
      leagueName: "Futsal Ekstraklasa",
      country: "Poland",
      displayName: "Futsal Ekstraklasa",
      shortName: "Ekstraklasa",
      description: "Fantasy-футзал польської Futsal Ekstraklasa.",
      logoKey: "polish-ekstraklasa",
      primaryColor: "#E30613",
      secondaryColor: "#980612",
      accentColor: "#E30613",
      budget: 100,
      squadSize: 12,
      activeSlots: 9,
      startingSlots: 5,
    },
    positions: [
      {
        id: "goalkeeper",
        sourceName: "Bramkarz",
        name: "Goalkeeper",
      },
      {
        id: "universal",
        sourceName: "Zawodnik z pola",
        name: "Universal",
      },
    ],
    clubs,
    players,
    gameweeks,
    fixtures,
    warnings,
    summary: buildSummary({
      clubs,
      players,
      fixtures,
      gameweeks,
      warnings,
      rosterInfo,
      transferInfo,
      photoInfo,
      clubPhotoInfo,
    }),
  };
}

async function main() {
  const options = parseArgs();
  const source = await buildSource();
  const outputPath = path.resolve(projectRoot, options.out);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`, "utf8");

  console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
  console.log(
    `Clubs: ${source.clubs.length}, players: ${source.players.length}, fixtures: ${source.fixtures.length}, gameweeks: ${source.gameweeks.length}`,
  );
  if (source.warnings.length > 0) {
    console.log(`Warnings: ${source.warnings.length}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
