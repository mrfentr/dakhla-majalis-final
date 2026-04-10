'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import {Link} from '@/i18n/navigation';
import Image from 'next/image';
import { Building2, Instagram, Facebook, MessageCircle, Youtube } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

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

export function LandingFooter() {
  const t = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const quickLinks = [
    { label: t('nav.products'), href: '#products' },
    { label: t('nav.howWeWork'), href: '#how-it-works' },
    { label: t('footer.gallery'), href: '#gallery' },
    { label: t('nav.about'), href: '/about' },
    { label: t('nav.contact'), href: '/contact' },
    { label: t('footer.designTool'), href: '/checkout' },
  ];

  const infoLinks = [
    { label: t('footer.shipping'), href: '/shipping' },
    { label: t('footer.cgv'), href: '/conditions-generales-de-ventes' },
    { label: t('footer.returnPolicy'), href: '/politiques-de-retour' },
  ];

  const paymentMethods = [
    { icon: Building2, label: t('footer.bankTransfer') },
  ];

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // Responsive values
  const footerPaddingX = isMobile ? 20 : isTablet ? 40 : 120;
  const footerPaddingY = isMobile ? 40 : isTablet ? 48 : 60;
  const mainGap = isMobile ? 36 : isTablet ? 40 : 48;

  // Brand column width
  const brandWidth = isMobile ? '100%' : isTablet ? 260 : 320;

  // Font sizes
  const logoFontSize = isMobile ? 18 : isTablet ? 20 : 22;
  const logoImageSize = isMobile ? 38 : isTablet ? 40 : 44;
  const sectionTitleSize = isMobile ? 15 : 16;
  const bodyFontSize = isMobile ? 13 : 14;
  const copyrightFontSize = isMobile ? 12 : 13;

  // Social icon sizing (44px minimum tap target on mobile)
  const socialIconOuter = isMobile ? 44 : 36;
  const socialIconInner = isMobile ? 20 : 18;

  // Links column gap
  const linksColumnsGap = isMobile ? 32 : isTablet ? 40 : 80;

  // Link tap target min-height (44px on mobile for accessibility)
  const linkMinHeight = isMobile ? 44 : 32;

  return (
    <footer
      id="contact"
      style={{
        width: '100%',
        backgroundColor: theme.colors.darker,
        padding: `${footerPaddingY}px ${footerPaddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: mainGap,
        boxSizing: 'border-box',
      }}
    >
      {/* Main Footer Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: isMobile ? 36 : isTablet ? 32 : 0,
        }}
      >
        {/* Brand Column */}
        <div
          style={{
            width: brandWidth,
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 16 : 20,
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Image
                src="/logo.jpg"
                alt={t('brand')}
                width={logoImageSize}
                height={logoImageSize}
                style={{
                  borderRadius: 6,
                  objectFit: 'cover',
                  width: logoImageSize,
                  height: logoImageSize,
                }}
              />
              <span
                style={{
                  color: '#FFFFFF',
                  fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                  fontSize: logoFontSize,
                  fontWeight: 'bold',
                }}
              >
                {t('brand')}
              </span>
            </div>
          </Link>

          {/* Description */}
          <p
            style={{
              color: theme.colors.footerText,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: bodyFontSize,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: isMobile ? '100%' : 280,
            }}
          >
            {t('footer.description')}
          </p>
        </div>

        {/* Links Columns */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: linksColumnsGap,
            flexWrap: isTablet ? 'wrap' : 'nowrap',
          }}
        >
          {/* Quick Links */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 4 : 8,
            }}
          >
            <span
              style={{
                color: '#FFFFFF',
                fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                fontSize: sectionTitleSize,
                fontWeight: 'bold',
                marginBottom: isMobile ? 4 : 8,
              }}
            >
              {t('footer.quickLinks')}
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr' : '1fr',
                gap: isMobile ? '2px 16px' : isTablet ? '4px 24px' : '4px',
              }}
            >
              {quickLinks.map((link) => {
                const linkStyle = {
                  color: theme.colors.footerText,
                  fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                  fontSize: bodyFontSize,
                  textDecoration: 'none' as const,
                  minHeight: linkMinHeight,
                  display: 'flex' as const,
                  alignItems: 'center' as const,
                  transition: 'color 0.2s ease' as const,
                  whiteSpace: 'nowrap' as const,
                };
                return link.href.startsWith('#') ? (
                  <a key={link.label} href={link.href} style={linkStyle}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href} style={linkStyle}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Informations */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 4 : 8,
            }}
          >
            <span
              style={{
                color: '#FFFFFF',
                fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                fontSize: sectionTitleSize,
                fontWeight: 'bold',
                marginBottom: isMobile ? 4 : 8,
              }}
            >
              {t('footer.informations')}
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: isMobile ? '2px 16px' : '4px',
              }}
            >
              {infoLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  style={{
                    color: theme.colors.footerText,
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                    fontSize: bodyFontSize,
                    textDecoration: 'none',
                    minHeight: linkMinHeight,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 4 : 16,
            }}
          >
            <span
              style={{
                color: '#FFFFFF',
                fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                fontSize: sectionTitleSize,
                fontWeight: 'bold',
                marginBottom: isMobile ? 4 : 0,
              }}
            >
              {t('footer.contactUs')}
            </span>
            <span
              dir="ltr"
              style={{
                color: theme.colors.footerText,
                fontFamily: theme.fonts.english,
                fontSize: bodyFontSize,
                minHeight: linkMinHeight,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              0657059044
            </span>
            <span
              dir="ltr"
              style={{
                color: theme.colors.footerText,
                fontFamily: theme.fonts.english,
                fontSize: bodyFontSize,
                minHeight: linkMinHeight,
                display: 'flex',
                alignItems: 'center',
                wordBreak: 'break-all',
              }}
            >
              contact@dakhlamajalis.com
            </span>
            <span
              style={{
                color: theme.colors.footerText,
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: bodyFontSize,
                minHeight: linkMinHeight,
                display: 'flex',
                alignItems: 'center',
              }}
            >
             {t('footer.location')}
            </span>
          </div>

          {/* Payment Methods */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 4 : 16,
            }}
          >
            <span
              style={{
                color: '#FFFFFF',
                fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                fontSize: sectionTitleSize,
                fontWeight: 'bold',
                marginBottom: isMobile ? 4 : 0,
              }}
            >
              {t('footer.paymentMethods')}
            </span>
            {paymentMethods.map((method, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  minHeight: linkMinHeight,
                }}
              >
                <method.icon size={isMobile ? 18 : 16} color="#666666" />
                <span
                  style={{
                    color: theme.colors.footerText,
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                    fontSize: bodyFontSize,
                  }}
                >
                  {method.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '100%',
          height: 1,
          backgroundColor: theme.colors.footerDivider,
        }}
      />

      {/* Bottom Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'center',
          gap: isMobile ? 20 : 16,
        }}
      >
        {/* Copyright */}
        <span
          style={{
            color: '#666666',
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: copyrightFontSize,
            textAlign: isMobile ? 'center' : undefined,
            lineHeight: 1.6,
          }}
        >
          {t('footer.copyright')}
        </span>

        {/* Language Switcher */}
        <LanguageSwitcher variant="buttons" />

        {/* Social Links */}
        <div
          style={{
            display: 'flex',
            gap: isMobile ? 20 : 16,
            alignItems: 'center',
          }}
        >
          <a
            href="https://www.instagram.com/dakhlamajalis/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: socialIconOuter,
              height: socialIconOuter,
              borderRadius: '50%',
              backgroundColor: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Instagram size={socialIconInner} color={theme.colors.footerText} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61550496458618"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: socialIconOuter,
              height: socialIconOuter,
              borderRadius: '50%',
              backgroundColor: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Facebook size={socialIconInner} color={theme.colors.footerText} />
          </a>
          <a
            href="https://www.tiktok.com/@dakhlamajalis"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: socialIconOuter,
              height: socialIconOuter,
              borderRadius: '50%',
              backgroundColor: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width={socialIconInner}
              height={socialIconInner}
              viewBox="0 0 24 24"
              fill={theme.colors.footerText}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@DakhlaMajalis"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: socialIconOuter,
              height: socialIconOuter,
              borderRadius: '50%',
              backgroundColor: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Youtube size={socialIconInner} color={theme.colors.footerText} />
          </a>
          <a
            href="https://wa.me/212657059044"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: socialIconOuter,
              height: socialIconOuter,
              borderRadius: '50%',
              backgroundColor: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={socialIconInner} color={theme.colors.footerText} />
          </a>
        </div>
      </div>
    </footer>
  );
}
