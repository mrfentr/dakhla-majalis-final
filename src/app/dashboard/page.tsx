'use client';

import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  ChevronRight,
  Calendar,
  DollarSign,
  FileText,
  TrendingDown,
  CheckCircle,
  MessageSquare,
  Box,
  Image as ImageIcon
} from 'lucide-react';
import { useGetRecentOrders, useGetOrderStats, useGetProducts, useGetReviews, useGetAllInventoryHistory } from '@/hooks/useConvex';
import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';

export default function DashboardPage() {
  const router = useRouter();

  // Fetch real data from Convex with increased limits for activity feed
  const recentOrders = useGetRecentOrders(20);
  const orderStats = useGetOrderStats();
  const products = useGetProducts({ status: 'active' });
  const reviews = useGetReviews(); // Get all reviews, not just pending
  const inventoryHistory = useGetAllInventoryHistory(20);

  // Check if data is still loading
  const isLoading = !recentOrders || !orderStats || !products || !reviews || !inventoryHistory;

  // Provide default values after loading check
  const ordersData = recentOrders ?? [];
  const statsData = orderStats ?? { totalRevenue: 0, totalOrders: 0 };
  const productsData = products ?? [];
  const reviewsData = reviews ?? [];
  const inventoryData = inventoryHistory ?? [];

  // Calculate average rating from all reviews
  const averageRating = reviewsData.length > 0
    ? (reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length).toFixed(1)
    : '0.0';

  // Stats data with real values
  const stats = [
    {
      title: 'Revenu total',
      value: statsData.totalRevenue?.toLocaleString() || '0',
      unit: 'MAD',
      icon: DollarSign,
      color: 'bg-[#BD7C48]'
    },
    {
      title: 'Total des commandes',
      value: statsData.totalOrders?.toString() || '0',
      unit: 'commande(s)',
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: 'Produits actifs',
      value: productsData.length.toString(),
      unit: 'produit(s)',
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Note moyenne',
      value: averageRating,
      unit: 'sur 5',
      icon: Star,
      color: 'bg-amber-500'
    }
  ];

  // Component to display design image thumbnail
  const DesignThumbnail = ({ order }: { order: any }) => {
    const storageId = order.layoutVisualization?.diagramUrl;

    // Validate storageId - it should be a Convex storage ID, not a data URL
    const isValidStorageId = storageId && typeof storageId === 'string' && !storageId.startsWith('data:');

    const imageUrl = useQuery(
      api.orders.getImageUrl,
      isValidStorageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!isValidStorageId || !imageUrl) {
      return (
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0 bg-white">
        <img
          src={imageUrl}
          alt="Design"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // Combine recent activities from orders, reviews, and inventory
  const recentActivities = useMemo(() => {
    const activities: Array<{
      title: string;
      description: string;
      time: string;
      createdAt: number;
      icon: any;
      color: string;
      type: 'order' | 'review' | 'inventory';
      order?: any;
    }> = [];

    // Add recent orders
    ordersData.forEach(order => {
      const orderType = order.orderType === 'room_measurement' ? 'Mesure personnalisée' : 'Achat direct';
      activities.push({
        title: `Nouvelle commande ${orderType}`,
        description: `${order.customerInfo.name} - ${order.reference} (${order.pricing.total.toLocaleString()} MAD)`,
        time: new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        createdAt: order.createdAt,
        icon: ShoppingCart,
        color: 'bg-blue-50',
        type: 'order',
        order: order
      });
    });

    // Add recent reviews (limit to 15 for activity feed)
    reviewsData.slice(0, 15).forEach(review => {
      const status = review.status === 'pending' ? 'En attente d\'approbation' :
                     review.status === 'approved' ? 'Approuvé' : 'Rejeté';
      activities.push({
        title: `Nouvel avis (${review.rating}★)`,
        description: `${review.customerInfo.name} - ${status}`,
        time: new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        createdAt: review.createdAt,
        icon: MessageSquare,
        color: 'bg-amber-50',
        type: 'review'
      });
    });

    // Add recent inventory changes
    inventoryData.forEach(item => {
      const operation = item.operation === 'add' ? 'Ajout' : item.operation === 'subtract' ? 'Retrait' : 'Ajustement';
      activities.push({
        title: `${operation} de stock`,
        description: `${item.reason} (${item.operation === 'add' ? '+' : '-'}${item.quantity} unités)`,
        time: new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        createdAt: item.createdAt,
        icon: item.operation === 'add' ? TrendingUp : TrendingDown,
        color: item.operation === 'add' ? 'bg-green-50' : 'bg-red-50',
        type: 'inventory'
      });
    });

    // Sort by most recent using createdAt timestamp
    activities.sort((a, b) => b.createdAt - a.createdAt);

    // Return top 40 activities
    return activities.slice(0, 40);
  }, [ordersData, reviewsData, inventoryData]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#BD7C48] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-600 font-medium">Chargement du tableau de bord...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Vue d'ensemble</h1>
        <p className="text-sm text-neutral-600">Suivez les performances de vos salons et commandes</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-neutral-200 p-4"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xs text-neutral-600 mb-1">{stat.title}</h3>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-neutral-900">{stat.value}</p>
              <span className="text-xs text-neutral-500 font-medium">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity & Quick Actions Grid */}
      <div className="grid lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Recent Activity */}
        <div className="lg:col-span-2 min-w-0 bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-neutral-900">Activités récentes</h2>
            <div className="text-xs text-neutral-500">
              {recentActivities.length} activité(s)
            </div>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {recentActivities.length === 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">Aucune activité récente</h3>
                  <p className="text-xs text-neutral-600">Les activités apparaîtront ici</p>
                </div>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (activity.type === 'order') {
                      router.push('/dashboard/orders');
                    } else if (activity.type === 'review') {
                      router.push('/dashboard/reviews');
                    } else if (activity.type === 'inventory') {
                      router.push('/dashboard/stock');
                    }
                  }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  {activity.type === 'order' && activity.order ? (
                    <DesignThumbnail order={activity.order} />
                  ) : (
                    <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className={`w-5 h-5 ${
                        activity.type === 'order' ? 'text-blue-600' :
                        activity.type === 'review' ? 'text-amber-600' :
                        activity.color.includes('green') ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 mb-1 truncate">{activity.title}</h3>
                    <p className="text-xs text-neutral-600 line-clamp-2">{activity.description}</p>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="min-w-0 bg-white rounded-lg border border-neutral-200 p-4">
          <h2 className="text-lg font-black text-neutral-900 mb-4">Actions rapides</h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/dashboard/blog/new')}
              className="w-full flex items-center gap-2 p-3 rounded-lg bg-[#BD7C48] hover:bg-[#A0673D] text-white transition-all"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold text-sm">Créer un article</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/blog')}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-neutral-300 hover:border-[#BD7C48] hover:bg-neutral-50 text-neutral-900 transition-all"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold text-sm">Gérer le blog</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/orders')}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-neutral-300 hover:border-[#BD7C48] hover:bg-neutral-50 text-neutral-900 transition-all"
            >
              <ShoppingCart className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold text-sm">Commandes</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/stock')}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-neutral-300 hover:border-[#BD7C48] hover:bg-neutral-50 text-neutral-900 transition-all"
            >
              <Box className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold text-sm">Stock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
