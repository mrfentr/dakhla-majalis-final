# Majalis Room Visualizer v2 - System Logic

## What This System Does

Takes room wall measurements (in cm) and calculates the **exact number, size, and position** of furniture pieces needed to fill every wall — then renders a precise SVG floor plan.

**Zero AI. Pure math. Deterministic results.**

---

## The Two Furniture Pieces

### Glssa (Base Cushion) — What you SIT on
- **Depth**: 70cm (extends into the room from the wall)
- **Piece length range**: 110–190cm
- Sits directly on the floor
- The big, wide cushion that forms the seating base

### Wssada (Back Cushion) — What you LEAN on
- **Depth**: 10cm (thin, pressed against the wall)
- **Regular piece range**: 80–90cm
- **Corner piece range**: 58–60cm (only at wall junctions)
- Sits ON TOP of the Glssa, against the wall
- Corner pieces are shorter and placed where two walls meet at 90°

**Key physical rule**: Pieces TOUCH but never OVERLAP.

---

## The 4-Step Pipeline

```
User Input (wall measurements)
        │
        ▼
┌──────────────────────┐
│  1. GEOMETRY          │  geometry-calculator.ts
│  Calculate corners,   │
│  effective lengths,   │
│  ownership scenarios  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. SCENARIO SELECT   │  geometry-calculator.ts
│  Pick the best corner │
│  ownership scenario   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. PIECE DISTRIBUTE  │  piece-distributor.ts
│  Zero-void solver     │
│  for Glssa + Wssada   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  4. SVG RENDER        │  svg-generator.ts
│  Position pieces in   │
│  2D floor plan        │
└──────────────────────┘
        │
        ▼
  SVG Data URL (displayed in checkout2)
```

---

## Step 1: Geometry Calculator

**File**: `geometry-calculator.ts`

### What it does
When two walls meet at a corner, their cushions would overlap. One wall must "own" the corner (gets full length) while the other wall deducts the cushion depth.

### The Corner Problem
```
Wall A = 350cm, Wall B = 350cm
They meet at a 90° corner.

If A owns the corner:
  A.glssaEffective = 350cm (full length)
  B.glssaEffective = 350 - 70 = 280cm (deducts Glssa depth)

If B owns the corner:
  A.glssaEffective = 350 - 70 = 280cm
  B.glssaEffective = 350cm (full length)
```

Same logic applies to Wssada but with 10cm depth instead of 70cm.

### Corner Ownership Scenarios

The calculator generates **multiple scenarios** for who owns which corner, then picks the best one:

| Layout | Corners | Scenarios Generated |
|--------|---------|-------------------|
| Single Wall | 0 | 1 (no corners) |
| L-Shape | 1 (HV) | 2 (H-owns, V-owns) |
| U-Shape | 2 (LC, CR) | 4 (L-R-own, L-C-own, C-R-own, C-owns-both) |
| Four Walls | 2–4 (TL, TR, BL, BR) | 3 (sides-own, top-bottom-own, mixed-corners) |

### Impossible Range
Due to piece size constraints, some effective lengths can't be filled:
- **191–219cm**: Too long for 1 Glssa (max 190), too short for 2 (min 2×110=220)
- Scenarios producing impossible lengths are marked **invalid**

### Best Scenario Selection
1. Filter to valid scenarios only
2. Prefer scenarios with more walls (more seating coverage)
3. For U-shape, prefer L-R-own (most natural corner placement)
4. For four-walls, prefer mixed-corners (sides own top, bottom owns bottom)

---

## Step 2: Piece Distribution

**File**: `piece-distributor.ts`

This is the **brain** of the system. Two independent solvers:

### Glssa Solver (Base Cushions)

**Goal**: Fill `glssaEffective` length with pieces of 110–190cm each.

**Strategy**:
1. Try 1 piece, 2 pieces, 3, 4, 5 (brute-force all valid combos)
2. For 6+ pieces (big walls), use **even distribution**: `floor(target / n)` with remainder spread
3. Pick the combo with: zero void > less void > fewer pieces > larger average size

**Example** — Wall = 350cm:
```
2 pieces: 175 + 175 = 350 ✅ ZERO VOID
```

**Example** — Wall = 1122cm:
```
6 pieces: 187 × 6 = 1122 ✅ ZERO VOID
(floor(1122/6) = 187, remainder 0)
```

### Wssada Solver (Back Cushions) — The Zero-Void Solver

**Goal**: Fill `wssadaEffective` length with pieces summing EXACTLY to the target.

This is a **constraint satisfaction solver**:

```
For corners = 0, 1, 2:
  For each corner size combo (58, 59, 60):
    remaining = target - cornerSum
    For numPieces = ceil(remaining/90) to floor(remaining/80):
      base = floor(remaining / numPieces)
      remainder = remaining % numPieces
      if base and base+1 both in [80, 90]:
        → ZERO VOID FOUND ✅
```

**The key insight**: If you have N pieces and a target, distribute evenly:
- Each piece gets `floor(target / N)`
- First `remainder` pieces get +1cm
- If all pieces fall within 80–90cm → exact fit, zero void

**Example** — Wall = 350cm (no corners):
```
Try 4 pieces: floor(350/4) = 87, remainder 2
Pieces: 88, 88, 87, 87 = 350 ✅ ZERO VOID
```

**Example** — Wall = 380cm (with 2 corners):
```
Corners: 58 + 58 = 116
Regular target: 380 - 116 = 264
Try 3 pieces: floor(264/3) = 88, remainder 0
Pieces: 58, 58, 88, 88, 88 = 380 ✅ ZERO VOID
```

### Corner Budget System — Max 2 Per Room

Corner/reduced pieces (58–60cm) are a **room-level resource** capped at **2 per room** (`MAX_CORNER_PIECES_PER_ROOM = 2`), regardless of layout type or number of walls.

This is a **manufacturing constraint**: reduced pieces require custom cutting and add complexity, so we limit them to 2 per entire room.

The distributor uses an **optimal allocation algorithm**:
1. **Pre-compute**: For each wall, compute Wssada solutions with 0, 1, and 2 max corners
2. **Enumerate**: Try all valid corner allocations across walls (total ≤ 2)
3. **Optimize**: Pick the allocation that minimizes total room-wide Wssada void
4. **Tie-break**: Prefer fewer corners when void is equal

**Example** — U-Shape 300×500×300 (3 walls, each could use 2 corners):
```
Budget: 2 corners total
- L wall (300cm): needs 2 corners for zero void, 0 corners → void 30cm
- C wall (480cm): needs 1 corner for zero void, 0 corners → void 30cm
- R wall (300cm): needs 2 corners for zero void, 0 corners → void 30cm

Best allocation: give 1 to C + 1 to L? No — 1 corner doesn't help L (300cm).
Actually: give 2 to C? No — C only needs 1.
Give 1 to C (void→0) + budget has 1 left. L and R each need 2 → can't fix either.
Result: C=0 void, L=30 void, R=30 void. Total=60cm. Best possible with budget 2.
```

This prevents wasting corners on walls that don't need them while respecting the room-wide limit.

---

## Step 3: SVG Rendering

**File**: `svg-generator.ts`

### Coordinate System
- Scale: 0.6 pixels per cm
- Padding: 80px around the drawing
- Origin (0,0) is top-left of the room

### Wall Positioning
Each wall has two origins:
- **origin**: Where Glssa pieces start (the base cushion)
- **wssadaOrigin**: Where Wssada pieces start (the back cushion)

The Wssada always sits against the wall:
- Top wall → Wssada at top edge
- Bottom wall → Wssada at bottom edge
- Left wall → Wssada at left edge
- Right wall → Wssada at right edge

### Piece Rendering
Each piece becomes a colored rectangle:
- **Glssa**: Warm beige (#F5E6D3) with golden stroke
- **Wssada regular**: Light green (#E8F5E9) with green stroke
- **Wssada corner**: Light orange (#FFF3E0) with orange stroke
- **Void**: Red (#FFCDD2) with diagonal hatch pattern

Labels show piece dimensions. Wall lines show room outline with individual lengths.

### Legend
Auto-generated at the bottom showing color coding for each piece type.

### Wall Positioning Fixes (v2.1)

**U-shape R wall**: R wall x-position is always `inputLength - GLSSA_DEPTH`, keeping its wall line on the outside (right edge of room). L and R walls get Y offset based on corner ownership — if the center wall owns a corner, the side wall starts at `y = GLSSA_DEPTH` instead of `y = 0`.

**Four-walls BR overlap fix**: When `leftToDoor = 0` (no BL wall), `blGlssaX` is 0 instead of `GLSSA_DEPTH`, preventing BR cushions from being pushed 70cm too far right and overlapping with R wall cushions.

---

## File Map

```
src/lib/ai-room-visualizer/
├── types.ts                 # TypeScript interfaces and constants
├── geometry-calculator.ts   # Step 1+2: Corner ownership & effective lengths
├── piece-distributor.ts     # Step 3: Zero-void solver for Glssa & Wssada
├── svg-generator.ts         # Step 4: SVG floor plan renderer
├── index.ts                 # Re-exports everything + legacy v1 wrapper
│
├── llm-calculator.ts        # (v1 LEGACY - not used by checkout2)
├── prompt-templates.ts      # (v1 LEGACY - not used)
├── image-generator.ts       # (v1 LEGACY - not used)
│
├── SYSTEM_LOGIC.md          # ← You are here
├── MASTER_RULES.md          # Piece constraints reference
├── GEOMETRY_RULES.md        # Corner ownership rules
└── CHANGELOG.md             # Version history
```

---

## Constants Reference

| Constant | Value | Meaning |
|----------|-------|---------|
| `GLSSA_DEPTH` | 70cm | How far the base cushion extends into the room |
| `WSSADA_DEPTH` | 10cm | How thick the back cushion is |
| `GLSSA_MIN` | 110cm | Shortest base cushion piece |
| `GLSSA_MAX` | 190cm | Longest base cushion piece |
| `WSSADA_REGULAR_MIN` | 80cm | Shortest regular back cushion |
| `WSSADA_REGULAR_MAX` | 90cm | Longest regular back cushion |
| `WSSADA_CORNER_MIN` | 58cm | Shortest corner piece |
| `WSSADA_CORNER_MAX` | 60cm | Longest corner piece |
| `MAX_CORNER_PIECES_PER_ROOM` | 2 | Max reduced/corner Wssada pieces per room |
| `MAX_WALL_LENGTH` | 2000cm | UI input limit |

---

## Mathematical Edge Cases

### The "Gap" Between Corner and Regular Pieces
Corner max = 60cm, Regular min = 80cm → there's a 20cm gap (61–79cm) where NO piece exists.

This creates **impossible wall lengths** that can't achieve zero void:

| Range | Why Impossible |
|-------|---------------|
| 271–279cm | Between 3×90=270 and 2×58+2×80=276 |
| 301–303cm | Between 2×60+2×90=300 and 1×58+3×80=298 |

The solver handles these gracefully by finding the **minimum void** solution instead.

### Even Distribution Math
For large walls (6+ Glssa or 8+ Wssada pieces):
```
base = floor(target / numPieces)
remainder = target % numPieces

First `remainder` pieces get size = base + 1
Remaining pieces get size = base

Sum is ALWAYS exactly = target (zero void guaranteed if sizes are in range)
```

---

## How checkout2/page.tsx Uses It

```typescript
// 1. Calculate geometry (corner ownership scenarios)
const geometry = calculateGeometry(layoutType, dimensions);

// 2. Pick best scenario
const scenario = getBestScenario(geometry);

// 3. Distribute pieces across all walls
const distribution = distributePieces(scenario);

// 4. Render SVG floor plan
const svgDataUrl = generateFloorPlanDataUrl({
  layoutType,
  geometry: scenario,
  distribution,
});
```

All 4 steps are synchronous, deterministic, and run in ~1ms. No network calls, no AI, no randomness. Same input always produces the same output.

---

## Bulk Test Results (32 Tests)

Test page: `/test-layouts`

### Summary (with max 2 corner pieces per room): 14 perfect / 18 with void / 0 errors

The room-level corner budget (max 2 reduced pieces per room) means rooms that previously used 4-6 corners now have more void on some walls. This is a deliberate manufacturing constraint trade-off.

### Key Takeaways

1. **Glssa (base cushion) achieves zero void on ALL 32 tests** — the 110-190cm range is very flexible
2. **Wssada void** happens when:
   - Wall effective length falls in a mathematical impossible range (e.g., 190cm: 2×90=180 < 190 < 3×80=240)
   - Corner budget (2 per room) is exhausted — walls that need corners but can't get them have void
3. **The optimizer correctly prioritizes** — walls that benefit most from corners get them first
4. **Performance is excellent** — all 32 tests render in <10ms total
