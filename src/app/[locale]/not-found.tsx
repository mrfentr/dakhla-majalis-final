'use client';

import {Link} from '@/i18n/navigation';
import { LandingNavbar, LandingFooter, theme } from '@/components/landing';
import {useTranslations, useLocale} from 'next-intl';

export default function NotFound() {
  const t = useTranslations('notFound');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ backgroundColor: theme.colors.cream, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{
            fontSize: '120px',
            fontFamily: theme.fonts.arabicTitle,
            color: theme.colors.primary,
            margin: '0 0 20px 0',
            fontWeight: '700'
          }}>
            404
          </h1>

          <p style={{
            fontSize: '24px',
            fontFamily: theme.fonts.arabic,
            color: theme.colors.textDark,
            margin: '0 0 40px 0',
            lineHeight: '1.6'
          }}>
            {t('description')}
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              textDecoration: 'none',
              fontFamily: theme.fonts.arabic,
              fontSize: '16px',
              borderRadius: '4px',
              fontWeight: '500',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = '#A04D2A';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = theme.colors.primary;
            }}
          >
            {t('backToHome')}
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
