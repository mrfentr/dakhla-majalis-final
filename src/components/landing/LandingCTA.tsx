'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import {Link} from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Phone, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function getBreakpoint(): Breakpoint {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    }

    setBreakpoint(getBreakpoint());

    const handleResize = () => setBreakpoint(getBreakpoint());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Before mount, return 'desktop' to match SSR
  if (!mounted) return 'desktop';
  return breakpoint;
}

export function LandingCTA() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // Section padding: mobile 40px 20px, tablet 60px 40px, desktop 80px 120px
  const sectionPaddingY = isMobile ? 48 : isTablet ? 60 : 80;
  const sectionPaddingX = isMobile ? 20 : isTablet ? 40 : 120;

  // Title font size: mobile 32, tablet 42, desktop 52
  const titleFontSize = isMobile ? 32 : isTablet ? 42 : 52;

  // Description font size: mobile 16, tablet 18, desktop 20
  const descFontSize = isMobile ? 16 : isTablet ? 18 : 20;

  // Button font size: mobile 16, tablet 17, desktop 18
  const btnFontSize = isMobile ? 16 : isTablet ? 17 : 18;

  // Button padding: mobile full-width with good touch target, tablet/desktop as before
  const btnPaddingY = isMobile ? 14 : 18;
  const btnPaddingX = isMobile ? 24 : isTablet ? 32 : 40;

  // Gap between section items: mobile 24, tablet 28, desktop 32
  const sectionGap = isMobile ? 24 : isTablet ? 28 : 32;

  // Trust badges gap: mobile 16, tablet 24, desktop 32
  const badgesGap = isMobile ? 16 : isTablet ? 24 : 32;

  // Trust badge font size
  const badgeFontSize = isMobile ? 13 : 14;

  // Decorative pattern font size
  const patternFontSize = isMobile ? 18 : 24;

  return (
    <section
      style={{
        width: '100%',
        backgroundColor: theme.colors.primary,
        padding: `${sectionPaddingY}px ${sectionPaddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
        alignItems: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Pattern */}
      <span
        style={{
          color: 'rgba(255, 255, 255, 0.25)',
          fontFamily: theme.fonts.decorative,
          fontSize: patternFontSize,
        }}
      >
        ◇ ◇ ◇
      </span>

      {/* Title */}
      <h2
        style={{
          color: '#FFFFFF',
          fontFamily: isRTL ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
          fontSize: titleFontSize,
          fontWeight: 'bold',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.3,
          maxWidth: isMobile ? '100%' : undefined,
        }}
      >
        {t('cta.title')}
      </h2>

      {/* Description */}
      <p
        style={{
          color: 'rgba(255, 255, 255, 0.8)',
          fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
          fontSize: descFontSize,
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.7,
          maxWidth: isMobile ? '100%' : isTablet ? 500 : 600,
          padding: isMobile ? '0 4px' : undefined,
        }}
      >
        {t('cta.description')}
      </p>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 16,
          alignItems: 'center',
          width: isMobile ? '100%' : undefined,
        }}
      >
        <Link
          href="/checkout"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            color: theme.colors.primary,
            fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: btnFontSize,
            fontWeight: 'bold',
            padding: `${btnPaddingY}px ${btnPaddingX}px`,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            minHeight: 48,
            width: isMobile ? '100%' : undefined,
            boxSizing: 'border-box',
          }}
        >
          {tc('cta.designNow')}
          {isRTL ? <ArrowLeft size={isMobile ? 18 : 20} color={theme.colors.primary} /> : <ArrowRight size={isMobile ? 18 : 20} color={theme.colors.primary} />}
        </Link>
        <a
          href="#contact"
          style={{
            border: '2px solid #FFFFFF',
            borderRadius: 8,
            color: '#FFFFFF',
            fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: btnFontSize,
            fontWeight: 'bold',
            padding: `${btnPaddingY}px ${btnPaddingX}px`,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            minHeight: 48,
            width: isMobile ? '100%' : undefined,
            boxSizing: 'border-box',
          }}
        >
          <Phone size={isMobile ? 16 : 18} color="#FFFFFF" />
          {tc('cta.contactUs')}
        </a>
      </div>

      {/* Trust Badges */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: badgesGap,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ShieldCheck size={isMobile ? 16 : 18} color="#FFFFFF" />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: badgeFontSize,
            }}
          >
            {tc('trustBadges.qualityGuarantee')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Truck size={isMobile ? 16 : 18} color="#FFFFFF" />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: badgeFontSize,
            }}
          >
            {tc('trustBadges.deliveryMorocco')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <CreditCard size={isMobile ? 16 : 18} color="#FFFFFF" />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: isRTL ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: badgeFontSize,
            }}
          >
            {tc('trustBadges.securePayment')}
          </span>
        </div>
      </div>
    </section>
  );
}
