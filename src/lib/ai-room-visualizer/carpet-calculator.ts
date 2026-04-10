/**
 * Carpet Calculator
 *
 * Calculates which carpet sizes fit the floor area of a room layout,
 * considering inventory constraints and composite carpet types.
 *
 * Base types (1-4) are tracked in inventory directly.
 * Composite types (5-10) consume 2 units of a base type each.
 */

// ============================================
// TYPES
// ============================================

export interface BaseCarpetType {
  id: number;
  widthCm: number;
  heightCm: number;
  price: number;
  label: string;
}

export interface CompositeCarpetType {
  id: number;
  widthCm: number;
  heightCm: number;
  price: number;
  label: string;
  baseTypeId: number; // which base type it consumes
  baseQuantity: number; // how many of that base type (always 2)
}

export type CarpetType = BaseCarpetType | CompositeCarpetType;

export interface FloorRect {
  x: number; // origin X in cm
  y: number; // origin Y in cm
  width: number; // in cm
  height: number; // in cm
}

export interface CarpetInventory {
  [baseTypeId: number]: number; // baseTypeId (1-4) → available stock
}

export interface CarpetFitResult {
  carpetType: CarpetType;
  rotated: boolean; // true if rotated 90°
  fitWidth: number; // actual width placed (after rotation)
  fitHeight: number; // actual height placed (after rotation)
  coveragePercent: number; // how much of floor is covered
  totalGap: number; // total uncovered area in cm²
  price: number;
  baseTypeConsumed: number; // base type ID to deduct from stock
  baseTypeQuantity: number; // how many units to deduct (1 for base, 2 for composite)
}

// ============================================
// CARPET TYPE DEFINITIONS
// ============================================

export const BASE_CARPET_TYPES: BaseCarpetType[] = [
  { id: 1, widthCm: 200, heightCm: 100, price: 700, label: '2×1m' },
  { id: 2, widthCm: 240, heightCm: 160, price: 1500, label: '2.40×1.60m' },
  { id: 3, widthCm: 300, heightCm: 200, price: 2100, label: '3×2m' },
  { id: 4, widthCm: 400, heightCm: 300, price: 3600, label: '4×3m' },
];

export const COMPOSITE_CARPET_TYPES: CompositeCarpetType[] = [
  { id: 5, widthCm: 480, heightCm: 160, price: 3000, baseTypeId: 2, baseQuantity: 2, label: '4.80×1.60m' },
  { id: 6, widthCm: 320, heightCm: 240, price: 3000, baseTypeId: 2, baseQuantity: 2, label: '3.20×2.40m' },
  { id: 7, widthCm: 800, heightCm: 300, price: 7200, baseTypeId: 4, baseQuantity: 2, label: '8×3m' },
  { id: 8, widthCm: 400, heightCm: 600, price: 7200, baseTypeId: 4, baseQuantity: 2, label: '4×6m' },
  { id: 9, widthCm: 600, heightCm: 200, price: 4200, baseTypeId: 3, baseQuantity: 2, label: '6×2m' },
  { id: 10, widthCm: 400, heightCm: 300, price: 4200, baseTypeId: 3, baseQuantity: 2, label: '4×3m' },
];

export const ALL_CARPET_TYPES: CarpetType[] = [...BASE_CARPET_TYPES, ...COMPOSITE_CARPET_TYPES];

// ============================================
// FLOOR SPACE CALCULATOR
// ============================================

/**
 * Calculate the usable floor rectangle for a given layout.
 * 70cm = Glssa depth along walls.
 *
 * Returns null if no enclosed floor area exists (e.g. single-wall)
 * or if calculated dimensions are <= 0.
 */
export function calculateFloorRect(
  layoutType: string,
  dimensions: Record<string, number>
): FloorRect | null {
  switch (layoutType) {
    case 'single-wall': {
      return null;
    }

    case 'l-shape': {
      const hLen = dimensions.hLength || dimensions.horizontalLength || dimensions.h || dimensions.lShapeH || 0;
      const vLen = dimensions.vLength || dimensions.verticalLength || dimensions.v || dimensions.lShapeV || 0;
      const width = hLen - 70;
      const height = vLen - 70;
      if (width <= 0 || height <= 0) return null;
      return { x: 70, y: 70, width, height };
    }

    case 'u-shape': {
      const cLen = dimensions.centerLength || dimensions.center || dimensions.c || dimensions.uShapeH || 0;
      const lLen = dimensions.leftLength || dimensions.left || dimensions.l || dimensions.uShapeL || 0;
      const rLen = dimensions.rightLength || dimensions.right || dimensions.r || dimensions.uShapeR || 0;
      const width = cLen - 140;
      const height = Math.max(lLen, rLen) - 70;
      if (width <= 0 || height <= 0) return null;
      return { x: 70, y: 70, width, height };
    }

    case 'four-walls': {
      const tLen = dimensions.topLength || dimensions.top || dimensions.fourWallsTop || 0;
      const leftLen = dimensions.leftLength || dimensions.left || dimensions.fourWallsLeft || 0;
      const rightLen = dimensions.rightLength || dimensions.right || dimensions.fourWallsRight || 0;
      const width = tLen - 140;
      const height = Math.max(leftLen, rightLen) - 140;
      if (width <= 0 || height <= 0) return null;
      return { x: 70, y: 70, width, height };
    }

    default:
      return null;
  }
}

// ============================================
// CARPET SELECTION ALGORITHM
// ============================================

function isCompositeCarpetType(ct: CarpetType): ct is CompositeCarpetType {
  return 'baseTypeId' in ct;
}

/**
 * Find all carpet types that fit the given floor area, sorted by best fit.
 *
 * Tries all 10 types × 2 orientations (normal + rotated 90°).
 * Checks inventory stock for availability.
 * Sorts by: highest coverage % → smallest gap → lowest price.
 */
export function selectBestCarpets(
  floor: FloorRect,
  inventory: CarpetInventory
): CarpetFitResult[] {
  const results: CarpetFitResult[] = [];
  const floorArea = floor.width * floor.height;

  for (const carpetType of ALL_CARPET_TYPES) {
    const orientations: Array<{ rotated: boolean; w: number; h: number }> = [
      { rotated: false, w: carpetType.widthCm, h: carpetType.heightCm },
      { rotated: true, w: carpetType.heightCm, h: carpetType.widthCm },
    ];

    for (const { rotated, w, h } of orientations) {
      // Check if carpet fits within floor
      if (w > floor.width || h > floor.height) continue;

      // Check stock availability
      if (isCompositeCarpetType(carpetType)) {
        if ((inventory[carpetType.baseTypeId] || 0) < carpetType.baseQuantity) continue;
      } else {
        if ((inventory[carpetType.id] || 0) < 1) continue;
      }

      const carpetArea = w * h;
      const coveragePercent = (carpetArea / floorArea) * 100;
      const totalGap = floorArea - carpetArea;

      results.push({
        carpetType,
        rotated,
        fitWidth: w,
        fitHeight: h,
        coveragePercent,
        totalGap,
        price: carpetType.price,
        baseTypeConsumed: isCompositeCarpetType(carpetType)
          ? carpetType.baseTypeId
          : carpetType.id,
        baseTypeQuantity: isCompositeCarpetType(carpetType)
          ? carpetType.baseQuantity
          : 1,
      });
    }
  }

  // Sort: highest coverage → smallest gap → lowest price
  results.sort((a, b) => {
    if (b.coveragePercent !== a.coveragePercent) {
      return b.coveragePercent - a.coveragePercent;
    }
    if (a.totalGap !== b.totalGap) {
      return a.totalGap - b.totalGap;
    }
    return a.price - b.price;
  });

  return results;
}

// ============================================
// MULTI-CARPET COMBO TYPES
// ============================================

export interface CarpetPlacement {
  carpetType: CarpetType;
  rotated: boolean;
  fitWidth: number;    // width after rotation
  fitHeight: number;   // height after rotation
  posX: number;        // cm from floor-rect left edge
  posY: number;        // cm from floor-rect top edge
}

export interface MultiCarpetResult {
  placements: CarpetPlacement[];
  totalCoveragePercent: number;
  totalCoveredArea: number;
  totalGap: number;
  totalPrice: number;
  stockUsage: Record<number, number>; // baseTypeId → total units consumed
}

// ============================================
// LABEL HELPER
// ============================================

/**
 * Get display label for a carpet type, swapping dimensions when rotated.
 * e.g. "2×1m" → "1×2m" when rotated
 */
export function getCarpetDisplayLabel(type: CarpetType, rotated: boolean): string {
  if (!rotated) return type.label;
  // Parse "W×Hm" or "W×H m" pattern
  const match = type.label.match(/^(.+?)×(.+?)m$/);
  if (!match) return type.label;
  return `${match[2]}×${match[1]}m`;
}

// ============================================
// UNION AREA HELPER
// ============================================

/**
 * Calculate the union area of non-overlapping carpet rects within floor bounds.
 */
function calculateUnionArea(
  positions: Array<{ x: number; y: number }>,
  w: number, h: number,
  floorW: number, floorH: number
): number {
  let totalArea = 0;
  for (const pos of positions) {
    // Clip carpet to floor bounds
    const x1 = Math.max(pos.x, 0);
    const y1 = Math.max(pos.y, 0);
    const x2 = Math.min(pos.x + w, floorW);
    const y2 = Math.min(pos.y + h, floorH);
    if (x2 > x1 && y2 > y1) {
      totalArea += (x2 - x1) * (y2 - y1);
    }
  }
  return totalArea;
}

// ============================================
// MULTI-CARPET COMBO ALGORITHM
// ============================================

/**
 * Find the best combination of 1-3 same-type carpets for maximum coverage.
 *
 * Constraint: all carpets in a combo are the SAME type and SAME rotation.
 * Returns sorted list of combos: coverage % desc → price asc → count asc.
 */
export function selectBestCarpetCombo(
  floor: FloorRect,
  inventory: CarpetInventory,
  maxCarpets: number = 6
): MultiCarpetResult[] {
  const results: MultiCarpetResult[] = [];
  const floorArea = floor.width * floor.height;

  for (const carpetType of BASE_CARPET_TYPES) {
    const orientations: Array<{ rotated: boolean; w: number; h: number }> = [
      { rotated: false, w: carpetType.widthCm, h: carpetType.heightCm },
      { rotated: true, w: carpetType.heightCm, h: carpetType.widthCm },
    ];

    // Per-type max: small carpets don't need many; Type 4 needs up to 6 for huge rooms
    const typeMax = carpetType.id === 1 ? 2 : carpetType.id <= 3 ? 3 : 6;

    for (const { rotated, w, h } of orientations) {
      const baseId = carpetType.id;
      const stock = inventory[baseId] || 0;

      for (let count = 1; count <= Math.min(typeMax, maxCarpets, stock); count++) {
        const placements = tryGridArrangement(floor, w, h, count);
        if (!placements) continue;

        const totalCoveredArea = calculateUnionArea(placements, w, h, floor.width, floor.height);
        const totalCoveragePercent = Math.min((totalCoveredArea / floorArea) * 100, 100);
        const totalPrice = count * carpetType.price;

        results.push({
          placements: placements.map(pos => ({
            carpetType,
            rotated,
            fitWidth: w,
            fitHeight: h,
            posX: pos.x,
            posY: pos.y,
          })),
          totalCoveragePercent,
          totalCoveredArea,
          totalGap: Math.max(0, floorArea - totalCoveredArea),
          totalPrice,
          stockUsage: { [baseId]: count },
        });
      }
    }
  }

  // Sort: options with ≥90% coverage first (by price), then <90% (by coverage)
  results.sort((a, b) => {
    const aGood = a.totalCoveragePercent >= 90;
    const bGood = b.totalCoveragePercent >= 90;
    if (aGood !== bGood) return aGood ? -1 : 1;

    if (aGood && bGood) {
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      if (a.placements.length !== b.placements.length)
        return a.placements.length - b.placements.length;
      return b.totalCoveragePercent - a.totalCoveragePercent;
    }

    // Both <90%: highest coverage → cheapest → fewest
    if (Math.abs(b.totalCoveragePercent - a.totalCoveragePercent) > 0.1)
      return b.totalCoveragePercent - a.totalCoveragePercent;
    if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
    return a.placements.length - b.placements.length;
  });

  return results;
}

/**
 * Arrange `count` carpets of size w×h in a grid centered on the floor.
 * Grids CAN extend beyond floor bounds (carpets tuck under glssa).
 * Tries all valid grid configs and picks the one with best floor coverage.
 */
function tryGridArrangement(
  floor: FloorRect,
  w: number,
  h: number,
  count: number
): Array<{ x: number; y: number }> | null {
  if (count === 1) {
    return [{ x: (floor.width - w) / 2, y: (floor.height - h) / 2 }];
  }

  // Generate grid configs: rows×cols where rows*cols is between count and count+1
  const configs: Array<[number, number]> = [];
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    if (rows * cols >= count && rows * cols <= count + 1) {
      configs.push([rows, cols]);
    }
  }

  let bestPositions: Array<{ x: number; y: number }> | null = null;
  let bestCoverage = 0;

  for (const [rows, cols] of configs) {
    const startX = (floor.width - cols * w) / 2;
    const startY = (floor.height - rows * h) / 2;

    const positions: Array<{ x: number; y: number }> = [];
    for (let r = 0; r < rows && positions.length < count; r++) {
      for (let c = 0; c < cols && positions.length < count; c++) {
        positions.push({ x: startX + c * w, y: startY + r * h });
      }
    }

    const coverage = calculateUnionArea(positions, w, h, floor.width, floor.height);
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestPositions = positions;
    }
  }

  return bestPositions;
}
