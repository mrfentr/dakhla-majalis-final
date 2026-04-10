import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log inventory change
export const logInventoryChange = mutation({
  args: {
    productId: v.id("products"),
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("adjustment")),
    quantity: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    performedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const logId = await ctx.db.insert("inventory", {
      productId: args.productId,
      operation: args.operation,
      quantity: args.quantity,
      previousQuantity: args.previousQuantity,
      newQuantity: args.newQuantity,
      reason: args.reason,
      notes: args.notes,
      performedBy: args.performedBy,
      createdAt: now,
    });

    return logId;
  },
});

// Get inventory history for a product
export const getProductInventoryHistory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("inventory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    return history;
  },
});

// Get all inventory history
export const getAllInventoryHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const history = await ctx.db
      .query("inventory")
      .order("desc")
      .take(limit);

    return history;
  },
});

// Get inventory history by operation type
export const getInventoryByOperation = query({
  args: {
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("adjustment")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const history = await ctx.db
      .query("inventory")
      .withIndex("by_operation", (q) => q.eq("operation", args.operation))
      .order("desc")
      .take(limit);

    return history;
  },
});
