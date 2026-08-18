import { useSSO } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import * as WebBrowser from "expo-web-browser";
import { Image as ExpoImage } from "expo-image";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { useI18n } from "../../i18n/I18nProvider";
import { storeLegalAcceptance } from "../../legal/legalAcceptanceStorage";
import { LegalConsentText } from "../legal/LegalConsentText";
import { LegalTextSheet, type LegalTextKind } from "../legal/LegalTextSheet";
import { AppLoadingOverlay } from "../common/AppLoadingOverlay";
import { ClearableTextInput } from "../common/ClearableTextInput";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { styles } from "../../styles";
import { colors } from "../../theme/tokens";
import fantasyFutsalAppIcon from "../../../assets/fantasy-futsal-big-icon.png";
import fantasyFutsalBackground from "../../../assets/fantasy-team.png";
import type { AuthMode, ClerkSignInAttempt } from "../../types";
import {
  getErrorMessage,
  getNativeOAuthRedirectUrl,
  logAuthError,
  getIncompleteSignInMessage,
  getWebOAuthRedirectUrls,
  shouldConfirmSignInWithEmailCode,
} from "../../utils/auth";

WebBrowser.maybeCompleteAuthSession();

const SOCIAL_AUTH_HANDOFF_TIMEOUT_MS = 3500;
const SOCIAL_AUTH_ICON_SIZE = 21;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function AuthGoogleIcon() {
  return (
    <Svg
      height={SOCIAL_AUTH_ICON_SIZE}
      viewBox="0 0 533.5 544.3"
      width={SOCIAL_AUTH_ICON_SIZE}
    >
      <Path
        d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
        fill="#4285F4"
      />
      <Path
        d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
        fill="#34A853"
      />
      <Path
        d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
        fill="#FBBC04"
      />
      <Path
        d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AuthAppleIcon() {
  return (
    <Svg
      height={SOCIAL_AUTH_ICON_SIZE}
      viewBox="0 0 384 512"
      width={SOCIAL_AUTH_ICON_SIZE}
    >
      <Path
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.2-39.3.6-75.5 22.8-95.7 58-40.7 70.7-10.4 175.2 29.2 232.7 19.4 28.1 42.4 59.7 72.7 58.6 29.2-1.2 40.1-18.9 75.3-18.9 35 0 45 18.9 75.8 18.3 31.3-.6 51.2-28.7 70.5-56.9 22.3-32.6 31.5-64.2 32-65.8-.7-.3-59.8-23-60.2-98.2zM260.7 101.8c16.1-19.5 27-46.6 24-73.8-23.2.9-51.2 15.4-67.8 34.8-14.9 17.2-27.8 44.8-24.3 71.3 25.8 2 52-13.1 68.1-32.3z"
        fill={colors.text.primary}
      />
    </Svg>
  );
}

type AuthPasswordInputProps = {
  clearLabel: string;
  isVisible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  placeholder: string;
  toggleLabel: string;
  value: string;
};

function AuthPasswordInput({
  clearLabel,
  isVisible,
  onChangeText,
  onToggleVisibility,
  placeholder,
  toggleLabel,
  value,
}: AuthPasswordInputProps) {
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <ClearableTextInput
      autoCapitalize="none"
      clearAccessibilityLabel={clearLabel}
      clearTextOnFocus={false}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8A8F9F"
      rightAccessory={
        <Pressable
          accessibilityLabel={toggleLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleVisibility}
          style={styles.authPasswordToggle}
        >
          <VisibilityIcon color={colors.text.secondary} size={20} strokeWidth={2.2} />
        </Pressable>
      }
      rightAccessoryWidth={50}
      secureTextEntry={!isVisible}
      selectTextOnFocus={false}
      style={[styles.authInput, styles.authPasswordInput]}
      value={value}
    />
  );
}

type AuthStep = "intro" | "form";
type PasswordResetStep = "idle" | "email" | "code";

type ClerkPasswordResetCreateParams = {
  identifier: string;
  strategy: "reset_password_email_code";
};

type ClerkPasswordResetCreator = {
  create: (params: ClerkPasswordResetCreateParams) => Promise<unknown>;
};

type ClerkPasswordResetAttempt = ClerkSignInAttempt & {
  attemptFirstFactor?: (params: {
    strategy: "reset_password_email_code";
    code: string;
    password: string;
  }) => Promise<ClerkSignInAttempt>;
};

export function AuthScreen({
  title = "Fantasy Futsal",
}: {
  title?: string;
}) {
  const { language, t } = useI18n();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [authStep, setAuthStep] = useState<AuthStep>("intro");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmNewPasswordVisible, setIsConfirmNewPasswordVisible] =
    useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingSocialAuth, setIsCompletingSocialAuth] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [awaitingSignInVerification, setAwaitingSignInVerification] =
    useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [legalSheetKind, setLegalSheetKind] = useState<LegalTextKind | null>(
    null,
  );

  const [passwordResetStep, setPasswordResetStep] =
    useState<PasswordResetStep>("idle");

  const isReady = signInLoaded && signUpLoaded;
  const isResettingPassword = passwordResetStep !== "idle";
  const isAwaitingCode =
    awaitingVerification ||
    awaitingSignInVerification ||
    passwordResetStep === "code";
  const canSubmit = useMemo(() => {
    if (isLoading || !isReady) return false;
    if (passwordResetStep === "email") return Boolean(email.trim());
    if (passwordResetStep === "code") {
      return Boolean(
        code.trim() && newPassword.trim() && confirmNewPassword.trim(),
      );
    }
    if (mode === "sign_in") {
      if (awaitingSignInVerification) return Boolean(code.trim());
      return Boolean(email.trim() && password.trim());
    }
    if (awaitingVerification) return Boolean(code.trim());
    return Boolean(
      displayName.trim() &&
      email.trim() &&
      password.trim() &&
      confirmPassword.trim() &&
      hasAcceptedLegal,
    );
  }, [
    awaitingSignInVerification,
    awaitingVerification,
    code,
    confirmNewPassword,
    confirmPassword,
    displayName,
    email,
    isLoading,
    isReady,
    hasAcceptedLegal,
    mode,
    newPassword,
    password,
    passwordResetStep,
  ]);

  useEffect(() => {
    if (!isCompletingSocialAuth) return undefined;

    const timeoutId = setTimeout(() => {
      setIsCompletingSocialAuth(false);
    }, SOCIAL_AUTH_HANDOFF_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isCompletingSocialAuth]);
  useEffect(() => {
    if (authStep === "intro" || mode !== "sign_up") {
      setHasAcceptedLegal(false);
    }
  }, [authStep, mode]);

  const clearFormError = () => {
    setErrorText(null);
  };

  const toggleLegalAcceptance = () => {
    setHasAcceptedLegal((current) => !current);
    clearFormError();
  };

  const clearPasswordFields = () => {
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmNewPasswordVisible(false);
  };

  const clearIdentityFields = () => {
    setDisplayName("");
    setEmail("");
  };

  const resetTransientState = () => {
    setAwaitingVerification(false);
    setAwaitingSignInVerification(false);
    setPasswordResetStep("idle");
    setCode("");
    clearIdentityFields();
    clearPasswordFields();
    setErrorText(null);
    setInfoText(null);
  };

  const startPasswordReset = () => {
    setMode("sign_in");
    setAwaitingVerification(false);
    setAwaitingSignInVerification(false);
    setPasswordResetStep("email");
    clearPasswordFields();
    setCode("");
    setErrorText(null);
    setInfoText(null);
  };

  const cancelPasswordReset = () => {
    resetTransientState();
  };

  const handleAuthBackPress = () => {
    if (isResettingPassword) {
      cancelPasswordReset();
      return;
    }

    if (awaitingVerification) {
      setMode("sign_up");
      setAwaitingVerification(false);
      setCode("");
      clearPasswordFields();
      setErrorText(null);
      setInfoText(null);
      return;
    }

    if (awaitingSignInVerification) {
      setMode("sign_in");
      setAwaitingSignInVerification(false);
      setCode("");
      clearPasswordFields();
      setErrorText(null);
      setInfoText(null);
      return;
    }

    resetTransientState();
    setAuthStep("intro");
  };

  const ensureLegalAccepted = async () => {
    if (!hasAcceptedLegal) {
      setErrorText(t("auth.termsRequired"));
      return false;
    }

    return true;
  };

  const startSignInEmailCodeVerification = async (
    attempt: ClerkSignInAttempt,
  ) => {
    if (
      !shouldConfirmSignInWithEmailCode(attempt) ||
      !attempt.prepareSecondFactor
    ) {
      setErrorText(
        getIncompleteSignInMessage(String(attempt.status ?? ""), language),
      );
      return;
    }

    await attempt.prepareSecondFactor({ strategy: "email_code" });
    setAwaitingSignInVerification(true);
    setCode("");
    setInfoText(t("auth.codeSent"));
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

      if (
        signInAttempt.status === "complete" &&
        signInAttempt.createdSessionId
      ) {
        await setActive({ session: signInAttempt.createdSessionId });
      } else if (shouldConfirmSignInWithEmailCode(signInAttempt)) {
        await startSignInEmailCodeVerification(signInAttempt);
      } else {
        setErrorText(
          getIncompleteSignInMessage(
            String(signInAttempt.status ?? ""),
            language,
          ),
        );
      }
    } catch (error) {
      logAuthError("sign-in", error);
      setErrorText(getErrorMessage(error, language));
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
      const attempt = await (
        signIn as unknown as ClerkSignInAttempt
      ).attemptSecondFactor?.({
        strategy: "email_code",
        code: code.trim(),
      });

      if (!attempt) {
        setErrorText(t("auth.verifyCodeFailed"));
      } else if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setErrorText(
          getIncompleteSignInMessage(String(attempt.status ?? ""), language),
        );
      }
    } catch (error) {
      logAuthError("sign-in-verify", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpStart = async () => {
    if (!signUp) return;
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorText(t("auth.emailInvalid"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorText(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorText(t("auth.passwordMismatch"));
      return;
    }
    if (!(await ensureLegalAccepted())) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      const normalizedDisplayName = displayName.trim();
      await signUp.create({
        emailAddress: normalizedEmail,
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
      setInfoText(t("auth.codeSent"));
    } catch (error) {
      logAuthError("sign-up", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSendCode = async () => {
    if (!signIn) return;

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      await (signIn as unknown as ClerkPasswordResetCreator).create({
        identifier: email.trim(),
        strategy: "reset_password_email_code",
      });
      setPasswordResetStep("code");
      setCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setInfoText(t("auth.passwordResetCodeSent"));
    } catch (error) {
      logAuthError("password-reset-send-code", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async () => {
    if (!signIn || !setActive) return;
    if (newPassword !== confirmNewPassword) {
      setErrorText(t("auth.passwordMismatch"));
      return;
    }

    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      const attempt = await (
        signIn as unknown as ClerkPasswordResetAttempt
      ).attemptFirstFactor?.({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });

      if (!attempt) {
        setErrorText(t("auth.passwordResetFailed"));
      } else if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setErrorText(
          getIncompleteSignInMessage(String(attempt.status ?? ""), language),
        );
      }
    } catch (error) {
      logAuthError("password-reset-submit", error);
      setErrorText(getErrorMessage(error, language));
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
        await storeLegalAcceptance();
        await setActive({ session: verification.createdSessionId });
      } else {
        setErrorText(t("auth.verificationIncomplete"));
      }
    } catch (error) {
      logAuthError("sign-up-verify", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);

      if (passwordResetStep === "code") {
        await signIn?.create({
          identifier: email.trim(),
          strategy: "reset_password_email_code",
        });
      } else if (awaitingSignInVerification) {
        await (
          signIn as unknown as ClerkSignInAttempt | null
        )?.prepareSecondFactor?.({
          strategy: "email_code",
        });
      } else if (awaitingVerification) {
        await signUp?.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }

      setInfoText(t("auth.newCodeSent"));
    } catch (error) {
      logAuthError("resend-code", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimaryPress = async () => {
    if (passwordResetStep === "email") {
      await handlePasswordResetSendCode();
      return;
    }

    if (passwordResetStep === "code") {
      await handlePasswordResetSubmit();
      return;
    }

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

  const handleSocialAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    let shouldKeepHandoffScreen = false;
    try {
      setErrorText(null);
      setInfoText(null);
      setIsLoading(true);
      setIsCompletingSocialAuth(true);

      if (Platform.OS === "web") {
        const { redirectUrl, redirectUrlComplete } = getWebOAuthRedirectUrls();
        const oauthParams = {
          strategy,
          redirectUrl,
          redirectUrlComplete,
        };

        if (mode === "sign_up" && signUp) {
          shouldKeepHandoffScreen = true;
          await signUp.authenticateWithRedirect({
            ...oauthParams,
            unsafeMetadata: {
              displayName: displayName.trim(),
            },
          });
          return;
        }

        if (signIn) {
          shouldKeepHandoffScreen = true;
          await signIn.authenticateWithRedirect(oauthParams);
          return;
        }

        setErrorText(t("auth.socialUnavailable"));
        return;
      }

      const result = await startSSOFlow({
        strategy,
        redirectUrl: getNativeOAuthRedirectUrl(),
      });

      shouldKeepHandoffScreen = true;

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      }
    } catch (error) {
      logAuthError("social-auth", error);
      setErrorText(getErrorMessage(error, language));
    } finally {
      setIsLoading(false);
      if (!shouldKeepHandoffScreen) {
        setIsCompletingSocialAuth(false);
      }
    }
  };


  return (
    <View style={styles.authShellDark}>
      <ImageBackground
        resizeMode="cover"
        source={fantasyFutsalBackground}
        style={styles.authBackground}
        imageStyle={styles.authBackgroundImage}
      >
        <View style={styles.authOverlay}>
          {authStep === "intro" ? (
            <>
              <View style={styles.authHeroGroup}>
                <ExpoImage
                  accessibilityIgnoresInvertColors
                  cachePolicy="memory-disk"
                  contentFit="contain"
                  priority="high"
                  source={fantasyFutsalAppIcon}
                  style={styles.authLogo}
                  transition={0}
                />
                <Text style={styles.authEyebrow}>{title}</Text>
                <Text style={styles.authHeroTitle}>{t("auth.heroTitle")}</Text>
                <Text style={styles.authHeroText}>{t("auth.heroText")}</Text>
                <View style={styles.authLanguageSwitcher}>
                  <LanguageSwitcher variant="app" />
                </View>
              </View>

              <View style={styles.authIntroFooter}>
                <Pressable
                  style={styles.authPrimaryButton}
                  onPress={() => {
                    resetTransientState();
                    setAuthStep("form");
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    {t("auth.continue")}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <ScrollView
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.authFormScroll}
              contentContainerStyle={styles.authFormScrollContent}
            >
              <Pressable
                accessibilityRole="button"
                onPress={handleAuthBackPress}
                style={styles.authBackButton}
              >
                <ArrowLeft
                  color={colors.brand.blueDark}
                  size={20}
                  strokeWidth={2.4}
                />
                <Text style={styles.authBackButtonText}>{t("auth.back")}</Text>
              </Pressable>

              <View style={styles.authPanelDark}>
                {isResettingPassword ? (
                  <View style={styles.authResetHeader}>
                    <Text style={styles.authResetTitle}>
                      {t("auth.resetPasswordTitle")}
                    </Text>
                    <Text style={styles.authResetDescription}>
                      {passwordResetStep === "code"
                        ? t("auth.resetPasswordCodeDescription")
                        : t("auth.resetPasswordDescription")}
                    </Text>
                  </View>
                ) : isAwaitingCode ? null : (
                  <View style={styles.authSegment}>
                    <Pressable
                      style={[
                        styles.authSegmentButton,
                        mode === "sign_in"
                          ? styles.authSegmentButtonActive
                          : null,
                      ]}
                      onPress={() => {
                        setMode("sign_in");
                        resetTransientState();
                      }}
                    >
                      <Text
                        style={
                          mode === "sign_in"
                            ? styles.authSegmentTextActive
                            : styles.authSegmentText
                        }
                      >
                        {t("auth.signIn")}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.authSegmentButton,
                        mode === "sign_up"
                          ? styles.authSegmentButtonActive
                          : null,
                      ]}
                      onPress={() => {
                        setMode("sign_up");
                        resetTransientState();
                      }}
                    >
                      <Text
                        style={
                          mode === "sign_up"
                            ? styles.authSegmentTextActive
                            : styles.authSegmentText
                        }
                      >
                        {t("auth.signUp")}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {!isAwaitingCode ? (
                  <>
                    {mode === "sign_up" && !isResettingPassword ? (
                      <ClearableTextInput
                        autoCapitalize="words"
                        clearAccessibilityLabel={t("common.clearInput")}
                        onChangeText={(value) => {
                          setDisplayName(value);
                          clearFormError();
                        }}
                        placeholder={t("auth.namePlaceholder")}
                        placeholderTextColor="#8A8F9F"
                        style={styles.authInput}
                        value={displayName}
                      />
                    ) : null}
                    <ClearableTextInput
                      autoCapitalize="none"
                      clearAccessibilityLabel={t("common.clearInput")}
                      keyboardType="email-address"
                      onChangeText={(value) => {
                        setEmail(value);
                        clearFormError();
                      }}
                      placeholder={t("auth.emailPlaceholder")}
                      placeholderTextColor="#8A8F9F"
                      style={styles.authInput}
                      value={email}
                    />
                    {!isResettingPassword ? (
                      <AuthPasswordInput
                        clearLabel={t("common.clearInput")}
                        isVisible={isPasswordVisible}
                        onChangeText={(value) => {
                          setPassword(value);
                          clearFormError();
                        }}
                        onToggleVisibility={() =>
                          setIsPasswordVisible((current) => !current)
                        }
                        placeholder={t("auth.passwordPlaceholder")}
                        toggleLabel={
                          isPasswordVisible
                            ? t("auth.hidePassword")
                            : t("auth.showPassword")
                        }
                        value={password}
                      />
                    ) : null}
                    {mode === "sign_in" && !isResettingPassword ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={startPasswordReset}
                        style={styles.authInlineAction}
                      >
                        <Text style={styles.authInlineActionText}>
                          {t("auth.forgotPassword")}
                        </Text>
                      </Pressable>
                    ) : null}
                    {mode === "sign_up" && !isResettingPassword ? (
                      <AuthPasswordInput
                        clearLabel={t("common.clearInput")}
                        isVisible={isConfirmPasswordVisible}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          clearFormError();
                        }}
                        onToggleVisibility={() =>
                          setIsConfirmPasswordVisible((current) => !current)
                        }
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        toggleLabel={
                          isConfirmPasswordVisible
                            ? t("auth.hidePassword")
                            : t("auth.showPassword")
                        }
                        value={confirmPassword}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <ClearableTextInput
                      autoCapitalize="none"
                      clearAccessibilityLabel={t("common.clearInput")}
                      keyboardType="number-pad"
                      onChangeText={(value) => {
                        setCode(value);
                        clearFormError();
                      }}
                      placeholder={
                        awaitingSignInVerification
                          ? t("auth.signInEmailCodePlaceholder")
                          : t("auth.verificationCodePlaceholder")
                      }
                      placeholderTextColor="#8A8F9F"
                      style={styles.authInput}
                      value={code}
                    />
                    {passwordResetStep === "code" ? (
                      <>
                        <AuthPasswordInput
                          clearLabel={t("common.clearInput")}
                          isVisible={isNewPasswordVisible}
                          onChangeText={(value) => {
                            setNewPassword(value);
                            clearFormError();
                          }}
                          onToggleVisibility={() =>
                            setIsNewPasswordVisible((current) => !current)
                          }
                          placeholder={t("auth.newPasswordPlaceholder")}
                          toggleLabel={
                            isNewPasswordVisible
                              ? t("auth.hidePassword")
                              : t("auth.showPassword")
                          }
                          value={newPassword}
                        />
                        <AuthPasswordInput
                          clearLabel={t("common.clearInput")}
                          isVisible={isConfirmNewPasswordVisible}
                          onChangeText={(value) => {
                            setConfirmNewPassword(value);
                            clearFormError();
                          }}
                          onToggleVisibility={() =>
                            setIsConfirmNewPasswordVisible((current) => !current)
                          }
                          placeholder={t("auth.confirmNewPasswordPlaceholder")}
                          toggleLabel={
                            isConfirmNewPasswordVisible
                              ? t("auth.hidePassword")
                              : t("auth.showPassword")
                          }
                          value={confirmNewPassword}
                        />
                      </>
                    ) : null}
                  </>
                )}

                {!isAwaitingCode &&
                mode === "sign_up" &&
                !isResettingPassword ? (
                  <View style={styles.legalConsentGroup}>
                    <View style={styles.legalConsentRow}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: hasAcceptedLegal }}
                        hitSlop={8}
                        onPress={toggleLegalAcceptance}
                      >
                        <View
                          style={[
                            styles.legalCheckbox,
                            hasAcceptedLegal ? styles.legalCheckboxChecked : null,
                          ]}
                        >
                          {hasAcceptedLegal ? (
                            <Check
                              color={colors.text.inverse}
                              size={15}
                              strokeWidth={3}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                      <LegalConsentText
                        onPrivacyPress={() => setLegalSheetKind("privacy")}
                        onTermsPress={() => setLegalSheetKind("terms")}
                      />
                    </View>
                  </View>
                ) : null}

                {infoText ? (
                  <Text style={styles.authInfoText}>{infoText}</Text>
                ) : null}
                {errorText ? (
                  <Text style={styles.errorText}>{errorText}</Text>
                ) : null}

                <Pressable
                  style={[
                    styles.authPrimaryButton,
                    !canSubmit ? styles.buttonDisabled : null,
                  ]}
                  disabled={!canSubmit}
                  onPress={handlePrimaryPress}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading
                      ? t("auth.wait")
                      : passwordResetStep === "email"
                        ? t("auth.resetPasswordSendCode")
                        : passwordResetStep === "code"
                          ? t("auth.resetPasswordSubmit")
                          : mode === "sign_in"
                            ? awaitingSignInVerification
                              ? t("auth.confirmSignIn")
                              : t("auth.submitSignIn")
                            : awaitingVerification
                              ? t("auth.confirmEmail")
                              : t("auth.createAccount")}
                  </Text>
                </Pressable>

                {isAwaitingCode ? (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      isLoading || !isReady ? styles.buttonDisabled : null,
                    ]}
                    disabled={isLoading || !isReady}
                    onPress={handleResendCode}
                  >
                    <Text style={styles.authSocialButtonText}>
                      {t("auth.resendCode")}
                    </Text>
                  </Pressable>
                ) : null}

                {isResettingPassword ? (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.authSocialButton}
                    onPress={cancelPasswordReset}
                  >
                    <Text style={styles.authSocialButtonText}>
                      {t("auth.backToSignIn")}
                    </Text>
                  </Pressable>
                ) : null}

                {!isAwaitingCode && !isResettingPassword ? (
                  <View style={styles.authSocialDividerRow}>
                    <View style={styles.authSocialDividerLine} />
                    <Text style={styles.authSocialDividerText}>
                      {t("auth.socialDivider")}
                    </Text>
                    <View style={styles.authSocialDividerLine} />
                  </View>
                ) : null}

                {!isAwaitingCode && !isResettingPassword ? (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      isLoading || !isReady ? styles.buttonDisabled : null,
                    ]}
                    disabled={isLoading || !isReady}
                    onPress={() => void handleSocialAuth("oauth_google")}
                  >
                    <View style={styles.authSocialIconFrame}>
                      <AuthGoogleIcon />
                    </View>
                    <Text style={styles.authSocialButtonText}>
                      {t("auth.continueGoogle")}
                    </Text>
                  </Pressable>
                ) : null}

                {!isAwaitingCode &&
                !isResettingPassword &&
                Platform.OS !== "android" ? (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      styles.authSocialButtonDark,
                      isLoading || !isReady ? styles.buttonDisabled : null,
                    ]}
                    disabled={isLoading || !isReady}
                    onPress={() => void handleSocialAuth("oauth_apple")}
                  >
                    <View style={styles.authSocialIconFrame}>
                      <AuthAppleIcon />
                    </View>
                    <Text style={styles.authSocialButtonTextDark}>
                      {t("auth.continueApple")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </ImageBackground>
      <LegalTextSheet
        kind={legalSheetKind ?? "terms"}
        onClose={() => setLegalSheetKind(null)}
        visible={Boolean(legalSheetKind)}
      />
      {isCompletingSocialAuth ? (
        <AppLoadingOverlay title={t("loading.oauthComplete")} />
      ) : null}
    </View>
  );
}
