'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Star,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Trash2,
  Eye,
  ChevronDown
} from 'lucide-react';
import { useGetReviews, useGetProducts, useUpdateReviewStatus, useDeleteReview } from '@/hooks/useConvex';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  productName: string;
  productImage: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ReviewsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');

  // Fetch reviews and products from Convex
  const convexReviews = useGetReviews() ?? [];
  const products = useGetProducts() ?? [];
  const updateStatus = useUpdateReviewStatus();
  const deleteReview = useDeleteReview();

  // Transform Convex reviews to match Review interface
  const reviews: Review[] = useMemo(() => {
    return convexReviews.map(review => {
      const product = products.find(p => p._id === review.productId);
      const productName = product?.title.fr || 'Produit inconnu';
      const productImage = product?.image || 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg';

      return {
        id: review._id,
        productName,
        productImage,
        customerName: review.customerInfo.name,
        rating: review.rating,
        comment: review.comment.fr || review.comment.ar || '',
        date: new Date(review.createdAt).toISOString().split('T')[0],
        status: review.status
      };
    });
  }, [convexReviews, products]);

  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'approved', label: 'Approuvés' },
    { value: 'rejected', label: 'Rejetés' }
  ];

  const ratings = [
    { value: 'all', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' }
  ];

  const filteredReviews = reviews.filter(review => {
    const matchesSearch =
      review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || review.status === selectedStatus;
    const matchesRating = selectedRating === 'all' || review.rating === parseInt(selectedRating);
    return matchesSearch && matchesStatus && matchesRating;
  });

  const handleApprove = async (id: string) => {
    try {
      await updateStatus({ id: id as any, status: 'approved' });
      toast.success('Avis approuvé avec succès');
    } catch (error) {
      console.error('Error approving review:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateStatus({ id: id as any, status: 'rejected' });
      toast.success('Avis rejeté');
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) {
      try {
        await deleteReview({ id: id as any });
        toast.success('Avis supprimé');
      } catch (error) {
        console.error('Error deleting review:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const getStatusBadge = (status: Review['status']) => {
    const styles = {
      approved: 'bg-green-50 text-green-700 border-green-200',
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    const labels = {
      approved: 'Approuvé',
      pending: 'En attente',
      rejected: 'Rejeté'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Avis</h1>
          <p className="text-sm text-neutral-600">Gestion des avis clients</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-600 mb-1">Total avis</p>
            <p className="text-2xl font-black text-neutral-900">{reviews.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-600 mb-1">Note moyenne</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-yellow-600">{avgRating}</p>
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-600 mb-1">En attente</p>
            <p className="text-2xl font-black text-yellow-600">
              {reviews.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <p className="text-xs text-neutral-600 mb-1">Approuvés</p>
            <p className="text-2xl font-black text-green-600">
              {reviews.filter(r => r.status === 'approved').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans les avis..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-44">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="lg:w-44">
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
              >
                {ratings.map(rating => (
                  <option key={rating.value} value={rating.value}>{rating.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucun avis</h3>
              <p className="text-sm text-neutral-600">Aucun avis ne correspond à la recherche</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                    <Image
                      src={review.productImage}
                      alt={review.productName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-neutral-900 truncate">{review.productName}</h3>
                        <p className="text-xs text-neutral-600">{review.customerName} • {review.date}</p>
                      </div>
                      {getStatusBadge(review.status)}
                    </div>

                    {renderStars(review.rating)}

                    <p className="text-sm text-neutral-700 mt-2 leading-relaxed">{review.comment}</p>

                    {/* Actions */}
                    {review.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg transition-colors text-xs font-bold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approuver</span>
                        </button>
                        <button
                          onClick={() => handleReject(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-colors text-xs font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejeter</span>
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {review.status !== 'pending' && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 border border-neutral-300 hover:border-red-300 text-neutral-600 hover:text-red-600 rounded-lg transition-colors text-xs font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
