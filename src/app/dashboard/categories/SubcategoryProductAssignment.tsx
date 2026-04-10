'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Package,
  Check,
  Loader2,
  Search,
  ImageIcon,
  ArrowUp,
  ArrowDown,
  Plus,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';
import {
  useGetCategories,
  useGetProducts,
  useUpdateCategory,
  useAssignSubcategory,
  useRemoveSubcategory,
} from '@/hooks/useConvex';
import CategoryFormModal from './CategoryFormModal';
import toast from 'react-hot-toast';
import type { Id } from '@convex/_generated/dataModel';

interface Category {
  _id: Id<'categories'>;
  name: { ar: string; fr: string; en?: string };
  slug: string;
  image?: string;
  order: number;
  isActive: boolean;
  parentCategoryId?: Id<'categories'>;
  createdAt: number;
  updatedAt: number;
}

export default function CategoryOrganizer() {
  const rawCategories = (useGetCategories() ?? []) as Category[];
  const allProducts = useGetProducts({ status: 'all' as any }) ?? [];
  const updateCategory = useUpdateCategory();
  const assignSubcategory = useAssignSubcategory();
  const removeSubcategory = useRemoveSubcategory();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());

  // Modal state for creating categories/subcategories
  const [showFormModal, setShowFormModal] = useState(false);
  const [formModalParentId, setFormModalParentId] = useState<Id<'categories'> | null>(null);
  const [formModalParentName, setFormModalParentName] = useState('');

  // Top-level categories sorted by order
  const topLevelCategories = useMemo(
    () => rawCategories.filter(c => !c.parentCategoryId).sort((a, b) => a.order - b.order),
    [rawCategories]
  );

  // Subcategories of the selected category
  const subcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return rawCategories
      .filter(c => c.parentCategoryId === selectedCategoryId)
      .sort((a, b) => a.order - b.order);
  }, [rawCategories, selectedCategoryId]);

  const selectedCategory = rawCategories.find(c => c._id === selectedCategoryId);
  const selectedSubcategory = rawCategories.find(c => c._id === selectedSubcategoryId);

  const parentCategorySlug = selectedCategory?.slug;
  const subcategorySlug = selectedSubcategory?.slug;

  // ALL non-mandatory active products
  const allActiveProducts = useMemo(() => {
    return allProducts.filter(p => !p.isMandatory && p.status === 'active');
  }, [allProducts]);

  // Products in the selected category (for category overview)
  const categoryProducts = useMemo(() => {
    if (!parentCategorySlug) return [];
    return allActiveProducts.filter(p => p.category === parentCategorySlug);
  }, [allActiveProducts, parentCategorySlug]);

  // Products in this category WITHOUT a subcategory (of this category)
  const unassignedCategoryProducts = useMemo(() => {
    if (!parentCategorySlug) return [];
    const subcategorySlugs = new Set(subcategories.map(s => s.slug));
    return categoryProducts.filter(p => !p.subcategory || !subcategorySlugs.has(p.subcategory));
  }, [categoryProducts, parentCategorySlug, subcategories]);

  // ALL products from OTHER categories (for the overview's "other categories" section)
  const otherCategoryProducts = useMemo(() => {
    if (!parentCategorySlug) return [];
    return allActiveProducts.filter(p => p.category !== parentCategorySlug);
  }, [allActiveProducts, parentCategorySlug]);

  // Build slug → subcategory name map (includes ALL subcategories across all categories)
  const allSubcategorySlugToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of rawCategories) {
      if (cat.parentCategoryId) {
        map[cat.slug] = cat.name.fr;
      }
    }
    return map;
  }, [rawCategories]);

  // Build slug → category name map
  const categorySlugToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of rawCategories) {
      if (!cat.parentCategoryId) {
        map[cat.slug] = cat.name.fr;
      }
    }
    return map;
  }, [rawCategories]);

  // Split into assigned (to this subcategory) and available (ALL other products)
  const assignedProducts = useMemo(() => {
    if (!subcategorySlug) return [];
    return allActiveProducts.filter(p => p.subcategory === subcategorySlug);
  }, [allActiveProducts, subcategorySlug]);

  // Available = ALL products NOT in this subcategory (from any category)
  const availableProducts = useMemo(() => {
    if (!subcategorySlug) return [];
    return allActiveProducts.filter(p => p.subcategory !== subcategorySlug);
  }, [allActiveProducts, subcategorySlug]);

  // Filter available by search
  const filteredAvailable = useMemo(() => {
    if (!searchQuery) return availableProducts;
    const q = searchQuery.toLowerCase();
    return availableProducts.filter(p =>
      p.title.ar.toLowerCase().includes(q) ||
      p.title.fr.toLowerCase().includes(q) ||
      (p.title.en?.toLowerCase().includes(q)) ||
      p.slug.toLowerCase().includes(q)
    );
  }, [availableProducts, searchQuery]);

  const hasPendingChanges = pendingAdds.size > 0 || pendingRemoves.size > 0;

  const toggleAdd = (productId: string) => {
    setPendingAdds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleRemove = (productId: string) => {
    setPendingRemoves(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasPendingChanges || !subcategorySlug) return;
    setIsSaving(true);
    try {
      if (pendingAdds.size > 0) {
        await assignSubcategory({
          productIds: Array.from(pendingAdds) as Id<'products'>[],
          subcategory: subcategorySlug,
          category: parentCategorySlug,
        });
      }
      if (pendingRemoves.size > 0) {
        await removeSubcategory({
          productIds: Array.from(pendingRemoves) as Id<'products'>[],
        });
      }
      toast.success('Produits mis a jour');
      setPendingAdds(new Set());
      setPendingRemoves(new Set());
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reorder a category or subcategory
  const handleReorder = async (cat: Category, direction: 'up' | 'down', siblings: Category[]) => {
    const idx = siblings.findIndex(c => c._id === cat._id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const other = siblings[swapIdx];
    try {
      await Promise.all([
        updateCategory({ id: cat._id, order: other.order }),
        updateCategory({ id: other._id, order: cat.order }),
      ]);
    } catch (error) {
      toast.error('Erreur de reordonnancement');
    }
  };

  // When selecting a category, reset subcategory selection
  const selectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId(null);
    setPendingAdds(new Set());
    setPendingRemoves(new Set());
    setSearchQuery('');
  };

  const openAddCategoryModal = () => {
    setFormModalParentId(null);
    setFormModalParentName('');
    setShowFormModal(true);
  };

  const openAddSubcategoryModal = () => {
    if (!selectedCategoryId || !selectedCategory) return;
    setFormModalParentId(selectedCategoryId as Id<'categories'>);
    setFormModalParentName(selectedCategory.name.fr);
    setShowFormModal(true);
  };

  const selectSubcategory = (subId: string) => {
    setSelectedSubcategoryId(subId);
    setPendingAdds(new Set());
    setPendingRemoves(new Set());
    setSearchQuery('');
  };

  // --- Render helpers ---

  const renderProductRow = (
    product: typeof allProducts[0],
    mode: 'assigned' | 'available' | 'overview',
    onClick?: () => void,
  ) => {
    const isMarkedForRemoval = mode === 'assigned' && pendingRemoves.has(product._id);
    const isMarkedForAdd = mode === 'available' && pendingAdds.has(product._id);
    const currentSubName = product.subcategory ? allSubcategorySlugToName[product.subcategory] : null;
    const currentCatName = product.category ? categorySlugToName[product.category] : null;
    const isFromOtherCategory = product.category !== parentCategorySlug;
    const isInOtherSubcategory = mode === 'available' && product.subcategory && product.subcategory !== subcategorySlug;

    return (
      <div
        key={product._id}
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3 py-2 transition-all ${
          onClick ? 'cursor-pointer' : ''
        } ${
          isMarkedForRemoval
            ? 'bg-red-50 line-through opacity-60'
            : isMarkedForAdd
              ? 'bg-green-50'
              : 'hover:bg-neutral-50'
        }`}
      >
        {/* Checkbox (only in assign/remove modes) */}
        {mode !== 'overview' && (
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isMarkedForRemoval
              ? 'border-red-400 bg-red-100'
              : isMarkedForAdd
                ? 'border-green-500 bg-green-500'
                : mode === 'assigned'
                  ? 'border-green-500 bg-green-500'
                  : 'border-neutral-300 bg-white'
          }`}>
            {(mode === 'assigned' && !isMarkedForRemoval) && <Check className="w-3 h-3 text-white" />}
            {isMarkedForAdd && <Check className="w-3 h-3 text-white" />}
          </div>
        )}

        {/* Image */}
        {product.image ? (
          <img src={product.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-neutral-200 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-neutral-400" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neutral-900 truncate">{product.title.fr}</p>
          <p className="text-[10px] text-neutral-400 truncate" dir="rtl">{product.title.ar}</p>
          {/* Show current subcategory info */}
          {mode === 'overview' && currentSubName && (
            <p className="text-[9px] text-green-600 mt-0.5 truncate">
              {currentSubName}
            </p>
          )}
          {mode === 'overview' && !currentSubName && (
            <p className="text-[9px] text-amber-600 mt-0.5">
              Non assigne a une sous-categorie
            </p>
          )}
        </div>

        {/* Always show current location for available products */}
        {mode === 'available' && (() => {
          const parts: string[] = [];
          if (currentCatName) parts.push(currentCatName);
          if (currentSubName) parts.push(currentSubName);
          const label = parts.join(' / ') || 'Sans categorie';
          const isOther = isFromOtherCategory || isInOtherSubcategory;
          return (
            <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap max-w-[160px] border ${
              isOther
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-neutral-500 bg-neutral-50 border-neutral-200'
            }`}>
              {isOther && <ArrowRightLeft className="w-2.5 h-2.5 flex-shrink-0" />}
              <span className="truncate">{label}</span>
            </span>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Save bar */}
      {hasPendingChanges && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="text-sm text-amber-800">
            {pendingAdds.size > 0 && (
              <span className="font-semibold text-green-700">+{pendingAdds.size} ajout{pendingAdds.size > 1 ? 's' : ''}</span>
            )}
            {pendingAdds.size > 0 && pendingRemoves.size > 0 && ' / '}
            {pendingRemoves.size > 0 && (
              <span className="font-semibold text-red-700">-{pendingRemoves.size} retrait{pendingRemoves.size > 1 ? 's' : ''}</span>
            )}
            {/* Warning for products being moved from another subcategory */}
            {pendingAdds.size > 0 && (() => {
              const movingProducts = [...pendingAdds].filter(id => {
                const p = allActiveProducts.find(prod => prod._id === id);
                return p?.subcategory && p.subcategory !== subcategorySlug;
              });
              if (movingProducts.length === 0) return null;
              return (
                <span className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {movingProducts.length} produit{movingProducts.length > 1 ? 's' : ''} sera deplace d&apos;une autre sous-categorie
                </span>
              );
            })()}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      )}

      {/* Info banner about single subcategory rule */}
      {selectedSubcategoryId && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Un produit ne peut appartenir qu&apos;a une seule sous-categorie. L&apos;assigner ici le retirera de sa sous-categorie actuelle.
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Column 1: Categories */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col" style={{ minHeight: 400, maxHeight: 'calc(100vh - 280px)' }}>
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#BD7C48]" />
              Categories
              <span className="text-xs font-normal text-neutral-500">({topLevelCategories.length})</span>
            </h3>
            <button
              onClick={openAddCategoryModal}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#BD7C48] hover:bg-[#A0673D] text-white transition-colors"
              title="Ajouter une categorie"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {topLevelCategories.length === 0 ? (
              <p className="text-sm text-neutral-400 italic p-4">Aucune categorie</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {topLevelCategories.map((cat, idx) => {
                  const isSelected = selectedCategoryId === cat._id;
                  const subcatCount = rawCategories.filter(c => c.parentCategoryId === cat._id).length;
                  const productCount = allActiveProducts.filter(p => p.category === cat.slug).length;
                  return (
                    <div
                      key={cat._id}
                      onClick={() => selectCategory(cat._id)}
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all group ${
                        isSelected
                          ? 'bg-[#BD7C48]/10 border-r-[3px] border-[#BD7C48]'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(cat, 'up', topLevelCategories); }}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(cat, 'down', topLevelCategories); }}
                          disabled={idx === topLevelCategories.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Image */}
                      {cat.image ? (
                        <img src={cat.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-neutral-200 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      )}

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#BD7C48]' : 'text-neutral-900'}`}>
                          {cat.name.fr}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate" dir="rtl">
                          {cat.name.ar}
                        </p>
                      </div>

                      {/* Product count + subcategory count */}
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          productCount > 0 ? 'text-green-700 bg-green-50' : 'text-neutral-400 bg-neutral-100'
                        }`}>
                          {productCount} prod.
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {subcatCount} sous-cat.
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-[#BD7C48]' : 'text-neutral-300'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Subcategories */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col" style={{ minHeight: 400, maxHeight: 'calc(100vh - 280px)' }}>
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[#BD7C48]" />
              {selectedCategory ? (
                <>
                  Sous-cat. <span className="text-[#BD7C48]">{selectedCategory.name.fr}</span>
                </>
              ) : (
                'Sous-categories'
              )}
              {selectedCategory && (
                <span className="text-xs font-normal text-neutral-500">({subcategories.length})</span>
              )}
            </h3>
            {selectedCategoryId && (
              <button
                onClick={openAddSubcategoryModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#BD7C48] hover:bg-[#A0673D] text-white transition-colors"
                title="Ajouter une sous-categorie"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedCategoryId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <ChevronLeft className="w-8 h-8 text-neutral-200 mb-2" />
                <p className="text-sm text-neutral-400">Selectionnez une categorie</p>
              </div>
            ) : (
              <>
              {subcategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Package className="w-8 h-8 text-neutral-200 mb-2" />
                  <p className="text-sm text-neutral-400">Aucune sous-categorie</p>
                </div>
              ) : (
              <div className="divide-y divide-neutral-100">
                {subcategories.map((sub, idx) => {
                  const isSelected = selectedSubcategoryId === sub._id;
                  const productCount = allActiveProducts.filter(p => p.subcategory === sub.slug).length;
                  return (
                    <div
                      key={sub._id}
                      onClick={() => selectSubcategory(sub._id)}
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all group ${
                        isSelected
                          ? 'bg-[#BD7C48]/10 border-r-[3px] border-[#BD7C48]'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sub, 'up', subcategories); }}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sub, 'down', subcategories); }}
                          disabled={idx === subcategories.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Image */}
                      {sub.image ? (
                        <img src={sub.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-neutral-200 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      )}

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#BD7C48]' : 'text-neutral-900'}`}>
                          {sub.name.fr}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate" dir="rtl">
                          {sub.name.ar}
                        </p>
                      </div>

                      {/* Product count */}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        productCount > 0
                          ? 'text-green-700 bg-green-50'
                          : 'text-neutral-400 bg-neutral-100'
                      }`}>
                        {productCount} prod.
                      </span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-[#BD7C48]' : 'text-neutral-300'}`} />
                    </div>
                  );
                })}
              </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* Column 3: Products */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col" style={{ minHeight: 400, maxHeight: 'calc(100vh - 280px)' }}>
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#BD7C48]" />
              {selectedSubcategory ? (
                <>
                  Produits de <span className="text-[#BD7C48]">{selectedSubcategory.name.fr}</span>
                </>
              ) : selectedCategory ? (
                <>
                  Produits de <span className="text-[#BD7C48]">{selectedCategory.name.fr}</span>
                  <span className="text-xs font-normal text-neutral-500">({categoryProducts.length})</span>
                </>
              ) : (
                'Produits'
              )}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedCategoryId ? (
              /* No category selected */
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <ChevronLeft className="w-8 h-8 text-neutral-200 mb-2" />
                <p className="text-sm text-neutral-400">Selectionnez une categorie</p>
              </div>
            ) : !selectedSubcategoryId ? (
              /* Category selected, no subcategory — show overview of all products in category */
              <div className="flex flex-col h-full">
                {categoryProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Package className="w-8 h-8 text-neutral-200 mb-2" />
                    <p className="text-xs text-neutral-400">Aucun produit dans cette categorie</p>
                  </div>
                ) : (
                  <>
                    {/* Products grouped by subcategory */}
                    {subcategories.map(sub => {
                      const subProducts = categoryProducts.filter(p => p.subcategory === sub.slug);
                      if (subProducts.length === 0) return null;
                      return (
                        <div key={sub._id} className="border-b border-neutral-200">
                          <div className="px-3 py-2 bg-green-50/50">
                            <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                              <Check className="w-3 h-3" />
                              {sub.name.fr} ({subProducts.length})
                            </p>
                          </div>
                          <div className="divide-y divide-neutral-100">
                            {subProducts.map(p => renderProductRow(p, 'overview'))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Unassigned products in this category */}
                    {unassignedCategoryProducts.length > 0 && (
                      <div className="border-b border-neutral-200">
                        <div className="px-3 py-2 bg-amber-50/50">
                          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Sans sous-categorie ({unassignedCategoryProducts.length})
                          </p>
                        </div>
                        <div className="divide-y divide-neutral-100">
                          {unassignedCategoryProducts.map(p => renderProductRow(p, 'overview'))}
                        </div>
                      </div>
                    )}

                    {/* Products from other categories */}
                    {otherCategoryProducts.length > 0 && (
                      <div className="border-b border-neutral-200">
                        <div className="px-3 py-2 bg-blue-50/50">
                          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3 h-3" />
                            Autres categories ({otherCategoryProducts.length})
                          </p>
                        </div>
                        <div className="divide-y divide-neutral-100">
                          {otherCategoryProducts.map(p => (
                            <div key={p._id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50">
                              {p.image ? (
                                <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-neutral-200 flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-3.5 h-3.5 text-neutral-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-900 truncate">{p.title.fr}</p>
                                <p className="text-[10px] text-neutral-400 truncate" dir="rtl">{p.title.ar}</p>
                              </div>
                              <span className="flex items-center gap-1 text-[9px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                                {categorySlugToName[p.category] || p.category}
                                {p.subcategory && allSubcategorySlugToName[p.subcategory] ? ` / ${allSubcategorySlugToName[p.subcategory]}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Subcategory selected — assign/remove mode */
              <div className="flex flex-col h-full">
                {/* Assigned products */}
                {assignedProducts.length > 0 && (
                  <div className="border-b border-neutral-200">
                    <div className="px-3 py-2 bg-green-50/50">
                      <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Check className="w-3 h-3" />
                        Assignes ({assignedProducts.length})
                      </p>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {assignedProducts.map(product =>
                        renderProductRow(product, 'assigned', () => toggleRemove(product._id))
                      )}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="px-3 py-2 border-b border-neutral-200">
                  <div className="relative">
                    <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-full py-2 pr-8 pl-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 text-xs outline-none focus:border-[#BD7C48] transition-all"
                    />
                  </div>
                </div>

                {/* Available products (ALL products not in this subcategory) */}
                <div className="flex-1 overflow-y-auto">
                  {availableProducts.length === 0 && assignedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <Package className="w-8 h-8 text-neutral-200 mb-2" />
                      <p className="text-xs text-neutral-400">Aucun produit disponible</p>
                    </div>
                  ) : filteredAvailable.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-neutral-400 italic">
                        {searchQuery ? 'Aucun resultat' : 'Tous les produits sont assignes a cette sous-categorie'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 bg-neutral-50/50">
                        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                          Tous les produits ({filteredAvailable.length})
                        </p>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {filteredAvailable.map(product =>
                          renderProductRow(product, 'available', () => toggleAdd(product._id))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Category/Subcategory Creation Modal */}
      <CategoryFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        parentCategoryId={formModalParentId}
        parentCategoryName={formModalParentName}
      />
    </div>
  );
}
