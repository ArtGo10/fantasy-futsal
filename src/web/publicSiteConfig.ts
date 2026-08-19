import { SUPPORT_EMAIL } from "../constants";

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

export function getCurrentWebPathname(_pathname?: string) {
  return "/";
}

export function getPublicWebRoute(_pathname?: string): PublicWebRoute {
  return "/";
}

export function isReservedWebAppPath(_pathname?: string) {
  return false;
}

export function isWebAppPath(_pathname?: string) {
  return false;
}

export function isPublicWebPath(_pathname?: string) {
  return false;
}
