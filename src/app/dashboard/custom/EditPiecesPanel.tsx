'use client';

import { useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, RotateCw } from 'lucide-react';
import {
  GLSSA_MIN,
  GLSSA_MAX,
  WSSADA_REGULAR_MIN,
  WSSADA_REGULAR_MAX,
  WSSADA_CORNER_MIN,
  WSSADA_CORNER_MAX,
} from '@/lib/ai-room-visualizer';
import { getCarpetDisplayLabel } from '@/lib/ai-room-visualizer';
import type { MultiCarpetResult } from '@/lib/ai-room-visualizer';

// ============================================
// TYPES
// ============================================

export interface EditablePiece {
  id: string;
  size: number;
  isCornerPiece: boolean;
}

export interface EditableWall {
  wallId: string;
  glssaEffective: number;
  wssadaEffective: number;
  wssadaSide: string;
  glssaPieces: EditablePiece[];
  wssadaPieces: EditablePiece[];
}

interface EditPiecesPanelProps {
  walls: EditableWall[];
  onWallsChange: (walls: EditableWall[]) => void;
  selectedWallId?: string | null;
  selectedPieceIndex?: number | null;
  selectedCategory?: 'glssa' | 'wssada' | 'carpet' | null;
  // Carpet props (multi-carpet combos)
  includeCarpet?: boolean;
  onIncludeCarpetChange?: (include: boolean) => void;
  carpetCombo?: MultiCarpetResult | null;
  allCombos?: MultiCarpetResult[];
  onComboChange?: (index: number) => void;
  onAddCarpet?: () => void;
  onRemoveCarpet?: (index: number) => void;
  /** Handler to change a carpet's type */
  onChangeCarpetType?: (index: number, newTypeId: number) => void;
  /** Handler to toggle a carpet's rotation */
  onToggleCarpetRotation?: (index: number) => void;
  /** All available carpet types for the dropdown */
  allCarpetTypes?: Array<{ id: number; widthCm: number; heightCm: number; price: number; label?: string }>;
  // Pouf props
  includePoufs?: boolean;
  onIncludePoufsChange?: (include: boolean) => void;
  poufsCount?: number;
  onPoufsCountChange?: (count: number) => void;
  pricePerPouf?: number;
}

// ============================================
// HELPERS
// ============================================

let _pieceIdCounter = 0;
export function generatePieceId(): string {
  return `ep-${Date.now()}-${_pieceIdCounter++}`;
}

// ============================================
// COMPONENT
// ============================================

export default function EditPiecesPanel({
  walls, onWallsChange, selectedWallId, selectedPieceIndex, selectedCategory,
  includeCarpet, onIncludeCarpetChange, carpetCombo, allCombos, onComboChange,
  onAddCarpet, onRemoveCarpet, onChangeCarpetType, onToggleCarpetRotation, allCarpetTypes,
  includePoufs, onIncludePoufsChange, poufsCount, onPoufsCountChange, pricePerPouf,
}: EditPiecesPanelProps) {
  const updateWall = useCallback(
    (wallIndex: number, updater: (wall: EditableWall) => EditableWall) => {
      onWallsChange(walls.map((w, i) => (i === wallIndex ? updater(w) : w)));
    },
    [walls, onWallsChange]
  );

  // --- Glssa handlers ---
  const updateGlssaSize = useCallback(
    (wi: number, pi: number, size: number) => {
      updateWall(wi, (w) => ({
        ...w,
        glssaPieces: w.glssaPieces.map((p, i) => (i === pi ? { ...p, size } : p)),
      }));
    },
    [updateWall]
  );

  const addGlssa = useCallback(
    (wi: number) => {
      updateWall(wi, (w) => ({
        ...w,
        glssaPieces: [
          ...w.glssaPieces,
          { id: generatePieceId(), size: 150, isCornerPiece: false },
        ],
      }));
    },
    [updateWall]
  );

  const removeGlssa = useCallback(
    (wi: number, pi: number) => {
      updateWall(wi, (w) => ({
        ...w,
        glssaPieces: w.glssaPieces.filter((_, i) => i !== pi),
      }));
    },
    [updateWall]
  );

  const moveGlssa = useCallback(
    (wi: number, pi: number, dir: 'up' | 'down') => {
      updateWall(wi, (w) => {
        const pieces = [...w.glssaPieces];
        const ti = dir === 'up' ? pi - 1 : pi + 1;
        if (ti < 0 || ti >= pieces.length) return w;
        [pieces[pi], pieces[ti]] = [pieces[ti], pieces[pi]];
        return { ...w, glssaPieces: pieces };
      });
    },
    [updateWall]
  );

  // --- Wssada handlers ---
  const updateWssadaSize = useCallback(
    (wi: number, pi: number, size: number) => {
      updateWall(wi, (w) => ({
        ...w,
        wssadaPieces: w.wssadaPieces.map((p, i) => (i === pi ? { ...p, size } : p)),
      }));
    },
    [updateWall]
  );

  const addWssada = useCallback(
    (wi: number, isCorner: boolean) => {
      updateWall(wi, (w) => ({
        ...w,
        wssadaPieces: [
          ...w.wssadaPieces,
          {
            id: generatePieceId(),
            size: isCorner ? WSSADA_CORNER_MIN : 85,
            isCornerPiece: isCorner,
          },
        ],
      }));
    },
    [updateWall]
  );

  const removeWssada = useCallback(
    (wi: number, pi: number) => {
      updateWall(wi, (w) => ({
        ...w,
        wssadaPieces: w.wssadaPieces.filter((_, i) => i !== pi),
      }));
    },
    [updateWall]
  );

  const moveWssada = useCallback(
    (wi: number, pi: number, dir: 'up' | 'down') => {
      updateWall(wi, (w) => {
        const pieces = [...w.wssadaPieces];
        const ti = dir === 'up' ? pi - 1 : pi + 1;
        if (ti < 0 || ti >= pieces.length) return w;
        [pieces[pi], pieces[ti]] = [pieces[ti], pieces[pi]];
        return { ...w, wssadaPieces: pieces };
      });
    },
    [updateWall]
  );

  // --- Totals ---
  const totalGlssa = walls.reduce((s, w) => s + w.glssaPieces.length, 0);
  const totalWssada = walls.reduce((s, w) => s + w.wssadaPieces.length, 0);
  const totalCorner = walls.reduce(
    (s, w) => s + w.wssadaPieces.filter((p) => p.isCornerPiece).length,
    0
  );
  const totalGlssaVoid = walls.reduce(
    (s, w) => s + (w.glssaEffective - w.glssaPieces.reduce((a, p) => a + p.size, 0)),
    0
  );

  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pl-1 -mr-1 pr-2">
      {walls.map((wall, wi) => {
        const gTotal = wall.glssaPieces.reduce((s, p) => s + p.size, 0);
        const wTotal = wall.wssadaPieces.reduce((s, p) => s + p.size, 0);
        const gVoid = wall.glssaEffective - gTotal;
        const wVoid = wall.wssadaEffective - wTotal;

        return (
          <div key={wall.wallId} className={`bg-stone-50 rounded-xl p-3 border border-stone-200 ${wall.wallId === selectedWallId ? 'ring-2 ring-amber-400' : ''}`}>
            {/* Wall header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-xs font-bold text-stone-800">{wall.wallId}</span>
              <div className="flex gap-2 text-[10px] text-stone-400">
                <span>G:{wall.glssaEffective}cm</span>
                <span>W:{wall.wssadaEffective}cm</span>
              </div>
            </div>

            {/* Glssa section */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Glssa ({wall.glssaPieces.length})
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    gVoid === 0
                      ? 'text-emerald-600'
                      : gVoid > 0
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}
                >
                  {gTotal}/{wall.glssaEffective}cm
                  {gVoid !== 0 &&
                    ` (${gVoid > 0 ? 'Vide' : 'Dépassement'}: ${Math.abs(gVoid)}cm)`}
                </span>
              </div>

              <div className="space-y-1">
                {wall.glssaPieces.map((piece, pi) => {
                  const valid = piece.size >= GLSSA_MIN && piece.size <= GLSSA_MAX;
                  const isSelectedGlssa = wall.wallId === selectedWallId && pi === selectedPieceIndex && selectedCategory === 'glssa';
                  return (
                    <div key={piece.id} className={`flex items-center gap-1 ${isSelectedGlssa ? 'bg-amber-100 ring-1 ring-amber-400 rounded' : ''}`}>
                      <div className="flex flex-col -space-y-0.5">
                        <button
                          onClick={() => moveGlssa(wi, pi, 'up')}
                          disabled={pi === 0}
                          className="text-stone-300 hover:text-stone-600 disabled:opacity-20 p-0 touch-manipulation"
                        >
                          <ChevronUp className="w-4 h-4 sm:w-3 sm:h-3" />
                        </button>
                        <button
                          onClick={() => moveGlssa(wi, pi, 'down')}
                          disabled={pi === wall.glssaPieces.length - 1}
                          className="text-stone-300 hover:text-stone-600 disabled:opacity-20 p-0 touch-manipulation"
                        >
                          <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                      <div
                        className={`flex-1 flex items-center rounded border ${
                          valid ? 'border-amber-200 bg-amber-50/50' : 'border-red-300 bg-red-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateGlssaSize(wi, pi, Math.max(GLSSA_MIN, piece.size - 1))}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={piece.size || ''}
                          min={GLSSA_MIN}
                          max={GLSSA_MAX}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              updateGlssaSize(wi, pi, 0);
                            } else {
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) updateGlssaSize(wi, pi, num);
                            }
                          }}
                          onBlur={(e) => {
                            const num = parseInt(e.target.value, 10);
                            if (isNaN(num) || num < GLSSA_MIN) {
                              updateGlssaSize(wi, pi, GLSSA_MIN);
                            } else if (num > GLSSA_MAX) {
                              updateGlssaSize(wi, pi, GLSSA_MAX);
                            }
                          }}
                          className="flex-1 px-1 py-1.5 sm:py-1 text-xs text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateGlssaSize(wi, pi, Math.min(GLSSA_MAX, piece.size + 1))}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[9px] text-stone-400 w-5">cm</span>
                      <button
                        onClick={() => removeGlssa(wi, pi)}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1 sm:p-0.5 touch-manipulation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addGlssa(wi)}
                className="mt-1 flex items-center gap-1 text-xs sm:text-[10px] text-amber-600 hover:text-amber-800 transition-colors touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                Ajouter Glssa
              </button>
            </div>

            {/* Wssada section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Wssada ({wall.wssadaPieces.length})
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    wVoid === 0
                      ? 'text-emerald-600'
                      : wVoid > 0
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}
                >
                  {wTotal}/{wall.wssadaEffective}cm
                  {wVoid !== 0 &&
                    ` (${wVoid > 0 ? 'Vide' : 'Dépassement'}: ${Math.abs(wVoid)}cm)`}
                </span>
              </div>

              <div className="space-y-1">
                {wall.wssadaPieces.map((piece, pi) => {
                  const min = piece.isCornerPiece ? WSSADA_CORNER_MIN : WSSADA_REGULAR_MIN;
                  const max = piece.isCornerPiece ? WSSADA_CORNER_MAX : WSSADA_REGULAR_MAX;
                  const valid = piece.size >= min && piece.size <= max;
                  const isSelectedWssada = wall.wallId === selectedWallId && pi === selectedPieceIndex && selectedCategory === 'wssada';

                  return (
                    <div key={piece.id} className={`flex items-center gap-1 ${isSelectedWssada ? 'bg-amber-100 ring-1 ring-amber-400 rounded' : ''}`}>
                      <div className="flex flex-col -space-y-0.5">
                        <button
                          onClick={() => moveWssada(wi, pi, 'up')}
                          disabled={pi === 0}
                          className="text-stone-300 hover:text-stone-600 disabled:opacity-20 p-0 touch-manipulation"
                        >
                          <ChevronUp className="w-4 h-4 sm:w-3 sm:h-3" />
                        </button>
                        <button
                          onClick={() => moveWssada(wi, pi, 'down')}
                          disabled={pi === wall.wssadaPieces.length - 1}
                          className="text-stone-300 hover:text-stone-600 disabled:opacity-20 p-0 touch-manipulation"
                        >
                          <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                      <div
                        className={`flex-1 flex items-center rounded border ${
                          valid
                            ? piece.isCornerPiece
                              ? 'border-orange-200 bg-orange-50/50'
                              : 'border-emerald-200 bg-emerald-50/50'
                            : 'border-red-300 bg-red-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateWssadaSize(wi, pi, Math.max(min, piece.size - 1))}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={piece.size || ''}
                          min={min}
                          max={max}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              updateWssadaSize(wi, pi, 0);
                            } else {
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) updateWssadaSize(wi, pi, num);
                            }
                          }}
                          onBlur={(e) => {
                            const num = parseInt(e.target.value, 10);
                            if (isNaN(num) || num < min) {
                              updateWssadaSize(wi, pi, min);
                            } else if (num > max) {
                              updateWssadaSize(wi, pi, max);
                            }
                          }}
                          className="flex-1 px-1 py-1.5 sm:py-1 text-xs text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateWssadaSize(wi, pi, Math.min(max, piece.size + 1))}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span
                        className={`text-[8px] px-1 py-0.5 rounded font-medium shrink-0 ${
                          piece.isCornerPiece
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {piece.isCornerPiece ? 'Coin' : 'Standard'}
                      </span>
                      <button
                        onClick={() => removeWssada(wi, pi)}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1 sm:p-0.5 touch-manipulation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => addWssada(wi, false)}
                  className="flex items-center gap-1 text-xs sm:text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors touch-manipulation"
                >
                  <Plus className="w-3 h-3" />
                  Standard
                </button>
                <button
                  onClick={() => addWssada(wi, true)}
                  className="flex items-center gap-1 text-xs sm:text-[10px] text-orange-600 hover:text-orange-800 transition-colors touch-manipulation"
                >
                  <Plus className="w-3 h-3" />
                  Coin
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary */}
      {walls.length > 0 && (
        <div className="bg-majalis-50 rounded-xl p-3 border border-majalis-200">
          <div className="text-xs sm:text-[10px] font-bold uppercase tracking-wider text-majalis-700 mb-2">
            Résumé des modifications
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm sm:text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Glssa :</span>
              <span className="font-bold text-stone-800">{totalGlssa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Wssada :</span>
              <span className="font-bold text-stone-800">{totalWssada}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Coin :</span>
              <span className="font-bold text-stone-800">{totalCorner}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Vide Glssa :</span>
              <span
                className={`font-bold ${totalGlssaVoid === 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {totalGlssaVoid}cm
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Carpet Section */}
      {allCombos && allCombos.length > 0 && (
        <div className={`bg-stone-50 rounded-xl p-3 border border-stone-200 ${selectedCategory === 'carpet' ? 'ring-2 ring-amber-400' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4E2E]">
              Zerbiya ({carpetCombo?.placements.length ?? 0})
            </span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCarpet ?? false}
                onChange={(e) => onIncludeCarpetChange?.(e.target.checked)}
                className="rounded border-gray-300 w-3.5 h-3.5"
              />
              <span className="text-[10px] text-gray-500">Inclure</span>
            </label>
          </div>
          {includeCarpet && carpetCombo && (
            <div className="space-y-2">
              {/* Combo selector */}
              {allCombos.length > 1 && (
                <select
                  value={allCombos.indexOf(carpetCombo)}
                  onChange={(e) => onComboChange?.(Number(e.target.value))}
                  className="w-full text-[10px] border border-stone-200 rounded px-2 py-1.5 bg-white"
                >
                  {allCombos.map((combo, i) => (
                    <option key={i} value={i}>
                      {combo.placements.length}× {getCarpetDisplayLabel(combo.placements[0].carpetType, combo.placements[0].rotated)} — {combo.totalCoveragePercent.toFixed(0)}% — {combo.totalPrice} MAD
                    </option>
                  ))}
                </select>
              )}

              {/* Individual carpet list */}
              <div className="space-y-1">
                {carpetCombo.placements.map((placement, pi) => (
                  <div
                    key={pi}
                    className="py-1.5 px-2 rounded bg-[#FAF7F2] border border-[#E8D5B7] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-[#6B4E2E]">
                          {getCarpetDisplayLabel(placement.carpetType, placement.rotated)}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-1.5">
                          {placement.carpetType.price} MAD
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 ml-1">
                        <button
                          onClick={() => onToggleCarpetRotation?.(pi)}
                          className="text-stone-400 hover:text-[#6B4E2E] transition-colors p-1 sm:p-0.5 touch-manipulation"
                          title="Pivoter cette zerbiya"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                        {carpetCombo.placements.length > 1 && (
                          <button
                            onClick={() => onRemoveCarpet?.(pi)}
                            className="text-stone-300 hover:text-red-500 transition-colors p-1 sm:p-0.5 touch-manipulation"
                            title="Supprimer cette zerbiya"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {allCarpetTypes && allCarpetTypes.length > 1 && (
                      <select
                        value={placement.carpetType.id}
                        onChange={(e) => onChangeCarpetType?.(pi, Number(e.target.value))}
                        className="w-full text-[10px] border border-[#E8D5B7] rounded px-1.5 py-1 bg-white text-[#6B4E2E]"
                      >
                        {allCarpetTypes.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.label ?? `${ct.widthCm}×${ct.heightCm}cm`} — {ct.price} MAD
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-[10px] text-stone-500 px-1">
                <span>{carpetCombo.totalCoveragePercent.toFixed(0)}% couverture</span>
                <span className="font-medium text-[#6B4E2E]">{carpetCombo.totalPrice} MAD</span>
              </div>

              {/* Add carpet button */}
              <button
                onClick={() => onAddCarpet?.()}
                className="flex items-center gap-1 text-xs sm:text-[10px] text-[#6B4E2E] hover:text-[#4A3520] transition-colors touch-manipulation"
              >
                <Plus className="w-3 h-3" />
                Ajouter Zerbiya
              </button>
            </div>
          )}
        </div>
      )}

      {/* Poufs Section */}
      <div className={`bg-stone-50 rounded-xl p-3 border border-stone-200`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4E2E]">
            Poufs
          </span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={includePoufs ?? false}
              onChange={(e) => onIncludePoufsChange?.(e.target.checked)}
              className="rounded border-gray-300 w-3.5 h-3.5"
            />
            <span className="text-[10px] text-gray-500">Inclure</span>
          </label>
        </div>
        {includePoufs && (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 px-2 rounded bg-[#FAF7F2] border border-[#E8D5B7]">
              <span className="text-xs font-medium text-[#6B4E2E]">Quantit&eacute;</span>
              <div className="flex items-center rounded border border-stone-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onPoufsCountChange?.(Math.max(1, (poufsCount ?? 2) - 1))}
                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                >&#8722;</button>
                <span className="px-2 text-xs font-medium text-stone-800 min-w-[1.5rem] text-center">{poufsCount ?? 2}</span>
                <button
                  type="button"
                  onClick={() => onPoufsCountChange?.(Math.min(20, (poufsCount ?? 2) + 1))}
                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-200 active:bg-stone-300 transition-colors touch-manipulation text-sm font-bold"
                >+</button>
              </div>
            </div>
            {pricePerPouf && (
              <div className="text-[10px] text-stone-400 text-center">
                {poufsCount ?? 2} &times; {pricePerPouf} MAD = {(poufsCount ?? 2) * pricePerPouf} MAD
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
