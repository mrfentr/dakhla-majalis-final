import { mutation } from "./_generated/server";

export const seedSampleProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if products already exist
    const existingProducts = await ctx.db.query("products").collect();
    if (existingProducts.length > 0) {
      return { message: "Products already exist", count: existingProducts.length };
    }

    // Sample Product 1: Glassat 90cm
    await ctx.db.insert("products", {
      title: {
        fr: "Glassat Luxe 90cm",
        ar: "گلسة فاخرة 90سم"
      },
      slug: "glssa-90cm",
      description: {
        fr: "Banquette traditionnelle marocaine de haute qualité",
        ar: "گلسة مغربية تقليدية بجودة عالية"
      },
      productType: "glassat",
      category: "accessories",
      image: "https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg",
      specifications: {
        glassat: {
          height: { min: 180, max: 190 },
          width: 90,
          minimumSpaceRequired: 110
        },
        materials: ["قماش قطني فاخر"],
        colors: ["بني", "بيج", "أحمر"],
        patterns: ["تقليدي"]
      },
      pricing: {
        basePrice: 2500,
        currency: "MAD"
      },
      measurementOptions: {
        allowCustomDimensions: false,
        standardSizes: [{
          name: { fr: "Standard 90cm", ar: "قياس 90 سم" },
          dimensions: { width: 90, height: 185 }
        }]
      },
      features: {
        highlights: [
          { fr: "Tissu coton de luxe", ar: "قماش قطني فاخر" },
          { fr: "Rembourrage haute densité", ar: "حشوة عالية الكثافة" },
          { fr: "Design traditionnel", ar: "تصميم تقليدي" }
        ],
        included: [
          { fr: "Garantie 2 ans", ar: "ضمان سنتين" },
          { fr: "Livraison gratuite", ar: "توصيل مجاني" }
        ]
      },
      inventory: {
        stockQuantity: 50,
        lowStockThreshold: 10,
        trackInventory: true,
        allowBackorders: false
      },
      status: "active",
      isPopular: false,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 24,
      createdAt: now,
      updatedAt: now
    });

    // Sample Product 2: Wssada 85cm
    await ctx.db.insert("products", {
      title: {
        fr: "Coussin Marocain 85cm",
        ar: "وسادة مغربية 85سم"
      },
      slug: "wssada-85cm",
      description: {
        fr: "Coussin marocain avec broderie artisanale",
        ar: "وسادة مغربية مع تطريز يدوي"
      },
      productType: "wsayd",
      category: "accessories",
      image: "https://ik.imagekit.io/fentr/marrakech-pass/morocco-1177376_1280.jpg",
      specifications: {
        wsayd: {
          optimalWidth: { min: 85, max: 90 },
          minimumWidth: 60,
          height: 20
        },
        materials: ["قطن", "حرير"],
        colors: ["متعدد الألوان"],
        patterns: ["مطرز يدوياً"]
      },
      pricing: {
        basePrice: 450,
        currency: "MAD"
      },
      measurementOptions: {
        allowCustomDimensions: false,
        standardSizes: [{
          name: { fr: "Standard 85cm", ar: "قياس 85 سم" },
          dimensions: { width: 85, height: 20 }
        }]
      },
      features: {
        highlights: [
          { fr: "Broderie artisanale", ar: "تطريز يدوي" },
          { fr: "Couleurs traditionnelles", ar: "ألوان تراثية" },
          { fr: "Haute qualité", ar: "جودة عالية" }
        ],
        included: [
          { fr: "Garantie 1 an", ar: "ضمان سنة" }
        ]
      },
      inventory: {
        stockQuantity: 100,
        lowStockThreshold: 20,
        trackInventory: true,
        allowBackorders: true
      },
      status: "active",
      isPopular: true,
      isFeatured: false,
      rating: 4.9,
      reviewCount: 42,
      createdAt: now,
      updatedAt: now
    });

    // Sample Product 3: Coudoir
    await ctx.db.insert("products", {
      title: {
        fr: "Coudoir en Bois",
        ar: "كودوار (مسند) خشبي"
      },
      slug: "coudoir",
      description: {
        fr: "Accoudoir en bois naturel",
        ar: "مسند من خشب طبيعي"
      },
      productType: "coudoir",
      category: "accessories",
      image: "https://ik.imagekit.io/fentr/marrakech-pass/marrakech-4409009_1280.jpg",
      specifications: {
        materials: ["خشب طبيعي"],
        colors: ["بني داكن", "بني فاتح"],
        patterns: ["كلاسيكي"]
      },
      pricing: {
        basePrice: 380,
        currency: "MAD"
      },
      measurementOptions: {
        allowCustomDimensions: false,
        standardSizes: [{
          name: { fr: "Standard", ar: "قياس عادي" },
          dimensions: { width: 19, height: 30 }
        }]
      },
      features: {
        highlights: [
          { fr: "Bois naturel", ar: "خشب طبيعي" },
          { fr: "Design ergonomique", ar: "تصميم مريح" },
          { fr: "Durable", ar: "متين" }
        ],
        included: [
          { fr: "Garantie 2 ans", ar: "ضمان سنتين" }
        ]
      },
      inventory: {
        stockQuantity: 75,
        lowStockThreshold: 15,
        trackInventory: true,
        allowBackorders: false
      },
      status: "active",
      isPopular: false,
      isFeatured: false,
      rating: 4.7,
      reviewCount: 18,
      createdAt: now,
      updatedAt: now
    });

    return { message: "Sample products created successfully", count: 3 };
  }
});
