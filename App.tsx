import "react-native-url-polyfill/auto";

import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
  useClerk,
  useSignIn,
  useSignUp,
  useSSO,
  useUser,
} from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import {
  Authenticated,
  AuthLoading,
  ConvexProviderWithAuth,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "./convex/_generated/api";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const POTS = [1, 2, 3] as const;
const WEB_OAUTH_CALLBACK_PATH = "/sso-callback";
const TOURNAMENT_LAST_MATCH_AT = Date.UTC(2026, 6, 19, 19, 0, 0);
const TOURNAMENT_LAST_DAY = getLocalDayStart(TOURNAMENT_LAST_MATCH_AT);

type AuthMode = "sign_in" | "sign_up";
type DashboardTab = "admin" | "table" | "points" | "schedule";
type Pot = (typeof POTS)[number];
type TeamStage = "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "final" | "champion";
type MatchStage = Exclude<TeamStage, "champion">;
type MatchDecision = "regular" | "extra_time" | "penalties";
type ClerkEmailCodeSecondFactor = {
  strategy?: string;
};
type ClerkSignInAttempt = {
  status?: string | null;
  createdSessionId?: string | null;
  supportedSecondFactors?: ClerkEmailCodeSecondFactor[] | null;
  prepareSecondFactor?: (params: { strategy: "email_code" }) => Promise<unknown>;
  attemptSecondFactor?: (params: { strategy: "email_code"; code: string }) => Promise<ClerkSignInAttempt>;
};
type AssignmentView = {
  id: string;
  pot: Pot;
  teamId: string;
  teamName: string;
  stageReached: TeamStage;
  isEliminated: boolean;
  createdAt: number;
};
type ParticipantView = {
  id: string;
  name: string;
  email: string | null;
  participantNumber: number;
  assignments: AssignmentView[];
  isCurrentUser: boolean;
};
type PotTeamView = {
  id: string;
  name: string;
  pot: Pot;
  stageReached: TeamStage;
  isEliminated: boolean;
  assignedTo: null | {
    id: string;
    name: string;
    participantNumber: number | null;
  };
};
type PotView = {
  pot: Pot;
  label: string;
  total: number;
  assigned: number;
  remaining: number;
  teams: PotTeamView[];
};
type DashboardView = {
  currentUser: null | {
    id: string;
    name: string;
    email: string | null;
    participantNumber: number | null;
    isParticipant: boolean;
    isAdmin: boolean;
    assignments: AssignmentView[];
  };
  participants: ParticipantView[];
  participantCount: number;
  userCount: number;
  spectatorCount: number;
  maxParticipants: number;
  isFull: boolean;
  totalTeams: number;
  teamsReady: boolean;
  drawLocked: boolean;
  drawUnlockAt: number | null;
  teamsByPot: PotView[];
};
type MatchView = {
  id: string;
  externalId: string;
  matchNumber: number;
  stage: MatchStage;
  group: string | null;
  scheduledAt: number;
  sourceKickoff: string;
  homeTeam: {
    id: string;
    name: string;
  };
  awayTeam: {
    id: string;
    name: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  decidedBy: MatchDecision | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status: "scheduled" | "live" | "completed";
  storedStatus?: "scheduled" | "live" | "completed";
  apiFootballFixtureId?: number | null;
  apiFootballStatus?: string | null;
  apiFootballUpdatedAt?: number | null;
  espnEventId?: string | null;
  espnStatus?: string | null;
  espnUpdatedAt?: number | null;
  venue: string | null;
};
type SyncStatusView = {
  latest: null | {
    id: string;
    provider: string;
    ok: boolean;
    dateParam: string | null;
    fetched: number | null;
    normalized: number | null;
    matched: number | null;
    updated: number | null;
    completed: number | null;
    live: number | null;
    scheduled: number | null;
    unmatched: number | null;
    error: string | null;
    createdAt: number;
  };
  matches: {
    total: number;
    scheduled: number;
    live: number;
    completed: number;
  };
};
type TeamPointDetails = {
  matchPoints: number;
  stageBonus: number;
  total: number;
  lines: string[];
};
type AdminWinnerSide = "auto" | "home" | "away" | "none";
type AuthStatusView = {
  authenticated: boolean;
  issuer: string | null;
  subject: string | null;
  tokenIdentifier: string | null;
  email: string | null;
  name: string | null;
};
type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

const TEAM_STAGE_BONUSES: Record<TeamStage, number> = {
  group: 0,
  round_of_32: 3,
  round_of_16: 4,
  quarter_final: 5,
  semi_final: 6,
  final: 8,
  champion: 10,
};
const TEAM_STAGE_ORDER: TeamStage[] = [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "champion",
];
const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  group: "Группа",
  round_of_32: "1/16 финала",
  round_of_16: "1/8 финала",
  quarter_final: "1/4 финала",
  semi_final: "Полуфинал",
  final: "Финал",
};
const TEAM_STAGE_LABELS: Record<TeamStage, string> = {
  group: "Группа",
  round_of_32: "1/16 финала",
  round_of_16: "1/8 финала",
  quarter_final: "1/4 финала",
  semi_final: "Полуфинал",
  final: "Финал",
  champion: "Чемпион",
};
const MATCH_STATUS_LABELS: Record<MatchView["status"], string> = {
  scheduled: "Запланирован",
  live: "LIVE",
  completed: "Завершён",
};
const MATCH_DECISION_LABELS: Record<MatchDecision, string> = {
  regular: "Основное время",
  extra_time: "Доп. время",
  penalties: "Пенальти",
};

function getTeamStageBonus(stageReached: TeamStage) {
  const stageIndex = TEAM_STAGE_ORDER.indexOf(stageReached);
  if (stageIndex <= 0) return 0;

  return TEAM_STAGE_ORDER.slice(1, stageIndex + 1).reduce((total, stage) => total + TEAM_STAGE_BONUSES[stage], 0);
}

function getTeamMatchPoints(teamId: string, match: MatchView) {
  if (match.status !== "completed" || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const isHomeTeam = match.homeTeam.id === teamId;
  const isAwayTeam = match.awayTeam.id === teamId;
  if (!isHomeTeam && !isAwayTeam) return 0;

  if (match.decidedBy === "penalties" && match.homeScore === match.awayScore) {
    return 1;
  }

  if (match.stage !== "group") {
    if (match.winnerTeamId) return match.winnerTeamId === teamId ? 3 : 0;
    if (match.homeScore === match.awayScore) return 0;
  }

  if (match.homeScore === match.awayScore) return 1;

  const teamWon =
    (isHomeTeam && match.homeScore > match.awayScore) ||
    (isAwayTeam && match.awayScore > match.homeScore);

  return teamWon ? 3 : 0;
}

function getTeamPointsById(matches: MatchView[]) {
  const pointsByTeamId = new Map<string, number>();

  for (const match of matches) {
    const homePoints = getTeamMatchPoints(match.homeTeam.id, match);
    const awayPoints = getTeamMatchPoints(match.awayTeam.id, match);

    pointsByTeamId.set(match.homeTeam.id, (pointsByTeamId.get(match.homeTeam.id) ?? 0) + homePoints);
    pointsByTeamId.set(match.awayTeam.id, (pointsByTeamId.get(match.awayTeam.id) ?? 0) + awayPoints);
  }

  return pointsByTeamId;
}

function getAssignmentPoints(assignment: AssignmentView, pointsByTeamId: Map<string, number>) {
  return (pointsByTeamId.get(assignment.teamId) ?? 0) + getTeamStageBonus(assignment.stageReached);
}

function getParticipantTotalPoints(participant: ParticipantView, pointsByTeamId: Map<string, number>) {
  return participant.assignments.reduce((total, assignment) => total + getAssignmentPoints(assignment, pointsByTeamId), 0);
}

function getTeamPointDetailsById(matches: MatchView[], participants: ParticipantView[]) {
  const detailsByTeamId = new Map<string, TeamPointDetails>();

  const ensureDetails = (teamId: string) => {
    const existing = detailsByTeamId.get(teamId);
    if (existing) return existing;

    const details: TeamPointDetails = {
      matchPoints: 0,
      stageBonus: 0,
      total: 0,
      lines: [],
    };
    detailsByTeamId.set(teamId, details);

    return details;
  };

  for (const match of matches) {
    if (match.status !== "completed") continue;

    const homePoints = getTeamMatchPoints(match.homeTeam.id, match);
    const awayPoints = getTeamMatchPoints(match.awayTeam.id, match);
    const scoreText = formatMatchScore(match);

    if (homePoints > 0) {
      const details = ensureDetails(match.homeTeam.id);
      details.matchPoints += homePoints;
      details.total += homePoints;
      details.lines.push(`${match.homeTeam.name} - ${match.awayTeam.name} ${scoreText}: +${homePoints}`);
    }

    if (awayPoints > 0) {
      const details = ensureDetails(match.awayTeam.id);
      details.matchPoints += awayPoints;
      details.total += awayPoints;
      details.lines.push(`${match.homeTeam.name} - ${match.awayTeam.name} ${scoreText}: +${awayPoints}`);
    }
  }

  for (const participant of participants) {
    for (const assignment of participant.assignments) {
      const stageBonus = getTeamStageBonus(assignment.stageReached);
      const details = ensureDetails(assignment.teamId);

      details.stageBonus = stageBonus;
      details.total = details.matchPoints + stageBonus;

      if (stageBonus > 0) {
        details.lines.push(`${TEAM_STAGE_LABELS[assignment.stageReached]}: +${stageBonus}`);
      }
    }
  }

  return detailsByTeamId;
}

function capitalizeNamePart(value: string) {
  if (!value) return value;

  const [firstLetter, ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("ru-RU")}${restLetters.join("").toLocaleLowerCase("ru-RU")}`;
}

function formatPersonName(name: string | null | undefined) {
  return (name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.split(/([-’'])/).map(capitalizeNamePart).join(""))
    .join(" ");
}

function getWebOAuthRedirectUrls() {
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

function isWebOAuthCallbackPath() {
  return Platform.OS === "web" && typeof window !== "undefined" && window.location.pathname === WEB_OAUTH_CALLBACK_PATH;
}
const TOKEN_FETCH_TIMEOUT_MS = 8000;

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
      // Try the other Clerk token mode below. Convex integration uses the
      // default token; JWT templates use the named "convex" token.
    }
  }

  return null;
}

function getErrorMessage(error: unknown): string {
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

function getIncompleteSignInMessage(status: string | null | undefined) {
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

function shouldConfirmSignInWithEmailCode(attempt: ClerkSignInAttempt) {
  const status = String(attempt.status ?? "");
  const needsTrustCheck = status === "needs_second_factor" || status === "needs_client_trust";
  const hasEmailCodeFactor = Boolean(
    attempt.supportedSecondFactors?.some((factor) => factor.strategy === "email_code"),
  );

  return needsTrustCheck && hasEmailCodeFactor && typeof attempt.prepareSecondFactor === "function";
}

function getMetadataDisplayName(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const displayName = (metadata as { displayName?: unknown }).displayName;
  if (typeof displayName !== "string") return undefined;

  const trimmed = displayName.trim();
  return trimmed ? trimmed : undefined;
}

function LoadingBlock({ text = "Загрузка..." }: { text?: string }) {
  return (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="small" />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function formatMatchDate(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatMatchTime(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDrawUnlockTime(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function isSameLocalDay(timestamp: number, referenceTimestamp: number) {
  return getLocalDayStart(timestamp) === getLocalDayStart(referenceTimestamp);
}

function getLocalDayStart(timestamp: number) {
  const date = new Date(timestamp);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addLocalDays(timestamp: number, days: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);

  return getLocalDayStart(date.getTime());
}

function formatDrawCountdown(unlockAt: number, now: number) {
  const totalSeconds = Math.max(0, Math.ceil((unlockAt - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");

  return days > 0 ? `${days}д ${clock}` : clock;
}

function formatMatchScore(match: MatchView) {
  if (match.status === "live" && (match.homeScore === null || match.awayScore === null)) {
    return "LIVE";
  }

  if (match.homeScore === null || match.awayScore === null) {
    return "-";
  }

  const score = `${match.homeScore} - ${match.awayScore}`;

  if (match.decidedBy === "extra_time") {
    return `${score} д.в.`;
  }

  if (match.decidedBy === "penalties") {
    if (match.homePenaltyScore !== null && match.awayPenaltyScore !== null) {
      return `${score} пен. ${match.homePenaltyScore}:${match.awayPenaltyScore}`;
    }

    return `${score} пен.`;
  }

  return score;
}

function getMatchMeta(match: MatchView) {
  const stageLabel = match.stage === "group" && match.group ? `Группа ${match.group}` : MATCH_STAGE_LABELS[match.stage];

  return stageLabel;
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

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  if (!convex) return null;

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useClerkConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

function ConvexAuthProblem() {
  const { signOut } = useClerk();
  const { getToken, sessionClaims } = useAuth();
  const [templateTokenStatus, setTemplateTokenStatus] = useState<"checking" | "ok" | "missing">("checking");
  const [defaultTokenStatus, setDefaultTokenStatus] = useState<"checking" | "ok" | "missing">("checking");
  const convexAuthStatus = useQuery(api.health.authStatus) as AuthStatusView | undefined;

  useEffect(() => {
    let cancelled = false;

    const checkToken = async () => {
      try {
        const templateToken = await getToken({ template: "convex", skipCache: true });

        if (!cancelled) {
          setTemplateTokenStatus(templateToken ? "ok" : "missing");
        }
      } catch {
        if (!cancelled) {
          setTemplateTokenStatus("missing");
        }
      }

      try {
        const defaultToken = await getToken({
          skipCache: true,
        });

        if (!cancelled) {
          setDefaultTokenStatus(defaultToken ? "ok" : "missing");
        }
      } catch {
        if (!cancelled) {
          setDefaultTokenStatus("missing");
        }
      }
    };

    void checkToken();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <View style={styles.authShell}>
      <View style={styles.panel}>
        <Text style={styles.title}>Авторизация Convex не готова</Text>
        <Text style={styles.bodyText}>
          Вход через Clerk прошёл, но Convex пока не получил корректный токен Clerk.
        </Text>
        <Text style={styles.bodyText}>
          JWT-шаблон Convex:{" "}
          {templateTokenStatus === "checking" ? "проверяем..." : templateTokenStatus === "ok" ? "найден" : "не найден"}
        </Text>
        <Text style={styles.bodyText}>
          Стандартный токен Clerk:{" "}
          {defaultTokenStatus === "checking" ? "проверяем..." : defaultTokenStatus === "ok" ? "найден" : "не найден"}
        </Text>
        <Text style={styles.bodyText}>
          Аудитория сессии: {String(sessionClaims?.aud ?? "не найдена")}
        </Text>
        <Text style={styles.bodyText}>
          Пользователь Convex:{" "}
          {convexAuthStatus === undefined
            ? "проверяем..."
            : convexAuthStatus.authenticated
              ? `подключён как ${convexAuthStatus.subject}`
              : "не найден"}
        </Text>
        {convexAuthStatus?.issuer ? (
          <Text style={styles.mutedText}>Источник: {convexAuthStatus.issuer}</Text>
        ) : null}
        <Text style={styles.mutedText}>
          В Clerk включите интеграцию Convex или создайте JWT-шаблон `convex`, затем выйдите и войдите снова.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Выйти</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AuthScreen() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [awaitingSignInVerification, setAwaitingSignInVerification] = useState(false);

  const isReady = signInLoaded && signUpLoaded;
  const isAwaitingCode = awaitingVerification || awaitingSignInVerification;
  const canSubmit = useMemo(() => {
    if (isLoading || !isReady) return false;
    if (mode === "sign_in") {
      if (awaitingSignInVerification) return Boolean(code.trim());
      return Boolean(email.trim() && password.trim());
    }
    if (awaitingVerification) return Boolean(code.trim());
    return Boolean(displayName.trim() && email.trim() && password.trim());
  }, [awaitingSignInVerification, awaitingVerification, code, displayName, email, isLoading, isReady, mode, password]);

  const startSignInEmailCodeVerification = async (attempt: ClerkSignInAttempt) => {
    if (!shouldConfirmSignInWithEmailCode(attempt) || !attempt.prepareSecondFactor) {
      setErrorText(getIncompleteSignInMessage(String(attempt.status ?? "")));
      return;
    }

    await attempt.prepareSecondFactor({ strategy: "email_code" });
    setAwaitingSignInVerification(true);
    setCode("");
    setInfoText("Мы отправили код подтверждения на почту. Введите его ниже.");
  };

  const handleSignIn = async () => {
    if (!signIn || !setActive) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setAwaitingSignInVerification(false);
      setIsLoading(true);
      const attempt = await signIn.create({
        identifier: email.trim(),
        strategy: "password",
        password,
      });
      const signInAttempt = attempt as ClerkSignInAttempt;

      if (signInAttempt.status === "complete" && signInAttempt.createdSessionId) {
        await setActive({ session: signInAttempt.createdSessionId });
      } else if (shouldConfirmSignInWithEmailCode(signInAttempt)) {
        await startSignInEmailCodeVerification(signInAttempt);
      } else {
        setErrorText(getIncompleteSignInMessage(String(signInAttempt.status ?? "")));
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInVerify = async () => {
    if (!signIn || !setActive) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      const attempt = await (signIn as unknown as ClerkSignInAttempt).attemptSecondFactor?.({
        strategy: "email_code",
        code: code.trim(),
      });

      if (!attempt) {
        setErrorText("Не удалось проверить код. Попробуйте войти ещё раз.");
      } else if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setErrorText(getIncompleteSignInMessage(String(attempt.status ?? "")));
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpStart = async () => {
    if (!signUp) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      const normalizedDisplayName = displayName.trim();
      await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: {
          displayName: normalizedDisplayName,
        },
      });
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setAwaitingVerification(true);
      setCode("");
      setInfoText("Мы отправили код подтверждения на почту. Введите его ниже.");
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpVerify = async () => {
    if (!signUp || !setActive) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      const verification = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (verification.status === "complete" && verification.createdSessionId) {
        await setActive({ session: verification.createdSessionId });
      } else {
        setErrorText("Подтверждение ещё не завершено.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);

      if (awaitingSignInVerification) {
        await (signIn as unknown as ClerkSignInAttempt | null)?.prepareSecondFactor?.({
          strategy: "email_code",
        });
      } else if (awaitingVerification) {
        await signUp?.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }

      setInfoText("Новый код отправлен.");
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimaryPress = async () => {
    if (mode === "sign_in") {
      if (awaitingSignInVerification) {
        await handleSignInVerify();
        return;
      }

      await handleSignIn();
      return;
    }

    if (awaitingVerification) {
      await handleSignUpVerify();
      return;
    }

    await handleSignUpStart();
  };

  const handleGoogleAuth = async () => {
    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);

      if (Platform.OS === "web") {
        const { redirectUrl, redirectUrlComplete } = getWebOAuthRedirectUrls();
        const googleAuthParams = {
          strategy: "oauth_google" as const,
          redirectUrl,
          redirectUrlComplete,
        };

        if (mode === "sign_up" && signUp) {
          await signUp.authenticateWithRedirect({
            ...googleAuthParams,
            unsafeMetadata: {
              displayName: displayName.trim(),
            },
          });
          return;
        }

        if (signIn) {
          await signIn.authenticateWithRedirect(googleAuthParams);
          return;
        }

        setErrorText("Вход через Google пока не готов.");
        return;
      }

      const result = await startSSOFlow({
        strategy: "oauth_google",
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      } else {
        setErrorText("Вход через Google был отменён.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.authShell}>
      <View style={styles.panel}>
        <Text style={styles.title}>Чемпионат мира 2026</Text>

        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentButton, mode === "sign_in" ? styles.segmentButtonActive : null]}
            onPress={() => {
              setMode("sign_in");
              setAwaitingVerification(false);
              setAwaitingSignInVerification(false);
              setCode("");
              setErrorText(null);
              setInfoText(null);
            }}
          >
            <Text style={mode === "sign_in" ? styles.segmentTextActive : styles.segmentText}>Вход</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, mode === "sign_up" ? styles.segmentButtonActive : null]}
            onPress={() => {
              setMode("sign_up");
              setAwaitingVerification(false);
              setAwaitingSignInVerification(false);
              setCode("");
              setErrorText(null);
              setInfoText(null);
            }}
          >
            <Text style={mode === "sign_up" ? styles.segmentTextActive : styles.segmentText}>Регистрация</Text>
          </Pressable>
        </View>

        {!isAwaitingCode ? (
          <>
            {mode === "sign_up" ? (
              <TextInput
                style={styles.input}
                placeholder="Имя"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Почта"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={awaitingSignInVerification ? "Код из письма" : "Код подтверждения"}
            autoCapitalize="none"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
        )}

        {infoText ? <Text style={styles.successText}>{infoText}</Text> : null}
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <Pressable
          style={[styles.primaryButton, !canSubmit ? styles.buttonDisabled : null]}
          disabled={!canSubmit}
          onPress={handlePrimaryPress}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading
              ? "Подождите..."
              : mode === "sign_in"
                ? awaitingSignInVerification
                  ? "Подтвердить вход"
                  : "Войти"
                : awaitingVerification
                  ? "Подтвердить почту"
                  : "Создать аккаунт"}
          </Text>
        </Pressable>

        {isAwaitingCode ? (
          <Pressable
            style={[styles.secondaryButton, isLoading || !isReady ? styles.buttonDisabled : null]}
            disabled={isLoading || !isReady}
            onPress={handleResendCode}
          >
            <Text style={styles.secondaryButtonText}>Отправить код ещё раз</Text>
          </Pressable>
        ) : null}

        {!isAwaitingCode ? (
          <Pressable
            style={[styles.secondaryButton, isLoading || !isReady ? styles.buttonDisabled : null]}
            disabled={isLoading || !isReady}
            onPress={handleGoogleAuth}
          >
            <Text style={styles.secondaryButtonText}>Продолжить с Google</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AssignmentCells({
  assignments,
  pointsByTeamId,
}: {
  assignments: AssignmentView[];
  pointsByTeamId: Map<string, number>;
}) {
  return (
    <>
      {POTS.map((pot) => {
        const assignment = assignments.find((item) => item.pot === pot);
        const points = assignment ? getAssignmentPoints(assignment, pointsByTeamId) : 0;

        return (
          <View
            key={pot}
            style={[
              styles.playerTableCell,
              styles.playerTableTeamCell,
              assignment
                ? assignment.isEliminated
                  ? styles.playerTableTeamCellEliminated
                  : styles.playerTableTeamCellActive
                : null,
              !assignment ? styles.playerTableCellEmpty : null,
            ]}
          >
            {assignment ? (
              <View style={styles.assignmentCellContent}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentText} numberOfLines={2}>{assignment.teamName}</Text>
                </View>
                <View style={styles.assignmentPointsBox}>
                  <Text style={styles.assignmentPoints}>{points}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyCellText}>-</Text>
            )}
          </View>
        );
      })}
    </>
  );
}

function MatchRow({
  match,
  teamOwnersById,
  teamStatusById,
}: {
  match: MatchView;
  teamOwnersById: Map<string, string>;
  teamStatusById: Map<string, { isEliminated: boolean }>;
}) {
  const homeOwnerName = teamOwnersById.get(match.homeTeam.id);
  const awayOwnerName = teamOwnersById.get(match.awayTeam.id);
  const homeStatus = teamStatusById.get(match.homeTeam.id);
  const awayStatus = teamStatusById.get(match.awayTeam.id);
  const homeTeamStyle = homeStatus?.isEliminated ? styles.matchTeamEliminated : styles.matchTeamActive;
  const awayTeamStyle = awayStatus?.isEliminated ? styles.matchTeamEliminated : styles.matchTeamActive;

  return (
    <View style={[styles.matchRow, match.status === "live" ? styles.matchRowLive : null]}>
      <View style={styles.matchTimeColumn}>
        <Text style={styles.matchTime}>{formatMatchTime(match.scheduledAt)}</Text>
        <Text style={styles.matchMeta} numberOfLines={1}>{getMatchMeta(match)}</Text>
      </View>

      <View style={styles.matchTeamsColumn}>
        <Text style={styles.matchTeams}>
          <Text style={homeTeamStyle}>{match.homeTeam.name}</Text>
          {homeOwnerName ? <Text style={styles.matchTeamOwner}> ({homeOwnerName})</Text> : null}
          {" - "}
          <Text style={awayTeamStyle}>{match.awayTeam.name}</Text>
          {awayOwnerName ? <Text style={styles.matchTeamOwner}> ({awayOwnerName})</Text> : null}
        </Text>
      </View>

      <View style={styles.matchScoreBox}>
        <Text
          style={[
            styles.matchScore,
            match.status === "live" ? styles.matchScoreLive : null,
            match.status === "completed" ? styles.matchScoreCompleted : null,
          ]}
        >
          {formatMatchScore(match)}
        </Text>
      </View>
    </View>
  );
}

function ScoringDetailsPanel({
  participants,
  detailsByTeamId,
}: {
  participants: ParticipantView[];
  detailsByTeamId: Map<string, TeamPointDetails>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const participantsWithAssignments = useMemo(
    () => participants.filter((participant) => participant.assignments.length > 0),
    [participants],
  );

  useEffect(() => {
    if (activeIndex < participantsWithAssignments.length) return;
    setActiveIndex(Math.max(0, participantsWithAssignments.length - 1));
  }, [activeIndex, participantsWithAssignments.length]);

  if (participantsWithAssignments.length === 0) return null;

  const activeParticipant = participantsWithAssignments[activeIndex] ?? participantsWithAssignments[0];
  const activeParticipantTotal = activeParticipant.assignments.reduce((total, assignment) => {
    const details = detailsByTeamId.get(assignment.teamId);
    return total + (details?.total ?? getTeamStageBonus(assignment.stageReached));
  }, 0);
  const canSwitchPlayers = participantsWithAssignments.length > 1;
  const goToPreviousPlayer = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? participantsWithAssignments.length - 1 : currentIndex - 1,
    );
  };
  const goToNextPlayer = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % participantsWithAssignments.length);
  };

  return (
    <View style={styles.pointsDetails}>
      <Text style={styles.scoringRulesTitle}>Детализация очков</Text>

      <View style={styles.pointsSliderHeader}>
        <Pressable
          style={[styles.pointsSliderButton, !canSwitchPlayers ? styles.pointsSliderButtonDisabled : null]}
          disabled={!canSwitchPlayers}
          onPress={goToPreviousPlayer}
        >
          <Text style={styles.pointsSliderButtonText}>‹</Text>
        </Pressable>

        <View style={styles.pointsSliderPlayerInfo}>
          <Text style={styles.pointsDetailsPlayerName}>
            {formatPersonName(activeParticipant.name)} - {activeParticipantTotal}
          </Text>
        </View>

        <Pressable
          style={[styles.pointsSliderButton, !canSwitchPlayers ? styles.pointsSliderButtonDisabled : null]}
          disabled={!canSwitchPlayers}
          onPress={goToNextPlayer}
        >
          <Text style={styles.pointsSliderButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.pointsDetailsPlayer}>
        <View style={styles.pointsDetailsTeamList}>
          {activeParticipant.assignments.map((assignment) => {
            const details = detailsByTeamId.get(assignment.teamId) ?? {
              matchPoints: 0,
              stageBonus: 0,
              total: getTeamStageBonus(assignment.stageReached),
              lines: [],
            };

            return (
              <View key={assignment.id} style={styles.pointsDetailsTeam}>
                <View style={styles.pointsDetailsInfo}>
                  <Text style={styles.pointsDetailsTeamName}>{assignment.teamName}</Text>
                  <Text style={styles.pointsDetailsText}>
                    {details.lines.length > 0 ? details.lines.join(" · ") : "Пока без очков"}
                  </Text>
                </View>
                <View style={styles.pointsDetailsTotalBox}>
                  <Text style={styles.pointsDetailsTotal}>{details.total}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function AdminPanel({
  dashboard,
  matches,
  syncStatus,
}: {
  dashboard: DashboardView;
  matches: MatchView[];
  syncStatus: SyncStatusView | undefined;
}) {
  const runEspnSync = useAction(api.matches.syncFromEspn);
  const setDrawLock = useMutation(api.draw.setDrawLock);
  const updateMatch = useMutation(api.matches.adminSetMatchState);
  const updateTeamStatus = useMutation(api.teams.updateStatus);

  const [adminBusy, setAdminBusy] = useState(false);
  const [adminStatusText, setAdminStatusText] = useState<string | null>(null);
  const [adminErrorText, setAdminErrorText] = useState<string | null>(null);
  const [matchExternalId, setMatchExternalId] = useState("");
  const [matchHomeScore, setMatchHomeScore] = useState("");
  const [matchAwayScore, setMatchAwayScore] = useState("");
  const [matchHomePenaltyScore, setMatchHomePenaltyScore] = useState("");
  const [matchAwayPenaltyScore, setMatchAwayPenaltyScore] = useState("");
  const [matchStatus, setMatchStatus] = useState<MatchView["status"]>("completed");
  const [matchStage, setMatchStage] = useState<MatchStage>("group");
  const [matchDecision, setMatchDecision] = useState<MatchDecision>("regular");
  const [matchWinnerSide, setMatchWinnerSide] = useState<AdminWinnerSide>("auto");
  const [teamName, setTeamName] = useState("");
  const [teamStage, setTeamStage] = useState<TeamStage>("group");
  const [teamIsEliminated, setTeamIsEliminated] = useState(false);

  const suggestedMatches = useMemo(() => {
    const now = Date.now();
    return [...matches]
      .sort((first, second) => Math.abs(first.scheduledAt - now) - Math.abs(second.scheduledAt - now))
      .slice(0, 8);
  }, [matches]);

  const parseNullableScore = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    const parsedValue = Number(trimmedValue);
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      throw new Error("Счёт должен быть целым числом 0 или больше.");
    }

    return parsedValue;
  };

  const prefillMatch = (match: MatchView) => {
    setMatchExternalId(match.externalId);
    setMatchHomeScore(match.homeScore === null ? "" : String(match.homeScore));
    setMatchAwayScore(match.awayScore === null ? "" : String(match.awayScore));
    setMatchHomePenaltyScore(match.homePenaltyScore === null ? "" : String(match.homePenaltyScore));
    setMatchAwayPenaltyScore(match.awayPenaltyScore === null ? "" : String(match.awayPenaltyScore));
    setMatchStatus(match.status);
    setMatchStage(match.stage);
    setMatchDecision(match.decidedBy ?? "regular");
    setMatchWinnerSide("auto");
  };

  const handleRunSync = async () => {
    try {
      setAdminBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      const result = await runEspnSync({});
      const matched = typeof result.matched === "number" ? result.matched : 0;
      const updated = typeof result.updated === "number" ? result.updated : 0;
      const unmatched = Array.isArray(result.unmatched) ? result.unmatched.length : 0;
      setAdminStatusText(`ESPN sync: найдено ${matched}, обновлено ${updated}, не сопоставлено ${unmatched}.`);
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleSetDrawLock = async (locked: boolean) => {
    try {
      setAdminBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      await setDrawLock({ locked });
      setAdminStatusText(locked ? "Жеребьёвка закрыта." : "Жеребьёвка открыта.");
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUpdateMatch = async () => {
    try {
      setAdminBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      const winnerSide = matchWinnerSide === "auto" ? undefined : matchWinnerSide;
      const result = await updateMatch({
        externalId: matchExternalId.trim(),
        stage: matchStage,
        status: matchStatus,
        homeScore: parseNullableScore(matchHomeScore),
        awayScore: parseNullableScore(matchAwayScore),
        homePenaltyScore: parseNullableScore(matchHomePenaltyScore),
        awayPenaltyScore: parseNullableScore(matchAwayPenaltyScore),
        decidedBy: matchDecision,
        ...(winnerSide ? { winnerSide } : {}),
      });
      setAdminStatusText(`Матч ${result.externalId} обновлён.`);
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUpdateTeam = async () => {
    try {
      setAdminBusy(true);
      setAdminStatusText(null);
      setAdminErrorText(null);
      const result = await updateTeamStatus({
        teamName: teamName.trim(),
        stageReached: teamStage,
        isEliminated: teamIsEliminated,
      });
      setAdminStatusText(`Команда ${result.name} обновлена.`);
    } catch (error) {
      setAdminErrorText(getErrorMessage(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const latestSync = syncStatus?.latest;

  return (
    <View style={[styles.panel, styles.adminPanel]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Админ-панель</Text>
        <Text style={styles.adminBadge}>Игрок №1</Text>
      </View>

      <View style={styles.adminGrid}>
        <View style={[styles.adminBlock, styles.adminGridBlock]}>
          <Text style={styles.adminBlockTitle}>Синхронизация</Text>
          <Text style={styles.mutedText}>
            {latestSync
              ? `${latestSync.ok ? "OK" : "Ошибка"} · ${formatDateTime(latestSync.createdAt)} · найдено ${latestSync.matched ?? 0}/${latestSync.normalized ?? 0}`
              : "Синхронизаций ещё не было."}
          </Text>
          {latestSync?.error ? <Text style={styles.errorText}>{latestSync.error}</Text> : null}
          <Text style={styles.mutedText}>
            Матчи: {syncStatus?.matches.completed ?? 0} завершено, {syncStatus?.matches.live ?? 0} live, {syncStatus?.matches.scheduled ?? 0} ожидают.
          </Text>
          <Pressable
            style={[styles.secondaryButton, adminBusy ? styles.buttonDisabled : null]}
            disabled={adminBusy}
            onPress={handleRunSync}
          >
            <Text style={styles.secondaryButtonText}>Запустить ESPN sync</Text>
          </Pressable>
        </View>

        <View style={[styles.adminBlock, styles.adminGridBlock]}>
          <Text style={styles.adminBlockTitle}>Жеребьёвка</Text>
          <Text style={styles.mutedText}>{dashboard.drawLocked ? "Сейчас закрыта." : "Сейчас открыта."}</Text>
          <View style={styles.adminButtonRow}>
            <Pressable
              style={[styles.secondaryButton, adminBusy || !dashboard.drawLocked ? styles.buttonDisabled : null]}
              disabled={adminBusy || !dashboard.drawLocked}
              onPress={() => void handleSetDrawLock(false)}
            >
              <Text style={styles.secondaryButtonText}>Открыть</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, adminBusy || dashboard.drawLocked ? styles.buttonDisabled : null]}
              disabled={adminBusy || dashboard.drawLocked}
              onPress={() => void handleSetDrawLock(true)}
            >
              <Text style={styles.secondaryButtonText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.adminBlock}>
        <Text style={styles.adminBlockTitle}>Обновить матч</Text>
        <View style={styles.adminChipRow}>
          {suggestedMatches.map((match) => (
            <Pressable key={match.id} style={styles.adminChip} onPress={() => prefillMatch(match)}>
              <Text style={styles.adminChipText}>{match.externalId} · {match.homeTeam.name} - {match.awayTeam.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.adminFormRow}>
          <TextInput style={[styles.input, styles.adminSmallInput]} placeholder="ID матча" value={matchExternalId} onChangeText={setMatchExternalId} />
          <TextInput style={[styles.input, styles.adminScoreInput]} placeholder="1" keyboardType="number-pad" value={matchHomeScore} onChangeText={setMatchHomeScore} />
          <TextInput style={[styles.input, styles.adminScoreInput]} placeholder="0" keyboardType="number-pad" value={matchAwayScore} onChangeText={setMatchAwayScore} />
          <TextInput style={[styles.input, styles.adminScoreInput]} placeholder="пен. 1" keyboardType="number-pad" value={matchHomePenaltyScore} onChangeText={setMatchHomePenaltyScore} />
          <TextInput style={[styles.input, styles.adminScoreInput]} placeholder="пен. 2" keyboardType="number-pad" value={matchAwayPenaltyScore} onChangeText={setMatchAwayPenaltyScore} />
        </View>

        <View style={styles.adminOptionGroup}>
          {(["scheduled", "live", "completed"] as MatchView["status"][]).map((status) => (
            <Pressable
              key={status}
              style={[styles.adminOptionButton, matchStatus === status ? styles.adminOptionButtonActive : null]}
              onPress={() => setMatchStatus(status)}
            >
              <Text style={matchStatus === status ? styles.adminOptionTextActive : styles.adminOptionText}>
                {MATCH_STATUS_LABELS[status]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.adminOptionGroup}>
          {(Object.keys(MATCH_STAGE_LABELS) as MatchStage[]).map((stage) => (
            <Pressable
              key={stage}
              style={[styles.adminOptionButton, matchStage === stage ? styles.adminOptionButtonActive : null]}
              onPress={() => setMatchStage(stage)}
            >
              <Text style={matchStage === stage ? styles.adminOptionTextActive : styles.adminOptionText}>
                {MATCH_STAGE_LABELS[stage]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.adminOptionGroup}>
          {(Object.keys(MATCH_DECISION_LABELS) as MatchDecision[]).map((decision) => (
            <Pressable
              key={decision}
              style={[styles.adminOptionButton, matchDecision === decision ? styles.adminOptionButtonActive : null]}
              onPress={() => setMatchDecision(decision)}
            >
              <Text style={matchDecision === decision ? styles.adminOptionTextActive : styles.adminOptionText}>
                {MATCH_DECISION_LABELS[decision]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.adminOptionGroup}>
          {[
            ["auto", "Победитель по счёту"],
            ["home", "Победила команда 1"],
            ["away", "Победила команда 2"],
            ["none", "Без победителя"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              style={[styles.adminOptionButton, matchWinnerSide === value ? styles.adminOptionButtonActive : null]}
              onPress={() => setMatchWinnerSide(value as AdminWinnerSide)}
            >
              <Text style={matchWinnerSide === value ? styles.adminOptionTextActive : styles.adminOptionText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.primaryButton, adminBusy || !matchExternalId.trim() ? styles.buttonDisabled : null]}
          disabled={adminBusy || !matchExternalId.trim()}
          onPress={handleUpdateMatch}
        >
          <Text style={styles.primaryButtonText}>Сохранить матч</Text>
        </Pressable>
      </View>

      <View style={styles.adminBlock}>
        <Text style={styles.adminBlockTitle}>Статус команды</Text>
        <TextInput style={styles.input} placeholder="Название команды" value={teamName} onChangeText={setTeamName} />
        <View style={styles.adminOptionGroup}>
          {TEAM_STAGE_ORDER.map((stage) => (
            <Pressable
              key={stage}
              style={[styles.adminOptionButton, teamStage === stage ? styles.adminOptionButtonActive : null]}
              onPress={() => setTeamStage(stage)}
            >
              <Text style={teamStage === stage ? styles.adminOptionTextActive : styles.adminOptionText}>
                {TEAM_STAGE_LABELS[stage]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.adminButtonRow}>
          <Pressable
            style={[styles.adminOptionButton, !teamIsEliminated ? styles.teamActiveOption : null]}
            onPress={() => setTeamIsEliminated(false)}
          >
            <Text style={!teamIsEliminated ? styles.adminOptionTextActive : styles.adminOptionText}>Активна</Text>
          </Pressable>
          <Pressable
            style={[styles.adminOptionButton, teamIsEliminated ? styles.teamEliminatedOption : null]}
            onPress={() => setTeamIsEliminated(true)}
          >
            <Text style={teamIsEliminated ? styles.adminOptionTextActive : styles.adminOptionText}>Выбыла</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.primaryButton, adminBusy || !teamName.trim() ? styles.buttonDisabled : null]}
          disabled={adminBusy || !teamName.trim()}
          onPress={handleUpdateTeam}
        >
          <Text style={styles.primaryButtonText}>Сохранить команду</Text>
        </Pressable>
      </View>

      {adminStatusText ? <Text style={styles.successText}>{adminStatusText}</Text> : null}
      {adminErrorText ? <Text style={styles.errorText}>{adminErrorText}</Text> : null}
    </View>
  );
}

function SignedInHome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const drawTeam = useMutation(api.draw.drawTeam);
  const seedTeams = useMutation(api.teams.seedFromCode);
  const syncLiveStatuses = useMutation(api.matches.syncLiveStatuses);
  const dashboard = useQuery(api.draw.getDashboard) as DashboardView | undefined;
  const matches = useQuery(api.matches.list) as MatchView[] | undefined;
  const syncStatus = useQuery(api.matches.syncStatus) as SyncStatusView | undefined;

  const [profileReady, setProfileReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("table");
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(() => getLocalDayStart(Date.now()));

  const rawProfileName =
    user?.fullName ?? getMetadataDisplayName(user?.unsafeMetadata) ?? user?.username ?? undefined;
  const profileName = rawProfileName ? formatPersonName(rawProfileName) : undefined;
  const profileEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        setErrorText(null);
        await upsertCurrentUser({
          email: profileEmail,
          name: profileName,
        });

        if (!cancelled) {
          setProfileReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(getErrorMessage(error));
          setProfileReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [profileEmail, profileName, upsertCurrentUser, user?.id]);

  const currentAssignments = dashboard?.currentUser?.assignments ?? [];
  const currentUserIsAdmin = Boolean(dashboard?.currentUser?.isAdmin);
  const dashboardTabs = useMemo<Array<{ id: DashboardTab; label: string }>>(
    () => [
      ...(currentUserIsAdmin ? [{ id: "admin" as const, label: "Админ" }] : []),
      { id: "table" as const, label: "Таблица" },
      { id: "points" as const, label: "Очки" },
      { id: "schedule" as const, label: "Расписание" },
    ],
    [currentUserIsAdmin],
  );
  const isViewer = Boolean(dashboard?.currentUser && !dashboard.currentUser.isParticipant);
  const hasRemainingTeams = dashboard?.teamsByPot.some((pot) => pot.remaining > 0) ?? false;
  const remainingTeamCount =
    dashboard?.teamsByPot.reduce((total, pot) => total + pot.remaining, 0) ?? 0;
  const maxUserAssignments = dashboard?.teamsByPot.length ?? POTS.length;
  const drawUnlockAt = dashboard?.drawUnlockAt ?? null;
  const drawIsLocked = dashboard?.drawLocked ?? true;
  const drawCountdownText = drawUnlockAt && drawIsLocked ? formatDrawCountdown(drawUnlockAt, nowMs) : "Пауза";
  const drawLockText = drawUnlockAt
    ? `Жеребьёвка откроется ${formatDrawUnlockTime(drawUnlockAt)}. Ждём регистрацию новых игроков.`
    : "Выбор команд временно закрыт. Ждём регистрацию новых игроков.";
  const showDrawSetupPanel = dashboard ? !dashboard.teamsReady || hasRemainingTeams : false;
  const firstScheduleDay = useMemo(() => {
    if (!matches?.length) return null;

    return getLocalDayStart(Math.min(...matches.map((match) => match.scheduledAt)));
  }, [matches]);
  const selectedScheduleMatches = useMemo(
    () =>
      (matches ?? [])
        .filter((match) => isSameLocalDay(match.scheduledAt, selectedScheduleDay))
        .sort((first, second) => first.scheduledAt - second.scheduledAt),
    [matches, selectedScheduleDay],
  );
  const selectedScheduleIsToday = isSameLocalDay(selectedScheduleDay, nowMs);
  const canGoToPreviousScheduleDay = firstScheduleDay === null || selectedScheduleDay > firstScheduleDay;
  const canGoToNextScheduleDay = selectedScheduleDay < TOURNAMENT_LAST_DAY;
  const pointsByTeamId = useMemo(() => getTeamPointsById(matches ?? []), [matches]);
  const detailsByTeamId = useMemo(
    () => getTeamPointDetailsById(matches ?? [], dashboard?.participants ?? []),
    [dashboard?.participants, matches],
  );
  const teamOwnersById = useMemo(() => {
    const owners = new Map<string, string>();

    for (const participant of dashboard?.participants ?? []) {
      for (const assignment of participant.assignments) {
        owners.set(assignment.teamId, formatPersonName(participant.name));
      }
    }

    return owners;
  }, [dashboard?.participants]);
  const teamStatusById = useMemo(() => {
    const statuses = new Map<string, { isEliminated: boolean }>();

    for (const pot of dashboard?.teamsByPot ?? []) {
      for (const team of pot.teams) {
        statuses.set(team.id, { isEliminated: team.isEliminated });
      }
    }

    return statuses;
  }, [dashboard?.teamsByPot]);
  const sortedParticipants = useMemo(() => {
    return [...(dashboard?.participants ?? [])].sort((first, second) => {
      const pointsDiff =
        getParticipantTotalPoints(second, pointsByTeamId) - getParticipantTotalPoints(first, pointsByTeamId);
      if (pointsDiff !== 0) return pointsDiff;
      return first.participantNumber - second.participantNumber;
    });
  }, [dashboard?.participants, pointsByTeamId]);

  useEffect(() => {
    if (activeDashboardTab === "admin" && !currentUserIsAdmin) {
      setActiveDashboardTab("table");
    }
  }, [activeDashboardTab, currentUserIsAdmin]);

  useEffect(() => {
    let boundedScheduleDay = selectedScheduleDay;

    if (firstScheduleDay !== null && boundedScheduleDay < firstScheduleDay) {
      boundedScheduleDay = firstScheduleDay;
    }

    if (boundedScheduleDay > TOURNAMENT_LAST_DAY) {
      boundedScheduleDay = TOURNAMENT_LAST_DAY;
    }

    if (boundedScheduleDay !== selectedScheduleDay) {
      setSelectedScheduleDay(boundedScheduleDay);
    }
  }, [firstScheduleDay, selectedScheduleDay]);

  useEffect(() => {
    if (!drawUnlockAt || nowMs >= drawUnlockAt) return;

    const delayMs = Math.min(Math.max(drawUnlockAt - Date.now(), 250), 1000);
    const timeoutId = setTimeout(() => setNowMs(Date.now()), delayMs);

    return () => clearTimeout(timeoutId);
  }, [drawUnlockAt, nowMs]);

  useEffect(() => {
    if (!matches) return;

    const syncStartedMatches = () => {
      const hasStartedScheduledMatch = matches.some(
        (match) => (match.storedStatus ?? match.status) === "scheduled" && match.scheduledAt <= Date.now(),
      );

      if (hasStartedScheduledMatch) {
        void syncLiveStatuses({}).catch((error) => {
          setErrorText(getErrorMessage(error));
        });
      }
    };

    syncStartedMatches();

    const now = Date.now();
    const nextScheduledMatch = matches
      .filter((match) => match.status === "scheduled" && match.scheduledAt > now)
      .sort((first, second) => first.scheduledAt - second.scheduledAt)[0];

    if (!nextScheduledMatch) return;

    const delayMs = Math.min(Math.max(nextScheduledMatch.scheduledAt - now + 1000, 1000), 2147483647);
    const timeoutId = setTimeout(syncStartedMatches, delayMs);

    return () => clearTimeout(timeoutId);
  }, [matches, syncLiveStatuses]);

  const handleDraw = async (pot: Pot) => {
    if (drawIsLocked) {
      setErrorText(drawUnlockAt ? `Жеребьёвка откроется ${formatDrawUnlockTime(drawUnlockAt)}.` : "Выбор команд временно закрыт.");
      return;
    }

    const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot);
    if (
      alreadyDrawn ||
      !dashboard?.currentUser?.isParticipant ||
      !dashboard.teamsReady ||
      isBusy
    ) {
      return;
    }

    try {
      setIsBusy(true);
      setErrorText(null);
      setStatusText(null);
      const result = await drawTeam({ pot });

      if (result.team) {
        setStatusText(`Выпала команда: ${result.team.name}`);
      } else if (result.complete) {
        setStatusText("Все команды уже разобраны.");
      }
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSeedTeams = async () => {
    try {
      setIsBusy(true);
      setErrorText(null);
      setStatusText(null);
      const result = await seedTeams({});
      setStatusText(result.alreadySeeded ? "Команды уже загружены." : `Загружено команд: ${result.inserted}.`);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Чемпионат мира 2026</Text>
          <Text style={styles.mutedText}>{profileEmail ?? "Вы вошли"}</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Выйти</Text>
        </Pressable>
      </View>

      {!profileReady || dashboard === undefined ? (
        <LoadingBlock text="Готовим данные..." />
      ) : (
        <>
          <View style={styles.tabBar}>
            {dashboardTabs.map((tab) => {
              const isActive = activeDashboardTab === tab.id;

              return (
                <Pressable
                  key={tab.id}
                  style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
                  onPress={() => setActiveDashboardTab(tab.id)}
                >
                  <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeDashboardTab === "admin" && currentUserIsAdmin ? (
            <AdminPanel dashboard={dashboard} matches={matches ?? []} syncStatus={syncStatus} />
          ) : null}

          {activeDashboardTab === "table" && showDrawSetupPanel ? (
            <View style={styles.panel}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>Игроки</Text>
                  <Text style={styles.metric}>
                    {dashboard.participantCount}/{dashboard.maxParticipants}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>Зрители</Text>
                  <Text style={styles.metric}>{dashboard.spectatorCount}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>Свободные команды</Text>
                  <Text style={styles.metric}>{remainingTeamCount}/{dashboard.totalTeams}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>{isViewer ? "Моя роль" : "Мой выбор"}</Text>
                  <Text style={styles.metric}>{isViewer ? "Зритель" : `${currentAssignments.length}/${maxUserAssignments}`}</Text>
                </View>
              </View>

              {!dashboard.currentUser ? (
                <Text style={styles.errorText}>Ваш профиль ещё создаётся.</Text>
              ) : isViewer ? (
                <Text style={styles.mutedText}>
                  Все {dashboard.maxParticipants} мест игроков уже заняты. Вы можете смотреть таблицу, но выбор команд для этого аккаунта закрыт.
                </Text>
              ) : drawIsLocked ? (
                <Text style={styles.mutedText}>{drawLockText}</Text>
              ) : null}

              {!dashboard.teamsReady ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>Команды ещё не загружены.</Text>
                  {dashboard.currentUser?.isAdmin ? (
                    <Pressable
                      style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
                      disabled={isBusy}
                      onPress={handleSeedTeams}
                    >
                      <Text style={styles.secondaryButtonText}>Загрузить команды</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {statusText ? <Text style={styles.successText}>{statusText}</Text> : null}
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </View>
          ) : null}

          {activeDashboardTab === "table" ? (
          <View style={styles.panel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playerTableScrollContent}
            >
              <View style={styles.playerTable}>
                <View style={[styles.playerTableRow, styles.playerTableHeaderRow]}>
                  <View style={[styles.playerTableCell, styles.playerTableNameCell]}>
                    <Text style={styles.playerTableHeaderText}>Игрок</Text>
                  </View>
                  {POTS.map((pot) => (
                    <View key={pot} style={[styles.playerTableCell, styles.playerTableTeamCell]}>
                      <Text style={styles.playerTableHeaderText}>Команда</Text>
                    </View>
                  ))}
                  <View style={[styles.playerTableCell, styles.playerTableTotalCell]}>
                    <Text style={styles.playerTableHeaderText}>Всего</Text>
                  </View>
                </View>

                {sortedParticipants.map((participant) => {
                  const totalPoints = getParticipantTotalPoints(participant, pointsByTeamId);
                  const hasAssignments = participant.assignments.length > 0;
                  const hasActiveTeam = participant.assignments.some((assignment) => !assignment.isEliminated);
                  const playerStatusCellStyle = hasAssignments
                    ? hasActiveTeam
                      ? styles.playerTableStatusCellActive
                      : styles.playerTableStatusCellEliminated
                    : null;

                  return (
                    <View key={participant.id} style={styles.playerTableRow}>
                      <View style={[styles.playerTableCell, styles.playerTableNameCell, playerStatusCellStyle]}>
                        <Text style={styles.playerName} numberOfLines={2}>{formatPersonName(participant.name)}</Text>
                      </View>
                      <AssignmentCells
                        assignments={participant.assignments}
                        pointsByTeamId={pointsByTeamId}
                      />
                      <View style={[styles.playerTableCell, styles.playerTableTotalCell, playerStatusCellStyle]}>
                        <Text style={styles.playerTotalPoints}>{totalPoints}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
          ) : null}

          {activeDashboardTab === "points" ? (
          <View style={styles.panel}>
            <View style={styles.scoringRules}>
              <Text style={styles.scoringRulesTitle}>Система начисления очков</Text>
              <Text style={styles.scoringRulesText}>
                Матчи: победа +3, ничья +1, поражение 0. Победа после дополнительного времени считается победой.
              </Text>
              <Text style={styles.scoringRulesText}>
                Если матч решился по пенальти после ничьей, за сам матч обе команды получают по 1 очку. Победитель серии получает только бонус за проход дальше.
              </Text>
              <Text style={styles.scoringRulesText}>
                Бонусы за проход стадий: 1/16 финала +3, 1/8 финала +4, 1/4 финала +5, полуфинал +6, финал +8, победа в турнире +10.
              </Text>
              <Text style={styles.scoringRulesText}>
                Бонусы суммируются с очками за матчи и добавляются к команде, которая дошла до соответствующей стадии.
              </Text>
            </View>
            <ScoringDetailsPanel participants={sortedParticipants} detailsByTeamId={detailsByTeamId} />
          </View>
          ) : null}

          {activeDashboardTab === "table" && dashboard.totalTeams > 0 && hasRemainingTeams ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Команды</Text>
              <View style={styles.teamColumns}>
                {dashboard.teamsByPot.map((pot) => {
                  const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot.pot);
                  const canDrawPot = Boolean(
                    !drawIsLocked &&
                    dashboard.currentUser?.isParticipant &&
                      dashboard.teamsReady &&
                      !alreadyDrawn &&
                      pot.remaining > 0 &&
                      !isBusy,
                  );

                  return (
                    <View key={pot.pot} style={styles.teamColumn}>
                      <View style={styles.teamColumnHeader}>
                        <Text style={styles.label}>Корзина {pot.pot}</Text>
                        <Text style={styles.potCount}>{pot.remaining}/{pot.total}</Text>
                      </View>

                      <View style={styles.teamList}>
                        {pot.teams.map((team) => (
                          <View
                            key={team.id}
                            style={[
                              styles.teamRow,
                              team.isEliminated ? styles.teamRowEliminated : styles.teamRowActive,
                              team.assignedTo ? styles.teamRowAssigned : null,
                            ]}
                          >
                            <Text
                              style={[
                                team.assignedTo ? styles.teamNameAssigned : styles.teamName,
                                team.isEliminated ? styles.teamNameEliminated : styles.teamNameActive,
                              ]}
                            >
                              {team.name}
                            </Text>
                            {team.assignedTo ? (
                              <Text style={styles.teamOwner}>
                                {team.assignedTo.participantNumber
                                  ? `#${team.assignedTo.participantNumber} `
                                  : ""}
                                {formatPersonName(team.assignedTo.name)}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>

                      <Pressable
                        style={[styles.primaryButton, !canDrawPot ? styles.buttonDisabled : null]}
                        disabled={!canDrawPot}
                        onPress={() => void handleDraw(pot.pot)}
                      >
                        <Text style={styles.primaryButtonText}>
                          {alreadyDrawn ? "Выбрано" : drawIsLocked ? drawCountdownText : isBusy ? "Выбираем..." : "Вытащить"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {activeDashboardTab === "schedule" ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Все матчи</Text>

              <View style={styles.scheduleSliderHeader}>
                <Pressable
                  style={[
                    styles.pointsSliderButton,
                    !canGoToPreviousScheduleDay ? styles.pointsSliderButtonDisabled : null,
                  ]}
                  disabled={!canGoToPreviousScheduleDay}
                  onPress={() =>
                    setSelectedScheduleDay((day) => {
                      const previousDay = addLocalDays(day, -1);
                      return firstScheduleDay === null ? previousDay : Math.max(previousDay, firstScheduleDay);
                    })
                  }
                >
                  <Text style={styles.pointsSliderButtonText}>‹</Text>
                </Pressable>

                <View style={styles.scheduleSliderDate}>
                  <Text style={styles.scheduleSliderTitle}>
                    {selectedScheduleIsToday ? "Сегодня" : formatMatchDate(selectedScheduleDay)}
                  </Text>
                  {selectedScheduleIsToday ? (
                    <Text style={styles.scheduleSliderMeta}>{formatMatchDate(selectedScheduleDay)}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={[
                    styles.pointsSliderButton,
                    !canGoToNextScheduleDay ? styles.pointsSliderButtonDisabled : null,
                  ]}
                  disabled={!canGoToNextScheduleDay}
                  onPress={() =>
                    setSelectedScheduleDay((day) => Math.min(addLocalDays(day, 1), TOURNAMENT_LAST_DAY))
                  }
                >
                  <Text style={styles.pointsSliderButtonText}>›</Text>
                </Pressable>
              </View>

              {matches === undefined ? (
                <LoadingBlock text="Загружаем матчи..." />
              ) : matches.length === 0 ? (
                <Text style={styles.mutedText}>Расписание матчей ещё не загружено.</Text>
              ) : selectedScheduleMatches.length === 0 ? (
                <Text style={styles.mutedText}>На этот день матчей нет.</Text>
              ) : (
                <View style={styles.matchList}>
                  {selectedScheduleMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      teamOwnersById={teamOwnersById}
                      teamStatusById={teamStatusById}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function MissingEnv() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Нужно настроить окружение</Text>
        <Text style={styles.bodyText}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text>
        <Text style={styles.bodyText}>EXPO_PUBLIC_CONVEX_URL</Text>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  if (!publishableKey || !convex) {
    return <MissingEnv />;
  }

  const isCompletingOAuthRedirect = isWebOAuthCallbackPath();
  const { redirectUrlComplete } = getWebOAuthRedirectUrls();

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexClerkProvider>
        <SafeAreaView style={styles.container}>
          <ClerkLoading>
            <LoadingBlock />
          </ClerkLoading>

          <ClerkLoaded>
            {isCompletingOAuthRedirect ? (
              <>
                <AuthenticateWithRedirectCallback
                  signInForceRedirectUrl={redirectUrlComplete}
                  signUpForceRedirectUrl={redirectUrlComplete}
                  transferable
                />
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
      </ConvexClerkProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  authShell: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  page: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  panel: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderColor: "#d8dee9",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bodyText: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 22,
  },
  mutedText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: "#067647",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cfd6e4",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#111827",
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#174ea6",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#b9c7dc",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#174ea6",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tabBar: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 6,
  },
  tabButton: {
    minHeight: 38,
    minWidth: 110,
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    backgroundColor: "#174ea6",
  },
  tabText: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cfd6e4",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  segmentButtonActive: {
    borderColor: "#174ea6",
    backgroundColor: "#edf4ff",
  },
  segmentText: {
    color: "#4b5563",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#174ea6",
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  summaryItem: {
    minWidth: 120,
    flex: 1,
  },
  label: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metric: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  notice: {
    borderWidth: 1,
    borderColor: "#f3c677",
    borderRadius: 8,
    backgroundColor: "#fff8eb",
    padding: 12,
    gap: 10,
  },
  noticeText: {
    color: "#8a4b0f",
    fontSize: 14,
    fontWeight: "600",
  },
  adminPanel: {
    borderColor: "#b9c7dc",
    backgroundColor: "#f8fbff",
  },
  adminBadge: {
    borderRadius: 999,
    backgroundColor: "#edf4ff",
    color: "#174ea6",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  adminBlock: {
    minWidth: 240,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10,
  },
  adminGridBlock: {
    flex: 1,
  },
  adminBlockTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  adminButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  adminChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  adminChip: {
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 999,
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  adminChipText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  adminFormRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  adminSmallInput: {
    minWidth: 90,
    flex: 1,
  },
  adminScoreInput: {
    minWidth: 72,
    flex: 0.7,
  },
  adminOptionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  adminOptionButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  adminOptionButtonActive: {
    borderColor: "#174ea6",
    backgroundColor: "#edf4ff",
  },
  adminOptionText: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "700",
  },
  adminOptionTextActive: {
    color: "#174ea6",
    fontSize: 12,
    fontWeight: "800",
  },
  teamActiveOption: {
    borderColor: "#9ed9b1",
    backgroundColor: "#eef8f1",
  },
  teamEliminatedOption: {
    borderColor: "#f2b8b8",
    backgroundColor: "#fff1f1",
  },
  potGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  potCell: {
    minWidth: 120,
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    padding: 12,
  },
  potCount: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  playerTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  playerTableScrollContent: {
    minWidth: "100%",
  },
  playerTableRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  playerTableHeaderRow: {
    backgroundColor: "#f9fafb",
  },
  playerTableCell: {
    minHeight: 58,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  playerTableCellEmpty: {
    backgroundColor: "#ffffff",
  },
  playerTableStatusCellActive: {
    backgroundColor: "#eef8f1",
  },
  playerTableStatusCellEliminated: {
    backgroundColor: "#fff1f1",
  },
  playerTableNameCell: {
    minWidth: 150,
    flex: 1.15,
  },
  playerTableTeamCell: {
    minWidth: 120,
    flex: 1,
  },
  playerTableTeamCellActive: {
    backgroundColor: "#eef8f1",
  },
  playerTableTeamCellEliminated: {
    backgroundColor: "#fff1f1",
  },
  playerTableTotalCell: {
    minWidth: 64,
    flex: 0.45,
    alignItems: "center",
  },
  playerTableHeaderText: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textTransform: "uppercase",
  },
  playerName: {
    flexShrink: 1,
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  assignmentCellContent: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  assignmentInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  assignmentText: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  assignmentPointsBox: {
    alignSelf: "stretch",
    minWidth: 28,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  assignmentPoints: {
    color: "#174ea6",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    minWidth: 16,
    textAlign: "right",
  },
  emptyCellText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  playerTotalPoints: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },
  scoringRules: {
    marginTop: 12,
    gap: 4,
  },
  scoringRulesTitle: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  scoringRulesText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  pointsDetails: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    paddingTop: 12,
    gap: 10,
  },
  pointsSliderHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pointsSliderButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  pointsSliderButtonDisabled: {
    opacity: 0.45,
  },
  pointsSliderButtonText: {
    color: "#174ea6",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
  pointsSliderPlayerInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsDetailsPlayer: {
    gap: 6,
  },
  pointsDetailsPlayerName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  pointsDetailsTeamList: {
    gap: 6,
  },
  pointsDetailsTeam: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pointsDetailsInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
  },
  pointsDetailsTeamName: {
    color: "#1f2937",
    fontSize: 12,
    fontWeight: "800",
  },
  pointsDetailsTotal: {
    color: "#174ea6",
    fontSize: 14,
    fontWeight: "900",
  },
  pointsDetailsTotalBox: {
    minWidth: 32,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  pointsDetailsText: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  teamColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  teamColumn: {
    minWidth: 190,
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  teamColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  teamList: {
    gap: 6,
  },
  teamRow: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#dbe5f3",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  teamRowActive: {
    borderColor: "#d7ecd8",
    backgroundColor: "#f4fbf5",
  },
  teamRowEliminated: {
    borderColor: "#f4d4d4",
    backgroundColor: "#fff7f7",
  },
  teamRowAssigned: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f3f4f6",
    opacity: 0.62,
  },
  teamName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  teamNameActive: {
    color: "#17683a",
  },
  teamNameEliminated: {
    color: "#a52a2a",
  },
  teamNameAssigned: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  teamOwner: {
    color: "#6b7280",
    fontSize: 11,
    lineHeight: 15,
  },
  scheduleSliderHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scheduleSliderDate: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  scheduleSliderTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  scheduleSliderMeta: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
  matchList: {
    gap: 6,
  },
  matchRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  matchRowLive: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },
  matchTimeColumn: {
    minWidth: 88,
    flexShrink: 0,
    gap: 2,
  },
  matchTime: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  matchMeta: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textTransform: "uppercase",
  },
  matchTeamsColumn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    gap: 2,
  },
  matchTeams: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  matchTeamOwner: {
    color: "#6b7280",
    fontWeight: "700",
  },
  matchTeamActive: {
    color: "#17683a",
  },
  matchTeamEliminated: {
    color: "#a52a2a",
  },
  matchScoreBox: {
    minWidth: 68,
    minHeight: 36,
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  matchScore: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "800",
  },
  matchScoreLive: {
    color: "#dc2626",
  },
  matchScoreCompleted: {
    color: "#067647",
  },
});
