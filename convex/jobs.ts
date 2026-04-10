import { mutation, internalMutation, internalAction, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { computeOptimization } from "./optimizationLogic";
import { generateSingleWallSVG, generateLShapeSVG, generateUShapeSVG } from "./svgGeneration";

/**
 * PUBLIC MUTATION: Schedule an optimization job
 * This is called from the client and returns immediately with a job ID
 */
export const scheduleOptimization = mutation({
  args: {
    layoutType: v.union(
      v.literal("single-wall"),
      v.literal("l-shape"),
      v.literal("u-shape")
    ),
    lengths: v.object({
      single: v.optional(v.number()),
      h: v.optional(v.number()),
      v: v.optional(v.number()),
      l: v.optional(v.number()),
      r: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    console.log('🔵 [CONVEX-JOBS] scheduleOptimization STARTED', { layoutType: args.layoutType, lengths: args.lengths });

    // Create job record in database
    const jobId = await ctx.db.insert("optimizationJobs", {
      status: "pending",
      layoutType: args.layoutType,
      lengths: args.lengths,
      createdAt: Date.now(),
    });
    console.log('✅ [CONVEX-JOBS] Job record created, ID:', jobId);

    // Schedule the internal action to run immediately (runAfter 0ms)
    // This adds it to Convex's durable queue
    console.log('📅 [CONVEX-JOBS] Scheduling executeOptimization action...');
    await ctx.scheduler.runAfter(
      0, // Run immediately
      internal.jobs.executeOptimization,
      { jobId }
    );
    console.log('✅ [CONVEX-JOBS] Action scheduled successfully');

    return jobId;
  },
});

/**
 * INTERNAL ACTION: Execute the optimization computation
 * This runs as a scheduled function with its own memory limit
 */
export const executeOptimization = internalAction({
  args: {
    jobId: v.id("optimizationJobs"),
  },
  handler: async (ctx, args) => {
    console.log('🟦 [CONVEX-ACTION] executeOptimization STARTED for job:', args.jobId);

    try {
      // Mark job as processing
      console.log('🟡 [CONVEX-ACTION] Updating job status to processing...');
      await ctx.runMutation(internal.jobs.updateJobStatus, {
        jobId: args.jobId,
        status: "processing",
      });
      console.log('✅ [CONVEX-ACTION] Job status updated to processing');

      // Get the job details
      console.log('📥 [CONVEX-ACTION] Fetching job details...');
      const job = await ctx.runQuery(internal.jobs.getJobById, {
        jobId: args.jobId,
      });
      console.log('✅ [CONVEX-ACTION] Job details fetched:', job);

      if (!job) {
        console.log('❌ [CONVEX-ACTION] Job not found!');
        throw new Error("Job not found");
      }

      // Run the pure computation logic (no additional action overhead)
      console.log('🔄 [CONVEX-ACTION] Starting computeOptimization...');
      const result = computeOptimization({
        layoutType: job.layoutType,
        lengths: job.lengths,
      });
      console.log('✅ [CONVEX-ACTION] Computation complete, result:', result);

      // Generate SVG for the result
      let svgString: string | null = null;
      if (job.layoutType === 'single-wall' && result.glssaPieces && job.lengths.single) {
        console.log('🎨 [CONVEX-ACTION] Generating SVG for single wall...');
        svgString = generateSingleWallSVG({
          wallLength: job.lengths.single,
          glssaPieces: result.glssaPieces,
          wssadaPieces: result.wssadaPieces || [],
        });
        console.log('✅ [CONVEX-ACTION] SVG generated');
      } else if (job.layoutType === 'l-shape' && result.segments?.horizontal && result.segments?.vertical && job.lengths.h && job.lengths.v) {
        console.log('🎨 [CONVEX-ACTION] Generating SVG for L-shape...');
        svgString = generateLShapeSVG({
          hLength: job.lengths.h,
          vLength: job.lengths.v,
          hGlssaPieces: result.segments.horizontal.glssaPieces,
          hWssadaPieces: result.segments.horizontal.wssadaPieces || [],
          vGlssaPieces: result.segments.vertical.glssaPieces,
          vWssadaPieces: result.segments.vertical.wssadaPieces || [],
          wssadaOwner: result.segments.wssadaOwner as 'horizontal' | 'vertical' | undefined,
          owner: result.segments.owner as 'horizontal' | 'vertical' | undefined,
        });
        console.log('✅ [CONVEX-ACTION] SVG generated');
      } else if (job.layoutType === 'u-shape' && result.segments?.horizontal && result.segments?.left && result.segments?.right && job.lengths.h && job.lengths.l && job.lengths.r) {
        console.log('🎨 [CONVEX-ACTION] Generating SVG for U-shape...');
        svgString = generateUShapeSVG({
          hLength: job.lengths.h,
          lLength: job.lengths.l,
          rLength: job.lengths.r,
          hGlssaPieces: result.segments.horizontal.glssaPieces,
          hWssadaPieces: result.segments.horizontal.wssadaPieces || [],
          lGlssaPieces: result.segments.left.glssaPieces,
          lWssadaPieces: result.segments.left.wssadaPieces || [],
          rGlssaPieces: result.segments.right.glssaPieces,
          rWssadaPieces: result.segments.right.wssadaPieces || [],
          wssadaOwnerLeft: result.segments.wssadaOwnerLeft as 'back' | 'left' | undefined,
          wssadaOwnerRight: result.segments.wssadaOwnerRight as 'back' | 'right' | undefined,
        });
        console.log('✅ [CONVEX-ACTION] SVG generated');
      }

      // Store the successful result with SVG
      console.log('💾 [CONVEX-ACTION] Storing result and marking as completed...');
      await ctx.runMutation(internal.jobs.completeJob, {
        jobId: args.jobId,
        result: {
          ...result,
          svgString,
        },
      });
      console.log('🏁 [CONVEX-ACTION] Job completed successfully!');

    } catch (error) {
      console.error('❌ [CONVEX-ACTION] Error occurred:', error);
      // Store the error
      await ctx.runMutation(internal.jobs.failJob, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('💥 [CONVEX-ACTION] Job marked as failed');
    }
  },
});

/**
 * INTERNAL QUERY: Get job by ID (used by the scheduled action)
 */
export const getJobById = internalQuery({
  args: {
    jobId: v.id("optimizationJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * PUBLIC QUERY: Watch job status (used by client to subscribe to updates)
 */
export const watchJob = query({
  args: {
    jobId: v.id("optimizationJobs"),
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
    jobId: v.id("optimizationJobs"),
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
    jobId: v.id("optimizationJobs"),
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
    jobId: v.id("optimizationJobs"),
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
export const cancelJob = mutation({
  args: {
    jobId: v.id("optimizationJobs"),
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
