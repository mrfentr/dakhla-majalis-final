/**
 * OR-Tools Job Management (Convex Backend)
 *
 * This is a parallel implementation to jobs.ts that uses OR-Tools optimizer instead of current logic.
 * It follows the same job lifecycle pattern for consistency.
 *
 * Job Flow:
 * 1. Client calls scheduleOptimizationORTools() → creates job record
 * 2. Convex schedules executeOptimizationORTools() action (in jobsORToolsActions.ts)
 * 3. Action runs OR-Tools Python optimizer
 * 4. Action generates SVG (reuses svgGeneration.ts)
 * 5. Client watches job status via watchJobORTools()
 */

import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * PUBLIC MUTATION: Schedule an OR-Tools optimization job
 * Called from client (Next.js page)
 */
export const scheduleOptimizationORTools = mutation({
  args: {
    layoutType: v.union(
      v.literal("single-wall"),
      v.literal("l-shape"),
      v.literal("u-shape"),
      v.literal("four-walls")
    ),
    lengths: v.object({
      single: v.optional(v.number()),
      h: v.optional(v.number()),
      v: v.optional(v.number()),
      l: v.optional(v.number()),
      r: v.optional(v.number()),
      top: v.optional(v.number()),
      left: v.optional(v.number()),
      right: v.optional(v.number()),
      bottom: v.optional(v.number()),
      bottomLeftToDoor: v.optional(v.number()),
      doorToBottomRight: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    console.log('🔵 [CONVEX-ORTOOLS] scheduleOptimizationORTools STARTED', {
      layoutType: args.layoutType,
      lengths: args.lengths
    });

    // Create job record in database
    const jobId = await ctx.db.insert("optimizationJobsORTools", {
      status: "pending",
      layoutType: args.layoutType,
      lengths: args.lengths,
      createdAt: Date.now(),
    });

    console.log('✅ [CONVEX-ORTOOLS] Job record created, ID:', jobId);
    console.log('📝 [CONVEX-ORTOOLS] Job will be executed by frontend API call');
    return jobId;
  },
});

/**
 * INTERNAL QUERY: Get job by ID (used by the scheduled action)
 * NOTE: executeOptimizationORTools action is in jobsORToolsActions.ts
 */
export const getJobById = internalQuery({
  args: {
    jobId: v.id("optimizationJobsORTools"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * PUBLIC QUERY: Watch job status (used by client to subscribe to updates)
 */
export const watchJobORTools = query({
  args: {
    jobId: v.id("optimizationJobsORTools"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * INTERNAL MUTATION: Update job status
 */
export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
    });
  },
});

/**
 * INTERNAL MUTATION: Complete job with result
 */
export const completeJob = internalMutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      result: args.result,
      completedAt: Date.now(),
    });
  },
});

/**
 * INTERNAL MUTATION: Fail job with error message
 */
export const failJob = internalMutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

/**
 * PUBLIC MUTATION: Update job to processing (called by frontend before API call)
 */
export const markJobProcessing = mutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
    });
  },
});

/**
 * PUBLIC MUTATION: Complete job with result (called by frontend after API returns)
 */
export const completeJobFromFrontend = mutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      result: args.result,
      completedAt: Date.now(),
    });
  },
});

/**
 * PUBLIC MUTATION: Fail job with error (called by frontend if API fails)
 */
export const failJobFromFrontend = mutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

/**
 * PUBLIC MUTATION: Cancel a pending or processing job
 */
export const cancelJobORTools = mutation({
  args: {
    jobId: v.id("optimizationJobsORTools"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    // Only cancel if still pending or processing
    if (job.status === "pending" || job.status === "processing") {
      await ctx.db.patch(args.jobId, {
        status: "failed",
        error: "Cancelled by user",
        completedAt: Date.now(),
      });
    }
  },
});
