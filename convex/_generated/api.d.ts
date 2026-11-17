/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as applications from "../applications.js";
import type * as authInternal from "../authInternal.js";
import type * as authNode from "../authNode.js";
import type * as caseStudies from "../caseStudies.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as faqs from "../faqs.js";
import type * as forms from "../forms.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as leads from "../leads.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_crud from "../lib/crud.js";
import type * as lib_defaults from "../lib/defaults.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_sha256 from "../lib/sha256.js";
import type * as lib_shape from "../lib/shape.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_util from "../lib/util.js";
import type * as lib_validators from "../lib/validators.js";
import type * as maintenance from "../maintenance.js";
import type * as media from "../media.js";
import type * as notes from "../notes.js";
import type * as reels from "../reels.js";
import type * as seed from "../seed.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";
import type * as site from "../site.js";
import type * as storage from "../storage.js";
import type * as teamMembers from "../teamMembers.js";
import type * as testimonials from "../testimonials.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  applications: typeof applications;
  authInternal: typeof authInternal;
  authNode: typeof authNode;
  caseStudies: typeof caseStudies;
  clients: typeof clients;
  crons: typeof crons;
  dashboard: typeof dashboard;
  faqs: typeof faqs;
  forms: typeof forms;
  http: typeof http;
  jobs: typeof jobs;
  leads: typeof leads;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/crud": typeof lib_crud;
  "lib/defaults": typeof lib_defaults;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/sha256": typeof lib_sha256;
  "lib/shape": typeof lib_shape;
  "lib/storage": typeof lib_storage;
  "lib/util": typeof lib_util;
  "lib/validators": typeof lib_validators;
  maintenance: typeof maintenance;
  media: typeof media;
  notes: typeof notes;
  reels: typeof reels;
  seed: typeof seed;
  services: typeof services;
  settings: typeof settings;
  site: typeof site;
  storage: typeof storage;
  teamMembers: typeof teamMembers;
  testimonials: typeof testimonials;
  users: typeof users;
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
