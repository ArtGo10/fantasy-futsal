import { useAuth, useClerk, useUser } from "@clerk/expo";
import type { Id } from "../../../convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Keyboard,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Bell, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthScreen } from "../../components/auth/AuthScreen";
import {
  TOKEN_FETCH_TIMEOUT_MS,
  WEB_APP_PATH,
  WEB_DESKTOP_MIN_WIDTH,
} from "../../constants";
import { AppConnectionProblemScreen } from "../../components/common/AppConnectionProblemScreen";
import { AppLoadingOverlay } from "../../components/common/AppLoadingOverlay";
import { AppLoadingScreen } from "../../components/common/AppLoadingScreen";
import { LanguageSwitcher } from "../../components/common/LanguageSwitcher";
import { LegalConsentText } from "../../components/legal/LegalConsentText";
import {
  LegalTextSheet,
  type LegalTextKind,
} from "../../components/legal/LegalTextSheet";
import { useCurrentUserBootstrap } from "../../hooks/useCurrentUserBootstrap";
import { useDismissKeyboardOnChange } from "../../hooks/useDismissKeyboardOnChange";
import { LEGAL_VERSION } from "../../legal/legalContent";
import { clearStoredLegalAcceptance } from "../../legal/legalAcceptanceStorage";
import { useExpoPushTokenRegistration } from "../../hooks/usePushNotifications";
import { useI18n } from "../../i18n/I18nProvider";
import type { TranslationKey } from "../../i18n/translations";
import { api } from "../../lib/convexApi";
import { styles } from "../../styles";
import { colors, spacing } from "../../theme/tokens";
import {
  getErrorMessage,
  getMetadataDisplayName,
  getWebAppRedirectUrl,
  keepBrowserOnWebAppPath,
} from "../../utils/auth";
import { formatPersonName } from "../../utils/names";
import { FantasyBottomTabs } from "./FantasyBottomTabs";
import {
  HeaderActionOverlay,
  type HeaderActionOverlayConfig,
} from "./components/HeaderActionOverlay";
import { SeasonScreen } from "./screens/SeasonScreen";
import { LeagueScreen } from "./screens/LeagueScreen";
import { MarketScreen } from "./screens/MarketScreen";
import { MyTeamScreen } from "./screens/MyTeamScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import {
  EXTRA_LIGA_SMALL_ICON_IMAGE,
  FANTASY_CRITICAL_IMAGE_MODULES,
  FANTASY_STATIC_IMAGE_PROPS,
  preloadFantasyStaticAssets,
} from "./assets/fantasyAssets";
import type { FantasyTab, FantasyTabId } from "./types";
import {
  localizeFantasyClubs,
  localizeFantasyFixtures,
  localizeFantasyGameweeks,
  localizeFantasyPlayers,
  localizeFantasyTeam,
} from "./utils/localizedFantasyData";

const FANTASY_TABS: FantasyTab[] = [
  { id: "team" },
  { id: "league" },
  { id: "market" },
  { id: "season" },
  { id: "profile" },
];

const FANTASY_TAB_LABEL_KEYS: Record<FantasyTabId, TranslationKey> = {
  season: "tabs.season",
  league: "tabs.league",
  market: "tabs.market",
  profile: "tabs.profile",
  team: "tabs.team",
};

const FANTASY_TAB_WEB_PATHS: Record<FantasyTabId, string> = {
  team: `${WEB_APP_PATH}/team`,
  league: `${WEB_APP_PATH}/league`,
  market: `${WEB_APP_PATH}/market`,
  season: `${WEB_APP_PATH}/season`,
  profile: `${WEB_APP_PATH}/profile`,
};

const FANTASY_WEB_TAB_IDS = new Set<FantasyTabId>(
  FANTASY_TABS.map((tab) => tab.id),
);

function normalizeFantasyWebPathname(pathname: string) {
  const cleanPathname = pathname.split("?")[0]?.split("#")[0] ?? WEB_APP_PATH;
  if (!cleanPathname || cleanPathname === "/") return "/";

  return cleanPathname.replace(/\/+$/, "") || "/";
}

function getFantasyTabFromWebPathname(pathname: string): FantasyTabId | null {
  const normalizedPathname = normalizeFantasyWebPathname(pathname);
  if (normalizedPathname === WEB_APP_PATH) return "team";

  const appPrefix = `${WEB_APP_PATH}/`;
  if (!normalizedPathname.startsWith(appPrefix)) return null;

  const tabSegment = normalizedPathname.slice(appPrefix.length).split("/")[0];
  return FANTASY_WEB_TAB_IDS.has(tabSegment as FantasyTabId)
    ? (tabSegment as FantasyTabId)
    : null;
}

function isUnknownFantasyWebTabPathname(pathname: string) {
  const normalizedPathname = normalizeFantasyWebPathname(pathname);
  return (
    normalizedPathname.startsWith(`${WEB_APP_PATH}/`) &&
    getFantasyTabFromWebPathname(normalizedPathname) === null
  );
}

function getInitialFantasyTab() {
  if (Platform.OS !== "web" || typeof window === "undefined") return "team";

  return getFantasyTabFromWebPathname(window.location.pathname) ?? "team";
}

type ConvexTokenStatus = "idle" | "loading" | "ready" | "failed";

const CONVEX_AUTH_PROBLEM_GRACE_MS = 30000;
const PRIVATE_LOADING_OVERLAY_TIMEOUT_MS = 15000;
const CONNECTION_TOAST_DURATION_MS = 3500;
const CONNECTION_TOAST_RESUME_GRACE_MS = 8000;
const CONVEX_TOKEN_WARMUP_ATTEMPTS = 24;
const CONVEX_TOKEN_WARMUP_DELAY_MS = 500;
const CONVEX_TOKEN_WARMUP_TOTAL_TIMEOUT_MS = 15000;

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
const wait = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Timed out while warming up Convex token.")),
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

function useLastDefinedValue<T>(
  value: T | undefined,
  cacheKey: string | undefined,
) {
  const cachedRef = useRef<{
    cacheKey: string | undefined;
    value: T | undefined;
  }>({ cacheKey, value: undefined });

  if (cachedRef.current.cacheKey !== cacheKey) {
    cachedRef.current = { cacheKey, value: undefined };
  }

  if (value !== undefined) {
    cachedRef.current.value = value;
  }

  return value === undefined ? cachedRef.current.value : value;
}

function FantasyStaticImagePreloader() {
  return (
    <View pointerEvents="none" style={styles.staticImagePreloadLayer}>
      {FANTASY_CRITICAL_IMAGE_MODULES.map((source, index) => (
        <Image
          {...FANTASY_STATIC_IMAGE_PROPS}
          contentFit="cover"
          key={index}
          recyclingKey={`fantasy-critical-preload-${index}`}
          source={source}
          style={styles.staticImagePreloadImage}
        />
      ))}
    </View>
  );
}

function FantasyShellHeader({
  activeTab,
  onNotificationsPress,
  onTabChange,
  showLanguageSwitcher = false,
  showWebNav = true,
  tabs,
  unreadNotificationsCount = 0,
}: {
  activeTab: FantasyTabId;
  onNotificationsPress: () => void;
  onTabChange: (tab: FantasyTabId) => void;
  showLanguageSwitcher?: boolean;
  showWebNav?: boolean;
  tabs: FantasyTab[];
  unreadNotificationsCount?: number;
}) {
  const { t } = useI18n();
  const shouldShowLanguageSwitcher =
    Platform.OS === "web" && showLanguageSwitcher;
  const shouldShowWebNav = Platform.OS === "web" && showWebNav;
  const notificationBadgeText =
    unreadNotificationsCount > 99 ? "99+" : String(unreadNotificationsCount);

  return (
    <View style={styles.fantasyHeader}>
      <View style={styles.fantasyHeaderTitleGroup}>
        <View style={styles.fantasyHeaderTitleRow}>
          <Image
            {...FANTASY_STATIC_IMAGE_PROPS}
            contentFit="contain"
            source={EXTRA_LIGA_SMALL_ICON_IMAGE}
            style={styles.fantasyHeaderLogo}
          />
          <Text style={styles.fantasyAppTitle}>
            {t("competition.extraLiga.title")}
          </Text>
        </View>
      </View>

      {shouldShowWebNav ? (
        <View style={styles.fantasyHeaderWebNav}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const label = t(FANTASY_TAB_LABEL_KEYS[tab.id]);

            return (
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ selected: isActive }}
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={[
                  styles.fantasyHeaderWebNavButton,
                  isActive ? styles.fantasyHeaderWebNavButtonActive : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={
                    isActive
                      ? styles.fantasyHeaderWebNavTextActive
                      : styles.fantasyHeaderWebNavText
                  }
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {shouldShowLanguageSwitcher ? (
        <View style={styles.fantasyHeaderLanguageSwitcher}>
          <LanguageSwitcher />
        </View>
      ) : (
        <Pressable
          accessibilityLabel={t("notifications.title")}
          accessibilityRole="button"
          onPress={onNotificationsPress}
          style={styles.fantasyHeaderIconButton}
        >
          <Bell color={colors.brand.blue} size={21} strokeWidth={2.4} />
          {unreadNotificationsCount > 0 ? (
            <View style={styles.fantasyHeaderNotificationBadge}>
              <Text style={styles.fantasyHeaderNotificationBadgeText}>
                {notificationBadgeText}
              </Text>
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

export function FantasyHome({
  isOffline = false,
  onTopEdgeToEdgeChange,
}: {
  isOffline?: boolean;
  onTopEdgeToEdgeChange?: (isEnabled: boolean) => void;
} = {}) {
  const { language, t } = useI18n();
  const insets = useSafeAreaInsets();
  const {
    getToken,
    isLoaded: authIsLoaded,
    isSignedIn,
    sessionClaims,
  } = useAuth();
  const getTokenRef = useRef(getToken);
  const appStateRef = useRef(AppState.currentState);
  const lastForegroundResumeAtRef = useRef(0);
  const wasOfflineRef = useRef(isOffline);
  const preferredLanguageSyncKeyRef = useRef<string | null>(null);
  const previousPrivateLoadingOverlayDebugRef = useRef<string | null>(null);
  const [privateLoadingTimedOut, setPrivateLoadingTimedOut] = useState(false);
  const [isConnectionToastVisible, setIsConnectionToastVisible] =
    useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const { width: windowWidth } = useWindowDimensions();
  const shouldUseDesktopWebLayout =
    Platform.OS === "web" && windowWidth >= WEB_DESKTOP_MIN_WIDTH;
  const initialActiveTab = useMemo(() => getInitialFantasyTab(), []);
  const convexAuth = useConvexAuth();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const acceptCurrentUserTerms = useMutation(api.users.acceptCurrentUserTerms);
  const deleteCurrentUserData = useMutation(api.users.deleteCurrentUserData);
  const toggleFavoritePlayer = useMutation(api.fantasy.toggleFavoritePlayer);
  const upsertExpoPushToken = useMutation(
    api.notifications.upsertExpoPushToken,
  );

  const [activeTab, setActiveTab] = useState<FantasyTabId>(initialActiveTab);
  const [hasEnteredPrivateApp, setHasEnteredPrivateApp] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<FantasyTabId>>(
    () => new Set(["team", "market", initialActiveTab]),
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [convexTokenStatus, setConvexTokenStatus] =
    useState<ConvexTokenStatus>("idle");
  const [foregroundRefreshNonce, setForegroundRefreshNonce] = useState(0);
  const [canShowAuthProblem, setCanShowAuthProblem] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminActionsOpen, setIsAdminActionsOpen] = useState(false);
  const [headerActionOverlay, setHeaderActionOverlay] =
    useState<HeaderActionOverlayConfig | null>(null);
  const [isShellHeaderHidden, setIsShellHeaderHidden] = useState(false);
  const [areBottomTabsHidden, setAreBottomTabsHidden] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [shouldLoadPointsBreakdowns, setShouldLoadPointsBreakdowns] =
    useState(false);
  const [hasAcceptedRequiredLegal, setHasAcceptedRequiredLegal] =
    useState(false);
  const [requiredLegalBusy, setRequiredLegalBusy] = useState(false);
  const [requiredLegalErrorText, setRequiredLegalErrorText] = useState<
    string | null
  >(null);
  const [requiredLegalSheetKind, setRequiredLegalSheetKind] =
    useState<LegalTextKind | null>(null);

  const rawProfileName =
    user?.fullName ??
    getMetadataDisplayName(user?.unsafeMetadata) ??
    user?.username ??
    undefined;
  const userIsSignedIn = authIsLoaded
    ? Boolean(isSignedIn)
    : hasEnteredPrivateApp;
  const preferDefaultToken = sessionClaims?.aud === "convex";
  const convexTokenReady = convexTokenStatus === "ready";
  const convexTokenFailed = convexTokenStatus === "failed";
  const hasAuthBootstrapProblem =
    userIsSignedIn &&
    (convexAuth.isLoading || !convexAuth.isAuthenticated || convexTokenFailed);
  const userCanUsePrivateFeatures =
    userIsSignedIn && convexAuth.isAuthenticated && convexTokenReady;
  const canUseNetworkedPrivateFeatures =
    userCanUsePrivateFeatures && !isOffline;
  const privateDataCacheKey = user?.id;
  const shouldQueryPrivateData = canUseNetworkedPrivateFeatures;
  const fantasyOverviewQuery = useQuery(
    api.fantasy.overview,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyTeamQuery = useQuery(
    api.fantasy.myTeam,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyPlayersQuery = useQuery(
    api.fantasy.listPlayers,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyTeamsQuery = useQuery(
    api.fantasy.listFantasyTeams,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyClubsQuery = useQuery(
    api.fantasy.listClubs,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyGameweeksQuery = useQuery(
    api.fantasy.listGameweeks,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyFixturesQuery = useQuery(
    api.fantasy.listFixtures,
    shouldQueryPrivateData ? {} : "skip",
  );
  const seasonPlayerStatisticsQuery = useQuery(
    api.fantasy.seasonPlayerStatistics,
    shouldQueryPrivateData ? {} : "skip",
  );
  const favoritePlayerIdsQuery = useQuery(
    api.fantasy.myFavoritePlayerIds,
    shouldQueryPrivateData ? {} : "skip",
  );
  const gameweekPointsBreakdownQuery = useQuery(
    api.fantasy.myGameweekPointsBreakdown,
    shouldQueryPrivateData && shouldLoadPointsBreakdowns ? {} : "skip",
  );
  const seasonPointsBreakdownQuery = useQuery(
    api.fantasy.mySeasonPointsBreakdown,
    shouldQueryPrivateData && shouldLoadPointsBreakdowns ? {} : "skip",
  );
  const currentUserProfileQuery = useQuery(
    api.users.me,
    shouldQueryPrivateData ? {} : "skip",
  );
  const notificationSummaryQuery = useQuery(
    api.notifications.currentUserNotificationSummary,
    shouldQueryPrivateData ? {} : "skip",
  );
  const fantasyOverview = useLastDefinedValue(
    fantasyOverviewQuery,
    privateDataCacheKey,
  );
  const fantasyTeam = useLastDefinedValue(
    fantasyTeamQuery,
    privateDataCacheKey,
  );
  const fantasyPlayers = useLastDefinedValue(
    fantasyPlayersQuery,
    privateDataCacheKey,
  );
  const fantasyTeams = useLastDefinedValue(
    fantasyTeamsQuery,
    privateDataCacheKey,
  );
  const fantasyClubs = useLastDefinedValue(
    fantasyClubsQuery,
    privateDataCacheKey,
  );
  const fantasyGameweeks = useLastDefinedValue(
    fantasyGameweeksQuery,
    privateDataCacheKey,
  );
  const fantasyFixtures = useLastDefinedValue(
    fantasyFixturesQuery,
    privateDataCacheKey,
  );
  const seasonPlayerStatistics = useLastDefinedValue(
    seasonPlayerStatisticsQuery,
    privateDataCacheKey,
  );
  const favoritePlayerIds = useLastDefinedValue(
    favoritePlayerIdsQuery,
    privateDataCacheKey,
  );
  const gameweekPointsBreakdown = useLastDefinedValue(
    gameweekPointsBreakdownQuery,
    privateDataCacheKey,
  );
  const seasonPointsBreakdown = useLastDefinedValue(
    seasonPointsBreakdownQuery,
    privateDataCacheKey,
  );
  const currentUserProfile = useLastDefinedValue(
    currentUserProfileQuery,
    privateDataCacheKey,
  );
  const notificationSummary = useLastDefinedValue(
    notificationSummaryQuery,
    privateDataCacheKey,
  );
  const currentBackendUser = currentUserProfile?.user ?? null;
  const localizedFantasyClubs = useMemo(
    () => localizeFantasyClubs(fantasyClubs, language),
    [fantasyClubs, language],
  );
  const localizedFantasyPlayers = useMemo(
    () =>
      localizeFantasyPlayers(fantasyPlayers, language, localizedFantasyClubs),
    [fantasyPlayers, language, localizedFantasyClubs],
  );
  const localizedFantasyFixtures = useMemo(
    () =>
      localizeFantasyFixtures(fantasyFixtures, language, localizedFantasyClubs),
    [fantasyFixtures, language, localizedFantasyClubs],
  );
  const localizedFantasyGameweeks = useMemo(
    () => localizeFantasyGameweeks(fantasyGameweeks, language),
    [fantasyGameweeks, language],
  );
  const localizedFantasyTeam = useMemo(
    () => localizeFantasyTeam(fantasyTeam, language, localizedFantasyClubs),
    [fantasyTeam, language, localizedFantasyClubs],
  );

  useEffect(() => {
    void preloadFantasyStaticAssets().catch(() => undefined);
  }, []);

  useEffect(() => {
    const currentGameweekNumber =
      fantasyOverview?.currentGameweek?.number ?? null;
    if (!currentGameweekNumber) {
      previousGameweekNumberRef.current = null;
      setDeadlineNoticeText(null);
      return;
    }

    const previousGameweekNumber = previousGameweekNumberRef.current;
    previousGameweekNumberRef.current = currentGameweekNumber;
    if (
      previousGameweekNumber === null ||
      currentGameweekNumber <= previousGameweekNumber
    ) {
      return;
    }

    setDeadlineNoticeText(
      t("team.deadlineRolloverNotice").replace(
        "{number}",
        String(currentGameweekNumber),
      ),
    );
    const timeoutId = setTimeout(() => setDeadlineNoticeText(null), 8000);
    return () => clearTimeout(timeoutId);
  }, [fantasyOverview?.currentGameweek?.number, t]);

  const profileName = rawProfileName
    ? formatPersonName(rawProfileName)
    : userIsSignedIn
      ? t("user.managerFallback")
      : t("user.guest");
  const profileEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;
  const [deadlineNoticeText, setDeadlineNoticeText] = useState<string | null>(
    null,
  );
  const previousGameweekNumberRef = useRef<number | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (authIsLoaded && !isSignedIn) {
      setHasEnteredPrivateApp(false);
      setIsSigningOut(false);
    }
  }, [authIsLoaded, isSignedIn]);

  useEffect(() => {
    if (wasOfflineRef.current && !isOffline) {
      setCanShowAuthProblem(false);
      setConvexTokenStatus("idle");
      setPrivateLoadingTimedOut(false);
      setForegroundRefreshNonce((current) => current + 1);
    }

    wasOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        nextAppState === "active" &&
        /inactive|background/.test(previousAppState)
      ) {
        lastForegroundResumeAtRef.current = Date.now();
        setIsConnectionToastVisible(false);

        if (userIsSignedIn) {
          setCanShowAuthProblem(false);
          setConvexTokenStatus("idle");
          setForegroundRefreshNonce((current) => current + 1);
        }
      }
    });

    return () => subscription.remove();
  }, [userIsSignedIn]);

  const currentAuthUserId = isSignedIn ? user?.id : undefined;
  const previousAuthUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!authIsLoaded) return;
    if (previousAuthUserIdRef.current === currentAuthUserId) return;

    previousAuthUserIdRef.current = currentAuthUserId;
    const nextActiveTab = getInitialFantasyTab();
    setActiveTab(nextActiveTab);
    setVisitedTabs(new Set(["team", "market", nextActiveTab]));
    setIsNotificationsOpen(false);
    setHeaderActionOverlay(null);
    setIsShellHeaderHidden(false);
    setAreBottomTabsHidden(false);
    setHasAcceptedRequiredLegal(false);
    setRequiredLegalBusy(false);
    setRequiredLegalErrorText(null);
    setRequiredLegalSheetKind(null);
    setCanShowAuthProblem(false);
    setConvexTokenStatus("idle");
    setPrivateLoadingTimedOut(false);
  }, [authIsLoaded, currentAuthUserId]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return undefined;
    }

    const syncActiveTabFromUrl = () => {
      const nextTab = getFantasyTabFromWebPathname(window.location.pathname);
      if (nextTab) {
        setActiveTab(nextTab);
        setVisitedTabs((current) => {
          if (current.has(nextTab)) return current;

          const next = new Set(current);
          next.add(nextTab);
          return next;
        });
        return;
      }

      if (isUnknownFantasyWebTabPathname(window.location.pathname)) {
        window.history.replaceState(null, "", FANTASY_TAB_WEB_PATHS.team);
        setActiveTab("team");
        setVisitedTabs((current) => {
          if (current.has("team")) return current;

          const next = new Set(current);
          next.add("team");
          return next;
        });
      }
    };

    syncActiveTabFromUrl();
    window.addEventListener("popstate", syncActiveTabFromUrl);

    return () => {
      window.removeEventListener("popstate", syncActiveTabFromUrl);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "team") {
      setHeaderActionOverlay(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasAuthBootstrapProblem) {
      setCanShowAuthProblem(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setCanShowAuthProblem(true);
    }, CONVEX_AUTH_PROBLEM_GRACE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasAuthBootstrapProblem]);

  useEffect(() => {
    if (
      !userIsSignedIn ||
      isOffline ||
      convexAuth.isLoading ||
      !convexAuth.isAuthenticated
    ) {
      setConvexTokenStatus((current) => {
        if (isOffline && current === "ready") {
          return current;
        }

        return current === "idle" ? current : "idle";
      });
      return;
    }

    let cancelled = false;
    setConvexTokenStatus((current) =>
      current === "loading" ? current : "loading",
    );

    const warmUpConvexToken = async () => {
      const tokenRequests = preferDefaultToken
        ? [{}, { template: "convex" as const }]
        : [{ template: "convex" as const }, {}];
      const startedAt = Date.now();
      const hasWarmupTimedOut = () =>
        Date.now() - startedAt >= CONVEX_TOKEN_WARMUP_TOTAL_TIMEOUT_MS;

      warmupAttempts: for (
        let attempt = 0;
        attempt < CONVEX_TOKEN_WARMUP_ATTEMPTS;
        attempt += 1
      ) {
        if (hasWarmupTimedOut()) break;

        for (const request of tokenRequests) {
          if (hasWarmupTimedOut()) break warmupAttempts;

          try {
            const token = await withTimeout(
              getTokenRef.current(request),
              TOKEN_FETCH_TIMEOUT_MS,
            );
            if (token) {
              if (!cancelled) {
                setConvexTokenStatus("ready");
              }
              return;
            }
          } catch {
            // Clerk may need a short moment after OAuth before every token variant is available.
          }
        }

        if (cancelled) return;
        if (hasWarmupTimedOut()) break;
        await wait(CONVEX_TOKEN_WARMUP_DELAY_MS);
      }

      if (!cancelled) {
        setConvexTokenStatus("failed");
      }
    };

    void warmUpConvexToken();

    return () => {
      cancelled = true;
    };
  }, [
    convexAuth.isAuthenticated,
    convexAuth.isLoading,
    foregroundRefreshNonce,
    isOffline,
    preferDefaultToken,
    userIsSignedIn,
  ]);

  useDismissKeyboardOnChange([
    activeTab,
    isNotificationsOpen,
    isAdminActionsOpen,
    requiredLegalSheetKind,
    isShellHeaderHidden,
    areBottomTabsHidden,
  ]);

  const clearError = useCallback(() => setErrorText(null), []);
  const setAsyncError = useCallback(
    (message: string) => setErrorText(message),
    [],
  );
  const handleTabChange = useCallback((nextTab: FantasyTabId) => {
    Keyboard.dismiss();
    setIsAdminActionsOpen(false);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const nextPathname = FANTASY_TAB_WEB_PATHS[nextTab];
      if (
        normalizeFantasyWebPathname(window.location.pathname) !== nextPathname
      ) {
        window.history.pushState(null, "", nextPathname);
      }
    }
    setVisitedTabs((current) => {
      if (current.has(nextTab)) return current;

      const next = new Set(current);
      next.add(nextTab);
      return next;
    });
    setActiveTab(nextTab);
  }, []);

  const handleOpenAdminActions = useCallback(() => {
    Keyboard.dismiss();
    setIsAdminActionsOpen(true);
  }, []);

  const handleCloseAdminActions = useCallback(() => {
    Keyboard.dismiss();
    setIsAdminActionsOpen(false);
  }, []);

  const profileReady = useCurrentUserBootstrap({
    onError: setAsyncError,
    onStart: clearError,
    preferredLanguage: language,
    profileEmail,
    profileName,
    upsertCurrentUser,
    userId: canUseNetworkedPrivateFeatures ? user?.id : undefined,
  });

  const currentTermsAreAccepted = Boolean(
    currentBackendUser?.termsAcceptedAt &&
    currentBackendUser.termsVersion === LEGAL_VERSION,
  );
  const shouldWaitForCurrentUserProfile =
    userCanUsePrivateFeatures &&
    profileReady &&
    currentUserProfile === undefined;
  const shouldRequireLegalAcceptance = Boolean(
    userCanUsePrivateFeatures &&
    profileReady &&
    currentBackendUser &&
    !currentTermsAreAccepted,
  );

  useEffect(() => {
    if (userCanUsePrivateFeatures && profileReady) {
      setHasEnteredPrivateApp(true);
    }
  }, [profileReady, userCanUsePrivateFeatures]);

  useEffect(() => {
    if (!userIsSignedIn) {
      preferredLanguageSyncKeyRef.current = null;
    }
  }, [userIsSignedIn]);

  useEffect(() => {
    if (authIsLoaded && isSigningOut && !userIsSignedIn) {
      setIsSigningOut(false);
    }
  }, [authIsLoaded, isSigningOut, userIsSignedIn]);

  useEffect(() => {
    if (!isOffline) {
      setIsConnectionToastVisible(false);
      return undefined;
    }

    const resumedAgoMs = Date.now() - lastForegroundResumeAtRef.current;
    const showDelayMs = Math.max(
      CONNECTION_TOAST_RESUME_GRACE_MS - resumedAgoMs,
      0,
    );
    let hideTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const showTimeoutId = setTimeout(() => {
      setIsConnectionToastVisible(true);
      hideTimeoutId = setTimeout(() => {
        setIsConnectionToastVisible(false);
      }, CONNECTION_TOAST_DURATION_MS);
    }, showDelayMs);

    return () => {
      clearTimeout(showTimeoutId);
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
      }
    };
  }, [isOffline]);

  useEffect(() => {
    if (
      !canUseNetworkedPrivateFeatures ||
      !profileReady ||
      !currentBackendUser
    ) {
      return undefined;
    }

    const syncKey = `${currentBackendUser.clerkId}:${language}`;
    if (currentBackendUser.preferredLanguage === language) {
      preferredLanguageSyncKeyRef.current = syncKey;
      return undefined;
    }

    if (preferredLanguageSyncKeyRef.current === syncKey) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      preferredLanguageSyncKeyRef.current = syncKey;
      void upsertCurrentUser({
        email: profileEmail,
        name: profileName,
        preferredLanguage: language,
      }).catch(() => {
        if (preferredLanguageSyncKeyRef.current === syncKey) {
          preferredLanguageSyncKeyRef.current = null;
        }
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    canUseNetworkedPrivateFeatures,
    currentBackendUser,
    language,
    profileEmail,
    profileName,
    profileReady,
    upsertCurrentUser,
  ]);

  useExpoPushTokenRegistration({
    enabled: canUseNetworkedPrivateFeatures && profileReady,
    upsertExpoPushToken,
  });

  const handleToggleFavoritePlayer = useCallback(
    (playerId: Id<"fantasyPlayers">, isFavorite: boolean) => {
      void toggleFavoritePlayer({ isFavorite, playerId }).catch(
        (error: unknown) => {
          setAsyncError(
            error instanceof Error ? error.message : t("common.loading"),
          );
        },
      );
    },
    [setAsyncError, t, toggleFavoritePlayer],
  );

  const isLeagueTabActive = activeTab === "league";
  const isTeamTabActive = activeTab === "team";
  const isMarketTabActive = activeTab === "market";
  const isSeasonTabActive = activeTab === "season";
  const isProfileTabActive = activeTab === "profile";
  const leagueTabWasVisited = visitedTabs.has("league");
  const marketTabWasVisited = visitedTabs.has("market");
  const seasonTabWasVisited = visitedTabs.has("season");
  const profileTabWasVisited = visitedTabs.has("profile");

  const handleRequiredLegalAccept = useCallback(async () => {
    if (!hasAcceptedRequiredLegal) {
      setRequiredLegalErrorText(t("auth.termsRequired"));
      return;
    }

    try {
      setRequiredLegalBusy(true);
      setRequiredLegalErrorText(null);
      await acceptCurrentUserTerms({
        termsAcceptedAt: Date.now(),
        termsVersion: LEGAL_VERSION,
      });
      await clearStoredLegalAcceptance();
    } catch (error) {
      setRequiredLegalErrorText(getErrorMessage(error, language));
    } finally {
      setRequiredLegalBusy(false);
    }
  }, [acceptCurrentUserTerms, hasAcceptedRequiredLegal, language, t]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;

    try {
      setErrorText(null);
      setIsSigningOut(true);
      await waitForNextPaint();
      await clearStoredLegalAcceptance();
      if (Platform.OS === "web") {
        await (
          signOut as (options?: { redirectUrl?: string }) => Promise<void>
        )({
          redirectUrl: getWebAppRedirectUrl(),
        });
        keepBrowserOnWebAppPath();
      } else {
        await signOut();
      }
    } catch (error) {
      setIsSigningOut(false);
      setAsyncError(getErrorMessage(error, language));
    }
  }, [isSigningOut, language, setAsyncError, signOut]);

  const handleDeleteAccount = useCallback(async () => {
    const clerkUser = user as { delete?: () => Promise<unknown> } & typeof user;
    if (!clerkUser?.delete) {
      throw new Error(t("profile.deleteAccountFailed"));
    }

    await deleteCurrentUserData({});
    await clearStoredLegalAcceptance();
    await clerkUser.delete();
    if (Platform.OS === "web") {
      await (signOut as (options?: { redirectUrl?: string }) => Promise<void>)({
        redirectUrl: getWebAppRedirectUrl(),
      });
      keepBrowserOnWebAppPath();
    } else {
      await signOut();
    }
  }, [deleteCurrentUserData, signOut, t, user]);

  const handlePointsDetailsVisibleChange = useCallback((isVisible: boolean) => {
    if (isVisible) {
      setShouldLoadPointsBreakdowns(true);
    }
  }, []);

  const leagueScreen = useMemo(
    () => <LeagueScreen teams={fantasyTeams} />,
    [fantasyTeams],
  );
  const teamScreen = useMemo(
    () => (
      <MyTeamScreen
        fantasyClubs={localizedFantasyClubs}
        fantasyOverview={fantasyOverview}
        fantasyPlayers={localizedFantasyPlayers}
        fantasyTeam={localizedFantasyTeam}
        fantasyTeams={fantasyTeams}
        fantasyGameweeks={localizedFantasyGameweeks}
        gameweekPointsBreakdown={gameweekPointsBreakdown}
        seasonPointsBreakdown={seasonPointsBreakdown}
        isActive={isTeamTabActive}
        managerName={profileName}
        onBottomTabsHiddenChange={setAreBottomTabsHidden}
        onHeaderActionOverlayChange={setHeaderActionOverlay}
        onPointsDetailsVisibleChange={handlePointsDetailsVisibleChange}
        onShellHeaderHiddenChange={setIsShellHeaderHidden}
        onTopEdgeToEdgeChange={onTopEdgeToEdgeChange}
      />
    ),
    [
      fantasyOverview,
      localizedFantasyClubs,
      localizedFantasyPlayers,
      localizedFantasyTeam,
      fantasyTeams,
      localizedFantasyGameweeks,
      gameweekPointsBreakdown,
      seasonPointsBreakdown,
      isTeamTabActive,
      profileName,
      handlePointsDetailsVisibleChange,
      setAreBottomTabsHidden,
      setIsShellHeaderHidden,
      onTopEdgeToEdgeChange,
    ],
  );
  const marketScreen = useMemo(
    () => (
      <MarketScreen
        clubs={localizedFantasyClubs}
        favoritePlayerIds={favoritePlayerIds}
        onToggleFavorite={handleToggleFavoritePlayer}
        players={localizedFantasyPlayers}
      />
    ),
    [
      localizedFantasyClubs,
      localizedFantasyPlayers,
      favoritePlayerIds,
      handleToggleFavoritePlayer,
    ],
  );
  const seasonScreen = useMemo(
    () => (
      <SeasonScreen
        clubs={localizedFantasyClubs}
        fixtures={localizedFantasyFixtures}
        gameweeks={localizedFantasyGameweeks}
        playerStatistics={seasonPlayerStatistics}
      />
    ),
    [
      localizedFantasyClubs,
      localizedFantasyFixtures,
      localizedFantasyGameweeks,
      seasonPlayerStatistics,
    ],
  );
  const profileScreen = useMemo(
    () => (
      <ProfileScreen
        canQueryPrivateData={shouldQueryPrivateData}
        email={profileEmail}
        fixtures={localizedFantasyFixtures}
        gameweeks={localizedFantasyGameweeks}
        isAdmin={Boolean(currentUserProfile?.isAdmin)}
        name={profileName}
        onDeleteAccount={handleDeleteAccount}
        onOpenAdminActions={handleOpenAdminActions}
        onSignOut={handleSignOut}
        players={localizedFantasyPlayers}
      />
    ),
    [
      currentUserProfile?.isAdmin,
      shouldQueryPrivateData,
      localizedFantasyGameweeks,
      handleDeleteAccount,
      handleOpenAdminActions,
      handleSignOut,
      localizedFantasyFixtures,
      localizedFantasyPlayers,
      profileEmail,
      profileName,
    ],
  );

  const privateLoadingOverlayReason =
    hasEnteredPrivateApp && userIsSignedIn && isSigningOut
      ? "signingOut"
      : hasEnteredPrivateApp &&
          userIsSignedIn &&
          !isOffline &&
          hasAuthBootstrapProblem &&
          !canShowAuthProblem
        ? "authBootstrap"
        : null;
  const privateLoadingOverlayTitle =
    privateLoadingOverlayReason === "signingOut"
      ? t("loading.signingOut")
      : privateLoadingOverlayReason === "authBootstrap"
        ? t("loading.oauthComplete")
        : null;
  const privateLoadingOverlayDebugKey = privateLoadingOverlayReason
    ? JSON.stringify({
        reason: privateLoadingOverlayReason,
        authIsLoaded,
        canShowAuthProblem,
        convexAuthIsAuthenticated: convexAuth.isAuthenticated,
        convexAuthIsLoading: convexAuth.isLoading,
        convexTokenStatus,
        foregroundRefreshNonce,
        hasEnteredPrivateApp,
        isOffline,
        profileReady,
        shouldWaitForCurrentUserProfile,
        userCanUsePrivateFeatures,
        userIsSignedIn,
      })
    : null;

  useEffect(() => {
    if (!privateLoadingOverlayReason) {
      setPrivateLoadingTimedOut(false);
      return undefined;
    }

    setPrivateLoadingTimedOut(false);
    const timeoutId = setTimeout(() => {
      setPrivateLoadingTimedOut(true);
    }, PRIVATE_LOADING_OVERLAY_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [foregroundRefreshNonce, privateLoadingOverlayReason]);

  useEffect(() => {
    if (!__DEV__) return;
    if (
      previousPrivateLoadingOverlayDebugRef.current ===
      privateLoadingOverlayDebugKey
    ) {
      return;
    }

    previousPrivateLoadingOverlayDebugRef.current =
      privateLoadingOverlayDebugKey;

    if (!privateLoadingOverlayDebugKey) return;

    console.log(
      "[FantasyHome] loading overlay",
      JSON.parse(privateLoadingOverlayDebugKey),
    );
  }, [privateLoadingOverlayDebugKey]);

  if (isSigningOut) {
    return (
      <AppLoadingScreen
        title={t("loading.signingOut")}
        description={t("loading.syncingAccount")}
      />
    );
  }

  if (!authIsLoaded && !hasEnteredPrivateApp) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    return (
      <AppLoadingScreen
        title={t("loading.checkingSession")}
        description={t("loading.syncingAccount")}
      />
    );
  }

  if (shouldWaitForCurrentUserProfile && !hasEnteredPrivateApp) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    return (
      <AppLoadingScreen
        title={t("loading.preparingProfile")}
        description={t("loading.syncingAccount")}
      />
    );
  }

  if (shouldRequireLegalAcceptance) {
    return (
      <View style={styles.fantasyShell}>
        <FantasyStaticImagePreloader />
        <FantasyShellHeader
          activeTab={activeTab}
          onNotificationsPress={() => setIsNotificationsOpen(true)}
          onTabChange={handleTabChange}
          showLanguageSwitcher={shouldUseDesktopWebLayout}
          showWebNav={false}
          tabs={FANTASY_TABS}
        />
        <View style={styles.fantasyScreen}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{t("auth.termsGateTitle")}</Text>
            <Text style={styles.mutedText}>
              {t("auth.termsGateDescription")}
            </Text>

            <View style={styles.legalConsentGroup}>
              <View style={styles.legalConsentRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasAcceptedRequiredLegal }}
                  hitSlop={8}
                  onPress={() => {
                    setHasAcceptedRequiredLegal((current) => !current);
                    setRequiredLegalErrorText(null);
                  }}
                >
                  <View
                    style={[
                      styles.legalCheckbox,
                      hasAcceptedRequiredLegal
                        ? styles.legalCheckboxChecked
                        : null,
                    ]}
                  >
                    {hasAcceptedRequiredLegal ? (
                      <Check
                        color={colors.text.inverse}
                        size={15}
                        strokeWidth={3}
                      />
                    ) : null}
                  </View>
                </Pressable>
                <LegalConsentText
                  onPrivacyPress={() => setRequiredLegalSheetKind("privacy")}
                  onTermsPress={() => setRequiredLegalSheetKind("terms")}
                />
              </View>
            </View>

            {requiredLegalErrorText ? (
              <Text style={styles.errorText}>{requiredLegalErrorText}</Text>
            ) : null}

            <Pressable
              disabled={requiredLegalBusy || !hasAcceptedRequiredLegal}
              onPress={() => void handleRequiredLegalAccept()}
              style={[
                styles.authPrimaryButton,
                requiredLegalBusy || !hasAcceptedRequiredLegal
                  ? styles.buttonDisabled
                  : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {requiredLegalBusy
                  ? t("auth.wait")
                  : t("auth.acceptTermsContinue")}
              </Text>
            </Pressable>
          </View>
        </View>
        <LegalTextSheet
          kind={requiredLegalSheetKind ?? "terms"}
          onClose={() => setRequiredLegalSheetKind(null)}
          visible={Boolean(requiredLegalSheetKind)}
        />
      </View>
    );
  }

  if (!userIsSignedIn) {
    return <AuthScreen title={t("auth.welcomeTitle")} />;
  }

  if (isOffline && !hasEnteredPrivateApp && !userCanUsePrivateFeatures) {
    return <AppConnectionProblemScreen />;
  }

  if (
    userIsSignedIn &&
    !hasEnteredPrivateApp &&
    ((convexAuth.isLoading && !canShowAuthProblem) ||
      (!convexAuth.isAuthenticated && !canShowAuthProblem) ||
      (convexAuth.isAuthenticated && !convexTokenReady && !canShowAuthProblem))
  ) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    return (
      <AppLoadingScreen
        title={t("loading.oauthComplete")}
        description={t("loading.syncingAccount")}
      />
    );
  }

  if (userCanUsePrivateFeatures && !profileReady && !hasEnteredPrivateApp) {
    if (isOffline) {
      return <AppConnectionProblemScreen />;
    }

    return (
      <AppLoadingScreen
        title={t("loading.preparingProfile")}
        description={t("loading.syncingAccount")}
      />
    );
  }

  const authProblemText =
    hasAuthBootstrapProblem && canShowAuthProblem
      ? t("session.authProblem")
      : null;
  const sessionRestoreProblemText =
    privateLoadingTimedOut &&
    privateLoadingOverlayReason &&
    privateLoadingOverlayReason !== "signingOut"
      ? t("session.restoreProblem")
      : null;
  const connectionToastText =
    isOffline && isConnectionToastVisible
      ? t("network.offlineDescription")
      : null;
  const inlineMessageText =
    errorText ??
    authProblemText ??
    sessionRestoreProblemText ??
    deadlineNoticeText;
  const inlineMessageStyle =
    deadlineNoticeText && inlineMessageText === deadlineNoticeText
      ? [styles.fantasyInlineMessage, styles.fantasyInlineMessageInfo]
      : styles.fantasyInlineMessage;
  const inlineMessageTextStyle =
    deadlineNoticeText && inlineMessageText === deadlineNoticeText
      ? styles.fantasyInlineMessageInfoText
      : styles.errorText;

  if (authProblemText) {
    return (
      <View style={styles.fantasyShell}>
        <FantasyShellHeader
          activeTab={activeTab}
          onNotificationsPress={() => setIsNotificationsOpen(true)}
          onTabChange={handleTabChange}
          showLanguageSwitcher={shouldUseDesktopWebLayout}
          showWebNav={false}
          tabs={FANTASY_TABS}
        />

        <View style={styles.fantasyInlineMessage}>
          <Text style={styles.errorText}>{authProblemText}</Text>
        </View>

        <View style={styles.fantasyScreen}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{profileName}</Text>
            <Text style={styles.mutedText}>
              {profileEmail ?? t("profile.noEmail")}
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void handleSignOut()}
            >
              <Text style={styles.secondaryButtonText}>
                {t("profile.signOut")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (isNotificationsOpen) {
    return <NotificationsScreen onBack={() => setIsNotificationsOpen(false)} />;
  }

  if (isAdminActionsOpen) {
    return (
      <ProfileScreen
        canQueryPrivateData={shouldQueryPrivateData}
        email={profileEmail}
        fixtures={localizedFantasyFixtures}
        gameweeks={localizedFantasyGameweeks}
        isAdmin={Boolean(currentUserProfile?.isAdmin)}
        mode="adminActions"
        name={profileName}
        onAdminActionsBack={handleCloseAdminActions}
        onDeleteAccount={handleDeleteAccount}
        onOpenAdminActions={handleOpenAdminActions}
        onSignOut={handleSignOut}
        players={localizedFantasyPlayers}
      />
    );
  }

  return (
    <View style={styles.fantasyShell}>
      <FantasyStaticImagePreloader />
      {isShellHeaderHidden ? null : (
        <FantasyShellHeader
          activeTab={activeTab}
          onNotificationsPress={() => setIsNotificationsOpen(true)}
          onTabChange={handleTabChange}
          showLanguageSwitcher={shouldUseDesktopWebLayout}
          showWebNav={shouldUseDesktopWebLayout}
          tabs={FANTASY_TABS}
          unreadNotificationsCount={notificationSummary?.unreadCount ?? 0}
        />
      )}
      <HeaderActionOverlay config={headerActionOverlay} />

      {connectionToastText ? (
        <View
          pointerEvents="none"
          style={[
            styles.fantasyConnectionToast,
            isShellHeaderHidden ? { top: insets.top + spacing.md } : null,
          ]}
        >
          <Text style={styles.fantasyConnectionToastText}>
            {connectionToastText}
          </Text>
        </View>
      ) : null}

      {inlineMessageText ? (
        <View style={inlineMessageStyle}>
          <Text style={inlineMessageTextStyle}>{inlineMessageText}</Text>
        </View>
      ) : null}

      <View style={styles.fantasyContent}>
        <View
          pointerEvents={isLeagueTabActive ? "auto" : "none"}
          style={[
            styles.fantasyCachedTabPanel,
            isLeagueTabActive ? null : styles.fantasyCachedTabPanelHidden,
          ]}
        >
          {leagueTabWasVisited ? leagueScreen : null}
        </View>
        <View
          pointerEvents={isTeamTabActive ? "auto" : "none"}
          style={[
            styles.fantasyCachedTabPanel,
            isTeamTabActive ? null : styles.fantasyCachedTabPanelHidden,
          ]}
        >
          {teamScreen}
        </View>
        <View
          pointerEvents={isMarketTabActive ? "auto" : "none"}
          style={[
            styles.fantasyCachedTabPanel,
            isMarketTabActive ? null : styles.fantasyCachedTabPanelHidden,
          ]}
        >
          {marketTabWasVisited ? marketScreen : null}
        </View>
        <View
          pointerEvents={isSeasonTabActive ? "auto" : "none"}
          style={[
            styles.fantasyCachedTabPanel,
            isSeasonTabActive ? null : styles.fantasyCachedTabPanelHidden,
          ]}
        >
          {seasonTabWasVisited ? seasonScreen : null}
        </View>
        <View
          pointerEvents={isProfileTabActive ? "auto" : "none"}
          style={[
            styles.fantasyCachedTabPanel,
            isProfileTabActive ? null : styles.fantasyCachedTabPanelHidden,
          ]}
        >
          {profileTabWasVisited ? profileScreen : null}
        </View>
      </View>

      {areBottomTabsHidden || shouldUseDesktopWebLayout ? null : (
        <FantasyBottomTabs
          activeTab={activeTab}
          onChange={handleTabChange}
          tabs={FANTASY_TABS}
        />
      )}

      {privateLoadingOverlayTitle && !privateLoadingTimedOut ? (
        <AppLoadingOverlay title={privateLoadingOverlayTitle} />
      ) : null}
    </View>
  );
}
