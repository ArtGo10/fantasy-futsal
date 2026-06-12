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
const POTS = [1, 2, 3, 4] as const;
const WEB_OAUTH_CALLBACK_PATH = "/sso-callback";

type AuthMode = "sign_in" | "sign_up";
type Pot = (typeof POTS)[number];
type TeamStage = "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "final" | "champion";
type MatchStage = Exclude<TeamStage, "champion">;
type MatchDecision = "regular" | "extra_time" | "penalties";
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
  status: "scheduled" | "completed";
  venue: string | null;
};
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

function formatMatchScore(match: MatchView) {
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
  if (match.stage === "group" && match.group) return `Группа ${match.group}`;

  return MATCH_STAGE_LABELS[match.stage];
}

function groupMatchesByLocalDate(matches: MatchView[]) {
  const grouped: Array<{ dateLabel: string; matches: MatchView[] }> = [];
  const groupByDate = new Map<string, { dateLabel: string; matches: MatchView[] }>();

  for (const match of matches) {
    const dateLabel = formatMatchDate(match.scheduledAt);
    let group = groupByDate.get(dateLabel);

    if (!group) {
      group = { dateLabel, matches: [] };
      groupByDate.set(dateLabel, group);
      grouped.push(group);
    }

    group.matches.push(match);
  }

  return grouped;
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
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  const isReady = signInLoaded && signUpLoaded;
  const canSubmit = useMemo(() => {
    if (isLoading || !isReady) return false;
    if (mode === "sign_in") return Boolean(email.trim() && password.trim());
    if (awaitingVerification) return Boolean(code.trim());
    return Boolean(displayName.trim() && email.trim() && password.trim());
  }, [awaitingVerification, code, displayName, email, isLoading, isReady, mode, password]);

  const handleSignIn = async () => {
    if (!signIn || !setActive) return;

    try {
      setErrorText(null);
      setIsLoading(true);
      const attempt = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setErrorText("Вход не был завершён.");
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

  const handlePrimaryPress = async () => {
    if (mode === "sign_in") {
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
              setErrorText(null);
            }}
          >
            <Text style={mode === "sign_in" ? styles.segmentTextActive : styles.segmentText}>Вход</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, mode === "sign_up" ? styles.segmentButtonActive : null]}
            onPress={() => {
              setMode("sign_up");
              setAwaitingVerification(false);
              setCode("");
              setErrorText(null);
            }}
          >
            <Text style={mode === "sign_up" ? styles.segmentTextActive : styles.segmentText}>Регистрация</Text>
          </Pressable>
        </View>

        {!awaitingVerification ? (
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
            placeholder="Код подтверждения"
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
          />
        )}

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
                ? "Войти"
                : awaitingVerification
                  ? "Подтвердить почту"
                  : "Создать аккаунт"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, isLoading || !isReady ? styles.buttonDisabled : null]}
          disabled={isLoading || !isReady}
          onPress={handleGoogleAuth}
        >
          <Text style={styles.secondaryButtonText}>Продолжить с Google</Text>
        </Pressable>
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
                <Text style={styles.assignmentText} numberOfLines={2}>{assignment.teamName}</Text>
                <Text style={styles.assignmentPoints}>{points}</Text>
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

function SignedInHome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const drawTeam = useMutation(api.draw.drawTeam);
  const seedTeams = useMutation(api.teams.seedFromCode);
  const dashboard = useQuery(api.draw.getDashboard) as DashboardView | undefined;
  const matches = useQuery(api.matches.list) as MatchView[] | undefined;

  const [profileReady, setProfileReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

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
  const isViewer = Boolean(dashboard?.currentUser && !dashboard.currentUser.isParticipant);
  const hasRemainingTeams = dashboard?.teamsByPot.some((pot) => pot.remaining > 0) ?? false;
  const remainingTeamCount =
    dashboard?.teamsByPot.reduce((total, pot) => total + pot.remaining, 0) ?? 0;
  const showDrawSetupPanel = dashboard ? !dashboard.teamsReady || hasRemainingTeams : false;
  const matchGroups = useMemo(() => groupMatchesByLocalDate(matches ?? []), [matches]);
  const pointsByTeamId = useMemo(() => getTeamPointsById(matches ?? []), [matches]);
  const teamOwnersById = useMemo(() => {
    const owners = new Map<string, string>();

    for (const participant of dashboard?.participants ?? []) {
      for (const assignment of participant.assignments) {
        owners.set(assignment.teamId, formatPersonName(participant.name));
      }
    }

    return owners;
  }, [dashboard?.participants]);
  const sortedParticipants = useMemo(() => {
    return [...(dashboard?.participants ?? [])].sort((first, second) => {
      const pointsDiff =
        getParticipantTotalPoints(second, pointsByTeamId) - getParticipantTotalPoints(first, pointsByTeamId);
      if (pointsDiff !== 0) return pointsDiff;
      return first.participantNumber - second.participantNumber;
    });
  }, [dashboard?.participants, pointsByTeamId]);

  const handleDraw = async (pot: Pot) => {
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
          {showDrawSetupPanel ? (
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
                  <Text style={styles.metric}>{isViewer ? "Зритель" : `${currentAssignments.length}/4`}</Text>
                </View>
              </View>

              {!dashboard.currentUser ? (
                <Text style={styles.errorText}>Ваш профиль ещё создаётся.</Text>
              ) : isViewer ? (
                <Text style={styles.mutedText}>
                  Все 12 мест игроков уже заняты. Вы можете смотреть таблицу, но выбор команд для этого аккаунта закрыт.
                </Text>
              ) : null}

              {!dashboard.teamsReady ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>Команды ещё не загружены.</Text>
                  {dashboard.currentUser?.participantNumber === 1 ? (
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
                      <AssignmentCells assignments={participant.assignments} pointsByTeamId={pointsByTeamId} />
                      <View style={[styles.playerTableCell, styles.playerTableTotalCell, playerStatusCellStyle]}>
                        <Text style={styles.playerTotalPoints}>{totalPoints}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.scoringRules}>
              <Text style={styles.scoringRulesTitle}>Система начисления очков</Text>
              <Text style={styles.scoringRulesText}>
                Матчи: победа +3, ничья +1, поражение 0. В плей-офф победа после дополнительного времени или пенальти считается как победа.
              </Text>
              <Text style={styles.scoringRulesText}>
                Бонусы за проход стадий: 1/16 финала +3, 1/8 финала +4, 1/4 финала +5, полуфинал +6, финал +8, победа в турнире +10.
              </Text>
              <Text style={styles.scoringRulesText}>
                Бонусы суммируются с очками за матчи и добавляются к команде, которая дошла до соответствующей стадии.
              </Text>
            </View>
          </View>

          {dashboard.totalTeams > 0 && hasRemainingTeams ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Команды</Text>
              <View style={styles.teamColumns}>
                {dashboard.teamsByPot.map((pot) => {
                  const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot.pot);
                  const canDrawPot = Boolean(
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
                              team.assignedTo ? styles.teamRowAssigned : null,
                            ]}
                          >
                            <Text style={team.assignedTo ? styles.teamNameAssigned : styles.teamName}>
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
                          {alreadyDrawn ? "Выбрано" : isBusy ? "Выбираем..." : "Вытащить"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Матчи</Text>

            {matches === undefined ? (
              <LoadingBlock text="Загружаем матчи..." />
            ) : matches.length === 0 ? (
              <Text style={styles.mutedText}>Расписание матчей ещё не загружено.</Text>
            ) : (
              <View style={styles.matchSchedule}>
                {matchGroups.map((group) => (
                  <View key={group.dateLabel} style={styles.matchDateGroup}>
                    <Text style={styles.matchDateTitle}>{group.dateLabel}</Text>

                    <View style={styles.matchList}>
                      {group.matches.map((match) => {
                        const homeOwnerName = teamOwnersById.get(match.homeTeam.id);
                        const awayOwnerName = teamOwnersById.get(match.awayTeam.id);

                        return (
                          <View key={match.id} style={styles.matchRow}>
                            <View style={styles.matchTimeColumn}>
                              <Text style={styles.matchTime}>{formatMatchTime(match.scheduledAt)}</Text>
                              <Text style={styles.matchMeta} numberOfLines={1}>{getMatchMeta(match)}</Text>
                            </View>

                            <View style={styles.matchTeamsColumn}>
                              <Text style={styles.matchTeams}>
                                {match.homeTeam.name}
                                {homeOwnerName ? <Text style={styles.matchTeamOwner}> ({homeOwnerName})</Text> : null}
                                {" - "}
                                {match.awayTeam.name}
                                {awayOwnerName ? <Text style={styles.matchTeamOwner}> ({awayOwnerName})</Text> : null}
                              </Text>
                            </View>

                            <View style={styles.matchScoreBox}>
                              <Text
                                style={[
                                  styles.matchScore,
                                  match.status === "completed" ? styles.matchScoreCompleted : null,
                                ]}
                              >
                                {formatMatchScore(match)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  assignmentText: {
    flex: 1,
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
  matchSchedule: {
    gap: 14,
  },
  matchDateGroup: {
    gap: 8,
  },
  matchDateTitle: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
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
  matchScoreCompleted: {
    color: "#067647",
  },
});
