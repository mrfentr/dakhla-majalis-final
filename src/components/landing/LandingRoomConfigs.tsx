'use client';

import { useState, useEffect } from 'react';
import { theme } from './theme';
import {useTranslations, useLocale} from 'next-intl';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    function getBreakpoint(): Breakpoint {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
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

const SEAT_COLOR = theme.colors.primary;
const WALL_COLOR = '#3A3A3A';
const FLOOR_COLOR = '#1E1E1E';
const CUSHION_COLOR = '#C97A56';

function FloorPlanIcon({ type, size }: { type: string; size: number }) {
  const s = size;
  const pad = s * 0.1;
  const roomX = pad;
  const roomY = pad;
  const roomW = s - pad * 2;
  const roomH = s - pad * 2;
  const seatDepth = roomW * 0.14;
  const cushionR = seatDepth * 0.28;

  if (type === 'single') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
        {/* Room outline */}
        <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill={FLOOR_COLOR} stroke={WALL_COLOR} strokeWidth={2} />
        {/* Door opening bottom center */}
        <rect x={s / 2 - roomW * 0.1} y={roomY + roomH - 1} width={roomW * 0.2} height={3} fill={FLOOR_COLOR} />
        {/* Single wall seating - top */}
        <rect x={roomX + seatDepth * 0.5} y={roomY + seatDepth * 0.4} width={roomW - seatDepth} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Cushions on the seat */}
        {[0.25, 0.5, 0.75].map((pct, i) => (
          <circle key={i} cx={roomX + seatDepth * 0.5 + (roomW - seatDepth) * pct} cy={roomY + seatDepth * 0.4 + seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
      </svg>
    );
  }

  if (type === 'l-shape') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
        {/* Room outline */}
        <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill={FLOOR_COLOR} stroke={WALL_COLOR} strokeWidth={2} />
        {/* Door opening bottom-left */}
        <rect x={roomX + roomW * 0.08} y={roomY + roomH - 1} width={roomW * 0.2} height={3} fill={FLOOR_COLOR} />
        {/* Top wall seating */}
        <rect x={roomX + seatDepth * 0.5} y={roomY + seatDepth * 0.4} width={roomW - seatDepth} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Right wall seating */}
        <rect x={roomX + roomW - seatDepth * 0.4 - seatDepth} y={roomY + seatDepth * 0.4} width={seatDepth} height={roomH - seatDepth * 0.8} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Top cushions */}
        {[0.2, 0.45, 0.65].map((pct, i) => (
          <circle key={`t${i}`} cx={roomX + seatDepth * 0.5 + (roomW - seatDepth * 2) * pct} cy={roomY + seatDepth * 0.4 + seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
        {/* Right cushions */}
        {[0.3, 0.55, 0.8].map((pct, i) => (
          <circle key={`r${i}`} cx={roomX + roomW - seatDepth * 0.4 - seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + (roomH - seatDepth * 0.8) * pct} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
        {/* Corner accent */}
        <rect x={roomX + roomW - seatDepth * 1.4 - seatDepth * 0.3} y={roomY + seatDepth * 0.4} width={seatDepth * 0.35} height={seatDepth * 0.35} rx={2} fill={CUSHION_COLOR} opacity={0.4} />
      </svg>
    );
  }

  if (type === 'u-shape') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
        {/* Room outline */}
        <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill={FLOOR_COLOR} stroke={WALL_COLOR} strokeWidth={2} />
        {/* Door opening bottom center */}
        <rect x={s / 2 - roomW * 0.1} y={roomY + roomH - 1} width={roomW * 0.2} height={3} fill={FLOOR_COLOR} />
        {/* Top wall seating */}
        <rect x={roomX + seatDepth * 0.5} y={roomY + seatDepth * 0.4} width={roomW - seatDepth} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Left wall seating */}
        <rect x={roomX + seatDepth * 0.4} y={roomY + seatDepth * 0.4} width={seatDepth} height={roomH - seatDepth * 0.8} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Right wall seating */}
        <rect x={roomX + roomW - seatDepth * 0.4 - seatDepth} y={roomY + seatDepth * 0.4} width={seatDepth} height={roomH - seatDepth * 0.8} rx={3} fill={SEAT_COLOR} opacity={0.85} />
        {/* Top cushions */}
        {[0.3, 0.5, 0.7].map((pct, i) => (
          <circle key={`t${i}`} cx={roomX + seatDepth * 0.5 + (roomW - seatDepth * 2) * pct + seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
        {/* Left cushions */}
        {[0.3, 0.55, 0.8].map((pct, i) => (
          <circle key={`l${i}`} cx={roomX + seatDepth * 0.4 + seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + (roomH - seatDepth * 0.8) * pct} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
        {/* Right cushions */}
        {[0.3, 0.55, 0.8].map((pct, i) => (
          <circle key={`r${i}`} cx={roomX + roomW - seatDepth * 0.4 - seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + (roomH - seatDepth * 0.8) * pct} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
        ))}
      </svg>
    );
  }

  // full room
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      {/* Room outline */}
      <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill={FLOOR_COLOR} stroke={WALL_COLOR} strokeWidth={2} />
      {/* Door opening bottom center */}
      <rect x={s / 2 - roomW * 0.1} y={roomY + roomH - 1} width={roomW * 0.2} height={3} fill={FLOOR_COLOR} />
      {/* Top wall seating */}
      <rect x={roomX + seatDepth * 0.5} y={roomY + seatDepth * 0.4} width={roomW - seatDepth} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
      {/* Left wall seating */}
      <rect x={roomX + seatDepth * 0.4} y={roomY + seatDepth * 0.4} width={seatDepth} height={roomH - seatDepth * 0.8} rx={3} fill={SEAT_COLOR} opacity={0.85} />
      {/* Right wall seating */}
      <rect x={roomX + roomW - seatDepth * 0.4 - seatDepth} y={roomY + seatDepth * 0.4} width={seatDepth} height={roomH - seatDepth * 0.8} rx={3} fill={SEAT_COLOR} opacity={0.85} />
      {/* Bottom wall seating - split for door */}
      <rect x={roomX + seatDepth * 0.4} y={roomY + roomH - seatDepth * 0.4 - seatDepth} width={roomW * 0.3} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
      <rect x={roomX + roomW - seatDepth * 0.4 - roomW * 0.3} y={roomY + roomH - seatDepth * 0.4 - seatDepth} width={roomW * 0.3} height={seatDepth} rx={3} fill={SEAT_COLOR} opacity={0.85} />
      {/* Top cushions */}
      {[0.3, 0.5, 0.7].map((pct, i) => (
        <circle key={`t${i}`} cx={roomX + seatDepth * 0.5 + (roomW - seatDepth * 2) * pct + seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
      ))}
      {/* Left cushions */}
      {[0.3, 0.55, 0.8].map((pct, i) => (
        <circle key={`l${i}`} cx={roomX + seatDepth * 0.4 + seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + (roomH - seatDepth * 0.8) * pct} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
      ))}
      {/* Right cushions */}
      {[0.3, 0.55, 0.8].map((pct, i) => (
        <circle key={`r${i}`} cx={roomX + roomW - seatDepth * 0.4 - seatDepth * 0.5} cy={roomY + seatDepth * 0.4 + (roomH - seatDepth * 0.8) * pct} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
      ))}
      {/* Bottom-left cushion */}
      <circle cx={roomX + seatDepth * 0.4 + roomW * 0.15} cy={roomY + roomH - seatDepth * 0.4 - seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
      {/* Bottom-right cushion */}
      <circle cx={roomX + roomW - seatDepth * 0.4 - roomW * 0.15} cy={roomY + roomH - seatDepth * 0.4 - seatDepth * 0.5} r={cushionR} fill={CUSHION_COLOR} opacity={0.7} />
      {/* Door arc indicator */}
      <path
        d={`M ${s / 2 - roomW * 0.1} ${roomY + roomH - 1} A ${roomW * 0.1} ${roomW * 0.1} 0 0 1 ${s / 2 + roomW * 0.1} ${roomY + roomH - 1}`}
        stroke={WALL_COLOR}
        strokeWidth={1}
        strokeDasharray="3 2"
        fill="none"
        opacity={0.5}
      />
    </svg>
  );
}

export function LandingRoomConfigs() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const configs = [
    {
      id: 'single-wall',
      title: t('roomConfigs.singleWallTitle'),
      description: t('roomConfigs.singleWallDescription'),
      icon: 'single',
      walls: 1,
    },
    {
      id: 'l-shape',
      title: t('roomConfigs.lShapeTitle'),
      description: t('roomConfigs.lShapeDescription'),
      icon: 'l-shape',
      walls: 2,
    },
    {
      id: 'u-shape',
      title: t('roomConfigs.uShapeTitle'),
      description: t('roomConfigs.uShapeDescription'),
      icon: 'u-shape',
      walls: 3,
    },
    {
      id: 'full-room',
      title: t('roomConfigs.fullRoomTitle'),
      description: t('roomConfigs.fullRoomDescription'),
      icon: 'full',
      walls: 4,
    },
  ];

  const breakpoint = useBreakpoint();

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  const sectionPaddingX = isMobile ? 16 : isTablet ? 40 : 120;
  const sectionPaddingY = isMobile ? 48 : isTablet ? 64 : 80;
  const sectionGap = isMobile ? 32 : isTablet ? 40 : 48;

  const titleFontSize = isMobile ? 28 : isTablet ? 36 : 48;
  const descFontSize = isMobile ? 15 : isTablet ? 16 : 18;
  const badgeFontSize = isMobile ? 12 : 14;
  const gridGap = isMobile ? 12 : isTablet ? 16 : 24;

  const cardTitleSize = isMobile ? 17 : 20;
  const cardDescSize = isMobile ? 13 : 14;

  const iconSize = isMobile ? 120 : isTablet ? 140 : 160;

  const gridStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: gridGap,
      }
    : isTablet
      ? {
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: gridGap,
        }
      : {
          width: '100%',
          display: 'flex',
          gap: gridGap,
          justifyContent: 'center',
        };

  const cardStyle: React.CSSProperties = {
    width: isMobile || isTablet ? '100%' : 280,
    backgroundColor: theme.colors.cardDark,
    borderRadius: 16,
    padding: isMobile ? '24px 16px' : '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? 16 : 20,
    alignItems: 'center',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.04)',
  };

  return (
    <section
      style={{
        width: '100%',
        backgroundColor: theme.colors.dark,
        padding: `${sectionPaddingY}px ${sectionPaddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: sectionGap,
        alignItems: 'center',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 12 : 16,
          alignItems: 'center',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.primaryMedium,
            borderRadius: 4,
            padding: isMobile ? '6px 14px' : '8px 20px',
          }}
        >
          <span
            style={{
              color: theme.colors.primary,
              fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
              fontSize: badgeFontSize,
              fontWeight: 'bold',
            }}
          >
            {t('roomConfigs.badge')}
          </span>
        </div>

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
          {t('roomConfigs.title')}
        </h2>

        <p
          style={{
            color: theme.colors.textMuted,
            fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
            fontSize: descFontSize,
            textAlign: 'center',
            margin: 0,
            maxWidth: isMobile ? '100%' : 600,
            lineHeight: 1.7,
            padding: isMobile ? '0 4px' : 0,
          }}
        >
          {t('roomConfigs.description')}
        </p>
      </div>

      {/* Configs Grid */}
      <div style={gridStyle}>
        {configs.map((config) => (
          <div key={config.id} style={cardStyle}>
            <FloorPlanIcon type={config.icon} size={iconSize} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8, alignItems: 'center' }}>
              <h3
                style={{
                  color: '#FFFFFF',
                  fontFamily: isArabic ? theme.fonts.arabicTitle : theme.fonts.latinTitle,
                  fontSize: cardTitleSize,
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                {config.title}
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    color: theme.colors.primary,
                    fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 'bold',
                  }}
                >
                  {config.walls === 1 ? t('roomConfigs.singleWallWalls') : config.walls === 2 ? t('roomConfigs.lShapeWalls') : config.walls === 3 ? t('roomConfigs.uShapeWalls') : t('roomConfigs.fullRoomWalls')}
                </span>
              </div>
              <p
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: isArabic ? theme.fonts.arabic : theme.fonts.latin,
                  fontSize: cardDescSize,
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {config.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
