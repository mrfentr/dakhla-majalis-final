'use client';

import { theme } from './theme';
import {Link} from '@/i18n/navigation';
import { CheckCircle, ShieldCheck, RefreshCw, Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';
import Image from 'next/image';

export function LandingHero() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const fontFamily = isArabic ? theme.fonts.arabic : theme.fonts.latin;
  const titleFontFamily = isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle;

  return (
    <section
      className="w-full flex flex-col lg:flex-row items-stretch lg:items-center gap-8 md:gap-10 lg:gap-[60px] px-5 py-12 md:px-10 md:py-14 lg:px-20 lg:py-20 lg:min-h-[700px]"
      style={{
        backgroundColor: theme.colors.cream,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Hero Content */}
      <div
        className="flex flex-col gap-5 md:gap-6 lg:gap-8 w-full lg:flex-1"
      >
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 w-fit"
          style={{
            backgroundColor: theme.colors.lightFill,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <span className="text-[10px] md:text-xs" style={{ color: theme.colors.primary }}>✦</span>
          <span
            className="text-[11px] md:text-xs"
            style={{
              color: theme.colors.textMedium,
              fontFamily,
            }}
          >
            {t('hero.badge')}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-4xl md:text-5xl lg:text-7xl max-w-full md:max-w-[480px] lg:max-w-[550px]"
          style={{
            color: theme.colors.textDark,
            fontFamily: titleFontFamily,
            fontWeight: 'bold',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {t('hero.titleLine1')}
          <br />
          {t('hero.titleLine2')}
        </h1>

        {/* Subtitle */}
        <div
          className="flex flex-col gap-1.5 md:gap-2 max-w-full md:max-w-[420px] lg:max-w-[480px]"
        >
          <p
            className="text-base md:text-lg lg:text-xl"
            style={{
              color: theme.colors.textDark,
              fontFamily: titleFontFamily,
              fontWeight: 'bold',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t('hero.subtitle')}
          </p>
          <p
            className="text-sm md:text-[15px] lg:text-base"
            style={{
              color: theme.colors.textMedium,
              fontFamily,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {t('hero.description')}
          </p>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center"
        >
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2.5 text-center text-[15px] md:text-base px-6 py-3.5 md:px-7 md:py-4 lg:px-9 lg:py-[18px]"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#FFFFFF',
              fontFamily,
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            {tc('cta.startDesigning')}
            {isArabic ? <ArrowLeft className="w-[18px] h-[18px] md:w-5 md:h-5" color="#FFFFFF" /> : <ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" color="#FFFFFF" />}
          </Link>
          <a
            href="#products"
            className="block text-center text-[15px] md:text-base px-6 py-3.5 md:px-7 md:py-4 lg:px-9 lg:py-[18px]"
            style={{
              border: `2px solid ${theme.colors.primary}`,
              color: theme.colors.primary,
              fontFamily,
              textDecoration: 'none',
            }}
          >
            {tc('cta.viewProducts')}
          </a>
        </div>

        {/* Trust Badges */}
        <div
          className="grid grid-cols-2 lg:grid-cols-[auto_auto_auto_auto] gap-x-4 gap-y-3 md:gap-6 items-center justify-center lg:justify-start"
        >
          <div className="flex gap-1.5 items-center">
            <CheckCircle className="w-4 h-4 md:w-[18px] md:h-[18px] flex-shrink-0" color={theme.colors.primary} />
            <span
              className="text-xs md:text-[13px]"
              style={{
                color: theme.colors.textMedium,
                fontFamily,
              }}
            >
              {tc('trustBadges.deliveryAllMorocco')}
            </span>
          </div>
          <div className="flex gap-1.5 items-center">
            <ShieldCheck className="w-4 h-4 md:w-[18px] md:h-[18px] flex-shrink-0" color={theme.colors.primary} />
            <span
              className="text-xs md:text-[13px]"
              style={{
                color: theme.colors.textMedium,
                fontFamily,
              }}
            >
              {tc('trustBadges.warranty25Years')}
            </span>
          </div>
          <div className="flex gap-1.5 items-center">
            <RefreshCw className="w-4 h-4 md:w-[18px] md:h-[18px] flex-shrink-0" color={theme.colors.primary} />
            <span
              className="text-xs md:text-[13px]"
              style={{
                color: theme.colors.textMedium,
                fontFamily,
              }}
            >
              {tc('trustBadges.returnPolicy')}
            </span>
          </div>
          <div className="flex gap-1.5 items-center">
            <Phone className="w-4 h-4 md:w-[18px] md:h-[18px] flex-shrink-0" color={theme.colors.primary} />
            <span
              className="text-xs md:text-[13px]"
              style={{
                color: theme.colors.textMedium,
                fontFamily,
              }}
            >
              {tc('trustBadges.support247')}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div
        className="w-full lg:w-[640px] h-[200px] md:h-[300px] lg:h-auto lg:aspect-video flex-shrink-0 relative overflow-hidden rounded md:rounded-none"
      >
        <Image
          src="https://x619bxlezd.ufs.sh/f/hTbn04GjgYB4jGj90rC2Fbmlsd8HkYD4MrRywzX5IfuVaGtN"
          alt="الداخلة مجالس - مجالس صحراوية أصيلة"
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 640px"
          style={{
            objectFit: 'cover',
          }}
        />
      </div>
    </section>
  );
}
