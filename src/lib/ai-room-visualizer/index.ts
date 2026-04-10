/**
 * AI Room Visualizer
 *
 * Main module that orchestrates the full visualization flow:
 * 1. Calculate geometry (corner ownership, effective lengths)
 * 2. Distribute pieces (Glssa and Wssada)
 * 3. Generate SVG floor plan
 *
 * NEW ARCHITECTURE (v2):
 * - Geometry is calculated DETERMINISTICALLY (no AI needed)
 * - Piece distribution is ALGORITHMIC (pure math)
 * - SVG rendering uses pre-calculated positions
 *
 * LEGACY SUPPORT:
 * - Old AI-based flow still available via visualizeRoom()
 */

// ============================================
// NEW SYSTEM EXPORTS (v2)
// ============================================

export {
  // Geometry Calculator
  calculateGeometry,
  getBestScenario,
  geometrySummary,
  GLSSA_DEPTH,
  WSSADA_DEPTH,
  GLSSA_MIN,
  GLSSA_MAX,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
  isGlssaLengthValid,
  calculateSingleWallGeometry,
  calculateLShapeGeometry,
  calculateUShapeGeometry,
  calculateFourWallsGeometry,
} from './geometry-calculator';

export type {
  WallGeometry,
  CornerOwnership,
  GeometryScenario,
  LayoutGeometry,
} from './geometry-calculator';

export {
  // Piece Distributor
  distributePieces,
  findOptimalDistribution,
  evaluateAllScenarios,
  distributeGlssa,
  distributeWssada,
  findGlssaCombinations,
  distributionSummary,
  MAX_CORNER_PIECES_PER_ROOM,
} from './piece-distributor';

export type {
  PiecePosition,
  WallPieceDistribution,
  DistributionResult,
} from './piece-distributor';

export {
  // SVG Generator
  generateFloorPlan,
  generateFloorPlanSVG,
  generateFloorPlanDataUrl,
  // Legacy exports
  generateSVG,
  generateSVGDataUrl,
} from './svg-generator';

export type { SVGGeneratorInput } from './svg-generator';

export {
  // Carpet Calculator
  calculateFloorRect,
  selectBestCarpets,
  selectBestCarpetCombo,
  getCarpetDisplayLabel,
  BASE_CARPET_TYPES,
  COMPOSITE_CARPET_TYPES,
  ALL_CARPET_TYPES,
} from './carpet-calculator';

export type {
  BaseCarpetType,
  CompositeCarpetType,
  CarpetType,
  CarpetPlacement,
  MultiCarpetResult,
  FloorRect,
  CarpetInventory,
  CarpetFitResult,
} from './carpet-calculator';

export {
  // Order Reconstructor
  reconstructFromOrderData,
  LAYOUT_TYPE_MAP,
} from './order-reconstructor';

// ============================================
// LEGACY SYSTEM EXPORTS (v1 - AI-based)
// ============================================

import { calculateLayout } from './llm-calculator';
import { generateImage, getBestAvailableProvider, getAvailableProviders } from './image-generator';
import { generateFloorPlan } from './svg-generator';
import {
  LayoutType,
  ImageGenerationConfig,
  VisualizationResult,
  CalculationResult,
} from './types';

// Re-export types
export type {
  LayoutType,
  VisualizationResult,
  CalculationResult,
  ImageGenerationConfig,
  WallPieces,
  ImageProvider,
} from './types';

// Re-export utilities
export { getAvailableProviders, getBestAvailableProvider } from './image-generator';

// ============================================
// MAIN VISUALIZE FUNCTION (v2 - NEW)
// ============================================

export interface VisualizeOptions {
  /** Skip image generation, only calculate pieces */
  skipImageGeneration?: boolean;

  /** Output type: 'svg' for programmatic SVG (recommended), 'ai-image' for AI-generated image */
  outputType?: 'svg' | 'ai-image';

  /** Image generation configuration (only used when outputType is 'ai-image') */
  imageConfig?: Partial<ImageGenerationConfig>;

  /** LLM model to use for calculation (only used when outputType is 'ai-image') */
  llmModel?: string;
}

/**
 * Main entry point - calculates optimal layout and generates visualization
 *
 * NEW in v2: Uses deterministic geometry + algorithmic piece distribution
 * for 'svg' output type (default). Much faster and more accurate!
 */
export async function visualizeRoom(
  layoutType: LayoutType,
  dimensions: Record<string, number>,
  options: VisualizeOptions = {}
): Promise<VisualizationResult> {
  const totalStartTime = Date.now();

  console.log(`[AI-Visualizer] Starting visualization for ${layoutType}`, dimensions);

  // Default to SVG output (new system)
  const outputType = options.outputType || 'svg';

  // ============================================
  // NEW SYSTEM: SVG Output (Deterministic)
  // ============================================

  if (outputType === 'svg') {
    console.log('[AI-Visualizer] Using new deterministic system (v2)');

    try {
      const result = generateFloorPlan(layoutType, dimensions);

      // Build response in legacy format for compatibility
      const walls = result.distribution.walls.map((w) => ({
        wallId: w.wallId,
        effectiveLength: w.glssaEffective,
        glssaPieces: w.glssaPieces.map((p) => p.size),
        wssadaPieces: w.wssadaPieces.map((p) => p.size),
        glssaTotal: w.glssaTotal,
        wssadaTotal: w.wssadaTotal,
        glssaVoid: w.glssaVoid,
        wssadaVoid: w.wssadaVoid,
      }));

      const totalGlssaPieces = result.distribution.totalGlssaPieces;
      const totalWssadaPieces = result.distribution.totalWssadaPieces;

      // Estimate price (base + extra pieces)
      const basePriceDH = 4600;
      const pricePerExtraPieceDH = 2000;
      const totalPieces = totalGlssaPieces + totalWssadaPieces;
      const estimatedPrice = basePriceDH + Math.max(0, totalPieces - 1) * pricePerExtraPieceDH;

      const calculation: CalculationResult = {
        layoutType,
        walls,
        totalGlssa: walls.reduce((sum, w) => sum + w.glssaTotal, 0),
        totalWssada: walls.reduce((sum, w) => sum + w.wssadaTotal, 0),
        totalGlssaPieces,
        totalWssadaPieces,
        estimatedPrice,
        cornerOwnership: (result.geometry as any).corners?.reduce(
          (acc: Record<string, string>, c: any) => ({ ...acc, [c.cornerId]: c.glssaOwner }),
          {} as Record<string, string>
        ),
        reasoning: `Deterministic calculation using geometry-calculator v2. Scenario: ${result.geometry.recommendedScenarioId}`,
        imagePrompt: '', // Not needed for SVG
      };

      const totalTimeMs = Date.now() - totalStartTime;
      console.log(`[AI-Visualizer] SVG generation complete in ${totalTimeMs}ms`);

      return {
        success: true,
        calculation,
        image: {
          success: true,
          imageUrl: result.dataUrl,
          generationTimeMs: totalTimeMs,
          provider: 'svg',
          model: 'geometry-v2',
        },
        totalTimeMs,
        calculationTimeMs: totalTimeMs,
        imageGenerationTimeMs: 0,
      };
    } catch (error) {
      console.error('[AI-Visualizer] SVG generation failed:', error);
      return {
        success: false,
        calculation: null as unknown as CalculationResult,
        image: {
          success: false,
          generationTimeMs: Date.now() - totalStartTime,
          provider: 'svg',
          model: 'geometry-v2',
          error: (error as Error).message,
        },
        totalTimeMs: Date.now() - totalStartTime,
        calculationTimeMs: 0,
        imageGenerationTimeMs: 0,
        error: `SVG generation failed: ${(error as Error).message}`,
        errorCode: 'SVG_GENERATION_FAILED',
      };
    }
  }

  // ============================================
  // LEGACY SYSTEM: AI Image Output
  // ============================================

  console.log('[AI-Visualizer] Using legacy AI system (v1)');

  // Step 1: Calculate layout with LLM
  let calculation: CalculationResult;
  let calculationTimeMs: number;

  try {
    const calcStartTime = Date.now();
    calculation = await calculateLayout(layoutType, dimensions, {
      model: options.llmModel,
    });
    calculationTimeMs = Date.now() - calcStartTime;

    console.log(`[AI-Visualizer] Calculation completed in ${calculationTimeMs}ms`);
    console.log(`[AI-Visualizer] Pieces: ${calculation.totalGlssaPieces} Glssa, ${calculation.totalWssadaPieces} Wssada`);
  } catch (error) {
    console.error('[AI-Visualizer] Calculation failed:', error);

    return {
      success: false,
      calculation: null as unknown as CalculationResult,
      image: {
        success: false,
        generationTimeMs: 0,
        provider: 'replicate',
        model: 'unknown',
        error: 'Calculation failed',
      },
      totalTimeMs: Date.now() - totalStartTime,
      calculationTimeMs: 0,
      imageGenerationTimeMs: 0,
      error: `Calculation failed: ${(error as Error).message}`,
      errorCode: 'CALCULATION_FAILED',
    };
  }

  // Step 2: Generate image (if not skipped)
  if (options.skipImageGeneration) {
    console.log('[AI-Visualizer] Skipping image generation (as requested)');

    return {
      success: true,
      calculation,
      image: {
        success: false,
        generationTimeMs: 0,
        provider: 'replicate',
        model: 'skipped',
        error: 'Image generation skipped',
      },
      totalTimeMs: Date.now() - totalStartTime,
      calculationTimeMs,
      imageGenerationTimeMs: 0,
    };
  }

  // Check if any image provider is available
  const provider = options.imageConfig?.provider || getBestAvailableProvider();

  if (!provider) {
    console.warn('[AI-Visualizer] No image provider available');

    return {
      success: true,
      calculation,
      image: {
        success: false,
        generationTimeMs: 0,
        provider: 'replicate',
        model: 'none',
        error: 'No image provider configured. Set REPLICATE_API_TOKEN, OPENAI_API_KEY, or IDEOGRAM_API_KEY',
      },
      totalTimeMs: Date.now() - totalStartTime,
      calculationTimeMs,
      imageGenerationTimeMs: 0,
    };
  }

  // Generate image
  console.log(`[AI-Visualizer] Generating image with provider: ${provider}`);

  const imageStartTime = Date.now();
  const imageResult = await generateImage(calculation.imagePrompt, {
    provider,
    ...options.imageConfig,
  });
  const imageGenerationTimeMs = Date.now() - imageStartTime;

  if (!imageResult.success) {
    console.warn('[AI-Visualizer] Image generation failed:', imageResult.error);
  } else {
    console.log(`[AI-Visualizer] Image generated in ${imageGenerationTimeMs}ms`);
  }

  const totalTimeMs = Date.now() - totalStartTime;
  console.log(`[AI-Visualizer] Complete! Total time: ${totalTimeMs}ms`);

  return {
    success: imageResult.success,
    calculation,
    image: imageResult,
    totalTimeMs,
    calculationTimeMs,
    imageGenerationTimeMs,
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Calculate only - no image generation
 */
export async function calculateOnly(
  layoutType: LayoutType,
  dimensions: Record<string, number>
): Promise<CalculationResult> {
  return calculateLayout(layoutType, dimensions);
}

/**
 * Quick check if the system is properly configured
 */
export function checkConfiguration(): {
  llmConfigured: boolean;
  imageConfigured: boolean;
  availableImageProviders: string[];
  svgAvailable: boolean;
} {
  return {
    llmConfigured: !!process.env.ANTHROPIC_API_KEY,
    imageConfigured: getAvailableProviders().length > 0,
    availableImageProviders: getAvailableProviders(),
    svgAvailable: true, // Always available - no API key needed!
  };
}
