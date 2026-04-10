import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate an upload URL for storing design images
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save the storage ID to the job
 */
export const saveImageToJob = mutation({
  args: {
    jobId: v.id("optimizationJobs"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.jobId, {
      imageUrl: imageUrl ?? undefined,
    });

    return imageUrl ?? undefined;
  },
});
