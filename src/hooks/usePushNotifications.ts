import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const DEFAULT_NOTIFICATION_CHANNEL_ID = "default";

type UpsertExpoPushToken = (args: { platform?: string; token: string }) => Promise<unknown>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionPromptPromise: Promise<boolean> | null = null;

function getEasProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.MAX,
    lightColor: "#2171B8",
    name: "Fantasy Futsal",
    vibrationPattern: [0, 250, 250, 250],
  });
}

function hasGrantedNotificationsPermission(settings: Notifications.NotificationPermissionsStatus) {
  if (settings.granted) return true;

  if (Platform.OS !== "ios") return false;

  return (
    settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function requestPushNotificationPermission() {
  if (Platform.OS === "web") return false;

  if (permissionPromptPromise) {
    return await permissionPromptPromise;
  }

  permissionPromptPromise = (async () => {
    await ensureAndroidNotificationChannel();

    const existingSettings = await Notifications.getPermissionsAsync();
    if (hasGrantedNotificationsPermission(existingSettings)) return true;
    if (!existingSettings.canAskAgain) return false;

    const requestedSettings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return hasGrantedNotificationsPermission(requestedSettings);
  })();

  try {
    return await permissionPromptPromise;
  } finally {
    permissionPromptPromise = null;
  }
}

async function getExpoPushTokenAfterPermission() {
  const hasPermission = await requestPushNotificationPermission();
  if (!hasPermission) return null;

  const projectId = getEasProjectId();
  if (!projectId) {
    throw new Error("EAS projectId is required for Expo push notifications.");
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function usePushNotificationPermissionPrompt() {
  useEffect(() => {
    void requestPushNotificationPermission().catch(() => {
      // Permission prompts should never block opening the app.
    });
  }, []);
}

export function useExpoPushTokenRegistration({
  enabled,
  upsertExpoPushToken,
}: {
  enabled: boolean;
  upsertExpoPushToken: UpsertExpoPushToken;
}) {
  const savedTokenRef = useRef<string | null>(null);
  const upsertExpoPushTokenRef = useRef(upsertExpoPushToken);

  useEffect(() => {
    upsertExpoPushTokenRef.current = upsertExpoPushToken;
  }, [upsertExpoPushToken]);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return undefined;

    let cancelled = false;

    const registerDevice = async () => {
      try {
        const token = await getExpoPushTokenAfterPermission();
        if (!token || cancelled || savedTokenRef.current === token) return;

        await upsertExpoPushTokenRef.current({
          platform: Platform.OS,
          token,
        });

        if (!cancelled) {
          savedTokenRef.current = token;
        }
      } catch {
        // Token registration is retried on the next app/session load.
      }
    };

    void registerDevice();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
