import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CRASH_REPORT_STORAGE_KEY = "fantasyFutsalLastCrashReport";
const MAX_FIELD_LENGTH = 2200;
const GLOBAL_HANDLER_FALLBACK_DELAY_MS = 800;

export type CrashReportSource =
  | "errorBoundary"
  | "globalError"
  | "queryError"
  | "unhandledRejection";

export type StoredCrashReport = {
  id: string;
  timestamp: number;
  source: CrashReportSource;
  fatal: boolean | null;
  message: string;
  name: string | null;
  stack: string | null;
  componentStack: string | null;
  platform: string;
  platformVersion: string | number | null;
  appVersion: string | null;
  buildVersion: string | null;
  runtimeVersion: string | null;
};

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | null;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
};

let hasInstalledGlobalCrashReporter = false;

function truncate(
  value: string | null | undefined,
  maxLength = MAX_FIELD_LENGTH,
) {
  if (!value) return null;
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength)}
...[truncated]`;
}

function getErrorName(error: unknown) {
  if (error instanceof Error) return error.name;
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getErrorStack(error: unknown) {
  if (error instanceof Error) return error.stack ?? null;
  if (error && typeof error === "object" && "stack" in error) {
    const stack = (error as { stack?: unknown }).stack;
    return typeof stack === "string" ? stack : null;
  }

  return null;
}

function getBuildVersion() {
  const expoConfig = Constants.expoConfig;
  if (Platform.OS === "ios") return expoConfig?.ios?.buildNumber ?? null;
  if (Platform.OS === "android") {
    const versionCode = expoConfig?.android?.versionCode;
    return typeof versionCode === "number" ? String(versionCode) : null;
  }

  return null;
}

export function createCrashReport({
  componentStack,
  error,
  fatal,
  source,
}: {
  componentStack?: string | null;
  error: unknown;
  fatal?: boolean | null;
  source: CrashReportSource;
}): StoredCrashReport {
  const timestamp = Date.now();

  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    source,
    fatal: fatal ?? null,
    message: truncate(getErrorMessage(error), 900) ?? "Unknown error",
    name: truncate(getErrorName(error), 120),
    stack: truncate(getErrorStack(error)),
    componentStack: truncate(componentStack),
    platform: Platform.OS,
    platformVersion: Platform.Version ?? null,
    appVersion: Constants.expoConfig?.version ?? null,
    buildVersion: getBuildVersion(),
    runtimeVersion:
      typeof Constants.expoConfig?.runtimeVersion === "string"
        ? Constants.expoConfig.runtimeVersion
        : null,
  };
}

async function writeCrashReportPayload(payload: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CRASH_REPORT_STORAGE_KEY, payload);
    }
    return;
  }

  await SecureStore.setItemAsync(CRASH_REPORT_STORAGE_KEY, payload);
}

export async function storeCrashReport(report: StoredCrashReport) {
  try {
    await writeCrashReportPayload(JSON.stringify(report));
  } catch (error) {
    console.warn("[crash-report-store-failed]", error);
  }
}

export async function storeCrashReportForError(params: {
  componentStack?: string | null;
  error: unknown;
  fatal?: boolean | null;
  source: CrashReportSource;
}) {
  await storeCrashReport(createCrashReport(params));
}

export async function getStoredCrashReport() {
  try {
    const payload =
      Platform.OS === "web"
        ? typeof window === "undefined"
          ? null
          : window.localStorage.getItem(CRASH_REPORT_STORAGE_KEY)
        : await SecureStore.getItemAsync(CRASH_REPORT_STORAGE_KEY);

    if (!payload) return null;

    const parsed = JSON.parse(payload) as Partial<StoredCrashReport>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.timestamp !== "number" ||
      typeof parsed.message !== "string" ||
      typeof parsed.source !== "string"
    ) {
      return null;
    }

    return parsed as StoredCrashReport;
  } catch {
    return null;
  }
}

export async function clearStoredCrashReport() {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CRASH_REPORT_STORAGE_KEY);
      }
      return;
    }

    await SecureStore.deleteItemAsync(CRASH_REPORT_STORAGE_KEY);
  } catch {
    // Crash diagnostics should never block the app.
  }
}

function getUnhandledRejectionReason(event: unknown) {
  if (event && typeof event === "object" && "reason" in event) {
    return (event as { reason?: unknown }).reason;
  }

  return event;
}

export function installGlobalCrashReporter() {
  if (hasInstalledGlobalCrashReporter) return;
  hasInstalledGlobalCrashReporter = true;

  const globalWithErrorUtils = globalThis as typeof globalThis & {
    ErrorUtils?: ErrorUtilsLike;
    onunhandledrejection?: ((event: unknown) => void) | null;
  };
  const errorUtils = globalWithErrorUtils.ErrorUtils;
  const previousGlobalHandler = errorUtils?.getGlobalHandler?.() ?? null;

  if (errorUtils?.setGlobalHandler) {
    errorUtils.setGlobalHandler((error, isFatal) => {
      let hasCalledPreviousHandler = false;
      const callPreviousHandler = () => {
        if (hasCalledPreviousHandler) return;
        hasCalledPreviousHandler = true;

        if (previousGlobalHandler) {
          previousGlobalHandler(error, isFatal);
          return;
        }

        console.error(error);
      };

      void storeCrashReportForError({
        error,
        fatal: Boolean(isFatal),
        source: "globalError",
      }).finally(callPreviousHandler);

      if (isFatal) {
        setTimeout(callPreviousHandler, GLOBAL_HANDLER_FALLBACK_DELAY_MS);
      }
    });
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      void storeCrashReportForError({
        error: getUnhandledRejectionReason(event),
        fatal: false,
        source: "unhandledRejection",
      });
    });
  } else {
    const previousUnhandledRejection =
      globalWithErrorUtils.onunhandledrejection;
    globalWithErrorUtils.onunhandledrejection = (event: unknown) => {
      void storeCrashReportForError({
        error: getUnhandledRejectionReason(event),
        fatal: false,
        source: "unhandledRejection",
      });
      previousUnhandledRejection?.(event);
    };
  }
}

export function formatCrashReport(report: StoredCrashReport) {
  return JSON.stringify(report, null, 2);
}
