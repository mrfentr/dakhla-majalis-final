/**
 * AI Room Visualizer - LLM Calculator
 *
 * Uses Claude (or Gemini) to:
 * 1. Calculate optimal Glssa/Wssada piece arrangements
 * 2. Generate a detailed prompt for image generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildPromptForLayout } from './prompt-templates';
import {
  CalculationResult,
  LayoutType,
  WallPieces,
  GLSSA_MIN,
  GLSSA_MAX,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
  PRICING,
} from './types';

// ============================================
// CONFIGURATION
// ============================================

// Use Claude Opus 4.5 for best reasoning on complex geometry
const MODEL = 'claude-opus-4-5-20251101';
const MAX_RETRIES = 3; // Allow more retries for edge cases

// ============================================
// ANTHROPIC CLIENT
// ============================================

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }
  return new Anthropic({ apiKey });
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseJsonResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();

  // Try code block first
  const codeBlock = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1]);
    } catch {
      // Continue to next method
    }
  }

  // Try finding JSON object
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue
    }
  }

  // Try whole text
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// ============================================
// WALLS FORMAT NORMALIZATION
// ============================================

/**
 * Converts walls from object format to array format if needed.
 * Claude sometimes returns: {"walls": {"L": {...}, "C": {...}, "R": {...}}}
 * We need: {"walls": [{"wallId": "L", ...}, {"wallId": "C", ...}, {"wallId": "R", ...}]}
 */
function normalizeWallsFormat(result: Record<string, unknown>): Record<string, unknown> {
  const walls = result.walls;

  // If walls is already an array, nothing to do
  if (Array.isArray(walls)) {
    return result;
  }

  // If walls is an object (not array), convert it
  if (walls && typeof walls === 'object') {
    const wallsObj = walls as Record<string, Record<string, unknown>>;
    const wallKeys = Object.keys(wallsObj);

    // Check if it looks like a walls object (keys like "L", "C", "R", "H", "V", "T", "BL", "BR", etc.)
    const looksLikeWallsObject = wallKeys.some(key =>
      ['L', 'C', 'R', 'H', 'V', 'T', 'B', 'BL', 'BR', 'N', 'E', 'S', 'W', 'A', 'Top', 'Bottom', 'Left', 'Center', 'Right', 'Horizontal', 'Vertical', 'main', 'wall', 'Wall', 'single', 'Single'].includes(key)
    );

    if (looksLikeWallsObject) {
      console.log('[normalizeWallsFormat] Converting walls object to array. Keys:', wallKeys);

      const wallsArray = wallKeys.map(key => {
        const wallData = wallsObj[key];
        return {
          ...wallData,
          wallId: wallData.wallId || wallData.label || key,
          label: wallData.label || key,
        };
      });

      return {
        ...result,
        walls: wallsArray,
      };
    }
  }

  return result;
}

// ============================================
// VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateGlssaPiece(size: number, wallId: string, index: number): string | null {
  if (typeof size !== 'number' || isNaN(size)) {
    return `${wallId} Glssa[${index}] is not a valid number: ${size}`;
  }
  if (size < GLSSA_MIN) {
    return `${wallId} Glssa[${index}] too small: ${size}cm (min ${GLSSA_MIN})`;
  }
  if (size > GLSSA_MAX) {
    return `${wallId} Glssa[${index}] too large: ${size}cm (max ${GLSSA_MAX})`;
  }
  return null;
}

function validateWssadaPiece(size: number, wallId: string, index: number): string | null {
  if (typeof size !== 'number' || isNaN(size)) {
    return `${wallId} Wssada[${index}] is not a valid number: ${size}`;
  }

  const isRegular = size >= WSSADA_REGULAR_MIN && size <= WSSADA_REGULAR_MAX;
  const isCorner = size >= WSSADA_CORNER_MIN && size <= WSSADA_CORNER_MAX;

  if (!isRegular && !isCorner) {
    return `${wallId} Wssada[${index}] invalid: ${size}cm (need ${WSSADA_REGULAR_MIN}-${WSSADA_REGULAR_MAX} or ${WSSADA_CORNER_MIN}-${WSSADA_CORNER_MAX})`;
  }
  return null;
}

// Helper to extract pieces from various field names (used in validation)
function extractPiecesForValidation(wall: Record<string, unknown>, ...fieldNames: string[]): number[] {
  for (const name of fieldNames) {
    const val = wall[name];
    if (Array.isArray(val) && val.length > 0) {
      if (typeof val[0] === 'number') {
        return val as number[];
      }
      // Handle object format: [{size: 190}] -> [190]
      if (typeof val[0] === 'object' && val[0] !== null) {
        const sizes = val.map((item: Record<string, unknown>) => {
          return (item.size as number) || (item.length as number) || 0;
        }).filter((n: number) => n > 0);
        if (sizes.length > 0) return sizes;
      }
    }
  }
  return [];
}

function validateCalculationResult(result: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Check walls array exists
  const walls = result.walls as Array<Record<string, unknown>>;
  if (!walls || !Array.isArray(walls) || walls.length === 0) {
    errors.push('Missing or empty walls array');
    return { isValid: false, errors };
  }

  // Validate each wall
  for (const wall of walls) {
    const wallId = (wall.wallId as string) || (wall.label as string) || 'unknown';

    // Use flexible field name extraction (same list as fixWallPieces)
    const glssaPieces = extractPiecesForValidation(wall, 'glssaPieces', 'glssa_pieces', 'glssa', 'glpieces', 'gPieces', 'gpieces', 'basePieces', 'base_pieces', 'base', 'pieces');
    const wssadaPieces = extractPiecesForValidation(wall, 'wssadaPieces', 'wssada_pieces', 'wssada', 'wsPieces', 'wspieces', 'wpieces', 'wPieces', 'backPieces', 'back_pieces', 'back', 'cushions', 'backCushions', 'cushionPieces');
    const effectiveLength = (wall.effectiveLength as number) || (wall.effective as number) || (wall.effLength as number) || (wall.eff as number) || 0;

    // Check arrays are not empty
    if (glssaPieces.length === 0) {
      errors.push(`${wallId}: glssaPieces array is empty`);
    }
    if (wssadaPieces.length === 0) {
      errors.push(`${wallId}: wssadaPieces array is empty`);
    }

    // Validate each Glssa piece
    glssaPieces.forEach((size, idx) => {
      const error = validateGlssaPiece(size, wallId, idx);
      if (error) errors.push(error);
    });

    // Validate each Wssada piece
    wssadaPieces.forEach((size, idx) => {
      const error = validateWssadaPiece(size, wallId, idx);
      if (error) errors.push(error);
    });

    // Validate Glssa sum matches effective length (with small tolerance)
    const glssaSum = glssaPieces.reduce((a, b) => a + (b || 0), 0);
    if (effectiveLength > 0 && Math.abs(glssaSum - effectiveLength) > 5) {
      errors.push(`${wallId}: Glssa sum (${glssaSum}cm) doesn't match effective length (${effectiveLength}cm)`);
    }

    // Validate Wssada doesn't overhang Glssa
    const wssadaSum = wssadaPieces.reduce((a, b) => a + (b || 0), 0);
    if (wssadaSum > glssaSum) {
      errors.push(`${wallId}: Wssada (${wssadaSum}cm) overhangs Glssa (${glssaSum}cm) by ${wssadaSum - glssaSum}cm`);
    }

    // Count corner pieces (58-60cm) - should be at most 1 per wall
    const cornerPieces = wssadaPieces.filter(size => size >= WSSADA_CORNER_MIN && size <= WSSADA_CORNER_MAX);
    if (cornerPieces.length > 1) {
      errors.push(`${wallId}: Has ${cornerPieces.length} corner pieces (should be at most 1)`);
    }
  }

  // Check imagePrompt exists
  if (!result.imagePrompt || typeof result.imagePrompt !== 'string' || result.imagePrompt.length < 50) {
    errors.push('Missing or too short imagePrompt');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// RETRY PROMPT
// ============================================

function buildRetryPrompt(errors: string[], previousResponse: string): string {
  return `VALIDATION FAILED! Fix these errors:
${errors.map((e) => `- ${e}`).join('\n')}

## REMINDER - VALID SIZES:
- Glssa: ONLY ${GLSSA_MIN}-${GLSSA_MAX}cm
- Wssada Regular: ONLY ${WSSADA_REGULAR_MIN}, ${WSSADA_REGULAR_MIN + 1}, ..., ${WSSADA_REGULAR_MAX}cm
- Wssada Corner: ONLY ${WSSADA_CORNER_MIN}, ${WSSADA_CORNER_MIN + 1}, ${WSSADA_CORNER_MAX}cm
- Each wall's Wssada sum MUST be ≤ that wall's Glssa sum

Previous response (truncated): ${previousResponse.substring(0, 300)}...

Return corrected JSON with valid pieces and a detailed imagePrompt.`;
}

// ============================================
// MAIN CALCULATOR FUNCTION
// ============================================

export interface CalculatorOptions {
  model?: string;
  maxRetries?: number;
}

export async function calculateLayout(
  layoutType: LayoutType,
  dimensions: Record<string, number>,
  options: CalculatorOptions = {}
): Promise<CalculationResult> {
  const startTime = Date.now();
  const model = options.model || MODEL;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  console.log(`[LLM-Calculator] Starting calculation for ${layoutType}`, dimensions);

  // Get Anthropic client
  const client = getAnthropicClient();

  // Build prompts
  const { systemPrompt, userPrompt } = buildPromptForLayout(layoutType, dimensions);

  let lastResponse = '';
  let lastErrors: string[] = [];
  let result: Record<string, unknown> | null = null;

  // Try with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt = attempt > 0 ? buildRetryPrompt(lastErrors, lastResponse) : userPrompt;

    console.log(`[LLM-Calculator] Attempt ${attempt + 1}/${maxRetries + 1}`);

    try {
      const message = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        lastErrors = ['Empty response from LLM'];
        continue;
      }

      lastResponse = textBlock.text;
      console.log('[LLM-Calculator] Raw response (first 1000 chars):', lastResponse.substring(0, 1000));

      result = parseJsonResponse(lastResponse);

      if (!result) {
        lastErrors = ['Failed to parse JSON from response'];
        console.error('[LLM-Calculator] Failed to parse JSON');
        continue;
      }

      // Normalize walls format (convert object to array if needed)
      result = normalizeWallsFormat(result);
      console.log('[LLM-Calculator] Walls count:', Array.isArray(result.walls) ? (result.walls as unknown[]).length : 0);

      // Validate
      const validation = validateCalculationResult(result);
      if (!validation.isValid) {
        console.warn(`[LLM-Calculator] Validation errors:`, validation.errors);
        lastErrors = validation.errors;

        if (attempt === maxRetries) {
          console.warn('[LLM-Calculator] Max retries reached, using best result');
          break;
        }
        continue;
      }

      console.log('[LLM-Calculator] Validation passed!');
      break;
    } catch (error) {
      console.error(`[LLM-Calculator] API error:`, error);
      lastErrors = [`API error: ${(error as Error).message}`];

      if (attempt === maxRetries) {
        throw new Error(`LLM calculation failed after ${maxRetries + 1} attempts: ${lastErrors.join(', ')}`);
      }
    }
  }

  if (!result) {
    throw new Error('Failed to get valid calculation result');
  }

  // Transform result to our format
  const calculationResult = transformResult(result, layoutType);
  calculationResult.reasoning = (result.reasoning as string) || '';
  calculationResult.imagePrompt = (result.imagePrompt as string) || '';

  const endTime = Date.now();
  console.log(`[LLM-Calculator] Completed in ${endTime - startTime}ms`);

  return calculationResult;
}

// ============================================
// POST-PROCESSING: Fix Invalid Pieces
// ============================================

function fixGlssaPiece(size: number): number {
  if (size >= GLSSA_MIN && size <= GLSSA_MAX) return size;
  if (size < GLSSA_MIN) return GLSSA_MIN;
  if (size > GLSSA_MAX) return GLSSA_MAX;
  return size;
}

function fixWssadaPiece(size: number): number {
  // Check if already valid
  const isRegular = size >= WSSADA_REGULAR_MIN && size <= WSSADA_REGULAR_MAX;
  const isCorner = size >= WSSADA_CORNER_MIN && size <= WSSADA_CORNER_MAX;
  if (isRegular || isCorner) return size;

  // Fix to nearest valid size
  if (size < WSSADA_CORNER_MIN) {
    // Too small - use minimum corner
    return WSSADA_CORNER_MIN;
  } else if (size > WSSADA_CORNER_MAX && size < WSSADA_REGULAR_MIN) {
    // In the gap between corner and regular - decide which is closer
    const distToCorner = size - WSSADA_CORNER_MAX;
    const distToRegular = WSSADA_REGULAR_MIN - size;
    return distToCorner <= distToRegular ? WSSADA_CORNER_MAX : WSSADA_REGULAR_MIN;
  } else if (size > WSSADA_REGULAR_MAX) {
    // Too large - use maximum regular
    return WSSADA_REGULAR_MAX;
  }

  // Fallback
  return WSSADA_REGULAR_MIN;
}

// Helper to get array from multiple possible field names
// Also handles object arrays like [{size: 190, position: 0}] -> [190]
function getArrayField(obj: Record<string, unknown>, ...fieldNames: string[]): number[] {
  for (const name of fieldNames) {
    const val = obj[name];
    if (Array.isArray(val) && val.length > 0) {
      // Check if it's an array of numbers or array of objects
      if (typeof val[0] === 'number') {
        return val as number[];
      }
      // Handle object format: [{size: 190, position: 0}] -> [190]
      if (typeof val[0] === 'object' && val[0] !== null) {
        const sizes = val.map((item: Record<string, unknown>) => {
          return (item.size as number) || (item.length as number) || (item.value as number) || 0;
        }).filter((n: number) => n > 0);
        if (sizes.length > 0) return sizes;
      }
    }
  }
  return [];
}

function fixWallPieces(wall: Record<string, unknown>): Record<string, unknown> {
  const wallId = (wall.wallId as string) || (wall.label as string) || (wall.id as string) || 'unknown';

  // Try multiple possible field names Claude might use
  const rawGlssa = getArrayField(wall, 'glssaPieces', 'glssa_pieces', 'glssa', 'glpieces', 'gPieces', 'gpieces', 'basePieces', 'base_pieces', 'base', 'pieces');
  const rawWssada = getArrayField(wall, 'wssadaPieces', 'wssada_pieces', 'wssada', 'wsPieces', 'wspieces', 'wpieces', 'wPieces', 'backPieces', 'back_pieces', 'back', 'cushions', 'backCushions', 'cushionPieces');

  // Get effectiveLength from multiple possible field names
  const effectiveLength = (wall.effectiveLength as number) || (wall.effective as number) ||
    (wall.effLength as number) || (wall.eff as number) || (wall.length as number) || 0;

  const glssaPieces = rawGlssa.map(fixGlssaPiece);
  const wssadaPieces = rawWssada.map(fixWssadaPiece);

  // Ensure wssada doesn't overhang glssa
  const glssaTotal = glssaPieces.reduce((a, b) => a + b, 0);
  let wssadaTotal = wssadaPieces.reduce((a, b) => a + b, 0);

  // If wssada overhangs, remove pieces from the end until it fits
  while (wssadaTotal > glssaTotal && wssadaPieces.length > 1) {
    wssadaPieces.pop();
    wssadaTotal = wssadaPieces.reduce((a, b) => a + b, 0);
  }

  return {
    ...wall,
    wallId,
    effectiveLength,
    glssaPieces,
    wssadaPieces,
    glssaTotal,
    wssadaTotal,
  };
}

// ============================================
// RESULT TRANSFORMER
// ============================================

function transformResult(
  raw: Record<string, unknown>,
  layoutType: LayoutType
): CalculationResult {
  const walls = (raw.walls as Array<Record<string, unknown>>) || [];

  // Fix any invalid pieces
  const fixedWalls = walls.map(fixWallPieces);

  const transformedWalls: WallPieces[] = fixedWalls.map((wall) => {
    const glssaPieces = (wall.glssaPieces as number[]) || [];
    const wssadaPieces = (wall.wssadaPieces as number[]) || [];
    const glssaTotal = glssaPieces.reduce((a, b) => a + b, 0);
    const wssadaTotal = wssadaPieces.reduce((a, b) => a + b, 0);
    const effectiveLength = (wall.effectiveLength as number) || (wall.effective as number) ||
      (wall.effLength as number) || (wall.eff as number) || glssaTotal || 0;

    return {
      wallId: (wall.wallId as string) || (wall.label as string) || 'unknown',
      effectiveLength,
      glssaPieces,
      wssadaPieces,
      glssaTotal,
      wssadaTotal,
      glssaVoid: (wall.glssaVoid as number) || 0,
      wssadaVoid: (wall.wssadaVoid as number) || Math.max(0, glssaTotal - wssadaTotal),
    };
  });

  const totalGlssaPieces = transformedWalls.reduce((sum, w) => sum + w.glssaPieces.length, 0);
  const totalWssadaPieces = transformedWalls.reduce((sum, w) => sum + w.wssadaPieces.length, 0);
  const totalGlssa = transformedWalls.reduce((sum, w) => sum + w.glssaTotal, 0);
  const totalWssada = transformedWalls.reduce((sum, w) => sum + w.wssadaTotal, 0);

  // Calculate price
  const totalPieces = totalGlssaPieces + totalWssadaPieces;
  const estimatedPrice =
    PRICING.basePriceDH + Math.max(0, totalPieces - 1) * PRICING.pricePerExtraPieceDH;

  return {
    layoutType,
    walls: transformedWalls,
    totalGlssa,
    totalWssada,
    totalGlssaPieces,
    totalWssadaPieces,
    estimatedPrice,
    cornerOwnership: raw.cornerOwnership as Record<string, string>,
    reasoning: '',
    imagePrompt: '',
  };
}
