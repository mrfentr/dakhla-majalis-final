'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ArrowUpDown,
  Link2,
  Ruler,
  Box,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useGetProducts, useDeleteProduct, useUpdateProduct, useGetCategories } from '@/hooks/useConvex';
import toast from 'react-hot-toast';
import type { Id } from '@convex/_generated/dataModel';

interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  price: number;
  stock: number;
  image: string;
  status: 'active' | 'draft' | 'outofstock';
  createdAt: string;
  productType: 'individual' | 'majalis' | 'standalone';
  linkedProduct?: string; // For individual products, shows which mandatory product
  colorVariants?: Array<{ name: string | { ar: string; fr: string; en?: string }; hex: string; image?: string; gallery?: string[] }>;
}

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch ALL products (including inactive/draft) for dashboard management
  const convexProducts = useGetProducts({ status: 'all' }) ?? [];
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const dbCategories = useGetCategories() ?? [];

  // Transform Convex products to match Product interface
  const products: Product[] = useMemo(() => {
    return convexProducts
      // Filter out mandatory products - they should not be shown in the products list
      .filter(product => !product.isMandatory)
      .map(product => {
        // Determine product type FIRST
        let productType: 'individual' | 'majalis' | 'standalone' = 'standalone';
        let linkedProduct: string | undefined;

        // Products with productType "poufs" are individual pouf products
        if (product.productType === 'poufs') {
          productType = 'individual';
          linkedProduct = 'Poufs';
        }
        // Type 1: Individual - linked to one mandatory product
        else if (product.composition && Object.keys(product.composition).length === 1) {
          const mandatoryType = Object.keys(product.composition)[0];
          if (['glassat', 'wsayd', 'coudoir', 'zerbiya', 'poufs'].includes(mandatoryType)) {
            productType = 'individual';
            linkedProduct = mandatoryType.charAt(0).toUpperCase() + mandatoryType.slice(1);
          }
        }
        // Type 2: Majalis Sitting - room measurement product
        else if (product.productType === 'majalis_set' ||
                 (product.category === 'custom' && product.composition && Object.keys(product.composition).length === 4)) {
          productType = 'majalis';
        }
        // Type 3: Standalone - independent product
        else {
          productType = 'standalone';
        }

        // Determine status - map Convex status to UI status
        let status: 'active' | 'draft' | 'outofstock' =
          product.status === 'inactive' ? 'draft' : product.status;

        if (product.inventory.stockQuantity === 0) {
          status = 'outofstock';
        }

        // Determine category label
        const categoryLabels: Record<string, string> = {};
        for (const cat of dbCategories) {
          categoryLabels[cat.slug] = cat.name.fr;
        }

        return {
          id: product._id,
          name: product.title.fr,
          category: categoryLabels[product.category] || 'Produits individuels',
          size: 'Selon l\'espace',
          price: product.pricing.basePrice,
          stock: product.inventory.stockQuantity,
          image: product.image,
          status,
          createdAt: new Date(product.createdAt).toISOString().split('T')[0],
          productType,
          linkedProduct,
          colorVariants: product.colorVariants,
        };
      });
  }, [convexProducts]);

  const categories = ['all', ...dbCategories.map(c => c.name.fr)];
  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'active', label: 'Actif' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'outofstock', label: 'Rupture' }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: Product['status']) => {
    const styles = {
      active: 'bg-green-50 text-green-700 border-green-200',
      draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      outofstock: 'bg-red-50 text-red-700 border-red-200'
    };
    const labels = {
      active: 'Actif',
      draft: 'Brouillon',
      outofstock: 'Rupture'
    };
    return (
      <span className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getProductTypeBadge = (product: Product) => {
    if (product.productType === 'individual') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
          <Link2 className="w-3 h-3" />
          <span className="text-xs font-bold">Lié: {product.linkedProduct}</span>
        </div>
      );
    } else if (product.productType === 'majalis') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
          <Ruler className="w-3 h-3" />
          <span className="text-xs font-bold">Sur mesure</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg">
          <Box className="w-3 h-3" />
          <span className="text-xs font-bold">Indépendant</span>
        </div>
      );
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProduct({ id: product.id as Id<'products'>, status: newStatus });
      toast.success(newStatus === 'active' ? 'Produit activé' : 'Produit désactivé');
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete({ id: product.id, name: product.name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProduct({ id: productToDelete.id as Id<'products'> });
      toast.success('Produit supprimé avec succès!');
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erreur lors de la suppression du produit');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-2">Produits</h1>
              <p className="text-sm sm:text-base text-neutral-600">
                Gérez vos produits et modèles de design
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/products/new')}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un nouveau produit</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-xs sm:text-sm text-neutral-600 mb-1">Total produits</p>
              <p className="text-2xl sm:text-3xl font-black text-neutral-900">{products.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-xs sm:text-sm text-neutral-600 mb-1">Produits actifs</p>
              <p className="text-2xl sm:text-3xl font-black text-green-600">
                {products.filter(p => p.status === 'active').length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-xs sm:text-sm text-neutral-600 mb-1">En rupture de stock</p>
              <p className="text-2xl sm:text-3xl font-black text-red-600">
                {products.filter(p => p.status === 'outofstock').length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-xs sm:text-sm text-neutral-600 mb-1">Brouillons</p>
              <p className="text-2xl sm:text-3xl font-black text-yellow-600">
                {products.filter(p => p.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-neutral-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:border-[#BD7C48] focus:ring-0 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 focus:border-[#BD7C48] focus:ring-0 transition-colors font-bold"
              >
                <option value="all">Toutes les catégories</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-neutral-900 focus:border-[#BD7C48] focus:ring-0 transition-colors font-bold"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-neutral-200 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucun produit</h3>
              <p className="text-neutral-600 mb-6">Aucun produit ne correspond à la recherche</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-xl transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-black text-neutral-900" style={{ maxWidth: '280px', width: '30%' }}>
                      Produit
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-sm font-black text-neutral-900">
                      Catégorie
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-black text-neutral-900">
                      Taille
                    </th>
                    <th className="hidden sm:table-cell px-6 py-4 text-left text-sm font-black text-neutral-900">
                      Prix
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-sm font-black text-neutral-900">
                      Stock
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
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4" style={{ maxWidth: '280px', width: '30%' }}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                              {product.name}
                            </h3>
                            {product.colorVariants && product.colorVariants.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {product.colorVariants.slice(0, 5).map((cv, i) => (
                                  <div
                                    key={i}
                                    className="w-4 h-4 rounded-full border border-neutral-300"
                                    style={{ backgroundColor: cv.hex }}
                                    title={typeof cv.name === 'string' ? cv.name : cv.name.fr || cv.name.ar}
                                  />
                                ))}
                                {product.colorVariants.length > 5 && (
                                  <span className="text-xs text-neutral-500">+{product.colorVariants.length - 5}</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {getProductTypeBadge(product)}
                              <p className="text-xs text-neutral-600 md:hidden">{product.category}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span className="text-sm text-neutral-700 font-medium">{product.category}</span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className="text-sm text-neutral-700 font-medium">{product.size}</span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <span className="text-sm font-bold text-neutral-900">
                          {product.productType === 'majalis'
                            ? <span className="text-purple-600">Variable (sur mesure)</span>
                            : product.price > 0
                              ? `${product.price.toLocaleString()} MAD`
                              : 'Variable'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className={`text-sm font-bold ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {product.stock === 999 ? '∞' : product.stock}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(product); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              product.status === 'active'
                                ? 'hover:bg-green-50 text-green-600'
                                : 'hover:bg-neutral-100 text-neutral-400'
                            }`}
                            title={product.status === 'active' ? 'Désactiver' : 'Activer'}
                          >
                            {product.status === 'active'
                              ? <ToggleRight className="w-5 h-5" />
                              : <ToggleLeft className="w-5 h-5" />
                            }
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/products/${product.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-[#BD7C48] transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                  <h3 className="text-lg font-black text-neutral-900">Supprimer le produit</h3>
                  <p className="text-sm text-neutral-600">Cette action est irréversible</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-neutral-700">
                  Êtes-vous sûr de vouloir supprimer{' '}
                  <span className="font-bold text-neutral-900">{productToDelete?.name}</span> ?
                </p>
                <p className="text-sm text-neutral-600 mt-2">
                  Toutes les données associées à ce produit seront définitivement supprimées.
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
