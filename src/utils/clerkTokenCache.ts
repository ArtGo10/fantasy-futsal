import type { TokenCache } from "@clerk/expo";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_CACHE_RETRY_DELAYS_MS = [0, 80, 200];
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const wait = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

function getErrorDetails(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { type: typeof error };
}

async function runSecureStoreOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
) {
  let lastError: unknown;

  for (const delayMs of TOKEN_CACHE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(
    `[auth:token-cache-${operationName}-failed]`,
    getErrorDetails(lastError),
  );
  throw lastError;
}

const nativeTokenCache: TokenCache = {
  getToken: (key) =>
    runSecureStoreOperation(
      () => SecureStore.getItemAsync(key, secureStoreOptions),
      "read",
    ),
  saveToken: (key, token) =>
    runSecureStoreOperation(
      () => SecureStore.setItemAsync(key, token, secureStoreOptions),
      "write",
    ),
  clearToken: (key) =>
    runSecureStoreOperation(
      () => SecureStore.deleteItemAsync(key, secureStoreOptions),
      "clear",
    ),
};

export const clerkTokenCache =
  Platform.OS === "web" ? undefined : nativeTokenCache;
