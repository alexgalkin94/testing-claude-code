import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

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
  const dataPath = `users/${userId}/data.json`;

  try {
    const { blobs } = await list({ prefix: `users/${userId}` });
    const dataBlob = blobs.find(b => b.pathname === dataPath);

    if (!dataBlob) {
      return NextResponse.json(null);
    }

    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(dataBlob.url + cacheBuster, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blob GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
    }

    const userId = session.user.id;
    const dataPath = `users/${userId}/data.json`;

    const data = await request.json();
    data.lastSync = new Date().toISOString();
    data.userId = userId;

    const blob = await put(dataPath, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true, url: blob.url, lastSync: data.lastSync });
  } catch (error) {
    console.error('Blob POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save: ${message}` }, { status: 500 });
  }
}
