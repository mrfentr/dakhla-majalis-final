/**
 * Order Reconstructor for Majalis Layouts
 *
 * Reconstructs a GeometryScenario + DistributionResult from saved order data
 * WITHOUT re-running the piece optimizer. This is used when loading existing
 * orders for display, editing, or invoice generation.
 */

import { LayoutType } from './types';
import { GeometryScenario, WallGeometry, LayoutGeometry, calculateGeometry } from './geometry-calculator';
import { PiecePosition, WallPieceDistribution, DistributionResult } from './piece-distributor';

// ============================================
// LAYOUT TYPE MAPPING
// ============================================

export const LAYOUT_TYPE_MAP: Record<string, LayoutType> = {
  'u_shape': 'u-shape',
  'l_shape': 'l-shape',
  'straight': 'single-wall',
  'custom': 'four-walls',
  'u-shape': 'u-shape',
  'l-shape': 'l-shape',
  'single-wall': 'single-wall',
  'four-walls': 'four-walls',
};

// ============================================
// DIMENSION EXTRACTION
// ============================================

function extractDimensions(
  layoutType: LayoutType,
  optData: any,
  rm: any
): Record<string, number> {
  const dims = optData?.dimensions ?? {};
  const result: Record<string, number> = {};

  switch (layoutType) {
    case 'single-wall': {
      const wallLength =
        dims.wallLength ??
        dims.singleWall ??
        dims.single ??
        dims.length ??
        rm?.width ??
        rm?.wallLength ??
        rm?.singleWall ??
        rm?.length;
      if (wallLength != null) {
        result.wallLength = Number(wallLength);
      }
      break;
    }

    case 'l-shape': {
      const h =
        dims.horizontalLength ??
        dims.lShapeH ??
        dims.h ??
        dims.horizontal ??
        rm?.horizontalLength ??
        rm?.width ??
        rm?.lShapeH ??
        rm?.h ??
        rm?.horizontal;
      const v =
        dims.verticalLength ??
        dims.lShapeV ??
        dims.v ??
        dims.vertical ??
        rm?.verticalLength ??
        rm?.height ??
        rm?.lShapeV ??
        rm?.v ??
        rm?.vertical;
      if (h != null) result.horizontalLength = Number(h);
      if (v != null) result.verticalLength = Number(v);
      break;
    }

    case 'u-shape': {
      const left =
        dims.leftLength ??
        dims.uShapeL ??
        dims.l ??
        dims.left ??
        rm?.leftLength ??
        rm?.uShapeL ??
        rm?.l ??
        rm?.left ??
        rm?.height;
      const center =
        dims.centerLength ??
        dims.uShapeH ??
        dims.c ??
        dims.center ??
        rm?.centerLength ??
        rm?.uShapeH ??
        rm?.c ??
        rm?.center ??
        rm?.width;
      const right =
        dims.rightLength ??
        dims.uShapeR ??
        dims.r ??
        dims.right ??
        rm?.rightLength ??
        rm?.uShapeR ??
        rm?.r ??
        rm?.right ??
        rm?.height;
      if (left != null) result.leftLength = Number(left);
      if (center != null) result.centerLength = Number(center);
      if (right != null) result.rightLength = Number(right);
      break;
    }

    case 'four-walls': {
      const top =
        dims.topLength ??
        dims.top ??
        dims.t ??
        rm?.topLength ??
        rm?.top ??
        rm?.width;
      const leftW =
        dims.leftLength ??
        dims.left ??
        dims.lw ??
        rm?.leftLength ??
        rm?.left ??
        rm?.height;
      const rightW =
        dims.rightLength ??
        dims.right ??
        dims.rw ??
        rm?.rightLength ??
        rm?.right ??
        rm?.height;
      const bottomLeft =
        dims.bottomLeftLength ??
        dims.bottomLeft ??
        dims.bl ??
        dims.leftToDoor ??
        rm?.bottomLeftLength ??
        rm?.bottomLeft ??
        rm?.bl ??
        rm?.leftToDoor;
      const bottomRight =
        dims.bottomRightLength ??
        dims.bottomRight ??
        dims.br ??
        dims.doorToRight ??
        rm?.bottomRightLength ??
        rm?.bottomRight ??
        rm?.br ??
        rm?.doorToRight;
      const bottom =
        dims.bottomLength ??
        dims.bottom ??
        rm?.bottomLength ??
        rm?.bottom;

      if (top != null) result.topLength = Number(top);
      if (leftW != null) result.leftLength = Number(leftW);
      if (rightW != null) result.rightLength = Number(rightW);
      if (bottomLeft != null) result.bottomLeftLength = Number(bottomLeft);
      if (bottomRight != null) result.bottomRightLength = Number(bottomRight);
      if (bottom != null) result.bottomLength = Number(bottom);
      // Also map leftToDoor / doorToRight for four-walls geometry
      if (bottomLeft != null) result.leftToDoor = Number(bottomLeft);
      if (bottomRight != null) result.doorToRight = Number(bottomRight);
      break;
    }
  }

  return result;
}

// ============================================
// PIECE RECONSTRUCTION HELPERS
// ============================================

/**
 * Reconstruct PiecePosition[] from an array of sizes.
 * Pieces are placed sequentially starting at position 0.
 */
function reconstructPieces(
  sizes: number[],
  isCornerFn?: (size: number, index: number) => boolean
): PiecePosition[] {
  if (!sizes || sizes.length === 0) return [];

  let pos = 0;
  return sizes.map((size, index) => {
    const piece: PiecePosition = {
      size,
      startPosition: pos,
      endPosition: pos + size,
    };
    if (isCornerFn) {
      piece.isCornerPiece = isCornerFn(size, index);
    }
    pos += size;
    return piece;
  });
}

/**
 * Extract wssada piece sizes from saved data.
 * Handles both old format (number[]) and new format (Array<{size, isCornerPiece}>).
 */
function extractWssadaSizes(
  wssadaPieces: any[]
): { sizes: number[]; cornerFlags: (boolean | null)[] } {
  if (!wssadaPieces || wssadaPieces.length === 0) {
    return { sizes: [], cornerFlags: [] };
  }

  const sizes: number[] = [];
  const cornerFlags: (boolean | null)[] = [];

  for (const piece of wssadaPieces) {
    if (typeof piece === 'number') {
      sizes.push(piece);
      cornerFlags.push(null); // Unknown, will infer from size
    } else if (piece && typeof piece === 'object' && piece.size != null) {
      sizes.push(Number(piece.size));
      cornerFlags.push(piece.isCornerPiece ?? null);
    }
  }

  return { sizes, cornerFlags };
}

/**
 * Extract glssa piece sizes from saved data.
 * Always number[].
 */
function extractGlssaSizes(glssaPieces: any[]): number[] {
  if (!glssaPieces || glssaPieces.length === 0) return [];
  return glssaPieces.map((p: any) => {
    if (typeof p === 'number') return p;
    if (p && typeof p === 'object' && p.size != null) return Number(p.size);
    return 0;
  }).filter((s: number) => s > 0);
}

// ============================================
// SAVED WALL DATA NORMALIZATION
// ============================================

interface NormalizedSavedWall {
  wallId: string;
  glssaPieces: number[];
  wssadaSizes: number[];
  wssadaCornerFlags: (boolean | null)[];
  glssaEffective?: number;
  wssadaEffective?: number;
  wssadaSide?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Normalize saved wall data from either array or record format.
 */
function normalizeSavedWalls(savedWalls: any): NormalizedSavedWall[] {
  if (!savedWalls) return [];

  // Array format (from checkout)
  if (Array.isArray(savedWalls)) {
    return savedWalls.map((w: any) => {
      const glssaSizes = extractGlssaSizes(w.glssaPieces);
      const { sizes: wssadaSizes, cornerFlags } = extractWssadaSizes(w.wssadaPieces);
      return {
        wallId: w.wallId ?? w.id ?? '',
        glssaPieces: glssaSizes,
        wssadaSizes,
        wssadaCornerFlags: cornerFlags,
        glssaEffective: w.glssaEffective != null ? Number(w.glssaEffective) : undefined,
        wssadaEffective: w.wssadaEffective != null ? Number(w.wssadaEffective) : undefined,
        wssadaSide: w.wssadaSide as any,
      };
    });
  }

  // Record format (from old editor): { "Wall H": { glssaPieces, wssadaPieces } }
  if (typeof savedWalls === 'object') {
    return Object.entries(savedWalls).map(([wallId, data]: [string, any]) => {
      const glssaSizes = extractGlssaSizes(data?.glssaPieces);
      const { sizes: wssadaSizes, cornerFlags } = extractWssadaSizes(data?.wssadaPieces);
      return {
        wallId,
        glssaPieces: glssaSizes,
        wssadaSizes,
        wssadaCornerFlags: cornerFlags,
        glssaEffective: data?.glssaEffective != null ? Number(data.glssaEffective) : undefined,
        wssadaEffective: data?.wssadaEffective != null ? Number(data.wssadaEffective) : undefined,
        wssadaSide: data?.wssadaSide as any,
      };
    });
  }

  return [];
}

// ============================================
// MAIN RECONSTRUCTION FUNCTION
// ============================================

export function reconstructFromOrderData(
  optimizationData: any,
  roomMeasurements: any
): {
  scenario: GeometryScenario;
  distribution: DistributionResult;
  layoutType: LayoutType;
  dimensions: Record<string, number>;
} | null {
  if (!optimizationData && !roomMeasurements) {
    return null;
  }

  // 1. Extract layoutType
  const rawLayoutType =
    optimizationData?.layoutType ??
    roomMeasurements?.layoutType;

  if (!rawLayoutType) {
    return null;
  }

  const layoutType = LAYOUT_TYPE_MAP[rawLayoutType];
  if (!layoutType) {
    return null;
  }

  // 2. Extract dimensions
  const dimensions = extractDimensions(
    layoutType,
    optimizationData ?? {},
    roomMeasurements ?? {}
  );

  if (Object.keys(dimensions).length === 0) {
    return null;
  }

  // 3. Get scenario
  let scenario: GeometryScenario | null = null;

  // Check if a full scenario object was saved
  if (
    optimizationData?.scenario &&
    typeof optimizationData.scenario === 'object' &&
    Array.isArray(optimizationData.scenario.walls) &&
    Array.isArray(optimizationData.scenario.corners)
  ) {
    scenario = optimizationData.scenario as GeometryScenario;
  } else {
    // Calculate geometry and find matching scenario
    let layoutGeometry: LayoutGeometry;
    try {
      layoutGeometry = calculateGeometry(layoutType, dimensions);
    } catch {
      return null;
    }

    if (!layoutGeometry.scenarios || layoutGeometry.scenarios.length === 0) {
      return null;
    }

    const scenarioId = optimizationData?.scenarioId;

    if (scenarioId) {
      scenario =
        layoutGeometry.scenarios.find((s) => s.scenarioId === scenarioId) ?? null;
    }

    if (!scenario) {
      // Try the recommended scenario
      if (layoutGeometry.recommendedScenarioId) {
        scenario =
          layoutGeometry.scenarios.find(
            (s) => s.scenarioId === layoutGeometry.recommendedScenarioId
          ) ?? null;
      }
    }

    if (!scenario) {
      // Fall back to the first valid scenario, or just the first one
      scenario =
        layoutGeometry.scenarios.find((s) => s.isValid) ??
        layoutGeometry.scenarios[0] ??
        null;
    }
  }

  if (!scenario) {
    return null;
  }

  // 4. Reconstruct distribution from saved walls
  const savedWalls = normalizeSavedWalls(
    optimizationData?.walls ?? optimizationData?.wallDistributions
  );

  const reconstructedWalls: WallPieceDistribution[] = [];
  let totalGlssaPieces = 0;
  let totalWssadaPieces = 0;
  let totalCornerPieces = 0;

  for (const scenarioWall of scenario.walls) {
    // Find matching saved wall data
    const savedWall = savedWalls.find(
      (sw) =>
        sw.wallId === scenarioWall.wallId ||
        sw.wallId === `Wall ${scenarioWall.wallId}` ||
        `Wall ${sw.wallId}` === scenarioWall.wallId
    );

    // Get piece sizes
    const glssaSizes = savedWall?.glssaPieces ?? [];
    const wssadaSizes = savedWall?.wssadaSizes ?? [];
    const wssadaCornerFlags = savedWall?.wssadaCornerFlags ?? [];

    // Reconstruct glssa pieces
    const glssaPieces = reconstructPieces(glssaSizes);

    // Reconstruct wssada pieces with corner detection
    const wssadaPieces = reconstructPieces(wssadaSizes, (size, index) => {
      // If we have explicit corner flags from saved data, use them
      const flag = wssadaCornerFlags[index];
      if (flag != null) return flag;
      // Otherwise infer: size <= 65 means corner piece
      return size <= 65;
    });

    // Get effective lengths and side from saved data or scenario wall
    const glssaEffective =
      savedWall?.glssaEffective ?? scenarioWall.glssaEffective ?? 0;
    const wssadaEffective =
      savedWall?.wssadaEffective ?? scenarioWall.wssadaEffective ?? 0;
    const wssadaSide =
      savedWall?.wssadaSide ?? scenarioWall.wssadaSide ?? 'top';

    // Calculate totals and voids
    const glssaTotal = glssaPieces.reduce((sum, p) => sum + p.size, 0);
    const wssadaTotal = wssadaPieces.reduce((sum, p) => sum + p.size, 0);
    const glssaVoid = Math.max(0, glssaEffective - glssaTotal);
    const wssadaVoid = Math.max(0, wssadaEffective - wssadaTotal);

    const wallCornerCount = wssadaPieces.filter(
      (p) => p.isCornerPiece
    ).length;

    totalGlssaPieces += glssaPieces.length;
    totalWssadaPieces += wssadaPieces.length;
    totalCornerPieces += wallCornerCount;

    reconstructedWalls.push({
      wallId: scenarioWall.wallId,
      glssaEffective,
      wssadaEffective,
      glssaPieces,
      wssadaPieces,
      glssaTotal,
      wssadaTotal,
      glssaVoid,
      wssadaVoid,
      wssadaSide,
    });
  }

  // 5. Build DistributionResult
  const distribution: DistributionResult = {
    success: true,
    walls: reconstructedWalls,
    totalGlssaPieces,
    totalWssadaPieces,
    totalCornerPieces,
    errors: [],
  };

  // 6. Return the full result
  return {
    scenario,
    distribution,
    layoutType,
    dimensions,
  };
}
