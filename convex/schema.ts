import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    // Basic Product Info
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
    
    // Product Type
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
    
    // Media
    image: v.string(),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }))
    }))),
    video: v.optional(v.string()),
    
    // Product Specifications
    specifications: v.object({
      // Glassat specs
      glassat: v.optional(v.object({
        height: v.object({
          min: v.number(), // 180cm
          max: v.number(), // 190cm
        }),
        width: v.number(), // 70cm
        minimumSpaceRequired: v.number(), // 110cm
      })),
      // Wsayd specs
      wsayd: v.optional(v.object({
        optimalWidth: v.object({
          min: v.number(), // 85cm
          max: v.number(), // 90cm
        }),
        minimumWidth: v.number(), // 60cm (side placement only)
        height: v.number(),
      })),
      // Zerbiya specs
      zerbiya: v.optional(v.object({
        height: v.number(), // 3m
        width: v.number(), // 2m
      })),
      // Material info
      materials: v.optional(v.array(v.string())),
      colors: v.optional(v.array(v.string())),
      patterns: v.optional(v.array(v.string())),
    }),
    
    // Pricing Structure
    pricing: v.object({
      basePrice: v.number(),
      pricePerSquareMeter: v.optional(v.number()),
      customPricingTiers: v.optional(v.array(v.object({
        minQuantity: v.number(),
        maxQuantity: v.number(),
        pricePerUnit: v.number()
      }))),
      currency: v.string(), // MAD
    }),
    
    // Measurement & Configuration
    measurementOptions: v.object({
      allowCustomDimensions: v.boolean(),
      standardSizes: v.optional(v.array(v.object({
        name: v.object({
          fr: v.string(),
          ar: v.string(),
          en: v.optional(v.string())
        }),
        dimensions: v.object({
          width: v.number(),
          height: v.number(),
          depth: v.optional(v.number())
        })
      }))),
      roomConfigurations: v.optional(v.array(v.union(
        v.literal("u_shape_standard"),
        v.literal("l_shape_corner"),
        v.literal("straight_wall"),
        v.literal("custom_layout")
      ))),
    }),
    
    // Room Layout Options
    roomLayouts: v.optional(v.array(v.object({
      layoutType: v.union(
        v.literal("u_shape"),
        v.literal("l_shape"), 
        v.literal("straight"),
        v.literal("custom")
      ),
      doorPositions: v.array(v.union(
        v.literal("front_center"),
        v.literal("front_left"),
        v.literal("front_right"),
        v.literal("side_left"),
        v.literal("side_right"),
        v.literal("corner"),
        v.literal("multiple_doors")
      )),
      minimumDimensions: v.object({
        width: v.number(),
        height: v.number()
      }),
      recommendedDimensions: v.object({
        width: v.number(),
        height: v.number()
      }),
      layoutImage: v.optional(v.string()),
    }))),
    
    // Product Features
    features: v.optional(v.object({
      highlights: v.array(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      })),
      included: v.array(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      })),
      notIncluded: v.optional(v.array(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }))),
      careInstructions: v.optional(v.array(v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }))),
    })),
    
    // Inventory Management
    inventory: v.object({
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
      trackInventory: v.boolean(),
      allowBackorders: v.boolean(),
    }),
    
    // Product Status & Admin
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("draft")),
    isPopular: v.optional(v.boolean()),
    isBestSeller: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    isMandatory: v.optional(v.boolean()), // Prevents deletion of essential products
    fabricVariantId: v.optional(v.id("fabricVariants")),
    linkedFabricVariantId: v.optional(v.id("fabricVariants")), // Links individual pouf product to a fabric variant's pouf stock

    // Color Variants (selectable colors with hex and optional image)
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

    // Product Composition - tracks which mandatory items this product contains
    composition: v.optional(v.object({
      glassat: v.optional(v.number()), // quantity of glassat items
      wsayd: v.optional(v.number()), // quantity of wsayd items
      coudoir: v.optional(v.number()), // quantity of coudoir items
      zerbiya: v.optional(v.number()), // quantity of zerbiya items
      poufs: v.optional(v.number()), // quantity of poufs items
    })),

    rating: v.number(),
    reviewCount: v.number(),
    
    // SEO & Metadata
    seo: v.optional(v.object({
      metaTitle: v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }),
      metaDescription: v.object({
        fr: v.string(),
        ar: v.string(),
        en: v.optional(v.string())
      }),
      keywords: v.array(v.string()),
    })),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_product_type", ["productType"])
    .index("by_category", ["category"])
    .index("by_category_subcategory", ["category", "subcategory"])
    .index("by_status", ["status"])
    .index("by_popularity", ["isPopular"])
    .index("by_best_seller", ["isBestSeller"])
    .index("by_featured", ["isFeatured"]),

  blogs: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    author: v.string(),
    publishedAt: v.number(),
    status: v.union(v.literal("published"), v.literal("draft")),
    tags: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    gallery: v.optional(v.array(v.object({
      url: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string())
    }))),
    
    // SEO fields
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),

    // Translations (base fields are Arabic, translations for other languages)
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

    // Admin fields
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_published_at", ["publishedAt"])
    .index("by_author", ["author"]),


  orders: defineTable({
    reference: v.string(),
    orderType: v.union(v.literal("direct_purchase"), v.literal("room_measurement")),
    customerId: v.optional(v.id("customers")),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
        region: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.string(),
      }),
      language: v.union(v.literal("fr"), v.literal("ar"), v.literal("en")),
    }),

    // Room Measurements (optional - only for room_measurement orders)
    roomMeasurements: v.optional(v.object({
      width: v.number(),
      height: v.number(),
      doorPositions: v.array(v.object({
        position: v.union(
          v.literal("front_center"),
          v.literal("front_left"),
          v.literal("front_right"),
          v.literal("side_left"),
          v.literal("side_right"),
          v.literal("corner")
        ),
        width: v.number(),
        height: v.number(),
      })),
      layoutType: v.union(
        v.literal("u_shape"),
        v.literal("l_shape"),
        v.literal("straight"),
        v.literal("custom")
      ),
      includeZerbiya: v.optional(v.boolean()),
      zerbiyaCount: v.optional(v.number()),
      specialRequirements: v.optional(v.string()),
    })),

    // Ordered Products (supports both direct purchase and room measurement)
    products: v.array(v.object({
      productId: v.optional(v.id("products")),
      productSlug: v.optional(v.string()),
      name: v.string(),
      image: v.optional(v.string()),
      size: v.optional(v.string()),
      color: v.optional(v.string()),
      productType: v.optional(v.union(
        v.literal("glassat"),
        v.literal("wsayd"),
        v.literal("coudoir"),
        v.literal("zerbiya"),
        v.literal("poufs"),
        v.literal("sac_decoration"),
        v.literal("petit_coussin")
      )),
      quantity: v.number(),
      customDimensions: v.optional(v.object({
        width: v.number(),
        height: v.number(),
        depth: v.optional(v.number()),
      })),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),

    // Calculations (optional - only for room_measurement orders)
    calculations: v.optional(v.object({
      totalGlassat: v.number(),
      totalWsayd: v.number(),
      totalCoudoir: v.number(), // 1 per Glassat
      totalZerbiya: v.number(),
      glssaPieces: v.optional(v.array(v.number())),
      wssadaPieces: v.optional(v.array(v.number())),
      carpetSelection: v.optional(v.object({
        carpetTypeId: v.number(),
        label: v.string(),
        widthCm: v.number(),
        heightCm: v.number(),
        rotated: v.boolean(),
        price: v.number(),
        baseTypeConsumed: v.number(),
        baseTypeQuantity: v.number(),
      })),
      carpetSelections: v.optional(v.array(v.object({
        carpetTypeId: v.number(),
        label: v.string(),
        widthCm: v.number(),
        heightCm: v.number(),
        rotated: v.boolean(),
        price: v.number(),
        baseTypeConsumed: v.number(),
        baseTypeQuantity: v.number(),
        posX: v.number(),
        posY: v.number(),
      }))),
      poufsCount: v.optional(v.number()),
      poufsPrice: v.optional(v.number()),
      materialUsageOptimized: v.boolean(),
      spaceValidated: v.boolean(),
      calculationMethod: v.string(),
    })),
    
    // Layout Visualization (current version)
    layoutVisualization: v.optional(v.object({
      diagramUrl: v.string(),
      measurements: v.optional(v.object({
        totalArea: v.number(),
        usableSpace: v.number(),
        wastedSpace: v.number(),
      })),
    })),

    // Design history - stores previous versions when layout is edited
    designHistory: v.optional(v.array(v.object({
      diagramUrl: v.string(),
      savedAt: v.number(),
      version: v.number(),
      editedBy: v.optional(v.string()), // 'customer' | 'admin' | 'system'
      note: v.optional(v.string()),
    }))),

    // OR-Tools optimization data (stores full per-wall breakdown for exact import)
    optimizationData: v.optional(v.any()),

    // Selected majalis product (for room_measurement orders)
    selectedMajalisProduct: v.optional(v.object({
      productId: v.id("products"),
      name: v.string(),
      fabricVariantId: v.optional(v.id("fabricVariants")),
      fabricVariantName: v.optional(v.string()),
      color: v.optional(v.string()),
    })),

    // Pricing
    pricing: v.object({
      subtotal: v.number(),
      tax: v.optional(v.number()),
      shipping: v.optional(v.number()),
      total: v.number(),
      currency: v.string(), // MAD
    }),

    // Order Notes
    notes: v.optional(v.string()),
    
    // Order Status
    status: v.union(
      v.literal("draft"),
      v.literal("pending_payment"),
      v.literal("confirmed"),
      v.literal("in_production"),
      v.literal("in_production_tissu_ponj"),
      v.literal("delivered_ponj"),
      v.literal("shipping_tissu"),
      v.literal("delivered_tissu"),
      v.literal("ready_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    
    // Supplier Information (Auto-generated)
    supplierMessage: v.optional(v.object({
      customerDetails: v.string(),
      productDetails: v.string(),
      measurements: v.string(),
      totalAmount: v.string(),
      generatedAt: v.number(),
    })),
    
    // Delivery
    delivery: v.optional(v.object({
      estimatedDate: v.number(),
      deliveryAddress: v.string(),
      deliveryInstructions: v.optional(v.string()),
      trackingNumber: v.optional(v.string()),
    })),
    
    // Additional individual items attached to the order (e.g. poufs, accessories)
    additionalItems: v.optional(v.array(v.object({
      name: v.string(),
      nameAr: v.optional(v.string()),
      productSlug: v.optional(v.string()),
      image: v.optional(v.string()),
      quantity: v.float64(),
      unitPrice: v.float64(),
      totalPrice: v.float64(),
    }))),

    // Status Change History
    statusHistory: v.optional(v.array(v.object({
      fromStatus: v.string(),
      toStatus: v.string(),
      changedAt: v.number(),
      note: v.optional(v.string()),
    }))),

    // Soft Delete
    isDeleted: v.optional(v.boolean()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_status", ["status"])
    .index("by_customer_email", ["customerInfo.email"])
    .index("by_created_at", ["createdAt"]),

  reviews: defineTable({
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
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_status", ["status"])
    .index("by_product_status", ["productId", "status"]),

  inventory: defineTable({
    productId: v.id("products"),
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("adjustment")),
    quantity: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    performedBy: v.string(), // User ID or system
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_created_at", ["createdAt"])
    .index("by_operation", ["operation"]),

  customers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    addresses: v.optional(v.array(v.object({
      street: v.string(),
      city: v.string(),
      region: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.string(),
      isDefault: v.optional(v.boolean()),
    }))),
    language: v.union(v.literal("fr"), v.literal("ar"), v.literal("en")),
    orderHistory: v.optional(v.array(v.id("orders"))),
    notes: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_created_at", ["createdAt"]),

  optimizationJobs: defineTable({
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
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
    result: v.optional(v.any()),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // OR-Tools optimization jobs (parallel to optimizationJobs)
  optimizationJobsORTools: defineTable({
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
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
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  galleryImages: defineTable({
    url: v.string(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_created_at", ["createdAt"]),

  categories: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_active", ["isActive"])
    .index("by_parent", ["parentCategoryId"]),

  fabricVariants: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_pattern", ["pattern"])
    .index("by_color", ["color"])
    .index("by_category", ["categoryId"])
    .index("by_subcategory", ["subcategoryId"]),

  carpetFeedback: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_testCaseId", ["testCaseId"])
    .index("by_layoutType", ["layoutType"]),

  fabricVariantInventory: defineTable({
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
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("adjustment")),
    quantity: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
    performedBy: v.string(),
    orderId: v.optional(v.id("orders")),
    createdAt: v.number(),
  })
    .index("by_fabricVariant", ["fabricVariantId"])
    .index("by_created_at", ["createdAt"])
    .index("by_operation", ["operation"]),
});