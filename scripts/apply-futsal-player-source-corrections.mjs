#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_SOURCE_FILE = "data/futsal/source-2026-27.json";
const SEASON_SLUG = "ukrainian-extra-league-2026-27";

const ID_REPLACEMENTS = [
  ["duf-12033_11", "21949"],
  ["uaf-30058242", "21948"],
  ["kdfa-4412", "21947"],
  ["manual-lucas-damasseno", "21951"],
  ["manual-leandrinho", "21950"],
  ["manual-oleksandr-bozhinskyy", "16352"],
  ["manual-athletic-levy-costa", "21943"],
  ["sokil-2026-27-bohdan-hladun", "15254"],
  ["sokil-2026-27-vladyslav-hlushko", "21189"],
  ["sokil-2026-27-maksym-melnyk", "21967"],
  ["source-dmytro", "8207"],
  ["sokil-2026-27-tymur-hontar", "21968"],
  ["source-syrotenko-daniil", "4442"],
  ["source-mykyta-kozliuk", "8569"],
  ["uaf-30029461", "21965"],
  ["source-dmytro-chalyy", "19218"],
  ["duf-2791", "21942"],
  ["duf-44209-18", "21941"],
];

const PHOTO_ONLY_IDS = ["19205", "19240"];

function parseArgs(argv) {
  const options = {
    file: DEFAULT_SOURCE_FILE,
    push: true,
    prod: false,
    deployment: null,
    adminSubject: null,
    adminEmail: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === "--file") options.file = next();
    else if (arg === "--no-push") options.push = false;
    else if (arg === "--prod") options.prod = true;
    else if (arg === "--deployment") options.deployment = next();
    else if (arg === "--admin-subject") options.adminSubject = next();
    else if (arg === "--admin-email") options.adminEmail = next();
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/apply-futsal-player-source-corrections.mjs [options]\n\nOptions:\n  --file <path>           Source JSON path. Default: ${DEFAULT_SOURCE_FILE}\n  --admin-subject <id>    Clerk user id used as Convex identity subject.\n  --admin-email <email>   Email used in Convex identity.\n  --prod                  Run against production deployment. Implies --no-push.\n  --deployment <name>     Run against a specific Convex deployment.\n  --no-push               Do not push local Convex functions before running.\n\nEnvironment fallback:\n  IMPORT_ADMIN_SUBJECT, IMPORT_ADMIN_EMAIL, ADMIN_CLERK_IDS, ADMIN_EMAILS\n`);
}

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function envValue(name, loadedEnv) {
  return process.env[name] || loadedEnv[name] || "";
}

function firstCsvValue(value) {
  return (
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0] || ""
  );
}

function readJson(filePath) {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Source file not found: ${absolutePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function sourceStatsToUpdate(sourceStats) {
  return {
    extraLeague2025_26: sourceStats?.extraLeague2025_26 ?? null,
    firstLeague2025_26: sourceStats?.firstLeague2025_26 ?? null,
  };
}

function playerToUpdate(currentExternalId, player) {
  return {
    currentExternalId,
    externalId: player.externalId,
    sourceSlug: player.sourceSlug ?? null,
    sourceUrl: player.sourceUrl ?? null,
    firstName: player.firstName ?? null,
    lastName: player.lastName,
    displayName: player.displayName,
    position: player.position,
    jerseyNumber: player.jerseyNumber ?? null,
    photoUrl: player.photoUrl ?? null,
    photoThumbnailUrl: player.photoThumbnailUrl ?? null,
    photoProvider: player.photoProvider ?? null,
    photoCloudflareId: player.photoCloudflareId ?? null,
    photoStorageKey: player.photoStorageKey ?? null,
    photoSourceUrl: player.photoSourceUrl ?? null,
    photoSourceThumbnailUrl: player.photoSourceThumbnailUrl ?? null,
    currentTeamExternalIds: player.currentTeamExternalIds ?? [],
    listedTeamExternalIds: player.listedTeamExternalIds ?? [],
    sourceStats: sourceStatsToUpdate(player.sourceStats),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootEnv = {
    ...loadDotEnvFile(resolve(".env")),
    ...loadDotEnvFile(resolve(".env.local")),
  };
  const source = readJson(options.file);
  const sourceByPlayerId = new Map(
    source.players.map((player) => [player.externalId, player]),
  );
  const adminSubject =
    options.adminSubject ||
    envValue("IMPORT_ADMIN_SUBJECT", rootEnv) ||
    firstCsvValue(envValue("ADMIN_CLERK_IDS", rootEnv));
  const adminEmail =
    options.adminEmail ||
    envValue("IMPORT_ADMIN_EMAIL", rootEnv) ||
    firstCsvValue(envValue("ADMIN_EMAILS", rootEnv));

  if (!adminSubject) {
    throw new Error(
      "Admin subject is required. Pass --admin-subject or set IMPORT_ADMIN_SUBJECT to an admin Clerk user id.",
    );
  }

  const updates = [];
  for (const [currentExternalId, externalId] of ID_REPLACEMENTS) {
    const player = sourceByPlayerId.get(externalId);
    if (!player) throw new Error(`Missing source player ${externalId}`);
    updates.push(playerToUpdate(currentExternalId, player));
  }
  for (const externalId of PHOTO_ONLY_IDS) {
    const player = sourceByPlayerId.get(externalId);
    if (!player) throw new Error(`Missing source player ${externalId}`);
    updates.push(playerToUpdate(externalId, player));
  }

  const identity = {
    subject: adminSubject,
    tokenIdentifier: `source-corrections:${adminSubject}`,
    issuer: "local-import",
    email: adminEmail || undefined,
    name: "Local Import Admin",
  };
  const mutationArgs = {
    seasonSlug: SEASON_SLUG,
    updates,
  };
  const convexArgs = [
    "convex",
    "run",
    "fantasy:applyPlayerSourceCorrections",
    JSON.stringify(mutationArgs),
    "--identity",
    JSON.stringify(identity),
  ];

  const shouldPushFunctions = options.push && !options.prod;
  if (shouldPushFunctions) convexArgs.push("--push");
  if (options.prod) convexArgs.push("--prod");
  if (options.deployment) convexArgs.push("--deployment", options.deployment);

  console.log("Applying futsal player source corrections...");
  if (options.prod && options.push) {
    console.log(
      "Skipping --push for prod. Run `npx convex deploy` before production corrections.",
    );
  }
  console.log(`Source: ${resolve(options.file)}`);
  console.log(`Updates: ${updates.length}`);
  console.log(`Identity subject: ${adminSubject}`);
  if (adminEmail) console.log(`Identity email: ${adminEmail}`);

  const result = spawnSync("npx", convexArgs, {
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
