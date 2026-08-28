/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appDiagnostics from "../appDiagnostics.js";
import type * as authHelpers from "../authHelpers.js";
import type * as crons from "../crons.js";
import type * as fantasy from "../fantasy.js";
import type * as futsalImport from "../futsalImport.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as notificationInternals from "../notificationInternals.js";
import type * as notifications from "../notifications.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appDiagnostics: typeof appDiagnostics;
  authHelpers: typeof authHelpers;
  crons: typeof crons;
  fantasy: typeof fantasy;
  futsalImport: typeof futsalImport;
  health: typeof health;
  http: typeof http;
  notificationInternals: typeof notificationInternals;
  notifications: typeof notifications;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
