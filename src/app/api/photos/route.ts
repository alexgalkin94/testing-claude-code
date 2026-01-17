import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { listPhotos, uploadPhoto, deletePhoto, R2_PUBLIC_URL } from '@/lib/r2';

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

  try {
    const photos = await listPhotos(session.user.id);

    return NextResponse.json(photos.map(p => ({
      url: p.url,
      pathname: p.key,
      uploadedAt: p.uploadedAt,
      date: p.date,
    })));
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

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const uuid = randomUUID();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${date}_${uuid}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadPhoto(session.user.id, buffer, filename, file.type);

    return NextResponse.json({
      success: true,
      url: result.url,
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

    // Extract key from URL - handle both old Vercel Blob URLs and new R2 URLs
    let key: string;
    if (url.includes('blob.vercel-storage.com')) {
      // Old Vercel Blob URL - extract path after the domain
      const urlObj = new URL(url);
      key = urlObj.pathname.substring(1); // Remove leading slash
    } else if (url.startsWith(R2_PUBLIC_URL)) {
      // New R2 URL
      key = url.replace(`${R2_PUBLIC_URL}/`, '');
    } else {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Security check - ensure key belongs to this user
    if (!key.includes(`users/${userId}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await deletePhoto(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photos DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
