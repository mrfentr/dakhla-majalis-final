# Single Wall Corner Logic

## Overview

Single wall is the simplest layout - no corners to handle.

## Dimensions

- **wallLength**: Total wall length in cm (110-2000cm)

## Glssa Placement

```
[===========================================]
             Wall Length
```

- Glssa pieces placed linearly along the wall
- No corner deductions needed
- Target coverage = wallLength
- Piece sizes: 110-200cm (prefer 180-190cm ideal)

## Wssada Placement

```
[-------------------------------------------]
             Wssada Coverage
```

- Wssada sits on top of Glssa (10cm depth)
- Target coverage = Glssa coverage (same length)
- Piece sizes: 80-90cm regular, 58-60cm corner pieces (for edge fitting)

## Zerbiya (Carpet) Placement

- Floor area in front of the wall
- Width = wallLength - 140cm (70cm Glssa depth each side)
- Standard carpet sizes apply

## API Input/Output

### Input
```json
{
  "single": 350
}
```

### Output
```json
{
  "glssaPieces": [180, 170],
  "wssadaPieces": [90, 90, 90, 80],
  "totalGlssa": 2,
  "totalWssada": 4
}
```

## No Corner Logic Required

Single wall has no corners, so:
- `effectiveLength = wallLength` (no reductions)
- `wssadaTarget = glssaCoverage` (direct match)
