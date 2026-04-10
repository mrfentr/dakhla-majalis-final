/**
 * Simple in-memory rate limiter using a Map with IP-based tracking.
 * Works well for serverless environments with a single instance.
 * For multi-instance deployments, consider using Redis-based rate limiting.
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number;
  /** Maximum number of unique tokens (IPs) to track per interval */
  uniqueTokenPerInterval: number;
}

interface TokenData {
  count: number;
  lastReset: number;
}

const rateLimit = (options: RateLimitOptions) => {
  const tokenCache = new Map<string, TokenData>();

  // Periodically clean up stale entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of tokenCache.entries()) {
      if (now - data.lastReset > options.interval) {
        tokenCache.delete(key);
      }
    }
  };

  // Run cleanup every interval
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, options.interval);
  }

  return {
    check: (limit: number, token: string): { success: boolean; remaining: number } => {
      const now = Date.now();
      const tokenData = tokenCache.get(token);

      if (!tokenData || now - tokenData.lastReset > options.interval) {
        // Enforce max unique tokens
        if (!tokenData && tokenCache.size >= options.uniqueTokenPerInterval) {
          cleanup();
          if (tokenCache.size >= options.uniqueTokenPerInterval) {
            return { success: false, remaining: 0 };
          }
        }
        tokenCache.set(token, { count: 1, lastReset: now });
        return { success: true, remaining: limit - 1 };
      }

      if (tokenData.count >= limit) {
        return { success: false, remaining: 0 };
      }

      tokenData.count++;
      return { success: true, remaining: limit - tokenData.count };
    },
  };
};

export default rateLimit;

/**
 * Helper to extract an identifier token from a request.
 * Uses x-forwarded-for header (common behind proxies/Vercel) or falls back to a default.
 */
export function getIPFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'anonymous';
  return ip;
}
