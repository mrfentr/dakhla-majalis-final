// Copied and adapted from client-side logic to run inside Convex actions.
// No React imports; purely computational.

export class FlexibleIdealOptimizer {
  private readonly IDEAL_HEIGHT = 190;
  private readonly MIN_REDUCED_HEIGHT = 180;
  private readonly ABSOLUTE_MIN = 110;

  optimize(wallLength: number) {
    if (!wallLength || wallLength <= 0 || !Number.isFinite(wallLength)) {
      return { totalLength: 0, pieces: [], voidSpace: 0, description: 'Invalid input', method: 'Error' };
    }

    let idealCount = Math.floor(wallLength / this.IDEAL_HEIGHT);
    let remainder = wallLength % this.IDEAL_HEIGHT;

    if (remainder === 0) {
      return {
        totalLength: wallLength,
        pieces: Array(idealCount).fill(190),
        voidSpace: 0,
        description: `${idealCount} × ${this.IDEAL_HEIGHT}cm (Perfect fit!)`,
        method: 'Perfect'
      };
    }

    const totalPieces = idealCount + 1;

    const bestIdealCombination = this.findBestCombination(wallLength, totalPieces, 180, 190);
    if (bestIdealCombination) return bestIdealCombination;

    for (let extraPieces = 1; extraPieces <= 12; extraPieces++) {
      const bestIdealCombination = this.findBestCombination(wallLength, totalPieces + extraPieces, 180, 190);
      if (bestIdealCombination) return bestIdealCombination;
    }

    if (totalPieces > 1) {
      for (let reducePieces = 1; reducePieces <= Math.min(4, totalPieces - 1); reducePieces++) {
        const bestIdealCombination = this.findBestCombination(wallLength, totalPieces - reducePieces, 180, 190);
        if (bestIdealCombination) return bestIdealCombination;
      }
    }

    if (remainder >= this.MIN_REDUCED_HEIGHT && remainder <= this.IDEAL_HEIGHT && idealCount > 0) {
      const pieces = Array(idealCount).fill(190);
      pieces.push(remainder);
      return { totalLength: wallLength, pieces, voidSpace: 0, description: `${idealCount} × 190cm + 1 × ${remainder}cm`, method: 'Standard with ideal remainder' };
    }

    if (idealCount > 0 && remainder >= this.ABSOLUTE_MIN && remainder < this.MIN_REDUCED_HEIGHT) {
      const pieces = Array(idealCount).fill(190);
      pieces.push(remainder);
      return { totalLength: wallLength, pieces, voidSpace: 0, description: `${idealCount} × 190cm + 1 × ${remainder}cm (Corner optimization: 0 void)`, method: 'Corner-optimized (Sub-180cm piece for 0 void)' };
    }

    if (idealCount > 0 && remainder < this.ABSOLUTE_MIN) {
      return { totalLength: wallLength, pieces: Array(idealCount).fill(190), voidSpace: remainder, description: `${idealCount} × 190cm + ${remainder}cm void (Ideal pattern preserved!)`, method: 'Ideal with void (Better pattern)' };
    }

    if (idealCount > 0 && remainder > 0 && remainder < this.ABSOLUTE_MIN) {
      const gapToFill = this.ABSOLUTE_MIN - remainder;
      for (let reducedCount = 1; reducedCount <= idealCount; reducedCount++) {
        const maxReduction = reducedCount * (this.IDEAL_HEIGHT - this.MIN_REDUCED_HEIGHT);
        if (maxReduction >= gapToFill) {
          const reductionPerPiece = Math.ceil(gapToFill / reducedCount);
          const reducedHeight = this.IDEAL_HEIGHT - reductionPerPiece;
          if (reducedHeight >= this.MIN_REDUCED_HEIGHT) {
            const pieces = [ ...Array(idealCount - reducedCount).fill(190), ...Array(reducedCount).fill(reducedHeight), this.ABSOLUTE_MIN ];
            return { totalLength: wallLength, pieces, voidSpace: 0, description: `${idealCount - reducedCount} × 190cm + ${reducedCount} × ${reducedHeight}cm + 1 × 110cm`, method: `Void eliminated (${reducedCount} reduced)` };
          }
        }
      }
    }

    for (let numPieces = 1; numPieces <= Math.ceil(wallLength / this.ABSOLUTE_MIN); numPieces++) {
      const fallbackResult = this.findBestCombination(wallLength, numPieces, this.ABSOLUTE_MIN, 190);
      if (fallbackResult) {
        const fallbackPieces = fallbackResult.pieces.filter((p: number) => p < 180).length;
        if (fallbackPieces > 0) {
          return { ...fallbackResult, description: `⚠️ FALLBACK: ${fallbackResult.description} (${fallbackPieces} pieces below ideal 180cm)`, method: `Emergency fallback (${fallbackPieces} sub-ideal pieces)` };
        }
        return fallbackResult;
      }
    }

    if (idealCount === 0) {
      return { totalLength: wallLength, pieces: [], voidSpace: wallLength, description: `Wall too small (${wallLength}cm < ${this.ABSOLUTE_MIN}cm)`, method: 'Too small' };
    }

    return { totalLength: wallLength, pieces: Array(idealCount).fill(190), voidSpace: remainder, description: `${idealCount} × 190cm + ${remainder}cm void (Preserves ideal pattern)`, method: 'Ideal with void (Better than sub-180cm)' };
  }

  private findBestCombination(targetLength: number, numPieces: number, minHeight: number = 180, maxHeight: number = 190): any | null {
    const combinations = this.generateAllCombinations(targetLength, numPieces, minHeight, maxHeight);
    if (combinations.length === 0) return null;

    const scoredCombinations = combinations.map(combo => {
      let score = 0;
      const numIdeal = combo.filter((h:number) => h >= 180 && h <= 190).length;
      const numFallback = combo.filter((h:number) => h >= 110 && h < 180).length;
      if (numFallback > 0) {
        score += numFallback * 1000;
        combo.forEach((piece:number) => { if (piece < 180) score += (180 - piece) * 20; });
      }
      combo.forEach((piece:number) => { if (piece >= 180 && piece <= 190) score -= (piece - 170) * 10; });
      if (numFallback === 0) score -= 500;
      const totalPieces = combo.length;
      score += totalPieces * 1;
      score += this.calculateVariance(combo.filter((h:number) => h >= 180)) * 0.5;
      return { combo, score };
    });

    scoredCombinations.sort((a, b) => a.score - b.score);
    const best = scoredCombinations[0];
    if (!this.isValidPiecesArray(best.combo)) return null;

    const isIdealOnly = best.combo.every((h:number) => h >= 180 && h <= 190);
    const methodDesc = isIdealOnly ? `Ideal range only` : `WARNING: Contains fallback pieces below 180cm`;

    return { totalLength: targetLength, pieces: best.combo.sort((a:number, b:number) => b - a), voidSpace: 0, description: this.formatPieces(best.combo), method: methodDesc };
  }

  private generateAllCombinations(targetLength: number, numPieces: number, minHeight: number = 180, maxHeight: number = 190): number[][] {
    const combinations: number[][] = [];
    const backtrack = (currentCombo: number[], remainingLength: number, remainingPieces: number) => {
      if (remainingPieces === 0) { if (remainingLength === 0) combinations.push([...currentCombo]); return; }
      if (remainingLength <= 0) return;
      const minHeightForThisPosition = Math.max(minHeight, Math.ceil(remainingLength / remainingPieces));
      const maxHeightForThisPosition = Math.min(maxHeight, remainingLength - (remainingPieces - 1) * minHeight);
      for (let height = minHeightForThisPosition; height <= maxHeightForThisPosition; height++) {
        currentCombo.push(height);
        backtrack(currentCombo, remainingLength - height, remainingPieces - 1);
        currentCombo.pop();
      }
    };
    backtrack([], targetLength, numPieces);
    return combinations;
  }

  private calculateVariance(heights: number[]): number {
    if (heights.length === 0) return 0;
    const mean = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    const variance = heights.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / heights.length;
    return variance;
  }

  private isValidPiecesArray(pieces: number[]): boolean {
    return pieces.every(piece => piece >= this.ABSOLUTE_MIN && piece <= this.IDEAL_HEIGHT);
  }

  private formatPieces(pieces: number[]): string {
    const counts = pieces.reduce((acc, height) => { (acc as any)[height] = ((acc as any)[height] || 0) + 1; return acc; }, {} as Record<number, number>);
    return Object.entries(counts).sort(([a],[b]) => parseInt(b) - parseInt(a)).map(([height, count]) => `${count} × ${height}cm`).join(' + ');
  }
}

export class WssadaOptimizer {
  private readonly IDEAL_MIN = 80;   // Preferred range 80-90
  private readonly IDEAL_MAX = 90;
  private readonly CORNER_FALLBACK = 60; // Corner-only piece
  private readonly EMERGENCY_MIN = 58;   // Emergency only
  private readonly WIDTH = 10;           // Corner overlap square
  private readonly ABSOLUTE_MIN = 50;

  optimize(wallLength: number, hasCornerOffset: boolean = false, availableCornerPieces: number = 2) {
    // Validate
    if (!wallLength || wallLength <= 0 || !Number.isFinite(wallLength)) {
      return { totalLength: 0, pieces: [], voidSpace: 0, description: 'Invalid input', method: 'Error' };
    }

    const effectiveLength = wallLength - (hasCornerOffset ? this.WIDTH : 0);
    if (effectiveLength < this.ABSOLUTE_MIN) {
      return { totalLength: wallLength, pieces: [], voidSpace: 0, description: `Wall too small (${effectiveLength}cm)`, method: 'Impossible' };
    }

    // 0) HIGHEST PRIORITY: Try uniform sizes first (minimize variety)
    const uniformResult = this.tryUniformSizes(effectiveLength);
    if (uniformResult && uniformResult.voidSpace < 15) {
      return {
        totalLength: wallLength,
        pieces: uniformResult.pieces,
        voidSpace: uniformResult.voidSpace,
        description: this.formatWssadaPieces(uniformResult.pieces) + (uniformResult.voidSpace ? ` + ${uniformResult.voidSpace}cm void` : ''),
        method: 'Uniform size (minimizes variety)'
      };
    }

    // 1) Perfect fit within 80-90
    const perfect = this.findPerfectFlexibleFit(effectiveLength);
    if (perfect) {
      return {
        totalLength: wallLength,
        pieces: perfect.pieces,
        voidSpace: 0,
        description: this.formatWssadaPieces(perfect.pieces),
        method: 'Perfect flexible fit (80-90cm)'
      };
    }

    // 2) Near-perfect (≤5cm void)
    const near = this.findNearPerfectFlexibleFit(effectiveLength);
    if (near) {
      return {
        totalLength: wallLength,
        pieces: near.pieces,
        voidSpace: near.voidSpace,
        description: this.formatWssadaPieces(near.pieces) + (near.voidSpace ? ` + ${near.voidSpace}cm void` : ''),
        method: 'Near perfect (≤5cm void)'
      };
    }

    // 3) Flexible with small void (≤15cm)
    const smallVoid = this.findFlexibleFitWithSmallVoid(effectiveLength);
    if (smallVoid) {
      return {
        totalLength: wallLength,
        pieces: smallVoid.pieces,
        voidSpace: smallVoid.voidSpace,
        description: this.formatWssadaPieces(smallVoid.pieces) + (smallVoid.voidSpace ? ` + ${smallVoid.voidSpace}cm void` : ''),
        method: 'Flexible with small void'
      };
    }

    // 4) Corner fallback strategy using corner pieces (60cm or 58cm) - respects global budget
    const corner = this.tryCornerFallbackStrategy(effectiveLength, availableCornerPieces);
    if (corner) {
      return {
        totalLength: wallLength,
        pieces: corner.pieces,
        voidSpace: corner.voidSpace,
        description: this.formatWssadaPieces(corner.pieces) + (corner.voidSpace ? ` + ${corner.voidSpace}cm void` : ''),
        method: 'Mixed with corner pieces (60cm/58cm)'
      };
    }

    // 6) Last resort: simple greedy
    let len = effectiveLength;
    const pieces: number[] = [];
    while (len >= this.IDEAL_MIN) {
      const p = Math.min(this.IDEAL_MAX, Math.max(this.IDEAL_MIN, Math.floor(len)));
      pieces.push(p);
      len -= p;
      if (pieces.length > 1000) break; // safety
    }
    const voidSpace = Math.max(0, Math.round(len));
    return { totalLength: wallLength, pieces, voidSpace, description: this.formatWssadaPieces(pieces) + (voidSpace ? ` + ${voidSpace}cm void` : ''), method: 'Greedy' };
  }

  private formatWssadaPieces(pieces: number[]): string {
    const counts = pieces.reduce((acc, height) => { (acc as any)[height] = ((acc as any)[height] || 0) + 1; return acc; }, {} as Record<number, number>);
    return Object.entries(counts).sort(([a],[b]) => parseInt(b) - parseInt(a)).map(([height, count]) => `${count} × ${height}cm`).join(' + ');
  }

  // Try uniform sizes (all same size) - HIGHEST PRIORITY for minimizing variety
  private tryUniformSizes(target: number): { pieces: number[]; voidSpace: number } | null {
    for (let size = this.IDEAL_MAX; size >= this.IDEAL_MIN; size--) {
      const count = Math.floor(target / size);
      const remainder = target % size;

      if (remainder === 0) {
        // PERFECT fit - all same size!
        return { pieces: Array(count).fill(size), voidSpace: 0 };
      }

      if (remainder < 10 && count > 0) {
        // Near perfect with minimal void - prefer unified size over mixed
        return { pieces: Array(count).fill(size), voidSpace: remainder };
      }
    }
    return null;
  }

  // Perfect fit with 80–90
  private findPerfectFlexibleFit(target: number): { pieces: number[] } | null {
    for (let n = 1; n <= 50; n++) {
      const res = this.findCombination(target, n, this.IDEAL_MIN, this.IDEAL_MAX);
      if (res) return { pieces: res };
    }
    return null;
  }

  // Near perfect with ≤5cm void
  private findNearPerfectFlexibleFit(target: number): { pieces: number[]; voidSpace: number } | null {
    for (let n = 1; n <= 50; n++) {
      for (let voidSpace = 1; voidSpace <= 5; voidSpace++) {
        const res = this.findCombination(target - voidSpace, n, this.IDEAL_MIN, this.IDEAL_MAX);
        if (res) return { pieces: res, voidSpace };
      }
    }
    return null;
  }

  // Small-void search (≤15cm) – NEW SCORING: diversity penalty > void penalty
  private findFlexibleFitWithSmallVoid(target: number): { pieces: number[]; voidSpace: number } | null {
    let best: { pieces: number[]; voidSpace: number } | null = null;
    let bestScore = Infinity;

    for (let n = 1; n <= 50; n++) {
      for (let v = 1; v <= 15; v++) {
        const res = this.findCombination(target - v, n, this.IDEAL_MIN, this.IDEAL_MAX);
        if (res) {
          const candidate = { pieces: res.slice().sort((a,b)=>b-a), voidSpace: v };
          // NEW SCORING: diversity penalty (100) > void penalty (10) > piece count (1)
          const score = v * 10 + new Set(candidate.pieces).size * 100 + candidate.pieces.length * 1;

          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }
    }
    return best;
  }

  // Corner strategy: use corner pieces (60cm or 58cm) - respects global budget
  private tryCornerFallbackStrategy(target: number, availableCornerPieces: number): { pieces: number[]; voidSpace: number } | null {
    if (availableCornerPieces === 0) return null;

    let best: { pieces: number[]; voidSpace: number } | null = null;
    let bestScore = Infinity;

    // Try both 60cm and 58cm corner pieces
    for (const cornerSize of [this.CORNER_FALLBACK, this.EMERGENCY_MIN]) {
      for (let numCorner = 1; numCorner <= availableCornerPieces; numCorner++) {
        const remaining = target - numCorner * cornerSize;
        if (remaining < 0) continue;

        if (remaining === 0) {
          // Perfect fit with only corner pieces
          const candidate = { pieces: Array(numCorner).fill(cornerSize), voidSpace: 0 };
          const score = 0 * 10 + new Set(candidate.pieces).size * 100 + candidate.pieces.length * 1;
          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
          continue;
        }

        if (remaining < this.IDEAL_MIN) continue;

        const flexResult = this.findFlexibleFitWithSmallVoid(remaining);
        if (flexResult) {
          const all = [...flexResult.pieces, ...Array(numCorner).fill(cornerSize)];
          const candidate = { pieces: this.arrangeForCornerPlacement(all), voidSpace: flexResult.voidSpace };
          const score = candidate.voidSpace * 10 + new Set(candidate.pieces).size * 100 + candidate.pieces.length * 1;

          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }
    }
    return best;
  }

  // Core combiner (DFS) used by all strategies
  private findCombination(target: number, n: number, min: number, max: number): number[] | null {
    const out: number[] = [];
    const dfs = (i: number, remain: number): boolean => {
      if (i === n) return remain === 0;
      const minHere = Math.max(min, Math.ceil(remain - (n - i - 1) * max));
      const maxHere = Math.min(max, remain - (n - i - 1) * min);
      for (let h = maxHere; h >= minHere; h--) {
        out[i] = h;
        if (dfs(i + 1, remain - h)) return true;
      }
      return false;
    };
    return dfs(0, target) ? [...out] : null;
  }

  // Ensure 60cm pieces are placed at corners for printing/assembly
  private arrangeForCornerPlacement(pieces: number[]): number[] {
    const sorted = [...pieces].sort((a, b) => {
      if (a === this.CORNER_FALLBACK && b !== this.CORNER_FALLBACK) return -1;
      if (b === this.CORNER_FALLBACK && a !== this.CORNER_FALLBACK) return 1;
      return b - a;
    });
    return sorted;
  }
}
