'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Truck,
  Box,
  DollarSign,
  Image as ImageIcon,
  Download,
  History,
  Layers,
  PackageCheck,
  PackageOpen,
} from 'lucide-react';
import { useGetOrderById, useUpdateOrderStatus, useUpdateOrder, useGetProductById, useGetFabricVariantById, useGetFabricVariants, useGetCategories, useGetProducts } from '@/hooks/useConvex';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Copy, Bug, Pencil, RefreshCw, Plus, Minus, Trash2, Search, X, ShoppingCart } from 'lucide-react';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { calculateGeometry } from '@/lib/ai-room-visualizer/geometry-calculator';
import { findOptimalDistribution } from '@/lib/ai-room-visualizer/piece-distributor';
import { generateFloorPlanSVG, generateFloorPlanDataUrl } from '@/lib/ai-room-visualizer/svg-generator';
import { calculateFloorRect } from '@/lib/ai-room-visualizer/carpet-calculator';
import { formatPiecesLines } from '@/components/FormattedPiecesList';

const FormattedPiecesList = dynamic(() => import('@/components/FormattedPiecesList'), { ssr: false });

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: AlertCircle,
    color: 'text-neutral-600',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200'
  },
  pending_payment: {
    label: 'En attente de paiement',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  confirmed: {
    label: 'Confirmée (Stock réduit)',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  in_production: {
    label: 'En production',
    icon: Loader,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  in_production_tissu_ponj: {
    label: 'En production : tissu et ponj',
    icon: Layers,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200'
  },
  delivered_ponj: {
    label: 'Livrée - Ponj',
    icon: PackageCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200'
  },
  shipping_tissu: {
    label: 'En cours de livraison tissu',
    icon: Truck,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200'
  },
  delivered_tissu: {
    label: 'Livrée - Tissu',
    icon: PackageOpen,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  ready_for_delivery: {
    label: 'Prêt pour livraison',
    icon: Truck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200'
  },
  delivered: {
    label: 'Livrée',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  }
};

type OrderStatus = keyof typeof statusConfig;

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const order = useGetOrderById(orderId as Id<"orders">);
  const updateOrderStatus = useUpdateOrderStatus();
  const updateOrder = useUpdateOrder();
  const updateOrderLayout = useMutation(api.orders.updateOrderLayout);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch product details if productId exists in first product (pattern info)
  const firstProductWithId = order?.products?.find(p => p.productId);
  const productDetails = useGetProductById(firstProductWithId?.productId || null);

  // Fetch selected majalis product details
  // @ts-ignore - selectedMajalisProduct might exist on order
  const selectedMajalisProductId = order?.selectedMajalisProduct?.productId;
  const majalisProductDetails = useGetProductById(selectedMajalisProductId || null);

  // Fetch fabric variant details if available on the order
  // @ts-ignore - selectedMajalisProduct might exist on order
  const fabricVariantId = order?.selectedMajalisProduct?.fabricVariantId ?? null;
  const fabricVariantDetails = useGetFabricVariantById(fabricVariantId || null);

  // All fabric variants for switcher
  const allFabricVariants = useGetFabricVariants() ?? [];

  // Fetch categories for fabric variant category/subcategory display
  const allDbCategories = useGetCategories();
  const fabricVariantCategory = fabricVariantDetails?.categoryId
    ? (allDbCategories ?? []).find(c => c._id === fabricVariantDetails.categoryId)
    : null;
  const fabricVariantSubcategory = fabricVariantDetails?.subcategoryId
    ? (allDbCategories ?? []).find(c => c._id === fabricVariantDetails.subcategoryId)
    : null;

  // Prepare design image query at top level (Rules of Hooks)
  const storageId = order?.layoutVisualization?.diagramUrl;
  const isValidStorageId = storageId && typeof storageId === 'string' && !storageId.startsWith('data:');
  const designImageUrl = useQuery(
    api.orders.getImageUrl,
    isValidStorageId ? { storageId: storageId as Id<"_storage"> } : "skip"
  );

  // Design history handling
  // @ts-ignore - designHistory might exist
  const designHistory = order?.designHistory as Array<{
    diagramUrl: string;
    savedAt: number;
    version: number;
    editedBy?: string;
    note?: string;
  }> | undefined;

  const [selectedVersion, setSelectedVersion] = useState<number | 'current'>('current');

  // Get the selected history item's storage ID
  const selectedHistoryItem = selectedVersion !== 'current' && designHistory
    ? designHistory.find(h => h.version === selectedVersion)
    : null;
  const selectedHistoryStorageId = selectedHistoryItem?.diagramUrl;
  const isValidHistoryStorageId = selectedHistoryStorageId && typeof selectedHistoryStorageId === 'string' && !selectedHistoryStorageId.startsWith('data:');

  // Query for historical image URL
  const historyImageUrl = useQuery(
    api.orders.getImageUrl,
    isValidHistoryStorageId ? { storageId: selectedHistoryStorageId as Id<"_storage"> } : "skip"
  );

  // Determine which image URL to display
  const displayImageUrl = selectedVersion === 'current' ? designImageUrl : historyImageUrl;

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending_payment');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedPieces, setCopiedPieces] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedDebug, setCopiedDebug] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesEditValue, setNotesEditValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [isChangingFabric, setIsChangingFabric] = useState(false);
  const [isSavingFabric, setIsSavingFabric] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [accompteAmount, setAccompteAmount] = useState('');

  // Edit products state
  const [isEditingProducts, setIsEditingProducts] = useState(false);
  const [editProducts, setEditProducts] = useState<Array<{
    productId?: string;
    productSlug?: string;
    name: string;
    image?: string;
    size?: string;
    color?: string;
    productType?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>>([]);
  const [editAdditionalItems, setEditAdditionalItems] = useState<Array<{
    name: string;
    nameAr?: string;
    productSlug?: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAdditionalItemForm, setShowAdditionalItemForm] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [isSavingProducts, setIsSavingProducts] = useState(false);

  // Fetch all products for the picker
  const allProducts = useGetProducts({ status: 'active' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (order) {
      setNotesValue(order.notes ?? '');
    }
  }, [order?._id]);

  // Recalculate: re-run the SVG generator + piece distributor with latest code
  const handleRecalculate = useCallback(async () => {
    if (!order) return;
    // @ts-ignore - optimizationData might exist
    const optData = order.optimizationData as any;
    const roomMeasurements = order.roomMeasurements as any;

    if (!optData?.dimensions && !roomMeasurements) {
      toast.error('Pas de données de dimensions pour recalculer');
      return;
    }

    setIsRecalculating(true);
    try {
      // Map schema layout types back to calculator format
      const schemaToCalc: Record<string, string> = {
        'u_shape': 'u-shape',
        'l_shape': 'l-shape',
        'straight': 'single-wall',
        'custom': 'four-walls',
      };
      const rawLayoutType = optData?.layoutType || roomMeasurements?.layoutType;
      const layoutType = schemaToCalc[rawLayoutType] || rawLayoutType;

      // Try optData dimensions first, then reconstruct from roomMeasurements
      let dimensions = optData?.dimensions || {};
      if (Object.keys(dimensions).length === 0 && roomMeasurements) {
        // Reconstruct dimensions from roomMeasurements fields
        const rm = roomMeasurements;
        if (layoutType === 'single-wall' && rm.width) {
          dimensions = { singleWall: rm.width };
        } else if (layoutType === 'l-shape') {
          dimensions = { lShapeH: rm.width || 0, lShapeV: rm.height || 0 };
        } else if (layoutType === 'u-shape') {
          dimensions = { uShapeH: rm.width || 0, uShapeL: rm.height || 0, uShapeR: rm.height || 0 };
        } else if (layoutType === 'four-walls') {
          dimensions = { fourWallsTop: rm.width || 0, fourWallsLeft: rm.height || 0, fourWallsRight: rm.height || 0, fourWallsBottomLeft: 0, fourWallsBottomRight: 0 };
        }
      }

      if (!layoutType || Object.keys(dimensions).length === 0) {
        toast.error('Données de dimensions manquantes');
        return;
      }

      const geom = calculateGeometry(layoutType, dimensions);
      const optimal = findOptimalDistribution(geom);
      const bestScenario = optimal.scenario;
      const dist = optimal.distribution;

      const floorRect = calculateFloorRect(layoutType, dimensions);
      const carpetSelections = order.calculations?.carpetSelections || optData?.carpetSelections || [];
      const poufsCount = order.calculations?.poufsCount || optData?.poufs?.count || 0;

      const carpetInput = carpetSelections.length > 0 && floorRect ? {
        carpets: carpetSelections.map((cs: any) => ({
          widthCm: cs.widthCm,
          heightCm: cs.heightCm,
          posX: cs.posX ?? 0,
          posY: cs.posY ?? 0,
          label: cs.label || `${cs.widthCm}×${cs.heightCm}`,
          floorRect,
        }))
      } : {};

      const svgInput = {
        layoutType,
        geometry: bestScenario,
        distribution: dist,
        ...carpetInput,
        poufsCount,
      };

      const svgDataUrl = generateFloorPlanDataUrl(svgInput);

      const allGlssaPieces: number[] = [];
      const allWssadaPieces: number[] = [];
      const wallsData: Record<string, { glssaPieces: number[]; wssadaPieces: number[] }> = {};

      for (const wall of dist.walls) {
        const gp = wall.glssaPieces.map(p => p.size);
        const wp = wall.wssadaPieces.map(p => p.size);
        wallsData[wall.wallId] = { glssaPieces: gp, wssadaPieces: wp };
        gp.forEach(s => allGlssaPieces.push(s));
        wp.forEach(s => allWssadaPieces.push(s));
      }

      const cornerOwnership: Record<string, string> = {};
      if (bestScenario.corners) {
        for (const corner of bestScenario.corners) {
          cornerOwnership[corner.cornerId] = corner.glssaOwner;
        }
      }

      const stats = {
        glssa: dist.totalGlssaPieces,
        wssada: dist.totalWssadaPieces,
      };

      const img = new window.Image();
      const imageBlob = await new Promise<Blob | null>((resolve) => {
        img.onload = () => {
          const dataLines = formatPiecesLines(allGlssaPieces, allWssadaPieces, stats.glssa, poufsCount);
          const scale = 4;
          const lineHeight = 7;
          const padding = 10;
          const dataHeight = dataLines.length > 0 ? dataLines.length * lineHeight + padding * 2 : 0;

          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;
          const totalHeight = imgHeight + dataHeight + (dataLines.length > 0 ? padding : 0);

          const canvas = document.createElement('canvas');
          canvas.width = imgWidth * scale;
          canvas.height = totalHeight * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.scale(scale, scale);

          ctx.fillStyle = '#FDFBF7';
          ctx.fillRect(0, 0, imgWidth, totalHeight);
          ctx.drawImage(img, 0, padding / 2, imgWidth, imgHeight);

          if (dataLines.length > 0) {
            const separatorY = imgHeight + padding;
            ctx.strokeStyle = '#E7E5E4';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(padding, separatorY);
            ctx.lineTo(imgWidth - padding, separatorY);
            ctx.stroke();

            const dataStartY = separatorY + padding;
            ctx.font = 'bold 5px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#1C1917';

            dataLines.forEach((line, index) => {
              ctx.fillText(line, imgWidth - padding, dataStartY + index * lineHeight);
            });
          }

          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.98
          );
        };
        img.onerror = () => resolve(null);
        img.src = svgDataUrl;
      });

      if (!imageBlob) {
        throw new Error('Failed to generate image');
      }

      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: imageBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { storageId } = await uploadResponse.json();

      await updateOrderLayout({
        id: order._id,
        calculations: {
          totalGlassat: stats.glssa,
          totalWsayd: stats.wssada,
          totalCoudoir: stats.glssa,
          totalZerbiya: order.calculations?.totalZerbiya || 0,
          glssaPieces: allGlssaPieces,
          wssadaPieces: allWssadaPieces,
          ...(carpetSelections.length > 0 ? { carpetSelections } : {}),
          ...(poufsCount > 0 ? {
            poufsCount,
            poufsPrice: order.calculations?.poufsPrice || poufsCount * 800,
          } : {}),
          materialUsageOptimized: true,
          spaceValidated: true,
          calculationMethod: 'recalculate-v2',
        },
        layoutVisualization: {
          diagramUrl: storageId,
        },
        optimizationData: {
          layoutType,
          dimensions,
          scenarioId: bestScenario.scenarioId,
          walls: wallsData,
          cornerOwnership,
          ...(carpetSelections.length > 0 ? { carpetSelections } : {}),
          ...(poufsCount > 0 ? {
            poufs: {
              count: poufsCount,
              unitPrice: order.calculations?.poufsPrice ? Math.round(order.calculations.poufsPrice / poufsCount) : 800,
              totalPrice: order.calculations?.poufsPrice || poufsCount * 800,
            },
          } : {}),
        },
      });

      toast.success('Design recalculé et mis à jour avec succès !');
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error(`Erreur lors du recalcul: ${(error as Error).message}`);
    } finally {
      setIsRecalculating(false);
    }
  }, [order, generateUploadUrl, updateOrderLayout]);

  if (!order) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#BD7C48] animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  const currentStatusConfig = statusConfig[order.status as OrderStatus];
  const StatusIcon = currentStatusConfig.icon;

  const isSalonOrder = order.orderType === 'room_measurement';

  // Define status progression order — salon orders use the tissu/ponj sub-statuses
  const directPurchaseStatusOrder: OrderStatus[] = [
    'draft',
    'pending_payment',
    'confirmed',
    'in_production',
    'ready_for_delivery',
    'delivered',
    'cancelled'
  ];

  // Salon order progression: confirmed → in_production_tissu_ponj → delivered_ponj / shipping_tissu → delivered_tissu → delivered
  const salonStatusOrder: OrderStatus[] = [
    'draft',
    'pending_payment',
    'confirmed',
    'in_production_tissu_ponj',
    'delivered_ponj',
    'shipping_tissu',
    'delivered_tissu',
    'delivered',
    'cancelled'
  ];

  const statusOrder = isSalonOrder ? salonStatusOrder : directPurchaseStatusOrder;

  // Statuses that are only relevant to salon (room_measurement) orders
  const salonOnlyStatuses: OrderStatus[] = [
    'in_production_tissu_ponj',
    'delivered_ponj',
    'shipping_tissu',
    'delivered_tissu'
  ];

  const canChangeToStatus = (currentStatus: OrderStatus, targetStatus: OrderStatus): boolean => {
    // Can't stay on the same status
    if (currentStatus === targetStatus) return false;

    // Salon-only statuses are only reachable for salon orders
    if (salonOnlyStatuses.includes(targetStatus) && !isSalonOrder) return false;

    // Can always cancel from any non-cancelled state
    if (targetStatus === 'cancelled' && currentStatus !== 'cancelled') return true;

    // Can always move to draft (allows admin to reset an order) from any non-draft state
    if (targetStatus === 'draft' && currentStatus !== 'draft') return true;

    // Can't go from cancelled to anything other than draft (handled above)
    if (currentStatus === 'cancelled') return false;

    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);

    // For salon orders, delivered_ponj and shipping_tissu are parallel steps after in_production_tissu_ponj
    // Allow transitioning between them freely once in the delivery phase
    if (isSalonOrder) {
      const deliveryPhase: OrderStatus[] = ['delivered_ponj', 'shipping_tissu'];
      if (deliveryPhase.includes(targetStatus) && (currentStatus === 'in_production_tissu_ponj' || deliveryPhase.includes(currentStatus))) {
        return true;
      }
    }

    // Can only move forward in the progression
    return targetIndex > currentIndex;
  };

  // Find the next logical status to pre-select when opening the modal
  const getNextStatus = (currentStatus: OrderStatus): OrderStatus => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    // Find the next status in the progression that is a valid forward transition
    for (let i = currentIndex + 1; i < statusOrder.length; i++) {
      const candidate = statusOrder[i];
      // Skip 'cancelled' as the default next step — it should be a deliberate choice
      if (candidate === 'cancelled') continue;
      if (canChangeToStatus(currentStatus, candidate)) return candidate;
    }
    // Fallback: if no forward step, keep current (confirm button will stay disabled until user picks something)
    return currentStatus;
  };

  const handleStatusUpdate = async () => {
    if (!order) return;

    // Soft validation — if somehow an invalid transition was triggered, silently ignore
    if (!canChangeToStatus(order.status as OrderStatus, newStatus)) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateOrderStatus({
        id: order._id,
        status: newStatus,
        note: statusNote || undefined,
      });

      // Send status update email to customer
      try {
        await fetch('/api/send-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: order.customerInfo.email,
            customerName: order.customerInfo.name,
            orderRef: order.reference,
            newStatus: newStatus
          })
        });
      } catch (emailError) {
        console.error('Failed to send status email:', emailError);
        // Don't fail the status update if email fails
      }

      toast.success('Statut de commande mis à jour avec succès!');
      setStatusModalOpen(false);
      setStatusNote('');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const orderTypeLabel = order.orderType === 'room_measurement'
    ? 'Mesure personnalisée'
    : 'Achat direct';

  const handleDownloadInvoice = async (accompte?: number, resteAPayer?: number) => {
    if (!order) return;

    const orderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let productRows = '';
    // @ts-ignore
    const additionalItemRows = (order.additionalItems || []).map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#92400e;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">
          ${item.image ? `<img src="${item.image}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;vertical-align:middle;margin-right:8px;" />` : ''}
          <span style="vertical-align:middle;">${item.nameAr || item.name}</span>
          <span style="font-size:11px;color:#b45309;margin-left:6px;background:#fef3c7;padding:1px 6px;border-radius:4px;vertical-align:middle;">\u0625\u0636\u0627\u0641\u064A</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${item.unitPrice.toLocaleString('fr-FR')} MAD</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">${item.totalPrice.toLocaleString('fr-FR')} MAD</td>
      </tr>
    `).join('');

    if (order.orderType === 'room_measurement' && order.calculations) {
      const c = order.calculations;
      // @ts-ignore
      const additionalItems: any[] = order.additionalItems || [];
      const additionalTotal = additionalItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);

      // Carpet price calculation
      let carpetTotal = 0;
      let carpetRows = '';
      const carpetSelections = c.carpetSelections || (c.carpetSelection ? [c.carpetSelection] : []);
      if (carpetSelections.length > 0) {
        for (const cs of carpetSelections) {
          const qty = cs.baseTypeQuantity || 1;
          const price = cs.price || 0;
          carpetTotal += price * qty;
          const dims = cs.widthCm && cs.heightCm ? ` (${cs.widthCm}\u00d7${cs.heightCm} cm)` : '';
          carpetRows += `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">
                <span style="vertical-align:middle;">\u0632\u0631\u0628\u064A\u0629${dims}</span>
                ${cs.label ? `<br/><span style="font-size:11px;color:#6b7280;">${cs.label}</span>` : ''}
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${qty}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${price.toLocaleString('fr-FR')} MAD</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">${(price * qty).toLocaleString('fr-FR')} MAD</td>
            </tr>
          `;
        }
      }

      // Poufs calculation
      const poufsCount = c.poufsCount || 0;
      const poufsPrice = c.poufsPrice || poufsCount * 800;
      const poufsUnitPrice = poufsCount > 0 ? Math.round(poufsPrice / poufsCount) : 800;
      let poufsRow = '';
      if (poufsCount > 0) {
        poufsRow = `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">
              <span style="vertical-align:middle;">\u0628\u0648\u0641</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${poufsCount}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${poufsUnitPrice.toLocaleString('fr-FR')} MAD</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">${poufsPrice.toLocaleString('fr-FR')} MAD</td>
          </tr>
        `;
      }

      // Majalis total = total - carpet - poufs - additional items
      const majalisTotal = order.pricing.total - carpetTotal - poufsPrice - additionalTotal;
      const totalGlassat = c.totalGlassat || 0;
      const totalWsayd = c.totalWsayd || 0;
      const totalCoudoir = c.totalCoudoir || 0;
      const detailParts: string[] = [];
      if (totalGlassat > 0) detailParts.push(`${totalGlassat} \u062C\u0644\u0633\u0629`);
      if (totalWsayd > 0) detailParts.push(`${totalWsayd} \u0648\u0633\u0627\u062F\u0629`);
      if (totalCoudoir > 0) detailParts.push(`${totalCoudoir} \u0643\u0648\u062F\u0648\u0627\u0631`);

      const majalisRow = `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">
            <span style="vertical-align:middle;font-weight:700;">\u0645\u062C\u0644\u0633</span>
            ${detailParts.length > 0 ? `<br/><span style="font-size:11px;color:#6b7280;">${detailParts.join('\u060C ')}</span>` : ''}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">1</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">\u2014</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">${majalisTotal.toLocaleString('fr-FR')} MAD</td>
        </tr>
      `;

      productRows = majalisRow + carpetRows + poufsRow;
    } else {
      // direct_purchase orders: keep original format
      productRows = order.products.map((p) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">
            ${p.image ? `<img src="${p.image}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;vertical-align:middle;margin-right:8px;" />` : ''}
            <span style="vertical-align:middle;">${p.name}${(p as any).color ? ` \u2014 ${(p as any).color}` : ''}${p.size ? ` (${p.size})` : ''}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${p.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${p.unitPrice.toLocaleString('fr-FR')} MAD</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">${p.totalPrice.toLocaleString('fr-FR')} MAD</td>
        </tr>
      `).join('');
    }

    // Selected Majalis product section (for room_measurement orders)
    let majalisSection = '';
    if (order.orderType === 'room_measurement') {
      const majalisName = (order as any).selectedMajalisProduct?.name || '';
      const majalisColor = (order as any).selectedMajalisProduct?.color || '';
      const majalisFabricName = (order as any).selectedMajalisProduct?.fabricVariantName || '';
      const majalisImage = fabricVariantDetails?.image || majalisProductDetails?.image || '';
      if (majalisName || majalisImage) {
        majalisSection = `
          <div style="margin-top:28px;page-break-inside:avoid;">
            <h3 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #BD7C48;">Mod\u00e8le Majalis choisi</h3>
            <table style="width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;">
              <tr>
                ${majalisImage ? `<td style="padding:16px;width:120px;vertical-align:top;"><img src="${majalisImage}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" /></td>` : ''}
                <td style="padding:16px;vertical-align:middle;">
                  <p style="font-size:15px;font-weight:800;color:#111827;margin:0 0 4px;font-family:'Noto Kufi Arabic','Segoe UI',Arial,sans-serif;">${majalisName}</p>
                  ${majalisFabricName ? `<p style="font-size:13px;color:#BD7C48;font-weight:600;margin:0 0 2px;">${majalisFabricName}</p>` : ''}
                  ${majalisColor ? `<p style="font-size:12px;color:#6b7280;margin:0;">Couleur: ${majalisColor}</p>` : ''}
                </td>
              </tr>
            </table>
          </div>
        `;
      }
    }

    let floorPlanSection = '';
    if (order.orderType === 'room_measurement' && displayImageUrl) {
      floorPlanSection = `
        <div style="margin-top:28px;page-break-inside:avoid;">
          <h3 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #BD7C48;">Plan de la pi\u00e8ce</h3>
          <div style="text-align:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
            <img src="${displayImageUrl}" alt="Plan de la pi\u00e8ce" style="max-width:100%;max-height:400px;object-fit:contain;" />
          </div>
        </div>
      `;
    }

    const taxRow = order.pricing.tax && order.pricing.tax > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px;color:#6b7280;">Sous-total</span>
        <span style="font-size:13px;font-weight:600;">${order.pricing.subtotal.toLocaleString('fr-FR')} MAD</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px;color:#6b7280;">Taxe</span>
        <span style="font-size:13px;font-weight:600;">${order.pricing.tax.toLocaleString('fr-FR')} MAD</span>
      </div>` : '';

    const shippingRow = order.pricing.shipping && order.pricing.shipping > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px;color:#6b7280;">Livraison</span>
        <span style="font-size:13px;font-weight:600;">${order.pricing.shipping.toLocaleString('fr-FR')} MAD</span>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${order.reference}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 40px; font-size: 14px; }
    .invoice-wrapper { max-width: 800px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #BD7C48; color: white; padding: 10px 12px; font-size: 12px; font-weight: 700; text-align: left; }
    th:not(:first-child) { text-align: right; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print {
      body { padding: 20px; }
      @page { margin: 10mm 10mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #BD7C48;">
      <div>
        <h1 style="font-size:20px;font-weight:900;color:#BD7C48;letter-spacing:-0.5px;margin-bottom:4px;">STE SUD ACADEMY SARL AU</h1>
        <p style="font-size:12px;color:#6b7280;line-height:1.8;">
          RC: 24721 / ICE: 003298639000013<br/>
          Adresse: Rue Ouhfrit Hay El Masjid N\u00b020-Dakhla<br/>
          T\u00e9l: +212657059044<br/>
          RIB: 230530518868222102590036
        </p>
      </div>
      <div style="text-align:right;">
        <div style="background:#BD7C48;color:white;padding:8px 18px;border-radius:8px;display:inline-block;margin-bottom:8px;">
          <span style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">FACTURE</span>
        </div>
        <p style="font-size:15px;font-weight:900;color:#111827;">${order.reference}</p>
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">${orderDate}</p>
      </div>
    </div>
    <div style="margin-bottom:28px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
      <h3 style="font-size:13px;font-weight:700;color:#BD7C48;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Informations client</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Nom</p>
          <p style="font-size:13px;font-weight:600;color:#111827;">${order.customerInfo.name}</p>
        </div>
        <div>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">T\u00e9l\u00e9phone</p>
          <p style="font-size:13px;font-weight:600;color:#111827;">${order.customerInfo.phone}</p>
        </div>
        <div>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Email</p>
          <p style="font-size:13px;font-weight:600;color:#111827;">${order.customerInfo.email}</p>
        </div>
        <div>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Ville</p>
          <p style="font-size:13px;font-weight:600;color:#111827;">${order.customerInfo.address.city}${order.customerInfo.address.region ? ', ' + order.customerInfo.address.region : ''}</p>
        </div>
        <div style="grid-column:1/-1;">
          <p style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Adresse</p>
          <p style="font-size:13px;font-weight:600;color:#111827;">${order.customerInfo.address.street}, ${order.customerInfo.address.city}${order.customerInfo.address.country ? ', ' + order.customerInfo.address.country : ''}</p>
        </div>
      </div>
    </div>
    <div style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #BD7C48;">D\u00e9tail des produits</h3>
      <table>
        <thead>
          <tr>
            <th style="text-align:left;">D\u00e9signation</th>
            <th style="text-align:center;width:80px;">Qt\u00e9</th>
            <th style="text-align:right;width:130px;">Prix unitaire</th>
            <th style="text-align:right;width:130px;">Total</th>
          </tr>
        </thead>
        <tbody>${productRows}${additionalItemRows}</tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
      <div style="width:280px;">
        ${taxRow}
        ${shippingRow}
        <div style="display:flex;justify-content:space-between;background:#BD7C48;margin-top:4px;border-radius:6px;padding:10px 14px;">
          <span style="font-size:14px;font-weight:900;color:white;">Total g\u00e9n\u00e9ral</span>
          <span style="font-size:16px;font-weight:900;color:white;">${order.pricing.total.toLocaleString('fr-FR')} MAD</span>
        </div>
        ${accompte && accompte > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:8px 14px;margin-top:4px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">
          <span style="font-size:13px;font-weight:700;color:#166534;">Accompte</span>
          <span style="font-size:14px;font-weight:700;color:#166534;">${accompte.toLocaleString('fr-FR')} MAD</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 14px;margin-top:4px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;">
          <span style="font-size:13px;font-weight:700;color:#92400e;">Reste \u00e0 payer</span>
          <span style="font-size:14px;font-weight:900;color:#92400e;">${(resteAPayer ?? (order.pricing.total - accompte)).toLocaleString('fr-FR')} MAD</span>
        </div>
        ` : ''}
      </div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-bottom:28px;">
      <p style="font-size:12px;font-weight:700;color:#166534;margin-bottom:4px;">Mode de paiement</p>
      <p style="font-size:13px;color:#166534;font-weight:600;">Virement bancaire</p>
      <p style="font-size:12px;color:#4b7a58;margin-top:4px;">RIB: 230530518868222102590036 \u2014 STE SUD ACADEMY SARL AU</p>
    </div>
    ${majalisSection}
    ${floorPlanSection}
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;">STE SUD ACADEMY SARL AU \u2014 Rue Ouhfrit Hay El Masjid N\u00b020-Dakhla \u2014 T\u00e9l: +212657059044</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:4px;">RC: 24721 / ICE: 003298639000013</p>
    </div>
  </div>
</body>
</html>`;

    // Open invoice in a new tab and auto-trigger print (Save as PDF)
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      toast.error('Popup bloqué — autorisez les popups pour cette page');
      return;
    }
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
    // Auto-trigger print once images are loaded
    invoiceWindow.onload = () => {
      setTimeout(() => invoiceWindow.print(), 400);
    };
  };

  const handleDownloadImage = async () => {
    if (!displayImageUrl) return;

    try {
      const response = await fetch(displayImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const versionSuffix = selectedVersion === 'current' ? '' : `-v${selectedVersion}`;
      link.download = `${order.reference}-design${versionSuffix}.jpeg`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Image téléchargée avec succès!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleCopyPiecesList = () => {
    if (!order.calculations) return;

    const lines: string[] = [];

    // Helper function to format pieces
    const groupPiecesBySize = (pieces: number[]) => {
      const grouped = new Map<number, number>();
      pieces.forEach(piece => {
        const rounded = Math.round(piece);
        grouped.set(rounded, (grouped.get(rounded) || 0) + 1);
      });
      return Array.from(grouped.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([size, count]) => ({ size, count }));
    };

    // Glssa pieces
    if (order.calculations.glssaPieces && order.calculations.glssaPieces.length > 0) {
      const groupedGlssa = groupPiecesBySize(order.calculations.glssaPieces);
      groupedGlssa.forEach(({ size, count }) => {
        const meters = Math.floor(size / 100);
        const cm = size % 100;
        const sizeStr = meters > 0 ? `${meters}m${cm > 0 ? cm.toString().padStart(2, '0') : ''}` : `${cm}`;
        lines.push(`${count}: HD ${sizeStr}\u00d770\u00d714`);
      });
    }

    // Coudoir
    if (order.calculations.totalGlassat > 0) {
      lines.push(`${order.calculations.totalGlassat}: HD 49\u00d720\u00d720`);
    }

    // Wssada pieces
    if (order.calculations.wssadaPieces && order.calculations.wssadaPieces.length > 0) {
      const groupedWssada = groupPiecesBySize(order.calculations.wssadaPieces);
      groupedWssada.forEach(({ size, count }) => {
        const meters = Math.floor(size / 100);
        const cm = size % 100;
        const sizeStr = meters > 0 ? `${meters}m${cm > 0 ? cm.toString().padStart(2, '0') : ''}` : `${cm}`;
        lines.push(`${count}: HD ${sizeStr}\u00d743\u00d710`);
      });
    }

    // Zerbiya
    if (order.calculations.carpetSelections && order.calculations.carpetSelections.length > 0) {
      for (const cs of order.calculations.carpetSelections) {
        lines.push(`${cs.baseTypeQuantity || 1}: ${cs.label}`);
      }
    } else if (order.calculations.carpetSelection) {
      const cs = order.calculations.carpetSelection;
      lines.push(`${cs.baseTypeQuantity}: ${cs.label}`);
    } else if (order.calculations.totalZerbiya > 0) {
      lines.push(`${order.calculations.totalZerbiya}: Zerbiya 70\u00d7190`);
    }

    if (order.calculations.poufsCount && order.calculations.poufsCount > 0) {
      lines.push(`${order.calculations.poufsCount}: HD 60\u00d760\u00d720`);
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPieces(true);
      toast.success('Liste copiée!');
      setTimeout(() => setCopiedPieces(false), 2000);
    }).catch(() => {
      toast.error('Erreur lors de la copie');
    });
  };

  // Debug: Copy optimization data to clipboard for comparison
  const handleCopyDebugData = () => {
    // @ts-ignore - optimizationData might exist
    const optimizationData = order.optimizationData;

    const debugData = {
      source: 'Convex DB',
      orderReference: order.reference,
      layoutType: optimizationData?.layoutType || order.roomMeasurements?.layoutType || 'unknown',
      cornerOwnership: optimizationData?.cornerOwnership || null,
      wssadaCornerOwnership: optimizationData?.wssadaCornerOwnership || null,
      walls: optimizationData?.walls
        ? Object.entries(optimizationData.walls).reduce((acc: any, [key, wall]: [string, any]) => {
            acc[key] = {
              glssaPieces: wall.glssaPieces || [],
              wssadaPieces: wall.wssadaPieces || [],
            };
            return acc;
          }, {})
        : null,
      // Carpets/Zerbiya positions
      carpets: optimizationData?.carpets || null,
      // Also include flat arrays for reference
      flatArrays: {
        glssaPieces: order.calculations?.glssaPieces || [],
        wssadaPieces: order.calculations?.wssadaPieces || [],
      },
      dimensions: order.roomMeasurements ? {
        width: order.roomMeasurements.width,
        height: order.roomMeasurements.height,
        layoutType: order.roomMeasurements.layoutType,
      } : null,
    };

    const text = JSON.stringify(debugData, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDebug(true);
      toast.success('Debug data copied!');
      setTimeout(() => setCopiedDebug(false), 2000);
      console.log('[DEBUG] Convex optimizationData:', debugData);
    }).catch(() => {
      toast.error('Error copying debug data');
    });
  };


  return (
    <div className="min-h-screen bg-neutral-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard/orders')}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-neutral-900 truncate">{order.reference}</h1>
              <p className="text-xs sm:text-sm text-neutral-600 truncate">
                {orderTypeLabel} • {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className={`hidden sm:inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border ${currentStatusConfig.bg} ${currentStatusConfig.color} ${currentStatusConfig.border}`}>
              <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-bold text-xs sm:text-sm whitespace-nowrap">{currentStatusConfig.label}</span>
            </div>
            {/* Invoice Download Button */}
            <button
              onClick={() => setInvoiceModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold shadow-sm flex-shrink-0"
              title="Télécharger la facture PDF"
            >
              <Download className="w-4 h-4" />
              <span>Facture</span>
            </button>
            {/* Debug Button - Only in development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleCopyDebugData}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-xs font-mono flex-shrink-0"
                title="Copy Convex DB data for debugging"
              >
                {copiedDebug ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Bug className="w-4 h-4" />
                )}
                <span>{copiedDebug ? 'Copied!' : 'Debug DB'}</span>
              </button>
            )}
          </div>
          {/* Mobile status badge */}
          <div className="sm:hidden mt-2 flex items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${currentStatusConfig.bg} ${currentStatusConfig.color} ${currentStatusConfig.border}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span className="font-bold">{currentStatusConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Mobile Status Update Button - Top */}
        <div className="lg:hidden mb-4 flex gap-2">
          <button
            onClick={() => {
              setNewStatus(getNextStatus(order.status as OrderStatus));
              setStatusModalOpen(true);
            }}
            className="flex-1 px-4 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold"
          >
            Changer le statut
          </button>
          <button
            onClick={() => setInvoiceModalOpen(true)}
            className="md:hidden flex items-center gap-2 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors text-sm font-bold border border-neutral-200"
          >
            <Download className="w-4 h-4" />
            <span>Facture</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Design Visualization (if applicable) */}
            {isValidStorageId && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">Visualisation du design</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {process.env.NODE_ENV === 'development' && order.orderType === 'room_measurement' && (
                      <button
                        onClick={handleRecalculate}
                        disabled={isRecalculating}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all text-xs sm:text-sm font-bold disabled:opacity-50"
                        title="Recalculer le design avec le dernier code"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        <span>{isRecalculating ? 'Recalcul...' : 'Recalculer'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/dashboard/custom?importOrder=${order.reference}`)}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-all text-xs sm:text-sm font-bold"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={handleDownloadImage}
                      disabled={!displayImageUrl}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#BD7C48] to-[#A0673D] text-white rounded-lg hover:from-[#A0673D] hover:to-[#8B5A32] transition-all shadow-md text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Télécharger</span>
                    </button>
                  </div>
                </div>

                {/* Version Tabs (if history exists) */}
                {designHistory && designHistory.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Historique des versions ({designHistory.length + 1})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Current version tab */}
                      <button
                        onClick={() => setSelectedVersion('current')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedVersion === 'current'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-transparent'
                        }`}
                      >
                        Actuel
                      </button>
                      {/* Historical version tabs (reverse order - newest first) */}
                      {[...designHistory].reverse().map((historyItem) => (
                        <button
                          key={historyItem.version}
                          onClick={() => setSelectedVersion(historyItem.version)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedVersion === historyItem.version
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-transparent'
                          }`}
                          title={`${historyItem.note || `Version ${historyItem.version}`} - ${new Date(historyItem.savedAt).toLocaleString('fr-FR')}`}
                        >
                          v{historyItem.version}
                        </button>
                      ))}
                    </div>
                    {/* Show info about selected version */}
                    {selectedVersion !== 'current' && selectedHistoryItem && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-xs text-amber-800">
                          <span className="font-bold">Version {selectedHistoryItem.version}</span>
                          {' • '}
                          {new Date(selectedHistoryItem.savedAt).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {selectedHistoryItem.editedBy && (
                            <span> • Par: {selectedHistoryItem.editedBy}</span>
                          )}
                        </p>
                        {selectedHistoryItem.note && (
                          <p className="text-xs text-amber-700 mt-1">{selectedHistoryItem.note}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {displayImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
                    <div className="w-full flex items-center justify-center bg-neutral-50 p-2">
                      <img
                        src={displayImageUrl}
                        alt={`Design visualization ${selectedVersion === 'current' ? '(current)' : `(v${selectedVersion})`}`}
                        className="w-full h-auto"
                        style={{ display: 'block', maxHeight: '70vh', objectFit: 'contain' }}
                      />
                    </div>
                    {/* Version badge overlay */}
                    {selectedVersion !== 'current' && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md">
                        Version {selectedVersion}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Chargement de l'image...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 mb-4">Informations client</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Nom</p>
                    <p className="text-sm font-bold text-neutral-900">{order.customerInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Téléphone</p>
                    <p className="text-sm font-bold text-neutral-900">{order.customerInfo.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Adresse</p>
                    <p className="text-sm font-bold text-neutral-900">
                      {order.customerInfo.address.street}, {order.customerInfo.address.city}
                      {order.customerInfo.address.region && `, ${order.customerInfo.address.region}`}
                      {order.customerInfo.address.country && `, ${order.customerInfo.address.country}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base sm:text-lg font-black text-neutral-900">
                  Produits ({order.products.length})
                </h2>
                {!isEditingProducts && (
                  <button
                    onClick={() => {
                      setEditProducts(order.products.map((p: any) => ({
                        productId: p.productId,
                        productSlug: p.productSlug,
                        name: p.name,
                        image: p.image,
                        size: p.size,
                        color: p.color,
                        productType: p.productType,
                        quantity: p.quantity,
                        unitPrice: p.unitPrice,
                        totalPrice: p.totalPrice,
                      })));
                      setEditAdditionalItems(((order as any).additionalItems || []).map((item: any) => ({
                        name: item.name,
                        nameAr: item.nameAr,
                        productSlug: item.productSlug,
                        image: item.image,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                      })));
                      setIsEditingProducts(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#BD7C48] hover:bg-amber-50 border border-[#BD7C48] rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modifier les produits</span>
                    <span className="sm:hidden">Modifier</span>
                  </button>
                )}
              </div>

              {isEditingProducts ? (
                <>
                  {/* Editable Products List */}
                  <div className="space-y-3 mb-4">
                    {editProducts.map((product, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="flex items-center gap-3 min-w-0">
                          {product.image && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                              <Image src={product.image} alt={product.name} fill className="object-cover" />
                            </div>
                          )}
                          <p className="text-sm font-bold text-neutral-900 truncate sm:hidden">{product.name}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-900 truncate hidden sm:block">{product.name}</p>
                          <div className="flex items-center gap-2 sm:mt-1 flex-wrap">
                            <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-md">
                              <button
                                onClick={() => {
                                  const updated = [...editProducts];
                                  if (updated[index].quantity > 1) {
                                    updated[index].quantity -= 1;
                                    updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
                                    setEditProducts(updated);
                                  }
                                }}
                                className="p-1 hover:bg-neutral-100 rounded-l-md"
                              >
                                <Minus className="w-3 h-3 text-neutral-600" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => {
                                  const updated = [...editProducts];
                                  const qty = Math.max(1, parseInt(e.target.value) || 1);
                                  updated[index].quantity = qty;
                                  updated[index].totalPrice = qty * updated[index].unitPrice;
                                  setEditProducts(updated);
                                }}
                                className="w-12 text-center text-xs font-bold text-neutral-900 border-0 focus:ring-0 bg-transparent"
                              />
                              <button
                                onClick={() => {
                                  const updated = [...editProducts];
                                  updated[index].quantity += 1;
                                  updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
                                  setEditProducts(updated);
                                }}
                                className="p-1 hover:bg-neutral-100 rounded-r-md"
                              >
                                <Plus className="w-3 h-3 text-neutral-600" />
                              </button>
                            </div>
                            <span className="text-xs text-neutral-500">x</span>
                            <input
                              type="number"
                              min="0"
                              value={product.unitPrice}
                              onChange={(e) => {
                                const updated = [...editProducts];
                                const price = Math.max(0, parseFloat(e.target.value) || 0);
                                updated[index].unitPrice = price;
                                updated[index].totalPrice = updated[index].quantity * price;
                                setEditProducts(updated);
                              }}
                              className="w-20 text-xs font-bold text-neutral-900 px-2 py-1 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48]"
                            />
                            <span className="text-xs text-neutral-500">MAD</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-200">
                          <p className="text-sm font-black text-neutral-900 whitespace-nowrap">
                            {product.totalPrice.toLocaleString()} MAD
                          </p>
                          <button
                            onClick={() => {
                              setEditProducts(editProducts.filter((_, i) => i !== index));
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Product Button */}
                  <button
                    onClick={() => {
                      setProductSearchQuery('');
                      setShowProductPicker(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 hover:border-[#BD7C48] text-neutral-600 hover:text-[#BD7C48] rounded-lg transition-colors text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un produit
                  </button>

                  {/* Editable Additional Items */}
                  <div className="mt-6">
                    <h3 className="text-sm font-black text-neutral-700 uppercase tracking-wider mb-3">
                      Articles supplementaires ({editAdditionalItems.length})
                    </h3>
                    <div className="space-y-3 mb-4">
                      {editAdditionalItems.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200/60">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                            )}
                            <p className="text-sm font-bold text-neutral-900 truncate sm:hidden">{item.name}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate hidden sm:block">{item.name}</p>
                            <div className="flex items-center gap-2 sm:mt-1 flex-wrap">
                              <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-md">
                                <button
                                  onClick={() => {
                                    const updated = [...editAdditionalItems];
                                    if (updated[index].quantity > 1) {
                                      updated[index].quantity -= 1;
                                      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
                                      setEditAdditionalItems(updated);
                                    }
                                  }}
                                  className="p-1 hover:bg-neutral-100 rounded-l-md"
                                >
                                  <Minus className="w-3 h-3 text-neutral-600" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = [...editAdditionalItems];
                                    const qty = Math.max(1, parseFloat(e.target.value) || 1);
                                    updated[index].quantity = qty;
                                    updated[index].totalPrice = qty * updated[index].unitPrice;
                                    setEditAdditionalItems(updated);
                                  }}
                                  className="w-12 text-center text-xs font-bold text-neutral-900 border-0 focus:ring-0 bg-transparent"
                                />
                                <button
                                  onClick={() => {
                                    const updated = [...editAdditionalItems];
                                    updated[index].quantity += 1;
                                    updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
                                    setEditAdditionalItems(updated);
                                  }}
                                  className="p-1 hover:bg-neutral-100 rounded-r-md"
                                >
                                  <Plus className="w-3 h-3 text-neutral-600" />
                                </button>
                              </div>
                              <span className="text-xs text-neutral-500">x</span>
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updated = [...editAdditionalItems];
                                  const price = Math.max(0, parseFloat(e.target.value) || 0);
                                  updated[index].unitPrice = price;
                                  updated[index].totalPrice = updated[index].quantity * price;
                                  setEditAdditionalItems(updated);
                                }}
                                className="w-20 text-xs font-bold text-neutral-900 px-2 py-1 border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48]"
                              />
                              <span className="text-xs text-neutral-500">MAD</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-amber-200/60">
                            <p className="text-sm font-black text-neutral-900 whitespace-nowrap">
                              {item.totalPrice.toLocaleString()} MAD
                            </p>
                            <button
                              onClick={() => {
                                setEditAdditionalItems(editAdditionalItems.filter((_, i) => i !== index));
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Additional Item - Inline Form */}
                    {showAdditionalItemForm ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Nouvel article supplementaire</p>
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Nom de l'article"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48]"
                        />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-neutral-500 mb-1">Prix unitaire (MAD)</label>
                            <input
                              type="number"
                              min="0"
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48]"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-neutral-500 mb-1">Quantite</label>
                            <input
                              type="number"
                              min="1"
                              value={newItemQuantity}
                              onChange={(e) => setNewItemQuantity(e.target.value)}
                              placeholder="1"
                              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#BD7C48] focus:border-[#BD7C48]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!newItemName.trim() || !newItemPrice) return;
                              const qty = Math.max(1, parseFloat(newItemQuantity) || 1);
                              const price = parseFloat(newItemPrice) || 0;
                              setEditAdditionalItems([...editAdditionalItems, {
                                name: newItemName.trim(),
                                quantity: qty,
                                unitPrice: price,
                                totalPrice: qty * price,
                              }]);
                              setNewItemName('');
                              setNewItemPrice('');
                              setNewItemQuantity('1');
                              setShowAdditionalItemForm(false);
                            }}
                            disabled={!newItemName.trim() || !newItemPrice}
                            className="px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={() => {
                              setShowAdditionalItemForm(false);
                              setNewItemName('');
                              setNewItemPrice('');
                              setNewItemQuantity('1');
                            }}
                            className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-bold transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAdditionalItemForm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 hover:border-[#BD7C48] text-amber-700 hover:text-[#BD7C48] rounded-lg transition-colors text-sm font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter un article supplementaire
                      </button>
                    )}
                  </div>

                  {/* Edit Mode Totals Preview */}
                  <div className="mt-6 pt-6 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-600">Sous-total produits</span>
                      <span className="text-sm font-bold text-neutral-900">
                        {editProducts.reduce((sum, p) => sum + p.totalPrice, 0).toLocaleString()} MAD
                      </span>
                    </div>
                    {editAdditionalItems.length > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Articles supplementaires</span>
                        <span className="text-sm font-bold text-neutral-900">
                          {editAdditionalItems.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()} MAD
                        </span>
                      </div>
                    )}
                    {order.pricing.shipping && order.pricing.shipping > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Livraison</span>
                        <span className="text-sm font-bold text-neutral-900">
                          {order.pricing.shipping.toLocaleString()} MAD
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                      <span className="text-base font-black text-neutral-900">Nouveau total</span>
                      <span className="text-2xl font-black text-[#BD7C48]">
                        {(
                          editProducts.reduce((sum, p) => sum + p.totalPrice, 0) +
                          editAdditionalItems.reduce((sum, item) => sum + item.totalPrice, 0) +
                          (order.pricing.shipping || 0) +
                          (order.pricing.tax || 0)
                        ).toLocaleString()} MAD
                      </span>
                    </div>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={async () => {
                        if (editProducts.length === 0) {
                          toast.error('La commande doit contenir au moins un produit');
                          return;
                        }
                        setIsSavingProducts(true);
                        try {
                          const productsSubtotal = editProducts.reduce((sum, p) => sum + p.totalPrice, 0);
                          const additionalTotal = editAdditionalItems.reduce((sum, item) => sum + item.totalPrice, 0);
                          const newTotal = productsSubtotal + additionalTotal + (order.pricing.shipping || 0) + (order.pricing.tax || 0);

                          await updateOrder({
                            id: order._id,
                            products: editProducts.map(p => ({
                              ...(p.productId ? { productId: p.productId as any } : {}),
                              ...(p.productSlug ? { productSlug: p.productSlug } : {}),
                              name: p.name,
                              ...(p.image ? { image: p.image } : {}),
                              ...(p.size ? { size: p.size } : {}),
                              ...(p.color ? { color: p.color } : {}),
                              ...(p.productType ? { productType: p.productType as any } : {}),
                              quantity: p.quantity,
                              unitPrice: p.unitPrice,
                              totalPrice: p.totalPrice,
                            })),
                            additionalItems: editAdditionalItems.map(item => ({
                              name: item.name,
                              ...(item.nameAr ? { nameAr: item.nameAr } : {}),
                              ...(item.productSlug ? { productSlug: item.productSlug } : {}),
                              ...(item.image ? { image: item.image } : {}),
                              quantity: item.quantity,
                              unitPrice: item.unitPrice,
                              totalPrice: item.totalPrice,
                            })),
                            pricing: {
                              subtotal: productsSubtotal,
                              tax: order.pricing.tax,
                              shipping: order.pricing.shipping,
                              total: newTotal,
                              currency: order.pricing.currency,
                            },
                          });
                          toast.success('Produits mis a jour avec succes');
                          setIsEditingProducts(false);
                        } catch (error) {
                          console.error('Error updating products:', error);
                          toast.error('Erreur lors de la mise a jour des produits');
                        } finally {
                          setIsSavingProducts(false);
                        }
                      }}
                      disabled={isSavingProducts}
                      className="px-5 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] disabled:opacity-60 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
                    >
                      {isSavingProducts ? <Loader className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProducts(false);
                        setShowProductPicker(false);
                        setShowAdditionalItemForm(false);
                      }}
                      disabled={isSavingProducts}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded-lg transition-colors text-sm font-bold"
                    >
                      Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Read-only Products List */}
                  <div className="space-y-3">
                    {order.products.map((product, index) => (
                      <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        {product.image && (
                          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-neutral-900 mb-1 truncate">{product.name}</p>
                          <p className="text-xs text-neutral-600">
                            Quantite: {product.quantity} x {product.unitPrice.toLocaleString()} MAD
                          </p>
                          {product.productType && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Type: {product.productType}
                            </p>
                          )}
                          {(product as any).color && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Couleur: {(product as any).color}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm font-black text-neutral-900 whitespace-nowrap">
                            {product.totalPrice.toLocaleString()} MAD
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Additional Items (Extras) - Read Only */}
                  {/* @ts-ignore */}
                  {order.additionalItems && order.additionalItems.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-black text-neutral-700 uppercase tracking-wider mb-3">
                        {/* @ts-ignore */}
                        Articles supplementaires ({order.additionalItems.length})
                      </h3>
                      <div className="space-y-3">
                        {/* @ts-ignore */}
                        {order.additionalItems.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-amber-50/50 rounded-lg border border-amber-200/60">
                            {item.image && (
                              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-neutral-900 mb-1 truncate">{item.name}</p>
                              <p className="text-xs text-neutral-600">
                                Quantite: {item.quantity} x {item.unitPrice.toLocaleString()} MAD
                              </p>
                              {item.productSlug && (
                                <p className="text-xs text-neutral-500 mt-1">
                                  Ref: {item.productSlug}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs sm:text-sm font-black text-neutral-900 whitespace-nowrap">
                                {item.totalPrice.toLocaleString()} MAD
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-6 pt-6 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-600">Sous-total</span>
                      <span className="text-sm font-bold text-neutral-900">
                        {order.pricing.subtotal.toLocaleString()} MAD
                      </span>
                    </div>
                    {order.pricing.tax && order.pricing.tax > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Taxe</span>
                        <span className="text-sm font-bold text-neutral-900">
                          {order.pricing.tax.toLocaleString()} MAD
                        </span>
                      </div>
                    )}
                    {order.pricing.shipping && order.pricing.shipping > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Livraison</span>
                        <span className="text-sm font-bold text-neutral-900">
                          {order.pricing.shipping.toLocaleString()} MAD
                        </span>
                      </div>
                    )}
                    {/* @ts-ignore */}
                    {order.additionalItems && order.additionalItems.length > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Articles supplementaires</span>
                        <span className="text-sm font-bold text-neutral-900">
                          {/* @ts-ignore */}
                          {order.additionalItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0).toLocaleString()} MAD
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                      <span className="text-base font-black text-neutral-900">Total general</span>
                      <span className="text-2xl font-black text-[#BD7C48]">
                        {order.pricing.total.toLocaleString()} MAD
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Room Measurements (if applicable) */}
            {order.roomMeasurements && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">Mesures de la pièce</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Largeur</p>
                    <p className="text-sm font-bold text-neutral-900">{order.roomMeasurements.width} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Hauteur</p>
                    <p className="text-sm font-bold text-neutral-900">{order.roomMeasurements.height} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Type de disposition</p>
                    <p className="text-sm font-bold text-neutral-900">{order.roomMeasurements.layoutType}</p>
                  </div>
                </div>
                {order.roomMeasurements.specialRequirements && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-bold mb-1">Exigences spéciales</p>
                    <p className="text-sm text-yellow-900">{order.roomMeasurements.specialRequirements}</p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Majalis Product */}
            {/* @ts-ignore */}
            {(majalisProductDetails || order?.selectedMajalisProduct) && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">
                    <span className="inline-flex items-center gap-2">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#BD7C48]" />
                      نوع المجلس المختار
                    </span>
                  </h2>
                  {order.orderType === 'room_measurement' && !isChangingFabric && (
                    <button
                      onClick={() => setIsChangingFabric(true)}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#BD7C48] hover:bg-amber-50 border border-[#BD7C48] rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Changer tissu
                    </button>
                  )}
                </div>

                {/* Fabric Variant Switcher */}
                {isChangingFabric && order.orderType === 'room_measurement' && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">Choisir une nouvelle variante de tissu</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {allFabricVariants.filter((v: any) => v.isActive).map((variant: any) => {
                        const isCurrentVariant = variant._id === fabricVariantId;
                        return (
                          <button
                            key={variant._id}
                            disabled={isSavingFabric || isCurrentVariant}
                            onClick={async () => {
                              if (isCurrentVariant) return;
                              setIsSavingFabric(true);
                              try {
                                // @ts-ignore
                                const currentMajalis = order.selectedMajalisProduct as any;
                                await updateOrder({
                                  id: order._id,
                                  selectedMajalisProduct: {
                                    productId: currentMajalis.productId,
                                    name: currentMajalis.name,
                                    fabricVariantId: variant._id,
                                    fabricVariantName: variant.name.fr || variant.name.ar,
                                    color: variant.color || currentMajalis.color,
                                  },
                                });
                                toast.success(`Tissu changé: ${variant.name.fr}`);
                                setIsChangingFabric(false);
                              } catch (error) {
                                console.error('Error changing fabric variant:', error);
                                toast.error('Erreur lors du changement');
                              } finally {
                                setIsSavingFabric(false);
                              }
                            }}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                              isCurrentVariant
                                ? 'border-[#BD7C48] ring-2 ring-[#BD7C48]/20 opacity-60 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-[#BD7C48] hover:shadow-md cursor-pointer'
                            }`}
                          >
                            {variant.image && variant.image !== '/placeholder-product.jpg' ? (
                              <div className="relative w-full h-16 bg-neutral-100">
                                <Image src={variant.image} alt={variant.name.fr} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-full h-16 bg-neutral-100 flex items-center justify-center">
                                <Package className="w-6 h-6 text-neutral-400" />
                              </div>
                            )}
                            <div className="p-2">
                              <p className="text-xs font-bold text-neutral-800 truncate">{variant.name.fr}</p>
                              <p className="text-[10px] text-neutral-500 truncate">{variant.color}</p>
                            </div>
                            {isCurrentVariant && (
                              <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#BD7C48] text-white text-[9px] font-bold rounded">
                                Actuel
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => setIsChangingFabric(false)}
                        disabled={isSavingFabric}
                        className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 font-bold rounded-lg text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Color Variants Gallery */}
                {majalisProductDetails?.colorVariants && majalisProductDetails.colorVariants.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">الألوان المتاحة</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {majalisProductDetails.colorVariants.map((cv: { name: string | { ar: string; fr: string; en?: string }; hex: string; image?: string; gallery?: string[] }, idx: number) => {
                        const cvDisplayName = typeof cv.name === 'string' ? cv.name : (cv.name.ar || cv.name.fr);
                        // @ts-ignore
                        const isSelected = order?.selectedMajalisProduct?.color === cvDisplayName;
                        return (
                          <div
                            key={idx}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                              isSelected
                                ? 'border-[#BD7C48] ring-2 ring-[#BD7C48]/20 shadow-lg'
                                : 'border-neutral-200 opacity-60'
                            }`}
                          >
                            {cv.image ? (
                              <div className="relative w-full h-24 bg-neutral-100">
                                <Image
                                  src={cv.image}
                                  alt={cvDisplayName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center" style={{ backgroundColor: cv.hex }}>
                                <div className="w-8 h-8 rounded-full border-2 border-white/50" style={{ backgroundColor: cv.hex }} />
                              </div>
                            )}
                            <div className="p-2 bg-white flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-neutral-300 flex-shrink-0"
                                style={{ backgroundColor: cv.hex }}
                              />
                              <span className="text-xs font-bold text-neutral-800 truncate">{cvDisplayName}</span>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-[#BD7C48] flex-shrink-0 ml-auto" />
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#BD7C48] text-white text-[10px] font-bold rounded-full">
                                المختار
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fabric Variant Details (when available) */}
                {fabricVariantDetails ? (
                  <div className="space-y-4">
                    {/* Fabric variant main image */}
                    {fabricVariantDetails.image && (
                      <div className="relative w-full h-48 sm:h-56 rounded-lg overflow-hidden bg-neutral-100">
                        <Image
                          src={fabricVariantDetails.image}
                          alt={fabricVariantDetails.name?.ar || 'Fabric'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Fabric variant name */}
                    <div>
                      <p className="text-base font-black text-neutral-900" dir="rtl">
                        {fabricVariantDetails.name?.ar}
                      </p>
                      <p className="text-sm text-neutral-600 mt-0.5">
                        {fabricVariantDetails.name?.fr}
                      </p>
                    </div>

                    {/* Category / Subcategory breadcrumb */}
                    {fabricVariantCategory && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <span className="px-2 py-1 bg-neutral-100 rounded-md font-bold text-neutral-700">
                          {fabricVariantCategory.name?.fr}
                        </span>
                        {fabricVariantSubcategory && (
                          <>
                            <span>›</span>
                            <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-md font-bold text-amber-800">
                              {fabricVariantSubcategory.name?.fr}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Color and Description (pattern) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Couleur</p>
                        <p className="text-sm font-bold text-neutral-900">{fabricVariantDetails.color}</p>
                      </div>
                      {fabricVariantDetails.pattern && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Description courte</p>
                          <p className="text-sm font-bold text-neutral-900">{fabricVariantDetails.pattern}</p>
                        </div>
                      )}
                    </div>

                    {/* Gallery thumbnails */}
                    {fabricVariantDetails.gallery && fabricVariantDetails.gallery.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-2">Galerie</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {fabricVariantDetails.gallery.map((item: { url: string }, idx: number) => (
                            <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                              <Image
                                src={item.url}
                                alt={`Gallery ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stock summary badges */}
                    {fabricVariantDetails.stock && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-2">Stock disponible</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            G:{fabricVariantDetails.stock.glssa}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            WR:{fabricVariantDetails.stock.wsaydRegular}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            Wred:{fabricVariantDetails.stock.wsaydReduced}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            C:{fabricVariantDetails.stock.coudoir}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            Z:{fabricVariantDetails.stock.zerbiya}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-bold">
                            Poufs:{fabricVariantDetails.stock.poufs ?? 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reference from order */}
                    {/* @ts-ignore */}
                    {order?.selectedMajalisProduct?.fabricVariantName && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-900">
                          {/* @ts-ignore */}
                          Variante sélectionnée : <strong>{order.selectedMajalisProduct.fabricVariantName}</strong>
                        </p>
                      </div>
                    )}

                    {/* Majalis product name (parent product) */}
                    {majalisProductDetails && (
                      <div className="pt-3 border-t border-neutral-200">
                        <div className="flex items-center gap-3">
                          {majalisProductDetails.image && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                              <Image
                                src={majalisProductDetails.image}
                                alt={majalisProductDetails.title?.ar || 'Majalis'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-500">Produit majalis</p>
                            <p className="text-sm font-bold text-neutral-900">
                              {majalisProductDetails.title?.ar || majalisProductDetails.title?.fr || 'N/A'}
                            </p>
                            {/* @ts-ignore */}
                            {order?.selectedMajalisProduct?.color && (
                              <p className="text-xs text-neutral-600 mt-0.5">Couleur: {(order.selectedMajalisProduct as any).color}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : majalisProductDetails ? (
                  /* Fallback: Legacy orders without fabric variant */
                  <div className="flex items-center gap-4">
                    {majalisProductDetails.image && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                        <Image
                          src={majalisProductDetails.image}
                          alt={majalisProductDetails.title?.ar || 'Majalis'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-neutral-900">
                        {majalisProductDetails.title?.ar || majalisProductDetails.title?.fr || 'N/A'}
                      </p>
                      {majalisProductDetails.description?.ar && (
                        <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                          {majalisProductDetails.description.ar}
                        </p>
                      )}
                      {/* @ts-ignore */}
                      {order?.selectedMajalisProduct?.color && (
                        <p className="text-sm text-neutral-600 mt-1">Couleur: {(order.selectedMajalisProduct as any).color}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Minimal fallback: show order-level name when product details not loaded */
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-neutral-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* @ts-ignore */}
                      <p className="text-base font-bold text-neutral-900">{order?.selectedMajalisProduct?.name || 'N/A'}</p>
                      {/* @ts-ignore */}
                      {order?.selectedMajalisProduct?.fabricVariantName && (
                        /* @ts-ignore */
                        <p className="text-sm text-neutral-600 mt-1">Variante: {order.selectedMajalisProduct.fabricVariantName}</p>
                      )}
                      {/* @ts-ignore */}
                      {order?.selectedMajalisProduct?.color && (
                        <p className="text-sm text-neutral-600 mt-1">Couleur: {(order.selectedMajalisProduct as any).color}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Required Pieces (للطباعة) */}
            {order.calculations && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">📋 قائمة القطع المطلوبة (للطباعة)</h2>
                  <button
                    onClick={handleCopyPiecesList}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-sm font-bold self-start sm:self-auto flex-shrink-0"
                  >
                    {copiedPieces ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-neutral-600" />
                    )}
                    <span>{copiedPieces ? 'Copié!' : 'Copier'}</span>
                  </button>
                </div>
                <FormattedPiecesList
                  glssaPieces={order.calculations.glssaPieces || []}
                  wssadaPieces={order.calculations.wssadaPieces || []}
                  totalGlssa={order.calculations.totalGlassat}
                  totalWssada={order.calculations.totalWsayd}
                  totalZerbiya={order.calculations.totalZerbiya}
                  includeZerbiya={order.calculations.totalZerbiya > 0}
                  poufsCount={order.calculations?.poufsCount || 0}
                  className=""
                />
                {order.calculations?.carpetSelections && order.calculations.carpetSelections.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {order.calculations.carpetSelections.map((cs: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1">
                        <span className="text-sm text-gray-600">Zerbiya {order.calculations!.carpetSelections!.length > 1 ? `#${idx + 1}` : ''}:</span>
                        <span className="text-sm font-medium">{cs.label}</span>
                      </div>
                    ))}
                  </div>
                ) : order.calculations?.carpetSelection ? (
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-600">Zerbiya Type:</span>
                    <span className="text-sm font-medium">{order.calculations.carpetSelection.label}</span>
                  </div>
                ) : null}
                {order.calculations?.poufsCount && order.calculations.poufsCount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-600">Poufs:</span>
                    <span className="text-sm font-medium">{order.calculations.poufsCount} × 800 MAD = {order.calculations.poufsPrice || order.calculations.poufsCount * 800} MAD</span>
                  </div>
                )}
                <p className="text-xs text-neutral-500 mt-3">
                  💡 Les dimensions exactes de chaque pièce sont affichées ci-dessus. L'image de conception est disponible ci-dessous.
                </p>
              </div>
            )}

            {/* Product Pattern Info (for printing) */}
            {productDetails && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-black text-neutral-900 mb-4">🎨 Produit (Motif pour impression)</h2>
                <div className="space-y-4">
                  {productDetails.image && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-neutral-100">
                      <Image
                        src={productDetails.image}
                        alt={productDetails.title?.fr || 'Product'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Nom</p>
                    <p className="text-sm font-bold text-neutral-900">
                      {productDetails.title?.ar || productDetails.title?.fr || 'N/A'}
                    </p>
                  </div>
                  {productDetails.specifications?.patterns && productDetails.specifications.patterns.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Motifs</p>
                      <div className="flex flex-wrap gap-2">
                        {productDetails.specifications.patterns.map((pattern: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-[#BD7C48]/10 text-[#BD7C48] rounded-lg text-xs font-bold">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {productDetails.specifications?.colors && productDetails.specifications.colors.length > 0 && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Couleurs</p>
                      <div className="flex flex-wrap gap-2">
                        {productDetails.specifications.colors.map((color: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-900">
                      💡 <strong>Info:</strong> Ce motif sera utilisé pour l'impression de tous les éléments (Glssa, Wssada, Coudoir).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-black text-neutral-900">Notes</h2>
                {!isEditingNotes && (
                  <button
                    onClick={() => {
                      setNotesEditValue(notesValue);
                      setNotesSaved(false);
                      setIsEditingNotes(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#BD7C48] hover:bg-amber-50 border border-[#BD7C48] rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <>
                  <textarea
                    value={notesEditValue}
                    onChange={(e) => setNotesEditValue(e.target.value)}
                    placeholder="Ajouter des notes sur cette commande..."
                    rows={4}
                    autoFocus
                    className="w-full text-sm text-neutral-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4 resize-y focus:outline-none focus:ring-2 focus:ring-[#BD7C48] focus:border-transparent placeholder:text-neutral-400"
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={async () => {
                        setIsSavingNotes(true);
                        try {
                          await updateOrder({ id: order._id, notes: notesEditValue || undefined });
                          setNotesValue(notesEditValue);
                          setNotesSaved(true);
                          setIsEditingNotes(false);
                          toast.success('Notes sauvegardées');
                          setTimeout(() => setNotesSaved(false), 3000);
                        } catch {
                          toast.error('Erreur lors de la sauvegarde des notes');
                        } finally {
                          setIsSavingNotes(false);
                        }
                      }}
                      disabled={isSavingNotes}
                      className="px-4 py-2 bg-[#BD7C48] hover:bg-[#A0673D] disabled:opacity-60 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
                    >
                      {isSavingNotes ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : null}
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotesEditValue('');
                      }}
                      disabled={isSavingNotes}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-60 text-neutral-700 rounded-lg transition-colors text-sm font-bold"
                    >
                      Annuler
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 min-h-[80px]">
                  {notesValue ? (
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{notesValue}</p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">Aucune note</p>
                  )}
                </div>
              )}

              {notesSaved && !isEditingNotes && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium mt-3">
                  <CheckCircle className="w-4 h-4" />
                  Sauvegardé
                </span>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 min-w-0">
            {/* Status Update - Desktop Only */}
            <div className="hidden lg:block bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 mb-4">Mettre à jour le statut</h2>
              <button
                onClick={() => {
                  setNewStatus(getNextStatus(order.status as OrderStatus));
                  setStatusModalOpen(true);
                }}
                className="w-full px-4 py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white rounded-lg transition-colors text-sm font-bold"
              >
                Changer le statut
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 mb-4">Résumé</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Référence</p>
                  <p className="text-sm font-bold text-neutral-900">{order.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Type de commande</p>
                  <p className="text-sm font-bold text-neutral-900">{orderTypeLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Date de création</p>
                  <p className="text-sm font-bold text-neutral-900">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Dernière mise à jour</p>
                  <p className="text-sm font-bold text-neutral-900">
                    {new Date(order.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Status Timeline */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 mb-4">مراحل الطلب</h2>
              {(() => {
                const statusHistory = (order as any).statusHistory as Array<{ fromStatus: string; toStatus: string; changedAt: number; note?: string }> | undefined;
                return (
                  <div className="space-y-0">
                    {statusOrder.filter(s => s !== 'cancelled').map((status, index, filteredArray) => {
                      const config = statusConfig[status];
                      const Icon = config.icon;
                      const currentIndex = statusOrder.indexOf(order.status as OrderStatus);
                      const statusIndex = statusOrder.indexOf(status);
                      const isCompleted = statusIndex < currentIndex || order.status === 'delivered';
                      const isCurrent = status === order.status;
                      const isPending = statusIndex > currentIndex;

                      return (
                        <div key={status} className="relative">
                          {/* Connector line */}
                          {index < filteredArray.length - 1 && (
                            <div className={`absolute top-10 right-5 w-0.5 h-8 ${
                              isCompleted ? 'bg-green-500' : 'bg-neutral-200'
                            }`} />
                          )}

                          {/* Status item */}
                          <div className={`flex items-center gap-3 py-2 ${isPending ? 'opacity-40' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted ? 'bg-green-100' :
                              isCurrent ? config.bg :
                              'bg-neutral-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isCompleted ? 'text-green-600' :
                                isCurrent ? config.color :
                                'text-neutral-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${
                                isCompleted ? 'text-green-600' :
                                isCurrent ? 'text-neutral-900' :
                                'text-neutral-400'
                              }`}>
                                {config.label}
                              </p>
                              {isCurrent && (
                                <p className="text-xs text-neutral-500">الحالة الحالية</p>
                              )}
                              {(() => {
                                const historyEntries = (statusHistory || []).filter(h => h.toStatus === status);
                                if (historyEntries.length === 0) return null;
                                return (
                                  <div className="mt-1 space-y-1">
                                    {historyEntries.map((entry, idx) => (
                                      <div key={idx} className="text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-1">
                                        <span>{new Date(entry.changedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        {entry.note && <p className="text-neutral-600 mt-0.5">{entry.note}</p>}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            {isCompleted && (
                              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-black text-neutral-900 mb-4 sm:mb-6">Mettre à jour le statut</h3>

            {/* Current Status */}
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <p className="text-xs text-neutral-500 mb-2">Statut actuel</p>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${currentStatusConfig.bg} ${currentStatusConfig.border}`}>
                <StatusIcon className={`w-4 h-4 ${currentStatusConfig.color}`} />
                <span className={`font-bold text-sm ${currentStatusConfig.color}`}>
                  {currentStatusConfig.label}
                </span>
              </div>
            </div>

            {/* Status Options */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-bold text-neutral-900 mb-3">Nouveau statut</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {Object.entries(statusConfig)
                  .filter(([key]) => {
                    // Hide salon-only statuses for direct_purchase orders
                    if (salonOnlyStatuses.includes(key as OrderStatus) && !isSalonOrder) return false;
                    return true;
                  })
                  .map(([key, config]) => {
                  const Icon = config.icon;
                  const canSelect = canChangeToStatus(order.status as OrderStatus, key as OrderStatus);
                  return (
                    <button
                      key={key}
                      onClick={() => canSelect && setNewStatus(key as OrderStatus)}
                      disabled={!canSelect}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                        !canSelect
                          ? 'opacity-40 cursor-not-allowed border-neutral-200 bg-neutral-50'
                          : newStatus === key
                          ? 'border-[#BD7C48] bg-[#BD7C48]/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className={`text-sm font-bold ${newStatus === key ? 'text-[#BD7C48]' : 'text-neutral-900'}`}>
                          {config.label}
                        </span>
                      </div>
                      {key === 'confirmed' && canSelect && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          Le stock sera réduit automatiquement
                        </p>
                      )}
                      {(key === 'cancelled' || key === 'draft') && ['confirmed', 'in_production', 'in_production_tissu_ponj', 'ready_for_delivery', 'delivered_ponj', 'shipping_tissu', 'delivered_tissu'].includes(order.status) && canSelect && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Le stock sera restauré
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-bold text-neutral-900 mb-2">Note (optionnel)</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Ajouter une note..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setStatusModalOpen(false);
                  setStatusNote('');
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-bold rounded-lg transition-colors text-sm"
                disabled={isUpdating}
              >
                Annuler
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === order.status}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isUpdating ? 'Mise à jour...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Picker Modal */}
      {showProductPicker && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-neutral-900">Ajouter un produit</h3>
              <button
                onClick={() => setShowProductPicker(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-all"
              />
            </div>

            {/* Product Grid */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {allProducts
                ?.filter((p: any) => {
                  if (!productSearchQuery.trim()) return true;
                  const q = productSearchQuery.toLowerCase();
                  const titleFr = (p.title?.fr || '').toLowerCase();
                  const titleAr = (p.title?.ar || '').toLowerCase();
                  const slug = (p.slug || '').toLowerCase();
                  return titleFr.includes(q) || titleAr.includes(q) || slug.includes(q);
                })
                .map((product: any) => {
                  const displayName = product.title?.fr || product.title?.ar || product.slug || 'Produit';
                  const price = product.pricing?.basePrice || product.pricing?.price || 0;
                  return (
                    <button
                      key={product._id}
                      onClick={() => {
                        setEditProducts([...editProducts, {
                          productId: product._id,
                          productSlug: product.slug,
                          name: displayName,
                          image: product.image,
                          color: product.colorVariants?.[0]?.name || undefined,
                          productType: product.productType,
                          quantity: 1,
                          unitPrice: price,
                          totalPrice: price,
                        }]);
                        setShowProductPicker(false);
                        toast.success(`${displayName} ajoute`);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg border border-neutral-200 hover:border-[#BD7C48] transition-all text-left"
                    >
                      {product.image ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                          <Image src={product.image} alt={displayName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">{displayName}</p>
                        {product.title?.ar && product.title?.fr && (
                          <p className="text-xs text-neutral-500 truncate" dir="rtl">{product.title.ar}</p>
                        )}
                        {product.productType && (
                          <p className="text-xs text-neutral-400 mt-0.5">Type: {product.productType}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-[#BD7C48]">{price.toLocaleString()} MAD</p>
                      </div>
                    </button>
                  );
                })}
              {allProducts && allProducts.filter((p: any) => {
                if (!productSearchQuery.trim()) return true;
                const q = productSearchQuery.toLowerCase();
                return (p.title?.fr || '').toLowerCase().includes(q) || (p.title?.ar || '').toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q);
              }).length === 0 && (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  Aucun produit trouve
                </div>
              )}
              {!allProducts && (
                <div className="text-center py-8">
                  <Loader className="w-6 h-6 text-[#BD7C48] animate-spin mx-auto mb-2" />
                  <p className="text-neutral-500 text-sm">Chargement des produits...</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice Accompte Modal */}
      {invoiceModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 my-4">
            <h3 className="text-lg font-black text-neutral-900 mb-4">G{'\u00e9'}n{'\u00e9'}rer la facture</h3>

            {/* Total */}
            <div className="mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-600">Total G{'\u00e9'}n{'\u00e9'}ral</span>
                <span className="text-lg font-black text-[#BD7C48]">{order.pricing.total.toLocaleString('fr-FR')} MAD</span>
              </div>
            </div>

            {/* Accompte Input */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-neutral-900 mb-2">Accompte (montant pay{'\u00e9'})</label>
              <input
                type="number"
                min="0"
                max={order.pricing.total}
                value={accompteAmount}
                onChange={(e) => setAccompteAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-[#BD7C48] focus:border-[#BD7C48] transition-all"
              />
            </div>

            {/* Reste a payer */}
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-800">Reste {'\u00e0'} payer</span>
                <span className="text-base font-black text-amber-900">
                  {(order.pricing.total - (parseFloat(accompteAmount) || 0)).toLocaleString('fr-FR')} MAD
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setInvoiceModalOpen(false);
                  setAccompteAmount('');
                }}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-900 font-bold rounded-lg transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const acc = parseFloat(accompteAmount) || 0;
                  const reste = order.pricing.total - acc;
                  handleDownloadInvoice(acc, reste);
                  setInvoiceModalOpen(false);
                  setAccompteAmount('');
                }}
                className="flex-1 px-4 py-2.5 bg-[#BD7C48] hover:bg-[#A0673D] text-white font-bold rounded-lg transition-all text-sm"
              >
                G{'\u00e9'}n{'\u00e9'}rer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
