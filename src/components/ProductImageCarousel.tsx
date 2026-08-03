'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { PRODUCT_BLUR_DATA_URL } from '@/lib/image-placeholder';
import { cappedImageSource } from '@/lib/image-source';

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

  // Only slides that have actually been reached get rendered. Every <Image>
  // emits a full srcset into the HTML, and the homepage mounts 60 of these
  // carousels — rendering all slides up front put 212 unseen images (and
  // ~200 KB of srcset markup) into the initial document.
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([0]));

  useEffect(() => {
    setMounted((prev) => {
      if (prev.has(currentIndex)) return prev;
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  // Warm the next slide, but ONLY for carousels the user can actually see and
  // only while the browser is idle. The homepage mounts ~50 of these; warming
  // every one on hydration would just recreate the stampede we removed, and
  // would compete with the images currently on screen.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  // Kept connected (not disconnected on first hit) so the carousel can go back
  // to sleep when it scrolls away again.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasMultiple) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '200px' }, // wake up just before it scrolls into view
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMultiple]);

  // Stay exactly one slide ahead: whenever the visible slide changes, warm the
  // one after it. That gives the next image the full AUTO_SCROLL_INTERVAL to
  // download, so the fade never lands on an image that hasn't arrived — which
  // is what happened when this only ever pre-warmed slide 1.
  useEffect(() => {
    if (!inView || !hasMultiple) return;
    const upcoming = (currentIndex + 1) % images.length;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const cancel = w.cancelIdleCallback ?? window.clearTimeout;
    const id = schedule(() => {
      setMounted((prev) => {
        if (prev.has(upcoming)) return prev;
        const next = new Set(prev);
        next.add(upcoming);
        return next;
      });
    });
    return () => cancel(id);
  }, [inView, hasMultiple, currentIndex, images.length]);

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

  // Only cycle while the card is on screen. Left running, an off-screen
  // carousel advances every 4s and ends up mounting every one of its slides —
  // which silently undid the whole point of the `mounted` set above.
  useEffect(() => {
    if (!inView) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
    return stopAutoScroll;
  }, [inView, startAutoScroll, stopAutoScroll]);

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
          src={cappedImageSource(images[0])}
          alt={name}
          fill
          placeholder="blur"
          blurDataURL={PRODUCT_BLUR_DATA_URL}
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
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      {/* Stacked images with opacity transition — see `mounted` above */}
      {images.map((img, idx) => (
        mounted.has(idx) ? (
          <Image
            key={idx}
            src={cappedImageSource(img)}
            alt={`${name} ${idx + 1}`}
            fill
            placeholder="blur"
            blurDataURL={PRODUCT_BLUR_DATA_URL}
            // Off-screen slides must never compete with what's visible.
            fetchPriority={currentIndex === idx ? 'auto' : 'low'}
            style={{
              objectFit: 'cover',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              opacity: currentIndex === idx ? 1 : 0,
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}
            sizes={sizes}
          />
        ) : null
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
