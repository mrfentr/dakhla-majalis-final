// ===== IMAGE PLACEHOLDERS =====
// A lazy-loaded <Image> shows nothing until it decodes, so scrolling a product
// grid flashes empty boxes. `placeholder="blur"` fixes that, but next/image
// needs a blurDataURL that is already inlined — pointing it at a remote thumb
// would add one request per image, which is what we just spent the day removing.
//
// So the placeholder is generated locally: a tiny SVG in the brand's cream
// tones, base64'd. Zero network cost, and the fade-in reads as intentional
// rather than as a broken image.

/** Brand surface tone, between theme.colors.cream and lightFill. */
const SAND = '#F3EDE4';

function svgToDataUrl(svg: string): string {
  // base64 rather than encodeURIComponent: next/image puts this in a CSS
  // url() and unescaped '#' from the hex colours would truncate it.
  const base64 = typeof window === 'undefined'
    ? Buffer.from(svg).toString('base64')
    : window.btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Flat cream tile used as the blur placeholder for product imagery.
 *
 * This string is inlined into EVERY <Image> that uses it (54 of them on the
 * homepage), so length matters more than prettiness: a two-stop gradient
 * version cost ~68 KB of extra HTML, roughly 3x this one, for a difference
 * nobody sees behind a 0.2s fade.
 */
export const PRODUCT_BLUR_DATA_URL = svgToDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">` +
    `<rect width="1" height="1" fill="${SAND}"/>` +
  `</svg>`,
);
