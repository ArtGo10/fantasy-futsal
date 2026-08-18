import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { DEFAULT_LANGUAGE, type LanguageCode } from "./translations";

const LANGUAGE_STORAGE_KEY = "futsalFantasyLanguage";

export function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "uk";
}

export async function getStoredLanguage(): Promise<LanguageCode> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return DEFAULT_LANGUAGE;

      const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
    }

    const value = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export async function storeLanguage(language: LanguageCode) {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      }
      return;
    }

    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language persistence is a convenience; the UI can keep working with in-memory state.
  }
}
