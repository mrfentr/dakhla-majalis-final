'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import { theme } from './theme';
import { useGetProducts, useGetCategories } from '@/hooks/useConvex';
import { ProductImageCarousel } from '@/components/ProductImageCarousel';
import { CategoryCard } from '@/components/shared/CategoryCard';
import {useTranslations, useLocale} from 'next-intl';
import { getLocalizedField } from '@/lib/utils';

/* ─── Scroll-hint fade animation ─────────────────────────────── */
const SCROLL_HINT_STYLES = `
@keyframes dm-swipe-bounce {
  0%   { transform: translateX(0);    opacity: 0.9; }
  40%  { transform: translateX(6px);  opacity: 1;   }
  70%  { transform: translateX(-2px); opacity: 0.8; }
  100% { transform: translateX(0);    opacity: 0.9; }
}
@keyframes dm-hint-fade-out {
  0%   { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; pointer-events: none; }
}
.dm-scroll-hint-icon {
  animation: dm-swipe-bounce 1.4s ease-in-out infinite;
}
.dm-scroll-hint-overlay {
  animation: dm-hint-fade-out 3.5s ease forwards;
}
`;

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 480px)');
    const tabletQuery = window.matchMedia('(min-width: 481px) and (max-width: 1024px)');

    const update = () => {
      if (mobileQuery.matches) {
        setBreakpoint('mobile');
      } else if (tabletQuery.matches) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    update();
    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);

    return () => {
      mobileQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}

export function LandingProducts() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [scrolledCategories, setScrolledCategories] = useState<Set<string>>(new Set());
  const dbProducts = useGetProducts();
  const dbCategories = useGetCategories({ activeOnly: true, topLevelOnly: true }); // only active top-level categories
  const bp = useBreakpoint();


  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleRowScroll = useCallback((slug: string) => {
    setScrolledCategories((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  }, []);


  const products = dbProducts
    ? dbProducts
        .filter((p) => !p.isMandatory)
        .map((p) => ({
          _id: p._id,
          name: getLocalizedField(p.title, locale),
          subtitle: locale === 'ar' ? p.title.fr : (locale === 'fr' ? p.title.ar : p.title.fr),
          description: getLocalizedField(p.description, locale),
          image: p.image,
          images: [p.image, ...(p.gallery?.map((g: { url: string }) => g.url) || [])],
          price:
            p.productType === 'majalis_set'
              ? t('products.priceCalculated')
              : `${p.pricing.basePrice.toLocaleString()} ${tc('currency')}`,
          type: p.productType === 'majalis_set' ? ('pattern' as const) : ('individual' as const),
          slug: p.slug,
          productId: p._id,
          category: p.category,
          rating: p.rating || 0,
          isPopular: p.isPopular || false,
          stockQuantity: p.inventory?.stockQuantity ?? 0,
        }))
    : [];

  const getProductsForCategory = useCallback(
    (slug: string) => products.filter((p) => p.category === slug),
    [products]
  );


  const handleScroll = (slug: string, direction: 'left' | 'right') => {
    const container = scrollRefs.current[slug];
    if (!container) return;
    const scrollAmount = isMobile ? 240 : 300;
    container.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleClick = (product: (typeof products)[0]) => {
    if (product.type === 'individual' && product.slug) {
      router.push(`/product/${product.slug}`);
    } else if (product.type === 'pattern') {
      router.push(`/checkout?product=${product.productId}`);
    }
  };

  // Responsive values
  const sectionPadding = isMobile
    ? '48px 16px'
    : isTablet
      ? '60px 24px'
      : '80px 40px';

  const sectionGap = isMobile ? 32 : isTablet ? 40 : 48;

  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;

  const descFontSize = isMobile ? 15 : isTablet ? 16 : 18;

  const gridGap = isMobile ? 16 : isTablet ? 20 : 28;

  // Product card responsive values (KEPT EXACTLY AS-IS)
  const cardWidth = isMobile
    ? '100%'
    : isTablet
      ? `calc(50% - ${gridGap / 2}px)`
      : 360;

  const cardImageHeight = isMobile ? 200 : isTablet ? 220 : 240;

  const cardPadding = isMobile ? 16 : isTablet ? 20 : 24;

  const cardNameFontSize = isMobile ? 20 : isTablet ? 22 : 24;

  const cardPriceFontSize = isMobile ? 17 : isTablet ? 18 : 20;

  const ctaPadding = isMobile
    ? '28px 20px'
    : isTablet
      ? '32px 32px'
      : '40px 48px';

  const ctaHeadingSize = isMobile ? 22 : isTablet ? 24 : 28;

  const ctaDescSize = isMobile ? 14 : isTablet ? 15 : 16;

  const buttonPadding = isMobile ? '12px 24px' : '14px 36px';

  const imageSizes = isMobile
    ? '100vw'
    : isTablet
      ? '50vw'
      : '360px';

  // Category card responsive values
  const catGridGap = isMobile ? 12 : isTablet ? 16 : 20;
  const catCardImageHeight = isMobile ? 140 : isTablet ? 170 : 190;
  const catCardColumns = isMobile ? 2 : isTablet ? 3 : 4;

  // Loading state
  if (dbProducts === undefined) {
    return (
      <section
        id="products"
        style={{
          width: '100%',
          backgroundColor: theme.colors.white,
          padding: sectionPadding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: sectionGap,
        }}
      >
        <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }${SCROLL_HINT_STYLES}`}</style>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              border: `3px solid ${theme.colors.border}`,
              borderTopColor: theme.colors.primary,
              borderRadius: '50%',
              animation: 'dm-spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              color: theme.colors.textMedium,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: 16,
              margin: 0,
            }}
          >
            {t('products.loading')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="products"
      style={{
        width: '100%',
        backgroundColor: theme.colors.white,
        padding: sectionPadding,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
        alignItems: 'center',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }${SCROLL_HINT_STYLES}`}</style>
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 12 : 16,
          alignItems: 'center',
          maxWidth: 700,
          width: '100%',
          paddingLeft: isMobile ? 4 : 0,
          paddingRight: isMobile ? 4 : 0,
        }}
      >
        {/* Badge */}
        <div
          style={{
            backgroundColor: theme.colors.lightFill,
            border: `1px solid ${theme.colors.border}`,
            padding: '8px 20px',
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
            {t('products.badge')}
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
          }}
        >
          {t('products.title')}
        </h2>

        {/* Description */}
        <p
          style={{
            color: theme.colors.textMedium,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: descFontSize,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          {t('products.description')}
        </p>
      </div>

      {/* Category Cards Grid + Accordion Products */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: catGridGap,
          boxSizing: 'border-box',
        }}
      >
        {/* Categories Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 12 : 16,
            padding: '0 4px',
            marginBottom: isMobile ? 4 : 8,
          }}
        >
          <h3
            style={{
              color: theme.colors.textDark,
              fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
              fontSize: isMobile ? 20 : isTablet ? 22 : 26,
              fontWeight: 'bold',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {t('products.browseByCategory')}
          </h3>
          <div style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        </div>

        {/* Category Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${catCardColumns}, 1fr)`,
            gap: catGridGap,
            width: '100%',
          }}
        >
          {(dbCategories || []).map((cat) => {
            const categoryProducts = getProductsForCategory(cat.slug);

            return (
              <CategoryCard
                key={cat._id}
                id={cat._id}
                slug={cat.slug}
                name={cat.name}
                image={cat.image}
                itemCount={categoryProducts.length}
                locale={locale}
                isArabic={isArabic}
                isMobile={isMobile}
                isTablet={isTablet}
                countLabel={categoryProducts.length === 1 ? t('products.productCount') : categoryProducts.length <= 10 ? t('products.productCountPlural') : t('products.productCount')}
              />
            );
          })}
        </div>

        {/* All Products by Category */}
        {(dbCategories || [])
          .filter((cat) => getProductsForCategory(cat.slug).length > 0)
          .map((cat) => {
            const categoryProducts = getProductsForCategory(cat.slug);

            return (
              <div
                key={`products-${cat._id}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: gridGap,
                }}
              >
                {/* Category heading row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 12 : 16,
                    padding: '0 4px',
                  }}
                >
                  <h3
                    style={{
                      color: theme.colors.textDark,
                      fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                      fontSize: isMobile ? 20 : isTablet ? 22 : 26,
                      fontWeight: 'bold',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getLocalizedField(cat.name, locale)}
                  </h3>
                  <div style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Scroll arrows — hidden on mobile, shown on tablet/desktop */}
                    {!isMobile && (isArabic
                      ? (['right', 'left'] as const)
                      : (['left', 'right'] as const)
                    ).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => handleScroll(cat.slug, dir)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.white,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="14" height="14" fill="none" stroke={theme.colors.textDark} strokeWidth="2" viewBox="0 0 24 24">
                          <path d={dir === 'right' ? 'M5 12h14M12 5l7 7-7 7' : 'M19 12H5M12 19l-7-7 7-7'} />
                        </svg>
                      </button>
                    ))}

                    <button
                      onClick={() => router.push(`/products/${cat.slug}`)}
                      style={{
                        color: theme.colors.primary,
                        fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                        fontSize: isMobile ? 13 : 15,
                        fontWeight: 'bold',
                        background: theme.colors.lightFill,
                        border: `1.5px solid ${theme.colors.primary}`,
                        borderRadius: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        padding: isMobile ? '6px 14px' : '7px 16px',
                        transition: 'all 0.2s',
                        minHeight: 36,
                      }}
                    >
                      {tc('cta.viewAll')}
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="flip-rtl">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Horizontal scrollable products */}
                <div style={{ position: 'relative' }}>
                  {/* Floating scroll arrows — mobile only */}
                  {isMobile && (
                    <>
                      {/* Left arrow (or right in RTL) */}
                      <button
                        onClick={() => handleScroll(cat.slug, isArabic ? 'right' : 'left')}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isArabic ? 'right' : 'left']: 4,
                          zIndex: 5,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.85)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: `1px solid ${theme.colors.border}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke={theme.colors.textDark} strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d={isArabic ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
                        </svg>
                      </button>
                      {/* Right arrow (or left in RTL) */}
                      <button
                        onClick={() => handleScroll(cat.slug, isArabic ? 'left' : 'right')}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isArabic ? 'left' : 'right']: 4,
                          zIndex: 5,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.85)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: `1px solid ${theme.colors.border}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke={theme.colors.textDark} strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d={isArabic ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Right-edge fade + animated chevron — mobile only, disappears after first scroll */}
                  {isMobile && !scrolledCategories.has(cat.slug) && (
                    <div
                      className="dm-scroll-hint-overlay"
                      style={{
                        position: 'absolute',
                        top: 0,
                        [isArabic ? 'left' : 'right']: 0,
                        bottom: 0,
                        width: 72,
                        background: isArabic
                          ? 'linear-gradient(to right, rgba(255,255,255,0.92), rgba(255,255,255,0))'
                          : 'linear-gradient(to left, rgba(255,255,255,0.92), rgba(255,255,255,0))',
                        zIndex: 4,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isArabic ? 'flex-start' : 'flex-end',
                        paddingLeft: isArabic ? 10 : 0,
                        paddingRight: isArabic ? 0 : 10,
                      }}
                    >
                      <div className="dm-scroll-hint-icon" style={{ color: theme.colors.primary, display: 'flex' }}>
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d={isArabic ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
                        </svg>
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ opacity: 0.45, marginLeft: -10 }}>
                          <path d={isArabic ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
                        </svg>
                      </div>
                    </div>
                  )}
                <div
                  ref={(el) => { scrollRefs.current[cat.slug] = el; }}
                  className="scrollbar-hide"
                  onScroll={() => isMobile && handleRowScroll(cat.slug)}
                  style={{
                    display: 'flex',
                    gap: isMobile ? 12 : 16,
                    overflowX: 'auto',
                    paddingTop: 8,
                    paddingBottom: 8,
                    marginLeft: -4,
                    marginRight: -4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {categoryProducts.map((product) => (
                    <div
                      key={product._id}
                      onClick={() => handleClick(product)}
                      onMouseEnter={() => setHoveredCard(product._id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        flexShrink: 0,
                        width: isMobile ? 220 : isTablet ? 260 : 280,
                        backgroundColor: theme.colors.cream,
                        borderRadius: 12,
                        border: `1px solid ${hoveredCard === product._id ? theme.colors.primary : theme.colors.border}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        boxShadow: hoveredCard === product._id ? '0 8px 24px rgba(184, 92, 56, 0.12)' : 'none',
                        transform: hoveredCard === product._id ? 'translateY(-3px)' : 'none',
                      }}
                    >
                      {/* Popular Badge */}
                      {product.isPopular && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            backgroundColor: theme.colors.primary,
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}
                        >
                          <span style={{ color: '#FFF', fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin, fontSize: 10, fontWeight: 'bold' }}>
                            {t('products.mostPopular')}
                          </span>
                        </div>
                      )}

                      {/* Pattern Badge */}
                      {product.type === 'pattern' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 2,
                            backgroundColor: theme.colors.gold,
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}
                        >
                          <span style={{ color: '#FFF', fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin, fontSize: 10, fontWeight: 'bold' }}>
                            {t('products.fullSet')}
                          </span>
                        </div>
                      )}

                      {/* Sold Out Overlay */}
                      {product.stockQuantity === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 3,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              color: '#FFF',
                              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                              fontSize: isMobile ? 16 : 18,
                              fontWeight: 'bold',
                              backgroundColor: 'rgba(220, 38, 38, 0.9)',
                              padding: '8px 20px',
                              borderRadius: 8,
                            }}
                          >
                            {t('products.soldOut')}
                          </span>
                        </div>
                      )}

                      {/* Image */}
                      <ProductImageCarousel
                        images={product.images}
                        name={product.name}
                        height={isMobile ? 160 : 190}
                        sizes={isMobile ? '220px' : '280px'}
                        isHovered={hoveredCard === product._id}
                      />

                      {/* Card Content */}
                      <div style={{ padding: isMobile ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h4
                          style={{
                            color: theme.colors.textDark,
                            fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                            fontSize: isMobile ? 14 : 16,
                            fontWeight: 'bold',
                            margin: 0,
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                          }}
                        >
                          {product.name}
                        </h4>

                        {/* Price & Action */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              color: theme.colors.primary,
                              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                              fontSize: isMobile ? 15 : 17,
                              fontWeight: 'bold',
                            }}
                          >
                            {product.price}
                          </span>

                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: theme.colors.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="#FFF" strokeWidth="2" viewBox="0 0 24 24" className="flip-rtl">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>{/* end scroll hint wrapper */}
              </div>
            );
          })}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          width: '100%',
          maxWidth: 700,
          backgroundColor: theme.colors.lightFill,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: isMobile ? 12 : 16,
          padding: ctaPadding,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? 12 : 16,
          boxSizing: 'border-box',
        }}
      >
        <h3
          style={{
            color: theme.colors.textDark,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: ctaHeadingSize,
            fontWeight: 'bold',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {t('products.customCtaTitle')}
        </h3>
        <p
          style={{
            color: theme.colors.textMedium,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: ctaDescSize,
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          {t('products.customCtaDescription')}
        </p>
        <button
          onClick={() => router.push('/checkout')}
          style={{
            backgroundColor: theme.colors.primary,
            color: '#FFFFFF',
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: isMobile ? 15 : 16,
            fontWeight: 'bold',
            padding: buttonPadding,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginTop: isMobile ? 4 : 8,
            minHeight: 44,
          }}
        >
          {tc('cta.calculateNow')}
        </button>
      </div>
    </section>
  );
}
