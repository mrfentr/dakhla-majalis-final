import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/clerk-auth';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

// Rate limit: 20 requests per minute
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(20, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const adminStatus = await isAdmin();
    
    return NextResponse.json({ 
      isAdmin: adminStatus 
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ 
      isAdmin: false 
    }, { status: 500 });
  }
}