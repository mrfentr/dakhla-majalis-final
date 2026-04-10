'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Loader2,
  Trash2,
  AlertCircle,
  X,
  Plus,
  Sofa,
  Square,
  Grip,
  Grid3x3,
  Circle,
  ShoppingBag,
  Diamond,
  Home,
} from 'lucide-react';
import ImageUpload from '@/components/upload/ImageUpload';
import GalleryUpload from '@/components/upload/GalleryUpload';
import { useGetProductById, useGetProducts, useUpdateProduct, useDeleteProduct, useGetCategories, useGetFabricVariants } from '@/hooks/useConvex';
import toast from 'react-hot-toast';
import type { Id } from '@convex/_generated/dataModel';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as Id<'products'>;

  const product = useGetProductById(productId);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const dbCategories = useGetCategories({ activeOnly: true }) ?? [];
  const allFabricVariants = useGetFabricVariants() ?? [];
  const allProducts = useGetProducts({ status: 'all' }) ?? [];

  // Fabric variants available for linking: not linked to any other product, or already linked to THIS product
  const linkedFabricVariantIds = new Set(
    allProducts
      .filter((p: any) => p.fabricVariantId && p._id !== productId)
      .map((p: any) => p.fabricVariantId as string)
  );
  const availableFabricVariants = allFabricVariants.filter(
    (fv) => !linkedFabricVariantIds.has(fv._id)
  );
  const currentLinkedVariant = product?.fabricVariantId
    ? allFabricVariants.find((fv) => fv._id === product.fabricVariantId)
    : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Color variants state
  const [colorVariants, setColorVariants] = useState<Array<{ name: { ar: string; fr: string; en?: string }; hex: string; image?: string; gallery?: string[] }>>([]);
  const [newColorNameAr, setNewColorNameAr] = useState('');
  const [newColorNameFr, setNewColorNameFr] = useState('');
  const [newColorNameEn, setNewColorNameEn] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newColorImage, setNewColorImage] = useState('');
  const [newColorGallery, setNewColorGallery] = useState<string[]>([]);

  type ProductType = 'glassat' | 'wsayd' | 'coudoir' | 'zerbiya' | 'poufs' | 'sac_decoration' | 'petit_coussin' | 'majalis_set';

  const [formData, setFormData] = useState({
    titleAr: '',
    titleFr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionFr: '',
    descriptionEn: '',
    price: '',
    imageUrl: '',
    categorySlug: '',
    subcategorySlug: '',
    productType: '' as ProductType | '',
    fabricVariantId: '' as string,
    gallery: [] as Array<{ url: string; alt?: { fr: string; ar: string } }>,
  });

  // Load product data when it arrives
  useEffect(() => {
    if (product) {
      setFormData({
        titleAr: product.title.ar || '',
        titleFr: product.title.fr || '',
        titleEn: (product.title as any).en || '',
        descriptionAr: product.description.ar || '',
        descriptionFr: product.description.fr || '',
        descriptionEn: (product.description as any).en || '',
        price: product.pricing.basePrice.toString(),
        imageUrl: product.image,
        categorySlug: product.category || '',
        subcategorySlug: (product as any).subcategory || '',
        productType: product.productType || '',
        fabricVariantId: (product as any).fabricVariantId || '',
        gallery: product.gallery || [],
      });
      setColorVariants(product.colorVariants || []);
    }
  }, [product]);

  // Separate top-level categories from subcategories
  const topLevelCategories = dbCategories.filter(c => !c.parentCategoryId);
  const selectedCategory = dbCategories.find(c => c.slug === formData.categorySlug);
  const subcategories = selectedCategory ? dbCategories.filter(c => c.parentCategoryId === selectedCategory._id) : [];

  // Reset subcategorySlug when categorySlug changes (only user-initiated, not on load)
  const [categoryInitialized, setCategoryInitialized] = useState(false);
  useEffect(() => {
    if (categoryInitialized) {
      setFormData(prev => ({ ...prev, subcategorySlug: '' }));
    }
  }, [formData.categorySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (product && formData.categorySlug) {
      setCategoryInitialized(true);
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleAddColorVariant = () => {
    if (!newColorNameAr.trim() && !newColorNameFr.trim()) {
      toast.error('Le nom de la couleur (AR ou FR) est requis');
      return;
    }
    setColorVariants(prev => [
      ...prev,
      {
        name: {
          ar: newColorNameAr.trim() || newColorNameFr.trim(),
          fr: newColorNameFr.trim() || newColorNameAr.trim(),
          ...(newColorNameEn.trim() ? { en: newColorNameEn.trim() } : {}),
        },
        hex: newColorHex,
        ...(newColorImage.trim() ? { image: newColorImage.trim() } : {}),
        ...(newColorGallery.length > 0 ? { gallery: newColorGallery } : {}),
      },
    ]);
    setNewColorNameAr('');
    setNewColorNameFr('');
    setNewColorNameEn('');
    setNewColorHex('#000000');
    setNewColorImage('');
    setNewColorGallery([]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveColorVariant = (index: number) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteProduct({ id: productId });
      toast.success('Produit supprimé avec succès');
      setDeleteModalOpen(false);
      router.push('/dashboard/products');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      if (error.message?.includes('mandatory')) {
        toast.error('Impossible de supprimer les produits essentiels');
      } else {
        toast.error('Erreur lors de la suppression du produit');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.titleAr.trim()) {
      toast.error('Le nom du produit en arabe est requis');
      return;
    }
    if (formData.productType !== 'majalis_set' && (!formData.price || parseFloat(formData.price) < 0)) {
      toast.error('Le prix est requis et doit être positif');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProduct({
        id: productId,
        title: {
          fr: formData.titleFr || formData.titleAr,
          ar: formData.titleAr,
          ...(formData.titleEn.trim() ? { en: formData.titleEn.trim() } : {}),
        },
        description: {
          fr: formData.descriptionFr || formData.descriptionAr,
          ar: formData.descriptionAr,
          ...(formData.descriptionEn.trim() ? { en: formData.descriptionEn.trim() } : {}),
        },
        image: formData.imageUrl || '/placeholder-product.jpg',
        gallery: formData.gallery.length > 0 ? formData.gallery : undefined,
        pricing: {
          basePrice: formData.productType === 'majalis_set' ? 0 : parseFloat(formData.price),
          currency: 'MAD',
        },
        productType: formData.productType ? (formData.productType as ProductType) : undefined,
        fabricVariantId: formData.productType === 'majalis_set' && formData.fabricVariantId
          ? (formData.fabricVariantId as Id<'fabricVariants'>)
          : undefined,
        category: formData.categorySlug || undefined,
        subcategory: formData.subcategorySlug || undefined,
        colorVariants: colorVariants.length > 0 ? colorVariants : undefined,
      });

      toast.success('Produit mis à jour avec succès!');
      setHasUnsavedChanges(false);
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erreur lors de la mise à jour du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (product === undefined) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#BD7C48] mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (product === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Produit introuvable</h2>
          <p className="text-neutral-600 mb-4">Le produit demandé n'existe pas.</p>
          <button
            onClick={() => router.push('/dashboard/products')}
            className="px-4 py-2 bg-[#BD7C48] text-white font-bold rounded-lg hover:bg-[#A0673D] transition-colors"
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  const isMandatory = product.isMandatory;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
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
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Modifier le produit</h1>
              {isMandatory && (
                <p className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded mt-2 inline-block">
                  ⚠️ Produit essentiel - Ne peut pas être supprimé
                </p>
              )}
            </div>
            {hasUnsavedChanges && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">Non enregistré</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-neutral-200 rounded-lg p-6">
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

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-1.5">Catégorie</label>
            <select
              name="categorySlug"
              value={formData.categorySlug}
              onChange={handleInputChange as any}
              className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
            >
              <option value="">Sélectionner une catégorie</option>
              {topLevelCategories.map(cat => (
                <option key={cat._id} value={cat.slug}>{cat.name.fr} - {cat.name.ar}</option>
              ))}
            </select>
            {subcategories.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">Sous-catégorie</label>
                <select
                  name="subcategorySlug"
                  value={formData.subcategorySlug}
                  onChange={handleInputChange as any}
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

          {/* Product Type */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-3">Type de produit</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {([
                { value: 'glassat', label: 'Glassat', icon: Sofa },
                { value: 'wsayd', label: 'Wsada', icon: Square },
                { value: 'coudoir', label: 'Coudoir', icon: Grip },
                { value: 'zerbiya', label: 'Zerbiya', icon: Grid3x3 },
                { value: 'poufs', label: 'Poufs', icon: Circle },
                { value: 'sac_decoration', label: 'Sac Déco', icon: ShoppingBag },
                { value: 'petit_coussin', label: 'Petit Coussin', icon: Diamond },
                { value: 'majalis_set', label: 'Majlis Set', icon: Home },
              ] as const).map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-[#BD7C48] transition-colors has-[:checked]:border-[#BD7C48] has-[:checked]:bg-[#BD7C48]/5">
                  <input
                    type="radio"
                    name="productType"
                    value={value}
                    checked={formData.productType === value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <Icon className="w-6 h-6 text-[#BD7C48]" />
                  <span className="text-xs font-bold text-neutral-900 text-center">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fabric Variant Picker — only for majalis_set */}
          {formData.productType === 'majalis_set' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-bold text-neutral-900 mb-1">
                Variante de tissu liée
              </label>
              <p className="text-xs text-amber-700 mb-3">
                Un produit Majlis Set doit être lié à une variante de tissu pour fonctionner dans le checkout.
              </p>

              {/* Currently linked variant info */}
              {currentLinkedVariant && !formData.fabricVariantId && (
                <div className="flex items-center gap-3 mb-3 p-2.5 bg-white border border-amber-300 rounded-lg">
                  {currentLinkedVariant.image && (
                    <img src={currentLinkedVariant.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-neutral-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate">{currentLinkedVariant.name.fr}</p>
                    <p className="text-xs text-neutral-500">{currentLinkedVariant.name.ar} — {currentLinkedVariant.color}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Lié actuellement</span>
                </div>
              )}

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
                    {fv._id === product?.fabricVariantId ? ' ✓ lié actuellement' : ''}
                  </option>
                ))}
              </select>

              {availableFabricVariants.length === 0 && (
                <p className="text-xs text-amber-800 mt-2 font-medium">
                  Aucune variante disponible. Toutes sont déjà liées à d'autres produits, ou il n'y en a pas encore.
                  Créez-en depuis la page Stock.
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

          {/* Price — hidden for majalis_set */}
          {formData.productType !== 'majalis_set' && (
            <div>
              <label className="block text-sm font-bold text-neutral-900 mb-1.5">Prix (MAD) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                placeholder="2500"
              />
            </div>
          )}

          {/* Image */}
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

          {/* Gallery */}
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

          {/* Color Variants — hidden for majalis_set */}
          {formData.productType !== 'majalis_set' && (
          <div>
            <label className="block text-sm font-bold text-neutral-900 mb-1.5">
              Variantes de couleur <span className="text-neutral-400 font-normal">(optionnel)</span>
            </label>
            <p className="text-xs text-neutral-500 mb-3">Ajoutez les couleurs disponibles pour ce produit.</p>

            {/* Existing color variants list */}
            {colorVariants.length > 0 && (
              <div className="space-y-2 mb-4">
                {colorVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    {/* Color swatch */}
                    <div
                      className="w-7 h-7 rounded-full border-2 border-neutral-300 flex-shrink-0"
                      style={{ backgroundColor: variant.hex }}
                    />
                    {/* Names */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                      <span className="text-sm font-medium text-neutral-900" dir="rtl">
                        <span className="text-[10px] text-neutral-400 font-bold mr-1">AR:</span>{variant.name.ar}
                      </span>
                      <span className="text-sm font-medium text-neutral-900">
                        <span className="text-[10px] text-neutral-400 font-bold mr-1">FR:</span>{variant.name.fr}
                      </span>
                      {variant.name.en && (
                        <span className="text-sm font-medium text-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-bold mr-1">EN:</span>{variant.name.en}
                        </span>
                      )}
                    </div>
                    {/* Hex */}
                    <span className="text-xs font-mono text-neutral-500">{variant.hex}</span>
                    {/* Image preview */}
                    {variant.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 relative flex-shrink-0">
                        <img src={variant.image} alt={variant.name.fr} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {/* Gallery count */}
                    {variant.gallery && variant.gallery.length > 0 && (
                      <span className="text-xs text-[#BD7C48] font-bold">+{variant.gallery.length} images</span>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveColorVariant(index)}
                      className="ml-auto p-1 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Supprimer cette couleur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new color variant form */}
            <div className="p-3 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg space-y-2">
              {/* Name inputs row */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">AR</span>
                    الاسم *
                  </label>
                  <input
                    type="text"
                    value={newColorNameAr}
                    onChange={(e) => setNewColorNameAr(e.target.value)}
                    dir="rtl"
                    className="w-full px-2.5 py-2 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors"
                    placeholder="بيج"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">FR</span>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={newColorNameFr}
                    onChange={(e) => setNewColorNameFr(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors"
                    placeholder="Beige"
                  />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    <span className="inline-block bg-neutral-200 text-neutral-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">EN</span>
                    Name <span className="text-neutral-400">(opt)</span>
                  </label>
                  <input
                    type="text"
                    value={newColorNameEn}
                    onChange={(e) => setNewColorNameEn(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors"
                    placeholder="Beige"
                  />
                </div>
              </div>
              {/* Color picker, image, and add button row */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[100px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Couleur *</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-neutral-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-neutral-500">{newColorHex}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Image <span className="text-neutral-400">(optionnel)</span>
                  </label>
                  <ImageUpload
                    value={newColorImage}
                    onChange={(url) => setNewColorImage(url)}
                    label="Image couleur"
                    maxSizeMB={20}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddColorVariant}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
              {/* Gallery for this color variant */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Galerie d'images pour cette couleur <span className="text-neutral-400">(optionnel)</span>
                </label>
                <GalleryUpload
                  value={newColorGallery.map(url => ({ url }))}
                  onChange={(images) => setNewColorGallery(images.map(img => img.url))}
                  maxSizeMB={20}
                />
              </div>
            </div>
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            {!isMandatory && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting || isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges && !confirm('Vous avez des modifications non enregistrées. Voulez-vous quitter ?')) return;
                router.back();
              }}
              disabled={isSubmitting || isDeleting}
              className="px-5 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mise à jour en cours...</span>
                </>
              ) : (
                <>
                  <span>Mettre à jour le produit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-black text-neutral-900 text-center mb-2">
              Supprimer le produit
            </h2>

            {/* Description */}
            <p className="text-neutral-600 text-center mb-6">
              Êtes-vous sûr de vouloir supprimer <span className="font-bold text-neutral-900">{product?.title.fr}</span> ?
              Cette action est irréversible.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
