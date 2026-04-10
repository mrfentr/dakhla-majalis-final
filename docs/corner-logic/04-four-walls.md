# Four Walls Corner Logic

## Overview

Four walls has 4 walls (Top, Left, Right, Bottom) meeting at 4 corners, with a door on the bottom wall.

```
    ┌─────────────────────────────────────┐
    │               Top (T)               │
    ├───┬─────────────────────────────┬───┤
    │   │                             │   │
    │ L │         Interior            │ R │
    │   │                             │   │
    │   │                             │   │
    ├───┼─────────┬───────┬───────────┼───┤
    │BL │         │ Door  │           │BR │
    └───┴─────────┴───────┴───────────┴───┘
          Bottom-Left      Bottom-Right
```

## Four Corners

```
TOP-LEFT (TL)                          TOP-RIGHT (TR)
    ╔═══╗─────────────────────────╔═══╗
    ║TL ║          T              ║TR ║
    ╚═══╝─────────────────────────╚═══╝
    │   │                         │   │
    │ L │                         │ R │
    │   │                         │   │
    ╔═══╝                         ╚═══╗
    ║BL ║    ████ DOOR ████       ║BR ║
    ╚═══╝                         ╚═══╝
BOTTOM-LEFT (BL)                   BOTTOM-RIGHT (BR)
```

**Each corner is 70cm x 70cm**

## Door Creates Split Bottom Wall

The bottom wall is split into two segments by the door:

```
    ├─────────────┼───────────┼─────────────┤
    │ Bottom-Left │   Door    │ Bottom-Right│
    │  Segment    │  (gap)    │   Segment   │
    └─────────────┴───────────┴─────────────┘

    bottomLeftToDoor = distance from left corner to door
    doorToBottomRight = distance from door to right corner
    doorWidth = bottom - bottomLeftToDoor - doorToBottomRight
```

## 3-Corner vs 4-Corner Mode

Depending on door position, we may have 3 or 4 active corners:

**4-Corner Mode** (door in middle):
- Both bottom segments ≥ 70cm
- All 4 corners active

**3-Corner Mode** (door at corner):
- One bottom segment < 70cm (skipped)
- Only 3 corners active (TL, TR, and one of BL/BR)

```
DOOR AT LEFT (3-corner):          DOOR AT RIGHT (3-corner):
    ┌───────────────────┐             ┌───────────────────┐
    │         T         │             │         T         │
    ├───┬───────────┬───┤             ├───┬───────────┬───┤
    │ L │           │ R │             │ L │           │ R │
    ├───┘           ├───┤             ├───┬───────────┼───┘
    │▓▓▓│  D O O R  │BR │             │BL │  D O O R  │▓▓▓│
    └───┴───────────┴───┘             └───┴───────────┴───┘

    ▓▓▓ = Skipped (< 70cm)
```

## Glssa Corner Ownership

Each corner can be owned by one of two adjacent walls:

| Corner | Owner Options |
|--------|---------------|
| TL | T (Top) or L (Left) |
| TR | T (Top) or R (Right) |
| BL | B (Bottom-Left) or L (Left) |
| BR | B (Bottom-Right) or R (Right) |

### 4-Corner Mode: 16 Glssa Scenarios

All combinations of (TL, TR, BL, BR) ownership:

```
Scenario  | TL | TR | BL | BR |
----------|----|----|----|----|
1         | T  | T  | L  | B  |
2         | T  | T  | L  | R  |
3         | T  | T  | B  | B  |
4         | T  | T  | B  | R  |
5         | T  | R  | L  | B  |
6         | T  | R  | L  | R  |
7         | T  | R  | B  | B  |
8         | T  | R  | B  | R  |
9         | L  | T  | L  | B  |
10        | L  | T  | L  | R  |
11        | L  | T  | B  | B  |
12        | L  | T  | B  | R  |
13        | L  | R  | L  | B  |
14        | L  | R  | L  | R  |
15        | L  | R  | B  | B  |
16        | L  | R  | B  | R  |
```

### Effective Length Calculation

```typescript
// TOP wall
T_effective = topLength;
if (TL_owner !== 'T') T_effective -= 70;  // Loses left corner
if (TR_owner !== 'T') T_effective -= 70;  // Loses right corner

// LEFT wall
L_effective = leftLength;
if (TL_owner !== 'L') L_effective -= 70;  // Loses top corner
if (BL_owner !== 'L') L_effective -= 70;  // Loses bottom corner

// RIGHT wall
R_effective = rightLength;
if (TR_owner !== 'R') R_effective -= 70;  // Loses top corner
if (BR_owner !== 'R') R_effective -= 70;  // Loses bottom corner

// BOTTOM-LEFT segment
BL_effective = bottomLeftToDoor;
if (BL_owner !== 'B') BL_effective -= 70; // Loses left corner

// BOTTOM-RIGHT segment
BR_effective = doorToBottomRight;
if (BR_owner !== 'B') BR_effective -= 70; // Loses right corner
```

## Wssada Corner Logic

For each Glssa scenario, test 3 Wssada scenarios:

1. **Same as Glssa** - Each corner owned by same wall as Glssa
2. **Horizontal preference** - T owns top corners, B owns bottom corners
3. **Vertical preference** - L owns left corners, R owns right corners

### Wssada Target Calculation

```typescript
// TOP wall Wssada
T_wssada = T_coverage;
// TL corner adjustment
if (TL_glssa !== 'T') T_wssada += 70;       // Reclaim from L
if (TL_wssada !== 'T') T_wssada -= 10;       // Avoid overlap
// TR corner adjustment
if (TR_glssa !== 'T') T_wssada += 70;       // Reclaim from R
if (TR_wssada !== 'T') T_wssada -= 10;       // Avoid overlap

// LEFT wall Wssada
L_wssada = L_coverage;
// TL corner adjustment
if (TL_glssa !== 'L') L_wssada += 70;       // Reclaim from T
if (TL_wssada !== 'L') L_wssada -= 10;       // Avoid overlap
// BL corner adjustment (if exists)
if (BL_owner !== null) {
  if (BL_glssa !== 'L') L_wssada += 70;     // Reclaim from B
  if (BL_wssada !== 'L') L_wssada -= 10;     // Avoid overlap
}

// RIGHT wall Wssada (mirror of LEFT)
R_wssada = R_coverage;
if (TR_glssa !== 'R') R_wssada += 70;
if (TR_wssada !== 'R') R_wssada -= 10;
if (BR_owner !== null) {
  if (BR_glssa !== 'R') R_wssada += 70;
  if (BR_wssada !== 'R') R_wssada -= 10;
}

// BOTTOM-LEFT Wssada
BL_wssada = BL_coverage;
if (BL_glssa !== 'B') BL_wssada += 70;
if (BL_wssada !== 'B') BL_wssada -= 10;

// BOTTOM-RIGHT Wssada
BR_wssada = BR_coverage;
if (BR_glssa !== 'B') BR_wssada += 70;
if (BR_wssada !== 'B') BR_wssada -= 10;
```

## Visual: Complete 4-Corner Ownership

```
SCENARIO: TL=L, TR=R, BL=B, BR=B (Vertical walls own top, Bottom owns bottom)

         ┌── T Wssada (reclaims both corners) ──┐
         │──────────────────────────────────────│
    ┌────┼──────────────────────────────────────┼────┐
    │═══ │              T Glssa                 │ ═══│
    │═══ │   (T loses 70 from both sides)       │ ═══│
    │    ├──────────────────────────────────────┤    │
    │    │                                      │    │
    │ L  │           Interior                   │ R  │
    │    │                                      │    │
    │    │                                      │    │
    │    ├────────────────┬─────────────────────┤    │
    │═══ │      BL        │         BR          │ ═══│
    │═══ │    (B owns)    │       (B owns)      │ ═══│
    └────┴────────────────┴─────────────────────┴────┘

    ═══ = Wssada reclaim zones (L and R extend into corners)
```

## API Input/Output

### Input
```json
{
  "top": 500,
  "left": 400,
  "right": 400,
  "bottom": 500,
  "bottomLeftToDoor": 150,
  "doorToBottomRight": 150
}
```

### Output
```json
{
  "top": {
    "glssaPieces": [180, 180],
    "wssadaPieces": [90, 90, 90, 90]
  },
  "left": {
    "glssaPieces": [180, 180],
    "wssadaPieces": [90, 90, 90, 90]
  },
  "right": {
    "glssaPieces": [180, 180],
    "wssadaPieces": [90, 90, 90, 90]
  },
  "bottomLeft": {
    "glssaPieces": [150],
    "wssadaPieces": [90, 90]
  },
  "bottomRight": {
    "glssaPieces": [150],
    "wssadaPieces": [90, 90]
  },
  "topLeftCornerOwner": "L",
  "topRightCornerOwner": "R",
  "bottomLeftCornerOwner": "B",
  "bottomRightCornerOwner": "B",
  "topLeftWssadaOwner": "L",
  "topRightWssadaOwner": "R",
  "bottomLeftWssadaOwner": "B",
  "bottomRightWssadaOwner": "B",
  "totalGlssa": 8,
  "totalWssada": 16
}
```

## Optimization: 48 Total Scenarios

- 16 Glssa corner scenarios (4 corners × 2 options each, with constraints)
- 3 Wssada scenarios per Glssa scenario
- Total: 16 × 3 = 48 combinations tested
- Best solution selected by scoring function

## Scoring Function

```typescript
score = (total_void * 3)              // Penalize voids heavily
      + (total_overhang * 0.1)        // Small penalty for overhang
      + (-ideal_pieces * 0.5)         // Reward 180-190cm pieces
      + (total_pieces * 0.2);         // Small penalty for more pieces

// Lower score = better solution
```
