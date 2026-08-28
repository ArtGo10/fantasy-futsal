import { Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";

import {
  APP_SCHEME,
  NATIVE_OAUTH_CALLBACK_PATH,
  WEB_APP_PATH,
  WEB_OAUTH_CALLBACK_PATH,
} from "../constants";
import { DEFAULT_LANGUAGE, type LanguageCode } from "../i18n/translations";
import type { ClerkSignInAttempt } from "../types";

const WEB_OAUTH_ERROR_SEARCH_PARAM = "oauth_error";
const WEB_OAUTH_ERROR_STORAGE_KEY = "fantasyFutsal.oauthCallbackError";
const WEB_OAUTH_ATTEMPT_STORAGE_KEY = "fantasyFutsal.oauthAttemptStartedAt";
const WEB_OAUTH_ATTEMPT_TTL_MS = 5 * 60 * 1000;

type WebOAuthCallbackError = {
  code?: string;
  message?: string;
};

const AUTH_ERROR_MESSAGES: Record<
  LanguageCode,
  {
    accountExists: string;
    actionFailed: string;
    deleteAppDataFailed: string;
    deleteAuthRequired: string;
    deleteCleanupQueueFailed: string;
    deleteNotConfigured: string;
    deleteProviderFailed: string;
    deleteUnknown: string;
    emailInvalid: string;
    identifierNotFound: string;
    incompleteDefault: string;
    incorrectPassword: string;
    missingField: string;
    needsClientTrust: string;
    needsFirstFactor: string;
    needsIdentifier: string;
    needsNewPassword: string;
    needsSecondFactor: string;
    network: string;
    passwordPwned: string;
    passwordTooShort: string;
    passwordWeak: string;
    rateLimited: string;
    unknown: string;
    verification: string;
  }
> = {
  en: {
    accountExists:
      "An account with this email already exists. Sign in instead.",
    actionFailed:
      "Could not complete the action. Check the details and try again.",
    deleteAppDataFailed:
      "The login account was deleted, but app data cleanup did not finish. Contact support.",
    deleteAuthRequired: "Sign in again before deleting your account.",
    deleteCleanupQueueFailed:
      "Account deletion could not be prepared safely. No app data was removed. Try again in a moment.",
    deleteNotConfigured:
      "Account deletion is not configured yet. Contact support.",
    deleteProviderFailed:
      "We could not delete the login account yet. No app data was removed. Try again in a moment or contact support.",
    deleteUnknown:
      "Could not delete the account. No app data was removed. Try again.",
    emailInvalid: "Enter a valid email address.",
    identifierNotFound: "No user was found with these details.",
    incompleteDefault:
      "Sign in was not completed. Try again or contact the organizer.",
    incorrectPassword: "Incorrect email or password.",
    missingField: "Fill in all required fields and try again.",
    needsClientTrust:
      "Clerk needs to verify this device, but no supported verification method was found.",
    needsFirstFactor:
      "Clerk is waiting for the first sign-in step. Try again or contact the organizer.",
    needsIdentifier: "Enter the email used to create the account.",
    needsNewPassword: "This account needs a password update through Clerk.",
    needsSecondFactor:
      "This account needs an additional sign-in step that is not supported yet.",
    network: "Connection problem. Try again.",
    passwordPwned:
      "This password has appeared in a public data breach. Choose a different password.",
    passwordTooShort: "Password must be at least 8 characters.",
    passwordWeak: "Choose a stronger password.",
    rateLimited: "Too many attempts. Wait a little and try again.",
    unknown: "Something went wrong. Try again.",
    verification: "Could not verify the code. Check the code and try again.",
  },
  uk: {
    accountExists:
      "Акаунт із цією поштою вже існує. Увійдіть замість реєстрації.",
    actionFailed:
      "Не вдалося виконати дію. Перевірте дані та спробуйте ще раз.",
    deleteAppDataFailed:
      "Акаунт для входу видалено, але очищення даних застосунку не завершилося. Напишіть у підтримку.",
    deleteAuthRequired: "Увійдіть знову перед видаленням акаунта.",
    deleteCleanupQueueFailed:
      "Не вдалося безпечно підготувати видалення акаунта. Дані застосунку не видалено. Спробуйте ще раз трохи пізніше.",
    deleteNotConfigured:
      "Видалення акаунта ще не налаштовано. Напишіть у підтримку.",
    deleteProviderFailed:
      "Не вдалося видалити акаунт для входу. Дані застосунку не видалено. Спробуйте ще раз трохи пізніше або напишіть у підтримку.",
    deleteUnknown:
      "Не вдалося видалити акаунт. Дані застосунку не видалено. Спробуйте ще раз.",
    emailInvalid: "Введіть коректну пошту.",
    identifierNotFound: "Користувача з такими даними не знайдено.",
    incompleteDefault:
      "Вхід не було завершено. Спробуйте ще раз або напишіть організатору.",
    incorrectPassword: "Неправильна пошта або пароль.",
    missingField: "Заповніть усі обовʼязкові поля та спробуйте ще раз.",
    needsClientTrust:
      "Clerk просить підтвердити цей пристрій, але відповідний спосіб підтвердження не знайдено.",
    needsFirstFactor:
      "Clerk очікує підтвердження першого кроку входу. Спробуйте ще раз або напишіть організатору.",
    needsIdentifier: "Вкажіть пошту, з якою було створено акаунт.",
    needsNewPassword: "Для цього акаунта потрібно оновити пароль через Clerk.",
    needsSecondFactor:
      "Для цього акаунта потрібен додатковий крок входу, який поки не підтримано.",
    network: "Проблема з підключенням. Спробуйте ще раз.",
    passwordPwned:
      "Цей пароль був знайдений у публічному витоку даних. Оберіть інший пароль.",
    passwordTooShort: "Пароль має містити щонайменше 8 символів.",
    passwordWeak: "Оберіть надійніший пароль.",
    rateLimited: "Забагато спроб. Зачекайте трохи та спробуйте ще раз.",
    unknown: "Щось пішло не так. Спробуйте ще раз.",
    verification:
      "Не вдалося підтвердити код. Перевірте код і спробуйте ще раз.",
  },
  pl: {
    accountExists:
      "Konto z tym adresem email już istnieje. Zaloguj się zamiast rejestracji.",
    actionFailed:
      "Nie udało się wykonać tej akcji. Sprawdź dane i spróbuj ponownie.",
    deleteAppDataFailed:
      "Konto logowania zostało usunięte, ale czyszczenie danych aplikacji nie zakończyło się. Skontaktuj się z pomocą.",
    deleteAuthRequired: "Zaloguj się ponownie przed usunięciem konta.",
    deleteCleanupQueueFailed:
      "Nie udało się bezpiecznie przygotować usunięcia konta. Dane aplikacji nie zostały usunięte. Spróbuj ponownie za chwilę.",
    deleteNotConfigured:
      "Usuwanie konta nie jest jeszcze skonfigurowane. Skontaktuj się z pomocą.",
    deleteProviderFailed:
      "Nie udało się jeszcze usunąć konta logowania. Dane aplikacji nie zostały usunięte. Spróbuj ponownie za chwilę albo skontaktuj się z pomocą.",
    deleteUnknown:
      "Nie udało się usunąć konta. Dane aplikacji nie zostały usunięte. Spróbuj ponownie.",
    emailInvalid: "Wprowadź poprawny adres email.",
    identifierNotFound: "Nie znaleziono użytkownika z tymi danymi.",
    incompleteDefault:
      "Logowanie nie zostało zakończone. Spróbuj ponownie albo skontaktuj się z organizatorem.",
    incorrectPassword: "Nieprawidłowy email albo hasło.",
    missingField: "Uzupełnij wszystkie wymagane pola i spróbuj ponownie.",
    needsClientTrust:
      "Clerk musi zweryfikować to urządzenie, ale nie znaleziono obsługiwanej metody weryfikacji.",
    needsFirstFactor:
      "Clerk czeka na pierwszy krok logowania. Spróbuj ponownie albo skontaktuj się z organizatorem.",
    needsIdentifier: "Podaj email użyty do utworzenia konta.",
    needsNewPassword: "To konto wymaga aktualizacji hasła przez Clerk.",
    needsSecondFactor:
      "To konto wymaga dodatkowego kroku logowania, który nie jest jeszcze obsługiwany.",
    network: "Problem z połączeniem. Spróbuj ponownie.",
    passwordPwned:
      "To hasło pojawiło się w publicznym wycieku danych. Wybierz inne hasło.",
    passwordTooShort: "Hasło musi mieć co najmniej 8 znaków.",
    passwordWeak: "Wybierz silniejsze hasło.",
    rateLimited: "Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.",
    unknown: "Coś poszło nie tak. Spróbuj ponownie.",
    verification:
      "Nie udało się zweryfikować kodu. Sprawdź kod i spróbuj ponownie.",
  },
};

export function getWebAppRedirectUrl() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.location?.origin
  ) {
    return WEB_APP_PATH;
  }

  return `${window.location.origin}${WEB_APP_PATH}`;
}

export function keepBrowserOnWebAppPath() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  const targetPath = WEB_APP_PATH;
  if (window.location.pathname !== targetPath) {
    window.history.replaceState(null, "", targetPath);
  }
}

export function getWebOAuthRedirectUrls() {
  const fallbackUrls = {
    redirectUrl: WEB_OAUTH_CALLBACK_PATH,
    redirectUrlComplete: WEB_APP_PATH,
  };

  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.location?.origin
  ) {
    return fallbackUrls;
  }

  return {
    redirectUrl: `${window.location.origin}${WEB_OAUTH_CALLBACK_PATH}`,
    redirectUrlComplete: getWebAppRedirectUrl(),
  };
}

export function getWebOAuthErrorRedirectUrl(redirectUrlComplete: string) {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.location?.origin
  ) {
    return redirectUrlComplete;
  }

  const targetUrl = new URL(redirectUrlComplete, window.location.origin);
  targetUrl.searchParams.set(WEB_OAUTH_ERROR_SEARCH_PARAM, "1");
  return targetUrl.toString();
}

export function isWebOAuthCallbackPath() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location.pathname === WEB_OAUTH_CALLBACK_PATH
  );
}

export function getNativeOAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: APP_SCHEME,
    path: NATIVE_OAUTH_CALLBACK_PATH,
  });
}

type ClerkErrorRecord = {
  code?: string;
  message?: string;
  longMessage?: string;
  long_message?: string;
  meta?: {
    paramName?: string;
    param_name?: string;
  };
};

function getClerkErrorRecords(error: unknown): ClerkErrorRecord[] {
  if (!error || typeof error !== "object" || !("errors" in error)) return [];

  const maybeErrors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(maybeErrors)) return [];

  return maybeErrors.filter((item): item is ClerkErrorRecord =>
    Boolean(item && typeof item === "object"),
  );
}

function getClerkRecordMessage(record: ClerkErrorRecord | undefined) {
  return record?.longMessage ?? record?.long_message ?? record?.message ?? null;
}

function getClerkRecordParam(record: ClerkErrorRecord | undefined) {
  return record?.meta?.paramName ?? record?.meta?.param_name ?? null;
}

export function rememberWebOAuthCallbackError(error: unknown) {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.sessionStorage
  ) {
    return;
  }

  const records = getClerkErrorRecords(error);
  const firstRecord = records[0];
  const fallbackError = error instanceof Error ? error : null;
  const payload: WebOAuthCallbackError = {
    code: firstRecord?.code ?? fallbackError?.name,
    message: getClerkRecordMessage(firstRecord) ?? fallbackError?.message,
  };

  try {
    window.sessionStorage.setItem(
      WEB_OAUTH_ERROR_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Browser storage can be unavailable in private modes.
  }
}

export function markWebOAuthAttemptStarted() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.sessionStorage
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      WEB_OAUTH_ATTEMPT_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    // Browser storage can be unavailable in private modes.
  }
}

export function clearPendingWebOAuthAttempt() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.sessionStorage
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(WEB_OAUTH_ATTEMPT_STORAGE_KEY);
  } catch {
    // Browser storage can be unavailable in private modes.
  }
}

export function consumePendingWebOAuthAttempt() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.sessionStorage
  ) {
    return false;
  }

  try {
    const rawStartedAt = window.sessionStorage.getItem(
      WEB_OAUTH_ATTEMPT_STORAGE_KEY,
    );
    window.sessionStorage.removeItem(WEB_OAUTH_ATTEMPT_STORAGE_KEY);

    if (!rawStartedAt) return false;

    const startedAt = Number(rawStartedAt);
    return (
      Number.isFinite(startedAt) &&
      Date.now() - startedAt <= WEB_OAUTH_ATTEMPT_TTL_MS
    );
  } catch {
    return false;
  }
}

export function consumeWebOAuthCallbackError(): WebOAuthCallbackError | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;

  const currentUrl = new URL(window.location.href);
  const hasErrorParam = currentUrl.searchParams.has(
    WEB_OAUTH_ERROR_SEARCH_PARAM,
  );
  let storedPayload: WebOAuthCallbackError | null = null;

  try {
    const rawPayload = window.sessionStorage?.getItem(
      WEB_OAUTH_ERROR_STORAGE_KEY,
    );
    if (rawPayload) {
      storedPayload = JSON.parse(rawPayload) as WebOAuthCallbackError;
      window.sessionStorage.removeItem(WEB_OAUTH_ERROR_STORAGE_KEY);
    }
  } catch {
    storedPayload = null;
  }

  if (hasErrorParam) {
    currentUrl.searchParams.delete(WEB_OAUTH_ERROR_SEARCH_PARAM);
    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  }

  if (!hasErrorParam && !storedPayload) return null;

  return storedPayload ?? {};
}

export function logAuthError(context: string, error: unknown) {
  const records = getClerkErrorRecords(error);
  const details = records.length
    ? records.map((record) => ({
        code: record.code,
        message: record.message,
        longMessage: record.longMessage ?? record.long_message,
        paramName: getClerkRecordParam(record),
      }))
    : error instanceof Error
      ? { name: error.name, message: error.message }
      : { type: typeof error };

  console.warn(`[auth:${context}]`, details);
}

export function getErrorMessage(
  error: unknown,
  language: LanguageCode = DEFAULT_LANGUAGE,
): string {
  const messages = AUTH_ERROR_MESSAGES[language];
  const records = getClerkErrorRecords(error);
  const firstRecord = records[0];
  const rawMessage =
    getClerkRecordMessage(firstRecord) ??
    (error instanceof Error ? error.message : null);
  const code = String(firstRecord?.code ?? "").toLowerCase();
  const paramName = String(
    getClerkRecordParam(firstRecord) ?? "",
  ).toLowerCase();
  const normalized = [code, paramName, rawMessage ?? ""]
    .join(" ")
    .toLowerCase();

  if (!rawMessage && !code) {
    return messages.unknown;
  }

  if (
    normalized.includes("too_many") ||
    normalized.includes("rate") ||
    normalized.includes("thrott")
  ) {
    return messages.rateLimited;
  }

  if (
    normalized.includes("pwned") ||
    normalized.includes("breach") ||
    normalized.includes("breached") ||
    normalized.includes("compromised")
  ) {
    return messages.passwordPwned;
  }

  if (
    (paramName.includes("password") || normalized.includes("password")) &&
    (normalized.includes("too_short") ||
      normalized.includes("length") ||
      normalized.includes("at least") ||
      normalized.includes("8 character"))
  ) {
    return messages.passwordTooShort;
  }

  if (
    normalized.includes("password") &&
    (normalized.includes("weak") ||
      normalized.includes("not strong") ||
      normalized.includes("validation") ||
      normalized.includes("invalid"))
  ) {
    return messages.passwordWeak;
  }

  if (
    normalized.includes("identifier_not_found") ||
    normalized.includes("form_identifier_not_found") ||
    normalized.includes("account_not_found") ||
    normalized.includes("user_not_found") ||
    normalized.includes("identifier not found") ||
    normalized.includes("account not found") ||
    normalized.includes("user not found") ||
    normalized.includes("no account") ||
    normalized.includes("no user") ||
    normalized.includes("couldn't find") ||
    normalized.includes("could not find") ||
    normalized.includes("does not exist") ||
    (normalized.includes("not found") &&
      (normalized.includes("account") ||
        normalized.includes("user") ||
        normalized.includes("identifier") ||
        normalized.includes("email")))
  ) {
    return messages.identifierNotFound;
  }

  if (
    paramName.includes("email") ||
    normalized.includes("email_address") ||
    normalized.includes("email address")
  ) {
    if (
      normalized.includes("format") ||
      normalized.includes("invalid") ||
      normalized.includes("not valid")
    ) {
      return messages.emailInvalid;
    }
  }

  if (
    normalized.includes("missing") ||
    normalized.includes("required") ||
    normalized.includes("nil") ||
    normalized.includes("blank")
  ) {
    return messages.missingField;
  }

  if (
    normalized.includes("password") &&
    (normalized.includes("incorrect") || normalized.includes("invalid"))
  ) {
    return messages.incorrectPassword;
  }
  if (
    normalized.includes("identifier_exists") ||
    normalized.includes("form_identifier_exists") ||
    normalized.includes("email_address_exists") ||
    normalized.includes("email_exists") ||
    normalized.includes("account_exists") ||
    normalized.includes("user_exists") ||
    normalized.includes("already_registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already have an account") ||
    normalized.includes("email already") ||
    normalized.includes("address already") ||
    normalized.includes("already been taken") ||
    normalized.includes("has been taken") ||
    normalized.includes("is taken") ||
    normalized.includes("email taken") ||
    ((paramName.includes("email") || normalized.includes("email")) &&
      normalized.includes("taken")) ||
    (normalized.includes("already") &&
      (normalized.includes("exist") || normalized.includes("taken")))
  ) {
    return messages.accountExists;
  }
  if (normalized.includes("verification") || normalized.includes("code")) {
    return messages.verification;
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return messages.network;
  }

  if (
    language === "en" &&
    rawMessage &&
    !rawMessage.toLowerCase().includes("could not complete")
  ) {
    return rawMessage;
  }

  return messages.actionFailed;
}

export function getIncompleteSignInMessage(
  status: string | null | undefined,
  language: LanguageCode = DEFAULT_LANGUAGE,
) {
  const messages = AUTH_ERROR_MESSAGES[language];

  switch (status) {
    case "needs_identifier":
      return messages.needsIdentifier;
    case "needs_first_factor":
      return messages.needsFirstFactor;
    case "needs_second_factor":
      return messages.needsSecondFactor;
    case "needs_client_trust":
      return messages.needsClientTrust;
    case "needs_new_password":
      return messages.needsNewPassword;
    default:
      return messages.incompleteDefault;
  }
}

export function getDeleteAccountErrorMessage(
  error: unknown,
  language: LanguageCode = DEFAULT_LANGUAGE,
): string {
  const messages = AUTH_ERROR_MESSAGES[language];
  const records = getClerkErrorRecords(error);
  const firstRecord = records[0];
  const rawMessage =
    getClerkRecordMessage(firstRecord) ??
    (error instanceof Error ? error.message : null);
  const normalized = [
    firstRecord?.code ?? "",
    getClerkRecordParam(firstRecord) ?? "",
    rawMessage ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (normalized.includes("delete_account_auth_required")) {
    return messages.deleteAuthRequired;
  }

  if (normalized.includes("delete_account_not_configured")) {
    return messages.deleteNotConfigured;
  }

  if (normalized.includes("delete_account_cleanup_queue_failed")) {
    return messages.deleteCleanupQueueFailed;
  }

  if (normalized.includes("delete_account_app_data_failed")) {
    return messages.deleteAppDataFailed;
  }

  if (
    normalized.includes("delete_account_clerk_failed") ||
    normalized.includes("form_param_missing") ||
    normalized.includes("required") ||
    normalized.includes("clerk")
  ) {
    return messages.deleteProviderFailed;
  }

  if (
    normalized.includes("too_many") ||
    normalized.includes("rate") ||
    normalized.includes("thrott")
  ) {
    return messages.rateLimited;
  }

  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed")
  ) {
    return messages.network;
  }

  return messages.deleteUnknown;
}

export function shouldConfirmSignInWithEmailCode(attempt: ClerkSignInAttempt) {
  const status = String(attempt.status ?? "");
  const needsTrustCheck =
    status === "needs_second_factor" || status === "needs_client_trust";
  const hasEmailCodeFactor = Boolean(
    attempt.supportedSecondFactors?.some(
      (factor) => factor.strategy === "email_code",
    ),
  );

  return (
    needsTrustCheck &&
    hasEmailCodeFactor &&
    typeof attempt.prepareSecondFactor === "function"
  );
}

export function getMetadataDisplayName(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const displayName = (metadata as { displayName?: unknown }).displayName;
  if (typeof displayName !== "string") return undefined;

  const trimmed = displayName.trim();
  return trimmed ? trimmed : undefined;
}
