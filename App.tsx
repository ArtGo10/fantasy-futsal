import "react-native-url-polyfill/auto";

import { ClerkLoaded, ClerkLoading, ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AuthScreen } from "./src/components/auth/AuthScreen";
import { ConvexAuthProblem } from "./src/components/auth/ConvexAuthProblem";
import { MissingEnv } from "./src/components/auth/MissingEnv";
import { OAuthRedirectCallback } from "./src/components/auth/OAuthRedirectCallback";
import { LoadingBlock } from "./src/components/common/LoadingBlock";
import { SignedInHome } from "./src/components/dashboard/SignedInHome";
import { ConvexClerkProvider } from "./src/providers/ConvexClerkProvider";
import { styles } from "./src/styles";
import { getWebOAuthRedirectUrls, isWebOAuthCallbackPath } from "./src/utils/auth";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function App() {
  if (!publishableKey || !convex) {
    return <MissingEnv />;
  }

  const isCompletingOAuthRedirect = isWebOAuthCallbackPath();
  const { redirectUrlComplete } = getWebOAuthRedirectUrls();

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexClerkProvider client={convex}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.container}>
            <ClerkLoading>
              <LoadingBlock />
            </ClerkLoading>

            <ClerkLoaded>
              {isCompletingOAuthRedirect ? (
                <>
                  <OAuthRedirectCallback redirectUrlComplete={redirectUrlComplete} />
                  <LoadingBlock text="Завершаем вход через Google..." />
                </>
              ) : (
                <>
                  <SignedIn>
                    <AuthLoading>
                      <LoadingBlock text="Проверяем сессию..." />
                    </AuthLoading>
                    <Authenticated>
                      <SignedInHome />
                    </Authenticated>
                    <Unauthenticated>
                      <ConvexAuthProblem />
                    </Unauthenticated>
                  </SignedIn>
                  <SignedOut>
                    <AuthScreen />
                  </SignedOut>
                </>
              )}
            </ClerkLoaded>

            <StatusBar style="dark" />
          </SafeAreaView>
        </SafeAreaProvider>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}
