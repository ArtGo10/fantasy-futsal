import "react-native-url-polyfill/auto";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { MissingEnv } from "./src/components/auth/MissingEnv";
import { OAuthRedirectCallback } from "./src/components/auth/OAuthRedirectCallback";
import { AppConnectionProblemScreen } from "./src/components/common/AppConnectionProblemScreen";
import { AppLoadingScreen } from "./src/components/common/AppLoadingScreen";
import { PublicWebSite } from "./src/web/PublicWebSite";
import { usePushNotificationPermissionPrompt } from "./src/hooks/usePushNotifications";
import { useOfflineStatus } from "./src/hooks/useOfflineStatus";
import { FantasyHome } from "./src/features/fantasy/FantasyHome";
import {
  preloadFantasyBootAssets,
  preloadFantasyStaticAssets,
} from "./src/features/fantasy/assets/fantasyAssets";
import { I18nProvider, useI18n } from "./src/i18n/I18nProvider";
import { ConvexClerkProvider } from "./src/providers/ConvexClerkProvider";
import { isPublicWebPath, isWebAppPath } from "./src/web/publicSiteConfig";
import { styles } from "./src/styles";
import {
  clearStoredCrashReport,
  formatCrashReport,
  getStoredCrashReport,
  installGlobalCrashReporter,
  storeCrashReportForError,
  type StoredCrashReport,
} from "./src/utils/crashReporter";
import {
  getWebOAuthRedirectUrls,
  isWebOAuthCallbackPath,
} from "./src/utils/auth";

installGlobalCrashReporter();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const LONG_SLEEP_APP_RESET_MS = 5 * 60 * 1000;
const AUTH_BOOT_TIMEOUT_MS = 15000;
const AUTH_BOOT_RECOVERY_ATTEMPT_LIMIT = 1;
const WEB_SCROLLBAR_STYLE_ID = "fantasy-futsal-scrollbar-styles";

const DEFAULT_SAFE_AREA_EDGES = ["top", "right", "bottom", "left"] as const;
const TOP_EDGE_TO_EDGE_SAFE_AREA_EDGES = ["right", "bottom", "left"] as const;

if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  SplashScreen.setOptions({
    duration: Platform.OS === "android" ? 0 : 250,
    fade: Platform.OS !== "android",
  });
}

function hideNativeSplash() {
  if (Platform.OS === "web") return;

  void SplashScreen.hideAsync().catch(() => undefined);
}

function NativeSplashAutoHide() {
  useEffect(() => {
    hideNativeSplash();
  }, []);

  return null;
}

function useWebScrollbarStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return undefined;
    }

    const existingStyleElement = document.getElementById(
      WEB_SCROLLBAR_STYLE_ID,
    ) as HTMLStyleElement | null;
    const styleElement =
      existingStyleElement ?? document.createElement("style");
    styleElement.id = WEB_SCROLLBAR_STYLE_ID;
    styleElement.textContent = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      #root::-webkit-scrollbar,
      #root *::-webkit-scrollbar,
      *::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
        background: transparent !important;
      }

      html::-webkit-scrollbar-track,
      body::-webkit-scrollbar-track,
      #root::-webkit-scrollbar-track,
      #root *::-webkit-scrollbar-track,
      *::-webkit-scrollbar-track,
      html::-webkit-scrollbar-thumb,
      body::-webkit-scrollbar-thumb,
      #root::-webkit-scrollbar-thumb,
      #root *::-webkit-scrollbar-thumb,
      *::-webkit-scrollbar-thumb,
      html::-webkit-scrollbar-corner,
      body::-webkit-scrollbar-corner,
      #root::-webkit-scrollbar-corner,
      #root *::-webkit-scrollbar-corner,
      *::-webkit-scrollbar-corner {
        background: transparent !important;
        border: 0 !important;
      }
    `;
    if (!existingStyleElement) {
      document.head.appendChild(styleElement);
    }

    return () => {
      if (!existingStyleElement) {
        styleElement.remove();
      }
    };
  }, []);
}
function useStoredCrashReportNotice() {
  const [storedCrashReport, setStoredCrashReport] =
    useState<StoredCrashReport | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getStoredCrashReport().then((report) => {
      if (isMounted) {
        setStoredCrashReport(report);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const clearCrashReport = useCallback(async () => {
    await clearStoredCrashReport();
    setStoredCrashReport(null);
  }, []);

  return { clearCrashReport, storedCrashReport };
}

function CrashReportNoticeScreen({
  onContinue,
  report,
}: {
  onContinue: () => void;
  report: StoredCrashReport;
}) {
  const reportText = useMemo(() => formatCrashReport(report), [report]);
  const occurredAt = useMemo(
    () => new Date(report.timestamp).toLocaleString(),
    [report.timestamp],
  );

  useEffect(() => {
    hideNativeSplash();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.panel}>
            <Text style={styles.title}>Previous crash detected</Text>
            <Text style={styles.bodyText}>
              The app saved details from the last startup/runtime crash. Send
              this screen or the text below so we can see what failed.
            </Text>
            <View style={styles.panel}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.bodyText}>{occurredAt}</Text>
              <Text style={styles.label}>Source</Text>
              <Text style={styles.bodyText}>{report.source}</Text>
            </View>
            <Text selectable style={styles.input}>
              {reportText}
            </Text>
            <Pressable onPress={onContinue} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Clear and continue</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function useAppResumeResetKey() {
  const appStateRef = useRef(AppState.currentState);
  const suspendedAtRef = useRef<number | null>(
    /inactive|background/.test(AppState.currentState) ? Date.now() : null,
  );
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (/inactive|background/.test(nextAppState)) {
        if (!/inactive|background/.test(previousAppState)) {
          suspendedAtRef.current = Date.now();
        }
        return;
      }

      if (
        nextAppState === "active" &&
        /inactive|background/.test(previousAppState)
      ) {
        const suspendedAt = suspendedAtRef.current;
        suspendedAtRef.current = null;

        if (
          suspendedAt &&
          Date.now() - suspendedAt >= LONG_SLEEP_APP_RESET_MS
        ) {
          setResetKey((current) => current + 1);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  return resetKey;
}

function AppContent({
  isCompletingOAuthRedirect,
  isOffline,
  onTopEdgeToEdgeChange,
  redirectUrlComplete,
}: {
  isCompletingOAuthRedirect: boolean;
  isOffline: boolean;
  onTopEdgeToEdgeChange: (isEnabled: boolean) => void;
  redirectUrlComplete: string;
}) {
  const { t } = useI18n();

  usePushNotificationPermissionPrompt();

  if (isCompletingOAuthRedirect) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    return (
      <>
        <OAuthRedirectCallback redirectUrlComplete={redirectUrlComplete} />
        <AppLoadingScreen
          title={t("loading.oauthComplete")}
          description={t("loading.syncingAccount")}
        />
      </>
    );
  }

  return (
    <FantasyHome
      isOffline={isOffline}
      onTopEdgeToEdgeChange={onTopEdgeToEdgeChange}
    />
  );
}

function AppBootLoading() {
  const { t } = useI18n();

  return (
    <AppLoadingScreen
      title={t("loading.checkingSession")}
      description={t("loading.syncingAccount")}
    />
  );
}

type AppRuntimeErrorBoundaryProps = {
  children: ReactNode;
};

type AppRuntimeErrorBoundaryState = {
  error: unknown | null;
};

class AppRuntimeErrorBoundary extends Component<
  AppRuntimeErrorBoundaryProps,
  AppRuntimeErrorBoundaryState
> {
  state: AppRuntimeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.warn("[app-runtime-error]", error, errorInfo.componentStack);
    void storeCrashReportForError({
      componentStack: errorInfo.componentStack,
      error,
      fatal: false,
      source: "errorBoundary",
    });
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={[styles.container, styles.centerBlock]}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.mutedText}>
          The app could not load this screen. Try again, or restart the app if
          the problem repeats.
        </Text>
        <Pressable onPress={this.handleRetry} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

function ClerkSessionGate({
  authBootRecoveryAttempts,
  children,
  isOffline,
  onRecoverAuthBoot,
}: {
  authBootRecoveryAttempts: number;
  children: ReactNode;
  isOffline: boolean;
  onRecoverAuthBoot: () => void;
}) {
  const { t } = useI18n();
  const { isLoaded } = useAuth();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(isLoaded);
  const [hasBootTimedOut, setHasBootTimedOut] = useState(false);
  const wasOfflineRef = useRef(isOffline);
  const hasRequestedRecoveryRef = useRef(false);

  useEffect(() => {
    if (isLoaded) {
      setHasLoadedOnce(true);
      setHasBootTimedOut(false);
      hasRequestedRecoveryRef.current = false;
    }
  }, [isLoaded]);

  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    if (
      wasOffline &&
      !isOffline &&
      !isLoaded &&
      !hasLoadedOnce &&
      authBootRecoveryAttempts < AUTH_BOOT_RECOVERY_ATTEMPT_LIMIT
    ) {
      hasRequestedRecoveryRef.current = true;
      setHasBootTimedOut(false);
      onRecoverAuthBoot();
    }
  }, [
    authBootRecoveryAttempts,
    hasLoadedOnce,
    isLoaded,
    isOffline,
    onRecoverAuthBoot,
  ]);

  useEffect(() => {
    if (isOffline || isLoaded || hasLoadedOnce) {
      setHasBootTimedOut(false);
      return undefined;
    }

    setHasBootTimedOut(false);
    const timeoutId = setTimeout(() => {
      if (
        !hasRequestedRecoveryRef.current &&
        authBootRecoveryAttempts < AUTH_BOOT_RECOVERY_ATTEMPT_LIMIT
      ) {
        hasRequestedRecoveryRef.current = true;
        onRecoverAuthBoot();
        return;
      }

      setHasBootTimedOut(true);
    }, AUTH_BOOT_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [
    authBootRecoveryAttempts,
    hasLoadedOnce,
    isLoaded,
    isOffline,
    onRecoverAuthBoot,
  ]);

  if (!isLoaded && !hasLoadedOnce) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    if (hasBootTimedOut) {
      return (
        <AppConnectionProblemScreen
          title={t("loading.checkingSession")}
          description={t("session.startupProblem")}
        />
      );
    }

    return <AppBootLoading />;
  }

  return <>{children}</>;
}

function ConfiguredApp({
  clerkPublishableKey,
  convexUrl,
}: {
  clerkPublishableKey: string;
  convexUrl: string;
}) {
  const convexClient = useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl],
  );
  const [authBootRecoveryAttempts, setAuthBootRecoveryAttempts] = useState(0);
  const [sessionProviderResetKey, setSessionProviderResetKey] = useState(0);
  const [isTopEdgeToEdge, setIsTopEdgeToEdge] = useState(false);
  const [rootLayoutReady, setRootLayoutReady] = useState(false);
  const isCompletingOAuthRedirect = isWebOAuthCallbackPath();
  const isOffline = useOfflineStatus();
  const statusBarStyle =
    isTopEdgeToEdge || isCompletingOAuthRedirect ? "light" : "dark";

  const handleRootLayout = useCallback(() => {
    setRootLayoutReady(true);
  }, []);

  const handleRecoverAuthBoot = useCallback(() => {
    setAuthBootRecoveryAttempts((current) => current + 1);
    setSessionProviderResetKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (isOffline) {
      setAuthBootRecoveryAttempts(0);
    }
  }, [isOffline]);

  useEffect(() => {
    void preloadFantasyBootAssets().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (rootLayoutReady) {
      hideNativeSplash();
    }
  }, [rootLayoutReady]);

  useEffect(() => {
    void preloadFantasyStaticAssets().catch(() => undefined);
  }, []);

  const { redirectUrlComplete } = getWebOAuthRedirectUrls();
  return (
    <ClerkProvider
      key={sessionProviderResetKey}
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ConvexClerkProvider client={convexClient}>
        <SafeAreaProvider>
          <I18nProvider>
            <SafeAreaView
              edges={
                isTopEdgeToEdge
                  ? TOP_EDGE_TO_EDGE_SAFE_AREA_EDGES
                  : DEFAULT_SAFE_AREA_EDGES
              }
              onLayout={handleRootLayout}
              style={styles.container}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
                style={styles.keyboardAvoidingRoot}
              >
                <AppRuntimeErrorBoundary>
                  {isCompletingOAuthRedirect ? (
                    <AppContent
                      isOffline={isOffline}
                      isCompletingOAuthRedirect={isCompletingOAuthRedirect}
                      onTopEdgeToEdgeChange={setIsTopEdgeToEdge}
                      redirectUrlComplete={redirectUrlComplete}
                    />
                  ) : (
                    <ClerkSessionGate
                      authBootRecoveryAttempts={authBootRecoveryAttempts}
                      isOffline={isOffline}
                      onRecoverAuthBoot={handleRecoverAuthBoot}
                    >
                      <AppContent
                        isOffline={isOffline}
                        isCompletingOAuthRedirect={isCompletingOAuthRedirect}
                        onTopEdgeToEdgeChange={setIsTopEdgeToEdge}
                        redirectUrlComplete={redirectUrlComplete}
                      />
                    </ClerkSessionGate>
                  )}
                </AppRuntimeErrorBoundary>
              </KeyboardAvoidingView>

              <StatusBar style={statusBarStyle} />
            </SafeAreaView>
          </I18nProvider>
        </SafeAreaProvider>
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}

export default function App() {
  useWebScrollbarStyles();

  const appResumeResetKey = useAppResumeResetKey();
  const { clearCrashReport, storedCrashReport } = useStoredCrashReportNotice();

  if (storedCrashReport) {
    return (
      <CrashReportNoticeScreen
        onContinue={() => void clearCrashReport()}
        report={storedCrashReport}
      />
    );
  }

  if (Platform.OS === "web" && !isWebAppPath() && isPublicWebPath()) {
    return (
      <I18nProvider>
        <PublicWebSite />
      </I18nProvider>
    );
  }

  if (!publishableKey || !convexUrl) {
    return (
      <I18nProvider>
        <NativeSplashAutoHide />
        <MissingEnv />
      </I18nProvider>
    );
  }

  return (
    <ConfiguredApp
      clerkPublishableKey={publishableKey}
      convexUrl={convexUrl}
      key={appResumeResetKey}
    />
  );
}
