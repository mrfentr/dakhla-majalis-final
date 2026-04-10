import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all gallery images ordered by order field
export const getGalleryImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("galleryImages").withIndex("by_order").collect();
  },
});

// Add multiple gallery images at once (bulk)
export const addGalleryImages = mutation({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("galleryImages").collect();
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((i) => i.order)) : 0;
    const now = Date.now();

    const ids = [];
    for (let i = 0; i < args.urls.length; i++) {
      const id = await ctx.db.insert("galleryImages", {
        url: args.urls[i],
        order: maxOrder + i + 1,
        createdAt: now,
      });
      ids.push(id);
    }

    return { count: ids.length, ids };
  },
});

// Delete multiple gallery images at once (bulk)
export const deleteGalleryImages = mutation({
  args: {
    ids: v.array(v.id("galleryImages")),
  },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return { deleted: args.ids.length };
  },
});

// Seed gallery images from the hardcoded list
export const seedGalleryImages = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("galleryImages").collect();
    if (existing.length > 0) {
      return { message: "Gallery images already exist", count: existing.length };
    }

    const now = Date.now();
    const urls = [
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1115.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0037.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0208.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0242.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0245.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0286.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0293.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0368.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0373.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1155.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1208.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1209.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1220.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1285.png?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20250112-WA0018.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_1545.JPG?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250406_155436.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250406_173853.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_175007.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_175959.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250413_180250.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_165455.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250419_160842.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250610_071437.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_165504.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250615_170028.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250621_193001.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250621_194523.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250415_103510.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250415_110555.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250504_123351.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG_0430.jpeg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250502_183743.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250502_184107.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250504_171616.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_111217.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_111845.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_114330.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250522_120119.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20240614-WA0130.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/IMG-20240614-WA0131.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/4W8A1659%20v2.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20241123_171706.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20241123_173103.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_133307.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20240814_140213.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20240814_141300.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_133146.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250117_192013.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250118_180348.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250118_181617.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250119_133300.jpg?tr=w-800,f-auto,q-80",
      "https://ik.imagekit.io/fentr/dakhla%20majalis/20250119_133519.jpg?tr=w-800,f-auto,q-80",
    ];

    const ids = [];
    for (let i = 0; i < urls.length; i++) {
      const id = await ctx.db.insert("galleryImages", {
        url: urls[i],
        order: i + 1,
        createdAt: now,
      });
      ids.push(id);
    }

    return { message: `Seeded ${ids.length} gallery images`, count: ids.length };
  },
});
