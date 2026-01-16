import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const dataPath = `users/${userId}/data.json`;

  // Check if client provided a cached blob URL to avoid list() call
  const { searchParams } = new URL(request.url);
  const cachedUrl = searchParams.get('blobUrl');

  try {
    let blobUrl: string | null = null;

    // Try cached URL first (avoids expensive list() operation)
    if (cachedUrl) {
      // Validate URL belongs to this user
      if (cachedUrl.includes(dataPath)) {
        blobUrl = cachedUrl;
      }
    }

    // Fallback to list() only if no cached URL (first sync or cache miss)
    if (!blobUrl) {
      const { blobs } = await list({ prefix: `users/${userId}` });
      const dataBlob = blobs.find(b => b.pathname === dataPath);
      if (!dataBlob) {
        return NextResponse.json(null);
      }
      blobUrl = dataBlob.url;
    }

    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(blobUrl + cacheBuster, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      // Cached URL might be stale, fallback to list()
      if (cachedUrl) {
        const { blobs } = await list({ prefix: `users/${userId}` });
        const dataBlob = blobs.find(b => b.pathname === dataPath);
        if (!dataBlob) {
          return NextResponse.json(null);
        }
        const retryResponse = await fetch(dataBlob.url + cacheBuster, {
          cache: 'no-store',
        });
        const data = await retryResponse.json();
        return NextResponse.json({ ...data, _blobUrl: dataBlob.url });
      }
      return NextResponse.json(null);
    }

    const data = await response.json();
    // Include blob URL in response so client can cache it
    return NextResponse.json({ ...data, _blobUrl: blobUrl });
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
