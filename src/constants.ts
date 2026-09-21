export const APP_SCHEME = "fantasy-futsal";
export const WEB_APP_PATH = "/";
export const WEB_LEGACY_APP_PATH = "/app";
export const WEB_FANTASY_TAB_PATHS = {
  league: "/league",
  market: "/market",
  profile: "/profile",
  season: "/season",
  team: WEB_APP_PATH,
} as const;
export const WEB_OAUTH_CALLBACK_PATH = "/sso-callback";
export const NATIVE_OAUTH_CALLBACK_PATH = "oauth-native-callback";
export const TOKEN_FETCH_TIMEOUT_MS = 8000;
export const SUPPORT_EMAIL = "support@fantasyfutsal.app";

export const WEB_DESKTOP_MIN_WIDTH = 992;
