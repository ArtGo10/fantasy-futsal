import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { LEGAL_VERSION } from "./legalContent";

const LEGAL_ACCEPTANCE_STORAGE_KEY = "fantasyFutsalLegalAcceptance";

type StoredLegalAcceptance = {
  acceptedAt: number;
  version: string;
};

function parseStoredAcceptance(
  value: string | null,
): StoredLegalAcceptance | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredLegalAcceptance>;
    if (
      typeof parsed.acceptedAt !== "number" ||
      typeof parsed.version !== "string"
    )
      return null;
    return { acceptedAt: parsed.acceptedAt, version: parsed.version };
  } catch {
    return null;
  }
}

export async function storeLegalAcceptance(acceptedAt = Date.now()) {
  const payload = JSON.stringify({ acceptedAt, version: LEGAL_VERSION });

  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, payload);
      }
      return;
    }

    await SecureStore.setItemAsync(LEGAL_ACCEPTANCE_STORAGE_KEY, payload);
  } catch {
    // Legal acceptance is also persisted in Convex after login; local storage only bridges OAuth handoff.
  }
}

export async function getStoredLegalAcceptance() {
  try {
    const value =
      Platform.OS === "web"
        ? typeof window === "undefined"
          ? null
          : window.localStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY)
        : await SecureStore.getItemAsync(LEGAL_ACCEPTANCE_STORAGE_KEY);

    const parsed = parseStoredAcceptance(value);
    return parsed?.version === LEGAL_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearStoredLegalAcceptance() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
      }
      return;
    }

    await SecureStore.deleteItemAsync(LEGAL_ACCEPTANCE_STORAGE_KEY);
  } catch {
    // A failed local cleanup should not block sign out.
  }
}
