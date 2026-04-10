/**
 * SVG Generator for Majalis Floor Plans
 *
 * Renders accurate 2D floor plan diagrams from geometry + distribution data.
 *
 * REAL WORLD POSITIONING:
 * - Glssa (base cushion): 70cm deep, extends INTO the room from wall
 * - Wssada (back cushion): 10cm deep, sits ON TOP of Glssa, AGAINST the wall
 *
 * Wall orientation determines Wssada position:
 * - Top wall: Wssada at TOP edge (against top wall)
 * - Bottom wall: Wssada at BOTTOM edge (against bottom wall)
 * - Left wall: Wssada at LEFT edge (against left wall)
 * - Right wall: Wssada at RIGHT edge (against right wall)
 */

import { LayoutType } from './types';
import {
  GeometryScenario,
  WallGeometry,
  LayoutGeometry,
  GLSSA_DEPTH,
  WSSADA_DEPTH,
} from './geometry-calculator';
import {
  DistributionResult,
  WallPieceDistribution,
  PiecePosition,
} from './piece-distributor';

// ============================================
// CONSTANTS
// ============================================

const SCALE = 0.6; // Pixels per cm
const PADDING = 120; // Padding around drawing
const LABEL_FONT_SIZE = 10;

// Colors - Light, modern palette
const COLORS = {
  background: '#FDFBF7', // Warm cream
  wall: '#5D4037', // Dark brown for wall lines
  wallFill: '#F5F5F5', // Light gray for room floor
  glssa: {
    fill: '#F5E6D3', // Light warm beige
    stroke: '#D4A574',
    text: '#8B6914', // Golden brown for Glssa text
  },
  wssada: {
    fill: '#E8F5E9', // Very light green
    stroke: '#81C784',
    text: '#2E7D32', // Green text for Wssada
  },
  wssadaCorner: {
    fill: '#FFF3E0', // Light orange/peach
    stroke: '#FFB74D',
    text: '#E65100', // Orange text for corner pieces
  },
  coudoir: {
    fill: '#D7CCC8', // Light wood brown
    stroke: '#8D6E63', // Medium wood brown
    text: '#5D4037', // Dark brown
  },
  void: {
    fill: '#FFCDD2', // Stronger light red
    stroke: '#E53935', // Bold red stroke
    pattern: '#E53935', // Bold red diagonal lines
  },
  carpet: {
    fill: '#E8D5B7',
    stroke: '#A0845C',
    text: '#6B4E2E',
    pattern: '#D4C4A8',
  },
  pouf: {
    fill: '#D4B896',     // Warm tan/leather color
    stroke: '#8B6914',   // Golden brown border
    text: '#5D4037',     // Dark brown text
  },
  dimension: '#9E9E9E',
  roomFloor: '#FFFFFF',
};

// ============================================
// TYPES
// ============================================

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderablePiece {
  rect: Rect;
  label: string;
  type: 'glssa' | 'wssada' | 'wssada-corner' | 'glssa-void' | 'wssada-void';
  wallId?: string;
  pieceIndex?: number;
  pieceCategory?: 'glssa' | 'wssada';
}

interface WallRender {
  wallId: string;
  pieces: RenderablePiece[];
  wallLine?: { start: Point; end: Point };
}

// ============================================
// COORDINATE SYSTEM
// ============================================

/**
 * Calculate the bounding box and wall positions for a layout
 */
function calculateLayoutBounds(
  layoutType: LayoutType,
  geometry: GeometryScenario
): {
  width: number;
  height: number;
  wallPositions: Map<string, { origin: Point; wssadaOrigin: Point; direction: 'horizontal' | 'vertical' }>;
} {
  const wallPositions = new Map<
    string,
    { origin: Point; wssadaOrigin: Point; direction: 'horizontal' | 'vertical' }
  >();

  // The offset between Glssa corner and Wssada corner (Wssada starts closer to actual corner)
  const WSSADA_CORNER_OFFSET = GLSSA_DEPTH - WSSADA_DEPTH; // 70 - 10 = 60cm

  switch (layoutType) {
    case 'single-wall': {
      const wall = geometry.walls[0];
      const width = wall.wssadaEffective; // Use Wssada effective for full width
      const height = GLSSA_DEPTH;

      wallPositions.set('main', {
        origin: { x: 0, y: 0 },
        wssadaOrigin: { x: 0, y: 0 }, // Same for single wall (no corners)
        direction: 'horizontal',
      });

      return { width, height, wallPositions };
    }

    case 'l-shape': {
      const hWall = geometry.walls.find((w) => w.wallId === 'H');
      const vWall = geometry.walls.find((w) => w.wallId === 'V');

      if (!hWall || !vWall) throw new Error('Missing walls for L-shape');

      // L-shape: V wall goes down on left, H wall goes right at top
      // Corner is at top-left

      const hOwnsCorner = hWall.glssaOwnsCorners.length > 0;

      let width: number;
      let height: number;

      if (hOwnsCorner) {
        // H owns corner: H starts at (0,0), V starts at (0, GLSSA_DEPTH)
        // V's Wssada starts closer to corner (at WSSADA_DEPTH instead of GLSSA_DEPTH)
        width = hWall.wssadaEffective; // Full width for Wssada
        height = vWall.wssadaEffective + WSSADA_DEPTH; // Wssada-based height

        wallPositions.set('H', {
          origin: { x: 0, y: 0 },
          wssadaOrigin: { x: 0, y: 0 }, // H owns corner, starts at 0
          direction: 'horizontal',
        });
        wallPositions.set('V', {
          origin: { x: 0, y: GLSSA_DEPTH },
          wssadaOrigin: { x: 0, y: WSSADA_DEPTH }, // V starts at Wssada depth from corner
          direction: 'vertical',
        });
      } else {
        // V owns corner: V starts at (0,0), H starts at (GLSSA_DEPTH, 0)
        // H's Wssada starts closer to corner (at WSSADA_DEPTH instead of GLSSA_DEPTH)
        width = hWall.wssadaEffective + WSSADA_DEPTH; // Wssada-based width
        height = vWall.wssadaEffective; // Full height for Wssada

        wallPositions.set('V', {
          origin: { x: 0, y: 0 },
          wssadaOrigin: { x: 0, y: 0 }, // V owns corner, starts at 0
          direction: 'vertical',
        });
        wallPositions.set('H', {
          origin: { x: GLSSA_DEPTH, y: 0 },
          wssadaOrigin: { x: WSSADA_DEPTH, y: 0 }, // H's Wssada starts at corner junction
          direction: 'horizontal',
        });
      }

      return { width, height, wallPositions };
    }

    case 'u-shape': {
      const lWall = geometry.walls.find((w) => w.wallId === 'L');
      const cWall = geometry.walls.find((w) => w.wallId === 'C');
      const rWall = geometry.walls.find((w) => w.wallId === 'R');

      if (!lWall || !cWall || !rWall) throw new Error('Missing walls for U-shape');

      // U-shape: L on left, C on top, R on right
      // Standard: L owns left corner, R owns right corner
      // So C is inset by GLSSA_DEPTH on both sides

      const lOwnsLeft = lWall.glssaOwnsCorners.some((c) => c.includes('L'));
      const rOwnsRight = rWall.glssaOwnsCorners.some((c) => c.includes('R'));

      // Room dimensions = physical wall lengths
      const width = cWall.inputLength;
      const height = Math.max(lWall.inputLength, rWall.inputLength);

      // L wall position: Y offset when C owns the left corner
      const lGlssaY = lOwnsLeft ? 0 : GLSSA_DEPTH;
      const lWssadaY = lOwnsLeft ? 0 : WSSADA_DEPTH;
      wallPositions.set('L', {
        origin: { x: 0, y: lGlssaY },
        wssadaOrigin: { x: 0, y: lWssadaY },
        direction: 'vertical',
      });

      // C wall position - Wssada starts at corner junction
      const cGlssaX = lOwnsLeft ? GLSSA_DEPTH : 0;
      const cWssadaX = lOwnsLeft ? WSSADA_DEPTH : 0;
      wallPositions.set('C', {
        origin: { x: cGlssaX, y: 0 },
        wssadaOrigin: { x: cWssadaX, y: 0 },
        direction: 'horizontal',
      });

      // R wall position: ALWAYS against the right wall edge
      // Y offset when C owns the right corner
      const rGlssaX = cWall.inputLength - GLSSA_DEPTH;
      const rGlssaY = rOwnsRight ? 0 : GLSSA_DEPTH;
      const rWssadaY = rOwnsRight ? 0 : WSSADA_DEPTH;
      wallPositions.set('R', {
        origin: { x: rGlssaX, y: rGlssaY },
        wssadaOrigin: { x: rGlssaX, y: rWssadaY },
        direction: 'vertical',
      });

      return { width, height, wallPositions };
    }

    case 'four-walls': {
      const tWall = geometry.walls.find((w) => w.wallId === 'T');
      const lWall = geometry.walls.find((w) => w.wallId === 'L');
      const rWall = geometry.walls.find((w) => w.wallId === 'R');
      const blWall = geometry.walls.find((w) => w.wallId === 'BL');
      const brWall = geometry.walls.find((w) => w.wallId === 'BR');

      if (!tWall || !lWall || !rWall) throw new Error('Missing walls for 4-walls');

      // Check actual corner ownership for EACH wall independently
      // This handles ALL corner ownership permutations correctly
      const lOwnsTL = lWall.glssaOwnsCorners.includes('TL');
      const rOwnsTR = rWall.glssaOwnsCorners.includes('TR');
      const blOwnsBL = blWall?.glssaOwnsCorners.includes('BL') || false;
      const brOwnsBR = brWall?.glssaOwnsCorners.includes('BR') || false;

      // Calculate actual door gap from input dimensions
      const totalTopWidth = tWall.inputLength;
      const blInputLength = blWall?.inputLength || 0;
      const brInputLength = brWall?.inputLength || 0;
      const doorGap = Math.max(totalTopWidth - blInputLength - brInputLength, 80);

      // T wall position: horizontal at top
      const tGlssaX = lOwnsTL ? GLSSA_DEPTH : 0;
      const tWssadaX = lOwnsTL ? WSSADA_DEPTH : 0;
      wallPositions.set('T', {
        origin: { x: tGlssaX, y: 0 },
        wssadaOrigin: { x: tWssadaX, y: 0 },
        direction: 'horizontal',
      });

      // L wall position: vertical at left
      const lGlssaY = lOwnsTL ? 0 : GLSSA_DEPTH;
      const lWssadaY = lOwnsTL ? 0 : WSSADA_DEPTH;
      wallPositions.set('L', {
        origin: { x: 0, y: lGlssaY },
        wssadaOrigin: { x: 0, y: lWssadaY },
        direction: 'vertical',
      });

      // R wall position: vertical at right (always against the right wall edge)
      const rGlssaX = tWall.inputLength - GLSSA_DEPTH;
      const rGlssaY = rOwnsTR ? 0 : GLSSA_DEPTH;
      const rWssadaY = rOwnsTR ? 0 : WSSADA_DEPTH;
      wallPositions.set('R', {
        origin: { x: rGlssaX, y: rGlssaY },
        wssadaOrigin: { x: rGlssaX, y: rWssadaY },
        direction: 'vertical',
      });

      // Room dimensions for drawing
      const height = Math.max(lWall.inputLength, rWall.inputLength);
      // Width = left Wssada area + T Wssada effective + right Wssada area
      const leftWssadaWidth = lOwnsTL ? WSSADA_DEPTH : 0;
      const rightWssadaWidth = rOwnsTR ? WSSADA_DEPTH : 0;
      const width = leftWssadaWidth + tWall.wssadaEffective + rightWssadaWidth;

      // BL wall position: horizontal at bottom-left
      if (blWall) {
        const blGlssaX = blOwnsBL ? 0 : GLSSA_DEPTH;
        const blWssadaX = blOwnsBL ? 0 : WSSADA_DEPTH;
        const blY = lWall.inputLength - GLSSA_DEPTH;
        wallPositions.set('BL', {
          origin: { x: blGlssaX, y: blY },
          wssadaOrigin: { x: blWssadaX, y: blY },
          direction: 'horizontal',
        });
      }

      // BR wall position: horizontal at bottom-right
      if (brWall) {
        // Guard: only apply BL corner offset when BL wall actually exists
        const blGlssaX = blWall ? (blOwnsBL ? 0 : GLSSA_DEPTH) : 0;
        const blWssadaX = blWall ? (blOwnsBL ? 0 : WSSADA_DEPTH) : 0;
        const blWidth = blWall?.glssaEffective || 0;
        const blWssadaWidth = blWall?.wssadaEffective || 0;
        const brY = rWall.inputLength - GLSSA_DEPTH;
        wallPositions.set('BR', {
          origin: {
            x: blGlssaX + blWidth + doorGap,
            y: brY,
          },
          wssadaOrigin: {
            x: blWssadaX + blWssadaWidth + doorGap,
            y: brY,
          },
          direction: 'horizontal',
        });
      }

      return { width, height, wallPositions };
    }

    default:
      throw new Error(`Unknown layout type: ${layoutType}`);
  }
}

// ============================================
// PIECE RENDERING
// ============================================

/**
 * Convert a wall's pieces to renderable rectangles
 *
 * CRITICAL:
 * - Glssa uses `origin` (starts where the 70cm deep base begins)
 * - Wssada uses `wssadaOrigin` (starts at the corner junction, accounting for 10cm depth)
 * - Wssada position on the cushion depends on wall orientation (top/bottom/left/right)
 * - Void areas are shown in red when pieces don't cover the full effective length
 */
function renderWallPieces(
  wallDist: WallPieceDistribution,
  origin: Point,
  wssadaOrigin: Point,
  direction: 'horizontal' | 'vertical',
  wallId: string
): RenderablePiece[] {
  const pieces: RenderablePiece[] = [];
  const wssadaSide = wallDist.wssadaSide;

  if (direction === 'horizontal') {
    // Horizontal wall: Glssa is width × GLSSA_DEPTH
    // Wssada strip is on top or bottom edge

    // Render Glssa pieces
    let hGlssaIdx = 0;
    for (const piece of wallDist.glssaPieces) {
      pieces.push({
        rect: {
          x: origin.x + piece.startPosition,
          y: origin.y,
          width: piece.size,
          height: GLSSA_DEPTH,
        },
        label: `${piece.size}`,
        type: 'glssa',
        wallId, pieceIndex: hGlssaIdx++, pieceCategory: 'glssa',
      });
    }

    // Render Glssa void if any
    if (wallDist.glssaVoid > 0) {
      const lastGlssaPiece = wallDist.glssaPieces[wallDist.glssaPieces.length - 1];
      const voidStart = lastGlssaPiece ? lastGlssaPiece.endPosition : 0;
      pieces.push({
        rect: {
          x: origin.x + voidStart,
          y: origin.y,
          width: wallDist.glssaVoid,
          height: GLSSA_DEPTH,
        },
        label: `${wallDist.glssaVoid}`,
        type: 'glssa-void',
      });
    }

    // Render Wssada pieces - starts from wssadaOrigin (corner junction)
    // Y position depends on which wall this is
    const wssadaY =
      wssadaSide === 'top'
        ? wssadaOrigin.y // Against top wall
        : wssadaOrigin.y + GLSSA_DEPTH - WSSADA_DEPTH; // Against bottom wall

    let hWssadaIdx = 0;
    for (const piece of wallDist.wssadaPieces) {
      pieces.push({
        rect: {
          x: wssadaOrigin.x + piece.startPosition, // Use wssadaOrigin for X
          y: wssadaY,
          width: piece.size,
          height: WSSADA_DEPTH,
        },
        label: `${piece.size}`,
        type: piece.isCornerPiece ? 'wssada-corner' : 'wssada',
        wallId, pieceIndex: hWssadaIdx++, pieceCategory: 'wssada',
      });
    }

    // Render Wssada void if any
    if (wallDist.wssadaVoid > 0) {
      const lastWssadaPiece = wallDist.wssadaPieces[wallDist.wssadaPieces.length - 1];
      const voidStart = lastWssadaPiece ? lastWssadaPiece.endPosition : 0;
      pieces.push({
        rect: {
          x: wssadaOrigin.x + voidStart,
          y: wssadaY,
          width: wallDist.wssadaVoid,
          height: WSSADA_DEPTH,
        },
        label: `${wallDist.wssadaVoid}`,
        type: 'wssada-void',
      });
    }
  } else {
    // Vertical wall: Glssa is GLSSA_DEPTH × height
    // Wssada strip is on left or right edge

    // Render Glssa pieces (vertical)
    let vGlssaIdx = 0;
    for (const piece of wallDist.glssaPieces) {
      pieces.push({
        rect: {
          x: origin.x,
          y: origin.y + piece.startPosition,
          width: GLSSA_DEPTH,
          height: piece.size,
        },
        label: `${piece.size}`,
        type: 'glssa',
        wallId, pieceIndex: vGlssaIdx++, pieceCategory: 'glssa',
      });
    }

    // Render Glssa void if any
    if (wallDist.glssaVoid > 0) {
      const lastGlssaPiece = wallDist.glssaPieces[wallDist.glssaPieces.length - 1];
      const voidStart = lastGlssaPiece ? lastGlssaPiece.endPosition : 0;
      pieces.push({
        rect: {
          x: origin.x,
          y: origin.y + voidStart,
          width: GLSSA_DEPTH,
          height: wallDist.glssaVoid,
        },
        label: `${wallDist.glssaVoid}`,
        type: 'glssa-void',
      });
    }

    // Render Wssada pieces - starts from wssadaOrigin (corner junction)
    // X position depends on which wall this is
    const wssadaX =
      wssadaSide === 'left'
        ? wssadaOrigin.x // Against left wall
        : wssadaOrigin.x + GLSSA_DEPTH - WSSADA_DEPTH; // Against right wall

    let vWssadaIdx = 0;
    for (const piece of wallDist.wssadaPieces) {
      pieces.push({
        rect: {
          x: wssadaX,
          y: wssadaOrigin.y + piece.startPosition, // Use wssadaOrigin for Y
          width: WSSADA_DEPTH,
          height: piece.size,
        },
        label: `${piece.size}`,
        type: piece.isCornerPiece ? 'wssada-corner' : 'wssada',
        wallId, pieceIndex: vWssadaIdx++, pieceCategory: 'wssada',
      });
    }

    // Render Wssada void if any
    if (wallDist.wssadaVoid > 0) {
      const lastWssadaPiece = wallDist.wssadaPieces[wallDist.wssadaPieces.length - 1];
      const voidStart = lastWssadaPiece ? lastWssadaPiece.endPosition : 0;
      pieces.push({
        rect: {
          x: wssadaX,
          y: wssadaOrigin.y + voidStart,
          width: WSSADA_DEPTH,
          height: wallDist.wssadaVoid,
        },
        label: `${wallDist.wssadaVoid}`,
        type: 'wssada-void',
      });
    }
  }

  return pieces;
}

// ============================================
// SVG BUILDING
// ============================================

function buildSVGElement(
  piece: RenderablePiece,
  scale: number,
  patternId: string
): string {
  const isVoid = piece.type === 'glssa-void' || piece.type === 'wssada-void';
  const isGlssa = piece.type === 'glssa' || piece.type === 'glssa-void';

  const colors = isVoid
    ? COLORS.void
    : piece.type === 'glssa'
      ? COLORS.glssa
      : piece.type === 'wssada-corner'
        ? COLORS.wssadaCorner
        : COLORS.wssada;

  const x = piece.rect.x * scale;
  const y = piece.rect.y * scale;
  const width = piece.rect.width * scale;
  const height = piece.rect.height * scale;

  const strokeWidth = isGlssa ? 2 : 1.5;
  const cornerRadius = isGlssa ? 4 : 0; // Sharp corners for Wssada (back cushions)

  let svg = '';

  const dataAttrs = !isVoid && piece.wallId !== undefined
    ? ` data-wall-id="${piece.wallId}" data-piece-index="${piece.pieceIndex}" data-piece-category="${piece.pieceCategory}" style="cursor:pointer"`
    : '';

  if (isVoid) {
    // Void rectangle with diagonal stripes pattern
    svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" `;
    svg += `fill="url(#${patternId})" stroke="${colors.stroke}" stroke-width="${strokeWidth}" rx="${cornerRadius}" stroke-dasharray="4,2"/>`;
  } else {
    // Regular rectangle
    svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" `;
    svg += `fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" rx="${cornerRadius}"${dataAttrs}/>`;
  }

  // Label
  const textColor = isVoid ? COLORS.void.stroke : (colors as any).text;
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);

  if (minDimension > 12) {
    // Label fits inside the piece
    const fontSize = isGlssa ? LABEL_FONT_SIZE + 1 : LABEL_FONT_SIZE;
    const cx = x + width / 2;
    const cy = y + height / 2 + fontSize / 3;
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" `;
    svg += `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="600" `;
    svg += `fill="${textColor}">${piece.label}</text>`;
  } else if (maxDimension > 20) {
    // Thin piece (Wssada) - show label centered with smaller font, overflows the thin dimension
    const thinFontSize = 8;
    if (width >= height) {
      // Horizontal thin piece
      const cx = x + width / 2;
      const cy = y + height / 2 + thinFontSize / 3;
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" `;
      svg += `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${thinFontSize}" font-weight="600" `;
      svg += `fill="${textColor}">${piece.label}</text>`;
    } else {
      // Vertical thin piece - rotate text
      const cx = x + width / 2;
      const cy = y + height / 2;
      svg += `<text x="${cx}" y="${cy + thinFontSize / 3}" text-anchor="middle" `;
      svg += `transform="rotate(-90, ${cx}, ${cy})" `;
      svg += `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${thinFontSize}" font-weight="600" `;
      svg += `fill="${textColor}">${piece.label}</text>`;
    }
  }

  // Coudoir bar inside Glssa pieces (armrest indicator)
  // PERPENDICULAR to glssa direction, spans full depth (Wssada edge → room interior edge)
  if (piece.type === 'glssa' && !isVoid) {
    const barThickness = 6; // Wider bar for visibility
    const edgeMargin = 2; // Tiny margin from edges
    const offsetFromCenter = 12; // Offset from center label

    if (width >= height) {
      // Horizontal glssa → VERTICAL coudoir bar (perpendicular)
      // Spans full depth: from Wssada edge to inner room edge
      const barH = height - edgeMargin * 2;
      const barX = x + width / 2 + offsetFromCenter;
      const barY = y + edgeMargin;
      svg += `<rect x="${barX}" y="${barY}" width="${barThickness}" height="${barH}" `;
      svg += `fill="${COLORS.coudoir.fill}" stroke="${COLORS.coudoir.stroke}" stroke-width="0.75" rx="2"/>`;
    } else {
      // Vertical glssa → HORIZONTAL coudoir bar (perpendicular)
      // Spans full depth: from Wssada edge to inner room edge
      const barW = width - edgeMargin * 2;
      const barX = x + edgeMargin;
      const barY = y + height / 2 + offsetFromCenter;
      svg += `<rect x="${barX}" y="${barY}" width="${barW}" height="${barThickness}" `;
      svg += `fill="${COLORS.coudoir.fill}" stroke="${COLORS.coudoir.stroke}" stroke-width="0.75" rx="2"/>`;
    }
  }

  return svg;
}

const LABEL_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function buildLegend(x: number, y: number, hasCornerPieces: boolean, hasVoid: boolean, patternId: string, hasCarpet: boolean = false, hasPoufs: boolean = false): string {
  let svg = `<g transform="translate(${x}, ${y})">`;
  let yOffset = 0;

  // Glssa (ڭلسة)
  svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="${COLORS.glssa.fill}" stroke="${COLORS.glssa.stroke}" stroke-width="1.5" rx="3"/>`;
  svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.glssa.text}">Glssa (Assise)</text>`;
  yOffset += 20;

  // Wssada (Dossier)
  svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="${COLORS.wssada.fill}" stroke="${COLORS.wssada.stroke}" stroke-width="1.5" rx="3"/>`;
  svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.wssada.text}">Wssada (Dossier)</text>`;
  yOffset += 20;

  // Only show corner legend if there are corner pieces
  if (hasCornerPieces) {
    svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="${COLORS.wssadaCorner.fill}" stroke="${COLORS.wssadaCorner.stroke}" stroke-width="1.5" rx="3"/>`;
    svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.wssadaCorner.text}">Pi\u00e8ce d'angle</text>`;
    yOffset += 20;
  }

  // Coudoir (Accoudoir)
  svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="${COLORS.coudoir.fill}" stroke="${COLORS.coudoir.stroke}" stroke-width="1.5" rx="3"/>`;
  svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.coudoir.text}">Coudoir (Accoudoir)</text>`;
  yOffset += 20;

  // Only show void legend if there is void
  if (hasVoid) {
    svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="url(#${patternId})" stroke="${COLORS.void.stroke}" stroke-width="1.5" rx="3" stroke-dasharray="4,2"/>`;
    svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.void.stroke}">Vide</text>`;
  }

  // Carpet legend
  if (hasCarpet) {
    if (hasVoid) yOffset += 20;
    svg += `<rect x="0" y="${yOffset}" width="20" height="12" fill="${COLORS.carpet.fill}" stroke="${COLORS.carpet.stroke}" stroke-width="1.5" rx="3"/>`;
    svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.carpet.text}">Zerbiya (Tapis)</text>`;
    yOffset += 20;
  }

  // Pouf legend
  if (hasPoufs) {
    if (!hasCarpet && hasVoid) yOffset += 20;
    svg += `<rect x="0" y="${yOffset}" width="12" height="12" fill="${COLORS.pouf.fill}" stroke="${COLORS.pouf.stroke}" stroke-width="1.5" rx="2"/>`;
    svg += `<text x="26" y="${yOffset + 10}" font-family="${LABEL_FONT}" font-size="11" font-weight="500" fill="${COLORS.pouf.text}">Poufs (بوف)</text>`;
  }

  svg += `</g>`;
  return svg;
}

// ============================================
// MAIN GENERATOR
// ============================================

export interface SVGGeneratorInput {
  layoutType: LayoutType;
  geometry: GeometryScenario;
  distribution: DistributionResult;
  carpet?: {
    widthCm: number;
    heightCm: number;
    floorRect: { x: number; y: number; width: number; height: number };
    label: string;
  };
  carpets?: Array<{
    widthCm: number;
    heightCm: number;
    posX: number;          // cm from floor-rect left edge
    posY: number;          // cm from floor-rect top edge
    label: string;
    floorRect: { x: number; y: number; width: number; height: number };
  }>;
  poufsCount?: number;  // Number of poufs to show
}

/**
 * Build wall lines for the room outline with dimension labels
 */
function buildWallLines(
  layoutType: LayoutType,
  geometry: GeometryScenario,
  scale: number
): string {
  let svg = '';
  const wallThickness = 3;
  const labelOffset = 12; // Distance from wall line to label
  const labelFontSize = 10;

  // Get input dimensions from walls
  const getInputLength = (wallId: string): number => {
    const wall = geometry.walls.find(w => w.wallId === wallId);
    return wall?.inputLength || 0;
  };

  // Helper to create dimension label
  const createDimensionLabel = (x: number, y: number, length: number, rotation: number = 0): string => {
    const text = `${length} cm`;
    if (rotation !== 0) {
      return `<text x="${x}" y="${y}" transform="rotate(${rotation}, ${x}, ${y})" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${labelFontSize}" font-weight="600" fill="${COLORS.wall}">${text}</text>`;
    }
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${labelFontSize}" font-weight="600" fill="${COLORS.wall}">${text}</text>`;
  };

  switch (layoutType) {
    case 'single-wall': {
      const wallLength = getInputLength('main');
      // Single horizontal wall line at top
      svg += `<line x1="0" y1="0" x2="${wallLength * scale}" y2="0" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      // Dimension label above the wall
      svg += createDimensionLabel((wallLength * scale) / 2, -labelOffset, wallLength);
      break;
    }

    case 'l-shape': {
      const hLength = getInputLength('H');
      const vLength = getInputLength('V');
      // L-shape: top wall + left wall meeting at corner
      // Top wall (horizontal)
      svg += `<line x1="0" y1="0" x2="${hLength * scale}" y2="0" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      // Dimension label above horizontal wall
      svg += createDimensionLabel((hLength * scale) / 2, -labelOffset, hLength);

      // Left wall (vertical)
      svg += `<line x1="0" y1="0" x2="0" y2="${vLength * scale}" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      // Dimension label to the left of vertical wall
      svg += createDimensionLabel(-labelOffset, (vLength * scale) / 2, vLength, -90);
      break;
    }

    case 'u-shape': {
      const lLength = getInputLength('L');
      const cLength = getInputLength('C');
      const rLength = getInputLength('R');

      // U-shape: left wall + top wall + right wall (each with its own length)
      // Left wall - uses lLength
      svg += `<line x1="0" y1="0" x2="0" y2="${lLength * scale}" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel(-labelOffset, (lLength * scale) / 2, lLength, -90);

      // Top wall
      svg += `<line x1="0" y1="0" x2="${cLength * scale}" y2="0" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel((cLength * scale) / 2, -labelOffset, cLength);

      // Right wall - uses rLength (independent from left)
      svg += `<line x1="${cLength * scale}" y1="0" x2="${cLength * scale}" y2="${rLength * scale}" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel((cLength * scale) + labelOffset, (rLength * scale) / 2, rLength, 90);
      break;
    }

    case 'four-walls': {
      const tLength = getInputLength('T');
      const lLength = getInputLength('L');
      const rLength = getInputLength('R');
      const blLength = getInputLength('BL') || 0;
      const brLength = getInputLength('BR') || 0;

      // Draw room outline with door gap on bottom
      // Top wall
      svg += `<line x1="0" y1="0" x2="${tLength * scale}" y2="0" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel((tLength * scale) / 2, -labelOffset, tLength);

      // Left wall
      svg += `<line x1="0" y1="0" x2="0" y2="${lLength * scale}" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel(-labelOffset, (lLength * scale) / 2, lLength, -90);

      // Right wall
      svg += `<line x1="${tLength * scale}" y1="0" x2="${tLength * scale}" y2="${rLength * scale}" `;
      svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
      svg += createDimensionLabel((tLength * scale) + labelOffset, (rLength * scale) / 2, rLength, 90);

      // Bottom wall with door gap
      if (blLength > 0) {
        // Bottom-left wall segment
        svg += `<line x1="0" y1="${lLength * scale}" x2="${blLength * scale}" y2="${lLength * scale}" `;
        svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
        svg += createDimensionLabel((blLength * scale) / 2, (lLength * scale) + labelOffset + 5, blLength);
      }
      if (brLength > 0) {
        // Bottom-right wall segment
        const brStartX = tLength - brLength;
        svg += `<line x1="${brStartX * scale}" y1="${rLength * scale}" x2="${tLength * scale}" y2="${rLength * scale}" `;
        svg += `stroke="${COLORS.wall}" stroke-width="${wallThickness}" stroke-linecap="round"/>`;
        svg += createDimensionLabel((brStartX * scale) + (brLength * scale) / 2, (rLength * scale) + labelOffset + 5, brLength);
      }

      // Door indicator
      const doorStartX = blLength * scale;
      const doorEndX = (tLength - brLength) * scale;
      const doorY = Math.max(lLength, rLength) * scale;
      // Door opening arc
      svg += `<path d="M ${doorStartX} ${doorY} L ${doorStartX} ${doorY - 15} A 15 15 0 0 1 ${doorStartX + 15} ${doorY}" `;
      svg += `fill="none" stroke="${COLORS.wall}" stroke-width="1.5" stroke-dasharray="3,2"/>`;
      // Door label
      svg += `<text x="${(doorStartX + doorEndX) / 2}" y="${doorY + labelOffset + 8}" `;
      svg += `text-anchor="middle" font-family="${LABEL_FONT}" font-size="${labelFontSize - 1}" fill="${COLORS.dimension}">Porte</text>`;
      break;
    }
  }

  return svg;
}

/**
 * Generate SVG floor plan from geometry and distribution data
 */
export function generateFloorPlanSVG(input: SVGGeneratorInput): string {
  const { layoutType, geometry, distribution } = input;

  // Calculate layout bounds and wall positions
  const { width, height, wallPositions } = calculateLayoutBounds(
    layoutType,
    geometry
  );

  // Calculate SVG dimensions (add extra space for wall lines)
  const wallOffset = 15; // Extra space for wall lines outside cushions
  const legendSpace = 100; // Extra pixels for legend below the drawing

  // For single-wall layouts, add extra vertical space below the glssa strip for poufs
  const poufsCount = input.poufsCount || 0;
  const singleWallPoufSpace = (layoutType === 'single-wall' && poufsCount > 0) ? 100 : 0; // extra cm for pouf row

  const svgWidth = (width + PADDING * 2 + wallOffset) * SCALE;
  const svgHeight = (height + PADDING * 2 + wallOffset) * SCALE + singleWallPoufSpace * SCALE + legendSpace;

  // Unique pattern ID for this SVG
  const patternId = `void-pattern-${Date.now()}`;

  // Start SVG — include width/height so inline SVGs have intrinsic size,
  // while viewBox + preserveAspectRatio allow scaling in <img> tags.
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(svgWidth)}" height="${Math.round(svgHeight)}" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">`;

  // Define patterns for void areas
  svg += `<defs>`;
  svg += `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="8" height="8">`;
  svg += `<rect width="8" height="8" fill="${COLORS.void.fill}"/>`;
  svg += `<path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="${COLORS.void.pattern}" stroke-width="2" opacity="0.7"/>`;
  svg += `</pattern>`;
  svg += `</defs>`;
  // Interactive styles for edit mode (hover/tap feedback on pieces)
  svg += `<style>`;
  svg += `rect[data-wall-id]{transition:filter .15s,stroke-width .15s}`;
  svg += `rect[data-wall-id]:hover{filter:brightness(0.92) drop-shadow(0 0 3px rgba(0,0,0,.2));stroke-width:2.5}`;
  svg += `rect[data-carpet-id]{transition:filter .15s,stroke-width .15s}`;
  svg += `rect[data-carpet-id]:hover{filter:brightness(0.92) drop-shadow(0 0 3px rgba(0,0,0,.2));stroke-width:2.5}`;
  svg += `rect[data-pouf-id]{transition:filter .15s,stroke-width .15s}`;
  svg += `rect[data-pouf-id]:hover{filter:brightness(0.92) drop-shadow(0 0 3px rgba(0,0,0,.2));stroke-width:2.5}`;
  svg += `</style>`;

  // Background
  svg += `<rect width="100%" height="100%" fill="${COLORS.background}"/>`;

  // Create main group with padding offset
  svg += `<g transform="translate(${(PADDING + wallOffset / 2) * SCALE}, ${(PADDING + wallOffset / 2) * SCALE})">`;

  // Draw wall lines first (behind everything)
  svg += buildWallLines(layoutType, geometry, SCALE);

  // Draw carpet(s) on the floor (before cushion pieces - carpet is under cushions)
  // Normalize legacy single carpet into carpets array
  let carpetsToRender: Array<{
    widthCm: number; heightCm: number; posX: number; posY: number;
    label: string; floorRect: { x: number; y: number; width: number; height: number };
  }> = [];

  if (input.carpets && input.carpets.length > 0) {
    carpetsToRender = input.carpets;
  } else if (input.carpet) {
    // Legacy: center within floor rect
    const { widthCm, heightCm, floorRect, label } = input.carpet;
    carpetsToRender = [{
      widthCm, heightCm,
      posX: (floorRect.width - widthCm) / 2,
      posY: (floorRect.height - heightCm) / 2,
      label, floorRect,
    }];
  }

  // Distinct fill colors per carpet so multi-carpet layouts are clearly distinguishable
  const CARPET_FILLS = ['#E8D5B7', '#D4C4A0', '#C9B896'];
  const CARPET_INNER_STROKES = ['#D4C4A8', '#BFB08A', '#B5A880'];
  const CARPET_GAP = carpetsToRender.length > 1 ? 3 : 0; // 3px visual gap between carpets

  for (let idx = 0; idx < carpetsToRender.length; idx++) {
    const c = carpetsToRender[idx];
    const rawX = (c.floorRect.x + c.posX) * SCALE;
    const rawY = (c.floorRect.y + c.posY) * SCALE;
    const rawW = c.widthCm * SCALE;
    const rawH = c.heightCm * SCALE;

    // When multiple carpets, shrink each carpet inward by half the gap on each shared edge
    // so a visible gap appears between them without changing total layout bounds.
    const half = CARPET_GAP / 2;
    let carpetX = rawX;
    let carpetY = rawY;
    let carpetW = rawW;
    let carpetH = rawH;

    if (carpetsToRender.length > 1) {
      // Check which edges are shared with another carpet to apply gap only there
      for (let j = 0; j < carpetsToRender.length; j++) {
        if (j === idx) continue;
        const o = carpetsToRender[j];
        const oX = (o.floorRect.x + o.posX) * SCALE;
        const oY = (o.floorRect.y + o.posY) * SCALE;
        const oW = o.widthCm * SCALE;
        const oH = o.heightCm * SCALE;
        const TOL = 4;

        // My right edge touches other's left edge → shrink my right
        if (Math.abs((rawX + rawW) - oX) < TOL && rawY < oY + oH && rawY + rawH > oY) {
          carpetW = rawW - half;
        }
        // My left edge touches other's right edge → shift right + shrink
        if (Math.abs(rawX - (oX + oW)) < TOL && rawY < oY + oH && rawY + rawH > oY) {
          carpetX = rawX + half;
          carpetW = rawW - half;
        }
        // My bottom edge touches other's top edge → shrink my bottom
        if (Math.abs((rawY + rawH) - oY) < TOL && rawX < oX + oW && rawX + rawW > oX) {
          carpetH = rawH - half;
        }
        // My top edge touches other's bottom edge → shift down + shrink
        if (Math.abs(rawY - (oY + oH)) < TOL && rawX < oX + oW && rawX + rawW > oX) {
          carpetY = rawY + half;
          carpetH = rawH - half;
        }
      }
    }

    // Outer carpet rect with distinct fill per carpet
    const carpetFill = CARPET_FILLS[idx % CARPET_FILLS.length];
    const innerStroke = CARPET_INNER_STROKES[idx % CARPET_INNER_STROKES.length];
    svg += `<rect x="${carpetX}" y="${carpetY}" width="${carpetW}" height="${carpetH}" fill="${carpetFill}" stroke="${COLORS.carpet.stroke}" stroke-width="2" rx="4" data-carpet-id="carpet-${idx}" style="cursor:pointer"/>`;
    // Inner decorative border — different dash pattern per carpet
    const inset = 6;
    const dashPatterns = ['6,3', '4,4', '8,2'];
    const dashPattern = dashPatterns[idx % dashPatterns.length];
    if (carpetW > inset * 2 + 4 && carpetH > inset * 2 + 4) {
      svg += `<rect x="${carpetX + inset}" y="${carpetY + inset}" width="${carpetW - inset * 2}" height="${carpetH - inset * 2}" fill="none" stroke="${innerStroke}" stroke-width="1.5" stroke-dasharray="${dashPattern}" rx="2"/>`;
    }
    // Label — show carpet number when multiple
    const labelX = carpetX + carpetW / 2;
    const labelY = carpetY + carpetH / 2;
    if (carpetsToRender.length > 1) {
      // Two-line label: number on top, size below
      svg += `<text x="${labelX}" y="${labelY - 6}" font-family="${LABEL_FONT}" font-size="11" font-weight="700" fill="${COLORS.carpet.text}" text-anchor="middle" dominant-baseline="middle">#${idx + 1}</text>`;
      svg += `<text x="${labelX}" y="${labelY + 8}" font-family="${LABEL_FONT}" font-size="9" font-weight="500" fill="${COLORS.carpet.text}" text-anchor="middle" dominant-baseline="middle">${c.label}</text>`;
    } else {
      svg += `<text x="${labelX}" y="${labelY}" font-family="${LABEL_FONT}" font-size="10" font-weight="600" fill="${COLORS.carpet.text}" text-anchor="middle" dominant-baseline="middle">${c.label}</text>`;
    }
  }

  // Collect all pieces to render
  const allPieces: RenderablePiece[] = [];

  for (const wallDist of distribution.walls) {
    const wallPos = wallPositions.get(wallDist.wallId);
    if (!wallPos) {
      console.warn(`No position found for wall ${wallDist.wallId}`);
      continue;
    }

    const pieces = renderWallPieces(
      wallDist,
      wallPos.origin,
      wallPos.wssadaOrigin,
      wallPos.direction,
      wallDist.wallId
    );
    allPieces.push(...pieces);
  }

  // Render Glssa pieces first (base layer)
  for (const piece of allPieces.filter((p) => p.type === 'glssa')) {
    svg += buildSVGElement(piece, SCALE, patternId);
  }

  // Render Glssa void pieces
  for (const piece of allPieces.filter((p) => p.type === 'glssa-void')) {
    svg += buildSVGElement(piece, SCALE, patternId);
  }

  // Render Wssada pieces on top (not void)
  for (const piece of allPieces.filter((p) => p.type === 'wssada' || p.type === 'wssada-corner')) {
    svg += buildSVGElement(piece, SCALE, patternId);
  }

  // Render Wssada void pieces last
  for (const piece of allPieces.filter((p) => p.type === 'wssada-void')) {
    svg += buildSVGElement(piece, SCALE, patternId);
  }

  // Render poufs in the CENTER of the room floor area (on the carpet/zerbiya)
  if (poufsCount > 0) {
    const poufSize = 50; // ~50cm square pouf
    const poufGap = 10;  // 10cm gap between adjacent poufs

    // Calculate the floor rect (open space in the middle of the room)
    // This mirrors the logic in carpet-calculator.ts calculateFloorRect()
    let floorRect: { x: number; y: number; width: number; height: number } | null = null;

    // Try to get floorRect from carpet data first (most reliable)
    if (carpetsToRender.length > 0) {
      floorRect = carpetsToRender[0].floorRect;
    } else if (input.carpet) {
      floorRect = input.carpet.floorRect;
    }

    // If no carpet, compute floor rect from geometry walls
    if (!floorRect) {
      const getWallLength = (id: string): number => {
        const w = geometry.walls.find(wall => wall.wallId === id);
        return w?.inputLength || 0;
      };

      switch (layoutType) {
        case 'single-wall': {
          // Single wall has no enclosed floor area, but we create a synthetic
          // pouf zone below the glssa strip so poufs render in a horizontal row.
          const singleWallWidth = getWallLength('main') || width;
          const poufZoneHeight = 60; // cm tall zone for poufs
          const poufZoneGap = 20;    // cm gap below the glssa strip
          floorRect = {
            x: 0,
            y: GLSSA_DEPTH + poufZoneGap,
            width: singleWallWidth,
            height: poufZoneHeight,
          };
          break;
        }
        case 'l-shape': {
          const hLen = getWallLength('H');
          const vLen = getWallLength('V');
          const w = hLen - GLSSA_DEPTH;
          const h = vLen - GLSSA_DEPTH;
          if (w > 0 && h > 0) floorRect = { x: GLSSA_DEPTH, y: GLSSA_DEPTH, width: w, height: h };
          break;
        }
        case 'u-shape': {
          const cLen = getWallLength('C');
          const lLen = getWallLength('L');
          const rLen = getWallLength('R');
          const w = cLen - 2 * GLSSA_DEPTH;
          const h = Math.max(lLen, rLen) - GLSSA_DEPTH;
          if (w > 0 && h > 0) floorRect = { x: GLSSA_DEPTH, y: GLSSA_DEPTH, width: w, height: h };
          break;
        }
        case 'four-walls': {
          const tLen = getWallLength('T');
          const lLen = getWallLength('L');
          const rLen = getWallLength('R');
          const w = tLen - 2 * GLSSA_DEPTH;
          const h = Math.max(lLen, rLen) - 2 * GLSSA_DEPTH;
          if (w > 0 && h > 0) floorRect = { x: GLSSA_DEPTH, y: GLSSA_DEPTH, width: w, height: h };
          break;
        }
      }
    }

    if (floorRect) {
      // Adaptive layout: horizontal if floor is wider than tall, vertical otherwise
      const isHorizontal = floorRect.width >= floorRect.height;

      if (isHorizontal) {
        // Horizontal arrangement: poufs side by side
        const totalPoufsWidth = poufsCount * poufSize + (poufsCount - 1) * poufGap;
        const groupStartX = floorRect.x + (floorRect.width - totalPoufsWidth) / 2;
        const groupStartY = floorRect.y + (floorRect.height - poufSize) / 2;

        for (let idx = 0; idx < poufsCount; idx++) {
          const poufX = groupStartX + idx * (poufSize + poufGap);
          const poufY = groupStartY;

          const px = poufX * SCALE;
          const py = poufY * SCALE;
          const ps = poufSize * SCALE;

          svg += `<rect x="${px}" y="${py}" width="${ps}" height="${ps}" fill="${COLORS.pouf.fill}" stroke="${COLORS.pouf.stroke}" stroke-width="1.5" rx="6" data-pouf-id="pouf-${idx}" style="cursor:pointer"/>`;
          svg += `<text x="${px + ps / 2}" y="${py + ps / 2 + 4}" text-anchor="middle" font-family="${LABEL_FONT}" font-size="10" font-weight="600" fill="${COLORS.pouf.text}">بوف</text>`;
        }
      } else {
        // Vertical arrangement: poufs stacked one above another
        const totalPoufsHeight = poufsCount * poufSize + (poufsCount - 1) * poufGap;
        const groupStartX = floorRect.x + (floorRect.width - poufSize) / 2;
        const groupStartY = floorRect.y + (floorRect.height - totalPoufsHeight) / 2;

        for (let idx = 0; idx < poufsCount; idx++) {
          const poufX = groupStartX;
          const poufY = groupStartY + idx * (poufSize + poufGap);

          const px = poufX * SCALE;
          const py = poufY * SCALE;
          const ps = poufSize * SCALE;

          svg += `<rect x="${px}" y="${py}" width="${ps}" height="${ps}" fill="${COLORS.pouf.fill}" stroke="${COLORS.pouf.stroke}" stroke-width="1.5" rx="6" data-pouf-id="pouf-${idx}" style="cursor:pointer"/>`;
          svg += `<text x="${px + ps / 2}" y="${py + ps / 2 + 4}" text-anchor="middle" font-family="${LABEL_FONT}" font-size="10" font-weight="600" fill="${COLORS.pouf.text}">بوف</text>`;
        }
      }
    }
  }

  // Check if there are any corner pieces or void
  const hasCornerPieces = allPieces.some((p) => p.type === 'wssada-corner');
  const hasVoid = allPieces.some((p) => p.type === 'glssa-void' || p.type === 'wssada-void');

  // Add legend (extra space below drawing for dimension labels + door label)
  svg += buildLegend(10, height * SCALE + 55 + singleWallPoufSpace * SCALE, hasCornerPieces, hasVoid, patternId, carpetsToRender.length > 0, poufsCount > 0);

  // Close main group and SVG
  svg += `</g>`;
  svg += `</svg>`;

  return svg;
}

/**
 * Generate SVG as a data URL (for embedding in img tags)
 */
export function generateFloorPlanDataUrl(input: SVGGeneratorInput): string {
  const svg = generateFloorPlanSVG(input);
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Generate floor plan from raw inputs (combines all steps)
 */
export function generateFloorPlan(
  layoutType: LayoutType,
  dimensions: Record<string, number>
): {
  svg: string;
  dataUrl: string;
  geometry: LayoutGeometry;
  distribution: DistributionResult;
} {
  // Import here to avoid circular dependency
  const { calculateGeometry } = require('./geometry-calculator');
  const { findOptimalDistribution } = require('./piece-distributor');

  // Step 1: Calculate geometry
  const geometry = calculateGeometry(layoutType, dimensions);

  // Step 2: Find optimal distribution across ALL scenarios
  const { scenario, distribution } = findOptimalDistribution(geometry);

  // Step 3: Generate SVG
  const input: SVGGeneratorInput = {
    layoutType,
    geometry: scenario,
    distribution,
  };

  const svg = generateFloorPlanSVG(input);
  const dataUrl = generateFloorPlanDataUrl(input);

  return {
    svg,
    dataUrl,
    geometry,
    distribution,
  };
}

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================

// Keep old function names working
export function generateSVG(calculation: any): string {
  // Try to use the new system if possible
  if (calculation.layoutType && calculation.walls) {
    try {
      const result = generateFloorPlan(calculation.layoutType, {});
      return result.svg;
    } catch {
      // Fall through to legacy handling
    }
  }

  // Legacy fallback - return empty SVG
  console.warn('Legacy generateSVG called - please update to use generateFloorPlan');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50">Update required</text></svg>';
}

export function generateSVGDataUrl(calculation: any): string {
  const svg = generateSVG(calculation);
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}
