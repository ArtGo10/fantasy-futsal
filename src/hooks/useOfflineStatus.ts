import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

const OFFLINE_CONFIRMATION_DELAY_MS = 3000;
const OFFLINE_RECHECK_DELAY_MS = 1000;
const wait = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

function isConnectionStateOffline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function useOfflineStatus() {
  const netInfo = useNetInfo();
  const [isOffline, setIsOffline] = useState(false);
  const shouldConfirmOffline = isConnectionStateOffline(netInfo);

  useEffect(() => {
    if (!shouldConfirmOffline) {
      setIsOffline(false);
      return undefined;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      const confirmOffline = async () => {
        try {
          const latestState = await NetInfo.fetch();
          if (!isConnectionStateOffline(latestState)) {
            if (!isCancelled) setIsOffline(false);
            return;
          }

          await wait(OFFLINE_RECHECK_DELAY_MS);
          const recheckedState = await NetInfo.fetch();
          if (!isCancelled) {
            setIsOffline(isConnectionStateOffline(recheckedState));
          }
        } catch {
          if (!isCancelled) {
            setIsOffline(true);
          }
        }
      };

      void confirmOffline();
    }, OFFLINE_CONFIRMATION_DELAY_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [shouldConfirmOffline]);

  return isOffline;
}
