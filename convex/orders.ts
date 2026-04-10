import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate order reference number
function generateOrderReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// Classify wsayd pieces by size: 58-60cm = reduced, 80-90cm = regular
function classifyWsaydPieces(wssadaPieces: number[]): { regular: number; reduced: number } {
  let regular = 0;
  let reduced = 0;
  for (const size of wssadaPieces) {
    if (size >= 80) {
      regular++;
    } else {
      reduced++;
    }
  }
  return { regular, reduced };
}

// Get all orders
export const getOrders = query({
  args: {
    status: v.optional(v.union(
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
    )),
    orderType: v.optional(v.union(v.literal("direct_purchase"), v.literal("room_measurement"))),
  },
  handler: async (ctx, args) => {
    let orders = await ctx.db.query("orders").order("desc").collect();

    if (args.status) {
      orders = orders.filter(o => o.status === args.status);
    }

    if (args.orderType) {
      orders = orders.filter(o => o.orderType === args.orderType);
    }

    return orders;
  },
});

// Get order by ID
export const getOrderById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get order by reference
export const getOrderByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    return order;
  },
});

// Get orders by customer email
export const getOrdersByCustomerEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer_email", (q) => q.eq("customerInfo.email", args.email))
      .collect();

    return orders;
  },
});

// Create a direct purchase order
export const createDirectPurchaseOrder = mutation({
  args: {
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
    products: v.array(v.object({
      productId: v.optional(v.id("products")),
      productSlug: v.optional(v.string()),
      name: v.string(),
      image: v.optional(v.string()),
      size: v.optional(v.string()),
      color: v.optional(v.string()),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    pricing: v.object({
      subtotal: v.number(),
      tax: v.optional(v.number()),
      shipping: v.optional(v.number()),
      total: v.number(),
      currency: v.string(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reference = generateOrderReference();

    // Check if customer exists, if not create one
    let customerId = undefined;
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.customerInfo.email))
      .first();

    if (existingCustomer) {
      customerId = existingCustomer._id;
    } else {
      // Create new customer
      customerId = await ctx.db.insert("customers", {
        name: args.customerInfo.name,
        email: args.customerInfo.email,
        phone: args.customerInfo.phone,
        addresses: [{
          street: args.customerInfo.address.street,
          city: args.customerInfo.address.city,
          region: args.customerInfo.address.region,
          postalCode: args.customerInfo.address.postalCode,
          country: args.customerInfo.address.country,
          isDefault: true,
        }],
        language: args.customerInfo.language,
        orderHistory: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // === SERVER-SIDE STOCK VALIDATION ===
    const stockErrors: Array<{ name: string; available: number; requested: number }> = [];
    for (const product of args.products) {
      let productId = product.productId;
      if (!productId && product.productSlug) {
        const matchingProduct = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", product.productSlug!))
          .first();
        if (matchingProduct) productId = matchingProduct._id;
      }
      if (productId) {
        const productData = await ctx.db.get(productId);
        if (productData && productData.inventory.trackInventory && !productData.inventory.allowBackorders) {
          if (product.quantity > productData.inventory.stockQuantity) {
            stockErrors.push({
              name: product.name,
              available: productData.inventory.stockQuantity,
              requested: product.quantity,
            });
          }
        }
      }
    }
    if (stockErrors.length > 0) {
      throw new ConvexError({
        code: "INSUFFICIENT_STOCK",
        details: stockErrors,
      });
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      reference,
      orderType: "direct_purchase",
      customerId,
      customerInfo: args.customerInfo,
      products: args.products,
      pricing: args.pricing,
      notes: args.notes,
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    // Update customer order history
    if (customerId && existingCustomer) {
      const orderHistory = existingCustomer.orderHistory || [];
      orderHistory.push(orderId);
      await ctx.db.patch(customerId, {
        orderHistory,
        updatedAt: now,
      });
    } else if (customerId) {
      await ctx.db.patch(customerId, {
        orderHistory: [orderId],
        updatedAt: now,
      });
    }

    return { orderId, reference };
  },
});

// Create a room measurement order
export const createRoomMeasurementOrder = mutation({
  args: {
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
    roomMeasurements: v.object({
      width: v.number(),
      height: v.number(),
      layoutType: v.string(), // Accept any string, we'll map it internally
      dimensions: v.object({
        singleWall: v.optional(v.number()),
        lShapeH: v.optional(v.number()),
        lShapeV: v.optional(v.number()),
        uShapeH: v.optional(v.number()),
        uShapeL: v.optional(v.number()),
        uShapeR: v.optional(v.number()),
        fourWallsTop: v.optional(v.number()),
        fourWallsLeft: v.optional(v.number()),
        fourWallsRight: v.optional(v.number()),
        fourWallsBottomLeft: v.optional(v.number()),
        fourWallsBottomRight: v.optional(v.number()),
      }),
      includeZerbiya: v.optional(v.boolean()),
      zerbiyaCount: v.optional(v.number()),
    }),
    products: v.array(v.object({
      productId: v.optional(v.id("products")),
      name: v.string(),
      productType: v.union(
        v.literal("glassat"),
        v.literal("wsayd"),
        v.literal("coudoir"),
        v.literal("zerbiya"),
        v.literal("poufs")
      ),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    calculations: v.object({
      totalGlassat: v.number(),
      totalWsayd: v.number(),
      totalCoudoir: v.number(),
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
    }),
    layoutVisualization: v.optional(v.object({
      diagramUrl: v.string(),
    })),
    // Full OR-Tools optimization data (per-wall breakdown, corner ownership)
    optimizationData: v.optional(v.any()),
    // Selected majalis product (required)
    selectedMajalisProduct: v.object({
      productId: v.id("products"),
      name: v.string(),
      fabricVariantId: v.optional(v.id("fabricVariants")),
      fabricVariantName: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
    pricing: v.object({
      subtotal: v.number(),
      total: v.number(),
      currency: v.string(),
    }),
    notes: v.optional(v.string()),
    // Optional additional individual items attached to this salon order
    additionalItems: v.optional(v.array(v.object({
      productSlug: v.optional(v.string()),
      name: v.string(),
      nameAr: v.optional(v.string()),
      image: v.optional(v.string()),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reference = generateOrderReference();

    // Check if customer exists, if not create one
    let customerId = undefined;
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.customerInfo.email))
      .first();

    if (existingCustomer) {
      customerId = existingCustomer._id;
    } else {
      // Create new customer
      customerId = await ctx.db.insert("customers", {
        name: args.customerInfo.name,
        email: args.customerInfo.email,
        phone: args.customerInfo.phone,
        addresses: [{
          street: args.customerInfo.address.street,
          city: args.customerInfo.address.city,
          region: args.customerInfo.address.region,
          postalCode: args.customerInfo.address.postalCode,
          country: args.customerInfo.address.country,
          isDefault: true,
        }],
        language: args.customerInfo.language,
        orderHistory: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // === SERVER-SIDE STOCK VALIDATION (fabric variant) ===
    if (args.selectedMajalisProduct.fabricVariantId) {
      const fabricVariant = await ctx.db.get(args.selectedMajalisProduct.fabricVariantId);
      if (fabricVariant) {
        const stockErrors: Array<{ component: string; available: number; requested: number }> = [];
        const stock = fabricVariant.stock;

        // Validate glassat
        if (args.calculations.totalGlassat > (stock.glssa ?? 0)) {
          stockErrors.push({ component: "glssa", available: stock.glssa ?? 0, requested: args.calculations.totalGlassat });
        }

        // Validate wsayd
        const wsaydClassification = classifyWsaydPieces(args.calculations.wssadaPieces ?? []);
        if (wsaydClassification.regular > (stock.wsaydRegular ?? 0)) {
          stockErrors.push({ component: "wsaydRegular", available: stock.wsaydRegular ?? 0, requested: wsaydClassification.regular });
        }
        if (wsaydClassification.reduced > (stock.wsaydReduced ?? 0)) {
          stockErrors.push({ component: "wsaydReduced", available: stock.wsaydReduced ?? 0, requested: wsaydClassification.reduced });
        }

        // Validate coudoir
        if (args.calculations.totalCoudoir > (stock.coudoir ?? 0)) {
          stockErrors.push({ component: "coudoir", available: stock.coudoir ?? 0, requested: args.calculations.totalCoudoir });
        }

        // Validate carpet
        if (args.calculations.carpetSelections?.length) {
          const perBase: Record<number, number> = {};
          for (const cs of args.calculations.carpetSelections) {
            perBase[cs.baseTypeConsumed] = (perBase[cs.baseTypeConsumed] || 0) + cs.baseTypeQuantity;
          }
          for (const [baseId, qty] of Object.entries(perBase)) {
            const comp = `zerbiyaType${baseId}` as keyof typeof stock;
            if (qty > ((stock as any)[comp] ?? 0)) {
              stockErrors.push({ component: String(comp), available: (stock as any)[comp] ?? 0, requested: qty });
            }
          }
        } else if (args.calculations.carpetSelection) {
          const comp = `zerbiyaType${args.calculations.carpetSelection.baseTypeConsumed}` as keyof typeof stock;
          if (args.calculations.carpetSelection.baseTypeQuantity > ((stock as any)[comp] ?? 0)) {
            stockErrors.push({ component: String(comp), available: (stock as any)[comp] ?? 0, requested: args.calculations.carpetSelection.baseTypeQuantity });
          }
        }

        // Validate poufs
        if (args.calculations.poufsCount && args.calculations.poufsCount > 0) {
          if (args.calculations.poufsCount > (stock.poufs ?? 0)) {
            stockErrors.push({ component: "poufs", available: stock.poufs ?? 0, requested: args.calculations.poufsCount });
          }
        }

        if (stockErrors.length > 0) {
          throw new ConvexError({
            code: "INSUFFICIENT_STOCK",
            details: stockErrors,
          });
        }
      }
    }

    // Map layout type to schema format
    const layoutTypeMap: Record<string, "u_shape" | "l_shape" | "straight" | "custom"> = {
      'u-shape': 'u_shape',
      'l-shape': 'l_shape',
      'single-wall': 'straight',
      'four-walls': 'custom',
    };

    const schemaLayoutType = layoutTypeMap[args.roomMeasurements.layoutType] || 'custom';

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      reference,
      orderType: "room_measurement",
      customerId,
      customerInfo: args.customerInfo,
      roomMeasurements: {
        width: args.roomMeasurements.width,
        height: args.roomMeasurements.height,
        doorPositions: [],
        layoutType: schemaLayoutType,
        specialRequirements: args.notes,
        includeZerbiya: args.roomMeasurements.includeZerbiya,
        zerbiyaCount: args.roomMeasurements.zerbiyaCount,
      },
      products: args.products,
      calculations: {
        ...args.calculations,
        materialUsageOptimized: true,
        spaceValidated: true,
        calculationMethod: "automated",
      },
      layoutVisualization: args.layoutVisualization ? {
        diagramUrl: args.layoutVisualization.diagramUrl,
        measurements: {
          totalArea: 0,
          usableSpace: 0,
          wastedSpace: 0,
        },
      } : undefined,
      // Merge checkout dimensions into optimizationData so they're available for import.
      // The roomMeasurements schema doesn't have a dimensions field, so we preserve them here.
      optimizationData: {
        ...(args.optimizationData || {}),
        dimensions: args.roomMeasurements.dimensions,
        layoutType: args.roomMeasurements.layoutType,
      },
      selectedMajalisProduct: args.selectedMajalisProduct,
      pricing: args.pricing,
      notes: args.notes,
      // Store additional individual items if provided
      ...(args.additionalItems && args.additionalItems.length > 0 ? {
        additionalItems: args.additionalItems,
      } : {}),
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    // Update customer order history
    if (customerId && existingCustomer) {
      const orderHistory = existingCustomer.orderHistory || [];
      orderHistory.push(orderId);
      await ctx.db.patch(customerId, {
        orderHistory,
        updatedAt: now,
      });
    } else if (customerId) {
      await ctx.db.patch(customerId, {
        orderHistory: [orderId],
        updatedAt: now,
      });
    }

    return { orderId, reference };
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    id: v.id("orders"),
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
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get old status before updating
    const oldStatus = order.status;

    // Idempotency guard: no-op if status hasn't changed
    if (oldStatus === args.status) {
      return args.id;
    }

    // Build status history entry
    const existingHistory = (order as any).statusHistory || [];
    existingHistory.push({
      fromStatus: oldStatus,
      toStatus: args.status,
      changedAt: Date.now(),
      note: args.note || undefined,
    });

    // Update order status
    await ctx.db.patch(args.id, {
      status: args.status,
      statusHistory: existingHistory,
      updatedAt: Date.now(),
    });

    // Define status groups for stock management
    const statusesBeforeStockDeduction = ["draft", "pending_payment"];
    const statusesAfterStockDeduction = ["confirmed", "in_production", "in_production_tissu_ponj", "delivered_ponj", "shipping_tissu", "delivered_tissu", "ready_for_delivery", "delivered"];

    const wasBeforeDeduction = statusesBeforeStockDeduction.includes(oldStatus);
    const isAfterDeduction = statusesAfterStockDeduction.includes(args.status);

    // Auto-subtract stock when crossing from before to after deduction
    if (wasBeforeDeduction && isAfterDeduction) {
      for (const product of order.products) {
        let productId = product.productId;

        // If productId is missing, try to find it by productType first, then by slug
        if (!productId) {
          // Try finding by productType (for room measurement orders)
          if (product.productType) {
            const productType = product.productType as "glassat" | "wsayd" | "coudoir" | "zerbiya" | "majalis_set";
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_product_type", (q) => q.eq("productType", productType))
              .filter((q) => q.eq(q.field("status"), "active"))
              .first();

            if (matchingProduct) {
              productId = matchingProduct._id;
            }
          }

          // Try finding by slug (for direct purchase orders)
          if (!productId && product.productSlug) {
            const slug = product.productSlug;
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_slug", (q) => q.eq("slug", slug))
              .filter((q) => q.eq(q.field("status"), "active"))
              .first();

            if (matchingProduct) {
              productId = matchingProduct._id;
            }
          }

          if (!productId) {
            // Log warning but don't block the status update — stock tracking for this item is skipped
            console.warn(`[updateOrderStatus] Product not found for stock deduction. Name: ${product.name}, Type: ${product.productType || 'N/A'}, Slug: ${product.productSlug || 'N/A'}. Skipping stock deduction for this item.`);
            continue;
          }
        }

        if (productId) {
          try {
            const productData = await ctx.db.get(productId);
            if (!productData) {
              // Log warning but don't block the status update
              console.warn(`[updateOrderStatus] Product ${productId} no longer exists in database. Skipping stock deduction.`);
              continue;
            }

            // Only subtract if inventory tracking is enabled
            if (productData.inventory.trackInventory) {
              const currentStock = productData.inventory.stockQuantity;
              const newStock = currentStock - product.quantity;

              // Check if sufficient stock or backorders allowed
              if (newStock < 0 && !productData.inventory.allowBackorders) {
                // Log warning but don't block the status update — allow admin to override
                console.warn(`[updateOrderStatus] Insufficient stock for product: ${product.name}. Available: ${currentStock}, Required: ${product.quantity}. Proceeding anyway (admin override).`);
              }

              // Clamp to 0 if stock goes negative
              const actualNewStock = Math.max(newStock, 0);

              // Update inventory
              await ctx.db.patch(productId, {
                inventory: {
                  ...productData.inventory,
                  stockQuantity: actualNewStock,
                },
                updatedAt: Date.now(),
              });

              // Log inventory change (logged quantity matches what's actually stored)
              await ctx.db.insert("inventory", {
                productId: productId,
                operation: "subtract",
                quantity: product.quantity,
                previousQuantity: currentStock,
                newQuantity: actualNewStock,
                reason: `Order ${order.reference} status changed to ${args.status}`,
                notes: `Stock deducted for order: ${order.reference} (${oldStatus} → ${args.status})`,
                performedBy: "system",
                createdAt: Date.now(),
              });
            }
          } catch (error) {
            // Log the error but don't block the status update
            console.error(`[updateOrderStatus] Error updating inventory for product ${productId}:`, error);
          }
        }
      }

      // === DIRECT PURCHASE: LINKED POUF → FABRIC VARIANT SYNC (deduction) ===
      if (order.orderType === "direct_purchase") {
        for (const product of order.products) {
          let productId = product.productId;
          if (!productId && product.productSlug) {
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_slug", (q) => q.eq("slug", product.productSlug!))
              .first();
            if (matchingProduct) productId = matchingProduct._id;
          }
          if (productId) {
            try {
              const productData = await ctx.db.get(productId);
              if (productData?.linkedFabricVariantId) {
                const fabricVariant = await ctx.db.get(productData.linkedFabricVariantId);
                if (fabricVariant) {
                  const prevPoufQty = fabricVariant.stock.poufs ?? 0;
                  const newPoufQty = Math.max(prevPoufQty - product.quantity, 0);

                  await ctx.db.patch(productData.linkedFabricVariantId, {
                    stock: { ...fabricVariant.stock, poufs: newPoufQty },
                    updatedAt: Date.now(),
                  });

                  await ctx.db.insert("fabricVariantInventory", {
                    fabricVariantId: productData.linkedFabricVariantId,
                    component: "poufs",
                    operation: "subtract",
                    quantity: product.quantity,
                    previousQuantity: prevPoufQty,
                    newQuantity: newPoufQty,
                    reason: `Direct purchase order ${order.reference} confirmed (${oldStatus} → ${args.status})`,
                    performedBy: "system",
                    orderId: args.id,
                    createdAt: Date.now(),
                  });
                }
              }
            } catch (error) {
              console.error("[updateOrderStatus] Error syncing direct purchase pouf to fabric variant:", error);
            }
          }
        }
      }

      // Also deduct stock for the selected Majalis product (specific color/pattern)
      const selectedMajalis = order.selectedMajalisProduct as { productId: Id<"products">; name: string } | undefined;
      if (selectedMajalis?.productId) {
        try {
          const majalisProductId = selectedMajalis.productId as Id<"products">;
          const majalisProduct = await ctx.db.get(majalisProductId);
          if (majalisProduct && majalisProduct.inventory.trackInventory) {
            const currentStock = majalisProduct.inventory.stockQuantity;
            const newStock = currentStock - 1;

            if (newStock < 0 && !majalisProduct.inventory.allowBackorders) {
              // Log warning but don't block the status update
              console.warn(`[updateOrderStatus] Insufficient stock for Majalis: ${selectedMajalis.name}. Available: ${currentStock}, Required: 1. Proceeding anyway (admin override).`);
            }

            const actualNewStock = Math.max(newStock, 0);

            await ctx.db.patch(majalisProductId, {
              inventory: {
                ...majalisProduct.inventory,
                stockQuantity: actualNewStock,
              },
              updatedAt: Date.now(),
            });

            await ctx.db.insert("inventory", {
              productId: majalisProductId,
              operation: "subtract",
              quantity: 1,
              previousQuantity: currentStock,
              newQuantity: actualNewStock,
              reason: `Order ${order.reference} confirmed - Majalis type deducted`,
              notes: `Majalis "${selectedMajalis.name}" deducted (${oldStatus} → ${args.status})`,
              performedBy: "system",
              createdAt: Date.now(),
            });
          }
        } catch (error) {
          // Log the error but don't block the status update
          console.error(`[updateOrderStatus] Error deducting Majalis product stock:`, error);
        }
      }

      // === FABRIC VARIANT STOCK DEDUCTION (for room_measurement orders) ===
      if (order.orderType === "room_measurement") {
        const selectedMajalis = order.selectedMajalisProduct as {
          productId: Id<"products">;
          name: string;
          fabricVariantId?: Id<"fabricVariants">;
          fabricVariantName?: string;
        } | undefined;

        if (selectedMajalis?.fabricVariantId) {
          const fabricVariant = await ctx.db.get(selectedMajalis.fabricVariantId);
          if (fabricVariant) {
            const calculations = order.calculations;
            if (calculations) {
              const wsaydClassification = classifyWsaydPieces(calculations.wssadaPieces ?? []);

              // Define deductions for each component
              const deductions: Array<{
                component: "glssa" | "wsaydRegular" | "wsaydReduced" | "coudoir" | "zerbiya" | "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4" | "poufs";
                quantity: number;
              }> = [
                { component: "glssa", quantity: calculations.totalGlassat },
                { component: "wsaydRegular", quantity: wsaydClassification.regular },
                { component: "wsaydReduced", quantity: wsaydClassification.reduced },
                { component: "coudoir", quantity: calculations.totalCoudoir },
              ];

              // Add carpet deduction based on carpetSelections (multi) or carpetSelection (single) or fallback to old zerbiya
              if (calculations.carpetSelections?.length) {
                // Multi-carpet: accumulate per baseType
                const perBase: Record<number, number> = {};
                for (const cs of calculations.carpetSelections) {
                  perBase[cs.baseTypeConsumed] = (perBase[cs.baseTypeConsumed] || 0) + cs.baseTypeQuantity;
                }
                for (const [baseId, qty] of Object.entries(perBase)) {
                  const comp = `zerbiyaType${baseId}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                  deductions.push({ component: comp, quantity: qty });
                }
              } else if (calculations.carpetSelection) {
                const comp = `zerbiyaType${calculations.carpetSelection.baseTypeConsumed}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                deductions.push({ component: comp, quantity: calculations.carpetSelection.baseTypeQuantity });
              } else if (calculations.totalZerbiya > 0) {
                deductions.push({ component: "zerbiya", quantity: calculations.totalZerbiya });
              }

              // Add poufs deduction
              if (calculations.poufsCount && calculations.poufsCount > 0) {
                deductions.push({ component: "poufs", quantity: calculations.poufsCount });
              }

              const updatedStock = { ...fabricVariant.stock };

              for (const deduction of deductions) {
                if (deduction.quantity > 0) {
                  const previousQty = updatedStock[deduction.component] ?? 0;
                  const newQty = Math.max(previousQty - deduction.quantity, 0);
                  updatedStock[deduction.component] = newQty;

                  // Log each deduction
                  await ctx.db.insert("fabricVariantInventory", {
                    fabricVariantId: selectedMajalis.fabricVariantId,
                    component: deduction.component,
                    operation: "subtract",
                    quantity: deduction.quantity,
                    previousQuantity: previousQty,
                    newQuantity: newQty,
                    reason: `Order ${order.reference} confirmed (${oldStatus} → ${args.status})`,
                    performedBy: "system",
                    orderId: args.id,
                    createdAt: Date.now(),
                  });
                }
              }

              // Update fabric variant stock
              await ctx.db.patch(selectedMajalis.fabricVariantId, {
                stock: updatedStock,
                updatedAt: Date.now(),
              });

              // === LINKED INDIVIDUAL POUF PRODUCT SYNC (deduction) ===
              // If poufs were deducted and a linked individual pouf product exists, mirror the deduction
              const poufsDeduction = deductions.find(d => d.component === "poufs");
              if (poufsDeduction && poufsDeduction.quantity > 0) {
                try {
                  const linkedPoufProducts = await ctx.db
                    .query("products")
                    .filter((q) => q.eq(q.field("linkedFabricVariantId"), selectedMajalis.fabricVariantId))
                    .filter((q) => q.eq(q.field("productType"), "poufs"))
                    .collect();

                  for (const poufProduct of linkedPoufProducts) {
                    if (poufProduct.inventory.trackInventory) {
                      const prevQty = poufProduct.inventory.stockQuantity;
                      const newQty = Math.max(prevQty - poufsDeduction.quantity, 0);

                      await ctx.db.patch(poufProduct._id, {
                        inventory: { ...poufProduct.inventory, stockQuantity: newQty },
                        updatedAt: Date.now(),
                      });

                      await ctx.db.insert("inventory", {
                        productId: poufProduct._id,
                        operation: "subtract",
                        quantity: poufsDeduction.quantity,
                        previousQuantity: prevQty,
                        newQuantity: newQty,
                        reason: `Linked sync: salon order ${order.reference} confirmed`,
                        notes: `Pouf stock deducted via fabric variant link`,
                        performedBy: "system",
                        createdAt: Date.now(),
                      });
                    }
                  }
                } catch (error) {
                  console.error("[updateOrderStatus] Error syncing pouf deduction to linked product:", error);
                }
              }
            }
          }
        }
      }
    }

    // Auto-restore stock when order is cancelled or moved back before deduction
    // Don't restore from "delivered" status (items already shipped)
    const statusesRestorable = ["confirmed", "in_production", "ready_for_delivery"];
    const statusesRequiringRestoration = ["draft", "pending_payment", "cancelled"];

    const wasAfterDeductionButNotDelivered = statusesRestorable.includes(oldStatus);
    const needsRestoration = statusesRequiringRestoration.includes(args.status);

    if (wasAfterDeductionButNotDelivered && needsRestoration) {
      for (const product of order.products) {
        let productId = product.productId;

        // If productId is missing, try to find it by productType first, then by slug
        if (!productId) {
          // Try finding by productType (for room measurement orders)
          if (product.productType) {
            const productType = product.productType as "glassat" | "wsayd" | "coudoir" | "zerbiya" | "majalis_set";
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_product_type", (q) => q.eq("productType", productType))
              .filter((q) => q.eq(q.field("status"), "active"))
              .first();

            if (matchingProduct) {
              productId = matchingProduct._id;
            }
          }

          // Try finding by slug (for direct purchase orders)
          if (!productId && product.productSlug) {
            const slug = product.productSlug;
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_slug", (q) => q.eq("slug", slug))
              .filter((q) => q.eq(q.field("status"), "active"))
              .first();

            if (matchingProduct) {
              productId = matchingProduct._id;
            }
          }
        }

        if (productId) {
          try {
            const productData = await ctx.db.get(productId);
            if (!productData) {
              console.error(`Product ${productId} not found`);
              continue;
            }

            // Only restore if inventory tracking is enabled
            if (productData.inventory.trackInventory) {
              const currentStock = productData.inventory.stockQuantity;
              const newStock = currentStock + product.quantity;

              await ctx.db.patch(productId, {
                inventory: {
                  ...productData.inventory,
                  stockQuantity: newStock,
                },
                updatedAt: Date.now(),
              });

              // Log inventory restoration
              await ctx.db.insert("inventory", {
                productId: productId,
                operation: "add",
                quantity: product.quantity,
                previousQuantity: currentStock,
                newQuantity: newStock,
                reason: `Order ${order.reference} status changed to ${args.status}`,
                notes: `Stock restored for order: ${order.reference} (${oldStatus} → ${args.status})`,
                performedBy: "system",
                createdAt: Date.now(),
              });
            }
          } catch (error) {
            console.error(`Error restoring inventory for product ${productId}:`, error);
            // Don't throw error on stock restoration, just log it
          }
        }
      }

      // === DIRECT PURCHASE: LINKED POUF → FABRIC VARIANT SYNC (restoration) ===
      if (order.orderType === "direct_purchase") {
        for (const product of order.products) {
          let productId = product.productId;
          if (!productId && product.productSlug) {
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_slug", (q) => q.eq("slug", product.productSlug!))
              .first();
            if (matchingProduct) productId = matchingProduct._id;
          }
          if (productId) {
            try {
              const productData = await ctx.db.get(productId);
              if (productData?.linkedFabricVariantId) {
                const fabricVariant = await ctx.db.get(productData.linkedFabricVariantId);
                if (fabricVariant) {
                  const prevPoufQty = fabricVariant.stock.poufs ?? 0;
                  const newPoufQty = prevPoufQty + product.quantity;

                  await ctx.db.patch(productData.linkedFabricVariantId, {
                    stock: { ...fabricVariant.stock, poufs: newPoufQty },
                    updatedAt: Date.now(),
                  });

                  await ctx.db.insert("fabricVariantInventory", {
                    fabricVariantId: productData.linkedFabricVariantId,
                    component: "poufs",
                    operation: "add",
                    quantity: product.quantity,
                    previousQuantity: prevPoufQty,
                    newQuantity: newPoufQty,
                    reason: `Direct purchase order ${order.reference} cancelled (${oldStatus} → ${args.status})`,
                    performedBy: "system",
                    orderId: args.id,
                    createdAt: Date.now(),
                  });
                }
              }
            } catch (error) {
              console.error("[updateOrderStatus] Error restoring direct purchase pouf to fabric variant:", error);
            }
          }
        }
      }

      // Also restore stock for the selected Majalis product
      const selectedMajalisRestore = order.selectedMajalisProduct as { productId: Id<"products">; name: string } | undefined;
      if (selectedMajalisRestore?.productId) {
        try {
          const majalisRestoreId = selectedMajalisRestore.productId as Id<"products">;
          const majalisProduct = await ctx.db.get(majalisRestoreId);
          if (majalisProduct && majalisProduct.inventory.trackInventory) {
            const currentStock = majalisProduct.inventory.stockQuantity;
            const newStock = currentStock + 1;

            await ctx.db.patch(majalisRestoreId, {
              inventory: {
                ...majalisProduct.inventory,
                stockQuantity: newStock,
              },
              updatedAt: Date.now(),
            });

            await ctx.db.insert("inventory", {
              productId: majalisRestoreId,
              operation: "add",
              quantity: 1,
              previousQuantity: currentStock,
              newQuantity: newStock,
              reason: `Order ${order.reference} status changed to ${args.status} - Majalis restored`,
              notes: `Majalis "${selectedMajalisRestore.name}" restored (${oldStatus} → ${args.status})`,
              performedBy: "system",
              createdAt: Date.now(),
            });
          }
        } catch (error) {
          console.error(`Error restoring Majalis product stock:`, error);
        }
      }

      // === FABRIC VARIANT STOCK RESTORATION (for room_measurement orders) ===
      if (order.orderType === "room_measurement") {
        const selectedMajalis = order.selectedMajalisProduct as {
          productId: Id<"products">;
          name: string;
          fabricVariantId?: Id<"fabricVariants">;
          fabricVariantName?: string;
        } | undefined;

        if (selectedMajalis?.fabricVariantId) {
          try {
            const fabricVariant = await ctx.db.get(selectedMajalis.fabricVariantId);
            if (fabricVariant) {
              const calculations = order.calculations;
              if (calculations) {
                const wsaydClassification = classifyWsaydPieces(calculations.wssadaPieces ?? []);

                const restorations: Array<{
                  component: "glssa" | "wsaydRegular" | "wsaydReduced" | "coudoir" | "zerbiya" | "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4" | "poufs";
                  quantity: number;
                }> = [
                  { component: "glssa", quantity: calculations.totalGlassat },
                  { component: "wsaydRegular", quantity: wsaydClassification.regular },
                  { component: "wsaydReduced", quantity: wsaydClassification.reduced },
                  { component: "coudoir", quantity: calculations.totalCoudoir },
                ];

                if (calculations.carpetSelections?.length) {
                  // Multi-carpet: accumulate per baseType
                  const perBase: Record<number, number> = {};
                  for (const cs of calculations.carpetSelections) {
                    perBase[cs.baseTypeConsumed] = (perBase[cs.baseTypeConsumed] || 0) + cs.baseTypeQuantity;
                  }
                  for (const [baseId, qty] of Object.entries(perBase)) {
                    const comp = `zerbiyaType${baseId}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                    restorations.push({ component: comp, quantity: qty });
                  }
                } else if (calculations.carpetSelection) {
                  const comp = `zerbiyaType${calculations.carpetSelection.baseTypeConsumed}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                  restorations.push({ component: comp, quantity: calculations.carpetSelection.baseTypeQuantity });
                } else if (calculations.totalZerbiya > 0) {
                  restorations.push({ component: "zerbiya", quantity: calculations.totalZerbiya });
                }

                // Add poufs restoration
                if (calculations.poufsCount && calculations.poufsCount > 0) {
                  restorations.push({ component: "poufs", quantity: calculations.poufsCount });
                }

                const updatedStock = { ...fabricVariant.stock };

                for (const restoration of restorations) {
                  if (restoration.quantity > 0) {
                    const previousQty = updatedStock[restoration.component] ?? 0;
                    const newQty = previousQty + restoration.quantity;
                    updatedStock[restoration.component] = newQty;

                    await ctx.db.insert("fabricVariantInventory", {
                      fabricVariantId: selectedMajalis.fabricVariantId,
                      component: restoration.component,
                      operation: "add",
                      quantity: restoration.quantity,
                      previousQuantity: previousQty,
                      newQuantity: newQty,
                      reason: `Order ${order.reference} status changed to ${args.status} - stock restored`,
                      performedBy: "system",
                      orderId: args.id,
                      createdAt: Date.now(),
                    });
                  }
                }

                await ctx.db.patch(selectedMajalis.fabricVariantId, {
                  stock: updatedStock,
                  updatedAt: Date.now(),
                });

                // === LINKED INDIVIDUAL POUF PRODUCT SYNC (restoration) ===
                // If poufs were restored and a linked individual pouf product exists, mirror the restoration
                const poufsRestoration = restorations.find(r => r.component === "poufs");
                if (poufsRestoration && poufsRestoration.quantity > 0) {
                  try {
                    const linkedPoufProducts = await ctx.db
                      .query("products")
                      .filter((q) => q.eq(q.field("linkedFabricVariantId"), selectedMajalis.fabricVariantId))
                      .filter((q) => q.eq(q.field("productType"), "poufs"))
                      .collect();

                    for (const poufProduct of linkedPoufProducts) {
                      if (poufProduct.inventory.trackInventory) {
                        const prevQty = poufProduct.inventory.stockQuantity;
                        const newQty = prevQty + poufsRestoration.quantity;

                        await ctx.db.patch(poufProduct._id, {
                          inventory: { ...poufProduct.inventory, stockQuantity: newQty },
                          updatedAt: Date.now(),
                        });

                        await ctx.db.insert("inventory", {
                          productId: poufProduct._id,
                          operation: "add",
                          quantity: poufsRestoration.quantity,
                          previousQuantity: prevQty,
                          newQuantity: newQty,
                          reason: `Linked sync: salon order ${order.reference} status changed to ${args.status}`,
                          notes: `Pouf stock restored via fabric variant link`,
                          performedBy: "system",
                          createdAt: Date.now(),
                        });
                      }
                    }
                  } catch (error) {
                    console.error("[updateOrderStatus] Error syncing pouf restoration to linked product:", error);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error restoring fabric variant stock:`, error);
          }
        }
      }
    }

    return args.id;
  },
});

// Update order (non-status fields only - use updateOrderStatus for status changes)
export const updateOrder = mutation({
  args: {
    id: v.id("orders"),
    customerInfo: v.optional(v.object({
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
    })),
    selectedMajalisProduct: v.optional(v.object({
      productId: v.id("products"),
      name: v.string(),
      fabricVariantId: v.optional(v.id("fabricVariants")),
      fabricVariantName: v.optional(v.string()),
      color: v.optional(v.string()),
    })),
    notes: v.optional(v.string()),
    products: v.optional(v.array(v.object({
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
    }))),
    additionalItems: v.optional(v.array(v.object({
      name: v.string(),
      nameAr: v.optional(v.string()),
      productSlug: v.optional(v.string()),
      image: v.optional(v.string()),
      quantity: v.float64(),
      unitPrice: v.float64(),
      totalPrice: v.float64(),
    }))),
    pricing: v.optional(v.object({
      subtotal: v.number(),
      tax: v.optional(v.number()),
      shipping: v.optional(v.number()),
      total: v.number(),
      currency: v.string(),
    })),
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

// Delete an order (restores stock if order was in a stock-deducted state)
export const deleteOrder = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("Order not found");
    }

    // Restore stock if the order was in a stock-deducted state (not delivered - items already shipped)
    const statusesWithDeductedStock = ["confirmed", "in_production", "ready_for_delivery"];
    if (statusesWithDeductedStock.includes(order.status)) {
      for (const product of order.products) {
        let productId = product.productId;

        // Try to resolve productId if missing
        if (!productId && product.productType) {
          const productType = product.productType as "glassat" | "wsayd" | "coudoir" | "zerbiya" | "majalis_set";
          const matchingProduct = await ctx.db
            .query("products")
            .withIndex("by_product_type", (q) => q.eq("productType", productType))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();
          if (matchingProduct) productId = matchingProduct._id;
        }
        if (!productId && product.productSlug) {
          const matchingProduct = await ctx.db
            .query("products")
            .withIndex("by_slug", (q) => q.eq("slug", product.productSlug!))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();
          if (matchingProduct) productId = matchingProduct._id;
        }

        if (productId) {
          const productData = await ctx.db.get(productId);
          if (productData && productData.inventory.trackInventory) {
            const currentStock = productData.inventory.stockQuantity;
            const newStock = currentStock + product.quantity;

            await ctx.db.patch(productId, {
              inventory: { ...productData.inventory, stockQuantity: newStock },
              updatedAt: Date.now(),
            });

            await ctx.db.insert("inventory", {
              productId,
              operation: "add",
              quantity: product.quantity,
              previousQuantity: currentStock,
              newQuantity: newStock,
              reason: `Order ${order.reference} deleted`,
              notes: `Stock restored due to order deletion (was ${order.status})`,
              performedBy: "system",
              createdAt: Date.now(),
            });
          }
        }
      }

      // === DIRECT PURCHASE: LINKED POUF → FABRIC VARIANT SYNC (restoration on delete) ===
      if (order.orderType === "direct_purchase") {
        for (const product of order.products) {
          let productId = product.productId;
          if (!productId && product.productSlug) {
            const matchingProduct = await ctx.db
              .query("products")
              .withIndex("by_slug", (q) => q.eq("slug", product.productSlug!))
              .first();
            if (matchingProduct) productId = matchingProduct._id;
          }
          if (productId) {
            try {
              const productData = await ctx.db.get(productId);
              if (productData?.linkedFabricVariantId) {
                const fabricVariant = await ctx.db.get(productData.linkedFabricVariantId);
                if (fabricVariant) {
                  const prevPoufQty = fabricVariant.stock.poufs ?? 0;
                  const newPoufQty = prevPoufQty + product.quantity;

                  await ctx.db.patch(productData.linkedFabricVariantId, {
                    stock: { ...fabricVariant.stock, poufs: newPoufQty },
                    updatedAt: Date.now(),
                  });

                  await ctx.db.insert("fabricVariantInventory", {
                    fabricVariantId: productData.linkedFabricVariantId,
                    component: "poufs",
                    operation: "add",
                    quantity: product.quantity,
                    previousQuantity: prevPoufQty,
                    newQuantity: newPoufQty,
                    reason: `Direct purchase order ${order.reference} deleted (was ${order.status})`,
                    performedBy: "system",
                    orderId: args.id,
                    createdAt: Date.now(),
                  });
                }
              }
            } catch (error) {
              console.error("[deleteOrder] Error restoring direct purchase pouf to fabric variant:", error);
            }
          }
        }
      }

      // Also restore stock for the selected Majalis product
      const selectedMajalisDelete = order.selectedMajalisProduct as { productId: Id<"products">; name: string } | undefined;
      if (selectedMajalisDelete?.productId) {
        try {
          const majalisDeleteId = selectedMajalisDelete.productId as Id<"products">;
          const majalisProduct = await ctx.db.get(majalisDeleteId);
          if (majalisProduct && majalisProduct.inventory.trackInventory) {
            const currentStock = majalisProduct.inventory.stockQuantity;
            const newStock = currentStock + 1;

            await ctx.db.patch(majalisDeleteId, {
              inventory: {
                ...majalisProduct.inventory,
                stockQuantity: newStock,
              },
              updatedAt: Date.now(),
            });

            await ctx.db.insert("inventory", {
              productId: majalisDeleteId,
              operation: "add",
              quantity: 1,
              previousQuantity: currentStock,
              newQuantity: newStock,
              reason: `Order ${order.reference} deleted - Majalis restored`,
              notes: `Majalis "${selectedMajalisDelete.name}" restored due to order deletion`,
              performedBy: "system",
              createdAt: Date.now(),
            });
          }
        } catch (error) {
          console.error(`Error restoring Majalis product stock:`, error);
        }
      }

      // Also restore fabric variant stock
      if (order.orderType === "room_measurement") {
        const selectedMajalis = order.selectedMajalisProduct as {
          productId: Id<"products">;
          name: string;
          fabricVariantId?: Id<"fabricVariants">;
          fabricVariantName?: string;
        } | undefined;

        if (selectedMajalis?.fabricVariantId) {
          try {
            const fabricVariant = await ctx.db.get(selectedMajalis.fabricVariantId);
            if (fabricVariant) {
              const calculations = order.calculations;
              if (calculations) {
                const wsaydClassification = classifyWsaydPieces(calculations.wssadaPieces ?? []);

                const restorations: Array<{
                  component: "glssa" | "wsaydRegular" | "wsaydReduced" | "coudoir" | "zerbiya" | "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4" | "poufs";
                  quantity: number;
                }> = [
                  { component: "glssa", quantity: calculations.totalGlassat },
                  { component: "wsaydRegular", quantity: wsaydClassification.regular },
                  { component: "wsaydReduced", quantity: wsaydClassification.reduced },
                  { component: "coudoir", quantity: calculations.totalCoudoir },
                ];

                if (calculations.carpetSelections?.length) {
                  // Multi-carpet: accumulate per baseType
                  const perBase: Record<number, number> = {};
                  for (const cs of calculations.carpetSelections) {
                    perBase[cs.baseTypeConsumed] = (perBase[cs.baseTypeConsumed] || 0) + cs.baseTypeQuantity;
                  }
                  for (const [baseId, qty] of Object.entries(perBase)) {
                    const comp = `zerbiyaType${baseId}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                    restorations.push({ component: comp, quantity: qty });
                  }
                } else if (calculations.carpetSelection) {
                  const comp = `zerbiyaType${calculations.carpetSelection.baseTypeConsumed}` as "zerbiyaType1" | "zerbiyaType2" | "zerbiyaType3" | "zerbiyaType4";
                  restorations.push({ component: comp, quantity: calculations.carpetSelection.baseTypeQuantity });
                } else if (calculations.totalZerbiya > 0) {
                  restorations.push({ component: "zerbiya", quantity: calculations.totalZerbiya });
                }

                // Add poufs restoration
                if (calculations.poufsCount && calculations.poufsCount > 0) {
                  restorations.push({ component: "poufs", quantity: calculations.poufsCount });
                }

                const updatedStock = { ...fabricVariant.stock };

                for (const restoration of restorations) {
                  if (restoration.quantity > 0) {
                    const previousQty = updatedStock[restoration.component] ?? 0;
                    const newQty = previousQty + restoration.quantity;
                    updatedStock[restoration.component] = newQty;

                    await ctx.db.insert("fabricVariantInventory", {
                      fabricVariantId: selectedMajalis.fabricVariantId,
                      component: restoration.component,
                      operation: "add",
                      quantity: restoration.quantity,
                      previousQuantity: previousQty,
                      newQuantity: newQty,
                      reason: `Order ${order.reference} deleted - stock restored`,
                      performedBy: "system",
                      orderId: args.id,
                      createdAt: Date.now(),
                    });
                  }
                }

                await ctx.db.patch(selectedMajalis.fabricVariantId, {
                  stock: updatedStock,
                  updatedAt: Date.now(),
                });

                // === LINKED INDIVIDUAL POUF PRODUCT SYNC (delete restoration) ===
                // If poufs were restored and a linked individual pouf product exists, mirror the restoration
                const poufsRestoration = restorations.find(r => r.component === "poufs");
                if (poufsRestoration && poufsRestoration.quantity > 0) {
                  try {
                    const linkedPoufProducts = await ctx.db
                      .query("products")
                      .filter((q) => q.eq(q.field("linkedFabricVariantId"), selectedMajalis.fabricVariantId))
                      .filter((q) => q.eq(q.field("productType"), "poufs"))
                      .collect();

                    for (const poufProduct of linkedPoufProducts) {
                      if (poufProduct.inventory.trackInventory) {
                        const prevQty = poufProduct.inventory.stockQuantity;
                        const newQty = prevQty + poufsRestoration.quantity;

                        await ctx.db.patch(poufProduct._id, {
                          inventory: { ...poufProduct.inventory, stockQuantity: newQty },
                          updatedAt: Date.now(),
                        });

                        await ctx.db.insert("inventory", {
                          productId: poufProduct._id,
                          operation: "add",
                          quantity: poufsRestoration.quantity,
                          previousQuantity: prevQty,
                          newQuantity: newQty,
                          reason: `Linked sync: salon order ${order.reference} deleted`,
                          notes: `Pouf stock restored via fabric variant link`,
                          performedBy: "system",
                          createdAt: Date.now(),
                        });
                      }
                    }
                  } catch (error) {
                    console.error("[deleteOrder] Error syncing pouf restoration to linked product:", error);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error restoring fabric variant stock on delete:`, error);
          }
        }
      }
    }

    await ctx.db.delete(args.id);
  },
});

// Soft delete an order (sets isDeleted flag instead of removing from DB)
export const softDeleteOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { isDeleted: true });
  },
});

// Restore a soft-deleted order
export const restoreOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { isDeleted: false });
  },
});

// Get recent orders (for dashboard)
export const getRecentOrders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(limit);

    return orders;
  },
});

// Get order statistics
export const getOrderStats = query({
  args: {},
  handler: async (ctx) => {
    const allOrders = await ctx.db.query("orders").collect();

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === "pending_payment").length;
    const confirmedOrders = allOrders.filter(o => o.status === "confirmed").length;
    const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;
    const totalRevenue = allOrders
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + o.pricing.total, 0);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      totalRevenue,
    };
  },
});

// Generate upload URL for design image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get image URL from storage ID
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Update order layout (for manual editor)
export const updateOrderLayout = mutation({
  args: {
    id: v.id("orders"),
    calculations: v.object({
      totalGlassat: v.number(),
      totalWsayd: v.number(),
      totalCoudoir: v.number(),
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
    }),
    layoutVisualization: v.optional(v.object({
      diagramUrl: v.string(),
      measurements: v.optional(v.object({
        totalArea: v.number(),
        usableSpace: v.number(),
        wastedSpace: v.number(),
      })),
    })),
    // Updated optimizationData for exact import
    optimizationData: v.optional(v.any()),
    products: v.optional(v.array(v.object({
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
        v.literal("poufs")
      )),
      quantity: v.number(),
      customDimensions: v.optional(v.object({
        width: v.number(),
        height: v.number(),
        depth: v.optional(v.number()),
      })),
      unitPrice: v.number(),
      totalPrice: v.number(),
    }))),
    pricing: v.optional(v.object({
      subtotal: v.number(),
      tax: v.optional(v.number()),
      shipping: v.optional(v.number()),
      total: v.number(),
      currency: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { id, calculations, layoutVisualization, optimizationData, products, pricing } = args;

    const order = await ctx.db.get(id);
    if (!order) {
      throw new Error("Order not found");
    }

    // Build update object
    const updates: any = {
      calculations,
      updatedAt: Date.now(),
    };

    // If there's a new design image, archive the old one first
    if (layoutVisualization && order.layoutVisualization?.diagramUrl) {
      // Get existing history or create new array
      const existingHistory = (order as any).designHistory || [];
      const nextVersion = existingHistory.length + 1;

      // Archive the current design before replacing
      updates.designHistory = [
        ...existingHistory,
        {
          diagramUrl: order.layoutVisualization.diagramUrl,
          savedAt: Date.now(),
          version: nextVersion,
          editedBy: 'admin',
          note: `Version ${nextVersion} - before edit`,
        }
      ];

      updates.layoutVisualization = layoutVisualization;
    } else if (layoutVisualization) {
      updates.layoutVisualization = layoutVisualization;
    }

    if (optimizationData) {
      updates.optimizationData = optimizationData;
    }

    if (products) {
      updates.products = products;
    }

    if (pricing) {
      updates.pricing = pricing;
    }

    await ctx.db.patch(id, updates);

    return id;
  },
});
