'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import {Link} from '@/i18n/navigation';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { Check, Home, Phone, Copy, Loader2, Download } from 'lucide-react';
import {useTranslations, useLocale} from 'next-intl';

const theme = {
  colors: {
    cream: '#FDFBF7',
    white: '#FFFFFF',
    dark: '#1A1A1A',
    primary: '#B85C38',
    primaryLight: '#B85C3815',
    green: '#22C55E',
    greenLight: '#22C55E15',
    whatsapp: '#25D366',
    textDark: '#1A1A1A',
    textMedium: '#5A5A5A',
    textLight: '#8A8A8A',
    textMuted: '#A0A0A0',
    border: '#E8E0D5',
    lightFill: '#F5F0E8',
  },
  fonts: {
    arabic: "'Noto Naskh Arabic', serif",
    english: "'DM Sans', sans-serif",
    decorative: "'Playfair Display', serif",
  },
};

function getNextSteps(isDirectPurchase: boolean, t: (key: string) => string) {
  if (isDirectPurchase) {
    return [
      { num: '1', text: t('nextSteps.roomMeasurement.step1') },
      { num: '2', text: t('nextSteps.roomMeasurement.step2') },
      { num: '3', text: t('nextSteps.directPurchase.step3') },
      { num: '4', text: t('nextSteps.directPurchase.step4') },
    ];
  }
  return [
    { num: '1', text: t('nextSteps.roomMeasurement.step1') },
    { num: '2', text: t('nextSteps.roomMeasurement.step2') },
    { num: '3', text: t('nextSteps.roomMeasurement.step3') },
    { num: '4', text: t('nextSteps.roomMeasurement.step4') },
  ];
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  const getBreakpoint = useCallback((): Breakpoint => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }, []);

  useEffect(() => {
    setBreakpoint(getBreakpoint());

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getBreakpoint]);

  return breakpoint;
}

// Helper to format layout type in Arabic
function getLayoutTypeArabic(layoutType: string, t: (key: string) => string): string {
  const layoutMap: Record<string, string> = {
    'single-wall': t('layoutTypes.singleWall'),
    'l-shape': t('layoutTypes.lShape'),
    'u-shape': t('layoutTypes.uShape'),
    'four-walls': t('layoutTypes.fourWalls'),
    'straight': t('layoutTypes.singleWall'),
    'l_shape': t('layoutTypes.lShape'),
    'u_shape': t('layoutTypes.uShape'),
  };
  return layoutMap[layoutType] || layoutType;
}

// Helper to format price with western numerals
function formatPrice(price: number): string {
  return price.toLocaleString();
}

// Helper to get locale-aware WhatsApp message
function getWhatsAppMessage(
  locale: string,
  data: {
    isDirectPurchase: boolean;
    reference: string;
    customerName: string;
    products?: Array<{ name: string; quantity: number }>;
    totalPrice: number;
    city?: string;
    layoutType?: string;
    totalGlssa?: number;
    totalWssada?: number;
    getLayoutTypeLabel?: (type: string) => string;
  }
): string {
  const { isDirectPurchase, reference, customerName, products, totalPrice, city, layoutType, totalGlssa, totalWssada, getLayoutTypeLabel } = data;

  if (locale === 'fr') {
    if (isDirectPurchase) {
      return `Bonjour, je souhaite confirmer ma commande\n\n` +
        `N° de commande : ${reference}\n` +
        `Nom : ${customerName}\n` +
        `\nProduits :\n` +
        (products?.map(p => `- ${p.name} (x${p.quantity})`).join('\n') || '') +
        `\n\nMontant total : ${formatPrice(totalPrice)} MAD\n` +
        (city ? `Ville : ${city}\n` : '') +
        `\nEn attente des détails du prix et du mode de paiement. Merci !`;
    }
    return `Bonjour, je souhaite confirmer ma commande\n\n` +
      `N° de commande : ${reference}\n` +
      `Nom : ${customerName}\n` +
      `Type de salon : ${getLayoutTypeLabel?.(layoutType || '') || layoutType}\n` +
      `Nombre de glssa : ${totalGlssa}\n` +
      `Nombre de coussins : ${totalWssada}\n` +
      `\nMontant total : ${formatPrice(totalPrice)} MAD\n` +
      (city ? `Ville : ${city}\n` : '') +
      `\nEn attente des détails du prix et du mode de paiement. Merci !`;
  }

  if (locale === 'en') {
    if (isDirectPurchase) {
      return `Hello, I would like to confirm my order\n\n` +
        `Order number: ${reference}\n` +
        `Name: ${customerName}\n` +
        `\nProducts:\n` +
        (products?.map(p => `- ${p.name} (x${p.quantity})`).join('\n') || '') +
        `\n\nTotal amount: ${formatPrice(totalPrice)} MAD\n` +
        (city ? `City: ${city}\n` : '') +
        `\nWaiting for price details and payment method. Thank you!`;
    }
    return `Hello, I would like to confirm my order\n\n` +
      `Order number: ${reference}\n` +
      `Name: ${customerName}\n` +
      `Layout type: ${getLayoutTypeLabel?.(layoutType || '') || layoutType}\n` +
      `Glssa count: ${totalGlssa}\n` +
      `Cushion count: ${totalWssada}\n` +
      `\nTotal amount: ${formatPrice(totalPrice)} MAD\n` +
      (city ? `City: ${city}\n` : '') +
      `\nWaiting for price details and payment method. Thank you!`;
  }

  // Default: Arabic
  if (isDirectPurchase) {
    return `مرحباً، أريد تأكيد طلبي\n\n` +
      `رقم الطلب: ${reference}\n` +
      `الاسم: ${customerName}\n` +
      `\nالمنتجات:\n` +
      (products?.map(p => `- ${p.name} (x${p.quantity})`).join('\n') || '') +
      `\n\nالمبلغ الإجمالي: ${formatPrice(totalPrice)} درهم\n` +
      (city ? `المدينة: ${city}\n` : '') +
      `\nفي انتظار تفاصيل السعر وطريقة الدفع. شكراً لكم!`;
  }
  return `مرحباً، أريد تأكيد طلبي\n\n` +
    `رقم الطلب: ${reference}\n` +
    `الاسم: ${customerName}\n` +
    `نوع المجلس: ${getLayoutTypeLabel?.(layoutType || '') || layoutType}\n` +
    `عدد الجلسات: ${totalGlssa}\n` +
    `عدد الوسائد: ${totalWssada}\n` +
    `\nالمبلغ الإجمالي: ${formatPrice(totalPrice)} درهم\n` +
    (city ? `المدينة: ${city}\n` : '') +
    `\nفي انتظار تفاصيل السعر وطريقة الدفع. شكراً لكم!`;
}

function ThankYouContent() {
  const t = useTranslations('thankYou');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const searchParams = useSearchParams();
  const reference = searchParams?.get('ref') ?? null;
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // Fetch order data from Convex
  const order = useQuery(api.orders.getOrderByReference, reference ? { reference } : 'skip');

  // Resolve the design image - must be before any early returns to maintain hooks order
  const diagramRef = order?.layoutVisualization?.diagramUrl;
  const isStorageId = diagramRef && typeof diagramRef === 'string' && !diagramRef.startsWith('data:');
  const resolvedImageUrl = useQuery(
    api.orders.getImageUrl,
    isStorageId ? { storageId: diagramRef as Id<"_storage"> } : 'skip'
  );

  const [copied, setCopied] = useState(false);
  const [ribCopied, setRibCopied] = useState<string | false>(false);
  const [amountCopied, setAmountCopied] = useState(false);

  const copyOrderNumber = () => {
    if (reference) {
      navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadImage = () => {
    if (!svgDataUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `majalis-${reference || 'design'}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        'image/jpeg',
        0.98
      );
    };
    img.src = svgDataUrl;
  };

  // Responsive values
  const headerPadding = isMobile ? '0 16px' : isTablet ? '0 32px' : '0 60px';
  const headerHeight = isMobile ? 60 : 72;

  // Loading state
  if (order === undefined) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          backgroundColor: theme.colors.cream,
          fontFamily: theme.fonts.arabic,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '0 16px' : 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={isMobile ? 36 : 48} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: theme.colors.textMedium, fontSize: isMobile ? 15 : 18, textAlign: 'center' }}>{t('loading')}</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Error state - order not found
  if (!order || !reference) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          backgroundColor: theme.colors.cream,
          fontFamily: theme.fonts.arabic,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          style={{
            width: '100%',
            height: headerHeight,
            backgroundColor: theme.colors.white,
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: headerPadding,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center' }}>
            <Image
              src="/logo.jpg"
              alt="Dakhla Majalis"
              width={isMobile ? 30 : 36}
              height={isMobile ? 30 : 36}
              style={{ borderRadius: 4, objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  color: theme.colors.textDark,
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 15 : 18,
                  fontWeight: 'bold',
                }}
              >
                {t('brandName')}
              </span>
            </div>
          </Link>
        </header>

        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: isMobile ? 16 : 24,
            padding: isMobile ? '40px 20px' : '60px 40px',
          }}
        >
          <h1 style={{ color: theme.colors.textDark, fontSize: isMobile ? 24 : 32, fontWeight: 'bold', textAlign: 'center', margin: 0 }}>{t('notFound.title')}</h1>
          <p style={{ color: theme.colors.textMedium, fontSize: isMobile ? 14 : 16, textAlign: 'center' }}>
            {!reference ? t('notFound.noReference') : t('notFound.notFoundMessage')}
          </p>
          <Link
            href="/"
            style={{
              padding: isMobile ? '12px 20px' : '12px 24px',
              backgroundColor: theme.colors.primary,
              color: '#FFFFFF',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: isMobile ? 14 : 16,
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {t('notFound.backToHome')}
          </Link>
        </main>
      </div>
    );
  }

  // Extract order data
  const totalGlssa = order.calculations?.totalGlassat || 0;
  const totalWssada = order.calculations?.totalWsayd || 0;
  const layoutType = order.roomMeasurements?.layoutType || 'custom';
  // Use resolved URL for storageId, or raw data URL for legacy orders
  const svgDataUrl = isStorageId ? (resolvedImageUrl ?? null) : diagramRef;
  const totalPrice = order.pricing?.total || 0;
  const isDirectPurchase = order.orderType === 'direct_purchase';
  const nextSteps = getNextSteps(isDirectPurchase, t);
  const customerName = order.customerInfo?.name || '';

  // Main content responsive values
  const mainPadding = isMobile ? '32px 16px' : isTablet ? '40px 32px' : '60px 120px';
  const mainGap = isMobile ? 32 : isTablet ? 40 : 60;
  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;
  const subtitleFontSize = isMobile ? 17 : isTablet ? 20 : 22;
  const descFontSize = isMobile ? 14 : 16;
  const successIconSize = isMobile ? 72 : isTablet ? 86 : 100;
  const checkIconSize = isMobile ? 34 : isTablet ? 40 : 48;
  const stepsMaxWidth = isMobile ? '100%' : isTablet ? '100%' : 500;
  const orderCardWidth = isMobile ? '100%' : isTablet ? '100%' : 420;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.cream,
        fontFamily: theme.fonts.arabic,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          width: '100%',
          height: headerHeight,
          backgroundColor: theme.colors.white,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: headerPadding,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center' }}>
          <Image
            src="/logo.jpg"
            alt="Dakhla Majalis"
            width={isMobile ? 30 : 36}
            height={isMobile ? 30 : 36}
            style={{ borderRadius: 4, objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 15 : 18,
                fontWeight: 'bold',
              }}
            >
              {t('brandName')}
            </span>
          </div>
        </Link>

        {/* Home Button */}
        <Link
          href="/"
          style={{
            display: 'flex',
            gap: isMobile ? 4 : 8,
            alignItems: 'center',
            padding: isMobile ? '8px 12px' : '10px 20px',
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            textDecoration: 'none',
          }}
        >
          <Home size={isMobile ? 14 : 16} color={theme.colors.textMedium} />
          {!isMobile && (
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: 14 }}>
              {t('homeButton')}
            </span>
          )}
        </Link>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: mainGap,
          padding: mainPadding,
          alignItems: isMobile || isTablet ? 'stretch' : 'center',
          justifyContent: 'center',
          flexDirection: isMobile || isTablet ? 'column' : 'row',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Left - Content */}
        <div
          style={{
            flex: isMobile || isTablet ? 'unset' : 1,
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 24 : 32,
            alignItems: 'center',
          }}
        >
          {/* Success Icon */}
          <div
            style={{
              width: successIconSize,
              height: successIconSize,
              borderRadius: successIconSize / 2,
              backgroundColor: theme.colors.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={checkIconSize} color="#FFFFFF" strokeWidth={3} />
          </div>

          {/* Title Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 8 : 12,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <h1
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: titleFontSize,
                fontWeight: 'bold',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {t('title', { name: customerName ? ` ${customerName}` : '' })}
            </h1>
            <p
              style={{
                color: theme.colors.green,
                fontFamily: theme.fonts.arabic,
                fontSize: subtitleFontSize,
                margin: 0,
                textAlign: 'center',
              }}
            >
              {t('subtitle')}
            </p>
            <p
              style={{
                color: theme.colors.textMedium,
                fontFamily: theme.fonts.arabic,
                fontSize: descFontSize,
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: isMobile ? '100%' : 500,
                margin: 0,
              }}
            >
              {t('description')}
            </p>
          </div>

          {/* Order Reference */}
          <div
            style={{
              backgroundColor: theme.colors.lightFill,
              borderRadius: 8,
              padding: isMobile ? '12px 16px' : '16px 32px',
              display: 'flex',
              gap: isMobile ? 8 : 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 15 }}>
              {t('whatsapp.orderRefLabel')}
            </span>
            <span
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.english,
                fontSize: isMobile ? 13 : 16,
                fontWeight: 'bold',
                wordBreak: 'break-all',
                userSelect: 'all',
                WebkitUserSelect: 'all',
              }}
            >
              {reference}
            </span>
            <button
              onClick={copyOrderNumber}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
              }}
              title={t('copyOrderRef')}
            >
              {copied ? (
                <Check size={16} color={theme.colors.green} />
              ) : (
                <Copy size={16} color={theme.colors.primary} />
              )}
            </button>
          </div>

          {/* WhatsApp Pricing Discussion Section */}
          <div
            style={{
              width: isMobile ? '100%' : stepsMaxWidth,
              maxWidth: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: isMobile ? 12 : 16,
              border: `1px solid ${theme.colors.border}`,
              padding: isMobile ? 20 : 28,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 16 : 20,
              boxSizing: 'border-box',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* WhatsApp Icon */}
            <div
              style={{
                width: isMobile ? 52 : 60,
                height: isMobile ? 52 : 60,
                borderRadius: isMobile ? 26 : 30,
                backgroundColor: '#25D36615',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={isMobile ? 26 : 30} height={isMobile ? 26 : 30} viewBox="0 0 24 24" fill={theme.colors.whatsapp}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8 }}>
              <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 18, fontWeight: 'bold' }}>
                {t('whatsapp.title')}
              </span>
              <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, margin: 0, lineHeight: 1.7 }}>
                {t('whatsapp.description')}
              </p>
            </div>

            {/* WhatsApp CTA Button */}
            <a
              href={`https://wa.me/212657059044?text=${encodeURIComponent(
                getWhatsAppMessage(locale, {
                  isDirectPurchase,
                  reference: reference || '',
                  customerName,
                  products: order.products?.map((p: any) => ({ name: p.name, quantity: p.quantity })),
                  totalPrice,
                  city: order?.customerInfo?.address?.city,
                  layoutType,
                  totalGlssa,
                  totalWssada,
                  getLayoutTypeLabel: (type: string) => getLayoutTypeArabic(type, t),
                })
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '14px 24px' : '14px 32px',
                borderRadius: 12,
                backgroundColor: theme.colors.whatsapp,
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 52,
                transition: 'opacity 0.2s',
              }}
            >
              <svg width={isMobile ? 22 : 20} height={isMobile ? 22 : 20} viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span style={{ color: '#FFFFFF', fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 15, fontWeight: 'bold' }}>
                {t('whatsapp.cta')}
              </span>
            </a>
          </div>

          {/* Bank Transfer / RIB Payment Section */}
          <div
            style={{
              width: isMobile ? '100%' : stepsMaxWidth,
              maxWidth: '100%',
              backgroundColor: theme.colors.white,
              borderRadius: isMobile ? 12 : 16,
              border: `1px solid ${theme.colors.border}`,
              padding: isMobile ? 20 : 28,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 16 : 20,
              boxSizing: 'border-box',
            }}
          >
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
              <svg width={isMobile ? 22 : 26} height={isMobile ? 22 : 26} viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="6" width="22" height="14" rx="2" />
                <path d="M1 10h22" />
                <path d="M6 14h4" />
              </svg>
              <span style={{
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 16 : 18,
                fontWeight: 'bold',
                color: theme.colors.textDark,
              }}>
                {t('payment.title')}
              </span>
            </div>

            <p style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, margin: 0, lineHeight: 1.7, textAlign: 'center' }}>
              {t('payment.description')}
            </p>

            {/* Deposit Amount - prominent and copyable */}
            <div style={{
              backgroundColor: '#FFF8F0',
              border: `2px solid ${theme.colors.primary}30`,
              borderRadius: 12,
              padding: isMobile ? 14 : 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13, color: theme.colors.textMedium }}>
                {t('payment.depositAmount')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: theme.fonts.arabic,
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 'bold',
                  color: theme.colors.primary,
                }}>
                  <span style={{ direction: 'ltr', display: 'inline-block' }}>{formatPrice(Math.ceil(totalPrice / 2))} {t('orderDetails.currency')}</span>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(Math.ceil(totalPrice / 2)));
                    setAmountCopied(true);
                    setTimeout(() => setAmountCopied(false), 2000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${amountCopied ? theme.colors.green : theme.colors.border}`,
                    backgroundColor: amountCopied ? theme.colors.greenLight : theme.colors.white,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  {amountCopied ? (
                    <Check size={14} color={theme.colors.green} />
                  ) : (
                    <Copy size={14} color={theme.colors.textMedium} />
                  )}
                </button>
              </div>
              <span style={{ fontFamily: theme.fonts.arabic, fontSize: isMobile ? 11 : 12, color: theme.colors.textLight }}>
                {t('payment.fullAmount')}: {formatPrice(totalPrice)} {t('orderDetails.currency')}
              </span>
            </div>

            {/* Bank Option 1: CIH */}
            {[
              { bank: 'CIH', rib: '230530518868222102590036', holder: 'Sud Academy' },
              { bank: 'Barid Bank', rib: '350810000000001181451152', holder: 'Sud Academy' },
            ].map((opt) => (
              <div key={opt.bank} style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 10,
                padding: isMobile ? 12 : 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                backgroundColor: theme.colors.lightFill,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: theme.fonts.english, fontSize: isMobile ? 14 : 15, fontWeight: 'bold', color: theme.colors.textDark }}>
                    {opt.bank}
                  </span>
                  <span style={{ fontFamily: theme.fonts.arabic, fontSize: isMobile ? 11 : 12, color: theme.colors.textLight }}>
                    {opt.holder}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span dir="ltr" style={{
                    fontFamily: theme.fonts.english,
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 600,
                    color: theme.colors.textDark,
                    letterSpacing: '0.5px',
                    backgroundColor: theme.colors.white,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.colors.border}`,
                    flex: 1,
                    minWidth: 0,
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    userSelect: 'all',
                    WebkitUserSelect: 'all',
                  }}>
                    {opt.rib}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(opt.rib);
                      setRibCopied(opt.bank);
                      setTimeout(() => setRibCopied(false), 2000);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${ribCopied === opt.bank ? theme.colors.green : theme.colors.border}`,
                      backgroundColor: ribCopied === opt.bank ? theme.colors.greenLight : theme.colors.white,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    {ribCopied === opt.bank ? (
                      <Check size={14} color={theme.colors.green} />
                    ) : (
                      <Copy size={14} color={theme.colors.textMedium} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          <div
            style={{
              width: stepsMaxWidth,
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 12 : 16,
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                color: theme.colors.textDark,
                fontFamily: theme.fonts.arabic,
                fontSize: isMobile ? 16 : 18,
                fontWeight: 'bold',
                textAlign: 'center',
                margin: 0,
              }}
            >
              {t('nextSteps.title')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
              {nextSteps.map((step, index) => (
                <div key={index} style={{ display: 'flex', gap: isMobile ? 10 : 12, alignItems: 'center' }}>
                  <div
                    style={{
                      width: isMobile ? 24 : 28,
                      height: isMobile ? 24 : 28,
                      borderRadius: isMobile ? 12 : 14,
                      backgroundColor: theme.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        color: '#FFFFFF',
                        fontFamily: theme.fonts.arabic,
                        fontSize: isMobile ? 12 : 14,
                        fontWeight: 'bold',
                      }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, lineHeight: 1.5 }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact - Phone Call */}
          <a
            href="tel:+212657059044"
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              padding: isMobile ? '12px 20px' : '10px 24px',
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              textDecoration: 'none',
              width: isMobile ? '100%' : 'auto',
              boxSizing: 'border-box',
              minHeight: 44,
            }}
          >
            <Phone size={isMobile ? 18 : 16} color={theme.colors.textMedium} />
            <span style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 13 }}>
              {t('callUs')}
            </span>
            <span dir="ltr" style={{ color: theme.colors.textMedium, fontFamily: theme.fonts.english, fontSize: isMobile ? 14 : 14 }}>
              +212 657-059044
            </span>
          </a>
        </div>

        {/* Right - Order Card */}
        <div
          style={{
            width: orderCardWidth,
            maxWidth: '100%',
            backgroundColor: theme.colors.white,
            borderRadius: isMobile ? 12 : 16,
            border: `1px solid ${theme.colors.border}`,
            padding: isMobile ? 16 : 24,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 16 : 20,
            boxSizing: 'border-box',
            alignSelf: isMobile || isTablet ? 'stretch' : 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span
              style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 16 : 18, fontWeight: 'bold' }}
            >
              {t('orderDetails.title')}
            </span>
            <div
              style={{
                backgroundColor: theme.colors.greenLight,
                borderRadius: 4,
                padding: isMobile ? '4px 10px' : '6px 12px',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.green }} />
              <span style={{ color: theme.colors.green, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 11 : 12 }}>
                {t('orderDetails.status')}
              </span>
            </div>
          </div>

          {isDirectPurchase ? (
            <>
              {/* Direct Purchase: Product List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                {order.products?.map((product: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px 0' : '10px 0', borderBottom: index < (order.products?.length || 0) - 1 ? `1px solid ${theme.colors.border}` : 'none', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
                      {product.image && (
                        <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, backgroundColor: theme.colors.lightFill }}>
                          <Image src={product.image} alt={product.name} fill style={{ objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, fontWeight: 'bold', display: 'block', wordBreak: 'break-word' }}>
                          {product.name}
                        </span>
                        <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 12 : 13 }}>
                          x{product.quantity}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14, fontWeight: 'bold', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{product.totalPrice?.toLocaleString()} {t('orderDetails.currency')}</span>
                    </span>
                  </div>
                ))}
              </div>
              {order.customerInfo?.address?.city && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {t('orderDetails.deliveryTo')}
                  </span>
                  <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {order.customerInfo.address.city}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Room Measurement: SVG Preview + Details */}
              <div
                style={{
                  width: '100%',
                  minHeight: isMobile ? 140 : 180,
                  backgroundColor: theme.colors.lightFill,
                  borderRadius: isMobile ? 8 : 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {svgDataUrl ? (
                  <img
                    src={svgDataUrl}
                    alt={t('orderDetails.designPreview')}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: isMobile ? 200 : 300,
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {t('orderDetails.designPreview')}
                  </span>
                )}
              </div>

              {/* Download Button */}
              {svgDataUrl && (
                <button
                  onClick={handleDownloadImage}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isMobile ? '10px 16px' : '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.white,
                    cursor: 'pointer',
                    fontFamily: theme.fonts.arabic,
                    width: '100%',
                    minHeight: isMobile ? 44 : 36,
                  }}
                >
                  <Download size={isMobile ? 16 : 14} color={theme.colors.textMedium} />
                  <span style={{ fontSize: isMobile ? 13 : 13, color: theme.colors.textMedium }}>
                    {t('orderDetails.downloadDesign')}
                  </span>
                </button>
              )}

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {t('orderDetails.design')}
                  </span>
                  <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {getLayoutTypeArabic(layoutType, t)} - {String(totalGlssa)} {t('orderDetails.glssaUnit')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {t('orderDetails.cushionCount')}
                  </span>
                  <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                    {String(totalWssada)} {t('orderDetails.cushionUnit')}
                  </span>
                </div>
                {order.customerInfo?.address?.city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: theme.colors.textLight, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                      {t('orderDetails.deliveryTo')}
                    </span>
                    <span style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 13 : 14 }}>
                      {order.customerInfo.address.city}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: theme.colors.border }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{ color: theme.colors.textDark, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 14 : 16, fontWeight: 'bold' }}
            >
              {t('orderDetails.total')}
            </span>
            <span
              style={{ color: theme.colors.primary, fontFamily: theme.fonts.arabic, fontSize: isMobile ? 17 : 20, fontWeight: 'bold' }}
            >
              <span style={{ direction: 'ltr', display: 'inline-block' }}>{formatPrice(totalPrice)} {t('orderDetails.currency')}</span>
            </span>
          </div>


        </div>
      </main>
    </div>
  );
}

export default function ThankYouPage() {
  const wrapperLocale = useLocale();
  const wrapperIsRTL = wrapperLocale === 'ar';
  return (
    <Suspense
      fallback={
        <div
          dir={wrapperIsRTL ? 'rtl' : 'ltr'}
          style={{
            minHeight: '100vh',
            backgroundColor: theme.colors.cream,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={48} color={theme.colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
