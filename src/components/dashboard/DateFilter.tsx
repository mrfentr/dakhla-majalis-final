'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateFilterProps {
  onFilterChange: (range: { from: Date | null; to: Date | null; preset: DatePreset }) => void;
}

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
    case 'week': {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      return { from: monday, to: new Date(now.getTime()) };
    }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getTime()) };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getTime()) };
    default:
      return { from: null, to: null };
  }
}

const presetLabels: Record<DatePreset, string> = {
  all: 'Toutes les dates',
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  year: 'Cette année',
  custom: 'Période personnalisée',
};

export function DateFilter({ onFilterChange }: DateFilterProps) {
  const [preset, setPreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [open, setOpen] = useState(false);

  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    if (p === 'custom') {
      setOpen(true);
      return;
    }
    setOpen(false);
    const range = getPresetRange(p);
    onFilterChange({ ...range, preset: p });
  };

  const handleCustomApply = () => {
    const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
    const to = customTo ? new Date(customTo + 'T23:59:59') : null;
    onFilterChange({ from, to, preset: 'custom' });
    setOpen(false);
  };

  const handleClear = () => {
    setPreset('all');
    setCustomFrom('');
    setCustomTo('');
    onFilterChange({ from: null, to: null, preset: 'all' });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
          preset !== 'all'
            ? 'bg-[#BD7C48]/10 border-[#BD7C48] text-[#BD7C48]'
            : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400'
        }`}
      >
        <Calendar className="w-4 h-4" />
        {presetLabels[preset]}
        {preset !== 'all' && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="w-4 h-4 rounded-full bg-[#BD7C48]/20 hover:bg-[#BD7C48]/40 flex items-center justify-center transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-neutral-200 shadow-lg p-2 min-w-[240px]">
            {(['all', 'today', 'week', 'month', 'year'] as DatePreset[]).map(p => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preset === p
                    ? 'bg-[#BD7C48]/10 text-[#BD7C48]'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}

            <div className="border-t border-neutral-200 mt-1 pt-1">
              <button
                onClick={() => setPreset('custom')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  preset === 'custom'
                    ? 'bg-[#BD7C48]/10 text-[#BD7C48]'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {presetLabels.custom}
              </button>

              {preset === 'custom' && (
                <div className="px-3 py-2 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Du</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:border-[#BD7C48] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Au</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:border-[#BD7C48] outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customFrom && !customTo}
                    className="w-full px-3 py-2 bg-[#BD7C48] hover:bg-[#a66b3b] disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Helper: check if a timestamp (ms) falls within a date range */
export function isInDateRange(
  timestampMs: number,
  range: { from: Date | null; to: Date | null },
): boolean {
  if (!range.from && !range.to) return true;
  const date = new Date(timestampMs);
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/** Helper: check if a date string (YYYY-MM-DD) falls within a date range */
export function isDateStringInRange(
  dateStr: string,
  range: { from: Date | null; to: Date | null },
): boolean {
  if (!range.from && !range.to) return true;
  const date = new Date(dateStr + 'T12:00:00');
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}
