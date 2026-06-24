import { useAuth } from "@clerk/clerk-expo";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";

import { TOKEN_FETCH_TIMEOUT_MS } from "../constants";

type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Не удалось вовремя получить токен авторизации.")), timeoutMs);
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

  for (const request of tokenRequests) {
    try {
      const token = await withTimeout(getToken(request), TOKEN_FETCH_TIMEOUT_MS);
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
  const preferDefaultToken = sessionClaims?.aud === "convex";

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return await getClerkConvexToken(getTokenRef.current, forceRefreshToken, preferDefaultToken);
    },
    [preferDefaultToken],
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
