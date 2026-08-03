// ===== MEASUREMENT INPUT PARSING =====
// Users type wall lengths in whatever unit is natural to them: "450", "4.5",
// "4,5 m", "٤٫٥", "450cm". Everything downstream (geometry calculator,
// optimizer, Convex order payloads) works in whole centimetres, so this module
// is the single place that turns free text into a normalized cm value.

/** Smallest wall we can furnish, in cm. Also the metre/cm disambiguation point. */
export const MIN_WALL_CM = 110;

/** Largest wall we accept, in cm. */
export const MAX_WALL_CM = 2000;

export type MeasurementUnit = 'm' | 'cm';

export interface ParsedMeasurement {
  /** Normalized value in whole centimetres, or null when nothing usable was typed. */
  cm: number | null;
  /** How the raw input was interpreted. Null when unparseable. */
  unit: MeasurementUnit | null;
  /** True when the user typed metres and we scaled to cm. */
  converted: boolean;
  /** The numeric value as typed, before unit conversion. */
  value: number | null;
  /** True when the unit came from an explicit suffix rather than being inferred. */
  explicit: boolean;
}

const EMPTY: ParsedMeasurement = { cm: null, unit: null, converted: false, value: null, explicit: false };

// Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits -> ASCII.
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const ar = ARABIC_DIGITS.indexOf(ch);
    if (ar !== -1) { out += String(ar); continue; }
    const ext = EXTENDED_ARABIC_DIGITS.indexOf(ch);
    if (ext !== -1) { out += String(ext); continue; }
    out += ch;
  }
  return out;
}

// Longest suffixes first so "cm" is never shadowed by "m".
const UNIT_SUFFIXES: Array<{ match: string; unit: MeasurementUnit }> = [
  { match: 'centimetres', unit: 'cm' },
  { match: 'centimeters', unit: 'cm' },
  { match: 'centimetre', unit: 'cm' },
  { match: 'centimeter', unit: 'cm' },
  { match: 'سنتيمتر', unit: 'cm' },
  { match: 'metres', unit: 'm' },
  { match: 'meters', unit: 'm' },
  { match: 'metre', unit: 'm' },
  { match: 'meter', unit: 'm' },
  { match: 'متر', unit: 'm' },
  { match: 'cm', unit: 'cm' },
  { match: 'سم', unit: 'cm' },
  { match: 'mt', unit: 'm' },
  { match: 'm', unit: 'm' },
  { match: 'م', unit: 'm' },
];

/**
 * Turn free-text input into centimetres.
 *
 * An explicit suffix ("4m", "450 cm") always wins. Otherwise the unit is
 * inferred: a bare number below MIN_WALL_CM can only have been metres, because
 * a wall shorter than that is not something we can furnish — so "4" means 4 m
 * while "450" means 450 cm. The metre reading is capped at MAX_WALL_CM / 100,
 * so "109" stays 109 cm (and fails the minimum) instead of becoming 109 m.
 */
export function parseMeasurement(raw: string | number | null | undefined): ParsedMeasurement {
  if (raw === null || raw === undefined) return EMPTY;

  let text = toAsciiDigits(String(raw))
    .toLowerCase()
    .replace(/[\s   ]/g, '') // spaces incl. nbsp / thin space
    .replace(/[٫،,]/g, '.'); // Arabic decimal separator, Arabic comma, comma

  if (!text) return EMPTY;

  let unit: MeasurementUnit | null = null;
  for (const { match, unit: u } of UNIT_SUFFIXES) {
    if (text.endsWith(match)) {
      unit = u;
      text = text.slice(0, -match.length);
      break;
    }
  }
  const explicit = unit !== null;

  // Guard against "4.5.2" and similar: only accept a plain decimal number.
  if (!/^\d*\.?\d*$/.test(text) || !/\d/.test(text)) return EMPTY;

  const value = parseFloat(text);
  if (!isFinite(value) || value <= 0) return EMPTY;

  if (!unit) unit = value < MIN_WALL_CM && value <= MAX_WALL_CM / 100 ? 'm' : 'cm';

  const cm = Math.round(unit === 'm' ? value * 100 : value);

  return { cm, unit, converted: unit === 'm', value, explicit };
}

/** Centimetres for a raw input, or 0 when unparseable — for payload building. */
export function toCm(raw: string | number | null | undefined): number {
  return parseMeasurement(raw).cm ?? 0;
}

/**
 * true / false / null (nothing entered yet), for progressive field validation.
 */
export function isMeasurementInRange(
  raw: string | number | null | undefined,
  min: number = MIN_WALL_CM,
  max: number = MAX_WALL_CM,
): boolean | null {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const { cm } = parseMeasurement(raw);
  if (cm === null) return false;
  return cm >= min && cm <= max;
}

/**
 * Short echo of what we understood, shown under the input as the user types:
 * "4,5 m → 450 cm". Returns null when there is nothing worth echoing (empty
 * input, or a plain cm value that needs no explanation).
 */
export function describeMeasurement(raw: string | number | null | undefined): { from: string; cm: number } | null {
  const parsed = parseMeasurement(raw);
  if (parsed.cm === null || parsed.value === null) return null;
  if (!parsed.converted) return null;
  const from = `${String(parsed.value).replace('.', ',')} m`;
  return { from, cm: parsed.cm };
}
