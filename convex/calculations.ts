import { action } from "./_generated/server";
import { v } from "convex/values";
import { FlexibleIdealOptimizer, WssadaOptimizer } from "./optimizers";

export const performOptimization = action({
  args: {
    layoutType: v.union(v.literal("single-wall"), v.literal("l-shape"), v.literal("u-shape")),
    lengths: v.object({
      single: v.optional(v.number()),
      h: v.optional(v.number()),
      v: v.optional(v.number()),
      l: v.optional(v.number()),
      r: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    console.log('🟦 [CONVEX] performOptimization STARTED', { layoutType: args.layoutType, lengths: args.lengths });

    const glssa = new FlexibleIdealOptimizer();
    const wssada = new WssadaOptimizer();
    console.log('✅ [CONVEX] Optimizers initialized');

    const clamp = (n: number) => Math.max(0, Math.min(2000, Math.round(n)));

    // Helper: exact Wssada packing solver (80..90 and up to two 60s)
    const findExactWssada = (target: number): number[] | null => {
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
      for (let num60 = 0; num60 <= 2; num60++) {
        const rem = target - num60 * 60;
        if (rem < 0) continue;
        const maxPieces = 7;
        for (let n = 1; n <= maxPieces; n++) {
          const flex = tryFlex(rem, n);
          if (flex) return [...flex, ...Array(num60).fill(60)].sort((a, b) => b - a);
        }
      }
      return null;
    };

    const findBestWssadaWithVoid = (target: number): { pieces: number[]; voidSpace: number } => {
      let best: { pieces: number[]; voidSpace: number } | null = null;

      const tryFlexWithVoid = (remain: number, maxPieces: number, maxVoid: number) => {
        let localBest: { pieces: number[]; voidSpace: number } | null = null;
        const backtrack = (acc: number[], left: number, leftPieces: number) => {
          if (leftPieces === 0) {
            if (left >= 0 && left <= maxVoid) {
              const pieces = [...acc].sort((a,b)=>b-a);
              const voidSpace = left;
              if (!localBest || voidSpace < localBest.voidSpace || (voidSpace === localBest.voidSpace && new Set(pieces).size < new Set(localBest.pieces).size)) {
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

      for (let num60 = 0; num60 <= 2; num60++) {
        const rem = target - num60 * 60;
        if (rem < 0) continue;
        if (rem === 0) {
          const cand = { pieces: Array(num60).fill(60), voidSpace: 0 };
          if (!best || cand.voidSpace < best.voidSpace) best = cand;
          continue;
        }
        let flex: { pieces: number[]; voidSpace: number } | null = rem >= 80 ? tryFlexWithVoid(rem, 7, 30) : null;
        if (!flex) flex = { pieces: [], voidSpace: rem };
        const pieces = [...(flex.pieces || []), ...Array(num60).fill(60)].sort((a,b)=>b-a);
        const cand = { pieces, voidSpace: flex.voidSpace };
        if (!best || cand.voidSpace < best.voidSpace || (cand.voidSpace === best.voidSpace && new Set(pieces).size < new Set(best.pieces).size)) {
          best = cand;
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

      // Two ownership scenarios
      const A_hEff = Math.max(0, H);
      const A_vEff = Math.max(0, V - T);
      const A_gH = glssa.optimize(A_hEff);
      const A_gV = glssa.optimize(A_vEff);

      const B_hEff = Math.max(0, H - T);
      const B_vEff = Math.max(0, V);
      const B_gH = glssa.optimize(B_hEff);
      const B_gV = glssa.optimize(B_vEff);

      const scoreScenario = (gH: any, gV: any) => {
        let score = 0;
        if ((gH.voidSpace || 0) > 0) score += 10000000;
        score += (gV.voidSpace || 0) * 1000;
        const allPieces = [...(gH.pieces || []), ...(gV.pieces || [])];
        const ideal = allPieces.filter((p) => p >= 180 && p <= 190).length;
        const nonIdeal = allPieces.filter((p) => p < 180 || p > 190).length;
        score -= ideal * 500;
        score += nonIdeal * 2000;
        if (nonIdeal === 0 && ideal > 0) score -= 1000;
        allPieces.forEach((p) => {
          if (p > 190) score += (p - 190) * 100; else if (p < 180) score += (180 - p) * 50; if (p > 200 || p < 160) score += 1000;
        });
        return score;
      };

      const owner = scoreScenario(A_gH, A_gV) <= scoreScenario(B_gH, B_gV) ? 'horizontal' : 'vertical';
      const gH = owner === 'horizontal' ? A_gH : B_gH;
      const gV = owner === 'vertical' ? B_gV : A_gV;
      const hEff = owner === 'horizontal' ? A_hEff : B_hEff;
      const vEff = owner === 'vertical' ? B_vEff : A_vEff;

      const hCoverage = (gH.pieces || []).reduce((s:number,n:number)=>s+n,0);
      const vCoverage = (gV.pieces || []).reduce((s:number,n:number)=>s+n,0);
      const buildW = (wOwner: 'horizontal' | 'vertical') => {
        const hLenBase = hCoverage;
        const vLenBase = vCoverage;
        // Match client-side logic: use full wall length minus corner offset
        const hCornerOffset = wOwner === 'vertical' ? 10 : 0;
        const vCornerOffset = wOwner === 'horizontal' ? 10 : 0;
        const hPermitMax = Math.max(0, H - hCornerOffset);
        const vPermitMax = Math.max(0, V - vCornerOffset);

        const hExact = findExactWssada(hLenBase);
        const vExact = findExactWssada(vLenBase);
        let wh = hExact ? { pieces: hExact, voidSpace: 0 } : wssada.optimize(hLenBase, false);
        let wv = vExact ? { pieces: vExact, voidSpace: 0 } : wssada.optimize(vLenBase, false);
        const hBest = findBestWssadaWithVoid(hLenBase);
        const vBest = findBestWssadaWithVoid(vLenBase);
        if ((hBest.voidSpace || 0) < (wh.voidSpace || 0)) wh = hBest;
        if ((vBest.voidSpace || 0) < (wv.voidSpace || 0)) wv = vBest;

        const tryExtend = (packed: {pieces:number[]; voidSpace:number}, baseLen: number, permitMax: number) => {
          const currentSum = (packed.pieces || []).reduce((s,n)=>s+n,0);
          const endGap = Math.max(0, permitMax - currentSum);
          if (endGap < 60) return { packed, target: baseLen };
          const choices = [90,85,80,60];
          let best = { pieces: packed.pieces.slice(), voidSpace: permitMax - currentSum };
          const tryAdd = (add: number[]) => {
            const sum = currentSum + add.reduce((s,n)=>s+n,0);
            if (sum > permitMax) return;
            const voidSpace = permitMax - sum;
            if (voidSpace <= 20 && (voidSpace < best.voidSpace || (voidSpace === best.voidSpace && new Set(add).size <= new Set(best.pieces).size))) {
              best = { pieces: [...packed.pieces, ...add].sort((a,b)=>b-a), voidSpace } as any;
            }
          };
          for (const a of choices) tryAdd([a]);
          for (const a of choices) for (const b of choices) tryAdd([a,b]);
          if (best.voidSpace < permitMax - currentSum) {
            return { packed: { pieces: best.pieces, voidSpace: permitMax - best.pieces.reduce((s,n)=>s+n,0) }, target: permitMax };
          }
          return { packed, target: baseLen };
        };

        const hExt = tryExtend(wh, hLenBase, hPermitMax);
        wh = hExt.packed as any;
        const vExt = tryExtend(wv, vLenBase, vPermitMax);
        wv = vExt.packed as any;

        const hSum = (wh.pieces || []).reduce((s: number, n: number) => s + n, 0);
        const vSum = (wv.pieces || []).reduce((s: number, n: number) => s + n, 0);
        const hVoid = Math.max(0, hExt.target - hSum);
        const vVoid = Math.max(0, vExt.target - vSum);
        const totalVoid = hVoid + vVoid;
        const uniqueSizes = new Set([...(wh.pieces || []), ...(wv.pieces || [])]).size;
        const ninetyEighty = [...(wh.pieces || []), ...(wv.pieces || [])].filter((p) => p === 90 || p === 80).length;
        return { wOwner, wh: { ...wh, voidSpace: hVoid }, wv: { ...wv, voidSpace: vVoid }, totalVoid, uniqueSizes, ninetyEighty, hLen: hExt.target, vLen: vExt.target };
      };
      const W_A = buildW('horizontal');
      const W_B = buildW('vertical');
      const better = (a: any, b: any) => {
        if (a.totalVoid !== b.totalVoid) return a.totalVoid < b.totalVoid ? a : b;
        if (a.uniqueSizes !== b.uniqueSizes) return a.uniqueSizes < b.uniqueSizes ? a : b;
        return a.ninetyEighty >= b.ninetyEighty ? a : b;
      };
      const W = better(W_A, W_B);

      return {
        ...buildResult([...gH.pieces, ...gV.pieces], [...W.wh.pieces, ...W.wv.pieces]),
        engine: { name: 'convex.calculations.performOptimization', wssadaExactSolver: true, version: '2025-09-29-01' },
        segments: {
          owner,
          wssadaOwner: W.wOwner,
          horizontal: { glssaPieces: gH.pieces, wssadaPieces: W.wh.pieces, effectiveLength: hEff, voidSpace: gH.voidSpace, wssadaTarget: W.hLen, wssadaVoid: W.wh.voidSpace || 0 },
          vertical: { glssaPieces: gV.pieces, wssadaPieces: W.wv.pieces, effectiveLength: vEff, voidSpace: gV.voidSpace, wssadaTarget: W.vLen, wssadaVoid: W.wv.voidSpace || 0 }
        }
      };
    }

    // u-shape: advanced server-side optimization with two corners (back/left and back/right)
    console.log('🔵 [CONVEX] U-SHAPE optimization starting');
    const H = clamp(args.lengths.h ?? 0);
    const L = clamp(args.lengths.l ?? 0);
    const R = clamp(args.lengths.r ?? 0);
    console.log('📏 [CONVEX] Clamped lengths:', { H, L, R });

    // Glssa: back keeps full length; sides lose 70 due to back intersections
    console.log('🟡 [CONVEX] Optimizing Glssa pieces...');
    const gH = glssa.optimize(H);
    console.log('✅ [CONVEX] Horizontal Glssa:', gH);
    const gL = glssa.optimize(Math.max(0, L - 70));
    console.log('✅ [CONVEX] Left Glssa:', gL);
    const gR = glssa.optimize(Math.max(0, R - 70));
    console.log('✅ [CONVEX] Right Glssa:', gR);

    const hCoverage = (gH.pieces || []).reduce((s:number,n:number)=>s+n,0);
    const lCoverage = (gL.pieces || []).reduce((s:number,n:number)=>s+n,0);
    const rCoverage = (gR.pieces || []).reduce((s:number,n:number)=>s+n,0);

    type Owner = 'back' | 'left' | 'right';
    const configs = [
      { leftOwner: 'left' as Owner, rightOwner: 'right' as Owner, name: 'both-verticals' },
      { leftOwner: 'back' as Owner, rightOwner: 'right' as Owner, name: 'back-left_vertical-right' },
      { leftOwner: 'left' as Owner, rightOwner: 'back' as Owner, name: 'vertical-left_back-right' },
      { leftOwner: 'back' as Owner, rightOwner: 'back' as Owner, name: 'back-both' },
    ];

    const evaluateConfig = (cfg: {leftOwner: Owner; rightOwner: Owner; name: string}) => {
      console.log(`🔍 [CONVEX] Evaluating config: ${cfg.name}`, { leftOwner: cfg.leftOwner, rightOwner: cfg.rightOwner });
      // Permitted corner-to-corner maxima
      const backPermit = Math.max(0, H - (cfg.leftOwner === 'left' ? 10 : 0) - (cfg.rightOwner === 'right' ? 10 : 0));
      const leftPermit = Math.max(0, L - (cfg.leftOwner === 'back' ? 10 : 0));
      const rightPermit = Math.max(0, R - (cfg.rightOwner === 'back' ? 10 : 0));
      console.log(`📐 [CONVEX] Permits calculated:`, { backPermit, leftPermit, rightPermit });

      const basePack = (coverage: number, permit: number) => {
        const ex = findExactWssada(coverage);
        let packed = ex ? { pieces: ex, voidSpace: 0 } : wssada.optimize(coverage, false);
        const best = findBestWssadaWithVoid(coverage);
        if ((best.voidSpace || 0) < (packed.voidSpace || 0)) packed = best;
        // extend into end-gap if it reduces leftover to <=20
        const sum = (packed.pieces || []).reduce((s:number,n:number)=>s+n,0);
        const gap = Math.max(0, permit - sum);
        if (gap >= 60) {
          const choices = [90,85,80,60];
          let bestExt = { pieces: packed.pieces.slice(), voidSpace: permit - sum } as any;
          const tryAdd = (add:number[]) => {
            const newSum = sum + add.reduce((s,n)=>s+n,0);
            if (newSum > permit) return;
            const voidSpace = permit - newSum;
            if (voidSpace <= 20 && voidSpace < bestExt.voidSpace) {
              bestExt = { pieces: [...packed.pieces, ...add].sort((a,b)=>b-a), voidSpace };
            }
          };
          for (const a of choices) tryAdd([a]);
          for (const a of choices) for (const b of choices) tryAdd([a,b]);
          if (bestExt.voidSpace < permit - sum) {
            const total = bestExt.pieces.reduce((s:number,n:number)=>s+n,0);
            packed = { pieces: bestExt.pieces, voidSpace: permit - total };
            return { packed, target: permit };
          }
        }
        return { packed, target: coverage };
      };

      console.log(`🎯 [CONVEX] Starting basePack for horizontal (coverage: ${hCoverage}, permit: ${backPermit})`);
      const hRes = basePack(hCoverage, backPermit);
      console.log(`✅ [CONVEX] Horizontal basePack done:`, { pieces: hRes.packed.pieces, voidSpace: hRes.packed.voidSpace });

      console.log(`🎯 [CONVEX] Starting basePack for left (coverage: ${lCoverage}, permit: ${leftPermit})`);
      const lRes = basePack(lCoverage, leftPermit);
      console.log(`✅ [CONVEX] Left basePack done:`, { pieces: lRes.packed.pieces, voidSpace: lRes.packed.voidSpace });

      console.log(`🎯 [CONVEX] Starting basePack for right (coverage: ${rCoverage}, permit: ${rightPermit})`);
      const rRes = basePack(rCoverage, rightPermit);
      console.log(`✅ [CONVEX] Right basePack done:`, { pieces: rRes.packed.pieces, voidSpace: rRes.packed.voidSpace });

      const totalVoid = hRes.packed.voidSpace + lRes.packed.voidSpace + rRes.packed.voidSpace;
      console.log(`📊 [CONVEX] Config ${cfg.name} totalVoid:`, totalVoid);
      const piecesAll = [...hRes.packed.pieces, ...lRes.packed.pieces, ...rRes.packed.pieces];
      const uniqueSizes = new Set(piecesAll).size;
      const ninetyEighty = piecesAll.filter(p=>p===90||p===80).length;

      return {
        cfg,
        h: hRes, l: lRes, r: rRes,
        totalVoid, uniqueSizes, ninetyEighty,
        score: totalVoid * 10 + uniqueSizes * 2 - ninetyEighty * 0.5,
      };
    };

    console.log('🔄 [CONVEX] Evaluating configs');
    const results = configs.map(evaluateConfig).sort((a,b)=> a.score - b.score)[0];
    console.log('✅ [CONVEX] Best config selected:', { leftOwner: results.cfg.leftOwner, rightOwner: results.cfg.rightOwner, score: results.score });

    const finalResult = {
      ...buildResult([...gH.pieces, ...gL.pieces, ...gR.pieces], [...results.h.packed.pieces, ...results.l.packed.pieces, ...results.r.packed.pieces]),
      segments: {
        wssadaOwnerLeft: results.cfg.leftOwner,
        wssadaOwnerRight: results.cfg.rightOwner,
        horizontal: { glssaPieces: gH.pieces, wssadaPieces: results.h.packed.pieces, wssadaTarget: results.h.target, wssadaVoid: results.h.packed.voidSpace },
        left: { glssaPieces: gL.pieces, wssadaPieces: results.l.packed.pieces, wssadaTarget: results.l.target, wssadaVoid: results.l.packed.voidSpace },
        right: { glssaPieces: gR.pieces, wssadaPieces: results.r.packed.pieces, wssadaTarget: results.r.target, wssadaVoid: results.r.packed.voidSpace },
      }
    };
    console.log('🏁 [CONVEX] performOptimization COMPLETED', finalResult);
    return finalResult;
  },
});
