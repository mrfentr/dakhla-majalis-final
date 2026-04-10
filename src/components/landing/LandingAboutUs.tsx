'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import { MapPin } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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

export function LandingAboutUs() {
  const t = useTranslations('aboutUs');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  const sectionPadding = isMobile ? '48px 16px' : isTablet ? '60px 32px' : '80px 120px';
  const sectionGap = isMobile ? 36 : isTablet ? 48 : 64;
  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;
  const subtitleFontSize = isMobile ? 15 : isTablet ? 16 : 18;
  const bodyFontSize = isMobile ? 14 : isTablet ? 15 : 16;

  return (
    <section
      id="about-us"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: theme.colors.cream,
        padding: sectionPadding,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
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
          maxWidth: isMobile ? '100%' : isTablet ? 600 : 'none',
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

      {/* Content: Two columns on desktop, stacked on mobile/tablet */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: isMobile || isTablet ? 'column' : 'row',
          gap: isMobile ? 32 : isTablet ? 36 : 48,
          alignItems: isMobile || isTablet ? 'stretch' : 'flex-start',
          direction: isArabic ? 'rtl' : 'ltr',
        }}
      >
        {/* Text Column */}
        <div
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 16 : 20,
            minWidth: 0,
          }}
        >
          {/* Description */}
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.8,
              margin: 0,
              textAlign: isArabic ? 'right' : 'left',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {t('description')}
          </p>

          {/* Products */}
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.8,
              margin: 0,
              textAlign: isArabic ? 'right' : 'left',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {t('products')}
          </p>

          {/* Quality */}
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.8,
              margin: 0,
              textAlign: isArabic ? 'right' : 'left',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {t('quality')}
          </p>

          {/* Delivery */}
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.8,
              margin: 0,
              textAlign: isArabic ? 'right' : 'left',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {t('delivery')}
          </p>

          {/* Goal */}
          <p
            style={{
              color: theme.colors.textDark,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.8,
              margin: 0,
              fontWeight: 600,
              textAlign: isArabic ? 'right' : 'left',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {t('goal')}
          </p>

          {/* Location */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
              justifyContent: isArabic ? 'flex-end' : 'flex-start',
            }}
          >
            <MapPin
              size={isMobile ? 18 : 20}
              color={theme.colors.primary}
              style={{ flexShrink: 0, order: isArabic ? 1 : 0 }}
            />
            <span
              style={{
                color: theme.colors.textMedium,
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.5,
                order: isArabic ? 0 : 1,
              }}
            >
              {t('location')}
            </span>
          </div>
        </div>

        {/* Video Column */}
        <div
          style={{
            flex: 1,
            width: isMobile || isTablet ? '100%' : 'auto',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 12 : 16,
          }}
        >
          {/* Video Title */}
          <h3
            style={{
              color: theme.colors.textDark,
              fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
              fontSize: isMobile ? 18 : isTablet ? 20 : 22,
              fontWeight: 'bold',
              margin: 0,
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            {t('videoTitle')}
          </h3>

          {/* YouTube Embed */}
          <div
            style={{
              width: '100%',
              borderRadius: isMobile ? 12 : 16,
              overflow: 'hidden',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: `0 4px 20px ${theme.colors.primary}10`,
            }}
          >
            <LiteYouTube
              videoId="5EpZetelyWY"
              title={t('videoTitle')}
              style={{
                aspectRatio: '16 / 9',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
