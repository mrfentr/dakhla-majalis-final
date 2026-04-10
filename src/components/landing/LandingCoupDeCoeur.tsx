'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import { useTranslations, useLocale } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { LiteYouTube } from '@/components/LiteYouTube';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    function getBreakpoint(): Breakpoint {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    }

    setBreakpoint(getBreakpoint());

    function handleResize() {
      setBreakpoint(getBreakpoint());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

interface StoryCardProps {
  type: 'video' | 'album';
  videoId?: string;
  albumUrl?: string;
  title: string;
  description: string;
  viewAlbumLabel?: string;
  isArabic: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

function StoryCard({
  type,
  videoId,
  albumUrl,
  title,
  description,
  viewAlbumLabel,
  isArabic,
  isMobile,
  isTablet,
}: StoryCardProps) {
  const titleFontSize = isMobile ? 16 : isTablet ? 17 : 18;
  const descFontSize = isMobile ? 13 : isTablet ? 14 : 15;

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: isMobile ? 12 : 16,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.07)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Media area */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
          position: 'relative',
        }}
      >
        {type === 'video' && videoId ? (
          <LiteYouTube
            videoId={videoId}
            title={title}
          />
        ) : (
          /* Album placeholder */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background: `linear-gradient(135deg, ${theme.colors.primary}22, ${theme.colors.primaryStrong})`,
            }}
          >
            {/* Photo icon */}
            <svg
              width={isMobile ? 40 : 52}
              height={isMobile ? 40 : 52}
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span
              style={{
                color: theme.colors.primary,
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                opacity: 0.8,
              }}
            >
              SIAM Meknès 2025
            </span>
          </div>
        )}
      </div>

      {/* Text content */}
      <div
        style={{
          padding: isMobile ? '16px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          direction: isArabic ? 'rtl' : 'ltr',
          flex: 1,
        }}
      >
        <h3
          style={{
            color: theme.colors.textDark,
            fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
            fontSize: titleFontSize,
            fontWeight: 'bold',
            margin: 0,
            lineHeight: 1.4,
            textAlign: isArabic ? 'right' : 'left',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: theme.colors.textMedium,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: descFontSize,
            margin: 0,
            lineHeight: 1.6,
            textAlign: isArabic ? 'right' : 'left',
          }}
        >
          {description}
        </p>

        {/* Album link for Google Photos card */}
        {type === 'album' && albumUrl && viewAlbumLabel && (
          <a
            href={albumUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              color: theme.colors.primary,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              textDecoration: 'none',
              alignSelf: isArabic ? 'flex-end' : 'flex-start',
              flexDirection: isArabic ? 'row-reverse' : 'row',
            }}
          >
            <ExternalLink size={14} />
            <span>{viewAlbumLabel}</span>
          </a>
        )}
      </div>
    </div>
  );
}

export function LandingCoupDeCoeur() {
  const t = useTranslations('coupDeCoeur');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  const sectionPadding = isMobile ? '48px 16px' : isTablet ? '60px 32px' : '80px 120px';
  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;
  const subtitleFontSize = isMobile ? 15 : isTablet ? 16 : 18;

  const gridColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';
  const gridGap = isMobile ? 20 : isTablet ? 24 : 28;

  return (
    <section
      id="coup-de-coeur"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: theme.colors.cream,
        padding: sectionPadding,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 32 : 48,
        alignItems: 'center',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 12 : 16,
          alignItems: 'center',
          maxWidth: isMobile ? '100%' : 700,
          width: '100%',
        }}
      >
        {/* Badge */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 4,
            border: `1px solid ${theme.colors.border}`,
            padding: isMobile ? '6px 16px' : '8px 20px',
          }}
        >
          <span
            style={{
              color: theme.colors.primary,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 'bold',
            }}
          >
            {t('badge')}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: theme.colors.textDark,
            fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
            fontSize: titleFontSize,
            fontWeight: 'bold',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.3,
            padding: isMobile ? '0 4px' : 0,
          }}
        >
          {t('title')}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            color: theme.colors.textMedium,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: subtitleFontSize,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.6,
            padding: isMobile ? '0 8px' : 0,
          }}
        >
          {t('subtitle')}
        </p>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: gridGap,
          boxSizing: 'border-box',
        }}
      >
        {/* Card 1 — Bohemian Kitchen */}
        <StoryCard
          type="video"
          videoId="bE2o0V7aklE"
          title={t('story1Title')}
          description={t('story1Desc')}
          isArabic={isArabic}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Card 2 — SIAM Meknes 2025 */}
        <StoryCard
          type="video"
          videoId="sj4G8QSPchw"
          title={t('story2Title')}
          description={t('story2Desc')}
          isArabic={isArabic}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Card 3 — Dragon Island */}
        <StoryCard
          type="video"
          videoId="omFoSlLjD54"
          title={t('story3Title')}
          description={t('story3Desc')}
          isArabic={isArabic}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
    </section>
  );
}
