import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get a locale-appropriate translation from an object with { ar, fr, en } keys.
 * Falls back to fr, then ar if the locale key is missing.
 */
export function getLocalizedField(
  field: { ar?: string; fr?: string; en?: string } | undefined,
  locale: string
): string {
  if (!field) return '';
  const loc = locale as keyof typeof field;
  return field[loc] || field.fr || field.ar || '';
}

/**
 * Get the display name for a color variant.
 * Supports both old format (string) and new format ({ ar, fr, en }).
 */
export function getVariantName(
  name: string | { ar?: string; fr?: string; en?: string },
  locale: string
): string {
  if (typeof name === 'string') return name;
  return getLocalizedField(name, locale);
}