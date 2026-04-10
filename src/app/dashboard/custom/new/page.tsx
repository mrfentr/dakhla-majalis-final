// ===== NEW CUSTOM LAYOUT DESIGNER =====
// SVG-based visualization using ai-room-visualizer
// Dimension-driven: change dimensions -> auto-recalculates everything
// Standalone design mode — no order import/save

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculateGeometry,
  findOptimalDistribution,
  generateFloorPlanSVG,
  generateFloorPlanDataUrl,
  calculateFloorRect,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
  ALL_CARPET_TYPES,
  type LayoutType,
  type GeometryScenario,
  type DistributionResult,
  type WallPieceDistribution,
  type PiecePosition,
  type CarpetInventory,
  type MultiCarpetResult,
  type CarpetPlacement,
} from '@/lib/ai-room-visualizer';
import { Pencil, Ruler } from 'lucide-react';
import { formatPiecesLines } from '@/components/FormattedPiecesList';
import EditPiecesPanel, { type EditableWall, generatePieceId } from '../EditPiecesPanel';
import PiecePopover from '../PiecePopover';

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

export default function NewCustomLayoutPage() {
  const router = useRouter();

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

  // Edit mode state
  const [activeTab, setActiveTab] = useState<'auto' | 'edit'>('auto');
  const [editedWalls, setEditedWalls] = useState<EditableWall[]>([]);

  // UI state
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Refs
  const svgImgRef = useRef<HTMLImageElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const transformTargetRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
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

    const refPlacement = carpetCombo.placements[0];
    const carpetType = refPlacement.carpetType;
    const rotated = refPlacement.rotated;
    const fitWidth = rotated ? carpetType.heightCm : carpetType.widthCm;
    const fitHeight = rotated ? carpetType.widthCm : carpetType.heightCm;

    let posX = (floorRect.width - fitWidth) / 2;
    let posY = (floorRect.height - fitHeight) / 2;

    const existingCount = carpetCombo.placements.length;
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
    const newOverrides: Record<number, { posX: number; posY: number }> = {};
    Object.entries(carpetPositionOverrides).forEach(([key, val]) => {
      const oldIdx = parseInt(key);
      if (oldIdx < index) {
        newOverrides[oldIdx] = val;
      } else if (oldIdx > index) {
        newOverrides[oldIdx - 1] = val;
      }
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
    if (activeTab !== 'edit' || !scenario || editedWalls.length === 0) return;

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
    } catch (err: any) {
      console.error('[NewCustomPage] Edit SVG error:', err);
    }
  }, [activeTab, editedWalls, scenario, layoutType, buildDistributionFromEdits, includeCarpet, carpetCombo, dimensions, includePoufs, poufsCount, getEffectivePlacements]);

  // ===== REGENERATE SVG when carpet selection changes =====
  useEffect(() => {
    if (!scenario || !distribution) return;
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
    } catch (e) {
      console.error('SVG regeneration failed:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCarpet, carpetCombo, includePoufs, poufsCount, carpetPositionOverrides]);

  // ===== AUTO-RECALCULATE on dimension/layout changes =====
  useEffect(() => {
    if (activeTab === 'edit') return;
    try {
      const fields = DIMENSION_FIELDS[layoutType];
      const allValid = fields.every(f => {
        const val = dimensions[f.key];
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

      // Step 2: Find optimal distribution
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

      // Compute carpet combo options (unlimited stock for new designs)
      if (floorRect) {
        const carpetInventory: CarpetInventory = { 1: 999, 2: 999, 3: 999, 4: 999 };
        const combos = selectBestCarpetCombo(floorRect, carpetInventory);
        setAllCombos(combos);

        setCarpetPositionOverrides({});
        if (combos.length > 0 && !carpetCombo) {
          setCarpetCombo(combos[0]);
          setIncludeCarpet(true);
        }
      } else {
        setAllCombos([]);
        setCarpetCombo(null);
        setCarpetPositionOverrides({});
      }
    } catch (err: any) {
      console.error('[NewCustomPage] Calculation error:', err);
      setCalcError(err.message || 'Erreur de calcul');
      setSvgDataUrl(null);
      setSvgRaw(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutType, dimensions, activeTab]);

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

  // ===== PIECES LIST (for image overlay) =====
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

    let rect: Element | null = null;
    if (target && target instanceof Element) {
      rect = target.closest('rect[data-wall-id], rect[data-carpet-id]');
    }

    if (!rect) {
      const TOUCH_TOLERANCE = 15;
      const allRects = svgContainer.querySelectorAll('rect[data-wall-id], rect[data-carpet-id]');
      let bestDist = Infinity;
      for (const r of allRects) {
        const bounds = r.getBoundingClientRect();
        const expanded = {
          left: bounds.left - TOUCH_TOLERANCE,
          right: bounds.right + TOUCH_TOLERANCE,
          top: bounds.top - TOUCH_TOLERANCE,
          bottom: bounds.bottom + TOUCH_TOLERANCE,
        };
        if (clientX >= expanded.left && clientX <= expanded.right && clientY >= expanded.top && clientY <= expanded.bottom) {
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
      setIncludeCarpet(false);
    } else {
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
    const svgContainer = document.getElementById('svg-canvas');
    if (!svgContainer) return;
    svgContainer.querySelectorAll('rect[data-highlight]').forEach(r => {
      r.removeAttribute('data-highlight');
      (r as SVGElement).style.filter = '';
    });
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
      if (draggingCarpetRef.current) {
        draggingCarpetRef.current = null;
      }
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
      touchStartTime.current = Date.now();
      touchStartPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
      if (e.touches.length === 1) {
        handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    } else if (draggingCarpetRef.current) {
      const elapsed = Date.now() - touchStartTime.current;
      const wasTap = elapsed < 300 && panDistanceRef.current < 10;
      if (wasTap) {
        draggingCarpetRef.current = null;
        selectPieceAtPoint(touchStartPoint.current.x, touchStartPoint.current.y);
      } else {
        const lastTouch = e.changedTouches[0];
        handleCarpetDragEnd(lastTouch.clientX, lastTouch.clientY);
      }
    } else {
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

  return (
    <div className="h-full w-full bg-stone-100 flex flex-col overflow-hidden" dir="ltr">
      {/* ===== FLOATING HEADER ===== */}
      <div className="absolute top-2 right-2 left-2 sm:top-4 sm:right-4 sm:left-4 z-30 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-stone-200">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="h-6 w-px bg-stone-200" />
            <span className="hidden sm:inline text-sm font-semibold text-stone-900 tracking-tight">Nouveau design sur mesure</span>
          </div>
        </div>

        {/* Center: Layout Type Picker */}
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

        {/* Right: Export Button */}
        <div className="flex items-center gap-1.5 sm:gap-3">
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
              draggingCarpetRef.current = null;
              selectPieceAtPoint(e.clientX, e.clientY, e.target);
            } else {
              handleCarpetDragEnd(e.clientX, e.clientY);
            }
            return;
          }
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
                  className="max-w-none select-none [&_rect[data-carpet-id]]:cursor-grab"
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
    </div>
  );
}
