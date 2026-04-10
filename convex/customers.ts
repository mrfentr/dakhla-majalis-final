import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all customers
export const getCustomers = query({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").order("desc").collect();
    return customers;
  },
});

// Get customer by email
export const getCustomerByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return customer;
  },
});

// Get customer by ID
export const getCustomerById = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new customer
export const createCustomer = mutation({
  args: {
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if customer already exists
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingCustomer) {
      return existingCustomer._id;
    }

    const now = Date.now();

    const customerId = await ctx.db.insert("customers", {
      ...args,
      orderHistory: [],
      createdAt: now,
      updatedAt: now,
    });

    return customerId;
  },
});

// Update a customer
export const updateCustomer = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    addresses: v.optional(v.array(v.object({
      street: v.string(),
      city: v.string(),
      region: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.string(),
      isDefault: v.optional(v.boolean()),
    }))),
    language: v.optional(v.union(v.literal("fr"), v.literal("ar"), v.literal("en"))),
    notes: v.optional(v.string()),
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

// Delete a customer (permanent)
export const deleteCustomer = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Soft delete a customer (moves to trash)
export const softDeleteCustomer = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.customerId, { isDeleted: true });
  },
});

// Restore a soft-deleted customer
export const restoreCustomer = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.customerId, { isDeleted: false });
  },
});

// Add order to customer history
export const addOrderToCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const orderHistory = customer.orderHistory || [];
    orderHistory.push(args.orderId);

    await ctx.db.patch(args.customerId, {
      orderHistory,
      updatedAt: Date.now(),
    });

    return args.customerId;
  },
});

// Get customer orders
export const getCustomerOrders = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || !customer.orderHistory) {
      return [];
    }

    const orders = await Promise.all(
      customer.orderHistory.map(async (orderId) => {
        return await ctx.db.get(orderId);
      })
    );

    return orders.filter(order => order !== null);
  },
});
