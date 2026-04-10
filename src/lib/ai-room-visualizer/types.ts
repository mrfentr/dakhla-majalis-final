/**
 * AI Room Visualizer - Type Definitions
 *
 * This module defines all TypeScript interfaces for the AI-powered
 * room visualization system.
 */

// ============================================
// ROOM INPUT TYPES
// ============================================

export type LayoutType = 'single-wall' | 'l-shape' | 'u-shape' | 'four-walls';

export interface SingleWallDimensions {
  wallLength: number; // cm
}

export interface LShapeDimensions {
  horizontalLength: number; // cm
  verticalLength: number;   // cm
}

export interface UShapeDimensions {
  leftLength: number;   // cm
  centerLength: number; // cm
  rightLength: number;  // cm
}

export interface FourWallsDimensions {
  topLength: number;        // cm
  leftLength: number;       // cm
  rightLength: number;      // cm
  bottomLength: number;     // cm
  leftToDoor: number;       // cm - distance from left corner to door
  doorToRight: number;      // cm - distance from door to right corner
}

export type RoomDimensions =
  | SingleWallDimensions
  | LShapeDimensions
  | UShapeDimensions
  | FourWallsDimensions;

export interface RoomInput {
  layoutType: LayoutType;
  dimensions: RoomDimensions;
}

// ============================================
// PIECE DEFINITIONS
// ============================================

export interface GlssaPiece {
  size: number;      // 110-190 cm
  position: number;  // starting position in cm from wall start
  wall: string;      // which wall (H, V, L, R, T, B, etc.)
}

export interface WssadaPiece {
  size: number;      // 80-90 (regular) or 58-60 (corner) cm
  position: number;  // starting position in cm
  wall: string;      // which wall
  isCorner: boolean; // true if 58-60cm corner piece
}

export interface WallPieces {
  wallId: string;
  effectiveLength: number;
  glssaPieces: number[];
  wssadaPieces: number[];
  glssaTotal: number;
  wssadaTotal: number;
  glssaVoid: number;
  wssadaVoid: number;
}

// ============================================
// CALCULATION RESULT
// ============================================

export interface CalculationResult {
  layoutType: LayoutType;
  walls: WallPieces[];
  totalGlssa: number;
  totalWssada: number;
  totalGlssaPieces: number;
  totalWssadaPieces: number;
  estimatedPrice: number;
  cornerOwnership?: Record<string, string>; // e.g., { topLeft: 'T', topRight: 'R' }
  reasoning: string;
  imagePrompt: string; // The detailed prompt for image generation
}

// ============================================
// IMAGE GENERATION
// ============================================

export type ImageProvider = 'replicate' | 'reve' | 'qwen' | 'ideogram' | 'dalle' | 'svg';

export interface ImageGenerationConfig {
  provider: ImageProvider;
  model?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd';
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  generationTimeMs: number;
  provider: ImageProvider;
  model: string;
  error?: string;
}

// ============================================
// FINAL VISUALIZATION RESULT
// ============================================

export interface VisualizationResult {
  success: boolean;

  // Calculation data
  calculation: CalculationResult;

  // Generated image
  image: ImageGenerationResult;

  // Timing
  totalTimeMs: number;
  calculationTimeMs: number;
  imageGenerationTimeMs: number;

  // Error handling
  error?: string;
  errorCode?: string;
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

export interface VisualizeRoomRequest {
  layoutType: LayoutType;
  dimensions: Record<string, number>;
  imageConfig?: Partial<ImageGenerationConfig>;
}

export interface VisualizeRoomResponse {
  success: boolean;
  data?: VisualizationResult;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const GLSSA_MIN = 110;
export const GLSSA_MAX = 190;
export const GLSSA_DEPTH = 70; // cm

export const WSSADA_REGULAR_MIN = 80;
export const WSSADA_REGULAR_MAX = 90;
export const WSSADA_CORNER_MIN = 58;
export const WSSADA_CORNER_MAX = 60;
export const WSSADA_DEPTH = 10; // cm

export const COLORS = {
  glssa: {
    fill: '#FCD34D',      // Golden yellow
    stroke: '#B45309',    // Amber border
  },
  wssada: {
    fill: '#4ADE80',      // Sage green
    stroke: '#166534',    // Dark green border
  },
  wssadaCorner: {
    fill: '#F472B6',      // Pink
    stroke: '#9D174D',    // Dark pink border
  },
  floor: '#F5F5DC',       // Beige
  wall: '#D4C4A8',        // Tan
  dimension: '#6B7280',   // Gray
};

// Price calculation: base + (pieces - 1) * increment
export const PRICING = {
  basePriceDH: 4600,
  pricePerExtraPieceDH: 2000,
};
