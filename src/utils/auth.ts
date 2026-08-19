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

const AUTH_ERROR_MESSAGES: Record<
  LanguageCode,
  {
    accountExists: string;
    actionFailed: string;
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
};

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

  const origin = window.location.origin;

  return {
    redirectUrl: `${origin}${WEB_OAUTH_CALLBACK_PATH}`,
    redirectUrlComplete: `${origin}${WEB_APP_PATH}`,
  };
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
