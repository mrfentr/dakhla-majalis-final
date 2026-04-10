'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Calendar,
  Globe,
  Loader2,
  Tag as TagIcon
} from 'lucide-react';
import { useCreateBlog } from '@/hooks/useConvex';
import TiptapEditor from '@/components/editor/TiptapEditor';
import TagInput from '@/components/editor/TagInput';
import toast from 'react-hot-toast';

export default function NewBlogPage() {
  const router = useRouter();
  const createBlog = useCreateBlog();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState('Équipe Dakhla Majalis');
  const [status, setStatus] = useState<'published' | 'draft'>('draft');

  // English translation fields
  const [titleEn, setTitleEn] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [contentEn, setContentEn] = useState('');

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState<string[]>([]);

  // Gallery
  const [gallery, setGallery] = useState<Array<{ url: string; alt?: string; caption?: string }>>([]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Track if fields were manually edited
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSeoTitleManuallyEdited, setIsSeoTitleManuallyEdited] = useState(false);
  const [isMetaDescriptionManuallyEdited, setIsMetaDescriptionManuallyEdited] = useState(false);
  const [areMetaKeywordsManuallyEdited, setAreMetaKeywordsManuallyEdited] = useState(false);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Auto-fill SEO title from title
  useEffect(() => {
    if (title && !isSeoTitleManuallyEdited) {
      setSeoTitle(`${title} | Dakhla Majalis`);
    }
  }, [title, isSeoTitleManuallyEdited]);

  // Auto-fill meta description from excerpt
  useEffect(() => {
    if (excerpt && !isMetaDescriptionManuallyEdited) {
      setMetaDescription(excerpt);
    }
  }, [excerpt, isMetaDescriptionManuallyEdited]);

  // Auto-fill meta keywords from tags
  useEffect(() => {
    if (!areMetaKeywordsManuallyEdited) {
      setMetaKeywords(tags.slice(0, 10)); // Auto-sync all tags (max 10)
    }
  }, [tags, areMetaKeywordsManuallyEdited]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug only if not manually edited
    if (!isSlugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
    setIsSlugManuallyEdited(true);
  };

  const handleSeoTitleChange = (value: string) => {
    setSeoTitle(value);
    setIsSeoTitleManuallyEdited(true);
  };

  const handleMetaDescriptionChange = (value: string) => {
    setMetaDescription(value);
    setIsMetaDescriptionManuallyEdited(true);
  };

  const handleMetaKeywordsChange = (keywords: string[]) => {
    setMetaKeywords(keywords);
    setAreMetaKeywordsManuallyEdited(true);
  };

  const handleImageUpload = useCallback(async (file: File, type: 'featured' | 'gallery' = 'featured') => {
    if (!file) return '';

    // Check file size
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 MB');
      return '';
    }

    try {
      setIsUploadingImage(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (type === 'featured') {
        setFeaturedImage(data.url);
        toast.success('Image téléchargée avec succès');
      } else {
        setGallery([...gallery, { url: data.url, alt: title, caption: '' }]);
        toast.success('Image ajoutée à la galerie');
      }

      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Échec du téléchargement de l\'image');
      return '';
    } finally {
      setIsUploadingImage(false);
    }
  }, [gallery, title]);

  const handleFeaturedImageSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageUpload(file, 'featured');
      }
    };
    input.click();
  };

  const handleGalleryImageSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      for (const file of files) {
        await handleImageUpload(file, 'gallery');
      }
    };
    input.click();
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index));
  };

  const handleSave = async (saveStatus: 'published' | 'draft') => {
    // Validation
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (!slug.trim()) {
      toast.error('Le slug est requis');
      return;
    }
    if (!excerpt.trim()) {
      toast.error('Le résumé est requis');
      return;
    }
    if (!content.trim() || content === '<p></p>') {
      toast.error('Le contenu est requis');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build English translations if any English field is filled
      const enTranslations = (titleEn.trim() || excerptEn.trim() || contentEn.trim())
        ? {
            ...(titleEn.trim() ? { title: titleEn.trim() } : {}),
            ...(excerptEn.trim() ? { excerpt: excerptEn.trim() } : {}),
            ...(contentEn.trim() ? { content: contentEn.trim() } : {}),
          }
        : undefined;

      await createBlog({
        title,
        slug,
        excerpt,
        content,
        author,
        publishedAt: saveStatus === 'published' ? Date.now() : undefined,
        status: saveStatus,
        tags,
        imageUrl: featuredImage || undefined,
        gallery: gallery.length > 0 ? gallery : undefined,
        metaDescription: metaDescription || undefined,
        metaKeywords: metaKeywords.length > 0 ? metaKeywords : undefined,
        seoTitle: seoTitle || undefined,
        ...(enTranslations ? { translations: { en: enTranslations } } : {}),
      });

      toast.success(saveStatus === 'published' ? 'Article publié avec succès !' : 'Article enregistré comme brouillon');
      router.push('/dashboard/blog');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/blog')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Nouvel article</h1>
            <p className="text-sm text-neutral-600">Créer un nouvel article pour le blog</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={isSubmitting}
            className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Brouillon</span>
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">Publier</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contenu principal
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Titre de l'article <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Entrez le titre de l'article..."
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                  disabled={isSubmitting}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  URL de l'article (Slug) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="blog-post-url"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                  dir="ltr"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  URL: /blog/{slug || 'blog-post-url'}
                </p>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Résumé <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Résumé court de l'article (affiché dans les cartes et listes d'articles)..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors resize-none"
                  disabled={isSubmitting}
                  maxLength={200}
                />
                <p className="text-xs text-neutral-500 mt-1">{excerpt.length} / 200 caractères</p>
              </div>

              {/* Content - Tiptap Editor */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Contenu de l'article <span className="text-red-500">*</span>
                </label>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  onImageUpload={handleImageUpload}
                  placeholder="Rédigez le contenu de l'article ici..."
                />
              </div>
            </div>
          </div>

          {/* English Translations Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              English translations <span className="text-sm text-neutral-400 font-normal">(optional)</span>
            </h2>

            <div className="space-y-4">
              {/* English Title */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Title (English)
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Article title in English..."
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                  dir="ltr"
                  disabled={isSubmitting}
                />
              </div>

              {/* English Excerpt */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Excerpt (English)
                </label>
                <textarea
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                  placeholder="Short summary of the article in English..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors resize-none"
                  dir="ltr"
                  disabled={isSubmitting}
                  maxLength={200}
                />
                <p className="text-xs text-neutral-500 mt-1">{excerptEn.length} / 200 characters</p>
              </div>

              {/* English Content */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Content (English)
                </label>
                <TiptapEditor
                  content={contentEn}
                  onChange={setContentEn}
                  onImageUpload={handleImageUpload}
                  placeholder="Write the article content in English here..."
                />
              </div>
            </div>
          </div>

          {/* SEO Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              SEO (auto-rempli)
            </h2>

            <div className="space-y-4">
              {/* SEO Title */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Titre Meta
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => handleSeoTitleChange(e.target.value)}
                  placeholder="Auto-rempli depuis le titre"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors"
                  disabled={isSubmitting}
                  maxLength={60}
                />
                <p className="text-xs text-neutral-500 mt-1">{seoTitle.length} / 60 caractères</p>
              </div>

              {/* Meta Description */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Description Meta
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => handleMetaDescriptionChange(e.target.value)}
                  placeholder="Auto-remplie depuis le résumé"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors resize-none"
                  disabled={isSubmitting}
                  maxLength={160}
                />
                <p className="text-xs text-neutral-500 mt-1">{metaDescription.length} / 160 caractères</p>
              </div>

              {/* Meta Keywords */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Mots-clés (auto-remplis depuis les tags)
                </label>
                <TagInput
                  tags={metaKeywords}
                  onChange={handleMetaKeywordsChange}
                  placeholder="Entrez des mots-clés séparés par des virgules..."
                  maxTags={10}
                />
              </div>
            </div>
          </div>

          {/* Gallery Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Galerie d'images
            </h2>

            <div className="space-y-4">
              {gallery.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 group">
                      <Image
                        src={img.url}
                        alt={img.alt || ''}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleGalleryImageSelect}
                disabled={isUploadingImage || isSubmitting}
                className="w-full h-32 border-2 border-dashed border-neutral-300 hover:border-[#BD7C48] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors text-neutral-500 hover:text-[#BD7C48] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">Ajouter des images à la galerie</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Publishing Options */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Publication
            </h2>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 mb-1.5">Auteur</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Image principale
            </h2>

            {featuredImage ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-neutral-200">
                <Image
                  src={featuredImage}
                  alt="Featured"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImage('')}
                  disabled={isSubmitting}
                  className="absolute top-2 left-2 w-8 h-8 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFeaturedImageSelect}
                disabled={isUploadingImage || isSubmitting}
                className="w-full h-48 border-2 border-dashed border-neutral-300 hover:border-[#BD7C48] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors text-neutral-500 hover:text-[#BD7C48] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Télécharger l'image</span>
                    <span className="text-xs text-neutral-400">PNG, JPG (max 2MB)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              Tags
            </h2>

            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Entrez des tags séparés par des virgules..."
              maxTags={10}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
