'use client';

// ===== ROOM SHAPE DIAGRAM =====
// One scalable floor-plan SVG shared by the checkout step-1 measurement form,
// the compact shape picker, and the dashboard order builder.
//
// It replaces the old pair of renderers in the checkout page (an 80x60 preview
// duplicated per input, plus a separate decorative shape icon) so the room the
// customer is describing stays visible and labelled while they fill the fields.

import React from 'react';
import { theme } from '@/components/landing/theme';

export type DiagramLayout = 'single' | 'L' | 'U' | 'full';

/** Wall ids match the checkout `measurements` state keys. */
export const DIAGRAM_WALLS: Record<DiagramLayout, string[]> = {
  single: ['single'],
  L: ['wall1', 'wall2'],
  U: ['wall1', 'wall2', 'wall3'],
  full: ['top', 'left', 'right', 'bottomLeftToDoor', 'doorToBottomRight'],
};

export interface DiagramWallValue {
  /** Normalized centimetres, or null when not entered / unparseable. */
  cm: number | null;
  /** true = in range, false = out of range, null = untouched. */
  valid: boolean | null;
  label: string;
}

export interface RoomShapeDiagramProps {
  layout: DiagramLayout;
  /** Keyed by wall id. Missing entries render as "not yet measured". */
  values?: Partial<Record<string, DiagramWallValue>>;
  /** Wall currently being edited — drawn highlighted. */
  activeWall?: string | null;
  onWallSelect?: (wallId: string) => void;
  /** Rendered width in px. The SVG scales to it. */
  size?: number;
  /** Icon mode: no dimension labels, no interaction — for the shape picker. */
  compact?: boolean;
  /** Dim the whole diagram (unselected picker cards). */
  muted?: boolean;
  /** Paint every wall in the accent colour — used for the selected picker card. */
  accent?: boolean;
  isRTL?: boolean;
  style?: React.CSSProperties;
}

// --- geometry ---------------------------------------------------------------

const LABEL_GUTTER = 78; // room edge to viewBox edge where a dimension label sits
const PLAIN_GUTTER = 20; // ...and where no label needs the space
const ROOM_W = 280;      // room width in SVG units; height follows the aspect ratio
const BENCH = 22;       // seating depth
const DEFAULT_RATIO = 0.72;
const MIN_RATIO = 0.45;
const MAX_RATIO = 1.5;

/**
 * Aspect ratio from whatever the user has entered so far, so the drawing starts
 * to look like their actual room. Falls back to a neutral shape until both
 * spanning walls are known.
 */
function aspectRatio(layout: DiagramLayout, values: Partial<Record<string, DiagramWallValue>>): number {
  const cm = (id: string) => values[id]?.cm ?? null;
  let width: number | null = null;
  let height: number | null = null;

  if (layout === 'L') {
    width = cm('wall1');
    height = cm('wall2');
  } else if (layout === 'U') {
    width = cm('wall2');
    const l = cm('wall1');
    const r = cm('wall3');
    height = l && r ? Math.max(l, r) : l ?? r;
  } else if (layout === 'full') {
    width = cm('top');
    const l = cm('left');
    const r = cm('right');
    height = l && r ? Math.max(l, r) : l ?? r;
  }

  if (!width || !height || width <= 0 || height <= 0) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, height / width));
}

type Orientation = 'top' | 'bottom' | 'left' | 'right';

/** Which sides each layout seats — drives how much room the labels need. */
const ORIENTATIONS: Record<DiagramLayout, Orientation[]> = {
  single: ['top'],
  L: ['top', 'right'],
  U: ['left', 'top', 'right'],
  full: ['top', 'left', 'right', 'bottom'],
};

interface WallGeom {
  id: string;
  orientation: Orientation;
  /** Bench rectangle. */
  x: number; y: number; w: number; h: number;
  /** Where the dimension label sits, and how it is anchored. */
  lx: number; ly: number;
  anchor: 'start' | 'middle' | 'end';
}

function buildWalls(layout: DiagramLayout, x0: number, y0: number, x1: number, y1: number): WallGeom[] {
  const roomW = x1 - x0;
  const doorHalf = roomW * 0.12;
  const doorL = (x0 + x1) / 2 - doorHalf;
  const doorR = (x0 + x1) / 2 + doorHalf;

  const top = (id: string, from = x0, to = x1): WallGeom => ({
    id, orientation: 'top',
    x: from, y: y0, w: to - from, h: BENCH,
    lx: (from + to) / 2, ly: y0 - 11, anchor: 'middle',
  });
  const bottom = (id: string, from: number, to: number): WallGeom => ({
    id, orientation: 'bottom',
    x: from, y: y1 - BENCH, w: to - from, h: BENCH,
    lx: (from + to) / 2, ly: y1 + 19, anchor: 'middle',
  });
  const left = (id: string): WallGeom => ({
    id, orientation: 'left',
    x: x0, y: y0, w: BENCH, h: y1 - y0,
    lx: x0 - 10, ly: (y0 + y1) / 2, anchor: 'end',
  });
  const right = (id: string): WallGeom => ({
    id, orientation: 'right',
    x: x1 - BENCH, y: y0, w: BENCH, h: y1 - y0,
    lx: x1 + 10, ly: (y0 + y1) / 2, anchor: 'start',
  });

  switch (layout) {
    case 'single':
      return [top('single')];
    case 'L':
      return [top('wall1'), right('wall2')];
    case 'U':
      return [left('wall1'), top('wall2'), right('wall3')];
    case 'full':
      return [
        top('top'),
        left('left'),
        right('right'),
        bottom('bottomLeftToDoor', x0, doorL),
        bottom('doorToBottomRight', doorR, x1),
      ];
  }
}

// --- rendering --------------------------------------------------------------

const COLORS = {
  activeBench: theme.colors.primary,
  filledBench: '#C97A56',
  emptyBench: '#D8CCC0',
  invalidBench: '#DC2626',
  floor: '#FAF6F1',
  wall: '#E2D8CC',
  cushion: 'rgba(255,255,255,0.55)',
  labelActive: theme.colors.primary,
  labelFilled: '#3F7A4F',
  labelEmpty: theme.colors.textLight,
};

function benchColor(v: DiagramWallValue | undefined, isActive: boolean, accent: boolean): string {
  if (isActive) return COLORS.activeBench;
  if (v?.valid === false) return COLORS.invalidBench;
  if (v?.cm) return COLORS.filledBench;
  if (accent) return COLORS.activeBench;
  return COLORS.emptyBench;
}

/** Cushion dots along a bench, so an empty room still reads as a majlis. */
function cushions(wall: WallGeom, key: string) {
  const horizontal = wall.orientation === 'top' || wall.orientation === 'bottom';
  const span = horizontal ? wall.w : wall.h;
  const count = Math.max(2, Math.min(6, Math.round(span / 46)));
  const r = 3.2;
  return Array.from({ length: count }, (_, i) => {
    const p = (i + 1) / (count + 1);
    const cx = horizontal ? wall.x + wall.w * p : wall.x + wall.w / 2;
    const cy = horizontal ? wall.y + wall.h / 2 : wall.y + wall.h * p;
    return <circle key={`${key}-c${i}`} cx={cx} cy={cy} r={r} fill={COLORS.cushion} />;
  });
}

export default function RoomShapeDiagram({
  layout,
  values = {},
  activeWall = null,
  onWallSelect,
  size = 420,
  compact = false,
  muted = false,
  accent = false,
  isRTL = false,
  style,
}: RoomShapeDiagramProps) {
  const ratio = compact ? DEFAULT_RATIO : aspectRatio(layout, values);
  const roomH = ROOM_W * ratio;

  // Only reserve label gutters on sides that actually carry a wall, so an
  // L-shape isn't padded with dead space on its unseated left side.
  const sides = ORIENTATIONS[layout];
  const gutter = (side: Orientation) =>
    compact ? 10 : sides.includes(side) ? LABEL_GUTTER : PLAIN_GUTTER;

  const ml = gutter('left');
  const mr = gutter('right');
  const mt = compact ? 10 : 30;
  const mb = compact ? 10 : sides.includes('bottom') ? 34 : 16;

  const vw = ROOM_W + ml + mr;
  const vh = roomH + mt + mb;

  const x0 = ml;
  const y0 = mt;
  const x1 = ml + ROOM_W;
  const y1 = mt + roomH;

  const walls = buildWalls(layout, x0, y0, x1, y1);
  const interactive = !compact && typeof onWallSelect === 'function';

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width="100%"
      style={{ display: 'block', width: '100%', maxWidth: size, height: 'auto', opacity: muted ? 0.55 : 1, ...style }}
      role="img"
      aria-label={`Room layout ${layout}`}
    >
      {/* Floor + walls */}
      <rect
        x={x0} y={y0} width={ROOM_W} height={roomH} rx={6}
        fill={COLORS.floor} stroke={COLORS.wall} strokeWidth={2}
      />

      {/* Door gap on the bottom wall, drawn as a break in the outline */}
      {!compact && (
        <rect
          x={(x0 + x1) / 2 - ROOM_W * 0.12} y={y1 - 2.5}
          width={ROOM_W * 0.24} height={5}
          fill={COLORS.floor}
        />
      )}

      {walls.map((wall) => {
        const v = values[wall.id];
        const isActive = activeWall === wall.id;
        const fill = benchColor(v, isActive, accent);

        return (
          <g
            key={wall.id}
            onClick={interactive ? () => onWallSelect!(wall.id) : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
          >
            <rect
              x={wall.x} y={wall.y} width={wall.w} height={wall.h} rx={4}
              fill={fill}
              opacity={isActive ? 1 : 0.9}
            />
            {isActive && (
              <rect
                x={wall.x - 2} y={wall.y - 2} width={wall.w + 4} height={wall.h + 4} rx={6}
                fill="none" stroke={theme.colors.primary} strokeWidth={2.5} opacity={0.45}
              />
            )}
            {cushions(wall, wall.id)}

            {!compact && (
              <text
                x={wall.lx}
                y={wall.ly}
                textAnchor={wall.anchor}
                dominantBaseline={wall.orientation === 'top' || wall.orientation === 'bottom' ? 'auto' : 'middle'}
                fill={isActive ? COLORS.labelActive : v?.cm ? COLORS.labelFilled : COLORS.labelEmpty}
                fontFamily={theme.fonts.english}
                fontSize={15}
                fontWeight={isActive || v?.cm ? 700 : 500}
                style={{ userSelect: 'none' }}
              >
                {v?.cm ? `${v.cm} cm` : '—'}
              </text>
            )}
          </g>
        );
      })}

      {/* Wide invisible hit areas so thin walls are still easy to tap */}
      {interactive && walls.map((wall) => (
        <rect
          key={`hit-${wall.id}`}
          x={wall.x - 8} y={wall.y - 8} width={wall.w + 16} height={wall.h + 16}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onWallSelect!(wall.id)}
        />
      ))}

      {/* RTL is handled by the surrounding layout; the plan itself is not mirrored
          because wall ids map to fixed positions in the optimizer. */}
      {isRTL ? null : null}
    </svg>
  );
}
