'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import {Link} from '@/i18n/navigation';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Info,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  MessageCircle,
  X,
  ChevronDown,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Link2,
} from 'lucide-react';
import {
  calculateGeometry,
  findOptimalDistribution,
  generateFloorPlanDataUrl,
  calculateFloorRect,
  selectBestCarpets,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
  LayoutType,
} from '@/lib/ai-room-visualizer';
import type { CarpetFitResult, CarpetInventory, MultiCarpetResult } from '@/lib/ai-room-visualizer';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import FormattedPiecesList, { formatPiecesLines } from '@/components/FormattedPiecesList';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField } from '@/lib/utils';
// useGetProducts removed - extras are now hardcoded

const theme = {
  colors: {
    cream: '#FDFBF7',
    white: '#FFFFFF',
    dark: '#1A1A1A',
    primary: '#B85C38',
    primaryLight: '#B85C3815',
    green: '#22C55E',
    greenLight: '#22C55E15',
    textDark: '#1A1A1A',
    textMedium: '#5A5A5A',
    textLight: '#8A8A8A',
    textMuted: '#A0A0A0',
    border: '#E8E0D5',
    lightFill: '#F5F0E8',
    cardDark: '#333333',
  },
  fonts: {
    arabic: "'Noto Naskh Arabic', serif",
    heading: "'Noto Kufi Arabic', sans-serif",
    english: "'DM Sans', sans-serif",
    decorative: "'Playfair Display', serif",
  },
};




interface AdditionalItem {
  id: string;       // product._id
  slug: string;     // product.slug
  name: string;
  nameAr: string;   // Arabic product title for invoices
  image: string;
  price: number;
  quantity: number;
}

interface OptimizationResult {
  totalGlssa: number;
  totalWssada: number;
  totalGlssaPieces: number;
  totalWssadaPieces: number;
  totalCornerPieces: number;
  extraWssada: number;
  estimatedPrice: number;
  svgDataUrl: string;
  scenarioId: string;
  scenario?: any;
  distribution?: any;
  layoutType?: string;
  walls: {
    wallId: string;
    glssaPieces: number[];
    wssadaPieces: number[];
    glssaTotal: number;
    wssadaTotal: number;
    glssaVoid: number;
    wssadaVoid: number;
    glssaEffective: number;
    wssadaEffective: number;
  }[];
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense>
      <Checkout2Page />
    </Suspense>
  );
}

const whatsappHelpMessages: Record<string, string> = {
  ar: 'مرحباً، أحتاج مساعدة',
  fr: "Bonjour, j'ai besoin d'aide",
  en: 'Hello, I need help',
};

const countryNames: Record<string, string> = {
  ar: 'المغرب',
  fr: 'Maroc',
  en: 'Morocco',
};

function Checkout2Page() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, label: t('steps.measurements'), arabicNum: '1' },
    { id: 2, label: t('steps.preview'), arabicNum: '2' },
    { id: 3, label: t('steps.deliveryPayment'), arabicNum: '3' },
  ];

  const roomConfigs = [
    { id: 'single', title: t('roomConfigs.singleWall.title'), desc: t('roomConfigs.singleWall.desc'), walls: 1, layoutType: 'single-wall' },
    { id: 'L', title: t('roomConfigs.lShape.title'), desc: t('roomConfigs.lShape.desc'), walls: 2, layoutType: 'l-shape' },
    { id: 'U', title: t('roomConfigs.uShape.title'), desc: t('roomConfigs.uShape.desc'), walls: 3, layoutType: 'u-shape' },
    { id: 'full', title: t('roomConfigs.fullRoom.title'), desc: t('roomConfigs.fullRoom.desc'), walls: 4, layoutType: 'four-walls' },
  ];

  // Map layout URL param to config id
  const layoutToConfigId: Record<string, string> = {
    'single-wall': 'single',
    'l-shape': 'L',
    'u-shape': 'U',
    'four-walls': 'full',
  };
  const layoutParam = searchParams?.get('layout') ?? null;
  const [selectedConfig, setSelectedConfig] = useState(() => {
    return (layoutParam && layoutToConfigId[layoutParam]) || 'L';
  });

  // Convex mutations for creating orders and uploading images
  const createOrder = useMutation(api.orders.createRoomMeasurementOrder);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch majalis products for product selection
  const majalisProducts = useQuery(api.products.getProducts, { productType: 'majalis_set' });
  const productParam = searchParams?.get('product') ?? null;
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productParam);

  // Resolve fabric variant name from the selected product's fabricVariantId
  const selectedProduct = majalisProducts?.find(p => p._id === selectedProductId);
  const selectedFabricVariantId = selectedProduct?.fabricVariantId ?? null;
  const fabricVariant = useQuery(
    api.fabricVariants.getById,
    selectedFabricVariantId ? { id: selectedFabricVariantId } : 'skip'
  );

  // Check if the selected fabric variant is sold out (all main majalis components are 0)
  const isFabricSoldOut = fabricVariant != null && (
    (fabricVariant.stock.glssa ?? 0) === 0 &&
    (fabricVariant.stock.wsaydRegular ?? 0) === 0 &&
    (fabricVariant.stock.wsaydReduced ?? 0) === 0 &&
    (fabricVariant.stock.coudoir ?? 0) === 0
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [infoProduct, setInfoProduct] = useState<any>(null);
  const [infoMainImage, setInfoMainImage] = useState<string>('');
  // Inline selected product gallery state
  const [selectedProductMainImage, setSelectedProductMainImage] = useState<string>('');

  // Measurements state - dynamic based on room type
  const [measurements, setMeasurements] = useState({
    single: '',
    wall1: '',
    wall2: '',
    wall3: '',
    top: '',
    left: '',
    right: '',
    bottomLeftToDoor: '',
    doorToBottomRight: '',
  });

  // AI optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Carpet state (multi-carpet combos)
  const [includeCarpet, setIncludeCarpet] = useState(false);
  const [carpetCombo, setCarpetCombo] = useState<MultiCarpetResult | null>(null);
  const [allCombos, setAllCombos] = useState<MultiCarpetResult[]>([]);

  // Poufs state
  const [includePoufs, setIncludePoufs] = useState(false);
  const [poufsCount, setPoufsCount] = useState(1);

  // Refs for scroll targets
  const svgPreviewRef = useRef<HTMLDivElement>(null);
  const roomConfigRef = useRef<HTMLDivElement>(null);
  const productDetailsRef = useRef<HTMLDivElement>(null);

  // SVG updating indicator state
  const [isSvgUpdating, setIsSvgUpdating] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 768);
      setIsTablet(w > 768 && w <= 1024);
    };
    checkBreakpoints();
    setIsReady(true);
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // Track visual viewport offset for iOS keyboard handling
  const [mobileBottomOffset, setMobileBottomOffset] = useState(0);
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // When iOS keyboard opens, visualViewport.height shrinks and offsetTop increases
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setMobileBottomOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [isMobile]);

  // Body scroll lock & Escape key for info modal
  useEffect(() => {
    if (infoProduct) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setInfoProduct(null);
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [infoProduct]);

  // Zoom state for floor plan
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 25));
  const handleFitToView = () => setZoomLevel(100);

  const handleDownloadJPEG = () => {
    if (!optimizationResult?.svgDataUrl) return;

    const img = new window.Image();
    img.onload = () => {
      const allGlssa = optimizationResult.walls.flatMap(w => w.glssaPieces);
      const allWssada = optimizationResult.walls.flatMap(w => w.wssadaPieces);
      const dataLines = formatPiecesLines(allGlssa, allWssada, optimizationResult.totalGlssaPieces, includePoufs ? poufsCount : 0);

      const scale = 3;
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
      if (!ctx) return;
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
        dataLines.forEach((line, i) => {
          ctx.fillText(line, imgWidth - padding, dataStartY + i * lineHeight);
        });
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `majalis-floor-plan.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        'image/jpeg',
        0.95
      );
    };
    img.src = optimizationResult.svgDataUrl;
  };

  // Additional individual items (attached to the salon order)
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  // Hardcoded extras definitions (carpet & poufs handled in Step 2)
  const EXTRAS_LIST = [
    ...((fabricVariant?.stock?.sacDecoration ?? 0) > 0 ? [{
      id: 'extra-sac-decoration',
      slug: 'sac-decoration',
      nameAr: 'كيس ديكور',
      nameFr: 'Sac de décoration',
      price: 300,
      icon: null,
    }] : []),
    ...((fabricVariant?.stock?.petitCoussin ?? 0) > 0 ? [{
      id: 'extra-petit-coussins',
      slug: 'petit-coussins',
      nameAr: 'وسائد صغيرة 40×40',
      nameFr: 'Petits coussins 40×40cm',
      price: 200,
      icon: null,
    }] : []),
  ];

  const addExtra = (extra: typeof EXTRAS_LIST[0]) => {
    setAdditionalItems(prev => {
      const existing = prev.find(i => i.id === extra.id);
      if (existing) {
        return prev.map(i => i.id === extra.id ? { ...i, quantity: i.quantity + 1, price: extra.price } : i);
      }
      const displayName = locale === 'ar' ? extra.nameAr : extra.nameFr;
      return [...prev, {
        id: extra.id,
        slug: extra.slug,
        name: displayName,
        nameAr: extra.nameAr,
        image: '',
        price: extra.price,
        quantity: 1,
      }];
    });
  };

  const updateAdditionalItemQty = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setAdditionalItems(prev => prev.filter(i => i.id !== id));
    } else {
      setAdditionalItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  const removeAdditionalItem = (id: string) => {
    setAdditionalItems(prev => prev.filter(i => i.id !== id));
  };

  const additionalItemsTotal = additionalItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Contact & Payment state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track which measurement fields have been touched/blurred
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Check if a measurement value is valid
  const isMeasurementValid = (value: string): boolean | null => {
    if (!value) return null; // not yet entered
    const val = parseInt(value);
    if (isNaN(val)) return false;
    return val >= 110 && val <= 2000;
  };

  // Max wall length
  const MAX_WALL_LENGTH = 2000;

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // No auto-scroll on page load — user scrolls manually via the "Continue" button

  // Re-render SVG when carpet selection changes
  useEffect(() => {
    if (!optimizationResult?.scenario || !optimizationResult?.distribution) return;

    const layoutType = optimizationResult.layoutType;
    if (!layoutType) return;

    // Show loading indicator
    setIsSvgUpdating(true);

    // Build carpet dims for floor rect
    const dimensions = getDimensions();
    const carpetDimsForSvg: Record<string, number> = {};
    if (layoutType === 'l-shape') {
      carpetDimsForSvg.hLength = dimensions.h || 0;
      carpetDimsForSvg.vLength = dimensions.v || 0;
    } else if (layoutType === 'u-shape') {
      carpetDimsForSvg.centerLength = dimensions.c || 0;
      carpetDimsForSvg.leftLength = dimensions.l || 0;
      carpetDimsForSvg.rightLength = dimensions.r || 0;
    } else if (layoutType === 'four-walls') {
      carpetDimsForSvg.topLength = dimensions.top || 0;
      carpetDimsForSvg.leftLength = dimensions.left || 0;
      carpetDimsForSvg.rightLength = dimensions.right || 0;
    }
    const floorRect = calculateFloorRect(layoutType, carpetDimsForSvg);

    const carpetsInput = includeCarpet && carpetCombo && floorRect ? {
      carpets: carpetCombo.placements.map(p => ({
        widthCm: p.fitWidth, heightCm: p.fitHeight,
        posX: p.posX, posY: p.posY,
        label: getCarpetDisplayLabel(p.carpetType, p.rotated),
        floorRect,
      }))
    } : {};

    try {
      const newDataUrl = generateFloorPlanDataUrl({
        layoutType: layoutType as any,
        geometry: optimizationResult.scenario,
        distribution: optimizationResult.distribution,
        ...carpetsInput,
        poufsCount: includePoufs ? poufsCount : 0,
      });

      setOptimizationResult(prev => prev ? { ...prev, svgDataUrl: newDataUrl } : prev);
    } catch (e) {
      console.error('SVG re-render failed:', e);
    }

    // Scroll to SVG preview after a brief delay and hide loading
    const timer = setTimeout(() => {
      setIsSvgUpdating(false);
      svgPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCarpet, carpetCombo, includePoufs, poufsCount]);

  // Loading state - wait for breakpoints
  if (!isReady) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          backgroundColor: theme.colors.cream,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={48} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
        <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Accept any string of digits (at least 6), allowing spaces/dashes
    const digits = phone.replace(/[\s\-\+\(\)]/g, '');
    return /^\d{6,}$/.test(digits);
  };

  const validateMeasurementField = (value: string, fieldName: string, errors: Record<string, string>) => {
    const minLength = 110;
    const val = parseInt(value);
    if (!value || isNaN(val) || val < minLength) {
      errors[fieldName] = t('validation.invalidMeasurementsMin', { min: minLength });
    } else if (val > MAX_WALL_LENGTH) {
      errors[fieldName] = t('validation.invalidMeasurementsMax', { max: MAX_WALL_LENGTH });
    }
  };

  const validateMeasurements = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (selectedConfig) {
      case 'single':
        validateMeasurementField(measurements.single, 'single', newErrors);
        break;
      case 'L':
        validateMeasurementField(measurements.wall1, 'wall1', newErrors);
        validateMeasurementField(measurements.wall2, 'wall2', newErrors);
        break;
      case 'U':
        validateMeasurementField(measurements.wall1, 'wall1', newErrors);
        validateMeasurementField(measurements.wall2, 'wall2', newErrors);
        validateMeasurementField(measurements.wall3, 'wall3', newErrors);
        break;
      case 'full':
        validateMeasurementField(measurements.top, 'top', newErrors);
        validateMeasurementField(measurements.left, 'left', newErrors);
        validateMeasurementField(measurements.right, 'right', newErrors);
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateContactInfo = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = t('validation.nameMinLength');
    }

    if (email.trim() && !validateEmail(email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    if (!phoneNumber.trim() || !validatePhone(phoneNumber)) {
      newErrors.phoneNumber = t('validation.invalidPhone');
    }

    if (!city.trim()) {
      newErrors.city = t('validation.cityRequired');
    }

    if (!address.trim()) {
      newErrors.address = t('validation.addressRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getLayoutType = () => {
    const config = roomConfigs.find(c => c.id === selectedConfig);
    return config?.layoutType || 'l-shape';
  };

  const getDimensions = (): Record<string, number> => {
    switch (selectedConfig) {
      case 'single':
        return { length: parseInt(measurements.single) || 0 };
      case 'L':
        return { h: parseInt(measurements.wall1) || 0, v: parseInt(measurements.wall2) || 0 };
      case 'U':
        return {
          l: parseInt(measurements.wall1) || 0,
          c: parseInt(measurements.wall2) || 0, // center wall
          r: parseInt(measurements.wall3) || 0,
        };
      case 'full':
        return {
          top: parseInt(measurements.top) || 0,
          left: parseInt(measurements.left) || 0,
          right: parseInt(measurements.right) || 0,
          bottomLeft: parseInt(measurements.bottomLeftToDoor) || 0,
          bottomRight: parseInt(measurements.doorToBottomRight) || 0,
        };
      default:
        return {};
    }
  };

  const runOptimization = () => {
    setIsOptimizing(true);
    setOptimizationError(null);

    // Use setTimeout to allow UI to update before calculation
    setTimeout(() => {
      try {
        const layoutType = getLayoutType() as LayoutType;
        const dimensions = getDimensions();

        // Step 1: Calculate geometry (deterministic)
        const geometry = calculateGeometry(layoutType, dimensions);

        // Step 2: Find optimal distribution across ALL corner ownership scenarios
        let scenario;
        let distribution;
        try {
          const optimal = findOptimalDistribution(geometry);
          scenario = optimal.scenario;
          distribution = optimal.distribution;
        } catch {
          setOptimizationError(t('validation.invalidMeasurements'));
          setIsOptimizing(false);
          return;
        }

        // Compute carpet options for SVG (before generating SVG)
        const carpetDimsForSvg: Record<string, number> = {};
        if (layoutType === 'l-shape') {
          carpetDimsForSvg.hLength = dimensions.h || 0;
          carpetDimsForSvg.vLength = dimensions.v || 0;
        } else if (layoutType === 'u-shape') {
          carpetDimsForSvg.centerLength = dimensions.c || 0;
          carpetDimsForSvg.leftLength = dimensions.l || 0;
          carpetDimsForSvg.rightLength = dimensions.r || 0;
        } else if (layoutType === 'four-walls') {
          carpetDimsForSvg.topLength = dimensions.top || 0;
          carpetDimsForSvg.leftLength = dimensions.left || 0;
          carpetDimsForSvg.rightLength = dimensions.right || 0;
        }
        const floorRectForSvg = calculateFloorRect(layoutType, carpetDimsForSvg);
        let carpetsForSvg: Array<{ widthCm: number; heightCm: number; posX: number; posY: number; floorRect: { x: number; y: number; width: number; height: number }; label: string }> | undefined;
        let bestCombo: MultiCarpetResult | null = null;
        let combosForState: MultiCarpetResult[] = [];
        if (floorRectForSvg && fabricVariant) {
          const inv: CarpetInventory = {
            1: fabricVariant.stock.zerbiyaType1 ?? 0,
            2: fabricVariant.stock.zerbiyaType2 ?? 0,
            3: fabricVariant.stock.zerbiyaType3 ?? 0,
            4: fabricVariant.stock.zerbiyaType4 ?? 0,
          };
          combosForState = selectBestCarpetCombo(floorRectForSvg, inv);
          if (combosForState.length > 0) {
            bestCombo = combosForState[0];
            carpetsForSvg = bestCombo.placements.map(p => ({
              widthCm: p.fitWidth, heightCm: p.fitHeight,
              posX: p.posX, posY: p.posY,
              label: getCarpetDisplayLabel(p.carpetType, p.rotated),
              floorRect: floorRectForSvg,
            }));
          }
        }

        // Step 4: Generate SVG
        const svgDataUrl = generateFloorPlanDataUrl({
          layoutType,
          geometry: scenario,
          distribution,
          ...(carpetsForSvg ? { carpets: carpetsForSvg } : {}),
        });

        // Calculate totals
        const totalGlssa = distribution.walls.reduce((sum, w) => sum + w.glssaTotal, 0);
        const totalWssada = distribution.walls.reduce((sum, w) => sum + w.wssadaTotal, 0);

        // Calculate price
        // 1 SET = 1 glssa + 1 coudoir + 2 wssada (regular or reduced) = 2050 MAD
        // Any ADDITIONAL wssada beyond 2-per-set = 300 MAD each
        const sets = distribution.totalGlssaPieces;
        const totalWssadaCount = distribution.totalWssadaPieces;
        const extraWssada = Math.max(0, totalWssadaCount - (sets * 2));
        const pricePerSet = 2050;
        const pricePerExtraWssada = 300;
        const estimatedPrice = sets * pricePerSet + extraWssada * pricePerExtraWssada;

        setOptimizationResult({
          totalGlssa,
          totalWssada,
          totalGlssaPieces: distribution.totalGlssaPieces,
          totalWssadaPieces: distribution.totalWssadaPieces,
          totalCornerPieces: distribution.totalCornerPieces,
          extraWssada,
          estimatedPrice,
          svgDataUrl,
          scenarioId: scenario.scenarioId,
          scenario,
          distribution,
          layoutType,
          walls: distribution.walls.map((w) => ({
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
        });

        // Set carpet combo options from SVG computation
        if (combosForState.length > 0) {
          setAllCombos(combosForState);
          setCarpetCombo(combosForState[0]);
        } else {
          setAllCombos([]);
          setCarpetCombo(null);
        }
      } catch (err) {
        console.error('Optimization error:', err);
        setOptimizationError(t('validation.calculationError'));
      } finally {
        setIsOptimizing(false);
      }
    }, 100); // Small delay for UI feedback
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Require product selection
      if (majalisProducts && majalisProducts.length > 0 && !selectedProductId) {
        setErrors({ product: t('validation.selectProduct') });
        // Scroll to product selection
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // Block if fabric variant is sold out
      if (isFabricSoldOut) {
        setErrors({ product: t('validation.productSoldOut') });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!validateMeasurements()) {
        return;
      }
      setCurrentStep(2);
      runOptimization();
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateContactInfo()) {
        return;
      }
      await submitOrder();
    }
  };

  const submitOrder = async () => {
    if (!optimizationResult) return;

    setIsSubmitting(true);
    try {
      const layoutType = getLayoutType();
      const dimensions = getDimensions();

      // Upload SVG as JPEG to Convex storage
      let storageId: string | null = null;
      let emailImageUrl: string | null = null;
      if (optimizationResult.svgDataUrl) {
        try {
          const jpegBlob = await new Promise<Blob | null>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              const allGlssa = optimizationResult.walls.flatMap(w => w.glssaPieces);
              const allWssada = optimizationResult.walls.flatMap(w => w.wssadaPieces);
              const dataLines = formatPiecesLines(allGlssa, allWssada, optimizationResult.totalGlssaPieces, includePoufs ? poufsCount : 0);

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
                dataLines.forEach((line, i) => {
                  ctx.fillText(line, imgWidth - padding, dataStartY + i * lineHeight);
                });
              }

              canvas.toBlob(
                (blob) => resolve(blob),
                'image/jpeg',
                0.98
              );
            };
            img.onerror = () => resolve(null);
            img.src = optimizationResult.svgDataUrl;
          });

          if (jpegBlob) {
            const uploadUrl = await generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: jpegBlob,
            });
            const uploadResult = await uploadResponse.json();
            storageId = uploadResult.storageId;

            // Upload to ImageKit for email (ImageKit returns a proper HTTPS URL)
            try {
              const formData = new FormData();
              formData.append('file', new File([jpegBlob], `design-${Date.now()}.jpg`, { type: 'image/jpeg' }));
              const ikResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              const ikResult = await ikResponse.json();
              if (ikResult.url) {
                emailImageUrl = ikResult.url;
              }
            } catch (ikErr) {
              console.error('ImageKit upload error:', ikErr);
            }
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
        }
      }

      // Build products array
      // 1 SET = 1 glssa + 1 coudoir + 2 wssada = 2050 MAD
      // Extra wssada beyond 2-per-set = 300 MAD each
      const sets = optimizationResult.totalGlssaPieces;
      const setsPrice = sets * 2050;
      // Extra wssada cost is folded into the majlis line total (internal info, not shown separately)
      const extraWssadaPrice = optimizationResult.extraWssada * 300;
      const products: Array<{
        name: string;
        productType: 'glassat' | 'wsayd' | 'coudoir' | 'zerbiya' | 'poufs';
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [
        {
          name: 'مجلس (ڭلسة + كودوار + 2 وسادة)',
          productType: 'glassat' as const,
          quantity: sets,
          unitPrice: 2050,
          totalPrice: setsPrice + extraWssadaPrice,
        },
      ];

      if (selectedCarpet) {
        products.push({
          name: `Zerbiya (${selectedCarpet.placements.length} pièce${selectedCarpet.placements.length > 1 ? 's' : ''})`,
          productType: 'zerbiya' as const,
          quantity: selectedCarpet.placements.reduce((sum, p) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0),
          unitPrice: selectedCarpet.totalPrice / selectedCarpet.placements.length,
          totalPrice: selectedCarpet.totalPrice,
        });
      }

      if (includePoufs && poufsCount > 0) {
        products.push({
          name: `بوف (Poufs)`,
          productType: 'poufs' as const,
          quantity: poufsCount,
          unitPrice: 800,
          totalPrice: poufsCount * 800,
        });
      }

      const result = await createOrder({
        customerInfo: {
          name: fullName,
          email: email,
          phone: phoneNumber,
          address: {
            street: address,
            city: city,
            country: countryNames[locale] || countryNames.ar,
          },
          language: locale as 'ar' | 'fr' | 'en',
        },
        roomMeasurements: {
          width: dimensions.h || dimensions.length || dimensions.top || 0,
          height: dimensions.v || dimensions.l || dimensions.left || 0,
          layoutType: layoutType,
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
          totalGlassat: optimizationResult.totalGlssaPieces,
          totalWsayd: optimizationResult.totalWssadaPieces,
          totalCoudoir: optimizationResult.totalGlssaPieces,
          totalZerbiya: selectedCarpet ? selectedCarpet.placements.reduce((sum, p) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0) : 0,
          glssaPieces: optimizationResult.walls.flatMap(w => w.glssaPieces),
          wssadaPieces: optimizationResult.walls.flatMap(w => w.wssadaPieces),
          ...(selectedCarpet ? {
            carpetSelections: selectedCarpet.placements.map(p => ({
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
          ...(includePoufs && poufsCount > 0 ? {
            poufsCount,
            poufsPrice: poufsCount * 800,
          } : {}),
        },
        layoutVisualization: storageId ? {
          diagramUrl: storageId,
        } : undefined,
        optimizationData: {
          layoutType,
          dimensions,
          scenarioId: optimizationResult.scenarioId,
          scenario: optimizationResult.scenario,
          walls: optimizationResult.walls,
          totalGlssa: optimizationResult.totalGlssa,
          totalWssada: optimizationResult.totalWssada,
        },
        selectedMajalisProduct: (() => {
          const found = majalisProducts?.find(p => p._id === selectedProductId);
          if (!found) throw new Error(t('validation.selectProduct'));
          return {
            productId: found._id as Id<"products">,
            name: getLocalizedField(found.title, locale),
            fabricVariantId: found.fabricVariantId,
            fabricVariantName: fabricVariant?.name ? getLocalizedField(fabricVariant.name, locale) : undefined,
          };
        })(),
        pricing: {
          subtotal: optimizationResult.estimatedPrice + (selectedCarpet?.totalPrice ?? 0) + poufsPrice + additionalItemsTotal,
          total: optimizationResult.estimatedPrice + (selectedCarpet?.totalPrice ?? 0) + poufsPrice + additionalItemsTotal,
          currency: 'MAD',
        },
        notes: `Layout: ${layoutType}`,
        // Pass additional individual items
        ...(additionalItems.length > 0 ? {
          additionalItems: additionalItems.map(item => ({
            productSlug: item.slug,
            name: item.name,
            nameAr: item.nameAr,
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
          })),
        } : {}),
      });

      // Send order confirmation email (fire and forget)
      try {
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: result.reference,
            customerInfo: {
              name: fullName,
              email: email,
              phone: phoneNumber,
              address: {
                street: address,
                city: city,
                country: countryNames[locale] || countryNames.ar,
              },
            },
            products,
            pricing: {
              subtotal: optimizationResult.estimatedPrice + (selectedCarpet?.totalPrice ?? 0) + poufsPrice + additionalItemsTotal,
              total: optimizationResult.estimatedPrice + (selectedCarpet?.totalPrice ?? 0) + poufsPrice + additionalItemsTotal,
              currency: 'MAD',
            },
            language: locale,
            orderType: 'room_measurement',
            roomMeasurements: {
              width: dimensions.h || dimensions.length || dimensions.top || 0,
              height: dimensions.v || dimensions.l || dimensions.left || 0,
              layoutType: layoutType,
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
            calculations: {
              totalGlassat: optimizationResult.totalGlssaPieces,
              totalWsayd: optimizationResult.totalWssadaPieces,
              totalCoudoir: optimizationResult.totalGlssaPieces,
              totalZerbiya: selectedCarpet ? selectedCarpet.placements.reduce((sum, p) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0) : 0,
              glssaPieces: optimizationResult.walls.flatMap(w => w.glssaPieces),
              wssadaPieces: optimizationResult.walls.flatMap(w => w.wssadaPieces),
              ...(selectedCarpet ? {
                carpetSelections: selectedCarpet.placements.map(p => ({
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
              ...(includePoufs && poufsCount > 0 ? {
                poufsCount,
                poufsPrice: poufsCount * 800,
              } : {}),
            },
            ...(additionalItems.length > 0 ? {
              additionalItems: additionalItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
              })),
            } : {}),
            imageUrl: emailImageUrl || optimizationResult.svgDataUrl,
            notes: `Layout: ${layoutType}`,
          }),
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      // Redirect to thank-you page with order reference
      router.push(`/thank-you?ref=${result.reference}`);
    } catch (error: any) {
      console.error('Order submission error:', error);
      // Check for ConvexError with INSUFFICIENT_STOCK code
      if (error?.data?.code === "INSUFFICIENT_STOCK") {
        const details = error.data.details as Array<{ component: string; available: number; requested: number }>;
        const componentNames: Record<string, Record<string, string>> = {
          glssa: { ar: 'ڭلسة', fr: 'Glassat', en: 'Glassat' },
          wsaydRegular: { ar: 'وسادة كبيرة', fr: 'Wsada grande', en: 'Large cushion' },
          wsaydReduced: { ar: 'وسادة صغيرة', fr: 'Wsada petite', en: 'Small cushion' },
          coudoir: { ar: 'كودوار', fr: 'Coudoir', en: 'Armrest' },
          poufs: { ar: 'بوف', fr: 'Poufs', en: 'Poufs' },
        };
        const itemsList = details.map((d: any) => {
          const name = componentNames[d.component]?.[locale] || d.component;
          return `${name}: ${d.available} ${locale === 'ar' ? 'متوفر' : 'disponible'}`;
        }).join('\n');
        setErrors({ submit: `${locale === 'ar' ? 'المخزون غير كافي' : locale === 'en' ? 'Insufficient stock' : 'Stock insuffisant'}:\n${itemsList}` });
      } else {
        setErrors({ submit: t('validation.submitError') });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Derived carpet selection
  const selectedCarpet = includeCarpet && carpetCombo ? carpetCombo : null;
  const poufsPrice = includePoufs ? poufsCount * 800 : 0;

  // Poufs stock availability
  const poufsStock = fabricVariant?.stock?.poufs ?? 0;
  const maxPoufsCount = Math.max(1, poufsStock);

  const getEstimatedPrice = () => {
    const carpetPrice = selectedCarpet?.totalPrice ?? 0;
    if (optimizationResult) {
      return optimizationResult.estimatedPrice + carpetPrice + poufsPrice + additionalItemsTotal;
    }
    const config = roomConfigs.find(c => c.id === selectedConfig);
    const estimatedSets = config?.walls === 1 ? 3 : config?.walls === 2 ? 5 : config?.walls === 3 ? 8 : 12;
    return estimatedSets * 2050 + carpetPrice + poufsPrice + additionalItemsTotal;
  };

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', gap: isMobile ? 8 : 32, alignItems: 'center' }}>
      {steps.map((step, index) => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: index < steps.length - 1 ? (isMobile ? 8 : 32) : 0 }}>
          <div style={{ display: 'flex', gap: isMobile ? 4 : 10, alignItems: 'center' }}>
            <div
              style={{
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                borderRadius: 16,
                backgroundColor: step.id < currentStep ? theme.colors.green : step.id === currentStep ? theme.colors.primary : 'transparent',
                border: step.id > currentStep ? `2px solid ${theme.colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              {step.id < currentStep ? (
                <Check size={isMobile ? 14 : 16} color="#FFFFFF" />
              ) : (
                <span
                  style={{
                    color: step.id === currentStep ? '#FFFFFF' : theme.colors.textLight,
                    fontFamily: theme.fonts.arabic,
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 'bold',
                  }}
                >
                  {step.arabicNum}
                </span>
              )}
            </div>
            {!isMobile && (
              <span
                style={{
                  color: step.id < currentStep ? theme.colors.green : step.id === currentStep ? theme.colors.textDark : theme.colors.textLight,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isTablet ? 12 : 14,
                  fontWeight: step.id === currentStep ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              style={{
                width: isMobile ? 20 : 48,
                height: 2,
                backgroundColor: step.id < currentStep ? theme.colors.green : theme.colors.border,
                transition: 'background-color 0.3s ease',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderShapeIcon = (shape: string, isSelected: boolean) => {
    const seatColor = isSelected ? theme.colors.primary : '#C4B5A6';
    const cushionColor = isSelected ? '#C97A56' : '#B8A99A';
    const wallColor = isSelected ? '#D4C8BC' : '#E8E0D5';
    const floorColor = isSelected ? '#FAF6F1' : '#F5F0E8';
    const s = isMobile ? 64 : 80;

    const pad = s * 0.08;
    const rX = pad;
    const rY = pad;
    const rW = s - pad * 2;
    const rH = s * 0.7 - pad * 2;
    const sD = rW * 0.13;
    const cR = sD * 0.3;

    if (shape === 'single') {
      return (
        <svg width={s} height={s * 0.7} viewBox={`0 0 ${s} ${s * 0.7}`} fill="none">
          <rect x={rX} y={rY} width={rW} height={rH} rx={4} fill={floorColor} stroke={wallColor} strokeWidth={1.5} />
          <rect x={rX + sD * 0.5} y={rY + sD * 0.4} width={rW - sD} height={sD} rx={2} fill={seatColor} opacity={0.85} />
          {[0.25, 0.5, 0.75].map((p, i) => (
            <circle key={i} cx={rX + sD * 0.5 + (rW - sD) * p} cy={rY + sD * 0.4 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          <rect x={s / 2 - rW * 0.1} y={rY + rH - 0.75} width={rW * 0.2} height={2} fill={floorColor} />
        </svg>
      );
    }

    if (shape === 'L') {
      return (
        <svg width={s} height={s * 0.7} viewBox={`0 0 ${s} ${s * 0.7}`} fill="none">
          <rect x={rX} y={rY} width={rW} height={rH} rx={4} fill={floorColor} stroke={wallColor} strokeWidth={1.5} />
          <rect x={rX + sD * 0.5} y={rY + sD * 0.4} width={rW - sD} height={sD} rx={2} fill={seatColor} opacity={0.85} />
          <rect x={rX + rW - sD * 0.4 - sD} y={rY + sD * 0.4} width={sD} height={rH - sD * 0.8} rx={2} fill={seatColor} opacity={0.85} />
          {[0.2, 0.45, 0.65].map((p, i) => (
            <circle key={`t${i}`} cx={rX + sD * 0.5 + (rW - sD * 2) * p} cy={rY + sD * 0.4 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          {[0.35, 0.65].map((p, i) => (
            <circle key={`r${i}`} cx={rX + rW - sD * 0.4 - sD * 0.5} cy={rY + sD * 0.4 + (rH - sD * 0.8) * p} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          <rect x={rX + rW * 0.08} y={rY + rH - 0.75} width={rW * 0.2} height={2} fill={floorColor} />
        </svg>
      );
    }

    if (shape === 'U') {
      return (
        <svg width={s} height={s * 0.7} viewBox={`0 0 ${s} ${s * 0.7}`} fill="none">
          <rect x={rX} y={rY} width={rW} height={rH} rx={4} fill={floorColor} stroke={wallColor} strokeWidth={1.5} />
          <rect x={rX + sD * 0.5} y={rY + sD * 0.4} width={rW - sD} height={sD} rx={2} fill={seatColor} opacity={0.85} />
          <rect x={rX + sD * 0.4} y={rY + sD * 0.4} width={sD} height={rH - sD * 0.8} rx={2} fill={seatColor} opacity={0.85} />
          <rect x={rX + rW - sD * 0.4 - sD} y={rY + sD * 0.4} width={sD} height={rH - sD * 0.8} rx={2} fill={seatColor} opacity={0.85} />
          {[0.35, 0.65].map((p, i) => (
            <circle key={`t${i}`} cx={rX + sD * 0.5 + (rW - sD * 2) * p + sD * 0.5} cy={rY + sD * 0.4 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          {[0.35, 0.7].map((p, i) => (
            <circle key={`l${i}`} cx={rX + sD * 0.4 + sD * 0.5} cy={rY + sD * 0.4 + (rH - sD * 0.8) * p} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          {[0.35, 0.7].map((p, i) => (
            <circle key={`r${i}`} cx={rX + rW - sD * 0.4 - sD * 0.5} cy={rY + sD * 0.4 + (rH - sD * 0.8) * p} r={cR} fill={cushionColor} opacity={0.6} />
          ))}
          <rect x={s / 2 - rW * 0.1} y={rY + rH - 0.75} width={rW * 0.2} height={2} fill={floorColor} />
        </svg>
      );
    }

    // full
    return (
      <svg width={s} height={s * 0.7} viewBox={`0 0 ${s} ${s * 0.7}`} fill="none">
        <rect x={rX} y={rY} width={rW} height={rH} rx={4} fill={floorColor} stroke={wallColor} strokeWidth={1.5} />
        <rect x={rX + sD * 0.5} y={rY + sD * 0.4} width={rW - sD} height={sD} rx={2} fill={seatColor} opacity={0.85} />
        <rect x={rX + sD * 0.4} y={rY + sD * 0.4} width={sD} height={rH - sD * 0.8} rx={2} fill={seatColor} opacity={0.85} />
        <rect x={rX + rW - sD * 0.4 - sD} y={rY + sD * 0.4} width={sD} height={rH - sD * 0.8} rx={2} fill={seatColor} opacity={0.85} />
        <rect x={rX + sD * 0.4} y={rY + rH - sD * 0.4 - sD} width={rW * 0.28} height={sD} rx={2} fill={seatColor} opacity={0.85} />
        <rect x={rX + rW - sD * 0.4 - rW * 0.28} y={rY + rH - sD * 0.4 - sD} width={rW * 0.28} height={sD} rx={2} fill={seatColor} opacity={0.85} />
        {[0.35, 0.65].map((p, i) => (
          <circle key={`t${i}`} cx={rX + sD * 0.5 + (rW - sD * 2) * p + sD * 0.5} cy={rY + sD * 0.4 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
        ))}
        {[0.35, 0.7].map((p, i) => (
          <circle key={`l${i}`} cx={rX + sD * 0.4 + sD * 0.5} cy={rY + sD * 0.4 + (rH - sD * 0.8) * p} r={cR} fill={cushionColor} opacity={0.6} />
        ))}
        {[0.35, 0.7].map((p, i) => (
          <circle key={`r${i}`} cx={rX + rW - sD * 0.4 - sD * 0.5} cy={rY + sD * 0.4 + (rH - sD * 0.8) * p} r={cR} fill={cushionColor} opacity={0.6} />
        ))}
        <rect x={s / 2 - rW * 0.1} y={rY + rH - 0.75} width={rW * 0.2} height={2} fill={floorColor} />
        <path
          d={`M ${s / 2 - rW * 0.1} ${rY + rH - 0.75} A ${rW * 0.08} ${rW * 0.08} 0 0 1 ${s / 2 + rW * 0.1} ${rY + rH - 0.75}`}
          stroke={wallColor}
          strokeWidth={0.8}
          strokeDasharray="2 1.5"
          fill="none"
          opacity={0.5}
        />
      </svg>
    );
  };

  const renderRoomSVG = (forSummary = false) => {
    // If we have an optimization result, show the detailed floor plan
    if (optimizationResult?.svgDataUrl) {
      return (
        <img
          src={optimizationResult.svgDataUrl}
          alt="Floor Plan"
          style={{
            maxWidth: forSummary ? '100%' : (isMobile ? '100%' : 600),
            maxHeight: forSummary ? (isMobile ? 150 : 190) : (isMobile ? 250 : 400),
            borderRadius: 12,
            objectFit: 'contain',
          }}
        />
      );
    }

    // Fallback: Floor plan preview (before optimization)
    const isDark = currentStep === 3;
    const w = 340;
    const h = 220;
    const pad = 30;
    const rX = pad;
    const rY = pad;
    const rW = w - pad * 2;
    const rH = h - pad * 2;
    const sD = rW * 0.08;
    const cR = sD * 0.35;
    const seatColor = theme.colors.primary;
    const cushionColor = '#C97A56';
    const wallStroke = isDark ? '#444' : '#D4C8BC';
    const floorFill = isDark ? '#2A2A2A' : '#FAF6F1';
    const bgFill = isDark ? theme.colors.cardDark : theme.colors.lightFill;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ background: bgFill, borderRadius: 12, maxWidth: w, width: '100%', height: 'auto' }}>
        {/* Room outline */}
        <rect x={rX} y={rY} width={rW} height={rH} fill={floorFill} stroke={wallStroke} strokeWidth="2" rx="4" />

        {/* Door opening */}
        <rect x={w / 2 - rW * 0.08} y={rY + rH - 1} width={rW * 0.16} height="3" fill={bgFill} />

        {selectedConfig === 'single' && (
          <>
            <rect x={rX + sD * 0.6} y={rY + sD * 0.5} width={rW - sD * 1.2} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            {[0.2, 0.35, 0.5, 0.65, 0.8].map((p, i) => (
              <circle key={i} cx={rX + sD * 0.6 + (rW - sD * 1.2) * p} cy={rY + sD * 0.5 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
          </>
        )}

        {selectedConfig === 'L' && (
          <>
            <rect x={rX + sD * 0.6} y={rY + sD * 0.5} width={rW - sD * 1.2} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + rW - sD * 0.5 - sD} y={rY + sD * 0.5} width={sD} height={rH - sD} rx="3" fill={seatColor} opacity={0.85} />
            {[0.15, 0.35, 0.55, 0.72].map((p, i) => (
              <circle key={`t${i}`} cx={rX + sD * 0.6 + (rW - sD * 2.5) * p} cy={rY + sD * 0.5 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`r${i}`} cx={rX + rW - sD * 0.5 - sD * 0.5} cy={rY + sD * 0.5 + (rH - sD) * p} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
          </>
        )}

        {selectedConfig === 'U' && (
          <>
            <rect x={rX + sD * 0.6} y={rY + sD * 0.5} width={rW - sD * 1.2} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + sD * 0.5} y={rY + sD * 0.5} width={sD} height={rH - sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + rW - sD * 0.5 - sD} y={rY + sD * 0.5} width={sD} height={rH - sD} rx="3" fill={seatColor} opacity={0.85} />
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`t${i}`} cx={rX + sD * 0.6 + (rW - sD * 2.5) * p + sD * 0.6} cy={rY + sD * 0.5 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`l${i}`} cx={rX + sD * 0.5 + sD * 0.5} cy={rY + sD * 0.5 + (rH - sD) * p} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`r${i}`} cx={rX + rW - sD * 0.5 - sD * 0.5} cy={rY + sD * 0.5 + (rH - sD) * p} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
          </>
        )}

        {selectedConfig === 'full' && (
          <>
            <rect x={rX + sD * 0.6} y={rY + sD * 0.5} width={rW - sD * 1.2} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + sD * 0.5} y={rY + sD * 0.5} width={sD} height={rH - sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + rW - sD * 0.5 - sD} y={rY + sD * 0.5} width={sD} height={rH - sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + sD * 0.5} y={rY + rH - sD * 0.5 - sD} width={rW * 0.28} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            <rect x={rX + rW - sD * 0.5 - rW * 0.28} y={rY + rH - sD * 0.5 - sD} width={rW * 0.28} height={sD} rx="3" fill={seatColor} opacity={0.85} />
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`t${i}`} cx={rX + sD * 0.6 + (rW - sD * 2.5) * p + sD * 0.6} cy={rY + sD * 0.5 + sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`l${i}`} cx={rX + sD * 0.5 + sD * 0.5} cy={rY + sD * 0.5 + (rH - sD) * p} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            {[0.25, 0.5, 0.75].map((p, i) => (
              <circle key={`r${i}`} cx={rX + rW - sD * 0.5 - sD * 0.5} cy={rY + sD * 0.5 + (rH - sD) * p} r={cR} fill={cushionColor} opacity={0.6} />
            ))}
            <circle cx={rX + sD * 0.5 + rW * 0.14} cy={rY + rH - sD * 0.5 - sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            <circle cx={rX + rW - sD * 0.5 - rW * 0.14} cy={rY + rH - sD * 0.5 - sD * 0.5} r={cR} fill={cushionColor} opacity={0.6} />
            <path
              d={`M ${w / 2 - rW * 0.08} ${rY + rH - 1} A ${rW * 0.06} ${rW * 0.06} 0 0 1 ${w / 2 + rW * 0.08} ${rY + rH - 1}`}
              stroke={wallStroke}
              strokeWidth={1}
              strokeDasharray="3 2"
              fill="none"
              opacity={0.5}
            />
          </>
        )}
      </svg>
    );
  };

  const renderMeasurementFields = () => {
    const inputWrapStyle: React.CSSProperties = {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      border: `1.5px solid ${theme.colors.border}`,
      padding: isMobile ? '14px 16px' : '16px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'text',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      minHeight: 44,
    };

    const inputFieldStyle: React.CSSProperties = {
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent',
      color: theme.colors.textDark,
      fontFamily: theme.fonts.english,
      fontSize: isMobile ? 18 : 17,
      fontWeight: 500,
      width: '100%',
      MozAppearance: 'textfield',
      WebkitAppearance: 'none',
      appearance: 'textfield' as React.CSSProperties['appearance'],
    };

    const labelStyle = {
      color: theme.colors.textMedium,
      fontFamily: theme.fonts.arabic,
      fontSize: isMobile ? 13 : 14,
      marginBottom: 8,
      display: 'block' as const,
    };

    const handleWrapClick = (id: string) => {
      const input = document.getElementById(id);
      if (input) input.focus();
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const wrap = e.target.closest('[data-input-wrap]') as HTMLElement;
      if (wrap) {
        wrap.style.borderColor = theme.colors.primary;
        wrap.style.boxShadow = `0 0 0 3px ${theme.colors.primary}18`;
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const wrap = e.target.closest('[data-input-wrap]') as HTMLElement;
      const fieldId = e.target.id;
      const value = e.target.value;

      // Mark field as touched
      setTouchedFields(prev => ({ ...prev, [fieldId]: true }));

      if (wrap) {
        const isValid = isMeasurementValid(value);
        if (isValid === true) {
          wrap.style.borderColor = '#22C55E';
          wrap.style.boxShadow = '0 0 0 3px #22C55E18';
        } else if (isValid === false) {
          wrap.style.borderColor = '#DC2626';
          wrap.style.boxShadow = '0 0 0 3px #DC262618';
        } else {
          wrap.style.borderColor = theme.colors.border;
          wrap.style.boxShadow = 'none';
        }
      }
    };

    const renderInput = (id: string, value: string, onChange: (val: string) => void, placeholder = '0') => {
      const isValid = touchedFields[id] ? isMeasurementValid(value) : null;

      return (
        <div>
          <div
            data-input-wrap
            style={{
              ...inputWrapStyle,
              border: `1.5px solid ${isValid === true ? '#22C55E' : isValid === false ? '#DC2626' : theme.colors.border}`,
            }}
            onClick={() => handleWrapClick(id)}
          >
            <input
              id={id}
              type="number"
              inputMode="numeric"
              min={110}
              max={MAX_WALL_LENGTH}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputFieldStyle}
            />
            <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.english, fontSize: 14, flexShrink: 0, ...(isRTL ? { marginLeft: 8 } : { marginRight: 8 }) }}>cm</span>
            <style>{`
              input[type=number]::-webkit-inner-spin-button,
              input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
              input[type=number] { -moz-appearance: textfield; }
              input[type=number]:focus { outline: none !important; box-shadow: none !important; }
            `}</style>
          </div>
          {touchedFields[id] && isValid === false && (
            <span style={{
              color: '#DC2626',
              fontFamily: theme.fonts.arabic,
              fontSize: 11,
              marginTop: 4,
              display: 'block'
            }}>
              {t('validation.invalidMeasurementsMin', { min: 110 })} - {t('validation.invalidMeasurementsMax', { max: 2000 })}
            </span>
          )}
          {touchedFields[id] && isValid === true && (
            <span style={{
              color: '#22C55E',
              fontFamily: theme.fonts.arabic,
              fontSize: 11,
              marginTop: 4,
              display: 'block'
            }}>
              ✓
            </span>
          )}
        </div>
      );
    };

    const renderWallPreview = (highlightWall: string) => {
      const w = 80;
      const h = 60;
      const pad = 8;
      const strokeW = 3;
      const activeColor = theme.colors.primary;
      const inactiveColor = '#E8E0D5';
      const fillColor = '#FAF6F1';

      if (selectedConfig === 'single') {
        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={3} fill={fillColor} stroke={inactiveColor} strokeWidth={1} />
            {/* Top wall = the single wall */}
            <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke={activeColor} strokeWidth={strokeW} strokeLinecap="round" />
          </svg>
        );
      }

      if (selectedConfig === 'L') {
        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={3} fill={fillColor} stroke={inactiveColor} strokeWidth={1} />
            {/* Top wall = wall1 (horizontal) */}
            <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke={highlightWall === 'wall1' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Right wall = wall2 (vertical) */}
            <line x1={w - pad} y1={pad} x2={w - pad} y2={h - pad} stroke={highlightWall === 'wall2' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
          </svg>
        );
      }

      if (selectedConfig === 'U') {
        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={3} fill={fillColor} stroke={inactiveColor} strokeWidth={1} />
            {/* Left wall = wall1 */}
            <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={highlightWall === 'wall1' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Top wall = wall2 (center) */}
            <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke={highlightWall === 'wall2' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Right wall = wall3 */}
            <line x1={w - pad} y1={pad} x2={w - pad} y2={h - pad} stroke={highlightWall === 'wall3' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
          </svg>
        );
      }

      if (selectedConfig === 'full') {
        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={3} fill={fillColor} stroke={inactiveColor} strokeWidth={1} />
            {/* Top wall */}
            <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke={highlightWall === 'top' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Left wall */}
            <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={highlightWall === 'left' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Right wall */}
            <line x1={w - pad} y1={pad} x2={w - pad} y2={h - pad} stroke={highlightWall === 'right' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            {/* Bottom wall - split for door */}
            <line x1={pad} y1={h - pad} x2={w * 0.38} y2={h - pad} stroke={highlightWall === 'bottomLeftToDoor' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
            <line x1={w * 0.62} y1={h - pad} x2={w - pad} y2={h - pad} stroke={highlightWall === 'doorToBottomRight' ? activeColor : inactiveColor} strokeWidth={strokeW} strokeLinecap="round" />
          </svg>
        );
      }

      return null;
    };

    switch (selectedConfig) {
      case 'single':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('single')}</div>
              <label style={labelStyle}>{t('measurements.wallLength')}</label>
              {renderInput('m-single', measurements.single, (v) => setMeasurements({ ...measurements, single: v }))}
            </div>
          </div>
        );

      case 'L':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('wall1')}</div>
              <label style={labelStyle}>{t('measurements.horizontalWall')}</label>
              {renderInput('m-wall1', measurements.wall1, (v) => setMeasurements({ ...measurements, wall1: v }))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('wall2')}</div>
              <label style={labelStyle}>{t('measurements.verticalWall')}</label>
              {renderInput('m-wall2', measurements.wall2, (v) => setMeasurements({ ...measurements, wall2: v }))}
            </div>
          </div>
        );

      case 'U':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? 12 : 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('wall1')}</div>
              <label style={labelStyle}>{t('measurements.leftWall')}</label>
              {renderInput('m-wall1', measurements.wall1, (v) => setMeasurements({ ...measurements, wall1: v }))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('wall2')}</div>
              <label style={labelStyle}>{t('measurements.centerWall')}</label>
              {renderInput('m-wall2', measurements.wall2, (v) => setMeasurements({ ...measurements, wall2: v }))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('wall3')}</div>
              <label style={labelStyle}>{t('measurements.rightWall')}</label>
              {renderInput('m-wall3', measurements.wall3, (v) => setMeasurements({ ...measurements, wall3: v }))}
            </div>
          </div>
        );

      case 'full':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('top')}</div>
                <label style={labelStyle}>{t('measurements.topWall')}</label>
                {renderInput('m-top', measurements.top, (v) => setMeasurements({ ...measurements, top: v }))}
              </div>
              {!isMobile && <div style={{ visibility: 'hidden' }}></div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('left')}</div>
                <label style={labelStyle}>{t('measurements.leftWall')}</label>
                {renderInput('m-left', measurements.left, (v) => setMeasurements({ ...measurements, left: v }))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('right')}</div>
                <label style={labelStyle}>{t('measurements.rightWall')}</label>
                {renderInput('m-right', measurements.right, (v) => setMeasurements({ ...measurements, right: v }))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('bottomLeftToDoor')}</div>
                <label style={labelStyle}>{t('measurements.leftToDoor')}</label>
                {renderInput('m-bl', measurements.bottomLeftToDoor, (v) => setMeasurements({ ...measurements, bottomLeftToDoor: v }))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{renderWallPreview('doorToBottomRight')}</div>
                <label style={labelStyle}>{t('measurements.doorToRight')}</label>
                {renderInput('m-br', measurements.doorToBottomRight, (v) => setMeasurements({ ...measurements, doorToBottomRight: v }))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 28 : 40 }}>
      {/* Product Selection */}
      {majalisProducts && majalisProducts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
          <div>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.heading,
                fontSize: isMobile ? 22 : isTablet ? 24 : 28,
                fontWeight: 'bold',
                margin: 0,
                marginBottom: 8,
              }}
            >
              {t('step1.selectProductTitle')}
            </h2>
            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0 }}>
              {t('step1.selectProductSubtitle')}
            </p>
            {errors.product && (
              <p style={{ color: '#DC2626', fontFamily: theme.fonts.arabic, fontSize: 13, margin: '8px 0 0 0', fontWeight: 'bold' }}>
                {errors.product}
              </p>
            )}
          </div>

          {/* Show selected product details OR product cards grid */}
          {selectedProduct ? (
            <div ref={productDetailsRef} style={{
              backgroundColor: theme.colors.white,
              borderRadius: 16,
              border: `2px solid ${theme.colors.primary}`,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              {/* Main Image */}
              <div style={{ position: 'relative', width: '100%', height: isMobile ? 240 : 360, overflow: 'hidden' }}>
                <Image
                  src={selectedProductMainImage || selectedProduct.image}
                  alt={getLocalizedField(selectedProduct.title, locale)}
                  fill
                  style={{ objectFit: 'cover', transition: 'opacity 0.3s ease' }}
                />
                {/* Selected badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    ...(isRTL ? { right: 12 } : { left: 12 }),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 20,
                    padding: '6px 14px',
                    zIndex: 2,
                  }}
                >
                  <Check size={14} color="#FFFFFF" />
                  <span style={{ color: '#FFFFFF', fontFamily: theme.fonts.arabic, fontSize: 12, fontWeight: 'bold' }}>
                    {t('step1.selectedBadge')}
                  </span>
                </div>
                {/* Copy link button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    const url = `${window.location.origin}/${locale}/checkout?product=${selectedProduct._id}`;
                    navigator.clipboard.writeText(url).then(() => {
                      btn.style.backgroundColor = '#166534';
                      setTimeout(() => { btn.style.backgroundColor = 'rgba(0,0,0,0.5)'; }, 1500);
                    });
                  }}
                  title="Copy checkout link"
                  style={{
                    position: 'absolute',
                    top: 12,
                    ...(isRTL ? { left: 12 } : { right: 12 }),
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <Link2 size={16} color="#FFFFFF" />
                </button>
              </div>

              {/* Gallery Thumbnails */}
              {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '12px 16px',
                    overflowX: 'auto',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {/* Main image as first thumbnail */}
                  <div
                    onClick={() => setSelectedProductMainImage(selectedProduct.image)}
                    style={{
                      position: 'relative',
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `2px solid ${(!selectedProductMainImage || selectedProductMainImage === selectedProduct.image) ? theme.colors.primary : theme.colors.border}`,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <Image
                      src={selectedProduct.image}
                      alt={getLocalizedField(selectedProduct.title, locale)}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  {selectedProduct.gallery.map((img: { url: string; alt?: { ar?: string; fr?: string } }, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProductMainImage(img.url)}
                      style={{
                        position: 'relative',
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: `2px solid ${selectedProductMainImage === img.url ? theme.colors.primary : theme.colors.border}`,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      <Image
                        src={img.url}
                        alt={getLocalizedField(img.alt, locale) || `${getLocalizedField(selectedProduct.title, locale)} ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Title, Description & Actions */}
              <div style={{ padding: isMobile ? '16px 16px 20px' : '20px 24px 24px' }}>
                <h3 style={{
                  color: theme.colors.textDark,
                  fontFamily: theme.fonts.heading,
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 'bold',
                  margin: 0,
                  marginBottom: 4,
                }}>
                  {getLocalizedField(selectedProduct.title, locale)}
                </h3>
                {/* Subtitle in alternate language */}
                <p
                  style={{
                    color: theme.colors.textLight,
                    fontFamily: theme.fonts.english,
                    fontSize: isMobile ? 13 : 15,
                    margin: 0,
                    marginBottom: 12,
                    direction: 'ltr',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {locale === 'fr' ? selectedProduct.title.ar : selectedProduct.title.fr}
                </p>
                <p style={{
                  color: theme.colors.textMedium,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 14 : 15,
                  margin: 0,
                  lineHeight: 1.8,
                  marginBottom: 20,
                  overflowWrap: 'break-word',
                }}>
                  {getLocalizedField(selectedProduct.description, locale)}
                </p>

                {/* Sold Out Banner */}
                {isFabricSoldOut && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: isMobile ? '12px 16px' : '14px 20px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 10,
                    marginBottom: 4,
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <X size={16} color="#FFFFFF" />
                    </div>
                    <div>
                      <p style={{
                        color: '#991B1B',
                        fontFamily: theme.fonts.heading,
                        fontSize: isMobile ? 14 : 15,
                        fontWeight: 'bold',
                        margin: 0,
                        marginBottom: 2,
                      }}>
                        {t('step1.soldOutTitle')}
                      </p>
                      <p style={{
                        color: '#B91C1C',
                        fontFamily: theme.fonts.arabic,
                        fontSize: isMobile ? 12 : 13,
                        margin: 0,
                        lineHeight: 1.5,
                      }}>
                        {t('step1.soldOutMessage')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  {/* Scroll to room config button */}
                  {!isFabricSoldOut && (
                  <button
                    onClick={() => roomConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 60%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: isMobile ? '14px 20px' : '12px 24px',
                      backgroundColor: theme.colors.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      fontFamily: theme.fonts.heading,
                      fontSize: isMobile ? 15 : 16,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s ease',
                      minHeight: 48,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  >
                    {t('step1.scrollToConfig')}
                    <ChevronDown size={18} />
                  </button>
                  )}

                  {/* Change product button */}
                  <button
                    onClick={() => { setSelectedProductId(null); setSelectedProductMainImage(''); }}
                    style={{
                      flex: isFabricSoldOut ? '1' : (isMobile ? '1 1 100%' : '0 0 calc(40% - 10px)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: isMobile ? '14px 20px' : '12px 24px',
                      backgroundColor: 'transparent',
                      color: theme.colors.textMedium,
                      border: `1.5px solid ${theme.colors.border}`,
                      borderRadius: 10,
                      fontFamily: theme.fonts.arabic,
                      fontSize: isMobile ? 14 : 15,
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: 48,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.primary; (e.currentTarget as HTMLButtonElement).style.color = theme.colors.primary; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = theme.colors.border; (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textMedium; }}
                  >
                    <RefreshCw size={16} />
                    {t('step1.changeProduct')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(majalisProducts.length, 3)}, 1fr)`, gap: isMobile ? 12 : 16 }}>
              {majalisProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => { setSelectedProductId(product._id); setSelectedProductMainImage(''); setErrors(prev => ({ ...prev, product: '' })); setTimeout(() => productDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}
                  style={{
                    backgroundColor: theme.colors.white,
                    borderRadius: 12,
                    border: `2px solid ${selectedProductId === product._id ? theme.colors.primary : theme.colors.border}`,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setInfoProduct(product); setInfoMainImage(product.image); }}
                    style={{
                      position: 'absolute',
                      top: 10,
                      ...(isRTL ? { left: 10 } : { right: 10 }),
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.65)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
                    aria-label={t('step1.productInfoLabel')}
                  >
                    <Info size={16} color="#FFFFFF" />
                  </button>
                  <div style={{ position: 'relative', width: '100%', height: isMobile ? 140 : 160, overflow: 'hidden' }}>
                    <Image
                      src={product.image}
                      alt={getLocalizedField(product.title, locale)}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: isMobile ? 12 : 16 }}>
                    <h3 style={{
                      color: theme.colors.textDark,
                      fontFamily: theme.fonts.arabic,
                      fontSize: isMobile ? 15 : 17,
                      fontWeight: 'bold',
                      margin: 0,
                      marginBottom: 4,
                    }}>
                      {getLocalizedField(product.title, locale)}
                    </h3>
                    <p style={{
                      color: theme.colors.textMedium,
                      fontFamily: theme.fonts.arabic,
                      fontSize: isMobile ? 12 : 13,
                      margin: 0,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {getLocalizedField(product.description, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Room Type Selection */}
      <div ref={roomConfigRef} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        <div>
          <h2
            style={{
              color: theme.colors.textDark,
              fontFamily: theme.fonts.heading,
              fontSize: isMobile ? 22 : isTablet ? 24 : 28,
              fontWeight: 'bold',
              margin: 0,
              marginBottom: 8,
            }}
          >
            {t('step1.selectRoomTitle')}
          </h2>
          <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0 }}>
            {t('step1.selectRoomSubtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16 }}>
          {roomConfigs.map((config) => (
            <div
              key={config.id}
              onClick={() => setSelectedConfig(config.id)}
              style={{
                backgroundColor: theme.colors.white,
                borderRadius: 12,
                border: `2px solid ${selectedConfig === config.id ? theme.colors.primary : theme.colors.border}`,
                padding: isMobile ? 14 : 20,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 8 : 12,
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {selectedConfig === config.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={12} color="#FFFFFF" />
                </div>
              )}
              {renderShapeIcon(config.id, selectedConfig === config.id)}
              <span
                style={{
                  color: theme.colors.textDark,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 13 : 15,
                  fontWeight: 'bold',
                }}
              >
                {config.title}
              </span>
              <span
                style={{
                  color: theme.colors.textLight,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 11 : 12,
                  textAlign: 'center',
                }}
              >
                {config.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Measurements Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        <div>
          <h3
            style={{
              color: theme.colors.textDark,
              fontFamily: theme.fonts.heading,
              fontSize: isMobile ? 18 : 20,
              fontWeight: 'bold',
              margin: 0,
              marginBottom: 8,
            }}
          >
             {t('step1.measurementsTitle')}
          </h3>
          <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, margin: 0, lineHeight: 1.7 }}>
            {t('step1.measurementsSubtitle')}
          </p>
        </div>

        {renderMeasurementFields()}

        <div
          style={{
            backgroundColor: theme.colors.primaryLight,
            borderRadius: 8,
            padding: isMobile ? '12px 14px' : '14px 18px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Info size={18} color={theme.colors.primary} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, lineHeight: 1.6 }}>
            {t('step1.measurementsTip')}
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32, alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? 300 : 400 }}>
      {isOptimizing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24, alignItems: 'center', padding: isMobile ? 20 : 40 }}>
          <div
            style={{
              width: isMobile ? 60 : 80,
              height: isMobile ? 60 : 80,
              borderRadius: 40,
              backgroundColor: theme.colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loader2 size={isMobile ? 28 : 40} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.heading,
                fontSize: isMobile ? 18 : 24,
                fontWeight: 'bold',
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t('step2.optimizingTitle')}
            </h2>
            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0 }}>
              {t('step2.optimizingSubtitle')}
            </p>
          </div>
        </div>
      ) : optimizationError ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20, alignItems: 'center', padding: isMobile ? 20 : 40 }}>
          <div
            style={{
              width: isMobile ? 60 : 80,
              height: isMobile ? 60 : 80,
              borderRadius: 40,
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Info size={isMobile ? 28 : 40} color="#DC2626" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.heading,
                fontSize: isMobile ? 18 : 24,
                fontWeight: 'bold',
                margin: 0,
                marginBottom: 12,
              }}
            >
              {t('step2.errorTitle')}
            </h2>
            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0, maxWidth: 400 }}>
              {optimizationError}
            </p>
          </div>
          <button
            onClick={runOptimization}
            style={{
              padding: isMobile ? '14px 28px' : '12px 32px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: theme.colors.primary,
              color: '#FFFFFF',
              fontFamily: theme.fonts.arabic,
              fontSize: 15,
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: 44,
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {t('step2.retryButton')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32, width: '100%' }}>
          <div>
            <h2
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.heading,
                fontSize: isMobile ? 22 : isTablet ? 24 : 28,
                fontWeight: 'bold',
                margin: 0,
                marginBottom: 8,
              }}
            >
              {t('step2.previewTitle')}
            </h2>
            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, margin: 0 }}>
              {t('step2.previewSubtitle')}
            </p>
          </div>

          {/* Room SVG Preview with Zoom Controls */}
          <div
            ref={svgPreviewRef}
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: isMobile ? 12 : 20,
              border: `1px solid ${theme.colors.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '8px 10px' : '10px 16px',
                borderBottom: `1px solid ${theme.colors.border}`,
                backgroundColor: '#FAFAFA',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? 8 : 0,
              }}
            >
              {/* Zoom Controls */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={handleZoomOut}
                  title={t('step2.zoomOut')}
                  style={{
                    width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ZoomOut size={isMobile ? 18 : 16} color={theme.colors.textMedium} />
                </button>
                <span
                  style={{
                    minWidth: isMobile ? 40 : 48, textAlign: 'center',
                    fontFamily: theme.fonts.english, fontSize: isMobile ? 12 : 13,
                    color: theme.colors.textMedium, fontWeight: '600',
                  }}
                >
                  {zoomLevel}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title={t('step2.zoomIn')}
                  style={{
                    width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ZoomIn size={isMobile ? 18 : 16} color={theme.colors.textMedium} />
                </button>
                <button
                  onClick={handleFitToView}
                  title={t('step2.fitToView')}
                  style={{
                    width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: zoomLevel === 100 ? theme.colors.primaryLight : theme.colors.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', ...(isRTL ? { marginLeft: 4 } : { marginRight: 4 }),
                  }}
                >
                  <Maximize size={isMobile ? 18 : 16} color={zoomLevel === 100 ? theme.colors.primary : theme.colors.textMedium} />
                </button>
              </div>

              {/* Download Button - only in toolbar on desktop */}
              {!isMobile && (
                <button
                  onClick={handleDownloadJPEG}
                  style={{
                    display: 'flex', gap: 6, alignItems: 'center',
                    padding: '6px 14px', borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.white,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} color={theme.colors.textMedium} />
                  <span style={{ fontFamily: theme.fonts.arabic, fontSize: 12, color: theme.colors.textMedium }}>
                    {t('step2.downloadDesktop')}
                  </span>
                </button>
              )}
            </div>

            {/* SVG Updating Overlay */}
            {isSvgUpdating && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(253, 251, 247, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: 'inherit',
                }}
              >
                <Loader2 size={32} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            {/* SVG Container with zoom */}
            <div
              style={{
                overflow: 'auto',
                padding: isMobile ? 12 : 24,
                maxHeight: isMobile ? 380 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {optimizationResult?.svgDataUrl ? (
                <img
                  src={optimizationResult.svgDataUrl}
                  alt="Floor Plan"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                    maxWidth: zoomLevel <= 100 ? '100%' : 'none',
                    maxHeight: zoomLevel <= 100 ? (isMobile ? 350 : 450) : 'none',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                renderRoomSVG()
              )}
            </div>
          </div>

          {/* Mobile Download Button - prominent, below SVG */}
          {isMobile && (
            <button
              onClick={handleDownloadJPEG}
              style={{
                display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
                width: '100%',
                padding: '14px 20px', borderRadius: 12,
                border: `2px solid ${theme.colors.primary}`,
                backgroundColor: '#FFF8F0',
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              <Download size={20} color={theme.colors.primary} />
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: 15, fontWeight: '600', color: theme.colors.primary }}>
                {t('step2.downloadMobile')}
              </span>
            </button>
          )}

          {/* Poufs Upsell - right below SVG (shown for ALL layout types including single-wall) */}
          {optimizationResult && poufsStock > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 10 : 12,
            }}>
              {/* Carpet card - matching Step 3 card design */}
              {allCombos.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    padding: isMobile ? 10 : 12,
                    backgroundColor: includeCarpet ? theme.colors.primaryLight : theme.colors.white,
                    borderRadius: 10,
                    border: `1px solid ${includeCarpet ? theme.colors.primary : theme.colors.border}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 8,
                      backgroundColor: theme.colors.lightFill,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <ShoppingBag size={22} color={theme.colors.textLight} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: theme.fonts.arabic, fontSize: 13, fontWeight: 'bold', color: theme.colors.textDark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        زربية (Tapis)
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, margin: '2px 0 0', fontFamily: theme.fonts.english }}>
                        {(carpetCombo?.totalPrice ?? 0).toLocaleString()} MAD
                      </p>
                    </div>
                    <button
                      onClick={() => setIncludeCarpet(!includeCarpet)}
                      style={{
                        width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, border: 'none',
                        backgroundColor: includeCarpet ? '#16a34a' : theme.colors.primary,
                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                      }}
                    >
                      {includeCarpet ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Poufs card - matching Step 3 card design */}
              {poufsStock > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    padding: isMobile ? 10 : 12,
                    backgroundColor: includePoufs ? theme.colors.primaryLight : theme.colors.white,
                    borderRadius: 10,
                    border: `1px solid ${includePoufs ? theme.colors.primary : theme.colors.border}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 8,
                      backgroundColor: theme.colors.lightFill,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <ShoppingBag size={22} color={theme.colors.textLight} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: theme.fonts.arabic, fontSize: 13, fontWeight: 'bold', color: theme.colors.textDark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        بوف (Poufs)
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, margin: '2px 0 0', fontFamily: theme.fonts.english }}>
                        {includePoufs ? `${poufsCount} x 800 = ${(poufsCount * 800).toLocaleString()}` : '800'} MAD
                      </p>
                    </div>
                    <button
                      onClick={() => setIncludePoufs(!includePoufs)}
                      style={{
                        width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, border: 'none',
                        backgroundColor: includePoufs ? '#16a34a' : theme.colors.primary,
                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                      }}
                    >
                      {includePoufs ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
                    </button>
                  </div>
                  {/* Quantity controls when active */}
                  {includePoufs && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, ...(isRTL ? { paddingRight: 62 } : { paddingLeft: 62 }) }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPoufsCount(Math.max(1, poufsCount - 1)); }}
                        style={{
                          width: isMobile ? 36 : 32, height: isMobile ? 36 : 32, borderRadius: '50%',
                          border: `1.5px solid ${theme.colors.border}`, backgroundColor: theme.colors.white,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: 18, fontWeight: 'bold', color: theme.colors.textDark,
                        }}
                      >-</button>
                      <span style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.textDark, minWidth: 24, textAlign: 'center', fontFamily: theme.fonts.english }}>{poufsCount}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPoufsCount(Math.min(maxPoufsCount, poufsCount + 1)); }}
                        style={{
                          width: isMobile ? 36 : 32, height: isMobile ? 36 : 32, borderRadius: '50%',
                          border: `1.5px solid ${theme.colors.border}`, backgroundColor: theme.colors.white,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: 18, fontWeight: 'bold', color: theme.colors.textDark,
                        }}
                      >+</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pieces List */}
          {optimizationResult && (
            <FormattedPiecesList
              glssaPieces={optimizationResult.walls.flatMap(w => w.glssaPieces)}
              wssadaPieces={optimizationResult.walls.flatMap(w => w.wssadaPieces)}
              totalGlssa={optimizationResult.totalGlssaPieces}
              poufsCount={includePoufs ? poufsCount : 0}
              title={t('step2.piecesList')}
            />
          )}


          {/* Results Summary */}
          {optimizationResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
              {/* Main Stats - Premium Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: isMobile ? 10 : 16,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFF8F0',
                    borderRadius: isMobile ? 12 : 16,
                    border: `2px solid ${theme.colors.primary}20`,
                    padding: isMobile ? 14 : 20,
                    textAlign: 'center',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <div style={{ color: theme.colors.primary, fontFamily: theme.fonts.english, fontSize: isMobile ? 28 : 36, fontWeight: '700' }}>
                    {optimizationResult.totalGlssaPieces}
                  </div>
                  <div style={{ color: theme.colors.primary, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 14, fontWeight: '500', opacity: 0.8 }}>{t('step2.glssaPieces')}</div>
                </div>
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: isMobile ? 12 : 16,
                    border: `2px solid ${theme.colors.green}20`,
                    padding: isMobile ? 14 : 20,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: theme.colors.green, fontFamily: theme.fonts.english, fontSize: isMobile ? 28 : 36, fontWeight: '700' }}>
                    {optimizationResult.totalWssadaPieces}
                  </div>
                  <div style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 14, fontWeight: '500', opacity: 0.8 }}>{t('step2.wssadaPieces')}</div>
                </div>
                <div
                  style={{
                    backgroundColor: theme.colors.white,
                    borderRadius: isMobile ? 12 : 16,
                    border: `1px solid ${theme.colors.border}`,
                    padding: isMobile ? 14 : 20,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: theme.colors.textDark, fontFamily: theme.fonts.english, fontSize: isMobile ? 28 : 36, fontWeight: '700' }}>
                    {optimizationResult.totalGlssaPieces}
                  </div>
                  <div style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 14, fontWeight: '500' }}>{t('step2.coudoir')}</div>
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    borderRadius: isMobile ? 12 : 16,
                    padding: isMobile ? 14 : 20,
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <div style={{ color: '#FFFFFF', fontFamily: theme.fonts.english, fontSize: isMobile ? 24 : 32, fontWeight: '700' }}>
                    {optimizationResult.estimatedPrice.toLocaleString('en')}
                  </div>
                  <div style={{ color: '#FFFFFF', fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 14, fontWeight: '500', opacity: 0.9 }}>{t('summary.currency')}</div>
                </div>
              </div>

              {/* Wall Details - Dev only */}
              {process.env.NODE_ENV === 'development' && <div
                style={{
                  backgroundColor: theme.colors.white,
                  borderRadius: isMobile ? 12 : 16,
                  border: `1px solid ${theme.colors.border}`,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: isMobile ? '12px 14px' : '16px 20px',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.lightFill,
                }}>
                  <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15, fontWeight: '600' }}>
                    {t('step2.wallDetails')}
                  </span>
                </div>
                <div style={{ padding: isMobile ? 10 : 16, display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                  {optimizationResult.walls.map((wall, index) => (
                    <div
                      key={wall.wallId}
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        padding: isMobile ? '10px 12px' : '14px 16px',
                        backgroundColor: index % 2 === 0 ? '#FAFAFA' : theme.colors.white,
                        borderRadius: 10,
                        border: `1px solid ${theme.colors.border}`,
                        gap: isMobile ? 8 : 0,
                      }}
                    >
                      <div style={{
                        width: isMobile ? 28 : 36,
                        height: isMobile ? 28 : 36,
                        borderRadius: 8,
                        backgroundColor: theme.colors.primary + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ color: theme.colors.primary, fontFamily: theme.fonts.english, fontSize: isMobile ? 12 : 14, fontWeight: '700' }}>
                          {wall.wallId}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8, flex: 1, ...(isRTL ? { paddingRight: isMobile ? 0 : 16 } : { paddingLeft: isMobile ? 0 : 16 }) }}>
                        {/* Glssa (Base cushion) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#F5E6D3', border: '1px solid #D4A574', flexShrink: 0 }} />
                          <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.english, fontSize: isMobile ? 11 : 13 }}>
                            {wall.glssaPieces.join(' + ')} = <strong>{wall.glssaTotal}cm</strong>
                          </span>
                          {wall.glssaVoid > 0 ? (
                            <span style={{
                              color: '#DC2626',
                              fontFamily: theme.fonts.arabic,
                              fontSize: isMobile ? 10 : 11,
                              backgroundColor: '#FEE2E2',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {t('step2.voidGap', { value: wall.glssaVoid })}
                            </span>
                          ) : (
                            <span style={{
                              color: '#16A34A',
                              fontFamily: theme.fonts.arabic,
                              fontSize: isMobile ? 10 : 11,
                              backgroundColor: '#DCFCE7',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {t('step2.fullCoverage')}
                            </span>
                          )}
                        </div>
                        {/* Wssada (Back cushion) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E8F5E9', border: '1px solid #81C784', flexShrink: 0 }} />
                          <span style={{ color: theme.colors.green, fontFamily: theme.fonts.english, fontSize: isMobile ? 11 : 13 }}>
                            {wall.wssadaPieces.join(' + ')} = <strong>{wall.wssadaTotal}cm</strong>
                          </span>
                          {wall.wssadaVoid > 0 ? (
                            <span style={{
                              color: '#DC2626',
                              fontFamily: theme.fonts.arabic,
                              fontSize: isMobile ? 10 : 11,
                              backgroundColor: '#FEE2E2',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {t('step2.voidGap', { value: wall.wssadaVoid })}
                            </span>
                          ) : (
                            <span style={{
                              color: '#16A34A',
                              fontFamily: theme.fonts.arabic,
                              fontSize: isMobile ? 10 : 11,
                              backgroundColor: '#DCFCE7',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {t('step2.fullCoverage')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>
          )}

          <div
            style={{
              backgroundColor: theme.colors.greenLight,
              borderRadius: 8,
              padding: isMobile ? '12px 14px' : '14px 18px',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <Check size={18} color={theme.colors.green} style={{ flexShrink: 0 }} />
            <span style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
              {t('step2.freeShipping')}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 28 : 40 }}>
      {/* Contact Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        <div>
          <h2
            style={{
              color: theme.colors.textDark,
              fontFamily: theme.fonts.heading,
              fontSize: isMobile ? 20 : 24,
              fontWeight: 'bold',
              margin: 0,
              marginBottom: 8,
            }}
          >
            {t('step3.title')}
          </h2>
          <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, margin: 0 }}>
            {t('step3.subtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
          <div>
            <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
              {t('form.fullName')}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: '' })); }}
              placeholder={t('form.fullNamePlaceholder')}
              style={{
                width: '100%',
                backgroundColor: theme.colors.white,
                borderRadius: 8,
                border: `1px solid ${errors.fullName ? '#DC2626' : theme.colors.border}`,
                padding: isMobile ? '12px 14px' : '14px 16px',
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 16 : 15,
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: 44,
              }}
            />
            {errors.fullName && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.fullName}</span>}
          </div>
          <div>
            <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
              {t('form.phone')}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setErrors(prev => ({ ...prev, phoneNumber: '' })); }}
              placeholder="0612345678"
              style={{
                width: '100%',
                backgroundColor: theme.colors.white,
                borderRadius: 8,
                border: `1px solid ${errors.phoneNumber ? '#DC2626' : theme.colors.border}`,
                padding: isMobile ? '12px 14px' : '14px 16px',
                color: theme.colors.textDark,
                fontFamily: theme.fonts.english,
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: 44,
              }}
            />
            {errors.phoneNumber && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.phoneNumber}</span>}
          </div>
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.emailOptional')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
            placeholder="example@email.com"
            style={{
              width: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: 8,
              border: `1px solid ${errors.email ? '#DC2626' : theme.colors.border}`,
              padding: isMobile ? '12px 14px' : '14px 16px',
              color: theme.colors.textDark,
              fontFamily: theme.fonts.english,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
              minHeight: 44,
            }}
          />
          {errors.email && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.email}</span>}
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.city')}
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setErrors(prev => ({ ...prev, city: '' })); }}
            placeholder={t('form.cityPlaceholder')}
            style={{
              width: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: 8,
              border: `1px solid ${errors.city ? '#DC2626' : theme.colors.border}`,
              padding: isMobile ? '12px 14px' : '14px 16px',
              color: theme.colors.textDark,
              fontFamily: theme.fonts.arabic,
              fontSize: isMobile ? 16 : 15,
              outline: 'none',
              minHeight: 44,
              boxSizing: 'border-box',
            }}
          />
          {errors.city && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.city}</span>}
        </div>

        <div>
          <label style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, display: 'block', marginBottom: 8 }}>
            {t('form.address')}
          </label>
          <textarea
            value={address}
            onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: '' })); }}
            placeholder={t('form.addressPlaceholder')}
            rows={3}
            style={{
              width: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: 8,
              border: `1px solid ${errors.address ? '#DC2626' : theme.colors.border}`,
              padding: isMobile ? '12px 14px' : '14px 16px',
              color: theme.colors.textDark,
              fontFamily: theme.fonts.arabic,
              fontSize: isMobile ? 16 : 15,
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.address && <span style={{ color: '#DC2626', fontSize: 12, fontFamily: theme.fonts.arabic }}>{errors.address}</span>}
        </div>

        {errors.submit && (
          <div style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginTop: 8 }}>
            <span style={{ color: '#DC2626', fontSize: 14, fontFamily: theme.fonts.arabic }}>{errors.submit}</span>
          </div>
        )}
      </div>

      {/* ─── Additional Individual Items (only show if extras are available) ──── */}
      {(EXTRAS_LIST.length > 0 || additionalItems.length > 0) && <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isMobile ? '12px 14px' : '14px 16px',
          backgroundColor: theme.colors.lightFill,
          borderRadius: 12,
          border: `1px solid ${theme.colors.border}`,
        }}>
          <ShoppingBag size={isMobile ? 18 : 20} color={theme.colors.primary} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: isMobile ? 15 : 17, fontWeight: 'bold', margin: 0, marginBottom: 2 }}>
              {t('additionalItems.sectionTitle')}
            </h3>
            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, margin: 0 }}>
              {t('additionalItems.sectionSubtitle')}
            </p>
          </div>
        </div>

        {/* Selected additional items list */}
        {additionalItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 13, fontWeight: 'bold' }}>
              {t('additionalItems.selectedItems')}
            </span>
            {additionalItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: isMobile ? 10 : 12,
                  backgroundColor: theme.colors.white,
                  borderRadius: 10,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.colors.lightFill, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <ShoppingBag size={22} color={theme.colors.textLight} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: theme.fonts.arabic, fontSize: 13, fontWeight: 'bold', color: theme.colors.textDark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, margin: '2px 0 0', fontFamily: theme.fonts.english }}>
                    {(item.price * item.quantity).toLocaleString()} {t('summary.currencyShort')}
                  </p>
                </div>
                {/* Qty controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 8, border: `1px solid ${theme.colors.border}`, overflow: 'hidden' }}>
                  <button
                    onClick={() => updateAdditionalItemQty(item.id, item.quantity - 1)}
                    style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <Minus size={13} color={theme.colors.textMedium} />
                  </button>
                  <span style={{ width: 28, textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: theme.colors.textDark, fontFamily: theme.fonts.english, borderLeft: `1px solid ${theme.colors.border}`, borderRight: `1px solid ${theme.colors.border}`, lineHeight: '30px' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateAdditionalItemQty(item.id, item.quantity + 1)}
                    style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={13} color={theme.colors.textMedium} />
                  </button>
                </div>
                <button
                  onClick={() => removeAdditionalItem(item.id)}
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Trash2 size={15} color={theme.colors.textLight} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hardcoded extras list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXTRAS_LIST.map(extra => {
            const alreadyAdded = additionalItems.some(i => i.id === extra.id);
            const displayName = locale === 'ar' ? extra.nameAr : extra.nameFr;
            return (
              <div
                key={extra.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  padding: isMobile ? 10 : 12,
                  backgroundColor: alreadyAdded ? theme.colors.primaryLight : theme.colors.white,
                  borderRadius: 10,
                  border: `1px solid ${alreadyAdded ? theme.colors.primary : theme.colors.border}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 8,
                    backgroundColor: theme.colors.lightFill,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ShoppingBag size={22} color={theme.colors.textLight} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: theme.fonts.arabic, fontSize: 13, fontWeight: 'bold', color: theme.colors.textDark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, margin: '2px 0 0', fontFamily: theme.fonts.english }}>
                      {extra.price.toLocaleString()} {t('summary.currencyShort')}
                    </p>
                  </div>
                  <button
                    onClick={() => addExtra(extra)}
                    style={{
                      width: 34, height: 34,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8, border: 'none',
                      backgroundColor: alreadyAdded ? '#16a34a' : theme.colors.primary,
                      cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                    }}
                  >
                    {alreadyAdded ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>}
      {/* ─────────────────────────────────────────────────────────────── */}

    </div>
  );

  const renderSummary = () => (
    <div
      style={{
        width: isMobile || isTablet ? '100%' : 360,
        backgroundColor: currentStep === 3 ? theme.colors.dark : theme.colors.white,
        borderRadius: isMobile ? 12 : 16,
        border: currentStep === 3 ? 'none' : `1px solid ${theme.colors.border}`,
        padding: isMobile ? 16 : 24,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20,
        position: isMobile || isTablet ? 'relative' : 'sticky',
        top: isMobile || isTablet ? 'auto' : 112,
        height: 'fit-content',
      }}
    >
      <span
        style={{
          color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark,
          fontFamily: theme.fonts.heading,
          fontSize: isMobile ? 16 : 18,
          fontWeight: 'bold',
        }}
      >
        {t('summary.title')}
      </span>

      {/* Room Preview Mini */}
      <div
        style={{
          width: '100%',
          height: isMobile ? 160 : 200,
          backgroundColor: currentStep === 3 ? theme.colors.cardDark : theme.colors.lightFill,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {renderRoomSVG(true)}
      </div>

      {/* Config Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: currentStep === 3 ? theme.colors.textMuted : theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
            {t('summary.roomShape')}
          </span>
          <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
            {roomConfigs.find((c) => c.id === selectedConfig)?.title}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 3 ? theme.colors.cardDark : theme.colors.border }} />

      {/* Pricing - only show after step 1 */}
      {currentStep >= 2 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {optimizationResult && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: currentStep === 3 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                    {t('summary.majlisCount', { count: optimizationResult.totalGlssaPieces })}
                  </span>
                  <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                    <span style={{ direction: 'ltr', display: 'inline-block' }}>{(optimizationResult.estimatedPrice).toLocaleString('en')} {t('summary.currencyShort')}</span>
                  </span>
                </div>
                {/* Extra wssada cost is folded into the majlis total — not shown separately */}
                {selectedCarpet && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: currentStep === 3 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      زربية {selectedCarpet.placements.length}× {getCarpetDisplayLabel(selectedCarpet.placements[0].carpetType, selectedCarpet.placements[0].rotated)}
                    </span>
                    <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{selectedCarpet.totalPrice.toLocaleString('en')} {t('summary.currencyShort')}</span>
                    </span>
                  </div>
                )}
                {includePoufs && poufsCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: currentStep === 3 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      بوف ×{poufsCount}
                    </span>
                    <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{(poufsCount * 800).toLocaleString('en')} {t('summary.currencyShort')}</span>
                    </span>
                  </div>
                )}
                {additionalItems.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: currentStep === 3 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      {t('summary.additionalItemsTotal')} ({additionalItems.reduce((s, i) => s + i.quantity, 0)})
                    </span>
                    <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{additionalItemsTotal.toLocaleString('en')} {t('summary.currencyShort')}</span>
                    </span>
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: currentStep === 3 ? '#808080' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                {t('summary.shipping')}
              </span>
              <span style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>{t('summary.free')}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 3 ? theme.colors.cardDark : theme.colors.border }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 15 : 16, fontWeight: 'bold' }}>
              {t('summary.total')}
            </span>
            <span style={{ color: theme.colors.primary, fontFamily: theme.fonts.english, fontSize: isMobile ? 20 : 22, fontWeight: 'bold' }}>
              <span style={{ direction: 'ltr', display: 'inline-block' }}>{getEstimatedPrice().toLocaleString('en')} {t('summary.currency')}</span>
            </span>
          </div>
        </>
      )}

      {/* Divider */}
      <div style={{ width: '100%', height: 1, backgroundColor: currentStep === 3 ? theme.colors.cardDark : theme.colors.border }} />

      {/* Action Buttons - desktop/tablet only (mobile uses sticky bottom bar) */}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleNext}
            disabled={(currentStep === 2 && isOptimizing) || isSubmitting || (currentStep === 1 && isFabricSoldOut)}
            style={{
              width: '100%',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: currentStep === 3 ? theme.colors.green : theme.colors.primary,
              cursor: ((currentStep === 2 && isOptimizing) || isSubmitting || (currentStep === 1 && isFabricSoldOut)) ? 'not-allowed' : 'pointer',
              opacity: ((currentStep === 2 && isOptimizing) || isSubmitting || (currentStep === 1 && isFabricSoldOut)) ? 0.7 : 1,
              transition: 'all 0.2s ease',
              minHeight: 48,
            }}
          >
            {isSubmitting ? (
              <Loader2 size={20} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span style={{ color: '#FFFFFF', fontFamily: theme.fonts.arabic, fontSize: 16, fontWeight: 'bold' }}>
                  {currentStep === 3 ? t('actions.confirmOrder') : currentStep === 2 ? t('actions.nextDelivery') : t('actions.nextPreview')}
                </span>
                {currentStep === 3 ? <Check size={18} color="#FFFFFF" /> : isRTL ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
              </>
            )}
          </button>

          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={{
                width: '100%',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 24px',
                borderRadius: 10,
                border: currentStep === 3 ? `1px solid ${theme.colors.cardDark}` : `1px solid ${theme.colors.border}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              {isRTL ? <ArrowRight size={18} color={currentStep === 3 ? '#FFFFFF' : theme.colors.textMedium} /> : <ArrowLeft size={18} color={currentStep === 3 ? '#FFFFFF' : theme.colors.textMedium} />}
              <span style={{ color: currentStep === 3 ? '#FFFFFF' : theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 14 }}>{t('actions.back')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Mobile sticky bottom bar
  const renderMobileBottomBar = () => {
    if (!isMobile) return null;

    const buttonLabel = currentStep === 3
      ? t('actions.confirmOrder')
      : currentStep === 2
        ? t('actions.deliveryMobile')
        : t('actions.previewMobile');

    const isDisabled = (currentStep === 2 && isOptimizing) || isSubmitting || (currentStep === 1 && isFabricSoldOut);

    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: mobileBottomOffset,
          left: 0,
          right: 0,
          zIndex: 9990,
          backgroundColor: theme.colors.white,
          borderTop: `1px solid ${theme.colors.border}`,
          padding: '12px 16px',
          paddingBottom: mobileBottomOffset > 0 ? '12px' : 'calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          fontFamily: theme.fonts.arabic,
          // Force GPU compositing layer - fixes iOS Safari position:fixed glitches during scroll
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Total line - only show after step 1 */}
        {currentStep >= 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: theme.fonts.heading, fontSize: 14, fontWeight: 'bold', color: theme.colors.textDark }}>
              {t('summary.total')}
            </span>
            <span style={{ direction: 'ltr', display: 'inline-block' }}>
              <span style={{ fontFamily: theme.fonts.heading, fontSize: 22, fontWeight: 'bold', color: theme.colors.primary }}>
                {getEstimatedPrice().toLocaleString('en')}
              </span>
              {' '}
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: 13, color: theme.colors.textMedium }}>
                {t('summary.currency')}
              </span>
            </span>
          </div>
        )}

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 48,
                flexShrink: 0,
              }}
            >
              {isRTL ? <ArrowRight size={16} color={theme.colors.textMedium} /> : <ArrowLeft size={16} color={theme.colors.textMedium} />}
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: 14, color: theme.colors.textMedium }}>{t('actions.back')}</span>
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isDisabled}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: currentStep === 3 ? theme.colors.green : theme.colors.primary,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: theme.fonts.arabic,
              fontSize: 15,
              fontWeight: 'bold',
              opacity: isDisabled ? 0.6 : 1,
              minHeight: 48,
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <Loader2 size={18} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <span style={{ color: '#FFFFFF' }}>{buttonLabel}</span>
                {currentStep === 3 ? <Check size={18} color="#FFFFFF" /> : isRTL ? <ArrowLeft size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.cream,
        fontFamily: theme.fonts.arabic,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Sticky Header */}
      <header
        style={{
          width: '100%',
          height: isMobile ? 56 : 72,
          backgroundColor: theme.colors.white,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: isMobile ? '0 12px' : isTablet ? '0 24px' : '0 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', gap: isMobile ? 6 : 12, alignItems: 'center', flexShrink: 0 }}>
          <Image
            src="/logo.jpg"
            alt="Dakhla Majalis"
            width={isMobile ? 28 : 36}
            height={isMobile ? 28 : 36}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
          {!isMobile && (
            <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.heading, fontSize: isTablet ? 14 : 17, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {t('brandName')}
            </span>
          )}
        </Link>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Help */}
        <a
          href={`https://wa.me/212657059044?text=${encodeURIComponent(whatsappHelpMessages[locale] || whatsappHelpMessages.ar)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'none',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
            padding: isMobile ? '6px 8px' : '8px 16px',
            cursor: 'pointer',
            textDecoration: 'none',
            flexShrink: 0,
            minWidth: isMobile ? 36 : 'auto',
            minHeight: isMobile ? 36 : 'auto',
            justifyContent: 'center',
          }}
        >
          <HelpCircle size={isMobile ? 16 : 18} color={theme.colors.textLight} />
          {!isMobile && (
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 13 }}>{t('help')}</span>
          )}
        </a>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile || isTablet ? 'column' : 'row',
          gap: isMobile ? 24 : isTablet ? 32 : 48,
          padding: isMobile ? '20px 16px' : isTablet ? '28px 24px' : '40px 48px',
          paddingBottom: isMobile ? 160 : 80,
          maxWidth: 1400,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Summary Panel - on top for mobile (steps 2 & 3 only) */}
        {isMobile && currentStep !== 1 && renderSummary()}

        {/* Form Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32, minWidth: 0 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

        </div>

        {/* Summary Panel - bottom for mobile step 1 */}
        {isMobile && currentStep === 1 && renderSummary()}

        {/* Sticky Summary Panel - desktop/tablet only */}
        {!isMobile && renderSummary()}
      </main>

      {/* Product Info Modal */}
      {infoProduct && (
        <div
          onClick={() => setInfoProduct(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
            animation: 'fadeInModal 0.25s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: isMobile ? 12 : 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: isMobile ? '92vh' : '80vh',
              overflowY: 'auto',
              position: 'relative',
              animation: 'slideUpModal 0.3s ease',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setInfoProduct(null)}
              style={{
                position: 'absolute',
                top: 12,
                ...(isRTL ? { right: 12 } : { left: 12 }),
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.7)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.5)'; }}
              aria-label={t('modal.close')}
            >
              <X size={18} color="#FFFFFF" />
            </button>

            {/* Main Image */}
            <div style={{ position: 'relative', width: '100%', height: isMobile ? 220 : 320, overflow: 'hidden', borderRadius: isMobile ? '12px 12px 0 0' : '16px 16px 0 0' }}>
              <Image
                src={infoMainImage || infoProduct.image}
                alt={getLocalizedField(infoProduct.title, locale)}
                fill
                style={{ objectFit: 'cover', transition: 'opacity 0.3s ease' }}
              />
            </div>

            {/* Gallery Thumbnails */}
            {infoProduct.gallery && infoProduct.gallery.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 16px',
                  overflowX: 'auto',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Main image as first thumbnail */}
                <div
                  onClick={() => setInfoMainImage(infoProduct.image)}
                  style={{
                    position: 'relative',
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: `2px solid ${(infoMainImage || infoProduct.image) === infoProduct.image ? theme.colors.primary : theme.colors.border}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Image
                    src={infoProduct.image}
                    alt={getLocalizedField(infoProduct.title, locale)}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                {infoProduct.gallery.map((img: { url: string; alt?: { ar?: string; fr?: string } }, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setInfoMainImage(img.url)}
                    style={{
                      position: 'relative',
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `2px solid ${infoMainImage === img.url ? theme.colors.primary : theme.colors.border}`,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <Image
                      src={img.url}
                      alt={getLocalizedField(img.alt, locale) || t('modal.imageAlt', { index: idx + 1 })}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: isMobile ? '16px 16px 20px' : '24px 28px 28px' }}>
              {/* Title */}
              <h2
                style={{
                  color: theme.colors.textDark,
                  fontFamily: theme.fonts.heading,
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 'bold',
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                {getLocalizedField(infoProduct.title, locale)}
              </h2>
              {/* Subtitle in alternate language */}
              <p
                style={{
                  color: theme.colors.textLight,
                  fontFamily: theme.fonts.english,
                  fontSize: isMobile ? 13 : 15,
                  margin: 0,
                  marginBottom: 16,
                  direction: 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {locale === 'fr' ? infoProduct.title.ar : infoProduct.title.fr}
              </p>

              {/* Full Description */}
              <p
                style={{
                  color: theme.colors.textMedium,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 14 : 15,
                  margin: 0,
                  lineHeight: 1.8,
                  marginBottom: 20,
                  overflowWrap: 'break-word',
                }}
              >
                {getLocalizedField(infoProduct.description, locale)}
              </p>

              {/* Content (extended description) if available */}
              {getLocalizedField(infoProduct.content, locale) && (
                <p
                  style={{
                    color: theme.colors.textMedium,
                    fontFamily: theme.fonts.arabic,
                    fontSize: isMobile ? 13 : 14,
                    margin: 0,
                    lineHeight: 1.8,
                    marginBottom: 20,
                    overflowWrap: 'break-word',
                  }}
                >
                  {getLocalizedField(infoProduct.content, locale)}
                </p>
              )}

              {/* Specifications */}
              {infoProduct.specifications && (
                (infoProduct.specifications.materials?.length > 0 ||
                 infoProduct.specifications.colors?.length > 0 ||
                 infoProduct.specifications.patterns?.length > 0) && (
                  <div style={{ marginBottom: 20 }}>
                    <h3
                      style={{
                        color: theme.colors.textDark,
                        fontFamily: theme.fonts.heading,
                        fontSize: isMobile ? 15 : 17,
                        fontWeight: 'bold',
                        margin: 0,
                        marginBottom: 12,
                      }}
                    >
                      {t('modal.specifications')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {infoProduct.specifications.materials?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, minWidth: 60, flexShrink: 0 }}>{t('modal.materials')}</span>
                          <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>{infoProduct.specifications.materials.join('، ')}</span>
                        </div>
                      )}
                      {infoProduct.specifications.colors?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, minWidth: 60, flexShrink: 0 }}>{t('modal.colors')}</span>
                          <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>{infoProduct.specifications.colors.join('، ')}</span>
                        </div>
                      )}
                      {infoProduct.specifications.patterns?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, minWidth: 60, flexShrink: 0 }}>{t('modal.patterns')}</span>
                          <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>{infoProduct.specifications.patterns.join('، ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Features / Highlights */}
              {infoProduct.features?.highlights && infoProduct.features.highlights.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3
                    style={{
                      color: theme.colors.textDark,
                      fontFamily: theme.fonts.heading,
                      fontSize: isMobile ? 15 : 17,
                      fontWeight: 'bold',
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    {t('modal.features')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {infoProduct.features.highlights.map((h: { ar?: string; fr?: string; en?: string }, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, flexShrink: 0 }} />
                        <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, lineHeight: 1.6 }}>{getLocalizedField(h, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's Included */}
              {infoProduct.features?.included && infoProduct.features.included.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      color: theme.colors.textDark,
                      fontFamily: theme.fonts.heading,
                      fontSize: isMobile ? 15 : 17,
                      fontWeight: 'bold',
                      margin: 0,
                      marginBottom: 12,
                    }}
                  >
                    {t('modal.included')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {infoProduct.features.included.map((item: { ar?: string; fr?: string; en?: string }, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Check size={14} color={theme.colors.green} />
                        <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, lineHeight: 1.6 }}>{getLocalizedField(item, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Select Button */}
              <button
                onClick={() => {
                  setSelectedProductId(infoProduct._id);
                  setErrors((prev: Record<string, string>) => ({ ...prev, product: '' }));
                  setInfoProduct(null);
                }}
                style={{
                  width: '100%',
                  padding: isMobile ? '12px 16px' : '14px 20px',
                  backgroundColor: theme.colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontFamily: theme.fonts.heading,
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                  minHeight: 48,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                {t('modal.selectThis')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Bar */}
      {renderMobileBottomBar()}
    </div>
  );
}
