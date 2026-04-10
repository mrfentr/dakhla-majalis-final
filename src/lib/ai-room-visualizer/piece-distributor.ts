/**
 * Piece Distributor for Majalis Layouts
 *
 * Pure algorithmic distribution of Glssa and Wssada pieces.
 * Takes pre-calculated geometry and distributes pieces optimally.
 *
 * REAL WORLD RULES:
 * - Glssa (base): We SIT on it, 70cm deep, pieces 110-190cm
 * - Wssada (back): We LEAN on it, 10cm deep, ON TOP of Glssa against wall
 * - Corner pieces (58-60cm) go at wall junctions
 * - Regular Wssada (80-90cm) fills the rest
 * - Pieces TOUCH but never OVERLAP
 */

import {
  GeometryScenario,
  WallGeometry,
  LayoutGeometry,
  GLSSA_MIN,
  GLSSA_MAX,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
} from './geometry-calculator';

// ============================================
// ROOM-LEVEL CORNER BUDGET
// ============================================

/**
 * Maximum number of reduced/corner Wssada pieces (58-60cm) allowed per ROOM.
 * Corner pieces are smaller than regular (80-90cm) and are used at wall junctions.
 * Limiting them to 2 per room reduces manufacturing complexity.
 */
export const MAX_CORNER_PIECES_PER_ROOM = 2;

// ============================================
// TYPES
// ============================================

export interface PiecePosition {
  size: number; // Length in cm
  startPosition: number; // Start position from wall origin
  endPosition: number; // End position
  isCornerPiece?: boolean; // For Wssada corner pieces
}

export interface WallPieceDistribution {
  wallId: string;
  glssaEffective: number;
  wssadaEffective: number;
  glssaPieces: PiecePosition[];
  wssadaPieces: PiecePosition[];
  glssaTotal: number;
  wssadaTotal: number;
  glssaVoid: number; // Gap if pieces don't cover fully
  wssadaVoid: number;
  wssadaSide: 'top' | 'bottom' | 'left' | 'right';
}

export interface DistributionResult {
  success: boolean;
  walls: WallPieceDistribution[];
  totalGlssaPieces: number;
  totalWssadaPieces: number;
  totalCornerPieces: number;
  errors: string[];
}

// ============================================
// GLSSA DISTRIBUTION
// ============================================

/**
 * Find all valid Glssa combinations for a given length
 * Returns combinations sorted by preference (fewer pieces, less void)
 */
export function findGlssaCombinations(
  targetLength: number,
  maxPieces: number = 20
): number[][] {
  const combinations: number[][] = [];

  // Single piece
  if (targetLength >= GLSSA_MIN && targetLength <= GLSSA_MAX) {
    combinations.push([targetLength]);
  }

  // Two pieces
  if (targetLength >= 2 * GLSSA_MIN && targetLength <= 2 * GLSSA_MAX) {
    for (let a = GLSSA_MAX; a >= GLSSA_MIN; a--) {
      const b = targetLength - a;
      if (b >= GLSSA_MIN && b <= GLSSA_MAX) {
        combinations.push([a, b].sort((x, y) => y - x)); // Larger first
      }
    }
  }

  // Three pieces
  if (targetLength >= 3 * GLSSA_MIN && targetLength <= 3 * GLSSA_MAX) {
    for (let a = GLSSA_MAX; a >= GLSSA_MIN; a--) {
      for (let b = Math.min(a, GLSSA_MAX); b >= GLSSA_MIN; b--) {
        const c = targetLength - a - b;
        if (c >= GLSSA_MIN && c <= GLSSA_MAX && c <= b) {
          combinations.push([a, b, c]);
        }
      }
    }
  }

  // Four pieces
  if (
    maxPieces >= 4 &&
    targetLength >= 4 * GLSSA_MIN &&
    targetLength <= 4 * GLSSA_MAX
  ) {
    for (let a = GLSSA_MAX; a >= GLSSA_MIN; a--) {
      for (let b = Math.min(a, GLSSA_MAX); b >= GLSSA_MIN; b--) {
        for (let c = Math.min(b, GLSSA_MAX); c >= GLSSA_MIN; c--) {
          const d = targetLength - a - b - c;
          if (d >= GLSSA_MIN && d <= GLSSA_MAX && d <= c) {
            combinations.push([a, b, c, d]);
          }
        }
      }
    }
  }

  // Five pieces
  if (
    maxPieces >= 5 &&
    targetLength >= 5 * GLSSA_MIN &&
    targetLength <= 5 * GLSSA_MAX
  ) {
    for (let a = GLSSA_MAX; a >= GLSSA_MIN; a--) {
      for (let b = Math.min(a, GLSSA_MAX); b >= GLSSA_MIN; b--) {
        for (let c = Math.min(b, GLSSA_MAX); c >= GLSSA_MIN; c--) {
          for (let d = Math.min(c, GLSSA_MAX); d >= GLSSA_MIN; d--) {
            const e = targetLength - a - b - c - d;
            if (e >= GLSSA_MIN && e <= GLSSA_MAX && e <= d) {
              combinations.push([a, b, c, d, e]);
            }
          }
        }
      }
    }
  }

  // For 6+ pieces (large walls up to 2000cm), use even distribution
  // This avoids expensive brute-force loops for big walls
  const minPiecesForEven = Math.max(6, Math.ceil(targetLength / GLSSA_MAX));
  const maxPiecesForEven = Math.min(
    Math.floor(targetLength / GLSSA_MIN),
    maxPieces
  );

  for (let n = minPiecesForEven; n <= maxPiecesForEven; n++) {
    const base = Math.floor(targetLength / n);
    const remainder = targetLength % n;

    let valid = true;
    const testPieces: number[] = [];
    for (let i = 0; i < n; i++) {
      const size = base + (i < remainder ? 1 : 0);
      if (size < GLSSA_MIN || size > GLSSA_MAX) {
        valid = false;
        break;
      }
      testPieces.push(size);
    }

    if (valid && testPieces.reduce((a, b) => a + b, 0) === targetLength) {
      combinations.push(testPieces.sort((a, b) => b - a));
    }
  }

  // Remove duplicates and sort by preference
  const unique = removeDuplicateCombinations(combinations);
  return sortCombinationsByPreference(unique, targetLength);
}

/**
 * Remove duplicate combinations (same pieces, different order)
 */
function removeDuplicateCombinations(combinations: number[][]): number[][] {
  const seen = new Set<string>();
  return combinations.filter((combo) => {
    const key = [...combo].sort((a, b) => b - a).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort combinations by preference:
 * 1. Exact match (sum = target) - ZERO VOID is best
 * 2. Smaller void (closer to target)
 * 3. Fewer pieces
 * 4. LARGER pieces preferred (favor 180-190cm for Glssa)
 */
function sortCombinationsByPreference(
  combinations: number[][],
  targetLength: number
): number[][] {
  return combinations.sort((a, b) => {
    const sumA = a.reduce((x, y) => x + y, 0);
    const sumB = b.reduce((x, y) => x + y, 0);
    const voidA = targetLength - sumA;
    const voidB = targetLength - sumB;

    // Prefer exact matches (zero void)
    const exactA = voidA === 0;
    const exactB = voidB === 0;
    if (exactA && !exactB) return -1;
    if (!exactA && exactB) return 1;

    // Prefer smaller void
    if (voidA !== voidB) return voidA - voidB;

    // Prefer fewer pieces
    if (a.length !== b.length) return a.length - b.length;

    // Prefer LARGER pieces (higher average)
    const avgA = sumA / a.length;
    const avgB = sumB / b.length;
    return avgB - avgA; // Higher average is better
  });
}

/**
 * Get the best Glssa distribution for a wall
 *
 * OPTIMIZATION: Favor LARGER pieces (180-190cm)
 * - Less pieces = better
 * - Larger average piece size = better
 * - Zero void = best
 */
export function distributeGlssa(effectiveLength: number): {
  pieces: number[];
  total: number;
  void: number;
} {
  const combinations = findGlssaCombinations(effectiveLength);

  if (combinations.length === 0) {
    // Impossible length - find closest valid option

    if (effectiveLength < GLSSA_MIN) {
      // Too short - use minimum piece
      return {
        pieces: [GLSSA_MIN],
        total: GLSSA_MIN,
        void: 0, // Actually extends past, but we track as 0
      };
    }

    if (effectiveLength > GLSSA_MAX && effectiveLength < 2 * GLSSA_MIN) {
      // Impossible range (191-219cm)
      // Choose between single 190cm or two 110cm
      const singleVoid = effectiveLength - GLSSA_MAX;
      const doubleExtend = 2 * GLSSA_MIN - effectiveLength;

      if (singleVoid <= doubleExtend) {
        return {
          pieces: [GLSSA_MAX],
          total: GLSSA_MAX,
          void: singleVoid,
        };
      } else {
        return {
          pieces: [GLSSA_MIN, GLSSA_MIN],
          total: 2 * GLSSA_MIN,
          void: 0,
        };
      }
    }

    // Fallback for very large walls - use even distribution
    if (effectiveLength > GLSSA_MAX) {
      const numPieces = Math.ceil(effectiveLength / GLSSA_MAX);
      const base = Math.floor(effectiveLength / numPieces);
      const remainder = effectiveLength % numPieces;
      const pieces: number[] = [];
      for (let i = 0; i < numPieces; i++) {
        pieces.push(base + (i < remainder ? 1 : 0));
      }
      const total = pieces.reduce((a, b) => a + b, 0);
      return {
        pieces: pieces.sort((a, b) => b - a),
        total,
        void: Math.max(0, effectiveLength - total),
      };
    }

    // Fallback - shouldn't happen
    return {
      pieces: [effectiveLength],
      total: effectiveLength,
      void: 0,
    };
  }

  // Find the BEST combination:
  // 1. Zero void is best
  // 2. Then fewer pieces
  // 3. Then larger average piece size (favor 180-190cm)
  let best = combinations[0];
  let bestVoid = effectiveLength - best.reduce((a, b) => a + b, 0);
  let bestAvg = best.reduce((a, b) => a + b, 0) / best.length;

  for (const combo of combinations) {
    const total = combo.reduce((a, b) => a + b, 0);
    const voidAmount = effectiveLength - total;
    const avgSize = total / combo.length;

    // Zero void always wins
    if (voidAmount === 0 && bestVoid > 0) {
      best = combo;
      bestVoid = voidAmount;
      bestAvg = avgSize;
      continue;
    }

    // If both have same void (including both zero)
    if (voidAmount === bestVoid) {
      // Fewer pieces wins
      if (combo.length < best.length) {
        best = combo;
        bestAvg = avgSize;
      }
      // Same piece count - larger average wins
      else if (combo.length === best.length && avgSize > bestAvg) {
        best = combo;
        bestAvg = avgSize;
      }
    }
    // Smaller void wins (if current best isn't zero void)
    else if (bestVoid > 0 && voidAmount < bestVoid) {
      best = combo;
      bestVoid = voidAmount;
      bestAvg = avgSize;
    }
  }

  const total = best.reduce((a, b) => a + b, 0);
  return {
    pieces: best,
    total,
    void: Math.max(0, effectiveLength - total),
  };
}

// ============================================
// WSSADA DISTRIBUTION - ZERO VOID SOLVER
// ============================================

/**
 * ZERO VOID SOLVER
 *
 * Mathematical constraint satisfaction solver that finds piece combinations
 * summing EXACTLY to target length with zero void.
 *
 * Piece constraints:
 * - Regular Wssada: 80-90cm (strict max of 90!)
 * - Corner pieces: 58-60cm (only when needed)
 *
 * Strategy:
 * 1. Try 0 corners first (prefer all regular pieces)
 * 2. Try 1 corner, then 2 corners
 * 3. For each corner count, try all corner size combinations
 * 4. For each configuration, check if regular pieces can fill remainder exactly
 */

interface ZeroVoidSolution {
  pieces: number[];
  cornerPieces: number[];
  regularPieces: number[];
  total: number;
  void: number;
}

/**
 * Solve for ZERO void piece distribution
 *
 * @param targetLength - The exact length to fill
 * @param maxCorners - Maximum corner pieces allowed (based on wall geometry)
 * @returns Best solution found (zero void if possible, else minimum void)
 */
function solveZeroVoid(
  targetLength: number,
  maxCorners: number
): ZeroVoidSolution {
  // Try with 0, 1, 2 corners (prefer fewer corners)
  for (let numCorners = 0; numCorners <= Math.min(maxCorners, 2); numCorners++) {
    const result = tryWithNCorners(targetLength, numCorners);
    if (result && result.void === 0) {
      return result;
    }
  }

  // No zero-void solution found - find minimum void solution
  return findMinimumVoidSolution(targetLength, maxCorners);
}

/**
 * Try to find a zero-void solution with exactly N corner pieces
 */
function tryWithNCorners(
  targetLength: number,
  numCorners: number
): ZeroVoidSolution | null {
  if (numCorners === 0) {
    return tryRegularPiecesOnly(targetLength);
  }

  // Generate all combinations of corner sizes (58, 59, 60)
  const cornerCombos = generateCornerCombinations(numCorners);

  for (const corners of cornerCombos) {
    const cornerSum = corners.reduce((a, b) => a + b, 0);
    const regularTarget = targetLength - cornerSum;

    if (regularTarget < 0) continue;

    if (regularTarget === 0) {
      // Only corners needed
      return {
        pieces: corners,
        cornerPieces: corners,
        regularPieces: [],
        total: cornerSum,
        void: 0
      };
    }

    // Try to fill regularTarget with regular pieces (80-90)
    const regularResult = tryRegularPiecesOnly(regularTarget);
    if (regularResult && regularResult.void === 0) {
      const allPieces = [...corners, ...regularResult.regularPieces];
      return {
        pieces: allPieces,
        cornerPieces: corners,
        regularPieces: regularResult.regularPieces,
        total: targetLength,
        void: 0
      };
    }
  }

  return null;
}

/**
 * Try to fill target with only regular pieces (80-90cm)
 */
function tryRegularPiecesOnly(targetLength: number): ZeroVoidSolution | null {
  if (targetLength <= 0) {
    return {
      pieces: [],
      cornerPieces: [],
      regularPieces: [],
      total: 0,
      void: 0
    };
  }

  // For each possible number of pieces, check if even distribution works
  const minPieces = Math.ceil(targetLength / WSSADA_REGULAR_MAX);
  const maxPieces = Math.floor(targetLength / WSSADA_REGULAR_MIN);

  for (let numPieces = minPieces; numPieces <= maxPieces; numPieces++) {
    const pieces = distributeExactlyIntoPieces(targetLength, numPieces);
    if (pieces) {
      return {
        pieces,
        cornerPieces: [],
        regularPieces: pieces,
        total: targetLength,
        void: 0
      };
    }
  }

  return null;
}

/**
 * Distribute target exactly into N pieces (each 80-90cm)
 */
function distributeExactlyIntoPieces(
  target: number,
  numPieces: number
): number[] | null {
  if (numPieces <= 0) return null;

  const base = Math.floor(target / numPieces);
  const remainder = target % numPieces;

  const pieces: number[] = [];
  for (let i = 0; i < numPieces; i++) {
    const size = base + (i < remainder ? 1 : 0);
    if (size < WSSADA_REGULAR_MIN || size > WSSADA_REGULAR_MAX) {
      return null;
    }
    pieces.push(size);
  }

  // Verify sum
  const sum = pieces.reduce((a, b) => a + b, 0);
  if (sum !== target) return null;

  return pieces.sort((a, b) => b - a);
}

/**
 * Generate all combinations of N corner pieces (each 58-60cm)
 */
function generateCornerCombinations(numCorners: number): number[][] {
  if (numCorners === 0) return [[]];
  if (numCorners === 1) return [[58], [59], [60]];

  // For 2 corners, generate all combinations
  const combos: number[][] = [];
  for (let a = WSSADA_CORNER_MIN; a <= WSSADA_CORNER_MAX; a++) {
    for (let b = a; b <= WSSADA_CORNER_MAX; b++) {
      if (numCorners === 2) {
        combos.push([a, b]);
      }
    }
  }

  // Sort by sum (try smaller sums first)
  combos.sort((a, b) => {
    const sumA = a.reduce((x, y) => x + y, 0);
    const sumB = b.reduce((x, y) => x + y, 0);
    return sumA - sumB;
  });

  return combos;
}

/**
 * When no zero-void solution exists, find the minimum void solution
 */
function findMinimumVoidSolution(
  targetLength: number,
  maxCorners: number
): ZeroVoidSolution {
  let bestSolution: ZeroVoidSolution | null = null;
  let minVoid = Infinity;

  // Try all combinations and find minimum void
  for (let numCorners = 0; numCorners <= Math.min(maxCorners, 2); numCorners++) {
    const cornerCombos = numCorners === 0 ? [[]] : generateCornerCombinations(numCorners);

    for (const corners of cornerCombos) {
      const cornerSum = corners.reduce((a, b) => a + b, 0);
      const regularTarget = targetLength - cornerSum;

      if (regularTarget < 0) continue;

      // Find best regular piece distribution for this corner config
      const regularSolution = findBestRegularDistribution(regularTarget);
      const totalLength = cornerSum + regularSolution.total;
      const voidAmount = Math.max(0, targetLength - totalLength);

      if (voidAmount < minVoid || (voidAmount === minVoid && corners.length < (bestSolution?.cornerPieces.length ?? Infinity))) {
        minVoid = voidAmount;
        bestSolution = {
          pieces: [...corners, ...regularSolution.pieces],
          cornerPieces: corners,
          regularPieces: regularSolution.pieces,
          total: totalLength,
          void: voidAmount
        };
      }
    }
  }

  // Fallback if nothing found
  if (!bestSolution) {
    const pieces = fillGreedy(targetLength);
    const total = pieces.reduce((a, b) => a + b, 0);
    return {
      pieces,
      cornerPieces: [],
      regularPieces: pieces,
      total,
      void: Math.max(0, targetLength - total)
    };
  }

  return bestSolution;
}

/**
 * Find the best regular piece distribution (minimize void)
 */
function findBestRegularDistribution(targetLength: number): {
  pieces: number[];
  total: number;
} {
  if (targetLength <= 0) {
    return { pieces: [], total: 0 };
  }

  // Try different piece counts and find best fit
  const minPieces = Math.max(1, Math.ceil(targetLength / WSSADA_REGULAR_MAX));
  const maxPieces = Math.max(minPieces, Math.ceil(targetLength / WSSADA_REGULAR_MIN));

  let bestPieces: number[] = [];
  let bestTotal = 0;
  let minVoid = Infinity;

  for (let numPieces = minPieces; numPieces <= maxPieces + 2; numPieces++) {
    // Try even distribution
    const avgSize = targetLength / numPieces;

    // If average is within range, we might get zero void
    if (avgSize >= WSSADA_REGULAR_MIN && avgSize <= WSSADA_REGULAR_MAX) {
      const pieces = distributeExactlyIntoPieces(targetLength, numPieces);
      if (pieces) {
        return { pieces, total: targetLength };
      }
    }

    // Otherwise, try to get as close as possible
    const pieces: number[] = [];
    let remaining = targetLength;

    for (let i = 0; i < numPieces && remaining > 0; i++) {
      if (i === numPieces - 1) {
        // Last piece - use what's left if valid
        if (remaining >= WSSADA_REGULAR_MIN && remaining <= WSSADA_REGULAR_MAX) {
          pieces.push(remaining);
          remaining = 0;
        } else if (remaining > WSSADA_REGULAR_MAX) {
          pieces.push(WSSADA_REGULAR_MAX);
          remaining -= WSSADA_REGULAR_MAX;
        } else {
          // Remaining is too small, don't add
          break;
        }
      } else {
        // Use max size to minimize piece count
        const piece = Math.min(remaining, WSSADA_REGULAR_MAX);
        if (piece >= WSSADA_REGULAR_MIN) {
          pieces.push(piece);
          remaining -= piece;
        } else {
          break;
        }
      }
    }

    const total = pieces.reduce((a, b) => a + b, 0);
    const voidAmount = targetLength - total;

    if (voidAmount >= 0 && voidAmount < minVoid) {
      minVoid = voidAmount;
      bestPieces = pieces.sort((a, b) => b - a);
      bestTotal = total;
    }
  }

  return { pieces: bestPieces, total: bestTotal };
}

/**
 * Greedy fill - last resort
 */
function fillGreedy(targetLength: number): number[] {
  const pieces: number[] = [];
  let remaining = targetLength;

  while (remaining >= WSSADA_REGULAR_MIN) {
    const piece = Math.min(remaining, WSSADA_REGULAR_MAX);
    pieces.push(piece);
    remaining -= piece;
  }

  return pieces.sort((a, b) => b - a);
}

/**
 * Find all valid Wssada combinations for a given length
 * Includes corner pieces if wall owns corners
 */
export function findWssadaCombinations(
  targetLength: number,
  numCornerPieces: number = 0
): number[][] {
  const combinations: number[][] = [];

  // Calculate length to fill with regular pieces
  // Corner pieces are placed at junctions, regular pieces fill the rest
  const cornerTotal = numCornerPieces * 59; // Use 59cm as middle value
  const regularTarget = targetLength - cornerTotal;

  if (regularTarget < 0) {
    // Corner pieces alone exceed target - just use corners
    const corners = Array(numCornerPieces).fill(59);
    return [corners];
  }

  // Find regular piece combinations
  const regularCombos = findRegularWssadaCombinations(regularTarget);

  // Add corner pieces to each combination
  for (const regular of regularCombos) {
    const corners = Array(numCornerPieces).fill(59);
    combinations.push([...corners, ...regular]);
  }

  // If no regular combos found but we have corners
  if (regularCombos.length === 0 && numCornerPieces > 0) {
    const corners = Array(numCornerPieces).fill(59);
    // Fill remaining with as many regular pieces as needed
    if (regularTarget >= WSSADA_REGULAR_MIN) {
      const fillPieces: number[] = [];
      let remaining = regularTarget;
      while (remaining >= WSSADA_REGULAR_MIN) {
        const piece = Math.min(remaining, WSSADA_REGULAR_MAX);
        fillPieces.push(piece);
        remaining -= piece;
      }
      combinations.push([...corners, ...fillPieces]);
    } else {
      combinations.push(corners);
    }
  }

  return combinations;
}

/**
 * Find combinations of regular Wssada pieces (80-90cm)
 *
 * IMPORTANT: Wssada pieces must cover the FULL wall length with ZERO void.
 * The algorithm first tries exact combinations, then falls back to even distribution.
 */
function findRegularWssadaCombinations(targetLength: number): number[][] {
  const combinations: number[][] = [];

  if (targetLength <= 0) {
    return [[]];
  }

  // Single piece
  if (
    targetLength >= WSSADA_REGULAR_MIN &&
    targetLength <= WSSADA_REGULAR_MAX
  ) {
    combinations.push([targetLength]);
  }

  // Two pieces
  for (let a = WSSADA_REGULAR_MAX; a >= WSSADA_REGULAR_MIN; a--) {
    const b = targetLength - a;
    if (b >= WSSADA_REGULAR_MIN && b <= WSSADA_REGULAR_MAX) {
      combinations.push([a, b].sort((x, y) => y - x));
    }
  }

  // Three pieces
  for (let a = WSSADA_REGULAR_MAX; a >= WSSADA_REGULAR_MIN; a--) {
    for (let b = a; b >= WSSADA_REGULAR_MIN; b--) {
      const c = targetLength - a - b;
      if (c >= WSSADA_REGULAR_MIN && c <= WSSADA_REGULAR_MAX) {
        combinations.push([a, b, c].sort((x, y) => y - x));
      }
    }
  }

  // Four pieces
  for (let a = WSSADA_REGULAR_MAX; a >= WSSADA_REGULAR_MIN; a--) {
    for (let b = a; b >= WSSADA_REGULAR_MIN; b--) {
      for (let c = b; c >= WSSADA_REGULAR_MIN; c--) {
        const d = targetLength - a - b - c;
        if (d >= WSSADA_REGULAR_MIN && d <= WSSADA_REGULAR_MAX) {
          combinations.push([a, b, c, d].sort((x, y) => y - x));
        }
      }
    }
  }

  // Five pieces
  for (let a = WSSADA_REGULAR_MAX; a >= WSSADA_REGULAR_MIN; a--) {
    for (let b = a; b >= WSSADA_REGULAR_MIN; b--) {
      for (let c = b; c >= WSSADA_REGULAR_MIN; c--) {
        for (let d = c; d >= WSSADA_REGULAR_MIN; d--) {
          const e = targetLength - a - b - c - d;
          if (e >= WSSADA_REGULAR_MIN && e <= WSSADA_REGULAR_MAX) {
            combinations.push([a, b, c, d, e].sort((x, y) => y - x));
          }
        }
      }
    }
  }

  // Six pieces (for longer walls like 500-540cm)
  if (targetLength >= 6 * WSSADA_REGULAR_MIN && targetLength <= 6 * WSSADA_REGULAR_MAX) {
    for (let a = WSSADA_REGULAR_MAX; a >= WSSADA_REGULAR_MIN; a--) {
      for (let b = a; b >= WSSADA_REGULAR_MIN; b--) {
        for (let c = b; c >= WSSADA_REGULAR_MIN; c--) {
          for (let d = c; d >= WSSADA_REGULAR_MIN; d--) {
            for (let e = d; e >= WSSADA_REGULAR_MIN; e--) {
              const f = targetLength - a - b - c - d - e;
              if (f >= WSSADA_REGULAR_MIN && f <= WSSADA_REGULAR_MAX) {
                combinations.push([a, b, c, d, e, f].sort((x, y) => y - x));
              }
            }
          }
        }
      }
    }
  }

  // Seven pieces (for longer walls like 580-630cm)
  if (targetLength >= 7 * WSSADA_REGULAR_MIN && targetLength <= 7 * WSSADA_REGULAR_MAX) {
    // Use even distribution approach for 7+ pieces (too many loops otherwise)
    const avgSize = targetLength / 7;
    if (avgSize >= WSSADA_REGULAR_MIN && avgSize <= WSSADA_REGULAR_MAX) {
      const evenCombo = distributeEvenly(targetLength, 7);
      if (evenCombo.length > 0) {
        combinations.push(evenCombo);
      }
    }
  }

  // For 8+ pieces (large walls), use even distribution approach
  const minEvenPieces = Math.max(8, Math.ceil(targetLength / WSSADA_REGULAR_MAX));
  const maxEvenPieces = Math.floor(targetLength / WSSADA_REGULAR_MIN);

  for (let n = minEvenPieces; n <= maxEvenPieces; n++) {
    const avgSize = targetLength / n;
    if (avgSize >= WSSADA_REGULAR_MIN && avgSize <= WSSADA_REGULAR_MAX) {
      const evenCombo = distributeEvenly(targetLength, n);
      if (evenCombo.length > 0) {
        combinations.push(evenCombo);
      }
    }
  }

  // Remove duplicates
  return removeDuplicateCombinations(combinations);
}

/**
 * Distribute a length evenly across N pieces (all within valid range)
 */
function distributeEvenly(targetLength: number, numPieces: number): number[] {
  const avgSize = targetLength / numPieces;

  // Check if average is within valid range
  if (avgSize < WSSADA_REGULAR_MIN || avgSize > WSSADA_REGULAR_MAX) {
    return [];
  }

  const pieces: number[] = [];
  let remaining = targetLength;

  for (let i = 0; i < numPieces; i++) {
    if (i === numPieces - 1) {
      // Last piece takes whatever remains
      pieces.push(remaining);
    } else {
      // Distribute evenly, rounding to nearest integer
      const piece = Math.round(targetLength / numPieces);
      // Ensure piece is within valid range
      const validPiece = Math.max(WSSADA_REGULAR_MIN, Math.min(WSSADA_REGULAR_MAX, piece));
      pieces.push(validPiece);
      remaining -= validPiece;
    }
  }

  // Verify all pieces are valid
  if (pieces.every(p => p >= WSSADA_REGULAR_MIN && p <= WSSADA_REGULAR_MAX)) {
    return pieces.sort((a, b) => b - a);
  }

  return [];
}

/**
 * Get the best Wssada distribution for a wall
 *
 * Uses the ZERO VOID SOLVER to find optimal piece combinations.
 *
 * SMART CORNER LOGIC:
 * - Prefers regular pieces only (80-90cm)
 * - Uses corner pieces (58-60cm) only if they help achieve zero void
 * - Goal: ZERO void with minimum corner pieces
 * - Max 2 corner pieces per ROOM (not per wall)
 *
 * @param effectiveLength - The length to cover
 * @param _numCornerPieces - Deprecated: we now allow corners on any wall that needs them
 * @param _glssaTotal - Not used anymore - Wssada covers full wall
 */
export function distributeWssada(
  effectiveLength: number,
  _numCornerPieces: number,
  _glssaTotal: number // Not used anymore - Wssada covers full wall
): {
  pieces: number[];
  total: number;
  void: number;
  cornerPieceCount: number;
} {
  // ALWAYS allow up to 2 corner pieces if needed to achieve zero void
  // Corner pieces can be used on ANY wall, not just corner-owning walls
  const maxCornersAllowed = 2;

  // Use the zero-void solver
  const solution = solveZeroVoid(effectiveLength, maxCornersAllowed);

  return {
    pieces: solution.pieces,
    total: solution.total,
    void: solution.void,
    cornerPieceCount: solution.cornerPieces.length,
  };
}


// ============================================
// POSITION CALCULATOR
// ============================================

/**
 * Calculate piece positions along a wall
 *
 * For Wssada with corners: corner pieces go at the junction end
 */
function calculatePiecePositions(
  pieces: number[],
  isWssada: boolean = false,
  cornerPieceCount: number = 0,
  wssadaSide: 'top' | 'bottom' | 'left' | 'right' = 'top'
): PiecePosition[] {
  const positions: PiecePosition[] = [];
  let currentPosition = 0;

  // For Wssada, corner pieces should be at the corner junction
  // The positioning depends on which side the wall is

  if (isWssada && cornerPieceCount > 0) {
    // Identify corner pieces (58-60cm)
    const cornerPieces: number[] = [];
    const regularPieces: number[] = [];

    for (const size of pieces) {
      if (size >= WSSADA_CORNER_MIN && size <= WSSADA_CORNER_MAX) {
        cornerPieces.push(size);
      } else {
        regularPieces.push(size);
      }
    }

    // Place corner piece(s) first (at the junction/corner end)
    for (const size of cornerPieces) {
      positions.push({
        size,
        startPosition: currentPosition,
        endPosition: currentPosition + size,
        isCornerPiece: true,
      });
      currentPosition += size;
    }

    // Then place regular pieces
    for (const size of regularPieces) {
      positions.push({
        size,
        startPosition: currentPosition,
        endPosition: currentPosition + size,
        isCornerPiece: false,
      });
      currentPosition += size;
    }
  } else {
    // Simple linear placement
    for (const size of pieces) {
      positions.push({
        size,
        startPosition: currentPosition,
        endPosition: currentPosition + size,
        isCornerPiece: false,
      });
      currentPosition += size;
    }
  }

  return positions;
}

// ============================================
// GLOBAL OPTIMIZER - Finds best scenario + distribution
// ============================================

/**
 * Score a Glssa distribution across all walls.
 * Higher score = better distribution.
 *
 * Human-like scoring priorities:
 * 1. All walls must have zero void (mandatory - return -Infinity if not)
 * 2. Fewer total pieces (each piece costs money and adds complexity)
 * 3. Higher minimum piece size (avoid tiny 110cm pieces)
 * 4. Fewer unique piece sizes (standardized = cleaner manufacturing)
 * 5. Larger average piece size (bigger cushions are more comfortable)
 */
function scoreGlssaDistribution(
  wallDistributions: Array<{ wallId: string; pieces: number[]; void: number }>
): number {
  // MANDATORY: All walls must have zero void
  const totalVoid = wallDistributions.reduce((sum, w) => sum + w.void, 0);
  if (totalVoid > 0) return -Infinity;

  const allPieces = wallDistributions.flatMap(w => w.pieces);
  if (allPieces.length === 0) return -Infinity;

  const totalPieces = allPieces.length;
  const minPieceSize = Math.min(...allPieces);
  const maxPieceSize = Math.max(...allPieces);
  const avgPieceSize = allPieces.reduce((a, b) => a + b, 0) / totalPieces;
  const uniqueSizes = new Set(allPieces).size;

  // Score components (weighted):
  // - Fewer pieces is strongly preferred (weight: 100 per piece saved)
  // - Higher minimum piece size (weight: 5 per cm above 110)
  // - Fewer unique sizes (weight: 30 per unique size saved)
  // - Larger average (weight: 2 per cm above 110)
  // - Smaller spread between max and min (weight: 1 per cm)

  let score = 0;

  // Fewer total pieces (biggest factor - each extra piece is expensive)
  score -= totalPieces * 100;

  // Reward higher minimum piece size (avoid tiny pieces)
  score += (minPieceSize - 110) * 5;

  // Reward fewer unique sizes (standardization)
  score -= uniqueSizes * 30;

  // Reward larger average piece size
  score += (avgPieceSize - 110) * 2;

  // Penalize large spread between sizes
  score -= (maxPieceSize - minPieceSize) * 1;

  return score;
}

/**
 * Find the OPTIMAL distribution across ALL geometry scenarios.
 *
 * This is the KEY INNOVATION: instead of picking a scenario first and then
 * distributing pieces, we try ALL scenarios and pick the one that produces
 * the best GLOBAL Glssa distribution.
 *
 * This mimics how a human expert thinks: they try different corner ownership
 * combinations and pick the one that gives the most standardized, large pieces.
 */
export function findOptimalDistribution(
  geometry: LayoutGeometry
): {
  scenario: GeometryScenario;
  distribution: DistributionResult;
  score: number;
} {
  const validScenarios = geometry.scenarios.filter(s => s.isValid);

  if (validScenarios.length === 0) {
    throw new Error('No valid geometry scenarios found');
  }

  let bestResult: {
    scenario: GeometryScenario;
    distribution: DistributionResult;
    score: number;
  } | null = null;

  for (const scenario of validScenarios) {
    // Compute Glssa distribution for each wall in this scenario
    const wallGlssaResults = scenario.walls.map(wall => ({
      wallId: wall.wallId,
      ...distributeGlssa(wall.glssaEffective),
    }));

    // Score this scenario's global Glssa quality
    const score = scoreGlssaDistribution(wallGlssaResults);

    // If this is the best so far (or first valid one), use it
    if (bestResult === null || score > bestResult.score) {
      // Do full distribution (including Wssada) for this scenario
      const distribution = distributePieces(scenario);
      bestResult = { scenario, distribution, score };
    }
  }

  if (!bestResult) {
    throw new Error('No valid distribution found');
  }

  console.log(`[Optimizer] Evaluated ${validScenarios.length} scenarios, best: ${bestResult.scenario.scenarioId} (score: ${bestResult.score})`);
  console.log(`[Optimizer] Pieces: ${bestResult.distribution.walls.map(w => `${w.wallId}:[${w.glssaPieces.map(p => p.size).join('+')}]`).join(', ')}`);

  return bestResult;
}

/**
 * Evaluate ALL scenarios and return them sorted by score (best first).
 * Used by the test page to show a mini-view of every evaluated scenario.
 */
export function evaluateAllScenarios(
  geometry: LayoutGeometry
): {
  scenarioId: string;
  score: number;
  totalPieces: number;
  walls: { wallId: string; pieces: number[]; effective: number; void: number }[];
  isBest: boolean;
}[] {
  const validScenarios = geometry.scenarios.filter(s => s.isValid);
  const results: {
    scenarioId: string;
    score: number;
    totalPieces: number;
    walls: { wallId: string; pieces: number[]; effective: number; void: number }[];
  }[] = [];

  for (const scenario of validScenarios) {
    const wallGlssaResults = scenario.walls.map(wall => ({
      wallId: wall.wallId,
      effective: wall.glssaEffective,
      ...distributeGlssa(wall.glssaEffective),
    }));

    const score = scoreGlssaDistribution(wallGlssaResults);
    const totalPieces = wallGlssaResults.reduce((sum, w) => sum + w.pieces.length, 0);

    results.push({
      scenarioId: scenario.scenarioId,
      score,
      totalPieces,
      walls: wallGlssaResults.map(w => ({
        wallId: w.wallId,
        pieces: w.pieces,
        effective: w.effective,
        void: w.void,
      })),
    });
  }

  // Sort by score descending (best first)
  results.sort((a, b) => b.score - a.score);

  // Mark the best one
  return results.map((r, i) => ({ ...r, isBest: i === 0 }));
}

// ============================================
// MAIN DISTRIBUTOR
// ============================================

/**
 * Distribute pieces for all walls in a geometry scenario
 *
 * ROOM-LEVEL CORNER BUDGET:
 * - Reduced/corner Wssada pieces (58-60cm) are capped at MAX_CORNER_PIECES_PER_ROOM (2) per room
 * - The optimizer tries all valid corner allocations across walls
 * - Picks the allocation that minimizes total Wssada void room-wide
 * - Walls that benefit most from corners get priority
 */
export function distributePieces(
  scenario: GeometryScenario
): DistributionResult {
  const errors: string[] = [];
  let totalGlssaPieces = 0;
  let totalWssadaPieces = 0;
  let totalCornerPieces = 0;

  // ---- STEP 1: Pre-compute Wssada options for each wall ----
  // For each wall, compute solutions with 0, 1, and 2 max corner pieces
  const wallData = scenario.walls.map(wallGeom => {
    const glssa = distributeGlssa(wallGeom.glssaEffective);
    const eff = wallGeom.wssadaEffective;

    // Compute best solution at each corner budget level
    // solveZeroVoid(eff, k) returns the best result using AT MOST k corners
    const sol0 = solveZeroVoid(eff, 0);
    const sol1 = solveZeroVoid(eff, 1);
    const sol2 = solveZeroVoid(eff, 2);

    return { wallGeom, glssa, solutions: [sol0, sol1, sol2] as const };
  });

  // ---- STEP 2: Find optimal corner allocation (max per room) ----
  // Enumerate all valid level combinations for each wall.
  // Level k means "use sol[k]" which allows up to k corners for that wall.
  // Constraint: total actual corners used across all walls ≤ MAX_CORNER_PIECES_PER_ROOM
  const numWalls = wallData.length;

  function findBestAllocation(
    wallIdx: number,
    cornerBudget: number,
  ): { levels: number[]; totalVoid: number; totalCorners: number } {
    if (wallIdx === numWalls) {
      return { levels: [], totalVoid: 0, totalCorners: 0 };
    }

    let best: { levels: number[]; totalVoid: number; totalCorners: number } | null = null;

    for (let level = 0; level <= 2; level++) {
      const sol = wallData[wallIdx].solutions[level];
      const cornersUsed = sol.cornerPieces.length;

      if (cornersUsed > cornerBudget) continue;

      const sub = findBestAllocation(wallIdx + 1, cornerBudget - cornersUsed);
      const totalVoid = sol.void + sub.totalVoid;
      const totalCorners = cornersUsed + sub.totalCorners;

      if (
        !best ||
        totalVoid < best.totalVoid ||
        (totalVoid === best.totalVoid && totalCorners < best.totalCorners)
      ) {
        best = {
          levels: [level, ...sub.levels],
          totalVoid,
          totalCorners,
        };
      }
    }

    // Fallback (shouldn't happen since level 0 always works)
    return best || {
      levels: Array(numWalls - wallIdx).fill(0),
      totalVoid: Infinity,
      totalCorners: 0,
    };
  }

  const allocation = findBestAllocation(0, MAX_CORNER_PIECES_PER_ROOM);

  // ---- STEP 3: Build result using chosen allocation ----
  const walls: WallPieceDistribution[] = [];

  for (let i = 0; i < numWalls; i++) {
    const { wallGeom, glssa, solutions } = wallData[i];
    const level = allocation.levels[i];
    const wssadaSolution = solutions[level];
    const cornersUsed = wssadaSolution.cornerPieces.length;

    // Calculate positions
    const glssaPositions = calculatePiecePositions(glssa.pieces, false);
    const wssadaPositions = calculatePiecePositions(
      wssadaSolution.pieces,
      true,
      cornersUsed,
      wallGeom.wssadaSide
    );

    walls.push({
      wallId: wallGeom.wallId,
      glssaEffective: wallGeom.glssaEffective,
      wssadaEffective: wallGeom.wssadaEffective,
      glssaPieces: glssaPositions,
      wssadaPieces: wssadaPositions,
      glssaTotal: glssa.total,
      wssadaTotal: wssadaSolution.total,
      glssaVoid: glssa.void,
      wssadaVoid: wssadaSolution.void,
      wssadaSide: wallGeom.wssadaSide,
    });

    totalGlssaPieces += glssa.pieces.length;
    totalWssadaPieces += wssadaSolution.pieces.length;
    totalCornerPieces += cornersUsed;

    // Validation
    if (glssa.void > 10) {
      errors.push(
        `${wallGeom.wallId}: Glssa void of ${glssa.void}cm is large`
      );
    }
    if (wssadaSolution.void > 10) {
      errors.push(
        `${wallGeom.wallId}: Wssada void of ${wssadaSolution.void}cm is large`
      );
    }
  }

  return {
    success: errors.length === 0,
    walls,
    totalGlssaPieces,
    totalWssadaPieces,
    totalCornerPieces,
    errors,
  };
}

// ============================================
// UTILITY: Summary for debugging
// ============================================

export function distributionSummary(result: DistributionResult): string {
  const lines: string[] = [
    `Distribution ${result.success ? 'SUCCESS' : 'HAS ISSUES'}`,
    `Total: ${result.totalGlssaPieces} Glssa, ${result.totalWssadaPieces} Wssada (${result.totalCornerPieces} corners)`,
    '',
  ];

  for (const wall of result.walls) {
    lines.push(`--- Wall ${wall.wallId} ---`);
    lines.push(`  Wssada side: ${wall.wssadaSide}`);
    lines.push(
      `  Glssa: [${wall.glssaPieces.map((p) => p.size).join(', ')}] = ${wall.glssaTotal}cm (effective: ${wall.glssaEffective}cm, void: ${wall.glssaVoid}cm)`
    );
    lines.push(
      `  Wssada: [${wall.wssadaPieces.map((p) => (p.isCornerPiece ? `${p.size}*` : p.size)).join(', ')}] = ${wall.wssadaTotal}cm (effective: ${wall.wssadaEffective}cm, void: ${wall.wssadaVoid}cm)`
    );
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const err of result.errors) {
      lines.push(`  - ${err}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// QUICK TEST HELPER
// ============================================

export function testDistribution(
  layoutType: string,
  dimensions: Record<string, number>
): void {
  // Import dynamically to avoid circular dependency
  const { calculateGeometry, getBestScenario, geometrySummary } = require('./geometry-calculator');

  console.log('='.repeat(60));
  console.log(`Testing ${layoutType} with dimensions:`, dimensions);
  console.log('='.repeat(60));

  const geometry = calculateGeometry(layoutType, dimensions);
  console.log('\nGeometry:');
  console.log(geometrySummary(geometry));

  const bestScenario = getBestScenario(geometry);
  if (!bestScenario) {
    console.log('No valid scenario found!');
    return;
  }

  console.log(`\nUsing scenario: ${bestScenario.scenarioId}`);
  console.log('-'.repeat(40));

  const distribution = distributePieces(bestScenario);
  console.log('\nDistribution:');
  console.log(distributionSummary(distribution));
}
