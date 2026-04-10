// Dakhla Majalis Landing Page Theme - Based on .pen design file

export const theme = {
  colors: {
    // Backgrounds
    cream: '#FDFBF7',
    white: '#FFFFFF',
    dark: '#1A1A1A',
    darker: '#0D0D0D',
    cardDark: '#252525',

    // Primary accent (terracotta)
    primary: '#B85C38',
    primaryLight: '#B85C3815',
    primaryMedium: '#B85C3820',
    primaryStrong: '#B85C3830',

    // Text colors
    textDark: '#1A1A1A',
    textMedium: '#5A5A5A',
    textLight: '#8A8A8A',
    textMuted: '#A0A0A0',
    textOnDark: '#E0E0E0',

    // Borders & fills
    border: '#E8E0D5',
    lightFill: '#F5F0E8',

    // Special
    gold: '#C9A962',

    // Footer text
    footerText: '#888888',
    footerDivider: '#222222',
  },

  fonts: {
    arabic: "'Noto Naskh Arabic', 'Noto Kufi Arabic', Arial, sans-serif",        // Body text, nav, buttons, descriptions
    arabicTitle: "'Noto Kufi Arabic', 'Noto Naskh Arabic', Arial, sans-serif",   // Big titles, h1, h2, section headings
    latin: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",              // Latin body text (French/English)
    latinTitle: "'Playfair Display', Georgia, serif",                             // Latin titles (French/English)
    english: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",            // English UI text (alias for latin)
    decorative: "'Playfair Display', Georgia, serif",                             // Decorative accents
  },

  // Section padding - desktop defaults (use responsive helpers for mobile/tablet)
  sectionPadding: {
    y: '80px',
    x: '120px',
  },
} as const;

/**
 * Returns responsive section padding string based on breakpoint.
 * mobile (< 768px):  48px vertical, 16px horizontal
 * tablet (768-1024px): 60px vertical, 32px horizontal
 * desktop (> 1024px): 80px vertical, 120px horizontal
 */
export function getResponsiveSectionPadding(
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): string {
  switch (breakpoint) {
    case 'mobile':
      return '48px 16px';
    case 'tablet':
      return '60px 32px';
    case 'desktop':
    default:
      return `${theme.sectionPadding.y} ${theme.sectionPadding.x}`;
  }
}

export type Theme = typeof theme;
