import { useClerk } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import {
  getWebOAuthErrorRedirectUrl,
  rememberWebOAuthCallbackError,
} from "../../utils/auth";

type OAuthRedirectCallbackProps = {
  redirectUrlComplete: string;
};

function navigateTo(destination: string) {
  if (typeof window === "undefined") return;

  window.location.replace(destination);
}

export function OAuthRedirectCallback({
  redirectUrlComplete,
}: OAuthRedirectCallbackProps) {
  const clerk = useClerk();
  const hasHandledRedirectRef = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || hasHandledRedirectRef.current) return;

    hasHandledRedirectRef.current = true;

    void clerk
      .handleRedirectCallback(
        {
          transferable: true,
          signInForceRedirectUrl: redirectUrlComplete,
          signInFallbackRedirectUrl: redirectUrlComplete,
          signUpForceRedirectUrl: redirectUrlComplete,
          signUpFallbackRedirectUrl: redirectUrlComplete,
          signInUrl: redirectUrlComplete,
          signUpUrl: redirectUrlComplete,
          firstFactorUrl: redirectUrlComplete,
          secondFactorUrl: redirectUrlComplete,
          resetPasswordUrl: redirectUrlComplete,
          continueSignUpUrl: redirectUrlComplete,
          verifyEmailAddressUrl: redirectUrlComplete,
          verifyPhoneNumberUrl: redirectUrlComplete,
          signInProtectCheckUrl: redirectUrlComplete,
          signUpProtectCheckUrl: redirectUrlComplete,
        },
        async (destination) => {
          navigateTo(destination || redirectUrlComplete);
        },
      )
      .catch((error) => {
        console.warn("[oauth-redirect-callback]", error);
        rememberWebOAuthCallbackError(error);
        navigateTo(getWebOAuthErrorRedirectUrl(redirectUrlComplete));
      });
  }, [clerk, clerk.loaded, redirectUrlComplete]);

  return <View nativeID="clerk-captcha" />;
}
