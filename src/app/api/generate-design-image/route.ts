import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/clerk-auth';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

// Rate limit: 3 requests per minute (auth required)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

export async function POST(request: NextRequest) {
  try {
    // Auth required
    await requireAuth();

    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(3, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { result, lengths } = await request.json();

    console.log('🎨 [API] Starting U-shape image generation');

    // Create a temporary page URL with the data encoded
    const dataParam = encodeURIComponent(JSON.stringify({ result, lengths }));
    const renderUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/render-ushape?data=${dataParam}`;

    console.log('📸 [API] Rendering URL:', renderUrl);

    // Use Playwright to screenshot the actual component
    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to the render page
    await page.goto(renderUrl, { waitUntil: 'networkidle' });

    // Wait for the canvas to be ready
    await page.waitForSelector('[data-ushape-ready="true"]', { timeout: 10000 });

    // Take screenshot of the specific element
    const element = await page.$('[data-ushape-canvas]');
    const screenshot = await element.screenshot({ type: 'png' });

    await browser.close();

    // Convert to base64
    const base64Image = `data:image/png;base64,${screenshot.toString('base64')}`;

    console.log('✅ [API] Image generated successfully');

    return NextResponse.json({ imageUrl: base64Image });
  } catch (error) {
    console.error('Error generating image:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    const status = message.includes('Authentication required') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
