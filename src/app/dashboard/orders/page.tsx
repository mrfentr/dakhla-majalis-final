'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ShoppingCart,
  Eye,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Download
} from 'lucide-react';
import { useGetOrders } from '@/hooks/useConvex';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { DateFilter, isDateStringInRange, type DatePreset } from '@/components/dashboard/DateFilter';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

interface OrderStatusChange {
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  date: string;
  note?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  statusHistory: OrderStatusChange[];
  notes?: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customerName: 'Mohamed Alaoui',
    customerPhone: '0612345678',
    customerAddress: 'Casablanca, Quartier Maarif, Rue Zerktouni n°45',
    items: [
      {
        id: 'oi1',
        productId: '1',
        productName: 'Glassat Luxe 90cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg',
        quantity: 2,
        price: 2500
      },
      {
        id: 'oi2',
        productId: '2',
        productName: 'Coussin Marocain 85cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/morocco-1177376_1280.jpg',
        quantity: 4,
        price: 450
      }
    ],
    totalAmount: 6800,
    status: 'pending',
    createdAt: '2024-01-15',
    statusHistory: [
      { status: 'pending', date: '2024-01-15', note: 'Commande créée' }
    ],
    notes: 'Livraison préférée après 17h'
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customerName: 'Fatima Zahra',
    customerPhone: '0623456789',
    customerAddress: 'Rabat, Agdal, Avenue Mohammed V n°120',
    items: [
      {
        id: 'oi3',
        productId: '3',
        productName: 'Coudoir en Bois',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-4409009_1280.jpg',
        quantity: 6,
        price: 380
      }
    ],
    totalAmount: 2280,
    status: 'processing',
    createdAt: '2024-01-14',
    statusHistory: [
      { status: 'pending', date: '2024-01-14', note: 'Commande créée' },
      { status: 'processing', date: '2024-01-14', note: 'En cours de préparation' }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customerName: 'Ahmed Ben Said',
    customerPhone: '0634567890',
    customerAddress: 'Marrakech, Guéliz, Avenue Mohammed VI n°78',
    items: [
      {
        id: 'oi4',
        productId: '1',
        productName: 'Glassat Luxe 90cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg',
        quantity: 1,
        price: 2500
      },
      {
        id: 'oi5',
        productId: '2',
        productName: 'Coussin Marocain 85cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/morocco-1177376_1280.jpg',
        quantity: 8,
        price: 450
      },
      {
        id: 'oi6',
        productId: '3',
        productName: 'Coudoir en Bois',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-4409009_1280.jpg',
        quantity: 4,
        price: 380
      }
    ],
    totalAmount: 7620,
    status: 'completed',
    createdAt: '2024-01-10',
    statusHistory: [
      { status: 'pending', date: '2024-01-10', note: 'Commande créée' },
      { status: 'processing', date: '2024-01-10', note: 'En cours de préparation' },
      { status: 'completed', date: '2024-01-12', note: 'Livré avec succès' }
    ]
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    customerName: 'Souad Idrissi',
    customerPhone: '0645678901',
    customerAddress: 'Fès, Fès Nouvelle, Avenue Hassan II n°200',
    items: [
      {
        id: 'oi7',
        productId: '2',
        productName: 'Coussin Marocain 85cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/morocco-1177376_1280.jpg',
        quantity: 12,
        price: 450
      }
    ],
    totalAmount: 5400,
    status: 'cancelled',
    createdAt: '2024-01-08',
    statusHistory: [
      { status: 'pending', date: '2024-01-08', note: 'Commande créée' },
      { status: 'cancelled', date: '2024-01-09', note: 'Annulée par le client' }
    ],
    notes: 'Annulation demandée pour changement d\'adresse'
  },
  {
    id: '5',
    orderNumber: 'ORD-005',
    customerName: 'Khalid Mansouri',
    customerPhone: '0656789012',
    customerAddress: 'Tanger, Malabata, Avenue de l\'Armée Royale n°55',
    items: [
      {
        id: 'oi8',
        productId: '1',
        productName: 'Glassat Luxe 90cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg',
        quantity: 3,
        price: 2500
      },
      {
        id: 'oi9',
        productId: '3',
        productName: 'Coudoir en Bois',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-4409009_1280.jpg',
        quantity: 10,
        price: 380
      }
    ],
    totalAmount: 11300,
    status: 'processing',
    createdAt: '2024-01-13',
    statusHistory: [
      { status: 'pending', date: '2024-01-13', note: 'Commande créée' },
      { status: 'processing', date: '2024-01-14', note: 'Préparation pour expédition' }
    ]
  },
  {
    id: '6',
    orderNumber: 'ORD-006',
    customerName: 'Aicha Benali',
    customerPhone: '0667890123',
    customerAddress: 'Agadir, Talborjt, Avenue Hassan I n°33',
    items: [
      {
        id: 'oi10',
        productId: '2',
        productName: 'Coussin Marocain 85cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/morocco-1177376_1280.jpg',
        quantity: 20,
        price: 450
      }
    ],
    totalAmount: 9000,
    status: 'completed',
    createdAt: '2024-01-12',
    statusHistory: [
      { status: 'pending', date: '2024-01-12', note: 'Commande créée' },
      { status: 'processing', date: '2024-01-12' },
      { status: 'completed', date: '2024-01-13', note: 'Livré' }
    ]
  },
  {
    id: '7',
    orderNumber: 'ORD-007',
    customerName: 'Youssef Hassani',
    customerPhone: '0678901234',
    customerAddress: 'Meknès, Hamria, Avenue Abdelkrim El Khattabi n°88',
    items: [
      {
        id: 'oi11',
        productId: '1',
        productName: 'Glassat Luxe 90cm',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg',
        quantity: 5,
        price: 2500
      },
      {
        id: 'oi12',
        productId: '3',
        productName: 'Coudoir en Bois',
        productImage: 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-4409009_1280.jpg',
        quantity: 15,
        price: 380
      }
    ],
    totalAmount: 18200,
    status: 'pending',
    createdAt: '2024-01-16',
    statusHistory: [
      { status: 'pending', date: '2024-01-16', note: 'Nouvelle commande' }
    ]
  }
];

export default function OrdersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrderType, setSelectedOrderType] = useState<'all' | 'direct_purchase' | 'room_measurement'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null; preset: DatePreset }>({ from: null, to: null, preset: 'all' });

  // Mutations for soft delete / restore / permanent delete
  const softDeleteOrder = useMutation(api.orders.softDeleteOrder);
  const restoreOrder = useMutation(api.orders.restoreOrder);
  const deleteOrderPermanently = useMutation(api.orders.deleteOrder);

  // Fetch orders from Convex
  const convexOrders = useGetOrders() ?? [];

  // Transform Convex orders to match the Order interface and store orderType
  const orders: (Order & { orderType: 'direct_purchase' | 'room_measurement'; isDeleted?: boolean; realStatus: string })[] = convexOrders.map(order => {
    const address = order.customerInfo.address;
    const formattedAddress = `${address.city}${address.region ? ', ' + address.region : ''}, ${address.street}`;

    return {
      id: order._id,
      orderNumber: order.reference,
      orderType: order.orderType,
      customerName: order.customerInfo.name,
      customerPhone: order.customerInfo.phone,
      customerAddress: formattedAddress,
      items: order.products.map((product: any, index: number) => ({
        id: `item-${index}`,
        productId: product.productId || '',
        productName: product.name,
        productImage: product.image || 'https://ik.imagekit.io/fentr/marrakech-pass/marrakech-3831404_1280.jpg',
        quantity: product.quantity,
        price: product.unitPrice
      })),
      totalAmount: order.pricing.total,
      status: order.status === 'pending_payment' || order.status === 'draft' ? 'pending' :
              order.status === 'confirmed' || order.status === 'in_production' || order.status === 'in_production_tissu_ponj' || order.status === 'delivered_ponj' || order.status === 'shipping_tissu' || order.status === 'delivered_tissu' || order.status === 'ready_for_delivery' ? 'processing' :
              order.status === 'delivered' ? 'completed' :
              order.status === 'cancelled' ? 'cancelled' : 'pending',
      realStatus: order.status,
      createdAt: new Date(order.createdAt).toISOString().split('T')[0],
      statusHistory: [{
        status: order.status === 'pending_payment' || order.status === 'draft' ? 'pending' :
                order.status === 'confirmed' || order.status === 'in_production' || order.status === 'in_production_tissu_ponj' || order.status === 'delivered_ponj' || order.status === 'shipping_tissu' || order.status === 'delivered_tissu' || order.status === 'ready_for_delivery' ? 'processing' :
                order.status === 'delivered' ? 'completed' :
                order.status === 'cancelled' ? 'cancelled' : 'pending',
        date: new Date(order.createdAt).toISOString().split('T')[0],
        note: 'Commande créée'
      }],
      notes: order.notes,
      isDeleted: (order as any).isDeleted === true
    };
  });

  // Separate deleted and active orders
  const activeOrders = orders.filter(o => !o.isDeleted);
  const deletedOrders = orders.filter(o => o.isDeleted);

  const statuses = [
    { value: 'all', label: 'Toutes' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'pending_payment', label: 'En attente de paiement' },
    { value: 'confirmed', label: 'Confirmée (Stock réduit)' },
    { value: 'in_production', label: 'En production' },
    { value: 'in_production_tissu_ponj', label: 'En production : tissu et ponj' },
    { value: 'delivered_ponj', label: 'Livrée - Ponj' },
    { value: 'shipping_tissu', label: 'En cours de livraison tissu' },
    { value: 'delivered_tissu', label: 'Livrée - Tissu' },
    { value: 'ready_for_delivery', label: 'Prêt pour livraison' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'cancelled', label: 'Annulée' },
  ];

  // Use the correct source based on whether we're viewing the trash
  const sourceOrders = showDeleted ? deletedOrders : activeOrders;

  const filteredOrders = sourceOrders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || order.realStatus === selectedStatus;
    const matchesOrderType = selectedOrderType === 'all' || order.orderType === selectedOrderType;
    const matchesDate = isDateStringInRange(order.createdAt, dateRange);
    return matchesSearch && matchesStatus && matchesOrderType && matchesDate;
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      draft: { label: 'Brouillon', icon: Clock, color: 'text-neutral-600', bg: 'bg-neutral-50', border: 'border-neutral-200' },
      pending_payment: { label: 'En attente', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      confirmed: { label: 'Confirmée', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      in_production: { label: 'En production', icon: Loader, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
      in_production_tissu_ponj: { label: 'Prod: tissu+ponj', icon: Loader, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
      delivered_ponj: { label: 'Livrée ponj', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
      shipping_tissu: { label: 'Livraison tissu', icon: Loader, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
      delivered_tissu: { label: 'Livrée tissu', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      ready_for_delivery: { label: 'Prêt livraison', icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
      delivered: { label: 'Livrée', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      cancelled: { label: 'Annulée', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    };
    return configs[status] || configs.pending_payment;
  };

  const totalRevenue = activeOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Restaurer ${selectedIds.size} commande(s) ?`)) return;
    await Promise.all([...selectedIds].map(id => restoreOrder({ orderId: id as any })));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer définitivement ${selectedIds.size} commande(s) ? Cette action est irréversible.`)) return;
    await Promise.all([...selectedIds].map(id => deleteOrderPermanently({ id: id as any })));
    setSelectedIds(new Set());
  };

  const exportToCSV = () => {
    const statusLabels: Record<string, string> = {
      draft: 'Brouillon',
      pending_payment: 'En attente de paiement',
      confirmed: 'Confirmée',
      in_production: 'En production',
      in_production_tissu_ponj: 'En production : tissu et ponj',
      delivered_ponj: 'Livrée - Ponj',
      shipping_tissu: 'En cours de livraison tissu',
      delivered_tissu: 'Livrée - Tissu',
      ready_for_delivery: 'Prêt pour livraison',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };

    const orderTypeLabels: Record<string, string> = {
      direct_purchase: 'Produit normal',
      room_measurement: 'Mesure personnalisée'
    };

    const formatDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    const escapeCSV = (value: string | number) => {
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'N° commande', 'Type', 'Client', 'Telephone', 'Email', 'Ville', 'Adresse',
      'Majalis', 'Couleur', 'Variante tissu',
      'Glssa', 'Wssada', 'Coudoir', 'Zerbiya', 'Poufs',
      'Produits', 'Articles supp.', 'Montant (MAD)', 'Statut', 'Date', 'Notes'
    ];

    const rows = filteredOrders.map(order => {
      const fullOrder = convexOrders.find(o => o._id === order.id);
      const addr = fullOrder?.customerInfo?.address;
      const city = addr?.city || '';
      const fullAddress = addr ? `${addr.street}, ${addr.city}${addr.region ? ', ' + addr.region : ''}` : order.customerAddress;
      const email = fullOrder?.customerInfo?.email || '';
      const selectedMajalis = (fullOrder as any)?.selectedMajalisProduct;
      const majalisName = selectedMajalis?.name || '—';
      const majalisColor = selectedMajalis?.color || '—';
      const fabricVariantName = selectedMajalis?.fabricVariantName || '—';
      const calc = (fullOrder as any)?.calculations;
      const totalGlssa = calc?.totalGlassat ?? '—';
      const totalWssada = calc?.totalWsayd ?? '—';
      const totalCoudoir = calc?.totalCoudoir ?? '—';
      const totalZerbiya = calc?.totalZerbiya ?? '—';
      const poufsCount = calc?.poufsCount ?? '—';
      const products = order.items.map(item => `${item.productName} x${item.quantity}`).join(' | ');
      const additionalItems = ((fullOrder as any)?.additionalItems || [])
        .map((item: any) => `${item.name} x${item.quantity}`)
        .join(' | ') || '—';
      const notes = fullOrder?.notes || '—';

      return [
        order.orderNumber,
        orderTypeLabels[order.orderType] || order.orderType,
        order.customerName,
        order.customerPhone,
        email,
        city,
        fullAddress,
        majalisName,
        majalisColor,
        fabricVariantName,
        totalGlssa,
        totalWssada,
        totalCoudoir,
        totalZerbiya,
        poufsCount,
        products,
        additionalItems,
        order.totalAmount,
        statusLabels[order.realStatus] || order.realStatus,
        formatDate(order.createdAt),
        notes
      ].map(escapeCSV).join(';');
    });

    const csvContent = [headers.map(escapeCSV).join(';'), ...rows].join('\n');
    // BOM for UTF-8 so Excel reads Arabic/French correctly
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    link.href = url;
    link.download = `commandes-dakhla-majalis-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Component to display design image for room measurement orders
  const DesignImageThumbnail = ({ orderId }: { orderId: string }) => {
    // Get the full order from convex to access layoutVisualization
    const fullOrder = convexOrders.find(o => o._id === orderId);
    const storageId = fullOrder?.layoutVisualization?.diagramUrl;

    // Validate storageId - it should be a Convex storage ID, not a data URL
    const isValidStorageId = storageId && typeof storageId === 'string' && !storageId.startsWith('data:');

    // Fetch image URL from storage only if we have a valid storage ID
    const imageUrl = useQuery(
      api.orders.getImageUrl,
      isValidStorageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!isValidStorageId || !imageUrl) {
      return (
        <div className="w-12 h-12 bg-neutral-100 rounded border border-neutral-200 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-neutral-400" />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded border border-neutral-200 overflow-hidden bg-white">
        <img
          src={imageUrl}
          alt="Design"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Commandes</h1>
        <p className="text-sm text-neutral-600">Gérer les commandes des clients</p>
      </div>

      {/* Order Type Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-1 inline-flex gap-1">
          <button
            onClick={() => { setSelectedOrderType('all'); setShowDeleted(false); setSelectedIds(new Set()); }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              selectedOrderType === 'all' && !showDeleted
                ? 'bg-[#BD7C48] text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Toutes les commandes
          </button>
          <button
            onClick={() => { setSelectedOrderType('direct_purchase'); setShowDeleted(false); setSelectedIds(new Set()); }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              selectedOrderType === 'direct_purchase' && !showDeleted
                ? 'bg-[#BD7C48] text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Produits normaux
          </button>
          <button
            onClick={() => { setSelectedOrderType('room_measurement'); setShowDeleted(false); setSelectedIds(new Set()); }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              selectedOrderType === 'room_measurement' && !showDeleted
                ? 'bg-[#BD7C48] text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Mesures personnalisées
          </button>
        </div>
        <button
          onClick={() => { setShowDeleted(!showDeleted); setSelectedIds(new Set()); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2 ${
            showDeleted
              ? 'bg-red-600 text-white border border-red-600'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Corbeille
          {deletedOrders.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              showDeleted ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {deletedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Total commandes</p>
          <p className="text-2xl font-black text-neutral-900">{filteredOrders.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">En attente</p>
          <p className="text-2xl font-black text-yellow-600">
            {filteredOrders.filter(o => o.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Terminées</p>
          <p className="text-2xl font-black text-green-600">
            {filteredOrders.filter(o => o.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-600 mb-1">Revenus terminés</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-[#BD7C48]">
              {filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
            </p>
            <span className="text-xs text-neutral-500 font-medium">MAD</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par numéro de commande, nom du client ou téléphone..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-colors font-medium text-sm"
              />
            </div>
          </div>
          <div className="sm:w-44">
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
          <DateFilter onFilterChange={setDateRange} />
          <button
            onClick={exportToCSV}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#BD7C48] hover:bg-[#a66b3b] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Trash Banner */}
      {showDeleted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700">
          <Trash2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">Corbeille</span>
          <span className="text-sm">— Les commandes supprimées sont affichées ici. Vous pouvez les restaurer.</span>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showDeleted && selectedIds.size > 0 && (
        <div className="bg-neutral-900 text-white rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-bold">{selectedIds.size} commande(s) sélectionnée(s)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestore}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurer
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer définitivement
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className={`bg-white rounded-lg border overflow-hidden ${showDeleted ? 'border-red-200' : 'border-neutral-200'}`}>
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucune commande</h3>
            <p className="text-sm text-neutral-600">Aucune commande ne correspond à la recherche</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {showDeleted && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Design</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">N° commande</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Majalis</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Produits</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredOrders.map((order) => {
                  const statusConfig = getStatusConfig(order.realStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={order.id} className={`hover:bg-neutral-50 transition-colors ${selectedIds.has(order.id) ? 'bg-red-50/50' : ''}`}>
                      {showDeleted && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="w-4 h-4 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {order.orderType === 'room_measurement' ? (
                          <DesignImageThumbnail orderId={order.id} />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-100 rounded border border-neutral-200 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-neutral-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-neutral-900">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{order.customerName}</p>
                          <p className="text-xs text-neutral-600">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const fullOrder = convexOrders.find(o => o._id === order.id);
                          const majalisName = (fullOrder as any)?.selectedMajalisProduct?.name;
                          const majalisColor = (fullOrder as any)?.selectedMajalisProduct?.color;
                          return majalisName ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-[#BD7C48] bg-[#BD7C48]/10 px-2 py-1 rounded">{majalisName}</span>
                              {majalisColor && (
                                <span className="text-xs text-neutral-600 px-2">{majalisColor}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-700">{order.items.length} produit(s)</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-neutral-900">{order.totalAmount.toLocaleString()} MAD</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-600">{order.createdAt}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-[#BD7C48] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {showDeleted ? (
                            <>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Restaurer cette commande ?')) {
                                    await restoreOrder({ orderId: order.id as any });
                                  }
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
                                title="Restaurer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Supprimer définitivement cette commande ? Cette action est irréversible.')) {
                                    await deleteOrderPermanently({ id: order.id as any });
                                  }
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={async () => {
                                if (window.confirm('Supprimer cette commande ? Elle sera déplacée dans la corbeille.')) {
                                  await softDeleteOrder({ orderId: order.id as any });
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-neutral-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
