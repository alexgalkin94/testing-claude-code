import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

const USER_ID = 'alex_cutboard';
const PHOTOS_PREFIX = `${USER_ID}/photos/`;

export async function GET() {
  try {
    const { blobs } = await list({ prefix: PHOTOS_PREFIX });

    const photos = blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      uploadedAt: blob.uploadedAt,
      // Extract date from filename (format: YYYY-MM-DD_timestamp.jpg)
      date: blob.pathname.split('/').pop()?.split('_')[0] || '',
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Photos GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create filename with date and timestamp
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${PHOTOS_PREFIX}${date}_${timestamp}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
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
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photos DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
