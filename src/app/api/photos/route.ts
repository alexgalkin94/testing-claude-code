import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const USER_ID = 'alex_cutboard';
const PHOTOS_PREFIX = `${USER_ID}/photos/`;

// Simple token check - in production use proper auth
const AUTH_TOKEN = process.env.CUTBOARD_AUTH_TOKEN || 'alex_secret_2024';

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('x-auth-token');
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');

  return authHeader === AUTH_TOKEN || tokenParam === AUTH_TOKEN;
}

export async function GET(request: Request) {
  // Auth check for listing photos
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { blobs } = await list({ prefix: PHOTOS_PREFIX });

    const photos = blobs.map(blob => {
      // Extract date from filename (format: YYYY-MM-DD_uuid.ext)
      const filename = blob.pathname.split('/').pop() || '';
      const datePart = filename.split('_')[0];

      return {
        url: blob.url,
        pathname: blob.pathname,
        uploadedAt: blob.uploadedAt,
        date: datePart || '',
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Photos GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Auth check for uploads
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use UUID for unguessable filename - privacy through obscurity
    const uuid = randomUUID();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${PHOTOS_PREFIX}${date}_${uuid}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public', // URL is public but unguessable
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      date,
    });
  } catch (error) {
    console.error('Photos POST error:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // Auth check for deletion
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Verify URL belongs to this user
    if (!url.includes(USER_ID)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photos DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
