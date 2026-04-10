'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { theme } from './theme';
import { useGetGalleryImages } from '@/hooks/useConvex';
import {useTranslations, useLocale} from 'next-intl';

const INITIAL_COUNT = 12;

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    };

    setBreakpoint(getBreakpoint());

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

export function LandingGallery() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const testimonials = [
    {
      id: 1,
      quote: t('gallery.testimonial1Quote'),
      name: t('gallery.testimonial1Name'),
      city: t('gallery.testimonial1City'),
    },
    {
      id: 2,
      quote: t('gallery.testimonial2Quote'),
      name: t('gallery.testimonial2Name'),
      city: t('gallery.testimonial2City'),
    },
    {
      id: 3,
      quote: t('gallery.testimonial3Quote'),
      name: t('gallery.testimonial3Name'),
      city: t('gallery.testimonial3City'),
    },
  ];

  const galleryData = useGetGalleryImages();
  const allImages = (galleryData ?? []).map((img) => img.url);

  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const breakpoint = useBreakpoint();

  // Touch swipe support for lightbox
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  const visibleImages = showAll ? allImages : allImages.slice(0, INITIAL_COUNT);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % allImages.length : null
    );
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + allImages.length) % allImages.length : null
    );
  }, []);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  // Keyboard navigation for lightbox (direction-aware)
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (isArabic) {
        // RTL: ArrowRight = prev, ArrowLeft = next
        if (e.key === 'ArrowRight') goPrev();
        if (e.key === 'ArrowLeft') goNext();
      } else {
        // LTR: ArrowRight = next, ArrowLeft = prev
        if (e.key === 'ArrowRight') goNext();
        if (e.key === 'ArrowLeft') goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, goNext, goPrev, isArabic]);

  // Touch handlers for lightbox swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Only trigger swipe if horizontal movement is dominant and significant
      if (absDeltaX > 50 && absDeltaX > absDeltaY * 1.5) {
        if (deltaX > 0) {
          // Swipe right -> previous (RTL: next visually)
          goPrev();
        } else {
          // Swipe left -> next (RTL: previous visually)
          goNext();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [goNext, goPrev]
  );

  // Don't render the section if gallery loaded but empty
  if (galleryData !== undefined && allImages.length === 0) return null;

  // Responsive values
  const sectionPadding = isMobile
    ? '48px 16px'
    : isTablet
      ? '60px 24px'
      : '80px 40px';

  const sectionGap = isMobile ? 28 : isTablet ? 36 : 48;

  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;

  const descFontSize = isMobile ? 15 : isTablet ? 16 : 18;

  const countFontSize = isMobile ? 24 : isTablet ? 28 : 32;

  const gridColumns = isMobile
    ? 'repeat(2, 1fr)'
    : isTablet
      ? 'repeat(3, 1fr)'
      : 'repeat(4, 1fr)';

  const gridGap = isMobile ? 8 : isTablet ? 10 : 12;

  const testimonialCardWidth = isMobile ? '100%' : isTablet ? 'calc(50% - 12px)' : '360px';
  const testimonialGap = isMobile ? 16 : 24;

  const buttonPadding = isMobile ? '12px 24px' : '14px 36px';
  const buttonFontSize = isMobile ? 14 : 16;

  // Lightbox responsive values
  const lightboxImgWidth = isMobile ? '95vw' : isTablet ? '90vw' : '85vw';
  const lightboxImgHeight = isMobile ? '70vh' : isTablet ? '75vh' : '80vh';
  const navButtonSize = isMobile ? 40 : 52;
  const navButtonOffset = isMobile ? 8 : 20;
  const closeButtonSize = isMobile ? 40 : 48;
  const closeButtonTop = isMobile ? 12 : 20;
  const closeButtonRight = isMobile ? 12 : 20;

  return (
    <section
      id="gallery"
      style={{
        width: '100%',
        backgroundColor: theme.colors.dark,
        padding: sectionPadding,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
        alignItems: 'center',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 12 : 16,
          alignItems: 'center',
          maxWidth: 700,
          width: '100%',
        }}
      >
        {/* Badge */}
        <div
          style={{
            backgroundColor: theme.colors.primaryStrong,
            borderRadius: 4,
            padding: isMobile ? '6px 16px' : '8px 20px',
          }}
        >
          <span
            style={{
              color: theme.colors.primary,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: isMobile ? 12 : 14,
              fontWeight: 'bold',
            }}
          >
            {t('gallery.badge')}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: '#FFFFFF',
            fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
            fontSize: titleFontSize,
            fontWeight: 'bold',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {t('gallery.title')}
        </h2>

        {/* Description */}
        <p
          style={{
            color: theme.colors.textMuted,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: descFontSize,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.7,
            padding: isMobile ? '0 4px' : 0,
          }}
        >
          {t('gallery.description')}
        </p>
      </div>

      {/* Image Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            color: theme.colors.primary,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: countFontSize,
            fontWeight: 'bold',
          }}
        >
          +{allImages.length}
        </span>
        <span
          style={{
            color: theme.colors.textMuted,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: isMobile ? 14 : 16,
          }}
        >
          {t('gallery.imageCount')}
        </span>
      </div>

      {/* Gallery Grid */}
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: gridGap,
          boxSizing: 'border-box',
        }}
      >
        {visibleImages.map((src, index) => (
          <div
            key={index}
            onClick={() => openLightbox(index)}
            onMouseEnter={() => setHoveredIdx(index)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              backgroundColor: theme.colors.cardDark,
              borderRadius: isMobile ? 8 : 12,
              border: '1px solid #333333',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: hoveredIdx === index ? 'scale(1.02)' : 'scale(1)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Image
              src={src}
              alt={t('gallery.imageAlt', { number: index + 1 })}
              fill
              style={{
                objectFit: 'cover',
                transition: 'transform 0.5s ease',
                transform: hoveredIdx === index ? 'scale(1.08)' : 'scale(1)',
              }}
              sizes={
                isMobile
                  ? '50vw'
                  : isTablet
                    ? '33vw'
                    : '25vw'
              }
            />
            {/* Hover overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: hoveredIdx === index ? 'rgba(0,0,0,0.2)' : 'transparent',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {hoveredIdx === index && (
                <svg
                  width={isMobile ? 28 : 36}
                  height={isMobile ? 28 : 36}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  style={{ opacity: 0.9 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More / Less Button */}
      {allImages.length > INITIAL_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            backgroundColor: 'transparent',
            border: `2px solid ${theme.colors.primary}`,
            color: theme.colors.primary,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: buttonFontSize,
            fontWeight: 'bold',
            padding: buttonPadding,
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {showAll
            ? tc('cta.showLess')
            : tc('cta.showAllPhotos', { count: allImages.length })}
        </button>
      )}

  

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'pan-y',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Close lightbox"
            style={{
              position: 'absolute',
              top: closeButtonTop,
              right: closeButtonRight,
              zIndex: 10001,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: closeButtonSize,
              height: closeButtonSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg
              width={isMobile ? 20 : 24}
              height={isMobile ? 20 : 24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Counter */}
          <div
            style={{
              position: 'absolute',
              top: isMobile ? 16 : 24,
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#FFFFFF',
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: isMobile ? 12 : 14,
              opacity: 0.7,
            }}
          >
            {lightboxIndex + 1} / {allImages.length}
          </div>

          {/* Previous button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              ...(isArabic ? { right: navButtonOffset } : { left: navButtonOffset }),
              zIndex: 10001,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: navButtonSize,
              height: navButtonSize,
              display: isMobile ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg
              width={isMobile ? 20 : 24}
              height={isMobile ? 20 : 24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
            >
              <polyline points={isArabic ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
            </svg>
          </button>

          {/* Next button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
            style={{
              position: 'absolute',
              ...(isArabic ? { left: navButtonOffset } : { right: navButtonOffset }),
              zIndex: 10001,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: navButtonSize,
              height: navButtonSize,
              display: isMobile ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg
              width={isMobile ? 20 : 24}
              height={isMobile ? 20 : 24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
            >
              <polyline points={isArabic ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
            </svg>
          </button>

          {/* Mobile swipe hint - only show briefly */}
          {isMobile && (
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#FFFFFF',
                fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                fontSize: 12,
                opacity: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {t('gallery.swipeHint')}
            </div>
          )}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: lightboxImgWidth,
              height: lightboxImgHeight,
              maxWidth: 1100,
            }}
          >
            <Image
              src={allImages[lightboxIndex]}
              alt={t('gallery.imageAlt', { number: lightboxIndex + 1 })}
              fill
              style={{ objectFit: 'contain' }}
              sizes={lightboxImgWidth}
              priority
            />
          </div>
        </div>
      )}
    </section>
  );
}
