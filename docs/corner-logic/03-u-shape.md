# U-Shape Corner Logic

## Overview

U-Shape has 3 walls (Left, Horizontal, Right) meeting at 2 corners.

```
    ┌─────────────────────────────────────┐
    │           Horizontal (H)            │
    │   ┌─────────────────────────────┐   │
    │   │                             │   │
    │ L │         Interior            │ R │
    │   │                             │   │
    │   │                             │   │
    │   │                             │   │
    │   │                             │   │
    └───┘                             └───┘
```

## Two Corners

```
LEFT CORNER (L-H junction)      RIGHT CORNER (H-R junction)
    ╔═══╗─────────────────╔═══╗
    ║LC ║       H         ║RC ║
    ╚═══╝─────────────────╚═══╝
    │   │                 │   │
    │ L │                 │ R │
    └───┘                 └───┘
```

**LC = Left Corner**, **RC = Right Corner** (each 70cm x 70cm)

## Glssa Corner Ownership Scenarios

There are **4 combinations** for Glssa corner ownership:

### Scenario 1: `leftCorner: 'L', rightCorner: 'H'`
- Left wall owns left corner
- Horizontal wall owns right corner

```
L Full     H loses 70 from left    H Full
   │       ├────────────────────────────┤
   ▼       ▼                            │
┌───┬─────────────────────────────┬───┐
│ L │           H                 │RC │
└───┼─────────────────────────────┼───┘
    │                             │   │
    │                             │ R │ ← R loses 70 from top
    │                             │   │
```

- `L_effective = leftLength` (full)
- `H_effective = horizontalLength - 70` (loses left corner)
- `R_effective = rightLength - 70` (loses top corner)

### Scenario 2: `leftCorner: 'L', rightCorner: 'R'`
- Left wall owns left corner
- Right wall owns right corner

```
L Full                              R Full
   │                                   │
   ▼                                   ▼
┌───┬───────────────────────────┬───┐
│ L │   H loses 70 from both    │ R │
└───┼───────────────────────────┼───┘
    │                           │
```

- `L_effective = leftLength` (full)
- `H_effective = horizontalLength - 70 - 70 = horizontalLength - 140`
- `R_effective = rightLength` (full)

### Scenario 3: `leftCorner: 'H', rightCorner: 'H'`
- Horizontal wall owns both corners

```
    H Full (including both corners)
    ├───────────────────────────────────┤
┌───────────────────────────────────────┐
│               H                       │
└───┬───────────────────────────────┬───┘
    │                               │
    │ L loses 70 from top           │ R loses 70 from top
    │                               │
```

- `L_effective = leftLength - 70` (loses top)
- `H_effective = horizontalLength` (full)
- `R_effective = rightLength - 70` (loses top)

### Scenario 4: `leftCorner: 'H', rightCorner: 'R'`
- Horizontal wall owns left corner
- Right wall owns right corner

```
    H Full on left                 R Full
    ├─────────────────┤               │
┌───────────────────────────────┬───┐ ▼
│           H loses right       │ R │
└───┬───────────────────────────┼───┘
    │                           │
    │ L loses 70 from top       │
```

- `L_effective = leftLength - 70` (loses top)
- `H_effective = horizontalLength - 70` (loses right corner)
- `R_effective = rightLength` (full)

## Wssada Corner Logic

For each corner, there are 2 owners possible (Glssa owner or adjacent wall owner).

### Wssada Reclaim Rules

**Left Corner:**
- If `leftCornerGlssa === 'L'` (L owns Glssa):
  - If `leftCornerWssada === 'L'`: L_wssada_target = L_coverage
  - If `leftCornerWssada === 'H'`: L_wssada_target = L_coverage - 10
- If `leftCornerGlssa === 'H'` (H owns Glssa):
  - If `leftCornerWssada === 'L'`: L_wssada_target = L_coverage + 70 (full reclaim)
  - If `leftCornerWssada === 'H'`: L_wssada_target = L_coverage + 60 (reclaim minus overlap)

**Right Corner:**
- Same logic mirrored for R and H at the right corner

**Horizontal Wssada:**
- H_wssada_target starts with H_coverage
- For LEFT corner:
  - If `leftCornerGlssa === 'L'`: H reclaims into left
    - If `leftCornerWssada === 'H'`: +70cm
    - If `leftCornerWssada === 'L'`: +60cm (70 - 10)
  - If `leftCornerGlssa === 'H'`: H starts at corner
    - If `leftCornerWssada === 'L'`: -10cm (avoid overlap)
- For RIGHT corner: Same logic mirrored

## Complete Wssada Target Calculation

```typescript
// LEFT WALL Wssada
if (leftCornerGlssa === 'L') {
  if (leftCornerWssada === 'L') {
    L_wssada_target = L_coverage;
  } else {
    L_wssada_target = L_coverage - 10;
  }
} else { // H owns left Glssa corner
  if (leftCornerWssada === 'L') {
    L_wssada_target = L_coverage + 70;
  } else {
    L_wssada_target = L_coverage + 60; // 70 - 10
  }
}

// RIGHT WALL Wssada (mirror of left)
if (rightCornerGlssa === 'R') {
  if (rightCornerWssada === 'R') {
    R_wssada_target = R_coverage;
  } else {
    R_wssada_target = R_coverage - 10;
  }
} else { // H owns right Glssa corner
  if (rightCornerWssada === 'R') {
    R_wssada_target = R_coverage + 70;
  } else {
    R_wssada_target = R_coverage + 60;
  }
}

// HORIZONTAL WALL Wssada
H_wssada_target = H_coverage;

// Left corner adjustment
if (leftCornerGlssa === 'L') {
  if (leftCornerWssada === 'H') {
    H_wssada_target += 70;
  } else {
    H_wssada_target += 60; // 70 - 10
  }
} else { // H owns left Glssa
  if (leftCornerWssada === 'L') {
    H_wssada_target -= 10;
  }
  // else: H owns both, no adjustment
}

// Right corner adjustment (same logic)
if (rightCornerGlssa === 'R') {
  if (rightCornerWssada === 'H') {
    H_wssada_target += 70;
  } else {
    H_wssada_target += 60;
  }
} else { // H owns right Glssa
  if (rightCornerWssada === 'R') {
    H_wssada_target -= 10;
  }
}
```

## Visual: Wssada Reclaim at Left Corner

```
CASE: H owns Glssa corner, L owns Wssada corner

        ┌── H Wssada (starts 70cm from left) ──┐
        │──────────────────────────────────────│
┌───────┼──────────────────────────────────────┘
│╔═════╗│
│║ RC  ║│ ← L's Wssada extends UP full 70cm into corner
│╚═════╝│   because L owns Wssada corner
│       │
│   L   │
│       │
└───────┘

RC = Reclaim Corner (70cm reclaim for L's Wssada)
```

## API Input/Output

### Input
```json
{
  "l": 350,
  "h": 500,
  "r": 350
}
```

### Output
```json
{
  "left": {
    "glssaPieces": [180, 100],
    "wssadaPieces": [90, 90, 90]
  },
  "horizontal": {
    "glssaPieces": [180, 180],
    "wssadaPieces": [90, 90, 90, 90]
  },
  "right": {
    "glssaPieces": [180, 100],
    "wssadaPieces": [90, 90, 90]
  },
  "leftCornerOwner": "L",
  "rightCornerOwner": "R",
  "leftWssadaOwner": "L",
  "rightWssadaOwner": "R",
  "totalGlssa": 6,
  "totalWssada": 10
}
```

## Optimization: 16 Total Scenarios

- 4 Glssa corner scenarios (L|H × H|R)
- 4 Wssada corner scenarios per Glssa scenario (L|H × H|R)
- Total: 4 × 4 = 16 combinations tested
- Best solution selected by scoring (minimize voids, maximize ideal pieces)
