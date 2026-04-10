import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all fabric variants, ordered by most recent first
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const fabricVariants = await ctx.db
      .query("fabricVariants")
      .order("desc")
      .collect();

    return fabricVariants;
  },
});

// Get a single fabric variant by ID
export const getById = query({
  args: { id: v.id("fabricVariants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get all active fabric variants
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const fabricVariants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    return fabricVariants;
  },
});

// Get active fabric variants by category ID
export const getByCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const fabricVariants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return fabricVariants.filter((fv) => fv.isActive);
  },
});

// Get active fabric variants by subcategory ID
export const getBySubcategory = query({
  args: { subcategoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const fabricVariants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_subcategory", (q) =>
        q.eq("subcategoryId", args.subcategoryId)
      )
      .collect();

    return fabricVariants.filter((fv) => fv.isActive);
  },
});

// Get inventory history for a fabric variant
export const getInventoryHistory = query({
  args: {
    fabricVariantId: v.id("fabricVariants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const history = await ctx.db
      .query("fabricVariantInventory")
      .withIndex("by_fabricVariant", (q) =>
        q.eq("fabricVariantId", args.fabricVariantId)
      )
      .order("desc")
      .take(limit);

    return history;
  },
});

// Get recent inventory history for all fabric variants (max 5 per variant)
export const getRecentHistoryForAll = query({
  args: {},
  handler: async (ctx) => {
    const fabricVariants = await ctx.db
      .query("fabricVariants")
      .collect();

    const result: Record<string, any[]> = {};

    for (const variant of fabricVariants) {
      const history = await ctx.db
        .query("fabricVariantInventory")
        .withIndex("by_fabricVariant", (q) =>
          q.eq("fabricVariantId", variant._id)
        )
        .order("desc")
        .take(5);

      if (history.length > 0) {
        result[variant._id] = history;
      }
    }

    return result;
  },
});

// Helper: Generate a URL-friendly slug from Arabic/French text
function generateSlug(frName: string): string {
  return frName
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `fabric-variant-${Date.now()}`;
}

// Helper: Resolve category ID to slug string
async function getCategorySlug(ctx: any, categoryId?: any): Promise<string | undefined> {
  if (!categoryId) return undefined;
  const cat = await ctx.db.get(categoryId);
  return cat?.slug;
}

// Create a new fabric variant + auto-create its linked majalis_set product
export const create = mutation({
  args: {
    name: v.object({
      ar: v.string(),
      fr: v.string(),
      en: v.optional(v.string()),
    }),
    color: v.string(),
    pattern: v.string(),
    image: v.string(),
    gallery: v.optional(v.array(v.object({ url: v.string() }))),
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("categories")),
    stock: v.object({
      glssa: v.number(),
      wsaydRegular: v.number(),
      wsaydReduced: v.number(),
      coudoir: v.number(),
      zerbiya: v.number(),
      zerbiyaType1: v.optional(v.number()),
      zerbiyaType2: v.optional(v.number()),
      zerbiyaType3: v.optional(v.number()),
      zerbiyaType4: v.optional(v.number()),
      poufs: v.optional(v.number()),
      sacDecoration: v.optional(v.number()),
      petitCoussin: v.optional(v.number()),
    }),
    isActive: v.boolean(),
    /** Optional: link to an existing product instead of auto-creating one */
    existingProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { existingProductId, ...variantArgs } = args;

    // 1. Create the fabric variant
    const fabricVariantId = await ctx.db.insert("fabricVariants", {
      ...variantArgs,
      gallery: variantArgs.gallery ?? [],
      createdAt: now,
      updatedAt: now,
    });

    if (existingProductId) {
      // 2a. Link to the existing product
      await ctx.db.patch(existingProductId, {
        fabricVariantId,
        updatedAt: now,
      });
    } else {
      // 2b. Auto-create linked majalis_set product
      const slug = generateSlug(args.name.fr);
      const categorySlug = await getCategorySlug(ctx, args.categoryId);
      const subcategorySlug = await getCategorySlug(ctx, args.subcategoryId);

      await ctx.db.insert("products", {
        title: {
          ar: args.name.ar,
          fr: args.name.fr,
          en: args.name.en,
        },
        slug,
        description: {
          ar: args.pattern || args.name.ar,
          fr: args.pattern || args.name.fr,
        },
        productType: "majalis_set",
        category: categorySlug || "sets",
        subcategory: subcategorySlug,
        image: args.image,
        gallery: [],
        specifications: { colors: [], materials: [], patterns: [] },
        pricing: { basePrice: 0, currency: "MAD" },
        measurementOptions: { allowCustomDimensions: true },
        inventory: {
          stockQuantity: 10,
          lowStockThreshold: 10,
          trackInventory: true,
          allowBackorders: false,
        },
        status: args.isActive ? ("active" as const) : ("draft" as const),
        composition: { glassat: 1, wsayd: 2, coudoir: 1, zerbiya: 1 },
        isPopular: false,
        isBestSeller: false,
        isFeatured: false,
        fabricVariantId,
        rating: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return fabricVariantId;
  },
});

// Update a fabric variant + auto-sync its linked product
export const update = mutation({
  args: {
    id: v.id("fabricVariants"),
    name: v.optional(
      v.object({
        ar: v.string(),
        fr: v.string(),
        en: v.optional(v.string()),
      })
    ),
    color: v.optional(v.string()),
    pattern: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery: v.optional(v.array(v.object({ url: v.string() }))),
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("categories")),
    stock: v.optional(
      v.object({
        glssa: v.number(),
        wsaydRegular: v.number(),
        wsaydReduced: v.number(),
        coudoir: v.number(),
        zerbiya: v.number(),
        zerbiyaType1: v.optional(v.number()),
        zerbiyaType2: v.optional(v.number()),
        zerbiyaType3: v.optional(v.number()),
        zerbiyaType4: v.optional(v.number()),
        poufs: v.optional(v.number()),
        sacDecoration: v.optional(v.number()),
        petitCoussin: v.optional(v.number()),
      })
    ),
    isActive: v.optional(v.boolean()),
    /** Manually reconnect to a different product (pass product ID to link, or null to unlink) */
    linkedProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const { id, linkedProductId, ...updates } = args;
    const now = Date.now();

    // 1. Update the fabric variant itself
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // 2. If manually reconnecting to a different product
    if (linkedProductId !== undefined) {
      // First, unlink any existing product that points to this fabric variant
      const existingLinked = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("fabricVariantId"), id))
        .collect();
      for (const product of existingLinked) {
        if (product._id !== linkedProductId) {
          await ctx.db.patch(product._id, {
            fabricVariantId: undefined,
            updatedAt: now,
          });
        }
      }

      // Link the new product
      await ctx.db.patch(linkedProductId, {
        fabricVariantId: id,
        updatedAt: now,
      });
    }

    // 3. Auto-sync: Update the linked product's title, image, category, status
    const linkedProduct = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("fabricVariantId"), id))
      .first();

    if (linkedProduct) {
      const productUpdates: Record<string, any> = { updatedAt: now };

      if (args.name) {
        productUpdates.title = {
          ar: args.name.ar,
          fr: args.name.fr,
          en: args.name.en,
        };
      }
      if (args.image) {
        productUpdates.image = args.image;
      }
      if (args.isActive !== undefined) {
        productUpdates.status = args.isActive ? "active" : "draft";
      }
      if (args.categoryId) {
        const catSlug = await getCategorySlug(ctx, args.categoryId);
        if (catSlug) productUpdates.category = catSlug;
      }
      if (args.subcategoryId) {
        const subSlug = await getCategorySlug(ctx, args.subcategoryId);
        if (subSlug) productUpdates.subcategory = subSlug;
      }

      await ctx.db.patch(linkedProduct._id, productUpdates);
    }

    return id;
  },
});

// Manual per-component stock adjustment
export const updateStock = mutation({
  args: {
    fabricVariantId: v.id("fabricVariants"),
    component: v.union(
      v.literal("glssa"),
      v.literal("wsaydRegular"),
      v.literal("wsaydReduced"),
      v.literal("coudoir"),
      v.literal("zerbiya"),
      v.literal("zerbiyaType1"),
      v.literal("zerbiyaType2"),
      v.literal("zerbiyaType3"),
      v.literal("zerbiyaType4"),
      v.literal("poufs"),
      v.literal("sacDecoration"),
      v.literal("petitCoussin")
    ),
    operation: v.union(
      v.literal("add"),
      v.literal("subtract"),
      v.literal("adjustment")
    ),
    quantity: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    performedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const fabricVariant = await ctx.db.get(args.fabricVariantId);
    if (!fabricVariant) {
      throw new Error("Fabric variant not found");
    }

    const previousQuantity = fabricVariant.stock[args.component] ?? 0;
    let newQuantity: number = previousQuantity;

    if (args.operation === "add") {
      newQuantity = previousQuantity + args.quantity;
    } else if (args.operation === "subtract") {
      newQuantity = previousQuantity - args.quantity;
      if (newQuantity < 0) {
        throw new Error(
          `Insufficient stock for ${args.component}. Available: ${previousQuantity}, Requested: ${args.quantity}`
        );
      }
    } else {
      // adjustment: set directly
      newQuantity = args.quantity;
    }

    // Update the specific component in the stock object
    await ctx.db.patch(args.fabricVariantId, {
      stock: {
        ...fabricVariant.stock,
        [args.component]: newQuantity,
      },
      updatedAt: Date.now(),
    });

    // Log to fabricVariantInventory
    await ctx.db.insert("fabricVariantInventory", {
      fabricVariantId: args.fabricVariantId,
      component: args.component,
      operation: args.operation,
      quantity: args.quantity,
      previousQuantity,
      newQuantity,
      reason: args.reason,
      notes: args.notes,
      performedBy: args.performedBy,
      createdAt: Date.now(),
    });

    return newQuantity;
  },
});

// Delete a fabric variant + its linked product (hard delete)
export const remove = mutation({
  args: { id: v.id("fabricVariants") },
  handler: async (ctx, args) => {
    const fabricVariant = await ctx.db.get(args.id);
    if (!fabricVariant) {
      throw new Error("Fabric variant not found");
    }

    // Delete the linked product(s) that point to this fabric variant
    const linkedProducts = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("fabricVariantId"), args.id))
      .collect();

    for (const product of linkedProducts) {
      // Don't delete mandatory products
      if (!product.isMandatory) {
        await ctx.db.delete(product._id);
      }
    }

    // Delete the fabric variant itself
    await ctx.db.delete(args.id);
  },
});

// Migration: Convert existing majalis_set products into fabric variants
export const migrateFromProducts = mutation({
  args: {
    defaultStock: v.object({
      glssa: v.number(),
      wsaydRegular: v.number(),
      wsaydReduced: v.number(),
      coudoir: v.number(),
      zerbiya: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find all majalis_set products
    const majalisProducts = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("productType"), "majalis_set"))
      .collect();

    const created: Array<{ productId: string; productName: string; variantId: string; color: string }> = [];
    const skipped: Array<{ productId: string; productName: string; reason: string }> = [];

    for (const product of majalisProducts) {
      // Skip if already has a fabric variant
      if (product.fabricVariantId) {
        skipped.push({
          productId: product._id,
          productName: product.title.ar,
          reason: "Already has fabricVariantId",
        });
        continue;
      }

      // Extract color from name (pattern: "مجلس ... - لون ...")
      let color = product.title.ar;
      const colorMatch = product.title.ar.split("لون");
      if (colorMatch.length > 1) {
        color = colorMatch[colorMatch.length - 1].trim();
      }

      // Extract pattern name (the part before "- لون")
      let pattern = "تقليدي";
      const dashParts = product.title.ar.split("-");
      if (dashParts.length > 0) {
        pattern = dashParts[0].trim();
      }

      // Create fabric variant
      const variantId = await ctx.db.insert("fabricVariants", {
        name: {
          ar: product.title.ar,
          fr: product.title.fr,
        },
        color,
        pattern,
        image: product.image,
        gallery: [],
        stock: args.defaultStock,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Link product to fabric variant
      await ctx.db.patch(product._id, {
        fabricVariantId: variantId,
        updatedAt: now,
      });

      created.push({
        productId: product._id,
        productName: product.title.ar,
        variantId,
        color,
      });
    }

    return {
      message: `Migration complete: ${created.length} fabric variants created, ${skipped.length} skipped`,
      created,
      skipped,
      totalMajalisProducts: majalisProducts.length,
    };
  },
});

// Fix: Create missing products for orphan fabric variants (those without a linked product)
export const fixOrphanFabricVariants = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allFabricVariants = await ctx.db.query("fabricVariants").collect();

    const created: Array<{ fabricVariantId: string; name: string; productId: string }> = [];
    const skipped: Array<{ fabricVariantId: string; name: string; reason: string }> = [];

    for (const fv of allFabricVariants) {
      // Check if any product already links to this fabric variant
      const linkedProduct = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("fabricVariantId"), fv._id))
        .first();

      if (linkedProduct) {
        skipped.push({
          fabricVariantId: fv._id,
          name: fv.name.fr,
          reason: `Already linked to product ${linkedProduct._id}`,
        });
        continue;
      }

      // No product linked — create one
      const slug = generateSlug(fv.name.fr);
      let categorySlug: string | undefined;
      let subcategorySlug: string | undefined;
      if (fv.categoryId) {
        categorySlug = await getCategorySlug(ctx, fv.categoryId);
      }
      if (fv.subcategoryId) {
        subcategorySlug = await getCategorySlug(ctx, fv.subcategoryId);
      }

      const productId = await ctx.db.insert("products", {
        title: {
          ar: fv.name.ar,
          fr: fv.name.fr,
          en: fv.name.en,
        },
        slug,
        description: {
          ar: fv.pattern || fv.name.ar,
          fr: fv.pattern || fv.name.fr,
        },
        productType: "majalis_set",
        category: categorySlug || "sets",
        subcategory: subcategorySlug,
        image: fv.image,
        gallery: [],
        specifications: { colors: [], materials: [], patterns: [] },
        pricing: { basePrice: 0, currency: "MAD" },
        measurementOptions: { allowCustomDimensions: true },
        inventory: {
          stockQuantity: 10,
          lowStockThreshold: 10,
          trackInventory: true,
          allowBackorders: false,
        },
        status: fv.isActive ? ("active" as const) : ("draft" as const),
        composition: { glassat: 1, wsayd: 2, coudoir: 1, zerbiya: 1 },
        isPopular: false,
        isBestSeller: false,
        isFeatured: false,
        fabricVariantId: fv._id,
        rating: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      created.push({
        fabricVariantId: fv._id,
        name: fv.name.fr,
        productId,
      });
    }

    return {
      message: `Fix complete: ${created.length} products created, ${skipped.length} already linked`,
      created,
      skipped,
    };
  },
});
