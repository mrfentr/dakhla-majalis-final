import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all blogs (for public use)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blogs")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
  },
});

// Get all published blogs
export const getPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blogs")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
  },
});

// Get blog by ID
export const getById = query({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get blog by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Admin: Get all blogs (including drafts)
export const getAllForAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blogs")
      .order("desc")
      .collect();
  },
});

// Admin: Get blogs by status
export const getByStatus = query({
  args: { status: v.union(v.literal("published"), v.literal("draft")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogs")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Create blog
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    author: v.string(),
    publishedAt: v.optional(v.number()),
    status: v.union(v.literal("published"), v.literal("draft")),
    tags: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string())
    }))),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    translations: v.optional(v.object({
      fr: v.optional(v.object({
        title: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        seoTitle: v.optional(v.string()),
      })),
      en: v.optional(v.object({
        title: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        seoTitle: v.optional(v.string()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("blogs", {
      ...args,
      publishedAt: args.publishedAt || now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update blog
export const update = mutation({
  args: {
    id: v.id("blogs"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    author: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    status: v.optional(v.union(v.literal("published"), v.literal("draft"))),
    tags: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string())
    }))),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    translations: v.optional(v.object({
      fr: v.optional(v.object({
        title: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        seoTitle: v.optional(v.string()),
      })),
      en: v.optional(v.object({
        title: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        content: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        seoTitle: v.optional(v.string()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete blog
export const remove = mutation({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Publish/unpublish blog
export const toggleStatus = mutation({
  args: { 
    id: v.id("blogs"),
    status: v.union(v.literal("published"), v.literal("draft"))
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };
    
    // Set publishedAt when publishing
    if (args.status === "published") {
      updates.publishedAt = Date.now();
    }
    
    return await ctx.db.patch(args.id, updates);
  },
});