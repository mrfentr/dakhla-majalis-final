import { mutation } from "./_generated/server";

/**
 * One-time mutation to add English (and fix French) translations for all
 * products, categories, and fabric variants.
 *
 * Many products have Arabic text in the `fr` field. This mutation:
 * 1. Adds proper English translations
 * 2. Adds proper French translations where `fr` is actually Arabic
 *
 * Run via CLI: npx convex run translateAll:translateAllToEnglish
 */

// ============================================
// TRANSLATION DICTIONARIES
// ============================================

// Arabic title/name → { en, fr } translations
// These are the actual product names from the database
const AR_TRANSLATIONS: Record<string, { en: string; fr: string }> = {
  // === Majalis sets (named after Dakhla region places) ===
  "مجلس بئر أنزران -لون أحمر": {
    en: "Bir Anzarane Majlis - Red",
    fr: "Majlis Bir Anzarane - Rouge",
  },
  "مجلس الكركرات - لون أحمر": {
    en: "El Guerguerat Majlis - Red",
    fr: "Majlis El Guerguerat - Rouge",
  },
  "مجلس الكركرات - لون أحمر ": {
    en: "El Guerguerat Majlis - Red",
    fr: "Majlis El Guerguerat - Rouge",
  },
  "مجلس العيون - لون أزرق غامق": {
    en: "Laayoune Majlis - Dark Blue",
    fr: "Majlis Laâyoune - Bleu foncé",
  },
  "مجلس تاورطة - لون أخضر": {
    en: "Taourta Majlis - Green",
    fr: "Majlis Taourta - Vert",
  },
  "مجلس جزيرة التنين - لون أزرق": {
    en: "Dragon Island Majlis - Blue",
    fr: "Majlis Île du Dragon - Bleu",
  },
  "مجلس الغريد - لون تيركواز": {
    en: "El Ghrid Majlis - Turquoise",
    fr: "Majlis El Ghrid - Turquoise",
  },
  "مجلس لاسارگا- لون غرونا": {
    en: "Lasarga Majlis - Grona",
    fr: "Majlis Lasarga - Grona",
  },
  "مجلس رضاة الوليدين - لون بيج": {
    en: "Ridaat El Walidayn Majlis - Beige",
    fr: "Majlis Ridaat El Walidayn - Beige",
  },

  // === Other products ===
  "جلسة الفخامة للخرجات- جودة عالية بتصميم عملي وصناعة محلية 100": {
    en: "Luxury Outdoor Seating - High Quality, Practical Design, 100% Local Craftsmanship",
    fr: "Salon extérieur de luxe - Haute qualité, design pratique, fabrication locale 100%",
  },
  "خيمة تقليدية 100% من شعر الماعز – مقاس 3.30m × 2m": {
    en: "Traditional Tent 100% Goat Hair - Size 3.30m × 2m",
    fr: "Tente traditionnelle 100% poil de chèvre - Taille 3.30m × 2m",
  },
  "طاولة الخرجات-لوحة فنية من الريزين على خشب": {
    en: "Outdoor Table - Resin Art on Wood",
    fr: "Table d'extérieur - Art en résine sur bois",
  },
  "طقم  سرير \"التراث الأصيل\"": {
    en: '"Authentic Heritage" Bedding Set',
    fr: 'Parure de lit "Patrimoine Authentique"',
  },
  'طقم  سرير \u201Cالتراث الأصيل\u201D': {
    en: '"Authentic Heritage" Bedding Set',
    fr: 'Parure de lit "Patrimoine Authentique"',
  },
  "جلسة  شاي صحراوية": {
    en: "Saharan Tea Seating",
    fr: "Salon de thé saharien",
  },
  "جلسة القراءة- باللون الأحمر": {
    en: "Reading Corner Seating - Red",
    fr: "Coin lecture - Rouge",
  },
  "جلسة القراءة- باللون الأحمر ": {
    en: "Reading Corner Seating - Red",
    fr: "Coin lecture - Rouge",
  },
  "الفرشة الملكية للخرجات - باللون الأحمر": {
    en: "Royal Outdoor Mattress - Red",
    fr: "Matelas royal d'extérieur - Rouge",
  },
  "طبلة نحاسية منقوشة يدويا": {
    en: "Hand-Engraved Brass Table",
    fr: "Table en laiton gravée à la main",
  },
  "بوف تقليدي باللون الأحمر": {
    en: "Traditional Pouf - Red",
    fr: "Pouf traditionnel - Rouge",
  },
};

// Arabic description → { en, fr }
const AR_DESC_TRANSLATIONS: Record<string, { en: string; fr: string }> = {
  "گلسة مغربية تقليدية بجودة عالية": {
    en: "High-quality traditional Moroccan floor seating",
    fr: "Banquette traditionnelle marocaine de haute qualité",
  },
  "وسادة مغربية مع تطريز يدوي": {
    en: "Moroccan cushion with handcrafted embroidery",
    fr: "Coussin marocain avec broderie artisanale",
  },
  "مسند من خشب طبيعي": {
    en: "Natural wood armrest",
    fr: "Accoudoir en bois naturel",
  },
  "العنصر الأساسي للصالون المغربي - قلصة": {
    en: "Main element of the Moroccan living room - Glassat",
    fr: "Élément principal du salon marocain - Glassat",
  },
  "وسادة مريحة لصالونك": {
    en: "Comfortable cushion for your living room",
    fr: "Coussin confortable pour votre salon",
  },
  "مسند ذراع أنيق لمزيد من الراحة": {
    en: "Elegant armrest for extra comfort",
    fr: "Accoudoir élégant pour plus de confort",
  },
  "سجادة مغربية تقليدية": {
    en: "Traditional Moroccan carpet",
    fr: "Tapis traditionnel marocain",
  },
};

// Arabic features → { en, fr }
const AR_FEATURE_TRANSLATIONS: Record<string, { en: string; fr: string }> = {
  "قماش قطني فاخر": { en: "Luxury cotton fabric", fr: "Tissu coton de luxe" },
  "حشوة عالية الكثافة": { en: "High-density padding", fr: "Rembourrage haute densité" },
  "تصميم تقليدي": { en: "Traditional design", fr: "Design traditionnel" },
  "تطريز يدوي": { en: "Handcrafted embroidery", fr: "Broderie artisanale" },
  "ألوان تراثية": { en: "Heritage colors", fr: "Couleurs traditionnelles" },
  "جودة عالية": { en: "High quality", fr: "Haute qualité" },
  "خشب طبيعي": { en: "Natural wood", fr: "Bois naturel" },
  "تصميم مريح": { en: "Ergonomic design", fr: "Design ergonomique" },
  "متين": { en: "Durable", fr: "Durable" },
  "ضمان سنتين": { en: "2-year warranty", fr: "Garantie 2 ans" },
  "ضمان سنة": { en: "1-year warranty", fr: "Garantie 1 an" },
  "توصيل مجاني": { en: "Free delivery", fr: "Livraison gratuite" },
  "صناعة محلية": { en: "Local craftsmanship", fr: "Fabrication locale" },
  "صناعة يدوية": { en: "Handmade", fr: "Fait main" },
  "تصميم عصري": { en: "Modern design", fr: "Design moderne" },
  "مريح": { en: "Comfortable", fr: "Confortable" },
  "أنيق": { en: "Elegant", fr: "Élégant" },
};

// French → English (for products that do have correct French)
const FR_EN: Record<string, string> = {
  // Product titles
  "Glassat Luxe 90cm": "Luxury Glassat 90cm",
  "Glassat": "Glassat (Floor Cushion Base)",
  "Glassat (Floor Cushion Base)": "Glassat (Floor Cushion Base)",
  "Coussin Marocain 85cm": "Moroccan Cushion 85cm",
  "Coudoir en Bois": "Wooden Armrest",
  "Coudoir": "Armrest",
  "Wsada": "Cushion",
  "Cushion": "Cushion",
  "Armrest": "Armrest",
  "Zerbiya": "Carpet",
  "Carpet": "Carpet",

  // Product descriptions
  "Banquette traditionnelle marocaine de haute qualité": "High-quality traditional Moroccan floor seating",
  "Coussin marocain avec broderie artisanale": "Moroccan cushion with handcrafted embroidery",
  "Accoudoir en bois naturel": "Natural wood armrest",
  "Élément principal du salon marocain - Glassat": "Main element of the Moroccan living room - Glassat",
  "Coussin confortable pour votre salon": "Comfortable cushion for your living room",
  "Accoudoir élégant pour plus de confort": "Elegant armrest for extra comfort",
  "Tapis traditionnel marocain": "Traditional Moroccan carpet",

  // Features
  "Tissu coton de luxe": "Luxury cotton fabric",
  "Rembourrage haute densité": "High-density padding",
  "Design traditionnel": "Traditional design",
  "Broderie artisanale": "Handcrafted embroidery",
  "Couleurs traditionnelles": "Traditional colors",
  "Haute qualité": "High quality",
  "Bois naturel": "Natural wood",
  "Design ergonomique": "Ergonomic design",
  "Durable": "Durable",
  "Garantie 2 ans": "2-year warranty",
  "Garantie 1 an": "1-year warranty",
  "Livraison gratuite": "Free delivery",

  // Categories
  "Majalis sur mesure": "Custom Majalis",
  "Majalis prêts": "Ready-made Majalis",
  "Salons extérieurs": "Outdoor Seating",
  "Tentes traditionnelles": "Traditional Tents",
  "Accessoires et décor": "Accessories & Decor",
};

// Standard size names
const SIZE_TRANSLATIONS: Record<string, { en: string; fr: string }> = {
  "قياس 90 سم": { en: "Standard 90cm", fr: "Standard 90cm" },
  "قياس 85 سم": { en: "Standard 85cm", fr: "Standard 85cm" },
  "قياس عادي": { en: "Standard", fr: "Standard" },
  "Standard 90cm": { en: "Standard 90cm", fr: "Standard 90cm" },
  "Standard 85cm": { en: "Standard 85cm", fr: "Standard 85cm" },
  "Standard": { en: "Standard", fr: "Standard" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Check if a string contains Arabic characters */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/** Normalize text for fuzzy matching - collapse whitespace, trim */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Translate a text - try Arabic dict first, then French dict, then return as-is */
function translate(text: string, arDict: Record<string, { en: string; fr: string }>, frDict: Record<string, string>): { en: string; fr: string } {
  const norm = normalize(text);

  // Try Arabic dictionary (exact, trimmed, normalized)
  if (arDict[text]) return { en: arDict[text].en, fr: arDict[text].fr };
  if (arDict[norm]) return { en: arDict[norm].en, fr: arDict[norm].fr };

  // Fuzzy: try normalized keys
  for (const [key, val] of Object.entries(arDict)) {
    if (normalize(key) === norm) return { en: val.en, fr: val.fr };
  }

  // Try French dictionary
  if (frDict[text]) return { en: frDict[text], fr: text };
  if (frDict[norm]) return { en: frDict[norm], fr: norm };
  for (const [key, val] of Object.entries(frDict)) {
    if (normalize(key) === norm) return { en: val, fr: text };
  }

  // Fallback: return text as-is for both
  return { en: text, fr: text };
}

/** Build a complete { ar, fr, en } object with translations */
function translateField(
  obj: { fr: string; ar: string; en?: string },
  arDict: Record<string, { en: string; fr: string }>,
  frDict: Record<string, string>
): { fr: string; ar: string; en: string } {
  // Try translating from Arabic first (since many fr fields have Arabic)
  const fromAr = translate(obj.ar, arDict, frDict);
  // Also try from French
  const fromFr = translate(obj.fr, arDict, frDict);

  // Determine the best English
  // If existing en is Arabic, it's a bad first-run translation - don't keep it
  const existingEn = obj.en && !isArabic(obj.en) ? obj.en : null;
  const en = fromAr.en !== obj.ar ? fromAr.en : (fromFr.en !== obj.fr ? fromFr.en : (existingEn || obj.fr));

  // Fix French if it's actually Arabic
  const fr = isArabic(obj.fr) ? (fromAr.fr !== obj.ar ? fromAr.fr : obj.fr) : obj.fr;

  return { ar: obj.ar, fr, en };
}

/** Translate a feature item */
function translateFeatureItem(
  item: { fr: string; ar: string; en?: string }
): { fr: string; ar: string; en: string } {
  return translateField(item, AR_FEATURE_TRANSLATIONS, FR_EN);
}

export const translateAllToEnglish = mutation({
  // @deprecated - Use fixFrenchEnglishTranslations instead
  args: {},
  handler: async (ctx) => {
    const results = {
      products: { updated: 0, skipped: 0, details: [] as string[] },
      categories: { updated: 0, skipped: 0, details: [] as string[] },
      fabricVariants: { updated: 0, skipped: 0, details: [] as string[] },
    };

    // ========================================
    // 1. TRANSLATE PRODUCTS
    // ========================================
    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      const updates: Record<string, any> = {};

      // Title - update if en is Arabic or fr is Arabic or en differs
      const newTitle = translateField(product.title, AR_TRANSLATIONS, FR_EN);
      const titleNeedsUpdate = newTitle.en !== product.title.en
        || newTitle.fr !== product.title.fr
        || (product.title.en && isArabic(product.title.en)); // fix bad first-run translations
      if (titleNeedsUpdate) {
        updates.title = newTitle;
      }

      // Description
      const newDesc = translateField(product.description, AR_DESC_TRANSLATIONS, FR_EN);
      const descNeedsUpdate = newDesc.en !== product.description.en
        || newDesc.fr !== product.description.fr
        || (product.description.en && isArabic(product.description.en));
      if (descNeedsUpdate) {
        updates.description = newDesc;
      }

      // Content
      if (product.content) {
        const newContent = translateField(product.content, AR_DESC_TRANSLATIONS, FR_EN);
        if (newContent.en !== product.content.en || newContent.fr !== product.content.fr) {
          updates.content = newContent;
        }
      }

      // Features
      if (product.features) {
        const newFeatures: any = { ...product.features };
        let featuresChanged = false;

        if (product.features.highlights) {
          const newHighlights = product.features.highlights.map(translateFeatureItem);
          if (JSON.stringify(newHighlights) !== JSON.stringify(product.features.highlights)) {
            newFeatures.highlights = newHighlights;
            featuresChanged = true;
          }
        }
        if (product.features.included) {
          const newIncluded = product.features.included.map(translateFeatureItem);
          if (JSON.stringify(newIncluded) !== JSON.stringify(product.features.included)) {
            newFeatures.included = newIncluded;
            featuresChanged = true;
          }
        }
        if (product.features.notIncluded) {
          const newNotIncluded = product.features.notIncluded.map(translateFeatureItem);
          if (JSON.stringify(newNotIncluded) !== JSON.stringify(product.features.notIncluded)) {
            newFeatures.notIncluded = newNotIncluded;
            featuresChanged = true;
          }
        }
        if (product.features.careInstructions) {
          const newCare = product.features.careInstructions.map(translateFeatureItem);
          if (JSON.stringify(newCare) !== JSON.stringify(product.features.careInstructions)) {
            newFeatures.careInstructions = newCare;
            featuresChanged = true;
          }
        }

        if (featuresChanged) {
          updates.features = newFeatures;
        }
      }

      // Measurement option standard sizes
      if (product.measurementOptions?.standardSizes) {
        const newSizes = product.measurementOptions.standardSizes.map((s: any) => {
          const nameKey = s.name.ar || s.name.fr;
          const sizeTranslation = SIZE_TRANSLATIONS[nameKey] || SIZE_TRANSLATIONS[s.name.fr];
          if (sizeTranslation) {
            return { ...s, name: { ...s.name, en: sizeTranslation.en, fr: sizeTranslation.fr } };
          }
          return { ...s, name: { ...s.name, en: s.name.en || s.name.fr } };
        });
        if (JSON.stringify(newSizes) !== JSON.stringify(product.measurementOptions.standardSizes)) {
          updates.measurementOptions = { ...product.measurementOptions, standardSizes: newSizes };
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(product._id, { ...updates, updatedAt: Date.now() });
        results.products.updated++;
        const titleInfo = updates.title
          ? `"${product.title.ar}" → en:"${updates.title.en}" fr:"${updates.title.fr}"`
          : `"${product.title.fr}" (no title change)`;
        results.products.details.push(titleInfo);
      } else {
        results.products.skipped++;
      }
    }

    // ========================================
    // 2. TRANSLATE CATEGORIES
    // ========================================
    const categories = await ctx.db.query("categories").collect();

    for (const category of categories) {
      const newName = translateField(category.name, AR_TRANSLATIONS, FR_EN);
      if (newName.en !== category.name.en || newName.fr !== category.name.fr || (category.name.en && isArabic(category.name.en))) {
        await ctx.db.patch(category._id, { name: newName, updatedAt: Date.now() });
        results.categories.updated++;
        results.categories.details.push(`"${category.name.fr}" → en:"${newName.en}"`);
      } else {
        results.categories.skipped++;
      }
    }

    // ========================================
    // 3. TRANSLATE FABRIC VARIANTS
    // ========================================
    const fabricVariants = await ctx.db.query("fabricVariants").collect();

    for (const variant of fabricVariants) {
      const newName = translateField(variant.name, AR_TRANSLATIONS, FR_EN);
      if (newName.en !== variant.name.en || newName.fr !== variant.name.fr || (variant.name.en && isArabic(variant.name.en))) {
        await ctx.db.patch(variant._id, { name: newName, updatedAt: Date.now() });
        results.fabricVariants.updated++;
        results.fabricVariants.details.push(`"${variant.name.ar}" → en:"${newName.en}" fr:"${newName.fr}"`);
      } else {
        results.fabricVariants.skipped++;
      }
    }

    return {
      message: `Translation complete! Products: ${results.products.updated} updated, ${results.products.skipped} skipped. Categories: ${results.categories.updated} updated, ${results.categories.skipped} skipped. Fabric Variants: ${results.fabricVariants.updated} updated, ${results.fabricVariants.skipped} skipped.`,
      ...results,
    };
  },
});

// ============================================
// FIX FRENCH & ENGLISH TRANSLATIONS
// ============================================
// Many product descriptions (and some en fields) still contain Arabic text.
// This mutation provides hardcoded, professional French and English translations
// for every product description that currently has Arabic in its fr/en fields.
//
// Run via CLI:  npx convex run translateAll:fixFrenchEnglishTranslations

// ---------- description dictionaries keyed by product slug ----------

const DESC_FR_BY_SLUG: Record<string, string> = {
  // --- Majalis sets ---
  "mjls-b-r-anzran-lwn-ahmr":
    "Majlis Bir Anzarane en rouge royal, confectionné avec un tissu haut de gamme orné de motifs sahariens traditionnels, d'une hauteur de 15 cm et d'une largeur de 70 cm.\nUne pièce qui ajoute prestige et beauté saharienne à tout espace : salon, séjour, balcon ou tente.",

  "mjls-alkrkrat-lwn-ahmr":
    "Un majlis élégant alliant le luxe saharien à une qualité supérieure, léger et facile à nettoyer. Dimensions : 70 cm de largeur et 15 cm de hauteur, ce qui le rend pratique et confortable dans tout espace : salon, séjour, balcon ou tente.",

  "mjls-alaywn-lwn-azrq-ghamq":
    "Un majlis élégant en bleu nuit luxueux, fabriqué avec un tissu de haute qualité, léger et facile à entretenir. Dimensions : 70 cm de largeur et 15 cm de hauteur. Une assise au sol saine qui favorise une bonne posture et un confort naturel. Il apporte une touche raffinée à tout espace intérieur ou sous tente.",

  "mjls-tawrth-lwn-akhdr":
    "Assise au sol luxueuse au design pratique et léger, fabriquée avec un tissu de haute qualité et facile à entretenir. Offre une assise saine et confortable aux dimensions de 70 cm de largeur et 15 cm de hauteur.\nUne touche saharienne élégante qui ajoute valeur et beauté à tout espace de la maison ou de la tente.",

  "mjls-jzyrh-altnyn-lwn-azrq":
    "Un majlis bleu qui apporte calme et élégance à votre espace. Fabriqué avec un tissu de haute qualité, léger et facile à nettoyer, il offre une assise au sol saine qui renforce le confort et la bonne posture.\n\nDimensions : 70 cm de largeur et 15 cm de hauteur, idéal pour le salon, le séjour, le balcon ou la tente.\n\nLe majlis bleu… un choix qui allie beauté, qualité et confort.",

  "mjls-alghryd-lwn-tyrkwaz":
    "Tissu coton tissé et résistant avec un rembourrage Dolidol 5 empreintes pour un confort luxueux et durable. Design pratique, léger et facile à nettoyer.\nAssise au sol saine qui soutient le corps naturellement. Décoré sur les deux faces pour plus d'attrait, aux dimensions de 70 cm de largeur et 15 cm de hauteur, adapté à tous les espaces.",

  "mjls-lasar-a-lwn-ghrwna":
    "Une assise traditionnelle alliant authenticité et luxe, qui confère à l'espace une sensation de chaleur et de raffinement.\nCôté qualité, la mousse haute densité garantit une assise confortable et une excellente stabilité sans affaissement même après une utilisation prolongée, ce qui en fait un choix idéal pour recevoir vos invités et pour de longues heures de confort.",

  "mjls-rdah-alwlydyn-lwn-byj":
    "Léger et facile à transporter, avec un tissu pratique et facile à nettoyer. Son coloris beige élégant s'harmonise avec tout type de décoration. Et le plus beau ? C'est le majlis que nos abonnés ont choisi pour meubler la maison de ma mère. Un choix qui reflète le bon goût et la confiance en la qualité de nos produits.",

  // --- Outdoor / accessories ---
  "jlsh-alfkhamh-llkhrjat-jwdh-aalyh-btsmym-amly-wsnaah-mhlyh-100":
    "1- Matériaux de fabrication :\n✔️ Tissu coton tissé\n✔️ Mousse Souplesse Dolidol pour le confort et la durabilité\n✔️ Bois MDF pour la stabilité et l'équilibre de l'assise\n✔️ Bâche imperméable sous le tapis et l'assise pour une protection supplémentaire\n\n2- Composants de l'assise :\n\t•\t👈 4 assises pliables\n\t•\t👈 4 accoudoirs confortables\n\t•\t👈 Tapis 2m × 3m\n\t•\t👈 3 sacs d'emballage pour faciliter le transport et le rangement\n\n3- Caractéristiques :\n✨ Facile à laver et à nettoyer\n✨ Pratique, légère et facile à transporter et ranger\n✨ Capacité de 6 personnes confortablement\n✨ Se range facilement dans le coffre de la voiture",

  "khymh-tqlydyh-100-mn-shar-almaaz-mqas-3-30m-2m":
    "Tente traditionnelle authentique inspirée de l'esprit du Sahara, entièrement fabriquée en poil de chèvre tissé à la main, alliant authenticité, durabilité et praticité.\nConçue pour les fêtes, les réunions familiales et la décoration extérieure haut de gamme.\nOuvrable sur quatre côtés, elle accueille de 6 à 8 personnes.\nÉquipée d'une assise saharienne complète et livrée avec tous les accessoires de montage (bâtons, cordes, piquets…). Pratique, robuste et facile à installer.",

  "tawlh-alkhrjat-lwhh-fnyh-mn-alryzyn-ala-khshb":
    "Table de pique-nique en bois, légère et pratique, dotée d'un plateau artistique peint à la main en résine aux couleurs de la mer. Idéale pour les sorties et les assises sahariennes, elle apporte une touche esthétique unique où qu'elle soit posée.\nElle allie authenticité, praticité et légèreté, et se transporte facilement pour s'intégrer au centre de toute assise avec une touche raffinée.",

  "tqm-sryr-altrath-alasyl":
    "Une touche artistique inspirée des profondeurs de la culture marocaine, alliant couleurs chaudes et motifs traditionnels qui ajoutent luxe et identité à votre chambre.\n\nLe set comprend :\n\nDeux coussins de 40×40 cm au design traditionnel harmonisé avec les couleurs et motifs de la collection.\n\nUn tapis traditionnel de 2m × 1m confectionné avec soin, apportant beauté et élégance à votre lit et transformant la chambre en un espace chaleureux et authentique.\n\nCaractéristiques :\n\nMotifs inspirés du patrimoine marocain authentique\n\nCouleurs élégantes qui apportent vie et chaleur à l'espace\n\nMatériaux confortables et faciles à entretenir\n\nDesign luxueux adapté aux chambres modernes et traditionnelles\n\nIdéal comme cadeau raffiné ou pour ajouter une touche déco à votre chambre",

  "jlsh-shay-shrawyh":
    "Assise à thé saharienne élégante alliant confort et authenticité, conçue spécialement pour les organisateurs d'événements en quête d'une touche traditionnelle dans leur décor, et pour les amateurs de thé souhaitant aménager un coin raffiné chez eux pour préparer le thé dans le calme et la beauté.\n\nÉgalement idéale pour les propriétaires de cafés et d'espaces culturels souhaitant ajouter un coin reflétant l'identité marocaine et attirant les clients par une expérience unique.\n\n- Composants de l'assise :\n\nAssise au sol confortable de 95×70 cm\n\nTapis traditionnel de 2×1 m\n\nDeux coussins de sol de 60×43 cm\n\n- Caractéristiques du produit :\n\nDesign inspiré du patrimoine saharien\n\nIdéale pour la décoration, les fêtes, les séances photo et l'hospitalité\n\nPratique et facile à installer dans tout espace\n\nApporte chaleur et charme traditionnel distinctif",

  "jlsh-alqraah-ballwn-alahmr":
    "Assise de lecture – 95 × 70 × 10 cm\nAssise au sol confortable au design pratique et compact, idéale pour la lecture et la détente quotidienne. Elle offre un soutien équilibré au corps, facilite les longues heures de lecture confortablement, et convient aux coins calmes et aux chambres, avec une touche élégante qui ajoute de la chaleur à l'espace.",

  "alfrshh-almlkyh-llkhrjat-ballwn-alahmr":
    "Matelas raffiné au design traditionnel luxueux, compagnon idéal dans votre voiture. Utilisable lors des excursions, à la plage, dans les jardins, les réunions familiales et les séances de thé en plein air. Il allie facilité de transport et élégance pour une expérience raffinée où que vous choisissiez de profiter de votre temps.\n\nDimensions : 200 cm × 70 cm",

  "tblh-nhasyh-mnqwshh-ydwya":
    "Chef-d'œuvre traditionnel fabriqué avec soin en laiton, orné de gravures manuelles minutieuses reflétant le savoir-faire de l'artisan et la beauté du patrimoine. Pièce raffinée adaptée à l'usage quotidien ou comme élément de décoration luxueux apportant une touche authentique et une élégance chaleureuse à tout espace.\n* Dimensions : 70 cm × 35 cm",

  "pouf-traditionnel":
    "Pouf traditionnel élégant en rouge, inspiré du style saharien authentique, alliant confort et esthétique. Son design pratique s'adapte aux majlis traditionnels comme au décor contemporain, avec un rembourrage confortable qui conserve sa forme durablement.\nIdéal pour le salon, le séjour ou les espaces de réception, il apporte chaleur et luxe à votre intérieur.\n📏 Dimensions : 60×60×20 cm",
};

const DESC_EN_BY_SLUG: Record<string, string> = {
  // --- Majalis sets ---
  "mjls-b-r-anzran-lwn-ahmr":
    "Bir Anzarane Majlis in royal red, crafted from premium fabric with traditional Saharan embroidery, 15 cm in height and 70 cm in width.\nA piece that adds prestige and Saharan beauty to any space: living room, lounge, balcony, or tent.",

  "mjls-alkrkrat-lwn-ahmr":
    "An elegant majlis combining Saharan luxury with high quality, lightweight and easy to clean. Dimensions: 70 cm wide and 15 cm high, making it practical and comfortable in any space: living room, lounge, balcony, or tent.",

  "mjls-alaywn-lwn-azrq-ghamq":
    "An elegant majlis in luxurious midnight blue, made from high-quality fabric, lightweight and easy to clean. Dimensions: 70 cm wide and 15 cm high. A healthy floor seating that promotes good posture and natural comfort. It adds a refined touch to any indoor space or tent.",

  "mjls-tawrth-lwn-akhdr":
    "Luxurious floor seating with a practical and lightweight design, made from high-quality, easy-to-clean fabric. Provides healthy and comfortable seating at 70 cm wide and 15 cm high.\nAn elegant Saharan touch that adds value and beauty to any space in the home or tent.",

  "mjls-jzyrh-altnyn-lwn-azrq":
    "A blue majlis that brings calm and elegance to your space. Made from high-quality fabric, lightweight and easy to clean, it offers healthy floor seating that enhances comfort and good posture.\n\nDimensions: 70 cm wide and 15 cm high, perfect for the living room, lounge, balcony, or tent.\n\nThe blue majlis… a choice that combines beauty, quality, and comfort.",

  "mjls-alghryd-lwn-tyrkwaz":
    "Woven and durable cotton fabric with Dolidol 5-print padding for lasting luxurious comfort. Practical, lightweight, and easy-to-clean design.\nHealthy floor seating that naturally supports the body. Decorated on both sides for added appeal, measuring 70 cm wide and 15 cm high, suitable for all spaces.",

  "mjls-lasar-a-lwn-ghrwna":
    "A traditional seating that blends authenticity with luxury, giving the space a warm and refined feel.\nAs for quality, the high-density foam ensures comfortable seating and excellent stability without sagging over time, making it ideal for hosting guests and for long hours of comfortable sitting.",

  "mjls-rdah-alwlydyn-lwn-byj":
    "Lightweight and easy to carry with practical, easy-to-clean fabric. Its elegant beige color harmonizes with any decor. And the best part? This is the majlis our followers chose for us to furnish my mother's home. A choice that reflects good taste and confidence in the quality of our products.",

  // --- Outdoor / accessories ---
  "jlsh-alfkhamh-llkhrjat-jwdh-aalyh-btsmym-amly-wsnaah-mhlyh-100":
    "1- Manufacturing Materials:\n✔️ Woven cotton fabric\n✔️ Souplesse Dolidol foam for comfort and durability\n✔️ MDF wood for stability and balance\n✔️ Waterproof tarpaulin under the carpet and seating for extra protection\n\n2- Seating Components:\n\t•\t👈 4 foldable seats\n\t•\t👈 4 comfortable armrests\n\t•\t👈 Carpet 2m × 3m\n\t•\t👈 3 packaging bags for easy transport and storage\n\n3- Features:\n✨ Easy to wash and clean\n✨ Practical, lightweight, and easy to transport and store\n✨ Comfortably seats 6 people\n✨ Fits easily in the car trunk",

  "khymh-tqlydyh-100-mn-shar-almaaz-mqas-3-30m-2m":
    "Authentic traditional tent inspired by the spirit of the Sahara, entirely handwoven from goat hair, combining authenticity, durability, and practicality.\nDesigned for parties, family gatherings, and premium outdoor decoration.\nOpenable on four sides, accommodating 6–8 people.\nEquipped with a complete Saharan seating set and comes with all installation accessories (sticks, ropes, stakes…). Practical, sturdy, and easy to set up.",

  "tawlh-alkhrjat-lwhh-fnyh-mn-alryzyn-ala-khshb":
    "Lightweight and practical wooden picnic table with a hand-painted resin art surface in ocean colors. Perfect for outings and Saharan seating, it adds a unique aesthetic touch wherever it is placed.\nIt combines authenticity, practicality, and lightness, and can be easily carried to the center of any seating arrangement for a refined touch.",

  "tqm-sryr-altrath-alasyl":
    "An artistic touch inspired by the depths of Moroccan culture, combining warm colors and traditional patterns that add luxury and identity to your bedroom.\n\nThe set includes:\n\nTwo cushions measuring 40×40 cm with a traditional design harmonized with the collection's colors and patterns.\n\nA traditional carpet measuring 2m × 1m, carefully crafted to bring beauty and elegance to your bed, transforming your room into a warm and authentic space.\n\nFeatures:\n\nPatterns inspired by authentic Moroccan heritage\n\nElegant colors that bring life and warmth to the space\n\nComfortable and easy-to-clean materials\n\nLuxurious design suited for both modern and traditional bedrooms\n\nPerfect as a refined gift or to add a new decorative touch to your room",

  "jlsh-shay-shrawyh":
    "Elegant Saharan tea seating combining comfort and authenticity, designed especially for event organizers seeking a traditional touch in their decor, and for tea lovers wishing to create a refined corner at home for preparing tea rituals in peace and beauty.\n\nAlso ideal for cafe owners and cultural spaces looking to add a corner that reflects Moroccan identity and attracts customers with a unique experience.\n\n- Seating Components:\n\nComfortable floor seat measuring 95×70 cm\n\nTraditional carpet measuring 2×1 m\n\nTwo floor cushions measuring 60×43 cm\n\n- Product Features:\n\nDesign inspired by Saharan heritage\n\nIdeal for decoration, parties, photo sessions, and hospitality\n\nPractical and easy to set up in any space\n\nBrings distinctive traditional warmth and charm",

  "jlsh-alqraah-ballwn-alahmr":
    "Reading Seat – 95 × 70 × 10 cm\nComfortable floor seat with a practical and compact design, ideal for reading and daily relaxation. It provides balanced body support, facilitates long comfortable reading sessions, and suits quiet corners and bedrooms, with an elegant touch that adds warmth to the space.",

  "alfrshh-almlkyh-llkhrjat-ballwn-alahmr":
    "A refined mattress with a luxurious traditional design, the ideal companion in your car. Suitable for road trips, beaches, gardens, family gatherings, and outdoor tea sessions. It combines portability and elegant seating for a refined experience wherever you choose to enjoy your time.\n\nDimensions: 200 cm × 70 cm",

  "tblh-nhasyh-mnqwshh-ydwya":
    "A traditional masterpiece carefully crafted from brass, featuring intricate hand engravings that reflect the artisan's skill and the beauty of heritage. A refined piece suitable for daily use or as a luxurious decor element that adds an authentic touch and warm elegance to any space.\n* Dimensions: 70 cm × 35 cm",

  "pouf-traditionnel":
    "Elegant traditional pouf in red, inspired by the authentic Saharan style, combining comfort and aesthetics. Its practical design suits traditional majlis settings and modern decor alike, with comfortable padding that retains its shape over time.\nIdeal for the living room, lounge, or reception areas, it adds warmth and luxury to your space.\n📏 Dimensions: 60×60×20 cm",
};

export const fixFrenchEnglishTranslations = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      updated: 0,
      skipped: 0,
      details: [] as string[],
    };

    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      const updates: Record<string, unknown> = {};

      // --- Fix title ---
      const titleFrHasArabic = /[\u0600-\u06FF]/.test(product.title.fr);
      const titleEnHasArabic = product.title.en
        ? /[\u0600-\u06FF]/.test(product.title.en)
        : false;
      const titleEnMissing = !product.title.en;

      if (titleFrHasArabic || titleEnHasArabic || titleEnMissing) {
        // Use existing AR_TRANSLATIONS dict for titles (already correct for
        // titles that were fixed in the previous run). Fall back to current
        // values when they are already non-Arabic.
        const arKey = product.title.ar;
        const lookup = AR_TRANSLATIONS[arKey] || AR_TRANSLATIONS[normalize(arKey)];
        // Try fuzzy match
        let fuzzyLookup: { en: string; fr: string } | undefined;
        if (!lookup) {
          for (const [key, val] of Object.entries(AR_TRANSLATIONS)) {
            if (normalize(key) === normalize(arKey)) {
              fuzzyLookup = val;
              break;
            }
          }
        }
        const match = lookup || fuzzyLookup;

        const newFr = titleFrHasArabic
          ? (match?.fr ?? product.title.fr)
          : product.title.fr;
        const newEn =
          titleEnHasArabic || titleEnMissing
            ? (match?.en ?? product.title.en ?? product.title.fr)
            : product.title.en!;

        if (newFr !== product.title.fr || newEn !== product.title.en) {
          updates.title = { ar: product.title.ar, fr: newFr, en: newEn };
        }
      }

      // --- Fix description ---
      const descFrHasArabic = /[\u0600-\u06FF]/.test(product.description.fr);
      const descEnHasArabic = product.description.en
        ? /[\u0600-\u06FF]/.test(product.description.en)
        : false;
      const descEnMissing = !product.description.en;

      if (descFrHasArabic || descEnHasArabic || descEnMissing) {
        const slug = product.slug;

        // Try slug-based dictionary first (most accurate)
        const frFromSlug = DESC_FR_BY_SLUG[slug];
        const enFromSlug = DESC_EN_BY_SLUG[slug];

        // Fall back to the old AR_DESC_TRANSLATIONS dict
        const arKey = product.description.ar;
        const oldLookup =
          AR_DESC_TRANSLATIONS[arKey] ||
          AR_DESC_TRANSLATIONS[normalize(arKey)];

        const newFr = descFrHasArabic
          ? (frFromSlug ?? oldLookup?.fr ?? product.description.fr)
          : product.description.fr;
        const newEn =
          descEnHasArabic || descEnMissing
            ? (enFromSlug ?? oldLookup?.en ?? product.description.en ?? product.description.fr)
            : product.description.en!;

        if (newFr !== product.description.fr || newEn !== product.description.en) {
          updates.description = {
            ar: product.description.ar,
            fr: newFr,
            en: newEn,
          };
        }
      }

      // --- Fix content (if present) ---
      if (product.content) {
        const contentFrHasArabic = /[\u0600-\u06FF]/.test(product.content.fr);
        const contentEnHasArabic = product.content.en
          ? /[\u0600-\u06FF]/.test(product.content.en)
          : false;
        const contentEnMissing = !product.content.en;

        if (contentFrHasArabic || contentEnHasArabic || contentEnMissing) {
          // Reuse description translations as content fallback
          const slug = product.slug;
          const frFromSlug = DESC_FR_BY_SLUG[slug];
          const enFromSlug = DESC_EN_BY_SLUG[slug];

          const newFr = contentFrHasArabic
            ? (frFromSlug ?? product.content.fr)
            : product.content.fr;
          const newEn =
            contentEnHasArabic || contentEnMissing
              ? (enFromSlug ?? product.content.en ?? product.content.fr)
              : product.content.en!;

          if (newFr !== product.content.fr || newEn !== product.content.en) {
            updates.content = {
              ar: product.content.ar,
              fr: newFr,
              en: newEn,
            };
          }
        }
      }

      // --- Apply updates ---
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(product._id, { ...updates, updatedAt: Date.now() });
        results.updated++;
        const descNote = updates.description ? " +desc" : "";
        const titleNote = updates.title ? " +title" : "";
        const contentNote = updates.content ? " +content" : "";
        results.details.push(
          `${product.slug}:${titleNote}${descNote}${contentNote}`
        );
      } else {
        results.skipped++;
      }
    }

    return {
      message: `fixFrenchEnglishTranslations complete! ${results.updated} updated, ${results.skipped} skipped.`,
      ...results,
    };
  },
});

// ============================================
// MIGRATE COLOR VARIANT NAMES TO MULTILINGUAL
// ============================================
// Converts existing colorVariants with name: string to name: { ar, fr, en }.
// Run via CLI: npx convex run translateAll:migrateColorVariantNames

export const migrateColorVariantNames = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const product of products) {
      if (!product.colorVariants || product.colorVariants.length === 0) {
        skipped++;
        continue;
      }

      // Check if any variant still has the old string format
      const needsMigration = product.colorVariants.some(
        (cv: any) => typeof cv.name === "string"
      );

      if (!needsMigration) {
        skipped++;
        continue;
      }

      const migratedVariants = product.colorVariants.map((cv: any) => {
        if (typeof cv.name === "string") {
          return {
            ...cv,
            name: {
              ar: cv.name,
              fr: cv.name,
              en: cv.name,
            },
          };
        }
        return cv;
      });

      await ctx.db.patch(product._id, {
        colorVariants: migratedVariants,
        updatedAt: Date.now(),
      });

      updated++;
      details.push(
        `"${product.title.ar || product.title.fr}": migrated ${migratedVariants.length} color variant(s)`
      );
    }

    return {
      message: `migrateColorVariantNames complete! ${updated} products updated, ${skipped} skipped.`,
      updated,
      skipped,
      details,
    };
  },
});
