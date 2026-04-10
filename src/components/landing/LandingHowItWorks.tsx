'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import { Ruler, LayoutGrid, ShoppingCart, Truck } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    function getBreakpoint(): Breakpoint {
      const w = window.innerWidth;
      if (w < 640) return 'mobile';
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

export function LandingHowItWorks() {
  const t = useTranslations('home');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const steps = [
    {
      id: 1,
      num: t('howItWorks.step1Num'),
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Description'),
      Icon: Ruler,
    },
    {
      id: 2,
      num: t('howItWorks.step2Num'),
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Description'),
      Icon: LayoutGrid,
    },
    {
      id: 3,
      num: t('howItWorks.step3Num'),
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Description'),
      Icon: ShoppingCart,
    },
    {
      id: 4,
      num: t('howItWorks.step4Num'),
      title: t('howItWorks.step4Title'),
      description: t('howItWorks.step4Description'),
      Icon: Truck,
    },
  ];

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // Section padding scales down for smaller screens
  const sectionPadding = isMobile
    ? '48px 16px'
    : isTablet
      ? '64px 32px'
      : '80px 120px';

  // Gap between header and grid
  const sectionGap = isMobile ? 36 : isTablet ? 48 : 64;

  // Title font size scales down
  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;

  // Description font size
  const descFontSize = isMobile ? 15 : isTablet ? 16 : 18;

  // Grid: 1-col mobile, 2-col tablet, 4-col desktop
  const gridDirection: 'column' | 'row' = isMobile ? 'column' : 'row';
  const gridWrap: 'wrap' | 'nowrap' = isTablet ? 'wrap' : 'nowrap';
  const gridGap = isMobile ? 20 : isTablet ? 24 : 32;

  // Card sizing
  const cardWidth = isMobile ? '100%' : isTablet ? 'calc(50% - 12px)' : 280;
  const cardPadding = isMobile ? 20 : isTablet ? 24 : 28;

  // Step number circle
  const stepNumSize = isMobile ? 40 : 48;
  const stepNumFontSize = isMobile ? 20 : 24;

  // Icon size
  const iconSize = isMobile ? 26 : 32;

  // Step title size
  const stepTitleSize = isMobile ? 18 : isTablet ? 20 : 22;

  // Step description size
  const stepDescSize = isMobile ? 13 : 14;

  return (
    <section
      id="how-it-works"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: theme.colors.lightFill,
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
            {t('howItWorks.badge')}
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
          {t('howItWorks.title')}
        </h2>

        {/* Description */}
        <p
          style={{
            color: theme.colors.textMedium,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: descFontSize,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.6,
            padding: isMobile ? '0 8px' : 0,
          }}
        >
          {t('howItWorks.description')}
        </p>
      </div>

      {/* Steps Grid */}
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? 400 : isTablet ? 620 : 'none',
          display: 'flex',
          flexDirection: gridDirection,
          flexWrap: gridWrap,
          gap: gridGap,
          justifyContent: 'center',
          alignItems: isMobile ? 'center' : 'stretch',
        }}
      >
        {steps.map((step) => (
          <div
            key={step.id}
            style={{
              width: cardWidth,
              minWidth: 0,
              backgroundColor: theme.colors.white,
              borderRadius: isMobile ? 12 : 16,
              border: `1px solid ${theme.colors.border}`,
              padding: cardPadding,
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: isMobile ? 16 : 16,
              alignItems: isMobile ? 'center' : 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Left side on mobile: number + icon stacked */}
            {isMobile ? (
              <>
                {/* Number circle */}
                <div
                  style={{
                    width: stepNumSize,
                    height: stepNumSize,
                    minWidth: stepNumSize,
                    backgroundColor: theme.colors.primary,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                      fontSize: stepNumFontSize,
                      fontWeight: 'bold',
                    }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Text block on right side */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <step.Icon size={iconSize} color={theme.colors.primary} />
                    <h3
                      style={{
                        color: theme.colors.textDark,
                        fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                        fontSize: stepTitleSize,
                        fontWeight: 'bold',
                        margin: 0,
                      }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      color: theme.colors.textMedium,
                      fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                      fontSize: stepDescSize,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Step Number */}
                <div
                  style={{
                    width: stepNumSize,
                    height: stepNumSize,
                    backgroundColor: theme.colors.primary,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                      fontSize: stepNumFontSize,
                      fontWeight: 'bold',
                    }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Icon */}
                <step.Icon size={iconSize} color={theme.colors.primary} />

                {/* Title */}
                <h3
                  style={{
                    color: theme.colors.textDark,
                    fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                    fontSize: stepTitleSize,
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    color: theme.colors.textMedium,
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                    fontSize: stepDescSize,
                    lineHeight: 1.5,
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
