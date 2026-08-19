import {
  SUPPORT_EMAIL,
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

export function isReservedWebAppPath(pathname = getCurrentWebPathname()) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === WEB_OAUTH_CALLBACK_PATH ||
    normalizedPathname === WEB_APP_PATH ||
    normalizedPathname.startsWith(`${WEB_APP_PATH}/`)
  );
}

export function isWebAppPath(pathname = getCurrentWebPathname()) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === WEB_APP_PATH ||
    normalizedPathname.startsWith(`${WEB_APP_PATH}/`) ||
    normalizedPathname === WEB_OAUTH_CALLBACK_PATH
  );
}

export function isPublicWebPath(pathname = getCurrentWebPathname()) {
  return !isReservedWebAppPath(pathname);
}
