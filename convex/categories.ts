import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all categories (optionally filter by active status and/or top-level only)
export const getCategories = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    topLevelOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let categories = await ctx.db.query("categories").withIndex("by_order").collect();
    if (args.activeOnly) {
      categories = categories.filter(c => c.isActive);
    }
    if (args.topLevelOnly) {
      categories = categories.filter(c => !c.parentCategoryId);
    }
    return categories;
  },
});

// Get a single category by slug
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Create a new category (optionally as a subcategory by providing parentCategoryId)
export const createCategory = mutation({
  args: {
    name: v.object({
      ar: v.string(),
      fr: v.string(),
      en: v.optional(v.string()),
    }),
    slug: v.string(),
    image: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
    parentCategoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("categories", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a category
export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.object({
      ar: v.string(),
      fr: v.string(),
      en: v.optional(v.string()),
    })),
    slug: v.optional(v.string()),
    image: v.optional(v.string()),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    parentCategoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // If slug is changing, cascade the update to products
    if (updates.slug) {
      const existing = await ctx.db.get(id);
      if (existing && existing.slug !== updates.slug) {
        const oldSlug = existing.slug;
        const newSlug = updates.slug;

        if (existing.parentCategoryId) {
          // This is a subcategory — update products' subcategory field
          const products = await ctx.db.query("products").collect();
          for (const p of products) {
            if (p.subcategory === oldSlug) {
              await ctx.db.patch(p._id, { subcategory: newSlug, updatedAt: Date.now() });
            }
          }
        } else {
          // This is a top-level category — update products' category field
          const products = await ctx.db.query("products")
            .withIndex("by_category", (q) => q.eq("category", oldSlug))
            .collect();
          for (const p of products) {
            await ctx.db.patch(p._id, { category: newSlug, updatedAt: Date.now() });
          }
        }
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a category
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get subcategories by parent category ID
export const getSubcategories = query({
  args: {
    parentId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentCategoryId", args.parentId))
      .collect();
  },
});

// Get subcategories by parent category slug
export const getSubcategoriesBySlug = query({
  args: {
    parentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.parentSlug))
      .first();
    if (!parent) {
      return [];
    }
    return await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentCategoryId", parent._id))
      .collect();
  },
});

// Create a subcategory (requires parentCategoryId)
export const createSubcategory = mutation({
  args: {
    name: v.object({
      ar: v.string(),
      fr: v.string(),
      en: v.optional(v.string()),
    }),
    slug: v.string(),
    image: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
    parentCategoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("categories", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Fix products with stale subcategory slugs — matches them to current category slugs
export const fixStaleSubcategorySlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const subcategories = categories.filter(c => c.parentCategoryId);

    // Build a set of valid subcategory slugs
    const validSlugs = new Set(subcategories.map(c => c.slug));

    const products = await ctx.db.query("products").collect();
    let fixed = 0;

    for (const p of products) {
      if (p.subcategory && !validSlugs.has(p.subcategory)) {
        // Try to find a matching subcategory by similarity (old slug with spaces → new slug with dashes)
        const normalized = p.subcategory.replace(/\s+/g, '-').toLowerCase();
        const match = subcategories.find(c => c.slug === normalized);
        if (match) {
          // Also update the category to match the parent
          const parent = categories.find(c => c._id === match.parentCategoryId);
          await ctx.db.patch(p._id, {
            subcategory: match.slug,
            ...(parent ? { category: parent.slug } : {}),
            updatedAt: Date.now(),
          });
          fixed++;
        }
      }
    }

    return { fixed, message: `Fixed ${fixed} products with stale subcategory slugs` };
  },
});

// Seed initial categories
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").collect();
    if (existing.length > 0) {
      return { message: "Categories already exist", count: existing.length };
    }

    const now = Date.now();
    const placeholderImage = "https://x619bxlezd.ufs.sh/f/hTbn04GjgYB4NkcQXVJod6TPhSrO9WiQbmGNJRKtMj0nzExX";
    const initialCategories = [
      { name: { ar: "مجالس حسب المقاس", fr: "Majalis sur mesure" }, slug: "sets", image: placeholderImage, order: 1 },
      { name: { ar: "مجالس جاهزة", fr: "Majalis prêts" }, slug: "ready", image: placeholderImage, order: 2 },
      { name: { ar: "جلسات للخرجات", fr: "Salons extérieurs" }, slug: "outdoor", image: placeholderImage, order: 3 },
      { name: { ar: "خيام الشعر", fr: "Tentes traditionnelles" }, slug: "tents", image: placeholderImage, order: 4 },
      { name: { ar: "إكسسوارات وديكور", fr: "Accessoires et décor" }, slug: "accessories", image: placeholderImage, order: 5 },
    ];

    const created = [];
    for (const cat of initialCategories) {
      const id = await ctx.db.insert("categories", {
        ...cat,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      created.push(id);
    }

    return { message: `Created ${created.length} categories`, ids: created };
  },
});
