import { useEffect, useState } from "react";

import { getErrorMessage } from "../utils/auth";

type UpsertCurrentUser = (args: { email?: string; name?: string }) => Promise<unknown>;

export function useCurrentUserBootstrap({
  onStart,
  onError,
  profileEmail,
  profileName,
  upsertCurrentUser,
  userId,
}: {
  onStart: () => void;
  onError: (message: string) => void;
  profileEmail: string | undefined;
  profileName: string | undefined;
  upsertCurrentUser: UpsertCurrentUser;
  userId: string | undefined;
}) {
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        onStart();
        await upsertCurrentUser({
          email: profileEmail,
          name: profileName,
        });

        if (!cancelled) {
          setProfileReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          onError(getErrorMessage(error));
          setProfileReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [onError, onStart, profileEmail, profileName, upsertCurrentUser, userId]);

  return profileReady;
}
