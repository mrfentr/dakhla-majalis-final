// ===== CUSTOM LAYOUT EDITOR (v2) =====
// SVG-based visualization using ai-room-visualizer
// Dimension-driven: change dimensions -> auto-recalculates everything
// Supports importing existing orders for editing

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import {
  calculateGeometry,
  findOptimalDistribution,
  generateFloorPlanSVG,
  generateFloorPlanDataUrl,
  calculateFloorRect,
  selectBestCarpets,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
  type LayoutType,
  type GeometryScenario,
  type DistributionResult,
  type WallPieceDistribution,
  type PiecePosition,
  type CarpetFitResult,
  type CarpetInventory,
  type FloorRect,
  type MultiCarpetResult,
  type CarpetPlacement,
  ALL_CARPET_TYPES,
  reconstructFromOrderData,
  LAYOUT_TYPE_MAP,
} from '@/lib/ai-room-visualizer';
import { CheckCircle, Mail, Pencil, Ruler, X } from 'lucide-react';
import { formatPiecesLines } from '@/components/FormattedPiecesList';
import toast from 'react-hot-toast';
import EditPiecesPanel, { type EditableWall, generatePieceId } from './EditPiecesPanel';
import PiecePopover from './PiecePopover';
import { useGetFabricVariantById } from '@/hooks/useConvex';

// Layout type labels in French
const LAYOUT_LABELS: Record<LayoutType, string> = {
  'single-wall': 'Mur unique',
  'l-shape': 'Forme L',
  'u-shape': 'Forme U',
  'four-walls': '4 Murs',
};

// Dimension field definitions per layout type
interface DimensionField {
  key: string;
  label: string;
  min: number;
  max: number;
  placeholder: string;
}

const DIMENSION_FIELDS: Record<LayoutType, DimensionField[]> = {
  'single-wall': [
    { key: 'wallLength', label: 'Longueur du mur (cm)', min: 110, max: 2000, placeholder: '110-2000' },
  ],
  'l-shape': [
    { key: 'horizontalLength', label: 'Longueur horizontale (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'verticalLength', label: 'Longueur verticale (cm)', min: 110, max: 2000, placeholder: '110-2000' },
  ],
  'u-shape': [
    { key: 'leftLength', label: 'Mur gauche (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'centerLength', label: 'Mur supérieur (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'rightLength', label: 'Mur droit (cm)', min: 110, max: 2000, placeholder: '110-2000' },
  ],
  'four-walls': [
    { key: 'topLength', label: 'Mur supérieur (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'leftLength', label: 'Mur gauche (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'rightLength', label: 'Mur droit (cm)', min: 110, max: 2000, placeholder: '110-2000' },
    { key: 'bottomLeftLength', label: 'Bas - gauche porte (cm)', min: 0, max: 2000, placeholder: '0-2000' },
    { key: 'bottomRightLength', label: 'Bas - droit porte (cm)', min: 0, max: 2000, placeholder: '0-2000' },
  ],
};

// Default dimensions per layout type
const DEFAULT_DIMENSIONS: Record<LayoutType, Record<string, number>> = {
  'single-wall': { wallLength: 400 },
  'l-shape': { horizontalLength: 400, verticalLength: 350 },
  'u-shape': { leftLength: 350, centerLength: 500, rightLength: 350 },
  'four-walls': { topLength: 500, leftLength: 400, rightLength: 400, bottomLeftLength: 200, bottomRightLength: 200 },
};

export default function CustomLayoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Import order functionality
  const importOrderRef = searchParams?.get('importOrder') ?? null;
  const importedOrder = useQuery(
    api.orders.getOrderByReference,
    importOrderRef ? { reference: importOrderRef } : 'skip'
  );
  const updateOrderLayout = useMutation(api.orders.updateOrderLayout);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);
  const [importedOrderId, setImportedOrderId] = useState<Id<"orders"> | null>(null);
  const [hasImported, setHasImported] = useState(false);

  // Fetch fabric variant for stock-aware carpet inventory
  // @ts-ignore - selectedMajalisProduct might exist on order
  const fabricVariantId = importedOrder?.selectedMajalisProduct?.fabricVariantId ?? null;
  const fabricVariant = useGetFabricVariantById(fabricVariantId || null);

  // Core state
  const [layoutType, setLayoutType] = useState<LayoutType>('l-shape');
  const [dimensions, setDimensions] = useState<Record<string, number>>(DEFAULT_DIMENSIONS['l-shape']);

  // Computed state (auto-recalculated)
  const [scenario, setScenario] = useState<GeometryScenario | null>(null);
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [svgRaw, setSvgRaw] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Carpet state (multi-carpet combos)
  const [carpetCombo, setCarpetCombo] = useState<MultiCarpetResult | null>(null);
  const [allCombos, setAllCombos] = useState<MultiCarpetResult[]>([]);
  const [includeCarpet, setIncludeCarpet] = useState(false);

  // Poufs state
  const PRICE_PER_POUF = 800;
  const [includePoufs, setIncludePoufs] = useState(false);
  const [poufsCount, setPoufsCount] = useState(2);

  // Edit mode state — starts as 'auto', pendingEditMode switches to 'edit' after import calculation
  const [activeTab, setActiveTab] = useState<'auto' | 'edit'>('auto');
  const [editedWalls, setEditedWalls] = useState<EditableWall[]>([]);

  // UI state
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [pendingEmailData, setPendingEmailData] = useState<{
    imageBlob: Blob | null;
    products: { name: string; productType: string; quantity: number; unitPrice: number; totalPrice: number }[];
    pricing: { subtotal: number; total: number; currency: string };
    piecesList: string[];
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Debug panel state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const addDebugLog = useCallback((msg: string) => {
    setDebugLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Ref for the SVG image container (for export)
  const svgImgRef = useRef<HTMLImageElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const transformTargetRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const pendingEditMode = useRef(false);
  const importJustCompleted = useRef(false); // Guard: skip effect-driven SVG regeneration for one render cycle after import
  const needsZoomFit = useRef(false); // Auto-fit zoom after import SVG is rendered
  const importedOrderHadCarpet = useRef<boolean | null>(null); // null = not importing, true/false = imported order had/didn't have carpet
  const pendingCarpetImport = useRef<{ combo: MultiCarpetResult; overrides: Record<number, { posX: number; posY: number }> } | null>(null);
  const panDistanceRef = useRef(0);
  // Smooth pan/zoom: refs for real-time transforms, state for UI sync
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const pinchMidRef = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);
  const rafIdRef = useRef<number>(0);
  const touchStartTime = useRef(0);
  const touchStartPoint = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Carpet drag state
  const [carpetPositionOverrides, setCarpetPositionOverrides] = useState<Record<number, { posX: number; posY: number }>>({});
  const draggingCarpetRef = useRef<{ index: number; startX: number; startY: number; origPosX: number; origPosY: number } | null>(null);
  const SVG_SCALE = 0.6;

  // Click-to-select piece state
  const [selectedPiece, setSelectedPiece] = useState<{
    wallId: string;
    pieceIndex: number;
    category: 'glssa' | 'wssada' | 'carpet';
    anchorRect: DOMRect;
  } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // ===== BUILD DISTRIBUTION FROM MANUAL EDITS =====
  const buildDistributionFromEdits = useCallback((walls: EditableWall[]): DistributionResult => {
    const distWalls: WallPieceDistribution[] = walls.map((wall) => {
      let gPos = 0;
      const glssaPieces: PiecePosition[] = wall.glssaPieces.map((p) => {
        const piece: PiecePosition = {
          size: p.size,
          startPosition: gPos,
          endPosition: gPos + p.size,
          isCornerPiece: false,
        };
        gPos += p.size;
        return piece;
      });

      let wPos = 0;
      const wssadaPieces: PiecePosition[] = wall.wssadaPieces.map((p) => {
        const piece: PiecePosition = {
          size: p.size,
          startPosition: wPos,
          endPosition: wPos + p.size,
          isCornerPiece: p.isCornerPiece,
        };
        wPos += p.size;
        return piece;
      });

      const glssaTotal = glssaPieces.reduce((s, p) => s + p.size, 0);
      const wssadaTotal = wssadaPieces.reduce((s, p) => s + p.size, 0);

      return {
        wallId: wall.wallId,
        glssaEffective: wall.glssaEffective,
        wssadaEffective: wall.wssadaEffective,
        glssaPieces,
        wssadaPieces,
        glssaTotal,
        wssadaTotal,
        glssaVoid: Math.max(0, wall.glssaEffective - glssaTotal),
        wssadaVoid: Math.max(0, wall.wssadaEffective - wssadaTotal),
        wssadaSide: wall.wssadaSide as 'top' | 'bottom' | 'left' | 'right',
      };
    });

    return {
      success: true,
      walls: distWalls,
      totalGlssaPieces: distWalls.reduce((s, w) => s + w.glssaPieces.length, 0),
      totalWssadaPieces: distWalls.reduce((s, w) => s + w.wssadaPieces.length, 0),
      totalCornerPieces: distWalls.reduce(
        (s, w) => s + w.wssadaPieces.filter((p) => p.isCornerPiece).length,
        0
      ),
      errors: [],
    };
  }, []);

  // ===== GET EFFECTIVE PLACEMENTS (with drag overrides) =====
  const getEffectivePlacements = useCallback(() => {
    if (!carpetCombo) return [];
    return carpetCombo.placements.map((p, i) => {
      const override = carpetPositionOverrides[i];
      return override ? { ...p, posX: override.posX, posY: override.posY } : p;
    });
  }, [carpetCombo, carpetPositionOverrides]);

  // ===== CARPET: Add / Remove individual carpets =====
  const handleAddCarpet = useCallback(() => {
    if (!carpetCombo) return;
    const floorRect = calculateFloorRect(layoutType, dimensions);
    if (!floorRect) return;

    // Use the same carpet type as the first placement in the current combo
    const refPlacement = carpetCombo.placements[0];
    const carpetType = refPlacement.carpetType;
    const rotated = refPlacement.rotated;
    const fitWidth = rotated ? carpetType.heightCm : carpetType.widthCm;
    const fitHeight = rotated ? carpetType.widthCm : carpetType.heightCm;

    // Position the new carpet: try to stack it next to existing ones
    const existingCount = carpetCombo.placements.length;
    // Simple heuristic: try horizontal then vertical stacking, fallback to center
    let posX = (floorRect.width - fitWidth) / 2;
    let posY = (floorRect.height - fitHeight) / 2;

    // Try placing beside the last carpet horizontally
    const lastPlacement = carpetCombo.placements[existingCount - 1];
    const lastOverride = carpetPositionOverrides[existingCount - 1];
    const lastPosX = lastOverride ? lastOverride.posX : lastPlacement.posX;
    const lastPosY = lastOverride ? lastOverride.posY : lastPlacement.posY;
    if (lastPosX + lastPlacement.fitWidth + fitWidth <= floorRect.width) {
      posX = lastPosX + lastPlacement.fitWidth;
      posY = lastPosY;
    } else if (lastPosY + lastPlacement.fitHeight + fitHeight <= floorRect.height) {
      posX = lastPosX;
      posY = lastPosY + lastPlacement.fitHeight;
    }

    const newPlacement: CarpetPlacement = {
      carpetType,
      rotated,
      fitWidth,
      fitHeight,
      posX,
      posY,
    };

    const newPlacements = [...carpetCombo.placements, newPlacement];
    const floorArea = floorRect.width * floorRect.height;
    const newTotalPrice = newPlacements.reduce((sum, p) => sum + p.carpetType.price, 0);
    const newCoveredArea = newPlacements.reduce((sum, p) => sum + p.fitWidth * p.fitHeight, 0);
    const newCoveragePercent = Math.min((newCoveredArea / floorArea) * 100, 100);

    // Rebuild stock usage
    const newStockUsage: Record<number, number> = {};
    for (const p of newPlacements) {
      const baseId = 'baseTypeId' in p.carpetType ? p.carpetType.baseTypeId : p.carpetType.id;
      const qty = 'baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1;
      newStockUsage[baseId] = (newStockUsage[baseId] || 0) + qty;
    }

    const newCombo: MultiCarpetResult = {
      placements: newPlacements,
      totalCoveragePercent: newCoveragePercent,
      totalCoveredArea: Math.min(newCoveredArea, floorArea),
      totalGap: Math.max(0, floorArea - newCoveredArea),
      totalPrice: newTotalPrice,
      stockUsage: newStockUsage,
    };

    setCarpetCombo(newCombo);
    setCarpetPositionOverrides({});
  }, [carpetCombo, layoutType, dimensions, carpetPositionOverrides]);

  const handleRemoveCarpet = useCallback((index: number) => {
    if (!carpetCombo || carpetCombo.placements.length <= 1) return;
    const floorRect = calculateFloorRect(layoutType, dimensions);
    if (!floorRect) return;

    const newPlacements = carpetCombo.placements.filter((_, i) => i !== index);
    const floorArea = floorRect.width * floorRect.height;
    const newTotalPrice = newPlacements.reduce((sum, p) => sum + p.carpetType.price, 0);
    const newCoveredArea = newPlacements.reduce((sum, p) => sum + p.fitWidth * p.fitHeight, 0);
    const newCoveragePercent = Math.min((newCoveredArea / floorArea) * 100, 100);

    // Rebuild stock usage
    const newStockUsage: Record<number, number> = {};
    for (const p of newPlacements) {
      const baseId = 'baseTypeId' in p.carpetType ? p.carpetType.baseTypeId : p.carpetType.id;
      const qty = 'baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1;
      newStockUsage[baseId] = (newStockUsage[baseId] || 0) + qty;
    }

    const newCombo: MultiCarpetResult = {
      placements: newPlacements,
      totalCoveragePercent: newCoveragePercent,
      totalCoveredArea: Math.min(newCoveredArea, floorArea),
      totalGap: Math.max(0, floorArea - newCoveredArea),
      totalPrice: newTotalPrice,
      stockUsage: newStockUsage,
    };

    setCarpetCombo(newCombo);
    // Rebuild position overrides: shift indices for remaining carpets
    const newOverrides: Record<number, { posX: number; posY: number }> = {};
    Object.entries(carpetPositionOverrides).forEach(([key, val]) => {
      const oldIdx = parseInt(key);
      if (oldIdx < index) {
        newOverrides[oldIdx] = val;
      } else if (oldIdx > index) {
        newOverrides[oldIdx - 1] = val;
      }
      // Skip the removed index
    });
    setCarpetPositionOverrides(newOverrides);
  }, [carpetCombo, layoutType, dimensions, carpetPositionOverrides]);

  const handleChangeCarpetType = useCallback((index: number, newTypeId: number) => {
    if (!carpetCombo) return;
    const newType = ALL_CARPET_TYPES.find(ct => ct.id === newTypeId);
    if (!newType) return;

    const updatedPlacements = carpetCombo.placements.map((p, i) => {
      if (i !== index) return p;
      return {
        ...p,
        carpetType: newType,
        fitWidth: p.rotated ? newType.heightCm : newType.widthCm,
        fitHeight: p.rotated ? newType.widthCm : newType.heightCm,
      };
    });

    const newTotalPrice = updatedPlacements.reduce((sum, p) => sum + p.carpetType.price, 0);
    setCarpetCombo({
      ...carpetCombo,
      placements: updatedPlacements,
      totalPrice: newTotalPrice,
    });
  }, [carpetCombo]);

  const handleToggleCarpetRotation = useCallback((index: number) => {
    if (!carpetCombo) return;

    const updatedPlacements = carpetCombo.placements.map((p, i) => {
      if (i !== index) return p;
      return {
        ...p,
        rotated: !p.rotated,
        fitWidth: p.fitHeight,
        fitHeight: p.fitWidth,
      };
    });

    setCarpetCombo({
      ...carpetCombo,
      placements: updatedPlacements,
    });
  }, [carpetCombo]);

  // ===== INITIALIZE EDIT MODE from current auto distribution =====
  const initializeEditMode = useCallback(() => {
    if (!distribution) return;
    const walls: EditableWall[] = distribution.walls.map((w) => ({
      wallId: w.wallId,
      glssaEffective: w.glssaEffective,
      wssadaEffective: w.wssadaEffective,
      wssadaSide: w.wssadaSide,
      glssaPieces: w.glssaPieces.map((p) => ({
        id: generatePieceId(),
        size: p.size,
        isCornerPiece: p.isCornerPiece || false,
      })),
      wssadaPieces: w.wssadaPieces.map((p) => ({
        id: generatePieceId(),
        size: p.size,
        isCornerPiece: p.isCornerPiece || false,
      })),
    }));
    setEditedWalls(walls);
  }, [distribution]);

  // ===== TAB CHANGE HANDLER =====
  const handleTabChange = useCallback((tab: 'auto' | 'edit') => {
    setSelectedPiece(null);
    if (tab === 'edit' && distribution) {
      initializeEditMode();
    }
    setActiveTab(tab);
  }, [distribution, initializeEditMode]);

  // ===== EDIT MODE: Rebuild SVG when edited walls change =====
  useEffect(() => {
    if (activeTab !== 'edit' || !scenario || editedWalls.length === 0) {
      addDebugLog(`Edit effect: skipped (activeTab=${activeTab}, scenario=${!!scenario}, walls=${editedWalls.length})`);
      return;
    }

    // Reset import guard — if we reach here, all state is settled and
    // we can generate SVG normally (including after an import).
    const isPostImport = importJustCompleted.current;
    if (isPostImport) {
      importJustCompleted.current = false;
      needsZoomFit.current = true;
      addDebugLog('Edit effect: cleared importJustCompleted flag, will auto-fit zoom');
    }

    try {
      const editDist = buildDistributionFromEdits(editedWalls);
      setDistribution(editDist);

      const floorRect = calculateFloorRect(layoutType, dimensions);
      const effectivePlacements = getEffectivePlacements();
      const carpetInput = includeCarpet && carpetCombo && floorRect ? {
        carpets: effectivePlacements.map(p => ({
          widthCm: p.fitWidth, heightCm: p.fitHeight,
          posX: p.posX, posY: p.posY,
          label: getCarpetDisplayLabel(p.carpetType, p.rotated),
          floorRect,
        }))
      } : {};

      const input = { layoutType, geometry: scenario, distribution: editDist, ...carpetInput, poufsCount: includePoufs ? poufsCount : 0 };
      const svg = generateFloorPlanSVG(input);
      const dataUrl = generateFloorPlanDataUrl(input);

      setSvgRaw(svg);
      setSvgDataUrl(dataUrl);
      setCalcError(null);
      addDebugLog(`Edit effect: SVG generated (len=${svg.length}, walls=${editDist.walls.length}, carpet=${!!carpetInput.carpets})`);

      // Auto-fit zoom after import so the SVG is visible immediately
      if (needsZoomFit.current) {
        needsZoomFit.current = false;
        // Small delay to let the DOM render the SVG before measuring
        setTimeout(() => {
          const container = canvasContainerRef.current;
          if (container) {
            const svgEl = container.querySelector('#svg-canvas svg') || container.querySelector('img');
            if (svgEl) {
              const svgW = svgEl.scrollWidth || (svgEl as HTMLImageElement).naturalWidth || svgEl.clientWidth;
              const svgH = svgEl.scrollHeight || (svgEl as HTMLImageElement).naturalHeight || svgEl.clientHeight;
              if (svgW && svgH) {
                const padding = 80;
                const cW = container.clientWidth - padding;
                const cH = container.clientHeight - padding;
                const fitZoom = Math.min(cW / svgW, cH / svgH, 3);
                setZoom(fitZoom);
                setPan({ x: 0, y: 0 });
              }
            }
          }
          addDebugLog('Edit effect: auto-fit zoom applied after import');
        }, 150);
      }
    } catch (err: any) {
      console.error('[CustomPage] Edit SVG error:', err);
      addDebugLog(`Edit effect: ERROR - ${err.message}`);
      // Don't clear existing SVG — keep showing the last valid render
      // so the user can see their layout while fixing the issue
    }
  }, [activeTab, editedWalls, scenario, layoutType, buildDistributionFromEdits, includeCarpet, carpetCombo, dimensions, includePoufs, poufsCount, getEffectivePlacements, addDebugLog]);

  // ===== REGENERATE SVG when carpet selection changes =====
  useEffect(() => {
    // After import, the edit-mode effect handles the first SVG generation.
    // Skip this effect to avoid overwriting with potentially stale closure data.
    if (importJustCompleted.current) {
      addDebugLog('Carpet effect: skipped (importJustCompleted)');
      return;
    }
    if (!scenario || !distribution) {
      addDebugLog(`Carpet effect: skipped (scenario=${!!scenario}, distribution=${!!distribution})`);
      return;
    }
    const floorRect = calculateFloorRect(layoutType, dimensions);
    const effectivePlacements = getEffectivePlacements();
    const carpetInput = includeCarpet && carpetCombo && floorRect ? {
      carpets: effectivePlacements.map(p => ({
        widthCm: p.fitWidth, heightCm: p.fitHeight,
        posX: p.posX, posY: p.posY,
        label: getCarpetDisplayLabel(p.carpetType, p.rotated),
        floorRect,
      }))
    } : {};
    const input = { layoutType, geometry: scenario, distribution, ...carpetInput, poufsCount: includePoufs ? poufsCount : 0 };
    try {
      const raw = generateFloorPlanSVG(input);
      const dataUrl = generateFloorPlanDataUrl(input);
      setSvgRaw(raw);
      setSvgDataUrl(dataUrl);
      addDebugLog(`Carpet effect: SVG generated (len=${raw.length}, carpets=${carpetInput.carpets?.length ?? 0})`);
    } catch (e: any) {
      console.error('SVG regeneration failed:', e);
      addDebugLog(`Carpet effect: ERROR - ${e.message}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCarpet, carpetCombo, includePoufs, poufsCount, carpetPositionOverrides]);

  // ===== AUTO-RECALCULATE on dimension/layout changes =====
  useEffect(() => {
    if (activeTab === 'edit') {
      addDebugLog(`Auto-calc effect: skipped (activeTab=edit)`);
      return;
    }
    addDebugLog(`Auto-calc effect: running (layoutType=${layoutType}, dims=${JSON.stringify(dimensions)})`);
    try {
      // Validate that we have meaningful dimensions
      const fields = DIMENSION_FIELDS[layoutType];
      const allValid = fields.every(f => {
        const val = dimensions[f.key];
        // For four-walls bottom segments, 0 is valid (no bottom wall)
        if (f.key === 'bottomLeftLength' || f.key === 'bottomRightLength') {
          return val !== undefined && val >= 0;
        }
        return val !== undefined && val >= f.min;
      });

      if (!allValid) {
        setCalcError('Veuillez saisir toutes les dimensions correctement');
        setSvgDataUrl(null);
        setSvgRaw(null);

        setScenario(null);
        setDistribution(null);
        return;
      }

      // Step 1: Calculate geometry
      const geom = calculateGeometry(layoutType, dimensions);

      // Step 2: Find optimal distribution across ALL corner ownership scenarios
      let bestScenario: GeometryScenario;
      let dist: DistributionResult;
      try {
        const optimal = findOptimalDistribution(geom);
        bestScenario = optimal.scenario;
        dist = optimal.distribution;
      } catch {
        setCalcError('Dimensions invalides. Aucun scénario géométrique disponible.');
        setSvgDataUrl(null);
        setSvgRaw(null);
        setScenario(null);
        setDistribution(null);
        return;
      }
      setScenario(bestScenario);
      setDistribution(dist);

      // Step 3: Generate SVG (with carpet if enabled)
      const floorRect = calculateFloorRect(layoutType, dimensions);
      const effectivePlacements = getEffectivePlacements();
      const carpetInput = includeCarpet && carpetCombo && floorRect ? {
        carpets: effectivePlacements.map(p => ({
          widthCm: p.fitWidth, heightCm: p.fitHeight,
          posX: p.posX, posY: p.posY,
          label: getCarpetDisplayLabel(p.carpetType, p.rotated),
          floorRect,
        }))
      } : {};

      const input = { layoutType, geometry: bestScenario, distribution: dist, ...carpetInput, poufsCount: includePoufs ? poufsCount : 0 };
      const svg = generateFloorPlanSVG(input);
      const dataUrl = generateFloorPlanDataUrl(input);

      setSvgRaw(svg);
      setSvgDataUrl(dataUrl);
      setCalcError(null);

      // Compute carpet combo options
      // Skip carpet computation entirely if the imported order had no carpet
      if (floorRect && importedOrderHadCarpet.current !== false) {
        // Use real fabric variant stock when available, otherwise fall back to large default
        const carpetInventory: CarpetInventory = fabricVariant ? {
          1: fabricVariant.stock.zerbiyaType1 ?? 0,
          2: fabricVariant.stock.zerbiyaType2 ?? 0,
          3: fabricVariant.stock.zerbiyaType3 ?? 0,
          4: fabricVariant.stock.zerbiyaType4 ?? 0,
        } : { 1: 999, 2: 999, 3: 999, 4: 999 };
        const combos = selectBestCarpetCombo(floorRect, carpetInventory);
        setAllCombos(combos);

        // Check if we have pending carpet import data from an imported order
        if (pendingCarpetImport.current) {
          const { combo: importedCombo, overrides } = pendingCarpetImport.current;
          pendingCarpetImport.current = null; // Clear after use

          // Recalculate coverage metrics using actual floor dimensions
          const floorArea = floorRect.width * floorRect.height;
          let totalCoveredArea = 0;
          for (const p of importedCombo.placements) {
            const px = p.posX;
            const py = p.posY;
            const x1 = Math.max(px, 0);
            const y1 = Math.max(py, 0);
            const x2 = Math.min(px + p.fitWidth, floorRect.width);
            const y2 = Math.min(py + p.fitHeight, floorRect.height);
            if (x2 > x1 && y2 > y1) {
              totalCoveredArea += (x2 - x1) * (y2 - y1);
            }
          }
          importedCombo.totalCoveredArea = totalCoveredArea;
          importedCombo.totalCoveragePercent = floorArea > 0 ? Math.min((totalCoveredArea / floorArea) * 100, 100) : 0;
          importedCombo.totalGap = Math.max(0, floorArea - totalCoveredArea);

          // Add imported combo to the list if not already present, and select it
          const alreadyInList = combos.some(c =>
            c.placements.length === importedCombo.placements.length &&
            c.placements.every((p, i) => p.carpetType.id === importedCombo.placements[i]?.carpetType.id && p.rotated === importedCombo.placements[i]?.rotated)
          );
          if (!alreadyInList) {
            combos.unshift(importedCombo);
            setAllCombos([...combos]);
          }

          setCarpetCombo(importedCombo);
          setCarpetPositionOverrides(overrides);
          setIncludeCarpet(true);
          console.log('[CustomPage] Applied imported carpet combo:', { placements: importedCombo.placements.length, totalPrice: importedCombo.totalPrice });

          // Reset the importedOrderHadCarpet flag
          importedOrderHadCarpet.current = null;
        } else {
          setCarpetPositionOverrides({}); // Reset drag overrides on dimension change
          if (combos.length > 0 && !carpetCombo) {
            setCarpetCombo(combos[0]);
            // Only auto-enable carpet if this is NOT an import, or the imported order actually had carpet
            if (importedOrderHadCarpet.current === null || importedOrderHadCarpet.current === true) {
              setIncludeCarpet(true);
            }
            // Reset the flag after using it (so future dimension changes behave normally)
            if (importedOrderHadCarpet.current !== null) {
              importedOrderHadCarpet.current = null;
            }
          }
        }
      } else if (floorRect && importedOrderHadCarpet.current === false) {
        // Imported order had no carpet — clear carpet state entirely
        setAllCombos([]);
        setCarpetCombo(null);
        setCarpetPositionOverrides({});
        setIncludeCarpet(false);
        // Reset the flag so future manual dimension changes can compute combos normally
        importedOrderHadCarpet.current = null;
      } else {
        setAllCombos([]);
        setCarpetCombo(null);
        setCarpetPositionOverrides({});
      }

      if (pendingEditMode.current) {
        pendingEditMode.current = false;
        // Initialize edit mode directly to avoid dependency cycle with handleTabChange
        const editWalls: EditableWall[] = dist.walls.map((w) => ({
          wallId: w.wallId,
          glssaEffective: w.glssaEffective,
          wssadaEffective: w.wssadaEffective,
          wssadaSide: w.wssadaSide,
          glssaPieces: w.glssaPieces.map((p) => ({
            id: generatePieceId(),
            size: p.size,
            isCornerPiece: p.isCornerPiece || false,
          })),
          wssadaPieces: w.wssadaPieces.map((p) => ({
            id: generatePieceId(),
            size: p.size,
            isCornerPiece: p.isCornerPiece || false,
          })),
        }));
        setEditedWalls(editWalls);
        setActiveTab('edit');
      }
    } catch (err: any) {
      console.error('[CustomPage] Calculation error:', err);
      setCalcError(err.message || 'Erreur de calcul');
      setSvgDataUrl(null);
      setSvgRaw(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutType, dimensions, activeTab, fabricVariant]);

  // ===== IMPORT ORDER =====
  useEffect(() => {
    if (importedOrder && !hasImported) {
      console.log('[CustomPage] Importing order:', importedOrder.reference);
      addDebugLog(`Import: started for order ${importedOrder.reference}`);
      setImportedOrderId(importedOrder._id);

      const roomMeasurements = importedOrder.roomMeasurements as any;
      if (!roomMeasurements) {
        console.error('[CustomPage] No room measurements in order');
        setHasImported(true);
        return;
      }

      const optData = (importedOrder as any).optimizationData;

      // ── Carpet reconstruction (needed by both paths) ──
      const calcs = importedOrder.calculations as any;
      const orderHadCarpet = !!(
        (calcs?.totalZerbiya && calcs.totalZerbiya > 0) ||
        (calcs?.carpetSelections && calcs.carpetSelections.length > 0) ||
        (calcs?.carpetSelection)
      );
      importedOrderHadCarpet.current = orderHadCarpet;
      console.log('[CustomPage] Import order carpet check:', { orderHadCarpet, totalZerbiya: calcs?.totalZerbiya, carpetSelections: calcs?.carpetSelections?.length });

      if (orderHadCarpet) {
        setIncludeCarpet(true);

        const savedSelections = calcs?.carpetSelections || optData?.carpetSelections || [];
        if (savedSelections.length > 0) {
          const placements: CarpetPlacement[] = [];
          const overrides: Record<number, { posX: number; posY: number }> = {};
          let totalPrice = 0;
          const stockUsage: Record<number, number> = {};

          for (let i = 0; i < savedSelections.length; i++) {
            const sel = savedSelections[i];
            const carpetType = ALL_CARPET_TYPES.find(ct => ct.id === sel.carpetTypeId);
            if (!carpetType) {
              console.warn('[CustomPage] Could not find carpet type for id:', sel.carpetTypeId);
              continue;
            }

            placements.push({
              carpetType,
              rotated: sel.rotated || false,
              fitWidth: sel.widthCm,
              fitHeight: sel.heightCm,
              posX: sel.posX ?? 0,
              posY: sel.posY ?? 0,
            });

            if (sel.posX !== undefined && sel.posY !== undefined) {
              overrides[i] = { posX: sel.posX, posY: sel.posY };
            }

            totalPrice += sel.price || carpetType.price;
            const baseId = sel.baseTypeConsumed || ('baseTypeId' in carpetType ? carpetType.baseTypeId : carpetType.id);
            const baseQty = sel.baseTypeQuantity || ('baseTypeId' in carpetType ? carpetType.baseQuantity : 1);
            stockUsage[baseId] = (stockUsage[baseId] || 0) + baseQty;
          }

          if (placements.length > 0) {
            const combo: MultiCarpetResult = {
              placements,
              totalCoveragePercent: 0,
              totalCoveredArea: 0,
              totalGap: 0,
              totalPrice,
              stockUsage,
            };

            pendingCarpetImport.current = { combo, overrides };
            console.log('[CustomPage] Prepared pending carpet import:', { placements: placements.length, totalPrice });
          }
        }
      } else {
        setIncludeCarpet(false);
      }

      // ── Poufs reconstruction (needed by both paths) ──
      const orderPoufsCount = calcs?.poufsCount || optData?.poufs?.count || 0;
      if (orderPoufsCount > 0) {
        setIncludePoufs(true);
        setPoufsCount(orderPoufsCount);
        console.log('[CustomPage] Import order poufs:', { poufsCount: orderPoufsCount });
      } else {
        setIncludePoufs(false);
      }

      // ── Try direct reconstruction first ──
      const reconstructed = reconstructFromOrderData(optData, roomMeasurements);

      if (reconstructed) {
        // Direct load — no re-optimization needed
        console.log('[CustomPage] Reconstruction succeeded, loading directly:', { layoutType: reconstructed.layoutType, dimensions: reconstructed.dimensions });
        addDebugLog(`Import: reconstruction succeeded, layoutType=${reconstructed.layoutType}, dims=${JSON.stringify(reconstructed.dimensions)}, walls=${reconstructed.distribution.walls.length}`);

        setLayoutType(reconstructed.layoutType);
        setDimensions(reconstructed.dimensions);
        setScenario(reconstructed.scenario);
        setDistribution(reconstructed.distribution);

        // Convert distribution to editable walls
        const editWalls: EditableWall[] = reconstructed.distribution.walls.map((w) => ({
          wallId: w.wallId,
          glssaEffective: w.glssaEffective,
          wssadaEffective: w.wssadaEffective,
          wssadaSide: w.wssadaSide,
          glssaPieces: w.glssaPieces.map((p) => ({
            id: generatePieceId(),
            size: p.size,
            isCornerPiece: p.isCornerPiece || false,
          })),
          wssadaPieces: w.wssadaPieces.map((p) => ({
            id: generatePieceId(),
            size: p.size,
            isCornerPiece: p.isCornerPiece || false,
          })),
        }));
        setEditedWalls(editWalls);
        setActiveTab('edit');

        // Apply pending carpet import data (set carpet state now, SVG will
        // be generated by the edit-mode effect on the next render cycle
        // when all state has settled).
        if (pendingCarpetImport.current) {
          const { combo: importedCombo, overrides } = pendingCarpetImport.current;
          pendingCarpetImport.current = null;

          const floorRect = calculateFloorRect(reconstructed.layoutType, reconstructed.dimensions);
          if (floorRect) {
            const floorArea = floorRect.width * floorRect.height;
            let totalCoveredArea = 0;
            for (const p of importedCombo.placements) {
              const px = p.posX;
              const py = p.posY;
              const x1 = Math.max(px, 0);
              const y1 = Math.max(py, 0);
              const x2 = Math.min(px + p.fitWidth, floorRect.width);
              const y2 = Math.min(py + p.fitHeight, floorRect.height);
              if (x2 > x1 && y2 > y1) {
                totalCoveredArea += (x2 - x1) * (y2 - y1);
              }
            }
            importedCombo.totalCoveredArea = totalCoveredArea;
            importedCombo.totalCoveragePercent = floorArea > 0 ? Math.min((totalCoveredArea / floorArea) * 100, 100) : 0;
            importedCombo.totalGap = Math.max(0, floorArea - totalCoveredArea);
          }

          setCarpetCombo(importedCombo);
          setAllCombos([importedCombo]);
          setCarpetPositionOverrides(overrides);
          setIncludeCarpet(true);
          importedOrderHadCarpet.current = null;
          console.log('[CustomPage] Applied imported carpet combo:', { placements: importedCombo.placements.length, totalPrice: importedCombo.totalPrice });
        }

        // Let the edit-mode effect generate SVG on the next render cycle,
        // when all state (scenario, distribution, editedWalls, carpet, poufs)
        // is fully settled and available in the closures.
        // The importJustCompleted flag tells the carpet effect to skip its
        // first cycle so only the edit-mode effect produces the SVG.
        importJustCompleted.current = true;
        // Reset zoom/pan so imported SVG starts centered
        setZoom(1);
        setPan({ x: 0, y: 0 });
        addDebugLog('Import: state set, importJustCompleted=true, effects will generate SVG on next render');
      } else {
        // Fallback: old behavior — extract dims and trigger recalc via pendingEditMode
        console.log('[CustomPage] Reconstruction failed, falling back to re-optimization');
        addDebugLog('Import: reconstruction failed, falling back to re-optimization');

        const layoutTypeMap: Record<string, LayoutType> = LAYOUT_TYPE_MAP;
        const orderLayoutType = layoutTypeMap[roomMeasurements.layoutType] || 'l-shape';

        const dims = optData?.dimensions || roomMeasurements.dimensions || {};
        const rmWidth = roomMeasurements.width || 0;
        const rmHeight = roomMeasurements.height || 0;
        const optLayoutType = optData?.layoutType;
        const finalLayoutType = optLayoutType
          ? (layoutTypeMap[optLayoutType] || orderLayoutType)
          : orderLayoutType;

        const pickDim = (...candidates: (number | undefined)[]): number => {
          for (const c of candidates) {
            if (c !== undefined && c > 0) return c;
          }
          return 0;
        };

        let extractedDimensions: Record<string, number> = {};

        switch (finalLayoutType) {
          case 'single-wall':
            extractedDimensions = {
              wallLength: pickDim(dims.wallLength, dims.singleWall, dims.single, dims.length, rmWidth) || 400,
            };
            break;
          case 'l-shape':
            extractedDimensions = {
              horizontalLength: pickDim(dims.horizontalLength, dims.lShapeH, dims.h, dims.horizontal, rmWidth) || 400,
              verticalLength: pickDim(dims.verticalLength, dims.lShapeV, dims.v, dims.vertical, rmHeight) || 350,
            };
            break;
          case 'u-shape':
            extractedDimensions = {
              leftLength: pickDim(dims.leftLength, dims.uShapeL, dims.l, dims.left, rmHeight) || 350,
              centerLength: pickDim(dims.centerLength, dims.uShapeH, dims.c, dims.center, dims.top, rmWidth) || 500,
              rightLength: pickDim(dims.rightLength, dims.uShapeR, dims.r, dims.right, rmHeight) || 350,
            };
            break;
          case 'four-walls':
            extractedDimensions = {
              topLength: pickDim(dims.topLength, dims.fourWallsTop, dims.top, rmWidth) || 500,
              leftLength: pickDim(dims.leftLength, dims.fourWallsLeft, dims.left, rmHeight) || 400,
              rightLength: pickDim(dims.rightLength, dims.fourWallsRight, dims.right, rmHeight) || 400,
              bottomLeftLength: pickDim(dims.bottomLeftLength, dims.fourWallsBottomLeft, dims.bottomLeft, dims.leftToDoor),
              bottomRightLength: pickDim(dims.bottomRightLength, dims.fourWallsBottomRight, dims.bottomRight, dims.doorToRight),
            };
            break;
        }

        console.log('[CustomPage] Import order dims:', { finalLayoutType, dims, rmWidth, rmHeight, extractedDimensions });

        setLayoutType(finalLayoutType);
        setDimensions(extractedDimensions);
        pendingEditMode.current = true;
      }

      setHasImported(true);
      console.log('[CustomPage] Import complete');
    }
  }, [importedOrder, hasImported]);

  // ===== LAYOUT TYPE CHANGE =====
  const handleLayoutTypeChange = useCallback((newType: LayoutType) => {
    setActiveTab('auto');
    setLayoutType(newType);
    setDimensions(DEFAULT_DIMENSIONS[newType]);
    setShowLayoutPicker(false);
  }, []);

  // ===== DIMENSION CHANGE =====
  const handleDimensionChange = useCallback((key: string, value: number) => {
    setDimensions(prev => ({ ...prev, [key]: value }));
  }, []);

  // ===== STATISTICS =====
  const stats = useMemo(() => {
    if (!distribution) return { glssa: 0, wssada: 0, cornerPieces: 0, extraWssada: 0, total: 0 };
    const glssa = distribution.totalGlssaPieces;
    const wssada = distribution.totalWssadaPieces;
    const extraWssada = Math.max(0, wssada - glssa * 2);
    return {
      glssa,
      wssada,
      cornerPieces: distribution.totalCornerPieces,
      extraWssada,
      total: glssa + wssada,
    };
  }, [distribution]);

  // ===== PIECES LIST (for image overlay and save) =====
  const formatPiecesList = useCallback((): string[] => {
    if (!distribution) return [];
    const allGlssa = distribution.walls.flatMap(w => w.glssaPieces.map(p => p.size));
    const allWssada = distribution.walls.flatMap(w => w.wssadaPieces.map(p => p.size));
    return formatPiecesLines(allGlssa, allWssada, stats.glssa, includePoufs ? poufsCount : 0);
  }, [distribution, stats.glssa, includePoufs, poufsCount]);

  // ===== EXPORT AS JPEG =====
  const handleExport = useCallback(async () => {
    if (!svgDataUrl || isSaving) return;
    setIsSaving(true);

    try {
      const img = new Image();
      img.onload = () => {
        const dataLines = formatPiecesList();
        const scale = 4;
        const lineHeight = 7;
        const padding = 10;
        const dataHeight = dataLines.length > 0 ? dataLines.length * lineHeight + padding * 2 : 0;

        const canvas = document.createElement('canvas');
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const totalHeight = imgHeight + dataHeight + (dataLines.length > 0 ? padding : 0);

        canvas.width = imgWidth * scale;
        canvas.height = totalHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setIsSaving(false); return; }
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
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
              setShowPreview(true);
            }
            setIsSaving(false);
          },
          'image/jpeg',
          0.98
        );
      };
      img.onerror = () => {
        console.error('Failed to load SVG image for export');
        setIsSaving(false);
      };
      img.src = svgDataUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      setIsSaving(false);
    }
  }, [svgDataUrl, formatPiecesList, isSaving]);

  // ===== DOWNLOAD IMAGE =====
  const handleDownload = useCallback(() => {
    if (previewUrl) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = `majalis-layout-${Date.now()}.jpg`;
      a.click();
    }
  }, [previewUrl]);

  // ===== SAVE TO ORDER =====
  const handleSaveToOrder = useCallback(async () => {
    if (!importedOrderId || !svgDataUrl || !distribution || !scenario) return;

    setIsSaving(true);
    try {
      // 1. Generate JPEG from SVG
      const img = new Image();
      const imageBlob = await new Promise<Blob | null>((resolve) => {
        img.onload = () => {
          const dataLines = formatPiecesList();
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

      // 2. Upload image to Convex storage
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

      // 3. Collect all pieces from distribution
      const allGlssaPieces: number[] = [];
      const allWssadaPieces: number[] = [];

      for (const wall of distribution.walls) {
        wall.glssaPieces.map(p => p.size).forEach(w => allGlssaPieces.push(w));
        wall.wssadaPieces.map(p => p.size).forEach(w => allWssadaPieces.push(w));
      }

      // 4. Build corner ownership data from scenario
      const cornerOwnership: Record<string, string> = {};
      if (scenario.corners) {
        for (const corner of scenario.corners) {
          cornerOwnership[corner.cornerId] = corner.glssaOwner;
        }
      }

      // 5. Update order (use effective placements with drag overrides)
      const savePlacements = getEffectivePlacements();
      await updateOrderLayout({
        id: importedOrderId,
        calculations: {
          totalGlassat: stats.glssa,
          totalWsayd: stats.wssada,
          totalCoudoir: stats.glssa, // Coudoir matches glssa count
          totalZerbiya: includeCarpet && carpetCombo ? carpetCombo.placements.reduce((sum, p) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0) : 0,
          glssaPieces: allGlssaPieces,
          wssadaPieces: allWssadaPieces,
          ...(includeCarpet && carpetCombo ? {
            carpetSelections: savePlacements.map(p => ({
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
            poufsPrice: poufsCount * PRICE_PER_POUF,
          } : {}),
          materialUsageOptimized: true,
          spaceValidated: true,
          calculationMethod: 'custom-editor-v2',
        },
        layoutVisualization: {
          diagramUrl: storageId,
        },
        optimizationData: {
          layoutType,
          dimensions,
          scenarioId: scenario.scenarioId,
          walls: distribution.walls.map(w => ({
            wallId: w.wallId,
            glssaPieces: w.glssaPieces.map(p => p.size),
            wssadaPieces: w.wssadaPieces.map(p => ({ size: p.size, isCornerPiece: !!p.isCornerPiece })),
            glssaEffective: w.glssaEffective,
            wssadaEffective: w.wssadaEffective,
            wssadaSide: w.wssadaSide,
            glssaTotal: w.glssaTotal,
            wssadaTotal: w.wssadaTotal,
            glssaVoid: w.glssaVoid,
            wssadaVoid: w.wssadaVoid,
          })),
          scenario: scenario,
          cornerOwnership,
          ...(includeCarpet && carpetCombo ? {
            carpetSelections: savePlacements.map(p => ({
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
          ...(includePoufs ? {
            poufs: {
              count: poufsCount,
              unitPrice: PRICE_PER_POUF,
              totalPrice: poufsCount * PRICE_PER_POUF,
            },
          } : {}),
        },
        products: (() => {
          const PRICE_PER_SET = 2050;
          const PRICE_PER_EXTRA_WSSADA = 300;
          const includedWssada = stats.glssa * 2;
          const extraWssada = Math.max(0, stats.wssada - includedWssada);
          const setsTotal = stats.glssa * PRICE_PER_SET;
          // Extra wssada cost folded into majlis line total (internal info, not shown separately)
          const extraTotal = extraWssada * PRICE_PER_EXTRA_WSSADA;

          const items: { name: string; productType: 'glassat' | 'wsayd' | 'coudoir' | 'zerbiya' | 'poufs'; quantity: number; unitPrice: number; totalPrice: number }[] = [
            {
              name: 'Majalis (Glssa + Coudoir + 2 Wssada)',
              productType: 'glassat' as const,
              quantity: stats.glssa,
              unitPrice: PRICE_PER_SET,
              totalPrice: setsTotal + extraTotal,
            },
          ];
          if (includeCarpet && carpetCombo) {
            items.push({
              name: `Zerbiya (${carpetCombo.placements.length} pièce${carpetCombo.placements.length > 1 ? 's' : ''})`,
              productType: 'zerbiya' as const,
              quantity: carpetCombo.placements.reduce((sum, p) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0),
              unitPrice: carpetCombo.totalPrice / carpetCombo.placements.length,
              totalPrice: carpetCombo.totalPrice,
            });
          }
          if (includePoufs && poufsCount > 0) {
            items.push({
              name: `Poufs (${poufsCount})`,
              productType: 'poufs' as const,
              quantity: poufsCount,
              unitPrice: PRICE_PER_POUF,
              totalPrice: poufsCount * PRICE_PER_POUF,
            });
          }
          return items;
        })(),
        pricing: (() => {
          const PRICE_PER_SET = 2050;
          const PRICE_PER_EXTRA_WSSADA = 300;
          const includedWssada = stats.glssa * 2;
          const extraWssada = Math.max(0, stats.wssada - includedWssada);
          const carpetPrice = includeCarpet && carpetCombo ? carpetCombo.totalPrice : 0;
          const poufsPrice = includePoufs ? poufsCount * PRICE_PER_POUF : 0;
          const total = stats.glssa * PRICE_PER_SET + extraWssada * PRICE_PER_EXTRA_WSSADA + carpetPrice + poufsPrice;
          return { subtotal: total, total, currency: 'MAD' as const };
        })(),
      });

      toast.success('Modifications enregistrées !');

      // If editing an existing order with a customer email, prompt to send notification
      if (importedOrder?.customerInfo?.email) {
        // Build email data to store for the prompt
        const PRICE_PER_SET_EMAIL = 2050;
        const PRICE_PER_EXTRA_WSSADA_EMAIL = 300;
        const includedWssadaEmail = stats.glssa * 2;
        const extraWssadaEmail = Math.max(0, stats.wssada - includedWssadaEmail);
        const carpetPriceEmail = includeCarpet && carpetCombo ? carpetCombo.totalPrice : 0;
        const poufsPriceEmail = includePoufs ? poufsCount * PRICE_PER_POUF : 0;
        const totalEmail = stats.glssa * PRICE_PER_SET_EMAIL + extraWssadaEmail * PRICE_PER_EXTRA_WSSADA_EMAIL + carpetPriceEmail + poufsPriceEmail;

        // Extra wssada cost folded into majlis line total (internal info, not shown separately)
        const extraWssadaEmailPrice = extraWssadaEmail * PRICE_PER_EXTRA_WSSADA_EMAIL;
        const emailProducts: { name: string; productType: string; quantity: number; unitPrice: number; totalPrice: number }[] = [
          {
            name: 'Majalis (Glssa + Coudoir + 2 Wssada)',
            productType: 'glassat',
            quantity: stats.glssa,
            unitPrice: PRICE_PER_SET_EMAIL,
            totalPrice: stats.glssa * PRICE_PER_SET_EMAIL + extraWssadaEmailPrice,
          },
        ];
        if (includeCarpet && carpetCombo) {
          emailProducts.push({
            name: `Zerbiya (${carpetCombo.placements.length} pièce${carpetCombo.placements.length > 1 ? 's' : ''})`,
            productType: 'zerbiya',
            quantity: carpetCombo.placements.reduce((sum: number, p: any) => sum + ('baseTypeId' in p.carpetType ? p.carpetType.baseQuantity : 1), 0),
            unitPrice: carpetCombo.totalPrice / carpetCombo.placements.length,
            totalPrice: carpetCombo.totalPrice,
          });
        }
        if (includePoufs && poufsCount > 0) {
          emailProducts.push({
            name: `Poufs (${poufsCount})`,
            productType: 'poufs',
            quantity: poufsCount,
            unitPrice: PRICE_PER_POUF,
            totalPrice: poufsCount * PRICE_PER_POUF,
          });
        }

        setPendingEmailData({
          imageBlob,
          products: emailProducts,
          pricing: { subtotal: totalEmail, total: totalEmail, currency: 'MAD' },
          piecesList: formatPiecesList(),
        });
        setShowEmailPrompt(true);
        // Don't redirect yet — wait for email prompt decision
      } else {
        router.push(`/dashboard/orders/${importedOrderId}`);
      }
    } catch (error) {
      console.error('Error saving to order:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  }, [importedOrderId, importedOrder, svgDataUrl, distribution, scenario, stats, layoutType, dimensions, updateOrderLayout, router, generateUploadUrl, formatPiecesList, includeCarpet, carpetCombo, includePoufs, poufsCount, PRICE_PER_POUF, getEffectivePlacements]);

  // ===== EMAIL PROMPT HANDLERS =====
  const handleSendEmail = useCallback(async () => {
    if (!importedOrder?.customerInfo?.email || !pendingEmailData || !importedOrderId) return;
    setIsSendingEmail(true);
    try {
      // Upload image to ImageKit for email
      let emailImageUrl: string | undefined;
      if (pendingEmailData.imageBlob) {
        try {
          const formData = new FormData();
          formData.append('file', new File([pendingEmailData.imageBlob], `design-update-${Date.now()}.jpg`, { type: 'image/jpeg' }));
          const ikResponse = await fetch('/api/upload', { method: 'POST', body: formData });
          const ikResult = await ikResponse.json();
          if (ikResult.url) emailImageUrl = ikResult.url;
        } catch (ikErr) {
          console.error('ImageKit upload for email failed:', ikErr);
        }
      }

      const customerLang = importedOrder.customerInfo?.language || 'ar';
      await fetch('/api/send-layout-update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: importedOrder.customerInfo.email,
          customerName: importedOrder.customerInfo.name,
          orderRef: importedOrder.reference,
          imageUrl: emailImageUrl,
          products: pendingEmailData.products,
          pricing: pendingEmailData.pricing,
          piecesList: pendingEmailData.piecesList,
          language: customerLang,
        }),
      });
      toast.success('Email envoyé au client !');
    } catch (emailError) {
      console.error('Failed to send layout update email:', emailError);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsSendingEmail(false);
      setShowEmailPrompt(false);
      setPendingEmailData(null);
      router.push(`/dashboard/orders/${importedOrderId}`);
    }
  }, [importedOrder, pendingEmailData, importedOrderId, router]);

  const handleSkipEmail = useCallback(() => {
    setShowEmailPrompt(false);
    setPendingEmailData(null);
    if (importedOrderId) {
      router.push(`/dashboard/orders/${importedOrderId}`);
    }
  }, [importedOrderId, router]);

  // ===== ZOOM & PAN CONTROLS =====
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev * 0.8, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomFit = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    // Find the SVG element (inline or img)
    const svgEl = container.querySelector('#svg-canvas svg') || container.querySelector('img');
    if (!svgEl) return;
    const svgW = svgEl.scrollWidth || (svgEl as HTMLImageElement).naturalWidth || svgEl.clientWidth;
    const svgH = svgEl.scrollHeight || (svgEl as HTMLImageElement).naturalHeight || svgEl.clientHeight;
    if (!svgW || !svgH) return;
    const padding = 80;
    const cW = container.clientWidth - padding;
    const cH = container.clientHeight - padding;
    const fitZoom = Math.min(cW / svgW, cH / svgH, 3);
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  // ===== PIECE SELECTION (shared logic for mouse click & touch tap) =====
  const selectPieceAtPoint = useCallback((clientX: number, clientY: number, target?: EventTarget | null) => {
    if (activeTab !== 'edit') return;
    const svgContainer = document.getElementById('svg-canvas');
    if (!svgContainer) return;

    // Try direct target first (mouse clicks)
    let rect: Element | null = null;
    if (target && target instanceof Element) {
      rect = target.closest('rect[data-wall-id], rect[data-carpet-id]');
    }

    // Hit-test all piece rects by coordinates with touch tolerance.
    // Wssada pieces are very thin (10cm vs 70cm glssa), so we expand
    // the hit area and pick the closest match by distance to center.
    if (!rect) {
      const TOUCH_TOLERANCE = 15; // px — forgiving tap area
      const allRects = svgContainer.querySelectorAll('rect[data-wall-id], rect[data-carpet-id]');
      let bestDist = Infinity;
      for (const r of allRects) {
        const bounds = r.getBoundingClientRect();
        // Expand bounds by tolerance for thin pieces
        const expanded = {
          left: bounds.left - TOUCH_TOLERANCE,
          right: bounds.right + TOUCH_TOLERANCE,
          top: bounds.top - TOUCH_TOLERANCE,
          bottom: bounds.bottom + TOUCH_TOLERANCE,
        };
        if (clientX >= expanded.left && clientX <= expanded.right && clientY >= expanded.top && clientY <= expanded.bottom) {
          // Distance from click to rect center — prefer closest
          const cx = bounds.left + bounds.width / 2;
          const cy = bounds.top + bounds.height / 2;
          const dist = Math.hypot(clientX - cx, clientY - cy);
          if (dist < bestDist) {
            bestDist = dist;
            rect = r;
          }
        }
      }
    }

    if (rect) {
      const carpetId = rect.getAttribute('data-carpet-id');
      if (carpetId) {
        const anchorRect = rect.getBoundingClientRect();
        const idx = parseInt(carpetId.replace('carpet-', '')) || 0;
        setSelectedPiece({ wallId: 'carpet', pieceIndex: idx, category: 'carpet', anchorRect });
      } else {
        const wallId = rect.getAttribute('data-wall-id')!;
        const pieceIndex = parseInt(rect.getAttribute('data-piece-index')!);
        const category = rect.getAttribute('data-piece-category') as 'glssa' | 'wssada';
        const anchorRect = rect.getBoundingClientRect();
        setSelectedPiece({ wallId, pieceIndex, category, anchorRect });
      }
    } else {
      setSelectedPiece(null);
    }
  }, [activeTab]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTab !== 'edit') return;
    if (panDistanceRef.current > 5) return;
    selectPieceAtPoint(e.clientX, e.clientY, e.target);
  }, [activeTab, selectPieceAtPoint]);

  // Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPiece(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===== POPOVER HANDLERS =====
  const handlePopoverSizeChange = useCallback((size: number) => {
    if (!selectedPiece) return;
    const { wallId, pieceIndex, category } = selectedPiece;
    setEditedWalls(prev => prev.map(w => {
      if (w.wallId !== wallId) return w;
      if (category === 'glssa') {
        return { ...w, glssaPieces: w.glssaPieces.map((p, i) => i === pieceIndex ? { ...p, size } : p) };
      } else {
        return { ...w, wssadaPieces: w.wssadaPieces.map((p, i) => i === pieceIndex ? { ...p, size } : p) };
      }
    }));
  }, [selectedPiece]);

  const handlePopoverDelete = useCallback(() => {
    if (!selectedPiece) return;
    const { wallId, pieceIndex, category } = selectedPiece;
    setEditedWalls(prev => prev.map(w => {
      if (w.wallId !== wallId) return w;
      if (category === 'glssa') {
        return { ...w, glssaPieces: w.glssaPieces.filter((_, i) => i !== pieceIndex) };
      } else {
        return { ...w, wssadaPieces: w.wssadaPieces.filter((_, i) => i !== pieceIndex) };
      }
    }));
    setSelectedPiece(null);
  }, [selectedPiece]);

  const handleCarpetDelete = useCallback(() => {
    if (!selectedPiece || selectedPiece.category !== 'carpet' || !carpetCombo) return;
    const idx = selectedPiece.pieceIndex;
    if (carpetCombo.placements.length <= 1) {
      // Last carpet piece — disable carpet entirely
      setIncludeCarpet(false);
    } else {
      // Remove the specific placement from the combo
      const newPlacements = carpetCombo.placements.filter((_, i) => i !== idx);
      const totalCoveredArea = newPlacements.reduce((sum, p) => sum + p.fitWidth * p.fitHeight, 0);
      const floorR = calculateFloorRect(layoutType, dimensions);
      const floorArea = floorR ? floorR.width * floorR.height : 1;
      setCarpetCombo({
        ...carpetCombo,
        placements: newPlacements,
        totalCoveredArea,
        totalCoveragePercent: (totalCoveredArea / floorArea) * 100,
        totalPrice: newPlacements.reduce((sum, p) => sum + p.carpetType.price, 0),
      });
      // Clean up position overrides for removed carpet and re-index
      setCarpetPositionOverrides(prev => {
        const newOverrides: Record<number, { posX: number; posY: number }> = {};
        Object.entries(prev).forEach(([key, val]) => {
          const k = Number(key);
          if (k < idx) newOverrides[k] = val;
          else if (k > idx) newOverrides[k - 1] = val;
        });
        return newOverrides;
      });
    }
    setSelectedPiece(null);
  }, [selectedPiece, carpetCombo, layoutType, dimensions]);

  const selectedPieceData = useMemo(() => {
    if (!selectedPiece) return null;
    const wall = editedWalls.find(w => w.wallId === selectedPiece.wallId);
    if (!wall) return null;
    const pieces = selectedPiece.category === 'glssa' ? wall.glssaPieces : wall.wssadaPieces;
    return pieces[selectedPiece.pieceIndex] || null;
  }, [selectedPiece, editedWalls]);

  // ===== HIGHLIGHT SELECTED PIECE IN SVG =====
  useEffect(() => {
    if (activeTab !== 'edit' || !selectedPiece) return;
    // Find and highlight the selected rect in the inline SVG
    const svgContainer = document.getElementById('svg-canvas');
    if (!svgContainer) return;
    // Remove previous highlights
    svgContainer.querySelectorAll('rect[data-highlight]').forEach(r => {
      r.removeAttribute('data-highlight');
      (r as SVGElement).style.filter = '';
    });
    // Add highlight to selected
    const selector = selectedPiece.category === 'carpet'
      ? `rect[data-carpet-id="carpet-${selectedPiece.pieceIndex}"]`
      : `rect[data-wall-id="${selectedPiece.wallId}"][data-piece-index="${selectedPiece.pieceIndex}"][data-piece-category="${selectedPiece.category}"]`;
    const selectedRect = svgContainer.querySelector(selector);
    if (selectedRect) {
      selectedRect.setAttribute('data-highlight', 'true');
      (selectedRect as SVGElement).style.filter = 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))';
    }
  }, [activeTab, selectedPiece, svgRaw]);

  // ===== GPU-ACCELERATED TRANSFORM SYSTEM =====
  // Direct DOM manipulation during gestures for 60fps smoothness.
  // React state is only updated on gesture end (for UI like zoom %).

  const applyTransform = useCallback(() => {
    const el = transformTargetRef.current;
    if (el) el.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${zoomRef.current})`;
  }, []);

  const syncToState = useCallback(() => {
    setPan({ ...panRef.current });
    setZoom(zoomRef.current);
  }, []);

  // Keep refs in sync when state changes from buttons/reset
  useEffect(() => {
    panRef.current = { ...pan };
    zoomRef.current = zoom;
    applyTransform();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan, zoom]);

  // Wheel zoom (centered on cursor)
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.08;
      const prevZoom = zoomRef.current;
      const newZoom = direction > 0
        ? Math.min(prevZoom * scaleBy, 5)
        : Math.max(prevZoom / scaleBy, 0.1);
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const ratio = newZoom / prevZoom;
      panRef.current = {
        x: cx - ratio * (cx - panRef.current.x),
        y: cy - ratio * (cy - panRef.current.y),
      };
      zoomRef.current = newZoom;
      applyTransform();
      // Debounce state sync for wheel
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => syncToState());
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan handlers — direct DOM, no React re-renders during gesture
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    isPanningRef.current = true;
    panDistanceRef.current = 0;
    touchStartTime.current = Date.now();
    touchStartPoint.current = { x: clientX, y: clientY };
    lastPanPoint.current = { x: clientX, y: clientY };
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanningRef.current) return;
    const dx = clientX - lastPanPoint.current.x;
    const dy = clientY - lastPanPoint.current.y;
    panDistanceRef.current += Math.abs(dx) + Math.abs(dy);
    lastPanPoint.current = { x: clientX, y: clientY };
    panRef.current.x += dx;
    panRef.current.y += dy;
    applyTransform();
  }, [applyTransform]);

  const handlePanEnd = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      // Only sync state if there was actual movement — avoids
      // triggering a re-render on pure clicks (which kills the click event)
      if (panDistanceRef.current > 1) {
        syncToState();
      }
    }
  }, [syncToState]);

  // ===== CARPET DRAG HELPERS =====
  const tryStartCarpetDrag = useCallback((clientX: number, clientY: number, target: EventTarget | null): boolean => {
    if (activeTab !== 'edit' || !includeCarpet || !carpetCombo) return false;
    if (!target || !(target instanceof Element)) return false;
    const carpetRect = target.closest('rect[data-carpet-id]');
    if (!carpetRect) return false;
    const carpetId = carpetRect.getAttribute('data-carpet-id');
    if (!carpetId) return false;
    const idx = parseInt(carpetId.replace('carpet-', ''));
    if (isNaN(idx) || idx < 0 || idx >= carpetCombo.placements.length) return false;

    const placement = carpetCombo.placements[idx];
    const override = carpetPositionOverrides[idx];
    draggingCarpetRef.current = {
      index: idx,
      startX: clientX,
      startY: clientY,
      origPosX: override ? override.posX : placement.posX,
      origPosY: override ? override.posY : placement.posY,
    };
    return true;
  }, [activeTab, includeCarpet, carpetCombo, carpetPositionOverrides]);

  const handleCarpetDragMove = useCallback((clientX: number, clientY: number) => {
    const drag = draggingCarpetRef.current;
    if (!drag) return;
    const deltaX = clientX - drag.startX;
    const deltaY = clientY - drag.startY;
    const currentZoom = zoomRef.current;
    const deltaCmX = deltaX / (currentZoom * SVG_SCALE);
    const deltaCmY = deltaY / (currentZoom * SVG_SCALE);

    // Update the carpet rect directly in the DOM for smooth visual feedback
    const svgContainer = document.getElementById('svg-canvas');
    if (svgContainer) {
      const floorRect = calculateFloorRect(layoutType, dimensions);
      if (floorRect) {
        const newPosX = drag.origPosX + deltaCmX;
        const newPosY = drag.origPosY + deltaCmY;
        const carpetRect = svgContainer.querySelector(`rect[data-carpet-id="carpet-${drag.index}"]`) as SVGRectElement | null;
        if (carpetRect) {
          carpetRect.setAttribute('x', String((floorRect.x + newPosX) * SVG_SCALE));
          carpetRect.setAttribute('y', String((floorRect.y + newPosY) * SVG_SCALE));
        }
      }
    }
  }, [layoutType, dimensions]);

  const handleCarpetDragEnd = useCallback((clientX: number, clientY: number) => {
    const drag = draggingCarpetRef.current;
    if (!drag) return;
    draggingCarpetRef.current = null;

    const deltaX = clientX - drag.startX;
    const deltaY = clientY - drag.startY;
    const currentZoom = zoomRef.current;
    const deltaCmX = deltaX / (currentZoom * SVG_SCALE);
    const deltaCmY = deltaY / (currentZoom * SVG_SCALE);
    const newPosX = drag.origPosX + deltaCmX;
    const newPosY = drag.origPosY + deltaCmY;

    setCarpetPositionOverrides(prev => ({
      ...prev,
      [drag.index]: { posX: newPosX, posY: newPosY },
    }));
  }, []);

  // Pinch-to-zoom & tap-to-select handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // If we were dragging a carpet with one finger, cancel it on pinch
      if (draggingCarpetRef.current) {
        draggingCarpetRef.current = null;
      }
      // Start pinch
      isPinchingRef.current = true;
      isPanningRef.current = false;
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      pinchStartDistance.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchStartZoom.current = zoomRef.current;
      const container = canvasContainerRef.current;
      const rect = container?.getBoundingClientRect();
      if (rect) {
        pinchMidRef.current = {
          x: (t0.clientX + t1.clientX) / 2 - rect.left - rect.width / 2,
          y: (t0.clientY + t1.clientY) / 2 - rect.top - rect.height / 2,
        };
      }
    } else if (e.touches.length === 1 && !isPinchingRef.current) {
      // Record tap start for tap detection
      touchStartTime.current = Date.now();
      touchStartPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      // Try carpet drag first — use elementFromPoint for touch events
      const touchTarget = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      if (tryStartCarpetDrag(e.touches[0].clientX, e.touches[0].clientY, touchTarget)) {
        panDistanceRef.current = 0;
        return;
      }
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePanStart, tryStartCarpetDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const scale = dist / pinchStartDistance.current;
      const newZoom = Math.max(0.1, Math.min(5, pinchStartZoom.current * scale));
      const ratio = newZoom / zoomRef.current;
      const cx = pinchMidRef.current.x;
      const cy = pinchMidRef.current.y;
      panRef.current = {
        x: cx - ratio * (cx - panRef.current.x),
        y: cy - ratio * (cy - panRef.current.y),
      };
      zoomRef.current = newZoom;
      applyTransform();
    } else if (e.touches.length === 1 && !isPinchingRef.current) {
      if (draggingCarpetRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartPoint.current.x;
        const dy = e.touches[0].clientY - touchStartPoint.current.y;
        panDistanceRef.current = Math.abs(dx) + Math.abs(dy);
        handleCarpetDragMove(e.touches[0].clientX, e.touches[0].clientY);
        return;
      }
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [applyTransform, handlePanMove, handleCarpetDragMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length < 2) {
      isPinchingRef.current = false;
      syncToState();
      // If one finger remains, start panning from it
      if (e.touches.length === 1) {
        handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    } else if (draggingCarpetRef.current) {
      const elapsed = Date.now() - touchStartTime.current;
      const wasTap = elapsed < 300 && panDistanceRef.current < 10;
      if (wasTap) {
        // It was a tap on carpet, not a drag — cancel drag, handle as tap
        draggingCarpetRef.current = null;
        selectPieceAtPoint(touchStartPoint.current.x, touchStartPoint.current.y);
      } else {
        // Use the last touch point from changedTouches
        const lastTouch = e.changedTouches[0];
        handleCarpetDragEnd(lastTouch.clientX, lastTouch.clientY);
      }
    } else {
      // Detect tap: short duration + minimal movement
      const elapsed = Date.now() - touchStartTime.current;
      const wasTap = elapsed < 300 && panDistanceRef.current < 10;
      handlePanEnd();
      if (wasTap && activeTab === 'edit') {
        selectPieceAtPoint(touchStartPoint.current.x, touchStartPoint.current.y);
      }
    }
  }, [syncToState, handlePanStart, handlePanEnd, activeTab, selectPieceAtPoint, handleCarpetDragEnd]);

  // ===== CLEANUP =====
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Show loader while importing order data
  if (importOrderRef && importedOrder === undefined && !hasImported) {
    return (
      <div className="h-full w-full bg-stone-100 flex items-center justify-center" dir="ltr">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500 font-medium">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-stone-100 flex flex-col overflow-hidden" dir="ltr">
      {/* Force inline SVG to have intrinsic size — CSS fix for viewBox-only SVGs */}
      <style dangerouslySetInnerHTML={{ __html: `#svg-canvas > svg { display: block; width: 800px; height: auto; }` }} />
      {/* ===== FLOATING HEADER ===== */}
      <div className="absolute top-2 right-2 left-2 sm:top-4 sm:right-4 sm:left-4 z-30 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-stone-200">
            <button
              onClick={() => {
                if (importedOrderId) {
                  router.push(`/dashboard/orders/${importedOrderId}`);
                } else {
                  router.push('/dashboard');
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="h-6 w-px bg-stone-200" />
            <span className="hidden sm:inline text-sm font-semibold text-stone-900 tracking-tight">Éditeur de plan</span>
            {importedOrder && (
              <span className="hidden md:inline text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                Modifier {importedOrder.reference}
              </span>
            )}
          </div>
        </div>

        {/* Center: Layout Type Picker */}
        {!importedOrderId && (
          <div className="relative">
            <button
              onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <span className="text-sm font-medium text-stone-700">{LAYOUT_LABELS[layoutType]}</span>
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLayoutPicker && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl border border-stone-200 shadow-lg overflow-hidden min-w-[180px]">
                {(Object.keys(LAYOUT_LABELS) as LayoutType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleLayoutTypeChange(type)}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                      layoutType === type
                        ? 'bg-majalis-50 text-majalis-700 font-medium'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {LAYOUT_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {importedOrderId && (
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-stone-200">
            <span className="text-sm font-medium text-stone-700">{LAYOUT_LABELS[layoutType]}</span>
          </div>
        )}

        {/* Debug toggle */}
        <button
          onClick={() => setShowDebugPanel(prev => !prev)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-mono border transition-colors ${
            showDebugPanel
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white/95 backdrop-blur-sm border-stone-200 text-stone-500 hover:bg-stone-50'
          }`}
          title="Toggle debug panel"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          DBG
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Save to Order Button */}
          {importedOrderId && (
            <button
              onClick={handleSaveToOrder}
              disabled={isSaving || !svgDataUrl}
              className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enregistrer</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isSaving || !svgDataUrl}
            className="flex items-center gap-2 bg-stone-900 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* ===== MAIN CANVAS AREA (Infinite Canvas) ===== */}
      <div
        ref={canvasContainerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: activeTab === 'edit' ? 'default' : 'grab', touchAction: 'none' }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          // Try carpet drag first (edit mode only)
          if (tryStartCarpetDrag(e.clientX, e.clientY, e.target)) {
            panDistanceRef.current = 0;
            touchStartTime.current = Date.now();
            touchStartPoint.current = { x: e.clientX, y: e.clientY };
            return;
          }
          handlePanStart(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (draggingCarpetRef.current) {
            handleCarpetDragMove(e.clientX, e.clientY);
            panDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
            return;
          }
          handlePanMove(e.clientX, e.clientY);
        }}
        onMouseUp={(e) => {
          if (draggingCarpetRef.current) {
            const wasCarpetClick = panDistanceRef.current < 10 && (Date.now() - touchStartTime.current) < 500;
            if (wasCarpetClick) {
              // It was a click on carpet, not a drag — cancel drag, handle as click
              draggingCarpetRef.current = null;
              selectPieceAtPoint(e.clientX, e.clientY, e.target);
            } else {
              handleCarpetDragEnd(e.clientX, e.clientY);
            }
            return;
          }
          // Detect click via mouseup (more reliable than onClick after pan system)
          const wasClick = panDistanceRef.current < 10 && (Date.now() - touchStartTime.current) < 500;
          handlePanEnd();
          if (wasClick && e.button === 0 && activeTab === 'edit') {
            selectPieceAtPoint(e.clientX, e.clientY, e.target);
          }
        }}
        onMouseLeave={() => {
          if (draggingCarpetRef.current) {
            draggingCarpetRef.current = null;
            return;
          }
          handlePanEnd();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full h-full flex items-center justify-center">
          {(svgDataUrl || svgRaw) ? (
            <div
              ref={transformTargetRef}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            >
              {activeTab === 'edit' && svgRaw ? (
                <div
                  id="svg-canvas"
                  dangerouslySetInnerHTML={{ __html: svgRaw }}
                  style={{ width: 'max-content', height: 'max-content' }}
                  className="max-w-none select-none [&_rect[data-carpet-id]]:cursor-grab [&>svg]:block [&>svg]:w-[800px] [&>svg]:h-auto"
                />
              ) : (
                <img
                  ref={svgImgRef}
                  src={svgDataUrl || undefined}
                  alt="Floor plan layout"
                  className="max-w-none select-none pointer-events-none"
                  draggable={false}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-stone-400">
              {calcError ? (
                <>
                  <svg className="w-12 h-12 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-400 text-center max-w-xs">{calcError}</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
                  </svg>
                  <p className="text-sm">Saisissez les dimensions pour afficher le plan</p>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ===== PIECE EDITOR (Bottom-Center, above zoom) ===== */}
      {selectedPiece && selectedPiece.category !== 'carpet' && selectedPieceData && (
        <div className={`absolute ${isPanelOpen ? 'bottom-[calc(60vh+16px)]' : 'bottom-[80px]'} md:bottom-16 left-1/2 -translate-x-1/2 z-40 flex justify-center transition-[bottom] duration-300`}>
          <PiecePopover
            wallId={selectedPiece.wallId}
            pieceIndex={selectedPiece.pieceIndex}
            category={selectedPiece.category}
            currentSize={selectedPieceData.size}
            isCornerPiece={selectedPieceData.isCornerPiece}
            onSizeChange={handlePopoverSizeChange}
            onDelete={handlePopoverDelete}
            onClose={() => setSelectedPiece(null)}
          />
        </div>
      )}
      {selectedPiece && selectedPiece.category === 'carpet' && carpetCombo && (() => {
        const placement = carpetCombo.placements[selectedPiece.pieceIndex] || carpetCombo.placements[0];
        const carpetLabel = `Zerbiya — ${getCarpetDisplayLabel(placement.carpetType, placement.rotated)}`;
        const carpetDimensions = `${placement.fitWidth} × ${placement.fitHeight} cm`;
        return (
          <div className={`absolute ${isPanelOpen ? 'bottom-[calc(60vh+16px)]' : 'bottom-[80px]'} md:bottom-16 left-1/2 -translate-x-1/2 z-40 flex justify-center transition-[bottom] duration-300`}>
            <PiecePopover
              wallId="carpet"
              pieceIndex={selectedPiece.pieceIndex}
              category="carpet"
              currentSize={0}
              isCornerPiece={false}
              onSizeChange={() => {}}
              onDelete={handleCarpetDelete}
              onClose={() => setSelectedPiece(null)}
              carpetLabel={carpetLabel}
              carpetDimensions={carpetDimensions}
              carpetTypes={ALL_CARPET_TYPES.map(ct => ({
                id: ct.id,
                label: `${ct.widthCm/100}×${ct.heightCm/100}m`,
                widthCm: ct.widthCm,
                heightCm: ct.heightCm,
                price: ct.price,
              }))}
              carpetTypeId={carpetCombo?.placements[selectedPiece.pieceIndex]?.carpetType.id}
              carpetRotated={carpetCombo?.placements[selectedPiece.pieceIndex]?.rotated}
              onCarpetTypeChange={(typeId) => handleChangeCarpetType(selectedPiece.pieceIndex, typeId)}
              onCarpetRotate={() => handleToggleCarpetRotation(selectedPiece.pieceIndex)}
            />
          </div>
        );
      })()}

      {/* ===== ZOOM CONTROLS (Bottom-Center) ===== */}
      <div className={`absolute ${isPanelOpen ? 'bottom-[calc(60vh+8px)]' : 'bottom-[68px]'} md:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl border border-stone-200 px-2 py-1.5 transition-[bottom] duration-300`}>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
          title="Réduire"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleZoomReset}
          className="px-2 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 text-xs font-medium transition-colors min-w-[3rem]"
          title="Réinitialiser le zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
          title="Agrandir"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <div className="w-px h-5 bg-stone-200 mx-0.5" />
        <button
          onClick={handleZoomFit}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
          title="Ajuster à la vue"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>

      {/* ===== SIDE PANEL (Tabbed: Auto / Edit) ===== */}
        <div className={`fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl border-t border-stone-200 shadow-xl w-full flex flex-col overflow-hidden transition-[max-height] duration-300 ease-in-out ${isPanelOpen ? 'max-h-[60vh]' : 'max-h-[52px]'} md:overflow-visible md:absolute md:top-20 md:left-4 md:bottom-auto md:right-auto md:rounded-2xl md:border md:shadow-xl md:w-72 md:max-h-[calc(100vh-120px)]`}>
          {/* Mobile drag handle — tap to toggle */}
          <button
            type="button"
            onClick={() => setIsPanelOpen(prev => !prev)}
            className="md:hidden flex justify-center pt-2 pb-1 w-full touch-manipulation"
            aria-label={isPanelOpen ? 'Réduire le panneau' : 'Ouvrir le panneau'}
          >
            <div className={`w-10 h-1 rounded-full transition-colors ${isPanelOpen ? 'bg-stone-400' : 'bg-stone-300'}`} />
          </button>
          {/* Tabs */}
          <div className="flex border-b border-stone-200 shrink-0">
            <button
              onClick={() => { if (!isPanelOpen) setIsPanelOpen(true); handleTabChange('auto'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'auto'
                  ? 'text-majalis-700 border-b-2 border-majalis-600 bg-majalis-50/50'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              Auto
            </button>
            <button
              onClick={() => { if (!isPanelOpen) setIsPanelOpen(true); handleTabChange('edit'); }}
              disabled={!distribution}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'edit'
                  ? 'text-majalis-700 border-b-2 border-majalis-600 bg-majalis-50/50'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
          </div>

          {/* Panel content */}
          <div className={`p-4 overflow-y-auto flex-1 ${isPanelOpen ? '' : 'hidden md:block'}`}>
            {activeTab === 'auto' ? (
              <>
                {/* Auto mode: Dimension inputs */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-stone-900">Dimensions</h3>
                </div>

                <div className="space-y-3">
                  {DIMENSION_FIELDS[layoutType].map((field) => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
                        {field.label}
                      </label>
                      <div className="flex items-center rounded-lg border border-stone-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleDimensionChange(field.key, Math.max(field.min, (dimensions[field.key] ?? field.min) - 10))}
                          className="w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors touch-manipulation text-lg font-bold shrink-0"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={dimensions[field.key] ?? ''}
                          min={field.min}
                          max={field.max}
                          placeholder={field.placeholder}
                          onChange={(e) => handleDimensionChange(field.key, Number(e.target.value))}
                          className="flex-1 px-2 py-2 text-sm text-center focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDimensionChange(field.key, Math.min(field.max, (dimensions[field.key] ?? field.min) + 10))}
                          className="w-10 h-10 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors touch-manipulation text-lg font-bold shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Wall breakdown */}
                {distribution && (
                  <div className="mt-4 pt-3 border-t border-stone-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Détails des murs</p>
                    <div className="space-y-2">
                      {distribution.walls.map((wall) => (
                        <div key={wall.wallId} className="bg-stone-50 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-stone-700">{wall.wallId}</span>
                            <span className="text-[10px] text-stone-400">
                              G:{wall.glssaPieces.length} | W:{wall.wssadaPieces.length}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-500 space-y-0.5">
                            <p>Glssa: [{wall.glssaPieces.map(p => p.size).join(', ')}] = {wall.glssaTotal}cm
                              {wall.glssaVoid > 0 && <span className="text-red-500"> (Vide: {wall.glssaVoid}cm)</span>}
                            </p>
                            <p>Wssada: [{wall.wssadaPieces.map(p => p.isCornerPiece ? `${p.size}*` : p.size).join(', ')}] = {wall.wssadaTotal}cm
                              {wall.wssadaVoid > 0 && <span className="text-red-500"> (Vide: {wall.wssadaVoid}cm)</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total summary */}
                    <div className="mt-3 bg-majalis-50 rounded-lg p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-majalis-800">Total</span>
                        <span className="font-bold text-majalis-900">
                          {stats.glssa} Glssa + {stats.wssada} Wssada + {stats.glssa} Coudoir
                        </span>
                      </div>
                      {stats.extraWssada > 0 && (
                        <div className="flex items-center justify-between text-[10px] mt-1">
                          <span className="text-amber-600">+{stats.extraWssada} Wssada supp.</span>
                          <span className="font-medium text-amber-700">{stats.extraWssada * 300} MAD</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Carpet Section */}
                {allCombos.length > 0 && (
                  <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E0D5]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#5A5A5A]">Zerbiya (Tapis)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeCarpet}
                          onChange={(e) => {
                            setIncludeCarpet(e.target.checked);
                            if (e.target.checked && allCombos.length > 0 && !carpetCombo) {
                              setCarpetCombo(allCombos[0]);
                            }
                          }}
                          className="rounded border-gray-300 w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-gray-500">Inclure</span>
                      </label>
                    </div>
                    {includeCarpet && carpetCombo && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-700">{carpetCombo.placements.length}× {getCarpetDisplayLabel(carpetCombo.placements[0].carpetType, carpetCombo.placements[0].rotated)}</div>
                        <div className="text-[10px] text-gray-500">{carpetCombo.totalCoveragePercent.toFixed(0)}% couverture — {carpetCombo.totalPrice} MAD</div>
                        {allCombos.length > 1 && (
                          <select
                            value={allCombos.indexOf(carpetCombo)}
                            onChange={(e) => { setCarpetCombo(allCombos[Number(e.target.value)]); setCarpetPositionOverrides({}); }}
                            className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 mt-1"
                          >
                            {allCombos.map((combo, i) => (
                              <option key={i} value={i}>
                                {combo.placements.length}× {getCarpetDisplayLabel(combo.placements[0].carpetType, combo.placements[0].rotated)} — {combo.totalCoveragePercent.toFixed(0)}% — {combo.totalPrice} MAD
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Poufs Section */}
                <div className="mt-4 p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E0D5]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#5A5A5A]">Poufs</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePoufs}
                        onChange={(e) => setIncludePoufs(e.target.checked)}
                        className="rounded border-gray-300 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-gray-500">Inclure</span>
                    </label>
                  </div>
                  {includePoufs && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">Quantité</span>
                        <div className="flex items-center rounded-lg border border-stone-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setPoufsCount(prev => Math.max(1, prev - 1))}
                            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors touch-manipulation text-sm font-bold shrink-0"
                          >
                            −
                          </button>
                          <span className="px-3 text-sm font-medium text-stone-800 min-w-[2rem] text-center">{poufsCount}</span>
                          <button
                            type="button"
                            onClick={() => setPoufsCount(prev => Math.min(20, prev + 1))}
                            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 active:bg-stone-200 transition-colors touch-manipulation text-sm font-bold shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {poufsCount} × {PRICE_PER_POUF} MAD = {poufsCount * PRICE_PER_POUF} MAD
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Edit mode: Piece editor */
              <EditPiecesPanel
                walls={editedWalls}
                onWallsChange={setEditedWalls}
                selectedWallId={selectedPiece?.wallId}
                selectedPieceIndex={selectedPiece?.pieceIndex}
                selectedCategory={selectedPiece?.category}
                includeCarpet={includeCarpet}
                onIncludeCarpetChange={setIncludeCarpet}
                carpetCombo={carpetCombo}
                allCombos={allCombos}
                onComboChange={(i) => { setCarpetCombo(allCombos[i]); setCarpetPositionOverrides({}); }}
                onAddCarpet={handleAddCarpet}
                onRemoveCarpet={handleRemoveCarpet}
                onChangeCarpetType={handleChangeCarpetType}
                onToggleCarpetRotation={handleToggleCarpetRotation}
                allCarpetTypes={ALL_CARPET_TYPES.map(ct => ({
                  id: ct.id,
                  widthCm: ct.widthCm,
                  heightCm: ct.heightCm,
                  price: ct.price,
                }))}
                includePoufs={includePoufs}
                onIncludePoufsChange={setIncludePoufs}
                poufsCount={poufsCount}
                onPoufsCountChange={setPoufsCount}
                pricePerPouf={PRICE_PER_POUF}
              />
            )}
          </div>
        </div>

      {/* ===== PREVIEW MODAL ===== */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-stone-900">Aperçu du plan</h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-auto p-4">
              <img
                src={previewUrl}
                alt="Layout Preview"
                className="w-full rounded-xl border border-stone-200"
              />
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-stone-100 flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-majalis-600 text-white text-sm font-medium hover:bg-majalis-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Télécharger l&apos;image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {showLayoutPicker && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowLayoutPicker(false)}
        />
      )}

      {/* ===== EMAIL PROMPT MODAL ===== */}
      {showEmailPrompt && importedOrder?.customerInfo?.email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900">Envoyer un email au client ?</h3>
                <p className="text-sm text-stone-500 mt-0.5">Les modifications ont été enregistrées</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-stone-600 leading-relaxed">
                Voulez-vous notifier le client <strong>{importedOrder.customerInfo.name}</strong> des modifications apportées à sa commande ?
              </p>
              <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{importedOrder.customerInfo.email}</span>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-3">
                L&apos;email contiendra le nouveau design, la liste des pièces et le total.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
              <button
                onClick={handleSkipEmail}
                disabled={isSendingEmail}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                Non, passer
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Oui, envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DEBUG PANEL ===== */}
      {showDebugPanel && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="absolute bottom-4 right-4 w-[420px] max-h-[50vh] pointer-events-auto bg-stone-900/95 backdrop-blur-sm rounded-xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-700">
              <span className="text-xs font-mono font-semibold text-amber-400">Debug Logs ({debugLogs.length})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(debugLogs.join('\n'));
                    toast.success('Logs copied');
                  }}
                  className="text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors px-2 py-1 rounded hover:bg-stone-800"
                >
                  Copy All
                </button>
                <button
                  onClick={() => setDebugLogs([])}
                  className="text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors px-2 py-1 rounded hover:bg-stone-800"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowDebugPanel(false)}
                  className="text-stone-400 hover:text-stone-200 transition-colors p-0.5 rounded hover:bg-stone-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Log entries */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] leading-relaxed">
              {debugLogs.length === 0 ? (
                <span className="text-stone-500">No logs yet. Interact with the page to generate logs.</span>
              ) : (
                [...debugLogs].reverse().map((log, i) => (
                  <div key={i} className={`text-stone-300 break-all ${
                    log.includes('ERROR') ? 'text-red-400' :
                    log.includes('skipped') ? 'text-stone-500' :
                    log.includes('SVG generated') ? 'text-emerald-400' :
                    log.includes('Import:') ? 'text-amber-300' :
                    'text-stone-300'
                  }`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
