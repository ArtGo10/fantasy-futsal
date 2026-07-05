import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

type OAuthRedirectCallbackProps = {
  redirectUrlComplete: string;
};

export function OAuthRedirectCallback({ redirectUrlComplete }: OAuthRedirectCallbackProps) {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl={redirectUrlComplete}
      signUpForceRedirectUrl={redirectUrlComplete}
      transferable
    />
  );
}
