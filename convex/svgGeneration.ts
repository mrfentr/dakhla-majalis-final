/**
 * Server-side SVG generation for room measurements
 * Generates static SVG strings that can be rendered as images
 * Avoids browser freezing with large SVGs by doing all rendering server-side
 */

export function generateSingleWallSVG(params: {
  wallLength: number;
  glssaPieces: number[];
  wssadaPieces: number[];
}): string {
  const { wallLength, glssaPieces, wssadaPieces } = params;

  // Constants - matching SingleWallPlacement.tsx exactly
  const pxPerCm = 2; // 2 pixels per cm for good quality
  const wallThickness = 70; // cm (NOT 80!)
  const margin = 50; // pixels
  const glssaColor = '#FEF3C7'; // Light yellow/cream for Glssa
  const glssaBorder = '#F59E0B'; // Orange border
  const coudoirColor = '#F59E0B'; // Orange for Coudoir
  const coudoirBorder = '#D97706'; // Darker orange
  const wssadaColor = '#1ed497'; // Green for Wssada (main)
  const wssadaBorder = '#117855'; // Dark green
  const wssada60Color = '#6ed4b1'; // Lighter green for 60cm pieces
  const wssada60Border = '#56a68b'; // Border for 60cm
  const voidColor = '#FEE2E2'; // Light red for void
  const voidBorder = '#EF4444'; // Red border
  const borderColor = '#374151'; // Dark gray for dimensions

  // Calculate coverage
  const glssaCoverage = glssaPieces.reduce((sum, n) => sum + n, 0);
  const glssaVoid = Math.max(0, wallLength - glssaCoverage);
  const wssadaFilled = wssadaPieces.reduce((sum, n) => sum + n, 0);
  const wssadaVoid = Math.max(0, glssaCoverage - wssadaFilled);

  // Convert to pixels
  const wallPx = wallLength * pxPerCm;
  const thicknessPx = wallThickness * pxPerCm; // 70cm * 2 = 140px
  const wssadaHeightPx = 10 * pxPerCm; // 10cm * 2 = 20px
  const coudoirWidthPx = 19 * pxPerCm; // 19cm
  const coudoirHeightPx = 48 * pxPerCm; // 48cm

  // SVG dimensions
  const svgWidth = wallPx + margin * 2;
  const svgHeight = thicknessPx + margin * 2 + 100; // Extra space for labels

  // Wall position
  const wallX = margin;
  const wallY = margin;

  // Build SVG parts
  const svgParts: string[] = [];

  // Background
  svgParts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#F9F9F9"/>`);

  // Wall background area
  svgParts.push(
    `<rect x="${wallX}" y="${wallY}" width="${wallPx}" height="${thicknessPx}" fill="#DBEAFE" stroke="#2563EB" stroke-width="1" opacity="0.3"/>`
  );

  // Glssa pieces (FULL HEIGHT)
  let currentX = wallX;
  glssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;

    // Glssa piece - full height
    svgParts.push(
      `<rect x="${currentX}" y="${wallY}" width="${piecePx}" height="${thicknessPx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );

    // Coudoir (armrest) in the middle - 10cm from top, 19cm x 48cm, centered
    const coudoirX = currentX + piecePx / 2 - coudoirWidthPx / 2;
    const coudoirY = wallY + 10 * pxPerCm;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${coudoirWidthPx}" height="${coudoirHeightPx}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );

    // Glssa measurement label (below piece, below dimension line)
    if (piecePx > 40) {
      svgParts.push(
        `<text x="${currentX + piecePx / 2}" y="${wallY + thicknessPx + 50}" text-anchor="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
      );
    }

    currentX += piecePx;
  });

  // Glssa void space (FULL HEIGHT)
  if (glssaVoid > 0) {
    const voidPx = glssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${wallY}" width="${voidPx}" height="${thicknessPx}" fill="${voidColor}" stroke="${voidBorder}" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Void label - positioned OUTSIDE above the void (horizontal)
    svgParts.push(
      `<text x="${currentX + voidPx / 2}" y="${wallY - 10}" text-anchor="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${glssaVoid}cm</text>`
    );
  }

  // Wssada pieces (10cm height, ON TOP)
  currentX = wallX;
  wssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;

    // Select color based on piece size
    const fillColor = piece === 60 ? wssada60Color : wssadaColor;
    const strokeColor = piece === 60 ? wssada60Border : wssadaBorder;

    // Wssada piece - 10cm height only
    svgParts.push(
      `<rect x="${currentX}" y="${wallY}" width="${piecePx}" height="${wssadaHeightPx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" opacity="1.0"/>`
    );

    // Wssada measurement label (inside if space, outside if not)
    if (piecePx > 40) {
      svgParts.push(
        `<text x="${currentX + piecePx / 2}" y="${wallY + wssadaHeightPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
      );
    }

    currentX += piecePx;
  });

  // Wssada void space (10cm height only)
  if (wssadaVoid > 0) {
    const voidPx = wssadaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${wallY}" width="${voidPx}" height="${wssadaHeightPx}" fill="${voidColor}" stroke="${voidBorder}" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Void label - positioned below the Wssada strip to avoid overlap with Glssa void label
    svgParts.push(
      `<text x="${currentX + voidPx / 2}" y="${wallY + wssadaHeightPx + 15}" text-anchor="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${wssadaVoid}cm</text>`
    );
  }

  // Add dimension line (moved to top)
  const dimensionY = wallY - 20;
  svgParts.push(
    `<line x1="${wallX}" y1="${dimensionY}" x2="${wallX + wallPx}" y2="${dimensionY}" stroke="${borderColor}" stroke-width="2"/>`
  );
  svgParts.push(
    `<line x1="${wallX}" y1="${dimensionY - 5}" x2="${wallX}" y2="${dimensionY + 5}" stroke="${borderColor}" stroke-width="2"/>`
  );
  svgParts.push(
    `<line x1="${wallX + wallPx}" y1="${dimensionY - 5}" x2="${wallX + wallPx}" y2="${dimensionY + 5}" stroke="${borderColor}" stroke-width="2"/>`
  );
  svgParts.push(
    `<text x="${wallX + wallPx / 2}" y="${dimensionY - 8}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${wallLength}cm</text>`
  );

  // Legend removed per client request

  // Combine all parts
  const svgContent = svgParts.join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    ${svgContent}
</svg>`;
}

export function generateLShapeSVG(params: {
  hLength: number;
  vLength: number;
  hGlssaPieces: number[];
  hWssadaPieces: number[];
  vGlssaPieces: number[];
  vWssadaPieces: number[];
  wssadaOwner?: 'horizontal' | 'vertical';
  owner?: 'horizontal' | 'vertical'; // Corner owner for Glssa layout
}): string {
  const { hLength, vLength, hGlssaPieces, hWssadaPieces, vGlssaPieces, vWssadaPieces, wssadaOwner, owner } = params;

  // Drawing constants (EXACT same as GlssaPlacement.tsx lines 170-172)
  const pxPerCm = 1.2;
  const wallThickness = 70; // cm

  // Colors (match GlssaPlacement)
  const glssaColor = '#FEF3C7';
  const glssaBorder = '#F59E0B';
  const wssadaColor = '#1ed497';
  const wssada60Color = '#6ed4b1';
  const wssadaBorder = '#117855';
  const coudoirColor = '#F59E0B';
  const coudoirBorder = '#D97706';
  const voidColor = '#FEE2E2';
  const borderColor = '#374151';

  // Convert to pixels
  const hWallPx = hLength * pxPerCm;
  const vWallPx = vLength * pxPerCm;
  const thicknessPx = wallThickness * pxPerCm;

  // Calculate dimensions for proper centering
  // The L-shape total width includes: vertical wall (thickness) + horizontal wall
  const totalLShapeWidth = thicknessPx + hWallPx;
  const totalLShapeHeight = vWallPx;

  // CRITICAL FIX: Need to see the vertical wall on the LEFT side
  // The vertical wall was being cut off - need MINIMAL left margin
  // Use very small left margin so the L-shape is positioned far left and vertical wall is visible
  const leftMargin = 50; // VERY SMALL - push L-shape to the left edge
  const rightMargin = 500; // Large right margin to balance
  const topMargin = 100;
  const bottomMargin = 100;

  // SVG dimensions
  const svgWidth = totalLShapeWidth + leftMargin + rightMargin;
  const svgHeight = totalLShapeHeight + topMargin + bottomMargin;

  // Corner position - vertical wall will be at x=200, should be visible now
  const cornerX = leftMargin;
  const cornerY = topMargin;

  // Coudoir dimensions
  const coudoirWidthPx = 19 * pxPerCm;
  const coudoirHeightPx = 48 * pxPerCm;
  const wssadaHeightPx = 10 * pxPerCm;

  // Determine layout based on owner (EXACT same logic as GlssaPlacement.tsx getGlssaLayout)
  const isHorizontalFirst = owner === 'horizontal' || !owner; // Default to horizontal-first

  // Wall positions based on corner owner - EXACT same as GlssaPlacement.tsx lines 300-323, 333-357
  let hWallX: number, hWallY: number, hWallWidth: number;
  let vWallX: number, vWallY: number, vWallHeight: number;

  if (isHorizontalFirst) {
    // Horizontal owns corner - EXACT same as lines 301-311
    hWallX = cornerX;
    hWallY = cornerY;
    hWallWidth = hWallPx;

    // Vertical below horizontal - EXACT same as lines 312-322
    vWallX = cornerX;
    vWallY = cornerY + thicknessPx;
    vWallHeight = vWallPx - thicknessPx;
  } else {
    // Vertical owns corner - EXACT same as lines 334-344
    hWallX = cornerX + thicknessPx;
    hWallY = cornerY;
    hWallWidth = hWallPx - thicknessPx;

    // Vertical full height - EXACT same as lines 345-355
    vWallX = cornerX;
    vWallY = cornerY;
    vWallHeight = vWallPx;
  }

  // Build SVG parts
  const svgParts: string[] = [];

  // Background
  svgParts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#F9F9F9"/>`);

  // === HORIZONTAL WALL ===
  // Wall background
  svgParts.push(
    `<rect x="${hWallX}" y="${hWallY}" width="${hWallWidth}" height="${thicknessPx}" fill="#DBEAFE" stroke="#2563EB" stroke-width="1" opacity="0.3"/>`
  );

  // Glssa layer - FULL HEIGHT with Coudoir inside (EXACT same as GlssaPlacement.tsx lines 577-622)
  let currentX = hWallX;
  hGlssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    // Glssa piece - full height (70cm)
    svgParts.push(
      `<rect x="${currentX}" y="${hWallY}" width="${piecePx}" height="${thicknessPx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );

    // Coudoir (armrest) centered, 10cm from top - EXACT same as lines 610-619
    const coudoirX = currentX + piecePx / 2 - coudoirWidthPx / 2;
    const coudoirY = hWallY + 10 * pxPerCm;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${coudoirWidthPx}" height="${coudoirHeightPx}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );

    // Glssa measurement label
    svgParts.push(
      `<text x="${currentX + piecePx / 2}" y="${hWallY + thicknessPx + 25}" text-anchor="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentX += piecePx;
  });

  // Glssa void space (EXACT same as lines 624-650)
  const hGlssaSum = hGlssaPieces.reduce((sum, piece) => sum + piece, 0);
  const hGlssaVoid = Math.max(0, (isHorizontalFirst ? hLength : hLength - wallThickness) - hGlssaSum);
  if (hGlssaVoid > 0) {
    const voidPx = hGlssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${hWallY}" width="${voidPx}" height="${thicknessPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Horizontal Glssa void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${currentX + voidPx / 2}" y="${hWallY + thicknessPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${hGlssaVoid}cm</text>`
    );
  }

  // === VERTICAL WALL ===
  // Wall background
  svgParts.push(
    `<rect x="${vWallX}" y="${vWallY}" width="${thicknessPx}" height="${vWallHeight}" fill="#DCFCE7" stroke="#16A34A" stroke-width="1" opacity="0.3"/>`
  );

  // Glssa layer (EXACT same as GlssaPlacement.tsx lines 652-698)
  let currentY = vWallY;
  vGlssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    // Glssa piece
    svgParts.push(
      `<rect x="${vWallX}" y="${currentY}" width="${thicknessPx}" height="${piecePx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );

    // Coudoir (armrest) - rotated for vertical wall - EXACT same as lines 685-695
    const coudoirX = vWallX + 10 * pxPerCm;
    const coudoirY = currentY + piecePx / 2 - coudoirWidthPx / 2;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${coudoirHeightPx}" height="${coudoirWidthPx}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );

    // Glssa measurement label
    svgParts.push(
      `<text x="${vWallX + thicknessPx + 15}" y="${currentY + piecePx / 2}" text-anchor="left" dominant-baseline="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Vertical Glssa void
  const vGlssaSum = vGlssaPieces.reduce((sum, piece) => sum + piece, 0);
  const vEffectiveLength = isHorizontalFirst ? vLength - wallThickness : vLength;
  const vGlssaVoid = Math.max(0, vEffectiveLength - vGlssaSum);
  if (vGlssaVoid > 0) {
    const voidPx = vGlssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${vWallX}" y="${currentY}" width="${thicknessPx}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Vertical Glssa void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${vWallX + thicknessPx / 2}" y="${currentY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${vGlssaVoid}cm</text>`
    );
  }

  // === WSSADA LAYER ===
  // Position Wssada pieces based on who owns the corner
  // Owner gets the corner space (70x10cm), non-owner starts 10cm offset from corner

  // Horizontal Wssada positioning
  const hWssadaStartX = (wssadaOwner === 'vertical') ? cornerX + (10 * pxPerCm) : cornerX;
  currentX = hWssadaStartX;
  hWssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    const fillColor = piece === 60 ? wssada60Color : wssadaColor;
    svgParts.push(
      `<rect x="${currentX}" y="${cornerY}" width="${piecePx}" height="${wssadaHeightPx}" fill="${fillColor}" stroke="${wssadaBorder}" stroke-width="2" opacity="1.0"/>`
    );
    // Label
    svgParts.push(
      `<text x="${currentX + piecePx / 2}" y="${cornerY + wssadaHeightPx / 2 - 4}" text-anchor="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentX += piecePx;
  });

  // Vertical Wssada positioning - offset from actual vertical wall start
  const vWssadaOffsetPx = (wssadaOwner === 'horizontal') ? (10 * pxPerCm) : 0;
  const vWssadaStartY = vWallY + vWssadaOffsetPx; // Use vWallY, not cornerY!
  currentY = vWssadaStartY;
  vWssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    const fillColor = piece === 60 ? wssada60Color : wssadaColor;
    svgParts.push(
      `<rect x="${cornerX}" y="${currentY}" width="${wssadaHeightPx}" height="${piecePx}" fill="${fillColor}" stroke="${wssadaBorder}" stroke-width="2" opacity="1.0"/>`
    );
    // Label rotated
    const textX = cornerX + wssadaHeightPx / 2;
    const textY = currentY + piecePx / 2;
    svgParts.push(
      `<text x="${textX - 10}" y="${textY}" text-anchor="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="14" font-weight="bold" transform="rotate(-90 ${textX - 10} ${textY})">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Wssada voids - match client-side logic (use full wall length minus corner offset)
  const hWssadaSum = hWssadaPieces.reduce((sum, piece) => sum + piece, 0);
  const vWssadaSum = vWssadaPieces.reduce((sum, piece) => sum + piece, 0);

  // Match client-side: Wssada target is full wall length minus corner offset
  const hCornerOffset = wssadaOwner === 'vertical' ? 10 : 0;
  const vCornerOffset = wssadaOwner === 'horizontal' ? 10 : 0;
  const hWssadaVoid = Math.max(0, (hLength - hCornerOffset) - hWssadaSum);
  const vWssadaVoid = Math.max(0, (vLength - vCornerOffset) - vWssadaSum);

  // Horizontal Wssada void
  if (hWssadaVoid > 0) {
    const voidPx = hWssadaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${cornerY}" width="${voidPx}" height="${wssadaHeightPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Horizontal Wssada void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${currentX + voidPx / 2}" y="${cornerY + wssadaHeightPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${hWssadaVoid}cm</text>`
    );
  }

  // Vertical Wssada void
  if (vWssadaVoid > 0) {
    const voidPx = vWssadaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${cornerX}" y="${currentY}" width="${wssadaHeightPx}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Vertical Wssada void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${cornerX + wssadaHeightPx / 2}" y="${currentY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${vWssadaVoid}cm</text>`
    );
  }

  // Wall dimension lines (EXACT same as GlssaPlacement.tsx lines 865-919)
  // Horizontal dimension
  svgParts.push(
    `<line x1="${cornerX}" y1="${cornerY - 20}" x2="${cornerX + hWallPx}" y2="${cornerY - 20}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${cornerX}" y1="${cornerY - 25}" x2="${cornerX}" y2="${cornerY - 15}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${cornerX + hWallPx}" y1="${cornerY - 25}" x2="${cornerX + hWallPx}" y2="${cornerY - 15}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<text x="${cornerX + hWallPx / 2}" y="${cornerY - 28}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="500">${hLength}cm</text>`
  );

  // Vertical dimension
  svgParts.push(
    `<line x1="${cornerX - 20}" y1="${cornerY}" x2="${cornerX - 20}" y2="${cornerY + vWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${cornerX - 25}" y1="${cornerY}" x2="${cornerX - 15}" y2="${cornerY}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${cornerX - 25}" y1="${cornerY + vWallPx}" x2="${cornerX - 15}" y2="${cornerY + vWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<text x="${cornerX - 40}" y="${cornerY + vWallPx / 2}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="500">${vLength}cm</text>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    ${svgParts.join('\n    ')}
</svg>`;
}

export function generateUShapeSVG(params: {
  hLength: number;
  lLength: number;
  rLength: number;
  hGlssaPieces: number[];
  hWssadaPieces: number[];
  lGlssaPieces: number[];
  lWssadaPieces: number[];
  rGlssaPieces: number[];
  rWssadaPieces: number[];
  wssadaOwnerLeft?: 'back' | 'left';
  wssadaOwnerRight?: 'back' | 'right';
}): string {
  const {
    hLength, lLength, rLength,
    hGlssaPieces, hWssadaPieces,
    lGlssaPieces, lWssadaPieces,
    rGlssaPieces, rWssadaPieces,
    wssadaOwnerLeft, wssadaOwnerRight
  } = params;

  console.log('🎨 [SVG-GEN] generateUShapeSVG STARTED', {
    hLength, lLength, rLength,
    hGlssa: hGlssaPieces.length,
    lGlssa: lGlssaPieces.length,
    rGlssa: rGlssaPieces.length,
    wssadaOwnerLeft,
    wssadaOwnerRight
  });

  // Constants - matching UShapePlacement.tsx
  const pxPerCm = 1.2;
  const wallThickness = 70;
  const margin = 100;
  const glssaColor = '#FEF3C7';
  const glssaBorder = '#F59E0B';
  const wssadaColor = '#1ed497';
  const wssadaBorder = '#117855';
  const coudoirColor = '#F59E0B';
  const coudoirBorder = '#D97706';
  const voidColor = '#FEE2E2';
  const borderColor = '#374151';

  // Convert to pixels
  const hWallPx = hLength * pxPerCm;
  const lWallPx = lLength * pxPerCm;
  const rWallPx = rLength * pxPerCm;
  const thicknessPx = wallThickness * pxPerCm;

  // SVG dimensions
  const svgWidth = hWallPx + margin * 2;
  const svgHeight = Math.max(lWallPx, rWallPx) + margin * 2 + thicknessPx;

  // Corner positions
  const leftCornerX = margin;
  const leftCornerY = margin;
  const rightCornerX = margin + hWallPx;
  const rightCornerY = margin;

  const svgParts: string[] = [];

  // Calculate positions for all walls first
  // === HORIZONTAL (BACK) WALL ===
  let hEffectiveLength = hLength;
  let hStartX = leftCornerX;
  if (wssadaOwnerLeft !== 'back') hEffectiveLength -= wallThickness;
  if (wssadaOwnerRight !== 'back') hEffectiveLength -= wallThickness;
  if (wssadaOwnerLeft !== 'back') hStartX += thicknessPx;
  const hEffectivePx = Math.max(0, hEffectiveLength * pxPerCm);

  // === LEFT VERTICAL WALL ===
  let lEffectiveLength = wssadaOwnerLeft === 'left' ? lLength : Math.max(0, lLength - wallThickness);
  const lStartY = wssadaOwnerLeft === 'left' ? leftCornerY : leftCornerY + thicknessPx;
  const lEffectivePx = lEffectiveLength * pxPerCm;

  // === RIGHT VERTICAL WALL ===
  let rEffectiveLength = wssadaOwnerRight === 'right' ? rLength : Math.max(0, rLength - wallThickness);
  const rStartY = wssadaOwnerRight === 'right' ? rightCornerY : rightCornerY + thicknessPx;
  const rStartX = rightCornerX - thicknessPx;
  const rEffectivePx = rEffectiveLength * pxPerCm;

  // === LAYER 1: ALL WALL BACKGROUNDS ===
  svgParts.push(
    `<rect x="${hStartX}" y="${leftCornerY}" width="${hEffectivePx}" height="${thicknessPx}" fill="#DCFCE7" stroke="#16A34A" stroke-width="1" opacity="0.3"/>`
  );
  svgParts.push(
    `<rect x="${leftCornerX}" y="${lStartY}" width="${thicknessPx}" height="${lEffectivePx}" fill="#DCFCE7" stroke="#16A34A" stroke-width="1" opacity="0.3"/>`
  );
  svgParts.push(
    `<rect x="${rStartX}" y="${rStartY}" width="${thicknessPx}" height="${rEffectivePx}" fill="#DCFCE7" stroke="#16A34A" stroke-width="1" opacity="0.3"/>`
  );

  // === LAYER 2: ALL GLSSA PIECES WITH COUDOIRS AND LABELS ===
  // Horizontal Glssa
  let currentX = hStartX;
  hGlssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${leftCornerY}" width="${piecePx}" height="${thicknessPx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    // Coudoir
    const coudoirX = currentX + piecePx / 2 - (19 * pxPerCm) / 2;
    const coudoirY = leftCornerY + 10 * pxPerCm;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${19 * pxPerCm}" height="${48 * pxPerCm}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );
    // Label
    svgParts.push(
      `<text x="${currentX + piecePx / 2}" y="${leftCornerY - 8}" text-anchor="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentX += piecePx;
  });

  // Horizontal Glssa void
  const hGlssaSum = hGlssaPieces.reduce((sum, piece) => sum + piece, 0);
  const hGlssaVoid = Math.max(0, hEffectiveLength - hGlssaSum);
  if (hGlssaVoid > 0) {
    const voidPx = hGlssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${leftCornerY}" width="${voidPx}" height="${thicknessPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Horizontal Glssa void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${currentX + voidPx / 2}" y="${leftCornerY + thicknessPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${hGlssaVoid}cm</text>`
    );
  }

  // Left Glssa
  let currentY = lStartY;
  lGlssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${leftCornerX}" y="${currentY}" width="${thicknessPx}" height="${piecePx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    // Coudoir (rotated)
    const coudoirX = leftCornerX + 10 * pxPerCm;
    const coudoirY = currentY + piecePx / 2 - (19 * pxPerCm) / 2;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${48 * pxPerCm}" height="${19 * pxPerCm}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );
    // Label
    svgParts.push(
      `<text x="${leftCornerX + thicknessPx + 15}" y="${currentY + piecePx / 2}" text-anchor="left" dominant-baseline="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Left Glssa void
  const lGlssaSum = lGlssaPieces.reduce((sum, piece) => sum + piece, 0);
  const lGlssaVoid = Math.max(0, lEffectiveLength - lGlssaSum);
  if (lGlssaVoid > 0) {
    const voidPx = lGlssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${leftCornerX}" y="${currentY}" width="${thicknessPx}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Left Glssa void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${leftCornerX + thicknessPx / 2}" y="${currentY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${lGlssaVoid}cm</text>`
    );
  }

  // Right Glssa
  currentY = rStartY;
  rGlssaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${rStartX}" y="${currentY}" width="${thicknessPx}" height="${piecePx}" fill="${glssaColor}" stroke="${glssaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    // Coudoir (rotated)
    const coudoirX = rStartX + 10 * pxPerCm;
    const coudoirY = currentY + piecePx / 2 - (19 * pxPerCm) / 2;
    svgParts.push(
      `<rect x="${coudoirX}" y="${coudoirY}" width="${48 * pxPerCm}" height="${19 * pxPerCm}" fill="${coudoirColor}" stroke="${coudoirBorder}" stroke-width="1" rx="3"/>`
    );
    // Label
    svgParts.push(
      `<text x="${rStartX - 15}" y="${currentY + piecePx / 2}" text-anchor="end" dominant-baseline="middle" fill="#B45309" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Right Glssa void
  const rGlssaSum = rGlssaPieces.reduce((sum, piece) => sum + piece, 0);
  const rGlssaVoid = Math.max(0, rEffectiveLength - rGlssaSum);
  if (rGlssaVoid > 0) {
    const voidPx = rGlssaVoid * pxPerCm;
    svgParts.push(
      `<rect x="${rStartX}" y="${currentY}" width="${thicknessPx}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Right Glssa void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${rStartX + thicknessPx / 2}" y="${currentY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="12" font-weight="bold" dir="rtl">فراغ ${rGlssaVoid}cm</text>`
    );
  }

  // === LAYER 3: ALL WSSADA PIECES WITH LABELS (ON TOP) ===
  // Horizontal Wssada ALWAYS starts at leftCornerX to create corner overlap (matching L-shape logic)
  const hWssadaStartX = leftCornerX;

  currentX = hWssadaStartX;
  hWssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${currentX}" y="${leftCornerY}" width="${piecePx}" height="${10 * pxPerCm}" fill="${wssadaColor}" stroke="${wssadaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    svgParts.push(
      `<text x="${currentX + piecePx / 2}" y="${leftCornerY + 5 * pxPerCm}" text-anchor="middle" dominant-baseline="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${piece}cm</text>`
    );
    currentX += piecePx;
  });

  // Left Wssada - ALWAYS starts at leftCornerY
  currentY = leftCornerY;
  lWssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${leftCornerX}" y="${currentY}" width="${10 * pxPerCm}" height="${piecePx}" fill="${wssadaColor}" stroke="${wssadaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    const textX = leftCornerX + 5 * pxPerCm;
    const textY = currentY + piecePx / 2;
    svgParts.push(
      `<text x="${textX - 10}" y="${textY}" text-anchor="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="10" font-weight="bold" transform="rotate(-90 ${textX - 10} ${textY})">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Right Wssada - ALWAYS starts at rightCornerY
  const rWssadaX = rStartX + thicknessPx - (10 * pxPerCm);
  currentY = rightCornerY;
  rWssadaPieces.forEach((piece) => {
    const piecePx = piece * pxPerCm;
    svgParts.push(
      `<rect x="${rWssadaX}" y="${currentY}" width="${10 * pxPerCm}" height="${piecePx}" fill="${wssadaColor}" stroke="${wssadaBorder}" stroke-width="2" opacity="0.9"/>`
    );
    const textX = rWssadaX + 5 * pxPerCm;
    const textY = currentY + piecePx / 2;
    svgParts.push(
      `<text x="${textX - 10}" y="${textY}" text-anchor="middle" fill="#065F46" font-family="Arial, sans-serif" font-size="10" font-weight="bold" transform="rotate(-90 ${textX - 10} ${textY})">${piece}cm</text>`
    );
    currentY += piecePx;
  });

  // Wssada voids - calculate for each wall
  const hWssadaSum = hWssadaPieces.reduce((sum, piece) => sum + piece, 0);
  const lWssadaSum = lWssadaPieces.reduce((sum, piece) => sum + piece, 0);
  const rWssadaSum = rWssadaPieces.reduce((sum, piece) => sum + piece, 0);

  // Calculate corner offsets (similar to L-shape logic)
  const hCornerOffsetLeft = wssadaOwnerLeft !== 'back' ? 10 : 0;
  const hCornerOffsetRight = wssadaOwnerRight !== 'back' ? 10 : 0;
  const lCornerOffset = wssadaOwnerLeft === 'back' ? 10 : 0;
  const rCornerOffset = wssadaOwnerRight === 'back' ? 10 : 0;

  const hWssadaVoid = Math.max(0, (hLength - hCornerOffsetLeft - hCornerOffsetRight) - hWssadaSum);
  const lWssadaVoid = Math.max(0, (lLength - lCornerOffset) - lWssadaSum);
  const rWssadaVoid = Math.max(0, (rLength - rCornerOffset) - rWssadaSum);

  // Horizontal Wssada void
  if (hWssadaVoid > 0) {
    const voidPx = hWssadaVoid * pxPerCm;
    const voidX = leftCornerX + hWssadaSum * pxPerCm;
    svgParts.push(
      `<rect x="${voidX}" y="${leftCornerY}" width="${voidPx}" height="${10 * pxPerCm}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Horizontal Wssada void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${voidX + voidPx / 2}" y="${leftCornerY + 5 * pxPerCm}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${hWssadaVoid}cm</text>`
    );
  }

  // Left Wssada void
  if (lWssadaVoid > 0) {
    const voidPx = lWssadaVoid * pxPerCm;
    const voidY = leftCornerY + lWssadaSum * pxPerCm;
    svgParts.push(
      `<rect x="${leftCornerX}" y="${voidY}" width="${10 * pxPerCm}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Left Wssada void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${leftCornerX + 5 * pxPerCm}" y="${voidY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${lWssadaVoid}cm</text>`
    );
  }

  // Right Wssada void
  if (rWssadaVoid > 0) {
    const voidPx = rWssadaVoid * pxPerCm;
    const voidY = rightCornerY + rWssadaSum * pxPerCm;
    svgParts.push(
      `<rect x="${rWssadaX}" y="${voidY}" width="${10 * pxPerCm}" height="${voidPx}" fill="${voidColor}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,6" opacity="0.8"/>`
    );
    // Right Wssada void label - positioned INSIDE the void rectangle
    svgParts.push(
      `<text x="${rWssadaX + 5 * pxPerCm}" y="${voidY + voidPx / 2}" text-anchor="middle" dominant-baseline="middle" fill="#DC2626" font-family="Arial, sans-serif" font-size="10" font-weight="bold" dir="rtl">فراغ ${rWssadaVoid}cm</text>`
    );
  }

  // Dimension lines
  // Horizontal dimension
  svgParts.push(
    `<line x1="${leftCornerX}" y1="${leftCornerY - 20}" x2="${leftCornerX + hWallPx}" y2="${leftCornerY - 20}" stroke="${borderColor}" stroke-width="1"/>`
  );
  // Tick marks
  svgParts.push(
    `<line x1="${leftCornerX}" y1="${leftCornerY - 25}" x2="${leftCornerX}" y2="${leftCornerY - 15}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${leftCornerX + hWallPx}" y1="${leftCornerY - 25}" x2="${leftCornerX + hWallPx}" y2="${leftCornerY - 15}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<text x="${leftCornerX + hWallPx / 2}" y="${leftCornerY - 28}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="500">${hLength}cm</text>`
  );

  // Left vertical dimension
  svgParts.push(
    `<line x1="${leftCornerX - 20}" y1="${leftCornerY}" x2="${leftCornerX - 20}" y2="${leftCornerY + lWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  // Tick marks
  svgParts.push(
    `<line x1="${leftCornerX - 25}" y1="${leftCornerY}" x2="${leftCornerX - 15}" y2="${leftCornerY}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${leftCornerX - 25}" y1="${leftCornerY + lWallPx}" x2="${leftCornerX - 15}" y2="${leftCornerY + lWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<text x="${leftCornerX - 40}" y="${leftCornerY + lWallPx / 2}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="500">${lLength}cm</text>`
  );

  // Right vertical dimension
  svgParts.push(
    `<line x1="${rightCornerX + 20}" y1="${rightCornerY}" x2="${rightCornerX + 20}" y2="${rightCornerY + rWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  // Tick marks
  svgParts.push(
    `<line x1="${rightCornerX + 15}" y1="${rightCornerY}" x2="${rightCornerX + 25}" y2="${rightCornerY}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<line x1="${rightCornerX + 15}" y1="${rightCornerY + rWallPx}" x2="${rightCornerX + 25}" y2="${rightCornerY + rWallPx}" stroke="${borderColor}" stroke-width="1"/>`
  );
  svgParts.push(
    `<text x="${rightCornerX + 40}" y="${rightCornerY + rWallPx / 2}" text-anchor="middle" fill="${borderColor}" font-family="Arial, sans-serif" font-size="14" font-weight="500">${rLength}cm</text>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    ${svgParts.join('\n    ')}
</svg>`;
}
