'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import { theme } from '@/components/landing/theme';
import { getLocalizedField } from '@/lib/utils';

interface CategoryCardProps {
  id: string;
  slug: string;
  name: { ar: string; fr: string; en?: string };
  image?: string;
  itemCount: number;
  locale: string;
  isArabic: boolean;
  isMobile: boolean;
  isTablet: boolean;
  /** Custom href override. Defaults to /products/{slug} */
  href?: string;
  /** Label for the count (e.g. "product" / "products") */
  countLabel?: string;
}

export function CategoryCard({
  id,
  slug,
  name,
  image,
  itemCount,
  locale,
  isArabic,
  isMobile,
  isTablet,
  href,
  countLabel,
}: CategoryCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push(href || `/products/${slug}`);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: `2px solid ${isHovered ? theme.colors.primary : theme.colors.border}`,
        boxShadow: isHovered
          ? '0 8px 30px rgba(184, 92, 56, 0.15)'
          : 'none',
        transform: isHovered ? 'translateY(-3px)' : 'none',
        minHeight: 44,
        backgroundColor: '#F0E0CC',
      }}
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={getLocalizedField(name, locale)}
            fill
            style={{
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            }}
            sizes={isMobile ? '100vw' : isTablet ? '50vw' : '33vw'}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#F0E0CC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textLight} strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(26, 26, 26, 0.85) 0%, rgba(26, 26, 26, 0.3) 50%, rgba(26, 26, 26, 0.05) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: isMobile ? '14px 16px' : '18px 20px',
            gap: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3
                style={{
                  color: '#FFFFFF',
                  fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                  fontSize: isMobile ? 18 : isTablet ? 20 : 22,
                  fontWeight: 'bold',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {getLocalizedField(name, locale)}
              </h3>
              {countLabel && (
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                    fontSize: isMobile ? 13 : 14,
                  }}
                >
                  {itemCount} {countLabel}
                </span>
              )}
            </div>

            {/* Arrow */}
            <div
              style={{
                width: isMobile ? 32 : 36,
                height: isMobile ? 32 : 36,
                borderRadius: '50%',
                backgroundColor: isHovered ? theme.colors.primary : 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              <svg
                width={isMobile ? '16' : '18'}
                height={isMobile ? '16' : '18'}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flip-rtl"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
