'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const localeLabels: Record<string, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};

const localeFlags: Record<string, string> = {
  ar: '🇲🇦',
  fr: '🇫🇷',
  en: '🇬🇧',
};

const localeShort: Record<string, string> = {
  ar: 'AR',
  fr: 'FR',
  en: 'EN',
};

// Brand colors from theme
const colors = {
  primary: '#B85C38',
  primaryLight: 'rgba(184, 92, 56, 0.08)',
  primaryMedium: 'rgba(184, 92, 56, 0.15)',
  brown: '#8B6F4E',
  cream: '#FDFBF7',
  warmBeige: '#FAF6F0',
  border: '#E8E0D5',
  borderHover: '#D4C5B0',
  textDark: '#3D2E1F',
  textMedium: '#6B5C4C',
  textLight: '#8A7A6A',
  gold: '#C9A962',
  shadow: 'rgba(139, 111, 78, 0.12)',
  shadowStrong: 'rgba(139, 111, 78, 0.2)',
};

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke={colors.textMedium}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, opacity: 0.6 }}
    >
      <circle cx="12" cy="12" r="10" stroke={colors.textMedium} strokeWidth="1.5" />
      <path
        d="M2 12h20M12 2c2.5 2.5 4 5.5 4 10s-1.5 7.5-4 10c-2.5-2.5-4-5.5-4-10s1.5-7.5 4-10z"
        stroke={colors.textMedium}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LanguageSwitcher({ variant = 'dropdown', compact = false }: { variant?: 'dropdown' | 'buttons'; compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLocale, setHoveredLocale] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Track mount for animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  function switchLocale(newLocale: string) {
    setIsOpen(false);
    router.replace(pathname, { locale: newLocale });
  }

  // ─── Buttons variant (footer, mobile menu) ─────────────────────────
  if (variant === 'buttons') {
    return (
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {routing.locales.map((l) => {
          const isActive = l === locale;
          const isHovered = hoveredLocale === l;
          return (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              onMouseEnter={() => setHoveredLocale(l)}
              onMouseLeave={() => setHoveredLocale(null)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                minHeight: 48,
                fontSize: 15,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.02em',
                backgroundColor: isActive
                  ? colors.primary
                  : isHovered
                    ? colors.primaryLight
                    : 'transparent',
                color: isActive
                  ? '#FFFFFF'
                  : isHovered
                    ? colors.primary
                    : colors.textMedium,
                border: isActive
                  ? `2px solid ${colors.primary}`
                  : `2px solid ${isHovered ? colors.primary + '60' : colors.border}`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'inherit',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{localeFlags[l]}</span>
              <span>{localeLabels[l]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Dropdown variant (navbar) ──────────────────────────────────────
  const otherLocales = routing.locales.filter((l) => l !== locale);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setHoveredLocale('__trigger__')}
        onMouseLeave={() => setHoveredLocale(null)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 5 : 8,
          padding: compact ? '7px 10px' : '8px 14px',
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          letterSpacing: '0.04em',
          backgroundColor:
            isOpen
              ? colors.warmBeige
              : hoveredLocale === '__trigger__'
                ? colors.primaryLight
                : 'rgba(184, 92, 56, 0.05)',
          color: isOpen ? colors.primary : colors.textDark,
          border: `1.5px solid ${isOpen ? colors.primary : hoveredLocale === '__trigger__' ? colors.borderHover : colors.border}`,
          borderRadius: compact ? 8 : 10,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'inherit',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          outline: 'none',
          position: 'relative',
          boxShadow: isOpen
            ? `0 0 0 3px ${colors.primaryLight}`
            : hoveredLocale === '__trigger__'
              ? `0 0 0 2px ${colors.primaryLight}`
              : 'none',
          minWidth: compact ? 'auto' : undefined,
          minHeight: compact ? 'auto' : undefined,
        }}
      >
        {!compact && <span style={{ fontSize: 16, lineHeight: 1 }}>{localeFlags[locale]}</span>}
        <span style={{ fontWeight: 600 }}>{localeShort[locale]}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* Dropdown panel */}
      <div
        role="listbox"
        aria-label="Available languages"
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          // Use insetInlineEnd for RTL support — panel aligns to the "end" side
          insetInlineEnd: 0,
          minWidth: 180,
          backgroundColor: colors.cream,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          boxShadow: `0 8px 32px ${colors.shadow}, 0 2px 8px ${colors.shadowStrong}`,
          overflow: 'hidden',
          zIndex: 9999,
          // Animation
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Small decorative header inside dropdown */}
        <div
          style={{
            padding: '10px 14px 6px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: colors.textLight,
            borderBottom: `1px solid ${colors.border}`,
            userSelect: 'none',
          }}
        >
          Language
        </div>

        {/* Current locale — shown first with active style */}
        <div style={{ padding: '4px' }}>
          <button
            role="option"
            aria-selected={true}
            onClick={() => setIsOpen(false)}
            onMouseEnter={() => setHoveredLocale(locale)}
            onMouseLeave={() => setHoveredLocale(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 12px',
              fontSize: 13.5,
              fontWeight: 500,
              backgroundColor: colors.primaryMedium,
              color: colors.primary,
              border: 'none',
              borderRadius: 8,
              cursor: 'default',
              fontFamily: 'inherit',
              lineHeight: 1.2,
              textAlign: 'start',
              transition: 'background-color 0.2s ease',
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>{localeFlags[locale]}</span>
            <span style={{ flex: 1 }}>{localeLabels[locale]}</span>
            {/* Checkmark */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M3 7L6 10L11 4"
                stroke={colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: colors.border, margin: '4px 8px' }} />

          {/* Other locales */}
          {otherLocales.map((l) => {
            const isHovered = hoveredLocale === l;
            return (
              <button
                key={l}
                role="option"
                aria-selected={false}
                onClick={() => switchLocale(l)}
                onMouseEnter={() => setHoveredLocale(l)}
                onMouseLeave={() => setHoveredLocale(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13.5,
                  fontWeight: 400,
                  backgroundColor: isHovered ? colors.primaryLight : 'transparent',
                  color: isHovered ? colors.textDark : colors.textMedium,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  lineHeight: 1.2,
                  textAlign: 'start',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <span style={{ fontSize: 17, lineHeight: 1 }}>{localeFlags[l]}</span>
                <span style={{ flex: 1 }}>{localeLabels[l]}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom decorative accent line */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${colors.primary}40, ${colors.gold}60, ${colors.primary}40, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
