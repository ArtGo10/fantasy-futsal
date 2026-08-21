import { useAuth } from "@clerk/expo";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import { TOKEN_FETCH_TIMEOUT_MS } from "../constants";

type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

const WEB_FOREGROUND_TOKEN_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error("Timed out while getting the authorization token."),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getClerkConvexToken(
  getToken: ClerkGetToken,
  skipCache: boolean,
  preferDefaultToken: boolean,
) {
  const tokenRequests = preferDefaultToken
    ? [{ skipCache }, { template: "convex" as const, skipCache }]
    : [{ template: "convex" as const, skipCache }, { skipCache }];
  const fallbackTokenRequests = skipCache
    ? []
    : preferDefaultToken
      ? [{ skipCache: true }, { template: "convex" as const, skipCache: true }]
      : [{ template: "convex" as const, skipCache: true }, { skipCache: true }];

  for (const request of [...tokenRequests, ...fallbackTokenRequests]) {
    try {
      const token = await withTimeout(
        getToken(request),
        TOKEN_FETCH_TIMEOUT_MS,
      );
      if (token) return token;
    } catch {
      // Convex integration uses the default token; JWT templates use "convex".
    }
  }

  return null;
}

function useClerkConvexAuth() {
  const { isLoaded, isSignedIn, getToken, sessionClaims } = useAuth();
  const getTokenRef = useRef(getToken);
  const appStateRef = useRef(AppState.currentState);
  const lastForegroundTokenRefreshAtRef = useRef(Date.now());
  const [foregroundRefreshNonce, setForegroundRefreshNonce] = useState(0);
  const preferDefaultToken = sessionClaims?.aud === "convex";

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        isSignedIn &&
        nextAppState === "active" &&
        /inactive|background/.test(previousAppState)
      ) {
        const now = Date.now();

        if (
          Platform.OS === "web" &&
          now - lastForegroundTokenRefreshAtRef.current <
            WEB_FOREGROUND_TOKEN_REFRESH_COOLDOWN_MS
        ) {
          return;
        }

        lastForegroundTokenRefreshAtRef.current = now;
        setForegroundRefreshNonce((current) => current + 1);
      }
    });

    return () => subscription.remove();
  }, [isSignedIn]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return await getClerkConvexToken(
        getTokenRef.current,
        forceRefreshToken,
        preferDefaultToken,
      );
    },
    [foregroundRefreshNonce, preferDefaultToken],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  );
}

export function ConvexClerkProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: ConvexReactClient;
}) {
  return (
    <ConvexProviderWithAuth client={client} useAuth={useClerkConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
