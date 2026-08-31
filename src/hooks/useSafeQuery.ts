import {
  useMutation,
  useQuery_experimental as useQueryState,
} from "convex/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { useEffect, useMemo, useRef } from "react";

import { api } from "../lib/convexApi";
import { createCrashReport, storeCrashReport } from "../utils/crashReporter";

type SafeQueryOptions<ReturnType> = {
  fallback?: ReturnType;
  label?: string;
};

export function useSafeQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"] | "skip",
  options: SafeQueryOptions<Query["_returnType"]> = {},
): Query["_returnType"] | undefined {
  const queryState = useQueryState({ query, args });
  const submitCrashReport = useMutation(api.appDiagnostics.submitCrashReport);
  const lastReportedErrorKeyRef = useRef<string | null>(null);
  const queryName = useMemo(
    () => options.label ?? getFunctionName(query),
    [options.label, query],
  );

  useEffect(() => {
    if (queryState.status !== "error") {
      lastReportedErrorKeyRef.current = null;
      return;
    }

    const message =
      queryState.error instanceof Error
        ? queryState.error.message
        : String(queryState.error);
    const reportKey = `${queryName}:${message}`;
    if (lastReportedErrorKeyRef.current === reportKey) return;
    lastReportedErrorKeyRef.current = reportKey;

    const report = createCrashReport({
      error: queryState.error,
      fatal: false,
      source: "queryError",
    });

    void submitCrashReport({ report }).catch((error) => {
      console.warn("[query-error-report-submit-failed]", error);
      void storeCrashReport(report);
    });
  }, [queryName, queryState, submitCrashReport]);

  if (queryState.status === "success") return queryState.data;
  if (queryState.status === "error") return options.fallback;
  return undefined;
}
