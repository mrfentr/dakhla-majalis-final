'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

const AUTO_SCROLL_INTERVAL = 4000;

export function ProductImageCarousel({
  images,
  name,
  height,
  sizes,
  isHovered,
}: {
  images: string[];
  name: string;
  height: number;
  sizes: string;
  isHovered: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasMultiple = images.length > 1;

  const startAutoScroll = useCallback(() => {
    if (!hasMultiple) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, AUTO_SCROLL_INTERVAL);
  }, [hasMultiple, images.length]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll]);

  const goTo = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(idx);
    stopAutoScroll();
    startAutoScroll();
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    stopAutoScroll();
    startAutoScroll();
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
    stopAutoScroll();
    startAutoScroll();
  };

  // Single image — no carousel needed
  if (!hasMultiple) {
    return (
      <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
        <Image
          src={images[0]}
          alt={name}
          fill
          style={{
            objectFit: 'cover',
            transition: 'transform 0.5s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
          sizes={sizes}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      {/* Stacked images with opacity transition */}
      {images.map((img, idx) => (
        <Image
          key={idx}
          src={img}
          alt={`${name} ${idx + 1}`}
          fill
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            opacity: currentIndex === idx ? 1 : 0,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
          sizes={sizes}
        />
      ))}

      {/* Right arrow (prev in RTL) */}
      <button
        onClick={goPrev}
        style={{
          position: 'absolute',
          top: '50%',
          right: 8,
          transform: 'translateY(-50%)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        aria-label="السابق"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Left arrow (next in RTL) */}
      <button
        onClick={goNext}
        style={{
          position: 'absolute',
          top: '50%',
          left: 8,
          transform: 'translateY(-50%)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        aria-label="التالي"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Dots indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          zIndex: 2,
        }}
      >
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => goTo(idx, e)}
            style={{
              width: currentIndex === idx ? 18 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: currentIndex === idx ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
            aria-label={`صورة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
