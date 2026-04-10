'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Minus, Plus, RotateCw, Trash2, X } from 'lucide-react';
import {
  GLSSA_MIN,
  GLSSA_MAX,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
} from '@/lib/ai-room-visualizer';

// ============================================
// TYPES
// ============================================

export interface PiecePopoverProps {
  wallId: string;
  pieceIndex: number;
  category: 'glssa' | 'wssada' | 'carpet';
  currentSize: number;
  isCornerPiece: boolean;
  onSizeChange: (size: number) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Display label for carpet pieces (e.g. "Zerbiya 100×150") */
  carpetLabel?: string;
  /** Dimensions info text for carpet pieces (e.g. "100 × 150 cm") */
  carpetDimensions?: string;
  /** Available carpet types for the dropdown */
  carpetTypes?: Array<{ id: number; label: string; widthCm: number; heightCm: number; price: number }>;
  /** Current carpet type ID */
  carpetTypeId?: number;
  /** Whether the carpet is rotated */
  carpetRotated?: boolean;
  /** Handler to change carpet type */
  onCarpetTypeChange?: (typeId: number) => void;
  /** Handler to toggle carpet rotation */
  onCarpetRotate?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function PiecePopover({
  wallId,
  pieceIndex,
  category,
  currentSize,
  isCornerPiece,
  onSizeChange,
  onDelete,
  onClose,
  carpetLabel,
  carpetDimensions,
  carpetTypes,
  carpetTypeId,
  carpetRotated,
  onCarpetTypeChange,
  onCarpetRotate,
}: PiecePopoverProps) {
  // Determine size constraints based on category and corner status
  const { min, max, label } = useMemo(() => {
    if (category === 'carpet') {
      return {
        min: 0,
        max: 0,
        label: carpetLabel || 'Zerbiya',
      };
    }
    if (category === 'glssa') {
      return {
        min: GLSSA_MIN,
        max: GLSSA_MAX,
        label: 'Glssa',
      };
    }
    if (isCornerPiece) {
      return {
        min: WSSADA_CORNER_MIN,
        max: WSSADA_CORNER_MAX,
        label: 'Wssada Coin',
      };
    }
    return {
      min: WSSADA_REGULAR_MIN,
      max: WSSADA_REGULAR_MAX,
      label: 'Wssada',
    };
  }, [category, isCornerPiece, carpetLabel]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Clamp value to valid range
  const clamp = useCallback(
    (value: number) => Math.max(min, Math.min(max, value)),
    [min, max],
  );

  const handleSizeInput = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onSizeChange(clamp(parsed));
  };

  const handleDecrement = () => {
    onSizeChange(clamp(currentSize - 1));
  };

  const handleIncrement = () => {
    onSizeChange(clamp(currentSize + 1));
  };

  // Prevent touch events from propagating to the canvas
  const stopTouchPropagation = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      dir="ltr"
      role="dialog"
      aria-label={`Modifier ${label} - ${wallId}`}
      className="bg-white/95 backdrop-blur-sm border border-stone-200 shadow-xl rounded-xl overflow-hidden w-[85vw] max-w-[280px] sm:w-auto"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={stopTouchPropagation}
      onTouchMove={stopTouchPropagation}
      onTouchEnd={stopTouchPropagation}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-800 truncate">
            {label}
            <span className="ml-1.5 text-[10px] font-normal text-stone-400">
              #{pieceIndex + 1}
            </span>
          </p>
          {category !== 'carpet' && (
            <p className="text-[10px] text-stone-400 leading-tight">{wallId}</p>
          )}
          {category === 'carpet' && carpetDimensions && (
            <p className="text-[10px] text-stone-400 leading-tight">{carpetDimensions}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 sm:p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-1 space-y-2.5">
        {category !== 'carpet' && (
          <>
            {/* Size label */}
            <label
              htmlFor={`popover-size-${wallId}-${pieceIndex}`}
              className="block text-[11px] text-stone-500"
            >
              Taille
            </label>

            {/* Stepper row */}
            <div className="flex items-center gap-1.5">
              {/* Decrement button */}
              <button
                type="button"
                onClick={handleDecrement}
                disabled={currentSize <= min}
                className="touch-manipulation flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Diminuer"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>

              {/* Editable value */}
              <div className="relative flex-1">
                <input
                  id={`popover-size-${wallId}-${pieceIndex}`}
                  type="number"
                  min={min}
                  max={max}
                  value={currentSize}
                  onChange={(e) => handleSizeInput(e.target.value)}
                  className="w-full h-10 sm:h-9 px-2 pr-8 text-center text-sm font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 pointer-events-none">
                  cm
                </span>
              </div>

              {/* Increment button */}
              <button
                type="button"
                onClick={handleIncrement}
                disabled={currentSize >= max}
                className="touch-manipulation flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Augmenter"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Constraint hint */}
            <p className="text-[10px] text-stone-400 text-center leading-tight">
              {min} – {max} cm
            </p>
          </>
        )}

        {/* Carpet type selector */}
        {category === 'carpet' && carpetTypes && carpetTypes.length > 0 && onCarpetTypeChange && (
          <div>
            <label
              htmlFor={`popover-carpet-type-${wallId}-${pieceIndex}`}
              className="block text-[11px] text-stone-500 mb-1"
            >
              Type
            </label>
            <select
              id={`popover-carpet-type-${wallId}-${pieceIndex}`}
              value={carpetTypeId ?? ''}
              onChange={(e) => onCarpetTypeChange(Number(e.target.value))}
              className="w-full h-9 sm:h-8 px-2 text-xs font-medium text-stone-800 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-colors"
            >
              {carpetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.widthCm}×{t.heightCm} cm) — {t.price} DH
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rotate + Delete row for carpet */}
        {category === 'carpet' ? (
          <div className="flex items-center gap-1.5">
            {onCarpetRotate && (
              <button
                type="button"
                onClick={onCarpetRotate}
                className="flex items-center justify-center gap-1.5 flex-1 h-9 sm:h-7 text-sm sm:text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors"
                aria-label="Pivoter"
              >
                <RotateCw size={13} className={carpetRotated ? 'rotate-90' : ''} />
                Pivoter
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 flex-1 h-9 sm:h-7 text-sm sm:text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
              Supprimer
            </button>
          </div>
        ) : (
          /* Delete button for non-carpet */
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 w-full h-9 sm:h-7 text-sm sm:text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
