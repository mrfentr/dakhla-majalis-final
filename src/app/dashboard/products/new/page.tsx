'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Info,
  Sofa,
  Square,
  Grip,
  Grid3x3,
  Palette,
  X,
  Plus,
  Circle,
  ShoppingBag,
  Diamond,
  Home,
} from 'lucide-react';
import ImageUpload from '@/components/upload/ImageUpload';
import GalleryUpload from '@/components/upload/GalleryUpload';
import { useCreateProduct, useGetCategories, useGetFabricVariants, useGetProducts } from '@/hooks/useConvex';
import type { Id } from '@convex/_generated/dataModel';
import toast from 'react-hot-toast';

type ProductType = 'glassat' | 'wsayd' | 'coudoir' | 'zerbiya' | 'poufs' | 'sac_decoration' | 'petit_coussin' | 'majalis_set';

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const dbCategories = useGetCategories({ activeOnly: true }) ?? [];
  const allFabricVariants = useGetFabricVariants() ?? [];
  const allProducts = useGetProducts({ status: 'all' }) ?? [];

  // Fabric variants not linked to any product
  const linkedFabricVariantIds = new Set(
    allProducts
      .filter((p: any) => p.fabricVariantId)
      .map((p: any) => p.fabricVariantId as string)
  );
  const availableFabricVariants = allFabricVariants.filter(
    (fv) => !linkedFabricVariantIds.has(fv._id)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    titleAr: '',
    titleFr: '',
    titleEn: '',
    slug: '',
    descriptionAr: '',
    descriptionFr: '',
    descriptionEn: '',
    productType: 'glassat' as ProductType,
    price: '',
    stock: '',
    status: 'active' as 'active' | 'inactive' | 'draft',
    imageUrl: '',
    gallery: [] as Array<{ url: string; alt?: { fr: string; ar: string } }>,
    // 3 simple types
    simpleType: 'individual' as 'individual' | 'standalone' | 'majalis_set',
    fabricVariantId: '',
    categorySlug: '',
    subcategorySlug: '',
  });

  // Color variants state
  const [colorVariants, setColorVariants] = useState<Array<{ name: { ar: string; fr: string; en?: string }; hex: string; image?: string; gallery?: string[] }>>([]);
  const [newColorVariant, setNewColorVariant] = useState({ nameAr: '', nameFr: '', nameEn: '', hex: '#BD7C48', image: '', gallery: [] as string[] });

  const handleAddColorVariant = () => {
    if (!newColorVariant.nameAr.trim() && !newColorVariant.nameFr.trim()) {
      toast.error('Le nom de la couleur (AR ou FR) est requis');
      return;
    }
    if (!newColorVariant.hex.trim()) {
      toast.error('La valeur hex est requise');
      return;
    }
    setColorVariants(prev => [
      ...prev,
      {
        name: {
          ar: newColorVariant.nameAr.trim() || newColorVariant.nameFr.trim(),
          fr: newColorVariant.nameFr.trim() || newColorVariant.nameAr.trim(),
          ...(newColorVariant.nameEn.trim() ? { en: newColorVariant.nameEn.trim() } : {}),
        },
        hex: newColorVariant.hex,
        ...(newColorVariant.image.trim() ? { image: newColorVariant.image.trim() } : {}),
        ...(newColorVariant.gallery.length > 0 ? { gallery: newColorVariant.gallery } : {}),
      },
    ]);
    setNewColorVariant({ nameAr: '', nameFr: '', nameEn: '', hex: '#BD7C48', image: '', gallery: [] });
    setHasUnsavedChanges(true);
  };

  const handleRemoveColorVariant = (index: number) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Auto-generate slug from Arabic title (convert to Latin characters)
  useEffect(() => {
    if (formData.titleAr) {
      // Transliteration map for Arabic to Latin
      const translitMap: Record<string, string> = {
        'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
        'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
        'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
        'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
        'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
        'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
        'ة': 'h', 'ء': 'a'
      };

      let slug = formData.titleAr;
      // Replace Arabic characters with Latin equivalents
      for (const [arabic, latin] of Object.entries(translitMap)) {
        slug = slug.split(arabic).join(latin);
      }
      // Convert spaces to hyphens and clean up
      slug = slug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')  // Convert all spaces to hyphens
        .replace(/[^a-z0-9-]+/g, '-')  // Remove non-alphanumeric except hyphens
        .replace(/-+/g, '-')  // Collapse multiple hyphens into one
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens

      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.titleAr]);

  // Separate top-level categories from subcategories
  const topLevelCategories = dbCategories.filter(c => !c.parentCategoryId);
  const selectedCategory = dbCategories.find(c => c.slug === formData.categorySlug);
  const subcategories = selectedCategory ? dbCategories.filter(c => c.parentCategoryId === selectedCategory._id) : [];

  // Reset subcategorySlug when categorySlug changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, subcategorySlug: '' }));
  }, [formData.categorySlug]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Convert spaces to hyphens in slug field
    const processedValue = name === 'slug' ? value.replace(/\s+/g, '-') : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.categorySlug) {
      toast.error('La catégorie est requise');
      return;
    }
    if (!formData.titleAr.trim()) {
      toast.error('Le nom du produit est requis');
      return;
    }
    if (!formData.slug.trim()) {
      toast.error('Le slug est requis');
      return;
    }
    if (formData.simpleType !== 'majalis_set') {
      if (!formData.price || parseFloat(formData.price) < 0) {
        toast.error('Le prix est requis et doit être positif');
        return;
      }
      if (!formData.stock || parseInt(formData.stock) < 0) {
        toast.error('Le stock est requis');
        return;
      }
    }
    if (formData.simpleType === 'majalis_set' && !formData.fabricVariantId) {
      toast.error('Veuillez lier une variante de tissu pour un produit Majlis Set');
      return;
    }

    setIsSubmitting(true);

    try {
      // Replace the old category determination with dynamic category
      let category: string;
      let composition: any = undefined;

      if (formData.categorySlug) {
        category = formData.categorySlug;
      } else {
        category = 'accessories';
      }

      const isMajalisSet = formData.simpleType === 'majalis_set';

      if (formData.simpleType === 'individual') {
        composition = {
          [formData.productType]: 1
        };
      }

      const finalProductType: ProductType = isMajalisSet ? 'majalis_set' : formData.productType;

      await createProduct({
        title: {
          fr: formData.titleFr || formData.titleAr,
          ar: formData.titleAr,
          ...(formData.titleEn.trim() ? { en: formData.titleEn.trim() } : {}),
        },
        slug: formData.slug,
        description: {
          fr: formData.descriptionFr || formData.descriptionAr,
          ar: formData.descriptionAr,
          ...(formData.descriptionEn.trim() ? { en: formData.descriptionEn.trim() } : {}),
        },
        productType: finalProductType,
        category,
        subcategory: formData.subcategorySlug || undefined,
        image: formData.imageUrl || '/placeholder-product.jpg',
        gallery: formData.gallery.length > 0 ? formData.gallery : undefined,
        specifications: {
          materials: [],
          colors: [],
          patterns: [],
        },
        pricing: {
          basePrice: isMajalisSet ? 0 : parseFloat(formData.price),
          currency: 'MAD',
        },
        measurementOptions: {
          allowCustomDimensions: isMajalisSet,
        },
        inventory: {
          stockQuantity: isMajalisSet ? 0 : (parseInt(formData.stock) || 0),
          lowStockThreshold: 10,
          trackInventory: !isMajalisSet,
          allowBackorders: false,
        },
        status: formData.status,
        composition: isMajalisSet ? { glassat: 1, wsayd: 2, coudoir: 1, zerbiya: 1 } : composition,
        fabricVariantId: isMajalisSet && formData.fabricVariantId
          ? (formData.fabricVariantId as Id<'fabricVariants'>)
          : undefined,
        colorVariants: colorVariants.length > 0 ? colorVariants : undefined,
        rating: 0,
        reviewCount: 0,
      });

      toast.success('Produit créé avec succès!');
      setHasUnsavedChanges(false);
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Erreur lors de la création du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMajalisSet = formData.simpleType === 'majalis_set';
  const needsStock = !isMajalisSet;
  const needsPrice = !isMajalisSet;
  const showProductTypeSelector = formData.simpleType === 'individual';

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => {
              if (hasUnsavedChanges && !confirm('Vous avez des modifications non enregistrées. Voulez-vous quitter ?')) return;
              router.back();
            }}
            className="flex items-center gap-2 text-neutral-600 hover:text-[#BD7C48] transition-colors mb-3 text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Ajouter un nouveau produit</h1>
            </div>
            {hasUnsavedChanges && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">Non enregistré</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Type Selection - SIMPLIFIED */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900 text-sm mb-1">Type de produit</h3>
                <p className="text-xs text-blue-700">Choisissez le type de produit que vous souhaitez créer</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="simpleType"
                  value="individual"
                  checked={formData.simpleType === 'individual'}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                />
                <div className="flex-1">
                  <div className="font-bold text-neutral-900 text-sm">Produit individuel</div>
                  <div className="text-xs text-neutral-600">Un des articles essentiels (Glassat, Wsada, Coudoir, ou Zerbiya). Gère son propre stock.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="simpleType"
                  value="standalone"
                  checked={formData.simpleType === 'standalone'}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                />
                <div className="flex-1">
                  <div className="font-bold text-neutral-900 text-sm">Autre produit</div>
                  <div className="text-xs text-neutral-600">Produit indépendant avec son propre stock. N'utilise pas les articles essentiels.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-amber-400 transition-colors">
                <input
                  type="radio"
                  name="simpleType"
                  value="majalis_set"
                  checked={formData.simpleType === 'majalis_set'}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-neutral-900 text-sm">Majlis Set</div>
                    <Home className="w-4 h-4 text-[#BD7C48]" />
                  </div>
                  <div className="text-xs text-neutral-600">Produit sur mesure lié à une variante de tissu. Le prix est calculé dynamiquement et le stock est géré depuis la page Stock.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-neutral-900 mb-3">Catégorie du produit *</label>
            {topLevelCategories.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucune catégorie disponible. Créez-en dans la page Catégories.</p>
            ) : (
              <select
                name="categorySlug"
                value={formData.categorySlug}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
              >
                <option value="">Sélectionner une catégorie</option>
                {topLevelCategories.map(cat => (
                  <option key={cat._id} value={cat.slug}>{cat.name.fr} - {cat.name.ar}</option>
                ))}
              </select>
            )}
            {subcategories.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">Sous-catégorie</label>
                <select
                  name="subcategorySlug"
                  value={formData.subcategorySlug}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                >
                  <option value="">Aucune sous-catégorie</option>
                  {subcategories.map(sub => (
                    <option key={sub._id} value={sub.slug}>{sub.name.fr} - {sub.name.ar}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Product Type Selector - Only for Individual Products */}
          {showProductTypeSelector && (
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <label className="block text-sm font-bold text-neutral-900 mb-3">Type de produit *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="glassat"
                    checked={formData.productType === 'glassat'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Sofa className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Glassat</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="wsayd"
                    checked={formData.productType === 'wsayd'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Square className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Wsada</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="coudoir"
                    checked={formData.productType === 'coudoir'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Grip className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Coudoir</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="zerbiya"
                    checked={formData.productType === 'zerbiya'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Grid3x3 className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Zerbiya</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="poufs"
                    checked={formData.productType === 'poufs'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Circle className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Poufs</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="sac_decoration"
                    checked={formData.productType === 'sac_decoration'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <ShoppingBag className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Sac Déco</span>
                </label>
                <label className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value="petit_coussin"
                    checked={formData.productType === 'petit_coussin'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Diamond className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-sm font-bold text-neutral-900">Petit Coussin</span>
                </label>
              </div>
            </div>
          )}

          {/* Fabric Variant Picker — only for majalis_set */}
          {isMajalisSet && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-bold text-neutral-900 mb-1">
                Variante de tissu *
              </label>
              <p className="text-xs text-amber-700 mb-3">
                Sélectionnez la variante de tissu à lier. Le stock sera géré depuis la page Stock.
              </p>

              <select
                name="fabricVariantId"
                value={formData.fabricVariantId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fabricVariantId: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
              >
                <option value="">— Sélectionner une variante de tissu —</option>
                {availableFabricVariants.map(fv => (
                  <option key={fv._id} value={fv._id}>
                    {fv.name.fr} — {fv.name.ar} ({fv.color})
                  </option>
                ))}
              </select>

              {availableFabricVariants.length === 0 && (
                <p className="text-xs text-amber-800 mt-2 font-medium">
                  Aucune variante disponible. Toutes sont déjà liées ou aucune n'existe. Créez-en depuis la page Stock.
                </p>
              )}

              {formData.fabricVariantId && (() => {
                const selected = allFabricVariants.find(fv => fv._id === formData.fabricVariantId);
                if (!selected) return null;
                return (
                  <div className="mt-3 flex items-center gap-3 p-2.5 bg-white border border-green-300 rounded-lg">
                    {selected.image && (
                      <img src={selected.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-neutral-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">{selected.name.fr}</p>
                      <p className="text-xs text-neutral-500">{selected.name.ar} — {selected.color}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Sélectionné</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            {/* Title - Arabic */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">الاسم بالعربية *</label>
              <input
                type="text"
                name="titleAr"
                value={formData.titleAr}
                onChange={handleInputChange}
                required
                dir="rtl"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                placeholder="صالون مغربي تقليدي"
              />
            </div>

            {/* Title - French */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                Nom en français <span className="text-neutral-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                name="titleFr"
                value={formData.titleFr}
                onChange={handleInputChange}
                dir="ltr"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                placeholder="Salon marocain traditionnel"
              />
            </div>

            {/* Title - English */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                English title <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="titleEn"
                value={formData.titleEn}
                onChange={handleInputChange}
                dir="ltr"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                placeholder="Traditional Moroccan sofa"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">Slug (URL) *</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium font-mono text-sm"
                placeholder="salon-marocain-traditionnel"
              />
              <p className="text-xs text-neutral-600 mt-1">Généré automatiquement à partir du nom. Utilisé dans l'URL du produit.</p>
            </div>

            {!isMajalisSet && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                    Prix (MAD) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required={needsPrice}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                    placeholder="2500"
                  />
                  {formData.simpleType === 'individual' && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Prix pour une unité du produit obligatoire
                    </p>
                  )}
                  {formData.simpleType === 'standalone' && (
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Prix fixe pour ce produit
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-1.5">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required={needsStock}
                    min="0"
                    className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                    placeholder="15"
                  />
                  {formData.simpleType === 'individual' && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Stock lié au produit obligatoire sélectionné ({formData.productType})
                    </p>
                  )}
                  {formData.simpleType === 'standalone' && (
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Stock indépendant pour ce produit
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">Statut *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                  />
                  <span className="text-sm font-medium text-neutral-900">Actif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                  />
                  <span className="text-sm font-medium text-neutral-900">Brouillon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#BD7C48] focus:ring-[#BD7C48]"
                  />
                  <span className="text-sm font-medium text-neutral-900">Inactif</span>
                </label>
              </div>
            </div>

            {/* Description - Arabic */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">الوصف بالعربية</label>
              <textarea
                name="descriptionAr"
                value={formData.descriptionAr}
                onChange={handleInputChange}
                rows={4}
                dir="rtl"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium resize-none"
                placeholder="وصف المنتج..."
              />
            </div>

            {/* Description - French */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                Description en français <span className="text-neutral-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                name="descriptionFr"
                value={formData.descriptionFr}
                onChange={handleInputChange}
                rows={4}
                dir="ltr"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium resize-none"
                placeholder="Description du produit en français..."
              />
            </div>

            {/* Description - English */}
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                English description <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleInputChange}
                rows={4}
                dir="ltr"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium resize-none"
                placeholder="Product description in English..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">Image principale</label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => {
                  setFormData(prev => ({ ...prev, imageUrl: url }));
                  setHasUnsavedChanges(true);
                }}
                disabled={isSubmitting}
                label="Télécharger l'image principale"
                maxSizeMB={20}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">Galerie d'images</label>
              <p className="text-xs text-neutral-500 mb-2">Ajoutez des photos supplémentaires du produit. Glissez pour réorganiser.</p>
              <GalleryUpload
                value={formData.gallery}
                onChange={(images) => {
                  setFormData(prev => ({ ...prev, gallery: images }));
                  setHasUnsavedChanges(true);
                }}
                disabled={isSubmitting}
                maxSizeMB={20}
              />
            </div>
          </div>

          {/* Color Variants — hidden for majalis_set */}
          {!isMajalisSet && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5 text-[#BD7C48]" />
              <h3 className="text-sm font-bold text-neutral-900">Variantes de couleur</h3>
              <span className="text-xs text-neutral-400 font-normal">(optionnel)</span>
            </div>

            {/* List of added color variants */}
            {colorVariants.length > 0 && (
              <div className="space-y-2 mb-4">
                {colorVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: variant.hex }}
                    />
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-sm font-bold text-neutral-900" dir="rtl">
                        <span className="text-[10px] text-neutral-400 font-bold mr-1">AR:</span>{variant.name.ar}
                      </span>
                      <span className="text-sm font-bold text-neutral-900">
                        <span className="text-[10px] text-neutral-400 font-bold mr-1">FR:</span>{variant.name.fr}
                      </span>
                      {variant.name.en && (
                        <span className="text-sm font-medium text-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-bold mr-1">EN:</span>{variant.name.en}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500 font-mono">{variant.hex}</span>
                      {variant.image && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 relative flex-shrink-0">
                          <img src={variant.image} alt={variant.name.fr} className="w-full h-full object-cover" />
                        </div>
                      )}
                      {variant.gallery && variant.gallery.length > 0 && (
                        <span className="text-xs text-[#BD7C48] font-bold">+{variant.gallery.length} images</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveColorVariant(index)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new color variant form */}
            <div className="space-y-2">
              {/* Name inputs row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">AR</span>
                    الاسم *
                  </label>
                  <input
                    type="text"
                    value={newColorVariant.nameAr}
                    onChange={(e) => setNewColorVariant(prev => ({ ...prev, nameAr: e.target.value }))}
                    dir="rtl"
                    placeholder="أحمر"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors text-sm font-medium"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">FR</span>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={newColorVariant.nameFr}
                    onChange={(e) => setNewColorVariant(prev => ({ ...prev, nameFr: e.target.value }))}
                    placeholder="Rouge"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors text-sm font-medium"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">EN</span>
                    Name <span className="text-neutral-400">(opt)</span>
                  </label>
                  <input
                    type="text"
                    value={newColorVariant.nameEn}
                    onChange={(e) => setNewColorVariant(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="Red"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors text-sm font-medium"
                  />
                </div>
              </div>
              {/* Color picker, image, and add button row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColorVariant.hex}
                    onChange={(e) => setNewColorVariant(prev => ({ ...prev, hex: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer p-0.5"
                    title="Choisir une couleur"
                  />
                  <input
                    type="text"
                    value={newColorVariant.hex}
                    onChange={(e) => setNewColorVariant(prev => ({ ...prev, hex: e.target.value }))}
                    placeholder="#BD7C48"
                    className="w-24 px-2 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors text-sm font-mono"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <ImageUpload
                    value={newColorVariant.image}
                    onChange={(url) => setNewColorVariant(prev => ({ ...prev, image: url }))}
                    label="Image couleur (optionnel)"
                    maxSizeMB={20}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddColorVariant}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
              {/* Gallery for this color variant */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Galerie d'images pour cette couleur <span className="text-neutral-400">(optionnel)</span>
                </label>
                <GalleryUpload
                  value={newColorVariant.gallery.map(url => ({ url }))}
                  onChange={(images) => setNewColorVariant(prev => ({ ...prev, gallery: images.map(img => img.url) }))}
                  maxSizeMB={20}
                />
              </div>
            </div>
            {colorVariants.length === 0 && (
              <p className="text-xs text-neutral-500 mt-2">Aucune variante de couleur ajoutee. Utilisez le formulaire ci-dessus pour en ajouter.</p>
            )}
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges && !confirm('Vous avez des modifications non enregistrées. Voulez-vous quitter ?')) return;
                router.back();
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <span>Créer le produit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
