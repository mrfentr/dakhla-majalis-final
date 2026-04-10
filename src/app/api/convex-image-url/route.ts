import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Rate limit: 30 requests per minute (public, read-only)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(30, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const storageId = searchParams.get('storageId');

    if (!storageId) {
      return NextResponse.json(
        { error: 'Missing storageId parameter' },
        { status: 400 }
      );
    }

    // Get the public URL from Convex storage
    const url = await client.query(api.orders.getImageUrl, {
      storageId: storageId as any,
    });

    if (!url) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting image URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get image URL' },
      { status: 500 }
    );
  }
}
