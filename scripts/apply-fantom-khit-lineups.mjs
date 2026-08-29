#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SEASON_SLUG = "ukrainian-extra-league-2026-27";
const FIXTURE_EXTERNAL_ID = "21912";

const LINEUPS = [
  { side: "home", playerExternalId: "19218", playerName: "Дмитро Чалий", jerseyNumber: 24, position: "universal", isStarter: true },
  { side: "home", playerExternalId: "4933", playerName: "Владислав Моспан", jerseyNumber: 27, position: "universal", isStarter: true },
  { side: "home", playerExternalId: "4667", playerName: "Роман Горпинич", jerseyNumber: 10, position: "universal", isStarter: true },
  { side: "home", playerExternalId: "4613", playerName: "Ігор Марциняк", jerseyNumber: 20, position: "universal", isStarter: true },
  { side: "home", playerExternalId: "8340", playerName: "Ігор Байдак", jerseyNumber: 26, position: "goalkeeper", isStarter: true },
  { side: "home", playerExternalId: "5784", playerName: "Арсеній Гурєєв", jerseyNumber: 4, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "16467", playerName: "Олександр Лоєнко", jerseyNumber: 6, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "16370", playerName: "Артем Палиця", jerseyNumber: 8, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "21965", playerName: "Данііл Сокальський", jerseyNumber: 13, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "4600", playerName: "Роман Гураль", jerseyNumber: 17, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "4750", playerName: "Микола Хомяк", jerseyNumber: 19, position: "goalkeeper", isStarter: false },
  { side: "home", playerExternalId: "4445", playerName: "Сергій Топчій", jerseyNumber: 21, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "8270", playerName: "Кіріл Сторожук", jerseyNumber: 69, position: "universal", isStarter: false },
  { side: "home", playerExternalId: "4757", playerName: "Станіслав Моспан", jerseyNumber: 87, position: "universal", isStarter: false },

  { side: "away", playerExternalId: "4522", playerName: "Ігор Чернявський", jerseyNumber: 10, position: "universal", isStarter: true },
  { side: "away", playerExternalId: "4509", playerName: "Євгеній Жук", jerseyNumber: 11, position: "universal", isStarter: true },
  { side: "away", playerExternalId: "4581", playerName: "Владислав Первєєв", jerseyNumber: 6, position: "universal", isStarter: true },
  { side: "away", playerExternalId: "4405", playerName: "Андрій Мельник", jerseyNumber: 7, position: "universal", isStarter: true },
  { side: "away", playerExternalId: "4513", playerName: "Олександр Кравець", jerseyNumber: 1, position: "goalkeeper", isStarter: true },
  { side: "away", playerExternalId: "4507", playerName: "Даніїл Чижик", jerseyNumber: 8, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "4523", playerName: "Руслан Шеремета", jerseyNumber: 15, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "4517", playerName: "Олександр Педяш", jerseyNumber: 17, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "21942", playerName: "Артем Каплун", jerseyNumber: 18, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "4680", playerName: "Максим Малиновський", jerseyNumber: 20, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "21941", playerName: "Єгор Карбань", jerseyNumber: 23, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "18870", playerName: "Келвін Сандер Гомес Де Фрейтас (Келвін Кел)", jerseyNumber: 70, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "18945", playerName: "Ернест Романчук", jerseyNumber: 74, position: "universal", isStarter: false },
  { side: "away", playerExternalId: "4669", playerName: "Дмитро Дяченко", jerseyNumber: 77, position: "goalkeeper", isStarter: false },
];

function parseArgs(argv) {
  const options = {
    prod: false,
    deployment: null,
    push: true,
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

    if (arg === "--prod") options.prod = true;
    else if (arg === "--deployment") options.deployment = next();
    else if (arg === "--no-push") options.push = false;
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
  console.log(`Usage: node scripts/apply-fantom-khit-lineups.mjs [options]\n\nOptions:\n  --admin-subject <id>    Clerk user id used as Convex identity subject.\n  --admin-email <email>   Email used in Convex identity.\n  --prod                  Run against production deployment. Implies --no-push.\n  --deployment <name>     Run against a specific Convex deployment.\n  --no-push               Do not push local Convex functions before running.\n\nEnvironment fallback:\n  IMPORT_ADMIN_SUBJECT, IMPORT_ADMIN_EMAIL, ADMIN_CLERK_IDS, ADMIN_EMAILS\n`);
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootEnv = {
    ...loadDotEnvFile(resolve(".env")),
    ...loadDotEnvFile(resolve(".env.local")),
  };
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

  const identity = {
    subject: adminSubject,
    tokenIdentifier: `fixture-lineups:${adminSubject}`,
    issuer: "local-import",
    email: adminEmail || undefined,
    name: "Local Import Admin",
  };
  const mutationArgs = {
    seasonSlug: SEASON_SLUG,
    fixtureExternalId: FIXTURE_EXTERNAL_ID,
    lineups: LINEUPS,
  };
  const convexArgs = [
    "convex",
    "run",
    "fantasy:replaceFixtureLineups",
    JSON.stringify(mutationArgs),
    "--identity",
    JSON.stringify(identity),
  ];

  const shouldPushFunctions = options.push && !options.prod;
  if (shouldPushFunctions) convexArgs.push("--push");
  if (options.prod) convexArgs.push("--prod");
  if (options.deployment) convexArgs.push("--deployment", options.deployment);

  console.log("Replacing Фантом — ХІТ lineups...");
  if (options.prod && options.push) {
    console.log(
      "Skipping --push for prod. Run `npx convex deploy` before production updates.",
    );
  }
  console.log(`Fixture externalId: ${FIXTURE_EXTERNAL_ID}`);
  console.log(`Lineups: ${LINEUPS.length}`);
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
