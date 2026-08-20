import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin } from "./authHelpers";
import {
  fantasyFixtureStatusValidator,
  fantasyGameweekStatusValidator,
  fantasyPlayerPositionValidator,
  fantasyPlayerStatusDetailsValidator,
  fantasyPlayerStatusValidator,
} from "./validators";

const DEFAULT_SEASON_SLUG = "ukrainian-extra-league-2026-27";
const DEFAULT_SEASON_NAME = "Українська Екстра-ліга 2026/27";
const DEFAULT_LEAGUE_NAME = "Екстра-ліга";
const DEFAULT_COUNTRY = "Ukraine";
const DEFAULT_BUDGET = 100;
const DEFAULT_SQUAD_SIZE = 12;
const DEFAULT_ACTIVE_SLOTS = 9;
const DEFAULT_STARTING_SLOTS = 5;
const DEFAULT_FREE_TRANSFERS_PER_GAMEWEEK = 1;
const DEFAULT_MAX_FREE_TRANSFERS = 5;
const DEFAULT_MAX_TRANSFERS_PER_GAMEWEEK = 5;
const DEFAULT_TRANSFER_PENALTY_POINTS = 4;
const DEFAULT_PRICE_CHANGE_LIMIT = 0.5;

const playerSourceStatValidator = v.object({
  goals: v.number(),
  assists: v.number(),
  appearances: v.number(),
  yellowCards: v.number(),
  redCards: v.number(),
  ownGoals: v.number(),
});

const nullablePlayerSourceStatValidator = v.union(
  playerSourceStatValidator,
  v.null(),
);

const importClubValidator = v.object({
  externalId: v.string(),
  sourceSlug: v.string(),
  sourceUrl: v.string(),
  sourceName: v.string(),
  name: v.string(),
  shortName: v.union(v.string(), v.null()),
  city: v.union(v.string(), v.null()),
  logoUrl: v.union(v.string(), v.null()),
  logoThumbnailUrl: v.union(v.string(), v.null()),
  rosterListExternalIds: v.array(v.string()),
  sortOrder: v.number(),
  isActive: v.boolean(),
});

const importPlayerValidator = v.object({
  externalId: v.string(),
  sourceSlug: v.string(),
  sourceUrl: v.string(),
  displayName: v.string(),
  firstName: v.union(v.string(), v.null()),
  lastName: v.string(),
  position: fantasyPlayerPositionValidator,
  status: v.optional(fantasyPlayerStatusValidator),
  statusDetails: v.optional(
    v.union(fantasyPlayerStatusDetailsValidator, v.null()),
  ),
  jerseyNumber: v.union(v.number(), v.null()),
  clubExternalId: v.union(v.string(), v.null()),
  currentTeamExternalIds: v.array(v.string()),
  listedTeamExternalIds: v.array(v.string()),
  photoUrl: v.union(v.string(), v.null()),
  photoThumbnailUrl: v.union(v.string(), v.null()),
  photoProvider: v.optional(v.union(v.string(), v.null())),
  photoCloudflareId: v.optional(v.union(v.string(), v.null())),
  photoStorageKey: v.optional(v.union(v.string(), v.null())),
  photoSourceUrl: v.optional(v.union(v.string(), v.null())),
  photoSourceThumbnailUrl: v.optional(v.union(v.string(), v.null())),
  sourceStats: v.object({
    extraLeague2025_26: nullablePlayerSourceStatValidator,
    firstLeague2025_26: nullablePlayerSourceStatValidator,
  }),
  suggestedPrice: v.number(),
});

const importGameweekValidator = v.object({
  number: v.number(),
  name: v.string(),
  status: v.optional(fantasyGameweekStatusValidator),
  deadlineAt: v.union(v.string(), v.null()),
  startsAt: v.union(v.string(), v.null()),
  endsAt: v.union(v.string(), v.null()),
});

const importFixtureValidator = v.object({
  externalId: v.string(),
  sourceSlug: v.string(),
  sourceUrl: v.string(),
  title: v.string(),
  gameweekNumber: v.optional(v.union(v.number(), v.null())),
  scheduledAt: v.union(v.string(), v.null()),
  homeClubExternalId: v.union(v.string(), v.null()),
  awayClubExternalId: v.union(v.string(), v.null()),
  homeClubName: v.union(v.string(), v.null()),
  awayClubName: v.union(v.string(), v.null()),
  homeScore: v.union(v.number(), v.null()),
  awayScore: v.union(v.number(), v.null()),
  status: fantasyFixtureStatusValidator,
  venue: v.optional(v.union(v.string(), v.null())),
  leagueExternalIds: v.array(v.string()),
  seasonExternalIds: v.array(v.string()),
  venueExternalIds: v.array(v.string()),
});

const importSourceValidator = v.object({
  schemaVersion: v.number(),
  generatedAt: v.string(),
  source: v.object({
    baseUrl: v.string(),
    apiBaseUrl: v.string(),
    tableSlug: v.string(),
    leagueExternalId: v.string(),
    statSources: v.array(v.any()),
  }),
  season: v.object({
    slug: v.string(),
    sourceTableExternalId: v.string(),
    sourceTableUrl: v.string(),
    name: v.string(),
    leagueName: v.string(),
    country: v.string(),
    budget: v.number(),
    squadSize: v.number(),
    activeSlots: v.number(),
    startingSlots: v.number(),
  }),
  positions: v.array(v.any()),
  clubs: v.array(importClubValidator),
  players: v.array(importPlayerValidator),
  gameweeks: v.optional(v.array(importGameweekValidator)),
  fixtures: v.array(importFixtureValidator),
  warnings: v.array(v.any()),
  summary: v.any(),
});

type ImportSource = typeof importSourceValidator.type;
type ImportClub = typeof importClubValidator.type;
type ImportGameweek = typeof importGameweekValidator.type;
type ImportPlayer = typeof importPlayerValidator.type;
type ImportFixture = typeof importFixtureValidator.type;

type ImportCounters = {
  createdClubs: number;
  updatedClubs: number;
  deactivatedClubs: number;
  createdFixtures: number;
  updatedFixtures: number;
  skippedFixtures: number;
  createdGameweeks: number;
  updatedGameweeks: number;
  createdPlayers: number;
  updatedPlayers: number;
  deactivatedPlayers: number;
};

type ImportPreview = ImportCounters & {
  dryRun: boolean;
  seasonCreated: boolean;
  seasonId: Id<"fantasySeasons"> | null;
  sourceWarnings: number;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toOptionalText(value: string | null | undefined) {
  const normalized = value ? normalizeText(value) : "";
  return normalized || undefined;
}

function toOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeImportPlayerStatusDetails(
  details: Exclude<ImportPlayer["statusDetails"], null | undefined>,
  updatedAt: number,
) {
  const message = toOptionalText(details.message);
  const messageEn = toOptionalText(details.messageEn);
  const messageUk = toOptionalText(details.messageUk);
  if (!message && !messageEn && !messageUk) return undefined;

  return {
    ...(message ? { message } : {}),
    ...(messageEn ? { messageEn } : {}),
    ...(messageUk ? { messageUk } : {}),
    updatedAt: details.updatedAt ?? updatedAt,
  };
}

function parseSourceTimestamp(generatedAt: string) {
  const timestamp = Date.parse(generatedAt);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function parseFixtureTimestamp(scheduledAt: string | null) {
  if (!scheduledAt) return null;
  const timestamp = Date.parse(scheduledAt);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function sourceStatsToStorage(sourceStats: ImportPlayer["sourceStats"]) {
  return {
    extraLeague2025_26: sourceStats.extraLeague2025_26 ?? undefined,
    firstLeague2025_26: sourceStats.firstLeague2025_26 ?? undefined,
  };
}

function emptyCounters(): ImportCounters {
  return {
    createdClubs: 0,
    updatedClubs: 0,
    deactivatedClubs: 0,
    createdFixtures: 0,
    updatedFixtures: 0,
    skippedFixtures: 0,
    createdGameweeks: 0,
    updatedGameweeks: 0,
    createdPlayers: 0,
    updatedPlayers: 0,
    deactivatedPlayers: 0,
  };
}

async function findSeason(ctx: MutationCtx, seasonSlug: string) {
  return await ctx.db
    .query("fantasySeasons")
    .withIndex("by_slug", (q) => q.eq("slug", seasonSlug))
    .first();
}

async function upsertSeason(
  ctx: MutationCtx,
  source: ImportSource,
  now: number,
  dryRun: boolean,
) {
  const slug = normalizeText(source.season.slug) || DEFAULT_SEASON_SLUG;
  const existing = await findSeason(ctx, slug);
  const payload = {
    slug,
    name: normalizeText(source.season.name || DEFAULT_SEASON_NAME),
    leagueName: normalizeText(source.season.leagueName || DEFAULT_LEAGUE_NAME),
    country: normalizeText(source.season.country || DEFAULT_COUNTRY),
    status: existing?.status ?? ("setup" as const),
    budget: source.season.budget || DEFAULT_BUDGET,
    squadSize: source.season.squadSize || DEFAULT_SQUAD_SIZE,
    startingSlots: source.season.startingSlots || DEFAULT_STARTING_SLOTS,
    activeSlots: source.season.activeSlots || DEFAULT_ACTIVE_SLOTS,
    freeTransfersPerGameweek:
      existing?.freeTransfersPerGameweek ?? DEFAULT_FREE_TRANSFERS_PER_GAMEWEEK,
    maxFreeTransfers: existing?.maxFreeTransfers ?? DEFAULT_MAX_FREE_TRANSFERS,
    maxTransfersPerGameweek:
      existing?.maxTransfersPerGameweek ?? DEFAULT_MAX_TRANSFERS_PER_GAMEWEEK,
    transferPenaltyPoints:
      existing?.transferPenaltyPoints ?? DEFAULT_TRANSFER_PENALTY_POINTS,
    priceChangeLimit: existing?.priceChangeLimit ?? DEFAULT_PRICE_CHANGE_LIMIT,
    updatedAt: now,
  };

  if (existing) {
    if (!dryRun) {
      await ctx.db.patch(existing._id, payload);
    }
    return { id: existing._id, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const id = await ctx.db.insert("fantasySeasons", {
    ...payload,
    createdAt: now,
  });

  return { id, created: true };
}

async function findClubByExternalId(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  externalId: string,
) {
  return await ctx.db
    .query("fantasyClubs")
    .withIndex("by_season_external_id", (q) =>
      q.eq("seasonId", seasonId).eq("externalId", externalId),
    )
    .first();
}

async function findClubByName(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  name: string,
) {
  return await ctx.db
    .query("fantasyClubs")
    .withIndex("by_season_name", (q) =>
      q.eq("seasonId", seasonId).eq("name", normalizeText(name)),
    )
    .first();
}

async function upsertClub(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  club: ImportClub,
  now: number,
  sourceUpdatedAt: number,
  dryRun: boolean,
) {
  const name = normalizeText(club.name);
  const existing =
    (await findClubByExternalId(ctx, seasonId, club.externalId)) ??
    (await findClubByName(ctx, seasonId, name));
  const payload = {
    seasonId,
    externalId: club.externalId,
    sourceSlug: toOptionalText(club.sourceSlug),
    sourceUrl: toOptionalText(club.sourceUrl),
    name,
    shortName: toOptionalText(club.shortName),
    city: toOptionalText(club.city),
    logoUrl: toOptionalText(club.logoUrl),
    logoThumbnailUrl: toOptionalText(club.logoThumbnailUrl),
    sortOrder: club.sortOrder,
    isActive: club.isActive,
    sourceUpdatedAt,
    updatedAt: now,
  };

  if (existing) {
    if (!dryRun) {
      await ctx.db.patch(existing._id, payload);
    }
    return { id: existing._id, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const id = await ctx.db.insert("fantasyClubs", {
    ...payload,
    createdAt: now,
  });

  return { id, created: true };
}

async function findPlayerByExternalId(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  externalId: string,
) {
  return await ctx.db
    .query("fantasyPlayers")
    .withIndex("by_season_external_id", (q) =>
      q.eq("seasonId", seasonId).eq("externalId", externalId),
    )
    .first();
}

async function findFixtureByExternalId(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  externalId: string,
) {
  return await ctx.db
    .query("fantasyFixtures")
    .withIndex("by_season_external_id", (q) =>
      q.eq("seasonId", seasonId).eq("externalId", externalId),
    )
    .first();
}

async function findGameweekByNumber(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  number: number,
) {
  return await ctx.db
    .query("fantasyGameweeks")
    .withIndex("by_season_number", (q) =>
      q.eq("seasonId", seasonId).eq("number", number),
    )
    .first();
}

function parseOptionalTimestamp(value: string | null) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

async function upsertGameweek(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  gameweek: ImportGameweek,
  now: number,
  dryRun: boolean,
) {
  const existing = await findGameweekByNumber(ctx, seasonId, gameweek.number);
  const payload = {
    seasonId,
    number: gameweek.number,
    name: normalizeText(gameweek.name),
    status: gameweek.status ?? ("upcoming" as const),
    deadlineAt: parseOptionalTimestamp(gameweek.deadlineAt),
    startsAt: parseOptionalTimestamp(gameweek.startsAt),
    endsAt: parseOptionalTimestamp(gameweek.endsAt),
    updatedAt: now,
  };

  if (existing) {
    if (!dryRun) {
      await ctx.db.patch(existing._id, payload);
    }
    return { id: existing._id, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const id = await ctx.db.insert("fantasyGameweeks", {
    ...payload,
    createdAt: now,
  });

  return { id, created: true };
}

function roundPriceDelta(value: number) {
  return Math.round(value * 10) / 10;
}

async function recordPlayerPriceHistory(
  ctx: MutationCtx,
  {
    seasonId,
    playerId,
    oldPrice,
    newPrice,
    reason,
    now,
  }: {
    seasonId: Id<"fantasySeasons">;
    playerId: Id<"fantasyPlayers">;
    oldPrice: number;
    newPrice: number;
    reason: "initial_import" | "source_import";
    now: number;
  },
) {
  await ctx.db.insert("fantasyPlayerPriceHistory", {
    seasonId,
    playerId,
    oldPrice,
    newPrice,
    delta: roundPriceDelta(newPrice - oldPrice),
    reason,
    createdAt: now,
  });
}

async function upsertPlayer(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  player: ImportPlayer,
  clubIdsByExternalId: Map<string, Id<"fantasyClubs">>,
  now: number,
  sourceUpdatedAt: number,
  dryRun: boolean,
) {
  const existing = await findPlayerByExternalId(
    ctx,
    seasonId,
    player.externalId,
  );
  const clubId = player.clubExternalId
    ? clubIdsByExternalId.get(player.clubExternalId)
    : undefined;
  const statusDetails =
    player.statusDetails === undefined
      ? existing?.statusDetails
      : player.statusDetails === null
        ? undefined
        : normalizeImportPlayerStatusDetails(player.statusDetails, now);
  const status =
    player.status ??
    (clubId === undefined
      ? ("unavailable" as const)
      : (existing?.status ?? ("active" as const)));
  const payload = {
    seasonId,
    clubId,
    externalId: player.externalId,
    sourceSlug: toOptionalText(player.sourceSlug),
    sourceUrl: toOptionalText(player.sourceUrl),
    firstName: toOptionalText(player.firstName),
    lastName: normalizeText(player.lastName),
    displayName: normalizeText(player.displayName),
    position: player.position,
    price: player.suggestedPrice,
    status,
    statusDetails,
    jerseyNumber: toOptionalNumber(player.jerseyNumber),
    photoUrl: toOptionalText(player.photoUrl),
    photoThumbnailUrl: toOptionalText(player.photoThumbnailUrl),
    photoProvider: toOptionalText(player.photoProvider),
    photoCloudflareId: toOptionalText(player.photoCloudflareId),
    photoStorageKey: toOptionalText(player.photoStorageKey),
    photoSourceUrl: toOptionalText(player.photoSourceUrl),
    photoSourceThumbnailUrl: toOptionalText(player.photoSourceThumbnailUrl),
    currentTeamExternalIds: player.currentTeamExternalIds,
    listedTeamExternalIds: player.listedTeamExternalIds,
    sourceStats: sourceStatsToStorage(player.sourceStats),
    sourceUpdatedAt,
    updatedAt: now,
  };

  if (existing) {
    const priceDelta = roundPriceDelta(player.suggestedPrice - existing.price);
    if (!dryRun) {
      await ctx.db.patch(existing._id, payload);
      if (Math.abs(priceDelta) >= 0.1) {
        await recordPlayerPriceHistory(ctx, {
          seasonId,
          playerId: existing._id,
          oldPrice: existing.price,
          newPrice: player.suggestedPrice,
          reason: "source_import",
          now,
        });
      }
    }
    return { id: existing._id, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const id = await ctx.db.insert("fantasyPlayers", {
    ...payload,
    createdAt: now,
  });
  await recordPlayerPriceHistory(ctx, {
    seasonId,
    playerId: id,
    oldPrice: player.suggestedPrice,
    newPrice: player.suggestedPrice,
    reason: "initial_import",
    now,
  });

  return { id, created: true };
}

async function upsertFixture(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  fixture: ImportFixture,
  clubIdsByExternalId: Map<string, Id<"fantasyClubs">>,
  gameweekIdsByNumber: Map<number, Id<"fantasyGameweeks">>,
  now: number,
  sourceUpdatedAt: number,
  dryRun: boolean,
) {
  const scheduledAt = parseFixtureTimestamp(fixture.scheduledAt);
  if (!scheduledAt) {
    return { id: null, created: false, skipped: true };
  }

  const existing = await findFixtureByExternalId(
    ctx,
    seasonId,
    fixture.externalId,
  );
  const homeClubId = fixture.homeClubExternalId
    ? clubIdsByExternalId.get(fixture.homeClubExternalId)
    : undefined;
  const awayClubId = fixture.awayClubExternalId
    ? clubIdsByExternalId.get(fixture.awayClubExternalId)
    : undefined;
  const gameweekId = fixture.gameweekNumber
    ? gameweekIdsByNumber.get(fixture.gameweekNumber)
    : undefined;
  const payload = {
    seasonId,
    gameweekId,
    externalId: fixture.externalId,
    sourceSlug: toOptionalText(fixture.sourceSlug),
    sourceUrl: toOptionalText(fixture.sourceUrl),
    homeClubId,
    awayClubId,
    homeClubName: normalizeText(fixture.homeClubName ?? ""),
    awayClubName: normalizeText(fixture.awayClubName ?? ""),
    scheduledAt,
    status: fixture.status,
    homeScore: toOptionalNumber(fixture.homeScore),
    awayScore: toOptionalNumber(fixture.awayScore),
    venue: toOptionalText(fixture.venue),
    sourceUpdatedAt,
    updatedAt: now,
  };

  if (existing) {
    if (!dryRun) {
      await ctx.db.patch(existing._id, payload);
    }
    return { id: existing._id, created: false, skipped: false };
  }

  if (dryRun) {
    return { id: null, created: true, skipped: false };
  }

  const id = await ctx.db.insert("fantasyFixtures", {
    ...payload,
    createdAt: now,
  });

  return { id, created: true, skipped: false };
}

async function deactivateMissingClubs(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  importedExternalIds: Set<string>,
  touchedIds: Set<Id<"fantasyClubs">>,
  now: number,
  dryRun: boolean,
) {
  const existingClubs = await ctx.db
    .query("fantasyClubs")
    .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
    .collect();
  let count = 0;

  for (const club of existingClubs) {
    if (touchedIds.has(club._id)) continue;
    if (club.externalId && importedExternalIds.has(club.externalId)) continue;
    if (!club.isActive) continue;

    count += 1;
    if (!dryRun) {
      await ctx.db.patch(club._id, {
        isActive: false,
        updatedAt: now,
      });
    }
  }

  return count;
}

async function deactivateMissingPlayers(
  ctx: MutationCtx,
  seasonId: Id<"fantasySeasons">,
  importedExternalIds: Set<string>,
  touchedIds: Set<Id<"fantasyPlayers">>,
  now: number,
  dryRun: boolean,
) {
  const existingPlayers = await ctx.db
    .query("fantasyPlayers")
    .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
    .collect();
  let count = 0;

  for (const player of existingPlayers) {
    if (touchedIds.has(player._id)) continue;
    if (player.externalId && importedExternalIds.has(player.externalId))
      continue;
    if (player.status === "left") continue;

    count += 1;
    if (!dryRun) {
      await ctx.db.patch(player._id, {
        status: "left",
        updatedAt: now,
      });
    }
  }

  return count;
}

async function importSourceData(
  ctx: MutationCtx,
  source: ImportSource,
  {
    deactivateMissing,
    dryRun,
  }: {
    deactivateMissing: boolean;
    dryRun: boolean;
  },
): Promise<ImportPreview> {
  const now = Date.now();
  const sourceUpdatedAt = parseSourceTimestamp(source.generatedAt);
  const counters = emptyCounters();
  const seasonResult = await upsertSeason(ctx, source, now, dryRun);

  if (dryRun && !seasonResult.id) {
    return {
      ...counters,
      dryRun,
      seasonCreated: seasonResult.created,
      seasonId: null,
      sourceWarnings: source.warnings.length,
    };
  }

  const seasonId = seasonResult.id as Id<"fantasySeasons">;
  const clubIdsByExternalId = new Map<string, Id<"fantasyClubs">>();
  const gameweekIdsByNumber = new Map<number, Id<"fantasyGameweeks">>();
  const touchedClubIds = new Set<Id<"fantasyClubs">>();
  const touchedPlayerIds = new Set<Id<"fantasyPlayers">>();

  for (const gameweek of source.gameweeks ?? []) {
    const result = await upsertGameweek(ctx, seasonId, gameweek, now, dryRun);
    if (result.created) counters.createdGameweeks += 1;
    else counters.updatedGameweeks += 1;
    if (result.id) gameweekIdsByNumber.set(gameweek.number, result.id);
  }

  for (const club of source.clubs) {
    const result = await upsertClub(
      ctx,
      seasonId,
      club,
      now,
      sourceUpdatedAt,
      dryRun,
    );
    if (result.created) counters.createdClubs += 1;
    else counters.updatedClubs += 1;

    if (result.id) {
      clubIdsByExternalId.set(club.externalId, result.id);
      touchedClubIds.add(result.id);
    } else {
      const existing =
        (await findClubByExternalId(ctx, seasonId, club.externalId)) ??
        (await findClubByName(ctx, seasonId, club.name));
      if (existing) {
        clubIdsByExternalId.set(club.externalId, existing._id);
        touchedClubIds.add(existing._id);
      }
    }
  }

  for (const player of source.players) {
    const result = await upsertPlayer(
      ctx,
      seasonId,
      player,
      clubIdsByExternalId,
      now,
      sourceUpdatedAt,
      dryRun,
    );
    if (result.created) counters.createdPlayers += 1;
    else counters.updatedPlayers += 1;
    if (result.id) touchedPlayerIds.add(result.id);
  }

  for (const fixture of source.fixtures) {
    const result = await upsertFixture(
      ctx,
      seasonId,
      fixture,
      clubIdsByExternalId,
      gameweekIdsByNumber,
      now,
      sourceUpdatedAt,
      dryRun,
    );
    if (result.skipped) counters.skippedFixtures += 1;
    else if (result.created) counters.createdFixtures += 1;
    else counters.updatedFixtures += 1;
  }

  if (deactivateMissing) {
    counters.deactivatedClubs = await deactivateMissingClubs(
      ctx,
      seasonId,
      new Set(source.clubs.map((club) => club.externalId)),
      touchedClubIds,
      now,
      dryRun,
    );
    counters.deactivatedPlayers = await deactivateMissingPlayers(
      ctx,
      seasonId,
      new Set(source.players.map((player) => player.externalId)),
      touchedPlayerIds,
      now,
      dryRun,
    );
  }

  return {
    ...counters,
    dryRun,
    seasonCreated: seasonResult.created,
    seasonId,
    sourceWarnings: source.warnings.length,
  };
}

export const importSource = mutation({
  args: {
    source: importSourceValidator,
    dryRun: v.optional(v.boolean()),
    deactivateMissing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await importSourceData(ctx, args.source, {
      deactivateMissing: args.deactivateMissing ?? true,
      dryRun: args.dryRun ?? true,
    });
  },
});
