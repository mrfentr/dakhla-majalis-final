'use client';

// ===== INTENT PREFETCH =====
// Warm a destination when the user shows intent (hovers on desktop, first
// touch on mobile) rather than up front. Prefetching every card on mount is
// the same mistake as preloading every carousel slide: it competes with the
// content actually on screen.
//
// Note: Next disables router.prefetch in development, so this is a no-op
// locally and only takes effect in a production build.

import { useCallback, useRef } from 'react';

interface PrefetchRouter {
  prefetch: (href: string) => void;
}

export function useIntentPrefetch(router: PrefetchRouter) {
  const seen = useRef<Set<string>>(new Set());

  return useCallback(
    (href: string | null | undefined, imageUrl?: string | null) => {
      if (!href || seen.current.has(href)) return;
      seen.current.add(href);

      try {
        router.prefetch(href);
      } catch {
        // next-intl's router and next/navigation's differ slightly across
        // versions; a missing prefetch must never break the hover handler.
      }

      // router.prefetch only fetches the route payload, not the media the
      // destination will then request — warm that too, at low priority.
      if (imageUrl) {
        const img = new window.Image();
        img.fetchPriority = 'low';
        img.decoding = 'async';
        img.src = imageUrl;
      }
    },
    [router],
  );
}
