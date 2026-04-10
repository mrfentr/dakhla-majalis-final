'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FileText,
  Search,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus,
  Tag,
  Loader2,
  X
} from 'lucide-react';
import { useGetAllBlogsForAdmin, useDeleteBlog } from '@/hooks/useConvex';
import toast from 'react-hot-toast';

export default function BlogPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  // Fetch blogs from Convex
  const blogs = useGetAllBlogsForAdmin();
  const deleteBlog = useDeleteBlog();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (selectedPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPost]);

  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'published', label: 'Publié' },
    { value: 'draft', label: 'Brouillon' }
  ];

  const filteredPosts = useMemo(() => {
    if (!blogs) return [];

    return blogs.filter(post => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = selectedStatus === 'all' || post.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [blogs, searchQuery, selectedStatus]);

  const getStatusConfig = (status: 'published' | 'draft') => {
    const configs = {
      published: { label: 'Publié', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      draft: { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
    };
    return configs[status];
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await deleteBlog({ id: id as any });
        setSelectedPost(null);
        toast.success('Article supprimé avec succès');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (!blogs) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#BD7C48]" />
      </div>
    );
  }

  const totalBlogs = blogs.length;
  const publishedBlogs = blogs.filter(p => p.status === 'published').length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Blog</h1>
          <p className="text-sm text-neutral-600">Gestion des articles et contenu du blog</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/blog/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvel article</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Total articles</p>
          <p className="text-2xl font-black text-neutral-900">{totalBlogs}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Publiés</p>
          <p className="text-2xl font-black text-green-600">{publishedBlogs}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Brouillons</p>
          <p className="text-2xl font-black text-gray-600">{totalBlogs - publishedBlogs}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Taux publication</p>
          <p className="text-2xl font-black text-[#BD7C48]">
            {totalBlogs > 0 ? Math.round((publishedBlogs / totalBlogs) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les articles..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucun article</h3>
          <p className="text-sm text-neutral-600 mb-4">Aucun article ne correspond à la recherche</p>
          <button
            onClick={() => router.push('/dashboard/blog/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Créer un nouvel article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map((post) => {
            const statusConfig = getStatusConfig(post.status);
            return (
              <div
                key={post._id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all group"
              >
                <div className="flex gap-5 p-5">
                  {/* Image */}
                  {post.imageUrl && (
                    <div className="relative w-40 h-28 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-bold text-neutral-900 line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${statusConfig.bg} ${statusConfig.color} whitespace-nowrap flex-shrink-0`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Excerpt */}
                    <p className="text-sm text-neutral-600 line-clamp-2 mb-3 flex-1">
                      {post.excerpt}
                    </p>

                    {/* Meta & Actions */}
                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-100">
                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Tag className="w-3.5 h-3.5" />
                          {post.tags.length} tags
                        </span>
                        {post.status === 'published' && (
                          <>
                            <span className="text-neutral-300">|</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(post.publishedAt)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/blog/${post._id}`)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#BD7C48] hover:bg-[#A0673D] rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Modifier
                        </button>
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-[#BD7C48] hover:bg-neutral-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post._id)}
                          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Details Drawer */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-neutral-900 flex-1 ml-8 line-clamp-1">{selectedPost.title}</h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Featured Image */}
              {selectedPost.imageUrl && (
                <div className="relative w-full h-64 rounded-xl overflow-hidden">
                  <Image
                    src={selectedPost.imageUrl}
                    alt={selectedPost.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3">Informations de base</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-neutral-600">Statut</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusConfig(selectedPost.status).bg} ${getStatusConfig(selectedPost.status).color}`}>
                      {getStatusConfig(selectedPost.status).label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-neutral-600">Auteur</span>
                    <span className="font-bold text-neutral-900">{selectedPost.author}</span>
                  </div>
                  {selectedPost.status === 'published' && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-600">Date de publication</span>
                      <span className="font-bold text-neutral-900">{formatDate(selectedPost.publishedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-2">Résumé</h3>
                <p className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3">
                  {selectedPost.excerpt}
                </p>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#BD7C48]/10 text-[#BD7C48] text-xs font-bold rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* SEO Info */}
              {(selectedPost.seoTitle || selectedPost.metaDescription || selectedPost.metaKeywords) && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-3">Informations SEO</h3>
                  <div className="space-y-3">
                    {selectedPost.seoTitle && (
                      <div>
                        <label className="text-xs text-neutral-600 mb-1 block">Titre Meta</label>
                        <p className="text-sm text-neutral-900 font-medium">{selectedPost.seoTitle}</p>
                      </div>
                    )}
                    {selectedPost.metaDescription && (
                      <div>
                        <label className="text-xs text-neutral-600 mb-1 block">Description Meta</label>
                        <p className="text-sm text-neutral-700">{selectedPost.metaDescription}</p>
                      </div>
                    )}
                    {selectedPost.metaKeywords && selectedPost.metaKeywords.length > 0 && (
                      <div>
                        <label className="text-xs text-neutral-600 mb-1 block">Mots-clés</label>
                        <div className="flex flex-wrap gap-1">
                          {selectedPost.metaKeywords.map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => router.push(`/dashboard/blog/${selectedPost._id}`)}
                  className="flex-1 px-4 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier l'article
                </button>
                <button
                  onClick={() => handleDelete(selectedPost._id)}
                  className="px-4 py-3 border border-red-300 hover:bg-red-50 text-red-600 rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
