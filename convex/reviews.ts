import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all reviews
export const getReviews = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    let reviews = await ctx.db.query("reviews").order("desc").collect();

    if (args.status) {
      reviews = reviews.filter(r => r.status === args.status);
    }

    return reviews;
  },
});

// Get reviews for a specific product
export const getProductReviews = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return reviews;
  },
});

// Get approved reviews for a product
export const getApprovedProductReviews = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product_status", (q) =>
        q.eq("productId", args.productId).eq("status", "approved")
      )
      .collect();

    return reviews;
  },
});

// Create a review
export const createReview = mutation({
  args: {
    productId: v.id("products"),
    orderId: v.optional(v.id("orders")),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      language: v.union(v.literal("fr"), v.literal("ar"), v.literal("en")),
    }),
    rating: v.number(),
    comment: v.object({
      fr: v.optional(v.string()),
      ar: v.optional(v.string()),
      en: v.optional(v.string()),
    }),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("reviews", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    return reviewId;
  },
});

// Update review status
export const updateReviewStatus = mutation({
  args: {
    id: v.id("reviews"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
    });

    return args.id;
  },
});

// Delete a review
export const deleteReview = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
