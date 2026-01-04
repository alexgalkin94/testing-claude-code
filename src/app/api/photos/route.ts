import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const USER_ID = 'alex_cutboard';
const PHOTOS_PREFIX = `${USER_ID}/photos/`;
const SESSION_COOKIE = 'cutboard_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return !!session?.value;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { blobs } = await list({ prefix: PHOTOS_PREFIX });

    const photos = blobs.map(blob => {
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
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // UUID for unguessable filename
    const uuid = randomUUID();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${PHOTOS_PREFIX}${date}_${uuid}.${ext}`;

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
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

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
