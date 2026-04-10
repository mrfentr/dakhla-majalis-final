'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Tag,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
  Loader2,
  GripVertical,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Package,
} from 'lucide-react';
import ImageUpload from '@/components/upload/ImageUpload';
import {
  useGetCategories,
  useUpdateCategory,
  useDeleteCategory,
  useSeedCategories,
  useGetGalleryImages,
  useAddGalleryImages,
  useDeleteGalleryImages,
  useSeedGalleryImages,
  useGetProducts,
} from '@/hooks/useConvex';
import SubcategoryProductAssignment from './SubcategoryProductAssignment';
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CategoriesPage() {
  const categories = (useGetCategories() ?? []) as Category[];
  const allProducts = useGetProducts() ?? [];
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const seedCategories = useSeedCategories();

  // Gallery hooks
  const galleryImages = useGetGalleryImages() ?? [];
  const addGalleryImages = useAddGalleryImages();
  const deleteGalleryImages = useDeleteGalleryImages();
  const seedGalleryImages = useSeedGalleryImages();

  // Tab state
  const [activeTab, setActiveTab] = useState<'categories' | 'organizer' | 'gallery'>('categories');

  // Gallery state
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isDeletingGallery, setIsDeletingGallery] = useState(false);
  const [isSeedingGallery, setIsSeedingGallery] = useState(false);

  // Add form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalParentId, setAddModalParentId] = useState<Id<'categories'> | null>(null);
  const [addModalParentName, setAddModalParentName] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<Id<'categories'> | null>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameFr, setEditNameFr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [editImage, setEditImage] = useState('');
  const [editParentCategoryId, setEditParentCategoryId] = useState<Id<'categories'> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: Id<'categories'>; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling state
  const [togglingId, setTogglingId] = useState<Id<'categories'> | null>(null);

  // Expanded categories (to show products)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Expanded subcategories (to show/hide subcategories under a parent)
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());


  const toggleSubcategoriesExpanded = (categoryId: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Category hierarchy helpers
  const topLevelCategories = categories.filter((c) => !c.parentCategoryId);
  const getSubcategories = (parentId: Id<'categories'>) =>
    categories.filter((c) => c.parentCategoryId === parentId);

  // Get non-mandatory products for a category
  const getProductsForCategory = (slug: string) => {
    return allProducts.filter(
      (p: Record<string, unknown>) => (p as { category?: string }).category === slug && !(p as { isMandatory?: boolean }).isMandatory
    );
  };

  // Handle seed
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedCategories();
      toast.success('Categories initialisees avec succes!');
    } catch (error) {
      console.error('Error seeding categories:', error);
      toast.error('Erreur lors de l\'initialisation des categories');
    } finally {
      setIsSeeding(false);
    }
  };

  // Handle create

  // Handle edit start
  const handleEditStart = (cat: Category) => {
    setEditingId(cat._id);
    setEditNameAr(cat.name.ar);
    setEditNameFr(cat.name.fr);
    setEditNameEn(cat.name.en || '');
    setEditSlug(cat.slug);
    setEditOrder(cat.order);
    setEditImage(cat.image ?? '');
    setEditParentCategoryId(cat.parentCategoryId ?? null);
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editNameAr.trim() || !editNameFr.trim() || !editSlug.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setIsSaving(true);
    try {
      await updateCategory({
        id: editingId,
        name: { ar: editNameAr.trim(), fr: editNameFr.trim(), ...(editNameEn.trim() ? { en: editNameEn.trim() } : {}) },
        slug: editSlug.trim(),
        order: editOrder,
        image: editImage || undefined,
        ...(editParentCategoryId ? { parentCategoryId: editParentCategoryId } : {}),
      });
      toast.success('Categorie mise a jour!');
      setEditingId(null);
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Handle add subcategory - opens modal with parent pre-filled
  const handleAddSubcategory = (parentId: Id<'categories'>) => {
    const parent = topLevelCategories.find(c => c._id === parentId);
    setAddModalParentId(parentId);
    setAddModalParentName(parent?.name.fr || '');
    setShowAddModal(true);
  };

  // Handle toggle active
  const handleToggleActive = async (cat: Category) => {
    setTogglingId(cat._id);
    try {
      await updateCategory({
        id: cat._id,
        isActive: !cat.isActive,
      });
      toast.success(cat.isActive ? 'Categorie desactivee' : 'Categorie activee');
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Erreur lors du changement de statut');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle delete
  const handleDeleteClick = (cat: Category) => {
    setCategoryToDelete({ id: cat._id, name: cat.name.fr });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCategory({ id: categoryToDelete.id });
      toast.success('Categorie supprimee avec succes!');
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  // Handle order change inline
  const handleOrderChange = async (cat: Category, newOrderVal: number) => {
    try {
      await updateCategory({
        id: cat._id,
        order: newOrderVal,
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erreur lors de la mise a jour de l\'ordre');
    }
  };

  // Gallery handlers
  const handleGallerySeed = async () => {
    setIsSeedingGallery(true);
    try {
      await seedGalleryImages();
      toast.success('Images de la galerie initialisees!');
    } catch (error) {
      console.error('Error seeding gallery:', error);
      toast.error('Erreur lors de l\'initialisation de la galerie');
    } finally {
      setIsSeedingGallery(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setIsUploadingGallery(true);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        urls.push(data.url);
      }
      if (urls.length > 0) {
        await addGalleryImages({ urls });
        toast.success(`${urls.length} image(s) ajoutee(s)!`);
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      toast.error('Erreur lors du televersement');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleGalleryDeleteSelected = async () => {
    if (selectedGalleryIds.size === 0) return;
    setIsDeletingGallery(true);
    try {
      await deleteGalleryImages({
        ids: Array.from(selectedGalleryIds) as Id<'galleryImages'>[],
      });
      toast.success(`${selectedGalleryIds.size} image(s) supprimee(s)!`);
      setSelectedGalleryIds(new Set());
    } catch (error) {
      console.error('Error deleting gallery images:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeletingGallery(false);
    }
  };

  const toggleGallerySelect = (id: string) => {
    setSelectedGalleryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGalleryIds.size === galleryImages.length) {
      setSelectedGalleryIds(new Set());
    } else {
      setSelectedGalleryIds(new Set(galleryImages.map((img) => img._id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-2">Categories & Galerie</h1>
          <p className="text-sm sm:text-base text-neutral-600 mb-4">
            Gerez les categories de produits et la galerie d&apos;images du site
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'categories'
                  ? 'bg-[#BD7C48] text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Tag className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('organizer')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'organizer'
                  ? 'bg-[#BD7C48] text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <GripVertical className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Organisateur
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                activeTab === 'gallery'
                  ? 'bg-[#BD7C48] text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Galerie ({galleryImages.length})
            </button>
          </div>
        </div>

        {activeTab === 'categories' && (<>
          {/* Categories Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="bg-white rounded-xl border border-neutral-200 px-4 py-2">
                <span className="text-xs text-neutral-600">Total </span>
                <span className="text-lg font-black text-neutral-900">{categories.length}</span>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 px-4 py-2">
                <span className="text-xs text-neutral-600">Actives </span>
                <span className="text-lg font-black text-green-600">{categories.filter(c => c.isActive).length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('organizer')}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-white border border-neutral-200 hover:border-[#BD7C48] text-neutral-700 hover:text-[#BD7C48] font-bold rounded-xl transition-all"
              >
                <GripVertical className="w-5 h-5" />
                <span className="hidden sm:inline">Organisateur</span>
              </button>
              <button
                onClick={() => { setAddModalParentId(null); setAddModalParentName(''); setShowAddModal(true); }}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter une categorie</span>
              </button>
            </div>
          </div>

        {/* Seed Button - shown only when no categories exist */}
        {categories.length === 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-[#BD7C48]/40 p-8 sm:p-12 mb-6 text-center">
            <div className="w-16 h-16 bg-[#BD7C48]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-[#BD7C48]" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucune categorie</h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              Vous n&apos;avez pas encore de categories. Initialisez les categories par defaut pour commencer.
            </p>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initialisation...</span>
                </>
              ) : (
                <>
                  <Tag className="w-5 h-5" />
                  <span>Initialiser les categories par defaut</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Add Form */}
        {/* Category/Subcategory Creation Modal */}
        <CategoryFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          parentCategoryId={addModalParentId}
          parentCategoryName={addModalParentName}
        />

        {/* Categories Table */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900 w-20">
                      Ordre
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900 w-24">
                      Image
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      Nom (Arabe)
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      Nom (Francais)
                    </th>
                    <th className="hidden lg:table-cell px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      English name
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-sm font-black text-neutral-900">
                      Slug
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      Produits
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      Statut
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {topLevelCategories.map((cat) => {
                    const isEditing = editingId === cat._id;
                    const categoryProducts = getProductsForCategory(cat.slug);
                    const isExpanded = expandedCategories.has(cat._id);
                    const subcats = getSubcategories(cat._id);
                    const isSubcatsExpanded = expandedSubcategories.has(cat._id);
                    const totalColumns = 9; // Order, Image, Name AR, Name FR, Name EN, Slug, Produits, Statut, Actions

                    const renderCategoryRow = (rowCat: Category, isSubcategory: boolean) => {
                      const rowIsEditing = editingId === rowCat._id;
                      const rowProducts = getProductsForCategory(rowCat.slug);
                      const rowIsExpanded = expandedCategories.has(rowCat._id);

                      return (
                        <React.Fragment key={rowCat._id}>
                        <tr className={`hover:bg-neutral-50 transition-colors ${isSubcategory ? 'bg-neutral-25' : ''}`}>
                          {/* Order */}
                          <td className="px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <div className={isSubcategory ? 'pl-6' : ''}>
                                <input
                                  type="number"
                                  value={editOrder}
                                  onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                                  min={0}
                                  className="w-16 px-2 py-1.5 bg-neutral-50 border-2 border-[#BD7C48] rounded-lg text-neutral-900 focus:ring-0 transition-colors font-bold text-center"
                                />
                              </div>
                            ) : (
                              <div className={`flex items-center gap-2 ${isSubcategory ? 'pl-6' : ''}`}>
                                <GripVertical className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                                <input
                                  type="number"
                                  value={rowCat.order}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleOrderChange(rowCat, val);
                                  }}
                                  min={0}
                                  className="w-14 px-2 py-1 bg-transparent border border-neutral-200 rounded-lg text-neutral-900 focus:border-[#BD7C48] focus:ring-0 transition-colors font-bold text-center hover:border-neutral-300"
                                />
                              </div>
                            )}
                          </td>

                          {/* Image */}
                          <td className="px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <ImageUpload
                                value={editImage}
                                onChange={setEditImage}
                                label="Image"
                                className="w-20"
                              />
                            ) : rowCat.image ? (
                              <img
                                src={rowCat.image}
                                alt={rowCat.name.fr}
                                className={`rounded-lg object-cover border border-neutral-200 ${isSubcategory ? 'w-12 h-12' : 'w-16 h-16'}`}
                              />
                            ) : (
                              <div className={`rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center ${isSubcategory ? 'w-12 h-12' : 'w-16 h-16'}`}>
                                <ImageIcon className="w-5 h-5 text-neutral-400" />
                              </div>
                            )}
                          </td>

                          {/* Arabic Name */}
                          <td className="px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editNameAr}
                                  onChange={(e) => setEditNameAr(e.target.value)}
                                  dir="rtl"
                                  className="w-full px-3 py-1.5 bg-neutral-50 border-2 border-[#BD7C48] rounded-lg text-neutral-900 focus:ring-0 transition-colors font-medium"
                                />
                                {/* Parent category selector in edit mode */}
                                <select
                                  value={editParentCategoryId ?? ''}
                                  onChange={(e) => setEditParentCategoryId(e.target.value ? e.target.value as Id<'categories'> : null)}
                                  className="w-full px-2 py-1 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-700 focus:border-[#BD7C48] focus:ring-0 transition-colors"
                                >
                                  <option value="">-- Top-level --</option>
                                  {topLevelCategories.filter(c => c._id !== rowCat._id).map((parent) => (
                                    <option key={parent._id} value={parent._id}>
                                      Sous-cat de: {parent.name.fr}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {isSubcategory && (
                                  <span className="text-neutral-400 text-sm flex-shrink-0">&#8627;</span>
                                )}
                                <span className={`text-sm font-medium text-neutral-900 ${isSubcategory ? 'text-neutral-700' : ''}`} dir="rtl">
                                  {rowCat.name.ar}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* French Name */}
                          <td className="px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <input
                                type="text"
                                value={editNameFr}
                                onChange={(e) => setEditNameFr(e.target.value)}
                                className="w-full px-3 py-1.5 bg-neutral-50 border-2 border-[#BD7C48] rounded-lg text-neutral-900 focus:ring-0 transition-colors font-medium"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {isSubcategory && (
                                  <span className="text-neutral-400 text-sm flex-shrink-0">&#8627;</span>
                                )}
                                <span className={`text-sm font-bold ${isSubcategory ? 'text-neutral-700' : 'text-neutral-900'}`}>
                                  {rowCat.name.fr}
                                </span>
                                {isSubcategory && (
                                  <span className="text-[10px] font-bold text-[#BD7C48]/70 bg-[#BD7C48]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    sous-cat
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* English Name */}
                          <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <input
                                type="text"
                                value={editNameEn}
                                onChange={(e) => setEditNameEn(e.target.value)}
                                placeholder="English (optional)"
                                className="w-full px-3 py-1.5 bg-neutral-50 border-2 border-[#BD7C48] rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-0 transition-colors font-medium"
                              />
                            ) : (
                              <span className="text-sm text-neutral-500">{rowCat.name.en || '—'}</span>
                            )}
                          </td>

                          {/* Slug */}
                          <td className="hidden md:table-cell px-6 py-4">
                            {rowIsEditing ? (
                              <input
                                type="text"
                                value={editSlug}
                                onChange={(e) => setEditSlug(e.target.value)}
                                className="w-full px-3 py-1.5 bg-neutral-50 border-2 border-[#BD7C48] rounded-lg text-neutral-900 focus:ring-0 transition-colors font-medium"
                              />
                            ) : (
                              <span className="text-sm text-neutral-500 font-mono bg-neutral-50 px-2 py-1 rounded">
                                {rowCat.slug}
                              </span>
                            )}
                          </td>

                          {/* Products Count */}
                          <td className="px-4 sm:px-6 py-4">
                            <button
                              onClick={() => toggleExpanded(rowCat._id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors group"
                            >
                              {rowIsExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#BD7C48]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#BD7C48]" />
                              )}
                              <Package className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="text-sm font-bold text-neutral-700">
                                {rowProducts.length}
                              </span>
                            </button>
                          </td>

                          {/* Status Toggle */}
                          <td className="px-4 sm:px-6 py-4">
                            <button
                              onClick={() => handleToggleActive(rowCat)}
                              disabled={togglingId === rowCat._id}
                              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                              style={{ backgroundColor: rowCat.isActive ? '#BD7C48' : '#d1d5db' }}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  rowCat.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className={`ml-2 text-xs font-bold ${rowCat.isActive ? 'text-green-700' : 'text-neutral-500'}`}>
                              {rowCat.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 sm:px-6 py-4">
                            {rowIsEditing ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleEditSave}
                                  disabled={isSaving}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                  title="Enregistrer"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={handleEditCancel}
                                  disabled={isSaving}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors disabled:opacity-50"
                                  title="Annuler"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {/* Add subcategory button - only for top-level categories */}
                                {!isSubcategory && (
                                  <button
                                    onClick={() => handleAddSubcategory(rowCat._id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#BD7C48]/10 text-neutral-400 hover:text-[#BD7C48] transition-colors"
                                    title="Ajouter une sous-categorie"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditStart(rowCat)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-[#BD7C48] transition-colors"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(rowCat)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Products Row */}
                        {rowIsExpanded && (
                          <tr>
                            <td colSpan={totalColumns} className="p-0">
                              <div className="bg-neutral-50/80 border-t border-neutral-100 px-4 sm:px-6 py-4">
                                {rowProducts.length === 0 ? (
                                  <div className="text-center py-6">
                                    <Package className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                                    <p className="text-sm text-neutral-500">Aucun produit dans cette categorie</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-bold text-neutral-700">
                                        Produits dans &laquo;{rowCat.name.fr}&raquo; ({rowProducts.length})
                                      </h4>
                                    </div>
                                    <div className="grid gap-2">
                                      {rowProducts.map((product: Record<string, unknown>) => {
                                        const p = product as {
                                          _id: string;
                                          title?: { ar?: string; fr?: string };
                                          image?: string;
                                          pricing?: { basePrice?: number };
                                          status?: string;
                                          productType?: string;
                                        };
                                        return (
                                          <div
                                            key={p._id}
                                            className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-3 py-2.5 hover:border-[#BD7C48]/40 transition-colors"
                                          >
                                            {/* Product Image */}
                                            {p.image ? (
                                              <img
                                                src={p.image}
                                                alt={p.title?.ar || ''}
                                                className="w-10 h-10 rounded-lg object-cover border border-neutral-200 flex-shrink-0"
                                              />
                                            ) : (
                                              <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                                                <ImageIcon className="w-4 h-4 text-neutral-400" />
                                              </div>
                                            )}

                                            {/* Product Name (Arabic) */}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-neutral-900 truncate" dir="rtl">
                                                {p.title?.ar || 'Sans nom'}
                                              </p>
                                              {p.title?.fr && (
                                                <p className="text-xs text-neutral-500 truncate">
                                                  {p.title.fr}
                                                </p>
                                              )}
                                            </div>

                                            {/* Price */}
                                            <div className="text-sm font-bold text-neutral-700 flex-shrink-0">
                                              {p.pricing?.basePrice != null
                                                ? `${p.pricing.basePrice} DH`
                                                : '-'}
                                            </div>

                                            {/* Status Badge */}
                                            <span
                                              className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                p.status === 'active'
                                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                                  : p.status === 'draft'
                                                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                              }`}
                                            >
                                              {p.status === 'active' ? 'Actif' : p.status === 'draft' ? 'Brouillon' : 'Inactif'}
                                            </span>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <Link
                                                href={`/dashboard/products/${p._id}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#BD7C48] bg-[#BD7C48]/10 hover:bg-[#BD7C48]/20 rounded-lg transition-colors"
                                              >
                                                <Edit className="w-3 h-3" />
                                                Modifier
                                              </Link>
                                              <Link
                                                href={`/dashboard/products/${p._id}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                Voir
                                              </Link>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    };

                    return (
                      <React.Fragment key={cat._id}>
                        {/* Parent category row */}
                        {renderCategoryRow(cat, false)}

                        {/* Subcategories toggle row - only show if there are subcategories */}
                        {subcats.length > 0 && (
                          <tr className="border-t-0">
                            <td colSpan={totalColumns} className="px-4 sm:px-6 py-0">
                              <button
                                onClick={() => toggleSubcategoriesExpanded(cat._id)}
                                className="flex items-center gap-2 py-2 text-xs font-bold text-[#BD7C48] hover:text-[#A0673D] transition-colors"
                              >
                                {isSubcatsExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                                <span>{subcats.length} sous-categorie{subcats.length > 1 ? 's' : ''}</span>
                              </button>
                            </td>
                          </tr>
                        )}

                        {/* Subcategory rows */}
                        {isSubcatsExpanded && subcats.map((subcat) => renderCategoryRow(subcat, true))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </>)}

        {/* Organizer Tab */}
        {activeTab === 'organizer' && (
          <SubcategoryProductAssignment />
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div>
            {/* Gallery Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex gap-3 items-center">
                <div className="bg-white rounded-xl border border-neutral-200 px-4 py-2">
                  <span className="text-xs text-neutral-600">Total </span>
                  <span className="text-lg font-black text-neutral-900">{galleryImages.length}</span>
                </div>
                {selectedGalleryIds.size > 0 && (
                  <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-2">
                    <span className="text-xs text-red-600">Selectionnees </span>
                    <span className="text-lg font-black text-red-600">{selectedGalleryIds.size}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedGalleryIds.size > 0 && (
                  <button
                    onClick={handleGalleryDeleteSelected}
                    disabled={isDeletingGallery}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isDeletingGallery ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>Supprimer ({selectedGalleryIds.size})</span>
                  </button>
                )}
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all cursor-pointer ${isUploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isUploadingGallery ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isUploadingGallery ? 'Televersement...' : 'Ajouter des images'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleGalleryUpload(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    disabled={isUploadingGallery}
                  />
                </label>
              </div>
            </div>

            {/* Seed button when empty */}
            {galleryImages.length === 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-[#BD7C48]/40 p-8 sm:p-12 mb-6 text-center">
                <div className="w-16 h-16 bg-[#BD7C48]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-[#BD7C48]" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucune image dans la galerie</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Initialisez la galerie avec les images existantes ou ajoutez de nouvelles images.
                </p>
                <button
                  onClick={handleGallerySeed}
                  disabled={isSeedingGallery}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isSeedingGallery ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Initialisation...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      <span>Initialiser avec les images existantes</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Gallery Grid */}
            {galleryImages.length > 0 && (
              <div>
                {/* Select all */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGalleryIds.size === galleryImages.length}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300 text-[#BD7C48] focus:ring-[#BD7C48]"
                    />
                    Tout selectionner
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {galleryImages.map((img) => {
                    const isSelected = selectedGalleryIds.has(img._id);
                    return (
                      <div
                        key={img._id}
                        onClick={() => toggleGallerySelect(img._id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                          isSelected
                            ? 'border-red-500 ring-2 ring-red-200'
                            : 'border-neutral-200 hover:border-[#BD7C48]'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {/* Checkbox overlay */}
                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isSelected ? 'bg-red-500' : 'bg-white/80 group-hover:bg-white'
                        }`}>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded border-2 border-neutral-400" />
                          )}
                        </div>
                        {/* Selected overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-500/20" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal - Rendered via Portal */}
        {deleteModalOpen && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Supprimer la categorie</h3>
                  <p className="text-sm text-neutral-600">Cette action est irreversible</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-neutral-700">
                  Etes-vous sur de vouloir supprimer{' '}
                  <span className="font-bold text-neutral-900">{categoryToDelete?.name}</span> ?
                </p>
                <p className="text-sm text-neutral-600 mt-2">
                  Les produits associes a cette categorie ne seront pas supprimes, mais perdront leur association.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}
