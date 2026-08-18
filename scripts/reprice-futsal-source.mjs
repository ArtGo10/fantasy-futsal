#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FANTASY_INITIAL_PRICE_MAX,
  FANTASY_INITIAL_PRICE_MIN,
  FANTASY_INITIAL_PRICE_STEP,
  calculateSuggestedPrice,
} from "./futsal-pricing.mjs";

const DEFAULT_SOURCE_FILE = "data/futsal/source-2026-27.json";

function parseArgs(argv) {
  const options = { file: DEFAULT_SOURCE_FILE };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      options.file = argv[index + 1] ?? DEFAULT_SOURCE_FILE;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/reprice-futsal-source.mjs [options]

Options:
  --file <path>  Source JSON path. Default: ${DEFAULT_SOURCE_FILE}
`);
}

function formatPrice(value) {
  return value.toFixed(1);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = resolve(options.file);
  if (!existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  const source = JSON.parse(readFileSync(filePath, "utf8"));
  const clubsByExternalId = new Map(
    source.clubs.map((club) => [club.externalId, club]),
  );
  let changed = 0;

  for (const player of source.players) {
    const nextPrice = calculateSuggestedPrice({
      clubExternalId: player.clubExternalId,
      displayName: player.displayName,
      statsByCompetition: player.sourceStats,
    });
    if (player.suggestedPrice !== nextPrice) changed += 1;
    player.suggestedPrice = nextPrice;
  }

  source.summary = {
    ...source.summary,
    pricing: {
      version: "initial-extra-liga-v2-half-step",
      min: FANTASY_INITIAL_PRICE_MIN,
      max: FANTASY_INITIAL_PRICE_MAX,
      step: FANTASY_INITIAL_PRICE_STEP,
      changedPlayers: changed,
      updatedAt: new Date().toISOString(),
    },
  };

  writeFileSync(
    filePath,
    `${JSON.stringify(source, null, 2)}
`,
  );

  const sortedPlayers = [...source.players].sort(
    (a, b) =>
      b.suggestedPrice - a.suggestedPrice ||
      a.displayName.localeCompare(b.displayName),
  );
  const average =
    source.players.reduce((sum, player) => sum + player.suggestedPrice, 0) /
    source.players.length;
  const buckets = new Map();
  for (const player of source.players) {
    const key = player.suggestedPrice.toFixed(1);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  console.log(`Updated prices in ${filePath}`);
  console.log(`Changed players: ${changed}`);
  console.log(`Average price: ${formatPrice(average)}`);
  console.log(
    `Buckets: ${[...buckets.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([bucket, count]) => `${bucket}=${count}`)
      .join(", ")}`,
  );
  console.log("Top prices:");
  for (const player of sortedPlayers.slice(0, 12)) {
    const club = clubsByExternalId.get(player.clubExternalId);
    console.log(
      `  ${formatPrice(player.suggestedPrice)}  ${player.displayName}  · ${club?.name ?? "-"}`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
