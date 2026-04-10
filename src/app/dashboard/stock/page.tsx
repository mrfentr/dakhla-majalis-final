'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  Edit,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  X,
  Clock,

  Sofa,
  Square,
  Grip,
  Grid3x3,
  ChevronRight,
  Plus,
  Link2,
  Eye,
  Unlink,
} from 'lucide-react';
import {
  useGetProducts,
  useUpdateInventory,
  useGetProductInventoryHistory,
  useGetAllInventoryHistory,
  useUpdateProduct,
  useGetFabricVariants,
  useCreateFabricVariant,
  useUpdateFabricVariant,
  useUpdateFabricVariantStock,
  useDeleteFabricVariant,
  useGetFabricVariantInventoryHistory,
  useGetRecentHistoryForAll,
  useGetCategories,
} from '@/hooks/useConvex';
import ImageUpload from '@/components/upload/ImageUpload';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { today, getLocalTimeZone, parseDate } from '@internationalized/date';
import type { DateRange } from 'react-aria-components';

interface StockTransaction {
  id: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  note?: string;
  previousStock: number;
  newStock: number;
}

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stepSize, setStepSize] = useState<number | null>(1);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, number>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fabric' | 'products'>('fabric');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showZerbiya, setShowZerbiya] = useState(false);
  // Manual stock input: key → editing state
  const [manualInputActive, setManualInputActive] = useState<Record<string, boolean>>({});
  const [manualInputValue, setManualInputValue] = useState<Record<string, string>>({});
  // Threshold editing
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState('');

  const router = useRouter();

  // Product linking state
  const [linkPopoverVariantId, setLinkPopoverVariantId] = useState<string | null>(null);
  const [linkPickerVariantId, setLinkPickerVariantId] = useState<string | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    if (!linkPopoverVariantId) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setLinkPopoverVariantId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [linkPopoverVariantId]);

  // Fetch all products from Convex
  const products = useGetProducts({ status: 'all' }) ?? [];
  const updateInventory = useUpdateInventory();
  const updateProduct = useUpdateProduct();

  // Fabric variant state and hooks
  const fabricVariants = useGetFabricVariants() ?? [];
  const createFabricVariant = useCreateFabricVariant();
  const updateFabricVariant = useUpdateFabricVariant();
  const updateFabricVariantStock = useUpdateFabricVariantStock();
  const deleteFabricVariant = useDeleteFabricVariant();

  // Recent history for all fabric variants (max 5 per variant)
  const recentHistoryForAll = useGetRecentHistoryForAll() ?? {};

  // Categories
  const categories = useGetCategories() ?? [];

  const [fabricVariantModalOpen, setFabricVariantModalOpen] = useState(false);
  const [editingFabricVariant, setEditingFabricVariant] = useState<string | null>(null);
  const [fabricVariantForm, setFabricVariantForm] = useState({
    nameAr: '', nameFr: '', color: '', pattern: '', image: '',
    categoryId: '',
    subcategoryId: '',
    glssa: '0', wsaydRegular: '0', wsaydReduced: '0', coudoir: '0', zerbiya: '0',
    zerbiyaType1: '0', zerbiyaType2: '0', zerbiyaType3: '0', zerbiyaType4: '0', poufs: '0',
    sacDecoration: '0', petitCoussin: '0',
    isActive: true,
    linkedProductId: '' as string,
  });
  const [selectedFabricVariant, setSelectedFabricVariant] = useState<string | null>(null);
  const fabricVariantHistory = useGetFabricVariantInventoryHistory(selectedFabricVariant as any);

  // Fetch all inventory history for stock movements
  const allInventoryHistory = useGetAllInventoryHistory() ?? [];

  // Transform products to stock items
  const stock = products.map(product => {
    const isMajalis = product.productType === 'majalis_set' ||
                      (product.category === 'custom' && product.composition && Object.keys(product.composition).length === 4);

    return {
      id: product._id,
      name: product.title.fr,
      image: product.image,
      category: product.category === 'l_shape' ? 'Forme en L' :
                product.category === 'u_shape' ? 'Forme en U' :
                product.category === 'custom' ? 'Personnalisé' : 'Accessoires',
      currentStock: product.inventory.stockQuantity,
      minStock: product.inventory.lowStockThreshold,
      price: product.pricing.basePrice,
      isMandatory: product.isMandatory || false,
      productType: product.productType,
      isMajalis,
      linkedFabricVariantId: (product as any).linkedFabricVariantId as string | undefined,
    };
  });

  // Filter products for Tab 2 - non-majalis and non-mandatory only
  const individualStock = stock.filter(item => !item.isMajalis && !item.isMandatory);

  // Fetch real inventory history for selected product
  const convexInventoryHistory = useGetProductInventoryHistory(selectedProduct as any);

  const selectedProductData = selectedProduct ? stock.find(s => s.id === selectedProduct) : null;

  // Transform Convex inventory history to StockTransaction format
  const selectedProductHistory: StockTransaction[] = convexInventoryHistory
    ? convexInventoryHistory.map(item => ({
        id: item._id,
        type: item.operation === 'add' ? 'in' as const : 'out' as const,
        quantity: item.quantity,
        date: new Date(item.createdAt).toISOString().split('T')[0],
        note: item.reason,
        previousStock: item.previousQuantity,
        newStock: item.newQuantity,
      }))
    : [];

  // Filter individual stock by search query and low stock toggle
  const filteredIndividualStock = individualStock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !showLowStockOnly || (item.currentStock <= item.minStock && item.currentStock < 999);
    return matchesSearch && matchesLowStock;
  });

  // Build a set of fabricVariantIds that have at least one linked individual pouf product
  const linkedFabricVariantIds = new Set(
    stock
      .filter(item => item.linkedFabricVariantId && item.productType === 'poufs')
      .map(item => item.linkedFabricVariantId as string)
  );

  // Calculate stats
  const nonCustomStock = stock;
  const lowStockItems = nonCustomStock.filter(item => item.currentStock <= item.minStock && item.currentStock < 999);
  const outOfStockItems = nonCustomStock.filter(item => item.currentStock === 0);
  const totalValue = nonCustomStock.reduce((acc, item) => acc + (item.currentStock * item.price), 0);
  const averageStockLevel = nonCustomStock.length > 0 ? Math.round(nonCustomStock.reduce((acc, item) => acc + item.currentStock, 0) / nonCustomStock.length) : 0;

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    if (selectedPeriod === 'custom' && customDateRange?.start && customDateRange?.end) {
      return {
        start: new Date(customDateRange.start.year, customDateRange.start.month - 1, customDateRange.start.day),
        end: new Date(customDateRange.end.year, customDateRange.end.month - 1, customDateRange.end.day)
      };
    }

    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    start.setDate(end.getDate() - days + 1);

    return { start, end };
  };

  // Stock movements for the selected period using real inventory data
  const stockMovements = useMemo(() => {
    const { start, end } = getDateRange();

    const filteredHistory = allInventoryHistory.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });

    const movementsByDate: Record<string, { stockIn: number; stockOut: number }> = {};

    filteredHistory.forEach(item => {
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0];

      if (!movementsByDate[dateKey]) {
        movementsByDate[dateKey] = { stockIn: 0, stockOut: 0 };
      }

      if (item.operation === 'add') {
        movementsByDate[dateKey].stockIn += item.quantity;
      } else if (item.operation === 'subtract') {
        movementsByDate[dateKey].stockOut += item.quantity;
      }
    });

    const movements = [];
    const current = new Date(start);

    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      movements.push({
        date: dateKey,
        stockIn: movementsByDate[dateKey]?.stockIn || 0,
        stockOut: movementsByDate[dateKey]?.stockOut || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return movements;
  }, [selectedPeriod, customDateRange, allInventoryHistory]);

  const totalStockIn = stockMovements.reduce((acc, m) => acc + m.stockIn, 0);
  const totalStockOut = stockMovements.reduce((acc, m) => acc + m.stockOut, 0);
  const netStockChange = totalStockIn - totalStockOut;

  const getStockStatus = (item: typeof stock[0]) => {
    if (item.currentStock === 0) return { label: 'Rupture', color: 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]' };
    if (item.currentStock <= item.minStock) return { label: 'Bas', color: 'text-[#9A3412] bg-[#FFF7ED] border-[#FED7AA]' };
    return { label: 'Bon', color: 'text-[#166534] bg-[#F0FFF4] border-[#C6F6D5]' };
  };

  const getMandatoryProductIcon = (productType: string) => {
    switch (productType) {
      case 'glassat': return Sofa;
      case 'wsayd': return Square;
      case 'coudoir': return Grip;
      case 'zerbiya': return Grid3x3;
      default: return Package;
    }
  };

  const adjustPending = (key: string, delta: number) => {
    setPendingAdjustments(prev => {
      const current = prev[key] || 0;
      const next = current + delta;
      if (next === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  };

  const savePending = async (key: string) => {
    const qty = pendingAdjustments[key];
    if (!qty) return;
    const operation: 'add' | 'subtract' = qty > 0 ? 'add' : 'subtract';
    const absQty = Math.abs(qty);
    try {
      if (key.startsWith('product:')) {
        await updateInventory({
          productId: key.replace('product:', '') as any,
          quantity: absQty,
          operation,
          reason: 'Quick adjustment',
          notes: adjustmentNote || undefined,
          performedBy: 'admin'
        });
      } else if (key.startsWith('fabric:')) {
        const [, variantId, component] = key.split(':');
        await updateFabricVariantStock({
          fabricVariantId: variantId as any,
          component: component as any,
          operation,
          quantity: absQty,
          reason: adjustmentNote || 'Quick adjustment',
          performedBy: 'admin',
        });
      }
      toast.success(`${qty > 0 ? '+' : ''}${qty}`, { duration: 1500, position: 'bottom-center' });
      setPendingAdjustments(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const cancelPending = (key: string) => {
    setPendingAdjustments(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const startManualInput = (key: string, currentValue: number) => {
    setManualInputActive(prev => ({ ...prev, [key]: true }));
    setManualInputValue(prev => ({ ...prev, [key]: String(currentValue) }));
  };

  const cancelManualInput = (key: string) => {
    setManualInputActive(prev => { const { [key]: _, ...rest } = prev; return rest; });
    setManualInputValue(prev => { const { [key]: _, ...rest } = prev; return rest; });
  };

  const commitManualInput = async (key: string) => {
    const raw = manualInputValue[key];
    const newQty = parseInt(raw, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Valeur invalide');
      return;
    }
    try {
      if (key.startsWith('product:')) {
        const productId = key.replace('product:', '');
        const item = stock.find(s => s.id === productId);
        const currentQty = item?.currentStock ?? 0;
        if (newQty === currentQty) { cancelManualInput(key); return; }
        const diff = newQty - currentQty;
        const operation: 'add' | 'subtract' = diff > 0 ? 'add' : 'subtract';
        await updateInventory({
          productId: productId as any,
          quantity: Math.abs(diff),
          operation,
          reason: 'Manual set',
          notes: adjustmentNote || undefined,
          performedBy: 'admin',
        });
      } else if (key.startsWith('fabric:')) {
        const [, variantId, component] = key.split(':');
        const variant = fabricVariants.find((v: any) => v._id === variantId);
        const currentQty = variant ? (variant.stock as any)[component] : 0;
        if (newQty === currentQty) { cancelManualInput(key); return; }
        const diff = newQty - currentQty;
        const operation: 'add' | 'subtract' = diff > 0 ? 'add' : 'subtract';
        await updateFabricVariantStock({
          fabricVariantId: variantId as any,
          component: component as any,
          operation,
          quantity: Math.abs(diff),
          reason: adjustmentNote || 'Manual set',
          performedBy: 'admin',
        });
      }
      toast.success(`→ ${newQty}`, { duration: 1500, position: 'bottom-center' });
      cancelManualInput(key);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const quickAdjustProductStock = (productId: string, operation: 'add' | 'subtract') => {
    if (stepSize === null) {
      adjustPending(`product:${productId}`, operation === 'add' ? 1 : -1);
      return;
    }
    (async () => {
      try {
        await updateInventory({
          productId: productId as any,
          quantity: stepSize,
          operation,
          reason: 'Quick adjustment',
          notes: adjustmentNote || undefined,
          performedBy: 'admin'
        });
        toast.success(`${operation === 'add' ? '+' : '-'}${stepSize}`, { duration: 1500, position: 'bottom-center' });
      } catch (error) {
        toast.error('Erreur lors de la mise à jour du stock');
      }
    })();
  };

  // Fabric variant handlers
  const handleCreateFabricVariant = async () => {
    try {
      const createArgs: any = {
        name: { ar: fabricVariantForm.nameAr, fr: fabricVariantForm.nameFr },
        color: fabricVariantForm.color,
        pattern: fabricVariantForm.pattern,
        image: fabricVariantForm.image || '/placeholder-product.jpg',
        stock: {
          glssa: parseInt(fabricVariantForm.glssa) || 0,
          wsaydRegular: parseInt(fabricVariantForm.wsaydRegular) || 0,
          wsaydReduced: parseInt(fabricVariantForm.wsaydReduced) || 0,
          coudoir: parseInt(fabricVariantForm.coudoir) || 0,
          zerbiya: parseInt(fabricVariantForm.zerbiya) || 0,
          zerbiyaType1: parseInt(fabricVariantForm.zerbiyaType1) || 0,
          zerbiyaType2: parseInt(fabricVariantForm.zerbiyaType2) || 0,
          zerbiyaType3: parseInt(fabricVariantForm.zerbiyaType3) || 0,
          zerbiyaType4: parseInt(fabricVariantForm.zerbiyaType4) || 0,
          poufs: parseInt(fabricVariantForm.poufs) || 0,
          sacDecoration: parseInt(fabricVariantForm.sacDecoration) || 0,
          petitCoussin: parseInt(fabricVariantForm.petitCoussin) || 0,
        },
        isActive: fabricVariantForm.isActive,
      };
      if (fabricVariantForm.categoryId) {
        createArgs.categoryId = fabricVariantForm.categoryId;
      }
      if (fabricVariantForm.subcategoryId) {
        createArgs.subcategoryId = fabricVariantForm.subcategoryId;
      }
      if (fabricVariantForm.linkedProductId) {
        createArgs.existingProductId = fabricVariantForm.linkedProductId;
      }
      await createFabricVariant(createArgs);
      toast.success('Variante créée avec succès');
      setFabricVariantModalOpen(false);
      resetFabricVariantForm();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateFabricVariant = async () => {
    if (!editingFabricVariant) return;
    try {
      const updateArgs: any = {
        id: editingFabricVariant as any,
        name: { ar: fabricVariantForm.nameAr, fr: fabricVariantForm.nameFr },
        color: fabricVariantForm.color,
        pattern: fabricVariantForm.pattern,
        image: fabricVariantForm.image || '/placeholder-product.jpg',
        isActive: fabricVariantForm.isActive,
      };
      if (fabricVariantForm.categoryId) {
        updateArgs.categoryId = fabricVariantForm.categoryId;
      }
      if (fabricVariantForm.subcategoryId) {
        updateArgs.subcategoryId = fabricVariantForm.subcategoryId;
      }
      if (fabricVariantForm.linkedProductId) {
        updateArgs.linkedProductId = fabricVariantForm.linkedProductId;
      }
      await updateFabricVariant(updateArgs);
      toast.success('Variante mise à jour');
      setEditingFabricVariant(null);
      setFabricVariantModalOpen(false);
      resetFabricVariantForm();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const quickAdjustFabricStock = (variantId: string, component: string, operation: 'add' | 'subtract') => {
    if (stepSize === null) {
      adjustPending(`fabric:${variantId}:${component}`, operation === 'add' ? 1 : -1);
      return;
    }
    (async () => {
      try {
        await updateFabricVariantStock({
          fabricVariantId: variantId as any,
          component: component as any,
          operation,
          quantity: stepSize,
          reason: adjustmentNote || 'Quick adjustment',
          performedBy: 'admin',
        });
        toast.success(`${operation === 'add' ? '+' : '-'}${stepSize} ${component}`, { duration: 1500, position: 'bottom-center' });
      } catch (error) {
        toast.error('Erreur lors de l\'ajustement');
      }
    })();
  };

  const handleDeleteFabricVariant = async (id: string) => {
    if (!confirm('Supprimer cette variante ?')) return;
    try {
      await deleteFabricVariant({ id: id as any });
      toast.success('Variante supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetFabricVariantForm = () => {
    setFabricVariantForm({
      nameAr: '', nameFr: '', color: '', pattern: '', image: '',
      categoryId: '', subcategoryId: '',
      glssa: '0', wsaydRegular: '0', wsaydReduced: '0', coudoir: '0', zerbiya: '0',
      zerbiyaType1: '0', zerbiyaType2: '0', zerbiyaType3: '0', zerbiyaType4: '0', poufs: '0',
      sacDecoration: '0', petitCoussin: '0',
      isActive: true,
      linkedProductId: '',
    });
  };

  const openEditFabricVariant = (variant: any) => {
    setEditingFabricVariant(variant._id);
    setFabricVariantForm({
      nameAr: variant.name.ar, nameFr: variant.name.fr,
      color: variant.color, pattern: variant.pattern, image: variant.image,
      categoryId: variant.categoryId || '',
      subcategoryId: variant.subcategoryId || '',
      glssa: String(variant.stock.glssa), wsaydRegular: String(variant.stock.wsaydRegular),
      wsaydReduced: String(variant.stock.wsaydReduced), coudoir: String(variant.stock.coudoir),
      zerbiya: String(variant.stock.zerbiya),
      zerbiyaType1: String(variant.stock.zerbiyaType1 || 0), zerbiyaType2: String(variant.stock.zerbiyaType2 || 0),
      zerbiyaType3: String(variant.stock.zerbiyaType3 || 0), zerbiyaType4: String(variant.stock.zerbiyaType4 || 0),
      poufs: String(variant.stock.poufs || 0),
      sacDecoration: String(variant.stock.sacDecoration || 0), petitCoussin: String(variant.stock.petitCoussin || 0),
      isActive: variant.isActive,
      linkedProductId: '',
    });
    setFabricVariantModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#FDFBF7] min-h-screen">
      <Toaster />

      {/* Page Header */}
      <div className="mb-6">
        <p className="text-xs text-[#8A8A8A] font-medium mb-0.5" dir="rtl">إدارة المخزون</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] mb-1">Gestion du stock</h1>
        <p className="text-sm text-[#5A5A5A]">Analyse et suivi du stock en temps réel</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#E8E0D5] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-[#B85C38]/10 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-[#B85C38]" />
            </div>
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wide">Produits</span>
          </div>
          <p className="text-2xl font-black text-[#1A1A1A]">{nonCustomStock.length}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-0.5">Moy: {averageStockLevel} unités</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E0D5] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-[#B85C38]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#B85C38]" />
            </div>
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wide">Valeur</span>
          </div>
          <p className="text-2xl font-black text-[#B85C38]">{totalValue.toLocaleString()}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-0.5">MAD</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E0D5] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wide">Bas</span>
          </div>
          <p className="text-2xl font-black text-amber-500">{lowStockItems.length}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Réapprovisionnement</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E0D5] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wide">Rupture</span>
          </div>
          <p className="text-2xl font-black text-red-500">{outOfStockItems.length}</p>
          <p className="text-[10px] text-red-500 mt-0.5">Épuisés</p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('fabric')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'fabric' ? 'bg-[#B85C38] text-white' : 'bg-white border border-[#E8E0D5] text-[#5A5A5A] hover:bg-[#F5F0E8]'}`}
        >
          Variantes de tissu ({fabricVariants.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-[#B85C38] text-white' : 'bg-white border border-[#E8E0D5] text-[#5A5A5A] hover:bg-[#F5F0E8]'}`}
        >
          Produits individuels ({individualStock.length})
        </button>
      </div>

      {/* Step Size Selector - sticky for fast mobile access */}
      <div className="flex items-center gap-2 mb-4 bg-white rounded-xl border border-[#E8E0D5] px-3 py-2.5 sticky top-0 z-10">
        <div className="flex gap-1">
          {[1, 5, 10, 25].map(size => (
            <button
              key={size}
              onClick={() => setStepSize(stepSize === size ? null : size)}
              className={`min-w-[2.5rem] h-9 rounded-lg text-sm font-black transition-all active:scale-95 ${stepSize === size ? 'bg-[#B85C38] text-white shadow-sm' : 'bg-[#F5F0E8] text-[#5A5A5A] hover:bg-[#E8E0D5]'}`}
            >
              {size}
            </button>
          ))}
          <button
            onClick={() => setStepSize(null)}
            className={`px-3 h-9 rounded-lg text-xs font-black transition-all active:scale-95 ${stepSize === null ? 'bg-[#B85C38] text-white shadow-sm' : 'bg-[#F5F0E8] text-[#5A5A5A] hover:bg-[#E8E0D5]'}`}
          >
            #
          </button>
        </div>
        {stepSize === null && (
          <span className="text-[10px] text-[#B85C38] font-bold whitespace-nowrap">← Personnalisé</span>
        )}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={adjustmentNote}
            onChange={e => setAdjustmentNote(e.target.value)}
            placeholder="Note (optionnel)..."
            className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E8E0D5] rounded-lg text-xs text-[#1A1A1A] placeholder:text-[#8A8A8A] focus:ring-1 focus:ring-[#B85C38]"
          />
        </div>
      </div>

      {/* Fabric Variants Tab */}
      {activeTab === 'fabric' && (
        <div>
          {/* Add button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { resetFabricVariantForm(); setEditingFabricVariant(null); setFabricVariantModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#B85C38] hover:bg-[#9A4D2E] text-white rounded-lg transition-colors text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Nouvelle variante
            </button>
          </div>

          {fabricVariants.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8E0D5] p-12 text-center">
              <Package className="w-12 h-12 text-[#E8E0D5] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#1A1A1A] mb-1">Aucune variante de tissu</p>
              <p className="text-xs text-[#8A8A8A]">Créez votre première variante pour gérer le stock par tissu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fabricVariants.map((variant: any) => (
                <div key={variant._id} className="bg-white rounded-xl border border-[#E8E0D5] overflow-hidden">
                  {/* Image header */}
                  <div className="relative h-32 bg-[#F5F0E8]">
                    {variant.image && variant.image !== '/placeholder-product.jpg' ? (
                      <Image src={variant.image} alt={variant.name.fr} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-8 h-8 text-[#B85C38]" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${variant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {variant.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-black text-[#1A1A1A]">{variant.name.fr}</h3>
                      <div className="flex gap-1">
                        <button onClick={() => openEditFabricVariant(variant)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F5F0E8] text-[#5A5A5A]">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteFabricVariant(variant._id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[#5A5A5A] hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#8A8A8A] mb-3" dir="rtl">{variant.name.ar}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-[#F5F0E8] rounded text-[10px] font-bold text-[#5A5A5A]">{variant.color}</span>
                      {variant.pattern && <span className="px-2 py-0.5 bg-[#F5F0E8] rounded text-[10px] font-bold text-[#5A5A5A]">Description: {variant.pattern}</span>}
                      {variant.categoryId && (() => {
                        const cat = categories.find((c: any) => c._id === variant.categoryId);
                        return cat ? <span className="px-2 py-0.5 bg-[#BD7C48]/10 rounded text-[10px] font-bold text-[#BD7C48]">{cat.name.fr}</span> : null;
                      })()}
                      {(() => {
                        const linked = products.find((p: any) => p.fabricVariantId === variant._id);
                        return linked
                          ? (
                            <span className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setLinkPopoverVariantId(linkPopoverVariantId === variant._id ? null : variant._id); }}
                                className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-bold text-blue-700 flex items-center gap-0.5 hover:bg-blue-100 cursor-pointer transition-colors"
                              >
                                <Link2 className="w-2.5 h-2.5" /> Produit lié
                              </button>
                              {linkPopoverVariantId === variant._id && (
                                <div ref={popoverRef} className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E8E0D5] rounded-lg shadow-lg p-3 w-56" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {linked.image && (
                                      <Image src={linked.image} alt={linked.title?.fr || ''} width={36} height={36} className="rounded object-cover w-9 h-9" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#1A1A1A] truncate">{linked.title?.fr}</p>
                                      {linked.title?.ar && <p className="text-[10px] text-[#8A8A8A] truncate" dir="rtl">{linked.title.ar}</p>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => { router.push('/dashboard/products/' + linked._id); setLinkPopoverVariantId(null); }}
                                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#F5F0E8] hover:bg-[#E8E0D5] text-[#1A1A1A] rounded text-[10px] font-bold transition-colors"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> Voir
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await updateProduct({ id: linked._id, fabricVariantId: undefined });
                                          toast.success('Produit délié');
                                          setLinkPopoverVariantId(null);
                                        } catch (err) {
                                          toast.error('Erreur lors du déliage');
                                        }
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] font-bold transition-colors"
                                    >
                                      <Unlink className="w-2.5 h-2.5" /> Délier
                                    </button>
                                  </div>
                                </div>
                              )}
                            </span>
                          )
                          : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setLinkPickerVariantId(variant._id); setLinkSearchQuery(''); }}
                              className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] font-bold text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
                            >
                              Pas de produit
                            </button>
                          );
                      })()}
                    </div>
                    {/* Stock grid */}
                    <div className="space-y-1.5">
                      {[
                        { key: 'glssa', label: 'Glssa' },
                        { key: 'wsaydRegular', label: 'Wsayd Régulier' },
                        { key: 'wsaydReduced', label: 'Wsayd Réduit' },
                        { key: 'coudoir', label: 'Coudoir' },
                        { key: 'poufs', label: 'Poufs (بوف)' },
                        { key: 'sacDecoration', label: 'Sac Décoration (كيس ديكور)' },
                        { key: 'petitCoussin', label: 'Petit Coussin (وسائد صغيرة)' },
                        { key: 'zerbiyaType1', label: 'Zerbiya 2×1m', hidden: true },
                        { key: 'zerbiyaType2', label: 'Zerbiya 2.40×1.60m', hidden: true },
                        { key: 'zerbiyaType3', label: 'Zerbiya 3×2m', hidden: true },
                        { key: 'zerbiyaType4', label: 'Zerbiya 4×3m', hidden: true },
                      ].filter(comp => !comp.hidden || showZerbiya).map(comp => {
                        const pendingKey = `fabric:${variant._id}:${comp.key}`;
                        const pending = pendingAdjustments[pendingKey] || 0;
                        const manualKey = `fabric:${variant._id}:${comp.key}`;
                        const isManual = manualInputActive[manualKey];
                        return (
                        <div key={comp.key} className={`flex items-center justify-between py-1 px-2 rounded ${pending ? 'bg-[#B85C38]/5 border border-[#B85C38]/20' : comp.key === 'poufs' && linkedFabricVariantIds.has(variant._id) ? 'bg-purple-50 border border-purple-100' : 'bg-[#FAFAFA]'}`}>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-[#5A5A5A]">{comp.label}</span>
                            {comp.key === 'poufs' && linkedFabricVariantIds.has(variant._id) && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[8px] font-bold border border-purple-200"
                                title="Stock lié à un pouf individuel — les mouvements sont synchronisés"
                              >
                                <Link2 className="w-2 h-2" />
                                Lié
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); quickAdjustFabricStock(variant._id, comp.key, 'subtract'); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-black text-base active:scale-90 transition-all touch-manipulation"
                            >
                              −
                            </button>
                            {isManual ? (
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  autoFocus
                                  value={manualInputValue[manualKey] ?? ''}
                                  onChange={e => setManualInputValue(prev => ({ ...prev, [manualKey]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); commitManualInput(manualKey); } if (e.key === 'Escape') { e.stopPropagation(); cancelManualInput(manualKey); } }}
                                  onClick={e => e.stopPropagation()}
                                  className="w-14 h-7 text-center text-sm font-black border border-[#B85C38] rounded focus:outline-none focus:ring-1 focus:ring-[#B85C38] bg-white"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); commitManualInput(manualKey); }}
                                  className="w-6 h-6 flex items-center justify-center bg-[#B85C38] text-white rounded text-[10px] font-bold active:scale-95 touch-manipulation"
                                  title="Confirmer"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelManualInput(manualKey); }}
                                  className="w-6 h-6 flex items-center justify-center bg-[#F5F0E8] text-[#8A8A8A] rounded text-[10px] font-bold active:scale-95 touch-manipulation"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); startManualInput(manualKey, (variant.stock as any)[comp.key]); }}
                                className={`text-sm font-black min-w-[2rem] text-center tabular-nums px-1 rounded hover:bg-[#E8E0D5] transition-colors cursor-pointer ${(variant.stock as any)[comp.key] === 0 ? 'text-red-500' : (variant.stock as any)[comp.key] <= 5 ? 'text-amber-500' : 'text-[#1A1A1A]'}`}
                                title="Cliquer pour saisir manuellement"
                              >
                                {(variant.stock as any)[comp.key]}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); quickAdjustFabricStock(variant._id, comp.key, 'add'); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-black text-base active:scale-90 transition-all touch-manipulation"
                            >
                              +
                            </button>
                            {pending !== 0 && (
                              <>
                                <span className={`text-xs font-black min-w-[2rem] text-center ${pending > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {pending > 0 ? '+' : ''}{pending}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); savePending(pendingKey); }}
                                  className="px-2 py-1 bg-[#B85C38] text-white rounded text-[9px] font-bold active:scale-95 touch-manipulation"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelPending(pendingKey); }}
                                  className="w-6 h-6 flex items-center justify-center bg-[#F5F0E8] text-[#8A8A8A] rounded text-xs font-bold active:scale-95 touch-manipulation"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        );
                      })}
                      {/* Zerbiya toggle */}
                      <button
                        onClick={() => setShowZerbiya(v => !v)}
                        className="w-full text-[9px] font-bold text-[#8A8A8A] hover:text-[#5A5A5A] py-1 text-center transition-colors"
                      >
                        {showZerbiya ? '▲ Masquer Zerbiya' : '▼ Afficher Zerbiya'}
                      </button>
                    </div>
                    {/* Compact Recent History (max 5) */}
                    {recentHistoryForAll[variant._id] && recentHistoryForAll[variant._id].length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#E8E0D5]">
                        <p className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider mb-1.5">Activité récente</p>
                        <div className="space-y-1">
                          {recentHistoryForAll[variant._id].map((item: any) => (
                            <div key={item._id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-[#FAFAFA]">
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${item.operation === 'add' ? 'bg-green-100' : item.operation === 'subtract' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                {item.operation === 'add' ? (
                                  <ArrowUpRight className="w-2.5 h-2.5 text-green-600" />
                                ) : item.operation === 'subtract' ? (
                                  <ArrowDownRight className="w-2.5 h-2.5 text-red-600" />
                                ) : (
                                  <BarChart3 className="w-2.5 h-2.5 text-blue-600" />
                                )}
                              </div>
                              <span className={`text-[10px] font-black ${item.operation === 'add' ? 'text-green-600' : item.operation === 'subtract' ? 'text-red-600' : 'text-blue-600'}`}>
                                {item.operation === 'add' ? '+' : item.operation === 'subtract' ? '-' : '='}{item.quantity}
                              </span>
                              <span className="text-[9px] text-[#8A8A8A] truncate flex-1">{item.component}</span>
                              <span className="text-[9px] text-[#8A8A8A] flex-shrink-0">
                                {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* History button */}
                    <button
                      onClick={() => setSelectedFabricVariant(selectedFabricVariant === variant._id ? null : variant._id)}
                      className="w-full mt-3 flex items-center justify-center gap-1 px-3 py-1.5 bg-[#F5F0E8] hover:bg-[#E8E0D5] rounded-lg text-[10px] font-bold text-[#5A5A5A] transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Historique complet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Stock Movements Chart */}
          <div className="bg-white rounded-xl border border-[#E8E0D5] p-5 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-black text-[#1A1A1A] mb-0.5">Mouvements de stock</h2>
                <p className="text-xs text-[#8A8A8A]">
                  {selectedPeriod === 'custom' ? 'Période personnalisée' : `${selectedPeriod === '7d' ? '7' : selectedPeriod === '30d' ? '30' : '90'} derniers jours`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {(['7d', '30d', '90d'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPeriod === period ? 'bg-[#B85C38] text-white' : 'bg-[#F5F0E8] text-[#5A5A5A] hover:bg-[#E8E0D5]'}`}
                  >
                    {period === '7d' ? '7J' : period === '30d' ? '30J' : '90J'}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${selectedPeriod === 'custom' ? 'bg-[#B85C38] text-white' : 'bg-[#F5F0E8] text-[#5A5A5A] hover:bg-[#E8E0D5]'}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">Personnalisé</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <div className="mb-5 pb-5 border-b border-[#E8E0D5]">
                <DateRangePicker
                  label="Sélectionner la période personnalisée"
                  value={customDateRange}
                  onChange={setCustomDateRange}
                />
                {customDateRange?.start && customDateRange?.end && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#5A5A5A] bg-[#F5F0E8]/50 rounded-lg p-2.5 border border-[#E8E0D5]">
                    <Calendar className="w-3.5 h-3.5 text-[#B85C38]" />
                    <span className="font-bold text-[#1A1A1A]">
                      {new Date(customDateRange.start.year, customDateRange.start.month - 1, customDateRange.start.day)
                        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span>→</span>
                    <span className="font-bold text-[#1A1A1A]">
                      {new Date(customDateRange.end.year, customDateRange.end.month - 1, customDateRange.end.day)
                        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[#B85C38] font-bold">
                      ({Math.ceil((
                        new Date(customDateRange.end.year, customDateRange.end.month - 1, customDateRange.end.day).getTime() -
                        new Date(customDateRange.start.year, customDateRange.start.month - 1, customDateRange.start.day).getTime()
                      ) / (1000 * 60 * 60 * 24)) + 1}j)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Chart Stats - Compact row */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1 bg-[#F0FFF4] rounded-lg px-4 py-3 border border-[#C6F6D5]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[10px] font-bold text-green-900 uppercase">Entrées</span>
                </div>
                <p className="text-xl font-black text-green-600">+{totalStockIn}</p>
              </div>
              <div className="flex-1 bg-[#FEF2F2] rounded-lg px-4 py-3 border border-[#FECACA]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-[10px] font-bold text-red-900 uppercase">Sorties</span>
                </div>
                <p className="text-xl font-black text-red-600">-{totalStockOut}</p>
              </div>
              <div className="flex-1 bg-[#FAFAFA] rounded-lg px-4 py-3 border border-[#E8E8E8]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#5A5A5A]" />
                  <span className="text-[10px] font-bold text-[#1A1A1A] uppercase">Net</span>
                </div>
                <p className={`text-xl font-black ${netStockChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netStockChange >= 0 ? '+' : ''}{netStockChange}
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-lg border border-[#E8E0D5] p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stockMovements.map(m => ({
                    ...m,
                    dateFormatted: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D5" />
                  <XAxis dataKey="dateFormatted" stroke="#8A8A8A" style={{ fontSize: '10px' }} tick={{ fill: '#8A8A8A' }} />
                  <YAxis stroke="#8A8A8A" style={{ fontSize: '10px' }} tick={{ fill: '#8A8A8A' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '10px' }}
                    labelStyle={{ color: '#fff', fontWeight: '700', marginBottom: '6px' }}
                    cursor={{ fill: 'rgba(184, 92, 56, 0.08)' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'stockIn') return [`+${value}`, 'Entrées'];
                      if (name === 'stockOut') return [`-${value}`, 'Sorties'];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} iconType="rect" iconSize={8}
                    formatter={(value: string) => value === 'stockIn' ? 'Entrées' : value === 'stockOut' ? 'Sorties' : value}
                  />
                  <Bar dataKey="stockIn" fill="#22c55e" radius={[6, 6, 0, 0]} name="stockIn" />
                  <Bar dataKey="stockOut" fill="#ef4444" radius={[6, 6, 0, 0]} name="stockOut" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Alert - Compact strip */}
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#C2410C] flex-shrink-0" />
              <span className="text-xs font-bold text-[#9A3412]">Stock bas :</span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {lowStockItems.filter(item => !item.isMandatory).map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedProduct(item.id)}
                    className="px-2 py-0.5 bg-white/80 hover:bg-white rounded text-[10px] font-bold text-[#9A3412] border border-[#FED7AA] transition-colors"
                  >
                    {item.name} ({item.currentStock})
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowLowStockOnly(v => !v)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${showLowStockOnly ? 'bg-[#C2410C] text-white' : 'bg-white/80 hover:bg-white text-[#9A3412] border border-[#FED7AA]'}`}
              >
                {showLowStockOnly ? 'Tout afficher' : 'Stock bas uniquement'}
              </button>
            </div>
          )}

          {/* Products Table with integrated search */}
          <div className="bg-white rounded-xl border border-[#E8E0D5] overflow-hidden">
            {/* Table header with search */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E0D5]">
              <h2 className="text-sm font-black text-[#1A1A1A]">Inventaire ({filteredIndividualStock.length})</h2>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E8E0D5] rounded-lg text-[#1A1A1A] placeholder:text-[#8A8A8A] focus:ring-1 focus:ring-[#B85C38] focus:border-[#B85C38] transition-all text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FAFAFA]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Produit</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Min</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredIndividualStock.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center">
                        <Package className="w-10 h-10 text-[#E8E0D5] mx-auto mb-2" />
                        <p className="text-xs font-bold text-[#1A1A1A]">Aucun produit trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    filteredIndividualStock.map((item) => {
                      const status = getStockStatus(item);
                      const isSelected = selectedProduct === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#B85C38]/5' : 'hover:bg-[#F5F0E8]/30'}`}
                          onClick={() => setSelectedProduct(isSelected ? null : item.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F5F0E8] flex-shrink-0 flex items-center justify-center">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{item.name}</p>
                                  {item.linkedFabricVariantId && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold border border-purple-200 flex-shrink-0"
                                      title={`Stock lié à la variante de tissu (poufs salon)`}
                                    >
                                      <Link2 className="w-2.5 h-2.5" />
                                      Lié
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#8A8A8A]">
                                  {item.price.toLocaleString()} MAD
                                </p>
                              </div>
                              {isSelected && <ChevronRight className="w-4 h-4 text-[#B85C38] ml-auto flex-shrink-0" />}
                            </div>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const pendingKey = `product:${item.id}`;
                              const pending = pendingAdjustments[pendingKey] || 0;
                              const manualKey = `product:${item.id}`;
                              const isManual = manualInputActive[manualKey];
                              return (
                                <div>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => quickAdjustProductStock(item.id, 'subtract')}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-black text-base active:scale-90 transition-all touch-manipulation"
                                    >
                                      −
                                    </button>
                                    {isManual ? (
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          min="0"
                                          autoFocus
                                          value={manualInputValue[manualKey] ?? ''}
                                          onChange={e => setManualInputValue(prev => ({ ...prev, [manualKey]: e.target.value }))}
                                          onKeyDown={e => { if (e.key === 'Enter') { commitManualInput(manualKey); } if (e.key === 'Escape') { cancelManualInput(manualKey); } }}
                                          className="w-16 h-8 text-center text-sm font-black border border-[#B85C38] rounded focus:outline-none focus:ring-1 focus:ring-[#B85C38] bg-white"
                                        />
                                        <button
                                          onClick={() => commitManualInput(manualKey)}
                                          className="w-7 h-7 flex items-center justify-center bg-[#B85C38] text-white rounded text-sm font-bold active:scale-95 touch-manipulation"
                                          title="Confirmer"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => cancelManualInput(manualKey)}
                                          className="w-7 h-7 flex items-center justify-center bg-[#F5F0E8] text-[#8A8A8A] rounded text-sm font-bold active:scale-95 touch-manipulation"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => item.currentStock !== 999 && startManualInput(manualKey, item.currentStock)}
                                        className={`text-base font-black min-w-[2.5rem] text-center tabular-nums px-1 rounded transition-colors ${item.currentStock !== 999 ? 'hover:bg-[#E8E0D5] cursor-pointer' : 'cursor-default'} ${
                                          item.currentStock === 0 ? 'text-red-500' :
                                          item.currentStock <= item.minStock ? 'text-amber-500' :
                                          'text-[#1A1A1A]'
                                        }`}
                                        title={item.currentStock !== 999 ? 'Cliquer pour saisir manuellement' : ''}
                                      >
                                        {item.currentStock === 999 ? '∞' : item.currentStock}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => quickAdjustProductStock(item.id, 'add')}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-black text-base active:scale-90 transition-all touch-manipulation"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {pending !== 0 && (
                                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                      <span className={`text-sm font-black ${pending > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {pending > 0 ? '+' : ''}{pending}
                                      </span>
                                      <button
                                        onClick={() => savePending(pendingKey)}
                                        className="px-2.5 py-1 bg-[#B85C38] text-white rounded text-[10px] font-bold active:scale-95 touch-manipulation"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => cancelPending(pendingKey)}
                                        className="w-6 h-6 flex items-center justify-center bg-[#F5F0E8] text-[#8A8A8A] rounded text-xs font-bold active:scale-95 touch-manipulation"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-[#8A8A8A]">{item.minStock}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-semibold text-[#1A1A1A]">
                              {(item.currentStock * item.price).toLocaleString()} MAD
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Right Drawer - Product History */}
      {selectedProductData && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
            onClick={() => setSelectedProduct(null)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[70] shadow-2xl border-l border-[#E8E0D5] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D5] bg-[#FDFBF7]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F5F0E8] flex-shrink-0 flex items-center justify-center">
                  <Image src={selectedProductData.image} alt={selectedProductData.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-[#1A1A1A] truncate">{selectedProductData.name}</h3>
                  <p className="text-[10px] text-[#8A8A8A]">{selectedProductData.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E8E0D5] text-[#5A5A5A] transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stock summary */}
            <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-[#E8E0D5]">
              <div className="text-center p-3 rounded-lg bg-[#FAFAFA] border border-[#E8E0D5]">
                <p className="text-[10px] text-[#8A8A8A] uppercase font-bold mb-1">Stock</p>
                <p className={`text-xl font-black ${
                  selectedProductData.currentStock === 0 ? 'text-red-500' :
                  selectedProductData.currentStock <= selectedProductData.minStock ? 'text-amber-500' :
                  'text-[#1A1A1A]'
                }`}>
                  {selectedProductData.currentStock}
                </p>
              </div>
              <div
                className="text-center p-3 rounded-lg bg-[#FAFAFA] border border-[#E8E0D5] cursor-pointer hover:border-[#BD7C48] transition-colors"
                onClick={() => {
                  if (!editingThreshold) {
                    setThresholdValue(String(selectedProductData.minStock));
                    setEditingThreshold(true);
                  }
                }}
                title="Cliquer pour modifier le seuil"
              >
                <p className="text-[10px] text-[#8A8A8A] uppercase font-bold mb-1">Seuil</p>
                {editingThreshold ? (
                  <input
                    type="number"
                    min={0}
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    onBlur={async () => {
                      const val = parseInt(thresholdValue, 10);
                      if (!isNaN(val) && val >= 0 && selectedProduct) {
                        const product = products.find(p => p._id === selectedProduct);
                        if (product) {
                          try {
                            await updateProduct({
                              id: product._id,
                              inventory: {
                                ...product.inventory,
                                lowStockThreshold: val,
                              },
                            });
                            toast.success(`Seuil mis à jour: ${val}`);
                          } catch {
                            toast.error('Erreur lors de la mise à jour du seuil');
                          }
                        }
                      }
                      setEditingThreshold(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingThreshold(false);
                    }}
                    autoFocus
                    className="w-full text-xl font-black text-center text-[#1A1A1A] bg-white border border-[#BD7C48] rounded-md outline-none focus:ring-1 focus:ring-[#BD7C48]"
                  />
                ) : (
                  <p className="text-xl font-black text-[#1A1A1A]">{selectedProductData.minStock}</p>
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-[#FAFAFA] border border-[#E8E0D5]">
                <p className="text-[10px] text-[#8A8A8A] uppercase font-bold mb-1">Statut</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getStockStatus(selectedProductData).color}`}>
                  {getStockStatus(selectedProductData).label}
                </span>
              </div>
            </div>


            {/* History timeline */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h4 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider mb-3">Historique</h4>

              {selectedProductHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-[#E8E0D5] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#8A8A8A]">Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedProductHistory.map((transaction) => (
                    <div key={transaction.id} className="flex items-start gap-3 py-2.5 border-b border-[#F0F0F0] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        transaction.type === 'in' ? 'bg-[#F0FFF4]' : 'bg-[#FEF2F2]'
                      }`}>
                        {transaction.type === 'in' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-black ${
                            transaction.type === 'in' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'in' ? '+' : '-'}{transaction.quantity}
                          </span>
                          <span className="text-[10px] text-[#8A8A8A]">
                            {new Date(transaction.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {transaction.note && (
                          <p className="text-[10px] text-[#5A5A5A] truncate">{transaction.note}</p>
                        )}
                        <p className="text-[10px] text-[#8A8A8A]">
                          {transaction.previousStock} → {transaction.newStock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Fabric Variant History Drawer */}
      {selectedFabricVariant && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSelectedFabricVariant(null)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[70] shadow-2xl border-l border-[#E8E0D5] flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0D5] bg-[#FDFBF7]">
              <h3 className="text-sm font-black text-[#1A1A1A]">Historique de la variante</h3>
              <button onClick={() => setSelectedFabricVariant(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E8E0D5] text-[#5A5A5A]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!fabricVariantHistory || fabricVariantHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-[#E8E0D5] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#8A8A8A]">Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {fabricVariantHistory.map((item: any) => (
                    <div key={item._id} className="flex items-start gap-3 py-2.5 border-b border-[#F0F0F0] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.operation === 'add' ? 'bg-[#F0FFF4]' : 'bg-[#FEF2F2]'}`}>
                        {item.operation === 'add' ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-black ${item.operation === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.operation === 'add' ? '+' : '-'}{item.quantity}
                          </span>
                          <span className="text-[10px] text-[#8A8A8A]">{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className="text-[10px] font-bold text-[#5A5A5A]">{item.component}</p>
                        <p className="text-[10px] text-[#5A5A5A] truncate">{item.reason}</p>
                        <p className="text-[10px] text-[#8A8A8A]">{item.previousQuantity} → {item.newQuantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {/* Product Picker Modal (link fabric variant to product) */}
      {linkPickerVariantId && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setLinkPickerVariantId(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-[#E8E0D5] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[#1A1A1A]">Lier un produit</h3>
              <button onClick={() => setLinkPickerVariantId(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F5F0E8] text-[#5A5A5A]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
              <input
                type="text"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-9 pr-3 py-2 border border-[#E8E0D5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B85C38]/20 focus:border-[#B85C38]"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {(() => {
                const available = products.filter((p: any) =>
                  p.productType === 'majalis_set' &&
                  !p.fabricVariantId &&
                  (linkSearchQuery === '' ||
                    (p.title?.fr || '').toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                    (p.title?.ar || '').includes(linkSearchQuery))
                );
                if (available.length === 0) {
                  return (
                    <div className="text-center py-8 text-[#8A8A8A]">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-bold">Aucun produit disponible</p>
                      <p className="text-[10px] mt-0.5">Tous les produits majalis sont déjà liés</p>
                    </div>
                  );
                }
                return available.map((product: any) => (
                  <button
                    key={product._id}
                    onClick={async () => {
                      try {
                        await updateFabricVariant({ id: linkPickerVariantId as any, linkedProductId: product._id });
                        toast.success('Produit lié avec succès');
                        setLinkPickerVariantId(null);
                      } catch (err) {
                        toast.error('Erreur lors du liage');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F5F0E8] transition-colors text-left"
                  >
                    {product.image ? (
                      <Image src={product.image} alt={product.title?.fr || ''} width={40} height={40} className="rounded-lg object-cover w-10 h-10 border border-[#E8E0D5]" />
                    ) : (
                      <div className="w-10 h-10 bg-[#F5F0E8] rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-[#8A8A8A]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1A1A1A] truncate">{product.title?.fr}</p>
                      {product.title?.ar && <p className="text-[10px] text-[#8A8A8A] truncate" dir="rtl">{product.title.ar}</p>}
                      {product.category && <p className="text-[10px] text-[#BD7C48] font-bold mt-0.5">{product.category}</p>}
                    </div>
                    <Link2 className="w-3.5 h-3.5 text-[#8A8A8A] flex-shrink-0" />
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fabric Variant Create/Edit Modal */}
      {fabricVariantModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-[#E8E0D5] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-[#1A1A1A] mb-4">
              {editingFabricVariant ? 'Modifier la variante' : 'Nouvelle variante de tissu'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Nom (FR)</label>
                  <input type="text" value={fabricVariantForm.nameFr} onChange={e => setFabricVariantForm({...fabricVariantForm, nameFr: e.target.value})} className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm" placeholder="Bleu Royal" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Nom (AR)</label>
                  <input type="text" value={fabricVariantForm.nameAr} onChange={e => setFabricVariantForm({...fabricVariantForm, nameAr: e.target.value})} dir="rtl" className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm" placeholder="أزرق ملكي" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Couleur</label>
                  <input type="text" value={fabricVariantForm.color} onChange={e => setFabricVariantForm({...fabricVariantForm, color: e.target.value})} className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm" placeholder="Bleu" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Description courte</label>
                  <input type="text" value={fabricVariantForm.pattern} onChange={e => setFabricVariantForm({...fabricVariantForm, pattern: e.target.value})} className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm" placeholder="Classique" />
                </div>
              </div>
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Catégorie</label>
                <select
                  value={fabricVariantForm.categoryId}
                  onChange={e => setFabricVariantForm({...fabricVariantForm, categoryId: e.target.value, subcategoryId: ''})}
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm bg-white text-[#1A1A1A]"
                >
                  <option value="">-- Aucune catégorie --</option>
                  {categories.filter((c: any) => c.isActive && !c.parentCategoryId).map((cat: any) => (
                    <option key={cat._id} value={cat._id}>{cat.name.fr}</option>
                  ))}
                </select>
              </div>
              {/* Subcategory selector - shows subcategories of selected category */}
              {fabricVariantForm.categoryId && (() => {
                const subcategories = categories.filter((c: any) => c.isActive && c.parentCategoryId === fabricVariantForm.categoryId);
                return subcategories.length > 0 ? (
                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Sous-catégorie</label>
                    <select
                      value={fabricVariantForm.subcategoryId}
                      onChange={e => setFabricVariantForm({...fabricVariantForm, subcategoryId: e.target.value})}
                      className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm bg-white text-[#1A1A1A]"
                    >
                      <option value="">-- Aucune sous-catégorie --</option>
                      {subcategories.map((sub: any) => (
                        <option key={sub._id} value={sub._id}>{sub.name.fr}</option>
                      ))}
                    </select>
                  </div>
                ) : null;
              })()}
              {/* Image upload */}
              <div>
                <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Image principale</label>
                <ImageUpload
                  value={fabricVariantForm.image}
                  onChange={(url) => setFabricVariantForm({...fabricVariantForm, image: url})}
                  label="Télécharger l'image principale"
                  maxSizeMB={20}
                />
              </div>
              {/* Link to product */}
              <div>
                <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">
                  {editingFabricVariant ? 'Produit lié' : 'Lier à un produit'}
                </label>
                {(() => {
                  // For editing: use form state if user changed it, otherwise find the currently linked product
                  const currentLinkedId = fabricVariantForm.linkedProductId
                    || (editingFabricVariant
                      ? (products.find((p: any) => p.fabricVariantId === editingFabricVariant)?._id || '')
                      : '');
                  const selectedProduct = currentLinkedId ? products.find((p: any) => p._id === currentLinkedId) : null;
                  // Available products: unlinked majalis_set products (+ the currently selected one)
                  const availableProducts = products.filter((p: any) =>
                    p.productType === 'majalis_set' &&
                    (!p.fabricVariantId || p._id === currentLinkedId)
                  );

                  return (
                    <div className="space-y-2">
                      <select
                        value={currentLinkedId}
                        onChange={(e) => setFabricVariantForm({...fabricVariantForm, linkedProductId: e.target.value})}
                        className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg text-sm bg-white text-[#1A1A1A]"
                      >
                        <option value="">{editingFabricVariant ? '-- Aucun produit lié --' : '-- Créer un nouveau produit automatiquement --'}</option>
                        {availableProducts.map((product: any) => (
                          <option key={product._id} value={product._id}>
                            {product.title?.fr}{product.title?.ar ? ` — ${product.title.ar}` : ''}{product.category ? ` (${product.category})` : ''}
                          </option>
                        ))}
                      </select>
                      {/* Preview of selected product */}
                      {selectedProduct && (
                        <div className="flex items-center gap-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                          {selectedProduct.image && (
                            <Image src={selectedProduct.image} alt={selectedProduct.title?.fr || ''} width={40} height={40} className="rounded-lg object-cover w-10 h-10 border border-blue-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1A1A1A] truncate">{selectedProduct.title?.fr}</p>
                            {selectedProduct.title?.ar && <p className="text-[10px] text-[#8A8A8A] truncate" dir="rtl">{selectedProduct.title.ar}</p>}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {selectedProduct.category && <span className="text-[10px] text-[#BD7C48] font-bold">{selectedProduct.category}</span>}
                              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5"><Link2 className="w-2.5 h-2.5" /> Lié</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFabricVariantForm({...fabricVariantForm, linkedProductId: ''})}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {!editingFabricVariant && !currentLinkedId && (
                        <p className="text-[10px] text-[#8A8A8A]">Un nouveau produit sera créé automatiquement si aucun produit n&apos;est sélectionné</p>
                      )}
                    </div>
                  );
                })()}
              </div>
              {!editingFabricVariant && (
                <>
                  <label className="block text-xs font-bold text-[#8A8A8A] uppercase mb-1">Stock initial</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'glssa', label: 'Glssa' },
                      { key: 'wsaydRegular', label: 'Wsayd Rég.' },
                      { key: 'wsaydReduced', label: 'Wsayd Réd.' },
                      { key: 'coudoir', label: 'Coudoir' },
                      { key: 'zerbiyaType1', label: 'Zerbiya 2×1m' },
                      { key: 'zerbiyaType2', label: 'Zerbiya 2.40×1.60m' },
                      { key: 'zerbiyaType3', label: 'Zerbiya 3×2m' },
                      { key: 'zerbiyaType4', label: 'Zerbiya 4×3m' },
                      { key: 'poufs', label: 'Poufs (بوف)' },
                      { key: 'sacDecoration', label: 'Sac Décoration' },
                      { key: 'petitCoussin', label: 'Petit Coussin' },
                    ].map(comp => (
                      <div key={comp.key}>
                        <label className="block text-[10px] text-[#5A5A5A] mb-0.5">{comp.label}</label>
                        <input type="number" value={(fabricVariantForm as any)[comp.key]} onChange={e => setFabricVariantForm({...fabricVariantForm, [comp.key]: e.target.value})} className="w-full px-2 py-1.5 border border-[#E8E0D5] rounded text-sm" min="0" />
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={fabricVariantForm.isActive} onChange={e => setFabricVariantForm({...fabricVariantForm, isActive: e.target.checked})} className="w-4 h-4 text-[#B85C38] rounded" />
                <span className="text-sm font-medium text-[#1A1A1A]">Active</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setFabricVariantModalOpen(false); setEditingFabricVariant(null); resetFabricVariantForm(); }} className="flex-1 px-4 py-2.5 bg-white hover:bg-[#F5F0E8] border border-[#E8E0D5] text-[#1A1A1A] font-bold rounded-lg text-sm">
                Annuler
              </button>
              <button onClick={editingFabricVariant ? handleUpdateFabricVariant : handleCreateFabricVariant} className="flex-1 px-4 py-2.5 bg-[#B85C38] hover:bg-[#9A4D2E] text-white font-bold rounded-lg text-sm">
                {editingFabricVariant ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
