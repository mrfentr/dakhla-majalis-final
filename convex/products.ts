import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all active products
export const getProducts = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("draft"), v.literal("all"))),
    category: v.optional(v.string()),
    productType: v.optional(v.union(
      v.literal("glassat"),
      v.literal("wsayd"),
      v.literal("coudoir"),
      v.literal("zerbiya"),
      v.literal("poufs"),
      v.literal("majalis_set"),
      v.literal("sac_decoration"),
      v.literal("petit_coussin")
    )),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db.query("products").collect();

    // Filter by status (default to active, "all" skips filtering)
    if (args.status === "all") {
      // No filtering — return all statuses
    } else if (args.status) {
      products = products.filter(p => p.status === args.status);
    } else {
      products = products.filter(p => p.status === "active");
    }

    // Filter by category if provided
    if (args.category) {
      products = products.filter(p => p.category === args.category);
    }

    // Filter by productType if provided
    if (args.productType) {
      products = products.filter(p => p.productType === args.productType);
    }

    return products;
  },
});

// Get a single product by slug
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return product;
  },
});

// Get a single product by ID
export const getProductById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get products by category and subcategory
export const getProductsBySubcategory = query({
  args: {
    category: v.string(),
    subcategory: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("draft"))),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .withIndex("by_category_subcategory", (q) =>
        q.eq("category", args.category).eq("subcategory", args.subcategory)
      )
      .collect();

    const status = args.status ?? "active";
    products = products.filter(p => p.status === status);
    return products;
  },
});

// Bulk assign products to a subcategory (and optionally update their category)
export const assignSubcategory = mutation({
  args: {
    productIds: v.array(v.id("products")),
    subcategory: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const id of args.productIds) {
      await ctx.db.patch(id, {
        subcategory: args.subcategory,
        ...(args.category ? { category: args.category } : {}),
        updatedAt: Date.now(),
      });
    }
    return { updated: args.productIds.length };
  },
});

// Remove subcategory from products
export const removeSubcategory = mutation({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    for (const id of args.productIds) {
      await ctx.db.patch(id, {
        subcategory: undefined,
        updatedAt: Date.now(),
      });
    }
    return { updated: args.productIds.length };
  },
});

// DEBUG: Check what category/subcategory values products actually have
export const debugProductSubcategories = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products
      .filter(p => p.status === "active" && !p.isMandatory)
      .map(p => ({
        id: p._id,
        title: p.title.fr,
        category: p.category,
        subcategory: p.subcategory ?? "(none)",
        status: p.status,
      }));
  },
});

// Get featured products
export const getFeaturedProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured")
      .filter((q) => q.eq(q.field("isFeatured"), true))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return products;
  },
});

// Get popular products
export const getPopularProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_popularity")
      .filter((q) => q.eq(q.field("isPopular"), true))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return products;
  },
});

// Create a new product
export const createProduct = mutation({
  args: {
    title: v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    }),
    slug: v.string(),
    description: v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    }),
    content: v.optional(v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    })),
    productType: v.union(
      v.literal("glassat"),
      v.literal("wsayd"),
      v.literal("coudoir"),
      v.literal("zerbiya"),
      v.literal("poufs"),
      v.literal("majalis_set"),
      v.literal("sac_decoration"),
      v.literal("petit_coussin")
    ),
    category: v.string(),
    subcategory: v.optional(v.string()),
    image: v.string(),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }))
    }))),
    specifications: v.any(),
    pricing: v.object({
      basePrice: v.number(),
      pricePerSquareMeter: v.optional(v.number()),
      currency: v.string(),
    }),
    measurementOptions: v.any(),
    inventory: v.object({
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
      trackInventory: v.boolean(),
      allowBackorders: v.boolean(),
    }),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("draft")),
    composition: v.optional(v.object({
      glassat: v.optional(v.number()),
      wsayd: v.optional(v.number()),
      coudoir: v.optional(v.number()),
      zerbiya: v.optional(v.number()),
      poufs: v.optional(v.number()),
    })),
    rating: v.number(),
    reviewCount: v.number(),
    fabricVariantId: v.optional(v.id("fabricVariants")),
    linkedFabricVariantId: v.optional(v.id("fabricVariants")),
    colorVariants: v.optional(v.array(v.object({
      name: v.object({
        ar: v.string(),
        fr: v.string(),
        en: v.optional(v.string()),
      }),
      hex: v.string(),
      image: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const productId = await ctx.db.insert("products", {
      ...args,
      fabricVariantId: args.fabricVariantId,
      linkedFabricVariantId: args.linkedFabricVariantId,
      isPopular: false,
      isBestSeller: false,
      isFeatured: false,
      createdAt: now,
      updatedAt: now,
    });

    return productId;
  },
});

// Update a product
export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    title: v.optional(v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    })),
    slug: v.optional(v.string()),
    description: v.optional(v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    })),
    content: v.optional(v.object({
      fr: v.string(),
      ar: v.string(),
      en: v.optional(v.string())
    })),
    productType: v.optional(v.union(
      v.literal("glassat"),
      v.literal("wsayd"),
      v.literal("coudoir"),
      v.literal("zerbiya"),
      v.literal("poufs"),
      v.literal("majalis_set"),
      v.literal("sac_decoration"),
      v.literal("petit_coussin")
    )),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }))
    }))),
    specifications: v.optional(v.any()),
    pricing: v.optional(v.object({
      basePrice: v.number(),
      pricePerSquareMeter: v.optional(v.number()),
      currency: v.string(),
    })),
    inventory: v.optional(v.object({
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
      trackInventory: v.boolean(),
      allowBackorders: v.boolean(),
    })),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("draft"))),
    composition: v.optional(v.object({
      glassat: v.optional(v.number()),
      wsayd: v.optional(v.number()),
      coudoir: v.optional(v.number()),
      zerbiya: v.optional(v.number()),
      poufs: v.optional(v.number()),
    })),
    isPopular: v.optional(v.boolean()),
    isBestSeller: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    fabricVariantId: v.optional(v.id("fabricVariants")),
    linkedFabricVariantId: v.optional(v.id("fabricVariants")),
    colorVariants: v.optional(v.array(v.object({
      name: v.object({
        ar: v.string(),
        fr: v.string(),
        en: v.optional(v.string()),
      }),
      hex: v.string(),
      image: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
    }))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete a product
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Prevent deletion of mandatory products
    if (product.isMandatory) {
      throw new Error("Cannot delete mandatory products. These products are essential for the system.");
    }

    // Prevent deletion of products linked to a fabric variant
    if (product.fabricVariantId) {
      throw new Error("Cannot delete this product directly — it is linked to a fabric variant. Delete the fabric variant from the Stock page instead.");
    }

    await ctx.db.delete(args.id);
  },
});

// Update product inventory
export const updateInventory = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("set")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const previousQuantity = product.inventory.stockQuantity;
    let newQuantity = previousQuantity;
    let logOperation: "add" | "subtract" | "adjustment" = "adjustment";

    if (args.operation === "add") {
      newQuantity += args.quantity;
      logOperation = "add";
    } else if (args.operation === "subtract") {
      newQuantity -= args.quantity;
      logOperation = "subtract";
    } else {
      newQuantity = args.quantity;
      logOperation = "adjustment";
    }

    // Don't allow negative quantities
    if (newQuantity < 0) {
      throw new Error("Insufficient inventory");
    }

    await ctx.db.patch(args.productId, {
      inventory: {
        ...product.inventory,
        stockQuantity: newQuantity,
      },
      updatedAt: Date.now(),
    });

    // Log inventory change
    await ctx.db.insert("inventory", {
      productId: args.productId,
      operation: logOperation,
      quantity: args.quantity,
      previousQuantity: previousQuantity,
      newQuantity: newQuantity,
      reason: args.reason || `Manual ${args.operation}`,
      notes: args.notes,
      performedBy: args.performedBy || "admin",
      createdAt: Date.now(),
    });

    // === LINKED FABRIC VARIANT POUF STOCK SYNC ===
    // If this product is a pouf linked to a fabric variant, mirror the change to fabricVariants.stock.poufs
    if (product.linkedFabricVariantId) {
      try {
        const fabricVariant = await ctx.db.get(product.linkedFabricVariantId);
        if (fabricVariant) {
          const prevPoufQty = fabricVariant.stock.poufs ?? 0;
          let newPoufQty: number;

          if (args.operation === "add") {
            newPoufQty = prevPoufQty + args.quantity;
          } else if (args.operation === "subtract") {
            // Deduct what's available, don't go negative
            newPoufQty = Math.max(prevPoufQty - args.quantity, 0);
          } else {
            // "set" operation: set fabric variant poufs to the same absolute value
            newPoufQty = newQuantity;
          }

          await ctx.db.patch(product.linkedFabricVariantId, {
            stock: {
              ...fabricVariant.stock,
              poufs: newPoufQty,
            },
            updatedAt: Date.now(),
          });

          await ctx.db.insert("fabricVariantInventory", {
            fabricVariantId: product.linkedFabricVariantId,
            component: "poufs",
            operation: logOperation,
            quantity: args.quantity,
            previousQuantity: prevPoufQty,
            newQuantity: newPoufQty,
            reason: `Linked sync from individual pouf product: ${args.reason || `Manual ${args.operation}`}`,
            notes: args.notes,
            performedBy: args.performedBy || "admin",
            createdAt: Date.now(),
          });
        }
      } catch (error) {
        // Don't block the main inventory update if the linked sync fails
        console.error("[updateInventory] Error syncing to linked fabric variant:", error);
      }
    }

    return newQuantity;
  },
});

// DEPRECATED: Fabric variants are now the source of truth for custom order stock.
// This function is kept for backwards compatibility but should not be used for new orders.
// TODO: Remove in future cleanup phase.
// Initialize mandatory products (Glassat, Wsayd, Coudoir, Zerbiya)
// These products must always exist in the system for both custom orders and direct sales
export const initializeMandatoryProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const mandatoryProducts = [
      {
        productType: "glassat" as const,
        title: { fr: "Glassat", ar: "قلصة" },
        slug: "glassat-standard",
        description: {
          fr: "Élément principal du salon marocain - Glassat",
          ar: "العنصر الأساسي للصالون المغربي - قلصة"
        },
      },
      {
        productType: "wsayd" as const,
        title: { fr: "Wsada", ar: "وسادة" },
        slug: "wsada-standard",
        description: {
          fr: "Coussin confortable pour votre salon",
          ar: "وسادة مريحة لصالونك"
        },
      },
      {
        productType: "coudoir" as const,
        title: { fr: "Coudoir", ar: "كودوار" },
        slug: "coudoir-standard",
        description: {
          fr: "Accoudoir élégant pour plus de confort",
          ar: "مسند ذراع أنيق لمزيد من الراحة"
        },
      },
      {
        productType: "zerbiya" as const,
        title: { fr: "Zerbiya", ar: "زربية" },
        slug: "zerbiya-standard",
        description: {
          fr: "Tapis traditionnel marocain",
          ar: "سجادة مغربية تقليدية"
        },
      },
    ];

    const createdProducts = [];

    for (const mandatoryProduct of mandatoryProducts) {
      // Check if this product type already exists
      const existingProduct = await ctx.db
        .query("products")
        .withIndex("by_product_type", (q) => q.eq("productType", mandatoryProduct.productType))
        .filter((q) => q.eq(q.field("isMandatory"), true))
        .first();

      if (!existingProduct) {
        // Create the mandatory product
        const productId = await ctx.db.insert("products", {
          ...mandatoryProduct,
          category: "accessories" as const,
          image: "/placeholder-product.jpg", // Admin should update this
          specifications: {
            materials: [],
            colors: [],
            patterns: [],
          },
          pricing: {
            basePrice: 0, // Admin should update pricing
            currency: "MAD",
          },
          measurementOptions: {
            allowCustomDimensions: false,
          },
          inventory: {
            stockQuantity: 10, // Initial stock for mandatory products
            lowStockThreshold: 10,
            trackInventory: true,
            allowBackorders: false,
          },
          status: "active" as const,
          isPopular: false,
          isBestSeller: false,
          isFeatured: false,
          isMandatory: true, // This is the key field
          rating: 0,
          reviewCount: 0,
          createdAt: now,
          updatedAt: now,
        });

        createdProducts.push({
          id: productId,
          type: mandatoryProduct.productType,
          title: mandatoryProduct.title,
        });
      }
    }

    return {
      message: `Initialized ${createdProducts.length} mandatory products`,
      created: createdProducts,
    };
  },
});

// DEPRECATED: Fabric variants now handle stock tracking for majalis products.
// This function is kept for backwards compatibility.
// TODO: Remove in future cleanup phase.
// Enable inventory tracking on all existing Majalis products that don't have it
export const enableMajalisInventoryTracking = mutation({
  args: {
    initialStock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const initialStock = args.initialStock ?? 10;

    const majalisProducts = await ctx.db
      .query("products")
      .withIndex("by_product_type", (q) => q.eq("productType", "majalis_set"))
      .collect();

    const updated = [];

    for (const product of majalisProducts) {
      if (!product.inventory.trackInventory) {
        await ctx.db.patch(product._id, {
          inventory: {
            ...product.inventory,
            stockQuantity: initialStock,
            trackInventory: true,
          },
          updatedAt: Date.now(),
        });

        updated.push({
          id: product._id,
          name: product.title.ar || product.title.fr,
          newStock: initialStock,
        });
      }
    }

    return {
      message: `Updated ${updated.length} Majalis products with inventory tracking`,
      updated,
    };
  },
});
