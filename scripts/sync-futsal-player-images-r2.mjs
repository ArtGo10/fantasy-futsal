#!/usr/bin/env node
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const DEFAULT_SOURCE_FILE = "data/futsal/source-2026-27.json";
const DEFAULT_PROVIDER = "cloudflare_r2";
const DEFAULT_KEY_PREFIX = "players";
const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable";
const SOURCE_PHOTO_HOSTS = new Set(["futsal.com.ua", "www.futsal.com.ua"]);
const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

function parseArgs(argv) {
  const options = {
    apply: false,
    dryRun: true,
    file: DEFAULT_SOURCE_FILE,
    out: null,
    force: false,
    limit: 0,
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

    if (arg === "--apply") {
      options.apply = true;
      options.dryRun = false;
    } else if (arg === "--dry-run") {
      options.apply = false;
      options.dryRun = true;
    } else if (arg === "--file") options.file = next();
    else if (arg === "--out") options.out = next();
    else if (arg === "--force") options.force = true;
    else if (arg === "--limit") options.limit = Number(next());
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
  console.log("Usage: npm run data:futsal:images:r2 -- [options]\n\n" +
    "Options:\n" +
    "  --apply          Upload missing player photos to R2 and write the JSON file. Default is dry-run.\n" +
    "  --dry-run        Preview changes without uploading or writing.\n" +
    "  --file <path>    Source JSON path. Default: " + DEFAULT_SOURCE_FILE + "\n" +
    "  --out <path>     Output JSON path. Default: overwrite --file when --apply is used.\n" +
    "  --force          Re-upload even players that already use Cloudflare R2.\n" +
    "  --limit <n>      Process only first n upload candidates. Useful for testing.\n\n" +
    "Required env for --apply:\n" +
    "  CLOUDFLARE_R2_ACCESS_KEY_ID\n" +
    "  CLOUDFLARE_R2_SECRET_ACCESS_KEY\n" +
    "  CLOUDFLARE_R2_BUCKET\n" +
    "  CLOUDFLARE_R2_PUBLIC_BASE_URL\n" +
    "  CLOUDFLARE_R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID\n\n" +
    "Optional env:\n" +
    "  CLOUDFLARE_R2_KEY_PREFIX=" + DEFAULT_KEY_PREFIX + "\n");
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
    const hashIndex = value.indexOf(" #");
    if (hashIndex !== -1) value = value.slice(0, hashIndex).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function envValue(name, loadedEnv, fallback = "") {
  return process.env[name] || loadedEnv[name] || fallback;
}

function readJson(filePath) {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error("Source file not found: " + absolutePath);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function isSourcePhotoUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return SOURCE_PHOTO_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function sanitizeKeyPart(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function resolveSourcePhotoUrl(player) {
  if (player.photoSourceUrl) return player.photoSourceUrl;
  if (isSourcePhotoUrl(player.photoUrl)) return player.photoUrl;
  return null;
}

function resolveSourceThumbnailUrl(player) {
  if (player.photoSourceThumbnailUrl) return player.photoSourceThumbnailUrl;
  if (isSourcePhotoUrl(player.photoThumbnailUrl)) return player.photoThumbnailUrl;
  return null;
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  return "jpg";
}

function extensionFromUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const extension = extname(pathname).replace(/^\./, "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return extension === "jpeg" ? "jpg" : extension;
  } catch {
    // Fall through to the default extension.
  }
  return "jpg";
}

function buildStorageKey(player, sourcePhotoUrl, keyPrefix) {
  const stablePart = sanitizeKeyPart(player.externalId) || sanitizeKeyPart(player.sourceSlug) || hashText(player.displayName ?? "player");
  const extension = extensionFromUrl(sourcePhotoUrl);
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, "");
  return [normalizedPrefix, stablePart + "." + extension].filter(Boolean).join("/");
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase());
}

function encodeStoragePath(value) {
  return String(value).split("/").map(encodePathSegment).join("/");
}

function buildObjectPath(bucket, key) {
  return "/" + encodePathSegment(bucket) + "/" + encodeStoragePath(key);
}

function buildPublicUrl(publicBaseUrl, key) {
  return publicBaseUrl.replace(/\/+$/g, "") + "/" + encodeStoragePath(key);
}

function buildEndpointUrl({ accountId, endpoint }) {
  if (endpoint) return endpoint.replace(/\/+$/g, "");
  if (!accountId) return "";
  return "https://" + accountId + ".r2.cloudflarestorage.com";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac("AWS4" + secretAccessKey, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function normalizeHeaderValue(value) {
  return String(value).trim().replace(/\s+/g, " ");
}

function signR2Request({ accessKeyId, body, bucket, cacheControl, contentType, endpoint, key, method, secretAccessKey }) {
  const region = "auto";
  const service = "s3";
  const amzDate = formatAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const objectPath = buildObjectPath(bucket, key);
  const url = endpoint + objectPath;
  const host = new URL(endpoint).host;
  const payloadHash = body ? sha256(body) : EMPTY_SHA256;
  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (contentType) headers["content-type"] = contentType;
  if (cacheControl) headers["cache-control"] = cacheControl;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => name + ":" + normalizeHeaderValue(headers[name]) + "\n").join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [method, objectPath, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = [dateStamp, region, service, "aws4_request"].join("/");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const signature = hmac(getSigningKey(secretAccessKey, dateStamp, region, service), stringToSign, "hex");

  headers.authorization = "AWS4-HMAC-SHA256 Credential=" + accessKeyId + "/" + credentialScope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

  delete headers.host;
  return { headers, url };
}

async function r2HeadObject(config) {
  const request = signR2Request({ ...config, method: "HEAD" });
  const response = await fetch(request.url, { method: "HEAD", headers: request.headers });
  if (response.status === 404) return false;
  if (response.ok) return true;
  throw new Error("R2 HEAD failed: " + response.status + " " + response.statusText);
}

async function r2PutObject(config) {
  const request = signR2Request({ ...config, method: "PUT" });
  const response = await fetch(request.url, { method: "PUT", headers: request.headers, body: config.body });
  if (response.ok) return;
  const text = await response.text();
  throw new Error("R2 upload failed: " + response.status + " " + response.statusText + (text ? " - " + text.slice(0, 500) : ""));
}

async function fetchImage(sourcePhotoUrl) {
  const response = await fetch(sourcePhotoUrl);
  if (!response.ok) throw new Error("Source image fetch failed: " + response.status + " " + response.statusText);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Source URL did not return an image: " + contentType);
  }
  const body = Buffer.from(await response.arrayBuffer());
  return { body, contentType };
}

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

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const loadedEnv = {
    ...loadDotEnvFile(resolve(".env")),
    ...loadDotEnvFile(resolve(".env.local")),
  };
  const accountId = envValue("CLOUDFLARE_ACCOUNT_ID", loadedEnv);
  const endpoint = buildEndpointUrl({ accountId, endpoint: envValue("CLOUDFLARE_R2_ENDPOINT", loadedEnv) });
  const accessKeyId = envValue("CLOUDFLARE_R2_ACCESS_KEY_ID", loadedEnv);
  const secretAccessKey = envValue("CLOUDFLARE_R2_SECRET_ACCESS_KEY", loadedEnv);
  const bucket = envValue("CLOUDFLARE_R2_BUCKET", loadedEnv);
  const publicBaseUrl = envValue("CLOUDFLARE_R2_PUBLIC_BASE_URL", loadedEnv);
  const keyPrefix = envValue("CLOUDFLARE_R2_KEY_PREFIX", loadedEnv, DEFAULT_KEY_PREFIX);
  const source = readJson(options.file);
  const players = Array.isArray(source.players) ? source.players : [];

  const candidates = players
    .map((player) => {
      const sourcePhotoUrl = resolveSourcePhotoUrl(player);
      return {
        player,
        sourcePhotoUrl,
        sourceThumbnailUrl: resolveSourceThumbnailUrl(player),
        storageKey: player.photoStorageKey || (sourcePhotoUrl ? buildStorageKey(player, sourcePhotoUrl, keyPrefix) : null),
      };
    })
    .filter((candidate) => Boolean(candidate.sourcePhotoUrl && candidate.storageKey))
    .filter((candidate) => options.force || candidate.player.photoProvider !== DEFAULT_PROVIDER || !candidate.player.photoStorageKey);

  const limitedCandidates = options.limit > 0 ? candidates.slice(0, options.limit) : candidates;

  console.log("Players total: " + players.length);
  console.log("Players with source photos: " + candidates.length);
  console.log("Upload candidates this run: " + limitedCandidates.length);

  if (options.dryRun) {
    for (const candidate of limitedCandidates.slice(0, 12)) {
      console.log("DRY " + candidate.storageKey + " <- " + candidate.player.displayName + " <- " + candidate.sourcePhotoUrl);
    }
    console.log("Dry-run only. Add --apply to upload to R2 and write JSON.");
    return;
  }

  for (const [name, value] of Object.entries({ accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl })) {
    if (!value) throw new Error("Missing required R2 env: " + name);
  }

  let uploaded = 0;
  let reused = 0;
  let failed = 0;

  await mapLimit(limitedCandidates, 3, async (candidate) => {
    try {
      const exists = !options.force && await r2HeadObject({ accessKeyId, bucket, endpoint, key: candidate.storageKey, secretAccessKey });
      if (!exists) {
        const image = await fetchImage(candidate.sourcePhotoUrl);
        const extension = extensionFromContentType(image.contentType);
        const keyHasExtension = /\.(jpg|jpeg|png|webp|gif)$/i.test(candidate.storageKey);
        if (!keyHasExtension) candidate.storageKey += "." + extension;
        await r2PutObject({
          accessKeyId,
          body: image.body,
          bucket,
          cacheControl: DEFAULT_CACHE_CONTROL,
          contentType: image.contentType,
          endpoint,
          key: candidate.storageKey,
          secretAccessKey,
        });
        uploaded += 1;
        console.log("UPLOAD " + candidate.storageKey + " <- " + candidate.player.displayName);
      } else {
        reused += 1;
        console.log("REUSE " + candidate.storageKey + " <- " + candidate.player.displayName);
      }

      candidate.player.photoProvider = DEFAULT_PROVIDER;
      candidate.player.photoCloudflareId = null;
      candidate.player.photoStorageKey = candidate.storageKey;
      candidate.player.photoSourceUrl = candidate.sourcePhotoUrl;
      candidate.player.photoSourceThumbnailUrl = candidate.sourceThumbnailUrl;
      candidate.player.photoUrl = buildPublicUrl(publicBaseUrl, candidate.storageKey);
      candidate.player.photoThumbnailUrl = buildPublicUrl(publicBaseUrl, candidate.storageKey);
    } catch (error) {
      failed += 1;
      console.error("FAIL " + candidate.player.displayName + ": " + (error instanceof Error ? error.message : error));
    }
  });

  const outputFile = options.out || options.file;
  writeFileSync(resolve(outputFile), JSON.stringify(source, null, 2) + "\n");
  console.log("Done. Uploaded: " + uploaded + ", reused: " + reused + ", failed: " + failed);
  console.log("Wrote: " + resolve(outputFile));

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
