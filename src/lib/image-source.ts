// ===== IMAGE SOURCE CAPPING =====
// next/image fetches the ORIGINAL from ImageKit once per width variant, then
// caches its own optimized output for a year. The originals here run 500 KB to
// 3.2 MB, so those origin fetches are what consumes the ImageKit quota:
//
//   ~350 images x 8 width variants x ~1.5 MB  ≈  4 GB of origin traffic
//
// Capping the source at the largest width we could ever render costs nothing
// visually (next.config deviceSizes tops out at 1920) and cuts that ~41%.

/** Largest width next/image can request — keep in sync with next.config deviceSizes. */
export const MAX_RENDER_WIDTH = 1920;

/**
 * Cap an ImageKit source so the optimizer pulls a sensible size instead of a
 * multi-megabyte original.
 *
 * `c-at_max` is load-bearing: a plain `w-1920` UPSCALES anything smaller,
 * which made several images bigger than the original (530 KB -> 923 KB).
 * `c-at_max` only ever scales down.
 *
 * Non-ImageKit URLs (local /public paths, UploadThing, YouTube thumbs) and
 * URLs that already carry a transform are returned untouched.
 */
export function cappedImageSource(url: string, maxWidth: number = MAX_RENDER_WIDTH): string {
  if (!url || !url.includes('ik.imagekit.io')) return url;
  if (url.includes('tr=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}tr=w-${maxWidth},c-at_max`;
}
