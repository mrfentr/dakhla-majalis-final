import { FlexibleIdealOptimizer, WssadaOptimizer } from "./optimizers";

/**
 * Pure computation logic - no Convex context needed
 * This can be called from actions without additional action overhead
 */
export function computeOptimization(args: {
  layoutType: "single-wall" | "l-shape" | "u-shape";
  lengths: {
    single?: number;
    h?: number;
    v?: number;
    l?: number;
    r?: number;
  };
}) {
  console.log('🟪 [OPTIMIZATION-LOGIC] computeOptimization STARTED', { layoutType: args.layoutType, lengths: args.lengths });

  const glssa = new FlexibleIdealOptimizer();
  const wssada = new WssadaOptimizer();
  console.log('✅ [OPTIMIZATION-LOGIC] Optimizers created');

  const clamp = (n: number) => Math.max(0, Math.min(2000, Math.round(n)));

  // Helper: Try uniform sizes (all same size) - HIGHEST PRIORITY for minimizing variety
  const tryUniformSizes = (target: number): { pieces: number[]; voidSpace: number } | null => {
    const SIZES = [90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80];
    for (const size of SIZES) {
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
  };

  // Helper: exact Wssada packing solver (80..90 and up to maxCornerPieces 60s/58s)
  const findExactWssada = (target: number, maxCornerPieces: number = 2): number[] | null => {
    const tryFlex = (remain: number, piecesLeft: number): number[] | null => {
      if (remain === 0) return [];
      if (piecesLeft === 0 || remain < 80) return null;
      const minHere = Math.max(80, Math.ceil(remain - (piecesLeft - 1) * 90));
      const maxHere = Math.min(90, remain - (piecesLeft - 1) * 80);
      for (let h = maxHere; h >= minHere; h--) {
        const sub = tryFlex(remain - h, piecesLeft - 1);
        if (sub) return [h, ...sub];
      }
      return null;
    };
    // Try with corner pieces (60cm and 58cm) - respecting global budget
    for (let numCorner = 0; numCorner <= maxCornerPieces; numCorner++) {
      // Try 60cm first, then 58cm
      for (const cornerSize of [60, 58]) {
        const rem = target - numCorner * cornerSize;
        if (rem < 0) continue;
        const maxPieces = 7;
        for (let n = 1; n <= maxPieces; n++) {
          const flex = tryFlex(rem, n);
          if (flex) return [...flex, ...Array(numCorner).fill(cornerSize)].sort((a, b) => b - a);
        }
      }
    }
    return null;
  };

  const findBestWssadaWithVoid = (target: number, maxCornerPieces: number = 2): { pieces: number[]; voidSpace: number } => {
    // Try uniform sizes FIRST - highest priority
    const uniform = tryUniformSizes(target);
    if (uniform && uniform.voidSpace < 15) {
      return uniform; // Prefer unified solution with acceptable void
    }

    let best: { pieces: number[]; voidSpace: number } | null = null;

    const tryFlexWithVoid = (remain: number, maxPieces: number, maxVoid: number) => {
      let localBest: { pieces: number[]; voidSpace: number } | null = null;
      const backtrack = (acc: number[], left: number, leftPieces: number) => {
        if (leftPieces === 0) {
          if (left >= 0 && left <= maxVoid) {
            const pieces = [...acc].sort((a,b)=>b-a);
            const voidSpace = left;
            // NEW SCORING: diversity penalty > void penalty
            const score = voidSpace * 10 + new Set(pieces).size * 100 + pieces.length * 1;
            const bestScore = localBest ? (localBest.voidSpace * 10 + new Set(localBest.pieces).size * 100 + localBest.pieces.length * 1) : Infinity;
            if (score < bestScore) {
              localBest = { pieces, voidSpace };
            }
          }
          return;
        }
        if (left <= 0) return;
        for (let h = 90; h >= 80; h--) {
          if (h <= left) {
            acc.push(h);
            backtrack(acc, left - h, leftPieces - 1);
            acc.pop();
          }
        }
      };
      for (let n = 1; n <= 7; n++) backtrack([], remain, n);
      return localBest;
    };

    // Try with corner pieces (60cm and 58cm) - respecting global budget
    for (let numCorner = 0; numCorner <= maxCornerPieces; numCorner++) {
      // Try both 60cm and 58cm
      for (const cornerSize of [60, 58]) {
        const rem = target - numCorner * cornerSize;
        if (rem < 0) continue;
        if (rem === 0) {
          const cand = { pieces: Array(numCorner).fill(cornerSize), voidSpace: 0 };
          const candScore = cand.voidSpace * 10 + new Set(cand.pieces).size * 100 + cand.pieces.length * 1;
          const bestScore = best ? (best.voidSpace * 10 + new Set(best.pieces).size * 100 + best.pieces.length * 1) : Infinity;
          if (candScore < bestScore) best = cand;
          continue;
        }
        let flex: { pieces: number[]; voidSpace: number } | null = rem >= 80 ? tryFlexWithVoid(rem, 7, 30) : null;
        if (!flex) flex = { pieces: [], voidSpace: rem };
        const pieces = [...(flex.pieces || []), ...Array(numCorner).fill(cornerSize)].sort((a,b)=>b-a);
        const cand = { pieces, voidSpace: flex.voidSpace };
        // NEW SCORING: diversity penalty > void penalty
        const candScore = cand.voidSpace * 10 + new Set(pieces).size * 100 + pieces.length * 1;
        const bestScore = best ? (best.voidSpace * 10 + new Set(best.pieces).size * 100 + best.pieces.length * 1) : Infinity;
        if (candScore < bestScore) {
          best = cand;
        }
      }
    }
    return best || { pieces: [], voidSpace: target };
  };

  const buildResult = (gp: number[], wp: number[]) => ({
    totalGlssa: gp.length,
    totalWssada: wp.length,
    glssaPieces: gp,
    wssadaPieces: wp,
  });

  if (args.layoutType === "single-wall") {
    const L = clamp(args.lengths.single ?? 0);
    const g = glssa.optimize(L);
    const wEff = Math.max(0, L - g.voidSpace);
    const wRes = wssada.optimize(wEff, false);
    return {
      ...buildResult(g.pieces, wRes.pieces),
      segments: {
        single: { glssaPieces: g.pieces, wssadaPieces: wRes.pieces }
      }
    };
  }

  if (args.layoutType === "l-shape") {
    const H = clamp(args.lengths.h ?? 0);
    const V = clamp(args.lengths.v ?? 0);
    const T = 70;

    // Holistic scoring function - scores COMPLETE solution (Glssa + Wssada together)
    const calculateHolisticScore = (gH: any, gV: any, wH: any, wV: any) => {
      let score = 0;

      // Priority 1: Structural - H wall must have 0 Glssa void (CRITICAL)
      if ((gH.voidSpace || 0) > 0) score += 10_000_000;

      // Priority 2: User-Visible - Minimize total Wssada void (HIGH)
      const totalWssadaVoid = (wH.voidSpace || 0) + (wV.voidSpace || 0);
      score += totalWssadaVoid * 5_000;

      // Priority 3: Minimize V Glssa void (MEDIUM-HIGH)
      score += (gV.voidSpace || 0) * 2_000;

      // Priority 4: Wssada uniformity - prefer unified sizes (MEDIUM)
      const allWssadaPieces = [...(wH.pieces || []), ...(wV.pieces || [])];
      const uniqueWssadaSizes = new Set(allWssadaPieces).size;
      score += uniqueWssadaSizes * 500;

      // Priority 5: Glssa piece quality - prefer 180-190cm range (MEDIUM)
      const allGlssaPieces = [...(gH.pieces || []), ...(gV.pieces || [])];
      const nonIdealGlssa = allGlssaPieces.filter((p) => p < 180 || p > 190).length;
      score += nonIdealGlssa * 1_000;

      // Priority 6: Total piece count - slight preference for fewer pieces (LOW)
      const totalPieces = allGlssaPieces.length + allWssadaPieces.length;
      score += totalPieces * 10;

      return score;
    };

    // Function to evaluate a COMPLETE L-shape solution (Glssa + Wssada together)
    const evaluateCompleteSolution = (glssaOwner: 'horizontal' | 'vertical', wssadaOwner: 'horizontal' | 'vertical') => {
      // Calculate effective lengths based on Glssa ownership
      const hEff = glssaOwner === 'horizontal' ? H : Math.max(0, H - T);
      const vEff = glssaOwner === 'vertical' ? V : Math.max(0, V - T);

      // Optimize Glssa for both walls
      const gH = glssa.optimize(hEff);
      const gV = glssa.optimize(vEff);

      const hCoverage = (gH.pieces || []).reduce((s:number,n:number)=>s+n,0);
      const vCoverage = (gV.pieces || []).reduce((s:number,n:number)=>s+n,0);

      // Optimize Wssada for the given ownership
      const hLenBase = hCoverage;
      const vLenBase = vCoverage;
      // CRITICAL FIX: Available space for Wssada = Glssa coverage (NOT wall length)
      // Wall that owns corner can extend 10cm into corner overlap, other wall stops at coverage
      const hPermitMax = wssadaOwner === 'horizontal' ? hCoverage + 10 : hCoverage;
      const vPermitMax = wssadaOwner === 'vertical' ? vCoverage + 10 : vCoverage;

      // Try different corner budget allocations: (H, V) = (0,2), (1,1), (2,0)
      const tryCornerAllocation = (hBudget: number, vBudget: number) => {
        const hExact = findExactWssada(hLenBase, hBudget);
        const vExact = findExactWssada(vLenBase, vBudget);
        let wh = hExact ? { pieces: hExact, voidSpace: 0 } : wssada.optimize(hLenBase, false);
        let wv = vExact ? { pieces: vExact, voidSpace: 0 } : wssada.optimize(vLenBase, false);
        const hBest = findBestWssadaWithVoid(hLenBase, hBudget);
        const vBest = findBestWssadaWithVoid(vLenBase, vBudget);

        // Use new scoring: diversity penalty > void penalty
        const hScore = (wh.voidSpace || 0) * 10 + new Set(wh.pieces || []).size * 100 + (wh.pieces || []).length * 1;
        const hBestScore = (hBest.voidSpace || 0) * 10 + new Set(hBest.pieces).size * 100 + hBest.pieces.length * 1;
        if (hBestScore < hScore) wh = hBest;

        const vScore = (wv.voidSpace || 0) * 10 + new Set(wv.pieces || []).size * 100 + (wv.pieces || []).length * 1;
        const vBestScore = (vBest.voidSpace || 0) * 10 + new Set(vBest.pieces).size * 100 + vBest.pieces.length * 1;
        if (vBestScore < vScore) wv = vBest;

        const totalVoid = (wh.voidSpace || 0) + (wv.voidSpace || 0);
        const allPieces = [...(wh.pieces || []), ...(wv.pieces || [])];
        const uniqueSizes = new Set(allPieces).size;
        const totalScore = totalVoid * 10 + uniqueSizes * 100 + allPieces.length * 1;

        return { wh, wv, totalScore, hBudget, vBudget };
      };

      // Try all three allocations and pick the best
      const allocations = [
        tryCornerAllocation(0, 2),
        tryCornerAllocation(1, 1),
        tryCornerAllocation(2, 0)
      ];
      const bestAllocation = allocations.reduce((best, curr) => curr.totalScore < best.totalScore ? curr : best);
      let wh = bestAllocation.wh;
      let wv = bestAllocation.wv;

      // ISSUE 2 FIX: Track corner pieces to enforce global budget of 2
      let allocatedCorners = [...(wh.pieces || []), ...(wv.pieces || [])].filter(p => p === 60 || p === 58).length;
      let remainingCornerBudget = Math.max(0, 2 - allocatedCorners);

      const tryExtend = (packed: {pieces:number[]; voidSpace:number}, baseLen: number, permitMax: number, cornerBudget: number) => {
        const currentSum = (packed.pieces || []).reduce((s,n)=>s+n,0);
        const endGap = Math.max(0, permitMax - currentSum);
        if (endGap < 60) return { packed, target: baseLen, addedCorners: 0 };
        const choices = [90,85,80,60];
        let best = { pieces: packed.pieces.slice(), voidSpace: permitMax - currentSum };
        let bestAddedCorners = 0;
        const tryAdd = (add: number[]) => {
          const sum = currentSum + add.reduce((s,n)=>s+n,0);
          if (sum > permitMax) return;
          // ISSUE 2 FIX: Check corner budget
          const cornersInAdd = add.filter(p => p === 60 || p === 58).length;
          if (cornersInAdd > cornerBudget) return;
          const voidSpace = permitMax - sum;
          if (voidSpace <= 20 && (voidSpace < best.voidSpace || (voidSpace === best.voidSpace && new Set(add).size <= new Set(best.pieces).size))) {
            best = { pieces: [...packed.pieces, ...add].sort((a,b)=>b-a), voidSpace } as any;
            bestAddedCorners = cornersInAdd;
          }
        };
        for (const a of choices) tryAdd([a]);
        for (const a of choices) for (const b of choices) tryAdd([a,b]);
        if (best.voidSpace < permitMax - currentSum) {
          return { packed: { pieces: best.pieces, voidSpace: permitMax - best.pieces.reduce((s,n)=>s+n,0) }, target: permitMax, addedCorners: bestAddedCorners };
        }
        return { packed, target: baseLen, addedCorners: 0 };
      };

      // ISSUE 2 FIX: Pass corner budget and track additions across both walls
      const hExt = tryExtend(wh, hLenBase, hPermitMax, remainingCornerBudget);
      wh = hExt.packed as any;
      remainingCornerBudget = Math.max(0, remainingCornerBudget - hExt.addedCorners);
      const vExt = tryExtend(wv, vLenBase, vPermitMax, remainingCornerBudget);
      wv = vExt.packed as any;

      const hSum = (wh.pieces || []).reduce((s: number, n: number) => s + n, 0);
      const vSum = (wv.pieces || []).reduce((s: number, n: number) => s + n, 0);
      const hVoid = Math.max(0, hExt.target - hSum);
      const vVoid = Math.max(0, vExt.target - vSum);

      // Calculate holistic score for this complete solution
      const wH = { pieces: wh.pieces, voidSpace: hVoid };
      const wV = { pieces: wv.pieces, voidSpace: vVoid };
      const holisticScore = calculateHolisticScore(gH, gV, wH, wV);

      return {
        glssaOwner,
        wssadaOwner,
        gH,
        gV,
        wH,
        wV,
        hEff,
        vEff,
        hLen: hExt.target,
        vLen: vExt.target,
        holisticScore
      };
    };

    // HOLISTIC OPTIMIZATION: Test all 4 Glssa+Wssada combinations
    const allSolutions = [
      evaluateCompleteSolution('horizontal', 'horizontal'),
      evaluateCompleteSolution('horizontal', 'vertical'),
      evaluateCompleteSolution('vertical', 'horizontal'),
      evaluateCompleteSolution('vertical', 'vertical')
    ];

    // Pick the solution with the lowest (best) holistic score
    const bestSolution = allSolutions.reduce((best, curr) =>
      curr.holisticScore < best.holisticScore ? curr : best
    );

    return {
      ...buildResult(
        [...bestSolution.gH.pieces, ...bestSolution.gV.pieces],
        [...bestSolution.wH.pieces, ...bestSolution.wV.pieces]
      ),
      engine: { name: 'convex.calculations.performOptimization', wssadaExactSolver: true, version: '2025-11-06-holistic' },
      segments: {
        owner: bestSolution.glssaOwner,
        wssadaOwner: bestSolution.wssadaOwner,
        horizontal: {
          glssaPieces: bestSolution.gH.pieces,
          wssadaPieces: bestSolution.wH.pieces,
          effectiveLength: bestSolution.hEff,
          voidSpace: bestSolution.gH.voidSpace,
          wssadaTarget: bestSolution.hLen,
          wssadaVoid: bestSolution.wH.voidSpace || 0
        },
        vertical: {
          glssaPieces: bestSolution.gV.pieces,
          wssadaPieces: bestSolution.wV.pieces,
          effectiveLength: bestSolution.vEff,
          voidSpace: bestSolution.gV.voidSpace,
          wssadaTarget: bestSolution.vLen,
          wssadaVoid: bestSolution.wV.voidSpace || 0
        }
      }
    };
  }

  // u-shape
  const H = clamp(args.lengths.h ?? 0);
  const L = clamp(args.lengths.l ?? 0);
  const R = clamp(args.lengths.r ?? 0);

  type Owner = 'back' | 'left' | 'right';

  // SEPARATED: Glssa ownership configs (4 options)
  const glssaConfigs = [
    { leftOwner: 'left' as Owner, rightOwner: 'right' as Owner, name: 'both-verticals' },
    { leftOwner: 'back' as Owner, rightOwner: 'right' as Owner, name: 'back-left_vertical-right' },
    { leftOwner: 'left' as Owner, rightOwner: 'back' as Owner, name: 'vertical-left_back-right' },
    { leftOwner: 'back' as Owner, rightOwner: 'back' as Owner, name: 'back-both' },
  ];

  // SEPARATED: Wssada ownership patterns (4 options)
  const wssadaPatterns = [
    { left: 'back' as Owner, right: 'back' as Owner, name: 'back-owns-both' },
    { left: 'back' as Owner, right: 'right' as Owner, name: 'back-left_right-right' },
    { left: 'left' as Owner, right: 'back' as Owner, name: 'left-left_back-right' },
    { left: 'left' as Owner, right: 'right' as Owner, name: 'both-sides' },
  ];

  // Holistic scoring for U-shape (3 walls)
  const calculateUShapeHolisticScore = (gH: any, gL: any, gR: any, wH: any, wL: any, wR: any) => {
    let score = 0;

    // Priority 1: Structural - H wall must have 0 Glssa void (CRITICAL)
    if ((gH.voidSpace || 0) > 0) score += 10_000_000;

    // Priority 2: User-Visible - Minimize total Wssada void (HIGH)
    const totalWssadaVoid = (wH.voidSpace || 0) + (wL.voidSpace || 0) + (wR.voidSpace || 0);
    score += totalWssadaVoid * 5_000;

    // Priority 3: Minimize vertical Glssa voids (MEDIUM-HIGH)
    const verticalGlssaVoid = (gL.voidSpace || 0) + (gR.voidSpace || 0);
    score += verticalGlssaVoid * 2_000;

    // Priority 4: Wssada uniformity (MEDIUM)
    const allWssadaPieces = [...(wH.pieces || []), ...(wL.pieces || []), ...(wR.pieces || [])];
    const uniqueWssadaSizes = new Set(allWssadaPieces).size;
    score += uniqueWssadaSizes * 500;

    // Priority 5: Glssa piece quality (MEDIUM)
    const allGlssaPieces = [...(gH.pieces || []), ...(gL.pieces || []), ...(gR.pieces || [])];
    const nonIdealGlssa = allGlssaPieces.filter((p) => p < 180 || p > 190).length;
    score += nonIdealGlssa * 1_000;

    // Priority 6: Total piece count (LOW)
    const totalPieces = allGlssaPieces.length + allWssadaPieces.length;
    score += totalPieces * 10;

    return score;
  };

  // Function to evaluate a COMPLETE U-shape solution (Glssa + Wssada together)
  const evaluateCompleteUShapeSolution = (
    glssaCfg: {leftOwner: Owner; rightOwner: Owner; name: string},
    wssadaPattern: {left: Owner; right: Owner; name: string}
  ) => {
    // STEP 1: Calculate Glssa based on glssaCfg
    const cfg = glssaCfg;
    // Calculate effective lengths based on corner ownership (MATCH CLIENT LOGIC)
    let topEffective: number;
    if (cfg.leftOwner === 'back' && cfg.rightOwner === 'back') {
      // Horizontal owns BOTH corners → Full length
      topEffective = H;
    } else if (cfg.leftOwner === 'back' && cfg.rightOwner !== 'back') {
      // Horizontal owns LEFT corner only → Loses 70cm from RIGHT
      topEffective = H - 70;
    } else if (cfg.leftOwner !== 'back' && cfg.rightOwner === 'back') {
      // Horizontal owns RIGHT corner only → Loses 70cm from LEFT
      topEffective = H - 70;
    } else {
      // Horizontal owns NO corners → Loses 70cm from BOTH sides
      topEffective = H - 140;
    }
    topEffective = Math.max(0, topEffective);

    const leftEffective = cfg.leftOwner === 'left'
      ? L  // Left owns its corner → Full length
      : Math.max(0, L - 70);  // Horizontal owns left corner → Loses 70cm

    const rightEffective = cfg.rightOwner === 'right'
      ? R  // Right owns its corner → Full length
      : Math.max(0, R - 70);  // Horizontal owns right corner → Loses 70cm

    // NOW calculate Glssa for these effective lengths
    const gH = glssa.optimize(topEffective);
    const gL = glssa.optimize(leftEffective);
    const gR = glssa.optimize(rightEffective);

    const hCoverage = (gH.pieces || []).reduce((s:number,n:number)=>s+n,0);
    const lCoverage = (gL.pieces || []).reduce((s:number,n:number)=>s+n,0);
    const rCoverage = (gR.pieces || []).reduce((s:number,n:number)=>s+n,0);

    // Try different corner budget allocations across 3 walls
    // Allocations: (H, L, R) where total = 2
    const tryUShapeCornerAllocation = (hBudget: number, lBudget: number, rBudget: number) => {
      // Helper: pack with budget
      const packWithBudget = (coverage: number, budget: number) => {
        const ex = findExactWssada(coverage, budget);
        let packed = ex ? { pieces: ex, voidSpace: 0 } : wssada.optimize(coverage, false);
        const best = findBestWssadaWithVoid(coverage, budget);

        // Use new scoring: diversity penalty > void penalty
        const packedScore = (packed.voidSpace || 0) * 10 + new Set(packed.pieces || []).size * 100 + (packed.pieces || []).length * 1;
        const bestScore = (best.voidSpace || 0) * 10 + new Set(best.pieces).size * 100 + best.pieces.length * 1;
        if (bestScore < packedScore) packed = best;

        return { packed, target: coverage };
      };

      const hRes = packWithBudget(hCoverage, hBudget);
      const lRes = packWithBudget(lCoverage, lBudget);
      const rRes = packWithBudget(rCoverage, rBudget);

      // Calculate total score
      const totalVoid = (hRes.packed.voidSpace || 0) + (lRes.packed.voidSpace || 0) + (rRes.packed.voidSpace || 0);
      const allPieces = [...(hRes.packed.pieces || []), ...(lRes.packed.pieces || []), ...(rRes.packed.pieces || [])];
      const uniqueSizes = new Set(allPieces).size;
      const totalScore = totalVoid * 10 + uniqueSizes * 100 + allPieces.length * 1;

      return { hRes, lRes, rRes, totalScore };
    };

    // Try all possible allocations of 2 corner pieces across 3 walls
    const uShapeAllocations = [
      tryUShapeCornerAllocation(2, 0, 0),
      tryUShapeCornerAllocation(0, 2, 0),
      tryUShapeCornerAllocation(0, 0, 2),
      tryUShapeCornerAllocation(1, 1, 0),
      tryUShapeCornerAllocation(1, 0, 1),
      tryUShapeCornerAllocation(0, 1, 1)
    ];
    const bestUShapeAllocation = uShapeAllocations.reduce((best, curr) => curr.totalScore < best.totalScore ? curr : best);

    let hRes = bestUShapeAllocation.hRes;
    let lRes = bestUShapeAllocation.lRes;
    let rRes = bestUShapeAllocation.rRes;

    // ISSUE 2 FIX: Track corner pieces to enforce global budget of 2
    let allocatedCorners = [
      ...(hRes.packed.pieces || []),
      ...(lRes.packed.pieces || []),
      ...(rRes.packed.pieces || [])
    ].filter(p => p === 60 || p === 58).length;
    let remainingCornerBudget = Math.max(0, 2 - allocatedCorners);

    // STEP 2: Calculate Wssada based on wssadaPattern
    // CRITICAL: Use wssadaPattern for corner ownership, NOT glssaCfg!
    // Calculate permitMax based on Wssada ownership and Glssa coverage
    const leftPermitMax = wssadaPattern.left === 'left' ? lCoverage + 10 : lCoverage;
    const hPermitMax = (wssadaPattern.left === 'back' && wssadaPattern.right === 'back')
      ? hCoverage + 10  // Back owns both corners
      : (wssadaPattern.left === 'back' || wssadaPattern.right === 'back')
        ? hCoverage + 10  // Back owns one corner
        : hCoverage;      // Back owns no corners
    const rightPermitMax = wssadaPattern.right === 'right' ? rCoverage + 10 : rCoverage;

    // tryExtend function - extends Wssada to reach corners (copied from L-shape lines 176-196)
    const tryExtend = (packed: {pieces:number[]; voidSpace:number}, baseLen: number, permitMax: number, cornerBudget: number) => {
      const currentSum = (packed.pieces || []).reduce((s,n)=>s+n,0);
      const endGap = Math.max(0, permitMax - currentSum);
      if (endGap < 60) return { packed, target: baseLen, addedCorners: 0 };
      const choices = [90,85,80,60];
      let best = { pieces: packed.pieces.slice(), voidSpace: permitMax - currentSum };
      let bestAddedCorners = 0;
      const tryAdd = (add: number[]) => {
        const sum = currentSum + add.reduce((s,n)=>s+n,0);
        if (sum > permitMax) return;
        // ISSUE 2 FIX: Check corner budget
        const cornersInAdd = add.filter(p => p === 60 || p === 58).length;
        if (cornersInAdd > cornerBudget) return;
        const voidSpace = permitMax - sum;
        if (voidSpace <= 20 && (voidSpace < best.voidSpace || (voidSpace === best.voidSpace && new Set(add).size <= new Set(best.pieces).size))) {
          best = { pieces: [...packed.pieces, ...add].sort((a,b)=>b-a), voidSpace } as any;
          bestAddedCorners = cornersInAdd;
        }
      };
      for (const a of choices) tryAdd([a]);
      for (const a of choices) for (const b of choices) tryAdd([a,b]);
      if (best.voidSpace < permitMax - currentSum) {
        return { packed: { pieces: best.pieces, voidSpace: permitMax - best.pieces.reduce((s,n)=>s+n,0) }, target: permitMax, addedCorners: bestAddedCorners };
      }
      return { packed, target: baseLen, addedCorners: 0 };
    };

    // ISSUE 2 FIX: Apply tryExtend to each wall with corner budget tracking
    const hExt = tryExtend(hRes.packed, hCoverage, hPermitMax, remainingCornerBudget);
    remainingCornerBudget = Math.max(0, remainingCornerBudget - hExt.addedCorners);
    const lExt = tryExtend(lRes.packed, lCoverage, leftPermitMax, remainingCornerBudget);
    remainingCornerBudget = Math.max(0, remainingCornerBudget - lExt.addedCorners);
    const rExt = tryExtend(rRes.packed, rCoverage, rightPermitMax, remainingCornerBudget);

    // Update results with extended Wssada
    const hResFinal = { packed: hExt.packed as any, target: hExt.target };
    const lResFinal = { packed: lExt.packed as any, target: lExt.target };
    const rResFinal = { packed: rExt.packed as any, target: rExt.target };

    // STEP 3: Calculate holistic score for this complete solution
    const wH = { pieces: hResFinal.packed.pieces, voidSpace: hResFinal.packed.voidSpace };
    const wL = { pieces: lResFinal.packed.pieces, voidSpace: lResFinal.packed.voidSpace };
    const wR = { pieces: rResFinal.packed.pieces, voidSpace: rResFinal.packed.voidSpace };

    const holisticScore = calculateUShapeHolisticScore(gH, gL, gR, wH, wL, wR);

    return {
      glssaCfg,
      wssadaPattern,
      gH, gL, gR,
      wH, wL, wR,
      topEffective,
      leftEffective,
      rightEffective,
      hTarget: hResFinal.target,
      lTarget: lResFinal.target,
      rTarget: rResFinal.target,
      holisticScore
    };
  };

  // HOLISTIC OPTIMIZATION: Test all 16 Glssa+Wssada combinations (4 × 4)
  const allUSolutions: any[] = [];
  for (const glssaCfg of glssaConfigs) {
    for (const wssadaPattern of wssadaPatterns) {
      allUSolutions.push(evaluateCompleteUShapeSolution(glssaCfg, wssadaPattern));
    }
  }

  // Pick the solution with the lowest (best) holistic score
  const bestUSolution = allUSolutions.reduce((best, curr) =>
    curr.holisticScore < best.holisticScore ? curr : best
  );

  return {
    ...buildResult(
      [...bestUSolution.gH.pieces, ...bestUSolution.gL.pieces, ...bestUSolution.gR.pieces],
      [...bestUSolution.wH.pieces, ...bestUSolution.wL.pieces, ...bestUSolution.wR.pieces]
    ),
    engine: { name: 'convex.calculations.performOptimization', wssadaExactSolver: true, version: '2025-11-06-holistic' },
    segments: {
      glssaOwnerLeft: bestUSolution.glssaCfg.leftOwner,
      glssaOwnerRight: bestUSolution.glssaCfg.rightOwner,
      wssadaOwnerLeft: bestUSolution.wssadaPattern.left,
      wssadaOwnerRight: bestUSolution.wssadaPattern.right,
      horizontal: {
        glssaPieces: bestUSolution.gH.pieces,
        wssadaPieces: bestUSolution.wH.pieces,
        effectiveLength: bestUSolution.topEffective,
        voidSpace: bestUSolution.gH.voidSpace,
        wssadaTarget: bestUSolution.hTarget,
        wssadaVoid: bestUSolution.wH.voidSpace || 0
      },
      left: {
        glssaPieces: bestUSolution.gL.pieces,
        wssadaPieces: bestUSolution.wL.pieces,
        effectiveLength: bestUSolution.leftEffective,
        voidSpace: bestUSolution.gL.voidSpace,
        wssadaTarget: bestUSolution.lTarget,
        wssadaVoid: bestUSolution.wL.voidSpace || 0
      },
      right: {
        glssaPieces: bestUSolution.gR.pieces,
        wssadaPieces: bestUSolution.wR.pieces,
        effectiveLength: bestUSolution.rightEffective,
        voidSpace: bestUSolution.gR.voidSpace,
        wssadaTarget: bestUSolution.rTarget,
        wssadaVoid: bestUSolution.wR.voidSpace || 0
      }
    }
  };
}
