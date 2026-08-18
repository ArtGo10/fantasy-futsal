export type AuthMode = "sign_in" | "sign_up";

export type ClerkEmailCodeSecondFactor = {
  strategy?: string;
};

export type ClerkSignInAttempt = {
  status?: string | null;
  createdSessionId?: string | null;
  supportedSecondFactors?: ClerkEmailCodeSecondFactor[] | null;
  prepareSecondFactor?: (params: { strategy: "email_code" }) => Promise<unknown>;
  attemptSecondFactor?: (params: { strategy: "email_code"; code: string }) => Promise<ClerkSignInAttempt>;
};
