import {
  SUPPORT_EMAIL,
  WEB_FANTASY_TAB_PATHS,
  WEB_LEGACY_APP_PATH,
  WEB_APP_PATH,
  WEB_OAUTH_CALLBACK_PATH,
} from "../constants";

export const PUBLIC_SITE_NAME = "Fantasy Futsal";
export const PUBLIC_SITE_DOMAIN =
  process.env.EXPO_PUBLIC_PUBLIC_SITE_URL ?? "https://fantasyfutsal.app";
export const PUBLIC_SITE_SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? SUPPORT_EMAIL;

export const PUBLIC_WEB_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/rules",
  "/support",
  "/account-deletion",
] as const;

export type PublicWebPath = (typeof PUBLIC_WEB_PATHS)[number];

export const NOT_FOUND_PUBLIC_WEB_PATH = "__not_found__" as const;
export type PublicWebRoute = PublicWebPath | typeof NOT_FOUND_PUBLIC_WEB_PATH;

function normalizePathname(pathname: string) {
  const cleanPathname = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (!cleanPathname || cleanPathname === "/") return "/";

  return cleanPathname.replace(/\/+$/, "") || "/";
}

const WEB_APP_PATHS = new Set<string>([
  WEB_APP_PATH,
  WEB_OAUTH_CALLBACK_PATH,
  ...Object.values(WEB_FANTASY_TAB_PATHS),
]);

export function getCurrentWebPathname() {
  if (typeof window === "undefined") return "/";

  return normalizePathname(window.location.pathname);
}

export function getPublicWebRoute(
  pathname = getCurrentWebPathname(),
): PublicWebRoute {
  const normalizedPathname = normalizePathname(pathname);

  return PUBLIC_WEB_PATHS.includes(normalizedPathname as PublicWebPath)
    ? (normalizedPathname as PublicWebPath)
    : NOT_FOUND_PUBLIC_WEB_PATH;
}

export function getLegacyWebAppRedirectPath(
  pathname = getCurrentWebPathname(),
) {
  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === WEB_LEGACY_APP_PATH) return WEB_APP_PATH;

  const legacyAppPrefix = `${WEB_LEGACY_APP_PATH}/`;
  if (!normalizedPathname.startsWith(legacyAppPrefix)) return null;

  const legacySegment = normalizedPathname
    .slice(legacyAppPrefix.length)
    .split("/")[0];
  const mappedTabPath =
    WEB_FANTASY_TAB_PATHS[
      legacySegment as keyof typeof WEB_FANTASY_TAB_PATHS
    ];

  return mappedTabPath ?? `/${normalizedPathname.slice(legacyAppPrefix.length)}`;
}

export function getLegacyWebAppRedirectUrl() {
  if (typeof window === "undefined") return getLegacyWebAppRedirectPath();

  const redirectPath = getLegacyWebAppRedirectPath(window.location.pathname);
  if (!redirectPath) return null;

  return `${redirectPath}${window.location.search}${window.location.hash}`;
}

export function isLegacyWebAppPath(pathname = getCurrentWebPathname()) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === WEB_LEGACY_APP_PATH ||
    normalizedPathname.startsWith(`${WEB_LEGACY_APP_PATH}/`)
  );
}

export function isReservedWebAppPath(pathname = getCurrentWebPathname()) {
  const normalizedPathname = normalizePathname(pathname);

  return WEB_APP_PATHS.has(normalizedPathname) || isLegacyWebAppPath(pathname);
}

export function isWebAppPath(pathname = getCurrentWebPathname()) {
  const normalizedPathname = normalizePathname(pathname);

  return WEB_APP_PATHS.has(normalizedPathname);
}

export function isPublicWebPath(pathname = getCurrentWebPathname()) {
  return !isReservedWebAppPath(pathname);
}
