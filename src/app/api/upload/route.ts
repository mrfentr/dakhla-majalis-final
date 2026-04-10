import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';
import { requireAdmin } from '@/lib/clerk-auth';
import rateLimit, { getIPFromRequest } from '@/lib/rate-limit';

// Rate limit: 20 requests per minute (admin only)
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 100 });

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
});

export async function POST(request: NextRequest) {
  try {
    // Auth: admin only
    await requireAdmin();

    // Rate limiting
    const ip = getIPFromRequest(request);
    const { success } = limiter.check(20, ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and AVIF are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '-').toLowerCase();
    const fileName = `${timestamp}-${originalName}`;

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: fileName,
      folder: '/dakhla-majalis', // Organize uploads in a folder
      useUniqueFileName: true,
      tags: ['product', 'upload'],
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      fileName: uploadResponse.name,
      thumbnailUrl: uploadResponse.thumbnailUrl,
    });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Authentication required') ? 401
      : message.includes('Admin access required') ? 403
      : 500;
    return NextResponse.json(
      {
        error: status === 500 ? 'Failed to upload image' : message,
        details: message
      },
      { status }
    );
  }
}
