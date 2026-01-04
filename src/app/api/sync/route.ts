import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const USER_ID = 'alex_cutboard';
const DATA_PATH = `${USER_ID}/data.json`;
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
    const { blobs } = await list({ prefix: USER_ID });
    const dataBlob = blobs.find(b => b.pathname === DATA_PATH);

    if (!dataBlob) {
      return NextResponse.json(null);
    }

    const response = await fetch(dataBlob.url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blob GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    data.lastSync = new Date().toISOString();

    const blob = await put(DATA_PATH, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url, lastSync: data.lastSync });
  } catch (error) {
    console.error('Blob POST error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
