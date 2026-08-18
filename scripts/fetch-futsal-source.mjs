#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateSuggestedPrice } from "./futsal-pricing.mjs";

const SPORTSPRESS_API = "https://futsal.com.ua/wp-json/sportspress/v2";
const WORDPRESS_API = "https://futsal.com.ua/wp-json/wp/v2";
const SOURCE_BASE_URL = "https://futsal.com.ua";

const EXTRA_LEAGUE_2026_27_TABLE_SLUG = "ekstra-liha-2026-27";
const EXTRA_LEAGUE_2026_27_LEAGUE_ID = 810;

const POSITION_MAP = new Map([
  [101, "goalkeeper"],
  [102, "universal"],
]);

const CLUB_VIEW_OVERRIDES_BY_EXTERNAL_ID = new Map([
  [
    "21695",
    {
      name: "SkyUp",
      shortName: "SkyUp",
      sourceName: "SkyUp",
    },
  ],
]);

const STAT_LISTS = [
  {
    key: "extraLeague2025_26",
    sourceKind: "topScorers",
    slug: "reytynh-bombardyriv-sezon-24-25",
  },
  {
    key: "extraLeague2025_26",
    sourceKind: "assists",
    slug: "tablytsia-asystiv-ekstra-liha-sezon-2024-2025",
  },
  {
    key: "firstLeague2025_26",
    sourceKind: "topScorers",
    slug: "tablytsia-bombardyriv-pershoi-lihy-2024-2025",
  },
];

const DEFAULT_OUTPUT_PATH = "data/futsal/source-2026-27.json";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    out: DEFAULT_OUTPUT_PATH,
    skipAllPlayersScan: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") {
      options.out = args[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
      continue;
    }

    if (arg === "--skip-all-players-scan") {
      options.skipAllPlayersScan = true;
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
  console.log(`Fetch futsal.com.ua source data into a local staging JSON.

Usage:
  npm run data:futsal
  npm run data:futsal -- --out data/futsal/source-2026-27.json

Options:
  --out <path>                 Output JSON path. Default: ${DEFAULT_OUTPUT_PATH}
  --skip-all-players-scan      Skip the heavier fallback scan across all players.
`);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»");
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]*>/g, " ");
}

function normalizeText(value) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value) {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toExternalId(value) {
  return String(value);
}

function uniq(values) {
  return [
    ...new Set(values.filter((value) => value !== null && value !== undefined)),
  ];
}

function buildUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Fantasy Extra-liga data importer",
    },
  });

  if (!response.ok) {
    if (attempt < 3 && response.status >= 500) {
      await sleep(700 * attempt);
      return await fetchJson(url, attempt + 1);
    }

    throw new Error(
      `Request failed ${response.status} ${response.statusText}: ${url}`,
    );
  }

  return {
    data: await response.json(),
    headers: response.headers,
  };
}

async function fetchSportspressItem(endpoint, id) {
  const { data } = await fetchJson(`${SPORTSPRESS_API}/${endpoint}/${id}`);
  return data;
}

async function fetchSportspressCollection(endpoint, params = {}) {
  const perPage = params.per_page ?? 100;
  const items = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    const url = buildUrl(`${SPORTSPRESS_API}/${endpoint}`, {
      ...params,
      per_page: perPage,
      page,
    });
    const { data, headers } = await fetchJson(url);
    if (!Array.isArray(data)) {
      throw new Error(`Expected array response for ${url}`);
    }

    items.push(...data);
    totalPages = Number(headers.get("x-wp-totalpages") ?? 1);

    if (data.length === 0) break;
  }

  return items;
}

function createCachedFetcher(fetcher) {
  const cache = new Map();

  return async (key) => {
    if (!key) return null;
    if (!cache.has(key)) {
      cache.set(key, fetcher(key));
    }
    return await cache.get(key);
  };
}

const fetchMedia = createCachedFetcher(async (mediaId) => {
  const { data } = await fetchJson(`${WORDPRESS_API}/media/${mediaId}`);
  const sizes = data.media_details?.sizes ?? {};

  return {
    id: toExternalId(data.id),
    altText: normalizeText(data.alt_text ?? ""),
    sourceUrl: data.source_url ?? null,
    mediumUrl: sizes.medium?.source_url ?? null,
    thumbnailUrl: sizes.thumbnail?.source_url ?? null,
  };
});

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, worker),
  );
  return results;
}

function parseClubTitle(title) {
  const cleanTitle = normalizeText(title)
    .replace(/[“”«»"]/g, "")
    .trim();
  const cityMatch = cleanTitle.match(/^(.*?)\s*\((.*?)\)\s*$/);
  const name = cityMatch ? cityMatch[1].trim() : cleanTitle;
  const city = cityMatch ? cityMatch[2].trim() : null;

  return {
    name,
    city,
    shortName: name,
    sourceName: cleanTitle,
  };
}

function splitPersonName(displayName) {
  const parts = normalizeText(displayName).split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: null, lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizePosition(positionIds) {
  const mapped = (positionIds ?? [])
    .map((positionId) => POSITION_MAP.get(positionId))
    .find(Boolean);
  return mapped ?? "universal";
}

function extractStats(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return {
    goals: toNumber(row.goals),
    assists: toNumber(row.assists),
    appearances: toNumber(
      row.appearances || row.eventsplayed || row.eventsattended,
    ),
    yellowCards: toNumber(row.yellowcards),
    redCards: toNumber(row.redcards),
    ownGoals: toNumber(row.owngoals),
  };
}

function mergeStats(previous, next) {
  if (!previous) return next;
  if (!next) return previous;

  return {
    goals: Math.max(previous.goals, next.goals),
    assists: Math.max(previous.assists, next.assists),
    appearances: Math.max(previous.appearances, next.appearances),
    yellowCards: Math.max(previous.yellowCards, next.yellowCards),
    redCards: Math.max(previous.redCards, next.redCards),
    ownGoals: Math.max(previous.ownGoals, next.ownGoals),
  };
}

async function findTableBySlug(slug) {
  const tables = await fetchSportspressCollection("tables", {
    slug,
    per_page: 10,
  });

  const table = tables.find((item) => item.slug === slug);
  if (!table) {
    throw new Error(`Could not find SportsPress table by slug: ${slug}`);
  }

  return table;
}

async function fetchStatLists() {
  const playerStats = new Map();
  const statSources = [];

  for (const statListConfig of STAT_LISTS) {
    const listItems = await fetchSportspressCollection("lists", {
      slug: statListConfig.slug,
      per_page: 10,
    });
    const list = listItems.find((item) => item.slug === statListConfig.slug);
    if (!list) {
      throw new Error(
        `Could not find SportsPress list by slug: ${statListConfig.slug}`,
      );
    }

    const listDetails = await fetchSportspressItem("lists", list.id);
    const data = listDetails.data ?? {};
    const rows = Object.entries(data).filter(([playerId]) => playerId !== "0");

    statSources.push({
      id: toExternalId(listDetails.id),
      slug: listDetails.slug,
      title: normalizeText(listDetails.title?.rendered),
      sourceKind: statListConfig.sourceKind,
      sourceUrl: listDetails.link,
      rows: rows.length,
    });

    for (const [playerId, row] of rows) {
      const externalPlayerId = toExternalId(playerId);
      const existing = playerStats.get(externalPlayerId) ?? {};
      existing[statListConfig.key] = mergeStats(
        existing[statListConfig.key],
        extractStats(row),
      );
      playerStats.set(externalPlayerId, existing);
    }
  }

  return { playerStats, statSources };
}

async function fetchAllPlayersLite() {
  return await fetchSportspressCollection("players", {
    per_page: 100,
    _fields:
      "id,slug,link,title,featured_media,current_teams,teams,positions,number,date,modified",
  });
}

function createPlayerView(
  player,
  clubExternalId,
  listedTeamExternalIds,
  statsByCompetition,
  media,
) {
  const displayName = normalizeText(player.title?.rendered);
  const { firstName, lastName } = splitPersonName(displayName);
  const position = normalizePosition(player.positions);

  return {
    externalId: toExternalId(player.id),
    sourceSlug: player.slug,
    sourceUrl: player.link,
    displayName,
    firstName,
    lastName,
    position,
    jerseyNumber: toOptionalNumber(player.number),
    clubExternalId,
    currentTeamExternalIds: (player.current_teams ?? []).map(toExternalId),
    listedTeamExternalIds: uniq(listedTeamExternalIds.map(toExternalId)),
    photoUrl: media?.sourceUrl ?? null,
    photoThumbnailUrl: media?.thumbnailUrl ?? null,
    photoProvider: media?.sourceUrl ? "source" : null,
    photoCloudflareId: null,
    photoStorageKey: null,
    photoSourceUrl: media?.sourceUrl ?? null,
    photoSourceThumbnailUrl: media?.thumbnailUrl ?? null,
    sourceStats: {
      extraLeague2025_26: statsByCompetition.extraLeague2025_26 ?? null,
      firstLeague2025_26: statsByCompetition.firstLeague2025_26 ?? null,
    },
    suggestedPrice: calculateSuggestedPrice({
      clubExternalId,
      displayName,
      statsByCompetition,
    }),
  };
}

async function main() {
  const options = parseArgs();
  const warnings = [];
  const generatedAt = new Date().toISOString();
  const outputPath = path.resolve(projectRoot, options.out);

  console.log("Fetching SportsPress table...");
  const table = await findTableBySlug(EXTRA_LEAGUE_2026_27_TABLE_SLUG);
  const tableDetails = await fetchSportspressItem("tables", table.id);
  const targetTeamExternalIds = Object.keys(tableDetails.data ?? {}).filter(
    (teamId) => teamId !== "0",
  );
  const targetTeamSet = new Set(targetTeamExternalIds);

  console.log("Fetching previous season stat lists...");
  const { playerStats, statSources } = await fetchStatLists();

  console.log("Fetching current season teams...");
  const teamDetails = await mapLimit(
    targetTeamExternalIds,
    4,
    async (teamId, index) => {
      const team = await fetchSportspressItem("teams", teamId);
      const media = team.featured_media
        ? await fetchMedia(team.featured_media)
        : null;
      const parsed = parseClubTitle(team.title?.rendered);
      const clubOverride = CLUB_VIEW_OVERRIDES_BY_EXTERNAL_ID.get(
        toExternalId(team.id),
      );

      return {
        source: team,
        view: {
          externalId: toExternalId(team.id),
          sourceSlug: team.slug,
          sourceUrl: team.link,
          sourceName: clubOverride?.sourceName ?? parsed.sourceName,
          name: clubOverride?.name ?? parsed.name,
          shortName: clubOverride?.shortName ?? parsed.shortName,
          city: parsed.city,
          logoUrl: media?.sourceUrl ?? null,
          logoThumbnailUrl: media?.thumbnailUrl ?? null,
          rosterListExternalIds: (team.lists ?? []).map(toExternalId),
          sortOrder: index + 1,
          isActive: true,
        },
      };
    },
  );

  const clubs = teamDetails.map((team) => team.view);
  const teamByExternalId = new Map(
    teamDetails.map((team) => [toExternalId(team.source.id), team]),
  );
  const listedTeamIdsByPlayerId = new Map();

  console.log("Fetching roster lists...");
  for (const team of teamDetails) {
    const lists = team.source.lists ?? [];
    if (lists.length === 0) {
      warnings.push({
        type: "missing-roster-list",
        severity: "warning",
        message: `Team has no SportsPress roster list: ${team.view.sourceName}`,
        teamExternalId: team.view.externalId,
        teamName: team.view.sourceName,
      });
      continue;
    }

    for (const listId of lists) {
      const rosterList = await fetchSportspressItem("lists", listId);
      const playerIds = Object.keys(rosterList.data ?? {}).filter(
        (playerId) => playerId !== "0",
      );
      for (const playerId of playerIds) {
        const listedTeamIds = listedTeamIdsByPlayerId.get(playerId) ?? [];
        listedTeamIds.push(team.view.externalId);
        listedTeamIdsByPlayerId.set(playerId, listedTeamIds);
      }
    }
  }

  let allPlayersLite = [];
  if (!options.skipAllPlayersScan) {
    console.log("Scanning all players for current-team fallback...");
    allPlayersLite = await fetchAllPlayersLite();
    for (const player of allPlayersLite) {
      for (const currentTeamId of player.current_teams ?? []) {
        const currentTeamExternalId = toExternalId(currentTeamId);
        if (!targetTeamSet.has(currentTeamExternalId)) continue;

        const listedTeamIds =
          listedTeamIdsByPlayerId.get(toExternalId(player.id)) ?? [];
        if (!listedTeamIds.includes(currentTeamExternalId)) {
          listedTeamIds.push(currentTeamExternalId);
          listedTeamIdsByPlayerId.set(toExternalId(player.id), listedTeamIds);
          warnings.push({
            type: "player-found-by-current-team-fallback",
            severity: "info",
            message: `Player is attached by current_teams fallback: ${normalizeText(player.title?.rendered)}`,
            playerExternalId: toExternalId(player.id),
            playerName: normalizeText(player.title?.rendered),
            teamExternalId: currentTeamExternalId,
            teamName:
              teamByExternalId.get(currentTeamExternalId)?.view.sourceName ??
              null,
          });
        }
      }
    }
  }

  const allPlayersById = new Map(
    allPlayersLite.map((player) => [toExternalId(player.id), player]),
  );
  const playerExternalIds = [...listedTeamIdsByPlayerId.keys()];

  console.log(`Normalizing ${playerExternalIds.length} players...`);
  const players = await mapLimit(
    playerExternalIds,
    6,
    async (playerExternalId) => {
      const player =
        allPlayersById.get(playerExternalId) ??
        (await fetchSportspressItem("players", playerExternalId));
      const listedTeamExternalIds = uniq(
        listedTeamIdsByPlayerId.get(playerExternalId) ?? [],
      );
      const currentTargetTeamIds = (player.current_teams ?? [])
        .map(toExternalId)
        .filter((teamId) => targetTeamSet.has(teamId));
      const selectedClubExternalId =
        currentTargetTeamIds[0] ?? listedTeamExternalIds[0] ?? null;
      const media = player.featured_media
        ? await fetchMedia(player.featured_media)
        : null;
      const statsByCompetition = playerStats.get(playerExternalId) ?? {};
      const displayName = normalizeText(player.title?.rendered);

      if (listedTeamExternalIds.length > 1) {
        warnings.push({
          type: "duplicate-player-in-rosters",
          severity: "warning",
          message: `Player appears in several current rosters: ${displayName}`,
          playerExternalId,
          playerName: displayName,
          listedTeamExternalIds,
        });
      }

      if (
        currentTargetTeamIds.length > 0 &&
        listedTeamExternalIds.some(
          (teamId) => !currentTargetTeamIds.includes(teamId),
        )
      ) {
        warnings.push({
          type: "roster-player-current-team-mismatch",
          severity: "warning",
          message: `Roster list and current_teams disagree for player: ${displayName}`,
          playerExternalId,
          playerName: displayName,
          listedTeamExternalIds,
          currentTeamExternalIds: currentTargetTeamIds,
        });
      }

      if (!media?.sourceUrl) {
        warnings.push({
          type: "missing-player-photo",
          severity: "info",
          message: `Player has no featured photo: ${displayName}`,
          playerExternalId,
          playerName: displayName,
        });
      }

      if (
        !(player.positions ?? []).some((positionId) =>
          POSITION_MAP.has(positionId),
        )
      ) {
        warnings.push({
          type: "unknown-player-position",
          severity: "warning",
          message: `Player has no recognized position, defaulted to universal: ${displayName}`,
          playerExternalId,
          playerName: displayName,
          sourcePositionIds: player.positions ?? [],
        });
      }

      return createPlayerView(
        player,
        selectedClubExternalId,
        listedTeamExternalIds,
        statsByCompetition,
        media,
      );
    },
  );

  console.log("Fetching current fixtures...");
  const events = await fetchSportspressCollection("events", {
    leagues: EXTRA_LEAGUE_2026_27_LEAGUE_ID,
    per_page: 100,
  });
  const fixtures = events
    .filter((event) =>
      (event.teams ?? []).some((teamId) =>
        targetTeamSet.has(toExternalId(teamId)),
      ),
    )
    .map((event) => {
      const [homeTeamId, awayTeamId] = event.teams ?? [];
      const homeClubExternalId = homeTeamId ? toExternalId(homeTeamId) : null;
      const awayClubExternalId = awayTeamId ? toExternalId(awayTeamId) : null;
      const homeClub = homeClubExternalId
        ? teamByExternalId.get(homeClubExternalId)?.view
        : null;
      const awayClub = awayClubExternalId
        ? teamByExternalId.get(awayClubExternalId)?.view
        : null;
      const result = event.results ?? {};

      if (!homeClub || !awayClub) {
        warnings.push({
          type: "fixture-unknown-club",
          severity: "warning",
          message: `Fixture references a team outside current table: ${normalizeText(event.title?.rendered)}`,
          fixtureExternalId: toExternalId(event.id),
          sourceTeamIds: (event.teams ?? []).map(toExternalId),
        });
      }

      return {
        externalId: toExternalId(event.id),
        sourceSlug: event.slug,
        sourceUrl: event.link,
        title:
          homeClub && awayClub
            ? homeClub.sourceName + " — " + awayClub.sourceName
            : normalizeText(event.title?.rendered),
        scheduledAt: event.date ? new Date(event.date).toISOString() : null,
        homeClubExternalId,
        awayClubExternalId,
        homeClubName: homeClub?.sourceName ?? null,
        awayClubName: awayClub?.sourceName ?? null,
        homeScore: toOptionalNumber(result[homeClubExternalId]?.goals),
        awayScore: toOptionalNumber(result[awayClubExternalId]?.goals),
        status: event.main_results?.length ? "completed" : "scheduled",
        leagueExternalIds: (event.leagues ?? []).map(toExternalId),
        seasonExternalIds: (event.seasons ?? []).map(toExternalId),
        venueExternalIds: (event.venues ?? []).map(toExternalId),
      };
    });

  const playersWithPhotos = players.filter((player) => player.photoUrl).length;
  const output = {
    schemaVersion: 1,
    generatedAt,
    source: {
      baseUrl: SOURCE_BASE_URL,
      apiBaseUrl: SPORTSPRESS_API,
      tableSlug: EXTRA_LEAGUE_2026_27_TABLE_SLUG,
      leagueExternalId: toExternalId(EXTRA_LEAGUE_2026_27_LEAGUE_ID),
      statSources,
    },
    season: {
      slug: "ukrainian-extra-league-2026-27",
      sourceTableExternalId: toExternalId(tableDetails.id),
      sourceTableUrl: tableDetails.link,
      name: "Українська Екстра-ліга 2026/27",
      leagueName: "Екстра-ліга",
      country: "Ukraine",
      budget: 100,
      squadSize: 12,
      activeSlots: 9,
      startingSlots: 5,
    },
    positions: [
      { externalId: "101", sourceName: "Воротар", normalized: "goalkeeper" },
      { externalId: "102", sourceName: "Універсал", normalized: "universal" },
    ],
    clubs,
    players: players.sort((a, b) => {
      const clubDelta =
        Number(a.clubExternalId ?? 0) - Number(b.clubExternalId ?? 0);
      if (clubDelta !== 0) return clubDelta;
      return a.displayName.localeCompare(b.displayName, "uk");
    }),
    fixtures: fixtures.sort((a, b) =>
      String(a.scheduledAt).localeCompare(String(b.scheduledAt)),
    ),
    warnings,
    summary: {
      clubs: clubs.length,
      players: players.length,
      fixtures: fixtures.length,
      playersWithPhotos,
      playersWithoutPhotos: players.length - playersWithPhotos,
      warnings: warnings.length,
      warningsByType: warnings.reduce((acc, warning) => {
        acc[warning.type] = (acc[warning.type] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(`Saved ${path.relative(projectRoot, outputPath)}`);
  console.log(`Clubs: ${output.summary.clubs}`);
  console.log(`Players: ${output.summary.players}`);
  console.log(`Fixtures: ${output.summary.fixtures}`);
  console.log(
    `Photos: ${output.summary.playersWithPhotos}/${output.summary.players}`,
  );
  console.log(`Warnings: ${output.summary.warnings}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
