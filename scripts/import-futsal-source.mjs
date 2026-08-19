#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_SOURCE_FILE = "data/futsal/source-2026-27.json";

function parseArgs(argv) {
  const options = {
    apply: false,
    deactivateMissing: true,
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

    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--keep-missing") options.deactivateMissing = false;
    else if (arg === "--file") options.file = next();
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
  console.log(`Usage: node scripts/import-futsal-source.mjs [options]\n\nOptions:\n  --apply                 Write data to Convex. Default is dry-run.\n  --dry-run               Preview changes without writing.\n  --keep-missing          Do not mark missing clubs inactive or missing players left.\n  --file <path>           Source JSON path. Default: ${DEFAULT_SOURCE_FILE}\n  --admin-subject <id>    Clerk user id used as Convex identity subject.\n  --admin-email <email>   Email used in Convex identity.\n  --prod                  Run against production deployment. Implies --no-push.\n  --deployment <name>     Run against a specific Convex deployment.\n  --no-push               Do not push local Convex functions before running.\n\nEnvironment fallback:\n  IMPORT_ADMIN_SUBJECT, IMPORT_ADMIN_EMAIL\n`);
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0] || "";
}

function readJson(filePath) {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Source file not found: ${absolutePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootEnv = {
    ...loadDotEnvFile(resolve(".env")),
    ...loadDotEnvFile(resolve(".env.local")),
  };
  const source = readJson(options.file);
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
    tokenIdentifier: `import:${adminSubject}`,
    issuer: "local-import",
    email: adminEmail || undefined,
    name: "Local Import Admin",
  };
  const mutationArgs = {
    source,
    dryRun: !options.apply,
    deactivateMissing: options.deactivateMissing,
  };
  const convexArgs = [
    "convex",
    "run",
    "futsalImport:importSource",
    JSON.stringify(mutationArgs),
    "--identity",
    JSON.stringify(identity),
  ];

  const shouldPushFunctions = options.push && !options.prod;
  if (shouldPushFunctions) convexArgs.push("--push");
  if (options.prod) convexArgs.push("--prod");
  if (options.deployment) convexArgs.push("--deployment", options.deployment);

  console.log(options.apply ? "Importing futsal source data..." : "Previewing futsal source import...");
  if (options.prod && options.push) {
    console.log("Skipping --push for prod. Run `npx convex deploy` before importing production data.");
  }
  console.log(`Source: ${resolve(options.file)}`);
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
