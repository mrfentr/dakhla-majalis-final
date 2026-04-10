/**
 * Geometry Calculator for Majalis Layouts
 *
 * This module handles all the DETERMINISTIC geometry calculations:
 * - Corner ownership scenarios
 * - Effective lengths for Glssa (base cushion)
 * - Effective lengths for Wssada (back cushion)
 *
 * KEY RULE: Pieces TOUCH but never OVERLAP at corners.
 * - Wall that OWNS corner = full length
 * - Wall that DOESN'T own corner = length - depth
 *
 * Glssa depth = 70cm, Wssada depth = 10cm
 * These are calculated INDEPENDENTLY!
 */

import { LayoutType } from './types';

// ============================================
// CONSTANTS
// ============================================

export const GLSSA_DEPTH = 70; // cm - base cushion depth
export const WSSADA_DEPTH = 10; // cm - back cushion depth

export const GLSSA_MIN = 110; // cm - minimum piece length
export const GLSSA_MAX = 190; // cm - maximum piece length

export const WSSADA_REGULAR_MIN = 80; // cm
export const WSSADA_REGULAR_MAX = 90; // cm
export const WSSADA_CORNER_MIN = 58; // cm
export const WSSADA_CORNER_MAX = 60; // cm

// ============================================
// TYPES
// ============================================

export interface WallGeometry {
  wallId: string;
  inputLength: number; // Original wall length
  glssaEffective: number; // Effective length for Glssa (after corner deductions)
  wssadaEffective: number; // Effective length for Wssada (after corner deductions)
  glssaOwnsCorners: string[]; // Which corners this wall owns for Glssa
  wssadaOwnsCorners: string[]; // Which corners this wall owns for Wssada
  wssadaSide: 'top' | 'bottom' | 'left' | 'right'; // Which side Wssada sits (against wall)
}

export interface CornerOwnership {
  cornerId: string;
  glssaOwner: string; // Wall ID that owns this corner for Glssa
  wssadaOwner: string; // Wall ID that owns this corner for Wssada
}

export interface GeometryScenario {
  scenarioId: string;
  description: string;
  corners: CornerOwnership[];
  walls: WallGeometry[];
  isValid: boolean; // False if any effective length is in impossible range (191-219cm)
  validationErrors: string[];
}

export interface LayoutGeometry {
  layoutType: LayoutType;
  inputDimensions: Record<string, number>;
  scenarios: GeometryScenario[];
  recommendedScenarioId: string | null;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a length can be covered by valid Glssa pieces
 * Impossible range: 191-219cm (too long for 1 piece, too short for 2)
 */
export function isGlssaLengthValid(length: number): boolean {
  if (length < GLSSA_MIN) return false; // Too short
  if (length >= GLSSA_MIN && length <= GLSSA_MAX) return true; // Single piece
  if (length >= 191 && length <= 219) return false; // Impossible range
  if (length >= 220) return true; // Two or more pieces
  return false;
}

/**
 * Check if a length can be covered by valid Wssada pieces
 */
export function isWssadaLengthValid(length: number): boolean {
  if (length < WSSADA_CORNER_MIN) return false; // Too short even for corner piece
  return true; // Wssada pieces are more flexible
}

// ============================================
// SINGLE WALL GEOMETRY
// ============================================

export function calculateSingleWallGeometry(
  wallLength: number
): LayoutGeometry {
  // Single wall has no corners - just one scenario
  const wall: WallGeometry = {
    wallId: 'main',
    inputLength: wallLength,
    glssaEffective: wallLength,
    wssadaEffective: wallLength,
    glssaOwnsCorners: [],
    wssadaOwnsCorners: [],
    wssadaSide: 'top', // Wssada against the wall (top in diagram)
  };

  const scenario: GeometryScenario = {
    scenarioId: 'single',
    description: 'Single wall - no corners',
    corners: [],
    walls: [wall],
    isValid: isGlssaLengthValid(wallLength),
    validationErrors: [],
  };

  if (!scenario.isValid) {
    scenario.validationErrors.push(
      `Wall length ${wallLength}cm is in impossible range for Glssa`
    );
  }

  return {
    layoutType: 'single-wall',
    inputDimensions: { wallLength },
    scenarios: [scenario],
    recommendedScenarioId: 'single',
  };
}

// ============================================
// L-SHAPE GEOMETRY
// ============================================

export function calculateLShapeGeometry(
  hLength: number,
  vLength: number
): LayoutGeometry {
  const scenarios: GeometryScenario[] = [];

  // Corner ID for the single corner where H and V meet
  const cornerId = 'HV';

  // ============================================
  // Scenario 1: H owns corner (for both Glssa and Wssada)
  // ============================================
  const scenario1: GeometryScenario = {
    scenarioId: 'H-owns',
    description: 'Horizontal wall owns the corner',
    corners: [
      {
        cornerId,
        glssaOwner: 'H',
        wssadaOwner: 'H',
      },
    ],
    walls: [
      {
        wallId: 'H',
        inputLength: hLength,
        glssaEffective: hLength, // H owns, gets full length
        wssadaEffective: hLength, // H owns, gets full length
        glssaOwnsCorners: [cornerId],
        wssadaOwnsCorners: [cornerId],
        wssadaSide: 'top',
      },
      {
        wallId: 'V',
        inputLength: vLength,
        glssaEffective: vLength - GLSSA_DEPTH, // V deducts 70cm
        wssadaEffective: vLength - WSSADA_DEPTH, // V deducts 10cm
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'left',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  // Validate
  if (!isGlssaLengthValid(scenario1.walls[0].glssaEffective)) {
    scenario1.isValid = false;
    scenario1.validationErrors.push(
      `H Glssa ${scenario1.walls[0].glssaEffective}cm is invalid`
    );
  }
  if (!isGlssaLengthValid(scenario1.walls[1].glssaEffective)) {
    scenario1.isValid = false;
    scenario1.validationErrors.push(
      `V Glssa ${scenario1.walls[1].glssaEffective}cm is in impossible range (191-219cm)`
    );
  }

  scenarios.push(scenario1);

  // ============================================
  // Scenario 2: V owns corner (for both Glssa and Wssada)
  // ============================================
  const scenario2: GeometryScenario = {
    scenarioId: 'V-owns',
    description: 'Vertical wall owns the corner',
    corners: [
      {
        cornerId,
        glssaOwner: 'V',
        wssadaOwner: 'V',
      },
    ],
    walls: [
      {
        wallId: 'H',
        inputLength: hLength,
        glssaEffective: hLength - GLSSA_DEPTH, // H deducts 70cm
        wssadaEffective: hLength - WSSADA_DEPTH, // H deducts 10cm
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'top',
      },
      {
        wallId: 'V',
        inputLength: vLength,
        glssaEffective: vLength, // V owns, gets full length
        wssadaEffective: vLength, // V owns, gets full length
        glssaOwnsCorners: [cornerId],
        wssadaOwnsCorners: [cornerId],
        wssadaSide: 'left',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  // Validate
  if (!isGlssaLengthValid(scenario2.walls[0].glssaEffective)) {
    scenario2.isValid = false;
    scenario2.validationErrors.push(
      `H Glssa ${scenario2.walls[0].glssaEffective}cm is in impossible range (191-219cm)`
    );
  }
  if (!isGlssaLengthValid(scenario2.walls[1].glssaEffective)) {
    scenario2.isValid = false;
    scenario2.validationErrors.push(
      `V Glssa ${scenario2.walls[1].glssaEffective}cm is invalid`
    );
  }

  scenarios.push(scenario2);

  // ============================================
  // Determine recommended scenario
  // ============================================
  let recommendedScenarioId: string | null = null;

  // Prefer valid scenarios
  const validScenarios = scenarios.filter((s) => s.isValid);
  if (validScenarios.length === 1) {
    recommendedScenarioId = validScenarios[0].scenarioId;
  } else if (validScenarios.length > 1) {
    // Both valid - pick the one with better piece distribution (less void)
    // For now, just pick the first valid one
    recommendedScenarioId = validScenarios[0].scenarioId;
  }

  return {
    layoutType: 'l-shape',
    inputDimensions: { hLength, vLength },
    scenarios,
    recommendedScenarioId,
  };
}

// ============================================
// U-SHAPE GEOMETRY
// ============================================

export function calculateUShapeGeometry(
  leftLength: number,
  centerLength: number,
  rightLength: number
): LayoutGeometry {
  const scenarios: GeometryScenario[] = [];

  // Two corners: Left-Center (LC) and Center-Right (CR)
  const cornerLC = 'LC';
  const cornerCR = 'CR';

  // ============================================
  // Scenario 1: L owns LC, R owns CR (Most common)
  // ============================================
  const scenario1: GeometryScenario = {
    scenarioId: 'L-R-own',
    description: 'Left owns left corner, Right owns right corner',
    corners: [
      { cornerId: cornerLC, glssaOwner: 'L', wssadaOwner: 'L' },
      { cornerId: cornerCR, glssaOwner: 'R', wssadaOwner: 'R' },
    ],
    walls: [
      {
        wallId: 'L',
        inputLength: leftLength,
        glssaEffective: leftLength,
        wssadaEffective: leftLength,
        glssaOwnsCorners: [cornerLC],
        wssadaOwnsCorners: [cornerLC],
        wssadaSide: 'left',
      },
      {
        wallId: 'C',
        inputLength: centerLength,
        glssaEffective: centerLength - 2 * GLSSA_DEPTH, // Deducts both sides
        wssadaEffective: centerLength - 2 * WSSADA_DEPTH,
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'top',
      },
      {
        wallId: 'R',
        inputLength: rightLength,
        glssaEffective: rightLength,
        wssadaEffective: rightLength,
        glssaOwnsCorners: [cornerCR],
        wssadaOwnsCorners: [cornerCR],
        wssadaSide: 'right',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  validateScenario(scenario1);
  scenarios.push(scenario1);

  // ============================================
  // Scenario 2: L owns LC, C owns CR
  // ============================================
  const scenario2: GeometryScenario = {
    scenarioId: 'L-C-own',
    description: 'Left owns left corner, Center owns right corner',
    corners: [
      { cornerId: cornerLC, glssaOwner: 'L', wssadaOwner: 'L' },
      { cornerId: cornerCR, glssaOwner: 'C', wssadaOwner: 'C' },
    ],
    walls: [
      {
        wallId: 'L',
        inputLength: leftLength,
        glssaEffective: leftLength,
        wssadaEffective: leftLength,
        glssaOwnsCorners: [cornerLC],
        wssadaOwnsCorners: [cornerLC],
        wssadaSide: 'left',
      },
      {
        wallId: 'C',
        inputLength: centerLength,
        glssaEffective: centerLength - GLSSA_DEPTH, // Only deducts left side
        wssadaEffective: centerLength - WSSADA_DEPTH,
        glssaOwnsCorners: [cornerCR],
        wssadaOwnsCorners: [cornerCR],
        wssadaSide: 'top',
      },
      {
        wallId: 'R',
        inputLength: rightLength,
        glssaEffective: rightLength - GLSSA_DEPTH,
        wssadaEffective: rightLength - WSSADA_DEPTH,
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'right',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  validateScenario(scenario2);
  scenarios.push(scenario2);

  // ============================================
  // Scenario 3: C owns LC, R owns CR
  // ============================================
  const scenario3: GeometryScenario = {
    scenarioId: 'C-R-own',
    description: 'Center owns left corner, Right owns right corner',
    corners: [
      { cornerId: cornerLC, glssaOwner: 'C', wssadaOwner: 'C' },
      { cornerId: cornerCR, glssaOwner: 'R', wssadaOwner: 'R' },
    ],
    walls: [
      {
        wallId: 'L',
        inputLength: leftLength,
        glssaEffective: leftLength - GLSSA_DEPTH,
        wssadaEffective: leftLength - WSSADA_DEPTH,
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'left',
      },
      {
        wallId: 'C',
        inputLength: centerLength,
        glssaEffective: centerLength - GLSSA_DEPTH, // Only deducts right side
        wssadaEffective: centerLength - WSSADA_DEPTH,
        glssaOwnsCorners: [cornerLC],
        wssadaOwnsCorners: [cornerLC],
        wssadaSide: 'top',
      },
      {
        wallId: 'R',
        inputLength: rightLength,
        glssaEffective: rightLength,
        wssadaEffective: rightLength,
        glssaOwnsCorners: [cornerCR],
        wssadaOwnsCorners: [cornerCR],
        wssadaSide: 'right',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  validateScenario(scenario3);
  scenarios.push(scenario3);

  // ============================================
  // Scenario 4: C owns both corners
  // ============================================
  const scenario4: GeometryScenario = {
    scenarioId: 'C-owns-both',
    description: 'Center owns both corners',
    corners: [
      { cornerId: cornerLC, glssaOwner: 'C', wssadaOwner: 'C' },
      { cornerId: cornerCR, glssaOwner: 'C', wssadaOwner: 'C' },
    ],
    walls: [
      {
        wallId: 'L',
        inputLength: leftLength,
        glssaEffective: leftLength - GLSSA_DEPTH,
        wssadaEffective: leftLength - WSSADA_DEPTH,
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'left',
      },
      {
        wallId: 'C',
        inputLength: centerLength,
        glssaEffective: centerLength, // Owns both, gets full length
        wssadaEffective: centerLength,
        glssaOwnsCorners: [cornerLC, cornerCR],
        wssadaOwnsCorners: [cornerLC, cornerCR],
        wssadaSide: 'top',
      },
      {
        wallId: 'R',
        inputLength: rightLength,
        glssaEffective: rightLength - GLSSA_DEPTH,
        wssadaEffective: rightLength - WSSADA_DEPTH,
        glssaOwnsCorners: [],
        wssadaOwnsCorners: [],
        wssadaSide: 'right',
      },
    ],
    isValid: true,
    validationErrors: [],
  };

  validateScenario(scenario4);
  scenarios.push(scenario4);

  // ============================================
  // Determine recommended scenario
  // ============================================
  const validScenarios = scenarios.filter((s) => s.isValid);
  let recommendedScenarioId: string | null = null;

  if (validScenarios.length === 1) {
    recommendedScenarioId = validScenarios[0].scenarioId;
  } else if (validScenarios.length > 1) {
    // Prefer L-R-own as it's most common/natural
    const preferred = validScenarios.find((s) => s.scenarioId === 'L-R-own');
    recommendedScenarioId = preferred
      ? preferred.scenarioId
      : validScenarios[0].scenarioId;
  }

  return {
    layoutType: 'u-shape',
    inputDimensions: { leftLength, centerLength, rightLength },
    scenarios,
    recommendedScenarioId,
  };
}

// ============================================
// FOUR WALLS GEOMETRY
// ============================================

export function calculateFourWallsGeometry(
  topLength: number,
  leftLength: number,
  rightLength: number,
  bottomLeftLength: number,
  bottomRightLength: number
): LayoutGeometry {
  const scenarios: GeometryScenario[] = [];

  // Determine which bottom corners exist based on wall lengths
  // A bottom wall exists if it's long enough for at least one Glssa piece
  const hasBL = bottomLeftLength >= GLSSA_MIN;
  const hasBR = bottomRightLength >= GLSSA_MIN;

  // Define corner options: each corner can be owned by one of two walls
  interface CornerOption {
    cornerId: string;
    wallA: string; // First option (side wall)
    wallB: string; // Second option (top/bottom wall)
  }

  const cornerOptions: CornerOption[] = [
    { cornerId: 'TL', wallA: 'L', wallB: 'T' },
    { cornerId: 'TR', wallA: 'R', wallB: 'T' },
  ];
  if (hasBL) {
    cornerOptions.push({ cornerId: 'BL', wallA: 'L', wallB: 'BL' });
  }
  if (hasBR) {
    cornerOptions.push({ cornerId: 'BR', wallA: 'R', wallB: 'BR' });
  }

  // Generate all 2^N corner ownership permutations
  const numCombos = 1 << cornerOptions.length;

  for (let mask = 0; mask < numCombos; mask++) {
    // Build corner ownership for this permutation
    const corners: CornerOwnership[] = [];
    for (let i = 0; i < cornerOptions.length; i++) {
      const opt = cornerOptions[i];
      const owner = (mask & (1 << i)) ? opt.wallB : opt.wallA;
      corners.push({
        cornerId: opt.cornerId,
        glssaOwner: owner,
        wssadaOwner: owner,
      });
    }

    // Build scenario ID from corner assignments
    const scenarioId = corners.map(c => `${c.cornerId}:${c.glssaOwner}`).join('-');
    const description = corners.map(c => `${c.cornerId}\u2192${c.glssaOwner}`).join(', ');

    // Helper: check if a wall owns a specific corner
    const wallOwnsCorner = (wallId: string, cornerId: string): boolean => {
      return corners.some(c => c.cornerId === cornerId && c.glssaOwner === wallId);
    };

    // Helper: get corners owned by a wall
    const getOwnedCorners = (wallId: string): string[] => {
      return corners.filter(c => c.glssaOwner === wallId).map(c => c.cornerId);
    };

    // Count corner deductions for each wall
    // A wall loses GLSSA_DEPTH for each corner at its junction that it does NOT own
    const tLostCorners =
      (!wallOwnsCorner('T', 'TL') ? 1 : 0) +
      (!wallOwnsCorner('T', 'TR') ? 1 : 0);
    const lLostCorners =
      (!wallOwnsCorner('L', 'TL') ? 1 : 0) +
      (hasBL && !wallOwnsCorner('L', 'BL') ? 1 : 0);
    const rLostCorners =
      (!wallOwnsCorner('R', 'TR') ? 1 : 0) +
      (hasBR && !wallOwnsCorner('R', 'BR') ? 1 : 0);

    // Build walls array
    const walls: WallGeometry[] = [
      {
        wallId: 'T',
        inputLength: topLength,
        glssaEffective: topLength - tLostCorners * GLSSA_DEPTH,
        wssadaEffective: topLength - tLostCorners * WSSADA_DEPTH,
        glssaOwnsCorners: getOwnedCorners('T'),
        wssadaOwnsCorners: getOwnedCorners('T'),
        wssadaSide: 'top' as const,
      },
      {
        wallId: 'L',
        inputLength: leftLength,
        glssaEffective: leftLength - lLostCorners * GLSSA_DEPTH,
        wssadaEffective: leftLength - lLostCorners * WSSADA_DEPTH,
        glssaOwnsCorners: getOwnedCorners('L'),
        wssadaOwnsCorners: getOwnedCorners('L'),
        wssadaSide: 'left' as const,
      },
      {
        wallId: 'R',
        inputLength: rightLength,
        glssaEffective: rightLength - rLostCorners * GLSSA_DEPTH,
        wssadaEffective: rightLength - rLostCorners * WSSADA_DEPTH,
        glssaOwnsCorners: getOwnedCorners('R'),
        wssadaOwnsCorners: getOwnedCorners('R'),
        wssadaSide: 'right' as const,
      },
    ];

    // Add BL wall if it exists
    if (hasBL) {
      const blLostCorners = !wallOwnsCorner('BL', 'BL') ? 1 : 0;
      const blEffective = bottomLeftLength - blLostCorners * GLSSA_DEPTH;
      // Only include BL if it's still long enough after deductions
      if (blEffective >= GLSSA_MIN) {
        walls.push({
          wallId: 'BL',
          inputLength: bottomLeftLength,
          glssaEffective: blEffective,
          wssadaEffective: bottomLeftLength - blLostCorners * WSSADA_DEPTH,
          glssaOwnsCorners: getOwnedCorners('BL'),
          wssadaOwnsCorners: getOwnedCorners('BL'),
          wssadaSide: 'bottom' as const,
        });
      }
    }

    // Add BR wall if it exists
    if (hasBR) {
      const brLostCorners = !wallOwnsCorner('BR', 'BR') ? 1 : 0;
      const brEffective = bottomRightLength - brLostCorners * GLSSA_DEPTH;
      // Only include BR if it's still long enough after deductions
      if (brEffective >= GLSSA_MIN) {
        walls.push({
          wallId: 'BR',
          inputLength: bottomRightLength,
          glssaEffective: brEffective,
          wssadaEffective: bottomRightLength - brLostCorners * WSSADA_DEPTH,
          glssaOwnsCorners: getOwnedCorners('BR'),
          wssadaOwnsCorners: getOwnedCorners('BR'),
          wssadaSide: 'bottom' as const,
        });
      }
    }

    const scenario: GeometryScenario = {
      scenarioId,
      description,
      corners,
      walls,
      isValid: true,
      validationErrors: [],
    };

    validateScenario(scenario);
    scenarios.push(scenario);
  }

  // Recommended: first valid scenario (real optimization done in piece-distributor)
  const validScenarios = scenarios.filter(s => s.isValid);
  const recommendedScenarioId = validScenarios.length > 0 ? validScenarios[0].scenarioId : null;

  return {
    layoutType: 'four-walls',
    inputDimensions: {
      topLength,
      leftLength,
      rightLength,
      bottomLeftLength,
      bottomRightLength,
    },
    scenarios,
    recommendedScenarioId,
  };
}

// ============================================
// VALIDATION HELPER
// ============================================

function validateScenario(scenario: GeometryScenario): void {
  for (const wall of scenario.walls) {
    if (!isGlssaLengthValid(wall.glssaEffective)) {
      scenario.isValid = false;
      scenario.validationErrors.push(
        `${wall.wallId} Glssa effective ${wall.glssaEffective}cm is invalid (impossible range 191-219cm or < ${GLSSA_MIN}cm)`
      );
    }
  }
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export function calculateGeometry(
  layoutType: LayoutType,
  dimensions: Record<string, number>
): LayoutGeometry {
  switch (layoutType) {
    case 'single-wall':
      return calculateSingleWallGeometry(
        dimensions.wallLength || dimensions.length || dimensions.single || dimensions.singleWall || 0
      );

    case 'l-shape':
      return calculateLShapeGeometry(
        dimensions.horizontalLength || dimensions.h || dimensions.hLength || dimensions.lShapeH || 0,
        dimensions.verticalLength || dimensions.v || dimensions.vLength || dimensions.lShapeV || 0
      );

    case 'u-shape':
      return calculateUShapeGeometry(
        dimensions.leftLength || dimensions.left || dimensions.l || dimensions.uShapeL || 0,
        dimensions.centerLength || dimensions.center || dimensions.c || dimensions.uShapeH || 0,
        dimensions.rightLength || dimensions.right || dimensions.r || dimensions.uShapeR || 0
      );

    case 'four-walls':
      return calculateFourWallsGeometry(
        dimensions.topLength || dimensions.top || dimensions.fourWallsTop || 0,
        dimensions.leftLength || dimensions.left || dimensions.fourWallsLeft || 0,
        dimensions.rightLength || dimensions.right || dimensions.fourWallsRight || 0,
        dimensions.bottomLeftLength ||
          dimensions.bottomLeft ||
          dimensions.leftToDoor ||
          dimensions.fourWallsBottomLeft ||
          0,
        dimensions.bottomRightLength ||
          dimensions.bottomRight ||
          dimensions.doorToRight ||
          dimensions.fourWallsBottomRight ||
          0
      );

    default:
      throw new Error(`Unknown layout type: ${layoutType}`);
  }
}

// ============================================
// UTILITY: Get best scenario
// ============================================

export function getBestScenario(
  geometry: LayoutGeometry
): GeometryScenario | null {
  if (geometry.recommendedScenarioId) {
    return (
      geometry.scenarios.find(
        (s) => s.scenarioId === geometry.recommendedScenarioId
      ) || null
    );
  }

  // Fallback: return first valid scenario
  return geometry.scenarios.find((s) => s.isValid) || null;
}

// ============================================
// UTILITY: Summary for debugging
// ============================================

export function geometrySummary(geometry: LayoutGeometry): string {
  const lines: string[] = [
    `Layout: ${geometry.layoutType}`,
    `Input: ${JSON.stringify(geometry.inputDimensions)}`,
    `Scenarios: ${geometry.scenarios.length}`,
    `Recommended: ${geometry.recommendedScenarioId || 'none'}`,
    '',
  ];

  for (const scenario of geometry.scenarios) {
    lines.push(`--- ${scenario.scenarioId} (${scenario.isValid ? 'VALID' : 'INVALID'}) ---`);
    lines.push(`  ${scenario.description}`);

    for (const wall of scenario.walls) {
      lines.push(
        `  ${wall.wallId}: Glssa=${wall.glssaEffective}cm, Wssada=${wall.wssadaEffective}cm`
      );
    }

    if (scenario.validationErrors.length > 0) {
      lines.push(`  Errors: ${scenario.validationErrors.join(', ')}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
