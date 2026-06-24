import { Platform } from "react-native";

import { WEB_OAUTH_CALLBACK_PATH } from "../constants";
import type { ClerkSignInAttempt } from "../types";

export function getWebOAuthRedirectUrls() {
  if (typeof window === "undefined") {
    return {
      redirectUrl: WEB_OAUTH_CALLBACK_PATH,
      redirectUrlComplete: "/",
    };
  }

  return {
    redirectUrl: `${window.location.origin}${WEB_OAUTH_CALLBACK_PATH}`,
    redirectUrlComplete: `${window.location.origin}/`,
  };
}

export function isWebOAuthCallbackPath() {
  return Platform.OS === "web" && typeof window !== "undefined" && window.location.pathname === WEB_OAUTH_CALLBACK_PATH;
}

export function getErrorMessage(error: unknown): string {
  let rawMessage: string | null = null;

  if (error && typeof error === "object" && "errors" in error) {
    const maybeErrors = (error as { errors?: Array<{ message?: string }> }).errors;
    if (Array.isArray(maybeErrors) && maybeErrors[0]?.message) {
      rawMessage = maybeErrors[0].message;
    }
  }

  if (!rawMessage && error instanceof Error) {
    rawMessage = error.message;
  }

  if (!rawMessage) {
    return "Что-то пошло не так. Попробуйте ещё раз.";
  }

  if (/[А-Яа-яЁё]/.test(rawMessage)) {
    return rawMessage;
  }

  const normalized = rawMessage.toLowerCase();
  if (normalized.includes("password") && (normalized.includes("incorrect") || normalized.includes("invalid"))) {
    return "Неверная почта или пароль.";
  }
  if (normalized.includes("identifier") && normalized.includes("not found")) {
    return "Пользователь с такими данными не найден.";
  }
  if (normalized.includes("already") && normalized.includes("exist")) {
    return "Такой аккаунт уже существует.";
  }
  if (normalized.includes("verification") || normalized.includes("code")) {
    return "Не удалось подтвердить код. Проверьте код и попробуйте ещё раз.";
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Проблема с подключением. Попробуйте ещё раз.";
  }

  return "Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз.";
}

export function getIncompleteSignInMessage(status: string | null | undefined) {
  switch (status) {
    case "needs_identifier":
      return "Укажите почту, с которой был создан аккаунт.";
    case "needs_first_factor":
      return "Clerk ждёт подтверждение первого шага входа. Попробуйте ещё раз или напишите организатору.";
    case "needs_second_factor":
      return "Для этого аккаунта нужен дополнительный шаг входа, который пока не поддержан.";
    case "needs_client_trust":
      return "Clerk просит подтвердить это устройство, но подходящий способ подтверждения не найден.";
    case "needs_new_password":
      return "Для этого аккаунта нужно обновить пароль через Clerk.";
    default:
      return "Вход не был завершён. Попробуйте ещё раз или напишите организатору.";
  }
}

export function shouldConfirmSignInWithEmailCode(attempt: ClerkSignInAttempt) {
  const status = String(attempt.status ?? "");
  const needsTrustCheck = status === "needs_second_factor" || status === "needs_client_trust";
  const hasEmailCodeFactor = Boolean(
    attempt.supportedSecondFactors?.some((factor) => factor.strategy === "email_code"),
  );

  return needsTrustCheck && hasEmailCodeFactor && typeof attempt.prepareSecondFactor === "function";
}

export function getMetadataDisplayName(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const displayName = (metadata as { displayName?: unknown }).displayName;
  if (typeof displayName !== "string") return undefined;

  const trimmed = displayName.trim();
  return trimmed ? trimmed : undefined;
}
