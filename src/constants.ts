import { getLocalDayStart } from "./utils/dates";

export const POTS = [1, 2, 3] as const;
export const WEB_OAUTH_CALLBACK_PATH = "/sso-callback";
export const TOKEN_FETCH_TIMEOUT_MS = 8000;
export const TOURNAMENT_LAST_MATCH_AT = Date.UTC(2026, 6, 19, 19, 0, 0);
export const TOURNAMENT_LAST_DAY = getLocalDayStart(TOURNAMENT_LAST_MATCH_AT);
