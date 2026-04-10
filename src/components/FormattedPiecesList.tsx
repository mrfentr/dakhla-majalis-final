'use client';

// Shared utility: format pieces into lines for canvas drawing / JPEG export
export function formatPiecesLines(
  glssaPieces: number[],
  wssadaPieces: number[],
  totalGlssa: number,
  poufsCount: number = 0
): string[] {
  const groupBySize = (pieces: number[]) => {
    const grouped = new Map<number, number>();
    pieces.forEach(p => {
      const r = Math.round(p);
      grouped.set(r, (grouped.get(r) || 0) + 1);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  };
  const fmtSize = (size: number) => {
    const m = Math.floor(size / 100), cm = size % 100;
    return m > 0 ? `${m}m${cm > 0 ? cm.toString().padStart(2, '0') : ''}` : `${cm}`;
  };
  const lines: string[] = [];
  groupBySize(glssaPieces).forEach(([size, count]) => {
    lines.push(`${count}: HD ${fmtSize(size)}×70×14`);
  });
  if (totalGlssa > 0) {
    lines.push(`${totalGlssa}: HD 49×20×20`);
  }
  groupBySize(wssadaPieces).forEach(([size, count]) => {
    lines.push(`${count}: HD ${fmtSize(size)}×43×10`);
  });
  if (poufsCount > 0) {
    lines.push(`${poufsCount}: HD 60×60×20`);
  }
  return lines;
}

interface CarpetInfo {
  name: string;
  width: number;
  height: number;
  price?: number;
}

interface FormattedPiecesListProps {
  glssaPieces?: number[];
  wssadaPieces?: number[];
  totalGlssa?: number;
  totalWssada?: number;
  totalZerbiya?: number;
  includeZerbiya?: boolean;
  poufsCount?: number;
  carpets?: CarpetInfo[];
  className?: string;
  title?: string;
}

export default function FormattedPiecesList({
  glssaPieces = [],
  wssadaPieces = [],
  totalGlssa = 0,
  totalWssada = 0,
  totalZerbiya = 0,
  includeZerbiya = false,
  poufsCount = 0,
  carpets = [],
  className = '',
  title = 'قائمة القطع المطلوبة'
}: FormattedPiecesListProps) {
  // Group pieces by size and count them
  const groupPiecesBySize = (pieces: number[]) => {
    const grouped = new Map<number, number>();
    pieces.forEach(piece => {
      const rounded = Math.round(piece);
      grouped.set(rounded, (grouped.get(rounded) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0]) // Sort by size descending
      .map(([size, count]) => ({ size, count }));
  };

  const formatPiecesList = () => {
    const lines: string[] = [];

    // Glssa pieces
    if (glssaPieces.length > 0) {
      const groupedGlssa = groupPiecesBySize(glssaPieces);
      groupedGlssa.forEach(({ size, count }) => {
        const meters = Math.floor(size / 100);
        const cm = size % 100;
        const sizeStr = meters > 0 ? `${meters}m${cm > 0 ? cm.toString().padStart(2, '0') : ''}` : `${cm}`;
        lines.push(`${count}: HD ${sizeStr}×70×14`);
      });
    }

    // Coudoir (HD 49×20×20) - same count as Glssa
    if (totalGlssa > 0) {
      lines.push(`${totalGlssa}: HD 49×20×20`);
    }

    // Wssada pieces
    if (wssadaPieces.length > 0) {
      const groupedWssada = groupPiecesBySize(wssadaPieces);
      groupedWssada.forEach(({ size, count }) => {
        const meters = Math.floor(size / 100);
        const cm = size % 100;
        const sizeStr = meters > 0 ? `${meters}m${cm > 0 ? cm.toString().padStart(2, '0') : ''}` : `${cm}`;
        lines.push(`${count}: HD ${sizeStr}×43×10`);
      });
    }

    // Zerbiya (Carpets) - use actual carpet data from backend
    if (includeZerbiya && carpets.length > 0) {
      // Group carpets by name
      const carpetGroups = new Map<string, number>();
      carpets.forEach(carpet => {
        const name = carpet.name || `زربية ${carpet.width}×${carpet.height}`;
        carpetGroups.set(name, (carpetGroups.get(name) || 0) + 1);
      });
      carpetGroups.forEach((count, name) => {
        lines.push(`${count}: ${name}`);
      });
    } else if (includeZerbiya && totalZerbiya > 0) {
      // Fallback to count only if no carpet details available
      lines.push(`${totalZerbiya}: زربية`);
    }

    // Poufs
    if (poufsCount && poufsCount > 0) {
      lines.push(`${poufsCount}: HD 60×60×20`);
    }

    return lines;
  };

  const formattedData = formatPiecesList();

  if (formattedData.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-neutral-200 p-3 ${className}`}>
      <h4 className="text-xs font-semibold text-neutral-600 mb-2 pb-1.5 border-b border-neutral-100" style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
        {title}
      </h4>
      <div className="space-y-1 text-neutral-800">
        {formattedData.map((line, index) => (
          <div
            key={index}
            className="py-0.5 px-1.5 hover:bg-neutral-50 rounded transition-colors"
          >
            <span className="font-mono text-xs font-semibold">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
