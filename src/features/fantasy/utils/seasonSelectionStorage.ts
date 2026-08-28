import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SELECTED_FANTASY_SEASON_STORAGE_KEY = "futsalFantasySelectedSeasonSlug";

function normalizeStoredSeasonSlug(value: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

export async function getStoredFantasySeasonSlug() {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;

      return normalizeStoredSeasonSlug(
        window.localStorage.getItem(SELECTED_FANTASY_SEASON_STORAGE_KEY),
      );
    }

    return normalizeStoredSeasonSlug(
      await SecureStore.getItemAsync(SELECTED_FANTASY_SEASON_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export async function storeFantasySeasonSlug(seasonSlug: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          SELECTED_FANTASY_SEASON_STORAGE_KEY,
          seasonSlug,
        );
      }
      return;
    }

    await SecureStore.setItemAsync(
      SELECTED_FANTASY_SEASON_STORAGE_KEY,
      seasonSlug,
    );
  } catch {
    // Season persistence is a convenience; the current session can keep using in-memory state.
  }
}

export async function clearStoredFantasySeasonSlug() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SELECTED_FANTASY_SEASON_STORAGE_KEY);
      }
      return;
    }

    await SecureStore.deleteItemAsync(SELECTED_FANTASY_SEASON_STORAGE_KEY);
  } catch {
    // Season persistence is a convenience; the current session can keep using in-memory state.
  }
}
