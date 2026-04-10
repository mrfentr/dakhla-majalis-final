/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as blogs from "../blogs.js";
import type * as calculations from "../calculations.js";
import type * as carpetFeedback from "../carpetFeedback.js";
import type * as categories from "../categories.js";
import type * as customers from "../customers.js";
import type * as fabricVariants from "../fabricVariants.js";
import type * as galleryImages from "../galleryImages.js";
import type * as inventory from "../inventory.js";
import type * as jobs from "../jobs.js";
import type * as jobsORTools from "../jobsORTools.js";
import type * as jobsORToolsActions from "../jobsORToolsActions.js";
import type * as optimizationLogic from "../optimizationLogic.js";
import type * as optimizationLogicORTools from "../optimizationLogicORTools.js";
import type * as optimizers from "../optimizers.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seedProducts from "../seedProducts.js";
import type * as storage from "../storage.js";
import type * as svgGeneration from "../svgGeneration.js";
import type * as translateAll from "../translateAll.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  blogs: typeof blogs;
  calculations: typeof calculations;
  carpetFeedback: typeof carpetFeedback;
  categories: typeof categories;
  customers: typeof customers;
  fabricVariants: typeof fabricVariants;
  galleryImages: typeof galleryImages;
  inventory: typeof inventory;
  jobs: typeof jobs;
  jobsORTools: typeof jobsORTools;
  jobsORToolsActions: typeof jobsORToolsActions;
  optimizationLogic: typeof optimizationLogic;
  optimizationLogicORTools: typeof optimizationLogicORTools;
  optimizers: typeof optimizers;
  orders: typeof orders;
  products: typeof products;
  reviews: typeof reviews;
  seedProducts: typeof seedProducts;
  storage: typeof storage;
  svgGeneration: typeof svgGeneration;
  translateAll: typeof translateAll;
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
