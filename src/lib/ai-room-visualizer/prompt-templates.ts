/**
 * AI Room Visualizer - Prompt Templates
 *
 * These templates guide the LLM to:
 * 1. Calculate optimal Glssa/Wssada pieces
 * 2. Generate a detailed prompt for image generation
 */

import {
  GLSSA_MIN,
  GLSSA_MAX,
  GLSSA_DEPTH,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
  WSSADA_DEPTH,
  COLORS,
} from './types';

// ============================================
// SYSTEM PROMPT (shared across all layouts)
// ============================================

export const SYSTEM_PROMPT = `You are an expert optimizer for Moroccan Majalis seating layouts.

# PIECE SIZE RULES (ABSOLUTE - NO EXCEPTIONS)

## Glssa (Base Cushion)
- Valid sizes: ANY integer from ${GLSSA_MIN} to ${GLSSA_MAX} cm (e.g., 110, 127, 153, 180, 190)
- Depth: ${GLSSA_DEPTH}cm (this is how they overlap at corners!)
- INVALID: 93, 100, 105, 108, 195, 200 - anything outside 110-190
- **CRITICAL: Glssa pieces MUST sum to EXACTLY the wall's effective length!**

## Wssada Regular (Back Cushion)
- Valid sizes: ONLY 83, 84, 85, 86, 87, 88, 89, 90 cm (8 discrete options)
- Depth: ${WSSADA_DEPTH}cm
- INVALID: 80, 81, 82, 91, 92, 75, 78, 100

## Wssada Corner (Special Piece)
- Valid sizes: ONLY 58, 59, 60 cm (3 options)
- Used at L-shape/U-shape/4-walls junctions
- INVALID: 55, 61, 65, 70

# CORNER GEOMETRY (CRITICAL!)

When two walls meet at 90°, their ${GLSSA_DEPTH}cm-deep Glssa pieces overlap in a ${GLSSA_DEPTH}×${GLSSA_DEPTH}cm square.

**Corner Ownership Rule:**
- ONE wall "owns" the corner → gets FULL length
- OTHER wall "deducts" ${GLSSA_DEPTH}cm → starts AFTER the corner

Example: Wall A=350cm meets Wall B=300cm
- If A owns: A covers 350cm, B covers 300-${GLSSA_DEPTH}=${300 - GLSSA_DEPTH}cm
- If B owns: A covers 350-${GLSSA_DEPTH}=${350 - GLSSA_DEPTH}cm, B covers 300cm

# WSSADA RULES

## CRITICAL: Two Types of "Overhang"!
1. **END-OF-WALL overhang = IMPOSSIBLE** - Wssada can't extend past where Glssa ends
2. **CORNER overhang = NECESSARY** - Wssada MUST extend into corner junction

## Placement Rules:
1. **At corners:** Place corner piece (58-60cm) at the junction
2. **Open ends:** Wssada must NOT extend past Glssa's outer edge
3. **Strategy:** Corner piece first, then 90cm pieces, fill with 83-89cm

# IMPOSSIBLE LENGTHS

If effective length is 191-219cm, it CANNOT be covered by valid Glssa:
- Single piece max: 190cm
- Two pieces min: 110+110 = 220cm
→ Must adjust corner ownership to avoid this range!

Return ONLY valid JSON. Think step-by-step about corner ownership before choosing pieces.`;

// ============================================
// IMAGE PROMPT STYLE GUIDE
// ============================================

const IMAGE_STYLE_GUIDE = `
## IMAGE STYLE - FLAT 2D FLOOR PLAN DIAGRAM
- View: EXACTLY top-down (bird's eye view, 90 degrees from above)
- Style: FLAT 2D architectural floor plan diagram, like a blueprint or technical drawing
- NO 3D perspective, NO shadows, NO photorealism
- Clean vector-style graphics with solid colors and clear borders
- White or light gray background

## COLOR SCHEME (FLAT SOLID COLORS):
- Glssa (base cushions): Solid tan/beige (#D4A574) with dark brown border
- Wssada regular (back cushions): Solid burgundy/maroon (#8B2942) with darker border
- Wssada corner pieces: Solid coral/salmon (#E07B5D) with darker border
- Wall lines: Dark gray or black lines
- Floor/background: White or very light gray

## LAYOUT RULES:
- Glssa pieces are 70cm deep rectangles arranged along the wall
- Wssada pieces are 10cm deep rectangles placed ON TOP of Glssa (against the wall)
- Corner Glssa is a 70x70cm SQUARE at L-junctions
- Corner Wssada is a small piece (58-60cm) at the junction
- Show clear separation lines between each piece

## LABELING (CRITICAL):
- Label EACH Glssa piece with its length in cm (e.g., "180cm", "150cm")
- Label EACH Wssada piece with its length in cm (e.g., "90cm", "85cm", "60cm")
- Labels should be BLACK text, clearly readable
- Show total wall dimension with measurement arrows
- Mark corners clearly`;

// ============================================
// SINGLE WALL PROMPT
// ============================================

export function buildSingleWallPrompt(wallLength: number): string {
  // Check if wall is in the impossible range (191-219cm)
  const isImpossibleRange = wallLength > GLSSA_MAX && wallLength < 2 * GLSSA_MIN;
  const impossibleNote = isImpossibleRange
    ? `\n\n**NOTE:** ${wallLength}cm is in the impossible range (191-219cm). Use the closest valid configuration:\n- Option A: Use ${GLSSA_MAX}cm Glssa with ${wallLength - GLSSA_MAX}cm void\n- Option B: Use ${GLSSA_MIN}+${GLSSA_MIN}=${2 * GLSSA_MIN}cm Glssa (extends ${2 * GLSSA_MIN - wallLength}cm past wall)\nChoose the option with less waste.`
    : '';

  const effectiveGlssa = isImpossibleRange
    ? (wallLength - GLSSA_MAX <= 2 * GLSSA_MIN - wallLength ? GLSSA_MAX : 2 * GLSSA_MIN)
    : wallLength;

  return `Calculate and visualize a SINGLE WALL Majalis layout.

## WALL DIMENSIONS:
- Wall length: ${wallLength}cm
${impossibleNote}

## TASK:
1. Find optimal Glssa pieces (${GLSSA_MIN}-${GLSSA_MAX}cm each) that sum to ${isImpossibleRange ? 'closest valid total' : `${wallLength}cm`}
2. Find optimal Wssada pieces (${WSSADA_REGULAR_MIN}-${WSSADA_REGULAR_MAX}cm each) that fit on the Glssa
3. Generate a detailed image prompt

## VALID GLSSA COMBINATIONS:
${getGlssaCombinations(wallLength) || (isImpossibleRange ? `[${GLSSA_MAX}] single (with ${wallLength - GLSSA_MAX}cm void) OR [${GLSSA_MIN}, ${GLSSA_MIN}] two pieces` : 'Calculate closest option')}

${IMAGE_STYLE_GUIDE}

## REQUIRED JSON OUTPUT:
{
  "walls": [{
    "wallId": "main",
    "effectiveLength": ${wallLength},
    "glssaPieces": [<sizes that sum to ${isImpossibleRange ? effectiveGlssa : wallLength}>],
    "wssadaPieces": [<sizes that sum to ≤ glssa total>],
    "glssaTotal": <sum>,
    "wssadaTotal": <sum>,
    "glssaVoid": ${isImpossibleRange ? `<${wallLength} - glssaTotal or 0 if glssa > wall>` : '<wallLength - glssaTotal>'},
    "wssadaVoid": <glssaTotal - wssadaTotal>
  }],
  "totalGlssaPieces": <count>,
  "totalWssadaPieces": <count>,
  "reasoning": "<brief explanation${isImpossibleRange ? ' including why you chose this configuration for the impossible range' : ''}>",
  "imagePrompt": "<VERY detailed prompt describing exactly how to render this ${wallLength}cm single wall Majalis with specific piece positions, sizes, colors, and labels>"
}`;
}

// ============================================
// L-SHAPE PROMPT
// ============================================

export function buildLShapePrompt(hLength: number, vLength: number): string {
  const hIfOwner = hLength;
  const hIfNotOwner = hLength - GLSSA_DEPTH;
  const vIfOwner = vLength;
  const vIfNotOwner = vLength - GLSSA_DEPTH;

  // Check which ownership options are mathematically possible
  const hOwnsValid = canCoverWithGlssa(hIfOwner) && canCoverWithGlssa(vIfNotOwner);
  const vOwnsValid = canCoverWithGlssa(hIfNotOwner) && canCoverWithGlssa(vIfOwner);

  return `# L-SHAPE MAJALIS CALCULATION

## INPUT DIMENSIONS
- Horizontal wall (H): ${hLength}cm
- Vertical wall (V): ${vLength}cm

## STEP 1: ANALYZE CORNER OWNERSHIP OPTIONS

The Glssa is ${GLSSA_DEPTH}cm deep. At the corner, one wall "owns" it (full length), the other deducts ${GLSSA_DEPTH}cm.

**Option A - H owns corner:**
- H effective = ${hIfOwner}cm (full)
- V effective = ${vLength} - ${GLSSA_DEPTH} = ${vIfNotOwner}cm
- H Glssa options: ${getGlssaCombinations(hIfOwner)}
- V Glssa options: ${getGlssaCombinations(vIfNotOwner)}
- Viable: ${hOwnsValid ? 'YES' : 'NO - V=' + vIfNotOwner + 'cm is in impossible range 191-219'}

**Option B - V owns corner:**
- H effective = ${hLength} - ${GLSSA_DEPTH} = ${hIfNotOwner}cm
- V effective = ${vIfOwner}cm (full)
- H Glssa options: ${getGlssaCombinations(hIfNotOwner)}
- V Glssa options: ${getGlssaCombinations(vIfOwner)}
- Viable: ${vOwnsValid ? 'YES' : 'NO - H=' + hIfNotOwner + 'cm is in impossible range 191-219'}

## STEP 2: CHOOSE CORNER OWNERSHIP
${!hOwnsValid && vOwnsValid ? '**V MUST own the corner** (H ownership creates impossible length)' : ''}
${hOwnsValid && !vOwnsValid ? '**H MUST own the corner** (V ownership creates impossible length)' : ''}
${hOwnsValid && vOwnsValid ? 'Both options viable. Choose the one with better piece fit (less void).' : ''}
${!hOwnsValid && !vOwnsValid ? '**WARNING:** Both options have issues. Pick the one closer to valid range.' : ''}

## STEP 3: SELECT GLSSA PIECES
For the chosen ownership, pick Glssa pieces that:
- Each piece is ${GLSSA_MIN}-${GLSSA_MAX}cm
- Sum equals effective length (or very close)

## STEP 4: SELECT WSSADA PIECES

**CRITICAL: There is only ONE corner piece at the L-junction!**
- The corner piece (58-60cm) sits at the junction where H and V meet
- It belongs to ONE wall only (typically the wall that owns the corner)
- The OTHER wall's Wssada starts AFTER the corner piece

**Corner vs End-of-Wall Treatment:**
- Wssada CAN extend to the corner junction (this is GOOD!)
- Wssada CANNOT extend past the OPEN END of each wall (this is BAD)

**For the wall that OWNS the corner (has the corner piece):**
1. Include corner piece (58-60cm) at the junction
2. Add regular pieces (83-90cm) going toward the open end

**For the wall that DOESN'T own the corner:**
1. Start with regular pieces (83-90cm) at the junction (corner piece belongs to other wall)
2. Continue toward the open end

**Example for L-shape where V owns corner:**
- V wall: [60, 90, 90] - includes the corner piece
- H wall: [90, 90, 90] - NO corner piece (it's V's)
- Total corner pieces: 1 (not 2!)

## STEP 5: GENERATE IMAGE PROMPT
${IMAGE_STYLE_GUIDE}

## REQUIRED JSON OUTPUT
{
  "cornerOwnership": { "corner": "H" or "V" },
  "walls": [
    {
      "wallId": "H",
      "inputLength": ${hLength},
      "effectiveLength": <${hIfOwner} if H owns, else ${hIfNotOwner}>,
      "glssaPieces": [<each 110-190>],
      "wssadaPieces": [<valid sizes, sum ≤ glssa sum>],
      "glssaTotal": <sum>,
      "wssadaTotal": <sum>,
      "glssaVoid": 0,
      "wssadaVoid": <glssa - wssada>
    },
    {
      "wallId": "V",
      "effectiveLength": <vLength or vLength-70>,
      "glssaPieces": [<valid sizes>],
      "wssadaPieces": [<valid sizes, sum ≤ glssa sum>],
      "glssaTotal": <sum>,
      "wssadaTotal": <sum>,
      "glssaVoid": 0,
      "wssadaVoid": <glssa - wssada>
    }
  ],
  "totalGlssaPieces": <total count>,
  "totalWssadaPieces": <total count>,
  "reasoning": "<explain corner ownership choice and piece selection>",
  "imagePrompt": "<EXTREMELY detailed prompt for L-shape visualization with H=${hLength}cm and V=${vLength}cm, describing exact positions of each Glssa and Wssada piece, colors, corner treatment, dimension labels, and Moroccan aesthetic>"
}`;
}

// ============================================
// U-SHAPE PROMPT
// ============================================

export function buildUShapePrompt(
  leftLength: number,
  centerLength: number,
  rightLength: number
): string {
  const centerEffective = centerLength - 2 * GLSSA_DEPTH;

  return `# U-SHAPE MAJALIS CALCULATION

## INPUT DIMENSIONS
- Left wall (L): ${leftLength}cm
- Center wall (C): ${centerLength}cm
- Right wall (R): ${rightLength}cm

## STEP 1: UNDERSTAND U-SHAPE CORNER OWNERSHIP (FIXED RULES)

U-shape has 2 corners where walls meet:
\`\`\`
    ════════════════════════════► Center (C)
    ║                           ║
    ║ ┌──┐                 ┌──┐ ║
    ║ │CL│  (${GLSSA_DEPTH}×${GLSSA_DEPTH})   │CR│ ║
    ║ └──┘                 └──┘ ║
    ▼                           ▼
    Left (L)               Right (R)
\`\`\`

**Corner ownership is FIXED for U-shape:**
- LEFT wall owns the LEFT corner (CL) → L gets full ${leftLength}cm
- RIGHT wall owns the RIGHT corner (CR) → R gets full ${rightLength}cm
- CENTER wall loses ${GLSSA_DEPTH}cm on EACH side → C gets ${centerLength} - ${2 * GLSSA_DEPTH} = ${centerEffective}cm

## STEP 2: CALCULATE EFFECTIVE LENGTHS
- L effective: ${leftLength}cm (owns left corner)
- C effective: ${centerEffective}cm (deducts ${GLSSA_DEPTH}cm × 2 = ${2 * GLSSA_DEPTH}cm)
- R effective: ${rightLength}cm (owns right corner)

## STEP 3: FIND GLSSA PIECES
**Glssa MUST sum to EXACTLY the effective length. All pieces must be 110-190cm.**
L = ${leftLength}cm: ${getGlssaCombinations(leftLength)}
C = ${centerEffective}cm: ${getGlssaCombinations(centerEffective)}
R = ${rightLength}cm: ${getGlssaCombinations(rightLength)}

## STEP 4: FIND WSSADA PIECES
**CRITICAL: Each wall has AT MOST ONE corner piece!**
- L wall: ONE corner piece (60cm) at L-C junction + regular pieces (83-90cm)
- C wall: ZERO corner pieces (regular pieces only)
- R wall: ONE corner piece (60cm) at C-R junction + regular pieces (83-90cm)

**Total corner pieces in U-shape = 2 (not 4!)**

Wssada sum must be ≤ Glssa sum for each wall.

## STEP 5: GENERATE IMAGE PROMPT
${IMAGE_STYLE_GUIDE}

## REQUIRED JSON OUTPUT
{
  "cornerOwnership": { "leftCorner": "L", "rightCorner": "R" },
  "walls": [
    {
      "wallId": "L",
      "inputLength": ${leftLength},
      "effectiveLength": ${leftLength},
      "glssaPieces": [<each 110-190, sum = ${leftLength}>],
      "wssadaPieces": [<83-90cm pieces + corner 58-60cm>],
      "glssaTotal": ${leftLength},
      "wssadaTotal": <sum ≤ ${leftLength}>,
      "hasCornerPiece": true
    },
    {
      "wallId": "C",
      "inputLength": ${centerLength},
      "effectiveLength": ${centerEffective},
      "glssaPieces": [<each 110-190, sum = ${centerEffective}>],
      "wssadaPieces": [<83-90cm pieces only, no corner>],
      "glssaTotal": ${centerEffective},
      "wssadaTotal": <sum ≤ ${centerEffective}>,
      "hasCornerPiece": false
    },
    {
      "wallId": "R",
      "inputLength": ${rightLength},
      "effectiveLength": ${rightLength},
      "glssaPieces": [<each 110-190, sum = ${rightLength}>],
      "wssadaPieces": [<corner 58-60cm + 83-90cm pieces>],
      "glssaTotal": ${rightLength},
      "wssadaTotal": <sum ≤ ${rightLength}>,
      "hasCornerPiece": true
    }
  ],
  "totalGlssaPieces": <count>,
  "totalWssadaPieces": <count>,
  "totalCornerPieces": 2,
  "reasoning": "<explain your piece choices>",
  "imagePrompt": "<detailed U-shape visualization prompt>"
}`;
}

// ============================================
// FOUR WALLS PROMPT
// ============================================

export function buildFourWallsPrompt(
  topLength: number,
  leftLength: number,
  rightLength: number,
  bottomLength: number,
  leftToDoor: number,
  doorToRight: number
): string {
  const doorWidth = bottomLength - leftToDoor - doorToRight;
  const hasBottomLeft = leftToDoor >= GLSSA_MIN;
  const hasBottomRight = doorToRight >= GLSSA_MIN;

  // Calculate effective lengths based on corner ownership
  // For simplicity: T owns top corners, L/R own bottom corners
  const topEffective = topLength - 2 * GLSSA_DEPTH; // loses both corners
  const leftEffective = leftLength; // owns bottom-left corner
  const rightEffective = rightLength; // owns bottom-right corner

  return `# FOUR-WALLS MAJALIS CALCULATION (WITH DOOR)

## INPUT DIMENSIONS
- Top wall (T): ${topLength}cm
- Left wall (L): ${leftLength}cm
- Right wall (R): ${rightLength}cm
- Bottom wall total: ${bottomLength}cm
  - Left of door (BL): ${leftToDoor}cm ${hasBottomLeft ? '✓ seating' : '✗ too short'}
  - Door opening: ${doorWidth}cm (no seating)
  - Right of door (BR): ${doorToRight}cm ${hasBottomRight ? '✓ seating' : '✗ too short'}

## STEP 1: UNDERSTAND CORNER OWNERSHIP
\`\`\`
        ┌────────────────────────────┐
        │   Top wall (T)             │
   ┌────┤                            ├────┐
   │ TL │                            │ TR │
   │    │                            │    │
   │ L  │                            │  R │
   │    │                            │    │
   │ BL │      ┌─── Door ───┐        │ BR │
   └────┴──────┘             └───────┴────┘
        Bottom-Left    Bottom-Right
\`\`\`

**Fixed corner ownership for 4-walls:**
- Top-Left (TL): Owned by L → T deducts ${GLSSA_DEPTH}cm from left
- Top-Right (TR): Owned by R → T deducts ${GLSSA_DEPTH}cm from right
- Bottom-Left (BL): ${hasBottomLeft ? 'Owned by L → no deduction for L' : 'No corner (wall too short)'}
- Bottom-Right (BR): ${hasBottomRight ? 'Owned by R → no deduction for R' : 'No corner (wall too short)'}

## STEP 2: CALCULATE EFFECTIVE LENGTHS
- T effective: ${topLength} - ${GLSSA_DEPTH} - ${GLSSA_DEPTH} = ${topEffective}cm
- L effective: ${leftLength}cm (owns both its corners)
- R effective: ${rightLength}cm (owns both its corners)
${hasBottomLeft ? `- BL effective: ${leftToDoor}cm` : '- BL: No seating'}
${hasBottomRight ? `- BR effective: ${doorToRight}cm` : '- BR: No seating'}

## STEP 3: FIND GLSSA PIECES
**Each piece must be 110-190cm. Sum MUST equal effective length exactly.**
T = ${topEffective}cm: ${getGlssaCombinations(topEffective)}
L = ${leftLength}cm: ${getGlssaCombinations(leftLength)}
R = ${rightLength}cm: ${getGlssaCombinations(rightLength)}
${hasBottomLeft ? `BL = ${leftToDoor}cm: ${getGlssaCombinations(leftToDoor)}` : 'BL: No seating needed'}
${hasBottomRight ? `BR = ${doorToRight}cm: ${getGlssaCombinations(doorToRight)}` : 'BR: No seating needed'}

## STEP 4: FIND WSSADA PIECES
**Corner pieces (58-60cm) go at wall junctions. Regular pieces (83-90cm) fill the rest.**
- L wall: 2 corner pieces (at TL and BL junctions) + regular pieces
- R wall: 2 corner pieces (at TR and BR junctions) + regular pieces
- T wall: NO corner pieces (corners owned by L and R) + regular pieces only
${hasBottomLeft ? '- BL wall: 1 corner piece (at L-BL junction) + regular pieces' : ''}
${hasBottomRight ? '- BR wall: 1 corner piece (at R-BR junction) + regular pieces' : ''}

**Wssada sum must be ≤ Glssa sum for each wall.**

## STEP 5: GENERATE IMAGE PROMPT
${IMAGE_STYLE_GUIDE}
Include: all 4 walls visible, door opening on bottom wall, corner pieces at junctions.

## REQUIRED JSON OUTPUT
{
  "cornerOwnership": {
    "topLeft": "L",
    "topRight": "R",
    "bottomLeft": ${hasBottomLeft ? '"L"' : 'null'},
    "bottomRight": ${hasBottomRight ? '"R"' : 'null'}
  },
  "walls": [
    {
      "wallId": "T",
      "inputLength": ${topLength},
      "effectiveLength": ${topEffective},
      "glssaPieces": [<each 110-190, sum = ${topEffective}>],
      "wssadaPieces": [<83-90cm regular pieces only>],
      "glssaTotal": ${topEffective},
      "wssadaTotal": <sum ≤ ${topEffective}>,
      "hasCornerPiece": false
    },
    {
      "wallId": "L",
      "inputLength": ${leftLength},
      "effectiveLength": ${leftLength},
      "glssaPieces": [<each 110-190, sum = ${leftLength}>],
      "wssadaPieces": [<corner 58-60cm + regular 83-90cm>],
      "glssaTotal": ${leftLength},
      "wssadaTotal": <sum ≤ ${leftLength}>,
      "hasCornerPiece": true
    },
    {
      "wallId": "R",
      "inputLength": ${rightLength},
      "effectiveLength": ${rightLength},
      "glssaPieces": [<each 110-190, sum = ${rightLength}>],
      "wssadaPieces": [<corner 58-60cm + regular 83-90cm>],
      "glssaTotal": ${rightLength},
      "wssadaTotal": <sum ≤ ${rightLength}>,
      "hasCornerPiece": true
    }${hasBottomLeft ? `,
    {
      "wallId": "BL",
      "inputLength": ${leftToDoor},
      "effectiveLength": ${leftToDoor},
      "glssaPieces": [<each 110-190, sum = ${leftToDoor}>],
      "wssadaPieces": [<corner + regular pieces>],
      "glssaTotal": ${leftToDoor},
      "wssadaTotal": <sum ≤ ${leftToDoor}>,
      "hasCornerPiece": true
    }` : ''}${hasBottomRight ? `,
    {
      "wallId": "BR",
      "inputLength": ${doorToRight},
      "effectiveLength": ${doorToRight},
      "glssaPieces": [<each 110-190, sum = ${doorToRight}>],
      "wssadaPieces": [<corner + regular pieces>],
      "glssaTotal": ${doorToRight},
      "wssadaTotal": <sum ≤ ${doorToRight}>,
      "hasCornerPiece": true
    }` : ''}
  ],
  "doorWidth": ${doorWidth},
  "reasoning": "<explain corner ownership and piece selection>",
  "imagePrompt": "<detailed 4-walls visualization with door>"
}`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function canCoverWithGlssa(length: number): boolean {
  if (length >= GLSSA_MIN && length <= GLSSA_MAX) return true;
  if (length >= 220 && length <= 380) return true; // 2 pieces
  if (length >= 330 && length <= 570) return true; // 3 pieces
  return false;
}

function getGlssaCombinations(length: number): string {
  const combinations: string[] = [];

  // Single piece
  if (length >= GLSSA_MIN && length <= GLSSA_MAX) {
    combinations.push(`[${length}] single`);
  }

  // Two pieces
  for (let a = GLSSA_MAX; a >= GLSSA_MIN; a--) {
    const b = length - a;
    if (b >= GLSSA_MIN && b <= GLSSA_MAX) {
      combinations.push(`[${a}, ${b}]`);
      if (combinations.length >= 3) break;
    }
  }

  // Three pieces for longer walls
  if (length >= 330 && combinations.length < 2) {
    for (let a = GLSSA_MAX; a >= 150; a -= 10) {
      for (let b = GLSSA_MAX; b >= GLSSA_MIN; b -= 10) {
        const c = length - a - b;
        if (c >= GLSSA_MIN && c <= GLSSA_MAX) {
          combinations.push(`[${a}, ${b}, ${c}]`);
          break;
        }
      }
      if (combinations.length >= 3) break;
    }
  }

  // Edge cases
  if (combinations.length === 0) {
    if (length > GLSSA_MAX && length < 220) {
      return `IMPOSSIBLE (${length}cm too short for 2 pieces). Use [110, 110] = 220cm`;
    }
    if (length < GLSSA_MIN) {
      return `TOO SHORT (${length}cm < ${GLSSA_MIN}cm minimum)`;
    }
    return `Need valid pieces summing to ~${length}cm`;
  }

  return combinations.join(' OR ');
}

// ============================================
// PROMPT BUILDER
// ============================================

export function buildPromptForLayout(
  layoutType: string,
  dimensions: Record<string, number>
): { systemPrompt: string; userPrompt: string } {
  let userPrompt: string;

  switch (layoutType) {
    case 'single-wall':
      userPrompt = buildSingleWallPrompt(dimensions.wallLength || dimensions.length || dimensions.single || 0);
      break;
    case 'l-shape':
      userPrompt = buildLShapePrompt(
        dimensions.horizontalLength || dimensions.h || 0,
        dimensions.verticalLength || dimensions.v || 0
      );
      break;
    case 'u-shape':
      userPrompt = buildUShapePrompt(
        dimensions.leftLength || dimensions.left || dimensions.l || 0,
        dimensions.centerLength || dimensions.center || dimensions.h || 0,
        dimensions.rightLength || dimensions.right || dimensions.r || 0
      );
      break;
    case 'four-walls':
      userPrompt = buildFourWallsPrompt(
        dimensions.topLength || dimensions.top || 0,
        dimensions.leftLength || dimensions.left || 0,
        dimensions.rightLength || dimensions.right || 0,
        dimensions.bottomLength || dimensions.bottom || 0,
        dimensions.leftToDoor || dimensions.bottomLeftToDoor || 0,
        dimensions.doorToRight || dimensions.doorToBottomRight || 0
      );
      break;
    default:
      throw new Error(`Unknown layout type: ${layoutType}`);
  }

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  };
}
