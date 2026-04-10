'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  calculateGeometry,
  findOptimalDistribution,
  generateFloorPlanSVG,
  generateFloorPlanDataUrl,
  calculateFloorRect,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
} from '@/lib/ai-room-visualizer';
import type { CarpetInventory, MultiCarpetResult, CarpetPlacement } from '@/lib/ai-room-visualizer';
import type { LayoutType } from '@/lib/ai-room-visualizer';
import { useGetAllCarpetFeedback, useSaveCarpetFeedback } from '@/hooks/useConvex';

// ============================================
// TEST CASES
// ============================================

interface TestCase {
  id: number;
  name: string;
  layoutType: LayoutType;
  dimensions: Record<string, number>;
  description: string;
}

const TEST_CASES: TestCase[] = [
  // ============ L-SHAPE ============
  {
    id: 1,
    name: 'L - Tiny',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 180, verticalLength: 180 },
    description: 'Tiny L (180x180) - floor 110x110',
  },
  {
    id: 2,
    name: 'L - Small',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 220, verticalLength: 200 },
    description: 'Small L (220x200) - floor 150x130',
  },
  {
    id: 3,
    name: 'L - Small-Med',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 260, verticalLength: 240 },
    description: 'Small-medium L (260x240) - floor 190x170',
  },
  {
    id: 4,
    name: 'L - Medium',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 300, verticalLength: 270 },
    description: 'Medium L (300x270) - floor 230x200',
  },
  {
    id: 5,
    name: 'L - Med-Large',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 350, verticalLength: 300 },
    description: 'Medium-large L (350x300) - floor 280x230',
  },
  {
    id: 6,
    name: 'L - Large',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 400, verticalLength: 350 },
    description: 'Large L (400x350) - floor 330x280',
  },
  {
    id: 7,
    name: 'L - XL',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 500, verticalLength: 400 },
    description: 'Extra large L (500x400) - floor 430x330',
  },
  {
    id: 8,
    name: 'L - Wide',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 500, verticalLength: 250 },
    description: 'Wide L (500x250) - floor 430x180',
  },
  {
    id: 9,
    name: 'L - Tall',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 250, verticalLength: 400 },
    description: 'Tall L (250x400) - floor 180x330',
  },

  // ============ U-SHAPE ============
  {
    id: 10,
    name: 'U - Tiny',
    layoutType: 'u-shape',
    dimensions: { leftLength: 180, centerLength: 220, rightLength: 180 },
    description: 'Tiny U (220x180/180) - floor 80x110',
  },
  {
    id: 11,
    name: 'U - Small',
    layoutType: 'u-shape',
    dimensions: { leftLength: 200, centerLength: 250, rightLength: 200 },
    description: 'Small U (250x200/200) - floor 110x130',
  },
  {
    id: 12,
    name: 'U - Small-Med',
    layoutType: 'u-shape',
    dimensions: { leftLength: 230, centerLength: 300, rightLength: 230 },
    description: 'Small-medium U (300x230/230) - floor 160x160',
  },
  {
    id: 13,
    name: 'U - Your Room',
    layoutType: 'u-shape',
    dimensions: { leftLength: 273, centerLength: 326, rightLength: 173 },
    description: 'YOUR ROOM (326x273/173) - floor 186x203 - SHOULD be 2.4x1.6m',
  },
  {
    id: 14,
    name: 'U - Medium Sym',
    layoutType: 'u-shape',
    dimensions: { leftLength: 280, centerLength: 370, rightLength: 280 },
    description: 'Medium symmetric U (370x280/280) - floor 230x210',
  },
  {
    id: 15,
    name: 'U - Medium',
    layoutType: 'u-shape',
    dimensions: { leftLength: 300, centerLength: 400, rightLength: 300 },
    description: 'Medium U (400x300/300) - floor 260x230',
  },
  {
    id: 16,
    name: 'U - Med-Large',
    layoutType: 'u-shape',
    dimensions: { leftLength: 320, centerLength: 450, rightLength: 320 },
    description: 'Medium-large U (450x320/320) - floor 310x250',
  },
  {
    id: 17,
    name: 'U - Large',
    layoutType: 'u-shape',
    dimensions: { leftLength: 350, centerLength: 500, rightLength: 350 },
    description: 'Large U (500x350/350) - floor 360x280',
  },
  {
    id: 18,
    name: 'U - XL',
    layoutType: 'u-shape',
    dimensions: { leftLength: 400, centerLength: 600, rightLength: 400 },
    description: 'XL U (600x400/400) - floor 460x330',
  },
  {
    id: 19,
    name: 'U - Asym Short-Right',
    layoutType: 'u-shape',
    dimensions: { leftLength: 300, centerLength: 350, rightLength: 180 },
    description: 'Asymmetric U short right (350x300/180) - floor 210x230',
  },
  {
    id: 20,
    name: 'U - Asym Big Diff',
    layoutType: 'u-shape',
    dimensions: { leftLength: 350, centerLength: 400, rightLength: 200 },
    description: 'Asymmetric U big diff (400x350/200) - floor 260x280',
  },
  {
    id: 21,
    name: 'U - Wide Center',
    layoutType: 'u-shape',
    dimensions: { leftLength: 250, centerLength: 500, rightLength: 250 },
    description: 'Wide center U (500x250/250) - floor 360x180',
  },
  {
    id: 22,
    name: 'U - Narrow Center',
    layoutType: 'u-shape',
    dimensions: { leftLength: 350, centerLength: 280, rightLength: 350 },
    description: 'Narrow center U (280x350/350) - floor 140x280',
  },

  // ============ FOUR-WALLS ============
  {
    id: 23,
    name: 'FW - Tiny',
    layoutType: 'four-walls',
    dimensions: { topLength: 250, leftLength: 220, rightLength: 220, bottomLeftLength: 100, bottomRightLength: 100 },
    description: 'Tiny four-walls (250x220) - floor 110x80',
  },
  {
    id: 24,
    name: 'FW - Small',
    layoutType: 'four-walls',
    dimensions: { topLength: 300, leftLength: 250, rightLength: 250, bottomLeftLength: 120, bottomRightLength: 120 },
    description: 'Small four-walls (300x250) - floor 160x110',
  },
  {
    id: 25,
    name: 'FW - Small-Med',
    layoutType: 'four-walls',
    dimensions: { topLength: 350, leftLength: 300, rightLength: 300, bottomLeftLength: 140, bottomRightLength: 140 },
    description: 'Small-medium four-walls (350x300) - floor 210x160',
  },
  {
    id: 26,
    name: 'FW - Medium',
    layoutType: 'four-walls',
    dimensions: { topLength: 400, leftLength: 350, rightLength: 350, bottomLeftLength: 160, bottomRightLength: 160 },
    description: 'Medium four-walls (400x350) - floor 260x210',
  },
  {
    id: 27,
    name: 'FW - Med-Large',
    layoutType: 'four-walls',
    dimensions: { topLength: 450, leftLength: 380, rightLength: 380, bottomLeftLength: 180, bottomRightLength: 180 },
    description: 'Medium-large four-walls (450x380) - floor 310x240',
  },
  {
    id: 28,
    name: 'FW - Large',
    layoutType: 'four-walls',
    dimensions: { topLength: 500, leftLength: 400, rightLength: 400, bottomLeftLength: 200, bottomRightLength: 200 },
    description: 'Large four-walls (500x400) - floor 360x260',
  },
  {
    id: 29,
    name: 'FW - XL',
    layoutType: 'four-walls',
    dimensions: { topLength: 600, leftLength: 450, rightLength: 450, bottomLeftLength: 250, bottomRightLength: 250 },
    description: 'XL four-walls (600x450) - floor 460x310',
  },
  {
    id: 30,
    name: 'FW - Asymmetric',
    layoutType: 'four-walls',
    dimensions: { topLength: 450, leftLength: 400, rightLength: 300, bottomLeftLength: 180, bottomRightLength: 180 },
    description: 'Asymmetric four-walls (450x400/300) - floor 310x260',
  },
  {
    id: 31,
    name: 'FW - Wide',
    layoutType: 'four-walls',
    dimensions: { topLength: 600, leftLength: 350, rightLength: 350, bottomLeftLength: 250, bottomRightLength: 250 },
    description: 'Wide four-walls (600x350)',
  },

  // ============ EDGE CASES: VERY SMALL (near 110cm min) ============
  {
    id: 32,
    name: 'L - Minimum',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 110, verticalLength: 110 },
    description: 'Minimum L (110x110) - floor 40x40 - barely any floor',
  },
  {
    id: 33,
    name: 'L - Near-Min',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 140, verticalLength: 130 },
    description: 'Near-minimum L (140x130) - floor 70x60',
  },
  {
    id: 34,
    name: 'U - Minimum',
    layoutType: 'u-shape',
    dimensions: { leftLength: 110, centerLength: 150, rightLength: 110 },
    description: 'Minimum U (150x110/110) - floor 10x40 - tiny sliver',
  },
  {
    id: 35,
    name: 'U - Near-Min',
    layoutType: 'u-shape',
    dimensions: { leftLength: 150, centerLength: 180, rightLength: 130 },
    description: 'Near-minimum U (180x150/130) - floor 40x80',
  },
  {
    id: 36,
    name: 'FW - Minimum',
    layoutType: 'four-walls',
    dimensions: { topLength: 180, leftLength: 180, rightLength: 180, bottomLeftLength: 60, bottomRightLength: 60 },
    description: 'Minimum four-walls (180x180) - floor 40x40',
  },

  // ============ EDGE CASES: VERY LARGE (700-1500cm) ============
  {
    id: 37,
    name: 'L - Huge',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 800, verticalLength: 700 },
    description: 'Huge L (800x700) - floor 730x630',
  },
  {
    id: 38,
    name: 'U - Huge',
    layoutType: 'u-shape',
    dimensions: { leftLength: 600, centerLength: 800, rightLength: 600 },
    description: 'Huge U (800x600/600) - floor 660x530',
  },
  {
    id: 39,
    name: 'U - Massive Asym',
    layoutType: 'u-shape',
    dimensions: { leftLength: 500, centerLength: 1000, rightLength: 350 },
    description: 'Massive asymmetric U (1000x500/350) - floor 860x430',
  },
  {
    id: 40,
    name: 'FW - Huge',
    layoutType: 'four-walls',
    dimensions: { topLength: 900, leftLength: 700, rightLength: 700, bottomLeftLength: 400, bottomRightLength: 400 },
    description: 'Huge four-walls (900x700) - floor 760x560',
  },
  {
    id: 41,
    name: 'FW - Salon',
    layoutType: 'four-walls',
    dimensions: { topLength: 1200, leftLength: 800, rightLength: 800, bottomLeftLength: 550, bottomRightLength: 550 },
    description: 'Salon-sized four-walls (1200x800) - floor 1060x660',
  },

  // ============ EDGE CASES: EXTREME ASPECT RATIOS ============
  {
    id: 42,
    name: 'L - Ultra Wide',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 700, verticalLength: 150 },
    description: 'Ultra wide L (700x150) - floor 630x80 - corridor shape',
  },
  {
    id: 43,
    name: 'L - Ultra Tall',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 150, verticalLength: 600 },
    description: 'Ultra tall L (150x600) - floor 80x530 - corridor shape',
  },
  {
    id: 44,
    name: 'U - Long Corridor',
    layoutType: 'u-shape',
    dimensions: { leftLength: 800, centerLength: 250, rightLength: 800 },
    description: 'Long corridor U (250x800/800) - floor 110x730 - very narrow',
  },
  {
    id: 45,
    name: 'U - Wide Short Arms',
    layoutType: 'u-shape',
    dimensions: { leftLength: 150, centerLength: 700, rightLength: 150 },
    description: 'Wide short arms U (700x150/150) - floor 560x80',
  },

  // ============ EDGE CASES: ASYMMETRIC FOUR-WALLS ============
  {
    id: 46,
    name: 'FW - Asym Bottom',
    layoutType: 'four-walls',
    dimensions: { topLength: 450, leftLength: 350, rightLength: 350, bottomLeftLength: 80, bottomRightLength: 250 },
    description: 'Asymmetric bottom (door off-center) - floor 310x210',
  },
  {
    id: 47,
    name: 'FW - Asym All',
    layoutType: 'four-walls',
    dimensions: { topLength: 500, leftLength: 450, rightLength: 300, bottomLeftLength: 120, bottomRightLength: 220 },
    description: 'Fully asymmetric four-walls - floor 360x310',
  },
  {
    id: 48,
    name: 'FW - Tiny Door',
    layoutType: 'four-walls',
    dimensions: { topLength: 400, leftLength: 350, rightLength: 350, bottomLeftLength: 170, bottomRightLength: 170 },
    description: 'Tiny door gap (60cm) four-walls - floor 260x210',
  },

  // ============ EDGE CASES: CARPET BOUNDARY SIZES ============
  {
    id: 49,
    name: 'U - Exact 2x1m Floor',
    layoutType: 'u-shape',
    dimensions: { leftLength: 170, centerLength: 340, rightLength: 170 },
    description: 'Floor exactly 200x100 - matches Type 1 carpet perfectly',
  },
  {
    id: 50,
    name: 'U - Exact 2.4x1.6m Floor',
    layoutType: 'u-shape',
    dimensions: { leftLength: 230, centerLength: 380, rightLength: 230 },
    description: 'Floor exactly 240x160 - matches Type 2 carpet perfectly',
  },
  {
    id: 51,
    name: 'L - Exact 3x2m Floor',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 370, verticalLength: 270 },
    description: 'Floor exactly 300x200 - matches Type 3 carpet perfectly',
  },
  {
    id: 52,
    name: 'L - Exact 4x3m Floor',
    layoutType: 'l-shape',
    dimensions: { horizontalLength: 470, verticalLength: 370 },
    description: 'Floor exactly 400x300 - matches Type 4 carpet perfectly',
  },
  {
    id: 53,
    name: 'U - Just Over 4x3m',
    layoutType: 'u-shape',
    dimensions: { leftLength: 380, centerLength: 560, rightLength: 380 },
    description: 'Floor 420x310 - just bigger than largest single carpet',
  },
];

// ============================================
// RESULT COMPUTATION
// ============================================

interface TestResult {
  testCase: TestCase;
  floorRect: { x: number; y: number; width: number; height: number } | null;
  bestCombo: MultiCarpetResult | null;
  allCombos: MultiCarpetResult[];
  svgDataUrl: string | null;
  error: string | null;
}

function computeTestResult(tc: TestCase): TestResult {
  // Always compute floor rect and carpet combos — these are independent of geometry/SVG
  const floorRect = calculateFloorRect(tc.layoutType, tc.dimensions);
  const inventory: CarpetInventory = { 1: 999, 2: 999, 3: 999, 4: 999 };
  const combos = floorRect ? selectBestCarpetCombo(floorRect, inventory) : [];
  const bestCombo = combos.length > 0 ? combos[0] : null;

  // SVG generation depends on geometry which can fail for edge-case dimensions
  let svgDataUrl: string | null = null;
  let error: string | null = null;

  try {
    const geom = calculateGeometry(tc.layoutType, tc.dimensions);
    const { scenario, distribution } = findOptimalDistribution(geom);

    const carpetInput = bestCombo && floorRect ? {
      carpets: bestCombo.placements.map(p => ({
        widthCm: p.fitWidth,
        heightCm: p.fitHeight,
        posX: p.posX,
        posY: p.posY,
        label: getCarpetDisplayLabel(p.carpetType, p.rotated),
        floorRect,
      })),
    } : {};

    svgDataUrl = generateFloorPlanDataUrl({
      layoutType: tc.layoutType,
      geometry: scenario,
      distribution,
      ...carpetInput,
    });
  } catch (err: any) {
    error = err.message;
  }

  return { testCase: tc, floorRect, bestCombo, allCombos: combos, svgDataUrl, error };
}

// ============================================
// COMPONENT
// ============================================

function serializePlacement(p: CarpetPlacement) {
  return {
    carpetTypeId: p.carpetType.id,
    carpetTypeLabel: p.carpetType.label,
    rotated: p.rotated,
    fitWidth: p.fitWidth,
    fitHeight: p.fitHeight,
    posX: p.posX,
    posY: p.posY,
  };
}

const BATCH_SIZE = 5; // compute 5 cases per frame to avoid freezing
const PAGE_SIZE = 20;

export default function CarpetTestPage() {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [computing, setComputing] = useState(false);
  const [page, setPage] = useState(0);
  const abortRef = useRef(false);
  const allFeedback = useGetAllCarpetFeedback();
  const saveFeedback = useSaveCarpetFeedback();

  const feedbackMap = useMemo(() => {
    const map = new Map<number, (typeof allFeedback extends (infer T)[] | undefined ? T : never)>();
    if (allFeedback) {
      for (const f of allFeedback) {
        map.set(f.testCaseId, f);
      }
    }
    return map;
  }, [allFeedback]);

  const reviewedCount = feedbackMap.size;

  // Batch compute results across multiple frames
  useEffect(() => {
    if (!showResults) {
      setResults([]);
      setPage(0);
      return;
    }

    abortRef.current = false;
    setComputing(true);
    setResults([]);

    let i = 0;
    function processBatch() {
      if (abortRef.current) return;
      const batch: TestResult[] = [];
      const end = Math.min(i + BATCH_SIZE, TEST_CASES.length);
      for (; i < end; i++) {
        batch.push(computeTestResult(TEST_CASES[i]));
      }
      setResults(prev => [...prev, ...batch]);

      if (i < TEST_CASES.length) {
        requestAnimationFrame(processBatch);
      } else {
        setComputing(false);
      }
    }

    requestAnimationFrame(processBatch);

    return () => { abortRef.current = true; };
  }, [showResults]);

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          Carpet (Zerbiya) Test Cases
        </h1>
        <p className="text-stone-500 mb-4">
          {TEST_CASES.length} use cases across L-Shape, U-Shape, and Four-Walls layouts (incl. edge cases).
          Review each case and select the correct carpet option.
        </p>

        {/* Progress banner */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 bg-stone-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all"
              style={{ width: `${(reviewedCount / TEST_CASES.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-stone-600 whitespace-nowrap">
            {reviewedCount} / {TEST_CASES.length} reviewed
          </span>
        </div>

        {!showResults ? (
          <button
            onClick={() => setShowResults(true)}
            className="px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-lg"
          >
            Generate All {TEST_CASES.length} Cases
          </button>
        ) : (
          <button
            onClick={() => setShowResults(false)}
            className="px-4 py-2 bg-stone-300 text-stone-700 font-medium rounded-lg hover:bg-stone-400 transition-colors mb-6"
          >
            Reset
          </button>
        )}

        {showResults && computing && (
          <div className="mt-12 flex flex-col items-center justify-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-stone-200" />
              <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700">
                Generating test cases...
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {results.length} / {TEST_CASES.length} ready
              </p>
            </div>
            {/* Mini progress bar */}
            <div className="w-48 bg-stone-200 rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(results.length / TEST_CASES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {showResults && !computing && (() => {
          const totalPages = Math.ceil(results.length / PAGE_SIZE);
          const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

          return (
            <>
              {/* Pagination controls - top */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-stone-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, results.length)} of {results.length}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          i === page
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {pageResults.map((r) => (
                  <TestCaseCard
                    key={r.testCase.id}
                    result={r}
                    existingFeedback={feedbackMap.get(r.testCase.id) ?? null}
                    onSave={async (data) => {
                      await saveFeedback(data);
                    }}
                  />
                ))}
              </div>

              {/* Pagination controls - bottom */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === 0}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-stone-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === totalPages - 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

interface TestCaseCardProps {
  result: TestResult;
  existingFeedback: {
    testCaseId: number;
    selectedComboIndex: number;
    notes?: string;
  } | null;
  onSave: (data: {
    testCaseId: number;
    testCaseName: string;
    layoutType: string;
    dimensions: Record<string, number>;
    floorRect: { x: number; y: number; width: number; height: number };
    selectedComboIndex: number;
    selectedPlacements: Array<{
      carpetTypeId: number;
      carpetTypeLabel: string;
      rotated: boolean;
      fitWidth: number;
      fitHeight: number;
      posX: number;
      posY: number;
    }>;
    totalCoveragePercent: number;
    totalPrice: number;
    algorithmAgreed: boolean;
    notes?: string;
  }) => Promise<void>;
}

function TestCaseCard({ result, existingFeedback, onSave }: TestCaseCardProps) {
  const { testCase, floorRect, bestCombo, allCombos, svgDataUrl, error } = result;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Pre-populate from existing feedback
  useEffect(() => {
    if (existingFeedback) {
      setSelectedIndex(existingFeedback.selectedComboIndex);
      setNotes(existingFeedback.notes || '');
    }
  }, [existingFeedback]);

  const layoutColors: Record<string, string> = {
    'l-shape': 'bg-blue-100 text-blue-700',
    'u-shape': 'bg-green-100 text-green-700',
    'four-walls': 'bg-purple-100 text-purple-700',
  };

  const carpetLabel = bestCombo
    ? bestCombo.placements.map(p => getCarpetDisplayLabel(p.carpetType, p.rotated)).join(' + ')
    : 'None';

  const handleSave = async () => {
    if (selectedIndex === null || !floorRect) return;
    setSaving(true);
    try {
      const combo = selectedIndex >= 0 ? allCombos[selectedIndex] : null;
      await onSave({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        layoutType: testCase.layoutType,
        dimensions: testCase.dimensions,
        floorRect,
        selectedComboIndex: selectedIndex,
        selectedPlacements: combo ? combo.placements.map(serializePlacement) : [],
        totalCoveragePercent: combo ? combo.totalCoveragePercent : 0,
        totalPrice: combo ? combo.totalPrice : 0,
        algorithmAgreed: selectedIndex === 0,
        notes: notes || undefined,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // silent fail for internal tool
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = existingFeedback
    ? selectedIndex !== existingFeedback.selectedComboIndex || notes !== (existingFeedback.notes || '')
    : selectedIndex !== null;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${existingFeedback ? 'border-green-300' : 'border-stone-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${layoutColors[testCase.layoutType] || 'bg-stone-100 text-stone-600'}`}>
            {testCase.layoutType}
          </span>
          <span className="text-xs text-stone-400">#{testCase.id}</span>
          {existingFeedback && (
            <span className="ml-auto text-green-600 text-xs font-medium">Reviewed</span>
          )}
        </div>
        <h3 className="font-semibold text-stone-800 text-sm">{testCase.name}</h3>
        <p className="text-xs text-stone-500">{testCase.description}</p>
      </div>

      {/* SVG */}
      <div className="p-3 bg-stone-50 flex justify-center" style={{ minHeight: 200 }}>
        {error ? (
          <div className="text-red-500 text-xs text-center p-4">{error}</div>
        ) : svgDataUrl ? (
          <img src={svgDataUrl} alt={testCase.name} className="max-w-full max-h-[280px] object-contain" />
        ) : (
          <div className="text-stone-400 text-xs">No SVG</div>
        )}
      </div>

      {/* Carpet Info */}
      <div className="px-4 py-3 border-t border-stone-100 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Floor (foot area):</span>
          <span className="font-mono font-medium text-stone-700">
            {floorRect ? `${floorRect.width} × ${floorRect.height} cm` : 'N/A'}
          </span>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Algo pick:</span>
          <span className={`font-semibold ${bestCombo ? 'text-amber-700' : 'text-red-500'}`}>
            {carpetLabel}
          </span>
        </div>

        {bestCombo && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Coverage:</span>
              <span className="font-mono font-medium text-stone-700">
                {bestCombo.totalCoveragePercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Price:</span>
              <span className="font-mono font-medium text-stone-700">
                {bestCombo.totalPrice} MAD
              </span>
            </div>
          </>
        )}
      </div>

      {/* Expert Feedback Section */}
      <div className="px-4 py-3 border-t border-stone-200 space-y-3">
        <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
          Expert Feedback
        </h4>

        {/* Combo radio list */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {allCombos.slice(0, 10).map((combo, i) => {
            const label = combo.placements.map(p => getCarpetDisplayLabel(p.carpetType, p.rotated)).join(' + ');
            const isSelected = selectedIndex === i;
            return (
              <label
                key={i}
                className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors ${
                  isSelected ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name={`feedback-${testCase.id}`}
                  checked={isSelected}
                  onChange={() => setSelectedIndex(i)}
                  className="mt-0.5 accent-amber-600"
                />
                <span className="flex-1">
                  <span className={isSelected ? 'font-medium text-amber-800' : 'text-stone-600'}>
                    {label}
                  </span>
                  <span className="text-stone-400">
                    {' '}— {combo.totalCoveragePercent.toFixed(1)}% — {combo.totalPrice} MAD
                    {combo.placements.length > 1 && ` (x${combo.placements.length})`}
                  </span>
                  {i === 0 && (
                    <span className="ml-1.5 text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold uppercase">
                      Algo Pick
                    </span>
                  )}
                </span>
              </label>
            );
          })}

          {/* None option */}
          <label
            className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors ${
              selectedIndex === -1 ? 'bg-red-50 ring-1 ring-red-300' : 'hover:bg-stone-50'
            }`}
          >
            <input
              type="radio"
              name={`feedback-${testCase.id}`}
              checked={selectedIndex === -1}
              onChange={() => setSelectedIndex(-1)}
              className="mt-0.5 accent-red-600"
            />
            <span className={selectedIndex === -1 ? 'font-medium text-red-700' : 'text-stone-500'}>
              None of these are correct
            </span>
          </label>
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={selectedIndex === null || !hasChanged || saving || !floorRect}
          className={`w-full text-xs font-semibold py-2 rounded-lg transition-colors ${
            justSaved
              ? 'bg-green-100 text-green-700'
              : selectedIndex !== null && hasChanged && !saving
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          }`}
        >
          {justSaved
            ? 'Saved!'
            : saving
              ? 'Saving...'
              : existingFeedback
                ? 'Update Feedback'
                : 'Save Feedback'}
        </button>
      </div>
    </div>
  );
}
