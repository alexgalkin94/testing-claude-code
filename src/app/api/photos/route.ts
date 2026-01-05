import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const photosPrefix = `users/${userId}/photos/`;

  try {
    const { blobs } = await list({ prefix: photosPrefix });

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
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const photosPrefix = `users/${userId}/photos/`;

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
    const filename = `${photosPrefix}${date}_${uuid}.${ext}`;

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
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Check that the URL belongs to this user
    if (!url.includes(`users/${userId}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photos DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
