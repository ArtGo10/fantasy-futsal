import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

const OFFLINE_CONFIRMATION_DELAY_MS = 3000;

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
      void NetInfo.fetch()
        .then((latestState) => {
          if (!isCancelled) {
            setIsOffline(isConnectionStateOffline(latestState));
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setIsOffline(true);
          }
        });
    }, OFFLINE_CONFIRMATION_DELAY_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [shouldConfirmOffline]);

  return isOffline;
}
