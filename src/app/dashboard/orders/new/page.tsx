// ===== NEW ORDER (ADMIN) =====
// Single-page order builder for the dashboard, so an order taken over the
// phone or at the shop can be entered without walking through the customer
// checkout wizard. Everything is on one screen with a live summary; no email
// is ever sent from here.

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  calculateGeometry,
  findOptimalDistribution,
  generateFloorPlanDataUrl,
  calculateFloorRect,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
  type LayoutType,
  type CarpetInventory,
  type MultiCarpetResult,
} from '@/lib/ai-room-visualizer';
import RoomShapeDiagram, { type DiagramLayout, type DiagramWallValue } from '@/components/checkout/RoomShapeDiagram';
import {
  parseMeasurement,
  isMeasurementInRange,
  describeMeasurement,
  toCm,
  MIN_WALL_CM,
  MAX_WALL_CM,
} from '@/lib/measurements';
import { getLocalizedField } from '@/lib/utils';

type Mode = 'salon' | 'products';

/** Cards shown before "Voir plus" — two rows on a desktop grid. */
const CARDS_COLLAPSED = 8;

const PRICE_PER_SET = 2050;
const PRICE_PER_EXTRA_WSSADA = 300;
const PRICE_PER_POUF = 800;

const SHAPES: Array<{ id: DiagramLayout; label: string; layoutType: LayoutType }> = [
  { id: 'single', label: 'Un seul mur', layoutType: 'single-wall' },
  { id: 'L', label: 'Forme en L', layoutType: 'l-shape' },
  { id: 'U', label: 'Forme en U', layoutType: 'u-shape' },
  { id: 'full', label: 'Salon complet', layoutType: 'four-walls' },
];

const WALL_FIELDS: Record<DiagramLayout, Array<{ key: string; label: string }>> = {
  single: [{ key: 'single', label: 'Longueur du mur' }],
  L: [
    { key: 'wall1', label: 'Mur horizontal' },
    { key: 'wall2', label: 'Mur vertical' },
  ],
  U: [
    { key: 'wall1', label: 'Mur gauche' },
    { key: 'wall2', label: 'Mur central' },
    { key: 'wall3', label: 'Mur droit' },
  ],
  full: [
    { key: 'top', label: 'Mur du haut' },
    { key: 'left', label: 'Mur gauche' },
    { key: 'right', label: 'Mur droit' },
    { key: 'bottomLeftToDoor', label: 'De la gauche à la porte' },
    { key: 'doorToBottomRight', label: 'De la porte à la droite' },
  ],
};

const EMPTY_MEASUREMENTS: Record<string, string> = {
  single: '', wall1: '', wall2: '', wall3: '',
  top: '', left: '', right: '', bottomLeftToDoor: '', doorToBottomRight: '',
};

interface ProductLine {
  productId: Id<'products'>;
  name: string;
  image?: string;
  slug?: string;
  unitPrice: number;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('salon');
  const [submitting, setSubmitting] = useState(false);

  // --- customer -------------------------------------------------------------
  const customers = useQuery(api.customers.getCustomers);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [linkedCustomer, setLinkedCustomer] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const customerMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q || !customers) return [];
    return customers
      .filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [customerSearch, customers]);

  const applyCustomer = (c: NonNullable<typeof customers>[number]) => {
    setName(c.name ?? '');
    setPhone(c.phone ?? '');
    setEmail(c.email ?? '');
    const addr = c.addresses?.find((a) => a.isDefault) ?? c.addresses?.[0];
    setCity(addr?.city ?? '');
    setAddress(addr?.street ?? '');
    setLinkedCustomer(c.name ?? c.phone ?? '');
    setCustomerSearch('');
    setSearchOpen(false);
  };

  const clearCustomer = () => {
    setName(''); setPhone(''); setEmail(''); setCity(''); setAddress('');
    setLinkedCustomer(null);
  };

  // --- salon ----------------------------------------------------------------
  const majalisProducts = useQuery(api.products.getProducts, { productType: 'majalis_set' });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showAllMajlis, setShowAllMajlis] = useState(false);
  const selectedProduct = majalisProducts?.find((p) => p._id === selectedProductId);
  const fabricVariant = useQuery(
    api.fabricVariants.getById,
    selectedProduct?.fabricVariantId ? { id: selectedProduct.fabricVariantId } : 'skip',
  );

  const [shape, setShape] = useState<DiagramLayout>('L');
  const [measurements, setMeasurements] = useState<Record<string, string>>(EMPTY_MEASUREMENTS);
  const [activeWall, setActiveWall] = useState<string | null>(null);

  const [includeCarpet, setIncludeCarpet] = useState(false);
  const [comboIndex, setComboIndex] = useState(0);
  const [includePoufs, setIncludePoufs] = useState(false);
  const [poufsCount, setPoufsCount] = useState(1);

  // --- simple product order -------------------------------------------------
  const allProducts = useQuery(api.products.getProducts, { status: 'active' });
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const productMatches = useMemo(() => {
    if (!allProducts) return [];
    const q = productSearch.trim().toLowerCase();
    return allProducts
      // Same rule the storefront cart uses for individually sellable items:
      // majalis sets are priced from room measurements, and mandatory
      // component products (glassat, wsada…) carry no basePrice of their own.
      .filter((p) => p.productType !== 'majalis_set' && (p.pricing?.basePrice ?? 0) > 0 && !p.isMandatory)
      .filter((p) => !q || getLocalizedField(p.title, 'fr').toLowerCase().includes(q));
  }, [productSearch, allProducts]);

  /** Clicking a card adds the product, clicking it again removes it.
   *  Quantities are adjusted with the +/- controls in the list below. */
  const toggleLine = (p: NonNullable<typeof allProducts>[number]) => {
    setLines((cur) => {
      if (cur.some((l) => l.productId === p._id)) {
        return cur.filter((l) => l.productId !== p._id);
      }
      return [...cur, {
        productId: p._id,
        name: getLocalizedField(p.title, 'fr'),
        image: p.image,
        slug: p.slug,
        unitPrice: p.pricing?.basePrice ?? 0,
        quantity: 1,
      }];
    });
  };

  // --- shared ---------------------------------------------------------------
  const [priceOverride, setPriceOverride] = useState('');
  const [notes, setNotes] = useState('');

  const createRoomOrder = useMutation(api.orders.createRoomMeasurementOrder);
  const createDirectOrder = useMutation(api.orders.createDirectPurchaseOrder);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);

  const layoutType = SHAPES.find((s) => s.id === shape)!.layoutType;
  const wallFields = WALL_FIELDS[shape];

  const dimensions = useMemo((): Record<string, number> => {
    switch (shape) {
      case 'single': return { length: toCm(measurements.single) };
      case 'L': return { h: toCm(measurements.wall1), v: toCm(measurements.wall2) };
      case 'U': return { l: toCm(measurements.wall1), c: toCm(measurements.wall2), r: toCm(measurements.wall3) };
      case 'full': return {
        top: toCm(measurements.top),
        left: toCm(measurements.left),
        right: toCm(measurements.right),
        bottomLeft: toCm(measurements.bottomLeftToDoor),
        bottomRight: toCm(measurements.doorToBottomRight),
      };
    }
  }, [shape, measurements]);

  // Every wall that must be filled before the optimizer can run. The two
  // bottom segments of a full room may legitimately be 0 (door spans the wall).
  const requiredWalls = shape === 'full'
    ? ['top', 'left', 'right']
    : wallFields.map((f) => f.key);
  const measurementsComplete = requiredWalls.every((k) => isMeasurementInRange(measurements[k]) === true);

  // Live optimizer run — recomputes on every keystroke once the walls are valid.
  const calc = useMemo(() => {
    if (!measurementsComplete) return null;
    try {
      const geometry = calculateGeometry(layoutType, dimensions);
      const { scenario, distribution } = findOptimalDistribution(geometry);

      const carpetDims: Record<string, number> = {};
      if (layoutType === 'l-shape') {
        carpetDims.hLength = dimensions.h ?? 0;
        carpetDims.vLength = dimensions.v ?? 0;
      } else if (layoutType === 'u-shape') {
        carpetDims.centerLength = dimensions.c ?? 0;
        carpetDims.leftLength = dimensions.l ?? 0;
        carpetDims.rightLength = dimensions.r ?? 0;
      } else if (layoutType === 'four-walls') {
        carpetDims.topLength = dimensions.top ?? 0;
        carpetDims.leftLength = dimensions.left ?? 0;
        carpetDims.rightLength = dimensions.right ?? 0;
      }
      const floorRect = calculateFloorRect(layoutType, carpetDims);

      let combos: MultiCarpetResult[] = [];
      if (floorRect && fabricVariant) {
        const inv: CarpetInventory = {
          1: fabricVariant.stock.zerbiyaType1 ?? 0,
          2: fabricVariant.stock.zerbiyaType2 ?? 0,
          3: fabricVariant.stock.zerbiyaType3 ?? 0,
          4: fabricVariant.stock.zerbiyaType4 ?? 0,
        };
        combos = selectBestCarpetCombo(floorRect, inv);
      }

      const sets = distribution.totalGlssaPieces;
      const extraWssada = Math.max(0, distribution.totalWssadaPieces - sets * 2);
      const majlisPrice = sets * PRICE_PER_SET + extraWssada * PRICE_PER_EXTRA_WSSADA;

      return { scenario, distribution, floorRect, combos, sets, extraWssada, majlisPrice };
    } catch {
      return null;
    }
  }, [measurementsComplete, layoutType, dimensions, fabricVariant]);

  // Reset the carpet choice whenever a new set of combos is computed.
  useEffect(() => { setComboIndex(0); }, [calc?.combos?.length, layoutType]);

  const carpetCombo = includeCarpet ? calc?.combos?.[comboIndex] ?? null : null;
  const poufsPrice = includePoufs ? poufsCount * PRICE_PER_POUF : 0;

  const svgDataUrl = useMemo(() => {
    if (!calc) return null;
    try {
      const carpets = carpetCombo && calc.floorRect
        ? {
            carpets: carpetCombo.placements.map((p) => ({
              widthCm: p.fitWidth, heightCm: p.fitHeight,
              posX: p.posX, posY: p.posY,
              label: getCarpetDisplayLabel(p.carpetType, p.rotated),
              floorRect: calc.floorRect!,
            })),
          }
        : {};
      return generateFloorPlanDataUrl({
        layoutType: layoutType as LayoutType,
        geometry: calc.scenario,
        distribution: calc.distribution,
        ...carpets,
        poufsCount: includePoufs ? poufsCount : 0,
      });
    } catch {
      return null;
    }
  }, [calc, carpetCombo, layoutType, includePoufs, poufsCount]);

  const linesTotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const calculatedTotal = mode === 'products'
    ? linesTotal
    : (calc?.majlisPrice ?? 0) + (carpetCombo?.totalPrice ?? 0) + poufsPrice;

  const overrideValue = priceOverride.trim() === '' ? null : Number(priceOverride.replace(',', '.'));
  const finalTotal = overrideValue !== null && isFinite(overrideValue) && overrideValue >= 0
    ? overrideValue
    : calculatedTotal;

  // --- validity -------------------------------------------------------------
  const customerValid = name.trim().length >= 3 && phone.trim().length >= 6 && city.trim() !== '' && address.trim() !== '';
  const canSubmit = !submitting && customerValid && (
    mode === 'products'
      ? lines.length > 0
      : Boolean(selectedProductId && calc)
  );

  // --- submit ---------------------------------------------------------------
  /** Renders the floor plan to a JPEG and stores it, so the order detail page has a diagram. */
  const uploadDiagram = async (): Promise<string | undefined> => {
    if (!svgDataUrl) return undefined;
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        // document.createElement, not `new Image()` — the next/image import
        // shadows the DOM Image constructor in this module.
        const img = document.createElement('img');
        img.onload = () => {
          const scale = 3;
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth * scale;
          canvas.height = img.naturalHeight * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.scale(scale, scale);
          ctx.fillStyle = '#FDFBF7';
          ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
        };
        img.onerror = () => resolve(null);
        img.src = svgDataUrl;
      });
      if (!blob) return undefined;
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await res.json();
      return storageId;
    } catch (e) {
      console.error('Diagram upload failed:', e);
      return undefined;
    }
  };

  const customerInfo = () => ({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: {
      street: address.trim(),
      city: city.trim(),
      country: 'Maroc',
    },
    language: 'fr' as const,
  });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'products') {
        const result = await createDirectOrder({
          customerInfo: customerInfo(),
          products: lines.map((l) => ({
            productId: l.productId,
            productSlug: l.slug,
            name: l.name,
            image: l.image,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.unitPrice * l.quantity,
          })),
          pricing: { subtotal: linesTotal, total: finalTotal, currency: 'MAD' },
          notes: notes.trim() || undefined,
        });
        toast.success(`Commande ${result.reference} créée`);
        router.push('/dashboard/orders');
        return;
      }

      if (!calc || !selectedProduct) return;

      const storageId = await uploadDiagram();

      const products: Array<{
        name: string;
        productType: 'glassat' | 'wsayd' | 'coudoir' | 'zerbiya' | 'poufs';
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [
        {
          name: 'مجلس (ڭلسة + كودوار + 2 وسادة)',
          productType: 'glassat',
          quantity: calc.sets,
          unitPrice: PRICE_PER_SET,
          totalPrice: calc.majlisPrice,
        },
      ];

      if (carpetCombo) {
        products.push({
          name: `Zerbiya (${carpetCombo.placements.length} pièce${carpetCombo.placements.length > 1 ? 's' : ''})`,
          productType: 'zerbiya',
          quantity: carpetCombo.placements.reduce((s, p) => s + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0),
          unitPrice: carpetCombo.totalPrice / carpetCombo.placements.length,
          totalPrice: carpetCombo.totalPrice,
        });
      }

      if (includePoufs && poufsCount > 0) {
        products.push({
          name: 'بوف (Poufs)',
          productType: 'poufs',
          quantity: poufsCount,
          unitPrice: PRICE_PER_POUF,
          totalPrice: poufsPrice,
        });
      }

      const result = await createRoomOrder({
        customerInfo: customerInfo(),
        roomMeasurements: {
          width: dimensions.h || dimensions.length || dimensions.top || 0,
          height: dimensions.v || dimensions.l || dimensions.left || 0,
          layoutType,
          dimensions: {
            singleWall: layoutType === 'single-wall' ? dimensions.length : undefined,
            lShapeH: layoutType === 'l-shape' ? dimensions.h : undefined,
            lShapeV: layoutType === 'l-shape' ? dimensions.v : undefined,
            uShapeH: layoutType === 'u-shape' ? dimensions.c : undefined,
            uShapeL: layoutType === 'u-shape' ? dimensions.l : undefined,
            uShapeR: layoutType === 'u-shape' ? dimensions.r : undefined,
            fourWallsTop: layoutType === 'four-walls' ? dimensions.top : undefined,
            fourWallsLeft: layoutType === 'four-walls' ? dimensions.left : undefined,
            fourWallsRight: layoutType === 'four-walls' ? dimensions.right : undefined,
            fourWallsBottomLeft: layoutType === 'four-walls' ? dimensions.bottomLeft : undefined,
            fourWallsBottomRight: layoutType === 'four-walls' ? dimensions.bottomRight : undefined,
          },
        },
        products,
        calculations: {
          totalGlassat: calc.distribution.totalGlssaPieces,
          totalWsayd: calc.distribution.totalWssadaPieces,
          totalCoudoir: calc.distribution.totalGlssaPieces,
          totalZerbiya: carpetCombo
            ? carpetCombo.placements.reduce((s, p) => s + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0)
            : 0,
          glssaPieces: calc.distribution.walls.flatMap((w) => w.glssaPieces.map((p) => p.size)),
          wssadaPieces: calc.distribution.walls.flatMap((w) => w.wssadaPieces.map((p) => p.size)),
          ...(carpetCombo ? {
            carpetSelections: carpetCombo.placements.map((p) => ({
              carpetTypeId: p.carpetType.id,
              label: getCarpetDisplayLabel(p.carpetType, p.rotated),
              widthCm: p.fitWidth,
              heightCm: p.fitHeight,
              rotated: p.rotated,
              price: p.carpetType.price,
              baseTypeConsumed: 'baseTypeId' in p.carpetType ? p.carpetType.baseTypeId : p.carpetType.id,
              baseTypeQuantity: 'baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1,
              posX: p.posX,
              posY: p.posY,
            })),
          } : {}),
          ...(includePoufs && poufsCount > 0 ? { poufsCount, poufsPrice } : {}),
        },
        layoutVisualization: storageId ? { diagramUrl: storageId } : undefined,
        optimizationData: {
          layoutType,
          dimensions,
          scenarioId: calc.scenario.scenarioId,
          scenario: calc.scenario,
          walls: calc.distribution.walls.map((w) => ({
            wallId: w.wallId,
            glssaPieces: w.glssaPieces.map((p) => p.size),
            wssadaPieces: w.wssadaPieces.map((p) => p.size),
            glssaTotal: w.glssaTotal,
            wssadaTotal: w.wssadaTotal,
            glssaVoid: w.glssaVoid,
            wssadaVoid: w.wssadaVoid,
            glssaEffective: w.glssaEffective,
            wssadaEffective: w.wssadaEffective,
          })),
          totalGlssa: calc.distribution.walls.reduce((s, w) => s + w.glssaTotal, 0),
          totalWssada: calc.distribution.walls.reduce((s, w) => s + w.wssadaTotal, 0),
        },
        selectedMajalisProduct: {
          productId: selectedProduct._id,
          name: getLocalizedField(selectedProduct.title, 'fr'),
          fabricVariantId: selectedProduct.fabricVariantId,
          fabricVariantName: fabricVariant?.name ? getLocalizedField(fabricVariant.name, 'fr') : undefined,
        },
        pricing: { subtotal: calculatedTotal, total: finalTotal, currency: 'MAD' },
        notes: [`Commande créée depuis le dashboard`, `Layout: ${layoutType}`, notes.trim()]
          .filter(Boolean).join(' — '),
      });

      toast.success(`Commande ${result.reference} créée`);
      router.push('/dashboard/orders');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  // --- diagram values -------------------------------------------------------
  const diagramValues: Partial<Record<string, DiagramWallValue>> = {};
  for (const { key, label } of wallFields) {
    diagramValues[key] = {
      cm: parseMeasurement(measurements[key]).cm,
      valid: measurements[key] ? isMeasurementInRange(measurements[key]) : null,
      label,
    };
  }

  // --- shared field styles --------------------------------------------------
  const field = 'w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#BD7C48]/30 focus:border-[#BD7C48]';
  const labelCls = 'block text-xs font-bold text-neutral-600 mb-1';
  const card = 'bg-white rounded-xl border border-neutral-200 p-4 sm:p-5';

  return (
    <div className="p-4 sm:p-6">
      {/* The dashboard layout has no global Toaster — each page mounts its own. */}
      <Toaster />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Commandes
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-1">Nouvelle commande</h1>
          <p className="text-sm text-neutral-600">
            Créée depuis le dashboard — aucun e-mail n&apos;est envoyé au client.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-1 inline-flex gap-1">
          {(['salon', 'products'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                mode === m ? 'bg-[#BD7C48] text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {m === 'salon' ? 'Salon sur mesure' : 'Produits simples'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ============ LEFT: form ============ */}
        <div className="flex flex-col gap-5">
          {/* Customer */}
          <section className={card}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-neutral-900">Client</h2>
              {linkedCustomer && (
                <button onClick={clearCustomer} className="text-xs font-bold text-neutral-500 hover:text-red-600">
                  Effacer
                </button>
              )}
            </div>

            <div ref={searchRef} className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Rechercher un client existant (nom, téléphone, e-mail)…"
                className={`${field} pl-9`}
              />
              {searchOpen && customerMatches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-neutral-200 shadow-lg overflow-hidden">
                  {customerMatches.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => applyCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                    >
                      <div className="text-sm font-bold text-neutral-900">{c.name}</div>
                      <div className="text-xs text-neutral-500">
                        {[c.phone, c.email].filter(Boolean).join(' · ')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && customerSearch.trim() && customerMatches.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-neutral-200 shadow-lg px-3 py-3 text-sm text-neutral-500 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Aucun client trouvé — remplissez les champs ci-dessous.
                </div>
              )}
            </div>

            {linkedCustomer && (
              <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                <Check className="w-3 h-3" /> Client existant : {linkedCustomer}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nom complet *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Mohamed Alaoui" />
              </div>
              <div>
                <label className={labelCls}>Téléphone *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="0612345678" />
              </div>
              <div>
                <label className={labelCls}>E-mail (optionnel)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="client@exemple.ma" />
              </div>
              <div>
                <label className={labelCls}>Ville *</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={field} placeholder="Dakhla" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Adresse *</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} placeholder="Quartier, rue, n°" />
              </div>
            </div>
          </section>

          {mode === 'salon' ? (
            <>
              {/* Majlis product */}
              <section className={card}>
                <h2 className="font-black text-neutral-900 mb-3">Type de majlis *</h2>
                {!majalisProducts ? (
                  <div className="text-sm text-neutral-500">Chargement…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {(showAllMajlis ? majalisProducts : majalisProducts.slice(0, CARDS_COLLAPSED)).map((p) => (
                        <PickerCard
                          key={p._id}
                          image={p.image}
                          title={getLocalizedField(p.title, 'fr')}
                          selected={selectedProductId === p._id}
                          onClick={() => setSelectedProductId(selectedProductId === p._id ? null : p._id)}
                        />
                      ))}
                    </div>
                    <ShowMore
                      total={majalisProducts.length}
                      expanded={showAllMajlis}
                      onToggle={() => setShowAllMajlis((v) => !v)}
                    />
                  </>
                )}
                {fabricVariant && (
                  /* Latin labels only — Arabic names here reorder the whole
                     line under bidi and made the stock figures unreadable. */
                  <p className="mt-2 text-xs text-neutral-500">
                    Tissu : <span className="font-bold text-neutral-700">{getLocalizedField(fabricVariant.name, 'fr')}</span>
                    {' · '}Stock glssa : {fabricVariant.stock.glssa ?? 0}
                    {' · '}coudoir : {fabricVariant.stock.coudoir ?? 0}
                  </p>
                )}
              </section>

              {/* Shape + measurements */}
              <section className={card}>
                <h2 className="font-black text-neutral-900 mb-3">Forme du salon &amp; mesures</h2>

                <div className="grid grid-cols-4 gap-2 mb-5">
                  {SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setShape(s.id)}
                      className={`rounded-lg border-2 p-2 flex flex-col items-center gap-1 transition-all ${
                        shape === s.id ? 'border-[#BD7C48] bg-[#BD7C48]/5' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <RoomShapeDiagram layout={s.id} compact accent={shape === s.id} muted={shape !== s.id} size={90} />
                      <span className="text-[11px] font-bold text-neutral-700">{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  <div className="rounded-lg border border-neutral-200 p-3 flex flex-col items-center gap-2">
                    <RoomShapeDiagram
                      layout={shape}
                      values={diagramValues}
                      activeWall={activeWall}
                      onWallSelect={(k) => { setActiveWall(k); document.getElementById(`d-${k}`)?.focus(); }}
                      size={420}
                    />
                    <span className="text-[11px] text-neutral-500 text-center">
                      Cliquez un mur pour saisir sa mesure. Mètres (4,5) ou centimètres (450).
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {wallFields.map(({ key, label }) => {
                      const raw = measurements[key];
                      const valid = raw ? isMeasurementInRange(raw) : null;
                      const conv = describeMeasurement(raw);
                      const parsed = parseMeasurement(raw);
                      return (
                        <div key={key}>
                          <label className={labelCls} htmlFor={`d-${key}`}>{label}</label>
                          <div className="relative">
                            <input
                              id={`d-${key}`}
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={raw}
                              onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                              onFocus={() => setActiveWall(key)}
                              onBlur={() => setActiveWall(null)}
                              placeholder="450 ou 4,5 m"
                              className={`${field} pr-10 ${
                                valid === true ? 'border-green-500' : valid === false ? 'border-red-500' : ''
                              }`}
                            />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                              parsed.unit === 'm' ? 'font-bold text-[#BD7C48]' : 'text-neutral-400'
                            }`}>
                              {parsed.unit === 'm' ? 'm' : 'cm'}
                            </span>
                          </div>
                          {conv && valid !== false && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              {conv.from} → <span className="font-bold text-green-700">{conv.cm} cm</span>
                            </p>
                          )}
                          {valid === false && (
                            <p className="mt-1 text-[11px] text-red-600">
                              Entre {MIN_WALL_CM} et {MAX_WALL_CM} cm
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Options */}
              <section className={card}>
                <h2 className="font-black text-neutral-900 mb-3">Options</h2>

                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCarpet}
                    onChange={(e) => setIncludeCarpet(e.target.checked)}
                    disabled={!calc?.combos?.length}
                    className="w-4 h-4 accent-[#BD7C48]"
                  />
                  <span className="text-sm font-bold text-neutral-800">Ajouter une zerbiya</span>
                  {!calc?.combos?.length && (
                    <span className="text-xs text-neutral-400">(aucune combinaison disponible)</span>
                  )}
                </label>

                {includeCarpet && calc?.combos && calc.combos.length > 0 && (
                  <select
                    value={comboIndex}
                    onChange={(e) => setComboIndex(Number(e.target.value))}
                    className={`${field} mb-4`}
                  >
                    {calc.combos.map((c, i) => (
                      <option key={i} value={i}>
                        {c.placements.map((p) => getCarpetDisplayLabel(p.carpetType, p.rotated)).join(' + ')}
                        {' — '}{c.totalPrice.toLocaleString('fr-FR')} MAD
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePoufs}
                    onChange={(e) => setIncludePoufs(e.target.checked)}
                    className="w-4 h-4 accent-[#BD7C48]"
                  />
                  <span className="text-sm font-bold text-neutral-800">Ajouter des poufs</span>
                </label>

                {includePoufs && (
                  <div className="mt-2 inline-flex items-center gap-2">
                    <button
                      onClick={() => setPoufsCount((n) => Math.max(1, n - 1))}
                      className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold">{poufsCount}</span>
                    <button
                      onClick={() => setPoufsCount((n) => n + 1)}
                      className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-neutral-500">
                      × {PRICE_PER_POUF} MAD = {poufsPrice.toLocaleString('fr-FR')} MAD
                    </span>
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Simple product order */
            <section className={card}>
              <h2 className="font-black text-neutral-900 mb-3">Produits</h2>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filtrer les produits…"
                  className={`${field} pl-9`}
                />
              </div>

              {/* The full catalogue is listed up front — an admin taking an
                  order rarely knows the exact product name to search for. */}
              {!allProducts ? (
                <p className="text-sm text-neutral-500 mb-4">Chargement…</p>
              ) : productMatches.length === 0 ? (
                <p className="text-sm text-neutral-500 mb-4">Aucun produit ne correspond.</p>
              ) : (
                <div className="mb-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(showAllProducts ? productMatches : productMatches.slice(0, CARDS_COLLAPSED)).map((p) => (
                      <PickerCard
                        key={p._id}
                        image={p.image}
                        title={getLocalizedField(p.title, 'fr')}
                        subtitle={`${(p.pricing?.basePrice ?? 0).toLocaleString('fr-FR')} MAD`}
                        selected={lines.some((l) => l.productId === p._id)}
                        onClick={() => toggleLine(p)}
                      />
                    ))}
                  </div>
                  <ShowMore
                    total={productMatches.length}
                    expanded={showAllProducts}
                    onToggle={() => setShowAllProducts((v) => !v)}
                  />
                </div>
              )}

              {lines.length === 0 ? (
                <p className="text-sm text-neutral-500">Aucun produit ajouté.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {lines.map((l) => (
                    <div key={l.productId} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5">
                      <span className="flex-1 text-sm font-bold text-neutral-900">{l.name}</span>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setLines((cur) => cur.map((x) => x.productId === l.productId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}
                          className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center hover:bg-neutral-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{l.quantity}</span>
                        <button
                          onClick={() => setLines((cur) => cur.map((x) => x.productId === l.productId ? { ...x, quantity: x.quantity + 1 } : x))}
                          className="w-7 h-7 rounded border border-neutral-200 flex items-center justify-center hover:bg-neutral-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) => setLines((cur) => cur.map((x) => x.productId === l.productId ? { ...x, unitPrice: Number(e.target.value) || 0 } : x))}
                        className="w-24 px-2 py-1 rounded border border-neutral-200 text-sm text-right"
                      />
                      <span className="w-24 text-right text-sm font-bold text-neutral-900">
                        {(l.unitPrice * l.quantity).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={() => setLines((cur) => cur.filter((x) => x.productId !== l.productId))}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Notes */}
          <section className={card}>
            <label className={labelCls}>Note interne (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={field}
              placeholder="Livraison prévue, acompte reçu, remarque du client…"
            />
          </section>
        </div>

        {/* ============ RIGHT: live summary ============ */}
        <aside className="lg:sticky lg:top-6">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="font-black text-neutral-900">Récapitulatif</h2>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {mode === 'salon' && (
                <>
                  {svgDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={svgDataUrl} alt="Plan du salon" className="w-full rounded-lg border border-neutral-100" />
                  ) : (
                    <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-400">
                      Entrez les mesures pour voir le plan
                    </div>
                  )}

                  {calc && (
                    <div className="flex flex-col gap-1.5 text-sm">
                      <Row label="ڭلسة (glssa)" value={String(calc.distribution.totalGlssaPieces)} />
                      <Row label="وسادة (wssada)" value={String(calc.distribution.totalWssadaPieces)} />
                      <Row label="كودوار (coudoir)" value={String(calc.distribution.totalGlssaPieces)} />
                      {calc.extraWssada > 0 && (
                        <Row label="Wssada supplémentaires" value={String(calc.extraWssada)} />
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-neutral-100 pt-4 flex flex-col gap-1.5 text-sm">
                {mode === 'salon' ? (
                  <>
                    <Row label="Majlis" value={`${(calc?.majlisPrice ?? 0).toLocaleString('fr-FR')} MAD`} />
                    {carpetCombo && <Row label="Zerbiya" value={`${carpetCombo.totalPrice.toLocaleString('fr-FR')} MAD`} />}
                    {poufsPrice > 0 && <Row label="Poufs" value={`${poufsPrice.toLocaleString('fr-FR')} MAD`} />}
                  </>
                ) : (
                  <Row label={`${lines.length} produit${lines.length > 1 ? 's' : ''}`} value={`${linesTotal.toLocaleString('fr-FR')} MAD`} />
                )}
                <Row label="Total calculé" value={`${calculatedTotal.toLocaleString('fr-FR')} MAD`} bold />
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <label className={labelCls}>Prix final (laisser vide = total calculé)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    placeholder={String(calculatedTotal)}
                    className={`${field} pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">MAD</span>
                </div>
                {overrideValue !== null && isFinite(overrideValue) && overrideValue !== calculatedTotal && (
                  <p className="mt-1 text-[11px] text-[#BD7C48] font-bold">
                    {overrideValue < calculatedTotal ? 'Remise' : 'Supplément'} de{' '}
                    {Math.abs(overrideValue - calculatedTotal).toLocaleString('fr-FR')} MAD
                  </p>
                )}
              </div>

              <div className="border-t border-neutral-100 pt-4 flex items-baseline justify-between">
                <span className="font-black text-neutral-900">Total</span>
                <span className="text-xl font-black text-[#BD7C48]">
                  {finalTotal.toLocaleString('fr-FR')} MAD
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-3 rounded-lg bg-[#BD7C48] text-white font-bold text-sm hover:bg-[#a86c3d] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? 'Création…' : 'Créer la commande'}
              </button>

              {!canSubmit && !submitting && (
                <p className="text-[11px] text-neutral-500 text-center">
                  {!customerValid
                    ? 'Renseignez nom, téléphone, ville et adresse.'
                    : mode === 'products'
                      ? 'Ajoutez au moins un produit.'
                      : !selectedProductId
                        ? 'Choisissez un type de majlis.'
                        : 'Complétez les mesures des murs.'}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Product/majlis picker card. Uses next/image so the browser downloads a
 * thumbnail-sized variant instead of the full-resolution original — the grids
 * are the only heavy thing on this page.
 */
function PickerCard({
  image, title, subtitle, selected, onClick,
}: {
  image?: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border-2 overflow-hidden transition-colors ${
        selected ? 'border-[#BD7C48] ring-2 ring-[#BD7C48]/20' : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="relative aspect-[4/3] bg-neutral-100">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
        {selected && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#BD7C48] flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
      <span className="block px-2 pt-2 text-xs font-bold text-neutral-800 leading-snug line-clamp-2">
        {title}
      </span>
      <span className="block px-2 pb-2 pt-1 text-xs text-neutral-500">
        {subtitle ?? (selected ? 'Cliquer pour retirer' : ' ')}
      </span>
    </button>
  );
}

/** "Voir plus / Voir moins" toggle under a collapsed card grid. */
function ShowMore({ total, expanded, onToggle }: { total: number; expanded: boolean; onToggle: () => void }) {
  if (total <= CARDS_COLLAPSED) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#BD7C48] hover:underline"
    >
      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      {expanded ? 'Voir moins' : `Voir plus (${total - CARDS_COLLAPSED})`}
    </button>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? 'font-bold text-neutral-900' : 'text-neutral-600'}>{label}</span>
      <span className={bold ? 'font-black text-neutral-900' : 'font-bold text-neutral-800'}>{value}</span>
    </div>
  );
}
