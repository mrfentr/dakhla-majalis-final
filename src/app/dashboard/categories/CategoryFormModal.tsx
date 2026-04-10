'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import ImageUpload from '@/components/upload/ImageUpload';
import { useCreateCategory } from '@/hooks/useConvex';
import toast from 'react-hot-toast';
import type { Id } from '@convex/_generated/dataModel';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill parentCategoryId to create a subcategory */
  parentCategoryId?: Id<'categories'> | null;
  /** Parent category name for display */
  parentCategoryName?: string;
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  parentCategoryId = null,
  parentCategoryName,
}: CategoryFormModalProps) {
  const createCategory = useCreateCategory();

  const [nameAr, setNameAr] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [order, setOrder] = useState(0);
  const [image, setImage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNameAr('');
      setNameFr('');
      setNameEn('');
      setSlug('');
      setOrder(0);
      setImage('');
    }
  }, [isOpen]);

  const handleFrNameChange = (value: string) => {
    setNameFr(value);
    setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameFr.trim() || !slug.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setIsCreating(true);
    try {
      await createCategory({
        name: { ar: nameAr.trim(), fr: nameFr.trim(), ...(nameEn.trim() ? { en: nameEn.trim() } : {}) },
        slug: slug.trim(),
        order,
        isActive: true,
        ...(image ? { image } : {}),
        ...(parentCategoryId ? { parentCategoryId: parentCategoryId } : {}),
      });
      toast.success(parentCategoryId ? 'Sous-categorie creee avec succes!' : 'Categorie creee avec succes!');
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Erreur lors de la creation');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const isSubcategory = !!parentCategoryId;
  const title = isSubcategory
    ? `Nouvelle sous-categorie${parentCategoryName ? ` de "${parentCategoryName}"` : ''}`
    : 'Nouvelle categorie';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1">Image</label>
            <ImageUpload value={image} onChange={setImage} label="Image de la categorie" />
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Nom (Arabe)</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="الاسم بالعربية"
                dir="rtl"
                className="w-full px-4 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Nom (Francais)</label>
              <input
                type="text"
                value={nameFr}
                onChange={(e) => handleFrNameChange(e.target.value)}
                placeholder="Nom en francais"
                className="w-full px-4 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1">
              English name <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Name in English"
              className="w-full px-4 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
            />
          </div>

          {/* Slug + Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="slug-auto-genere"
                className="w-full px-4 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Ordre</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-4 py-2.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ajout...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
