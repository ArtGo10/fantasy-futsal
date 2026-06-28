import { useSignIn, useSignUp, useSSO } from "@clerk/clerk-expo";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { styles } from "../../styles";
import type { AuthMode, ClerkSignInAttempt } from "../../types";
import {
  getErrorMessage,
  getIncompleteSignInMessage,
  getWebOAuthRedirectUrls,
  shouldConfirmSignInWithEmailCode,
} from "../../utils/auth";

export function AuthScreen() {
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

  const resetTransientState = () => {
    setAwaitingVerification(false);
    setAwaitingSignInVerification(false);
    setCode("");
    setErrorText(null);
    setInfoText(null);
  };

  const startSignInEmailCodeVerification = async (attempt: ClerkSignInAttempt) => {
    if (!shouldConfirmSignInWithEmailCode(attempt) || !attempt.prepareSecondFactor) {
      setErrorText(getIncompleteSignInMessage(String(attempt.status ?? "")));
      return;
    }

    await attempt.prepareSecondFactor({ strategy: "email_code" });
    setAwaitingSignInVerification(true);
    setCode("");
    setInfoText("Мы отправили код подтверждения на почту. Введите код подтверждения.");
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
      setInfoText("Мы отправили код подтверждения на почту. Введите код подтверждения.");
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
              resetTransientState();
            }}
          >
            <Text style={mode === "sign_in" ? styles.segmentTextActive : styles.segmentText}>Вход</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, mode === "sign_up" ? styles.segmentButtonActive : null]}
            onPress={() => {
              setMode("sign_up");
              resetTransientState();
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
