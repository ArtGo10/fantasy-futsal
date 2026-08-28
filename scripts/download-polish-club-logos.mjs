#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE_FILE = "data/futsal/polish-ekstraklasa-2026-27.json";
const DEFAULT_ASSET_DIR = "assets";

const LOGO_FILE_NAMES = new Map([
  ["texom-eurobus-przemysl", "polish-texom-eurobus-przemysl-logo.png"],
  ["piast-gliwice", "polish-piast-gliwice-logo.png"],
  ["constract-olsztyn", "polish-constract-olsztyn-logo.png"],
  ["gi-malepszy-leszno", "polish-gi-malepszy-leszno-logo.png"],
  ["rekord-bielsko-biala", "polish-rekord-bielsko-biala-logo.png"],
  ["legia-warszawa", "polish-legia-warszawa-logo.png"],
  [
    "we-met-futsal-club-gmina-sierakowice",
    "polish-we-met-sierakowice-logo.png",
  ],
  ["azs-us-katowice", "polish-azs-us-katowice-logo.png"],
  ["fc-reiter-torun", "polish-fc-reiter-torun-logo.png"],
  ["red-dragons-pniewy", "polish-red-dragons-pniewy-logo.png"],
  ["bsf-abj-bochnia", "polish-bsf-abj-bochnia-logo.png"],
  ["futsal-swiecie", "polish-futsal-swiecie-logo.png"],
  ["jaxan-slask-wroclaw", "polish-jaxan-slask-wroclaw-logo.png"],
  ["jagiellonia-bialystok", "polish-jagiellonia-bialystok-logo.png"],
  ["kkf-motus-kazimierza-wielka", "polish-kkf-motus-logo.png"],
  ["wiara-lecha-poznan", "polish-wiara-lecha-poznan-logo.png"],
]);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArgs(argv) {
  const options = {
    assetDir: DEFAULT_ASSET_DIR,
    file: DEFAULT_SOURCE_FILE,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for " + arg);
      }
      index += 1;
      return value;
    };

    if (arg === "--asset-dir") options.assetDir = next();
    else if (arg === "--file") options.file = next();
    else if (arg === "--force") options.force = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error("Unknown option: " + arg);
    }
  }

  return options;
}

function printHelp() {
  console.log(
    "Usage: node scripts/download-polish-club-logos.mjs [options]\n\n" +
      "Options:\n" +
      "  --file <path>       Polish source JSON. Default: " +
      DEFAULT_SOURCE_FILE +
      "\n" +
      "  --asset-dir <path>  Asset output directory. Default: " +
      DEFAULT_ASSET_DIR +
      "\n" +
      "  --force             Re-download existing files.\n",
  );
}

function sanitizeFilePart(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łŁ]/g, "l")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLogoFileName(club) {
  if (club.sourceSlug && LOGO_FILE_NAMES.has(club.sourceSlug)) {
    return LOGO_FILE_NAMES.get(club.sourceSlug);
  }

  const fallback = sanitizeFilePart(club.sourceSlug ?? club.shortName ?? club.name);
  return `polish-${fallback || club.externalId}-logo.png`;
}

async function readJson(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, "utf8"));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`Downloaded empty file from ${url}`);
  }

  await fs.writeFile(outputPath, bytes);
  return bytes.length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = await readJson(options.file);
  const clubs = source.clubs ?? [];
  const outputDir = path.resolve(projectRoot, options.assetDir);
  await fs.mkdir(outputDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;

  for (const club of clubs) {
    const logoUrl = club.logoThumbnailUrl ?? club.logoUrl;
    if (!logoUrl) continue;

    const fileName = getLogoFileName(club);
    const outputPath = path.join(outputDir, fileName);

    if (!options.force && (await fileExists(outputPath))) {
      skipped += 1;
      console.log(`skip ${fileName}`);
      continue;
    }

    const size = await downloadFile(logoUrl, outputPath);
    downloaded += 1;
    console.log(`downloaded ${fileName} (${size} bytes)`);
  }

  console.log(`Done. Downloaded: ${downloaded}. Skipped: ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
