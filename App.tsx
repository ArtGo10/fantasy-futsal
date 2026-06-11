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

type AuthMode = "sign_in" | "sign_up";
type Pot = (typeof POTS)[number];
type AssignmentView = {
  id: string;
  pot: Pot;
  teamId: string;
  teamName: string;
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
  assignedTo: null | {
    id: string;
    name: string;
    participantNumber: number;
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
    participantNumber: number;
    assignments: AssignmentView[];
  };
  participants: ParticipantView[];
  participantCount: number;
  maxParticipants: number;
  isFull: boolean;
  totalTeams: number;
  teamsReady: boolean;
  teamsByPot: PotView[];
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
const TOKEN_FETCH_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Timed out fetching Clerk token.")), timeoutMs);
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
  if (error && typeof error === "object" && "errors" in error) {
    const maybeErrors = (error as { errors?: Array<{ message?: string }> }).errors;
    if (Array.isArray(maybeErrors) && maybeErrors[0]?.message) {
      return maybeErrors[0].message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getMetadataDisplayName(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const displayName = (metadata as { displayName?: unknown }).displayName;
  if (typeof displayName !== "string") return undefined;

  const trimmed = displayName.trim();
  return trimmed ? trimmed : undefined;
}

function LoadingBlock({ text = "Loading..." }: { text?: string }) {
  return (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="small" />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
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
        <Text style={styles.title}>Convex auth is not ready</Text>
        <Text style={styles.bodyText}>
          Clerk sign-in worked, but Convex did not receive a valid Clerk token yet.
        </Text>
        <Text style={styles.bodyText}>
          Convex JWT template:{" "}
          {templateTokenStatus === "checking" ? "checking..." : templateTokenStatus === "ok" ? "found" : "missing"}
        </Text>
        <Text style={styles.bodyText}>
          Clerk default token:{" "}
          {defaultTokenStatus === "checking" ? "checking..." : defaultTokenStatus === "ok" ? "found" : "missing"}
        </Text>
        <Text style={styles.bodyText}>
          Session audience: {String(sessionClaims?.aud ?? "missing")}
        </Text>
        <Text style={styles.bodyText}>
          Convex identity:{" "}
          {convexAuthStatus === undefined
            ? "checking..."
            : convexAuthStatus.authenticated
              ? `authenticated as ${convexAuthStatus.subject}`
              : "missing"}
        </Text>
        {convexAuthStatus?.issuer ? (
          <Text style={styles.mutedText}>Issuer: {convexAuthStatus.issuer}</Text>
        ) : null}
        <Text style={styles.mutedText}>
          In Clerk, enable the Convex integration or create a JWT template named `convex`, then sign out and sign in again.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
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
        setErrorText("Sign-in did not complete.");
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
        setErrorText("Verification is not complete yet.");
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
      const result = await startSSOFlow({
        strategy: "oauth_google",
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      } else {
        setErrorText("Google sign-in was cancelled.");
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
        <Text style={styles.title}>World Cup Draw</Text>

        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentButton, mode === "sign_in" ? styles.segmentButtonActive : null]}
            onPress={() => {
              setMode("sign_in");
              setAwaitingVerification(false);
              setErrorText(null);
            }}
          >
            <Text style={mode === "sign_in" ? styles.segmentTextActive : styles.segmentText}>Sign in</Text>
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
            <Text style={mode === "sign_up" ? styles.segmentTextActive : styles.segmentText}>Sign up</Text>
          </Pressable>
        </View>

        {!awaitingVerification ? (
          <>
            {mode === "sign_up" ? (
              <TextInput
                style={styles.input}
                placeholder="Name"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
              />
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Verification code"
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
              ? "Working..."
              : mode === "sign_in"
                ? "Sign in"
                : awaitingVerification
                  ? "Verify email"
                  : "Create account"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, isLoading ? styles.buttonDisabled : null]}
          disabled={isLoading}
          onPress={handleGoogleAuth}
        >
          <Text style={styles.secondaryButtonText}>Continue with Google</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AssignmentCells({ assignments }: { assignments: Array<{ pot: Pot; teamName: string }> }) {
  return (
    <View style={styles.assignmentCells}>
      {POTS.map((pot) => {
        const assignment = assignments.find((item) => item.pot === pot);
        return (
          <View
            key={pot}
            style={[styles.assignmentCell, !assignment ? styles.assignmentCellEmpty : null]}
          >
            <Text style={styles.assignmentCellLabel}>Pot {pot}</Text>
            <Text style={assignment ? styles.assignmentText : styles.mutedText}>
              {assignment?.teamName ?? "-"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SignedInHome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const drawTeam = useMutation(api.draw.drawTeam);
  const seedTeams = useMutation(api.teams.seedFromCode);
  const dashboard = useQuery(api.draw.getDashboard) as DashboardView | undefined;

  const [profileReady, setProfileReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const profileName =
    user?.fullName ?? getMetadataDisplayName(user?.unsafeMetadata) ?? user?.username ?? undefined;
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
  const hasRemainingTeams = dashboard?.teamsByPot.some((pot) => pot.remaining > 0) ?? false;
  const remainingTeamCount =
    dashboard?.teamsByPot.reduce((total, pot) => total + pot.remaining, 0) ?? 0;

  const handleDraw = async (pot: Pot) => {
    const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot);
    if (alreadyDrawn || !dashboard?.currentUser || !dashboard.teamsReady || isBusy) return;

    try {
      setIsBusy(true);
      setErrorText(null);
      setStatusText(null);
      const result = await drawTeam({ pot });

      if (result.team) {
        setStatusText(`Drawn: ${result.team.name}`);
      } else if (result.complete) {
        setStatusText("All teams are already drawn.");
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
      setStatusText(result.alreadySeeded ? "Teams are already loaded." : `Loaded ${result.inserted} teams.`);
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
          <Text style={styles.title}>World Cup Draw</Text>
          <Text style={styles.mutedText}>{profileEmail ?? "Signed in"}</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>

      {!profileReady || dashboard === undefined ? (
        <LoadingBlock text="Preparing draw..." />
      ) : (
        <>
          <View style={styles.panel}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.label}>Players</Text>
                <Text style={styles.metric}>
                  {dashboard.participantCount}/{dashboard.maxParticipants}
                </Text>
              </View>
              <View>
                <Text style={styles.label}>Available teams</Text>
                <Text style={styles.metric}>{remainingTeamCount}/{dashboard.totalTeams}</Text>
              </View>
              <View>
                <Text style={styles.label}>My draw</Text>
                <Text style={styles.metric}>{currentAssignments.length}/4</Text>
              </View>
            </View>

            {!dashboard.currentUser ? (
              <Text style={styles.errorText}>The 12 participant slots are already filled.</Text>
            ) : null}

            {!dashboard.teamsReady ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Teams are not loaded yet.</Text>
                {dashboard.currentUser?.participantNumber === 1 ? (
                  <Pressable
                    style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
                    disabled={isBusy}
                    onPress={handleSeedTeams}
                  >
                    <Text style={styles.secondaryButtonText}>Load teams</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {statusText ? <Text style={styles.successText}>{statusText}</Text> : null}
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Players</Text>
            <View style={styles.playerList}>
              {dashboard.participants.map((participant) => (
                <View
                  key={participant.id}
                  style={[
                    styles.playerRow,
                    participant.isCurrentUser ? styles.currentPlayerRow : null,
                  ]}
                >
                  <View style={styles.playerNameColumn}>
                    <Text style={styles.playerName}>#{participant.participantNumber} {participant.name}</Text>
                  </View>
                  <AssignmentCells assignments={participant.assignments} />
                </View>
              ))}
            </View>
          </View>

          {dashboard.totalTeams > 0 && hasRemainingTeams ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Teams</Text>
              <View style={styles.teamColumns}>
                {dashboard.teamsByPot.map((pot) => {
                  const alreadyDrawn = currentAssignments.some((assignment) => assignment.pot === pot.pot);
                  const canDrawPot = Boolean(
                    dashboard.currentUser &&
                      dashboard.teamsReady &&
                      !alreadyDrawn &&
                      pot.remaining > 0 &&
                      !isBusy,
                  );

                  return (
                    <View key={pot.pot} style={styles.teamColumn}>
                      <View style={styles.teamColumnHeader}>
                        <Text style={styles.label}>Pot {pot.pot}</Text>
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
                                #{team.assignedTo.participantNumber} {team.assignedTo.name}
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
                          {alreadyDrawn ? "Drawn" : isBusy ? "Drawing..." : "Draw"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
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
        <Text style={styles.title}>Environment setup needed</Text>
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

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexClerkProvider>
        <SafeAreaView style={styles.container}>
          <ClerkLoading>
            <LoadingBlock />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <AuthLoading>
                <LoadingBlock text="Checking session..." />
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
    gap: 10,
    justifyContent: "space-between",
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
  playerList: {
    gap: 8,
  },
  playerRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  currentPlayerRow: {
    borderColor: "#174ea6",
    backgroundColor: "#f4f8ff",
  },
  playerNameColumn: {
    gap: 2,
  },
  playerName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  assignmentCells: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assignmentCell: {
    minWidth: 118,
    flex: 1,
    borderWidth: 1,
    borderColor: "#c9d8ee",
    borderRadius: 8,
    backgroundColor: "#f8fbff",
    padding: 8,
    gap: 2,
  },
  assignmentCellEmpty: {
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  assignmentCellLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  assignmentText: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
});
