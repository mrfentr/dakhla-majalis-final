import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("carpetFeedback").order("asc").collect();
  },
});

export const getByTestCase = query({
  args: { testCaseId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("carpetFeedback")
      .withIndex("by_testCaseId", (q) => q.eq("testCaseId", args.testCaseId))
      .first();
  },
});

export const saveFeedback = mutation({
  args: {
    testCaseId: v.number(),
    testCaseName: v.string(),
    layoutType: v.string(),
    dimensions: v.any(),
    floorRect: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    selectedComboIndex: v.number(),
    selectedPlacements: v.array(v.object({
      carpetTypeId: v.number(),
      carpetTypeLabel: v.string(),
      rotated: v.boolean(),
      fitWidth: v.number(),
      fitHeight: v.number(),
      posX: v.number(),
      posY: v.number(),
    })),
    totalCoveragePercent: v.number(),
    totalPrice: v.number(),
    algorithmAgreed: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("carpetFeedback")
      .withIndex("by_testCaseId", (q) => q.eq("testCaseId", args.testCaseId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("carpetFeedback", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteFeedback = mutation({
  args: { id: v.id("carpetFeedback") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
