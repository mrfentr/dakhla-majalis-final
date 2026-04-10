# L-Shape Corner Logic

## Overview

L-Shape has 2 walls (Horizontal and Vertical) meeting at 1 corner.

```
    ┌─────────────────────┐
    │     Horizontal      │ (Top wall)
    │   ┌─────────────────┘
    │   │
    │   │  Vertical
    │   │  (Left wall)
    │   │
    └───┘
```

## Corner Ownership Concept

The 70cm corner square can only be "owned" by ONE wall:

```
    ╔═══╗─────────────────┐
    ║ C ║   H Wall        │
    ╚═══╝─────────────────┘
    │   │
    │ V │
    │   │
    └───┘
```

**C = Corner (70cm x 70cm)**

- If **H owns corner**: H gets full length, V loses 70cm from top
- If **V owns corner**: V gets full length, H loses 70cm from left

## Glssa Corner Ownership

### Scenario 1: Horizontal First (`owner: 'H'`)

```
    ┌─ H Full Length ─────┐
    │                     │
    └─────────────────────┘
        │   │
        │ V │ (V starts 70cm below corner)
        │   │
        └───┘
```

- `H_effective = horizontalLength` (full length)
- `V_effective = verticalLength - 70` (loses 70cm at top)

### Scenario 2: Vertical First (`owner: 'V'`)

```
    ┌───┬─────────────────┐
    │   │  H (starts 70cm from left)
    │   └─────────────────┘
    │   │
    │ V │ (V gets full length)
    │   │
    └───┘
```

- `H_effective = horizontalLength - 70` (loses 70cm at left)
- `V_effective = verticalLength` (full length)

## Wssada Corner Logic

### Wssada Reclaim Concept

When a wall doesn't own the Glssa corner, its Wssada can "reclaim" space:

```
70cm Glssa corner
┌─────────────────────┐
│  ┌───────────────┐  │
│  │ 10cm Wssada   │  │ ← Wssada sits 10cm from edge
│  │ overlap zone  │  │
│  └───────────────┘  │
└─────────────────────┘
```

### Wssada Scenarios

**If H owns Glssa corner:**

1. **H owns Wssada corner too:**
   - `H_wssada_target = H_glssa_coverage` (includes corner)
   - `V_wssada_target = V_glssa_coverage + 60` (reclaims 70-10=60cm)

2. **V owns Wssada corner:**
   - `H_wssada_target = H_glssa_coverage - 10` (avoids 10cm overlap)
   - `V_wssada_target = V_glssa_coverage + 70` (reclaims full 70cm)

**If V owns Glssa corner:**

1. **V owns Wssada corner too:**
   - `V_wssada_target = V_glssa_coverage` (includes corner)
   - `H_wssada_target = H_glssa_coverage + 60` (reclaims 70-10=60cm)

2. **H owns Wssada corner:**
   - `V_wssada_target = V_glssa_coverage - 10` (avoids 10cm overlap)
   - `H_wssada_target = H_glssa_coverage + 70` (reclaims full 70cm)

## Visual Corner Ownership Diagram

```
GLSSA CORNER (H owns):          GLSSA CORNER (V owns):
┌───────────────────┐           ┌───┬───────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│           │▓▓▓│░░░░░░░░░░░░░░░│
│▓▓▓ H owns corner ▓│           │▓▓▓│  H starts     │
└───────────────────┘           │▓▓▓│  after 70cm   │
    │░░░│                       │▓▓▓└───────────────┘
    │░░░│ V starts              │▓▓▓│
    │░░░│ after 70cm            │▓▓▓│ V owns corner
    └───┘                       └───┘

▓▓▓ = Wall that OWNS the corner (gets full length)
░░░ = Wall that DOESN'T own corner (loses 70cm)
```

## Wssada Reclaim Visual

```
WSSADA RECLAIM (V doesn't own Glssa, but owns Wssada):

         ┌─── H Wssada ───┐
         │────────────────│  ← H Wssada ends before corner
    ┌────┼────────────────┘
    │═══ │
    │═══ │ ← V Wssada extends UP into corner (full 70cm reclaim)
    │    │
    │ V  │
    │    │
    └────┘

═══ = Wssada reclaim area (where V's wssada extends into H's Glssa zone)
```

## API Input/Output

### Input
```json
{
  "h": 400,
  "v": 350
}
```

### Output
```json
{
  "horizontal": {
    "glssaPieces": [190, 180],
    "wssadaPieces": [90, 90, 90, 90]
  },
  "vertical": {
    "glssaPieces": [180, 100],
    "wssadaPieces": [90, 90, 90]
  },
  "owner": "H",
  "wssadaOwner": "H",
  "totalGlssa": 4,
  "totalWssada": 7
}
```

## Code Logic Summary

```typescript
// Glssa effective lengths
const hEffective = owner === 'H' ? horizontalLength : horizontalLength - 70;
const vEffective = owner === 'V' ? verticalLength : verticalLength - 70;

// Wssada targets
if (owner === 'H') {
  hWssadaTarget = wssadaOwner === 'H' ? hCoverage : hCoverage - 10;
  vWssadaTarget = wssadaOwner === 'V' ? vCoverage + 70 : vCoverage + 60;
} else {
  vWssadaTarget = wssadaOwner === 'V' ? vCoverage : vCoverage - 10;
  hWssadaTarget = wssadaOwner === 'H' ? hCoverage + 70 : hCoverage + 60;
}
```
