'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from './theme';
import {useTranslations, useLocale} from 'next-intl';

interface FAQItemData {
  id: number;
  question: string;
  answer: string;
}

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

function FAQItem({
  item,
  isOpen,
  onToggle,
  isMobile,
  isTablet,
  isArabic,
}: {
  item: FAQItemData;
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isArabic: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  const questionFontSize = isMobile ? 16 : isTablet ? 17 : 18;
  const answerFontSize = isMobile ? 14 : isTablet ? 15 : 16;
  const itemPadding = isMobile ? '16px 18px' : isTablet ? '18px 24px' : '20px 28px';

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: isMobile ? 10 : 12,
        border: `1px solid ${isOpen ? theme.colors.primary + '40' : theme.colors.border}`,
        overflow: 'hidden',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isOpen ? `0 2px 12px ${theme.colors.primary}10` : 'none',
      }}
    >
      {/* Question button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: itemPadding,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span
          style={{
            color: isOpen ? theme.colors.primary : theme.colors.textDark,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: questionFontSize,
            fontWeight: 'bold',
            lineHeight: 1.6,
            flex: 1,
            transition: 'color 0.3s ease',
          }}
        >
          {item.question}
        </span>

        {/* Toggle icon */}
        <div
          style={{
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            minWidth: isMobile ? 32 : 36,
            borderRadius: '50%',
            backgroundColor: isOpen ? theme.colors.primary : theme.colors.lightFill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease, transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg
            width={isMobile ? 14 : 16}
            height={isMobile ? 14 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={isOpen ? '#FFFFFF' : theme.colors.textMedium}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Answer - animated container */}
      <div
        style={{
          maxHeight: isOpen ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          ref={contentRef}
          style={{
            padding: `0 ${isMobile ? '18px' : isTablet ? '24px' : '28px'} ${isMobile ? '16px' : isTablet ? '18px' : '20px'}`,
          }}
        >
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: answerFontSize,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingFAQ() {
  const t = useTranslations('home');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const faqItems: FAQItemData[] = [
    { id: 1, question: t('faq.q1'), answer: t('faq.a1') },
    { id: 2, question: t('faq.q2'), answer: t('faq.a2') },
    { id: 3, question: t('faq.q3'), answer: t('faq.a3') },
    { id: 4, question: t('faq.q4'), answer: t('faq.a4') },
    { id: 5, question: t('faq.q5'), answer: t('faq.a5') },
    { id: 6, question: t('faq.q6'), answer: t('faq.a6') },
    { id: 7, question: t('faq.q7'), answer: t('faq.a7') },
    { id: 8, question: t('faq.q8'), answer: t('faq.a8') },
  ];

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  const [openId, setOpenId] = useState<number | null>(null);

  const handleToggle = useCallback((id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  // Section padding
  const sectionPadding = isMobile
    ? '48px 16px'
    : isTablet
      ? '60px 32px'
      : '80px 120px';

  const sectionGap = isMobile ? 32 : isTablet ? 40 : 56;

  // Title sizes
  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;
  const descFontSize = isMobile ? 15 : isTablet ? 16 : 18;

  // FAQ items gap
  const itemsGap = isMobile ? 10 : isTablet ? 12 : 14;

  return (
    <section
      id="faq"
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
            {t('faq.badge')}
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
          {t('faq.title')}
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
          {t('faq.description')}
        </p>
      </div>

      {/* FAQ Items */}
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          display: 'flex',
          flexDirection: 'column',
          gap: itemsGap,
        }}
      >
        {faqItems.map((item) => (
          <FAQItem
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => handleToggle(item.id)}
            isMobile={isMobile}
            isTablet={isTablet}
            isArabic={isArabic}
          />
        ))}
      </div>
    </section>
  );
}
